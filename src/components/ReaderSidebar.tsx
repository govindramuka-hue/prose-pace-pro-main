import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Users, Settings2, X, Check, Volume2, VolumeX } from "lucide-react";
import type { Book, Chapter } from "@/data/book";
import { THEME_OPTIONS, AMBIENT_OPTIONS, type Prefs } from "@/lib/reader-prefs";
import { FontPicker } from "@/components/FontPicker";
import { ReadingModeControl } from "@/components/ReadingModeControl";

type Tab = "chapters" | "characters" | "settings";

interface Props {
  open: boolean;
  onClose: () => void;
  book: Book;
  currentChapterIdx: number;
  onJumpChapter: (idx: number) => void;
  prefs: Prefs;
  setPrefs: (p: Partial<Prefs>) => void;
}

export function ReaderSidebar({ open, onClose, book, currentChapterIdx, onJumpChapter, prefs, setPrefs }: Props) {
  const [tab, setTab] = useState<Tab>("chapters");

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 240 }}
            className="fixed top-0 left-0 bottom-0 z-50 w-[88vw] max-w-md bg-card border-r border-border flex flex-col"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border">
              <div>
                <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{book.author}</div>
                <div className="font-display text-lg leading-tight mt-0.5">{book.title}</div>
              </div>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-muted" aria-label="Close menu">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 border-b border-border">
              <TabBtn icon={<BookOpen className="h-4 w-4" />} label="Chapters" active={tab === "chapters"} onClick={() => setTab("chapters")} />
              <TabBtn icon={<Users className="h-4 w-4" />} label="Cast" active={tab === "characters"} onClick={() => setTab("characters")} />
              <TabBtn icon={<Settings2 className="h-4 w-4" />} label="Settings" active={tab === "settings"} onClick={() => setTab("settings")} />
            </div>

            <div className="flex-1 overflow-y-auto">
              {tab === "chapters" && <ChapterList chapters={book.chapters} currentIdx={currentChapterIdx} onJump={(i) => { onJumpChapter(i); onClose(); }} />}
              {tab === "characters" && <CharacterList characters={book.characters} />}
              {tab === "settings" && <SettingsPanel prefs={prefs} setPrefs={setPrefs} onApplied={onClose} />}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function TabBtn({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`py-3 flex items-center justify-center gap-2 text-xs uppercase tracking-wider transition-colors border-b-2 ${
        active ? "text-primary border-primary" : "text-muted-foreground border-transparent hover:text-foreground"
      }`}
    >
      {icon}{label}
    </button>
  );
}

function ChapterList({ chapters, currentIdx, onJump }: { chapters: Chapter[]; currentIdx: number; onJump: (i: number) => void }) {
  return (
    <ul className="py-2">
      {chapters.map((c, i) => (
        <li key={c.number}>
          <button
            onClick={() => onJump(i)}
            className={`w-full text-left px-5 py-3 flex items-baseline gap-3 hover:bg-muted/60 transition-colors ${i === currentIdx ? "bg-muted/40" : ""}`}
          >
            <span className={`text-xs tabular-nums ${i === currentIdx ? "text-primary" : "text-muted-foreground"}`}>{String(c.number).padStart(2, "0")}</span>
            <span className="flex-1">
              <span className={`font-display text-base block leading-tight ${i === currentIdx ? "text-primary" : "text-foreground"}`}>
                {c.title.toLowerCase().replace(/\b\w/g, ch => ch.toUpperCase())}
              </span>
              <span className="text-[11px] text-muted-foreground">{c.wordCount.toLocaleString()} words · {Math.max(1, Math.round(c.wordCount / 250))} min read</span>
            </span>
            {i === currentIdx && <Check className="h-4 w-4 text-primary" />}
          </button>
        </li>
      ))}
    </ul>
  );
}

function CharacterList({ characters }: { characters: { name: string; role: string; bio: string; icon?: string }[] }) {
  return (
    <ul className="py-2">
      {characters.map((c) => {
        const initials = c.name
          .replace(/^(Mr|Mrs|Ms|Dr|Prof)\.?\s+/i, "")
          .split(/\s+/)
          .map(w => w[0])
          .filter(Boolean)
          .slice(0, 2)
          .join("")
          .toUpperCase();
        return (
          <li key={c.name} className="px-5 py-4 border-b border-border last:border-0">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-display text-sm tracking-wide bg-secondary text-secondary-foreground border border-border">
                {initials}
              </div>
              <div>
                <div className="font-display text-base leading-tight">{c.name}</div>
                <div className="text-[11px] uppercase tracking-wider text-primary/80 mt-0.5">{c.role}</div>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{c.bio}</p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function SettingsPanel({ prefs, setPrefs, onApplied }: { prefs: Prefs; setPrefs: (p: Partial<Prefs>) => void; onApplied?: () => void }) {
  const [draft, setDraft] = useState(prefs);
  const appliedRef = useRef(false);
  useEffect(() => setDraft(prefs), [prefs]);
  useEffect(() => {
    appliedRef.current = false;
    document.documentElement.setAttribute("data-theme", draft.theme);
    return () => {
      if (!appliedRef.current) document.documentElement.setAttribute("data-theme", prefs.theme);
    };
  }, [draft.theme, prefs.theme]);
  const updateDraft = (p: Partial<Prefs>) => setDraft(prev => ({ ...prev, ...p }));

  return (
    <div className="p-5 space-y-7">
      <Section label="Theme">
        <div className="grid grid-cols-4 gap-2">
          {THEME_OPTIONS.map(t => (
            <button
              key={t.id}
              onClick={() => updateDraft({ theme: t.id })}
              className={`flex flex-col items-center gap-1.5 p-2 rounded-lg border transition-all ${draft.theme === t.id ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/40"}`}
            >
              <div className="w-8 h-8 rounded-full border border-border" style={{ background: t.swatch }} />
              <span className="text-[10px] tracking-wide">{t.label}</span>
            </button>
          ))}
        </div>
      </Section>

      <Section label={`Speed - ${draft.wpm} WPM`}>
        <input type="range" min={150} max={700} step={10} value={draft.wpm} onChange={e => updateDraft({ wpm: +e.target.value })} className="w-full accent-primary" />
      </Section>

      <Section label="Reading mode">
        <ReadingModeControl prefs={draft} setPrefs={updateDraft} />
      </Section>

      <Section label="Smooth highlight">
        <Toggle checked={draft.highlight} onChange={v => updateDraft({ highlight: v })} />
      </Section>

      {draft.readingMode === "spotlight" && (
        <>
          <Section label="Show surrounding lines">
            <Toggle checked={draft.showContext} onChange={v => updateDraft({ showContext: v })} />
          </Section>
          {draft.showContext && (
            <Section label={`Surrounding line opacity - ${Math.round(draft.contextOpacity * 100)}%`}>
              <input type="range" min={0.1} max={1} step={0.05} value={draft.contextOpacity} onChange={e => updateDraft({ contextOpacity: +e.target.value })} className="w-full accent-primary" />
            </Section>
          )}
        </>
      )}

      <Section label="Font">
        <FontPicker value={draft.font} onChange={(font) => updateDraft({ font })} />
      </Section>

      <Section label={`Text size - ${draft.fontSize}px`}>
        <input type="range" min={20} max={48} step={1} value={draft.fontSize} onChange={e => updateDraft({ fontSize: +e.target.value })} className="w-full accent-primary" />
      </Section>

      <Section label={`Line height - ${draft.lineHeight.toFixed(2)}`}>
        <input type="range" min={1.1} max={1.8} step={0.05} value={draft.lineHeight} onChange={e => updateDraft({ lineHeight: +e.target.value })} className="w-full accent-primary" />
      </Section>

      <Section label="Ambience">
        <div className="grid grid-cols-4 gap-2 mb-3">
          {AMBIENT_OPTIONS.map(a => (
            <button
              key={a.id}
              onClick={() => updateDraft({ ambient: a.id })}
              className={`py-2 text-[11px] rounded-md border transition-colors ${draft.ambient === a.id ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-secondary-foreground border-border hover:bg-muted"}`}
            >
              {a.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {draft.ambientVolume === 0 ? <VolumeX className="h-4 w-4 text-muted-foreground" /> : <Volume2 className="h-4 w-4 text-muted-foreground" />}
          <input type="range" min={0} max={1} step={0.05} value={draft.ambientVolume} onChange={e => updateDraft({ ambientVolume: +e.target.value })} className="flex-1 accent-primary" />
        </div>
      </Section>
      <div className="border-t border-border pt-4">
        <button
          type="button"
          onClick={() => {
            appliedRef.current = true;
            setPrefs(draft);
            document.documentElement.setAttribute("data-theme", draft.theme);
            onApplied?.();
          }}
          className="h-11 w-full rounded-full bg-primary text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Apply settings
        </button>
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">{label}</div>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors ${checked ? "bg-primary" : "bg-muted"}`}
      aria-pressed={checked}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-background transition-transform ${checked ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  );
}
