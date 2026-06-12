import { inspectPage } from "@/lib/page-inspector";

export type GeneratedCommentPayload = {
  generatedComment: string;
  suggestedAnchorText: string;
  ethicalNote: string;
};

type GenerateCommentInput = {
  keyword: string;
  candidateUrl: string;
  candidateTitle: string;
  userWebsiteUrl: string;
  telkomTitle?: string;
  telkomUrl?: string;
  telkomSummary?: string;
};

function fallbackComment(input: GenerateCommentInput): GeneratedCommentPayload {
  return {
    generatedComment:
      `Pembahasan tentang ${input.keyword} di artikel ini cukup nyambung dengan kebutuhan pembaca yang sedang mencari referensi praktis. Saya suka bagian yang menekankan konteks penerapannya, karena topik seperti ini sering terasa terlalu teknis kalau tidak diberi contoh. Sebagai tambahan, ada juga referensi terkait dari Telkom University Surabaya yang bisa jadi sudut pandang pelengkap: ${input.telkomUrl || input.userWebsiteUrl}`,
    suggestedAnchorText: input.keyword,
    ethicalNote:
      "Review komentar sebelum dipakai. Jangan kirim jika tidak relevan dengan isi artikel atau melanggar aturan website tujuan."
  };
}

function buildPrompt(input: GenerateCommentInput, targetSummary: string) {
  return `
Buat komentar blog berbahasa Indonesia untuk backlink outreach yang etis.

Konteks target:
- Keyword/topik: ${input.keyword}
- Judul halaman target: ${input.candidateTitle}
- URL target: ${input.candidateUrl}
- Ringkasan halaman target: ${targetSummary || "-"}

Sumber resmi:
- Domain Universitas Telkom Surabaya: ${input.userWebsiteUrl}

Artikel Telkom University Surabaya yang relevan:
- Judul: ${input.telkomTitle || "-"}
- URL: ${input.telkomUrl || "-"}
- Ringkasan: ${input.telkomSummary || "-"}

Aturan:
- Komentar natural, sopan, relevan, dan tidak terlihat spam.
- Jangan keyword stuffing.
- Jangan klaim palsu seperti "saya sudah memakai" jika tidak ada konteks.
- Jangan terlalu promosi.
- 80-120 kata.
- Boleh menyisipkan satu referensi/link artikel Telkom secara halus jika relevan.
- Output harus JSON valid dengan field:
  generatedComment, suggestedAnchorText, ethicalNote.
`.trim();
}

function normalizeGeneratedComment(
  parsed: Partial<GeneratedCommentPayload>,
  input: GenerateCommentInput
): GeneratedCommentPayload {
  return {
    generatedComment: parsed.generatedComment || fallbackComment(input).generatedComment,
    suggestedAnchorText: parsed.suggestedAnchorText || input.keyword,
    ethicalNote:
      parsed.ethicalNote ||
      "Pastikan komentar sesuai isi artikel dan aturan website tujuan."
  };
}

async function callOpenAI(prompt: string, input: GenerateCommentInput) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "Anda adalah asisten SEO etis. Anda membuat draft komentar yang relevan, manusiawi, dan tidak spam."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.55,
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI gagal: ${response.status}`);
  }

  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content;
  const parsed = JSON.parse(content) as GeneratedCommentPayload;
  return normalizeGeneratedComment(parsed, input);
}

async function callGroq(prompt: string, input: GenerateCommentInput) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const model = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "Anda adalah asisten SEO etis. Balas hanya dengan JSON valid tanpa markdown."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.55
    })
  });

  if (!response.ok) {
    throw new Error(`Groq gagal: ${response.status}`);
  }

  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content || "{}";
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  const parsed = JSON.parse(jsonMatch?.[0] || content) as GeneratedCommentPayload;
  return normalizeGeneratedComment(parsed, input);
}

export async function generateSeoComment(input: GenerateCommentInput) {
  const inspected = await inspectPage(input.candidateUrl).catch(() => null);
  const prompt = buildPrompt(input, inspected?.summary || "");

  try {
    const openAiResult = await callOpenAI(prompt, input);
    if (openAiResult) return openAiResult;
  } catch (error) {
    console.error(error);
  }

  try {
    const groqResult = await callGroq(prompt, input);
    if (groqResult) return groqResult;
  } catch (error) {
    console.error(error);
  }

  return fallbackComment(input);
}
