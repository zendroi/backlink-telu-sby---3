import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  context: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await context.params;
  const job = await prisma.searchJob.findUnique({
    where: { id: jobId },
    include: {
      project: {
        include: {
          candidates: {
            orderBy: [{ relevanceScore: "desc" }, { createdAt: "desc" }]
          }
        }
      }
    }
  });

  if (!job) {
    return NextResponse.json({ error: "Job tidak ditemukan." }, { status: 404 });
  }

  return NextResponse.json({
    job: {
      id: job.id,
      projectId: job.projectId,
      status: job.status,
      progress: job.progress,
      message: job.message,
      totalFound: job.totalFound,
      checkedCount: job.checkedCount,
      matchedCount: job.matchedCount,
      rejectedCount: job.rejectedCount,
      maxChecks: job.maxChecks,
      matchTarget: job.matchTarget
    },
    candidates: job.project.candidates
  });
}
