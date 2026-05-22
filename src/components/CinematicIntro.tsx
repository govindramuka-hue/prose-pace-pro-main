// Cinematic open: title → author → tagline → chapter. Skippable on tap/key.
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  title: string;
  author: string;
  tagline: string;
  chapterNumber: number;
  chapterTitle: string;
  onDone: () => void;
}

const SEQ = [
  { id: "title", durMs: 1700 },
  { id: "author", durMs: 1500 },
  { id: "tagline", durMs: 2400 },
  { id: "chapter", durMs: 2200 },
] as const;

export function CinematicIntro({ title, author, tagline, chapterNumber, chapterTitle, onDone }: Props) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (step >= SEQ.length) { onDone(); return; }
    const t = setTimeout(() => setStep(s => s + 1), SEQ[step].durMs);
    return () => clearTimeout(t);
  }, [step, onDone]);

  useEffect(() => {
    const skip = () => onDone();
    window.addEventListener("keydown", skip);
    return () => window.removeEventListener("keydown", skip);
  }, [onDone]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center reading-surface cursor-pointer overflow-hidden"
      onClick={onDone}
    >
      {/* Soft vignette */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse at center, transparent 0%, hsl(var(--reading-bg)) 75%)"
      }} />

      <div className="relative w-full max-w-3xl px-8 text-center">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="t" initial={{ opacity: 0, letterSpacing: "0.02em" }} animate={{ opacity: 1, letterSpacing: "0.05em" }} exit={{ opacity: 0 }} transition={{ duration: 0.9, ease: "easeOut" }}>
              <div className="text-[10px] uppercase tracking-[0.4em] mb-6" style={{ color: "hsl(var(--reading-dim))" }}>now reading</div>
              <h1 className="font-display text-4xl md:text-6xl leading-[1.05] text-balance" style={{ color: "hsl(var(--reading-text))" }}>
                {title}
              </h1>
            </motion.div>
          )}
          {step === 1 && (
            <motion.div key="a" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.7 }}>
              <div className="text-[10px] uppercase tracking-[0.4em] mb-4" style={{ color: "hsl(var(--reading-dim))" }}>by</div>
              <div className="font-display text-2xl md:text-3xl italic" style={{ color: "hsl(var(--reading-text))" }}>
                {author}
              </div>
            </motion.div>
          )}
          {step === 2 && (
            <motion.div key="tg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.9 }}>
              <p className="font-display text-xl md:text-2xl leading-snug text-balance" style={{ color: "hsl(var(--reading-text) / 0.9)" }}>
                "{tagline}"
              </p>
            </motion.div>
          )}
          {step === 3 && (
            <motion.div key="ch" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.8 }}>
              <div className="text-[10px] uppercase tracking-[0.4em] mb-4" style={{ color: "hsl(var(--reading-dim))" }}>chapter {chapterNumber}</div>
              <h2 className="font-display text-3xl md:text-5xl text-balance" style={{ color: "hsl(var(--reading-text))" }}>
                {chapterTitle.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
              </h2>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Skip hint pinned to bottom safe-area, never overlaps content */}
      <div
        className="fixed left-0 right-0 text-center text-[10px] tracking-[0.3em] uppercase pointer-events-none"
        style={{
          color: "hsl(var(--reading-dim))",
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 1.5rem)",
        }}
      >
        tap to skip
      </div>
    </div>
  );
}
