"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CandidateActions } from "@/components/candidate-actions";
import { StatusBadge } from "@/components/status-badge";

export type CandidateRow = {
  id: number; title: string; url: string; domain: string; status: string;
  hasCommentForm: boolean; hasWebsiteField: boolean; inspectionStatus: string;
  relevanceScore: number; inspectionReason: string | null;
};

function InspectionBadge({ status }: { status: string }) {
  const styles = status === "valid" ? "bg-green-100 text-green-700" : status === "rejected"
    ? "bg-red-100 text-red-700" : status === "pending" ? "bg-slate-100 text-slate-700"
      : "bg-amber-100 text-amber-800";
  const labels: Record<string, string> = { valid: "Valid", review: "Perlu verifikasi",
    rejected: "Ditolak", pending: "Menunggu", stale: "Hasil lama" };
  return <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${styles}`}>{labels[status] || status}</span>;
}

export function CandidateTable({ candidates }: { candidates: CandidateRow[] }) {
  const [filter, setFilter] = useState("valid");
  const shown = useMemo(() => filter === "all" ? candidates :
    candidates.filter((candidate) => candidate.inspectionStatus === filter), [candidates, filter]);
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        {[{ key: "all", label: "Semua" }, { key: "valid", label: "Valid" },
          { key: "review", label: "Form saja / verifikasi" }, { key: "rejected", label: "Ditolak" }].map((item) => (
          <button key={item.key} type="button" onClick={() => setFilter(item.key)}
            className={filter === item.key ? "btn-primary" : "btn-secondary"}>{item.label}</button>
        ))}
      </div>
      <div className="card overflow-hidden"><div className="overflow-x-auto">
        <table className="w-full min-w-[1080px] border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-muted"><tr>
            <th className="p-4">Halaman</th><th className="p-4">Pemeriksaan</th>
            <th className="p-4">Relevansi</th><th className="p-4">Status manual</th><th className="p-4">Aksi</th>
          </tr></thead>
          <tbody>
            {shown.map((candidate) => <tr key={candidate.id} className="border-t border-line align-top">
              <td className="p-4"><Link className="font-extrabold hover:text-brand" href={`/candidates/${candidate.id}`}>{candidate.title}</Link>
                <p className="mt-1 max-w-xl truncate text-muted">{candidate.domain}</p></td>
              <td className="p-4"><InspectionBadge status={candidate.inspectionStatus} />
                <p className="mt-2 max-w-xs text-xs text-muted">{candidate.inspectionReason || "Belum diperiksa."}</p></td>
              <td className="p-4"><strong>{candidate.relevanceScore}/100</strong>
                <p className="mt-1 text-xs text-muted">Komentar: {candidate.hasCommentForm ? "ya" : "tidak"} · Website: {candidate.hasWebsiteField ? "ya" : "tidak"}</p></td>
              <td className="p-4"><StatusBadge status={candidate.status} /></td>
              <td className="p-4"><div className="flex flex-wrap gap-2">
                <a className="btn-secondary" href={candidate.url} rel="noreferrer" target="_blank">Buka Web</a>
                <CandidateActions candidateId={candidate.id} compact />
              </div></td>
            </tr>)}
            {!shown.length && <tr><td className="p-8 text-center text-muted" colSpan={5}>
              {filter === "valid"
                ? "Belum ada kandidat yang terverifikasi memiliki form komentar dan field website. Cek tab Perlu verifikasi hanya untuk pemeriksaan manual."
                : "Tidak ada hasil pada filter ini."}
            </td></tr>}
          </tbody>
        </table>
      </div></div>
    </div>
  );
}
