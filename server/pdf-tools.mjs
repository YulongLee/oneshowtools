import { copyFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { createCanvas } from "@napi-rs/canvas";
import engData from "@tesseract.js-data/eng";
import chiSimData from "@tesseract.js-data/chi_sim";
import ExcelJS from "exceljs";
import JSZip from "jszip";
import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import sharp from "sharp";
import { createWorker } from "tesseract.js";

const pdfError = (code, status = 422) => Object.assign(new Error(code), { code, status });
const MAX_PDF_BYTES = 25 * 1024 * 1024;
const MAX_STANDARD_PAGES = 80;
const MAX_RENDER_PAGES = 30;
const MAX_OCR_PAGES = 12;
const pdfToolSlugs = [
  "pdf-merge", "pdf-split", "pdf-compress", "pdf-organizer", "images-to-pdf",
  "pdf-to-images", "pdf-watermark", "pdf-page-numbers", "pdf-ocr",
  "pdf-to-markdown", "pdf-table-to-excel",
];

export const pdfToolSlugSet = new Set(pdfToolSlugs);

const clamp = (value, min, max, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
};
const safeName = (value, fallback = "document") => String(value || fallback)
  .replace(/\.[^.]+$/, "").replace(/[^A-Za-z0-9\u4e00-\u9fff_-]+/g, "-").slice(0, 80) || fallback;
const asFile = (value) => value && typeof value.arrayBuffer === "function" && Number(value.size) > 0;

async function readPdfFile(file) {
  if (!asFile(file)) throw pdfError("PDF_REQUIRED", 400);
  if (file.size > MAX_PDF_BYTES) throw pdfError("PDF_TOO_LARGE", 413);
  const buffer = Buffer.from(await file.arrayBuffer());
  let document;
  try { document = await PDFDocument.load(buffer, { ignoreEncryption: false }); }
  catch { throw pdfError("PDF_INVALID_OR_ENCRYPTED"); }
  if (document.getPageCount() > MAX_STANDARD_PAGES) throw pdfError("PDF_PAGE_LIMIT", 413);
  return { buffer, document };
}

async function openPdfJs(buffer) {
  try {
    return await pdfjs.getDocument({ data: new Uint8Array(buffer), useSystemFonts: true }).promise;
  } catch {
    throw pdfError("PDF_INVALID_OR_ENCRYPTED");
  }
}

async function closePdfJs(document) {
  try { await document.cleanup?.(); } catch {}
}

async function renderPage(document, pageNumber, scale = 1.6, format = "png", quality = 82) {
  const page = await document.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const context = canvas.getContext("2d");
  await page.render({ canvasContext: context, viewport }).promise;
  if (format === "jpeg") return canvas.toBuffer("image/jpeg", quality);
  return canvas.toBuffer("image/png");
}

function outputFile(buffer, name, mimeType, output = {}) {
  return { buffer, name, mimeType, extension: `.${name.split(".").pop()}`, output };
}

async function mergePdf(form) {
  const files = form.getAll("files").filter(asFile);
  if (files.length < 2) throw pdfError("PDF_MERGE_REQUIRES_MULTIPLE", 400);
  if (files.length > 20) throw pdfError("PDF_BATCH_LIMIT", 413);
  const target = await PDFDocument.create();
  let pages = 0;
  for (const file of files) {
    const { document } = await readPdfFile(file);
    pages += document.getPageCount();
    if (pages > MAX_STANDARD_PAGES) throw pdfError("PDF_PAGE_LIMIT", 413);
    const copied = await target.copyPages(document, document.getPageIndices());
    copied.forEach((page) => target.addPage(page));
  }
  const buffer = Buffer.from(await target.save({ useObjectStreams: true }));
  return outputFile(buffer, `merged-${files.length}-files.pdf`, "application/pdf", { mode: "local", files: files.length, pages });
}

function parsePageSelection(value, pageCount) {
  const raw = String(value || "all").trim().toLowerCase();
  if (!raw || raw === "all") return [...Array(pageCount).keys()];
  const selected = new Set();
  for (const part of raw.split(",")) {
    const token = part.trim();
    if (!token) continue;
    const range = token.match(/^(\d+)\s*-\s*(\d+)$/);
    if (range) {
      const start = Number(range[1]); const end = Number(range[2]);
      if (start < 1 || end < start || end > pageCount) throw pdfError("PDF_PAGE_RANGE_INVALID", 400);
      for (let page = start; page <= end; page += 1) selected.add(page - 1);
    } else {
      const page = Number(token);
      if (!Number.isInteger(page) || page < 1 || page > pageCount) throw pdfError("PDF_PAGE_RANGE_INVALID", 400);
      selected.add(page - 1);
    }
  }
  if (!selected.size) throw pdfError("PDF_PAGE_RANGE_INVALID", 400);
  return [...selected];
}

async function splitPdf(form) {
  const file = form.get("file");
  const { document } = await readPdfFile(file);
  const selected = parsePageSelection(form.get("pages"), document.getPageCount());
  const mode = String(form.get("splitMode") || "individual");
  if (mode === "extract") {
    const target = await PDFDocument.create();
    const copied = await target.copyPages(document, selected);
    copied.forEach((page) => target.addPage(page));
    const buffer = Buffer.from(await target.save({ useObjectStreams: true }));
    return outputFile(buffer, `${safeName(file.name)}-pages.pdf`, "application/pdf", { mode: "local", pages: selected.length });
  }
  const zip = new JSZip();
  for (const pageIndex of selected) {
    const target = await PDFDocument.create();
    const [page] = await target.copyPages(document, [pageIndex]);
    target.addPage(page);
    zip.file(`${safeName(file.name)}-page-${pageIndex + 1}.pdf`, await target.save({ useObjectStreams: true }));
  }
  const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } });
  return outputFile(buffer, `${safeName(file.name)}-split.zip`, "application/zip", { mode: "local", pages: selected.length });
}

async function compressPdf(form) {
  const file = form.get("file");
  const { buffer: input } = await readPdfFile(file);
  const source = await openPdfJs(input);
  if (source.numPages > MAX_RENDER_PAGES) throw pdfError("PDF_RENDER_PAGE_LIMIT", 413);
  const quality = clamp(form.get("quality"), 45, 90, 72);
  const scale = clamp(form.get("scale"), 0.8, 1.8, 1.25);
  const target = await PDFDocument.create();
  try {
    for (let pageNumber = 1; pageNumber <= source.numPages; pageNumber += 1) {
      const sourcePage = await source.getPage(pageNumber);
      const baseViewport = sourcePage.getViewport({ scale: 1 });
      const jpeg = await renderPage(source, pageNumber, scale, "jpeg", quality);
      const embedded = await target.embedJpg(jpeg);
      const page = target.addPage([baseViewport.width, baseViewport.height]);
      page.drawImage(embedded, { x: 0, y: 0, width: baseViewport.width, height: baseViewport.height });
    }
  } finally { await closePdfJs(source); }
  const buffer = Buffer.from(await target.save({ useObjectStreams: true }));
  return outputFile(buffer, `${safeName(file.name)}-compressed.pdf`, "application/pdf", {
    mode: "local", pages: target.getPageCount(), originalBytes: file.size, compressedBytes: buffer.length,
    savedPercent: Math.round((1 - buffer.length / file.size) * 100), quality,
    searchableTextPreserved: false,
  });
}

function parseOrder(value, pageCount) {
  const raw = String(value || "").trim();
  if (!raw) return [...Array(pageCount).keys()];
  const values = raw.split(",").map((item) => Number(item.trim()));
  if (!values.length || values.some((page) => !Number.isInteger(page) || page < 1 || page > pageCount)) throw pdfError("PDF_PAGE_ORDER_INVALID", 400);
  if (new Set(values).size !== values.length) throw pdfError("PDF_PAGE_ORDER_DUPLICATE", 400);
  return values.map((page) => page - 1);
}

async function organizePdf(form) {
  const file = form.get("file");
  const { document } = await readPdfFile(file);
  const order = parseOrder(form.get("order"), document.getPageCount());
  const rotate = clamp(form.get("rotate"), 0, 270, 0);
  if (![0, 90, 180, 270].includes(rotate)) throw pdfError("PDF_ROTATION_INVALID", 400);
  const target = await PDFDocument.create();
  const copied = await target.copyPages(document, order);
  copied.forEach((page) => { if (rotate) page.setRotation(degrees((page.getRotation().angle + rotate) % 360)); target.addPage(page); });
  const buffer = Buffer.from(await target.save({ useObjectStreams: true }));
  return outputFile(buffer, `${safeName(file.name)}-organized.pdf`, "application/pdf", { mode: "local", pages: order.length, rotation: rotate });
}

async function imagesToPdf(form) {
  const files = form.getAll("files").filter(asFile);
  if (!files.length) throw pdfError("IMAGE_REQUIRED", 400);
  if (files.length > 30) throw pdfError("IMAGE_BATCH_LIMIT", 413);
  const target = await PDFDocument.create();
  for (const file of files) {
    if (file.size > MAX_PDF_BYTES) throw pdfError("IMAGE_TOO_LARGE", 413);
    const normalized = await sharp(Buffer.from(await file.arrayBuffer())).rotate().flatten({ background: "#ffffff" }).jpeg({ quality: 90, mozjpeg: true }).toBuffer();
    const metadata = await sharp(normalized).metadata();
    const image = await target.embedJpg(normalized);
    const scale = Math.min(1, 1440 / Math.max(metadata.width, metadata.height));
    const width = Math.round(metadata.width * scale); const height = Math.round(metadata.height * scale);
    const page = target.addPage([width, height]);
    page.drawImage(image, { x: 0, y: 0, width, height });
  }
  const buffer = Buffer.from(await target.save({ useObjectStreams: true }));
  return outputFile(buffer, `images-${files.length}.pdf`, "application/pdf", { mode: "local", pages: files.length });
}

async function pdfToImages(form) {
  const file = form.get("file");
  const { buffer: input } = await readPdfFile(file);
  const format = String(form.get("format") || "png") === "jpg" ? "jpeg" : "png";
  const source = await openPdfJs(input);
  if (source.numPages > MAX_RENDER_PAGES) throw pdfError("PDF_RENDER_PAGE_LIMIT", 413);
  const pageCount = source.numPages;
  const zip = new JSZip();
  try {
    for (let page = 1; page <= source.numPages; page += 1) {
      zip.file(`${safeName(file.name)}-page-${page}.${format === "jpeg" ? "jpg" : "png"}`, await renderPage(source, page, 1.8, format, 86));
    }
  } finally { await closePdfJs(source); }
  const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 5 } });
  return outputFile(buffer, `${safeName(file.name)}-${format === "jpeg" ? "jpg" : "png"}.zip`, "application/zip", { mode: "local", pages: pageCount, format });
}

function hexColor(value, fallback = "#1769e8") {
  const match = String(value || "").match(/^#([0-9a-f]{6})$/i);
  if (!match) return fallback;
  return `#${match[1]}`;
}
function pdfColor(value) {
  const color = hexColor(value).slice(1);
  return rgb(Number.parseInt(color.slice(0, 2), 16) / 255, Number.parseInt(color.slice(2, 4), 16) / 255, Number.parseInt(color.slice(4, 6), 16) / 255);
}

async function watermarkPdf(form) {
  const file = form.get("file");
  const { document } = await readPdfFile(file);
  const text = String(form.get("watermark") || "OneShowTools").trim().slice(0, 80);
  if (!text) throw pdfError("WATERMARK_TEXT_REQUIRED", 400);
  const requestedOpacity = Number(form.get("opacity"));
  const opacity = clamp(requestedOpacity > 1 ? requestedOpacity / 100 : requestedOpacity, 0.08, 0.8, 0.22);
  const fontSize = clamp(form.get("fontSize"), 12, 96, 42);
  const canvas = createCanvas(Math.max(500, Math.ceil(fontSize * Math.max(6, text.length * 0.8))), Math.max(120, Math.ceil(fontSize * 2.5)));
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.globalAlpha = opacity;
  context.fillStyle = hexColor(form.get("color"));
  context.font = `600 ${fontSize}px sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, canvas.width / 2, canvas.height / 2);
  const watermark = await document.embedPng(canvas.toBuffer("image/png"));
  document.getPages().forEach((page) => {
    const { width, height } = page.getSize();
    const drawWidth = Math.min(width * 0.72, canvas.width * 0.72);
    const drawHeight = drawWidth * canvas.height / canvas.width;
    page.drawImage(watermark, { x: (width - drawWidth) / 2, y: (height - drawHeight) / 2, width: drawWidth, height: drawHeight, rotate: degrees(-28) });
  });
  const buffer = Buffer.from(await document.save({ useObjectStreams: true }));
  return outputFile(buffer, `${safeName(file.name)}-watermarked.pdf`, "application/pdf", { mode: "local", pages: document.getPageCount(), watermark: text });
}

async function pageNumbersPdf(form) {
  const file = form.get("file");
  const { document } = await readPdfFile(file);
  const font = await document.embedFont(StandardFonts.Helvetica);
  const start = Math.round(clamp(form.get("start"), 1, 9999, 1));
  const position = String(form.get("position") || "bottom-center");
  document.getPages().forEach((page, index) => {
    const { width, height } = page.getSize();
    const label = String(start + index); const size = 10; const labelWidth = font.widthOfTextAtSize(label, size);
    const x = position.endsWith("left") ? 28 : position.endsWith("right") ? width - labelWidth - 28 : (width - labelWidth) / 2;
    const y = position.startsWith("top") ? height - 28 : 20;
    page.drawText(label, { x, y, size, font, color: rgb(0.28, 0.34, 0.43) });
  });
  const buffer = Buffer.from(await document.save({ useObjectStreams: true }));
  return outputFile(buffer, `${safeName(file.name)}-numbered.pdf`, "application/pdf", { mode: "local", pages: document.getPageCount(), start, position });
}

async function prepareOcrLanguages() {
  const directory = join(process.env.DATA_DIR || "data", "ocr-languages");
  await mkdir(directory, { recursive: true });
  await Promise.all([
    copyFile(join(engData.langPath, "eng.traineddata.gz"), join(directory, "eng.traineddata.gz")).catch((error) => { if (error.code !== "EEXIST") throw error; }),
    copyFile(join(chiSimData.langPath, "chi_sim.traineddata.gz"), join(directory, "chi_sim.traineddata.gz")).catch((error) => { if (error.code !== "EEXIST") throw error; }),
  ]);
  return directory;
}

async function ocrPdf(form) {
  const file = form.get("file");
  const { buffer: input } = await readPdfFile(file);
  const source = await openPdfJs(input);
  if (source.numPages > MAX_OCR_PAGES) throw pdfError("PDF_OCR_PAGE_LIMIT", 413);
  const language = String(form.get("language") || "chi_sim+eng");
  if (!["chi_sim+eng", "eng", "chi_sim"].includes(language)) throw pdfError("OCR_LANGUAGE_INVALID", 400);
  const langPath = await prepareOcrLanguages();
  const cachePath = join(process.env.DATA_DIR || "data", "ocr-cache");
  await mkdir(cachePath, { recursive: true });
  const worker = await createWorker(language, 1, { langPath, cachePath, gzip: true, logger: () => {} });
  const texts = [];
  try {
    for (let page = 1; page <= source.numPages; page += 1) {
      const png = await renderPage(source, page, 2, "png");
      const result = await worker.recognize(png);
      texts.push(`--- Page ${page} ---\n${String(result.data.text || "").trim()}`);
    }
  } finally { await worker.terminate(); await closePdfJs(source); }
  const text = texts.join("\n\n").trim();
  if (!text.replace(/--- Page \d+ ---/g, "").trim()) throw pdfError("PDF_TEXT_NOT_FOUND");
  return outputFile(Buffer.from(text, "utf8"), `${safeName(file.name)}-ocr.txt`, "text/plain; charset=utf-8", { mode: "ocr", pages: texts.length, language, text: text.slice(0, 40000) });
}

async function extractTextRows(buffer) {
  const source = await openPdfJs(buffer);
  const pages = [];
  try {
    for (let pageNumber = 1; pageNumber <= source.numPages; pageNumber += 1) {
      const page = await source.getPage(pageNumber);
      const content = await page.getTextContent();
      const items = content.items.filter((item) => "str" in item && String(item.str).trim()).map((item) => ({
        text: String(item.str).trim(), x: Number(item.transform?.[4] || 0), y: Number(item.transform?.[5] || 0), height: Math.abs(Number(item.height || item.transform?.[3] || 10)),
      }));
      const rowMap = [];
      for (const item of items.sort((a, b) => b.y - a.y || a.x - b.x)) {
        let row = rowMap.find((candidate) => Math.abs(candidate.y - item.y) <= Math.max(3, item.height * 0.45));
        if (!row) { row = { y: item.y, items: [] }; rowMap.push(row); }
        row.items.push(item);
      }
      pages.push(rowMap.sort((a, b) => b.y - a.y).map((row) => row.items.sort((a, b) => a.x - b.x)));
    }
  } finally { await closePdfJs(source); }
  return pages;
}

function rowsToMarkdown(pages) {
  const lines = [];
  pages.forEach((rows, pageIndex) => {
    if (pages.length > 1) lines.push(`\n## Page ${pageIndex + 1}\n`);
    rows.forEach((items) => {
      const text = items.map((item) => item.text).join(" ").replace(/\s+/g, " ").trim();
      if (!text) return;
      const averageHeight = items.reduce((sum, item) => sum + item.height, 0) / items.length;
      if (averageHeight >= 20 && text.length < 100) lines.push(`# ${text}`);
      else if (averageHeight >= 15 && text.length < 140) lines.push(`## ${text}`);
      else lines.push(text);
    });
  });
  return lines.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
}

async function pdfToMarkdown(form) {
  const file = form.get("file");
  const { buffer } = await readPdfFile(file);
  const pages = await extractTextRows(buffer);
  const markdown = rowsToMarkdown(pages);
  if (!markdown) throw pdfError("PDF_TEXT_NOT_FOUND");
  return outputFile(Buffer.from(markdown, "utf8"), `${safeName(file.name)}.md`, "text/markdown; charset=utf-8", { mode: "text-extraction", pages: pages.length, characters: markdown.length, text: markdown.slice(0, 40000) });
}

function tableRowsFromPage(rows) {
  const candidates = rows.filter((items) => items.length >= 2);
  if (!candidates.length) return [];
  const xValues = [];
  for (const row of candidates) for (const item of row) {
    let cluster = xValues.find((entry) => Math.abs(entry.x - item.x) <= 18);
    if (!cluster) { cluster = { x: item.x, count: 0 }; xValues.push(cluster); }
    cluster.x = (cluster.x * cluster.count + item.x) / (cluster.count + 1); cluster.count += 1;
  }
  const columns = xValues.filter((item) => item.count >= Math.max(2, candidates.length * 0.25)).sort((a, b) => a.x - b.x).slice(0, 20);
  if (columns.length < 2) return candidates.map((items) => items.map((item) => item.text));
  return candidates.map((items) => {
    const row = Array(columns.length).fill("");
    items.forEach((item) => {
      let best = 0;
      for (let index = 1; index < columns.length; index += 1) if (Math.abs(columns[index].x - item.x) < Math.abs(columns[best].x - item.x)) best = index;
      row[best] = row[best] ? `${row[best]} ${item.text}` : item.text;
    });
    return row;
  });
}

async function pdfTableToExcel(form) {
  const file = form.get("file");
  const { buffer } = await readPdfFile(file);
  const pages = await extractTextRows(buffer);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "OneShowTools";
  workbook.created = new Date();
  let extractedRows = 0;
  pages.forEach((rows, index) => {
    const data = tableRowsFromPage(rows); extractedRows += data.length;
    if (data.length) {
      const worksheet = workbook.addWorksheet(`Page ${index + 1}`.slice(0, 31));
      worksheet.addRows(data);
      worksheet.columns.forEach((column) => { column.width = Math.min(60, Math.max(12, ...column.values.map((value) => String(value || "").length + 2))); });
      if (worksheet.rowCount) {
        worksheet.getRow(1).font = { bold: true, color: { argb: "FF183153" } };
        worksheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEAF2FF" } };
      }
      worksheet.views = [{ state: "frozen", ySplit: 1 }];
    }
  });
  if (!workbook.worksheets.length) throw pdfError("PDF_TABLE_NOT_FOUND");
  const output = Buffer.from(await workbook.xlsx.writeBuffer());
  return outputFile(output, `${safeName(file.name)}-tables.xlsx`, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", { mode: "table-extraction", pages: pages.length, rows: extractedRows, sheets: workbook.worksheets.length });
}

export async function processPdfTool(slug, form) {
  if (!pdfToolSlugSet.has(slug)) throw pdfError("PDF_TOOL_NOT_SUPPORTED", 404);
  if (slug === "pdf-merge") return mergePdf(form);
  if (slug === "pdf-split") return splitPdf(form);
  if (slug === "pdf-compress") return compressPdf(form);
  if (slug === "pdf-organizer") return organizePdf(form);
  if (slug === "images-to-pdf") return imagesToPdf(form);
  if (slug === "pdf-to-images") return pdfToImages(form);
  if (slug === "pdf-watermark") return watermarkPdf(form);
  if (slug === "pdf-page-numbers") return pageNumbersPdf(form);
  if (slug === "pdf-ocr") return ocrPdf(form);
  if (slug === "pdf-to-markdown") return pdfToMarkdown(form);
  return pdfTableToExcel(form);
}
