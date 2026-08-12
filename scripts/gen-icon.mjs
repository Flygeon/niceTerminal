// Generates the 1024×1024 app-icon source PNG with no external dependencies
// (pure Node: zlib + hand-rolled PNG encoder). Run: node scripts/gen-icon.mjs
// Then: npx @tauri-apps/cli icon src-tauri/icons/icon-source.png -o src-tauri/icons

import zlib from "node:zlib";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DESIGN = 1024; // design-space size (tauri recommends ≥1024 square)

// --- minimal PNG encoder (8-bit RGBA) ---
let CRC_TABLE = null;
function crc32(buf) {
  if (!CRC_TABLE) {
    CRC_TABLE = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      CRC_TABLE[n] = c;
    }
  }
  let c = ~0;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return ~c >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePng(size, pixelAt) {
  const stride = size * 4 + 1;
  const raw = Buffer.alloc(size * stride);
  let off = 0;
  for (let y = 0; y < size; y++) {
    raw[off++] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixelAt(x, y);
      raw[off++] = r;
      raw[off++] = g;
      raw[off++] = b;
      raw[off++] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// --- signed distance helpers (design-space units) ---
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp = (a, b, t) => a + (b - a) * t;

function roundedRectSDF(px, py, cx, cy, halfW, halfH, radius) {
  const dx = Math.abs(px - cx) - (halfW - radius);
  const dy = Math.abs(py - cy) - (halfH - radius);
  const ax = Math.max(dx, 0);
  const ay = Math.max(dy, 0);
  return Math.hypot(ax, ay) + Math.min(Math.max(dx, dy), 0) - radius;
}

function segmentDist(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  const len2 = abx * abx + aby * aby;
  let t = len2 === 0 ? 0 : (apx * abx + apy * aby) / len2;
  t = clamp(t, 0, 1);
  return Math.hypot(px - (ax + abx * t), py - (ay + aby * t));
}

// --- artwork ---
// Gradient background: deep M3 purple.
const C1 = [0x15, 0x12, 0x1f];
const C2 = [0x4b, 0x36, 0x96];
const WHITE = [0xf5, 0xef, 0xff];

// Rounded-square canvas.
const MARGIN = 70;
const HALF = DESIGN / 2 - MARGIN;
const RADIUS = 170;

// Chevron "❯" prompt glyph.
const STROKE_HALF = 26;
const P1 = [300, 400];
const P2 = [520, 500];
const P3 = [300, 600];

// Underscore cursor.
const CURSOR_CX = 676;
const CURSOR_HALF_W = 95;
const CURSOR_HALF_H = 38;
const CURSOR_R = 18;

function pixelAt(size) {
  const scale = size / DESIGN;
  return (x, y) => {
    const u = x / scale;
    const v = y / scale;

    // Canvas coverage (1px AA).
    const d = roundedRectSDF(u, v, DESIGN / 2, DESIGN / 2, HALF, HALF, RADIUS);
    const canvasA = clamp(0.5 - d, 0, 1);
    if (canvasA <= 0) return [0, 0, 0, 0];

    // Gradient background.
    const t = clamp((u / DESIGN + v / DESIGN) / 2, 0, 1);
    const bg = [
      Math.round(lerp(C1[0], C2[0], t)),
      Math.round(lerp(C1[1], C2[1], t)),
      Math.round(lerp(C1[2], C2[2], t)),
    ];

    // Chevron.
    const gd = Math.min(
      segmentDist(u, v, P1[0], P1[1], P2[0], P2[1]),
      segmentDist(u, v, P2[0], P2[1], P3[0], P3[1]),
    );
    const chevronA = clamp(0.5 - (gd - STROKE_HALF), 0, 1);

    // Cursor block.
    const cd = roundedRectSDF(u, v, CURSOR_CX, DESIGN / 2, CURSOR_HALF_W, CURSOR_HALF_H, CURSOR_R);
    const cursorA = clamp(0.5 - cd, 0, 1) * 0.9;

    const glyphA = Math.max(chevronA, cursorA);
    const r = Math.round(lerp(bg[0], WHITE[0], glyphA));
    const g = Math.round(lerp(bg[1], WHITE[1], glyphA));
    const b = Math.round(lerp(bg[2], WHITE[2], glyphA));
    const a = Math.round(canvasA * 255);
    return [r, g, b, a];
  };
}

function main() {
  const size = Number(process.argv[2]) || DESIGN;
  if (size < 64) throw new Error("size must be ≥64");
  const png = encodePng(size, pixelAt(size));
  const here = path.dirname(fileURLToPath(import.meta.url));
  const outDir = path.resolve(here, "../src-tauri/icons");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "icon-source.png");
  fs.writeFileSync(outPath, png);
  console.log(`Wrote ${size}x${size} source icon → ${outPath}`);
}

main();
