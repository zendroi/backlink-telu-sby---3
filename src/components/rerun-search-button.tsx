"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RerunSearchButton({ projectId }: { projectId: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function rerun() {
    setLoading(true);
    setError("");
    const response = await fetch(`/api/projects/${projectId}/search`, { method: "POST" });
    const payload = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok) return setError(payload.error || "Pencarian ulang gagal.");
    router.push(`/projects/${projectId}?jobId=${payload.jobId}`);
    router.refresh();
  }
  return <div className="grid justify-items-end gap-2">
    <button className="btn-primary" disabled={loading} onClick={rerun} type="button">
      {loading ? "Menyiapkan..." : "Cari Kandidat Lagi"}
    </button>
    {error && <span className="text-xs text-danger">{error}</span>}
  </div>;
}
