import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { ArrowLeft, BookOpen, Menu, Pause, Play } from "lucide-react";
import { getDoc, getProgress, saveProgress, type DocRecord } from "@/lib/db";
import { estimateBlockMs, type Block } from "@/lib/smart-chunker";
import { usePrefs } from "@/lib/reader-prefs";
import { lookupWord, isWordSaved, saveWord, type MeaningResult } from "@/lib/dictionary";
import { ReadingBlock } from "@/components/ReadingBlock";
import { ReadingFlow } from "@/components/ReadingFlow";
import { WordPopover } from "@/components/WordPopover";
import { PageView } from "@/components/PageView";
import { RecapCard } from "@/components/RecapCard";
import { TensionBar } from "@/components/TensionBar";
import { SettingsPanel } from "@/components/ReaderSidebar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function DocumentReader() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [doc, setDoc] = useState<DocRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [sentenceIdx, setSentenceIdx] = useState(0);
  const [stage, setStage] = useState<"recap" | "reading">("reading");
  const [paused, setPaused] = useState(true);
  const [pageOpen, setPageOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [prefs, setPrefs] = usePrefs();
  const [blockProgress, setBlockProgress] = useState(0);
  const [lookupTerm, setLookupTerm] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState<MeaningResult | null>(null);
  const [lookupSaved, setLookupSaved] = useState(false);
  const startRef = useRef<number>(performance.now());
  const elapsedRef = useRef(0);
  const rafRef = useRef<number>();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!id) return;
      const loaded = await getDoc(id);
      if (cancelled) return;
      if (!loaded) {
        setLoading(false);
        return;
      }
      const progress = await getProgress(id);
      const idx = Math.min(progress?.sentenceIdx ?? 0, Math.max(0, loaded.sentences.length - 1));
      setDoc(loaded);
      setSentenceIdx(idx);
      setStage(idx > 8 ? "recap" : "reading");
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [id]);

  const blocks = useMemo<Block[]>(() => {
    if (!doc) return [];
    return doc.sentences.map(text => ({ text, type: "narrative", isParagraphEnd: true }));
  }, [doc]);

  const block = blocks[sentenceIdx];
  const flowCount = prefs.readingMode === "flow" ? Math.max(1, prefs.flowLines) : 1;
  const visibleBlocks = useMemo(
    () => blocks.slice(sentenceIdx, Math.min(blocks.length, sentenceIdx + flowCount)),
    [blocks, sentenceIdx, flowCount]
  );
  const prevBlock = sentenceIdx > 0 ? blocks[sentenceIdx - 1] : null;
  const nextBlock = sentenceIdx < blocks.length - 1 ? blocks[sentenceIdx + 1] : null;
  const blockMs = useMemo(() => {
    if (!block) return 1000;
    if (prefs.readingMode === "flow") {
      return visibleBlocks.reduce((sum, item) => sum + estimateBlockMs(item.text, prefs.wpm, true), 0);
    }
    return estimateBlockMs(block.text, prefs.wpm, true);
  }, [block, prefs.readingMode, prefs.wpm, visibleBlocks]);

  useEffect(() => {
    if (!doc) return;
    saveProgress({ docId: doc.id, sentenceIdx, updatedAt: Date.now(), lastSessionStart: Date.now() });
  }, [doc, sentenceIdx]);

  useEffect(() => {
    setBlockProgress(0);
    elapsedRef.current = 0;
    startRef.current = performance.now();
  }, [sentenceIdx, prefs.readingMode, prefs.flowLines]);

  useEffect(() => {
    if (paused || stage !== "reading") {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    startRef.current = performance.now() - elapsedRef.current;
    const tick = () => {
      const elapsed = performance.now() - startRef.current;
      elapsedRef.current = elapsed;
      const p = Math.min(1, elapsed / blockMs);
      setBlockProgress(p);
      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setSentenceIdx(i => Math.min(blocks.length - 1, i + flowCount));
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [paused, stage, blockMs, blocks.length, flowCount]);

  function handleWordTap(word: string) {
    const clean = word.toLowerCase().replace(/[^a-z'-]/g, "");
    if (!clean || !doc) return;
    setPaused(true);
    setLookupTerm(clean);
    setLookupLoading(true);
    setLookupResult(null);
    setLookupSaved(false);
    lookupWord(clean, undefined, visibleBlocks.map(item => item.text).join(" ")).then(res => {
      setLookupLoading(false);
      if (res) {
        setLookupResult(res);
        setLookupSaved(isWordSaved(res.word));
      }
    });
  }

  if (loading) {
    return <div className="min-h-screen reading-surface flex items-center justify-center text-sm text-muted-foreground">Opening document...</div>;
  }

  if (!doc) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6 text-center">
        <div>
          <h1 className="font-display text-3xl mb-3">Document not found</h1>
          <button className="text-primary" onClick={() => navigate("/")}>Back to library</button>
        </div>
      </div>
    );
  }

  if (stage === "recap") {
    return (
      <div className="min-h-screen reading-surface flex items-center justify-center">
        <RecapCard
          doc={doc}
          resumeIdx={sentenceIdx}
          onContinue={() => { setStage("reading"); setPaused(false); }}
          onSkip={() => { setSentenceIdx(0); setStage("reading"); setPaused(false); }}
        />
      </div>
    );
  }

  const section = [...(doc.sectionTitles ?? [])].reverse().find(item => item.sentenceIdx <= sentenceIdx);
  const progressPct = blocks.length ? (sentenceIdx + blockProgress) / blocks.length : 0;

  return (
    <div className="min-h-screen reading-surface flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 z-10">
        <button onClick={() => setSettingsOpen(true)} className="p-2 rounded-lg hover:bg-muted/40 transition-colors" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </button>
        <div className="text-center min-w-0">
          <div className="text-[10px] uppercase tracking-[0.25em]" style={{ color: "hsl(var(--reading-dim))" }}>
            {doc.kind === "study" ? "study mode" : "document"}
          </div>
          <div className="font-display text-sm md:text-base leading-tight truncate max-w-[55vw]" style={{ color: "hsl(var(--reading-text))" }}>
            {section?.title || doc.title}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => { setPaused(true); setPageOpen(true); }} className="p-2 rounded-lg hover:bg-muted/40 transition-colors" aria-label="Open page view">
            <BookOpen className="h-5 w-5" />
          </button>
          <button onClick={() => navigate("/")} className="p-2 rounded-lg hover:bg-muted/40 transition-colors" aria-label="Back to library">
            <ArrowLeft className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 cursor-pointer" onClick={() => setPaused(p => !p)}>
        <div className="w-full flex flex-col items-center gap-5" style={{ maxWidth: `${prefs.width}px` }}>
          <div className="h-6 w-full text-center">
            <AnimatePresence mode="wait">
              {prefs.readingMode === "spotlight" && prefs.showContext && prevBlock && (
                <p className="reading-copy text-xs md:text-sm leading-snug truncate px-4" style={{ color: "hsl(var(--reading-dim))", opacity: prefs.contextOpacity }}>
                  {trimPreview(prevBlock.text)}
                </p>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence mode="wait">
            {block && (
              prefs.readingMode === "flow" ? (
                <ReadingFlow
                  key={`doc-${sentenceIdx}-flow`}
                  blockKey={`doc-${sentenceIdx}-flow-${prefs.flowLines}`}
                  blocks={visibleBlocks}
                  highlightProgress={blockProgress}
                  highlight={prefs.highlight}
                  fontSize={prefs.fontSize}
                  lineHeight={prefs.lineHeight}
                  onWordTap={handleWordTap}
                />
              ) : (
                <ReadingBlock
                  key={`doc-${sentenceIdx}`}
                  blockKey={`doc-${sentenceIdx}`}
                  block={block}
                  progress={blockProgress}
                  highlight={prefs.highlight}
                  fontSize={prefs.fontSize}
                  lineHeight={prefs.lineHeight}
                  onWordTap={handleWordTap}
                />
              )
            )}
          </AnimatePresence>

          <div className="h-6 w-full text-center">
            <AnimatePresence mode="wait">
              {prefs.readingMode === "spotlight" && prefs.showContext && nextBlock && (
                <p className="reading-copy text-xs md:text-sm leading-snug truncate px-4" style={{ color: "hsl(var(--reading-dim))", opacity: prefs.contextOpacity }}>
                  {trimPreview(nextBlock.text)}
                </p>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      <footer className="px-4 pb-6 pt-3 z-10">
        <div className="max-w-3xl mx-auto">
          <TensionBar scores={doc.tensionScores} currentIdx={sentenceIdx} peaks={doc.peaks} onScrub={(idx) => { setSentenceIdx(idx); setPaused(true); }} />
          <div className="flex items-center justify-between mt-4">
            <div className="text-[10px] tabular-nums" style={{ color: "hsl(var(--reading-dim))" }}>
              {Math.round(progressPct * 100)}%
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setPaused(p => !p); }}
              className="rounded-full h-12 w-12 inline-flex items-center justify-center bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
              style={{ boxShadow: "var(--shadow-glow)" }}
              aria-label={paused ? "Play" : "Pause"}
            >
              {paused ? <Play className="h-5 w-5 ml-0.5" /> : <Pause className="h-5 w-5" />}
            </button>
            <div className="text-[10px] tabular-nums" style={{ color: "hsl(var(--reading-dim))" }}>
              {sentenceIdx + 1}/{blocks.length}
            </div>
          </div>
        </div>
      </footer>

      {pageOpen && <PageView doc={doc} currentSentenceIdx={sentenceIdx} onJump={(idx) => { setSentenceIdx(idx); setPageOpen(false); }} onClose={() => setPageOpen(false)} />}

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-md max-h-[88vh] overflow-y-auto bg-card border-border p-0">
          <DialogHeader className="px-5 pt-5 pb-3 border-b border-border">
            <DialogTitle className="font-display text-xl">{doc.title}</DialogTitle>
          </DialogHeader>
          <SettingsPanel prefs={prefs} setPrefs={setPrefs} />
        </DialogContent>
      </Dialog>

      <WordPopover
        word={lookupTerm}
        loading={lookupLoading}
        result={lookupResult}
        saved={lookupSaved}
        onSave={() => {
          if (!lookupResult) return;
          saveWord(lookupResult);
          setLookupSaved(true);
        }}
        onClose={() => setLookupTerm(null)}
      />
    </div>
  );
}

function trimPreview(s: string, n = 80) {
  const clean = s.replace(/^[\u201C"]|[\u201D"]$/g, "");
  return clean.length > n ? clean.slice(0, n).trimEnd() + "..." : clean;
}
