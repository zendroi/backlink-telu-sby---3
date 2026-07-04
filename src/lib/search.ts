import { extractHostname, normalizeDomain } from "@/lib/domain";

export type SearchResult = {
  title: string;
  url: string;
  snippet: string;
  query: string;
  relevanceScore: number;
};

type SerperOrganicItem = { title?: string; link?: string; snippet?: string };

const STOPWORDS = new Set([
  "https", "http", "www", "with", "from", "that", "this", "yang", "dan", "atau",
  "untuk", "dengan", "artikel", "comment", "comments", "website", "telkom", "university",
  "universitas", "surabaya"
]);

export function tokenize(value: string) {
  return value
    .toLowerCase()
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !STOPWORDS.has(token));
}

export function scoreText(query: string, title: string, snippet: string) {
  const wanted = [...new Set(tokenize(query))];
  if (!wanted.length) return 0;
  const titleTokens = new Set(tokenize(title));
  const snippetTokens = new Set(tokenize(snippet));
  let score = 0;
  let matched = 0;
  for (const token of wanted) {
    const inTitle = titleTokens.has(token);
    const inSnippet = snippetTokens.has(token);
    if (inTitle || inSnippet) matched += 1;
    if (inTitle) score += 18;
    if (inSnippet) score += 6;
  }
  const phrase = query.trim().toLowerCase();
  if (title.toLowerCase().includes(phrase)) score += 30;
  else if (snippet.toLowerCase().includes(phrase)) score += 15;
  score += Math.round((matched / wanted.length) * 20);
  return Math.min(100, score);
}

export function isTopicallyRelevant(keyword: string, title: string, content: string) {
  const tokens = [...new Set(tokenize(keyword))].sort((a, b) => b.length - a.length);
  if (!tokens.length) return false;
  const haystack = `${title} ${content}`.toLowerCase();
  const distinctiveToken = tokens[0];
  return haystack.includes(distinctiveToken) && scoreText(keyword, title, content) >= 12;
}

export function buildCandidateQueries(keyword: string, targetDomain: string) {
  const domain = normalizeDomain(targetDomain);
  const siteFilter = domain ? ` site:${domain}` : "";
  const queries = [
    `${keyword}${siteFilter}`,
    `${keyword} inurl:blog${siteFilter}`,
    `${keyword} "Name" "Email" "Website" "Comment"${siteFilter}`,
    `${keyword} "Name" "Email" "Website" "Post Comment"${siteFilter}`,
    `${keyword} "Your email address will not be published" "Website"${siteFilter}`,
    `${keyword} "Leave a Reply" "Website"${siteFilter}`,
    `${keyword} "Leave a comment" "Website"${siteFilter}`,
    `${keyword} inurl:blog "Name" "Email" "Website"${siteFilter}`,
    `${keyword} inurl:article "Name" "Email" "Website"${siteFilter}`
  ];
  if (domain === ".cn") {
    queries.push(`${keyword} "发表评论" "网站"${siteFilter}`,
      `${keyword} "评论" "网址"${siteFilter}`);
  }
  if (domain.endsWith(".id")) {
    queries.push(`${keyword} "Tinggalkan komentar" "Situs web"${siteFilter}`);
  }
  return queries;
}

export function buildTelkomQueries(keyword: string, context = "") {
  const contextTerms = tokenize(context).slice(0, 5).join(" ");
  return [
    `${keyword} site:surabaya.telkomuniversity.ac.id`,
    `${keyword} ${contextTerms} site:surabaya.telkomuniversity.ac.id`,
    `${keyword} "Telkom University Surabaya" site:telkomuniversity.ac.id`
  ].map((query) => query.replace(/\s+/g, " ").trim());
}

export function isOfficialTelkomUrl(url: string) {
  const hostname = extractHostname(url);
  if (hostname === "surabaya.telkomuniversity.ac.id" ||
    hostname.endsWith(".surabaya.telkomuniversity.ac.id")) return true;
  const subdomain = hostname.slice(0, -".telkomuniversity.ac.id".length);
  return hostname.endsWith(".telkomuniversity.ac.id") &&
    subdomain.split(".").some((label) => label.endsWith("-sby") || label.includes("surabaya"));
}

export async function serperSearch(query: string, limit: number) {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) throw new Error("SERPER_API_KEY belum diatur.");

  const response = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-KEY": apiKey },
    body: JSON.stringify({ q: query, hl: "id", gl: "id", num: limit }),
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error(`Serper gagal: ${response.status}`);
  const payload = (await response.json()) as { organic?: SerperOrganicItem[] };
  return payload.organic ?? [];
}

async function runQueries(queries: string[], keyword: string, limitPerQuery: number) {
  const groups = await Promise.all(
    queries.map(async (query) => ({ query, items: await serperSearch(query, limitPerQuery) }))
  );
  const seen = new Set<string>();
  const results: SearchResult[] = [];
  for (const { query, items } of groups) {
    for (const item of items) {
      if (!item.link || /\.(pdf|docx?|xlsx?|pptx?)(?:[?#]|$)/i.test(item.link)) continue;
      if (seen.has(item.link)) continue;
      seen.add(item.link);
      results.push({
        title: item.title || item.link,
        url: item.link,
        snippet: item.snippet || "",
        query,
        relevanceScore: scoreText(keyword, item.title || "", item.snippet || "")
      });
    }
  }
  return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
}

export async function searchCandidateWebsites(
  keyword: string,
  targetDomain: string,
  limit = Number(process.env.SEARCH_MAX_CHECKS || 20)
) {
  const resultsPerQuery = Number(process.env.SEARCH_RESULTS_PER_QUERY || 8);
  return (await runQueries(buildCandidateQueries(keyword, targetDomain), keyword, resultsPerQuery))
    .slice(0, limit);
}

export async function searchTelkomArticles(keyword: string, context = "", limit = 5) {
  const results = await runQueries(buildTelkomQueries(keyword, context), keyword, 6);
  return results.filter((result) => isOfficialTelkomUrl(result.url) && result.relevanceScore > 0)
    .slice(0, limit);
}
