import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { DocRecord } from "@/lib/db";
import { findPageForSentence } from "@/lib/document-builder";

interface Props {
  doc: DocRecord;
  currentSentenceIdx: number;
  onJump: (sentenceIdx: number) => void;
  onClose: () => void;
}

export function PageView({ doc, currentSentenceIdx, onJump, onClose }: Props) {
  const isPdf = !!doc.pages && doc.pages.length > 0;
  const initialPage = isPdf ? (findPageForSentence(doc.pages, currentSentenceIdx) ?? 1) : 1;
  const [pageNum, setPageNum] = useState(initialPage);

  useEffect(() => { setPageNum(initialPage); }, [initialPage]);

  let visible: { idx: number; text: string }[];
  if (isPdf) {
    const page = doc.pages!.find(p => p.pageNumber === pageNum) ?? doc.pages![0];
    visible = doc.sentences.slice(page.startSentenceIdx, page.endSentenceIdx)
      .map((text, i) => ({ idx: page.startSentenceIdx + i, text }));
  } else {
    visible = doc.sentences.map((text, idx) => ({ idx, text }));
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-background/95 backdrop-blur border-b border-border">
        <Button variant="ghost" size="icon" onClick={onClose}><X /></Button>
        <div className="font-display text-sm md:text-base font-semibold truncate px-2">{doc.title}</div>
        {isPdf ? (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" disabled={pageNum <= 1} onClick={() => setPageNum(p => Math.max(1, p - 1))}><ChevronLeft /></Button>
            <span className="text-xs tabular-nums text-muted-foreground min-w-[60px] text-center">{pageNum} / {doc.totalPages}</span>
            <Button variant="ghost" size="icon" disabled={pageNum >= (doc.totalPages || 1)} onClick={() => setPageNum(p => Math.min(doc.totalPages || 1, p + 1))}><ChevronRight /></Button>
          </div>
        ) : <div className="w-10" />}
      </div>

      <div className="overflow-y-auto h-[calc(100vh-56px)]">
        <AnimatePresence mode="wait">
          <motion.div
            key={pageNum}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="max-w-2xl mx-auto px-6 py-8 space-y-3"
          >
            {visible.map(({ idx, text }) => {
              const isCurrent = idx === currentSentenceIdx;
              const isPeak = doc.peaks.includes(idx);
              return (
                <p
                  key={idx}
                  onClick={() => onJump(idx)}
                  className={`cursor-pointer rounded-md px-3 py-2 transition-colors leading-relaxed ${
                    isCurrent
                      ? "bg-primary/15 text-foreground border-l-2 border-primary"
                      : "hover:bg-muted/50 text-foreground/80"
                  }`}
                >
                  {isPeak && <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary mr-2 align-middle" />}
                  {text}
                </p>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
