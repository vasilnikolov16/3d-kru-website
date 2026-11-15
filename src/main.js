import '@fontsource-variable/sofia-sans';
import '@fontsource-variable/sofia-sans/wght-italic.css';
import '@fontsource-variable/sofia-sans-extra-condensed';
import '@fontsource-variable/sofia-sans-extra-condensed/wght-italic.css';
import '@fontsource-variable/jetbrains-mono';
import './style.css';
import { createPrinter } from './printer.js';
import { buildProcessViz } from './process.js';
import { projects, materials } from './data.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
const pad = (n, l = 2) => String(n).padStart(l, '0');
const IMG = import.meta.env.BASE_URL + 'img/';

/* ── принтер ── */
(function hero() {
  const canvas = $('#printer');
  const el = { state: $('#st-state'), name: $('#st-name'), bar: $('#st-bar'), layer: $('#st-layer'), z: $('#st-z') };
  const chips = $$('#chips button');
  const panel = $('.panel');
  let printer;
  try {
    printer = createPrinter(canvas, {
      reducedMotion: reduced,
      onStatus(s) {
        el.name.textContent = s.name;
        el.state.textContent = s.state === 'printing' ? 'ПЕЧАТ' : s.state === 'done' ? 'ГОТОВО' : 'СМЯНА';
        panel.dataset.state = s.state;
        el.bar.style.transform = `scaleX(${s.pct.toFixed(4)})`;
        el.layer.textContent = `${pad(s.layer, 3)}/${pad(s.layers, 3)}`;
        el.z.textContent = s.z.toFixed(1);
        chips.forEach((c, i) => c.setAttribute('aria-pressed', i === s.index));
      },
    });
  } catch (e) {
    console.warn('WebGL не е наличен', e);
    $('#stage').classList.add('no-gl');
    return;
  }
  chips.forEach((c) => c.addEventListener('click', () => printer.setModel(+c.dataset.m)));
  const sw = $$('#swatches button');
  sw.forEach((b) => b.addEventListener('click', () => {
    printer.setColor(b.dataset.c);
    sw.forEach((o) => o.setAttribute('aria-pressed', o === b));
    panel.style.setProperty('--fil', b.dataset.c);
  }));
  new IntersectionObserver(([e]) => printer.setActive(e.isIntersecting), { threshold: 0.02 }).observe(canvas);
  document.addEventListener('visibilitychange', () => printer.setActive(!document.hidden));
  canvas.addEventListener('pointerdown', () => $('.hero__hint')?.classList.add('gone'), { once: true });
})();

/* ── навигация + HUD ── */
(function chrome() {
  const nav = $('#nav'), burger = $('#burger');
  const fill = $('#z-fill'), zval = $('#z-val'), xy = $('#xy');
  let ticking = false;
  const onScroll = () => {
    ticking = false;
    const max = document.documentElement.scrollHeight - innerHeight;
    const t = max > 0 ? Math.min(1, scrollY / max) : 0;
    fill.style.transform = `scaleY(${t})`;
    zval.textContent = `Z+${pad(Math.round(t * 100), 3)}%`;
    nav.classList.toggle('nav--solid', scrollY > 40);
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();
  if (fine) addEventListener('pointermove', (e) => { xy.textContent = `X${pad(Math.round(e.clientX), 4)} Y${pad(Math.round(e.clientY), 4)}`; }, { passive: true });

  burger.addEventListener('click', () => {
    const open = nav.classList.toggle('nav--open');
    burger.setAttribute('aria-expanded', open);
  });
  $$('#nav-links a').forEach((a) => a.addEventListener('click', () => { nav.classList.remove('nav--open'); burger.setAttribute('aria-expanded', false); }));
  $('#year').textContent = new Date().getFullYear();
})();

/* ── „напечатано“ появяване ── */
(function reveal() {
  // Без IntersectionObserver: елемент, скрит изцяло с clip-path, не се брои за „видим“.
  let pending = $$('.rv, .price'), queued = false;
  const check = () => {
    queued = false;
    const limit = innerHeight * 0.92;
    pending = pending.filter((n) => {
      if (n.getBoundingClientRect().top > limit) return true;
      n.classList.add('in');
      return false;
    });
    if (!pending.length) { removeEventListener('scroll', ask); removeEventListener('resize', ask); }
  };
  const ask = () => { if (!queued) { queued = true; requestAnimationFrame(check); } };
  addEventListener('scroll', ask, { passive: true });
  addEventListener('resize', ask);
  check();
  requestAnimationFrame(() => document.documentElement.classList.add('ready'));
})();

/* ── услуги: снимка, която следва курсора ── */
(function services() {
  if (!fine) return;
  const peek = $('#peek'), img = $('img', peek);
  let x = 0, y = 0, tx = 0, ty = 0, on = false, raf = 0;
  const loop = () => {
    x += (tx - x) * 0.14; y += (ty - y) * 0.14;
    peek.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${((tx - x) * 0.04).toFixed(2)}deg)`;
    raf = on || Math.abs(tx - x) > 0.5 ? requestAnimationFrame(loop) : 0;
  };
  $$('.svc__row').forEach((row) => {
    row.addEventListener('pointerenter', (e) => {
      img.src = row.dataset.img; on = true; peek.classList.add('on');
      tx = e.clientX; ty = e.clientY;
      if (!raf) { x = tx; y = ty; raf = requestAnimationFrame(loop); }
    });
    row.addEventListener('pointermove', (e) => { tx = e.clientX; ty = e.clientY; });
    row.addEventListener('pointerleave', () => { on = false; peek.classList.remove('on'); });
  });
})();

/* ── процес ── */
(function process() {
  const viz = $('#proc-viz');
  buildProcessViz(viz);
  const steps = $$('#proc-steps li');
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    viz.dataset.step = e.target.dataset.step;
    steps.forEach((s) => s.classList.toggle('on', s === e.target));
  }), { rootMargin: '-48% 0px -48% 0px' });
  steps.forEach((s) => io.observe(s));
  steps[0].classList.add('on');
})();

/* ── проекти + лайтбокс ── */
(function gallery() {
  const trk = $('#trk'), count = $('#trk-count');
  trk.innerHTML = projects.map((p, i) => `
    <button class="card" data-i="${i}" aria-label="${p.tag} — ${p.title}. Отвори снимките.">
      <span class="card__img"><img src="${IMG}${p.imgs[0]}.jpg" alt="${p.tag} — ${p.title}" loading="lazy" width="1440" height="1800" draggable="false"></span>
      <span class="card__meta">
        <span class="card__n">${pad(i + 1)}</span>
        <span class="card__tag">${p.tag}</span>
        <span class="card__title">${p.title}</span>
        <span class="card__more">${p.imgs.length} снимки <svg><use href="#arrow"/></svg></span>
      </span>
    </button>`).join('');
  const cards = $$('.card', trk);

  const step = () => cards[1].offsetLeft - cards[0].offsetLeft;
  const index = () => Math.max(0, Math.min(cards.length - 1, Math.round(trk.scrollLeft / step())));
  const upd = () => { count.textContent = `${pad(index() + 1)} / ${pad(cards.length)}`; };
  trk.addEventListener('scroll', upd, { passive: true }); upd();
  $('#trk-prev').addEventListener('click', () => trk.scrollBy({ left: -step(), behavior: 'smooth' }));
  $('#trk-next').addEventListener('click', () => trk.scrollBy({ left: step(), behavior: 'smooth' }));

  // влачене с мишка
  let d = null, moved = 0;
  trk.addEventListener('pointerdown', (e) => { moved = 0; if (e.pointerType !== 'mouse') return; d = { x: e.clientX, l: trk.scrollLeft }; });
  addEventListener('pointermove', (e) => {
    if (!d) return;
    const dx = e.clientX - d.x; moved = Math.max(moved, Math.abs(dx));
    if (moved > 5) { trk.classList.add('is-drag'); trk.scrollLeft = d.l - dx; }
  });
  addEventListener('pointerup', () => { if (!d) return; d = null; setTimeout(() => trk.classList.remove('is-drag'), 0); });

  // лек наклон към курсора
  if (fine && !reduced) cards.forEach((c) => {
    c.addEventListener('pointermove', (e) => {
      const r = c.getBoundingClientRect();
      c.style.setProperty('--rx', (((e.clientY - r.top) / r.height - 0.5) * -5).toFixed(2) + 'deg');
      c.style.setProperty('--ry', (((e.clientX - r.left) / r.width - 0.5) * 6).toFixed(2) + 'deg');
    });
    c.addEventListener('pointerleave', () => { c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg'); });
  });

  // лайтбокс
  const lb = $('#lb'), img = $('#lb-img'), thumbs = $('#lb-thumbs');
  let P = null, k = 0;
  const show = (n) => {
    k = (n + P.imgs.length) % P.imgs.length;
    img.src = `${IMG}${P.imgs[k]}.jpg`;
    img.alt = `${P.tag} — ${P.title} (${k + 1}/${P.imgs.length})`;
    $$('button', thumbs).forEach((b, i) => b.setAttribute('aria-current', i === k));
  };
  const open = (i) => {
    P = projects[i];
    $('#lb-tag').textContent = `${pad(i + 1)} — ${P.tag}`;
    $('#lb-title').textContent = P.title;
    $('#lb-text').textContent = P.text;
    thumbs.innerHTML = P.imgs.map((s, j) => `<button data-j="${j}" aria-label="Снимка ${j + 1}"><img src="${IMG}${s}.jpg" alt="" loading="lazy"></button>`).join('');
    lb.classList.toggle('lb--single', P.imgs.length < 2);
    show(0);
    lb.showModal();
  };
  cards.forEach((c) => c.addEventListener('click', () => { if (moved > 5) return; open(+c.dataset.i); }));
  thumbs.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) show(+b.dataset.j); });
  $('#lb-prev').addEventListener('click', () => show(k - 1));
  $('#lb-next').addEventListener('click', () => show(k + 1));
  $('#lb-x').addEventListener('click', () => lb.close());
  $('#lb-cta').addEventListener('click', () => lb.close());
  lb.addEventListener('click', (e) => { if (e.target === lb) lb.close(); });
  lb.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') show(k - 1); if (e.key === 'ArrowRight') show(k + 1); });
})();

/* ── материали ── */
(function mats() {
  const tabs = $$('#mat-tabs button'), panel = $('#mat-panel');
  const set = (key) => {
    const m = materials[key];
    panel.style.setProperty('--fil', m.color);
    $('#mat-title').textContent = m.title;
    $('#mat-desc').textContent = m.desc;
    $('#mat-use').textContent = m.use;
    $('#mat-bars').innerHTML = Object.entries(m.bars).map(([n, v]) => `
      <div><dt>${n}</dt><dd aria-label="${v} от 5">${Array.from({ length: 5 }, (_, i) => `<i class="${i < v ? 'f' : ''}" style="--i:${i}"></i>`).join('')}</dd></div>`).join('');
    tabs.forEach((t) => t.setAttribute('aria-selected', t.dataset.k === key));
    panel.classList.remove('swap'); void panel.offsetWidth; panel.classList.add('swap');
  };
  tabs.forEach((t) => t.addEventListener('click', () => set(t.dataset.k)));
  set('pla');
})();
