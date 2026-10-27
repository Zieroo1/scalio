import gsap from 'gsap';
import { logoMarkup } from './logo-markup.js';

/**
 * Injects the inline Scalio logo into `host` and returns handles to its animatable parts.
 * A white "spark" copy of the S stroke rides the drawing head as a light trail.
 */
export function mountLogo(host, { word = true } = {}) {
  host.insertAdjacentHTML('afterbegin', logoMarkup({ word }));
  const svg = host.querySelector('svg.sc-logo');
  const s = svg.querySelector('.sc-s');
  const spark = s.cloneNode();
  spark.setAttribute('class', 'sc-spark');
  spark.setAttribute('stroke', '#fff');
  s.after(spark);
  const logo = {
    host,
    svg,
    s,
    spark,
    px: [...svg.querySelectorAll('.sc-px')],
    letters: [...svg.querySelectorAll('.sc-l')],
    tittle: svg.querySelector('.sc-tittle'),
  };
  gsap.set(logo.px, { transformOrigin: '50% 100%' });
  gsap.set(logo.letters, { transformOrigin: '50% 100%' });
  gsap.set(logo.tittle, { transformOrigin: '50% 50%' });
  // gap slightly > 1 so the next dash never starts exactly at the path end (renders a sliver)
  gsap.set(logo.s, { strokeDasharray: '1 1.01', strokeDashoffset: 0 });
  gsap.set(logo.spark, { strokeDasharray: '0.08 1.2', strokeDashoffset: 0.08, opacity: 0 });
  return logo;
}

/** Puts every part of the logo into its pre-intro (invisible) state. */
export function hideLogo(l) {
  gsap.set(l.px, { scale: 0 });
  gsap.set(l.s, { strokeDashoffset: 1 });
  gsap.set(l.spark, { strokeDashoffset: 0.08, opacity: 0 });
  gsap.set(l.letters, { y: 22, scaleY: 0.2, opacity: 0 });
  gsap.set(l.tittle, { y: -46, scale: 0.4, rotation: 0, opacity: 0 });
}

/**
 * Construction sequence: pixels grow like a bar chart, the S is drawn from them with a
 * light trail on its head, letters rise, and the square tittle drops in and clicks 90°.
 */
export function logoIntro(l, { draw = 1.1 } = {}) {
  hideLogo(l);
  const tl = gsap.timeline();
  tl.to(l.px, { scale: 1, duration: 0.45, ease: 'back.out(3)', stagger: 0.14 })
    .addLabel('draw', '-=0.12')
    .to(l.s, { strokeDashoffset: 0, duration: draw, ease: 'power2.inOut' }, 'draw')
    .set(l.spark, { opacity: 1 }, 'draw')
    .to(l.spark, { strokeDashoffset: -0.92, duration: draw, ease: 'power2.inOut' }, 'draw')
    .to(l.spark, { opacity: 0, duration: 0.35 }, `draw+=${draw - 0.1}`)
    .to(l.letters, {
      y: 0, scaleY: 1, opacity: 1, duration: 0.9, ease: 'expo.out', stagger: 0.05,
    }, `draw+=${draw * 0.55}`)
    .to(l.tittle, { y: 0, scale: 1, opacity: 1, duration: 0.8, ease: 'bounce.out' }, `draw+=${draw * 0.55 + 0.35}`)
    .to(l.tittle, { rotation: 90, duration: 0.55, ease: 'back.inOut(2.4)' }, '>-0.05');
  return tl;
}

/** Hover micro-interaction: pixels hop in sequence, the spark runs the S again, the tittle flips. */
export function logoHover(l, target = l.host) {
  let tl = null;
  target.addEventListener('pointerenter', () => {
    if (tl && tl.isActive()) return;
    tl = gsap.timeline()
      .to(l.px, { y: -5, duration: 0.18, ease: 'power2.out', stagger: 0.07, yoyo: true, repeat: 1 })
      .set(l.spark, { opacity: 1, strokeDashoffset: 0.08 }, 0.12)
      .to(l.spark, { strokeDashoffset: -1, duration: 0.75, ease: 'power2.inOut' }, 0.12)
      .set(l.spark, { opacity: 0 })
      .to(l.letters, { y: -6, duration: 0.18, ease: 'power2.out', stagger: 0.035, yoyo: true, repeat: 1 }, 0.35)
      .to(l.tittle, { rotation: '+=180', duration: 0.6, ease: 'back.inOut(2.4)' }, 0.45);
  });
}
