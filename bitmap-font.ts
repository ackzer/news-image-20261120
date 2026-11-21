// Original hand-authored filled-cell font for this entry, made in this session.
// These are glyph geometry definitions, not an imported font or image atlas.
import assert from "node:assert/strict";
import { Raster } from "./rgb-png.ts";
import type { Box, RGB } from "./rgb-png.ts";

const DRAWINGS: Record<string, string> = {
  A: "01110/10001/10001/11111/10001/10001/10001",
  B: "11110/10001/10001/11110/10001/10001/11110",
  C: "01111/10000/10000/10000/10000/10000/01111",
  D: "11110/10001/10001/10001/10001/10001/11110",
  E: "11111/10000/10000/11110/10000/10000/11111",
  F: "11111/10000/10000/11110/10000/10000/10000",
  G: "01111/10000/10000/10111/10001/10001/01110",
  H: "10001/10001/10001/11111/10001/10001/10001",
  I: "111/010/010/010/010/010/111",
  J: "00111/00010/00010/00010/00010/10010/01100",
  K: "10001/10010/10100/11000/10100/10010/10001",
  L: "1000/1000/1000/1000/1000/1000/1111",
  M: "10001/11011/10101/10101/10001/10001/10001",
  N: "10001/11001/11001/10101/10011/10011/10001",
  O: "01110/10001/10001/10001/10001/10001/01110",
  P: "11110/10001/10001/11110/10000/10000/10000",
  Q: "01110/10001/10001/10001/10101/10010/01101",
  R: "11110/10001/10001/11110/10100/10010/10001",
  S: "01111/10000/10000/01110/00001/00001/11110",
  T: "11111/00100/00100/00100/00100/00100/00100",
  U: "10001/10001/10001/10001/10001/10001/01110",
  V: "10001/10001/10001/10001/10001/01010/00100",
  W: "1000001/1000001/1000001/1001001/1010101/1100011/1000001",
  X: "10001/10001/01010/00100/01010/10001/10001",
  Y: "10001/10001/01010/00100/00100/00100/00100",
  Z: "11111/00001/00010/00100/01000/10000/11111",
  a: "00000/00000/01110/00001/01111/10001/01111",
  b: "10000/10000/10110/11001/10001/10001/11110",
  c: "0000/0000/0111/1000/1000/1000/0111",
  d: "00001/00001/01101/10011/10001/10001/01111",
  e: "00000/00000/01110/10001/11111/10000/01111",
  f: "0011/0100/1110/0100/0100/0100/0100",
  g: "00000/00000/01111/10001/10001/10011/01101/00001/11110",
  h: "10000/10000/10110/11001/10001/10001/10001",
  i: "1/0/1/1/1/1/1",
  j: "001/000/011/001/001/001/001/101/010",
  k: "1000/1000/1001/1010/1100/1010/1001",
  l: "10/10/10/10/10/10/01",
  m: "0000000/0000000/1101110/1010101/1001001/1001001/1001001",
  n: "00000/00000/10110/11001/10001/10001/10001",
  o: "00000/00000/01110/10001/10001/10001/01110",
  p: "00000/00000/11110/10001/10001/11001/10110/10000/10000",
  q: "00000/00000/01111/10001/10001/10011/01101/00001/00001",
  r: "000/000/101/110/100/100/100",
  s: "0000/0000/0111/1000/0110/0001/1110",
  t: "010/010/111/010/010/010/001",
  u: "00000/00000/10001/10001/10001/10011/01101",
  v: "00000/00000/10001/10001/10001/01010/00100",
  w: "0000000/0000000/1000001/1001001/1001001/1010101/0101010",
  x: "00000/00000/10001/01010/00100/01010/10001",
  y: "00000/00000/10001/10001/10001/10011/01101/00001/11110",
  z: "0000/0000/1111/0001/0110/1000/1111",
  "0": "01110/10001/10011/10101/11001/10001/01110",
  "1": "010/110/010/010/010/010/111",
  "2": "01110/10001/00001/00010/00100/01000/11111",
  "3": "11110/00001/00001/01110/00001/00001/11110",
  "4": "00010/00110/01010/10010/11111/00010/00010",
  "5": "11111/10000/10000/11110/00001/00001/11110",
  "6": "01110/10000/10000/11110/10001/10001/01110",
  "7": "11111/00001/00010/00100/00100/01000/01000",
  "8": "01110/10001/10001/01110/10001/10001/01110",
  "9": "01110/10001/10001/01111/00001/00001/01110",
  ".": "0/0/0/0/0/0/1",
  ",": "00/00/00/00/00/01/01/10",
  ":": "0/0/1/0/0/1/0",
  ";": "00/00/01/00/00/01/01/10",
  "!": "1/1/1/1/1/0/1",
  "?": "01110/10001/00001/00010/00100/00000/00100",
  "'": "1/1/0/0/0/0/0",
  "\"": "101/101/000/000/000/000/000",
  "-": "000/000/000/111/000/000/000",
  "+": "00000/00100/00100/11111/00100/00100/00000",
  "=": "00000/00000/11111/00000/11111/00000/00000",
  "/": "00001/00001/00010/00100/01000/10000/10000",
  "\\": "10000/10000/01000/00100/00010/00001/00001",
  "%": "11001/11010/00010/00100/01000/01011/10011",
  "$": "00100/01111/10100/01110/00101/11110/00100",
  "&": "01100/10010/10100/01000/10101/10010/01101",
  "(": "001/010/100/100/100/010/001",
  ")": "100/010/001/001/001/010/100",
  "[": "111/100/100/100/100/100/111",
  "]": "111/001/001/001/001/001/111",
  "<": "0001/0010/0100/1000/0100/0010/0001",
  ">": "1000/0100/0010/0001/0010/0100/1000",
  "#": "01010/01010/11111/01010/11111/01010/01010",
  "*": "00000/10101/01110/11111/01110/10101/00000",
  "@": "01110/10001/10111/10101/10111/10000/01111",
  "_": "00000/00000/00000/00000/00000/00000/11111",
  "|": "1/1/1/1/1/1/1",
  "·": "0/0/0/1/0/0/0",
  "’": "01/01/10/00/00/00/00",
  "‘": "01/10/10/00/00/00/00",
  "“": "0101/1010/1010/0000/0000/0000/0000",
  "”": "0101/0101/1010/0000/0000/0000/0000",
  "–": "00000/00000/00000/11111/00000/00000/00000",
  "—": "0000000/0000000/0000000/1111111/0000000/0000000/0000000",
  "…": "00000/00000/00000/00000/00000/00000/10101",
  "é": "00010/00100/01110/10001/11111/10000/01111",
  "ó": "00010/00100/01110/10001/10001/10001/01110",
  "Ó": "00010/00100/01110/10001/10001/10001/01110",
};

type Glyph = { rows: string[]; width: number; bottom: number };
const GLYPHS = new Map<string, Glyph>();
for (const [character, drawing] of Object.entries(DRAWINGS)) {
  const rows = drawing.split("/");
  const width = rows[0].length;
  assert.ok(rows.every((row) => row.length === width && /^[01]+$/.test(row)), `Invalid glyph ${character}`);
  assert.ok(rows.length <= 9, `Glyph too tall: ${character}`);
  GLYPHS.set(character, { rows, width, bottom: rows.findLastIndex((row) => row.includes("1")) + 1 });
}

export type TextStyle = { capHeight: number; ink: RGB; tracking?: number; bold?: boolean };

function lookup(character: string): Glyph {
  const glyph = GLYPHS.get(character);
  assert.ok(glyph, `Unsupported character: ${JSON.stringify(character)} (U+${character.codePointAt(0)!.toString(16)})`);
  return glyph;
}

function metrics(style: TextStyle): { scale: number; gap: number; extra: number } {
  assert.ok(style.capHeight > 0 && Number.isFinite(style.capHeight));
  const scale = style.capHeight / 7;
  const gap = style.tracking ?? scale;
  assert.ok(gap > 0, "Glyphs require positive spacing");
  return { scale, gap, extra: style.bold ? 0.1 * scale : 0 };
}

export function measureText(text: string, style: TextStyle): number {
  const { scale, gap, extra } = metrics(style);
  const characters = [...text];
  return characters.reduce((width, character, index) => {
    const glyphWidth = character === " " ? 3 * scale : lookup(character).width * scale + extra;
    return width + glyphWidth + (index + 1 < characters.length ? gap : 0);
  }, 0);
}

export function textHeight(text: string, style: TextStyle): number {
  return Math.max(7, ...[...text].filter((character) => character !== " ").map((character) => lookup(character).bottom)) * style.capHeight / 7;
}

export function drawText(raster: Raster, text: string, x: number, y: number, style: TextStyle, bounds: Box): Box {
  raster.assertBox(bounds);
  const box = { x, y, width: measureText(text, style), height: textHeight(text, style) };
  assert.ok(x >= bounds.x - 1e-7 && y >= bounds.y - 1e-7, `Text starts outside its box: ${text}`);
  assert.ok(x + box.width <= bounds.x + bounds.width + 1e-7, `Text exceeds column width: ${text}`);
  assert.ok(y + box.height <= bounds.y + bounds.height + 1e-7, `Text exceeds column height: ${text}`);
  raster.assertBox(box);
  const { scale, gap, extra } = metrics(style);
  let cursor = x;
  for (const character of text) {
    if (character === " ") {
      cursor += 3 * scale + gap;
      continue;
    }
    const glyph = lookup(character);
    for (let row = 0; row < glyph.rows.length; row++) {
      // Merge adjacent filled cells to avoid seams between same-color cells.
      let column = 0;
      while (column < glyph.width) {
        if (glyph.rows[row][column] === "0") { column++; continue; }
        const start = column;
        while (column < glyph.width && glyph.rows[row][column] === "1") column++;
        raster.rect(cursor + start * scale, y + row * scale, (column - start) * scale + extra, scale, style.ink);
      }
    }
    cursor += glyph.width * scale + extra + gap;
  }
  return box;
}

// Wrap at word boundaries. Never truncate, add ellipses, or drop content.
export function wrapText(text: string, width: number, style: TextStyle): string[] {
  assert.ok(!/[\r\n\t]/.test(text), "Pass one paragraph at a time");
  assert.ok(text.trim() === text && !text.includes("  "), "Preserve content: no implicit whitespace normalization");
  if (!text) return [];
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    assert.ok(measureText(word, style) <= width, `Word cannot fit without alteration: ${word}`);
    const candidate = line ? `${line} ${word}` : word;
    if (measureText(candidate, style) <= width) line = candidate;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  assert.equal(lines.join(" "), text, "Wrapping changed content");
  return lines;
}

export function paragraph(raster: Raster, text: string, bounds: Box, style: TextStyle, leading: number): string[] {
  const lines = wrapText(text, bounds.width, style);
  assert.ok(leading >= 9 * style.capHeight / 7, "Leading would overlap descenders");
  lines.forEach((line, index) => drawText(raster, line, bounds.x, bounds.y + index * leading, style, bounds));
  return lines;
}

export function testFontMetrics(): void {
  const style: TextStyle = { capHeight: 9, ink: [0, 0, 0] };
  assert.ok(measureText("iiii", style) < measureText("WWWW", style), "Font must be proportional");
  for (const character of GLYPHS.keys()) {
    assert.ok(measureText(character + character, style) > measureText(character, style) * 2, `Missing advance for ${character}`);
  }
  const pangram = "THE QUICK BROWN FOX 0123456789 -5.6% $6B";
  assert.equal(wrapText(pangram, 184, style).join(" "), pangram);
  assert.throws(() => wrapText("unbreakable", 1, style));
  assert.throws(() => measureText("\u2603", style));
  assert.equal(new Set(Object.keys(DRAWINGS)).size, Object.keys(DRAWINGS).length);
}
