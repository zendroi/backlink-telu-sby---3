import { domains } from "@/config/domain-list";

export const DEFAULT_TARGET_DOMAINS = domains;

export function normalizeDomain(input: string) {
  const value = input.trim().toLowerCase();
  if (!value) return "";
  if (value === "custom") return "";
  return value.startsWith(".") ? value : `.${value}`;
}

export function extractHostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function extractDomainLabel(url: string) {
  const host = extractHostname(url);
  if (!host) return "";
  const parts = host.split(".");
  if (parts.length < 2) return host;
  return `.${parts.slice(-1)[0]}`;
}
