import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BookMarked, Search, Trash2 } from "lucide-react";
import { loadSavedWords, removeSavedWord, type SavedWord } from "@/lib/dictionary";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function Dictionary() {
  const navigate = useNavigate();
  const [words, setWords] = useState<SavedWord[]>(() => loadSavedWords());
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<SavedWord | null>(null);

  useEffect(() => {
    const refresh = () => setWords(loadSavedWords());
    window.addEventListener("lumen:dictionary-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("lumen:dictionary-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const filtered = words.filter(item =>
    [item.word, item.definition, item.partOfSpeech ?? "", ...item.synonyms]
      .join(" ")
      .toLowerCase()
      .includes(query.trim().toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="px-6 pt-10 pb-8 max-w-5xl mx-auto flex items-center justify-between">
        <button
          onClick={() => navigate("/")}
          className="h-10 w-10 rounded-full border border-border bg-card/80 hover:border-primary/50 inline-flex items-center justify-center transition-colors"
          aria-label="Back to library"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-1">Personal dictionary</div>
          <h1 className="font-display text-3xl leading-tight">Words you kept</h1>
        </div>
        <div className="h-10 w-10 rounded-full border border-border bg-card/80 inline-flex items-center justify-center">
          <BookMarked className="h-4 w-4 text-primary" />
        </div>
      </header>

      <main className="px-6 pb-24 max-w-5xl mx-auto">
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search saved words"
            className="w-full h-12 rounded-full border border-border bg-card pl-11 pr-4 text-sm outline-none transition-colors focus:border-primary"
          />
        </div>

        {words.length === 0 ? (
          <div className="reading-surface rounded-3xl border border-border min-h-[46vh] flex items-center justify-center px-6 text-center">
            <div className="max-w-sm">
              <div className="mx-auto h-12 w-12 rounded-full border border-border bg-card flex items-center justify-center mb-5">
                <BookMarked className="h-5 w-5 text-primary" />
              </div>
              <h2 className="font-display text-2xl mb-2" style={{ color: "hsl(var(--reading-text))" }}>No saved words yet</h2>
              <p className="text-sm leading-relaxed" style={{ color: "hsl(var(--reading-dim))" }}>
                Tap a word while reading, open its meaning, then save it. It will appear here as a quiet study list.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filtered.map(item => (
              <button
                key={item.word}
                onClick={() => setSelected(item)}
                className="rounded-2xl border border-border bg-card p-5 text-left hover:border-primary/50 hover:-translate-y-0.5 transition-all"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h2 className="font-display text-2xl leading-tight">{item.word}</h2>
                    {item.partOfSpeech && <div className="text-xs italic text-muted-foreground mt-0.5">{item.partOfSpeech}</div>}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setWords(removeSavedWord(item.word));
                      if (selected?.word === item.word) setSelected(null);
                    }}
                    className="h-9 w-9 rounded-full hover:bg-muted inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={`Remove ${item.word}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-sm leading-relaxed text-foreground/90">{item.definition}</p>
                {item.synonyms.length > 0 && (
                  <div className="mt-4">
                    <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">Synonyms</div>
                    <div className="flex flex-wrap gap-2">
                      {item.synonyms.map(synonym => (
                        <span key={synonym} className="px-2 py-1 rounded-full bg-secondary text-secondary-foreground text-xs">
                          {synonym}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
        {words.length > 0 && filtered.length === 0 && (
          <div className="py-16 text-center text-sm text-muted-foreground">No saved words match that search.</div>
        )}
      </main>

      <WordDetailDialog
        word={selected}
        onOpenChange={(open) => { if (!open) setSelected(null); }}
      />
    </div>
  );
}

function WordDetailDialog({ word, onOpenChange }: { word: SavedWord | null; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={!!word} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg overflow-hidden bg-card border-border p-0">
        {word && (
          <>
            <div className="reading-surface px-6 pt-8 pb-7 border-b border-border">
              <DialogHeader>
                <div className="text-[10px] uppercase tracking-[0.3em] mb-3" style={{ color: "hsl(var(--reading-dim))" }}>
                  Saved word
                </div>
                <DialogTitle className="font-display text-5xl leading-none pr-8" style={{ color: "hsl(var(--reading-text))" }}>
                  {word.word}
                </DialogTitle>
                {word.partOfSpeech && (
                  <div className="font-display italic text-sm pt-2" style={{ color: "hsl(var(--reading-dim))" }}>
                    {word.partOfSpeech}
                  </div>
                )}
              </DialogHeader>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">Meaning</div>
                <p className="font-display text-xl leading-relaxed text-foreground/90">{word.definition}</p>
              </div>
              {word.synonyms.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">Synonyms</div>
                  <div className="flex flex-wrap gap-2">
                    {word.synonyms.map(synonym => (
                      <span key={synonym} className="px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-sm">
                        {synonym}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Added {new Date(word.addedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
