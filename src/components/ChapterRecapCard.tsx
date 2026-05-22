// Cinematic per-chapter AI recap, shown when the reader resumes.
import { motion } from "framer-motion";
import { Sparkles, Play, RotateCcw } from "lucide-react";
import type { Chapter } from "@/data/book";

interface Props {
  bookTitle: string;
  chapter: Chapter;            // the chapter the reader is RESUMING in (so we show its recap)
  onContinue: () => void;
  onRestartChapter: () => void;
}

export function ChapterRecapCard({ bookTitle, chapter, onContinue, onRestartChapter }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="max-w-2xl mx-auto px-6 py-12"
    >
      <div className="flex items-center gap-2 mb-5" style={{ color: "hsl(var(--reading-highlight))" }}>
        <Sparkles className="h-4 w-4" />
        <span className="text-[10px] uppercase tracking-[0.3em] font-semibold">Previously on</span>
      </div>

      <div className="font-display text-xs uppercase tracking-[0.2em] mb-1" style={{ color: "hsl(var(--reading-dim))" }}>
        {bookTitle}
      </div>
      <h2 className="font-display text-2xl md:text-3xl mb-8 leading-tight" style={{ color: "hsl(var(--reading-text))" }}>
        Chapter {chapter.number} — {titleCase(chapter.title)}
      </h2>

      <div className="border-l-2 pl-5 mb-10" style={{ borderColor: "hsl(var(--reading-highlight) / 0.4)" }}>
        <p className="font-display text-lg md:text-xl leading-relaxed" style={{ color: "hsl(var(--reading-text) / 0.92)" }}>
          {chapter.recap}
        </p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onContinue}
          className="flex-1 inline-flex items-center justify-center gap-2 h-12 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
        >
          <Play className="h-4 w-4" /> Continue reading
        </button>
        <button
          onClick={onRestartChapter}
          className="inline-flex items-center justify-center gap-2 h-12 px-5 rounded-lg border border-border text-sm hover:bg-muted transition-colors"
        >
          <RotateCcw className="h-4 w-4" /> Restart chapter
        </button>
      </div>
    </motion.div>
  );
}

function titleCase(s: string) {
  return s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}
