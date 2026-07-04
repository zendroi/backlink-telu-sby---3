import { NextResponse } from "next/server";
import { z } from "zod";
import { generateSeoComment } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { selectBestTelkomArticle } from "@/lib/telkom-articles";

const GenerateSchema = z.object({ telkomArticleId: z.number().int().positive().optional() });

export async function POST(
  request: Request,
  context: { params: Promise<{ candidateId: string }> }
) {
  const { candidateId } = await context.params;
  const id = Number(candidateId);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "ID tidak valid." }, { status: 400 });
  }

  const candidate = await prisma.candidateWebsite.findUnique({
    where: { id },
    include: {
      project: true
    }
  });

  if (!candidate) {
    return NextResponse.json({ error: "Kandidat tidak ditemukan." }, { status: 404 });
  }

  const parsed = GenerateSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Pilihan artikel tidak valid." }, { status: 400 });

  const candidateContext = [
    candidate.title,
    candidate.snippet,
    candidate.url
  ]
    .filter(Boolean)
    .join(" ");

  const telkomArticles = await prisma.telkomArticle.findMany({
    where: { projectId: candidate.projectId },
    include: {
      _count: {
        select: { comments: true }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  const telkomArticle = parsed.data.telkomArticleId
    ? telkomArticles.find((article) => article.id === parsed.data.telkomArticleId)
    : selectBestTelkomArticle(telkomArticles, candidate.project.keyword, candidateContext);
  if (!telkomArticle) return NextResponse.json({
    error: "Belum ada artikel Telkom yang cukup relevan. Pilih atau cari artikel lain terlebih dahulu."
  }, { status: 422 });

  let generated;
  try {
    generated = await generateSeoComment({
      keyword: candidate.project.keyword, candidateUrl: candidate.url,
      candidateTitle: candidate.title, targetSummary: candidate.snippet || "",
      userWebsiteUrl: candidate.project.userWebsiteUrl,
      userWebsiteTitle: candidate.project.userWebsiteTitle || undefined,
      userWebsiteSummary: candidate.project.userWebsiteSummary || undefined,
      telkomTitle: telkomArticle.title, telkomUrl: telkomArticle.url,
      telkomSummary: telkomArticle.summary
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Generate komentar gagal." },
      { status: 502 });
  }

  const comment = await prisma.generatedComment.create({
    data: {
      candidateWebsiteId: candidate.id,
      telkomArticleId: telkomArticle?.id,
      generatedComment: generated.generatedComment,
      suggestedAnchorText: generated.suggestedAnchorText,
      ethicalNote: generated.ethicalNote,
      provider: generated.provider
    },
    include: {
      telkomArticle: true
    }
  });

  return NextResponse.json({ comment });
}
