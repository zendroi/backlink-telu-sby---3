import { lookup } from "node:dns/promises";
import * as cheerio from "cheerio";

const COMMENT_TERMS = ["comment", "reply", "komentar", "tanggapan", "评论", "发表评论", "回复"];
const WEBSITE_TERMS = ["website", "url", "homepage", "web site", "situs", "alamat web", "网站", "网址"];

export type PageInspection = {
  hasCommentForm: boolean;
  hasWebsiteField: boolean;
  title: string;
  summary: string;
  searchText: string;
};

function isPrivateAddress(address: string) {
  const value = address.toLowerCase();
  return value === "::1" || value === "0.0.0.0" || value.startsWith("fc") ||
    value.startsWith("fd") || value.startsWith("fe80:") || value.startsWith("127.") ||
    value.startsWith("10.") || value.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(value) || /^169\.254\./.test(value);
}

async function assertPublicUrl(value: string) {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Protokol URL tidak didukung.");
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  if (hostname === "localhost" || hostname.endsWith(".local")) throw new Error("Host lokal ditolak.");
  const addresses = await lookup(hostname, { all: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error("Alamat jaringan privat ditolak.");
  }
  return url;
}

async function fetchHtml(value: string) {
  let current = await assertPublicUrl(value);
  for (let redirects = 0; redirects <= 3; redirects += 1) {
    const response = await fetch(current, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; EthicalSEOResearch/1.0)" },
      redirect: "manual",
      signal: AbortSignal.timeout(Number(process.env.PAGE_INSPECTION_TIMEOUT_MS || 8000))
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || redirects === 3) throw new Error("Redirect halaman tidak valid.");
      current = await assertPublicUrl(new URL(location, current).toString());
      continue;
    }
    if (!response.ok) throw new Error(`Halaman merespons ${response.status}.`);
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      throw new Error("URL bukan halaman HTML.");
    }
    const maxBytes = Number(process.env.PAGE_MAX_BYTES || 1_500_000);
    const declaredSize = Number(response.headers.get("content-length") || 0);
    if (declaredSize > maxBytes) throw new Error("Ukuran halaman terlalu besar.");
    if (!response.body) return "";
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let bytes = 0;
    let html = "";
    while (true) {
      const { done, value: chunk } = await reader.read();
      if (done) break;
      bytes += chunk.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel();
        throw new Error("Ukuran halaman terlalu besar.");
      }
      html += decoder.decode(chunk, { stream: true });
    }
    return html + decoder.decode();
  }
  throw new Error("Terlalu banyak redirect.");
}

export async function inspectPage(url: string): Promise<PageInspection> {
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);
  $("script, style, noscript, svg, nav, footer").remove();
  const title = $("title").first().text().trim() || $("h1").first().text().trim() || url;
  const metaDescription = $('meta[name="description"]').attr("content")?.trim() || "";
  let hasCommentForm = false;
  let hasWebsiteField = false;

  $("form").each((_, form) => {
    const formEl = $(form);
    const identity = [formEl.text(), formEl.attr("id"), formEl.attr("class"), formEl.attr("action")]
      .filter(Boolean).join(" ").toLowerCase();
    const hasTextarea = formEl.find("textarea").length > 0;
    const looksLikeComment = hasTextarea && COMMENT_TERMS.some((term) => identity.includes(term));
    if (!looksLikeComment) return;
    hasCommentForm = true;
    formEl.find("input").each((__, field) => {
      const fieldEl = $(field);
      const identity = [fieldEl.attr("name"), fieldEl.attr("id"), fieldEl.attr("placeholder"),
        fieldEl.attr("aria-label"), fieldEl.attr("type")].filter(Boolean).join(" ").toLowerCase();
      if (WEBSITE_TERMS.some((term) => identity.includes(term))) hasWebsiteField = true;
    });
  });

  const root = $("article, main").first().length ? $("article, main").first() : $("body");
  const paragraphs = root.find("p").map((_, element) => $(element).text().replace(/\s+/g, " ").trim())
    .get().filter((text) => text.length > 60).slice(0, 5);
  return {
    hasCommentForm,
    hasWebsiteField,
    title,
    summary: [metaDescription, ...paragraphs].filter(Boolean).join("\n").slice(0, 1800),
    searchText: root.text().replace(/\s+/g, " ").trim().slice(0, 15000)
  };
}
