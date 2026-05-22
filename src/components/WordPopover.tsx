import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Loader2, Plus } from "lucide-react";
import type { MeaningResult } from "@/lib/dictionary";

interface Props {
  word: string | null;
  loading: boolean;
  result: MeaningResult | null;
  saved?: boolean;
  onSave?: () => void;
  onClose: () => void;
}

export function WordPopover({ word, loading, result, saved = false, onSave, onClose }: Props) {
  return (
    <Dialog open={!!word} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl flex items-baseline gap-2 pr-8">
            <span className="flex items-baseline gap-2">
              {word}
              {result?.partOfSpeech && <span className="text-xs font-normal italic text-muted-foreground">{result.partOfSpeech}</span>}
            </span>
          </DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center gap-2 py-4 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Looking up...
          </div>
        ) : result ? (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed">{result.definition}</p>
            {result.synonyms.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">Synonyms</div>
                <div className="flex flex-wrap gap-2">
                  {result.synonyms.map(synonym => (
                    <span key={synonym} className="px-2 py-1 rounded-full bg-secondary text-secondary-foreground text-xs">
                      {synonym}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {onSave && (
              <div className="pt-1">
                <Button
                  type="button"
                  variant={saved ? "secondary" : "outline"}
                  className="w-full rounded-full"
                  onClick={onSave}
                  disabled={saved}
                >
                  {saved ? <Check className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  {saved ? "Saved to dictionary" : "Add to dictionary"}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No definition found.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
