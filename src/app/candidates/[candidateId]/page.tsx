import { notFound } from "next/navigation";
import { CandidateActions } from "@/components/candidate-actions";
import { NotesForm } from "@/components/notes-form";
import { AppShell } from "@/components/shell";
import { StatusBadge } from "@/components/status-badge";
import { prisma } from "@/lib/prisma";

export default async function CandidatePage({
  params
}: {
  params: Promise<{ candidateId: string }>;
}) {
  const { candidateId } = await params;
  const id = Number(candidateId);
  if (!Number.isFinite(id)) notFound();

  const candidate = await prisma.candidateWebsite.findUnique({
    where: { id },
    include: {
      project: true,
      comments: {
        orderBy: { createdAt: "desc" },
        include: { telkomArticle: true }
      }
    }
  });

  if (!candidate) notFound();

  return (
    <AppShell>
      <div className="mx-auto grid max-w-5xl gap-6">
        <section className="grid gap-4 lg:grid-cols-[1fr_auto]">
          <div>
            <p className="text-xs font-black uppercase text-brand">Detail kandidat</p>
            <h1 className="mt-2 text-3xl font-black">{candidate.title}</h1>
            <a className="mt-2 block break-all text-sm text-brand" href={candidate.url} target="_blank">
              {candidate.url}
            </a>
          </div>
          <div className="flex items-start">
            <StatusBadge status={candidate.status} />
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="card p-4">
            <span className="text-sm text-muted">Ada form komentar</span>
            <strong className="mt-2 block text-2xl">
              {candidate.hasCommentForm ? "Ya" : "Tidak"}
            </strong>
          </div>
          <div className="card p-4">
            <span className="text-sm text-muted">Ada field website</span>
            <strong className="mt-2 block text-2xl">
              {candidate.hasWebsiteField ? "Ya" : "Tidak"}
            </strong>
          </div>
          <div className="card p-4">
            <span className="text-sm text-muted">Domain</span>
            <strong className="mt-2 block text-2xl">{candidate.domain || "-"}</strong>
          </div>
        </section>

        <section className="card grid gap-4 p-5">
          <h2 className="text-xl font-black">Aksi</h2>
          <CandidateActions candidateId={candidate.id} />
          <NotesForm candidateId={candidate.id} initialNotes={candidate.notes || ""} />
        </section>

        <section className="grid gap-3">
          <h2 className="text-xl font-black">Riwayat komentar AI</h2>
          {candidate.comments.map((comment) => (
            <article className="card p-5" key={comment.id}>
              <p className="whitespace-pre-wrap leading-7">{comment.generatedComment}</p>
              <div className="mt-4 grid gap-2 rounded-lg bg-slate-50 p-4 text-sm">
                <p>
                  <strong>Anchor text:</strong> {comment.suggestedAnchorText}
                </p>
                {comment.telkomArticle && (
                  <p>
                    <strong>Artikel Telkom:</strong>{" "}
                    <a className="text-brand" href={comment.telkomArticle.url} target="_blank">
                      {comment.telkomArticle.title}
                    </a>
                  </p>
                )}
                <p>
                  <strong>Catatan etika SEO:</strong> {comment.ethicalNote}
                </p>
              </div>
            </article>
          ))}
          {candidate.comments.length === 0 && (
            <p className="card p-5 text-sm text-muted">
              Belum ada komentar. Klik Generate Komentar untuk membuat draft.
            </p>
          )}
        </section>
      </div>
    </AppShell>
  );
}
