import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appSource = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
const styles = await readFile(new URL("../src/styles.css", import.meta.url), "utf8");

test("every authenticated tool receives the full workspace instead of the account context rail", () => {
  assert.match(appSource, /const isToolWorkspace = Boolean\(routeTool\)/);
  assert.match(appSource, /const usesFullWorkspace =[\s\S]*\|\| isToolWorkspace/);
  assert.match(appSource, /\{!usesFullWorkspace && <aside className="context-panel">/);
});

test("music studio responds to its actual container without horizontal overflow", () => {
  assert.match(styles, /\.music-studio-page \{[^}]*container: music-studio \/ inline-size/);
  assert.match(styles, /@container music-studio \(max-width: 1180px\)/);
  assert.match(styles, /\.music-composer,\.music-library \{ min-width: 0;/);
  assert.match(styles, /\.music-track \{ min-width: 0;[\s\S]*grid-template-columns: 52px minmax\(0,1fr\)/);
});
