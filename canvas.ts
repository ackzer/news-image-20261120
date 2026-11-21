// Minimal Canvas and PNG writer
export class Canvas {
  width: number;
  height: number;
  data: Uint32Array;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.data = new Uint32Array(width * height);
  }

  fillRect(x: number, y: number, w: number, h: number, color: number) {
    const x0 = Math.max(0, Math.floor(x));
    const y0 = Math.max(0, Math.floor(y));
    const x1 = Math.min(this.width, Math.floor(x + w));
    const y1 = Math.min(this.height, Math.floor(y + h));
    for (let yy = y0; yy < y1; yy++) {
      const row = yy * this.width;
      for (let xx = x0; xx < x1; xx++) {
        this.data[row + xx] = color;
      }
    }
  }
}

// Write PNG using Node's built-in zlib
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

function crc32(buf: Uint8Array): number {
  let crc = 0xffffffff;
  for (const b of buf) {
    crc ^= b;
    for (let i = 0; i < 8; i++) {
      crc = (crc >>> 1) ^ (0xedb88320 * (crc & 1));
    }
  }
  return crc ^ 0xffffffff;
}

function writeChunk(buf: Uint8Array, type: string, data: Uint8Array) {
  const len = data.length;
  buf.set([len >>> 24, (len >>> 16) & 0xff, (len >>> 8) & 0xff, len & 0xff], buf.length - 4);
  const typeBytes = new TextEncoder().encode(type);
  buf.set(typeBytes, buf.length - 4 + 4);
  buf.set(data, buf.length - 4 + 8);
  const crcData = new Uint8Array(4 + len);
  crcData.set(typeBytes);
  crcData.set(data, 4);
  const crc = crc32(crcData);
  buf.set([crc >>> 24, (crc >>> 16) & 0xff, (crc >>> 8) & 0xff, crc & 0xff], buf.length - 4 + 8 + len);
}

export async function writePNG(canvas: Canvas, filename: string) {
  const { width, height, data } = canvas;
  const raw = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const c = data[i];
    raw[i * 4] = (c >>> 24) & 0xff;     // R
    raw[i * 4 + 1] = (c >>> 16) & 0xff; // G
    raw[i * 4 + 2] = (c >>> 8) & 0xff;  // B
    raw[i * 4 + 3] = c & 0xff;          // A
  }

  // Add PNG filter bytes (type 0 = none)
  const filtered = new Uint8Array(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    filtered[y * (width * 4 + 1)] = 0;
    filtered.set(raw.subarray(y * width * 4, (y + 1) * width * 4), y * (width * 4 + 1) + 1);
  }

  const compressed = deflateSync(filtered);

  const sig = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, width);
  dv.setUint32(4, height);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const idat = compressed;
  const iend = new Uint8Array(0);

  const total = sig.length + (12 + 13 + 4) + (12 + idat.length + 4) + (12 + 0 + 4);
  const out = new Uint8Array(total);
  let pos = 0;
  out.set(sig, pos); pos += sig.length;

  // IHDR
  const ihdrLen = new Uint8Array([0, 0, 0, 13]);
  out.set(ihdrLen, pos); pos += 4;
  out.set(new TextEncoder().encode("IHDR"), pos); pos += 4;
  out.set(ihdr, pos); pos += 13;
  const ihdrCrc = crc32(new Uint8Array([...new TextEncoder().encode("IHDR"), ...ihdr]));
  out.set([ihdrCrc >>> 24, (ihdrCrc >>> 16) & 0xff, (ihdrCrc >>> 8) & 0xff, ihdrCrc & 0xff], pos); pos += 4;

  // IDAT
  const idatLen = new Uint8Array([idat.length >>> 24, (idat.length >>> 16) & 0xff, (idat.length >>> 8) & 0xff, idat.length & 0xff]);
  out.set(idatLen, pos); pos += 4;
  out.set(new TextEncoder().encode("IDAT"), pos); pos += 4;
  out.set(idat, pos); pos += idat.length;
  const idatCrc = crc32(new Uint8Array([...new TextEncoder().encode("IDAT"), ...idat]));
  out.set([idatCrc >>> 24, (idatCrc >>> 16) & 0xff, (idatCrc >>> 8) & 0xff, idatCrc & 0xff], pos); pos += 4;

  // IEND
  const iendLen = new Uint8Array([0, 0, 0, 0]);
  out.set(iendLen, pos); pos += 4;
  out.set(new TextEncoder().encode("IEND"), pos); pos += 4;
  const iendCrc = crc32(new TextEncoder().encode("IEND"));
  out.set([iendCrc >>> 24, (iendCrc >>> 16) & 0xff, (iendCrc >>> 8) & 0xff, iendCrc & 0xff], pos);

  writeFileSync(filename, Buffer.from(out));
}