import { randomUUID } from "node:crypto";
import { extractDomainLabel } from "@/lib/domain";
import { inspectPage } from "@/lib/page-inspector";
import { prisma } from "@/lib/prisma";
import { buildCandidateQueries, serperSearch } from "@/lib/search";
import { ensureRelevantTelkomArticles } from "@/lib/telkom-articles";

const DEFAULT_MAX_CHECKS = 100;
const DEFAULT_MATCH_TARGET = 40;
const DEFAULT_RESULTS_PER_QUERY = 10;

function getSearchLimits() {
  return {
    maxChecks: Number(process.env.SEARCH_MAX_CHECKS || DEFAULT_MAX_CHECKS),
    matchTarget: Number(process.env.SEARCH_MATCH_TARGET || DEFAULT_MATCH_TARGET),
    resultsPerQuery: Number(process.env.SEARCH_RESULTS_PER_QUERY || DEFAULT_RESULTS_PER_QUERY)
  };
}

export async function createSearchJob(projectId: number) {
  const limits = getSearchLimits();
  return prisma.searchJob.create({
    data: {
      id: randomUUID(),
      projectId,
      status: "queued",
      progress: 0,
      message: "Menyiapkan pencarian kandidat.",
      maxChecks: limits.maxChecks,
      matchTarget: limits.matchTarget
    }
  });
}

async function updateJob(
  jobId: string,
  data: Partial<{
    status: string;
    progress: number;
    message: string;
    totalFound: number;
    checkedCount: number;
    matchedCount: number;
    rejectedCount: number;
  }>
) {
  await prisma.searchJob.update({
    where: { id: jobId },
    data
  });
}

export async function runSearchJob(jobId: string) {
  const job = await prisma.searchJob.findUnique({
    where: { id: jobId },
    include: { project: true }
  });
  if (!job) return;

  const limits = getSearchLimits();
  const queries = buildCandidateQueries(job.project.keyword, job.project.targetDomain);
  const seenUrls = new Set<string>();
  let totalFound = 0;
  let checkedCount = 0;
  let matchedCount = 0;
  let rejectedCount = 0;

  await updateJob(jobId, {
    status: "running",
    progress: 1,
    message: "Mulai mencari hasil dari Search API."
  });

  try {
    for (let queryIndex = 0; queryIndex < queries.length; queryIndex += 1) {
      if (checkedCount >= limits.maxChecks || matchedCount >= limits.matchTarget) break;

      const query = queries[queryIndex];
      await updateJob(jobId, {
        message: `Mencari query ${queryIndex + 1}/${queries.length}: ${query}`,
        progress: Math.min(95, Math.round((checkedCount / limits.maxChecks) * 100))
      });

      const results = await serperSearch(query, limits.resultsPerQuery);

      for (const result of results) {
        if (!result.link || seenUrls.has(result.link)) continue;
        if (checkedCount >= limits.maxChecks || matchedCount >= limits.matchTarget) break;

        seenUrls.add(result.link);
        totalFound += 1;
        checkedCount += 1;

        await updateJob(jobId, {
          totalFound,
          checkedCount,
          matchedCount,
          rejectedCount,
          progress: Math.min(95, Math.round((checkedCount / limits.maxChecks) * 100)),
          message: `Mengecek ${checkedCount}/${limits.maxChecks}: ${result.link}`
        });

        const inspected = await inspectPage(result.link).catch(() => ({
          hasCommentForm: false,
          hasWebsiteField: false,
          title: result.title || result.link,
          summary: result.snippet || ""
        }));

        if (!inspected.hasCommentForm || !inspected.hasWebsiteField) {
          rejectedCount += 1;
          await updateJob(jobId, {
            rejectedCount,
            message: `${rejectedCount} ditolak, ${matchedCount} kandidat valid.`
          });
          continue;
        }

        await prisma.candidateWebsite.upsert({
          where: {
            projectId_url: {
              projectId: job.projectId,
              url: result.link
            }
          },
          update: {
            title: inspected.title || result.title || result.link,
            snippet: inspected.summary || result.snippet || "",
            hasCommentForm: true,
            hasWebsiteField: true,
            searchQuery: query
          },
          create: {
            projectId: job.projectId,
            title: inspected.title || result.title || result.link,
            url: result.link,
            domain: extractDomainLabel(result.link),
            snippet: inspected.summary || result.snippet || "",
            hasCommentForm: true,
            hasWebsiteField: true,
            searchQuery: query
          }
        });

        matchedCount += 1;
        await updateJob(jobId, {
          matchedCount,
          message: `${matchedCount} kandidat valid ditemukan dari ${checkedCount} URL yang dicek.`
        });
      }
    }

    await ensureRelevantTelkomArticles({
      projectId: job.projectId,
      keyword: job.project.keyword,
      context: "pencarian awal project"
    }).catch(() => []);

    await updateJob(jobId, {
      status: "completed",
      progress: 100,
      totalFound,
      checkedCount,
      matchedCount,
      rejectedCount,
      message: `Selesai. ${totalFound} URL ditemukan, ${checkedCount} dicek, ${matchedCount} valid, ${rejectedCount} ditolak.`
    });
  } catch (error) {
    await updateJob(jobId, {
      status: "failed",
      progress: 100,
      message: error instanceof Error ? error.message : "Pencarian gagal."
    });
  }
}
