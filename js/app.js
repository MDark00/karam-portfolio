/* =========================================================
   Karam Khalil — portfolio behaviour
   - Heavy motion (pins, scrubs, cursor) runs on desktop only.
   - Phones get light, one-shot reveals.
   - Reduced-motion viewers get a calm, fully usable page.
   ========================================================= */
(function () {
  'use strict';
  const D = document, root = D.documentElement;
  const $ = (s, c = D) => c.querySelector(s);
  const $$ = (s, c = D) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  const animate = hasGsap && !reduce;
  const I = window.I18N;
  const safe = (fn, fallback = null) => { try { return fn(); } catch (e) { return fallback; } };
  const store = {
    get: k => safe(() => localStorage.getItem(k)),
    set: (k, v) => safe(() => localStorage.setItem(k, v)),
    seen: () => safe(() => sessionStorage.getItem('kk-intro') === '1', false),
    markSeen: () => safe(() => sessionStorage.setItem('kk-intro', '1'))
  };
  let lang = 'en';
  const T = () => I.ui[lang];

  /* ---------- loader: only once per visit ---------- */
  const loader = $('#loader');
  const introSeen = store.seen();
  if (introSeen || !animate) loader.classList.add('skip');

  /* ---------- signatures ---------- */
  const srcPaths = $$('#sig-src path');
  $$('[data-sig]').forEach(svg => srcPaths.forEach(p => svg.appendChild(p.cloneNode())));

  /* ---------- clock ---------- */
  const clock = $('#clock');
  const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Amman', hour: '2-digit', minute: '2-digit' });
  const tick = () => { clock.textContent = fmt.format(new Date()) + T().clock; };
  setInterval(tick, 30000);

  /* ---------- copy helpers ---------- */
  const msg = $('#copy-msg');
  function copy(text, done) {
    const ok = () => { msg.textContent = T().copied + text; done && done(true); };
    const no = () => { msg.textContent = T().copyFail + text; done && done(false); };
    safe(() => navigator.clipboard.writeText(text).then(ok, no)) || no();
  }
  $$('.copybtn').forEach(b => b.addEventListener('click', () => copy(b.dataset.copy)));
  const ctaBtn = $('#cta-copy');
  ctaBtn.addEventListener('click', () => copy('karamraedkhalil@gmail.com', ok => {
    ctaBtn.innerHTML = ok ? T().btnCopied : 'karamraedkhalil<br>@gmail.com';
    setTimeout(() => { ctaBtn.innerHTML = T().btnDefault; }, 2000);
    if (animate) gsap.fromTo(ctaBtn, { scale: .88 }, { scale: 1, duration: .8, ease: 'elastic.out(1,.4)' });
  }));

  /* ---------- role switcher ---------- */
  const roleBtns = $$('.role-btn'), tagEl = $('#tagline'), descEl = $('#role-desc'), idRole = $('#id-role');
  let roleIdx = 0, autoRole = true, autoTween = null;
  const setRoleText = i => { const r = I.roles[lang][i]; tagEl.textContent = r.tag; descEl.textContent = r.desc; idRole.textContent = r.id; };
  function showRole(i, fromUser) {
    roleIdx = i;
    roleBtns.forEach((b, k) => { const on = k === i; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; });
    if (animate) {
      gsap.timeline()
        .to([tagEl, descEl], { yPercent: -30, opacity: 0, duration: .25, ease: 'power2.in', stagger: .04 })
        .add(() => setRoleText(i))
        .fromTo([tagEl, descEl], { yPercent: 30, opacity: 0 }, { yPercent: 0, opacity: 1, duration: .5, ease: 'expo.out', stagger: .05 });
      gsap.fromTo('#idcard', { rotation: fromUser ? 7 : 3 }, { rotation: 0, duration: 1.4, ease: 'elastic.out(1,.25)' });
    } else setRoleText(i);
    if (fromUser) { autoRole = false; if (autoTween) autoTween.kill(); roleBtns.forEach(b => { if (hasGsap) gsap.set(b.querySelector('.bar'), { scaleX: 0 }); }); }
  }
  roleBtns.forEach((b, i) => {
    b.addEventListener('click', () => showRole(i, true));
    b.addEventListener('keydown', e => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const fwd = (e.key === 'ArrowRight') !== (lang === 'ar');
      const n = (i + (fwd ? 1 : 2)) % 3; roleBtns[n].focus(); showRole(n, true);
    });
  });
  function autoCycle() {
    if (!autoRole || !animate) return;
    if (autoTween) autoTween.kill();
    const bar = roleBtns[roleIdx].querySelector('.bar');
    autoTween = gsap.fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: 5, ease: 'none', onComplete: () => {
      gsap.set(bar, { scaleX: 0 }); if (!autoRole) return; showRole((roleIdx + 1) % 3, false); autoCycle();
    } });
  }

  /* ---------- menu ---------- */
  const burger = $('#burger'), menu = $('#menu');
  function setMenu(open) {
    D.body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? T().menuClose : T().menuOpen);
    open ? menu.removeAttribute('inert') : menu.setAttribute('inert', '');
    if (open && animate) gsap.fromTo('.menu nav a', { yPercent: 40, opacity: 0 }, { yPercent: 0, opacity: 1, duration: .45, stagger: .035, delay: .12, ease: 'power3.out' });
  }
  burger.addEventListener('click', () => setMenu(!D.body.classList.contains('menu-open')));
  addEventListener('keydown', e => { if (e.key === 'Escape') { setMenu(false); } });
  $$('[data-link]').forEach(a => a.addEventListener('click', e => {
    const el = $(a.getAttribute('href')); if (!el) return;
    e.preventDefault(); setMenu(false);
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }));

  /* ---------- pause looping CSS animations while off screen ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('run', e.isIntersecting)), { rootMargin: '100px' });
  $$('.marquee, .w1, .w3').forEach(el => io.observe(el));

  /* =========================================================
     Certificates: infinite draggable rails + viewer
     ========================================================= */
  const cards = $$('.rail .cc');
  const viewer = $('#viewer'), vImg = $('#v-img'), vPanel = $('.v-panel');
  const V = { count: $('#v-count'), dot: $('#v-dot'), cat: $('#v-cat'), date: $('#v-date'), title: $('#v-title'), issuer: $('#v-issuer'), hi: $('#v-hi'), cid: $('#v-cid'), link: $('#v-link'), linkT: $('#v-link-t') };
  const catLabel = c => lang === 'ar' ? I.ar['cat.' + c] : { sec: 'Security', comp: 'Competition', dev: 'Development' }[c];
  const issuerLabel = s => lang === 'ar' && I.issuers[s] ? I.issuers[s] : s;
  const hiLabel = s => lang === 'ar' && I.highlights[s] ? I.highlights[s] : s;
  const pad = n => String(n).padStart(2, '0');
  let cur = 0, opener = null;

  function labelCards(list) {
    list.forEach(c => {
      const d = c.dataset;
      $('.cc-cat', c).textContent = catLabel(d.cat);
      $('.cc-issuer', c).textContent = issuerLabel(d.issuer);
      const hi = $('.cc-hi', c); if (hi) hi.textContent = hiLabel(d.hi);
    });
  }
  function fill(i) {
    const d = cards[i].dataset;
    V.count.textContent = pad(i + 1) + ' / ' + cards.length;
    V.dot.className = 'dot ' + d.cat; V.cat.textContent = catLabel(d.cat); V.date.textContent = d.date;
    V.title.textContent = d.title; V.issuer.textContent = issuerLabel(d.issuer); V.hi.textContent = d.hi ? hiLabel(d.hi) : '';
    V.cid.hidden = !d.cid; V.cid.dataset.copy = d.cid; $('span', V.cid).textContent = d.cid;
    V.link.href = d.link; V.linkT.textContent = d.link.includes('udemy') ? T().viewCred : T().viewLinkedIn;
    vImg.src = d.img; vImg.alt = d.title + ' certificate';
  }
  function openViewer(i, fromCard) {
    cur = i; opener = fromCard || cards[i];
    const src = $('img', opener);
    let state = null;
    if (animate && window.Flip && src) { src.dataset.flipId = 'cert'; vImg.dataset.flipId = 'cert'; state = Flip.getState(src); }
    fill(i);
    viewer.hidden = false;
    if (animate) {
      gsap.fromTo('.v-backdrop', { opacity: 0 }, { opacity: 1, duration: .35 });
      gsap.fromTo(vPanel, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: .4, ease: 'power3.out' });
      if (state) Flip.from(state, { targets: vImg, duration: .55, ease: 'power3.inOut', scale: true });
      gsap.from('.v-text > *', { y: 16, opacity: 0, duration: .4, stagger: .03, ease: 'power3.out', delay: .15 });
      if (src) delete src.dataset.flipId;
    }
    $('.v-close').focus({ preventScroll: true });
  }
  function closeViewer() {
    const done = () => {
      viewer.hidden = true;
      if (hasGsap) gsap.set([vPanel, vImg, '.v-text'], { clearProps: 'all' });
      if (opener) opener.focus({ preventScroll: true });
    };
    if (animate) gsap.timeline({ onComplete: done }).to(vPanel, { y: 30, opacity: 0, duration: .3, ease: 'power2.in' }).to('.v-backdrop', { opacity: 0, duration: .25 }, '<.05');
    else done();
  }
  function step(dir) {
    const n = (cur + dir + cards.length) % cards.length;
    const dx = 36 * dir * (lang === 'ar' ? -1 : 1);
    if (animate) {
      gsap.timeline()
        .to([vImg, '.v-text'], { x: -dx, opacity: 0, duration: .2, ease: 'power2.in' })
        .add(() => { cur = n; fill(n); opener = cards[n]; })
        .fromTo([vImg, '.v-text'], { x: dx, opacity: 0 }, { x: 0, opacity: 1, duration: .45, ease: 'expo.out', stagger: .04 });
    } else { cur = n; fill(n); opener = cards[n]; }
  }
  // keep the page still behind the viewer without touching overflow (avoids jumping to the top on phones)
  const blockScroll = e => { const panel = e.target.closest('.v-panel'); if (!panel || panel.scrollHeight <= panel.clientHeight) e.preventDefault(); };
  viewer.addEventListener('wheel', blockScroll, { passive: false });
  viewer.addEventListener('touchmove', blockScroll, { passive: false });
  $$('[data-close]').forEach(b => b.addEventListener('click', closeViewer));
  $('#v-prev').addEventListener('click', () => step(-1));
  $('#v-next').addEventListener('click', () => step(1));
  addEventListener('keydown', e => {
    if (viewer.hidden) return;
    const rtl = lang === 'ar';
    if (e.key === 'Escape') closeViewer();
    if (e.key === 'ArrowRight') step(rtl ? -1 : 1);
    if (e.key === 'ArrowLeft') step(rtl ? 1 : -1);
  });
  V.cid.addEventListener('click', () => {
    const t = V.cid.dataset.copy, span = $('span', V.cid);
    safe(() => navigator.clipboard.writeText(t).then(() => {
      span.textContent = T().idCopied; V.cid.classList.add('done');
      setTimeout(() => { span.textContent = t; V.cid.classList.remove('done'); }, 1400);
    }));
  });

  // Infinite rail: duplicated once, moved with transforms only, paused off screen.
  const railClick = (rail, originals, getMoved) => rail.addEventListener('click', e => {
    const c = e.target.closest('.cc'); if (!c) return;
    if (getMoved() > 6) { e.preventDefault(); return; }
    const orig = c.dataset.clone != null ? originals[+c.dataset.clone] : c;
    openViewer(cards.indexOf(orig), c);
  });
  function makeRail(rail) {
    const track = $('.rail-track', rail);
    const originals = [...track.children];
    originals.forEach((n, k) => { const c = n.cloneNode(true); c.setAttribute('aria-hidden', 'true'); c.tabIndex = -1; c.dataset.clone = k; track.appendChild(c); });
    rail.classList.add('loop');
    const base = (fine ? .5 : .35) * (+rail.dataset.dir || -1);
    let setW = 0, wrapX = v => v, x = 0, speed = base, target = base, boost = 0;
    let dragging = false, lastX = 0, vx = 0, moved = 0, active = false;
    const setX = gsap.quickSetter(track, 'x', 'px');
    const measure = () => { setW = track.scrollWidth / 2; wrapX = gsap.utils.wrap(-setW, 0); };
    measure(); addEventListener('resize', measure);
    ScrollTrigger.create({ trigger: rail, start: 'top bottom', end: 'bottom top', onToggle: s => { active = s.isActive; } });
    gsap.ticker.add((t, dt) => {
      if (!active || !setW || !viewer.hidden) return;
      const f = Math.min(dt / 16.667, 3);
      if (!dragging) { speed += (target - speed) * .05 * f; x += (speed + boost) * f; boost *= .9; }
      setX(wrapX(x));
    });
    rail.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') target = base * .15; });
    rail.addEventListener('pointerleave', () => { target = base; });
    rail.addEventListener('pointerdown', e => { if (e.button !== 0) return; dragging = true; lastX = e.clientX; vx = 0; moved = 0; rail.classList.add('dragging'); });
    addEventListener('pointermove', e => { if (!dragging) return; const dx = e.clientX - lastX; lastX = e.clientX; x += dx; vx = dx; moved += Math.abs(dx); }, { passive: true });
    const end = () => { if (!dragging) return; dragging = false; rail.classList.remove('dragging'); speed = gsap.utils.clamp(-30, 30, vx); };
    addEventListener('pointerup', end); addEventListener('pointercancel', end);
    railClick(rail, originals, () => moved);
    return {
      boost: v => { boost = v; },
      label: () => labelCards($$('.cc', track))
    };
  }

  /* =========================================================
     Language switch (English in the HTML, Arabic from i18n.js)
     ========================================================= */
  const langBtn = $('#lang'), langLabel = $('#lang-label');
  const cache = new WeakMap();
  let rails = [];
  function loadArabicFont() {
    if ($('#font-ar')) return;
    const l = D.createElement('link');
    l.id = 'font-ar'; l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Cairo:wght@300..900&display=swap';
    D.head.appendChild(l);
  }
  function applyLang(next) {
    lang = next === 'ar' ? 'ar' : 'en';
    if (lang === 'ar') loadArabicFont();
    root.lang = lang; root.dir = lang === 'ar' ? 'rtl' : 'ltr';
    $$('[data-i18n]').forEach(el => {
      if (!cache.has(el)) cache.set(el, el.innerHTML);
      const ar = I.ar[el.dataset.i18n];
      el.innerHTML = lang === 'ar' && ar != null ? ar : cache.get(el);
    });
    $$('[data-i18n-roll]').forEach(el => {
      if (!cache.has(el)) cache.set(el, el.textContent);
      const v = lang === 'ar' && I.ar[el.dataset.i18nRoll] || cache.get(el);
      el.textContent = v; el.dataset.t = v;
    });
    $$('[data-i18n-aria]').forEach(el => {
      if (!cache.has(el)) cache.set(el, el.getAttribute('aria-label'));
      el.setAttribute('aria-label', lang === 'ar' && I.ar[el.dataset.i18nAria] || cache.get(el));
    });
    $$('[data-i18n-cursor]').forEach(el => { el.dataset.cursor = T().cursor[el.dataset.i18nCursor.split('.')[1]]; });
    langLabel.textContent = T().langLabel; langBtn.setAttribute('aria-label', T().langAria);
    burger.setAttribute('aria-label', D.body.classList.contains('menu-open') ? T().menuClose : T().menuOpen);
    setRoleText(roleIdx);
    labelCards(cards);
    rails.forEach(r => r.label());
    if (!viewer.hidden) fill(cur);
    tick();
    store.set('kk-lang', lang);
  }

  /* =========================================================
     Motion
     ========================================================= */
  let mm = null, introDone = introSeen;
  function splitWords(el) {
    [...el.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const f = D.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(w => { if (!w.trim()) { f.append(w); return; } const s = D.createElement('span'); s.className = 'w'; s.textContent = w; f.append(s); });
        n.replaceWith(f);
      } else if (n.nodeType === 1) n.classList.add('w');
    });
    return $$('.w', el);
  }

  function initMotion() {
    gsap.registerPlugin(ScrollTrigger); if (window.Flip) gsap.registerPlugin(Flip);
    ScrollTrigger.config({ ignoreMobileResize: true });
    mm = gsap.matchMedia();
    mm.add({ desktop: '(min-width: 901px)', mobile: '(max-width: 900px)' }, ctx => {
      const { desktop } = ctx.conditions;

      /* intro: signature loader once per visit, then the hero */
      const hero = gsap.timeline({ paused: true, onComplete: () => { introDone = true; autoCycle(); } })
        .from('.hero h1 .ln > span', { yPercent: 110, duration: .8, stagger: .06, ease: 'power4.out' })
        .from('#idcard', { rotation: -20, y: -160, duration: 1.4, ease: 'elastic.out(1,.35)' }, '<')
        .from('.lanyard', { scaleY: 0, transformOrigin: '50% 0', duration: .7, ease: 'expo.out' }, '<')
        .from('.hero-foot > *', { y: 20, opacity: 0, duration: .55, stagger: .05, ease: 'power3.out' }, '<.15')
        .from('.header .wrap > *', { y: -20, opacity: 0, duration: .55, stagger: .05, ease: 'power3.out' }, '<');
      if (!introDone) {
        loader.style.animation = 'none';
        D.body.classList.add('loading');
        const paths = $$('path', loader), c = { v: 0 }, pct = $('#pct'), w = [.6, 2.4, .5, 2.6, .1, .9];
        paths.forEach(p => { p.style.animation = 'none'; p.style.strokeDashoffset = 1; });
        const tl = gsap.timeline({ onComplete: () => { D.body.classList.remove('loading'); loader.classList.add('skip'); store.markSeen(); ScrollTrigger.refresh(); } });
        tl.to(c, { v: 100, duration: 1.8, ease: 'power2.inOut', onUpdate: () => { pct.textContent = Math.round(c.v); } }, 0);
        let t = .1; paths.forEach((p, i) => { const d = w[i] * .26; tl.to(p, { strokeDashoffset: 0, duration: d, ease: 'power1.inOut' }, t); t += d * .92; });
        tl.to(loader, { yPercent: -100, duration: .8, ease: 'expo.inOut' }, '+=.1').add(() => hero.play(), '-=.45');
        loader.addEventListener('click', () => tl.progress(1), { once: true });
      } else {
        hero.progress(1); autoCycle();
      }

      /* headings rise, content reveals (one-shot, transforms + opacity only) */
      $$('h2 .ln > span').forEach(s => gsap.from(s, { yPercent: 105, duration: .7, ease: 'power4.out', scrollTrigger: { trigger: s.closest('h2'), start: 'top 92%', once: true } }));
      ScrollTrigger.batch('[data-reveal]', { start: 'top 90%', once: true, onEnter: els => { els = els.filter(e => !e.dataset.shown); els.forEach(e => { e.dataset.shown = 1; }); if (els.length) gsap.from(els, { y: 28, opacity: 0, duration: .55, stagger: .05, ease: 'power3.out' }); } });
      gsap.from('.rank .track i', { width: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.w2', start: 'top 70%', once: true } });
      $$('.lic-stats b[data-count]').forEach(b => {
        const end = +b.dataset.count, o = { v: 0 };
        ScrollTrigger.create({ trigger: b, start: 'top 92%', once: true, onEnter: () => gsap.to(o, { v: end, duration: 1.2, ease: 'expo.out', onUpdate: () => { b.textContent = Math.round(o.v); } }) });
      });
      gsap.from('.rail', { x: i => (i ? -40 : 40), opacity: 0, duration: .6, stagger: .08, ease: 'power3.out', scrollTrigger: { trigger: '.rail', start: 'top 92%', once: true } });

      /* about quote: words light up as you read */
      const words = splitWords($('#quote'));
      const disc = $('#disciplines'), panels = $$('.panel'), dots = $$('.disc-dots b');
      const footPaths = $$('#foot-sig path'), fw = [.6, 2.4, .5, 2.6, .1, .9];
      gsap.set(footPaths, { strokeDashoffset: 1 });

      if (desktop) {
        gsap.fromTo(words, { opacity: .14 }, { opacity: 1, stagger: .1, ease: 'none', scrollTrigger: { trigger: '.about', start: 'top top', end: '+=100%', pin: true, scrub: true } });

        disc.classList.add('pinned');
        gsap.set(panels.slice(1), { yPercent: 102 });
        gsap.set(dots[0], { scaleX: 1 });
        const dtl = gsap.timeline({ scrollTrigger: { trigger: disc, start: 'top top', end: '+=170%', pin: true, scrub: true } });
        panels.slice(1).forEach((p, i) => {
          dtl.to(p, { yPercent: 0, duration: 1, ease: 'power2.inOut' })
             .to(panels[i], { scale: .94, duration: 1, ease: 'none' }, '<')
             .to(dots[i + 1], { scaleX: 1, duration: .6 }, '<.3')
             .to({}, { duration: .35 });
        });

        gsap.set(['.hero-main', '.win'], { force3D: true, willChange: 'transform' });
        const wins = $$('.win');
        wins.forEach((w, i) => { const next = wins[i + 1]; if (next) gsap.to(w, { scale: .93 + i * .03, ease: 'none', scrollTrigger: { trigger: next, start: 'top bottom', end: 'top 20%', scrub: true } }); });

        gsap.to('.hero-main', { yPercent: -10, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

        const st = gsap.timeline({ scrollTrigger: { trigger: '.foot-sig', start: 'top 90%', end: 'bottom 60%', scrub: true } });
        footPaths.forEach((p, i) => st.to(p, { strokeDashoffset: 0, duration: fw[i], ease: 'none' }));
      } else {
        gsap.fromTo(words, { opacity: .15, y: 10 }, { opacity: 1, y: 0, duration: .4, stagger: .025, ease: 'power2.out', scrollTrigger: { trigger: '#quote', start: 'top 85%', once: true } });
        ScrollTrigger.batch('.panel, .win', { start: 'top 88%', once: true, onEnter: els => { els = els.filter(e => !e.dataset.shown); els.forEach(e => { e.dataset.shown = 1; }); if (els.length) gsap.from(els, { y: 32, opacity: 0, duration: .55, stagger: .06, ease: 'power3.out' }); } });
        const st = gsap.timeline({ scrollTrigger: { trigger: '.foot-sig', start: 'top 85%', once: true } });
        footPaths.forEach((p, i) => st.to(p, { strokeDashoffset: 0, duration: fw[i] * .35, ease: 'power1.inOut' }));
      }

      /* marquee follows scroll direction */
      const row = $('.marquee-row'); let lastDir = 1;
      ScrollTrigger.create({ onUpdate: s => { if (s.direction !== lastDir) { lastDir = s.direction; row.style.animationDirection = lastDir === 1 ? 'normal' : 'reverse'; } } });

      return () => { disc.classList.remove('pinned'); };
    });
  }

  /* ---------- desktop-only pointer extras ---------- */
  function initPointer() {
    if (!fine) return;
    D.body.classList.add('has-cursor');
    const curEl = $('#cursor'), lab = $('#cursor-label');
    const xTo = gsap.quickTo(curEl, 'x', { duration: .35, ease: 'power3' }), yTo = gsap.quickTo(curEl, 'y', { duration: .35, ease: 'power3' });
    addEventListener('pointermove', e => { xTo(e.clientX); yTo(e.clientY); }, { passive: true });
    D.addEventListener('pointerover', e => {
      const el = e.target.closest('[data-cursor]');
      if (el) { lab.textContent = el.dataset.cursor; curEl.classList.add('big'); } else curEl.classList.remove('big');
    });
    $$('[data-magnetic]').forEach(el => {
      const mx = gsap.quickTo(el, 'x', { duration: .45, ease: 'power3' }), my = gsap.quickTo(el, 'y', { duration: .45, ease: 'power3' });
      el.addEventListener('pointermove', e => { const r = el.getBoundingClientRect(); mx((e.clientX - r.left - r.width / 2) * .3); my((e.clientY - r.top - r.height / 2) * .3); });
      el.addEventListener('pointerleave', () => gsap.to(el, { x: 0, y: 0, duration: .8, ease: 'elastic.out(1,.35)' }));
    });
  }
  function initBadge() {
    const card = $('#idcard'), wrap = $('#badge-wrap');
    let dragging = false, sx = 0;
    const rot = gsap.quickTo(card, 'rotation', { duration: .5, ease: 'power3' });
    wrap.addEventListener('pointermove', e => {
      if (!dragging && e.pointerType !== 'mouse') return;
      const r = wrap.getBoundingClientRect();
      rot(dragging ? gsap.utils.clamp(-40, 40, (e.clientX - sx) * .2) : (e.clientX - (r.left + r.width / 2)) / r.width * 10);
    });
    wrap.addEventListener('pointerdown', e => { dragging = true; sx = e.clientX; safe(() => wrap.setPointerCapture(e.pointerId)); });
    const release = () => { if (!dragging) return; dragging = false; gsap.to(card, { rotation: 0, duration: 2, ease: 'elastic.out(1.1,.18)' }); };
    wrap.addEventListener('pointerup', release); wrap.addEventListener('pointercancel', release);
    wrap.addEventListener('pointerleave', () => { if (!dragging) gsap.to(card, { rotation: 0, duration: 1.6, ease: 'elastic.out(1,.2)' }); });
  }

  /* ---------- boot ---------- */
  applyLang(store.get('kk-lang') || 'en');

  if (animate) {
    initMotion();
    initPointer();
    initBadge();
    rails = $$('.rail').map(makeRail);
    rails.forEach(r => r.label());
    ScrollTrigger.create({ trigger: '#certifications', start: 'top bottom', end: 'bottom top',
      onUpdate: s => { const v = gsap.utils.clamp(-5, 5, s.getVelocity() / 300); rails.forEach((r, k) => r.boost(v * (k ? 1 : -1))); } });
    if (D.fonts) D.fonts.ready.then(() => ScrollTrigger.refresh());
  } else {
    // calm mode: native swipe rows, instant viewer
    $$('.rail').forEach(rail => railClick(rail, [...$('.rail-track', rail).children], () => 0));
  }

  langBtn.addEventListener('click', () => {
    const next = lang === 'ar' ? 'en' : 'ar';
    const swap = () => {
      if (mm) mm.revert();          // undo pins and word splits before the text changes
      applyLang(next);
      if (animate) { initMotion(); requestAnimationFrame(() => ScrollTrigger.refresh()); }
    };
    if (animate) gsap.to('main', { opacity: 0, duration: .2, onComplete: () => { swap(); gsap.to('main', { opacity: 1, duration: .35 }); } });
    else swap();
  });
})();
