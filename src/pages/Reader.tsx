// The Reader: cinematic intro → recap → block-by-block reading.
// Single curated book (Jekyll & Hyde). No upload, no parsing — all baked.
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Pause, Play, Menu, BookOpen } from "lucide-react";
import { getBook } from "@/data/book";
import { chunkChapter, estimateBlockMs, type Block } from "@/lib/smart-chunker";
import { usePrefs } from "@/lib/reader-prefs";
import { CinematicIntro } from "@/components/CinematicIntro";
import { ReaderSidebar } from "@/components/ReaderSidebar";
import { ReadingBlock } from "@/components/ReadingBlock";
import { ReadingFlow } from "@/components/ReadingFlow";
import { TensionRibbon } from "@/components/TensionRibbon";
import { ChapterRecapCard } from "@/components/ChapterRecapCard";
import { ChapterCompleteCard } from "@/components/ChapterCompleteCard";
import { AmbientPlayer } from "@/components/AmbientPlayer";
import { BookPageView } from "@/components/BookPageView";
import { WordPopover } from "@/components/WordPopover";
import { isWordSaved, lookupWord, saveWord, type MeaningResult } from "@/lib/dictionary";
import { recordBlockRead, recordChapterFinished, loadEngage } from "@/lib/engagement";

const PROG_KEY_PREFIX = "lumen:progress:";

interface Progress {
  chapterIdx: number;
  blockIdx: number;
  updatedAt: number;
}

function loadProgress(bookId: string): Progress {
  try {
    const raw = localStorage.getItem(PROG_KEY_PREFIX + bookId);
    if (raw) return JSON.parse(raw);
  } catch {
    // Ignore corrupt or unavailable local progress and restart the book.
  }
  return { chapterIdx: 0, blockIdx: 0, updatedAt: 0 };
}

export default function Reader() {
  const navigate = useNavigate();
  const { id: bookId } = useParams<{ id: string }>();
  const book = useMemo(() => getBook(bookId), [bookId]);
  const [prefs, setPrefs] = usePrefs();

  const [progress, setProgress] = useState<Progress>(() => loadProgress(book.id));
  const [chapterIdx, setChapterIdx] = useState(progress.chapterIdx);
  const [blockIdx, setBlockIdx] = useState(progress.blockIdx);

  const [stage, setStage] = useState<"intro" | "recap" | "reading">("intro");
  // "celebrate" overlays the reading stage when a chapter just finished
  const [celebrate, setCelebrate] = useState(false);
  const [paused, setPaused] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pageViewOpen, setPageViewOpen] = useState(false);

  // Word lookup
  const [lookupTerm, setLookupTerm] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState<MeaningResult | null>(null);
  const [lookupSaved, setLookupSaved] = useState(false);

  // Ambient gesture unlock — some browsers block autoplay until user clicks
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  const [blockProgress, setBlockProgress] = useState(0);
  const startRef = useRef<number>(performance.now());
  const elapsedRef = useRef(0);
  const rafRef = useRef<number>();

  const chapter = book.chapters[chapterIdx];

  const blocks = useMemo<(Block & { sceneIdx: number })[]>(
    () => chunkChapter(chapter.scenes),
    [chapter]
  );

  const block = blocks[Math.min(blockIdx, blocks.length - 1)];
  const prevBlock = blockIdx > 0 ? blocks[blockIdx - 1] : null;
  const nextBlock = blockIdx < blocks.length - 1 ? blocks[blockIdx + 1] : null;
  const flowCount = prefs.readingMode === "flow" ? Math.max(1, prefs.flowLines) : 1;
  const visibleBlocks = useMemo(
    () => blocks.slice(blockIdx, Math.min(blocks.length, blockIdx + flowCount)),
    [blocks, blockIdx, flowCount]
  );

  const blockMs = useMemo(
    () => {
      if (!block) return 1000;
      if (prefs.readingMode === "flow") {
        return visibleBlocks.reduce((sum, item) => sum + estimateBlockMs(item.text, prefs.wpm, item.isParagraphEnd), 0);
      }
      return estimateBlockMs(block.text, prefs.wpm, block.isParagraphEnd);
    },
    [block, prefs.readingMode, prefs.wpm, visibleBlocks]
  );

  function finishIntro() {
    const isResume = progress.updatedAt > 0 && (progress.chapterIdx > 0 || progress.blockIdx > 5);
    setStage(isResume ? "recap" : "reading");
    if (!isResume) setPaused(false);
  }

  // Persist progress
  useEffect(() => {
    const p = { chapterIdx, blockIdx, updatedAt: Date.now() };
    setProgress(p);
    localStorage.setItem(PROG_KEY_PREFIX + book.id, JSON.stringify(p));
  }, [chapterIdx, blockIdx, book.id]);

  // Reset block progress sweep when block changes
  useEffect(() => {
    setBlockProgress(0);
    elapsedRef.current = 0;
    startRef.current = performance.now();
  }, [blockIdx, chapterIdx]);

  // RAF sweep for highlight
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
        // Record this block as read
        if (block) {
          const words = visibleBlocks.reduce((sum, item) => sum + item.text.trim().split(/\s+/).filter(Boolean).length, 0);
          const totalBlocksAcrossBook = book.chapters.reduce((s, _, i) => s + (i === chapterIdx ? blocks.length : Math.max(1, book.chapters[i].scenes.length * 4)), 0);
          const readSoFar = book.chapters.slice(0, chapterIdx).reduce((s, _, i) => s + Math.max(1, book.chapters[i].scenes.length * 4), 0) + (blockIdx + 1);
          const pct = Math.min(1, readSoFar / Math.max(1, totalBlocksAcrossBook));
          recordBlockRead({
            bookId: book.id,
            words,
            chapterIdx,
            blockIdx,
            totalBlocks: blocks.length,
            totalChapters: book.chapters.length,
            pct,
            lastLine: block.text.slice(0, 140),
          });
        }
        if (blockIdx < blocks.length - 1) {
          setBlockIdx(i => Math.min(blocks.length - 1, i + flowCount));
        } else if (chapterIdx < book.chapters.length - 1) {
          // Chapter finished — celebrate before moving on
          recordChapterFinished(book.id, false);
          setPaused(true);
          setCelebrate(true);
        } else {
          recordChapterFinished(book.id, true);
          setPaused(true);
          setCelebrate(true);
        }
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [paused, stage, blockMs, blockIdx, chapterIdx, blocks.length, block, book, blocks, flowCount, visibleBlocks]);

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.code === "Space") { e.preventDefault(); setPaused(p => !p); }
      if (e.code === "ArrowRight") setBlockIdx(i => Math.min(blocks.length - 1, i + 1));
      if (e.code === "ArrowLeft")  setBlockIdx(i => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [blocks.length]);

  function handleWordTap(word: string) {
    const clean = word.toLowerCase().replace(/[^a-z'-]/g, "");
    if (!clean) return;
    setPaused(true);
    setLookupTerm(clean);
    setLookupLoading(true);
    setLookupResult(null);
    setLookupSaved(false);
    lookupWord(clean, book, visibleBlocks.map(item => item.text).join(" ")).then(res => {
      setLookupLoading(false);
      if (res) {
        setLookupResult(res);
        setLookupSaved(isWordSaved(res.word));
      }
    });
  }

  function unlockAudioAndToggle() {
    setAudioUnlocked(true);
    setPaused(p => !p);
  }

  // ---- Render stages ----
  if (stage === "intro") {
    return (
      <div className="min-h-screen reading-surface">
        <CinematicIntro
          title={book.title}
          author={book.author}
          tagline={book.tagline}
          chapterNumber={chapter.number}
          chapterTitle={chapter.title}
          onDone={finishIntro}
        />
      </div>
    );
  }

  if (stage === "recap") {
    return (
      <div className="min-h-screen reading-surface flex items-center justify-center">
        <ChapterRecapCard
          bookTitle={book.title}
          chapter={chapter}
          onContinue={() => { setStage("reading"); setPaused(false); setAudioUnlocked(true); }}
          onRestartChapter={() => { setBlockIdx(0); setStage("reading"); setPaused(false); setAudioUnlocked(true); }}
        />
      </div>
    );
  }

  // Reading stage
  return (
    <div className="min-h-screen reading-surface flex flex-col">
      {celebrate && (
        <div className="fixed inset-0 z-50 reading-surface flex items-center justify-center">
          <ChapterCompleteCard
            chapterNumber={chapter.number}
            chapterTitle={chapter.title}
            wordsThisChapter={chapter.wordCount}
            streak={loadEngage().streak}
            wordsToday={loadEngage().wordsToday}
            chaptersLeft={book.chapters.length - chapterIdx - 1}
            isLastChapter={chapterIdx >= book.chapters.length - 1}
            onContinue={() => {
              setCelebrate(false);
              if (chapterIdx < book.chapters.length - 1) {
                setChapterIdx(i => i + 1);
                setBlockIdx(0);
                setStage("intro");
              } else {
                navigate("/");
              }
            }}
            onHome={() => { setCelebrate(false); navigate("/"); }}
          />
        </div>
      )}
      <AmbientPlayer
        ambient={prefs.ambient}
        volume={prefs.ambientVolume}
        paused={paused || !audioUnlocked}
      />

      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-3 z-10">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-lg hover:bg-muted/40 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-[0.25em]" style={{ color: "hsl(var(--reading-dim))" }}>
            chapter {chapter.number}
          </div>
          <div className="font-display text-sm md:text-base leading-tight truncate max-w-[55vw]" style={{ color: "hsl(var(--reading-text))" }}>
            {titleCase(chapter.title)}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => { setPaused(true); setPageViewOpen(true); }}
            className="p-2 rounded-lg hover:bg-muted/40 transition-colors"
            aria-label="Open page view"
          >
            <BookOpen className="h-5 w-5" />
          </button>
          <button
            onClick={() => navigate("/")}
            className="p-2 rounded-lg hover:bg-muted/40 transition-colors"
            aria-label="Back to library"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Reading stage */}
      <main
        className="flex-1 flex items-center justify-center px-6 cursor-pointer"
        onClick={unlockAudioAndToggle}
      >
        <div className="w-full flex flex-col items-center gap-5" style={{ maxWidth: `${prefs.width}px` }}>
          {/* Previous (dim) */}
          <div className="h-6 w-full text-center">
            <AnimatePresence mode="wait">
              {prefs.readingMode === "spotlight" && prefs.showContext && prevBlock && (
                <motion.p
                  key={`prev-${chapterIdx}-${blockIdx}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: prefs.contextOpacity, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  className="reading-copy text-xs md:text-sm leading-snug truncate px-4"
                  style={{ color: "hsl(var(--reading-dim))" }}
                >
                  {trimPreview(prevBlock.text)}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Focus block */}
          <AnimatePresence mode="wait">
            {block && (
              prefs.readingMode === "flow" ? (
                <ReadingFlow
                  key={`${chapterIdx}-${blockIdx}-flow`}
                  blockKey={`${chapterIdx}-${blockIdx}-flow-${prefs.flowLines}`}
                  blocks={visibleBlocks}
                  highlightProgress={blockProgress}
                  highlight={prefs.highlight}
                  fontSize={prefs.fontSize}
                  lineHeight={prefs.lineHeight}
                  onWordTap={handleWordTap}
                />
              ) : (
                <ReadingBlock
                  key={`${chapterIdx}-${blockIdx}`}
                  blockKey={`${chapterIdx}-${blockIdx}`}
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

          {/* Next (dim) */}
          <div className="h-6 w-full text-center">
            <AnimatePresence mode="wait">
              {prefs.readingMode === "spotlight" && prefs.showContext && nextBlock && (
                <motion.p
                  key={`next-${chapterIdx}-${blockIdx}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: prefs.contextOpacity, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
                  className="reading-copy text-xs md:text-sm leading-snug truncate px-4"
                  style={{ color: "hsl(var(--reading-dim))" }}
                >
                  {trimPreview(nextBlock.text)}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Bottom bar: tension + play */}
      <footer className="px-4 pb-6 pt-3 z-10">
        <div className="max-w-3xl mx-auto">
          <TensionRibbon
            chapter={chapter}
            currentSceneIdx={block?.sceneIdx ?? 0}
            blockProgress={blocks.length ? (blockIdx + blockProgress) / blocks.length : 0}
            onJumpScene={(sceneIdx) => {
              const firstBlock = blocks.findIndex(b => b.sceneIdx === sceneIdx);
              if (firstBlock >= 0) setBlockIdx(firstBlock);
            }}
          />
          <div className="flex items-center justify-between mt-4">
            <div className="text-[10px] tabular-nums" style={{ color: "hsl(var(--reading-dim))" }}>
              {blockIdx + 1} / {blocks.length}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); unlockAudioAndToggle(); }}
              className="rounded-full h-12 w-12 inline-flex items-center justify-center bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
              style={{ boxShadow: "var(--shadow-glow)" }}
              aria-label={paused ? "Play" : "Pause"}
            >
              {paused ? <Play className="h-5 w-5 ml-0.5" /> : <Pause className="h-5 w-5" />}
            </button>
            <div className="text-[10px] tabular-nums" style={{ color: "hsl(var(--reading-dim))" }}>
              {chapterIdx + 1}/{book.chapters.length}
            </div>
          </div>
        </div>
      </footer>

      <ReaderSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        book={book}
        currentChapterIdx={chapterIdx}
        onJumpChapter={(i) => { setChapterIdx(i); setBlockIdx(0); setPaused(true); setStage("recap"); }}
        prefs={prefs}
        setPrefs={setPrefs}
      />

      {/* Page view */}
      {pageViewOpen && (
        <BookPageView
          chapterTitle={chapter.title}
          chapterNumber={chapter.number}
          blocks={blocks}
          currentBlockIdx={blockIdx}
          hasPrevChapter={chapterIdx > 0}
          hasNextChapter={chapterIdx < book.chapters.length - 1}
          onJump={(i) => setBlockIdx(i)}
          onPrevChapter={() => { setChapterIdx(i => Math.max(0, i - 1)); setBlockIdx(0); }}
          onNextChapter={() => { setChapterIdx(i => Math.min(book.chapters.length - 1, i + 1)); setBlockIdx(0); }}
          onClose={() => setPageViewOpen(false)}
        />
      )}

      {/* Word lookup */}
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

      {/* Subtle hint when paused at start of book */}
      <AnimatePresence>
        {paused && blockIdx === 0 && chapterIdx === 0 && !pageViewOpen && !lookupTerm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 0.7 }} exit={{ opacity: 0 }}
            className="fixed bottom-32 left-0 right-0 text-center text-[10px] uppercase tracking-[0.3em] pointer-events-none"
            style={{ color: "hsl(var(--reading-dim))" }}
          >
            tap anywhere to begin · space to pause
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function titleCase(s: string) {
  return s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

function trimPreview(s: string, n = 80) {
  const clean = s.replace(/^[\u201C"]|[\u201D"]$/g, "");
  return clean.length > n ? clean.slice(0, n).trimEnd() + "…" : clean;
}
