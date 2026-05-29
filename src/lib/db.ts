// IndexedDB wrapper for PageTurner library, progress, and caches.
import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export interface DocPage {
  pageNumber: number;
  startSentenceIdx: number; // inclusive
  endSentenceIdx: number;   // exclusive
}

export interface DocRecord {
  id: string;
  title: string;
  folder?: string;
  kind?: "narrative" | "study" | "reference";
  source: "paste" | "pdf" | "epub" | "docx" | "image" | "txt";
  createdAt: number;
  updatedAt: number;
  wordCount: number;
  sentenceCount: number;
  sentences: string[];
  pages?: DocPage[]; // PDF only
  totalPages?: number;
  // Pre-computed
  tensionScores: number[]; // length === sentences.length, 0..10
  peaks: number[]; // sentence indices
  coverHue: number; // 0-360 for gradient cover
  sectionTitles?: { sentenceIdx: number; title: string }[];
}

export interface ProgressRecord {
  docId: string;
  sentenceIdx: number;
  updatedAt: number;
  lastSessionStart: number;
}

interface PageTurnerDB extends DBSchema {
  documents: {
    key: string;
    value: DocRecord;
    indexes: { "by-updated": number };
  };
  progress: {
    key: string; // docId
    value: ProgressRecord;
  };
  meanings: {
    key: string; // word lowercase
    value: { word: string; definition: string; partOfSpeech?: string; synonyms?: string[]; cachedAt: number };
  };
}

let dbPromise: Promise<IDBPDatabase<PageTurnerDB>> | null = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<PageTurnerDB>("pageturner", 1, {
      upgrade(db) {
        const docs = db.createObjectStore("documents", { keyPath: "id" });
        docs.createIndex("by-updated", "updatedAt");
        db.createObjectStore("progress", { keyPath: "docId" });
        db.createObjectStore("meanings", { keyPath: "word" });
      },
    });
  }
  return dbPromise;
}

export async function saveDoc(doc: DocRecord) {
  const db = await getDB();
  await db.put("documents", doc);
}

export async function getDoc(id: string): Promise<DocRecord | undefined> {
  const db = await getDB();
  return db.get("documents", id);
}

export async function listDocs(): Promise<DocRecord[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex("documents", "by-updated");
  return all.reverse();
}

export async function deleteDoc(id: string) {
  const db = await getDB();
  await db.delete("documents", id);
  await db.delete("progress", id);
}

export async function updateDocMeta(id: string, patch: Pick<Partial<DocRecord>, "title" | "folder">) {
  const db = await getDB();
  const doc = await db.get("documents", id);
  if (!doc) return undefined;
  const next = { ...doc, ...patch, updatedAt: Date.now() };
  await db.put("documents", next);
  return next;
}

export async function saveProgress(p: ProgressRecord) {
  const db = await getDB();
  await db.put("progress", p);
}

export async function getProgress(docId: string): Promise<ProgressRecord | undefined> {
  const db = await getDB();
  return db.get("progress", docId);
}

export async function getCachedMeaning(word: string) {
  const db = await getDB();
  return db.get("meanings", word.toLowerCase());
}

export async function cacheMeaning(word: string, definition: string, partOfSpeech?: string, synonyms: string[] = []) {
  const db = await getDB();
  await db.put("meanings", { word: word.toLowerCase(), definition, partOfSpeech, synonyms, cachedAt: Date.now() });
}
