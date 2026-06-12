import { normalizeDomain } from "@/lib/domain";

export type SearchResult = {
  title: string;
  url: string;
  snippet: string;
  query: string;
};

type SerperOrganicItem = {
  title?: string;
  link?: string;
  snippet?: string;
};

export function buildCandidateQueries(keyword: string, targetDomain: string) {
  const domain = normalizeDomain(targetDomain);
  const siteFilter = domain ? ` site:${domain}` : "";
  const footprints = [
    `"Name" "Email" "Website" "Comment"`,
    `"Name" "Email" "Website" "Post Comment"`,
    `"Your email address will not be published" "Website"`,
    `"Leave a Reply" "Website"`,
    `"Leave a comment" "Website"`,
    `inurl:blog "Name" "Email" "Website"`,
    `inurl:article "Name" "Email" "Website"`
  ];

  return footprints.map((footprint) => `${keyword} ${footprint}${siteFilter}`.trim());
}

const SEARCH_STOPWORDS = new Set([
  "https",
  "http",
  "www",
  "with",
  "from",
  "that",
  "this",
  "yang",
  "dan",
  "atau",
  "untuk",
  "dengan",
  "artikel",
  "comment",
  "comments",
  "website"
]);

function extractContextTerms(context: string) {
  const withoutUrls = context.replace(/https?:\/\/\S+/gi, " ");
  const terms = withoutUrls
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 4 && !SEARCH_STOPWORDS.has(term));

  const counts = new Map<string, number>();
  for (const term of terms) {
    counts.set(term, (counts.get(term) || 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([term]) => term)
    .join(" ");
}

export function buildTelkomQueries(keyword: string, context = "") {
  const focusTerms = extractContextTerms(context);
  const queries = [
    focusTerms ? `${focusTerms} site:surabaya.telkomuniversity.ac.id` : "",
    focusTerms ? `${keyword} ${focusTerms} site:surabaya.telkomuniversity.ac.id` : "",
    `${keyword} site:surabaya.telkomuniversity.ac.id`,
    `${keyword} "Universitas Telkom Surabaya"`,
    `${keyword} "Telkom University Surabaya"`
  ].filter(Boolean);

  return [...new Set(queries)];
}

export async function serperSearch(query: string, limit: number) {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) {
    throw new Error("SERPER_API_KEY belum diatur.");
  }

  const response = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": apiKey
    },
    body: JSON.stringify({
      q: query,
      hl: "en",
      num: limit
    })
  });

  if (!response.ok) {
    throw new Error(`Serper gagal: ${response.status}`);
  }

  const payload = (await response.json()) as { organic?: SerperOrganicItem[] };
  return payload.organic ?? [];
}

export async function searchCandidateWebsites(
  keyword: string,
  targetDomain: string,
  limit = Number(process.env.SEARCH_RESULTS_LIMIT || 8)
) {
  const queries = buildCandidateQueries(keyword, targetDomain);
  const seen = new Set<string>();
  const results: SearchResult[] = [];

  for (const query of queries) {
    if (results.length >= limit) break;
    const items = await serperSearch(query, limit);
    for (const item of items) {
      if (!item.link || seen.has(item.link)) continue;
      seen.add(item.link);
      results.push({
        title: item.title || item.link,
        url: item.link,
        snippet: item.snippet || "",
        query
      });
      if (results.length >= limit) break;
    }
  }

  return results;
}

export async function searchTelkomArticles(
  keyword: string,
  context = "",
  limit = 5
) {
  const queries = buildTelkomQueries(keyword, context);
  const seen = new Set<string>();
  const results: SearchResult[] = [];

  for (const query of queries) {
    if (results.length >= limit) break;
    const items = await serperSearch(query, limit);
    for (const item of items) {
      if (!item.link || seen.has(item.link)) continue;
      seen.add(item.link);
      results.push({
        title: item.title || item.link,
        url: item.link,
        snippet: item.snippet || "",
        query
      });
      if (results.length >= limit) break;
    }
  }

  return results;
}
