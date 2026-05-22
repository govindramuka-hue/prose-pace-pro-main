import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import type { DocRecord } from "@/lib/db";
import { topSentences } from "@/lib/tension";

interface Props {
  doc: DocRecord;
  resumeIdx: number;
  onContinue: () => void;
  onSkip: () => void;
}

export function RecapCard({ doc, resumeIdx, onContinue, onSkip }: Props) {
  const lookback = Math.max(0, resumeIdx - 200);
  const points = doc.tensionScores.map((score, sentenceIdx) => ({
    sentenceIdx, rawScore: score, score, isPeak: doc.peaks.includes(sentenceIdx),
  }));
  const topIdx = topSentences(points, lookback, resumeIdx, 3, doc.sentences);
  const recapLines = topIdx.map(i => doc.sentences[i]).filter(Boolean);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-2xl mx-auto px-6 py-12"
    >
      <div className="flex items-center gap-2 mb-6 text-primary">
        <Sparkles className="h-5 w-5" />
        <span className="text-sm uppercase tracking-widest font-semibold">Where you left off</span>
      </div>
      <h2 className="font-display text-3xl md:text-4xl mb-8 leading-tight">{doc.title}</h2>

      {recapLines.length > 0 ? (
        <div className="space-y-4 mb-10">
          {recapLines.map((line, i) => (
            <motion.p
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.15 }}
              className="font-display text-lg md:text-xl text-foreground/90 leading-relaxed border-l-2 border-primary/40 pl-4"
            >
              {line}
            </motion.p>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground mb-10">Starting from the beginning.</p>
      )}

      <div className="flex gap-3">
        <Button onClick={onContinue} size="lg" className="flex-1">
          Continue reading
        </Button>
        <Button onClick={onSkip} size="lg" variant="ghost">
          From start
        </Button>
      </div>
    </motion.div>
  );
}
