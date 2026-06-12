# AI Backlink Assistant

Web app SEO/backlink berbasis AI untuk membantu mencari kandidat halaman artikel/blog
yang memiliki kolom komentar dan field website, menemukan artikel Telkom University
Surabaya yang relevan, lalu membuat draft komentar yang sopan dan tidak spam.

## Fitur

- Halaman utama untuk input keyword, domain target, dan URL website user
- Search kandidat website menggunakan Serper
- Cek otomatis apakah halaman punya form komentar dan field website/url
- Tabel kandidat dengan status `belum dicek`, `cocok`, dan `tidak cocok`
- Halaman detail kandidat dengan catatan manual
- Pencarian artikel Telkom University Surabaya yang relevan
- Generate komentar AI dengan OpenAI
- Riwayat komentar

## Catatan Etika

Aplikasi ini tidak melakukan auto-submit komentar. User tetap harus membuka website target
dan mengirim komentar secara manual. Gunakan hanya untuk komentar relevan, jangan spam,
jangan keyword stuffing, dan ikuti aturan website tujuan.

## Setup Lokal

```bash
npm install
copy .env.example .env
npx prisma generate
npm run db:init
npm run dev
```

Buka:

```text
http://localhost:3000
```

Isi `.env`:

```env
DATABASE_URL="file:./dev.db"
SERPER_API_KEY="..."
SEARCH_RESULTS_PER_QUERY=10
SEARCH_MAX_CHECKS=100
SEARCH_MATCH_TARGET=40
OPENAI_API_KEY="..."
OPENAI_MODEL="gpt-4.1-mini"
```

## Struktur

- `prisma/schema.prisma` - schema database
- `src/app/api/projects/route.ts` - create project + search kandidat/artikel Telkom
- `src/app/api/candidates/[candidateId]/route.ts` - update status dan catatan
- `src/app/api/candidates/[candidateId]/comments/route.ts` - generate komentar AI
- `src/lib/search.ts` - Search API provider
- `src/lib/page-inspector.ts` - deteksi form komentar dan field website
- `src/lib/ai.ts` - prompt AI komentar
- `src/components/*` - komponen UI dashboard

## Prompt AI

Prompt komentar ada di `src/lib/ai.ts`.

Aturan utamanya:

- natural dan sopan
- tidak spam
- tidak terlalu promosi
- tidak mengandung klaim palsu
- 80-120 kata
- boleh menyisipkan referensi secara halus jika relevan

## TODO Lanjutan

- Tambahkan progress realtime saat search berjalan lama
- Tambahkan provider Tavily/SerpAPI sebagai opsi selain Serper
- Tambahkan auth multi-user
- Tambahkan export CSV hasil kandidat dan komentar
- Tambahkan scheduler untuk re-check kandidat
- Tambahkan scoring kualitas kandidat
