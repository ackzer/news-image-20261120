// Full news image generator per spec — real text via opentype.js
// Layout: broadsheet with masthead, stat chips, region pills, hero cards,
// grid cards (4-13), stories (14-16), map panel, date check.
// All content is driven by news-data.json (single source of truth).
import { Canvas, writePNG } from "./canvas.ts";
import opentype from "opentype.js";
import { readFileSync } from "node:fs";
import path from "node:path";

const WIDTH = 1024;
const HEIGHT = 1024;
const PAD = 20;
const canvas = new Canvas(WIDTH, HEIGHT);

// ===== COLORS =====
const C_PAPER   = 0xfffafafa;
const C_INK     = 0xff1a1a1a;
const C_ACCENT  = 0xffc62828;
const C_BORDER  = 0xffe0e0e0;
const C_CARD_BG = 0xffffffff;
const C_MUTED   = 0xff666666;
const C_MAP_BG  = 0xfff5f5f5;
const C_MAP_LAND= 0xffd9d9d9;

// ===== FONTS =====
const FONT_DIR = "C:/Windows/Fonts";

function loadFont(name: string) {
  const buf = readFileSync(path.join(FONT_DIR, name));
  return opentype.parse(buf);
}

const fontDisp = loadFont("impact.ttf");   // bold condensed — masthead / headlines
const fontBold = loadFont("segoeuib.ttf"); // bold sans — body / chips
const fontReg  = loadFont("segoeui.ttf");  // regular sans — muted text

// ===== TEXT RENDERER =====
// Subdivide a cubic bezier into line segments
function cubicBezier(
  x0: number, y0: number,
  x1: number, y1: number,
  x2: number, y2: number,
  x3: number, y3: number,
  out: {x:number,y:number}[]
) {
  function subdiv(p0x:number,p0y:number,p1x:number,p1y:number,p2x:number,p2y:number,p3x:number,p3y:number,depth:number) {
    if (depth > 8) { out.push({x:p3x,y:p3y}); return; }
    const mx01=(p0x+p1x)/2, my01=(p0y+p1y)/2;
    const mx12=(p1x+p2x)/2, my12=(p1y+p2y)/2;
    const mx23=(p2x+p3x)/2, my23=(p2y+p3y)/2;
    const lmx01=(mx01+mx12)/2, lmy01=(my01+my12)/2;
    const lmx12=(mx12+mx23)/2, lmy12=(my12+my23)/2;
    const qmx=(lmx01+lmx12)/2, qmy=(lmy01+lmy12)/2;
    subdiv(p0x,p0y,mx01,my01,lmx01,lmy01,qmx,qmy,depth+1);
    subdiv(qmx,qmy,lmx12,lmy12,mx23,my23,p3x,p3y,depth+1);
  }
  out.push({x:x0,y:y0});
  subdiv(x0,y0,x1,y1,x2,y2,x3,y3,0);
}

// Subdivide a quadratic bezier into line segments
function quadBezier(
  x0: number, y0: number,
  x1: number, y1: number,
  x2: number, y2: number,
  out: {x:number,y:number}[]
) {
  function subdiv(p0x:number,p0y:number,p1x:number,p1y:number,p2x:number,p2y:number,depth:number) {
    if (depth > 8) { out.push({x:p2x,y:p2y}); return; }
    const mx01=(p0x+p1x)/2, my01=(p0y+p1y)/2;
    const mx12=(p1x+p2x)/2, my12=(p1y+p2y)/2;
    const qmx=(mx01+mx12)/2, qmy=(my01+my12)/2;
    subdiv(p0x,p0y,mx01,my01,qmx,qmy,depth+1);
    subdiv(qmx,qmy,mx12,my12,p2x,p2y,depth+1);
  }
  out.push({x:x0,y:y0});
  subdiv(x0,y0,x1,y1,x2,y2,0);
}

// Fill a polygon (array of points) using scanline even-odd rule
function fillPolygon(ctx: Canvas, pts: {x:number,y:number}[], color: number) {
  if (pts.length < 3) return;
  const edges: {y0:number,y1:number,x0:number,x1:number,dxdy:number}[] = [];
  let minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    if (Math.abs(a.y - b.y) < 0.0001) continue;
    if (a.y < b.y) {
      edges.push({y0:a.y, y1:b.y, x0:a.x, x1:b.x, dxdy:(b.x - a.x)/(b.y - a.y)});
    } else {
      edges.push({y0:b.y, y1:a.y, x0:b.x, x1:a.x, dxdy:(a.x - b.x)/(a.y - b.y)});
    }
    minY = Math.min(minY, a.y, b.y);
    maxY = Math.max(maxY, a.y, b.y);
  }
  if (edges.length === 0) return;
  const top = Math.ceil(minY);
  const bottom = Math.floor(maxY);
  for (let y = top; y <= bottom; y++) {
    const intersections: number[] = [];
    for (const e of edges) {
      if (y >= e.y0 && y < e.y1) {
        const t = (y - e.y0) / (e.y1 - e.y0);
        intersections.push(e.x0 + (e.x1 - e.x0) * t);
      }
    }
    intersections.sort((a,b) => a - b);
    for (let i = 0; i + 1 < intersections.length; i += 2) {
      const xl = Math.ceil(intersections[i]);
      const xr = Math.floor(intersections[i+1]);
      for (let x = xl; x <= xr; x++) {
        if (x >= 0 && x < ctx.width && y >= 0 && y < ctx.height) {
          ctx.data[y * ctx.width + x] = color;
        }
      }
    }
  }
}

function renderText(
  ctx: Canvas,
  text: string,
  x: number,
  y: number,
  pt: number,
  font: opentype.Font,
  color: number,
  align: "left" | "center" | "right" = "left",
  tracking: number = 0
): number {
  const scale = pt / font.unitsPerEm;
  let totalW = 0;
  for (const ch of text) {
    const g = font.charToGlyph(ch);
    totalW += (g.advanceWidth || 0) * scale + tracking;
  }
  let drawX = x;
  if (align === "center") drawX = x - totalW / 2;
  else if (align === "right") drawX = x - totalW;

  const baseY = y;
  let cursorX = drawX;

  for (const ch of text) {
    const g = font.charToGlyph(ch);
    const advance = (g.advanceWidth || 0) * scale + tracking;
    const path = g.getPath(cursorX, baseY, pt);

    let subPts: {x:number,y:number}[] = [];
    let subStarted = false;
    for (const c of path.commands) {
      if (c.type === "M") {
        if (subStarted && subPts.length >= 3) fillPolygon(ctx, subPts, color);
        subPts = [{x:c.x,y:c.y}];
        subStarted = true;
      } else if (c.type === "L") {
        subPts.push({x:c.x,y:c.y});
      } else if (c.type === "C") {
        const pts: {x:number,y:number}[] = [];
        cubicBezier(subPts[subPts.length-1].x, subPts[subPts.length-1].y,
                     c.x1, c.y1, c.x2, c.y2, c.x, c.y, pts);
        for (let i = 1; i < pts.length; i++) subPts.push(pts[i]);
      } else if (c.type === "Q") {
        const pts: {x:number,y:number}[] = [];
        quadBezier(subPts[subPts.length-1].x, subPts[subPts.length-1].y,
                    c.x1, c.y1, c.x, c.y, pts);
        for (let i = 1; i < pts.length; i++) subPts.push(pts[i]);
      } else if (c.type === "Z") {
        if (subStarted && subPts.length >= 3) fillPolygon(ctx, subPts, color);
        subStarted = false;
        subPts = [];
      }
    }
    if (subStarted && subPts.length >= 3) fillPolygon(ctx, subPts, color);
    cursorX += advance;
  }
  return totalW;
}

function measureText(text: string, pt: number, font: opentype.Font): number {
  return font.getAdvanceWidth(text, pt);
}

// Word-wrap text into lines that fit within maxW (measured at pt size with font).
function wrapText(text: string, maxW: number, pt: number, font: opentype.Font): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const t = cur ? cur + " " + w : w;
    if (measureText(t, pt, font) > maxW) {
      if (cur) lines.push(cur);
      cur = w;
    } else {
      cur = t;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

function renderWrapped(ctx: Canvas, text: string, x: number, y: number,
  pt: number, font: opentype.Font, color: number, maxW: number, lineH: number,
  maxLines: number = 999): number {
  const lines = wrapText(text, maxW, pt, font);
  let ly = y;
  let drawn = 0;
  for (const ln of lines.slice(0, maxLines)) {
    renderText(ctx, ln, x, ly, pt, font, color);
    ly += lineH;
    drawn++;
  }
  return drawn;
}

function drawPill(x: number, y: number, w: number, h: number, color: number) {
  const r = h / 2;
  canvas.fillRect(x + r, y, w - 2 * r, h, color);
  canvas.fillRect(x, y + r, r, h, color);
  canvas.fillRect(x + w - r, y + r, r, h, color);
}

// ===== LOAD DATA =====
const data = JSON.parse(readFileSync("news-data.json", "utf-8"));

// ===== BACKGROUND =====
canvas.fillRect(0, 0, WIDTH, HEIGHT, C_PAPER);

// ===== ZONE 0: TOP BAR =====
const topBarH = 28;
canvas.fillRect(0, 0, WIDTH, topBarH, C_INK);
renderText(canvas, "THE WORLD IN ONE DAY", PAD, 18, 11, fontBold, C_PAPER);
renderText(canvas, "16 STORIES · 7 REGIONS · EVERY ONE DATED FRIDAY 20 NOVEMBER 2026",
  WIDTH - PAD, 18, 11, fontBold, C_PAPER, "right");

// ===== ZONE A: MASTHEAD =====
const mastheadY = 60;
renderText(canvas, data.masthead, PAD, mastheadY, 58, fontDisp, C_INK);

const subY = mastheadY + 78;
renderWrapped(canvas, data.subhead, PAD, subY, 14, fontReg, C_MUTED, WIDTH - 2 * PAD, 18, 1);
canvas.fillRect(0, subY + 26, WIDTH, 1, C_BORDER);

// ===== ZONE A2: STAT CHIPS =====
const chipY = subY + 44;
const chips = data.stats;
const chipW = (WIDTH - 2 * PAD - (chips.length - 1) * 10) / chips.length;
let chipX = PAD;
for (const c of chips) {
  const cw = chipW;
  // value
  renderText(canvas, c.val, chipX + cw / 2, chipY, 24, fontDisp, C_ACCENT, "center");
  // label (wrapped to two lines max, centered)
  renderWrapped(canvas, c.label, chipX, chipY + 34, 10, fontReg, C_MUTED, cw, 12, 2);
  chipX += cw + 10;
}

// ===== ZONE A3: REGION PILLS =====
const pillY = chipY + 72;
const pills = data.regions;
let pillX = PAD;
for (const p of pills) {
  const tw = measureText(p.text, 10, fontBold);
  const pw = tw + 16;
  const hex = p.color.startsWith("#") ? parseInt(p.color.slice(1), 16) : p.color;
  drawPill(pillX, pillY, pw, 22, hex);
  renderText(canvas, p.text, pillX + pw / 2, pillY + 11 + 3, 10, fontBold, 0xffffffff, "center");
  pillX += pw + 8;
}

// ===== ZONE B: HERO CARDS 1-3 =====
const heroY = pillY + 34;
const heroH = 300;
const heroGap = 14;
const heroW = (WIDTH - 2 * PAD - heroGap * 2) / 3;

for (let i = 0; i < data.heroes.length; i++) {
  const h = data.heroes[i];
  const x = PAD + i * (heroW + heroGap);
  const y = heroY;

  // Card bg
  canvas.fillRect(x, y, heroW, heroH, C_CARD_BG);
  canvas.fillRect(x, y, heroW, 1, C_BORDER);
  canvas.fillRect(x, y, 1, heroH, C_BORDER);
  canvas.fillRect(x + heroW - 1, y, 1, heroH, C_BORDER);
  canvas.fillRect(x, y + heroH - 1, heroW, 1, C_BORDER);

  // Image block (top 52%)
  const imgH = heroH * 0.52;
  const imgColor = i === 0 ? 0xff1a2a3c : (i === 1 ? 0xff2b4a6a : 0xff8a1c1c);
  canvas.fillRect(x, y, heroW, imgH, imgColor);
  drawHeroIllustration(canvas, x, y, heroW, imgH, i);

  // Region chip (overlaps image bottom-left)
  const regionText = h.region.split(" · ")[0];
  const rw = measureText(regionText, 9, fontBold) + 14;
  canvas.fillRect(x + 10, y + imgH - 22, rw, 20, 0xff000000);
  renderText(canvas, regionText, x + 10 + rw / 2, y + imgH - 22 + 10 + 3, 9, fontBold, 0xffffffff, "center");

  // Title (word-wrapped within card width)
  renderWrapped(canvas, h.title, x + 12, y + imgH + 16, 20, fontDisp, C_INK, heroW - 24, 24, 2);

  // Body
  const bodyMaxW = heroW - 24;
  const bodyStartY = y + imgH + 16 + 48;
  renderWrapped(canvas, h.body, x + 12, bodyStartY, 10, fontReg, C_MUTED, bodyMaxW, 12, 3);

  // Number badge (bottom-right)
  const num = (i + 1).toString();
  const nw = measureText(num, 16, fontBold);
  renderText(canvas, num, x + heroW - 26, y + heroH - 24, 16, fontBold, C_ACCENT);
}

// ===== ZONE C: GRID CARDS 4-13 =====
const gridY = heroY + heroH + 22;
const cardW = (WIDTH - 2 * PAD - 4 * 10) / 5;
const cardH = 130;
const gridGap = 10;

for (let i = 0; i < data.grid.length; i++) {
  const g = data.grid[i];
  const col = i % 5;
  const row = Math.floor(i / 5);
  const x = PAD + col * (cardW + gridGap);
  const y = gridY + row * (cardH + gridGap);

  canvas.fillRect(x, y, cardW, cardH, C_CARD_BG);
  canvas.fillRect(x, y, cardW, 1, C_BORDER);
  canvas.fillRect(x, y, 1, cardH, C_BORDER);
  canvas.fillRect(x + cardW - 1, y, 1, cardH, C_BORDER);
  canvas.fillRect(x, y + cardH - 1, cardW, 1, C_BORDER);

  const hex = g.color.startsWith("#") ? parseInt(g.color.slice(1), 16) : g.color;
  const rw = measureText(g.region, 9, fontBold) + 12;
  canvas.fillRect(x + 8, y + 8, rw, 18, hex);
  renderText(canvas, g.region, x + 8 + rw / 2, y + 8 + 9 + 3, 9, fontBold, 0xffffffff, "center");

  renderText(canvas, g.tag, x + 8, y + 34, 11, fontBold, C_INK);
  renderWrapped(canvas, g.body, x + 8, y + 54, 9, fontReg, C_MUTED, cardW - 16, 11, 3);

  const num = (i + 4).toString();
  renderText(canvas, num, x + cardW - 20, y + cardH - 20, 14, fontBold, C_ACCENT);
}

// ===== ZONE D: STORIES 14-16 =====
const storyY = gridY + 2 * (cardH + gridGap) + 22;
const storyW = (WIDTH - 2 * PAD - 2 * 10) / 3;
const storyH = 150;

for (let i = 0; i < data.stories.length; i++) {
  const s = data.stories[i];
  const x = PAD + i * (storyW + 10);
  const y = storyY;

  canvas.fillRect(x, y, storyW, storyH, C_CARD_BG);
  canvas.fillRect(x, y, storyW, 1, C_BORDER);
  canvas.fillRect(x, y, 1, storyH, C_BORDER);
  canvas.fillRect(x + storyW - 1, y, 1, storyH, C_BORDER);
  canvas.fillRect(x, y + storyH - 1, storyW, 1, C_BORDER);

  const hex = s.color.startsWith("#") ? parseInt(s.color.slice(1), 16) : s.color;
  const tw = measureText(s.tag, 9, fontBold) + 12;
  canvas.fillRect(x + 8, y + 8, tw, 16, hex);
  renderText(canvas, s.tag, x + 8 + 6, y + 8 + 8 + 2, 9, fontBold, 0xffffffff);

  renderWrapped(canvas, s.title, x + 8, y + 34, 15, fontDisp, C_INK, storyW - 16, 18, 2);
  renderWrapped(canvas, s.body, x + 8, y + 34 + 36, 9, fontReg, C_MUTED, storyW - 16, 11, 3);

  const num = (i + 14).toString();
  renderText(canvas, num, x + storyW - 20, y + storyH - 20, 14, fontBold, C_ACCENT);
}

// ===== ZONE E: MAP + DATE CHECK =====
const mapY = storyY + storyH + 22;
const mapH = 170;

// Map panel (left, 340 wide)
canvas.fillRect(PAD, mapY, 340, mapH, C_MAP_BG);
canvas.fillRect(PAD, mapY, 340, 1, C_BORDER);
canvas.fillRect(PAD, mapY, 1, mapH, C_BORDER);
canvas.fillRect(PAD + 340 - 1, mapY, 1, mapH, C_BORDER);
canvas.fillRect(PAD, mapY + mapH - 1, 340, 1, C_BORDER);

renderText(canvas, "WHERE IT HAPPENED", PAD, mapY + 16, 12, fontBold, C_INK);

// Continent silhouettes (gray blocks)
const conts = [
  {x: 60, y: mapY + 44, w: 72, h: 28},
  {x: 132, y: mapY + 46, w: 56, h: 26},
  {x: 152, y: mapY + 34, w: 82, h: 40},
  {x: 202, y: mapY + 62, w: 40, h: 20},
  {x: 252, y: mapY + 49, w: 36, h: 22},
];
for (const c of conts) canvas.fillRect(c.x, c.y, c.w, c.h, C_MAP_LAND);

// Numbered pins 1-16 across map + date check
const pinColor = C_ACCENT;
const pins = [
  {n:"1", x:90,  y:mapY+52}, {n:"2", x:150, y:mapY+60}, {n:"3", x:200, y:mapY+70},
  {n:"4", x:70,  y:mapY+90}, {n:"5", x:120, y:mapY+96}, {n:"6", x:170, y:mapY+100},
  {n:"7", x:220, y:mapY+104}, {n:"8", x:75,  y:mapY+130}, {n:"9", x:130, y:mapY+132},
  {n:"10",x:185, y:mapY+136}
];
for (const p of pins) {
  const r = 7;
  canvas.fillRect(p.x - r/2, p.y - r, r, r*2, pinColor);
  renderText(canvas, p.n, p.x - 4, p.y - 6, 8, fontBold, 0xffffffff);
}

// Date check box (right)
const dcX = PAD + 340 + 10;
const dcW = WIDTH - 2 * PAD - 340 - 10;
canvas.fillRect(dcX, mapY, dcW, mapH, C_MAP_BG);
canvas.fillRect(dcX, mapY, dcW, 1, C_ACCENT);
canvas.fillRect(dcX, mapY, 1, mapH, C_ACCENT);
canvas.fillRect(dcX + dcW - 1, mapY, 1, mapH, C_ACCENT);
canvas.fillRect(dcX, mapY + mapH - 1, dcW, 1, C_ACCENT);

renderText(canvas, "DATE CHECK", dcX + 12, mapY + 18, 12, fontBold, C_ACCENT);
renderWrapped(canvas, data.dateCheck, dcX + 12, mapY + 44, 9, fontReg, C_INK, dcW - 24, 12, 6);

// Footer
renderText(canvas, "Every story happened, or was first reported, on Friday 20 November 2026. Officials' counts are attributed.",
  PAD, HEIGHT - 16, 8, fontReg, C_MUTED);

// ===== OUTPUT =====
await writePNG(canvas, "news-image.png");
console.log("Generated news-image.png");

// ===== HERO ILLUSTRATIONS =====
// Drawn inside each hero image block using only fillRect (no image deps).
function drawHeroIllustration(ctx: Canvas, x: number, y: number, w: number, h: number, i: number) {
  if (i === 0) {
    // Kyiv: bridge across a river — two towers, suspension cables, deck, river beneath.
    const cx = x + w / 2;
    const riverY = y + h * 0.62;
    const deckY = y + h * 0.42;
    const towerH = h * 0.45;
    // River
    ctx.fillRect(x, riverY, w, (y + h) - riverY, 0xff2a4a6a);
    // Deck
    ctx.fillRect(x + w * 0.08, deckY - 3, w * 0.84, 6, 0xff555555);
    // Towers
    ctx.fillRect(cx - w * 0.16, deckY - towerH, w * 0.05, towerH, 0xff777777);
    ctx.fillRect(cx + w * 0.11, deckY - towerH, w * 0.05, towerH, 0xff777777);
    // Cables (simple V lines as thin rects drawn as filled polys approximated)
    // cable from tower top to deck anchor
    drawLine(ctx, cx - w * 0.16, deckY - towerH, cx - w * 0.04, deckY, 0xff333333);
    drawLine(ctx, cx + w * 0.11, deckY - towerH, cx + w * 0.04, deckY, 0xff333333);
  } else if (i === 1) {
    // Cyclone: spiral eye over a landmass.
    const cx = x + w / 2;
    const cy = y + h * 0.5;
    const landY = y + h * 0.72;
    ctx.fillRect(x, landY, w, (y + h) - landY, 0xff5a7a3a); // land
    // Eye
    ctx.fillRect(cx - 6, cy - 6, 12, 12, 0xff1a1a1a);
    // Spiral arms (drawn as thick curved rects approximated by a few rects)
    for (let a = 0; a < 360; a += 45) {
      const r = (a / 90) * 14 + 16;
      const rad = (a * Math.PI) / 180;
      const px = cx + Math.cos(rad) * r;
      const py = cy + Math.sin(rad) * r;
      ctx.fillRect(px - 2, py - 2, 4, 4, 0xff222222);
    }
  } else {
    // Markets: falling chart with bars.
    const bx = x + w * 0.1;
    const bw = w * 0.8;
    const by = y + h * 0.8;
    const maxH = h * 0.55;
    const vals = [0.9, 0.85, 0.7, 0.55, 0.4, 0.25, 0.15, 0.08];
    const n = vals.length;
    const step = bw / n;
    for (let k = 0; k < n; k++) {
      const bh = maxH * vals[k];
      const barColor = k > n / 2 ? 0xffc62828 : 0xff1a2a3c;
      ctx.fillRect(bx + k * step + 2, by - bh, step - 4, bh, barColor);
    }
    // falling line
    drawLine(ctx, bx + 2, by - maxH * vals[0], bx + bw - 2, by - maxH * vals[vals.length - 1], 0xffc62828);
  }
}

// Draw a 1px-thick line by filling a thin rotated rectangle (approx).
function drawLine(ctx: Canvas, x0: number, y0: number, x1: number, y1: number, color: number) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) return;
  const ux = dx / len;
  const uy = dy / len;
  // perpendicular
  const px = -uy;
  const py = ux;
  const t = 1.2;
  const pts = [
    {x: x0 + px * t, y: y0 + py * t},
    {x: x0 - px * t, y: y0 - py * t},
    {x: x1 - px * t, y: y1 - py * t},
    {x: x1 + px * t, y: y1 + py * t},
  ];
  fillPolygon(ctx, pts, color);
}
