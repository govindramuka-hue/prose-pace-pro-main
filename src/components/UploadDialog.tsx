import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ingestFile, ingestPasted } from "@/lib/ingestion";
import { buildAndSaveDoc } from "@/lib/document-builder";
import { Upload, FileText, Image as ImageIcon, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (docId: string) => void;
}

export function UploadDialog({ open, onOpenChange, onCreated }: Props) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [pasteTitle, setPasteTitle] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setBusy(true);
    setProgress(0);
    setProgressMsg("Preparing…");
    try {
      const ing = await ingestFile(file, (pct, msg) => {
        setProgress(Math.round(pct * 100));
        setProgressMsg(msg);
      });
      setProgressMsg("Analyzing narrative tension…");
      const doc = await buildAndSaveDoc(ing);
      onCreated(doc.id);
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      setProgressMsg("Failed to read file. Try another.");
    } finally {
      setBusy(false);
    }
  }

  async function handlePaste() {
    if (!pasteText.trim()) return;
    setBusy(true);
    setProgressMsg("Processing…");
    try {
      const ing = await ingestPasted(pasteText, pasteTitle.trim() || "Pasted text");
      const doc = await buildAndSaveDoc(ing);
      setPasteText("");
      setPasteTitle("");
      onCreated(doc.id);
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!busy) onOpenChange(o); }}>
      <DialogContent className="max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Add to your library</DialogTitle>
        </DialogHeader>

        {busy ? (
          <div className="py-8 space-y-4">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm">{progressMsg}</span>
            </div>
            {progress > 0 && <Progress value={progress} />}
            <p className="text-xs text-muted-foreground">Large PDFs and scanned images take longer. Hang tight.</p>
          </div>
        ) : (
          <Tabs defaultValue="file">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="file">Upload file</TabsTrigger>
              <TabsTrigger value="paste">Paste text</TabsTrigger>
            </TabsList>

            <TabsContent value="file" className="space-y-4 pt-4">
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed border-border hover:border-primary transition-colors rounded-lg p-8 flex flex-col items-center gap-3 group"
              >
                <Upload className="h-10 w-10 text-muted-foreground group-hover:text-primary transition-colors" />
                <div className="text-center">
                  <div className="font-medium">Click to choose a file</div>
                  <div className="text-xs text-muted-foreground mt-1">PDF · DOCX · TXT · Image (JPG/PNG)</div>
                </div>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.docx,.txt,.md,image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
              <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2"><FileText className="h-3.5 w-3.5" /> PDFs</div>
                <div className="flex items-center gap-2"><FileText className="h-3.5 w-3.5" /> Word docs</div>
                <div className="flex items-center gap-2"><ImageIcon className="h-3.5 w-3.5" /> Image OCR</div>
              </div>
            </TabsContent>

            <TabsContent value="paste" className="space-y-3 pt-4">
              <Input
                placeholder="Title (optional)"
                value={pasteTitle}
                onChange={(e) => setPasteTitle(e.target.value)}
              />
              <Textarea
                placeholder="Paste any text here — an article, a chapter, anything."
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                className="min-h-[200px] resize-none"
              />
              <Button onClick={handlePaste} disabled={!pasteText.trim()} className="w-full">
                Add to library
              </Button>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
