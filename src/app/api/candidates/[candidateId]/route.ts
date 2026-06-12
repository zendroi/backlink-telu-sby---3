import { NextResponse } from "next/server";
import { z } from "zod";
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
