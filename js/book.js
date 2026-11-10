/* Движок 3D-книги комиксов.
   Книга = листы; у листа лицевая сторона (правая страница) и оборот (левая).
   Скролл двигает «камеру» от кадра к кадру (как ведомый просмотр в цифровых
   комиксах) и перелистывает листы в 3D. Персонажи моргают, водят глазами,
   говорят, когда у них реплика, и двигают головой и руками по ходу скролла. */
(function () {
  const BOOK = window.BOOK, A = window.ART;
  const PW = BOOK.PW, PH = BOOK.PH;
  const pages = BOOK.pages;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = s => document.querySelector(s);

  pages.forEach((p, i) => { p.i = i; p.leaf = Math.floor(i / 2); p.side = i % 2 ? 'L' : 'R'; });
  const NL = Math.ceil(pages.length / 2);

  // ---------- печать
  const gdefs = $('#gdefs');
  gdefs.insertAdjacentHTML('beforeend', A.GRADS);
  FX.install(gdefs);

  // ---------- сборка книги
  const world = $('#world'), book = $('#book');
  book.style.width = PW + 'px'; book.style.height = PH + 'px';
  const leaves = [];
  for (let l = 0; l < NL; l++) {
    const leaf = document.createElement('div');
    leaf.className = 'leaf'; leaf.dataset.l = l;
    leaf.style.width = PW + 'px'; leaf.style.height = PH + 'px';
    leaf.innerHTML = '<div class="face front"></div><div class="face back"></div>';
    book.appendChild(leaf);
    leaves.push({ el: leaf, front: leaf.children[0], back: leaf.children[1], a: 0 });
  }

  function panelSVG(p, pn) {
    const w = pn.art ? (pn._w || (pn._w = pn.art())) : (p._w || (p._w = p.world()));
    const ex = pn.extra ? pn.extra() : {};
    const ar = pn.h / pn.w;
    const [cx, cy, cw] = pn.crop || [800, 500, 1600];
    const ch = cw * ar;
    const has = k => (w[k] || '') + (ex[k] || '');
    const tone = has('tone'), toneR = has('toneR');
    // фильтры только на видимую часть кадра (+ запас на «дыхание» камеры)
    const mx = cw * .08, my = ch * .08;
    const region = [cx - cw / 2 - mx, cy - ch / 2 - my, cw + mx * 2, ch + my * 2];
    const fInk = FX.local(pn.filter || p.filter || 'engV', region);
    const fTone = tone ? FX.local(pn.dots || 'dotK', region) : null;
    const fToneR = toneR ? FX.local('dotR', region) : null;
    const base = `<rect x="${region[0].toFixed(1)}" y="${region[1].toFixed(1)}" width="${region[2].toFixed(1)}" height="${region[3].toFixed(1)}" fill="#fff"/>`;
    // два слоя: статичный рисунок с фильтрами печати и отдельный «живой» слой поверх —
    // моргание, рот, пузыри не заставляют пересчитывать фильтры
    const vb = `${cx - cw / 2} ${cy - ch / 2} ${cw} ${ch}`;
    return `<svg class="art" viewBox="${vb}" preserveAspectRatio="xMidYMid slice">
      <defs>${w.defs || ''}${ex.defs || ''}${fInk.svg}${fTone ? fTone.svg : ''}${fToneR ? fToneR.svg : ''}</defs>
      <g class="cam">
        <g class="L-col">${has('col')}</g>
        ${fToneR ? `<g class="L-toneR" filter="url(#${fToneR.id})">${base}${toneR}</g>` : ''}
        ${fTone ? `<g class="L-tone" filter="url(#${fTone.id})">${base}${tone}</g>` : ''}
        <g class="L-ink" filter="url(#${fInk.id})">${base}${has('ink')}</g>
      </g></svg>
      <svg class="art art-top" viewBox="${vb}" preserveAspectRatio="xMidYMid slice"><g class="cam"><g class="L-top">${has('top')}</g></g></svg>`;
  }

  function renderPage(p) {
    const face = p.side === 'R' ? leaves[p.leaf].front : leaves[p.leaf].back;
    p.el = face;
    let html = `<div class="page ${p.cls || ''}" data-page="${p.id}">`;
    if (p.html) html += p.html();
    (p.panels || []).forEach(pn => {
      const style = `left:${pn.x}px;top:${pn.y}px;width:${pn.w}px;height:${pn.h}px;${pn.clip ? `clip-path:${pn.clip};` : ''}`;
      html += `<div class="panel ${pn.cls || ''}" data-panel="${pn.id}" style="${style}">${panelSVG(p, pn)}${pn.html || ''}<div class="dim"></div></div>`;
    });
    if (!p.bare) html += `<div class="pg-head"><span>ТАЙНОПИСЬ · №1</span><span>${p.head || ''}</span></div><div class="pg-num ${p.side}">${p.i}</div>`;
    html += `<div class="shade"></div></div>`;
    face.innerHTML = html;
    p.q = (sel) => [...face.querySelectorAll(sel)];
    p.q1 = (sel) => face.querySelector(sel);
  }
  pages.forEach(renderPage);

  // ---------- инструменты для сцен
  const KIT = {
    pop(tl, el, t, d = .3) {
      if (!el) return;
      const o = el.dataset.tail || el.dataset.at;
      tl.fromTo(el, { scale: 0, svgOrigin: o }, { scale: 1, svgOrigin: o, duration: d, ease: 'back.out(2.2)' }, t);
    },
    rot(tl, els, cx, cy, a0, a1, t, d = .4, ease = 'power2.inOut') {
      if (!els.length) return;
      tl.fromTo(els, { attr: { transform: `rotate(${a0} ${cx} ${cy})` } }, { attr: { transform: `rotate(${a1} ${cx} ${cy})` }, duration: d, ease }, t);
    },
    shift(tl, els, x0, y0, x1, y1, t, d = .4, ease = 'power2.inOut') {
      if (!els.length) return;
      tl.fromTo(els, { attr: { transform: `translate(${x0} ${y0})` } }, { attr: { transform: `translate(${x1} ${y1})` }, duration: d, ease }, t);
    },
    fadeIn(tl, els, t, d = .3) { if (els.length) tl.fromTo(els, { opacity: 0 }, { opacity: 1, duration: d }, t); }
  };

  // ---------- шаги чтения и таймлайн
  const FLIP = 1.15;
  const steps = [];
  let T = 0;
  const master = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
  const cam = { x: 0, y: 0, w: PW, h: PH, tilt: 32, res: 0, zoom: .92 };
  let prevRect = null;

  const rectOf = (p, panelId, pad = 14) => {
    const x0 = p.side === 'R' ? 0 : -PW;
    if (!panelId || panelId === 'page') return { x: x0 - 20, y: -20, w: PW + 40, h: PH + 40 };
    if (typeof panelId === 'object') return { x: x0 + panelId.x - pad, y: panelId.y - pad, w: panelId.w + pad * 2, h: panelId.h + pad * 2 };
    const pn = p.panels.find(q => q.id === panelId);
    return { x: x0 + pn.x - pad, y: pn.y - pad, w: pn.w + pad * 2, h: pn.h + pad * 2 };
  };
  const spread = { x: -PW - 30, y: -30, w: PW * 2 + 60, h: PH + 60 };

  function camTo(rect, t, d, extra = {}) {
    const from = prevRect || rect;
    master.fromTo(cam, { x: from.x, y: from.y, w: from.w, h: from.h, tilt: from.tilt || 0, res: from.res || 0, zoom: from.zoom || 1 },
      { x: rect.x, y: rect.y, w: rect.w, h: rect.h, tilt: extra.tilt || 0, res: extra.res || 0, zoom: extra.zoom || 1, duration: d, ease: 'power2.inOut', immediateRender: false }, t);
    prevRect = Object.assign({}, rect, { tilt: extra.tilt || 0, res: extra.res || 0, zoom: extra.zoom || 1 });
  }

  const flips = [];
  function flipLeaf(l, t) {
    flips.push([t - .3, t + .85]);
    const lf = leaves[l];
    const o = { a: 0 };
    master.fromTo(o, { a: 0 }, { a: -180, duration: .8, ease: 'power2.inOut', immediateRender: false, onUpdate: () => setLeaf(lf, o.a) }, t);
    master.call(() => window.SFX && SFX.page(), null, t + .05);
  }
  function setLeaf(lf, a) {
    lf.a = a;
    const el = lf.el, l = +el.dataset.l;
    if (a > -.01) el.style.transform = 'none';
    else if (a < -179.99) el.style.transform = 'scaleX(-1)';
    else el.style.transform = `perspective(2600px) rotateY(${a.toFixed(2)}deg)`;
    const showBack = a <= -90;
    // display, а не visibility: скрытые SVG-фильтры в Chrome всё равно рисуются чёрным
    if (lf.showBack !== showBack) { lf.front.style.display = showBack ? 'none' : ''; lf.back.style.display = showBack ? '' : 'none'; lf.showBack = showBack; }
    el.style.zIndex = a > -.01 ? NL - l : a < -179.99 ? 10 + l : 400;
    const sh = Math.sin(-a * Math.PI / 180) * .55;
    const fs = lf.front.querySelector('.shade'), bs = lf.back.querySelector('.shade');
    if (fs) fs.style.opacity = showBack ? 0 : sh;
    if (bs) bs.style.opacity = showBack ? sh : 0;
  }
  leaves.forEach(lf => setLeaf(lf, 0));

  const portrait = () => innerWidth / innerHeight < .9;

  pages.forEach((p, pi) => {
    (p.steps || [{ panel: 'page', len: 1 }]).forEach((st, si) => {
      if (si === 0 && pi > 0 && p.side === 'L') {
        // перелистнуть лист, оборот которого — эта страница
        const prevP = pages[pi - 1];
        camTo(portrait() ? rectOf(prevP, 'page') : spread, T, .35, { zoom: .96 });
        flipLeaf(p.leaf, T + .25);
        T += FLIP;
      }
      st.page = p; st.T = T; st.idx = steps.length;
      const rect = st.rect ? st.rect : rectOf(p, st.panel, st.pad);
      const move = st.move ?? (si === 0 && pi === 0 ? 0 : .5);
      if (pi === 0 && si === 0) { prevRect = Object.assign({}, rect, { tilt: st.tilt || 0, zoom: st.zoom || 1 }); Object.assign(cam, prevRect); }
      else camTo(rect, T, move, { tilt: st.tilt || 0, res: st.widget ? 1 : 0, zoom: st.zoom || 1 });
      st.arrive = T + move;
      const tl = gsap.timeline({ defaults: { ease: 'none' } });
      if (st.build) st.build(tl, p, KIT, st);
      tl.set({}, {}, st.len);
      master.add(tl, T);
      master.addLabel('st' + st.idx, st.arrive);
      steps.push(st);
      T += st.len;
    });
  });
  master.addLabel('end', T);
  const TOTAL = T;

  // интерактив страниц
  pages.forEach(p => p.init && p.init(p, KIT));

  // ---------- камера
  const hud = $('.hud');
  function applyCamera() {
    const W = innerWidth, H = innerHeight, por = portrait();
    const hudH = hud.offsetHeight || 48;
    let top = hudH + 6, bottom = 10, left = 10, right = 10;
    const cur = steps[curStep];
    if (cam.res > 0 && cur) {
      const wEl = cur.widget ? $(`#w-${cur.widget}`) : null;
      if (!por && W >= 1100) right += cam.res * ((wEl ? wEl.offsetWidth : 380) + 20);
      else bottom += cam.res * ((wEl ? wEl.offsetHeight : 200) + 14);
    }
    if (por && capBox.classList.contains('on')) top += capBox.offsetHeight * .0;
    const aw = Math.max(50, W - left - right), ah = Math.max(50, H - top - bottom);
    const s = Math.min(aw / cam.w, ah / cam.h) * cam.zoom;
    const cx = cam.x + cam.w / 2, cy = cam.y + cam.h / 2;
    const sx = left + aw / 2, sy = top + ah / 2;
    world.style.transform = `translate(${sx.toFixed(2)}px,${sy.toFixed(2)}px) scale(${s.toFixed(5)}) translate(${(-cx).toFixed(2)}px,${(-cy).toFixed(2)}px)`;
    const tilt = cam.tilt + (por ? 0 : 0);
    book.style.transform = tilt > .05 ? `perspective(2200px) rotateX(${tilt.toFixed(2)}deg) rotateZ(${(-tilt * .22).toFixed(2)}deg)` : '';
    camState.s = s; camState.cx = cx; camState.cy = cy; camState.sx = sx; camState.sy = sy;
    placeCaption();
  }
  const camState = {};
  const toScreen = (bx, by) => [camState.sx + (bx - camState.cx) * camState.s, camState.sy + (by - camState.cy) * camState.s];

  // ---------- подписи (в экранных координатах, крупным кеглем)
  const capBox = $('#cap');
  function placeCaption() {
    const st = steps[curStep];
    if (!st || !st.cap || !capBox.classList.contains('on')) return;
    const r = rectOf(st.page, st.panel, 0);
    const [x0, y0] = toScreen(r.x, r.y), [x1, y1] = toScreen(r.x + r.w, r.y + r.h);
    const W = innerWidth, H = innerHeight, cw = capBox.offsetWidth, chh = capBox.offsetHeight;
    const hudH = hud.offsetHeight || 48;
    let x, y;
    if (portrait()) {
      x = Math.max(8, Math.min(W - cw - 8, x0 + 10));
      if (y0 - hudH - 10 >= chh) y = y0 - chh - 8;          // над кадром
      else if (H - y1 - 10 >= chh) y = y1 + 8;                 // под кадром
      else y = Math.max(hudH + 6, y1 - chh - 12);             // внутри снизу
    } else {
      x = Math.max(10, Math.min(W - cw - 10, x0 + 16));
      y = Math.min(H - chh - 12, Math.max(hudH + 8, y1 - chh - 16));
      if (st.capPos === 'top') y = Math.max(hudH + 8, y0 + 16);
    }
    capBox.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
  }

  // ---------- скролл
  gsap.registerPlugin(ScrollTrigger);
  gsap.ticker.lagSmoothing(0);   // на тяжёлом кадре не растягивать анимацию — сразу догонять скролл
  const scroller = $('#scroller');
  scroller.style.height = (TOTAL * 100 + 100) + 'vh';
  const stTrig = ScrollTrigger.create({ trigger: scroller, start: 'top top', end: 'bottom bottom', animation: master, scrub: reduce ? true : .65 });
  master.eventCallback('onUpdate', onTime);

  // ---------- текущий шаг: подпись, виджет, затемнение кадров, шапка
  let curStep = -1, curPage = -1, stepSince = 0, wasFlipping = false;
  const hudPlace = $('#hudPlace'), hudYear = $('#hudYear'), hudFrame = $('#hudFrame'), fill = $('#progressFill');
  const prompterText = $('#prompterText');
  const yr = { v: 0 };
  const fmtYear = v => { v = Math.round(v); return v < 0 ? `${-v} до н. э.` : `${v} год`; };

  function onTime() {
    const t = master.time();
    fill.style.transform = `scaleX(${(t / TOTAL).toFixed(4)})`;
    let k = 0;
    for (let i = 0; i < steps.length; i++) if (t >= steps[i].T + Math.min(.3, (steps[i].arrive - steps[i].T) * .6)) k = i;
    if (k !== curStep) setStep(k);
    // пока лист переворачивается, подписи и виджеты убираем
    const flipping = flips.some(([a, b]) => t > a && t < b);
    if (flipping !== wasFlipping) { wasFlipping = flipping; document.documentElement.classList.toggle('flipping', flipping); }
    applyCamera();
    visibility(t);
  }
  function setStep(k) {
    const old = steps[curStep];
    curStep = k; stepSince = performance.now();
    const st = steps[k], p = st.page;
    // кадры: активный ярко, остальные приглушены
    pages.forEach(pg => pg.q && pg.q('.panel').forEach(el => el.classList.toggle('dimmed', !!(pg === p && typeof st.panel === 'string' && st.panel !== 'page' && el.dataset.panel !== st.panel))));
    // подпись
    if (st.cap) {
      capBox.innerHTML = `${st.cap.k ? `<p class="cap-k">${st.cap.k}</p>` : ''}<p>${st.cap.t}</p>${st.cap.n ? `<p class="cap-note">${st.cap.n}</p>` : ''}`;
      capBox.classList.add('on');
    } else capBox.classList.remove('on');
    // виджеты
    document.querySelectorAll('.widget').forEach(w => w.classList.toggle('on', !!st.widget && w.id === 'w-' + st.widget));
    // страница
    if (p.i !== curPage) {
      const oldPage = curPage; curPage = p.i;
      hudPlace.textContent = p.place || '';
      hudFrame.textContent = p.num != null ? `${String(p.num).padStart(2, '0')}/${BOOK.chapters}` : '';
      gsap.killTweensOf(yr);   // иначе счётчик прошлой страницы допишет старый год
      if (p.year != null && !p.yearText) gsap.to(yr, { v: p.year, duration: oldPage < 0 ? 0 : .9, ease: 'power2.out', onUpdate: () => hudYear.textContent = fmtYear(yr.v) });
      else { if (p.year != null) yr.v = p.year; hudYear.textContent = p.yearText || ''; }
      prompterText.innerHTML = (p.speech || []).map(([w, t]) => `<p><b>${w}</b>${t}</p>`).join('') || '<p class="muted">Здесь реплик нет — листай дальше.</p>';
      bustFollow(p);
    }
    if (old && window.SFX) SFX.whoosh();
    talkUntil = performance.now() + (st.talkMs || 2200);
    talking = st.talk || [];
  }

  // показываем только ближайшие листы — так быстрее
  let visKey = '';
  function visibility(t) {
    const st = steps[curStep]; if (!st) return;
    const L = st.page.leaf;
    const key = [L - 1, L, L + 1].join(',');
    if (key === visKey) return; visKey = key;
    leaves.forEach((lf, i) => { lf.el.style.display = Math.abs(i - L) <= 1 ? '' : 'none'; });
  }

  // ---------- жизнь персонажей: моргание, взгляд, речь
  let talking = [], talkUntil = 0;
  const allChars = () => { const st = steps[curStep]; return st ? (st.page.chars || []) : []; };
  function blinkLoop() {
    const chars = allChars();
    if (chars.length && !document.hidden) {
      const id = chars[Math.floor(Math.random() * chars.length)];
      const p = steps[curStep].page;
      const lids = p.q(`.ch-${id} .lids`);
      if (lids.length) { gsap.set(lids, { opacity: 1 }); gsap.delayedCall(.12, () => gsap.set(lids, { opacity: 0 })); }
    }
    gsap.delayedCall(.6 + Math.random() * 1.6, blinkLoop);
  }
  function lookLoop() {
    const chars = allChars();
    if (chars.length && !document.hidden) {
      const id = chars[Math.floor(Math.random() * chars.length)];
      const p = steps[curStep].page;
      const ir = p.q(`.ch-${id} .iris`);
      if (ir.length) gsap.to(ir, { x: (Math.random() - .5) * 7, y: (Math.random() - .5) * 4, duration: .18, ease: 'power2.out' });
    }
    gsap.delayedCall(.9 + Math.random() * 1.8, lookLoop);
  }
  let mouthOpen = false;
  gsap.ticker.add(() => {
    const now = performance.now();
    const st = steps[curStep]; if (!st) return;
    const p = st.page;
    const want = now < talkUntil ? (Math.sin(now / 62) + Math.sin(now / 37)) > .2 : false;
    if (want !== mouthOpen) {
      mouthOpen = want;
      for (const id of talking) {
        p.q(`.ch-${id} .m1`).forEach(e => e.setAttribute('opacity', want ? 1 : 0));
        p.q(`.ch-${id} .m0`).forEach(e => e.setAttribute('opacity', want ? 0 : 1));
      }
    }
  });
  if (!reduce) { blinkLoop(); lookLoop(); }

  // ---------- 3D-бюст Цезаря (обложка и финал)
  let bust = null;
  const bustHosts = () => [...document.querySelectorAll('.bust-host')];
  async function initBust() {
    try {
      if (!window.createBust) throw new Error('no module');
      const host = bustHosts()[0];
      bust = await window.createBust(host, { yaw: -.55 });
      document.documentElement.classList.add('has-bust');
      bustFollow(steps[curStep] ? steps[curStep].page : pages[0]);
    } catch (e) {
      document.documentElement.classList.add('no-bust');
    }
  }
  // бюст живёт на видимой странице разворота: текущей или соседней
  function bustFollow(p) {
    if (!bust || !p) return;
    const partner = p.side === 'L' ? pages[p.i + 1] : (p.i > 0 ? pages[p.i - 1] : null);
    const find = pg => pg && pg.el && pg.el.querySelector('.bust-host');
    const host = find(p) || find(partner);
    if (host) { if (bust.host !== host) { bust.moveTo(host); bust.host = host; } bust.visible = true; }
    else bust.visible = false;
  }
  window.addEventListener('bust-ready', initBust);
  if (window.createBust) initBust();
  BOOK.bustYaw = v => { if (bust) bust.yaw = v; };

  // ---------- шапка: суфлёр, звук, речь
  const prompter = $('#prompter'), btnP = $('#btnPrompter');
  btnP.addEventListener('click', () => { const on = prompter.hidden; prompter.hidden = !on; btnP.setAttribute('aria-pressed', on); document.documentElement.classList.toggle('prompting', on); });
  $('#speechList').innerHTML = pages.map(p => (p.speech || []).map(([w, t]) =>
    `<li><span class="sp-k">${p.num != null ? String(p.num).padStart(2, '0') + ' · ' : ''}${p.place || ''}</span><span class="sp-w sp-${w === 'А' ? 'a' : 'b'}">${w}</span><p>${t}</p></li>`).join('')).join('');

  // ---------- навигация: клавиши и «доводка» свайпа до ближайшего кадра
  const labels = () => Object.keys(master.labels).sort((a, b) => master.labels[a] - master.labels[b]);
  let navUntil = 0;
  function smooth(y) { navUntil = Date.now() + 900; scrollTo({ top: y, behavior: 'smooth' }); }
  function go(dir) {
    const t = master.time(), L = labels();
    const target = dir > 0 ? L.find(l => master.labels[l] > t + .02) : [...L].reverse().find(l => master.labels[l] < t - .02);
    if (!target) { if (dir > 0) $('#speech').scrollIntoView({ behavior: 'smooth' }); return; }
    smooth(stTrig.labelToScroll(target));
  }
  addEventListener('keydown', e => {
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;
    if (tag === 'button' && (e.key === ' ' || e.key === 'Enter')) return;
    if (scrollY > stTrig.end + 10) return;
    const st = steps[curStep];
    if (st && st.page.onKey && !e.metaKey && !e.ctrlKey && st.page.onKey(e)) { e.preventDefault(); return; }
    if (['ArrowDown', 'PageDown', ' ', 'ArrowRight'].includes(e.key)) { e.preventDefault(); go(1); }
    if (['ArrowUp', 'PageUp', 'ArrowLeft'].includes(e.key)) { e.preventDefault(); go(-1); }
  });
  let lastY = scrollY, dir = 1;
  addEventListener('scroll', () => { const y = scrollY; if (y !== lastY) dir = y > lastY ? 1 : -1; lastY = y; world.classList.add('moving'); document.documentElement.classList.toggle('scrolled', y > 40); }, { passive: true });
  ScrollTrigger.addEventListener('scrollEnd', () => {
    world.classList.remove('moving');
    if (reduce || Date.now() < navUntil) return;
    const y = scrollY;
    if (y < stTrig.start - 2 || y > stTrig.end - 2) return;
    const pos = labels().map(l => stTrig.labelToScroll(l)).sort((a, b) => a - b);
    if (pos.some(p => Math.abs(p - y) < 4)) return;
    let target = dir > 0 ? pos.find(p => p > y) : [...pos].reverse().find(p => p < y);
    const near = pos.reduce((a, b) => Math.abs(b - y) < Math.abs(a - y) ? b : a);
    if (target == null || Math.abs(target - y) > innerHeight * 1.4) target = near;
    smooth(target);
  });
  document.querySelectorAll('[data-goto="0"]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); scrollTo({ top: 0, behavior: 'smooth' }); }));

  // ---------- звук
  const SFX = window.SFX = {
    on: false, ctx: null,
    init() { if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); },
    tone(f, d, type = 'sine', g = .08, f2) {
      if (!this.on) return; const c = this.ctx, t = c.currentTime;
      const o = c.createOscillator(), a = c.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
      a.gain.setValueAtTime(g, t); a.gain.exponentialRampToValueAtTime(.0001, t + d);
      o.connect(a).connect(c.destination); o.start(t); o.stop(t + d + .02);
    },
    noise(d, f0, f1, g = .12) {
      if (!this.on) return; const c = this.ctx, t = c.currentTime;
      const b = c.createBuffer(1, c.sampleRate * d, c.sampleRate), ch = b.getChannelData(0);
      for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
      const s = c.createBufferSource(); s.buffer = b;
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.2;
      bp.frequency.setValueAtTime(f0, t); bp.frequency.exponentialRampToValueAtTime(f1, t + d);
      const a = c.createGain(); a.gain.setValueAtTime(.0001, t); a.gain.exponentialRampToValueAtTime(g, t + d * .3); a.gain.exponentialRampToValueAtTime(.0001, t + d);
      s.connect(bp).connect(a).connect(c.destination); s.start(t);
    },
    tick() { this.tone(1400, .04, 'square', .025); },
    key() { this.tone(180, .06, 'square', .06); this.noise(.05, 3000, 2000, .08); },
    click() { this.tone(110, .12, 'triangle', .25, 60); this.noise(.06, 2500, 1200, .1); },
    whoosh() { this.noise(.3, 400, 1800, .05); },
    page() { this.noise(.55, 900, 3800, .14); this.noise(.25, 2500, 600, .06); },
    win() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, .25, 'triangle', .07), i * 70)); }
  };
  const bs = $('#btnSound');
  bs.addEventListener('click', () => { SFX.init(); SFX.on = !SFX.on; bs.setAttribute('aria-pressed', SFX.on); if (SFX.on) SFX.win(); });

  // ---------- трейлер
  const modal = $('#trailerModal'), vid = $('#trailerVideo');
  document.addEventListener('click', e => { if (e.target.closest('[data-trailer]')) { modal.hidden = false; vid.currentTime = 0; vid.play().catch(() => { }); } });
  const closeM = () => { modal.hidden = true; vid.pause(); };
  $('#trailerClose').addEventListener('click', closeM);
  modal.addEventListener('click', e => { if (e.target === modal) closeM(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hidden) closeM(); });

  addEventListener('resize', () => applyCamera());
  document.fonts && document.fonts.ready.then(() => applyCamera());
  onTime();
  setStep(0);
  applyCamera();
  document.documentElement.classList.add('ready');
  window.__book = { master, steps, pages, stTrig, cam };
})();
