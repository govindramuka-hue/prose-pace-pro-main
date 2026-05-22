import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { BreathUnit } from "@/lib/sentence-segmenter";

interface Props {
  units: BreathUnit[];
  unitIdx: number;
  unitDurationMs: number;
  paused: boolean;
  highlightWords: boolean;
  onWordTap: (word: string) => void;
  prevText?: string;
  nextText?: string;
}

export function SentenceView({ units, unitIdx, unitDurationMs, paused, highlightWords, onWordTap, prevText, nextText }: Props) {
  const unit = units[unitIdx];
  const [progress, setProgress] = useState(0);
  const startRef = useRef<number>(performance.now());
  const rafRef = useRef<number>();
  const elapsedRef = useRef(0);

  useEffect(() => {
    setProgress(0);
    elapsedRef.current = 0;
    startRef.current = performance.now();
  }, [unitIdx]);

  useEffect(() => {
    if (paused) {
      cancelAnimationFrame(rafRef.current!);
      return;
    }
    startRef.current = performance.now() - elapsedRef.current;
    const tick = () => {
      const elapsed = performance.now() - startRef.current;
      elapsedRef.current = elapsed;
      const p = Math.min(1, elapsed / unitDurationMs);
      setProgress(p);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current!);
  }, [paused, unitIdx, unitDurationMs]);

  if (!unit) return null;
  const words = unit.text.split(/\s+/);
  const litCount = highlightWords ? Math.floor(progress * words.length) : -1;

  // Trim long prev/next previews so they stay visually quiet (one line-ish)
  const trim = (s?: string, n = 90) => {
    if (!s) return "";
    return s.length > n ? s.slice(0, n).trimEnd() + "…" : s;
  };

  return (
    <div className="relative w-full flex flex-col items-center justify-center min-h-[50vh] gap-6">
      {/* Previous (dim) */}
      <div className="h-6 w-full max-w-2xl px-6 text-center">
        <AnimatePresence mode="wait">
          {prevText && (
            <motion.p
              key={`prev-${prevText}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.28 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="font-display text-sm md:text-base leading-tight truncate"
              style={{ color: "hsl(var(--reading-dim))" }}
            >
              {trim(prevText)}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Focus sentence */}
      <AnimatePresence mode="wait">
        <motion.div
          key={unitIdx}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className="text-center px-6 max-w-3xl"
        >
          <p className="font-display text-2xl md:text-4xl leading-snug text-balance" style={{ color: "hsl(var(--reading-text))" }}>
            {words.map((w, i) => {
              const lit = highlightWords && i <= litCount;
              return (
                <span key={i}>
                  <span
                    onClick={(e) => { e.stopPropagation(); onWordTap(w); }}
                    className="cursor-pointer transition-colors duration-300"
                    style={{ color: lit ? "hsl(var(--reading-highlight))" : undefined }}
                  >
                    {w}
                  </span>
                  {i < words.length - 1 ? " " : ""}
                </span>
              );
            })}
          </p>
        </motion.div>
      </AnimatePresence>

      {/* Next (dim) */}
      <div className="h-6 w-full max-w-2xl px-6 text-center">
        <AnimatePresence mode="wait">
          {nextText && (
            <motion.p
              key={`next-${nextText}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.28 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="font-display text-sm md:text-base leading-tight truncate"
              style={{ color: "hsl(var(--reading-dim))" }}
            >
              {trim(nextText)}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
