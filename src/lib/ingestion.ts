// Document ingestion for the library upload flow.
// Returns extracted text plus optional per-page array (for PDFs) and page count.

import { cleanPagesArray, cleanSinglePage } from "./text-cleaner";

export interface IngestResult {
  text: string;
  pages?: string[]; // raw per-page text (PDFs only)
  totalPages?: number;
  source: "pdf" | "epub";
  title: string;
}

export async function ingestPdf(
  file: File,
  onProgress?: (pct: number, msg: string) => void
): Promise<IngestResult> {
  const pdfjs = await import("pdfjs-dist");
  // @ts-ignore
  const workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

  const buf = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buf }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    onProgress?.(i / pdf.numPages, `Reading page ${i} of ${pdf.numPages}…`);
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const items = content.items as Array<{ str: string; transform: number[] }>;

    // Group items by Y coordinate to reconstruct lines
    const lineMap = new Map<number, string[]>();
    for (const it of items) {
      const y = Math.round(it.transform[5]);
      if (!lineMap.has(y)) lineMap.set(y, []);
      lineMap.get(y)!.push(it.str);
    }
    const sortedYs = [...lineMap.keys()].sort((a, b) => b - a);
    const text = sortedYs.map(y => lineMap.get(y)!.join(" ").replace(/\s+/g, " ").trim()).filter(Boolean).join("\n");
    pages.push(text);
  }

  // If all pages are empty (scanned PDF), fall back to OCR
  const allEmpty = pages.every(p => p.replace(/\s/g, "").length < 5);
  if (allEmpty) {
    onProgress?.(0, "No text found — running OCR on each page…");
    return await ocrPdf(pdf, file.name, onProgress);
  }

  const cleaned = cleanPagesArray(pages);
  return {
    text: cleaned,
    pages,
    totalPages: pdf.numPages,
    source: "pdf",
    title: stripExt(file.name),
  };
}

async function ocrPdf(pdf: any, fileName: string, onProgress?: (pct: number, msg: string) => void): Promise<IngestResult> {
  const Tesseract = (await import("tesseract.js")).default;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    onProgress?.(i / pdf.numPages, `OCR page ${i} of ${pdf.numPages}…`);
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    const { data } = await Tesseract.recognize(canvas, "eng");
    pages.push(data.text);
  }
  return {
    text: cleanPagesArray(pages),
    pages,
    totalPages: pdf.numPages,
    source: "pdf",
    title: stripExt(fileName),
  };
}

export async function ingestEpub(file: File): Promise<IngestResult> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const containerXml = await zip.file("META-INF/container.xml")?.async("text");
  const rootfile = containerXml?.match(/full-path=["']([^"']+)["']/i)?.[1];
  const opfText = rootfile ? await zip.file(rootfile)?.async("text") : undefined;
  const basePath = rootfile?.includes("/") ? rootfile.slice(0, rootfile.lastIndexOf("/") + 1) : "";

  const title =
    decodeHtml(opfText?.match(/<dc:title[^>]*>([\s\S]*?)<\/dc:title>/i)?.[1]?.trim() || "") ||
    stripExt(file.name);

  const manifest = new Map<string, string>();
  opfText?.replace(/<item\b[^>]*>/gi, item => {
    const id = item.match(/\bid=["']([^"']+)["']/i)?.[1];
    const href = item.match(/\bhref=["']([^"']+)["']/i)?.[1];
    const media = item.match(/\bmedia-type=["']([^"']+)["']/i)?.[1] ?? "";
    if (id && href && /xhtml|html/i.test(media)) manifest.set(id, basePath + href);
    return item;
  });

  const spine: string[] = [];
  opfText?.replace(/<itemref\b[^>]*>/gi, item => {
    const idref = item.match(/\bidref=["']([^"']+)["']/i)?.[1];
    const href = idref ? manifest.get(idref) : undefined;
    if (href) spine.push(href);
    return item;
  });

  const fallbackFiles = Object.keys(zip.files)
    .filter(name => /\.(xhtml|html)$/i.test(name) && !zip.files[name].dir)
    .sort();
  const files = spine.length ? spine : fallbackFiles;
  const sections: string[] = [];

  for (const name of files) {
    const entry = zip.file(decodeURIComponent(name)) ?? zip.file(name);
    if (!entry) continue;
    const html = await entry.async("text");
    const text = htmlToReadableText(html);
    if (text) sections.push(text);
  }

  return { text: cleanSinglePage(sections.join("\n\n")), source: "epub", title };
}

function stripExt(name: string): string {
  return name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || "Untitled";
}

export async function ingestFile(
  file: File,
  onProgress?: (pct: number, msg: string) => void
): Promise<IngestResult> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return ingestPdf(file, onProgress);
  if (name.endsWith(".epub")) return ingestEpub(file);
  throw new Error("Only PDF and EPUB files are supported.");
}

function htmlToReadableText(html: string) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script,style,nav,header,footer,svg,noscript").forEach(el => el.remove());
  doc.querySelectorAll("h1,h2,h3,h4,h5,h6,p,blockquote,li,figcaption").forEach(el => {
    el.insertAdjacentText("beforebegin", "\n\n");
    el.insertAdjacentText("afterend", "\n");
  });
  return decodeHtml(doc.body?.textContent ?? html)
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function decodeHtml(value: string) {
  const el = document.createElement("textarea");
  el.innerHTML = value;
  return el.value;
}
