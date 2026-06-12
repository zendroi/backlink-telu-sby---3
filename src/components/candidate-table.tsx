import Link from "next/link";
import { CandidateActions } from "@/components/candidate-actions";
import { StatusBadge } from "@/components/status-badge";

type CandidateRow = {
  id: number;
  title: string;
  url: string;
  domain: string;
  status: string;
  hasCommentForm: boolean;
  hasWebsiteField: boolean;
};

function YesNo({ value }: { value: boolean }) {
  return (
    <span className={value ? "font-bold text-green-700" : "font-bold text-red-700"}>
      {value ? "ya" : "tidak"}
    </span>
  );
}

export function CandidateTable({ candidates }: { candidates: CandidateRow[] }) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-muted">
            <tr>
              <th className="p-4">Judul halaman</th>
              <th className="p-4">Domain</th>
              <th className="p-4">Status</th>
              <th className="p-4">Komentar</th>
              <th className="p-4">Website field</th>
              <th className="p-4">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((candidate) => (
              <tr key={candidate.id} className="border-t border-line align-top">
                <td className="p-4">
                  <Link className="font-extrabold hover:text-brand" href={`/candidates/${candidate.id}`}>
                    {candidate.title}
                  </Link>
                  <p className="mt-1 max-w-xl truncate text-muted">{candidate.url}</p>
                </td>
                <td className="p-4">{candidate.domain || "-"}</td>
                <td className="p-4">
                  <StatusBadge status={candidate.status} />
                </td>
                <td className="p-4">
                  <YesNo value={candidate.hasCommentForm} />
                </td>
                <td className="p-4">
                  <YesNo value={candidate.hasWebsiteField} />
                </td>
                <td className="p-4">
                  <div className="flex flex-wrap gap-2">
                    <a className="btn-secondary" href={candidate.url} rel="noreferrer" target="_blank">
                      Buka Web
                    </a>
                    <CandidateActions candidateId={candidate.id} compact />
                  </div>
                </td>
              </tr>
            ))}
            {candidates.length === 0 && (
              <tr>
                <td className="p-8 text-center text-muted" colSpan={6}>
                  Belum ada kandidat. Jalankan pencarian dari form utama.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
