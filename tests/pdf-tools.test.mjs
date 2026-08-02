import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import ExcelJS from "exceljs";
import JSZip from "jszip";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import sharp from "sharp";

const testDataDirectory = await mkdtemp(join(tmpdir(), "oneshowtools-pdf-"));
process.env.DATA_DIR = testDataDirectory;
const { processPdfTool } = await import(`../server/pdf-tools.mjs?test=${Date.now()}`);

async function samplePdf(pageCount = 3) {
  const document = await PDFDocument.create();
  const font = await document.embedFont(StandardFonts.Helvetica);
  for (let index = 0; index < pageCount; index += 1) {
    const page = document.addPage([612, 792]);
    page.drawText(`OneShowTools PDF page ${index + 1}`, { x: 50, y: 730, size: 24, font, color: rgb(0.08, 0.24, 0.52) });
    page.drawText("Product", { x: 50, y: 670, size: 12, font });
    page.drawText("Users", { x: 230, y: 670, size: 12, font });
    page.drawText("Revenue", { x: 380, y: 670, size: 12, font });
    page.drawText(`Tool ${index + 1}`, { x: 50, y: 645, size: 12, font });
    page.drawText(String(100 + index), { x: 230, y: 645, size: 12, font });
    page.drawText(`$${900 + index * 100}`, { x: 380, y: 645, size: 12, font });
    page.drawText("This page validates extraction, conversion, organization, and downloadable results.", { x: 50, y: 590, size: 11, font });
  }
  return Buffer.from(await document.save());
}

const pdfFile = (buffer, name = "sample.pdf") => new File([buffer], name, { type: "application/pdf" });
const formWithPdf = (buffer, values = {}) => {
  const form = new FormData(); form.append("file", pdfFile(buffer));
  Object.entries(values).forEach(([key, value]) => form.append(key, String(value)));
  return form;
};

test("merge, split, and organize produce valid page-level PDF artifacts", async () => {
  const twoPages = await samplePdf(2); const onePage = await samplePdf(1);
  const mergeForm = new FormData();
  mergeForm.append("files", pdfFile(twoPages, "first.pdf")); mergeForm.append("files", pdfFile(onePage, "second.pdf"));
  const merged = await processPdfTool("pdf-merge", mergeForm);
  assert.equal((await PDFDocument.load(merged.buffer)).getPageCount(), 3);

  const split = await processPdfTool("pdf-split", formWithPdf(merged.buffer, { pages: "1,3", splitMode: "individual" }));
  assert.equal(Object.keys((await JSZip.loadAsync(split.buffer)).files).length, 2);

  const organized = await processPdfTool("pdf-organizer", formWithPdf(merged.buffer, { order: "3,1", rotate: "90" }));
  const organizedDocument = await PDFDocument.load(organized.buffer);
  assert.equal(organizedDocument.getPageCount(), 2);
  assert.equal(organizedDocument.getPage(0).getRotation().angle, 90);
});

test("compression, watermark, and page numbering rebuild readable PDFs", async () => {
  const source = await samplePdf(2);
  const compressed = await processPdfTool("pdf-compress", formWithPdf(source, { quality: 68, scale: 1 }));
  assert.equal((await PDFDocument.load(compressed.buffer)).getPageCount(), 2);
  assert.equal(compressed.output.searchableTextPreserved, false);

  const watermark = await processPdfTool("pdf-watermark", formWithPdf(source, { watermark: "内部资料 OneShowTools", opacity: 22, color: "#1769e8" }));
  assert.equal((await PDFDocument.load(watermark.buffer)).getPageCount(), 2);

  const numbered = await processPdfTool("pdf-page-numbers", formWithPdf(source, { start: 5, position: "bottom-right" }));
  assert.equal((await PDFDocument.load(numbered.buffer)).getPageCount(), 2);
});

test("images convert to PDF and PDF pages convert to real PNG and JPG packages", async () => {
  const png = await sharp({ create: { width: 640, height: 420, channels: 4, background: "#eef4ff" } })
    .composite([{ input: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420"><rect x="80" y="70" width="480" height="280" rx="28" fill="#1769e8"/><text x="320" y="225" text-anchor="middle" fill="white" font-size="42">OneShowTools</text></svg>') }]).png().toBuffer();
  const imageForm = new FormData();
  imageForm.append("files", new File([png], "one.png", { type: "image/png" }));
  imageForm.append("files", new File([png], "two.png", { type: "image/png" }));
  const pdf = await processPdfTool("images-to-pdf", imageForm);
  assert.equal((await PDFDocument.load(pdf.buffer)).getPageCount(), 2);

  for (const format of ["png", "jpg"]) {
    const images = await processPdfTool("pdf-to-images", formWithPdf(pdf.buffer, { format }));
    const zip = await JSZip.loadAsync(images.buffer);
    assert.equal(Object.keys(zip.files).length, 2);
    const first = zip.file(Object.keys(zip.files)[0]);
    const metadata = await sharp(await first.async("nodebuffer")).metadata();
    assert.equal(metadata.format, format === "jpg" ? "jpeg" : "png");
  }
});

test("Markdown and Excel extraction preserve real PDF text structure", async () => {
  const source = await samplePdf(2);
  const markdown = await processPdfTool("pdf-to-markdown", formWithPdf(source));
  assert.match(markdown.buffer.toString("utf8"), /OneShowTools PDF page 1/);
  assert.match(markdown.output.text, /Product/);

  const excel = await processPdfTool("pdf-table-to-excel", formWithPdf(source));
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(excel.buffer);
  assert.equal(workbook.worksheets.length, 2);
  assert.ok(excel.output.rows >= 2);
});

test("OCR recognizes an image-only PDF and exports editable text", async () => {
  const raster = await sharp({ create: { width: 1200, height: 500, channels: 4, background: "white" } })
    .composite([{ input: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="500"><text x="80" y="220" fill="#111827" font-family="Arial" font-size="84">ONESH​OWTOOLS PDF OCR TEST</text><text x="80" y="340" fill="#111827" font-family="Arial" font-size="58">Searchable business document</text></svg>'.replace("\u200b", "")) }]).png().toBuffer();
  const document = await PDFDocument.create(); const image = await document.embedPng(raster);
  const page = document.addPage([600, 250]); page.drawImage(image, { x: 0, y: 0, width: 600, height: 250 });
  const source = Buffer.from(await document.save());
  const result = await processPdfTool("pdf-ocr", formWithPdf(source, { language: "eng" }));
  assert.equal(result.buffer.toString("utf8").toUpperCase().includes("ONESH​OWTOOLS".replace("\u200b", "")), true);
  assert.equal(result.output.pages, 1);
});

test.after(async () => {
  await rm(testDataDirectory, { recursive: true, force: true });
});
