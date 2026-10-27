import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { createScene } from './scene.js';
import { mountLogo, hideLogo, logoIntro, logoHover } from './logo.js';
import { METRICS } from './logo-markup.js';

gsap.registerPlugin(ScrollTrigger);

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const SVGNS = 'http://www.w3.org/2000/svg';

/* ---------------- smooth scroll + WebGL backdrop ---------------- */
const lenis = new Lenis({ duration: 1.1, smoothWheel: !reduced });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((t) => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);

let webgl = null;
try {
  webgl = createScene($('.webgl'));
  gsap.to(webgl.intro, { value: 1, duration: 3, ease: 'expo.out', delay: 0.2 });
} catch (err) {
  console.warn('WebGL unavailable, continuing without 3D background', err);
}
const sceneState = { v: 0 };
ScrollTrigger.create({
  start: 0, end: 'max',
  onUpdate: (self) => { sceneState.v = self.progress * 6; },
});
gsap.ticker.add(() => {
  if (!webgl) return;
  webgl.setVelocity(lenis.velocity || 0);
  webgl.setProgress(sceneState.v);
  webgl.render();
});

/* ---------------- nav + hero logo ---------------- */
const navLogo = mountLogo($('.nav__logo-host'));
logoHover(navLogo, $('.nav__logo'));

const hero = mountLogo($('.b-hero__logo'));
const nav = $('.nav');
ScrollTrigger.create({
  start: 120, end: 'max',
  onUpdate: (self) => nav.classList.toggle('is-hidden', self.direction === 1),
  onLeaveBack: () => nav.classList.remove('is-hidden'),
});

let heroIntro = logoIntro(hero, { draw: 1.5 }).delay(0.4);

// idle: a light pulse travels the S every few seconds once the intro is done
const idle = gsap.timeline({ repeat: -1, repeatDelay: 3.5, paused: true })
  .set(hero.spark, { opacity: 1, strokeDashoffset: 0.08, autoRound: false })
  .to(hero.spark, { strokeDashoffset: -1, duration: 1.3, ease: 'power2.inOut', autoRound: false })
  .set(hero.spark, { opacity: 0 })
  .to(hero.tittle, { rotation: '+=90', duration: 0.5, ease: 'back.inOut(2.4)' }, '-=0.35');
heroIntro.eventCallback('onComplete', () => idle.restart(true));

$('#replay').addEventListener('click', () => {
  idle.pause();
  heroIntro.kill();
  heroIntro = logoIntro(hero, { draw: 1.5 });
  heroIntro.eventCallback('onComplete', () => idle.restart(true));
});

gsap.to('.b-hero__stage', {
  scale: 0.82, yPercent: -12, opacity: 0.3, ease: 'none',
  scrollTrigger: { trigger: '.b-hero', start: 'top top', end: 'bottom top', scrub: true },
});

/* ---------------- construction overlay ---------------- */
function el(tag, attrs, parent) {
  const n = document.createElementNS(SVGNS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  parent.appendChild(n);
  return n;
}

function buildConstruction(svg) {
  const M = METRICS;
  const vb = M.viewBox;
  const right = vb.x + vb.w;
  const g = el('g', { class: 'construct' }, svg);
  svg.insertBefore(g, svg.querySelector('defs').nextSibling);

  const grid = el('g', { class: 'c-grid' }, g);
  for (let x = Math.ceil(vb.x / 4) * 4; x <= right; x += 4) el('line', { x1: x, y1: 0, x2: x, y2: 64 }, grid);
  for (let y = 0; y <= 64; y += 4) el('line', { x1: vb.x, y1: y, x2: right, y2: y }, grid);

  const guides = [
    { y: M.markBox.y, label: 'mark top' },
    { y: M.ascender, label: 'ascender' },
    { y: M.xHeight, label: 'x-height' },
    { y: M.baseline, label: 'baseline' },
  ];
  const gl = el('g', { class: 'c-guides' }, g);
  guides.forEach((d) => {
    el('line', { x1: vb.x, y1: d.y, x2: right, y2: d.y, class: 'c-line' }, gl);
    const t = el('text', { x: right - 1, y: d.y - 0.8, class: 'c-label', 'text-anchor': 'end' }, gl);
    t.textContent = `${d.label} · ${d.y}`;
  });

  const geo = el('g', { class: 'c-geo' }, g);
  M.arcs.forEach((a) => {
    el('circle', { cx: a.cx, cy: a.cy, r: a.r, class: 'c-circle', pathLength: 1 }, geo);
    el('circle', { cx: a.cx, cy: a.cy, r: a.r + M.stroke / 2, class: 'c-circle c-circle--faint', pathLength: 1 }, geo);
    el('circle', { cx: a.cx, cy: a.cy, r: 0.7, class: 'c-dot' }, geo);
    const t = el('text', { x: a.cx + 1.4, y: a.cy - 1, class: 'c-label' }, geo);
    t.textContent = `r${a.r}`;
  });

  const notes = el('g', { class: 'c-notes' }, g);
  // stroke weight bracket on the top bar
  const sx = 46.5;
  el('path', { d: `M${sx} ${8 - M.stroke / 2}h1.5M${sx + 0.75} ${8 - M.stroke / 2}V${8 + M.stroke / 2}M${sx} ${8 + M.stroke / 2}h1.5`, class: 'c-dim' }, notes);
  el('text', { x: sx + 2.6, y: 9, class: 'c-label c-label--accent' }, notes).textContent = `stroke ${M.stroke}`;
  // pixel growth sequence
  [...M.pixels, { x: 20, y: M.baseline - M.stroke, s: M.stroke }].forEach((p, i) => {
    el('rect', { x: p.x, y: p.y, width: p.s, height: p.s, class: 'c-box' }, notes);
    el('text', { x: p.x + p.s / 2, y: M.baseline + 2.6, class: 'c-label c-label--accent', 'text-anchor': 'middle' }, notes)
      .textContent = String(p.s);
    if (i < 2) el('text', { x: p.x + p.s + 0.9, y: M.baseline + 2.6, class: 'c-label' }, notes).textContent = '→';
  });
  // tittle = stem width
  const t = M.tittle;
  el('rect', { x: t.x, y: t.y, width: t.s, height: t.s, class: 'c-box' }, notes);
  el('text', { x: t.x + t.s + 1.2, y: t.y + 3, class: 'c-label c-label--accent' }, notes).textContent = '□ = stem';
  return g;
}

const construct = buildConstruction(hero.svg);
const cParts = {
  grid: $$('.c-grid line', construct),
  lines: $$('.c-guides line', construct),
  labels: $$('.c-label', construct),
  circles: $$('.c-circle', construct),
  marks: $$('.c-dot, .c-box, .c-dim', construct),
};
gsap.set(construct, { autoAlpha: 0 });
gsap.set(cParts.circles, { strokeDasharray: '1 1', strokeDashoffset: 1, autoRound: false });

let constructTl = null;
$('#construct').addEventListener('click', (e) => {
  const on = e.currentTarget.getAttribute('aria-pressed') !== 'true';
  e.currentTarget.setAttribute('aria-pressed', String(on));
  e.currentTarget.textContent = on ? '⌗ Скрыть конструкцию' : '⌗ Показать конструкцию';
  constructTl?.kill();
  if (on) {
    constructTl = gsap.timeline()
      .set(construct, { autoAlpha: 1 })
      .to(['.b-hero__logo .sc-l', '.b-hero__logo .sc-s', '.b-hero__logo .sc-px', '.b-hero__logo .sc-tittle'], { opacity: 0.28, duration: 0.5 }, 0)
      .fromTo(cParts.grid, { opacity: 0 }, { opacity: 1, duration: 0.6, stagger: { each: 0.006, from: 'start' } }, 0)
      .fromTo(cParts.lines, { scaleX: 0, transformOrigin: '0% 50%' }, { scaleX: 1, duration: 0.9, ease: 'expo.inOut', stagger: 0.08 }, 0.15)
      .to(cParts.circles, { strokeDashoffset: 0, duration: 1.1, ease: 'power2.inOut', stagger: 0.1, autoRound: false }, 0.35)
      .fromTo(cParts.marks, { opacity: 0, scale: 0, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(2)', stagger: 0.05 }, 0.7)
      .fromTo(cParts.labels, { opacity: 0, y: 1.5 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.04 }, 0.9);
  } else {
    constructTl = gsap.timeline()
      .to(construct, { autoAlpha: 0, duration: 0.4 })
      .to(['.b-hero__logo .sc-l', '.b-hero__logo .sc-s', '.b-hero__logo .sc-px', '.b-hero__logo .sc-tittle'], { opacity: 1, duration: 0.5 }, 0)
      .set(cParts.circles, { strokeDashoffset: 1 });
  }
});

/* ---------------- motion lab ---------------- */
const introCard = mountLogo($('[data-logo="intro"]'));
let introTl = null;
const playIntroCard = () => { introTl?.kill(); introTl = logoIntro(introCard); };
hideLogo(introCard);
ScrollTrigger.create({ trigger: introCard.host, start: 'top 80%', once: true, onEnter: playIntroCard });
$('[data-replay]').addEventListener('click', playIntroCard);

const hoverCard = mountLogo($('[data-logo="hover"]'));
logoHover(hoverCard, hoverCard.host.closest('.b-mcard'));

const scrubCard = mountLogo($('[data-logo="scrub"]'));
const scrubTl = logoIntro(scrubCard, { draw: 1.4 }).pause(0);
const range = $('#scrub');
const rangeVal = $('#scrub-val');
const setScrub = (v) => {
  scrubTl.progress(v);
  rangeVal.textContent = `${Math.round(v * 100)}%`;
  range.style.setProperty('--p', `${v * 100}%`);
};
range.addEventListener('input', () => setScrub(range.value / 1000));
// demo: auto-sweep the slider once when the card comes into view, unless the user grabs it first
const sweep = { v: 0 };
const sweepTween = gsap.to(sweep, {
  v: 1, duration: 3.2, ease: 'power1.inOut', paused: true,
  onUpdate: () => { range.value = Math.round(sweep.v * 1000); setScrub(sweep.v); },
});
range.addEventListener('pointerdown', () => sweepTween.kill());
ScrollTrigger.create({ trigger: scrubCard.host, start: 'top 75%', once: true, onEnter: () => sweepTween.play() });

/* ---------------- colors ---------------- */
const toast = $('.b-toast');
$$('.b-color').forEach((b) => {
  b.addEventListener('click', async () => {
    const hex = b.dataset.hex;
    try {
      await navigator.clipboard.writeText(hex);
      toast.textContent = `Скопировано: ${hex}`;
    } catch {
      toast.textContent = hex;
    }
    gsap.fromTo(toast, { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: 'expo.out' });
    gsap.fromTo(b, { scale: 0.97 }, { scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
  });
});

/* ---------------- reveals ---------------- */
$$('.b-reveal').forEach((n) => {
  gsap.from(n, {
    y: 70, opacity: 0, rotationX: -18, transformOrigin: '50% 100%', duration: 1.1, ease: 'expo.out',
    scrollTrigger: { trigger: n, start: 'top 88%' },
  });
});
$$('.eyebrow').forEach((n) => gsap.from(n, { x: -30, opacity: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: n, start: 'top 90%' } }));
$('.year').textContent = new Date().getFullYear();
