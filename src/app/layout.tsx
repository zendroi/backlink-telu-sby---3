import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Backlink Assistant",
  description: "SEO/backlink outreach assistant with ethical AI comment drafts."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
