// Bundled curated books. Read-only. The reader loads chapters from here.
import jekyllJson from "./book.json";
import happyPrinceJson from "./happy-prince.json";
import animalFarmJson from "./animal-farm.json";
import nineteenEightyFourJson from "./1984.json";
import gatsbyJson from "./gatsby.json";
import sherlockJson from "./sherlock.json";

export interface Scene {
  text: string;
  score: number;          // 0–10 narrative tension (AI-rated)
  label: string;          // 2–4 word descriptor
  moment: string;         // ONE-line emotional peak
}
export interface Chapter {
  number: number;
  title: string;
  wordCount: number;
  recap: string;          // cinematic recap covering everything up to & including this chapter
  scenes: Scene[];
}
export interface Character {
  name: string;
  role: string;
  bio: string;
  icon: string;
}
export interface Book {
  id: string;
  title: string;
  author: string;
  year: number;
  tagline: string;
  characters: Character[];
  totalWords: number;
  chapters: Chapter[];
  /** Curated definitions for archaic / uncommon words appearing in this book. */
  glossary?: Record<string, { definition: string; partOfSpeech?: string }>;
}

export const books: Book[] = [
  nineteenEightyFourJson as Book,
  gatsbyJson as Book,
  sherlockJson as Book,
  happyPrinceJson as Book,
  animalFarmJson as Book,
  jekyllJson as Book,
];

export function getBook(id?: string): Book {
  if (!id) return books[0];
  return books.find(b => b.id === id) ?? books[0];
}

// Back-compat: existing imports of `book` keep working (defaults to first book).
export const book: Book = books[0];
