import { inspectPage } from "@/lib/page-inspector";
import { prisma } from "@/lib/prisma";
import { isOfficialTelkomUrl, scoreText, searchTelkomArticles, tokenize } from "@/lib/search";

type EnsureInput = { projectId: number; keyword: string; context: string };
type ArticleForScoring = {
  id: number; title: string; url: string; summary: string; relevanceReason: string;
  relevanceScore: number; _count?: { comments: number };
};

function contextualScore(article: ArticleForScoring, keyword: string, context: string) {
  return article.relevanceScore + scoreText(`${keyword} ${context}`, article.title, article.summary) -
    (article._count?.comments || 0) * 2;
}

export function selectBestTelkomArticle(
  articles: ArticleForScoring[], keyword: string, context: string
) {
  const eligible = articles.filter((article) => isOfficialTelkomUrl(article.url) &&
    contextualScore(article, keyword, context) >= 8);
  return eligible.sort((a, b) => contextualScore(b, keyword, context) -
    contextualScore(a, keyword, context))[0] || null;
}

export async function ensureRelevantTelkomArticles({ projectId, keyword, context }: EnsureInput) {
  const existing = await prisma.telkomArticle.findMany({ where: { projectId } });
  const invalidIds = existing.filter((article) => !isOfficialTelkomUrl(article.url)).map((article) => article.id);
  if (invalidIds.length) await prisma.telkomArticle.deleteMany({ where: { id: { in: invalidIds } } });

  const results = await searchTelkomArticles(keyword, context, 5);
  const inspected = await Promise.all(results.map(async (result) => {
    const page = await inspectPage(result.url).catch(() => null);
    const title = page?.title || result.title;
    const summary = page?.summary || result.snippet;
    const relevanceScore = Math.max(result.relevanceScore, scoreText(keyword, title, summary));
    const matchedTerms = [...new Set(tokenize(keyword).filter((term) =>
      tokenize(`${title} ${summary}`).includes(term)))];
    return {
      result, title, summary, relevanceScore,
      reason: matchedTerms.length
        ? `Cocok pada topik: ${matchedTerms.join(", ")}.`
        : "Ditemukan dari pencarian domain resmi, tetapi perlu verifikasi manual."
    };
  }));

  const saved = [];
  for (const item of inspected.filter((item) => item.relevanceScore > 0)) {
    saved.push(await prisma.telkomArticle.upsert({
      where: { projectId_url: { projectId, url: item.result.url } },
      update: { title: item.title, summary: item.summary, relevanceReason: item.reason,
        relevanceScore: item.relevanceScore },
      create: { projectId, title: item.title, url: item.result.url, summary: item.summary,
        relevanceReason: item.reason, relevanceScore: item.relevanceScore }
    }));
  }
  return saved;
}
