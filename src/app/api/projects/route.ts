import { NextResponse } from "next/server";
import { z } from "zod";
import { getDefaultUser } from "@/lib/default-user";
import { normalizeDomain } from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import { createSearchJob, runSearchJob } from "@/lib/search-job-runner";

const CreateProjectSchema = z.object({
  keyword: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : ""),
    z.string().min(2)
  ),
  targetDomain: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : ""),
    z.string()
  ),
  customDomain: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : ""),
    z.string()
  ),
  userWebsiteUrl: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : ""),
    z.string().url("URL website harus valid.")
  )
});

function resolveTargetDomain(targetDomain: string, customDomain?: string) {
  if (targetDomain === "custom") {
    return normalizeDomain(customDomain || "");
  }
  return normalizeDomain(targetDomain);
}

export async function GET() {
  const user = await getDefaultUser();
  const projects = await prisma.searchProject.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          candidates: true,
          articles: true
        }
      }
    }
  });

  return NextResponse.json({ projects });
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = CreateProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Input tidak valid.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const user = await getDefaultUser();
  const targetDomain = resolveTargetDomain(
    parsed.data.targetDomain,
    parsed.data.customDomain
  );
  const project = await prisma.searchProject.create({
    data: {
      userId: user.id,
      keyword: parsed.data.keyword,
      targetDomain,
      userWebsiteUrl: new URL(parsed.data.userWebsiteUrl).toString()
    }
  });

  const job = await createSearchJob(project.id);
  void runSearchJob(job.id);

  return NextResponse.json(
    {
      projectId: project.id,
      jobId: job.id
    },
    { status: 201 }
  );
}
