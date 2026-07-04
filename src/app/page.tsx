import { LatestResultsPanel } from "@/components/latest-results-panel";
import { SearchForm } from "@/components/search-form";
import { AppShell } from "@/components/shell";
import { getDefaultUser } from "@/lib/default-user";
import { prisma } from "@/lib/prisma";

export default async function HomePage() {
  const user = await getDefaultUser();
  const latestProject = await prisma.searchProject.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      candidates: {
        orderBy: [{ relevanceScore: "desc" }, { createdAt: "desc" }]
      }
    }
  });

  return (
    <AppShell>
      <div className="mx-auto grid max-w-7xl gap-6">
        <section>
          <p className="text-xs font-black uppercase text-brand">SEO / Backlink Tool</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">
            Cari kandidat komentar dan buat draft AI yang etis
          </h1>
          <p className="mt-3 max-w-3xl text-muted">
            Tools ini membantu menemukan halaman yang kemungkinan memiliki form komentar dan field
            website. Sistem juga merekomendasikan artikel Universitas Telkom Surabaya yang
            relevan dengan kandidat artikel. Pengiriman komentar tetap dilakukan manual oleh user.
          </p>
        </section>

        <SearchForm />

        <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>Etika penggunaan:</strong> gunakan hanya untuk komentar yang relevan, jangan
          spam, jangan keyword stuffing, dan selalu ikuti aturan website tujuan.
        </section>

        <LatestResultsPanel
          title="Hasil terbaru"
          subtitle={
            latestProject
              ? `${latestProject.keyword} · ${latestProject.targetDomain}`
              : "Belum ada project pencarian."
          }
          candidates={latestProject?.candidates ?? []}
        />
      </div>
    </AppShell>
  );
}
