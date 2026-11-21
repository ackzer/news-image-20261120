// FONT GATE ONLY. Full newspaper layout awaits coordinator approval.
// Completely new code for news-image-20261120, written in this session.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Raster, color, encodePNG, verifyPNG } from "./rgb-png.ts";
import { drawText, measureText, paragraph, testFontMetrics, wrapText } from "./bitmap-font.ts";
import type { TextStyle } from "./bitmap-font.ts";

const start = process.hrtime.bigint();
const WIDTH = 1024;
const HEIGHT = 1024;
const PAPER = color("#F6F3EC");
const INK = color("#141414");
const BODY = color("#262626");
const MUTED = color("#525252");
const HAIRLINE = color("#C8C2B6");
const CRIMSON = color("#8B1E24");
const PAGE = { x: 24, y: 16, width: 976, height: 994 };
const canvas = new Raster(WIDTH, HEIGHT, PAPER);

function label(text: string, y: number): void {
  drawText(canvas, text, 24, y, { capHeight: 9, ink: CRIMSON, bold: true }, PAGE);
}

function rule(y: number): void {
  canvas.rect(24, y, 976, 1, HAIRLINE);
}

function fontGate(): void {
  testFontMetrics();
  label("NEWS-IMAGE-20261120 / FONT GATE / ORIGINAL FILLED-CELL TYPE", 24);
  rule(48);

  label("01 / MASTHEAD / 44 PX CAP HEIGHT", 66);
  const masthead = "FRIDAY 20 NOVEMBER 2026";
  const mastStyle: TextStyle = { capHeight: 44, ink: INK, tracking: 2, bold: true };
  const mastWidth = measureText(masthead, mastStyle);
  assert.ok(mastWidth <= PAGE.width);
  drawText(canvas, masthead, (WIDTH - mastWidth) / 2, 98, mastStyle, PAGE);
  rule(164);

  label("02 / HERO HEADLINE / 14 PX / 314 PX COLUMN", 185);
  const hero = "AI Stock Sell-Off Sinks Asian Tech Markets in Friday Rout";
  const headlineStyle: TextStyle = { capHeight: 14, ink: INK, tracking: 1, bold: true };
  const heroLines = paragraph(canvas, hero, { x: 24, y: 215, width: 314, height: 66 }, headlineStyle, 18);
  assert.ok(heroLines.length <= 3);
  drawText(canvas, "Measured before drawing. No clipping or ellipses.", 390, 218, { capHeight: 9, ink: MUTED }, PAGE);
  drawText(canvas, "Proportional widths; positive inter-letter advance.", 390, 240, { capHeight: 9, ink: MUTED }, PAGE);
  rule(290);

  label("03 / BODY COPY / 9 PX / FULL PARAGRAPH / 11.6 PX LEADING", 311);
  const summary = "Heavy losses across Taiwan, South Korea, and Japan as major chipmakers and AI hardware suppliers suffer sharp valuation cuts. (Closing prices)";
  const bodyStyle: TextStyle = { capHeight: 9, ink: BODY, tracking: 0.8 };
  paragraph(canvas, summary, { x: 24, y: 343, width: 314, height: 100 }, bodyStyle, 11.6);
  paragraph(canvas, summary, { x: 390, y: 343, width: 184, height: 110 }, bodyStyle, 11.6);
  drawText(canvas, "314 px / hero body", 24, 461, { capHeight: 9, ink: MUTED }, PAGE);
  drawText(canvas, "184 px / card body", 390, 461, { capHeight: 9, ink: MUTED }, PAGE);
  rule(486);

  label("04 / REQUIRED LETTER-FORM AND NUMBER TEST", 507);
  const pangram = "THE QUICK BROWN FOX 0123456789 -5.6% $6B";
  drawText(canvas, pangram, 24, 539, { capHeight: 14, ink: INK }, PAGE);
  drawText(canvas, "abcdefghijklmnopqrstuvwxyz", 24, 577, { capHeight: 14, ink: INK }, PAGE);
  drawText(canvas, "ABCDEFGHIJKLMNOPQRSTUVWXYZ", 24, 615, { capHeight: 14, ink: INK }, PAGE);
  drawText(canvas, "0O 1Il ij MW mw ag pqy (Sources) · ‘quotes’ : ; , . + - % $ &", 24, 653, { capHeight: 11, ink: BODY }, PAGE);
  rule(688);

  label("05 / ENLARGED PIXEL GEOMETRY / SOLID RECTANGLES, NOT STROKES", 709);
  drawText(canvas, "Aa gyp 35%", 24, 746, { capHeight: 42, ink: INK, tracking: 6 }, PAGE);
  drawText(canvas, "No font files. No font atlas. No packages. No network. No randomness.", 24, 830, { capHeight: 9, ink: MUTED }, PAGE);
  rule(859);

  label("06 / LOCKED KPI GLYPHS / 24 PX / TRACKING 2 PX", 880);
  drawText(canvas, "3  300,000+  -5.6%  2.3%  $6B  5", 24, 913, { capHeight: 24, ink: INK, tracking: 2, bold: true }, PAGE);
  rule(969);
  drawText(canvas, "TYPE SPECIMEN ONLY / NOT THE FINAL NEWS IMAGE / AWAITING FONT-GATE APPROVAL", 24, 990, { capHeight: 9, ink: CRIMSON }, PAGE);

  // Check wrapping reconstructs the sample verbatim.
  assert.equal(wrapText(summary, 184, bodyStyle).join(" "), summary);
}

fontGate();
const png = encodePNG(canvas);
const decoded = verifyPNG(png);
assert.equal(decoded.width, WIDTH);
assert.equal(decoded.height, HEIGHT);
assert.ok(png.length < 1024 * 1024, "PNG exceeds 1 MiB");
const outputPath = fileURLToPath(new URL("./test-font.png", import.meta.url));
writeFileSync(outputPath, png);
assert.deepEqual(readFileSync(outputPath), png);
const elapsedMs = Number(process.hrtime.bigint() - start) / 1e6;
assert.ok(elapsedMs < 10_000, "Runtime exceeds 10 seconds");
console.log(JSON.stringify({
  stage: "font-gate-only",
  output: outputPath,
  bytes: png.length,
  ...decoded,
  sha256: createHash("sha256").update(png).digest("hex"),
  runtimeMs: Number(elapsedMs.toFixed(2)),
}, null, 2));
