// Shown the moment a chapter ends — stats + nudge to keep going.
import { motion } from "framer-motion";
import { Flame, BookOpen, ArrowRight, Home } from "lucide-react";

interface Props {
  chapterNumber: number;
  chapterTitle: string;
  wordsThisChapter: number;
  streak: number;
  wordsToday: number;
  chaptersLeft: number;
  isLastChapter: boolean;
  onContinue: () => void;
  onHome: () => void;
}

export function ChapterCompleteCard({
  chapterNumber, chapterTitle, wordsThisChapter, streak,
  wordsToday, chaptersLeft, isLastChapter, onContinue, onHome,
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: "easeOut" }}
      className="max-w-xl mx-auto px-6 py-12"
    >
      <div className="text-[10px] uppercase tracking-[0.35em] mb-3" style={{ color: "hsl(var(--reading-highlight))" }}>
        {isLastChapter ? "Book complete" : "Chapter complete"}
      </div>
      <h2 className="font-display text-3xl md:text-4xl mb-2 leading-tight" style={{ color: "hsl(var(--reading-text))" }}>
        {isLastChapter ? "You finished it." : `Chapter ${chapterNumber}`}
      </h2>
      <p className="font-display italic text-base md:text-lg mb-8" style={{ color: "hsl(var(--reading-dim))" }}>
        {titleCase(chapterTitle)}
      </p>

      <div className="grid grid-cols-3 gap-3 mb-10">
        <Stat label="words" value={wordsThisChapter.toLocaleString()} />
        <Stat label="today" value={wordsToday.toLocaleString()} />
        <Stat
          label="streak"
          value={
            <span className="inline-flex items-center gap-1">
              {streak}
              <Flame className="h-4 w-4" style={{ color: "hsl(var(--reading-highlight))" }} />
            </span>
          }
        />
      </div>

      {!isLastChapter && (
        <p className="text-sm mb-8 leading-relaxed" style={{ color: "hsl(var(--reading-dim))" }}>
          {chaptersLeft === 1
            ? "One chapter left — finish the book tonight?"
            : nudgeFor(chaptersLeft, streak)}
        </p>
      )}

      <div className="flex gap-3">
        <button
          onClick={onContinue}
          className="flex-1 inline-flex items-center justify-center gap-2 h-12 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
        >
          {isLastChapter ? <BookOpen className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
          {isLastChapter ? "Back to library" : "One more chapter"}
        </button>
        {!isLastChapter && (
          <button
            onClick={onHome}
            className="inline-flex items-center justify-center gap-2 h-12 px-5 rounded-lg border border-border text-sm hover:bg-muted transition-colors"
          >
            <Home className="h-4 w-4" /> Later
          </button>
        )}
      </div>
    </motion.div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card/40 px-3 py-4 text-center">
      <div className="font-display text-2xl tabular-nums" style={{ color: "hsl(var(--reading-text))" }}>{value}</div>
      <div className="text-[10px] uppercase tracking-[0.2em] mt-1" style={{ color: "hsl(var(--reading-dim))" }}>{label}</div>
    </div>
  );
}

function nudgeFor(left: number, streak: number) {
  if (streak >= 3) return `${left} chapters to go. Keep the ${streak}-day streak alive.`;
  if (left <= 3) return `Only ${left} chapters left — you're closer than you think.`;
  return `${left} chapters to go. The next one's the hook.`;
}

function titleCase(s: string) {
  return s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}