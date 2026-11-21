// Stage 1 only: a newly authored font specimen, not the newspaper layout.
// Every lit glyph cell is a solid rectangle. No fonts, atlases or packages.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { deflateSync, inflateSync } from "node:zlib";

const started = process.hrtime.bigint();
const W = 1024;
const H = 1024;
const C = {
  paper: "#F6F3EC", ink: "#141414", body: "#262626",
  source: "#525252", rule: "#C8C2B6", accent: "#8B1E24",
};

// Hand-entered rows, not an imported font or an encoded image atlas.
// Capitals occupy seven rows. Lowercase descenders may use an eighth row.
// Empty side columns are removed when the character is registered.
const drawings = {
  A: "01110/10001/10001/11111/10001/10001/10001",
  B: "11110/10001/10001/11110/10001/10001/11110",
  C: "01111/10000/10000/10000/10000/10000/01111",
  D: "11110/10001/10001/10001/10001/10001/11110",
  E: "11111/10000/10000/11110/10000/10000/11111",
  F: "11111/10000/10000/11110/10000/10000/10000",
  G: "01111/10000/10000/10111/10001/10001/01111",
  H: "10001/10001/10001/11111/10001/10001/10001",
  I: "111/010/010/010/010/010/111",
  J: "00111/00010/00010/00010/10010/10010/01100",
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
  V: "10001/10001/10001/10001/01010/01010/00100",
  W: "10001/10001/10001/10101/10101/11011/10001",
  X: "10001/10001/01010/00100/01010/10001/10001",
  Y: "10001/10001/01010/00100/00100/00100/00100",
  Z: "11111/00001/00010/00100/01000/10000/11111",
  a: "0000/0000/0110/0001/0111/1001/0111",
  b: "1000/1000/1110/1001/1001/1001/1110",
  c: "0000/0000/0111/1000/1000/1000/0111",
  d: "0001/0001/0111/1001/1001/1001/0111",
  e: "0000/0000/0110/1001/1111/1000/0111",
  f: "011/100/100/110/100/100/100",
  g: "0000/0000/0111/1001/0111/0001/1001/0110",
  h: "1000/1000/1110/1001/1001/1001/1001",
  i: "1/0/1/1/1/1/1",
  j: "01/00/01/01/01/01/01/10",
  k: "1000/1000/1001/1010/1100/1010/1001",
  l: "10/10/10/10/10/10/01",
  m: "00000/00000/11010/10101/10101/10101/10101",
  n: "0000/0000/1110/1001/1001/1001/1001",
  o: "0000/0000/0110/1001/1001/1001/0110",
  p: "0000/0000/1110/1001/1110/1000/1000/1000",
  q: "0000/0000/0111/1001/0111/0001/0001/0001",
  r: "000/000/101/110/100/100/100",
  s: "0000/0000/0111/1000/0110/0001/1110",
  t: "010/010/111/010/010/010/001",
  u: "0000/0000/1001/1001/1001/1001/0111",
  v: "00000/00000/10001/10001/10001/01010/00100",
  w: "00000/00000/10001/10001/10101/10101/01010",
  x: "00000/00000/10001/01010/00100/01010/10001",
  y: "0000/0000/1001/1001/0111/0001/1001/0110",
  z: "0000/0000/1111/0001/0010/0100/1111",
  "0": "01110/10001/10011/10101/11001/10001/01110",
  "1": "010/110/010/010/010/010/111",
  "2": "01110/10001/00001/00010/00100/01000/11111",
  "3": "11110/00001/00001/01110/00001/00001/11110",
  "4": "00010/00110/01010/10010/11111/00010/00010",
  "5": "11111/10000/10000/11110/00001/00001/11110",
  "6": "01110/10000/10000/11110/10001/10001/01110",
  "7": "11111/00001/00010/00100/01000/01000/01000",
  "8": "01110/10001/10001/01110/10001/10001/01110",
  "9": "01110/10001/10001/01111/00001/00001/01110",
  ".": "0/0/0/0/0/0/1",
  ",": "00/00/00/00/00/01/01/10",
  ":": "0/0/1/0/0/1/0",
  ";": "00/00/01/00/00/01/01/10",
  "'": "1/1/0/0/0/0/0",
  '"': "101/101/000/000/000/000/000",
  "-": "000/000/000/111/000/000/000",
  "+": "00000/00100/00100/11111/00100/00100/00000",
  "%": "11001/11010/00010/00100/01000/01011/10011",
  "$": "00100/01111/10100/01110/00101/11110/00100",
  "/": "00001/00010/00010/00100/01000/01000/10000",
  "(": "001/010/100/100/100/010/001",
  ")": "100/010/001/001/001/010/100",
  "[": "11/10/10/10/10/10/11",
  "]": "11/01/01/01/01/01/11",
  "&": "01100/10010/10100/01000/10101/10010/01101",
  "!": "1/1/1/1/1/0/1",
  "?": "01110/10001/00001/00010/00100/00000/00100",
  "=": "0000/0000/1111/0000/1111/0000/0000",
  "#": "01010/01010/11111/01010/11111/01010/01010",
  "*": "00000/10101/01110/11111/01110/10101/00000",
  "·": "0/0/0/1/0/0/0",
  "ó": "0001/0010/0110/1001/1001/1001/0110",
  "é": "0001/0010/0110/1001/1111/1000/0111",
  "–": "00000/00000/00000/11111/00000/00000/00000",
  "—": "0000000/0000000/0000000/1111111/0000000/0000000/0000000",
};

const alphabet = new Map();
for (const [character, drawing] of Object.entries(drawings)) {
  let rows = drawing.split("/");
  const columns = rows[0].length;
  assert.ok(rows.length === 7 || rows.length === 8, `Bad height: ${character}`);
  assert.ok(rows.every(row => row.length === columns && /^[01]+$/.test(row)));
  const occupied = [...Array(columns).keys()].filter(x => rows.some(row => row[x] === "1"));
  assert.ok(occupied.length > 0);
  const left = occupied[0];
  const right = occupied[occupied.length - 1] + 1;
  rows = rows.map(row => row.slice(left, right));
  alphabet.set(character, { rows, width: right - left });
}
alphabet.set(" ", { rows: [], width: 3 });

function rgb(hex) {
  assert.match(hex, /^#[0-9a-fA-F]{6}$/);
  return [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16));
}

const pixels = Buffer.alloc(W * H * 3);
let paintedCells = 0;
let paintedSourceCells = 0;
function fill(x, y, width, height, ink) {
  const left = Math.round(x);
  const top = Math.round(y);
  const right = Math.round(x + width);
  const bottom = Math.round(y + height);
  assert.ok(left >= 0 && top >= 0 && right <= W && bottom <= H, "Raster bounds exceeded");
  assert.ok(right > left && bottom > top, "Empty cell");
  for (let row = top; row < bottom; row++) {
    let index = (row * W + left) * 3;
    for (let column = left; column < right; column++) {
      pixels[index++] = ink[0];
      pixels[index++] = ink[1];
      pixels[index++] = ink[2];
    }
  }
}
fill(0, 0, W, H, rgb(C.paper));

function typeset(text, capHeight = 9, tracking = 1) {
  assert.ok(capHeight >= 7 && tracking >= 1);
  const unit = capHeight / 7;
  const slots = [];
  let pen = 0;
  let height = 0;
  for (const character of text) {
    const glyph = alphabet.get(character);
    assert.ok(glyph, `Missing glyph ${JSON.stringify(character)}`);
    const width = Math.ceil(glyph.width * unit);
    slots.push({ character, glyph, x: pen, width });
    pen += width + tracking;
    height = Math.max(height, Math.ceil(glyph.rows.length * unit));
  }
  for (let index = 1; index < slots.length; index++) {
    const previous = slots[index - 1];
    assert.ok(slots[index].x >= previous.x + previous.width + tracking, "Letter overlap");
  }
  return { slots, width: slots.length ? pen - tracking : 0, height, unit };
}

const textBoxes = [];
function text(value, x, y, capHeight = 9, color = C.ink, tracking = 1, limit = 1000, mutedAt = Infinity) {
  const run = typeset(value, capHeight, tracking);
  x = Math.round(x);
  y = Math.round(y);
  assert.ok(x >= 24 && x + run.width <= limit, `Text exceeds column: ${value}`);
  assert.ok(y >= 16 && y + run.height <= 1010, `Text exceeds page: ${value}`);
  const ink = rgb(color);
  const sourceInk = rgb(C.source);
  for (const [characterIndex, slot] of run.slots.entries()) {
    const isSource = characterIndex >= mutedAt;
    const cellInk = isSource ? sourceInk : ink;
    slot.glyph.rows.forEach((row, dy) => {
      [...row].forEach((bit, dx) => {
        if (bit !== "1") return;
        fill(x + slot.x + dx * run.unit, y + dy * run.unit, run.unit, run.unit, cellInk);
        paintedCells++;
        if (isSource) paintedSourceCells++;
      });
    });
  }
  const box = { text: value, x, y, width: run.width, height: run.height };
  for (const earlier of textBoxes) {
    const intersects = x < earlier.x + earlier.width && x + run.width > earlier.x
      && y < earlier.y + earlier.height && y + run.height > earlier.y;
    assert.ok(!intersects, `Text boxes overlap: ${value} / ${earlier.text}`);
  }
  textBoxes.push(box);
  return box;
}

function wrap(value, width, capHeight = 9, tracking = 1) {
  assert.ok(value.length > 0 && !/\s{2,}|^\s|\s$/.test(value), "Unexpected whitespace");
  const lines = [];
  let line = "";
  for (const word of value.split(" ")) {
    assert.ok(typeset(word, capHeight, tracking).width <= width, `Unbreakable word: ${word}`);
    const candidate = line ? `${line} ${word}` : word;
    if (typeset(candidate, capHeight, tracking).width <= width) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
    }
  }
  lines.push(line);
  assert.equal(lines.join(" "), value, "Wrapping changed locked content");
  return lines;
}

function paragraph(value, x, y, width, height, capHeight = 9, leading = 11.5) {
  const lines = wrap(value, width, capHeight);
  const sourceMarker = value.lastIndexOf(" (");
  const sourceAt = sourceMarker < 0 ? Infinity : sourceMarker + 1;
  let consumed = 0;
  let usedHeight = 0;
  lines.forEach((line, index) => {
    const top = Math.round(y + index * leading);
    const box = text(line, x, top, capHeight, C.body, 1, x + width, sourceAt - consumed);
    usedHeight = Math.max(usedHeight, top - y + box.height);
    consumed += line.length + 1;
  });
  assert.ok(usedHeight <= height, `Paragraph needs ${usedHeight}px, has ${height}px`);
  return { lines: lines.length, height: usedHeight, width };
}

function centered(value, y, capHeight, color = C.ink, tracking = 1, x = 24, width = 976) {
  const measured = typeset(value, capHeight, tracking);
  return text(value, x + Math.floor((width - measured.width) / 2), y, capHeight, color, tracking, x + width);
}
function label(value, y) { text(value, 24, y, 9, C.accent); }
function rule(y) { fill(24, y, 976, 1, rgb(C.rule)); }

// These samples are verbatim selections from the user's locked content.
const lockedHero = "Russian missiles hit three Kyiv bridges";
const lockedSummary = "Overnight Russian missile and drone barrages struck three bridges across the Dnipro River in Kyiv, killing at least nine people across Ukraine and injuring 28 others. Mayor Vitali Klitschko closed damaged river crossings to private traffic while parts of the capital lost power, heat, and water. (Kyiv Independent, BBC)";
const lockedAccentSummary = "British Prime Minister Andy Burnham and European Union leaders Ursula von der Leyen and António Costa signed a joint summit pact in Brussels. The agreement expands cooperation on maritime defense, hybrid threat intelligence, irregular migration, and youth educational exchanges. (EU Council, Reuters)";
const kpis = ["3", "300,000+", "-5.6%", "2.3%", "$6B", "5"];

assert.ok(typeset("iii", 9).width < typeset("WWW", 9).width, "Font must be proportional");
assert.ok(typeset("Il1", 9).width > 0);

text("TYPE BEFORE LAYOUT", 24, 16, 11, C.accent);
const topNote = "ORIGINAL FILLED-CELL FONT / NODE BUILT-INS ONLY";
text(topNote, 1000 - typeset(topNote).width, 18, 9, C.source);
rule(39);

label("01 / MASTHEAD / 44 PX CAPITAL HEIGHT", 52);
centered("FRIDAY 20 NOVEMBER 2026", 78, 44, C.ink, 2);
centered("Friday 20 November 2026", 139, 44, C.ink, 2);
rule(207);

label("02 / LOCKED HERO HEADLINE / 14 PX / 314 PX COLUMN", 221);
const heroMetrics = paragraph(lockedHero, 24, 247, 314, 42, 14, 18);
assert.ok(heroMetrics.lines <= 2, "Hero headline exceeds two lines");
text("EXACT LOCKED TITLE / NO REWRITING", 390, 248, 9, C.source);
text("EACH ADVANCE INCLUDES A POSITIVE LETTER GAP", 390, 268, 9, C.source);
rule(298);

label("03 / UNABRIDGED LOCKED COPY / 9 PX / 11.5 PX LEADING", 312);
const wideBody = paragraph(lockedSummary, 24, 344, 314, 160);
const narrowBody = paragraph(lockedSummary, 370, 344, 184, 160);
const accentBody = paragraph(lockedAccentSummary, 594, 344, 406, 160);
text("314 PX / COMPLETE HERO #1", 24, 510, 9, C.source, 1, 338);
text("184 PX / SAME COPY", 370, 510, 9, C.source, 1, 554);
text("406 PX / COMPLETE STORY #4 / ACCENT CHECK", 594, 510, 9, C.source);
rule(535);

label("04 / LETTER FORMS, NUMERALS AND PUNCTUATION", 551);
text("THE QUICK BROWN FOX 0123456789 -5.6% $6B", 24, 579, 14);
text("abcdefghijklmnopqrstuvwxyz", 24, 615, 14, C.ink, 2);
text("ABCDEFGHIJKLMNOPQRSTUVWXYZ", 24, 650, 14, C.ink, 2);
text("0O 1Il ij MW mw ag pqy (Sources) · 'quotes' : ; , . + - % $ & António", 24, 688, 11, C.ink, 2);
rule(715);

label("05 / LOCKED KPI VALUES / 24 PX / 2 PX TRACKING", 730);
kpis.forEach((value, index) => {
  const left = 24 + Math.round(index * 976 / 6);
  const right = 24 + Math.round((index + 1) * 976 / 6);
  if (index) fill(left, 758, 1, 48, rgb(C.rule));
  centered(value, 768, 24, C.ink, 2, left + 4, right - left - 8);
});
text("NUMBERS ARE MEASURED BEFORE PLACEMENT. NOTHING IS CLIPPED OR ELLIPSIZED.", 24, 816, 9, C.source);
rule(838);

label("06 / ENLARGED CONSTRUCTION / EVERY LIT CELL IS A FILLED SQUARE", 854);
text("Ag ipq ó 36%", 24, 881, 42, C.ink, 4);
text("PROPORTIONAL WIDTHS / EXPLICIT GLYPHS / VISIBLE COUNTERS / NO FONT FILES", 24, 950, 9, C.source);
rule(977);
text("TYPE SPECIMEN ONLY · FULL NEWSPAPER AWAITS COORDINATOR APPROVAL", 24, 993, 9, C.accent);
assert.ok(paintedSourceCells > 0, "Source attribution must have its own ink color");

const crcTable = Array.from({ length: 256 }, (_, value) => {
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? (value >>> 1) ^ 0xEDB88320 : value >>> 1;
  return value >>> 0;
});
function crc32(bytes) {
  let value = 0xFFFFFFFF;
  for (const byte of bytes) value = crcTable[(value ^ byte) & 255] ^ (value >>> 8);
  return (value ^ 0xFFFFFFFF) >>> 0;
}
function chunk(type, payload) {
  const name = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(payload.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([name, payload])));
  return Buffer.concat([length, name, payload, checksum]);
}
const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const header = Buffer.alloc(13);
header.writeUInt32BE(W, 0);
header.writeUInt32BE(H, 4);
header[8] = 8;
header[9] = 2; // Truecolor RGB, never RGBA.
const scanlines = Buffer.alloc((1 + W * 3) * H);
for (let row = 0; row < H; row++) {
  const offset = row * (1 + W * 3);
  scanlines[offset] = 0; // PNG filter 0 on every row.
  pixels.copy(scanlines, offset + 1, row * W * 3, (row + 1) * W * 3);
}
const image = Buffer.concat([
  signature,
  chunk("IHDR", header),
  chunk("IDAT", deflateSync(scanlines, { level: 9 })),
  chunk("IEND", Buffer.alloc(0)),
]);

// Parse the finished file, check every chunk and decompress all scanlines.
assert.ok(image.length < 1024 * 1024, "PNG must be smaller than 1 MiB");
assert.deepEqual(image.subarray(0, 8), signature);
let position = 8;
const names = [];
const compressed = [];
while (position < image.length) {
  const length = image.readUInt32BE(position);
  assert.ok(position + length + 12 <= image.length, "Truncated PNG chunk");
  const name = image.toString("ascii", position + 4, position + 8);
  const data = image.subarray(position + 8, position + 8 + length);
  const stored = image.readUInt32BE(position + 8 + length);
  assert.equal(crc32(image.subarray(position + 4, position + 8 + length)), stored, `Bad ${name} CRC`);
  names.push(name);
  if (name === "IHDR") {
    assert.equal(data.readUInt32BE(0), W);
    assert.equal(data.readUInt32BE(4), H);
    assert.deepEqual([...data.subarray(8)], [8, 2, 0, 0, 0]);
  }
  if (name === "IDAT") compressed.push(data);
  position += length + 12;
}
assert.equal(position, image.length);
assert.deepEqual(names, ["IHDR", "IDAT", "IEND"]);
const recovered = inflateSync(Buffer.concat(compressed));
assert.deepEqual(recovered, scanlines);
for (let row = 0; row < H; row++) assert.equal(recovered[row * (1 + W * 3)], 0);

const destination = fileURLToPath(new URL("./test-font.png", import.meta.url));
writeFileSync(destination, image);
assert.deepEqual(readFileSync(destination), image);
const runtimeMs = Number(process.hrtime.bigint() - started) / 1e6;
assert.ok(runtimeMs < 10_000, "Runtime must stay below 10 seconds");
console.log(JSON.stringify({
  stage: "font-gate-only",
  output: destination,
  width: W, height: H, bitDepth: 8, colorType: 2, scanlineFilter: 0,
  chunks: names, crcVerified: true,
  bytes: image.length,
  sha256: createHash("sha256").update(image).digest("hex"),
  runtimeMs: Number(runtimeMs.toFixed(2)),
  registeredGlyphs: alphabet.size, paintedCells, paintedSourceCells,
  allTextBoxesDisjoint: true,
  samples: { heroMetrics, wideBody, narrowBody, accentBody },
}, null, 2));
