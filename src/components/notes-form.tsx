"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function NotesForm({
  candidateId,
  initialNotes
}: {
  candidateId: number;
  initialNotes: string;
}) {
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes);
  const [isSaving, setIsSaving] = useState(false);

  async function saveNotes() {
    setIsSaving(true);
    await fetch(`/api/candidates/${candidateId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes })
    });
    setIsSaving(false);
    router.refresh();
  }

  return (
    <div className="grid gap-3">
      <label className="label">
        Catatan manual
        <textarea
          className="input min-h-28"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Contoh: form komentar ada, tapi komentar dimoderasi."
        />
      </label>
      <button className="btn-secondary justify-self-start" disabled={isSaving} onClick={saveNotes}>
        {isSaving ? "Menyimpan..." : "Simpan Catatan"}
      </button>
    </div>
  );
}
