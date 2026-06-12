"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type JobState = {
  id: string;
  status: string;
  progress: number;
  message: string;
  totalFound: number;
  checkedCount: number;
  matchedCount: number;
  rejectedCount: number;
  maxChecks: number;
  matchTarget: number;
};

type CandidateState = {
  id: number;
  title: string;
  url: string;
  domain: string;
};

export function SearchProgress({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [job, setJob] = useState<JobState | null>(null);
  const [candidates, setCandidates] = useState<CandidateState[]>([]);

  useEffect(() => {
    let isMounted = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function poll() {
      const response = await fetch(`/api/search-jobs/${jobId}`, { cache: "no-store" });
      if (!response.ok || !isMounted) return;
      const payload = await response.json();
      setJob(payload.job);
      setCandidates(payload.candidates || []);

      if (payload.job.status === "running" || payload.job.status === "queued") {
        timer = setTimeout(poll, 1200);
      } else {
        router.refresh();
      }
    }

    poll();

    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
    };
  }, [jobId, router]);

  if (!job) {
    return (
      <section className="card p-5">
        <p className="text-sm text-muted">Menyiapkan progress pencarian...</p>
      </section>
    );
  }

  return (
    <section className="card grid gap-5 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-black">Progress pencarian</h2>
          <p className="mt-1 text-sm text-muted">{job.message}</p>
        </div>
        <strong className="text-3xl">{job.progress}%</strong>
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-brand transition-all"
          style={{ width: `${Math.max(0, Math.min(100, job.progress))}%` }}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Metric label="URL ditemukan" value={job.totalFound} />
        <Metric label={`Dicek / ${job.maxChecks}`} value={job.checkedCount} />
        <Metric label={`Valid / target ${job.matchTarget}`} value={job.matchedCount} />
        <Metric label="Ditolak" value={job.rejectedCount} />
      </div>

      <div className="rounded-lg border border-line">
        <div className="border-b border-line bg-slate-50 px-4 py-3">
          <h3 className="font-black">Kandidat valid live</h3>
          <p className="text-sm text-muted">
            Hanya halaman yang punya form komentar dan field website yang muncul di sini.
          </p>
        </div>
        <div className="grid gap-0">
          {candidates.map((candidate) => (
            <div
              className="grid gap-2 border-b border-line p-4 last:border-b-0 md:grid-cols-[1fr_auto]"
              key={candidate.id}
            >
              <div>
                <Link className="font-extrabold hover:text-brand" href={`/candidates/${candidate.id}`}>
                  {candidate.title}
                </Link>
                <p className="mt-1 break-all text-sm text-muted">{candidate.url}</p>
              </div>
              <a className="btn-secondary" href={candidate.url} rel="noreferrer" target="_blank">
                Buka Web
              </a>
            </div>
          ))}
          {candidates.length === 0 && (
            <p className="p-4 text-sm text-muted">
              Belum ada kandidat valid. Sistem sedang menolak halaman yang tidak punya form komentar
              dan field website.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <span className="text-sm text-muted">{label}</span>
      <strong className="mt-2 block text-2xl">{value}</strong>
    </div>
  );
}
