import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';
import { createScene } from './scene.js';
import { mountLogo, hideLogo, logoIntro, logoHover } from './logo.js';

gsap.registerPlugin(ScrollTrigger, SplitText);

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = window.matchMedia('(pointer: fine)').matches;

/* ------------------------------------------------------------------ */
/* Smooth scroll                                                        */
/* ------------------------------------------------------------------ */
const lenis = new Lenis({ duration: 1.15, smoothWheel: !reduced, wheelMultiplier: 0.95 });
lenis.stop();
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((t) => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);
ScrollTrigger.clearScrollMemory('manual');
window.scrollTo(0, 0);

$$('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    const el = id === '#top' ? 0 : $(id);
    if (el === null) return;
    e.preventDefault();
    lenis.scrollTo(el, { duration: 1.8, easing: (x) => 1 - Math.pow(1 - x, 4) });
  });
});

/* ------------------------------------------------------------------ */
/* WebGL                                                                */
/* ------------------------------------------------------------------ */
let webgl = null;
try {
  webgl = createScene($('.webgl'));
} catch (err) {
  console.warn('WebGL unavailable, continuing without 3D background', err);
  document.body.classList.add('no-webgl');
}

const anchors = [];
function measureAnchors() {
  anchors.length = 0;
  $$('[data-scene]').forEach((el) => {
    const r = el.getBoundingClientRect();
    const top = r.top + window.scrollY;
    anchors.push({ c: top + r.height / 2, s: Number(el.dataset.scene) });
  });
}
function sceneAt(scroll) {
  const c = scroll + window.innerHeight / 2;
  if (!anchors.length || c <= anchors[0].c) return anchors[0]?.s ?? 0;
  for (let i = 0; i < anchors.length - 1; i++) {
    const a = anchors[i], b = anchors[i + 1];
    if (c <= b.c) {
      const t = gsap.utils.clamp(0, 1, (c - a.c) / (b.c - a.c));
      const e = t < 0.2 ? 0 : t > 0.8 ? 1 : (t - 0.2) / 0.6;
      const s = e * e * (3 - 2 * e);
      return a.s + (b.s - a.s) * s;
    }
  }
  return anchors[anchors.length - 1].s;
}
ScrollTrigger.addEventListener('refresh', measureAnchors);

/* ------------------------------------------------------------------ */
/* Card hover light follows the pointer                                 */
/* ------------------------------------------------------------------ */
if (fine && !reduced) {
  $$('.card, .chip').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
      el.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
    });
  });
}

/* ------------------------------------------------------------------ */
/* Text splitting                                                       */
/* ------------------------------------------------------------------ */
function splitHero() {
  const word = $('.hero__word');
  const letters = word.textContent.trim().split('');
  word.innerHTML = letters.map((l) => `<span class="char-wrap"><span class="char" data-l="${l}">${l}</span></span>`).join('');
  return $$('.hero__word .char');
}

/* ------------------------------------------------------------------ */
/* Scroll animations                                                    */
/* ------------------------------------------------------------------ */
function initScroll() {
  // One calm reveal for every block: short fade-up, no 3D, no per-letter effects.
  const reveal = (targets, trigger, extra = {}) => gsap.from(targets, {
    y: 24, opacity: 0, duration: 0.8, ease: 'power2.out', stagger: 0.06,
    scrollTrigger: { trigger, start: 'top 88%' }, ...extra,
  });
  $$('.eyebrow, .h2').forEach((el) => reveal(el, el));
  reveal('.manifesto__text, .manifesto__foot .pill', '.manifesto');

  // Stats: fade in, numbers count up once
  reveal('.stat', '.stats');
  $$('.stat [data-count]').forEach((num) => {
    const end = parseFloat(num.dataset.count);
    const dec = Number(num.dataset.decimals || 0);
    const o = { v: 0 };
    gsap.to(o, {
      v: end, duration: 1.6, ease: 'power2.out',
      scrollTrigger: { trigger: '.stats', start: 'top 85%' },
      onUpdate: () => { num.textContent = o.v.toFixed(dec); },
    });
  });

  reveal('.services__track .card', '.services__track');

  // Process: line draws with scroll, steps light up as they are reached
  const path = $('.process__line path');
  gsap.fromTo(path, { strokeDashoffset: 1000 }, {
    strokeDashoffset: 0, ease: 'none',
    scrollTrigger: { trigger: '.process__steps', start: 'top 65%', end: 'bottom 65%', scrub: true },
  });
  $$('.step').forEach((step) => {
    gsap.from(step, {
      y: 24, opacity: 0, duration: 0.8, ease: 'power2.out',
      scrollTrigger: {
        trigger: step, start: 'top 80%',
        onEnter: () => step.classList.add('is-active'),
        onLeaveBack: () => step.classList.remove('is-active'),
      },
    });
  });

  // Cases: sticky 3D stack
  const cases = $$('.case');
  cases.forEach((c, i) => {
    const inner = $('.case__inner', c);
    gsap.from(inner, {
      y: 60, scale: 0.97, transformOrigin: '50% 0%', ease: 'power2.out',
      scrollTrigger: { trigger: c, start: 'top 105%', end: 'top 45%', scrub: 0.8 },
    });
    // fade in quickly so the incoming card is never a half-transparent overlay
    gsap.from(inner, {
      opacity: 0, ease: 'none',
      scrollTrigger: { trigger: c, start: 'top 100%', end: 'top 75%', scrub: 0.8 },
    });
    if (i < cases.length - 1) {
      // the card underneath recedes only while the next one actually slides over it
      // (next card's top travelling from 75% to the sticky line at 13vh), and stays readable
      gsap.to(inner, {
        scale: 0.95, y: -16, '--dim': 0.45, transformOrigin: '50% 0%', ease: 'power1.in',
        immediateRender: false,
        scrollTrigger: { trigger: cases[i + 1], start: 'top 75%', end: 'top 13%', scrub: 0.8 },
      });
    }
    ScrollTrigger.create({ trigger: c, start: 'top 60%', onEnter: () => c.classList.add('is-in') });
  });

  reveal('.chip', '.stack__grid', { stagger: 0.03 });
  reveal('.contact__title .line > span', '.contact__title', { stagger: 0.08 });
  reveal('.brief > *, .contact__info > *', '.contact__grid', { stagger: 0.05 });

  // Nav hide/show
  const nav = $('.nav');
  ScrollTrigger.create({
    start: 120, end: 'max',
    onUpdate: (self) => nav.classList.toggle('is-hidden', self.direction === 1),
    onLeaveBack: () => nav.classList.remove('is-hidden'),
  });
}

/* ------------------------------------------------------------------ */
/* Velocity marquee                                                     */
/* ------------------------------------------------------------------ */
function initMarquee() {
  const rows = $$('.marquee__row').map((row, i) => {
    const track = $('.marquee__track', row);
    const html = track.innerHTML;
    while (track.scrollWidth < window.innerWidth * 2.5) track.insertAdjacentHTML('beforeend', html);
    track.insertAdjacentHTML('beforeend', track.innerHTML);
    return { track, x: 0, dir: i % 2 ? 1 : -1, half: track.scrollWidth / 2 };
  });
  let dir = 1;
  gsap.ticker.add((_, dtMs) => {
    const v = lenis.velocity || 0;
    if (Math.abs(v) > 0.5) dir = Math.sign(v);
    const dt = dtMs / 16.67;
    rows.forEach((r) => {
      r.x += (1.1 + Math.abs(v) * 0.9) * r.dir * dir * dt;
      if (r.x <= -r.half) r.x += r.half;
      if (r.x > 0) r.x -= r.half;
      r.track.style.transform = `translate3d(${r.x}px,0,0)`;
    });
  });
  window.addEventListener('resize', () => rows.forEach((r) => { r.half = r.track.scrollWidth / 2; }));
}

/* ------------------------------------------------------------------ */
/* Misc                                                                 */
/* ------------------------------------------------------------------ */
function initMisc() {
  $('.year').textContent = new Date().getFullYear();
  const clock = $('.footer__clock');
  const fmt = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const tick = () => { clock.textContent = `Ваше время ${fmt.format(new Date())} · отвечаем за 24 ч`; };
  tick(); setInterval(tick, 1000);

  $('#brief').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const needs = fd.getAll('need').join(', ') || '—';
    const body = `Имя: ${fd.get('name')}\nКомпания: ${fd.get('company') || '—'}\nНужно: ${needs}\n\n${fd.get('message') || ''}`;
    window.location.href = `mailto:hello@scalio.dev?subject=${encodeURIComponent('Бриф с сайта Scalio')}&body=${encodeURIComponent(body)}`;
  });
}

/* ------------------------------------------------------------------ */
/* Preloader → intro                                                    */
/* ------------------------------------------------------------------ */
async function boot() {
  const chars = splitHero();
  initMisc();
  initMarquee();

  // Logos: the loader one is constructed in sync with the boot counter,
  // the nav one plays its construction during the intro and reacts to hover.
  const loaderLogo = mountLogo($('.loader__logo'));
  const loaderBuild = logoIntro(loaderLogo, { draw: 1.4 }).pause();
  const navLogo = mountLogo($('.nav__logo-host'));
  hideLogo(navLogo);
  if (fine && !reduced) logoHover(navLogo, $('.nav__logo'));

  const counter = { v: 0 };
  const numEl = $('.loader__num');
  const barEl = $('.loader__bar i');
  const loadTl = gsap.timeline();
  loadTl.to(counter, {
    v: 100, duration: reduced ? 0.3 : 1.6, ease: 'power1.inOut',
    onUpdate: () => {
      numEl.textContent = Math.round(counter.v);
      barEl.style.transform = `scaleX(${counter.v / 100})`;
      loaderBuild.progress(counter.v / 100);
    },
  });

  await Promise.all([document.fonts.ready, loadTl.then()]);

  // lines of the lead are split after fonts so wrapping is correct
  const lead = SplitText.create('.reveal-lines', { type: 'lines', mask: 'lines' });

  const intro = gsap.timeline({
    onComplete: () => {
      document.body.classList.remove('is-loading');
      $('.loader').remove();
      window.scrollTo(0, 0);
      lenis.scrollTo(0, { immediate: true, force: true });
      lenis.start();
      initScroll();
      initHeroScroll();
      ScrollTrigger.refresh();
    },
  });
  intro
    .to('.loader__inner', { opacity: 0, duration: 0.4, ease: 'power2.in' })
    .to('.loader', { opacity: 0, duration: 0.5, ease: 'power2.out' })
    .add(() => webgl && gsap.to(webgl.intro, { value: 1, duration: 2.2, ease: 'expo.out' }), '-=0.4')
    .from(chars, { yPercent: 40, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.04 }, '-=0.3')
    .addLabel('nav', '-=0.8')
    .from('.nav > *', { y: -16, opacity: 0, duration: 0.7, ease: 'power2.out', stagger: 0.06 }, 'nav')
    .from('.hero__meta span', { y: 12, opacity: 0, duration: 0.7, ease: 'power2.out' }, 'nav')
    .from(lead.lines, { yPercent: 100, duration: 0.8, ease: 'power3.out', stagger: 0.06 }, 'nav+=0.1')
    .from('.hero__cta > *', { y: 16, opacity: 0, duration: 0.7, ease: 'power2.out', stagger: 0.08 }, 'nav+=0.2')
    .call(() => logoIntro(navLogo, { draw: 0.9 }), null, 'nav+=0.1');
}

function initHeroScroll() {
  gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.6 } })
    .to('.hero__title', { yPercent: -30, opacity: 0, ease: 'none' }, 0)
    .to('.hero__bottom, .hero__meta', { y: -60, opacity: 0, ease: 'none' }, 0);
}

/* ------------------------------------------------------------------ */
/* Render loop                                                          */
/* ------------------------------------------------------------------ */
measureAnchors();
window.addEventListener('resize', () => ScrollTrigger.refresh());
gsap.ticker.add(() => {
  if (!webgl) return;
  webgl.setVelocity(lenis.velocity || 0);
  webgl.setProgress(sceneAt(window.scrollY));
  webgl.render();
});

boot();
