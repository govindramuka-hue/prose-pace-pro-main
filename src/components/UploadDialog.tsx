import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ingestFile } from "@/lib/ingestion";
import { buildAndSaveDoc } from "@/lib/document-builder";
import { FileText, Loader2, Upload } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (docId: string) => void;
}

export function UploadDialog({ open, onOpenChange, onCreated }: Props) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState("");
  const [fileTitle, setFileTitle] = useState("");
  const [folder, setFolder] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setBusy(true);
    setProgress(0);
    setProgressMsg("Preparing...");
    try {
      const ing = await ingestFile(file, (pct, msg) => {
        setProgress(Math.round(pct * 100));
        setProgressMsg(msg);
      });
      setProgressMsg("Structuring the text...");
      const doc = await buildAndSaveDoc(ing, { title: fileTitle, folder });
      setFileTitle("");
      onCreated(doc.id);
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      setProgressMsg("Only PDF and EPUB files can be added.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!busy) onOpenChange(o); }}>
      <DialogContent className="max-w-xl bg-card border-border">
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
            <p className="text-xs text-muted-foreground">Large PDFs and EPUBs can take a little longer.</p>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input placeholder="Display title (optional)" value={fileTitle} onChange={(e) => setFileTitle(e.target.value)} />
              <Input placeholder="Folder (optional)" value={folder} onChange={(e) => setFolder(e.target.value)} />
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full border-2 border-dashed border-border hover:border-primary transition-colors rounded-lg p-8 flex flex-col items-center gap-3 group"
            >
              <Upload className="h-10 w-10 text-muted-foreground group-hover:text-primary transition-colors" />
              <div className="text-center">
                <div className="font-medium">Click to choose a file</div>
                <div className="text-xs text-muted-foreground mt-1">PDF or EPUB only</div>
              </div>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.epub,application/pdf,application/epub+zip"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.currentTarget.value = "";
              }}
            />
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2"><FileText className="h-3.5 w-3.5" /> PDFs</div>
              <div className="flex items-center gap-2"><FileText className="h-3.5 w-3.5" /> EPUBs</div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
