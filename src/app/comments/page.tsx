import Link from "next/link";
import { AppShell } from "@/components/shell";
import { prisma } from "@/lib/prisma";

export default async function CommentsPage() {
  const comments = await prisma.generatedComment.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      candidateWebsite: {
        include: {
          project: true
        }
      },
      telkomArticle: true
    }
  });

  return (
    <AppShell>
      <div className="mx-auto grid max-w-5xl gap-6">
        <section>
          <p className="text-xs font-black uppercase text-brand">Riwayat</p>
          <h1 className="mt-2 text-3xl font-black">Komentar AI</h1>
        </section>

        <section className="grid gap-3">
          {comments.map((comment) => (
            <article className="card p-5" key={comment.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Link
                  className="font-extrabold hover:text-brand"
                  href={`/candidates/${comment.candidateWebsiteId}`}
                >
                  {comment.candidateWebsite.title}
                </Link>
                <span className="text-sm text-muted">
                  {comment.candidateWebsite.project.keyword}
                </span>
              </div>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-7">
                {comment.generatedComment}
              </p>
              <p className="mt-3 text-sm text-muted">
                Anchor: <strong>{comment.suggestedAnchorText}</strong>
              </p>
            </article>
          ))}
          {comments.length === 0 && (
            <p className="card p-5 text-sm text-muted">Belum ada komentar yang digenerate.</p>
          )}
        </section>
      </div>
    </AppShell>
  );
}
