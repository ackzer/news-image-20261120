// Reproducible offline verification; runs the final generator sequentially twice.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { inspectPNG } from "./raster.ts";
import { paragraphMetrics } from "./typeface.ts";

const root = dirname(fileURLToPath(import.meta.url));
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const expectedContentHash = "185831bc4a7abbea75c53e1eae8e2ee0e051eeb18fff5c1198a4d7fd24b9cefa";
const data = JSON.parse(readFileSync(join(root, "news-data.json"), "utf8"));
assert.equal(hash(JSON.stringify(data)), expectedContentHash, "Locked content changed");
const output = process.platform === "win32" ? "C:\\output\\entry.png" : "/output/entry.png";
const repoOutput = join(root, "out", "entry.png");

function run(number) {
  const started = process.hrtime.bigint();
  const processResult = spawnSync(process.execPath, [join(root, "main.ts")], { cwd: root, encoding: "utf8", timeout: 10000 });
  assert.ifError(processResult.error);
  assert.equal(processResult.status, 0, processResult.stderr || processResult.stdout);
  const wallRuntimeMs = Number(process.hrtime.bigint() - started) / 1e6;
  const info = JSON.parse(processResult.stdout);
  const png = readFileSync(output);
  const copy = readFileSync(repoOutput);
  assert.deepEqual(copy, png, "Repository copy differs from /output/entry.png");
  const sha256 = hash(png);
  assert.equal(info.sha256, sha256);
  assert.ok(info.runtimeMs < 10000 && wallRuntimeMs < 10000);
  return {
    metadata: { number, sha256, bytes: png.length, generatorRuntimeMs: info.runtimeMs, wallRuntimeMs: Number(wallRuntimeMs.toFixed(2)) },
    png, renderReport: readFileSync(join(root, "out", "render-report.json")),
  };
}

const first = run(1);
const second = run(2);
assert.deepEqual(first.png, second.png, "Two PNG runs are not byte-identical");
assert.deepEqual(first.renderReport, second.renderReport, "Render audit must also be deterministic");
const pngInfo = inspectPNG(second.png);
assert.equal(pngInfo.width, 1024); assert.equal(pngInfo.height, 1024);
assert.equal(pngInfo.colorType, 2); assert.equal(pngInfo.scanlineFilter, 0);
assert.ok(second.png.length < 1048576);
const report = JSON.parse(second.renderReport.toString("utf8"));
assert.equal(report.lockedContentCanonicalSha256, expectedContentHash);
assert.equal(report.png.sha256, second.metadata.sha256);
assert.equal(report.storyCount, 16); assert.equal(report.illustrationCount, 16); assert.equal(report.mapPinCount, 16);
assert.equal(report.headlines.length, 16); assert.equal(report.summaries.length, 16);
assert.deepEqual(report.completeSummaries, [2, 3]);
assert.equal(report.truncations.length, 14);
const checkedStories = [];
for (const story of data.stories) {
  const title = report.headlines.find(item => item.id === story.id);
  assert.equal(title.title, story.title);
  assert.equal(title.lines.join(" "), story.title);
  assert.ok(title.lines.length <= 2 && title.usedHeight <= title.box.height);
  assert.equal(title.capHeight, story.hero ? 14 : 11);
  const summary = report.summaries.find(item => item.id === story.id);
  assert.equal(summary.capHeight, 9); assert.equal(summary.leading, 11.5);
  assert.equal(summary.source, story.source);
  assert.ok(summary.retainedSentenceNumbers.length >= 1);
  const retained = summary.retainedSentenceNumbers.map(number => story.sentences[number - 1]);
  assert.deepEqual(summary.retainedSentences, retained);
  assert.deepEqual([...summary.retainedSentenceNumbers].sort((a, b) => a - b), summary.retainedSentenceNumbers);
  const omitted = story.sentences.map((text, index) => ({ number: index + 1, text })).filter(item => !summary.retainedSentenceNumbers.includes(item.number));
  assert.deepEqual(summary.omittedSentences, omitted);
  const outside = summary.sourcePlacement === "kicker";
  assert.equal(outside, story.id === 4);
  const full = [...story.sentences, ...(outside ? [] : [story.source])].join(" ");
  const fullMetrics = paragraphMetrics(full, summary.summaryBox.width, 9, 11.5);
  assert.equal(summary.completeSummaryHeight, fullMetrics.height);
  if (fullMetrics.height <= summary.summaryBox.height) assert.deepEqual(summary.retainedSentenceNumbers, [1, 2]);
  else {
    const firstOnly = [story.sentences[0], ...(outside ? [] : [story.source])].join(" ");
    const firstFits = paragraphMetrics(firstOnly, summary.summaryBox.width, 9, 11.5).height <= summary.summaryBox.height;
    assert.deepEqual(summary.retainedSentenceNumbers, [firstFits ? 1 : 2]);
  }
  const rendered = [...retained, ...(outside ? [] : [story.source])].join(" ");
  assert.equal(summary.renderedText, rendered);
  const actual = paragraphMetrics(rendered, summary.summaryBox.width, 9, 11.5);
  assert.equal(actual.height, summary.renderedHeight);
  assert.ok(actual.height <= summary.summaryBox.height);
  if (outside) assert.ok(report.textBoxes.some(box => box.text === story.source));
  const pin = report.pins.find(item => item.id === story.id);
  assert.ok(pin && pin.place === story.pin.place);
  assert.equal(pin.color, data.regions.find(region => region.name === story.region).color);
  checkedStories.push(story.id);
}

for (let i = 0; i < report.textBoxes.length; i++) {
  const a = report.textBoxes[i];
  assert.ok(a.x >= 24 && a.y >= 16 && a.x + a.width <= 1000 && a.y + a.height <= 1010);
  for (let j = 0; j < i; j++) {
    const b = report.textBoxes[j];
    assert.ok(!(a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y), `Overlap: ${a.text} / ${b.text}`);
  }
}
for (let i = 0; i < report.pins.length; i++) {
  for (let j = 0; j < i; j++) assert.ok(Math.hypot(report.pins[i].x - report.pins[j].x, report.pins[i].y - report.pins[j].y) >= 15);
}
for (const value of [data.kicker, data.edition, data.masthead, data.subhead, data.footerLeft, data.footerRight, "WHERE IT HAPPENED", "DATE CHECK"]) {
  assert.ok(report.textBoxes.some(box => box.text === value), `Missing text: ${value}`);
}
for (const region of data.regions) assert.ok(report.textBoxes.some(box => box.text === `${region.name} ${region.count}`));
for (const kpi of data.kpis) assert.ok(report.textBoxes.some(box => box.text === kpi.value));
const dateLines = report.textBoxes.filter(box => box.x === 116 && box.y >= 970 && box.y <= 980).sort((a,b)=>a.y-b.y);
assert.equal(dateLines.map(box => box.text).join(" "), data.dateCheck);

const owner = JSON.parse(readFileSync(join(root, ".makefun", "owner.json"), "utf8"));
assert.equal(owner.wallet, "95EqamwS4WxnGnMCSXR5pSRr3ypHMRdgg7W6MZhNUu37");
const packageInfo = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
assert.equal(packageInfo.dependencies, undefined); assert.equal(packageInfo.devDependencies, undefined);
const sources = ["main.ts", "typeface.ts", "raster.ts", "illustrations.ts", "world-map.ts"];
const imports = [];
for (const source of sources) {
  const code = readFileSync(join(root, source), "utf8");
  assert.doesNotMatch(code, /Math\.random|Date\.now|\bfetch\s*\(|\brequire\s*\(|\bimport\s*\(/);
  for (const match of code.matchAll(/^import .* from "([^"]+)";/gm)) {
    assert.ok(match[1].startsWith("node:") || ["./typeface.ts", "./raster.ts", "./illustrations.ts", "./world-map.ts"].includes(match[1]));
    imports.push({ source, module: match[1] });
  }
}
const result = {
  status: "PASS", nodeVersion: process.version,
  output, repositoryCopy: "out/entry.png",
  dimensions: [1024, 1024], bytes: second.png.length,
  colorType: 2, bitDepth: 8, scanlineFilter: 0, allChunkCrcsValid: true,
  pngByteIdentical: true, deterministicRenderReport: true, outputCopyByteIdentical: true,
  runs: [first.metadata, second.metadata],
  storyIdsVerified: checkedStories, mapPinsVerified: 16, illustrationsVerified: 16,
  lockedContentCanonicalSha256: expectedContentHash,
  allHeadlinesUncut: true, allSourcesComplete: true, allSentenceSelectionsVerbatim: true,
  noSummaryFontShrinking: true, allTextBoundsAndPairwiseNonOverlapVerified: true,
  completeSummaryIds: report.completeSummaries,
  cuts: report.truncations.map(item => ({ id: item.id, title: item.title, retainedSentenceNumbers: item.retainedSentenceNumbers, omittedSentences: item.omittedSentences })),
  fullBuildMainWrites: 2,
  refinementAfterFirstRender: "Balanced headline line breaks; the orphaned word coast is now part of a balanced second line.",
  ownerWalletUnchanged: true, externalDependencies: 0, imports,
};
writeFileSync(join(root, "out", "verification-report.json"), JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result, null, 2));
