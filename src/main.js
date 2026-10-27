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
/* Cursor                                                               */
/* ------------------------------------------------------------------ */
const cursor = $('.cursor');
const label = $('.cursor__label');
if (fine && !reduced) {
  const dx = gsap.quickTo('.cursor__dot', 'x', { duration: 0.12, ease: 'power3' });
  const dy = gsap.quickTo('.cursor__dot', 'y', { duration: 0.12, ease: 'power3' });
  const rx = gsap.quickTo('.cursor__ring', 'x', { duration: 0.5, ease: 'power3' });
  const ry = gsap.quickTo('.cursor__ring', 'y', { duration: 0.5, ease: 'power3' });
  window.addEventListener('pointermove', (e) => {
    dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY);
    cursor.classList.add('is-visible');
  });
  document.addEventListener('pointerleave', () => cursor.classList.remove('is-visible'));
  document.addEventListener('pointerdown', () => cursor.classList.add('is-down'));
  document.addEventListener('pointerup', () => cursor.classList.remove('is-down'));
  document.addEventListener('pointerover', (e) => {
    const lab = e.target.closest('[data-cursor]');
    const hov = e.target.closest('a, button, [data-hover], [data-magnetic], label, input, textarea');
    cursor.classList.toggle('is-hover', !!hov && !lab);
    cursor.classList.toggle('is-label', !!lab);
    label.textContent = lab ? lab.dataset.cursor : '';
  });
} else {
  cursor.remove();
}

/* ------------------------------------------------------------------ */
/* Magnetic + tilt                                                      */
/* ------------------------------------------------------------------ */
if (fine && !reduced) {
  $$('[data-magnetic]').forEach((el) => {
    const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3' });
    const inner = el.querySelector('span');
    const ixTo = inner && gsap.quickTo(inner, 'x', { duration: 0.6, ease: 'power3' });
    const iyTo = inner && gsap.quickTo(inner, 'y', { duration: 0.6, ease: 'power3' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const mx = e.clientX - (r.left + r.width / 2);
      const my = e.clientY - (r.top + r.height / 2);
      xTo(mx * 0.35); yTo(my * 0.45);
      if (inner) { ixTo(mx * 0.15); iyTo(my * 0.2); }
    });
    el.addEventListener('pointerleave', () => {
      gsap.to(el, { x: 0, y: 0, duration: 1, ease: 'elastic.out(1, 0.35)', overwrite: 'auto' });
      if (inner) gsap.to(inner, { x: 0, y: 0, duration: 1, ease: 'elastic.out(1, 0.35)', overwrite: 'auto' });
    });
  });

  $$('[data-tilt]').forEach((el) => {
    const isCard = el.classList.contains('card');
    const rX = gsap.quickTo(el, 'rotationX', { duration: 0.6, ease: 'power3' });
    const rY = isCard ? null : gsap.quickTo(el, 'rotationY', { duration: 0.6, ease: 'power3' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      el.style.setProperty('--mx', `${px * 100}%`);
      el.style.setProperty('--my', `${py * 100}%`);
      rX((0.5 - py) * (isCard ? 10 : 22));
      rY && rY((px - 0.5) * 22);
    });
    el.addEventListener('pointerleave', () => { rX(0); rY && rY(0); });
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
  // Section headings: chars rise from word masks
  $$('.split-chars').forEach((h) => {
    const split = SplitText.create(h, { type: 'words,chars', mask: 'words', charsClass: 'char' });
    gsap.from(split.chars, {
      yPercent: 120, rotationX: -70, rotationZ: 6, opacity: 0, transformOrigin: '50% 100%',
      duration: 1.1, ease: 'expo.out', stagger: 0.022,
      scrollTrigger: { trigger: h, start: 'top 82%' },
    });
  });

  // Manifesto: word-by-word light-up
  const man = SplitText.create('.split-words', { type: 'words' });
  gsap.fromTo(man.words, { opacity: 0.1, filter: 'blur(6px)' }, {
    opacity: 1, filter: 'blur(0px)', stagger: 0.08, ease: 'none',
    scrollTrigger: { trigger: '.manifesto', start: 'top 70%', end: 'bottom 60%', scrub: 0.6 },
  });
  gsap.from('.manifesto__foot .pill', {
    y: 40, opacity: 0, stagger: 0.1, duration: 1, ease: 'expo.out',
    scrollTrigger: { trigger: '.manifesto__foot', start: 'top 90%' },
  });

  // Eyebrows
  $$('.eyebrow').forEach((el) => {
    gsap.from(el, { x: -30, opacity: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 90%' } });
  });

  // Stats counters
  $$('.stat').forEach((s, i) => {
    const num = $('[data-count]', s);
    const end = parseFloat(num.dataset.count);
    const dec = Number(num.dataset.decimals || 0);
    const o = { v: 0 };
    gsap.from(s, { y: 80, opacity: 0, rotationX: -40, duration: 1.2, ease: 'expo.out', delay: i * 0.08, scrollTrigger: { trigger: '.stats', start: 'top 80%' } });
    gsap.to(o, {
      v: end, duration: 2.2, ease: 'power3.out', delay: i * 0.08,
      scrollTrigger: { trigger: '.stats', start: 'top 80%' },
      onUpdate: () => { num.textContent = o.v.toFixed(dec); },
    });
  });

  // Services: pinned horizontal track with 3D card flips
  const mm = gsap.matchMedia();
  mm.add('(min-width: 821px)', () => {
    const track = $('.services__track');
    const dist = () => track.scrollWidth - window.innerWidth + window.innerWidth * 0.08;
    const tween = gsap.to(track, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: {
        trigger: '.services', pin: '.services__pin', start: 'top top',
        end: () => `+=${dist()}`, scrub: 1, invalidateOnRefresh: true,
      },
    });
    $$('.services__track .card').forEach((card) => {
      gsap.fromTo(card, { rotationY: -38, z: -260, opacity: 0.35 }, {
        rotationY: 0, z: 0, opacity: 1, ease: 'none',
        scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left 100%', end: 'left 45%', scrub: true },
      });
      gsap.fromTo(card, { rotationY: 0, z: 0 }, {
        rotationY: 32, z: -180, ease: 'none', immediateRender: false,
        scrollTrigger: { trigger: card, containerAnimation: tween, start: 'right 30%', end: 'right -5%', scrub: true },
      });
    });
    gsap.to('.services__head', {
      x: -120, opacity: 0.25, ease: 'none',
      scrollTrigger: { trigger: '.services', start: 'top top', end: () => `+=${dist() * 0.5}`, scrub: true },
    });
  });
  mm.add('(max-width: 820px)', () => {
    $$('.services__track .card').forEach((card) => {
      gsap.from(card, { y: 80, rotationX: -25, opacity: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: card, start: 'top 90%' } });
    });
  });

  // Process: line draw + steps activation
  const path = $('.process__line path');
  gsap.fromTo(path, { strokeDashoffset: 1000 }, {
    strokeDashoffset: 0, ease: 'none',
    scrollTrigger: { trigger: '.process__steps', start: 'top 65%', end: 'bottom 65%', scrub: true },
  });
  $$('.step').forEach((step) => {
    gsap.from(step, {
      x: 60, opacity: 0, rotationY: -20, duration: 1.1, ease: 'expo.out',
      scrollTrigger: {
        trigger: step, start: 'top 75%',
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
      rotationX: 28, y: 120, scale: 0.92, opacity: 0, transformOrigin: '50% 0%',
      ease: 'none',
      scrollTrigger: { trigger: c, start: 'top 105%', end: 'top 35%', scrub: true },
    });
    if (i < cases.length - 1) {
      gsap.to(inner, {
        scale: 0.86, rotationX: -14, y: -30, filter: 'brightness(0.35) blur(2px)', transformOrigin: '50% 0%', ease: 'none',
        immediateRender: false,
        scrollTrigger: { trigger: cases[i + 1], start: 'top bottom', end: 'top 18%', scrub: true },
      });
    }
    ScrollTrigger.create({ trigger: c, start: 'top 60%', onEnter: () => c.classList.add('is-in') });
  });

  // Stack chips
  gsap.from('.chip', {
    y: 60, opacity: 0, rotationX: -60, transformOrigin: '50% 100%',
    duration: 1, ease: 'expo.out', stagger: { each: 0.05, grid: 'auto', from: 'center' },
    scrollTrigger: { trigger: '.stack__grid', start: 'top 85%' },
  });

  // Contact title lines
  gsap.from('.contact__title .line > span', {
    yPercent: 110, rotationX: -50, duration: 1.3, ease: 'expo.out', stagger: 0.12,
    scrollTrigger: { trigger: '.contact__title', start: 'top 80%' },
  });
  gsap.from('.brief > *, .contact__info > *', {
    y: 50, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.07,
    scrollTrigger: { trigger: '.contact__grid', start: 'top 85%' },
  });

  // Footer giant word
  const big = SplitText.create('.footer__big span', { type: 'chars', charsClass: 'char' });
  gsap.from(big.chars, {
    yPercent: 100, rotationX: -90, opacity: 0, transformOrigin: '50% 100%', stagger: 0.05, ease: 'none',
    scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'bottom bottom', scrub: 0.8 },
  });

  // Progress rail
  const rail = $('.progress__track i');
  const num = $('.progress__num');
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: (self) => {
      gsap.set(rail, { scaleY: self.progress });
      num.textContent = String(Math.round(self.progress * 100)).padStart(2, '0');
    },
  });

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
  const skew = gsap.quickTo('.marquee', 'skewY', { duration: 0.5, ease: 'power3' });
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
    skew(gsap.utils.clamp(-4, 4, v * -0.15));
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
  const logs = $$('.loader__log li');
  const loadTl = gsap.timeline();
  loadTl
    .to(counter, {
      v: 100, duration: reduced ? 0.3 : 3, ease: 'power1.inOut',
      onUpdate: () => {
        const v = Math.round(counter.v);
        numEl.textContent = v;
        barEl.style.transform = `scaleX(${counter.v / 100})`;
        logs.forEach((li, i) => li.classList.toggle('on', v >= (i + 1) * 24));
        loaderBuild.progress(counter.v / 100);
      },
    })
    .to('.loader__logo .sc-logo', { scale: 1.04, duration: 0.25, ease: 'power2.out', yoyo: true, repeat: 1, transformOrigin: '50% 50%' });

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
      initHeroScroll(chars);
      ScrollTrigger.refresh();
    },
  });
  intro
    .to('.loader__inner', { y: -60, opacity: 0, duration: 0.6, ease: 'power3.in' })
    .to('.loader__curtain', { scaleY: 1, duration: 0.7, ease: 'expo.inOut' }, 0.2)
    .set('.loader', { background: 'transparent' })
    .set('.loader__grid', { opacity: 0 })
    .to('.loader__curtain', { yPercent: -100, duration: 0.9, ease: 'expo.inOut' })
    .add(() => webgl && gsap.to(webgl.intro, { value: 1, duration: 3, ease: 'expo.out' }), '-=0.6')
    .from(chars, {
      yPercent: 110, rotationX: -95, opacity: 0, transformOrigin: '50% 100% -60px',
      duration: 1.6, ease: 'expo.out', stagger: 0.07,
    }, '-=0.45')
    .addLabel('nav', '-=1.3')
    .from('.nav > *', { y: -40, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.08 }, 'nav')
    .from('.hero__meta span', { y: 20, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.1 }, '-=1.2')
    .from(lead.lines, { yPercent: 110, duration: 1.1, ease: 'expo.out', stagger: 0.08 }, '-=1.1')
    .from('.hero__cta > *', { y: 30, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.1 }, '-=0.9')
    .from('.hero__scroll, .progress', { opacity: 0, duration: 1 }, '-=0.6')
    .call(() => logoIntro(navLogo, { draw: 0.9 }), null, 'nav+=0.1');
}

function initHeroScroll(chars) {
  const tl = gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.8 } });
  tl.to(chars, {
    yPercent: (i) => -60 - (i % 3) * 45,
    rotationX: (i) => (i % 2 ? 70 : -70),
    z: (i) => 120 + i * 40,
    opacity: 0,
    stagger: { each: 0.04, from: 'center' },
    ease: 'none',
  }, 0)
    .to('.hero__bottom', { y: -120, opacity: 0, ease: 'none' }, 0)
    .to('.hero__meta', { y: -60, opacity: 0, ease: 'none' }, 0)
    .to('.hero__scroll', { opacity: 0, ease: 'none' }, 0);
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
