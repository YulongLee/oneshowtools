import assert from "node:assert/strict";
import test from "node:test";
import ExcelJS from "exceljs";
import JSZip from "jszip";
import { processDataFileTool } from "../server/data-tools.mjs";

async function excelFile(name = "data.xlsx", rows = [["category", "amount", "email"], ["A", 10, "a@example.com"], ["A", 10, "a@example.com"], ["B", 20, "b@example.com"]], secondSheet = false) {
  const workbook = new ExcelJS.Workbook(); const sheet = workbook.addWorksheet("Data"); rows.forEach((row) => sheet.addRow(row));
  if (secondSheet) { const extra = workbook.addWorksheet("Extra"); extra.addRows([["name", "value"], ["OneShow", 1]]); }
  return new File([await workbook.xlsx.writeBuffer()], name, { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
const single = (file, fields = {}) => { const form = new FormData(); form.append("file", file); Object.entries(fields).forEach(([key, value]) => form.append(key, String(value))); return form; };

test("Excel merge and worksheet split preserve workbook structure", async () => {
  const merge = new FormData(); merge.append("files", await excelFile("one.xlsx")); merge.append("files", await excelFile("two.xlsx", undefined, true));
  const merged = await processDataFileTool("excel-merger", merge); const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(merged.buffer); assert.equal(workbook.worksheets.length, 3);
  const split = await processDataFileTool("excel-splitter", single(await excelFile("source.xlsx", undefined, true))); assert.equal(Object.keys((await JSZip.loadAsync(split.buffer)).files).length, 2);
});

test("CSV splitting retains headers and produces the requested row partitions", async () => {
  const rows = ["id,name", ...Array.from({ length: 230 }, (_, index) => `${index + 1},Tool ${index + 1}`)].join("\n");
  const result = await processDataFileTool("csv-file-splitter", single(new File([rows], "large.csv", { type: "text/csv" }), { rowsPerFile: 100 }));
  assert.equal(result.output.partCount, 3); assert.equal(Object.keys((await JSZip.loadAsync(result.buffer)).files).length, 3);
});

test("dedupe, Excel/CSV/JSON/XML conversions create valid downloads", async () => {
  const deduped = await processDataFileTool("excel-deduplicator", single(await excelFile(), { keyColumn: "email" })); assert.equal(deduped.output.removedRows, 1);
  const csv = await processDataFileTool("excel-to-csv", single(await excelFile("source.xlsx", undefined, true))); assert.equal(Object.keys((await JSZip.loadAsync(csv.buffer)).files).length, 2);
  const fromJson = await processDataFileTool("json-to-excel", single(new File([JSON.stringify([{ name: "OneShow", score: 98 }])], "data.json", { type: "application/json" }))); assert.ok(fromJson.buffer.length > 1000);
  const fromXml = await processDataFileTool("xml-to-excel", single(new File(["<items><item><name>OneShow</name><score>98</score></item></items>"], "data.xml", { type: "application/xml" }))); assert.equal(fromXml.output.recordCount, 1);
  const json = await processDataFileTool("excel-to-json", single(await excelFile())); assert.equal(JSON.parse(json.buffer.toString()).length, 3);
});

test("field mapping, pivot summary, and contact extraction return structured workbooks", async () => {
  const mapped = await processDataFileTool("table-field-mapper", single(await excelFile(), { mapping: "category:分类\namount:金额" })); assert.equal(mapped.output.mappedFields, 2);
  const pivot = await processDataFileTool("table-pivot-summary", single(await excelFile(), { groupColumn: "category", valueColumn: "amount", aggregation: "sum" })); assert.equal(pivot.output.groupCount, 2);
  const contacts = await processDataFileTool("contact-data-extractor", single(new File(["Email hello@oneshowtools.com phone 13800138000 visit https://oneshowtools.com"], "contacts.txt", { type: "text/plain" }))); assert.deepEqual([contacts.output.emails, contacts.output.phones, contacts.output.urls], [1, 1, 1]);
});
