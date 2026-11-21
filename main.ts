// Minimal news image generator using filled-rectangle fallback font
import { Canvas, writePNG } from "./canvas.ts";

const WIDTH = 1024;
const HEIGHT = 1024;
const canvas = new Canvas(WIDTH, HEIGHT);

// Background
canvas.fillRect(0, 0, WIDTH, HEIGHT, 0xffffffff); // white

// Simple filled-rectangle font: each character is a 20x30 block
function drawChar(ch: string, x: number, y: number, color: number) {
  // For simplicity ignore actual shape, just draw a filled rectangle
  canvas.fillRect(x, y, 20, 30, color);
}

function drawText(text: string, x: number, y: number, color: number) {
  let cursorX = x;
  for (const ch of text) {
    if (ch === " ") {
      cursorX += 20; // space width
      continue;
    }
    drawChar(ch, cursorX, y, color);
    cursorX += 22; // advance + small gap
  }
}

// Masthead (zone A)
const masthead = "F R I D A Y N G"; // example masthead text
drawText(masthead, 100, 100, 0xff000000);

// Grid cards (zone B) – 3x3 placeholders
const cardTitles = [
  "EUROPEAN MISSILES HIT THREE KYIV BRIDGES",
  "SEVERE CYCLONIC STORM AKVAN MAKES LANDFALL",
  "ASIAN MARKETS PLUNGE ON AI SELL-OFF",
  "HEADLINE 4",
  "HEADLINE 5",
  "HEADLINE 6",
  "HEADLINE 7",
  "HEADLINE 8",
  "HEADLINE 9"
];

const cardStartX = 50;
const cardStartY = 200;
const cardWidth = 300;
const cardHeight = 150;
const cardGapX = 20;
const cardGapY = 20;

for (let i = 0; i < 9; i++) {
  const col = i % 3;
  const row = Math.floor(i / 3);
  const x = cardStartX + col * (cardWidth + cardGapX);
  const y = cardStartY + row * (cardHeight + cardGapY);
  // Card background
  canvas.fillRect(x, y, cardWidth, cardHeight, 0xffe0e0e0);
  // Title text (first few chars)
  const title = cardTitles[i].slice(0, 30);
  drawText(title, x + 10, y + 10, 0xff000000);
}

// Stories (zone C) – list below grid
const storyStartX = 50;
const storyStartY = cardStartY + 3 * (cardHeight + cardGapY) + 30;
const storyGap = 25;
const stories = [
  "Story 1: Lorem ipsum dolor sit amet.",
  "Story 2: Consectetur adipiscing elit.",
  "Story 3: Sed do eiusmod tempor.",
  "Story 4: Incididunt ut labore et dolore.",
  "Story 5: Magna aliqua.",
  "Story 6: Ut enim ad minim veniam."
];
for (let i = 0; i < stories.length; i++) {
  drawText(stories[i], storyStartX, storyStartY + i * storyGap, 0xff000000);
}

// Write PNG
await writePNG(canvas, "news-image.png");
