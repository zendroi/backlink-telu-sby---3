"use client";

import { useEffect, useState } from "react";
import { CandidateTable } from "@/components/candidate-table";

type CandidateRow = {
  id: number;
  title: string;
  url: string;
  domain: string;
  status: string;
  hasCommentForm: boolean;
  hasWebsiteField: boolean;
};

export function LatestResultsPanel({
  title,
  subtitle,
  candidates
}: {
  title: string;
  subtitle: string;
  candidates: CandidateRow[];
}) {
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    function handleSearchStart() {
      setIsSearching(true);
    }

    window.addEventListener("search:start", handleSearchStart);
    return () => window.removeEventListener("search:start", handleSearchStart);
  }, []);

  if (isSearching) {
    return (
      <section className="grid gap-3">
        <div>
          <h2 className="text-xl font-black">{title}</h2>
          <p className="text-sm text-muted">Membuat pencarian baru. Hasil lama disembunyikan.</p>
        </div>
        <div className="card p-8 text-center text-sm text-muted">
          Menyiapkan halaman progress real-time...
        </div>
      </section>
    );
  }

  return (
    <section className="grid gap-3">
      <div>
        <h2 className="text-xl font-black">{title}</h2>
        <p className="text-sm text-muted">{subtitle}</p>
      </div>
      <CandidateTable candidates={candidates} />
    </section>
  );
}
