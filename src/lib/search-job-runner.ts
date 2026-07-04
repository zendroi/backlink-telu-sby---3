import { randomUUID } from "node:crypto";
import { extractHostname } from "@/lib/domain";
import { inspectPage } from "@/lib/page-inspector";
import { prisma } from "@/lib/prisma";
import { isTopicallyRelevant, scoreText, searchCandidateWebsites } from "@/lib/search";
import { ensureRelevantTelkomArticles } from "@/lib/telkom-articles";

const DEFAULT_MAX_CHECKS = 20;
const DEFAULT_MATCH_TARGET = 10;

function limits() {
  return {
    maxChecks: Number(process.env.SEARCH_MAX_CHECKS || DEFAULT_MAX_CHECKS),
    matchTarget: Number(process.env.SEARCH_MATCH_TARGET || DEFAULT_MATCH_TARGET),
    concurrency: Math.max(1, Number(process.env.SEARCH_CONCURRENCY || 4))
  };
}

export async function createSearchJob(projectId: number) {
  const config = limits();
  return prisma.searchJob.create({ data: { id: randomUUID(), projectId, status: "queued",
    message: "Menyiapkan pencarian cepat.", maxChecks: config.maxChecks,
    matchTarget: config.matchTarget } });
}

async function updateJob(jobId: string, data: Record<string, string | number>) {
  await prisma.searchJob.update({ where: { id: jobId }, data });
}

export async function runSearchJob(jobId: string) {
  const job = await prisma.searchJob.findUnique({ where: { id: jobId }, include: { project: true } });
  if (!job) return;
  const config = limits();
  let checkedCount = 0;
  let matchedCount = 0;
  let rejectedCount = 0;
  try {
    await updateJob(jobId, { status: "running", progress: 3,
      message: "Mencari halaman dan membaca konteks website Anda." });

    await prisma.candidateWebsite.updateMany({
      where: { projectId: job.projectId },
      data: { inspectionStatus: "stale" }
    });

    const [results, website] = await Promise.all([
      searchCandidateWebsites(job.project.keyword, job.project.targetDomain, config.maxChecks),
      inspectPage(job.project.userWebsiteUrl).catch(() => null)
    ]);
    if (website) {
      await prisma.searchProject.update({ where: { id: job.projectId }, data: {
        userWebsiteTitle: website.title, userWebsiteSummary: website.summary
      } });
    }

    await prisma.$transaction(results.map((result) => prisma.candidateWebsite.upsert({
      where: { projectId_url: { projectId: job.projectId, url: result.url } },
      update: { title: result.title, snippet: result.snippet, searchQuery: result.query,
        relevanceScore: result.relevanceScore, inspectionStatus: "pending", inspectionReason: null },
      create: { projectId: job.projectId, title: result.title, url: result.url,
        domain: extractHostname(result.url), snippet: result.snippet, searchQuery: result.query,
        relevanceScore: result.relevanceScore, inspectionStatus: "pending" }
    })));
    await updateJob(jobId, { totalFound: results.length, progress: results.length ? 10 : 90,
      message: `${results.length} URL ditemukan. Mulai memeriksa form secara paralel.` });

    for (let start = 0; start < results.length; start += config.concurrency) {
      const batch = results.slice(start, start + config.concurrency);
      const inspections = await Promise.all(batch.map(async (result) => {
        try {
          const page = await inspectPage(result.url);
          const relevanceScore = scoreText(job.project.keyword, page.title, page.searchText);
          const topical = isTopicallyRelevant(job.project.keyword, page.title, page.searchText);
          const hasCompleteForm = page.hasCommentForm && page.hasWebsiteField;
          const status = hasCompleteForm && topical ? "valid" :
            hasCompleteForm || page.hasCommentForm || page.hasWebsiteField ? "review" : "rejected";
          const reason = status === "valid"
            ? `Form lengkap dan topik relevan (skor ${relevanceScore}).`
            : hasCompleteForm
              ? `Form lengkap, tetapi isi halaman tidak cukup relevan (skor ${relevanceScore}).`
              : status === "review" ? "Hanya sebagian elemen form terdeteksi; periksa manual."
                : "Form komentar dengan field website tidak terdeteksi.";
          return { result, page, status, reason, relevanceScore };
        } catch (error) {
          return { result, page: null, status: "rejected",
            reason: error instanceof Error ? `Tidak dapat diverifikasi: ${error.message}` : "Pemeriksaan gagal.",
            relevanceScore: result.relevanceScore };
        }
      }));

      await prisma.$transaction(inspections.map(({ result, page, status, reason, relevanceScore }) =>
        prisma.candidateWebsite.update({
          where: { projectId_url: { projectId: job.projectId, url: result.url } },
          data: { title: page?.title || result.title, snippet: page?.summary || result.snippet,
            hasCommentForm: page?.hasCommentForm || false, hasWebsiteField: page?.hasWebsiteField || false,
            relevanceScore: Math.max(result.relevanceScore, relevanceScore),
            inspectionStatus: status, inspectionReason: reason, inspectedAt: new Date() }
        })));
      checkedCount += inspections.length;
      matchedCount += inspections.filter((item) => item.status === "valid").length;
      rejectedCount += inspections.filter((item) => item.status === "rejected").length;
      const reviewCount = checkedCount - matchedCount - rejectedCount;
      await updateJob(jobId, { checkedCount, matchedCount, rejectedCount,
        progress: 10 + Math.round((checkedCount / Math.max(1, results.length)) * 75),
        message: `${matchedCount} valid, ${reviewCount} perlu verifikasi, ${rejectedCount} ditolak.` });
      if (matchedCount >= config.matchTarget) break;
    }

    await updateJob(jobId, { progress: 90, message: "Mencari artikel Telkom yang benar-benar relevan." });
    const context = [website?.title, website?.summary, job.project.keyword].filter(Boolean).join(" ");
    await ensureRelevantTelkomArticles({ projectId: job.projectId, keyword: job.project.keyword, context });
    await prisma.candidateWebsite.deleteMany({
      where: { projectId: job.projectId, inspectionStatus: "stale", comments: { none: {} } }
    });
    const reviewCount = checkedCount - matchedCount - rejectedCount;
    await updateJob(jobId, { status: "completed", progress: 100, totalFound: results.length,
      checkedCount, matchedCount, rejectedCount,
      message: `Selesai: ${matchedCount} valid, ${reviewCount} perlu verifikasi, ${rejectedCount} ditolak.` });
  } catch (error) {
    await updateJob(jobId, { status: "failed", progress: 100,
      message: error instanceof Error ? error.message : "Pencarian gagal." });
  }
}
