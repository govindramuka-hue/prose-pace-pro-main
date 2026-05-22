// Full-chapter scroll view for the curated book. Dimmed past, bright current, dim future.
// Tap any block to jump there and return to the focus reader.
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import type { Block } from "@/lib/smart-chunker";
import { useEffect, useRef } from "react";

interface Props {
  chapterTitle: string;
  chapterNumber: number;
  blocks: (Block & { sceneIdx: number })[];
  currentBlockIdx: number;
  hasPrevChapter: boolean;
  hasNextChapter: boolean;
  onJump: (blockIdx: number) => void;
  onPrevChapter: () => void;
  onNextChapter: () => void;
  onClose: () => void;
}

export function BookPageView({
  chapterTitle, chapterNumber, blocks, currentBlockIdx,
  hasPrevChapter, hasNextChapter,
  onJump, onPrevChapter, onNextChapter, onClose,
}: Props) {
  const currentRef = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => {
    currentRef.current?.scrollIntoView({ behavior: "auto", block: "center" });
  }, []);

  const titleCase = (s: string) => s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 reading-surface"
      >
        <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 backdrop-blur" style={{ background: "hsl(var(--reading-bg) / 0.92)", borderBottom: "1px solid hsl(var(--reading-dim) / 0.2)" }}>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close page view"><X /></Button>
          <div className="text-center">
            <div className="text-[10px] uppercase tracking-[0.3em]" style={{ color: "hsl(var(--reading-dim))" }}>chapter {chapterNumber}</div>
            <div className="font-display text-sm md:text-base leading-tight truncate max-w-[55vw]" style={{ color: "hsl(var(--reading-text))" }}>
              {titleCase(chapterTitle)}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" disabled={!hasPrevChapter} onClick={onPrevChapter} aria-label="Previous chapter"><ChevronLeft /></Button>
            <Button variant="ghost" size="icon" disabled={!hasNextChapter} onClick={onNextChapter} aria-label="Next chapter"><ChevronRight /></Button>
          </div>
        </header>

        <div className="overflow-y-auto h-[calc(100vh-56px)]">
          <div className="max-w-2xl mx-auto px-6 py-10 space-y-3">
            {blocks.map((b, i) => {
              const isCurrent = i === currentBlockIdx;
              const isPast = i < currentBlockIdx;
              const text = b.type === "dialogue"
                ? `\u201C${b.text.replace(/^[\u201C"]|[\u201D"]$/g, "")}\u201D`
                : b.text;
              return (
                <p
                  key={i}
                  ref={isCurrent ? currentRef : undefined}
                  onClick={() => { onJump(i); onClose(); }}
                  className={`cursor-pointer rounded-md px-3 py-2 transition-colors leading-relaxed font-display ${
                    b.type === "quote" ? "italic" : ""
                  } ${b.type === "dialogue" ? "font-medium" : ""}`}
                  style={{
                    color: isCurrent
                      ? "hsl(var(--reading-text))"
                      : isPast
                        ? "hsl(var(--reading-dim))"
                        : "hsl(var(--reading-text) / 0.55)",
                    background: isCurrent ? "hsl(var(--reading-highlight) / 0.10)" : "transparent",
                    borderLeft: isCurrent ? "2px solid hsl(var(--reading-highlight))" : "2px solid transparent",
                  }}
                >
                  {b.isParagraphEnd && <span className="inline-block w-1 h-1 rounded-full mr-2 align-middle" style={{ background: "hsl(var(--reading-dim) / 0.6)" }} />}
                  {text}
                </p>
              );
            })}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
