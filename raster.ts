// Original RGB drawing and PNG machinery. Node.js built-ins only.
import assert from "node:assert/strict";
import { deflateSync, inflateSync } from "node:zlib";

const colors = new Map();
export function rgb(hex) {
  if (colors.has(hex)) return colors.get(hex);
  assert.match(hex, /^#[0-9a-fA-F]{6}$/);
  const value = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  colors.set(hex, value);
  return value;
}

export class Raster {
  constructor(width, height, background) {
    this.width = width;
    this.height = height;
    this.pixels = Buffer.alloc(width * height * 3);
    this.clip = { x: 0, y: 0, width, height };
    this.rect(0, 0, width, height, background);
  }
  clipped(box, draw) {
    const previous = this.clip;
    assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= this.width && box.y + box.height <= this.height);
    this.clip = box;
    try { draw(); } finally { this.clip = previous; }
  }
  rect(x, y, width, height, color) {
    assert.ok(Number.isFinite(x + y + width + height) && width >= 0 && height >= 0);
    assert.ok(x >= 0 && y >= 0 && x + width <= this.width && y + height <= this.height, "Shape exceeds page");
    const c = typeof color === "string" ? rgb(color) : color;
    const left = Math.max(Math.round(x), this.clip.x);
    const top = Math.max(Math.round(y), this.clip.y);
    const right = Math.min(Math.round(x + width), this.clip.x + this.clip.width);
    const bottom = Math.min(Math.round(y + height), this.clip.y + this.clip.height);
    for (let row = top; row < bottom; row++) {
      let offset = (row * this.width + left) * 3;
      for (let column = left; column < right; column++) {
        this.pixels[offset++] = c[0];
        this.pixels[offset++] = c[1];
        this.pixels[offset++] = c[2];
      }
    }
  }
  border(x, y, width, height, color, thickness = 1) {
    this.rect(x, y, width, thickness, color);
    this.rect(x, y + height - thickness, width, thickness, color);
    this.rect(x, y, thickness, height, color);
    this.rect(x + width - thickness, y, thickness, height, color);
  }
  ellipse(cx, cy, rx, ry, color) {
    assert.ok(rx > 0 && ry > 0);
    assert.ok(cx - rx >= 0 && cy - ry >= 0 && cx + rx <= this.width && cy + ry <= this.height, "Ellipse exceeds page");
    const top = Math.max(Math.floor(cy - ry), this.clip.y);
    const bottom = Math.min(Math.ceil(cy + ry), this.clip.y + this.clip.height);
    for (let y = top; y < bottom; y++) {
      const t = (y + 0.5 - cy) / ry;
      if (Math.abs(t) > 1) continue;
      const half = rx * Math.sqrt(1 - t * t);
      const left = Math.max(0, Math.ceil(cx - half - 0.5));
      const right = Math.min(this.width, Math.floor(cx + half - 0.5) + 1);
      if (right > left) this.rect(left, y, right - left, 1, color);
    }
  }
  line(x1, y1, x2, y2, color, thickness = 1) {
    const count = Math.max(1, Math.ceil(Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1))));
    const size = Math.max(1, Math.round(thickness));
    for (let step = 0; step <= count; step++) {
      const x = Math.round(x1 + (x2 - x1) * step / count - size / 2);
      const y = Math.round(y1 + (y2 - y1) * step / count - size / 2);
      this.rect(x, y, size, size, color);
    }
  }
  path(points, color, thickness = 1, close = false) {
    for (let i = 1; i < points.length; i++) this.line(...points[i - 1], ...points[i], color, thickness);
    if (close) this.line(...points[points.length - 1], ...points[0], color, thickness);
  }
  polygon(points, color) {
    assert.ok(points.length >= 3);
    assert.ok(points.every(([x, y]) => x >= 0 && y >= 0 && x <= this.width && y <= this.height), "Polygon exceeds page");
    const low = Math.max(this.clip.y, Math.floor(Math.min(...points.map(p => p[1]))));
    const high = Math.min(this.clip.y + this.clip.height, Math.ceil(Math.max(...points.map(p => p[1]))));
    for (let y = low; y < high; y++) {
      const cuts = [];
      for (let i = 0; i < points.length; i++) {
        const a = points[i]; const b = points[(i + 1) % points.length];
        if ((a[1] <= y + 0.5 && b[1] > y + 0.5) || (b[1] <= y + 0.5 && a[1] > y + 0.5)) {
          cuts.push(a[0] + (y + 0.5 - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
        }
      }
      cuts.sort((a, b) => a - b);
      for (let i = 0; i + 1 < cuts.length; i += 2) {
        const x = Math.max(0, Math.ceil(cuts[i] - 0.5));
        const end = Math.min(this.width, Math.ceil(cuts[i + 1] - 0.5));
        if (end > x) this.rect(x, y, end - x, 1, color);
      }
    }
  }
  arc(cx, cy, rx, ry, start, end, color, thickness = 1) {
    const count = Math.max(8, Math.ceil(Math.abs(end - start) * Math.max(rx, ry)));
    let previous = [cx + Math.cos(start) * rx, cy + Math.sin(start) * ry];
    for (let step = 1; step <= count; step++) {
      const angle = start + (end - start) * step / count;
      const next = [cx + Math.cos(angle) * rx, cy + Math.sin(angle) * ry];
      this.line(...previous, ...next, color, thickness);
      previous = next;
    }
  }
}

const crcTable = Array.from({ length: 256 }, (_, word) => {
  for (let bit = 0; bit < 8; bit++) word = word & 1 ? (word >>> 1) ^ 0xEDB88320 : word >>> 1;
  return word >>> 0;
});
function crc32(bytes) {
  let word = 0xFFFFFFFF;
  for (const byte of bytes) word = crcTable[(word ^ byte) & 255] ^ (word >>> 8);
  return (word ^ 0xFFFFFFFF) >>> 0;
}
function chunk(name, payload) {
  const type = Buffer.from(name, "ascii");
  const result = Buffer.alloc(12 + payload.length);
  result.writeUInt32BE(payload.length, 0);
  type.copy(result, 4);
  payload.copy(result, 8);
  result.writeUInt32BE(crc32(result.subarray(4, 8 + payload.length)), 8 + payload.length);
  return result;
}
export function encodePNG(raster) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(raster.width, 0);
  header.writeUInt32BE(raster.height, 4);
  header[8] = 8; header[9] = 2;
  const stride = raster.width * 3;
  const raw = Buffer.alloc((stride + 1) * raster.height);
  for (let y = 0; y < raster.height; y++) raster.pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header), chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0)),
  ]);
}

// Independent bit-at-a-time CRC, separate from the encoder's lookup table.
export function inspectPNG(image) {
  assert.deepEqual([...image.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  let offset = 8; let width = 0; let height = 0;
  const chunks = []; const blocks = [];
  while (offset < image.length) {
    const length = image.readUInt32BE(offset);
    assert.ok(offset + length + 12 <= image.length);
    const name = image.toString("ascii", offset + 4, offset + 8);
    let crc = 0xFFFFFFFF;
    for (let i = offset + 4; i < offset + 8 + length; i++) {
      crc ^= image[i];
      for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
    assert.equal((crc ^ 0xFFFFFFFF) >>> 0, image.readUInt32BE(offset + length + 8), `Bad ${name} CRC`);
    const payload = image.subarray(offset + 8, offset + 8 + length);
    if (name === "IHDR") {
      assert.equal(length, 13); width = payload.readUInt32BE(0); height = payload.readUInt32BE(4);
      assert.deepEqual([...payload.subarray(8)], [8, 2, 0, 0, 0]);
    }
    if (name === "IDAT") blocks.push(payload);
    if (name === "IEND") assert.equal(length, 0);
    chunks.push(name); offset += length + 12;
  }
  assert.equal(offset, image.length);
  assert.deepEqual(chunks, ["IHDR", "IDAT", "IEND"]);
  const raw = inflateSync(Buffer.concat(blocks));
  const stride = width * 3 + 1;
  assert.equal(raw.length, stride * height);
  for (let y = 0; y < height; y++) assert.equal(raw[y * stride], 0);
  return { width, height, bitDepth: 8, colorType: 2, scanlineFilter: 0, allChunkCrcsValid: true, chunks, raw };
}
