import { NextResponse } from "next/server";
import { z } from "zod";
import { inspectPage } from "@/lib/page-inspector";
import { isTopicallyRelevant, scoreText } from "@/lib/search";
import { prisma } from "@/lib/prisma";

const UpdateCandidateSchema = z.object({
  status: z.enum(["belum dicek", "cocok", "tidak cocok"]).optional(),
  notes: z.string().optional()
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ candidateId: string }> }
) {
  const { candidateId } = await context.params;
  const id = Number(candidateId);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "ID tidak valid." }, { status: 400 });
  }

  const body = await request.json();
  const parsed = UpdateCandidateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Input tidak valid.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const candidate = await prisma.candidateWebsite.update({
    where: { id },
    data: parsed.data
  });

  return NextResponse.json({ candidate });
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ candidateId: string }> }
) {
  const { candidateId } = await context.params;
  const id = Number(candidateId);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "ID tidak valid." }, { status: 400 });
  const candidate = await prisma.candidateWebsite.findUnique({ where: { id }, include: { project: true } });
  if (!candidate) return NextResponse.json({ error: "Kandidat tidak ditemukan." }, { status: 404 });

  try {
    const page = await inspectPage(candidate.url);
    const relevanceScore = scoreText(candidate.project.keyword, page.title, page.searchText);
    const topical = isTopicallyRelevant(candidate.project.keyword, page.title, page.searchText);
    const hasCompleteForm = page.hasCommentForm && page.hasWebsiteField;
    const inspectionStatus = hasCompleteForm && topical ? "valid"
      : hasCompleteForm || page.hasCommentForm || page.hasWebsiteField ? "review" : "rejected";
    const inspectionReason = inspectionStatus === "valid"
      ? `Form lengkap dan topik relevan (skor ${relevanceScore}).`
      : hasCompleteForm
        ? `Form lengkap, tetapi isi halaman tidak cukup relevan (skor ${relevanceScore}).`
        : inspectionStatus === "review" ? "Hanya sebagian elemen form terdeteksi; periksa manual."
        : "Form komentar dengan field website tidak terdeteksi.";
    const updated = await prisma.candidateWebsite.update({ where: { id }, data: {
      title: page.title || candidate.title, snippet: page.summary || candidate.snippet,
      hasCommentForm: page.hasCommentForm, hasWebsiteField: page.hasWebsiteField,
      relevanceScore,
      inspectionStatus, inspectionReason, inspectedAt: new Date()
    } });
    return NextResponse.json({ candidate: updated });
  } catch (error) {
    const updated = await prisma.candidateWebsite.update({ where: { id }, data: {
      hasCommentForm: false, hasWebsiteField: false, inspectionStatus: "rejected",
      inspectionReason: error instanceof Error ? `Tidak dapat diverifikasi: ${error.message}` : "Pemeriksaan gagal.",
      inspectedAt: new Date()
    } });
    return NextResponse.json({ candidate: updated });
  }
}
