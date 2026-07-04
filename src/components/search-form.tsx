"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { DEFAULT_TARGET_DOMAINS } from "@/lib/domain";

export function SearchForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [targetDomain, setTargetDomain] = useState("");
  const [domainSearch, setDomainSearch] = useState("");
  const [error, setError] = useState("");

  const filteredDomains = useMemo(() => {
    const query = domainSearch.trim().toLowerCase();
    if (!query) return DEFAULT_TARGET_DOMAINS;
    return DEFAULT_TARGET_DOMAINS.filter((domain) => domain.includes(query));
  }, [domainSearch]);

  function onDomainSearch(value: string) {
    setDomainSearch(value);
    const normalized = value.trim().toLowerCase();
    const exactMatch = DEFAULT_TARGET_DOMAINS.find((domain) => domain === normalized);
    if (exactMatch) {
      setTargetDomain(exactMatch);
    }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError("");
    window.dispatchEvent(new Event("search:start"));

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        keyword: formData.get("keyword"),
        targetDomain,
        customDomain: formData.get("customDomain"),
        userWebsiteUrl: formData.get("telkomBaseUrl")
      })
    });

    const payload = await response.json();
    setIsLoading(false);

    if (!response.ok) {
      const fieldErrors = payload.details?.fieldErrors
        ? Object.entries(payload.details.fieldErrors)
            .map(([field, messages]) => `${field}: ${(messages as string[]).join(", ")}`)
            .join(" | ")
        : "";
      setError([payload.error || "Gagal mencari kandidat.", fieldErrors].filter(Boolean).join(" "));
      return;
    }

    router.push(`/projects/${payload.projectId}?jobId=${payload.jobId}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="card p-5">
      <div className="grid gap-4 md:grid-cols-[1.2fr_1.2fr_0.8fr_auto]">
        <label className="label">
          Keyword / topik
          <input className="input" name="keyword" placeholder="Contoh: data science" required />
        </label>

        <div className="grid gap-1.5">
          <label className="text-sm font-bold text-slate-700" htmlFor="domainSearch">
          Filter domain kandidat <span className="font-normal text-muted">(opsional)</span>
          </label>
          <input
            className="input"
            id="domainSearch"
            placeholder="Ketik cepat, contoh .edu"
            value={domainSearch}
            onChange={(event) => onDomainSearch(event.target.value)}
          />
          <select
            aria-label="Domain target"
            className="input"
            value={targetDomain}
            onChange={(event) => setTargetDomain(event.target.value)}
          >
            <option value="">No Domain Filter</option>
            {filteredDomains.map((domain) => (
              <option key={domain} value={domain}>
                {domain}
              </option>
            ))}
            <option value="custom">custom domain</option>
          </select>
          <p className="text-xs text-muted">
            {filteredDomains.length} domain cocok. Pilih kosong untuk search tanpa filter.
          </p>
        </div>

        <label className="label">
          URL halaman yang dipromosikan
          <input
            className="input"
            name="telkomBaseUrl"
            placeholder="https://surabaya.telkomuniversity.ac.id/artikel-anda/"
            type="url"
            required
          />
          <span className="text-xs font-normal text-muted">
            Isi halaman ini dipakai sebagai konteks agar rekomendasi dan komentar lebih relevan.
          </span>
        </label>

        <div className="flex items-end">
          <button className="btn-primary w-full" disabled={isLoading}>
            {isLoading ? "Menyiapkan..." : "Cari Cepat"}
          </button>
        </div>
      </div>

      {targetDomain === "custom" && (
        <label className="label mt-4 max-w-xs">
          Custom domain
          <input className="input" name="customDomain" placeholder=".edu.au atau .ac.id" />
        </label>
      )}

      {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-danger">{error}</p>}
    </form>
  );
}
