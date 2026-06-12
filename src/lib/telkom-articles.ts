import { inspectPage } from "@/lib/page-inspector";
import { prisma } from "@/lib/prisma";
import { searchTelkomArticles } from "@/lib/search";

type EnsureTelkomArticleInput = {
  projectId: number;
  keyword: string;
  context: string;
};

type TelkomArticleForScoring = {
  id: number;
  title: string;
  url: string;
  summary: string;
  relevanceReason: string;
  _count?: {
    comments: number;
  };
};

const SCORE_STOPWORDS = new Set([
  "https",
  "http",
  "www",
  "yang",
  "dan",
  "atau",
  "untuk",
  "dengan",
  "artikel",
  "comment",
  "website",
  "telkom",
  "university",
  "surabaya",
  "universitas"
]);

function tokenize(value: string) {
  return value
    .toLowerCase()
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 4 && !SCORE_STOPWORDS.has(token));
}

function scoreArticle(article: TelkomArticleForScoring, keyword: string, context: string) {
  const contextTokens = new Set(tokenize(`${keyword} ${context}`));
  const titleTokens = tokenize(article.title);
  const summaryTokens = tokenize(article.summary);
  const reasonTokens = tokenize(article.relevanceReason);

  let score = 0;
  for (const token of titleTokens) {
    if (contextTokens.has(token)) score += 5;
  }
  for (const token of summaryTokens) {
    if (contextTokens.has(token)) score += 2;
  }
  for (const token of reasonTokens) {
    if (contextTokens.has(token)) score += 1;
  }

  const usagePenalty = article._count?.comments ? article._count.comments * 1.5 : 0;
  return score - usagePenalty;
}

export function selectBestTelkomArticle(
  articles: TelkomArticleForScoring[],
  keyword: string,
  context: string
) {
  if (!articles.length) return null;

  return [...articles].sort((a, b) => {
    const scoreDiff = scoreArticle(b, keyword, context) - scoreArticle(a, keyword, context);
    if (scoreDiff !== 0) return scoreDiff;
    return (a._count?.comments || 0) - (b._count?.comments || 0);
  })[0];
}

export async function ensureRelevantTelkomArticles({
  projectId,
  keyword,
  context
}: EnsureTelkomArticleInput) {
  const results = await searchTelkomArticles(keyword, context, 5);
  const saved = [];

  for (const result of results) {
    const inspected = await inspectPage(result.url).catch(() => ({
      title: result.title,
      summary: result.snippet,
      hasCommentForm: false,
      hasWebsiteField: false
    }));

    const article = await prisma.telkomArticle.upsert({
      where: {
        projectId_url: {
          projectId,
          url: result.url
        }
      },
      update: {
        title: inspected.title || result.title,
        summary: inspected.summary || result.snippet,
        relevanceReason: `Direkomendasikan dari konteks kandidat: ${context.slice(0, 180)}`
      },
      create: {
        projectId,
        title: inspected.title || result.title,
        url: result.url,
        summary: inspected.summary || result.snippet,
        relevanceReason: `Direkomendasikan dari konteks kandidat: ${context.slice(0, 180)}`
      }
    });
    saved.push(article);
  }

  return saved;
}
