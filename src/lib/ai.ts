import { z } from "zod";

const CommentSchema = z.object({
  generatedComment: z.string().min(1),
  suggestedAnchorText: z.string().min(1),
  ethicalNote: z.string().min(1)
});

export type GeneratedCommentPayload = z.infer<typeof CommentSchema> & { provider: string };
export type GenerateCommentInput = {
  keyword: string; candidateUrl: string; candidateTitle: string; targetSummary: string;
  userWebsiteUrl: string; userWebsiteTitle?: string; userWebsiteSummary?: string;
  telkomTitle: string; telkomUrl: string; telkomSummary: string;
};

function buildPrompt(input: GenerateCommentInput) {
  return `Buat satu komentar blog berbahasa Indonesia berdasarkan fakta yang tersedia.

HALAMAN YANG DIKOMENTARI
Judul: ${input.candidateTitle}
URL: ${input.candidateUrl}
Ringkasan: ${input.targetSummary || "Tidak tersedia"}

REFERENSI TELKOM UNIVERSITY SURABAYA
Topik project: ${input.keyword}
Judul: ${input.telkomTitle}
URL: ${input.telkomUrl}
Ringkasan: ${input.telkomSummary}
Halaman yang dipromosikan: ${input.userWebsiteTitle || input.userWebsiteUrl}
Konteks halaman: ${input.userWebsiteSummary || "Tidak tersedia"}

ATURAN WAJIB
- Tulis 80 sampai 120 kata, natural, spesifik terhadap ringkasan halaman target, dan sopan.
- Jangan mengaku pernah mencoba, meneliti, atau mengalami sesuatu yang tidak disebutkan.
- Jangan memakai keyword berulang, bahasa promosi, ajakan membeli, atau pujian generik.
- Referensikan artikel Telkom hanya jika memperkaya pembahasan; maksimal satu URL.
- Anchor text harus deskriptif dan bukan exact-match keyword yang dipaksakan.
- Kembalikan JSON valid: generatedComment, suggestedAnchorText, ethicalNote.`;
}

function parseContent(content: string, provider: string): GeneratedCommentPayload {
  const match = content.match(/\{[\s\S]*\}/);
  const parsed = CommentSchema.parse(JSON.parse(match?.[0] || content));
  const words = parsed.generatedComment.trim().split(/\s+/);
  if (words.length < 80) throw new Error(`${provider} menghasilkan komentar kurang dari 80 kata.`);
  return { ...parsed, generatedComment: words.slice(0, 120).join(" "), provider };
}

async function callOpenAI(prompt: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      messages: [{ role: "system", content: "Anda editor komentar SEO etis. Gunakan hanya konteks yang diberikan." },
        { role: "user", content: prompt }],
      temperature: 0.35,
      response_format: { type: "json_schema", json_schema: { name: "ethical_comment", strict: true,
        schema: { type: "object", additionalProperties: false,
          required: ["generatedComment", "suggestedAnchorText", "ethicalNote"],
          properties: { generatedComment: { type: "string" }, suggestedAnchorText: { type: "string" },
            ethicalNote: { type: "string" } } } } }
    }),
    signal: AbortSignal.timeout(25000)
  });
  if (!response.ok) throw new Error(`OpenAI gagal (${response.status}).`);
  const payload = await response.json();
  return parseContent(payload.choices?.[0]?.message?.content || "", "openai");
}

async function callGroq(prompt: string) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
      messages: [{ role: "system", content: "Anda editor komentar SEO etis. Balas hanya dengan JSON valid." },
        { role: "user", content: prompt }], temperature: 0.35,
      response_format: { type: "json_object" } }),
    signal: AbortSignal.timeout(25000)
  });
  if (!response.ok) throw new Error(`Groq gagal (${response.status}).`);
  const payload = await response.json();
  return parseContent(payload.choices?.[0]?.message?.content || "", "groq");
}

export async function generateSeoComment(input: GenerateCommentInput) {
  const prompt = buildPrompt(input);
  const errors: string[] = [];
  try { const result = await callOpenAI(prompt); if (result) return result; }
  catch (error) { errors.push(error instanceof Error ? error.message : "OpenAI gagal."); }
  try { const result = await callGroq(prompt); if (result) return result; }
  catch (error) { errors.push(error instanceof Error ? error.message : "Groq gagal."); }
  if (!process.env.OPENAI_API_KEY && !process.env.GROQ_API_KEY) {
    throw new Error("OPENAI_API_KEY atau GROQ_API_KEY belum dikonfigurasi.");
  }
  throw new Error(errors.join(" ") || "Provider AI tidak memberikan respons yang valid.");
}
