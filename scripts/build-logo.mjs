// Generates the Scalio logo assets: outlined wordmark (Unbounded SemiBold via opentype.js),
// static SVG variants, a self-animating SVG, the favicon and the inline-markup module used by the site.
// Run: npm run logo
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import opentype from 'opentype.js';

const require = createRequire(import.meta.url);
const fontPath = require.resolve('@fontsource/unbounded/files/unbounded-latin-600-normal.woff');
const buf = readFileSync(fontPath);
const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));

/* ---------------- mark geometry (64-unit grid, stroke 9) ---------------- */
// S built from two r=12 arcs and straight bars, drawn from the bottom-left end upward.
// Bottom-left "pixels" (3 → 5.5 → stroke 9) read as a bar chart that scales into the S.
const MARK = {
  path: 'M20 56H36A12 12 0 0 0 36 32H28A12 12 0 0 1 28 8H44',
  stroke: 9,
  pixels: [
    { x: 6, y: 57.5, s: 3 },
    { x: 11.5, y: 55, s: 5.5 },
  ],
  // visual bounds: pixels start at x=6, right arc reaches 36+12+4.5, bars span y 8-4.5 … 56+4.5
  box: { x: 6, y: 3.5, w: 46.5, h: 57 },
};

const VIOLET = '#8b5cff';
const CYAN = '#22e4ff';

/* ---------------- wordmark ---------------- */
const TEXT = 'scalio';
const FS = 54; // font size in mark units
const TRACK = -0.02 * FS;
const BASELINE = 60.5; // aligns with the bottom edge of the S
const GAP = 13; // gap between mark and wordmark
const unitsToPx = FS / font.unitsPerEm;

function contours(cmds) {
  const out = [];
  let cur = null;
  for (const c of cmds) {
    if (c.type === 'M') { cur = [c]; out.push(cur); } else cur.push(c);
  }
  return out;
}
function bbox(cmds) {
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  for (const c of cmds) for (const [k, l] of [['x', 'y'], ['x1', 'y1'], ['x2', 'y2']]) {
    if (c[k] === undefined) continue;
    x1 = Math.min(x1, c[k]); x2 = Math.max(x2, c[k]); y1 = Math.min(y1, c[l]); y2 = Math.max(y2, c[l]);
  }
  return { x1, y1, x2, y2 };
}
const r2 = (n) => Math.round(n * 100) / 100;
function toD(cmds) {
  return cmds.map((c) => {
    switch (c.type) {
      case 'M': return `M${r2(c.x)} ${r2(c.y)}`;
      case 'L': return `L${r2(c.x)} ${r2(c.y)}`;
      case 'Q': return `Q${r2(c.x1)} ${r2(c.y1)} ${r2(c.x)} ${r2(c.y)}`;
      case 'C': return `C${r2(c.x1)} ${r2(c.y1)} ${r2(c.x2)} ${r2(c.y2)} ${r2(c.x)} ${r2(c.y)}`;
      case 'Z': return 'Z';
      default: throw new Error(`unknown command ${c.type}`);
    }
  }).join('');
}

let penX = MARK.box.x + MARK.box.w + GAP;
const letters = [];
let tittle = null;
const glyphs = font.stringToGlyphs(TEXT);
glyphs.forEach((g, i) => {
  const p = g.getPath(penX, BASELINE, FS);
  let cmds = p.commands;
  if (TEXT[i] === 'i') {
    // replace the round tittle with a square "pixel" — the brand's scaling unit —
    // and square off the notch the font leaves at the top of the stem
    const cs = contours(cmds);
    const top = cs.reduce((a, b) => (bbox(a).y1 < bbox(b).y1 ? a : b));
    const tb = bbox(top);
    const st = bbox(cs.find((c) => c !== top));
    const s = st.x2 - st.x1;
    tittle = { x: r2(st.x1), y: r2(tb.y2 - s), s: r2(s) };
    cmds = [
      { type: 'M', x: st.x1, y: st.y2 }, { type: 'L', x: st.x1, y: st.y1 },
      { type: 'L', x: st.x2, y: st.y1 }, { type: 'L', x: st.x2, y: st.y2 }, { type: 'Z' },
    ];
  }
  letters.push({ ch: TEXT[i], d: toD(cmds), x: penX, box: bbox(cmds) });
  let adv = g.advanceWidth * unitsToPx + TRACK;
  if (i < glyphs.length - 1) adv += font.getKerningValue(g, glyphs[i + 1]) * unitsToPx;
  penX += adv;
});
const wordRight = r2(penX - TRACK);
const PAD = 3;
const B = MARK.box;
const FULL = { x: B.x - PAD, y: 0, w: r2(wordRight + PAD - (B.x - PAD)), h: 64 };
const MARK_VB = { x: B.x - PAD, y: 0, w: B.w + PAD * 2, h: 64 };

/* ---------------- builders ---------------- */
const gradDef = (id) =>
  `<linearGradient id="${id}" x1="${B.x}" y1="${B.y + B.h}" x2="${B.x + B.w}" y2="${B.y}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${VIOLET}"/><stop offset="1" stop-color="${CYAN}"/></linearGradient>`;

function markEls(id, cls = false) {
  const c = (n) => (cls ? ` class="${n}"` : '');
  const px = MARK.pixels.map((p, i) => `<rect${c(`sc-px sc-px-${i}`)} x="${p.x}" y="${p.y}" width="${p.s}" height="${p.s}" fill="url(#${id})"/>`).join('');
  return `${px}<path${c('sc-s')} d="${MARK.path}" fill="none" stroke="url(#${id})" stroke-width="${MARK.stroke}" pathLength="1"/>`;
}
function wordEls(fill, id, cls = false) {
  const c = (n) => (cls ? ` class="${n}"` : '');
  const ls = letters.map((l, i) => `<path${c(`sc-l sc-l-${i}`)} d="${l.d}"/>`).join('');
  const t = `<rect${c('sc-tittle')} x="${tittle.x}" y="${tittle.y}" width="${tittle.s}" height="${tittle.s}" fill="url(#${id})"/>`;
  return `<g${c('sc-word')} fill="${fill}">${ls}</g>${t}`;
}
const svg = (vb, body, extra = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}"${extra}>${body}</svg>\n`;

mkdirSync('public/brand', { recursive: true });

const markSize = ` width="${Math.round(MARK_VB.w * 4)}" height="256"`;
const logoSize = ` width="${Math.round(FULL.w * 4)}" height="256"`;
writeFileSync('public/brand/scalio-mark.svg', svg(MARK_VB, `<defs>${gradDef('g')}</defs>${markEls('g')}`, markSize));
writeFileSync('public/brand/scalio-logo.svg', svg(FULL, `<title>Scalio</title><defs>${gradDef('g')}</defs>${markEls('g')}${wordEls('#f2f0ff', 'g')}`, logoSize));
writeFileSync('public/brand/scalio-logo-dark.svg', svg(FULL, `<title>Scalio</title><defs>${gradDef('g')}</defs>${markEls('g')}${wordEls('#05050a', 'g')}`, logoSize));
writeFileSync('public/brand/scalio-mark-mono.svg', svg(MARK_VB, `<g fill="#f2f0ff">${MARK.pixels.map((p) => `<rect x="${p.x}" y="${p.y}" width="${p.s}" height="${p.s}"/>`).join('')}</g><path d="${MARK.path}" fill="none" stroke="#f2f0ff" stroke-width="${MARK.stroke}"/>`, markSize));

// favicon: mark centred in a 64x64 rounded tile
const FAV_SCALE = 0.8;
const ftx = r2((64 - B.w * FAV_SCALE) / 2 - B.x * FAV_SCALE);
const fty = r2((64 - B.h * FAV_SCALE) / 2 - B.y * FAV_SCALE);
const fav = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs>${gradDef('g')}</defs><rect width="64" height="64" rx="16" fill="#05050a"/><g transform="translate(${ftx} ${fty}) scale(${FAV_SCALE})">${markEls('g')}</g></svg>\n`;
writeFileSync('public/favicon.svg', fav);

/* ---------------- self-animating SVG (pure CSS, loops) ---------------- */
const n = letters.length;
const css = `
.sc-px{transform-box:fill-box;transform-origin:50% 100%;animation:px 7s cubic-bezier(.2,1.6,.4,1) infinite both}
.sc-px-1{animation-delay:.12s}
.sc-s{stroke-dasharray:1 1.01;animation:draw 7s cubic-bezier(.65,0,.35,1) infinite both}
.sc-l{transform-box:fill-box;transform-origin:50% 100%;animation:rise 7s cubic-bezier(.16,1,.3,1) infinite both}
${letters.map((_, i) => `.sc-l-${i}{animation-delay:${(0.75 + i * 0.07).toFixed(2)}s}`).join('\n')}
.sc-tittle{transform-box:fill-box;transform-origin:50% 100%;animation:drop 7s cubic-bezier(.3,1.8,.5,1) infinite both;animation-delay:${(0.75 + n * 0.07 + 0.1).toFixed(2)}s}
@keyframes px{0%{transform:scale(0)}6%,88%{transform:scale(1)}94%,100%{transform:scale(0)}}
@keyframes draw{0%,3%{stroke-dashoffset:1}17%,88%{stroke-dashoffset:0}96%,100%{stroke-dashoffset:-1}}
@keyframes rise{0%{transform:translateY(40%) scaleY(.2);opacity:0}9%,86%{transform:none;opacity:1}93%,100%{transform:translateY(-30%);opacity:0}}
@keyframes drop{0%{transform:translateY(-260%) scale(.4);opacity:0}8%,84%{transform:none;opacity:1}90%,100%{transform:scale(0);opacity:0}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
`;
writeFileSync('public/brand/scalio-logo-animated.svg',
  svg(FULL, `<title>Scalio</title><style>${css.replace(/\n/g, '')}</style><defs>${gradDef('g')}</defs>${markEls('g', true)}${wordEls('#f2f0ff', 'g', true)}`, logoSize));

/* ---------------- inline markup module for the site ---------------- */
// `__ID__` is replaced per instance so several inline logos never share a gradient id.
const inline = (vb, body) => `<svg class="sc-logo" viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}" aria-hidden="true" focusable="false"><defs>${gradDef('__ID__')}</defs>${body}</svg>`;
const mod = `// AUTO-GENERATED by scripts/build-logo.mjs (npm run logo) — do not edit by hand.
const LOGO = ${JSON.stringify(inline(FULL, markEls('__ID__', true) + wordEls('currentColor', '__ID__', true)))};
const MARK = ${JSON.stringify(inline(MARK_VB, markEls('__ID__', true)))};
/** Geometry used by the brand page construction overlay (logo user units). */
export const METRICS = ${JSON.stringify({
  viewBox: FULL,
  markBox: MARK.box,
  stroke: MARK.stroke,
  arcs: [{ cx: 28, cy: 20, r: 12 }, { cx: 36, cy: 44, r: 12 }],
  pixels: MARK.pixels,
  baseline: BASELINE,
  xHeight: r2(BASELINE - font.tables.os2.sxHeight * unitsToPx),
  ascender: r2(Math.min(...letters.filter((l) => l.ch === 'l').map((l) => l.box.y1))),
  wordX: r2(letters[0].box.x1),
  wordRight,
  tittle,
})};
let seq = 0;
/** Inline SVG markup of the full lockup (word: true) or the mark only. */
export function logoMarkup({ word = true } = {}) {
  const id = \`sc-grad-\${++seq}\`;
  return (word ? LOGO : MARK).replaceAll('__ID__', id);
}
`;
writeFileSync('src/logo-markup.js', mod);

console.log('wordmark right edge', wordRight, 'tittle', tittle, 'viewBox', FULL);
