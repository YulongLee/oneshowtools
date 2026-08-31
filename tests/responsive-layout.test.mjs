import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appSource = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
const styles = await readFile(new URL("../src/styles.css", import.meta.url), "utf8");
const workbenchStyles = await readFile(new URL("../src/workbench.css", import.meta.url), "utf8");

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

test("shared tools use the commercial hero, journey, and responsive workspace shell", () => {
  assert.match(appSource, /commercial-tool-page/);
  assert.match(appSource, /commercial-tool-hero/);
  assert.match(appSource, /commercial-tool-journey/);
  assert.match(appSource, /commercial-tool-workspace/);
  assert.match(styles, /\.commercial-tool-page \{[^}]*max-width: none/);
  assert.match(styles, /\.commercial-tool-journey \{[^}]*grid-template-columns: repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(styles, /@media \(max-width: 680px\)[\s\S]*\.commercial-tool-journey \{ grid-template-columns: 1fr;/);
});

test("commercial homepage prevents overflow and stacks its capability cards on narrow screens", () => {
  assert.match(styles, /html, body, #root \{[^}]*min-width: 0;[^}]*overflow-x: clip/);
  assert.match(styles, /\.commercial-header \.brand-lockup \{[^}]*padding: 0/);
  assert.match(styles, /\.landing-capability-mosaic \{[^}]*grid-template-columns:/);
  assert.match(styles, /@media \(max-width: 620px\)[\s\S]*\.landing-capability-mosaic \{ grid-template-columns: 1fr;/);
  assert.match(styles, /@media \(max-width: 620px\)[\s\S]*\.landing-hero h1 \{[^}]*overflow-wrap: anywhere/);
});

test("marketplace marquee stays inside the available workspace width", () => {
  assert.match(workbenchStyles, /\.marketplace-page-redesign \.marketplace-primary \{[^}]*grid-template-columns: minmax\(0,1fr\)/);
  assert.match(workbenchStyles, /\.marketplace-page-redesign \.marketplace-featured \{[^}]*max-width: 100%;[^}]*overflow: hidden/);
  assert.match(workbenchStyles, /\.marketplace-page-redesign \.featured-carousel \{[^}]*max-width: 100%;[^}]*overflow: hidden/);
  assert.match(workbenchStyles, /@keyframes featured-marquee/);
});

test("guest homepage exposes real catalog states and a stable reference-led hero", () => {
  assert.match(appSource, /catalogStatus === "loading"/);
  assert.match(appSource, /catalogStatus === "error"/);
  assert.match(appSource, /retryCatalog/);
  assert.match(appSource, /landing-v2\/ai-agent-robot\.webp/);
  assert.match(appSource, /landing-v2\/cta-ai-platform\.webp/);
  assert.match(appSource, /className="landing-product-stories"/);
  assert.match(appSource, /landing\/creative-suite-triptych\.webp/);
  assert.match(appSource, /copy\.stories\.map/);
  assert.match(appSource, /heroToolCatalog/);
  assert.match(appSource, /oneshowtools-mark-512\.png/);
  assert.match(appSource, /data-orbit-card/);
  assert.match(appSource, /requestAnimationFrame\(placeCards\)/);
  assert.match(appSource, /\* \.000022/);
  assert.match(appSource, /key={`orbit-slot-\$\{index\}`}/);
  assert.match(appSource, /disabled=\{!tool\}/);
  assert.doesNotMatch(appSource, /key=\{heroToolPage\}/);
  assert.doesNotMatch(styles, /orbit-card-enter/);
  assert.doesNotMatch(styles, /@keyframes orbit-track-forward/);
  assert.doesNotMatch(appSource, /className="orbit-note"/);
  assert.match(appSource, /\["100\+", "AI 工具"\]/);
  assert.match(appSource, /\["98%\+", "用户满意度"\]/);
  assert.doesNotMatch(appSource, /setHeroToolPage/);
});
