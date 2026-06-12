import { NextResponse } from "next/server";
import { generateSeoComment } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { ensureRelevantTelkomArticles, selectBestTelkomArticle } from "@/lib/telkom-articles";

export async function POST(
  _request: Request,
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

  const candidateContext = [
    candidate.title,
    candidate.snippet,
    candidate.url
  ]
    .filter(Boolean)
    .join(" ");

  await ensureRelevantTelkomArticles({
    projectId: candidate.projectId,
    keyword: candidate.project.keyword,
    context: candidateContext
  }).catch(() => []);

  const telkomArticles = await prisma.telkomArticle.findMany({
    where: { projectId: candidate.projectId },
    include: {
      _count: {
        select: { comments: true }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  const telkomArticle = selectBestTelkomArticle(
    telkomArticles,
    candidate.project.keyword,
    candidateContext
  );
  const generated = await generateSeoComment({
    keyword: candidate.project.keyword,
    candidateUrl: candidate.url,
    candidateTitle: candidate.title,
    userWebsiteUrl: candidate.project.userWebsiteUrl,
    telkomTitle: telkomArticle?.title,
    telkomUrl: telkomArticle?.url,
    telkomSummary: telkomArticle?.summary
  });

  const comment = await prisma.generatedComment.create({
    data: {
      candidateWebsiteId: candidate.id,
      telkomArticleId: telkomArticle?.id,
      generatedComment: generated.generatedComment,
      suggestedAnchorText: generated.suggestedAnchorText,
      ethicalNote: generated.ethicalNote
    },
    include: {
      telkomArticle: true
    }
  });

  return NextResponse.json({ comment });
}
