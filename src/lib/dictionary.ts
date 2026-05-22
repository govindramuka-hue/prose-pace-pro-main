// Word lookup: book glossary (curated, archaic-aware) -> cache -> dictionaryapi.dev.
import { cacheMeaning, getCachedMeaning } from "./db";
import type { Book } from "@/data/book";

export interface MeaningResult {
  word: string;
  definition: string;
  partOfSpeech?: string;
  synonyms: string[];
}

export interface SavedWord extends MeaningResult {
  addedAt: number;
}

interface DictionaryDefinition {
  definition?: string;
  example?: string;
  synonyms?: string[];
}

interface DictionaryMeaning {
  partOfSpeech?: string;
  definitions?: DictionaryDefinition[];
  synonyms?: string[];
}

interface DictionaryEntry {
  meanings?: DictionaryMeaning[];
}

const SAVED_KEY = "lumen:dictionary:v1";

export function cleanWord(word: string) {
  return word.toLowerCase().replace(/[^a-z'-]/g, "");
}

export function loadSavedWords(): SavedWord[] {
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveWord(result: MeaningResult) {
  const clean = cleanWord(result.word);
  if (!clean || !result.definition) return loadSavedWords();
  const nextWord: SavedWord = { ...result, word: clean, synonyms: result.synonyms ?? [], addedAt: Date.now() };
  const existing = loadSavedWords().filter(item => item.word !== clean);
  const next = [nextWord, ...existing].slice(0, 200);
  localStorage.setItem(SAVED_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("lumen:dictionary-updated"));
  return next;
}

export function removeSavedWord(word: string) {
  const clean = cleanWord(word);
  const next = loadSavedWords().filter(item => item.word !== clean);
  localStorage.setItem(SAVED_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("lumen:dictionary-updated"));
  return next;
}

export function isWordSaved(word: string) {
  const clean = cleanWord(word);
  return loadSavedWords().some(item => item.word === clean);
}

export async function lookupWord(word: string, book?: Book, context = ""): Promise<MeaningResult | null> {
  const clean = cleanWord(word);
  if (!clean) return null;

  const entry = book?.glossary?.[clean];
  if (entry?.definition) {
    return { word: clean, definition: entry.definition, partOfSpeech: entry.partOfSpeech, synonyms: [] };
  }

  const cached = await getCachedMeaning(clean);
  if (cached && !context.trim()) {
    const synonyms = await enrichSynonyms(clean, cached.synonyms ?? []);
    if (synonyms.length !== (cached.synonyms ?? []).length) {
      await cacheMeaning(clean, cached.definition, cached.partOfSpeech, synonyms);
    }
    return {
      word: clean,
      definition: cached.definition,
      partOfSpeech: cached.partOfSpeech,
      synonyms,
    };
  }

  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(clean)}`);
    if (!res.ok) {
      if (cached) {
        return {
          word: clean,
          definition: cached.definition,
          partOfSpeech: cached.partOfSpeech,
          synonyms: await enrichSynonyms(clean, cached.synonyms ?? []),
        };
      }
      return null;
    }
    const data = await res.json();
    const candidate = chooseBestMeaning(data, context);
    if (!candidate?.definition) return null;
    const synonyms = await enrichSynonyms(clean, candidate.synonyms);
    const result: MeaningResult = {
      word: clean,
      definition: candidate.definition,
      partOfSpeech: candidate.partOfSpeech,
      synonyms,
    };
    await cacheMeaning(clean, result.definition, result.partOfSpeech, result.synonyms);
    return result;
  } catch {
    if (cached) {
      return {
        word: clean,
        definition: cached.definition,
        partOfSpeech: cached.partOfSpeech,
        synonyms: cached.synonyms ?? [],
      };
    }
    return null;
  }
}

async function enrichSynonyms(word: string, existing: string[]) {
  const merged = uniqueWords(existing);
  if (merged.length >= 6) return merged.slice(0, 8);

  try {
    const res = await fetch(`https://api.datamuse.com/words?rel_syn=${encodeURIComponent(word)}&max=12`);
    if (!res.ok) return merged.slice(0, 8);
    const data = await res.json() as { word?: string }[];
    return uniqueWords([...merged, ...data.map(item => item.word ?? "")]).filter(item => item !== word).slice(0, 8);
  } catch {
    return merged.slice(0, 8);
  }
}

function chooseBestMeaning(data: DictionaryEntry[], context: string) {
  const candidates = data.flatMap(entry =>
    (entry?.meanings ?? []).flatMap((meaning) =>
      (meaning?.definitions ?? []).map((definition) => ({
        partOfSpeech: meaning.partOfSpeech,
        definition: definition.definition as string | undefined,
        example: definition.example as string | undefined,
        synonyms: uniqueWords([...(meaning.synonyms ?? []), ...(definition.synonyms ?? [])]).slice(0, 8),
      }))
    )
  ).filter(item => item.definition);

  if (!candidates.length) return null;

  const contextWords = significantWords(context);
  if (!contextWords.size) return candidates[0];

  return candidates
    .map(candidate => {
      const text = `${candidate.definition ?? ""} ${candidate.example ?? ""} ${candidate.synonyms.join(" ")}`;
      const words = significantWords(text);
      let score = 0;
      contextWords.forEach(word => {
        if (words.has(word)) score += 2;
        if (candidate.example?.toLowerCase().includes(word)) score += 1;
      });
      if (candidate.example) score += 0.5;
      if (candidate.synonyms.length) score += 0.25;
      return { candidate, score };
    })
    .sort((a, b) => b.score - a.score)[0].candidate;
}

function significantWords(text: string) {
  const stop = new Set(["the", "and", "for", "with", "that", "this", "from", "have", "was", "were", "are", "but", "not", "you", "his", "her", "its", "into", "than", "then", "there", "their", "them", "they", "had", "has"]);
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z'\s-]/g, " ")
      .split(/\s+/)
      .filter(word => word.length > 3 && !stop.has(word))
  );
}

function uniqueWords(words: string[]) {
  return Array.from(new Set(words.map(cleanWord).filter(word => word.length > 1)));
}
