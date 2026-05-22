// Lightweight engagement tracking (streak, words, per-book progress).
// Pure localStorage, no backend. Triggers a "lumen:engage" window event on save
// so React components can re-read without prop drilling.
import { useEffect, useState } from "react";

const KEY = "lumen:engage:v1";
const EVT = "lumen:engage";

export interface BookProgress {
  chapterIdx: number;
  blockIdx: number;
  totalBlocks: number;
  totalChapters: number;
  pct: number;            // 0..1, overall position in book
  updatedAt: number;
  lastLine?: string;      // short preview of the last block read
  finished?: boolean;
}

export interface Engage {
  streak: number;
  lastDay: string;        // YYYY-MM-DD of last activity
  todayKey: string;       // YYYY-MM-DD wordsToday refers to
  wordsToday: number;
  totalWords: number;
  chaptersFinished: number;
  booksFinished: number;
  lastBookId?: string;
  bookProgress: Record<string, BookProgress>;
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fresh(): Engage {
  return {
    streak: 0,
    lastDay: "",
    todayKey: todayStr(),
    wordsToday: 0,
    totalWords: 0,
    chaptersFinished: 0,
    booksFinished: 0,
    bookProgress: {},
  };
}

export function loadEngage(): Engage {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    const e = { ...fresh(), ...JSON.parse(raw) } as Engage;
    // Roll over wordsToday if the day changed
    const t = todayStr();
    if (e.todayKey !== t) {
      e.todayKey = t;
      e.wordsToday = 0;
    }
    // Reset streak if missed a day (>1 day gap)
    if (e.lastDay && e.lastDay !== t && e.lastDay !== yesterdayStr()) {
      e.streak = 0;
    }
    return e;
  } catch {
    return fresh();
  }
}

function save(e: Engage) {
  localStorage.setItem(KEY, JSON.stringify(e));
  window.dispatchEvent(new CustomEvent(EVT));
}

/** Call when a block is read. `words` is the block's word count. */
export function recordBlockRead(opts: {
  bookId: string;
  words: number;
  chapterIdx: number;
  blockIdx: number;
  totalBlocks: number;
  totalChapters: number;
  pct: number;
  lastLine?: string;
}) {
  const e = loadEngage();
  const t = todayStr();

  // Streak bookkeeping
  if (e.lastDay !== t) {
    if (e.lastDay === yesterdayStr()) e.streak += 1;
    else e.streak = 1;
    e.lastDay = t;
  }

  e.wordsToday += opts.words;
  e.totalWords += opts.words;
  e.lastBookId = opts.bookId;

  const prev = e.bookProgress[opts.bookId];
  e.bookProgress[opts.bookId] = {
    chapterIdx: opts.chapterIdx,
    blockIdx: opts.blockIdx,
    totalBlocks: opts.totalBlocks,
    totalChapters: opts.totalChapters,
    pct: Math.max(prev?.pct ?? 0, opts.pct),
    updatedAt: Date.now(),
    lastLine: opts.lastLine ?? prev?.lastLine,
    finished: prev?.finished || opts.pct >= 0.999,
  };

  save(e);
}

/** Call when a chapter is fully completed. */
export function recordChapterFinished(bookId: string, isLastChapter: boolean) {
  const e = loadEngage();
  e.chaptersFinished += 1;
  if (isLastChapter) {
    e.booksFinished += 1;
    const bp = e.bookProgress[bookId];
    if (bp) bp.finished = true;
  }
  save(e);
}

/** React hook — re-renders whenever engagement changes. */
export function useEngagement(): Engage {
  const [state, setState] = useState<Engage>(() => loadEngage());
  useEffect(() => {
    const onChange = () => setState(loadEngage());
    window.addEventListener(EVT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(EVT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);
  return state;
}

export function getBookProgress(bookId: string): BookProgress | undefined {
  return loadEngage().bookProgress[bookId];
}