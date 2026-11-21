// Full news image generator per spec — real text via opentype.js
// Layout mirrors: broadsheet with masthead, stat chips, region pills, hero cards, grid cards, stories, map, date check
import { Canvas, writePNG } from "./canvas.ts";
import opentype from "opentype.js";
import { readFileSync } from "node:fs";
import path from "node:path";

const WIDTH = 1024;
const HEIGHT = 1024;
const canvas = new Canvas(WIDTH, HEIGHT);

// ===== COLORS =====
const C_PAPER   = 0xfffafafa;
const C_INK     = 0xff1a1a1a;
const C_ACCENT  = 0xffc62828;
const C_BORDER  = 0xffe0e0e0;
const C_CARD_BG = 0xffffffff;
const C_MUTED   = 0xff666666;

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
  // Simple recursive subdivision
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
  // Build edges
  const edges: {y0:number,y1:number,x0:number,x1:number,dxdy:number}[] = [];
  let minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    if (Math.abs(a.y - b.y) < 0.0001) continue; // horizontal edge
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

  // Active edge table
  for (let y = top; y <= bottom; y++) {
    const intersections: number[] = [];
    for (const e of edges) {
      if (y >= e.y0 && y < e.y1) {
        const t = (y - e.y0) / (e.y1 - e.y0);
        intersections.push(e.x0 + (e.x1 - e.x0) * t);
      }
    }
    intersections.sort((a,b) => a - b);
    // Even-odd fill: fill between pairs
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
  // Compute total width
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

    // Split into sub-paths and fill each
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
        // pts[0] is already the last point, skip it
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

// ===== LOAD DATA =====
const data = JSON.parse(readFileSync("news-data.json", "utf-8"));

// ===== BACKGROUND =====
canvas.fillRect(0, 0, WIDTH, HEIGHT, C_PAPER);

// ===== ZONE 0: TOP BAR =====
const topBarH = 28;
canvas.fillRect(0, 0, WIDTH, topBarH, C_INK);
renderText(canvas, "THE WORLD IN ONE DAY", 20, 18, 11, fontBold, C_PAPER);
renderText(canvas, "16 STORIES · 7 REGIONS · EVERY ONE DATED FRIDAY 20 NOVEMBER 2026",
  WIDTH - 20, 18, 11, fontBold, C_PAPER, "right");

// ===== ZONE A: MASTHEAD =====
const mastheadY = 60;
renderText(canvas, "Friday 20 November 2026", 20, mastheadY, 58, fontDisp, C_INK);

const subY = mastheadY + 80;
const subText = "Russian missiles hit Kyiv's bridges · Cyclone Akvan slams eastern India · AI sell-off sinks Asia's markets · UK and EU seal a deal";
renderText(canvas, subText, 20, subY, 15, fontReg, C_MUTED);
canvas.fillRect(0, subY + 24, WIDTH, 1, C_BORDER);

// ===== ZONE A2: STAT CHIPS =====
const chipY = subY + 44;
const chips = [
  { val: "3",    label: "Kyiv bridges struck by Russian missiles" },
  { val: "300,000+", label: "people evacuated ahead of Cyclone Akvan" },
  { val: "-5.6%", label: "Taiwan stock index drop in AI sell-off" },
  { val: "2.3%", label: "Japan annual consumer inflation rate" },
  { val: "$6B",  label: "Kenya South Lokichar oil project value" },
  { val: "5",    label: "Houthi drones intercepted by Saudi defenses" },
];
const chipW = (WIDTH - 40) / chips.length - 8;
let chipX = 20;
for (const chip of chips) {
  renderText(canvas, chip.val, chipX + chipW/2, chipY, 26, fontDisp, C_ACCENT, "center");
  renderText(canvas, chip.label, chipX + chipW/2, chipY + 32, 11, fontReg, C_MUTED, "center");
  chipX += chipW + 8;
}

// ===== ZONE A3: REGION PILLS =====
const pillY = chipY + 84;
const pills = [
  { text: "EUROPE 4",   color: 0xff3f51b5 },
  { text: "ASIA-PACIFIC 3", color: 0xffc62828 },
  { text: "WORLD 2",    color: 0xff455a64 },
  { text: "MIDDLE EAST 2", color: 0xfff9a825 },
  { text: "AMERICAS 2", color: 0xff1976d2 },
  { text: "SCIENCE 2",  color: 0xff7b1fa2 },
  { text: "AFRICA 1",   color: 0xff388e3c },
];
const pillPadX = 14;
const pillH = 24;
let pillX = 20;
for (const pill of pills) {
  const tw = measureText(pill.text, 11, fontBold);
  const pw = tw + pillPadX * 2;
  canvas.fillRect(pillX, pillY, pw, pillH, pill.color);
  renderText(canvas, pill.text, pillX + pw/2, pillY + pillH/2 + 2, 11, fontBold, 0xffffffff, "center");
  pillX += pw + 10;
}

// ===== ZONE B: HERO CARDS 1-3 =====
const heroY = pillY + pillH + 22;
const heroH = 320;
const heroGap = 16;
const heroW = (WIDTH - 40 - heroGap * 2) / 3;

const heroes = [
  { region: "KYIV, UKRAINE · WAR", title: "Russian Missiles Hit Kyiv's Bridges, Cutting Dnipro Crossings", color: 0xff1a2a3c },
  { region: "ODISHA, INDIA · CYCLONE", title: "Cyclone Akvan Slams Eastern India With 140 km/h Winds", color: 0xff2b4a6a },
  { region: "TAIPEI · SEOUL · TOKYO · MARKETS", title: "AI Stock Sell-Off Sinks Asian Tech Markets in Friday Rout", color: 0xff8a1c1c },
];
const heroBodies = [
  "Three strategic bridges across the Dnipro river struck in early morning raids; emergency services report heavy structural damage and transport disruptions.",
  "Category 3 storm makes landfall near Puri, bringing torrential storm surges and widespread blackouts; 300,000 evacuated.",
  "Heavy losses across Taiwan, South Korea, and Japan as major chipmakers and AI hardware suppliers suffer sharp valuation cuts.",
];

for (let i = 0; i < 3; i++) {
  const h = heroes[i];
  const x = 20 + i * (heroW + heroGap);
  const y = heroY;

  // Image block
  canvas.fillRect(x, y, heroW, heroH * 0.55, h.color);
  canvas.fillRect(x, y + heroH * 0.55, heroW, heroH * 0.45, C_CARD_BG);

  // Region chip
  const regionText = h.region.split(" · ")[0];
  const cw = measureText(regionText, 11, fontBold) + 14;
  canvas.fillRect(x + 10, y + 12, cw, 20, 0xff000000);
  renderText(canvas, regionText, x + 10 + cw/2, y + 12 + 10 + 2, 11, fontBold, 0xffffffff, "center");

  // Title
  renderText(canvas, h.title, x + 12, y + heroH * 0.55 + 18, 22, fontDisp, C_INK);

  // Body
  const words = heroBodies[i].split(" ");
  let lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const t = cur ? cur + " " + w : w;
    if (measureText(t, 12, fontReg) > heroW - 24) { if (cur) lines.push(cur); cur = w; }
    else cur = t;
  }
  if (cur) lines.push(cur);
  let ly = y + heroH * 0.55 + 52;
  for (const ln of lines.slice(0, 3)) {
    renderText(canvas, ln, x + 12, ly, 12, fontReg, C_MUTED);
    ly += 14;
  }

  // Number badge
  const num = (i + 1).toString();
  renderText(canvas, num, x + heroW - 28, y + heroH - 22, 18, fontBold, C_ACCENT);
}

// ===== ZONE C: GRID CARDS 4-13 =====
const gridY = heroY + heroH + 24;
const cardW = (WIDTH - 40 - 4 * 10) / 5;
const cardH = 130;
const gridGap = 10;

const grids = [
  { region: "UK · EU", tag: "UK-EU DEAL: NEW ACCORD SEALED", color: 0xff3f51b5, body: "London and Brussels sign post-Brexit security and trade pact in Brussels." },
  { region: "GENEVA · CLIMATE", tag: "COP31 CLIMATE TALKS STALL WITHOUT DEAL", color: 0xff388e3c, body: "Final day negotiations break down over emissions financing targets." },
  { region: "PRZEWODÓW · SECURITY", tag: "POLAND TRACKS MISSILE NEAR BORDER", color: 0xffc62828, body: "Air defense systems triggered by stray rocket trajectory near Ukraine border." },
  { region: "BAGHDAD · DEFENSE", tag: "IRAQI FORCES REINFORCE BORDER", color: 0xfff9a825, body: "Armored units deployed to western desert outposts citing regional security." },
  { region: "ROME · LABOR", tag: "GENERAL STRIKE PARALYZES ITALY", color: 0xff7b1fa2, body: "Transit, health, and school workers strike over budget cuts and wages." },
  { region: "TURKANA · ENERGY", tag: "KENYA OIL PROJECT ADVANCES", color: 0xff388e3c, body: "South Lokichar exploration clears final drilling permits for $8B field." },
  { region: "SAN SALVADOR · POLITICS", tag: "BUKELÉ FILES THIRD-TERM BID", color: 0xffc62828, body: "El Salvador president formally registers candidacy for 2029 re-election." },
  { region: "WASHINGTON · LAW", tag: "TRUMP BORDER ARCH ORDER HALTED", color: 0xff1976d2, body: "Federal judge blocks emergency funding use for commemorative monument." },
  { region: "JIZRAH · DEFENSE", tag: "SAUDI DEFENSES INTERCEPT 5 DRONES", color: 0xffc62828, body: "Air defense systems destroy unmanned aircraft launched toward western areas." },
];

for (let i = 0; i < grids.length; i++) {
  const g = grids[i];
  const col = i % 5;
  const row = Math.floor(i / 5);
  const x = 20 + col * (cardW + gridGap);
  const y = gridY + row * (cardH + gridGap);

  canvas.fillRect(x, y, cardW, cardH, C_CARD_BG);
  canvas.fillRect(x, y, cardW, 1, C_BORDER);
  canvas.fillRect(x, y, 1, cardH, C_BORDER);
  canvas.fillRect(x + cardW - 1, y, 1, cardH, C_BORDER);
  canvas.fillRect(x, y + cardH - 1, cardW, 1, C_BORDER);

  const rw = measureText(g.region, 9, fontBold) + 10;
  canvas.fillRect(x + 8, y + 8, rw, 18, g.color);
  renderText(canvas, g.region, x + 8 + rw/2, y + 8 + 9 + 2, 9, fontBold, 0xffffffff, "center");

  renderText(canvas, g.tag, x + 8, y + 34, 12, fontBold, C_INK);

  const words = g.body.split(" ");
  let lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const t = cur ? cur + " " + w : w;
    if (measureText(t, 10, fontReg) > cardW - 16) { if (cur) lines.push(cur); cur = w; }
    else cur = t;
  }
  if (cur) lines.push(cur);
  let ly = y + 56;
  for (const ln of lines.slice(0, 3)) {
    renderText(canvas, ln, x + 8, ly, 10, fontReg, C_MUTED);
    ly += 12;
  }

  const num = (i + 4).toString();
  renderText(canvas, num, x + cardW - 22, y + cardH - 22, 16, fontBold, C_ACCENT);
}

// ===== ZONE D: STORIES 14-16 =====
const storyY = gridY + 2 * (cardH + gridGap) + 24;
const storyW = (WIDTH - 40 - 2 * 10) / 3;
const storyH = 150;

const stories = [
  { tag: "TURIN · WORLD", title: "ATP Approves $350M+ Player Pay", body: "Men's tennis tours seal record prize pool expansion starting next season.", color: 0xff388e3c },
  { tag: "ORBIT · SCIENCE", title: "Dragon Undocks From Space Station", body: "SpaceX Crew capsule departs ISS carrying return samples and data.", color: 0xff1976d2 },
  { tag: "OUTER SOLAR SYSTEM · SCIENCE", title: "NASA Detects New Neptune Ice Belt", body: "Deep space survey maps icy trans-Neptunian objects past orbital rim.", color: 0xff7b1fa2 },
];

for (let i = 0; i < 3; i++) {
  const s = stories[i];
  const x = 20 + i * (storyW + 10);
  const y = storyY;

  canvas.fillRect(x, y, storyW, storyH, C_CARD_BG);
  canvas.fillRect(x, y, storyW, 1, C_BORDER);
  canvas.fillRect(x, y, 1, storyH, C_BORDER);
  canvas.fillRect(x + storyW - 1, y, 1, storyH, C_BORDER);
  canvas.fillRect(x, y + storyH - 1, storyW, 1, C_BORDER);

  const tw = measureText(s.tag, 9, fontBold) + 10;
  canvas.fillRect(x + 8, y + 8, tw, 16, s.color);
  renderText(canvas, s.tag, x + 8 + 5, y + 8 + 8 + 2, 9, fontBold, 0xffffffff);

  renderText(canvas, s.title, x + 8, y + 34, 15, fontDisp, C_INK);
  renderText(canvas, s.body, x + 8, y + 56, 10, fontReg, C_MUTED);

  const num = (i + 14).toString();
  renderText(canvas, num, x + storyW - 22, y + storyH - 22, 16, fontBold, C_ACCENT);
}

// ===== ZONE E: MAP + DATE CHECK =====
const mapY = storyY + storyH + 24;
const mapH = 160;

canvas.fillRect(20, mapY, 340, mapH, 0xfff5f5f5);
canvas.fillRect(20, mapY, 340, 1, C_BORDER);
canvas.fillRect(20, mapY, 1, mapH, C_BORDER);
canvas.fillRect(20 + 340 - 1, mapY, 1, mapH, C_BORDER);
canvas.fillRect(20, mapY + mapH - 1, 340, 1, C_BORDER);

renderText(canvas, "WHERE IT HAPPENED", 20, mapY + 16, 13, fontBold, C_INK);
// simple continent silhouettes
canvas.fillRect(60, mapY + 42, 70, 30, 0xffd9d9d9);
canvas.fillRect(130, mapY + 44, 55, 28, 0xffd9d9d9);
canvas.fillRect(150, mapY + 32, 80, 40, 0xffd9d9d9);
canvas.fillRect(200, mapY + 60, 40, 20, 0xffd9d9d9);
canvas.fillRect(250, mapY + 47, 35, 22, 0xffd9d9d9);
renderText(canvas, "Each number matches the story pin on this page.", 20, mapY + mapH - 16, 10, fontReg, C_MUTED);

// Date check box
const dcX = 380;
const dcW = WIDTH - 40 - dcX;
canvas.fillRect(dcX, mapY, dcW, mapH, 0xfff5f5f5);
canvas.fillRect(dcX, mapY, dcW, 1, C_ACCENT);
canvas.fillRect(dcX, mapY, 1, mapH, C_ACCENT);
canvas.fillRect(dcX + dcW - 1, mapY, 1, mapH, C_ACCENT);
canvas.fillRect(dcX, mapY + mapH - 1, dcW, 1, C_ACCENT);

renderText(canvas, "DATE CHECK", dcX + 12, mapY + 18, 13, fontBold, C_ACCENT);
renderText(canvas, "Left out as Thursday 19 November's news: the three-leader declaration in Shenzhen, the World Court's ruling on Myanmar, Tonga's drought emergency, and the migrant boat off Senegal.",
  dcX + 12, mapY + 42, 10, fontReg, C_INK);

// Footer
renderText(canvas, "Every story happened, or was first reported, on Friday 20 November 2026. Officials' counts are attributed.",
  20, HEIGHT - 16, 9, fontReg, C_MUTED);

// ===== OUTPUT =====
await writePNG(canvas, "news-image.png");
console.log("Generated news-image.png");