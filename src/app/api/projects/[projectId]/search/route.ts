import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSearchJob, runSearchJob } from "@/lib/search-job-runner";

export async function POST(
  _request: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await context.params;
  const id = Number(projectId);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "ID project tidak valid." }, { status: 400 });
  const project = await prisma.searchProject.findUnique({ where: { id }, select: { id: true } });
  if (!project) return NextResponse.json({ error: "Project tidak ditemukan." }, { status: 404 });
  const active = await prisma.searchJob.findFirst({
    where: { projectId: id, status: { in: ["queued", "running"] } }, orderBy: { createdAt: "desc" }
  });
  if (active) return NextResponse.json({ jobId: active.id, projectId: id });
  const job = await createSearchJob(id);
  void runSearchJob(job.id);
  return NextResponse.json({ jobId: job.id, projectId: id }, { status: 201 });
}
