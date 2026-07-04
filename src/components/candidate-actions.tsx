"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type ArticleOption = { id: number; title: string; relevanceScore: number };

export function CandidateActions({
  candidateId,
  compact = false,
  articles = []
}: {
  candidateId: number;
  compact?: boolean;
  articles?: ArticleOption[];
}) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [articleId, setArticleId] = useState(articles[0]?.id?.toString() || "");
  const [message, setMessage] = useState("");

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
    setMessage("");
    const response = await fetch(`/api/candidates/${candidateId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(articleId ? { telkomArticleId: Number(articleId) } : {})
    });
    const payload = await response.json().catch(() => ({}));
    setIsGenerating(false);
    if (response.ok) {
      setMessage("Draft berhasil dibuat.");
      router.push(`/candidates/${candidateId}`);
      router.refresh();
    } else {
      setMessage(payload.error || "Generate komentar gagal.");
    }
  }

  async function recheck() {
    setIsSaving(true);
    setMessage("");
    const response = await fetch(`/api/candidates/${candidateId}`, { method: "POST" });
    const payload = await response.json().catch(() => ({}));
    setIsSaving(false);
    if (!response.ok) setMessage(payload.error || "Pemeriksaan ulang gagal.");
    router.refresh();
  }

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        <button className="btn-secondary" disabled={isSaving} onClick={() => updateStatus("cocok")} type="button">Cocok</button>
        <button className="btn-secondary" disabled={isSaving} onClick={() => updateStatus("tidak cocok")} type="button">Tidak Cocok</button>
        <button className="btn-secondary" disabled={isSaving} onClick={recheck} type="button">Cek Ulang</button>
        <Link className="btn-primary" href={`/candidates/${candidateId}`}>Review & Generate</Link>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2"><button
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
      <button className="btn-secondary" disabled={isSaving} onClick={recheck} type="button">
        {isSaving ? "Memeriksa..." : "Cek Ulang Form"}
      </button>
      </div>
      <label className="label max-w-2xl">
        Artikel Telkom sebagai referensi
        <select className="input" value={articleId} onChange={(event) => setArticleId(event.target.value)}>
          <option value="">Pilih otomatis berdasarkan relevansi</option>
          {articles.map((article) => (
            <option key={article.id} value={article.id}>{article.title} - skor {article.relevanceScore}</option>
          ))}
        </select>
      </label>
      {message && <p className={message.includes("berhasil") ? "text-sm text-green-700" : "rounded-lg bg-red-50 p-3 text-sm text-danger"}>{message}</p>}
    </div>
  );
}
