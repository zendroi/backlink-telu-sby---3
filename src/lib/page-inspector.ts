import * as cheerio from "cheerio";

const COMMENT_TERMS = [
  "comment",
  "leave a reply",
  "leave a comment",
  "post a comment",
  "komentar",
  "tinggalkan komentar"
];

const WEBSITE_FIELD_TERMS = [
  "website",
  "url",
  "homepage",
  "web site",
  "situs",
  "alamat web"
];

export type PageInspection = {
  hasCommentForm: boolean;
  hasWebsiteField: boolean;
  title: string;
  summary: string;
};

export async function inspectPage(url: string): Promise<PageInspection> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "AIBacklinkAssistant/1.0"
    },
    signal: AbortSignal.timeout(15000)
  });

  if (!response.ok) {
    return {
      hasCommentForm: false,
      hasWebsiteField: false,
      title: url,
      summary: ""
    };
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  $("script, style, noscript, svg").remove();

  const title = $("title").first().text().trim() || url;
  const metaDescription =
    $('meta[name="description"]').attr("content")?.trim() || "";
  const bodyText = $("body").text().replace(/\s+/g, " ").trim().toLowerCase();
  const hasCommentSignal = COMMENT_TERMS.some((term) => bodyText.includes(term));

  let hasCommentForm = false;
  let hasWebsiteField = false;

  $("form").each((_, form) => {
    const formEl = $(form);
    const formText = [
      formEl.text(),
      formEl.attr("id"),
      formEl.attr("class"),
      formEl.attr("action"),
      formEl.attr("name")
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const formLooksLikeComment =
      hasCommentSignal || COMMENT_TERMS.some((term) => formText.includes(term));
    if (formLooksLikeComment) {
      hasCommentForm = true;
    }

    formEl.find("input, textarea").each((__, field) => {
      const fieldEl = $(field);
      const fieldText = [
        fieldEl.attr("name"),
        fieldEl.attr("id"),
        fieldEl.attr("placeholder"),
        fieldEl.attr("aria-label"),
        fieldEl.attr("type"),
        fieldEl.attr("class")
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (WEBSITE_FIELD_TERMS.some((term) => fieldText.includes(term))) {
        hasWebsiteField = true;
        if (formLooksLikeComment) {
          hasCommentForm = true;
        }
      }
    });
  });

  const paragraphs = $("p")
    .map((_, el) => $(el).text().replace(/\s+/g, " ").trim())
    .get()
    .filter((text) => text.length > 60)
    .slice(0, 4);

  return {
    hasCommentForm,
    hasWebsiteField,
    title,
    summary: [metaDescription, ...paragraphs].filter(Boolean).join("\n").slice(0, 1600)
  };
}
