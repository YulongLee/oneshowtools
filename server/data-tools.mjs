import ExcelJS from "exceljs";
import JSZip from "jszip";
import { load as loadHtml } from "cheerio";

const dataError = (code, status = 422) => Object.assign(new Error(code), { code, status });
const MAX_DATA_BYTES = 25 * 1024 * 1024;
const MAX_FILES = 20;

export const dataFileToolSlugs = new Set([
  "excel-merger", "excel-splitter", "csv-file-splitter", "excel-deduplicator", "excel-to-csv",
  "json-to-excel", "xml-to-excel", "excel-to-json", "table-field-mapper", "table-pivot-summary",
  "contact-data-extractor",
]);

const safeName = (value, fallback = "data") => String(value || fallback)
  .replace(/\.[^.]+$/, "").replace(/[^A-Za-z0-9\u4e00-\u9fff_-]+/g, "-").slice(0, 70) || fallback;

function validate(files, multiple = false) {
  const present = files.filter((file) => file?.size);
  if (!present.length) throw dataError("DATA_FILE_REQUIRED", 400);
  if (!multiple && present.length !== 1) throw dataError("DATA_SINGLE_FILE_REQUIRED", 400);
  if (present.length > MAX_FILES) throw dataError("DATA_FILE_LIMIT", 413);
  if (present.some((file) => file.size > MAX_DATA_BYTES)) throw dataError("DATA_FILE_TOO_LARGE", 413);
  return present;
}

function parseCsv(text, delimiter = ",") {
  const rows = []; let row = []; let cell = ""; let quoted = false;
  const source = String(text || "").replace(/^\uFEFF/, "");
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === '"') {
      if (quoted && source[index + 1] === '"') { cell += '"'; index += 1; } else quoted = !quoted;
    } else if (character === delimiter && !quoted) { row.push(cell); cell = ""; }
    else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && source[index + 1] === "\n") index += 1;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += character;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((item) => item.some((value) => String(value).length));
}

const csvCell = (value) => {
  const text = value == null ? "" : value instanceof Date ? value.toISOString() : typeof value === "object" ? JSON.stringify(value) : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};
const toCsv = (rows) => `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;

function displayValue(value) {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    if ("result" in value) return displayValue(value.result);
    if ("text" in value && Array.isArray(value.richText)) return value.richText.map((item) => item.text).join("");
    if ("hyperlink" in value) return value.text || value.hyperlink;
    return JSON.stringify(value);
  }
  return value;
}

async function workbookFrom(file) {
  const workbook = new ExcelJS.Workbook();
  try { await workbook.xlsx.load(Buffer.from(await file.arrayBuffer())); }
  catch { throw dataError("EXCEL_FILE_INVALID"); }
  if (!workbook.worksheets.length) throw dataError("EXCEL_FILE_EMPTY");
  return workbook;
}

function sheetRows(worksheet) {
  const rows = [];
  worksheet.eachRow({ includeEmpty: false }, (row) => {
    const values = [];
    for (let index = 1; index <= Math.max(worksheet.columnCount, row.cellCount); index += 1) values.push(displayValue(row.getCell(index).value));
    rows.push(values);
  });
  return rows;
}

function addRows(workbook, name, rows) {
  const worksheet = workbook.addWorksheet(String(name || "Data").slice(0, 31).replace(/[\\/*?:[\]]/g, "-") || "Data");
  rows.forEach((row) => worksheet.addRow(row));
  if (rows.length) {
    worksheet.views = [{ state: "frozen", ySplit: 1 }];
    worksheet.getRow(1).font = { bold: true };
    worksheet.columns.forEach((column, index) => {
      column.width = Math.min(42, Math.max(10, ...rows.slice(0, 200).map((row) => String(row[index] ?? "").length + 2)));
    });
  }
  return worksheet;
}

async function xlsxResult(workbook, name, output) {
  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  return { buffer, extension: ".xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", name, output: { mode: "server-excel", ...output } };
}

async function fileText(file) {
  return Buffer.from(await file.arrayBuffer()).toString("utf8");
}

async function rowsFromTabular(file) {
  if (/\.csv$/i.test(file.name) || file.type === "text/csv" || file.type === "text/plain") return parseCsv(await fileText(file));
  const workbook = await workbookFrom(file);
  return sheetRows(workbook.worksheets[0]);
}

function recordsToRows(records) {
  if (!Array.isArray(records)) records = [records];
  const normalized = records.filter((item) => item && typeof item === "object" && !Array.isArray(item));
  if (!normalized.length) throw dataError("STRUCTURED_DATA_REQUIRED");
  const headers = [...new Set(normalized.flatMap((item) => Object.keys(item)))];
  return [headers, ...normalized.map((item) => headers.map((header) => displayValue(item[header])))];
}

export async function processDataFileTool(slug, form) {
  const multiple = slug === "excel-merger";
  const files = validate(multiple ? form.getAll("files") : [form.get("file")], multiple);
  if (slug === "excel-merger") {
    const output = new ExcelJS.Workbook(); let sheetCount = 0;
    for (const file of files) {
      const workbook = await workbookFrom(file);
      for (const sheet of workbook.worksheets) {
        let name = `${safeName(file.name).slice(0, 16)}-${sheet.name}`.slice(0, 31); let suffix = 2;
        while (output.getWorksheet(name)) name = `${name.slice(0, 27)}-${suffix++}`;
        addRows(output, name, sheetRows(sheet)); sheetCount += 1;
      }
    }
    return xlsxResult(output, "merged-workbooks.xlsx", { fileCount: files.length, sheetCount });
  }
  const file = files[0]; const base = safeName(file.name);
  if (slug === "excel-splitter") {
    const source = await workbookFrom(file); const zip = new JSZip();
    for (const sheet of source.worksheets) {
      const workbook = new ExcelJS.Workbook(); addRows(workbook, sheet.name, sheetRows(sheet));
      zip.file(`${safeName(sheet.name, "sheet")}.xlsx`, await workbook.xlsx.writeBuffer());
    }
    return { buffer: await zip.generateAsync({ type: "nodebuffer" }), extension: ".zip", mimeType: "application/zip", name: `${base}-worksheets.zip`, output: { mode: "server-excel", sheetCount: source.worksheets.length } };
  }
  if (slug === "csv-file-splitter") {
    const rows = parseCsv(await fileText(file)); if (rows.length < 2) throw dataError("CSV_FILE_EMPTY");
    const rowsPerFile = Math.min(100000, Math.max(100, Number(form.get("rowsPerFile")) || 5000));
    const [header, ...body] = rows; const zip = new JSZip(); let part = 0;
    for (let index = 0; index < body.length; index += rowsPerFile) zip.file(`${base}-part-${++part}.csv`, toCsv([header, ...body.slice(index, index + rowsPerFile)]));
    return { buffer: await zip.generateAsync({ type: "nodebuffer" }), extension: ".zip", mimeType: "application/zip", name: `${base}-split.zip`, output: { mode: "server-data", rowCount: body.length, rowsPerFile, partCount: part } };
  }
  if (slug === "excel-deduplicator") {
    const source = await workbookFrom(file); const rows = sheetRows(source.worksheets[0]); if (rows.length < 2) throw dataError("EXCEL_FILE_EMPTY");
    const key = String(form.get("keyColumn") || "").trim(); const keyIndex = key ? (rows[0].findIndex((value) => String(value).trim() === key) >= 0 ? rows[0].findIndex((value) => String(value).trim() === key) : Math.max(0, Number(key) - 1)) : -1;
    const seen = new Set(); const unique = [rows[0], ...rows.slice(1).filter((row) => { const signature = keyIndex >= 0 ? String(row[keyIndex] ?? "").trim() : JSON.stringify(row); if (seen.has(signature)) return false; seen.add(signature); return true; })];
    const output = new ExcelJS.Workbook(); addRows(output, source.worksheets[0].name, unique);
    return xlsxResult(output, `${base}-deduplicated.xlsx`, { originalRows: rows.length - 1, outputRows: unique.length - 1, removedRows: rows.length - unique.length, keyColumn: key || "all" });
  }
  if (slug === "excel-to-csv") {
    const source = await workbookFrom(file); const zip = new JSZip();
    source.worksheets.forEach((sheet) => zip.file(`${safeName(sheet.name, "sheet")}.csv`, toCsv(sheetRows(sheet))));
    return { buffer: await zip.generateAsync({ type: "nodebuffer" }), extension: ".zip", mimeType: "application/zip", name: `${base}-csv.zip`, output: { mode: "server-data", sheetCount: source.worksheets.length } };
  }
  if (slug === "json-to-excel") {
    let parsed; try { parsed = JSON.parse(await fileText(file)); } catch { throw dataError("JSON_FILE_INVALID"); }
    const workbook = new ExcelJS.Workbook(); addRows(workbook, "Data", recordsToRows(parsed));
    return xlsxResult(workbook, `${base}.xlsx`, { recordCount: Array.isArray(parsed) ? parsed.length : 1 });
  }
  if (slug === "xml-to-excel") {
    const $ = loadHtml(await fileText(file), { xmlMode: true }); const root = $.root().children().first(); const candidates = root.children();
    const records = candidates.toArray().map((node) => { const record = {}; $(node).children().each((_, child) => { record[child.tagName] = $(child).text().trim(); }); return Object.keys(record).length ? record : { value: $(node).text().trim() }; });
    const workbook = new ExcelJS.Workbook(); addRows(workbook, "Data", recordsToRows(records));
    return xlsxResult(workbook, `${base}.xlsx`, { recordCount: records.length });
  }
  if (slug === "excel-to-json") {
    const source = await workbookFrom(file); const sheets = {};
    source.worksheets.forEach((sheet) => { const rows = sheetRows(sheet); const headers = rows[0] || []; sheets[sheet.name] = rows.slice(1).map((row) => Object.fromEntries(headers.map((header, index) => [String(header || `column_${index + 1}`), row[index] ?? ""]))); });
    const buffer = Buffer.from(JSON.stringify(source.worksheets.length === 1 ? sheets[source.worksheets[0].name] : sheets, null, 2));
    return { buffer, extension: ".json", mimeType: "application/json", name: `${base}.json`, output: { mode: "server-data", sheetCount: source.worksheets.length, recordCount: Object.values(sheets).reduce((sum, rows) => sum + rows.length, 0) } };
  }
  if (slug === "table-field-mapper") {
    const rows = await rowsFromTabular(file); if (!rows.length) throw dataError("TABLE_FILE_EMPTY");
    const mappings = Object.fromEntries(String(form.get("mapping") || "").split(/\r?\n/).map((line) => line.split(/[:：]/).map((item) => item.trim())).filter(([from, to]) => from && to));
    if (!Object.keys(mappings).length) throw dataError("FIELD_MAPPING_REQUIRED", 400);
    rows[0] = rows[0].map((header) => mappings[String(header)] || header);
    const workbook = new ExcelJS.Workbook(); addRows(workbook, "Mapped", rows);
    return xlsxResult(workbook, `${base}-mapped.xlsx`, { mappedFields: Object.keys(mappings).length, rowCount: Math.max(0, rows.length - 1) });
  }
  if (slug === "table-pivot-summary") {
    const rows = await rowsFromTabular(file); if (rows.length < 2) throw dataError("TABLE_FILE_EMPTY");
    const headers = rows[0].map(String); const groupColumn = String(form.get("groupColumn") || "").trim(); const valueColumn = String(form.get("valueColumn") || "").trim(); const aggregation = new Set(["sum", "count", "average"]).has(String(form.get("aggregation"))) ? String(form.get("aggregation")) : "sum";
    const groupIndex = headers.indexOf(groupColumn); const valueIndex = headers.indexOf(valueColumn); if (groupIndex < 0 || (aggregation !== "count" && valueIndex < 0)) throw dataError("PIVOT_COLUMNS_INVALID", 400);
    const groups = new Map(); rows.slice(1).forEach((row) => { const key = String(row[groupIndex] ?? "(blank)"); const current = groups.get(key) || { count: 0, sum: 0 }; current.count += 1; current.sum += Number(row[valueIndex]) || 0; groups.set(key, current); });
    const summary = [[groupColumn, aggregation], ...[...groups].map(([key, value]) => [key, aggregation === "count" ? value.count : aggregation === "average" ? value.sum / value.count : value.sum])];
    const workbook = new ExcelJS.Workbook(); addRows(workbook, "Pivot Summary", summary);
    return xlsxResult(workbook, `${base}-pivot.xlsx`, { groupCount: groups.size, aggregation });
  }
  if (slug === "contact-data-extractor") {
    const text = /\.(xlsx)$/i.test(file.name) ? (await rowsFromTabular(file)).flat().join("\n") : await fileText(file);
    const emails = [...new Set(text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [])];
    const urls = [...new Set(text.match(/https?:\/\/[^\s<>'"，。]+/gi) || [])];
    const phones = [...new Set((text.match(/(?:\+?86[- ]?)?1[3-9]\d{9}|\+?[1-9]\d{6,14}/g) || []).map((item) => item.trim()))];
    const workbook = new ExcelJS.Workbook(); addRows(workbook, "Emails", [["email"], ...emails.map((value) => [value])]); addRows(workbook, "Phones", [["phone"], ...phones.map((value) => [value])]); addRows(workbook, "URLs", [["url"], ...urls.map((value) => [value])]);
    return xlsxResult(workbook, `${base}-contacts.xlsx`, { emails: emails.length, phones: phones.length, urls: urls.length });
  }
  throw dataError("TOOL_ACTION_NOT_SUPPORTED", 404);
}
