import fs from "node:fs";
import { PrismaClient } from "@prisma/client";

function loadEnv() {
  if (!fs.existsSync(".env")) return;
  const text = fs.readFileSync(".env", "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [key, ...rest] = trimmed.split("=");
    if (process.env[key]) continue;
    process.env[key] = rest.join("=").replace(/^"|"$/g, "");
  }
}

loadEnv();

const prisma = new PrismaClient();

const statements = [
  `PRAGMA foreign_keys = ON`,
  `CREATE TABLE IF NOT EXISTS User (
    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS SearchProject (
    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    keyword TEXT NOT NULL,
    targetDomain TEXT NOT NULL,
    userWebsiteUrl TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT SearchProject_userId_fkey FOREIGN KEY (userId) REFERENCES User (id) ON DELETE RESTRICT ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS SearchJob (
    id TEXT NOT NULL PRIMARY KEY,
    projectId INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued',
    progress INTEGER NOT NULL DEFAULT 0,
    message TEXT NOT NULL DEFAULT '',
    totalFound INTEGER NOT NULL DEFAULT 0,
    checkedCount INTEGER NOT NULL DEFAULT 0,
    matchedCount INTEGER NOT NULL DEFAULT 0,
    rejectedCount INTEGER NOT NULL DEFAULT 0,
    maxChecks INTEGER NOT NULL DEFAULT 100,
    matchTarget INTEGER NOT NULL DEFAULT 40,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT SearchJob_projectId_fkey FOREIGN KEY (projectId) REFERENCES SearchProject (id) ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS CandidateWebsite (
    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    projectId INTEGER NOT NULL,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    domain TEXT NOT NULL,
    hasCommentForm BOOLEAN NOT NULL DEFAULT false,
    hasWebsiteField BOOLEAN NOT NULL DEFAULT false,
    status TEXT NOT NULL DEFAULT 'belum dicek',
    notes TEXT,
    searchQuery TEXT,
    snippet TEXT,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT CandidateWebsite_projectId_fkey FOREIGN KEY (projectId) REFERENCES SearchProject (id) ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS CandidateWebsite_projectId_url_key ON CandidateWebsite(projectId, url)`,
  `CREATE TABLE IF NOT EXISTS TelkomArticle (
    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    projectId INTEGER NOT NULL,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    summary TEXT NOT NULL,
    relevanceReason TEXT NOT NULL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT TelkomArticle_projectId_fkey FOREIGN KEY (projectId) REFERENCES SearchProject (id) ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS TelkomArticle_projectId_url_key ON TelkomArticle(projectId, url)`,
  `CREATE TABLE IF NOT EXISTS GeneratedComment (
    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    candidateWebsiteId INTEGER NOT NULL,
    telkomArticleId INTEGER,
    generatedComment TEXT NOT NULL,
    suggestedAnchorText TEXT NOT NULL,
    ethicalNote TEXT NOT NULL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT GeneratedComment_candidateWebsiteId_fkey FOREIGN KEY (candidateWebsiteId) REFERENCES CandidateWebsite (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT GeneratedComment_telkomArticleId_fkey FOREIGN KEY (telkomArticleId) REFERENCES TelkomArticle (id) ON DELETE SET NULL ON UPDATE CASCADE
  )`
];

for (const statement of statements) {
  await prisma.$executeRawUnsafe(statement);
}

await prisma.$disconnect();
console.log("SQLite tables are ready.");
