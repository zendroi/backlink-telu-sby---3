import Link from "next/link";

type SidebarProject = {
  id: number;
  keyword: string;
  targetDomain: string;
  createdAt: Date;
};

export function Sidebar({ projects }: { projects: SidebarProject[] }) {
  return (
    <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-line bg-white p-5 lg:block">
      <Link href="/" className="block text-lg font-black">
        AI Backlink Assistant
      </Link>
      <p className="mt-2 text-sm text-muted">
        Cari kandidat komentar, cek field website, dan buat draft komentar etis.
      </p>

      <nav className="mt-8 grid gap-2">
        <Link className="rounded-lg px-3 py-2 text-sm font-bold hover:bg-slate-100" href="/">
          Pencarian Baru
        </Link>
        <Link
          className="rounded-lg px-3 py-2 text-sm font-bold hover:bg-slate-100"
          href="/comments"
        >
          Riwayat Komentar
        </Link>
      </nav>

      <div className="mt-8">
        <h2 className="text-xs font-black uppercase text-muted">Project</h2>
        <div className="mt-3 grid gap-2">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="rounded-lg border border-line p-3 text-sm hover:bg-slate-50"
            >
              <strong className="block truncate">{project.keyword}</strong>
              <span className="text-muted">{project.targetDomain || "all domain"}</span>
            </Link>
          ))}
          {projects.length === 0 && (
            <p className="rounded-lg border border-dashed border-line p-3 text-sm text-muted">
              Belum ada project.
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}
