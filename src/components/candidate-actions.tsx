"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CandidateActions({
  candidateId,
  compact = false
}: {
  candidateId: number;
  compact?: boolean;
}) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  async function updateStatus(status: "cocok" | "tidak cocok") {
    setIsSaving(true);
    await fetch(`/api/candidates/${candidateId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    setIsSaving(false);
    router.refresh();
  }

  async function generateComment() {
    setIsGenerating(true);
    const response = await fetch(`/api/candidates/${candidateId}/comments`, {
      method: "POST"
    });
    setIsGenerating(false);
    if (response.ok) {
      router.push(`/candidates/${candidateId}`);
      router.refresh();
    }
  }

  return (
    <div className={compact ? "flex flex-wrap gap-2" : "grid gap-2 sm:flex"}>
      <button
        className="btn-secondary"
        disabled={isSaving}
        onClick={() => updateStatus("cocok")}
        type="button"
      >
        Cocok
      </button>
      <button
        className="btn-secondary"
        disabled={isSaving}
        onClick={() => updateStatus("tidak cocok")}
        type="button"
      >
        Tidak Cocok
      </button>
      <button className="btn-primary" disabled={isGenerating} onClick={generateComment} type="button">
        {isGenerating ? "Generate..." : "Generate Komentar"}
      </button>
    </div>
  );
}
