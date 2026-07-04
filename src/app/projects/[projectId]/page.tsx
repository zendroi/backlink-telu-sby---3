import { notFound } from "next/navigation";
import { CandidateTable } from "@/components/candidate-table";
import { SearchProgress } from "@/components/search-progress";
import { RerunSearchButton } from "@/components/rerun-search-button";
import { AppShell } from "@/components/shell";
import { prisma } from "@/lib/prisma";

export default async function ProjectPage({
  params,
  searchParams
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ jobId?: string }>;
}) {
  const { projectId } = await params;
  const { jobId } = await searchParams;
  const id = Number(projectId);
  if (!Number.isFinite(id)) notFound();

  const project = await prisma.searchProject.findUnique({
    where: { id },
    include: {
      candidates: {
        orderBy: [{ relevanceScore: "desc" }, { createdAt: "desc" }]
      },
      articles: {
        orderBy: { relevanceScore: "desc" }
      }
    }
  });

  if (!project) notFound();

  const latestJob = jobId
    ? await prisma.searchJob.findFirst({
        where: { projectId: id },
        orderBy: { createdAt: "desc" },
        select: { id: true }
      })
    : null;
  const displayedJobId = latestJob?.id || jobId;

  const matched = project.candidates.filter(
    (candidate) => candidate.hasCommentForm && candidate.hasWebsiteField
  ).length;

  return (
    <AppShell>
      <div className="mx-auto grid max-w-7xl gap-6">
        <section className="grid gap-4 lg:grid-cols-[1fr_auto]">
          <div>
            <p className="text-xs font-black uppercase text-brand">Project</p>
            <h1 className="mt-2 text-3xl font-black">{project.keyword}</h1>
            <p className="mt-2 text-muted">
              Domain target: {project.targetDomain || "tanpa domain"} · Sumber artikel:{" "}
              Universitas Telkom Surabaya
            </p>
            <a className="mt-1 block break-all text-sm text-brand" href={project.userWebsiteUrl} target="_blank">
              Halaman yang dipromosikan: {project.userWebsiteTitle || project.userWebsiteUrl}
            </a>
          </div>
          <div className="grid gap-3">
          <div className="card grid grid-cols-3 gap-4 p-4 text-center">
            <div>
              <strong className="block text-2xl">{project.candidates.length}</strong>
              <span className="text-xs text-muted">Hasil ditemukan</span>
            </div>
            <div>
              <strong className="block text-2xl">{matched}</strong>
              <span className="text-xs text-muted">Field lengkap</span>
            </div>
            <div>
              <strong className="block text-2xl">{project.articles.length}</strong>
              <span className="text-xs text-muted">Artikel Telkom</span>
            </div>
          </div>
          <RerunSearchButton projectId={project.id} />
          </div>
        </section>

        {displayedJobId && <SearchProgress jobId={displayedJobId} />}

        <section className="grid gap-3">
          <h2 className="text-xl font-black">Hasil pemeriksaan kandidat</h2>
          <CandidateTable candidates={project.candidates} />
        </section>

        <section className="grid gap-3">
          <h2 className="text-xl font-black">Artikel Telkom University Surabaya</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {project.articles.map((article) => (
              <article className="card p-4" key={article.id}>
                <a className="font-extrabold hover:text-brand" href={article.url} target="_blank">
                  {article.title}
                </a>
                <p className="mt-2 line-clamp-3 text-sm text-muted">{article.summary}</p>
                <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-muted">
                  {article.relevanceReason}
                </p>
                <p className="mt-2 text-xs font-bold text-brand">Skor relevansi: {article.relevanceScore}/100</p>
              </article>
            ))}
            {project.articles.length === 0 && (
              <p className="card p-5 text-sm text-muted">
                Artikel Telkom belum ditemukan. Pastikan Search API aktif dan keyword cukup jelas.
              </p>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
