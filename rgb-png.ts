// Original RGB raster and PNG implementation. Node.js built-ins only.
import assert from "node:assert/strict";
import { deflateSync, inflateSync } from "node:zlib";

export type RGB = readonly [number, number, number];
export type Box = { x: number; y: number; width: number; height: number };

export function color(hex: string): RGB {
  assert.match(hex, /^#[0-9a-f]{6}$/i);
  return [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16)) as unknown as RGB;
}

export class Raster {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array;

  constructor(width: number, height: number, background: RGB) {
    assert.ok(Number.isInteger(width) && width > 0);
    assert.ok(Number.isInteger(height) && height > 0);
    this.width = width;
    this.height = height;
    this.data = new Uint8Array(width * height * 3);
    this.rect(0, 0, width, height, background);
  }

  assertBox(box: Box): void {
    assert.ok(Object.values(box).every(Number.isFinite), "Non-finite rectangle");
    assert.ok(box.width >= 0 && box.height >= 0, "Negative rectangle size");
    assert.ok(box.x >= 0 && box.y >= 0, `Negative origin: ${JSON.stringify(box)}`);
    assert.ok(box.x + box.width <= this.width + 1e-7, `Right overflow: ${JSON.stringify(box)}`);
    assert.ok(box.y + box.height <= this.height + 1e-7, `Bottom overflow: ${JSON.stringify(box)}`);
  }

  // Each glyph pixel is a filled rectangle, never a line-stroke character.
  // Exact pixel-area coverage only softens fractional rectangle boundaries.
  rect(x: number, y: number, width: number, height: number, ink: RGB): void {
    this.assertBox({ x, y, width, height });
    if (!width || !height) return;
    const right = x + width;
    const bottom = y + height;
    for (let py = Math.floor(y); py < Math.ceil(bottom); py++) {
      const coverageY = Math.max(0, Math.min(py + 1, bottom) - Math.max(py, y));
      for (let px = Math.floor(x); px < Math.ceil(right); px++) {
        const coverageX = Math.max(0, Math.min(px + 1, right) - Math.max(px, x));
        const coverage = coverageX * coverageY;
        const index = (py * this.width + px) * 3;
        for (let c = 0; c < 3; c++) {
          this.data[index + c] = coverage === 1
            ? ink[c]
            : Math.round(this.data[index + c] * (1 - coverage) + ink[c] * coverage);
        }
      }
    }
  }
}

const CRC_TABLE = Uint32Array.from({ length: 256 }, (_, index) => {
  let crc = index;
  for (let bit = 0; bit < 8; bit++) crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  return crc >>> 0;
});

export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, payload: Uint8Array): Buffer {
  const output = Buffer.alloc(payload.length + 12);
  output.writeUInt32BE(payload.length, 0);
  output.write(type, 4, 4, "ascii");
  output.set(payload, 8);
  output.writeUInt32BE(crc32(output.subarray(4, -4)), output.length - 4);
  return output;
}

export function encodePNG(raster: Raster): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(raster.width, 0);
  header.writeUInt32BE(raster.height, 4);
  header[8] = 8;
  header[9] = 2; // RGB, never RGBA.
  const rowBytes = raster.width * 3;
  const scanlines = Buffer.alloc(raster.height * (rowBytes + 1));
  for (let row = 0; row < raster.height; row++) {
    // Buffer.alloc leaves the first byte of every scanline at filter 0.
    scanlines.set(raster.data.subarray(row * rowBytes, (row + 1) * rowBytes), row * (rowBytes + 1) + 1);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(scanlines, { level: 9 })),
    chunk("IEND", new Uint8Array()),
  ]);
}

// Independent structural checks on the encoded bytes, including every CRC.
export function verifyPNG(bytes: Buffer): { width: number; height: number; colorType: number; filters: number[] } {
  assert.deepEqual(bytes.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const types: string[] = [];
  const imageData: Buffer[] = [];
  let width = 0;
  let height = 0;
  let colorType = -1;
  let offset = 8;
  while (offset < bytes.length) {
    const size = bytes.readUInt32BE(offset);
    const end = offset + size + 12;
    assert.ok(end <= bytes.length, "Truncated PNG chunk");
    const type = bytes.toString("ascii", offset + 4, offset + 8);
    const payload = bytes.subarray(offset + 8, end - 4);
    assert.equal(crc32(bytes.subarray(offset + 4, end - 4)), bytes.readUInt32BE(end - 4), `Bad ${type} CRC`);
    types.push(type);
    if (type === "IHDR") {
      width = payload.readUInt32BE(0);
      height = payload.readUInt32BE(4);
      colorType = payload[9];
      assert.equal(payload[8], 8);
      assert.equal(colorType, 2);
      assert.deepEqual([...payload.subarray(10)], [0, 0, 0]);
    }
    if (type === "IDAT") imageData.push(payload);
    if (type === "IEND") assert.equal(size, 0);
    offset = end;
  }
  assert.equal(offset, bytes.length);
  assert.deepEqual(types, ["IHDR", "IDAT", "IEND"]);
  const pixels = inflateSync(Buffer.concat(imageData));
  const stride = width * 3 + 1;
  assert.equal(pixels.length, height * stride);
  const filters = new Set<number>();
  for (let row = 0; row < height; row++) filters.add(pixels[row * stride]);
  assert.deepEqual([...filters], [0]);
  return { width, height, colorType, filters: [...filters] };
}
