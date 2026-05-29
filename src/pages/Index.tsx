import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, BookMarked, BookOpen, Check, FileText, Flame, Gauge, Pause, Pencil, Play, RotateCcw, Search, Settings2, Trash2, Upload, Volume2, Wind } from "lucide-react";
import { books } from "@/data/book";
import { useEngagement } from "@/lib/engagement";
import { AMBIENT_OPTIONS, THEME_OPTIONS, usePrefs, type Ambient, type Theme } from "@/lib/reader-prefs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ReadingBlock } from "@/components/ReadingBlock";
import { FontPicker } from "@/components/FontPicker";
import { ReadingFlow } from "@/components/ReadingFlow";
import { ReadingModeControl } from "@/components/ReadingModeControl";
import { UploadDialog } from "@/components/UploadDialog";
import { estimateBlockMs, type Block } from "@/lib/smart-chunker";
import { deleteDoc, listDocs, updateDocMeta, type DocRecord } from "@/lib/db";

const COVER_THEMES: Record<string, { from: string; via: string; to: string; accentA: string; accentB: string; tag: string }> = {
  "happy-prince": {
    from: "hsl(210 60% 18%)",
    via: "hsl(45 65% 35%)",
    to: "hsl(220 50% 8%)",
    accentA: "hsl(45 95% 55% / 0.45)",
    accentB: "hsl(195 80% 60% / 0.4)",
    tag: "an easy read",
  },
  "jekyll-hyde": {
    from: "hsl(220 40% 12%)",
    via: "hsl(15 45% 18%)",
    to: "hsl(0 0% 3%)",
    accentA: "hsl(15 90% 50% / 0.4)",
    accentB: "hsl(220 100% 60% / 0.5)",
    tag: "advanced",
  },
  "animal-farm": {
    from: "hsl(15 55% 20%)",
    via: "hsl(35 50% 28%)",
    to: "hsl(20 30% 8%)",
    accentA: "hsl(45 85% 55% / 0.42)",
    accentB: "hsl(0 70% 45% / 0.45)",
    tag: "a modern classic",
  },
};

const SPEED_BLOCKS: Block[] = [
  { text: "The lamp made a small island of gold on the desk.", type: "narrative", isParagraphEnd: false },
  { text: "Beyond it, the room fell softly away, and the page waited with the patience of something alive.", type: "narrative", isParagraphEnd: false },
  { text: "He read the first sentence slowly, then the next with more trust,", type: "narrative", isParagraphEnd: false },
  { text: "letting the rhythm decide how quickly the scene should move.", type: "narrative", isParagraphEnd: false },
  { text: "A good pace did not hurry him past the image;", type: "narrative", isParagraphEnd: false },
  { text: "it carried him through it.", type: "narrative", isParagraphEnd: false },
  { text: "Outside the window, rain touched the glass in patient little taps.", type: "narrative", isParagraphEnd: false },
  { text: "Each one seemed to arrive just after the previous thought had settled.", type: "narrative", isParagraphEnd: false },
  { text: "He noticed how the room changed when he stopped forcing the page.", type: "narrative", isParagraphEnd: false },
  { text: "The chair became less like furniture and more like a place to listen.", type: "narrative", isParagraphEnd: false },
  { text: "The silence around the words was not empty.", type: "narrative", isParagraphEnd: false },
  { text: "It held the shape of the story until the next sentence appeared.", type: "narrative", isParagraphEnd: false },
  { text: "Some lines asked to be crossed quickly,", type: "narrative", isParagraphEnd: false },
  { text: "like a hallway lit from the far end.", type: "narrative", isParagraphEnd: false },
  { text: "Others opened slowly, with a door's quiet resistance.", type: "narrative", isParagraphEnd: false },
  { text: "He learned to let the pace change without losing the thread.", type: "narrative", isParagraphEnd: false },
  { text: "A name could wait half a breath.", type: "narrative", isParagraphEnd: false },
  { text: "A description could pass like scenery from a train.", type: "narrative", isParagraphEnd: false },
  { text: "Dialogue needed another rhythm altogether,", type: "narrative", isParagraphEnd: false },
  { text: "sharp enough to sound spoken, gentle enough to be understood.", type: "narrative", isParagraphEnd: false },
  { text: "By the middle of the passage, his eyes had stopped racing ahead.", type: "narrative", isParagraphEnd: false },
  { text: "They stayed with the present line.", type: "narrative", isParagraphEnd: false },
  { text: "The story felt closer there.", type: "narrative", isParagraphEnd: false },
  { text: "Not faster, not slower, but more exact.", type: "narrative", isParagraphEnd: false },
  { text: "That was the pace he wanted to keep.", type: "narrative", isParagraphEnd: false },
  { text: "When the final sentence came, it did not feel like an ending.", type: "narrative", isParagraphEnd: false },
  { text: "It felt like the reader and the book had agreed on a tempo.", type: "narrative", isParagraphEnd: false },
  { text: "He could now return to any chapter with a little more confidence.", type: "narrative", isParagraphEnd: false },
  { text: "The words would arrive one by one.", type: "narrative", isParagraphEnd: false },
  { text: "He would meet them at the right speed.", type: "narrative", isParagraphEnd: true },
];

export default function Index() {
  const navigate = useNavigate();
  const engage = useEngagement();
  const [prefs, setPrefs] = usePrefs();
  const [query, setQuery] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [speedOpen, setSpeedOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [docs, setDocs] = useState<DocRecord[]>([]);
  const [manageDoc, setManageDoc] = useState<DocRecord | null>(null);
  const lastBook = engage.lastBookId ? books.find(b => b.id === engage.lastBookId) : undefined;
  const lastProgress = lastBook ? engage.bookProgress[lastBook.id] : undefined;
  const lastChapter = lastBook && lastProgress ? lastBook.chapters[Math.min(lastProgress.chapterIdx, lastBook.chapters.length - 1)] : undefined;

  useEffect(() => {
    listDocs().then(setDocs).catch(() => setDocs([]));
  }, [uploadOpen]);

  const filteredBooks = useMemo(() => {
    const clean = query.trim().toLowerCase();
    if (!clean) return books;
    return books.filter(book =>
      [book.title, book.author, book.year.toString(), book.tagline]
        .join(" ")
        .toLowerCase()
        .includes(clean)
    );
  }, [query]);

  return (
    <div className="min-h-screen bg-background">
      <header className="w-full box-border px-6 pt-10 pb-6 max-w-6xl mx-auto flex items-center justify-between">
        <button onClick={() => navigate("/")} className="flex items-center gap-2.5 text-left">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center" style={{ boxShadow: "var(--shadow-glow)" }}>
            <BookOpen className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <div className="font-display text-lg leading-none tracking-tight">Lumen</div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mt-0.5">read like cinema</div>
          </div>
        </button>
        <div className="flex items-center gap-2">
          {(engage.streak > 0 || engage.wordsToday > 0) && (
            <div className="hidden sm:flex items-center gap-4 text-xs mr-2">
              <div className="flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-primary" />
                <span className="tabular-nums font-medium">{engage.streak}</span>
                <span className="text-muted-foreground">day{engage.streak === 1 ? "" : "s"}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="tabular-nums font-medium">{engage.wordsToday.toLocaleString()}</span>
                <span className="text-muted-foreground">words today</span>
              </div>
            </div>
          )}
          <IconButton label="Dictionary" onClick={() => navigate("/dictionary")} icon={<BookMarked className="h-4 w-4" />} />
          <IconButton label="Add document" onClick={() => setUploadOpen(true)} icon={<Upload className="h-4 w-4" />} />
          <IconButton label="Reading speed" onClick={() => setSpeedOpen(true)} icon={<Gauge className="h-4 w-4" />} />
          <IconButton label="Settings" onClick={() => setSettingsOpen(true)} icon={<Settings2 className="h-4 w-4" />} />
        </div>
      </header>

      {lastBook && lastProgress && lastChapter && !lastProgress.finished ? (
        <section className="w-full box-border px-6 pt-8 pb-12 max-w-5xl mx-auto">
          <motion.button
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            onClick={() => navigate(`/read/${lastBook.id}`)}
            className="group w-full text-left rounded-3xl overflow-hidden border border-primary/30 bg-gradient-to-br from-primary/15 via-card to-card hover:border-primary/60 transition-all p-6 md:p-8"
            style={{ boxShadow: "var(--shadow-glow)" }}
          >
            <div className="text-[10px] uppercase tracking-[0.35em] text-primary mb-3">Pick up where you left off</div>
            <h2 className="font-display text-2xl md:text-4xl leading-tight mb-1 text-balance">{lastBook.title}</h2>
            <div className="font-display italic text-sm text-muted-foreground mb-5">
              Chapter {lastChapter.number} - {titleCase(lastChapter.title)}
            </div>
            {lastProgress.lastLine && (
              <p className="font-display text-base md:text-lg leading-relaxed text-foreground/85 border-l-2 border-primary/40 pl-4 mb-6 italic">
                "...{trimLine(lastProgress.lastLine)}"
              </p>
            )}
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary transition-all" style={{ width: `${Math.round(lastProgress.pct * 100)}%` }} />
                </div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-2 tabular-nums">
                  {Math.round(lastProgress.pct * 100)}% read
                </div>
              </div>
              <div className="inline-flex items-center gap-2 px-5 h-11 rounded-full bg-primary text-primary-foreground font-medium group-hover:gap-3 transition-all">
                <Play className="w-4 h-4" /> Resume
              </div>
            </div>
          </motion.button>
        </section>
      ) : (
        <section className="w-full box-border px-6 pt-16 pb-20 max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <div className="text-[11px] uppercase tracking-[0.4em] text-primary mb-6">books, reimagined</div>
            <h1 className="font-display text-5xl md:text-7xl leading-[1.02] text-balance mb-6">
              One sentence at a time.<br />
              <span className="italic" style={{ color: "hsl(var(--primary))" }}>Every moment matters.</span>
            </h1>
            <p className="font-display text-lg md:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Curated classics paced like a film score. Smart recaps, scene-aware tension,
              and a reading flow designed to be remembered.
            </p>
          </motion.div>
        </section>
      )}

      <section className="w-full box-border px-6 pb-14 max-w-5xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-5">
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-1">My library</div>
            <h2 className="font-display text-2xl leading-tight">Your documents</h2>
          </div>
          <Button onClick={() => setUploadOpen(true)} className="rounded-full">
            <Upload className="h-4 w-4 mr-2" />
            Add
          </Button>
        </div>

        {docs.length === 0 ? (
          <button
            onClick={() => setUploadOpen(true)}
            className="w-full rounded-2xl border border-dashed border-border bg-card/60 px-6 py-10 text-left hover:border-primary/50 transition-colors"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-display text-2xl mb-2">Bring your own reading</div>
                <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
                  Upload PDFs, EPUBs, Word docs, text files, web exports, or scanned pages and read them with Lumen's pacing, dictionary, recaps, and tension map.
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground inline-flex items-center justify-center flex-shrink-0">
                <FileText className="h-5 w-5" />
              </div>
            </div>
          </button>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {docs.map(doc => (
              <div
                key={doc.id}
                className="min-w-0 rounded-2xl border border-border bg-card p-5 text-left hover:border-primary/50 hover:-translate-y-0.5 transition-all"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <div className="flex items-start justify-between gap-3">
                  <button className="min-w-0 flex-1 text-left" onClick={() => navigate(`/doc/${doc.id}`)}>
                    <div className="text-[10px] uppercase tracking-[0.22em] text-primary/80 mb-2">
                      {doc.folder || (doc.kind === "study" ? "study material" : "personal document")}
                    </div>
                    <h3 className="font-display text-2xl leading-tight truncate">{doc.title}</h3>
                  </button>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setManageDoc(doc)}
                      className="h-9 w-9 rounded-full hover:bg-muted inline-flex items-center justify-center"
                      aria-label={`Rename ${doc.title}`}
                    >
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => setManageDoc(doc)}
                      className="h-9 w-9 rounded-full hover:bg-muted inline-flex items-center justify-center"
                      aria-label={`Delete ${doc.title}`}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-3 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <span>{doc.wordCount.toLocaleString()} words</span>
                  <span>{Math.max(1, Math.round(doc.wordCount / prefs.wpm))} min</span>
                  <span>{doc.source}</span>
                </div>
                <button onClick={() => navigate(`/doc/${doc.id}`)} className="mt-5 inline-flex items-center gap-2 text-primary font-medium">
                  Open in Lumen <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="w-full box-border px-6 pb-24 max-w-5xl mx-auto">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-5">
          <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">In the library</div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search books"
              className="w-full h-10 rounded-full border border-border bg-card/80 pl-10 pr-4 text-sm outline-none transition-colors focus:border-primary"
            />
          </div>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {filteredBooks.map((b, i) => {
            const minutes = Math.round(b.totalWords / prefs.wpm);
            const theme = COVER_THEMES[b.id] ?? COVER_THEMES["jekyll-hyde"];
            const cover = coverTreatment(theme, prefs.theme);
            const bp = engage.bookProgress[b.id];
            const pct = bp ? Math.round(bp.pct * 100) : 0;
            const started = !!bp;
            const finished = bp?.finished;
            return (
              <motion.button
                key={b.id}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.15 + i * 0.1 }}
                onClick={() => navigate(`/read/${b.id}`)}
                className="group min-w-0 w-full text-left rounded-2xl overflow-hidden bg-card border border-border hover:border-primary/50 transition-all hover:-translate-y-0.5 flex flex-col"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <div
                  className="relative aspect-[5/3] p-6 flex flex-col justify-between overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, ${theme.from}, ${theme.via}, ${theme.to})`,
                    filter: cover.filter,
                  }}
                >
                  <div className="absolute inset-0 opacity-40" style={{ background: `radial-gradient(ellipse at 25% 20%, ${theme.accentA}, transparent 60%)` }} />
                  <div className="absolute inset-0 opacity-30" style={{ background: `radial-gradient(ellipse at 80% 90%, ${theme.accentB}, transparent 55%)` }} />
                  <div className="absolute inset-0 transition-colors" style={{ background: cover.overlay, mixBlendMode: cover.blendMode }} />
                  <div className="relative flex items-center justify-between">
                    <div className="text-[9px] uppercase tracking-[0.3em]" style={{ color: cover.muted }}>{b.year}</div>
                    <div className="text-[9px] uppercase tracking-[0.3em] px-2 py-0.5 rounded-full border" style={{ color: cover.muted, borderColor: cover.border }}>
                      {finished ? "finished" : started ? `${pct}% read` : theme.tag}
                    </div>
                  </div>
                  <div className="relative">
                    <div className="font-display text-2xl md:text-3xl leading-tight text-balance mb-2" style={{ color: cover.text }}>{b.title}</div>
                    <div className="font-display italic text-sm" style={{ color: cover.muted }}>{b.author}</div>
                  </div>
                  {started && !finished && (
                    <div className="absolute left-0 right-0 bottom-0 h-1 bg-white/10">
                      <div className="h-full" style={{ width: `${pct}%`, background: cover.text }} />
                    </div>
                  )}
                </div>
                <div className="p-6 flex flex-col flex-1">
                  <p className="font-display text-base md:text-lg leading-snug text-balance mb-5 text-foreground/90">"{b.tagline}"</p>
                  <div className="flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-wider text-muted-foreground mb-6">
                    <span>{b.chapters.length} {b.chapters.length === 1 ? "chapter" : "chapters"}</span>
                    <span>{minutes} min</span>
                    <span className="inline-flex items-center gap-1"><Wind className="w-3 h-3" /> ambient</span>
                  </div>
                  <div className="mt-auto inline-flex items-center gap-2 text-primary font-medium group-hover:gap-3 transition-all">
                    {finished ? "Read again" : started ? "Resume" : "Begin reading"} <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
        {filteredBooks.length === 0 && <div className="py-16 text-center text-sm text-muted-foreground">No books match that search.</div>}
      </section>

      <footer className="border-t border-border py-6 px-6 text-center text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
        Lumen - Curated reading - Public domain texts
      </footer>

      <HomeSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} prefs={prefs} setPrefs={setPrefs} />
      <SpeedCheckDialog open={speedOpen} onOpenChange={setSpeedOpen} currentWpm={prefs.wpm} onApply={(wpm) => setPrefs({ wpm })} />
      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onCreated={(docId) => {
          setUploadOpen(false);
          listDocs().then(setDocs).finally(() => navigate(`/doc/${docId}`));
        }}
      />
      <DocumentManageDialog
        doc={manageDoc}
        onClose={() => setManageDoc(null)}
        onSaved={async () => {
          setManageDoc(null);
          setDocs(await listDocs());
        }}
      />
    </div>
  );
}

function DocumentManageDialog({ doc, onClose, onSaved }: { doc: DocRecord | null; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState("");
  const [folder, setFolder] = useState("");

  useEffect(() => {
    setTitle(doc?.title ?? "");
    setFolder(doc?.folder ?? "");
  }, [doc]);

  return (
    <Dialog open={!!doc} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Manage document</DialogTitle>
        </DialogHeader>
        {doc && (
          <div className="space-y-4">
            <div className="space-y-3">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Document name" />
              <Input value={folder} onChange={(e) => setFolder(e.target.value)} placeholder="Folder" />
            </div>
            <div className="rounded-xl border border-border bg-secondary/50 p-4 text-xs text-muted-foreground">
              {doc.wordCount.toLocaleString()} words · {doc.source.toUpperCase()}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
              <Button
                variant="outline"
                className="rounded-full border-destructive/40 text-destructive hover:bg-destructive/10"
                onClick={async () => {
                  await deleteDoc(doc.id);
                  onSaved();
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" className="rounded-full" onClick={onClose}>Cancel</Button>
                <Button
                  className="rounded-full"
                  onClick={async () => {
                    await updateDocMeta(doc.id, { title: title.trim() || doc.title, folder: folder.trim() || undefined });
                    onSaved();
                  }}
                >
                  Save changes
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function IconButton({ label, icon, onClick }: { label: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="h-10 w-10 rounded-full border border-border bg-card/80 hover:border-primary/50 inline-flex items-center justify-center transition-colors"
      aria-label={label}
      title={label}
    >
      {icon}
    </button>
  );
}

function coverTreatment(_theme: { from: string; via: string; to: string }, activeTheme: Theme) {
  const treatments: Record<Theme, {
    overlay: string;
    blendMode: React.CSSProperties["mixBlendMode"];
    filter: string;
    text: string;
    muted: string;
    border: string;
  }> = {
    midnight: {
      overlay: "linear-gradient(135deg, hsl(222 50% 5% / 0.10), hsl(210 100% 70% / 0.08))",
      blendMode: "soft-light",
      filter: "saturate(1.02) brightness(0.98)",
      text: "white",
      muted: "rgb(255 255 255 / 0.72)",
      border: "rgb(255 255 255 / 0.16)",
    },
    dark: {
      overlay: "linear-gradient(135deg, hsl(220 15% 6% / 0.08), hsl(15 90% 58% / 0.08))",
      blendMode: "soft-light",
      filter: "saturate(1) brightness(1)",
      text: "white",
      muted: "rgb(255 255 255 / 0.72)",
      border: "rgb(255 255 255 / 0.16)",
    },
    sepia: {
      overlay: "linear-gradient(135deg, hsl(38 45% 92% / 0.56), hsl(18 70% 42% / 0.12))",
      blendMode: "screen",
      filter: "saturate(0.72) brightness(1.2) sepia(0.16) contrast(0.88)",
      text: "hsl(28 35% 15%)",
      muted: "hsl(28 24% 28% / 0.72)",
      border: "hsl(28 28% 22% / 0.18)",
    },
    paper: {
      overlay: "linear-gradient(135deg, hsl(36 35% 95% / 0.62), hsl(12 60% 45% / 0.08))",
      blendMode: "screen",
      filter: "saturate(0.78) brightness(1.24) contrast(0.86)",
      text: "hsl(30 15% 18%)",
      muted: "hsl(30 12% 28% / 0.68)",
      border: "hsl(30 15% 18% / 0.16)",
    },
    light: {
      overlay: "linear-gradient(135deg, hsl(0 0% 99% / 0.58), hsl(220 14% 92% / 0.26), hsl(15 80% 50% / 0.08))",
      blendMode: "screen",
      filter: "saturate(0.82) brightness(1.22) contrast(0.9)",
      text: "hsl(220 15% 15%)",
      muted: "hsl(220 10% 30% / 0.68)",
      border: "hsl(220 15% 15% / 0.16)",
    },
    dune: {
      overlay: "linear-gradient(135deg, hsl(32 35% 80% / 0.44), hsl(22 70% 45% / 0.16))",
      blendMode: "screen",
      filter: "saturate(0.9) brightness(1.12) sepia(0.1) contrast(0.92)",
      text: "hsl(25 40% 18%)",
      muted: "hsl(25 35% 24% / 0.72)",
      border: "hsl(25 40% 18% / 0.18)",
    },
    forest: {
      overlay: "linear-gradient(135deg, hsl(145 28% 9% / 0.42), hsl(80 70% 65% / 0.12))",
      blendMode: "soft-light",
      filter: "saturate(0.78) brightness(0.9) hue-rotate(8deg)",
      text: "hsl(60 25% 90%)",
      muted: "hsl(60 20% 82% / 0.72)",
      border: "hsl(60 25% 90% / 0.18)",
    },
    contrast: {
      overlay: "linear-gradient(135deg, hsl(0 0% 0% / 0.45), hsl(50 100% 60% / 0.10))",
      blendMode: "normal",
      filter: "saturate(0.35) contrast(1.45) brightness(0.82)",
      text: "hsl(0 0% 100%)",
      muted: "hsl(0 0% 100% / 0.78)",
      border: "hsl(0 0% 100% / 0.26)",
    },
  };

  return treatments[activeTheme];
}

function HomeSettingsDialog({ open, onOpenChange, prefs, setPrefs }: { open: boolean; onOpenChange: (open: boolean) => void; prefs: ReturnType<typeof usePrefs>[0]; setPrefs: ReturnType<typeof usePrefs>[1] }) {
  const [draft, setDraft] = useState(prefs);
  useEffect(() => {
    if (open) setDraft(prefs);
  }, [open, prefs]);
  const updateDraft = (p: Partial<typeof prefs>) => setDraft(prev => ({ ...prev, ...p }));

  const previewBlock: Block = {
    text: "The sentence slows, brightens, and waits for you to meet it.",
    type: "narrative",
    isParagraphEnd: true,
  };
  const flowPreview: Block[] = [
    previewBlock,
    { text: "A second line gives the thought room to breathe.", type: "narrative", isParagraphEnd: false },
    { text: "The rhythm stays calm while the page moves forward.", type: "narrative", isParagraphEnd: true },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-4xl max-h-[88dvh] overflow-y-auto overflow-x-hidden bg-card border-border p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="font-display text-2xl">Reading room</DialogTitle>
        </DialogHeader>
        <div className="grid gap-0 md:grid-cols-[1fr_1.1fr]">
          <div className="reading-surface px-6 py-8 flex items-center justify-center border-b md:border-b-0 md:border-r border-border">
            <div className="w-full text-center flex flex-col items-center gap-5" style={{ maxWidth: `${Math.min(420, draft.width)}px` }}>
              <div className="text-[10px] uppercase tracking-[0.3em] mb-5" style={{ color: "hsl(var(--reading-dim))" }}>Preview</div>
              <div className="h-6 w-full text-center">
                {draft.readingMode === "spotlight" && draft.showContext && (
                  <p
                    className="reading-copy text-xs leading-snug truncate px-4"
                    style={{ color: "hsl(var(--reading-dim))", opacity: draft.contextOpacity }}
                  >
                    Before it, the page grows quiet.
                  </p>
                )}
              </div>
              {draft.readingMode === "flow" ? (
                <ReadingFlow
                  blocks={flowPreview.slice(0, Math.min(flowPreview.length, draft.flowLines))}
                  blockKey={`${draft.font}-${draft.fontSize}-${draft.lineHeight}-${draft.highlight}-${draft.flowLines}`}
                  highlightProgress={draft.highlight ? 0.58 : 0}
                  highlight={draft.highlight}
                  fontSize={Math.min(40, draft.fontSize)}
                  lineHeight={draft.lineHeight}
                />
              ) : (
                <ReadingBlock
                  block={previewBlock}
                  blockKey={`${draft.font}-${draft.fontSize}-${draft.lineHeight}-${draft.highlight}`}
                  progress={draft.highlight ? 0.58 : 0}
                  highlight={draft.highlight}
                  fontSize={Math.min(40, draft.fontSize)}
                  lineHeight={draft.lineHeight}
                />
              )}
              <div className="h-6 w-full text-center">
                {draft.readingMode === "spotlight" && draft.showContext && (
                  <p
                    className="reading-copy text-xs leading-snug truncate px-4"
                    style={{ color: "hsl(var(--reading-dim))", opacity: draft.contextOpacity }}
                  >
                    After it, the next line begins to glow.
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em]" style={{ color: "hsl(var(--reading-dim))" }}>
                <span>{draft.ambient === "silence" ? "silent" : AMBIENT_OPTIONS.find(a => a.id === draft.ambient)?.label}</span>
                <span>·</span>
                <span>{Math.round(draft.ambientVolume * 100)}%</span>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-7">
            <SettingGroup label="Theme">
              <div className="grid grid-cols-4 gap-2">
                {THEME_OPTIONS.map(theme => (
                  <button
                    key={theme.id}
                    onClick={() => updateDraft({ theme: theme.id as Theme })}
                    className={`h-14 rounded-xl border flex items-center justify-center transition-all ${draft.theme === theme.id ? "border-primary ring-2 ring-primary/25" : "border-border hover:border-primary/40"}`}
                    aria-label={theme.label}
                    title={theme.label}
                  >
                    <span className="h-7 w-7 rounded-full border border-border" style={{ background: theme.swatch }} />
                  </button>
                ))}
              </div>
            </SettingGroup>
            <div className="grid gap-5 sm:grid-cols-2">
              <SettingGroup label={`Speed ${draft.wpm} WPM`}>
                <input type="range" min={150} max={700} step={10} value={draft.wpm} onChange={e => updateDraft({ wpm: +e.target.value })} className="w-full accent-primary" />
              </SettingGroup>
              <SettingGroup label={`Text ${draft.fontSize}px`}>
                <input type="range" min={20} max={48} step={1} value={draft.fontSize} onChange={e => updateDraft({ fontSize: +e.target.value })} className="w-full accent-primary" />
              </SettingGroup>
              <SettingGroup label={`Line height ${draft.lineHeight.toFixed(2)}`}>
                <input type="range" min={1.1} max={1.8} step={0.05} value={draft.lineHeight} onChange={e => updateDraft({ lineHeight: +e.target.value })} className="w-full accent-primary" />
              </SettingGroup>
              <SettingGroup label="Font">
                <FontPicker value={draft.font} onChange={(font) => updateDraft({ font })} />
              </SettingGroup>
            </div>
            <SettingGroup label="Reading aids">
              <div className="grid gap-2 sm:grid-cols-2">
                <ToggleButton active={draft.highlight} onClick={() => updateDraft({ highlight: !draft.highlight })} label="Smooth highlight" />
                {draft.readingMode === "spotlight" && (
                  <ToggleButton active={draft.showContext} onClick={() => updateDraft({ showContext: !draft.showContext })} label="Surrounding lines" />
                )}
              </div>
              {draft.readingMode === "spotlight" && draft.showContext && (
                <div className="mt-4">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
                    Context opacity {Math.round(draft.contextOpacity * 100)}%
                  </div>
                  <input type="range" min={0.1} max={1} step={0.05} value={draft.contextOpacity} onChange={e => updateDraft({ contextOpacity: +e.target.value })} className="w-full accent-primary" />
                </div>
              )}
            </SettingGroup>
            <SettingGroup label="Reading mode">
              <ReadingModeControl prefs={draft} setPrefs={updateDraft} />
            </SettingGroup>
            <SettingGroup label="Ambience">
              <div className="grid grid-cols-4 gap-2">
                {AMBIENT_OPTIONS.map(ambient => (
                  <button key={ambient.id} onClick={() => updateDraft({ ambient: ambient.id as Ambient })} className={`h-9 rounded-full border text-[11px] ${draft.ambient === ambient.id ? "bg-primary text-primary-foreground border-primary" : "border-border bg-secondary text-secondary-foreground"}`}>
                    {ambient.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-3">
                <Volume2 className="h-4 w-4 text-muted-foreground" />
                <input type="range" min={0} max={1} step={0.05} value={draft.ambientVolume} onChange={e => updateDraft({ ambientVolume: +e.target.value })} className="flex-1 accent-primary" />
              </div>
            </SettingGroup>
            <div className="sticky bottom-0 -mx-6 -mb-6 border-t border-border bg-card/95 p-4 backdrop-blur">
              <Button
                className="h-11 w-full rounded-full"
                onClick={() => {
                  setPrefs(draft);
                  onOpenChange(false);
                }}
              >
                Apply settings
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SpeedCheckDialog({ open, onOpenChange, currentWpm, onApply }: { open: boolean; onOpenChange: (open: boolean) => void; currentWpm: number; onApply: (wpm: number) => void }) {
  const [manualWpm, setManualWpm] = useState(currentWpm);
  const [blockIdx, setBlockIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [blockProgress, setBlockProgress] = useState(0);
  const startRef = useRef<number>(performance.now());
  const elapsedRef = useRef(0);
  const rafRef = useRef<number>();
  const block = SPEED_BLOCKS[blockIdx];
  const prevBlock = blockIdx > 0 ? SPEED_BLOCKS[blockIdx - 1] : null;
  const nextBlock = blockIdx < SPEED_BLOCKS.length - 1 ? SPEED_BLOCKS[blockIdx + 1] : null;
  const blockMs = useMemo(() => estimateBlockMs(block.text, manualWpm, block.isParagraphEnd), [block, manualWpm]);

  useEffect(() => {
    if (open) {
      setManualWpm(currentWpm);
      setBlockIdx(0);
      setBlockProgress(0);
      setPlaying(false);
      elapsedRef.current = 0;
    }
  }, [currentWpm, open]);

  useEffect(() => {
    setBlockProgress(0);
    elapsedRef.current = 0;
    startRef.current = performance.now();
  }, [blockIdx, manualWpm]);

  useEffect(() => {
    if (!open || !playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    startRef.current = performance.now() - elapsedRef.current;
    const tick = () => {
      const elapsed = performance.now() - startRef.current;
      elapsedRef.current = elapsed;
      const progress = Math.min(1, elapsed / blockMs);
      setBlockProgress(progress);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else if (blockIdx < SPEED_BLOCKS.length - 1) {
        setBlockIdx(i => i + 1);
      } else {
        setPlaying(false);
        setBlockProgress(1);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [blockIdx, blockMs, open, playing]);

  function replay() {
    setBlockIdx(0);
    setBlockProgress(0);
    elapsedRef.current = 0;
    setPlaying(true);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] sm:max-w-5xl max-h-[92dvh] overflow-y-auto overflow-x-hidden bg-card border-border p-0">
        <div className="reading-surface min-h-[60vh] sm:min-h-[70vh] flex flex-col overflow-x-hidden">
          <DialogHeader className="px-4 sm:px-6 pt-6 pb-4 pr-10">
            <DialogTitle className="font-display text-xl sm:text-2xl" style={{ color: "hsl(var(--reading-text))" }}>Reading speed check</DialogTitle>
          </DialogHeader>
          <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-5 sm:py-8 min-w-0">
            <div className="w-full max-w-3xl flex flex-col items-center gap-5">
              <div className="h-6 w-full text-center">
                <AnimatePresence mode="wait">
                  {prevBlock && (
                    <motion.p
                      key={`speed-prev-${blockIdx}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 0.45, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="reading-copy text-sm leading-snug truncate px-4"
                      style={{ color: "hsl(var(--reading-dim))" }}
                    >
                      {trimLine(prevBlock.text, 80)}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              <AnimatePresence mode="wait">
                <ReadingBlock
                  key={`speed-${blockIdx}`}
                  blockKey={`speed-${blockIdx}`}
                  block={block}
                  progress={blockProgress}
                  highlight
                  fontSize={30}
                  lineHeight={1.35}
                />
              </AnimatePresence>

              <div className="h-6 w-full text-center">
                <AnimatePresence mode="wait">
                  {nextBlock && (
                    <motion.p
                      key={`speed-next-${blockIdx}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 0.45, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="reading-copy text-sm leading-snug truncate px-4"
                      style={{ color: "hsl(var(--reading-dim))" }}
                    >
                      {trimLine(nextBlock.text, 80)}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 bg-background/80 backdrop-blur px-4 sm:px-6 py-5">
            <div className="max-w-3xl mx-auto space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-1">Pace</div>
                  <div className="font-display text-2xl sm:text-3xl tabular-nums">{manualWpm} WPM</div>
                </div>
                <div className="grid grid-cols-[44px_1fr_1fr] gap-2 sm:flex sm:w-auto">
                  <Button variant="outline" size="icon" onClick={replay} aria-label="Replay sample" className="shrink-0">
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="min-w-0"
                    onClick={() => {
                      if (blockProgress >= 1 && blockIdx === SPEED_BLOCKS.length - 1) replay();
                      else setPlaying(p => !p);
                    }}
                  >
                    {playing ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                    {playing ? "Pause" : "Play"}
                  </Button>
                  <Button className="min-w-0" onClick={() => { onApply(manualWpm); onOpenChange(false); }}>Use pace</Button>
                </div>
              </div>
              <input type="range" min={120} max={700} step={5} value={manualWpm} onChange={e => setManualWpm(+e.target.value)} className="w-full accent-primary" />
              <div className="text-xs text-muted-foreground">
                <span>Adjust until the sample moves at your natural reading rhythm.</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SettingGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">{label}</div>
      {children}
    </div>
  );
}

function ToggleButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`h-11 rounded-full border px-4 inline-flex items-center justify-between gap-3 text-sm ${active ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary text-secondary-foreground"}`}>
      <span>{label}</span>
      {active && <Check className="h-4 w-4" />}
    </button>
  );
}

function titleCase(s: string) {
  return s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

function trimLine(s: string, n = 110) {
  const clean = s.replace(/\s+/g, " ").trim();
  return clean.length > n ? clean.slice(0, n).trimEnd() + "..." : clean;
}
