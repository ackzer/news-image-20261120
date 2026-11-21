// Full newspaper build, using the font approved in this same session.
// No packages, network, external assets, random values, or clock-based content.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { measure, paragraphMetrics } from "./typeface.ts";
import { Raster, encodePNG, inspectPNG } from "./raster.ts";
import { illustrate } from "./illustrations.ts";
import { drawWorldMap } from "./world-map.ts";

const started = process.hrtime.bigint();
const root = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(root, "news-data.json"), "utf8"));
const sha = value => createHash("sha256").update(value).digest("hex");
const contentSha256 = sha(JSON.stringify(data));
const P = { paper: "#F6F3EC", ink: "#141414", body: "#262626", source: "#525252", line: "#C8C2B6", red: "#8B1E24", negative: "#DC2626", white: "#FFFFFF" };
const image = new Raster(1024, 1024, P.paper);
const page = { x: 24, y: 16, width: 976, height: 994 };
const boxes = [];
const summaries = [];
const sourceRelocationAttempts = [];
const headlines = [];
const storiesDrawn = [];
const illustrationIds = [];
const colors = new Map(data.regions.map(region => [region.name, region.color]));

assert.equal(data.date, "FRIDAY 20 NOVEMBER 2026");
assert.deepEqual(data.kpis.map(kpi => kpi.value), ["3", "300,000+", "-5.6%", "2.3%", "$6B", "5"]);
assert.deepEqual(data.stories.map(story => story.id), Array.from({ length: 16 }, (_, i) => i + 1));
assert.equal(data.regions.length, 7);
assert.equal(data.regions.reduce((sum, region) => sum + region.width, 0), 976);
for (const region of data.regions) assert.equal(data.stories.filter(story => story.region === region.name).length, region.count);
for (const story of data.stories) {
  assert.equal(story.sentences.length, 2);
  assert.ok(story.sentences.every(sentence => sentence.endsWith(".") && !sentence.includes("\n")));
  assert.ok(story.source.startsWith("(") && story.source.endsWith(")"));
}

function inBox(x, y, width, height, box, label) {
  assert.ok(x >= box.x && y >= box.y && x + width <= box.x + box.width && y + height <= box.y + box.height, `Bounds: ${label}`);
  assert.ok(x >= 0 && y >= 0 && x + width <= 1024 && y + height <= 1024, `Page overflow: ${label}`);
}

function text(value, x, y, capHeight = 9, ink = P.ink, box = page, tracking = 1, mutedAt = Infinity) {
  const run = measure(value, capHeight, tracking);
  x = Math.round(x); y = Math.round(y);
  inBox(x, y, run.width, run.height, box, value);
  const record = { text: value, x, y, width: run.width, height: run.height, capHeight };
  for (const previous of boxes) {
    assert.ok(!(x < previous.x + previous.width && x + run.width > previous.x && y < previous.y + previous.height && y + run.height > previous.y), `Text overlap: ${value} / ${previous.text}`);
  }
  for (const [index, slot] of run.slots.entries()) {
    const color = index >= mutedAt ? P.source : ink;
    slot.glyph.rows.forEach((row, dy) => {
      [...row].forEach((bit, dx) => {
        if (bit === "1") image.rect(x + slot.x + dx * run.unit, y + dy * run.unit, run.unit, run.unit, color);
      });
    });
  }
  boxes.push(record);
  return record;
}

function center(value, y, height, ink = P.ink, box = page, tracking = 1) {
  return text(value, box.x + Math.floor((box.width - measure(value, height, tracking).width) / 2), y, height, ink, box, tracking);
}
function paragraph(value, box, height = 9, leading = 11.5, ink = P.body, maxLines = Infinity, source = "") {
  const metrics = paragraphMetrics(value, box.width, height, leading);
  assert.ok(metrics.height <= box.height && metrics.lines.length <= maxLines, `Paragraph overflow: ${value}`);
  const marker = source ? value.lastIndexOf(source) : -1;
  let consumed = 0;
  metrics.lines.forEach((line, index) => {
    text(line, box.x, box.y + Math.round(index * leading), height, ink, box, 1, marker < 0 ? Infinity : marker - consumed);
    consumed += line.length + 1;
  });
  assert.equal(metrics.lines.join(" "), value);
  return { lines: metrics.lines.length, height: metrics.height };
}
function headline(story, box, height, leading) {
  // Refined after the first render: avoid single-word orphans such as "coast".
  // Reflow only at spaces; neither the title nor its font size is changed.
  const words = story.title.split(" ");
  let lines = [story.title];
  if (story.hero || measure(story.title, height).width > box.width) {
    const candidates = [];
    for (let index = 1; index < words.length; index++) {
      const pair = [words.slice(0, index).join(" "), words.slice(index).join(" ")];
      const widths = pair.map(line => measure(line, height).width);
      if (widths.every(width => width <= box.width)) candidates.push({ pair, score: Math.abs(widths[0] - widths[1]) });
    }
    candidates.sort((a, b) => a.score - b.score);
    assert.ok(candidates.length, `No two-line title fit: ${story.title}`);
    lines = candidates[0].pair;
  }
  const usedHeight = Math.max(...lines.map((line, index) => Math.round(index * leading) + measure(line, height).height));
  assert.ok(lines.length <= 2 && usedHeight <= box.height);
  assert.equal(lines.join(" "), story.title);
  lines.forEach((line, index) => text(line, box.x, box.y + Math.round(index * leading), height, P.ink, box));
  headlines.push({ id: story.id, title: story.title, lines, capHeight: height, leading, box, usedHeight });
}
function rule(y, thickness = 1.5) { image.rect(24, y, 976, thickness, P.ink); }
function plate(value, x, y, size, bg, fg, parent) {
  const run = measure(value, size);
  const width = run.width + 8; const height = run.height + 6;
  inBox(x, y, width, height, parent, value);
  image.rect(x, y, width, height, bg);
  text(value, x + 4, y + 3, size, fg, parent);
}
function badge(id, cx, cy, color, radius = 7, parent = page) {
  image.ellipse(cx, cy, radius, radius, color);
  const value = String(id); const run = measure(value, 7);
  text(value, cx - Math.ceil(run.width / 2), cy - 4, 7, P.white, parent);
}

// A — masthead. No substitute headlines or newly invented news copy.
text(data.kicker, 24, 16, 9);
text(data.edition, 1000 - measure(data.edition, 9).width, 16, 9);
rule(35);
center(data.masthead, 46, 44, P.ink, { x: 24, y: 40, width: 976, height: 64 }, 2);
center(data.subhead, 110, 7);
rule(128, 2); rule(132, 1);

// B — six unchanged KPI values and their complete labels.
data.kpis.forEach((kpi, index) => {
  const left = 24 + Math.round(index * 976 / 6);
  const right = 24 + Math.round((index + 1) * 976 / 6);
  const box = { x: left + 7, y: 134, width: right - left - 14, height: 60 };
  if (index) image.rect(left, 138, 1.5, 52, P.ink);
  center(kpi.value, 138, 24, index === 2 ? P.negative : P.ink, box, 2);
  const label = paragraphMetrics(kpi.label, box.width, 8, 9.5);
  assert.ok(label.lines.length <= 2);
  label.lines.forEach((line, row) => center(line, 169 + Math.round(row * 9.5), 8, P.body, box));
});
rule(196);

// C — precisely allocated region blocks; colors match all story/map pins.
let legendX = 24;
for (const region of data.regions) {
  const box = { x: legendX, y: 200, width: region.width, height: 20 };
  image.rect(box.x, box.y, box.width, box.height, region.color);
  center(`${region.name} ${region.count}`, 205, 9, P.white, box);
  if (legendX !== 24) image.rect(legendX, 200, 2, 20, P.paper);
  legendX += region.width;
}

function art(story, box) {
  illustrate(image, story, box);
  illustrationIds.push(story.id);
  if (story.hero) {
    plate(story.art.title, box.x + 6, box.y + 6, 9, P.red, P.white, box);
    const subtitleWidth = measure(story.art.subtitle, 8).width + 8;
    image.rect(box.x + 6, box.y + 30, subtitleWidth, 16, P.white);
    image.border(box.x + 6, box.y + 30, subtitleWidth, 16, P.ink, 1);
    text(story.art.subtitle, box.x + 10, box.y + 33, 8, P.ink, box);
    plate(story.art.status, box.x + 6, box.y + 101, 7, P.ink, P.white, box);
    if (story.id === 3) {
      [["Taipei", "-5.6%"], ["Seoul", "-5.3%"], ["Tokyo", "-4.8%"]].forEach(([place, drop], i) => {
        text(place, box.x + 211, box.y + 45 + i * 20, 9, P.white, box);
        text(drop, box.x + box.width - 6 - measure(drop, 9).width, box.y + 45 + i * 20, 9, "#EF4444", box);
      });
    }
  } else {
    plate(story.art.title, box.x + 4, box.y + 2, 7, P.red, P.white, box);
    if (story.id === 8) text("STRIKE", box.x + 110, box.y + 11, 7, P.white, box);
    if (story.id === 14) text("$350M+", box.x + 132, box.y + 11, 7, P.ink, box);
    const run = measure(story.art.status, 7);
    plate(story.art.status, box.x + box.width - run.width - 12, box.y + 29, 7, "#FDF8F6", P.ink, box);
  }
}

function fitSummary(story, box, sourceOnKicker = false) {
  const combine = indices => [...indices.map(i => story.sentences[i]), ...(sourceOnKicker ? [] : [story.source])].join(" ");
  const candidates = [[0, 1], [0], [1]];
  const attempts = candidates.map(indices => {
    const value = combine(indices);
    const metrics = paragraphMetrics(value, box.width, 9, 11.5);
    return { indices, value, lines: metrics.lines.length, height: metrics.height, fits: metrics.height <= box.height };
  });
  const selected = attempts.find(attempt => attempt.fits);
  assert.ok(selected, `No intact sentence fits story ${story.id}`);
  paragraph(selected.value, box, 9, 11.5, P.body, Infinity, sourceOnKicker ? "" : story.source);
  const omitted = story.sentences.map((sentence, index) => ({ number: index + 1, text: sentence })).filter(item => !selected.indices.includes(item.number - 1));
  const record = {
    id: story.id, title: story.title,
    retainedSentenceNumbers: selected.indices.map(i => i + 1),
    retainedSentences: selected.indices.map(i => story.sentences[i]),
    omittedSentences: omitted, renderedText: selected.value,
    source: story.source, sourcePlacement: sourceOnKicker ? "kicker" : "summary",
    summaryBox: box, capHeight: 9, leading: 11.5,
    renderedLines: selected.lines, renderedHeight: selected.height,
    completeSummaryHeight: attempts[0].height,
  };
  assert.ok(record.retainedSentences.every(sentence => story.sentences.includes(sentence)));
  assert.ok(record.retainedSentences.length > 0);
  summaries.push(record);
}

// D — three heroes in the locked order.
data.stories.slice(0, 3).forEach((story, index) => {
  const x = 24 + index * 331;
  const column = { x, y: 226, width: 314, height: 246 };
  inBox(x, 226, 314, 246, page, `Hero ${story.id}`);
  art(story, { x, y: 226, width: 314, height: 118 });
  badge(story.id, x + 7, 357, colors.get(story.region), 7, column);
  text(story.kicker, x + 20, 353, 7, P.ink, column);
  headline(story, { x, y: 366, width: 314, height: 42 }, 14, 18);
  fitSummary(story, { x, y: 411, width: 314, height: 59 });
  if (index < 2) image.rect(x + 322, 226, 1, 246, P.line);
  storiesDrawn.push(story.id);
});
rule(475);

// E and the right side of F share exactly the same 184 px grid.
function smallCard(story, x, y, height = 148) {
  const column = { x, y, width: 184, height };
  inBox(x, y, 184, height, page, `Card ${story.id}`);
  art(story, { x, y, width: 184, height: 44 });
  badge(story.id, x + 7, y + 53, colors.get(story.region), 6.5, column);
  const summaryBox = { x, y: y + 92, width: 184, height: height - 92 };
  let sourceOnKicker = false;
  if (story.id === 4) {
    const attemptedText = `${story.sentences[0]} ${story.source}`;
    const attempted = paragraphMetrics(attemptedText, summaryBox.width, 9, 11.5);
    sourceOnKicker = attempted.height > summaryBox.height;
    sourceRelocationAttempts.push({ id: 4, source: story.source, attemptedText,
      capHeight: 9, leading: 11.5, summaryBox, attemptedLines: attempted.lines,
      requiredHeight: attempted.height, availableHeight: summaryBox.height,
      fits: !sourceOnKicker, outcome: sourceOnKicker ? "returned-to-kicker" : "moved-to-summary" });
  }
  if (sourceOnKicker) {
    text("UK · EU", x + 20, y + 49, 7, P.ink, column);
    text(story.source, x + 184 - measure(story.source, 9).width, y + 47, 9, P.source, column);
  } else text(story.kicker, x + 20, y + 49, 7, P.ink, column);
  headline(story, { x, y: y + 61, width: 184, height: 28 }, 11, 13.5);
  fitSummary(story, summaryBox, sourceOnKicker);
  storiesDrawn.push(story.id);
}
data.stories.slice(3, 13).forEach((story, index) => smallCard(story, 24 + index % 5 * 198, index < 5 ? 481 : 637));
for (const x of [215, 413, 611, 809]) image.rect(x, 481, 1, 304, P.line);
image.rect(24, 633, 976, 1, P.line);
rule(789);

// F — all 16 map pins, plus stories #14–#16.
text("WHERE IT HAPPENED", 24, 795, 9);
const pins = drawWorldMap(image, data.stories, colors, { x: 24, y: 811, width: 382, height: 134 });
for (const pin of pins) {
  const run = measure(String(pin.id), 7);
  text(String(pin.id), pin.x - Math.ceil(run.width / 2), pin.y - 4, 7, P.white, { x: 24, y: 811, width: 382, height: 134 });
}
text("Each number matches the story pin on this page.", 24, 952, 7, P.source, { x: 24, y: 795, width: 382, height: 168 });
data.stories.slice(13).forEach((story, index) => smallCard(story, 420 + index * 198, 795, 168));
for (const x of [413, 611, 809]) image.rect(x, 795, 1, 168, P.line);

// G — the only date exclusion box, then the complete two-part colophon.
image.rect(24, 968, 976, 24, "#FDF8F6");
image.border(24, 968, 976, 24, P.red, 1.5);
text("DATE CHECK", 31, 974, 9, P.red, { x: 29, y: 970, width: 85, height: 20 });
paragraph(data.dateCheck, { x: 116, y: 971, width: 878, height: 20 }, 9, 10, P.ink, 2);
text(data.footerLeft, 24, 999, 7, P.source);
text(data.footerRight, 1000 - measure(data.footerRight, 7).width, 999, 7, P.source);

assert.deepEqual(storiesDrawn, data.stories.map(story => story.id));
assert.deepEqual(illustrationIds, storiesDrawn);
assert.equal(pins.length, 16);
assert.equal(summaries.length, 16);
assert.equal(headlines.length, 16);
assert.equal(sha(JSON.stringify(data)), contentSha256, "Locked data mutated during rendering");
const png = encodePNG(image);
const inspected = inspectPNG(png);
assert.equal(inspected.width, 1024); assert.equal(inspected.height, 1024);
assert.ok(png.length < 1024 * 1024, "PNG exceeds 1 MiB");
for (let y = 0; y < 1024; y++) {
  assert.deepEqual(inspected.raw.subarray(y * 3073 + 1, (y + 1) * 3073), image.pixels.subarray(y * 3072, (y + 1) * 3072));
}

const output = join(process.env.MAKEFUN_OUTPUT_DIR ?? (process.platform === "win32" ? "C:\\output" : "/output"), "entry.png");
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, png);
assert.deepEqual(readFileSync(output), png);
const pngSha256 = sha(png);
const report = {
  stage: "full-build", fontGateCommit: "9870d02209ef0e3a9eb01c0c112d2a01c9a4e6c5",
  lockedContentCanonicalSha256: contentSha256,
  png: { width: 1024, height: 1024, colorType: 2, bitDepth: 8, scanlineFilter: 0, crcVerified: true, bytes: png.length, sha256: pngSha256 },
  storyCount: 16, illustrationCount: illustrationIds.length, mapPinCount: pins.length,
  originalHeadlinesPreserved: true, completeSourcesPreserved: true, kpiValues: data.kpis.map(kpi => kpi.value),
  allTextBoxesDisjointAndWithinBounds: true, noFontShrinking: true,
  sentencePolicy: "Complete summary if it fits; otherwise first intact sentence if it fits, else second intact sentence. Never rewrite or cut inside a sentence.",
  layoutNotes: ["Story #4 attribution is in its kicker row so one intact sentence fits at 9 px.", "Actual rounded cell bounds retain a minimum one-pixel inter-letter gap.", "Up to five 9 px lines fit some specified summary boxes without exceeding their pixel bounds.", "After the first full render, headlines were balanced over two measured lines to remove orphans without changing words or sizes."],
  designAudit: {
    round: 1, editingMethod: "targeted patches; no whole-file rewrites",
    baselineCommit: "eb87a7590d01070b2e512dd8fda3d178ad5d34d7",
    sourceRelocationAttempts,
    mapBox: { x: 24, y: 811, width: 382, height: 134 },
    landAdjustedPinIds: [5,6,11,12,14,15,16], minimumPinSeparation: 15,
    illustrationChanges: { strikeBanner: { movedUp: 5, height: 13 }, atpPayLabel: { movedUp: 5 }, archSky: "#DCE4EE", projectile: { movedUp: 6 } },
    dateCheck: { blackTextMovedDown: 1, lineY: [971,981], box: { x: 24, y: 968, width: 976, height: 24 } },
    approvedTypefaceAndMastheadUnchanged: true,
  },
  truncations: summaries.filter(summary => summary.omittedSentences.length > 0),
  completeSummaries: summaries.filter(summary => !summary.omittedSentences.length).map(summary => summary.id),
  headlines, summaries, pins, textBoxes: boxes,
};
const runtimeMs = Number(process.hrtime.bigint() - started) / 1e6;
assert.ok(runtimeMs < 10_000, "Runtime exceeds 10 seconds");
console.log(JSON.stringify({ output, bytes: png.length, sha256: pngSha256, runtimeMs: Number(runtimeMs.toFixed(2)), stories: storiesDrawn.length, pins: pins.length, summariesTruncated: report.truncations.length, completeSummaries: report.completeSummaries }, null, 2));
