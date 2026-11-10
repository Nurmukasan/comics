/* Движок 3D-книги комиксов.
   Книга = листы; у листа лицевая сторона (правая страница) и оборот (левая).
   Листаем по шагам: одно нажатие (↓, колесо, свайп, кнопка) проигрывает
   следующую анимацию целиком — камера переезжает к кадру, лист переворачивается,
   пузыри выскакивают — и останавливается. Персонажи моргают, водят глазами
   и говорят, пока у них реплика. */
(function () {
  const BOOK = window.BOOK, A = window.ART;
  const PW = BOOK.PW, PH = BOOK.PH;
  const pages = BOOK.pages;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = s => document.querySelector(s);
  const portrait = () => innerWidth / innerHeight < .9;

  // книга собирается после загрузки шрифтов: пузыри мерят текст настоящими буквами
  const fontsReady = Promise.race([
    Promise.all(['400 40px Pangolin', '700 40px Unbounded', '900 40px Unbounded', '400 40px "Rubik Mono One"', '700 40px Cinzel']
      .map(f => document.fonts ? document.fonts.load(f).catch(() => { }) : null)),
    new Promise(r => setTimeout(r, 3500))
  ]);
  fontsReady.then(build);

  function build() {
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
      const ar = pn.h / pn.w;
      const [cx, cy, cw] = pn.crop || [800, 500, 1600];
      const ch = cw * ar;
      // пузыри и звуки этого кадра не выходят за его края
      A.setFit({ x: cx - cw / 2, y: cy - ch / 2, w: cw, h: ch, m: Math.min(cw, ch) * .035 + 6, boost: portrait() && pn.w > 600 ? 1.25 : 1 });
      const ex = pn.extra ? pn.extra() : {};
      A.setFit(null);
      const has = k => (w[k] || '') + (ex[k] || '');
      const tone = has('tone'), toneR = has('toneR');
      const mx = cw * .08, my = ch * .08;
      const region = [cx - cw / 2 - mx, cy - ch / 2 - my, cw + mx * 2, ch + my * 2];
      const fInk = FX.local(pn.filter || p.filter || 'engV', region);
      const fTone = tone ? FX.local(pn.dots || 'dotK', region) : null;
      const fToneR = toneR ? FX.local('dotR', region) : null;
      const base = `<rect x="${region[0].toFixed(1)}" y="${region[1].toFixed(1)}" width="${region[2].toFixed(1)}" height="${region[3].toFixed(1)}" fill="#fff"/>`;
      // два слоя: статичный рисунок с фильтрами печати и «живой» слой поверх —
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
      // пузырь выскакивает из хвостика, потом слова проявляются по одному
      pop(tl, el, t, d = .34) {
        if (!el) return;
        const o = el.dataset.tail || el.dataset.at;
        tl.fromTo(el, { scale: .2, rotation: -9, opacity: 0, svgOrigin: o }, { scale: 1, rotation: 0, opacity: 1, svgOrigin: o, duration: d, ease: 'back.out(2.1)' }, t);
        const words = el.querySelectorAll('.w');
        if (words.length) tl.fromTo(words, { attr: { 'fill-opacity': 0, 'stroke-opacity': 0 } }, { attr: { 'fill-opacity': 1, 'stroke-opacity': 1 }, duration: .07, stagger: Math.min(.06, .55 / words.length) }, t + d * .55);
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

    // ---------- шаги чтения и общий таймлайн
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
      flips.push([t - .15, t + .85]);
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
        st.camRect = rect; st.camZoom = st.zoom || 1;
        const tl = gsap.timeline({ defaults: { ease: 'none' } });
        if (st.build) st.build(tl, p, KIT, st);
        const content = tl.duration();
        st.len = Math.max(st.len, content + .1, move + .1);   // шаг не короче своей анимации
        tl.set({}, {}, st.len);
        master.add(tl, T);
        // остановка шага — когда доиграли все его анимации; хвост шага без движения пропускаем
        st.stop = T + Math.max(move, content) + .02;
        st.end = T + st.len;
        master.addLabel('st' + st.idx, st.stop);
        steps.push(st);
        T += st.len;
      });
    });
    master.addLabel('end', T);
    const TOTAL = T;

    // интерактив страниц
    pages.forEach(p => p.init && p.init(p, KIT));

    // ---------- элементы интерфейса
    const hud = $('.hud'), nav = $('.nav'), capBox = $('#cap');
    const hudPlace = $('#hudPlace'), hudYear = $('#hudYear'), hudFrame = $('#hudFrame'), fill = $('#progressFill');
    const prompterText = $('#prompterText'), navCount = $('#navCount'), navPrev = $('#navPrev'), navNext = $('#navNext');

    // ---------- подписи рассказчика: всегда на странице комикса
    // широкий экран — внутри кадра; телефон — над или под кадром, где у страницы больше места
    function capSide(st) {
      if (!portrait()) return st.capPos === 'top' ? 'in-top' : 'in-bottom';
      let y0 = 0, y1 = PH;
      if (typeof st.panel === 'string' && st.panel !== 'page') { const pn = st.page.panels.find(q => q.id === st.panel); y0 = pn.y; y1 = pn.y + pn.h; }
      else if (st.panel && typeof st.panel === 'object') { y0 = st.panel.y; y1 = st.panel.y + st.panel.h; }
      const above = y0, below = PH - y1;
      if (Math.max(above, below) < 240) return st.capPos === 'top' ? 'in-top' : 'in-bottom';
      return below >= above ? 'below' : 'above';
    }
    const capRes = { top: 0, bottom: 0 };
    let capPlan = { side: 'in-bottom', h: 0 };
    function layoutCaption() {
      const st = steps[curStep];
      if (!st || !st.cap) { capPlan = { side: 'none', h: 0 }; gsap.to(capRes, { top: 0, bottom: 0, duration: .45, ease: 'power2.inOut', onUpdate: applyCamera }); return; }
      const por = portrait();
      const r = rectOf(st.page, st.panel, 0);
      const s = fitScale(st.camRect, st.camZoom, st.widget ? 1 : 0, 0, 0);
      const pw = r.w * s, ph = r.h * s;
      // узкий кадр — плашка почти во всю ширину, широкий — до 480 px; кегль уменьшается, только если плашка закрывает больше 40 % кадра
      const width = por ? Math.min(innerWidth - 16, Math.max(260, pw)) : pw < 640 ? Math.max(260, pw - 28) : Math.min(480, pw * .6);
      capBox.style.width = Math.round(width) + 'px';
      let fz = por ? 16 : 19;
      capBox.style.fontSize = fz + 'px';
      if (!por) while (capBox.offsetHeight > ph * .4 && fz > 15) capBox.style.fontSize = (--fz) + 'px';
      const side = capSide(st), h = capBox.offsetHeight;
      capPlan = { side, h };
      gsap.to(capRes, { top: side === 'above' ? h + 14 : 0, bottom: side === 'below' ? h + 14 : 0, duration: .45, ease: 'power2.inOut', onUpdate: applyCamera });
    }

    // ---------- камера
    function reserves(res) {
      const W = innerWidth, H = innerHeight, por = portrait();
      const r = { top: (hud.offsetHeight || 48) + 8, bottom: (nav.offsetHeight || 56) + 22, left: 12, right: 12 };
      const st = steps[curStep];
      if (res > 0 && st) {
        const wEl = st.widget ? $(`#w-${st.widget}`) : null;
        if (!por && W >= 1100) r.right += res * ((wEl ? wEl.offsetWidth : 380) + 22);
        else r.bottom += res * ((wEl ? wEl.offsetHeight : 200) + 14);
      }
      return r;
    }
    function fitScale(rect, zoom, res, extraTop, extraBottom) {
      const r = reserves(res);
      const aw = Math.max(50, innerWidth - r.left - r.right), ah = Math.max(50, innerHeight - r.top - r.bottom - extraTop - extraBottom);
      return Math.min(aw / rect.w, ah / rect.h) * zoom;
    }
    const camState = {};
    function applyCamera() {
      const r = reserves(cam.res);
      r.top += capRes.top; r.bottom += capRes.bottom;
      const aw = Math.max(50, innerWidth - r.left - r.right), ah = Math.max(50, innerHeight - r.top - r.bottom);
      const s = Math.min(aw / cam.w, ah / cam.h) * cam.zoom;
      const cx = cam.x + cam.w / 2, cy = cam.y + cam.h / 2;
      const sx = r.left + aw / 2, sy = r.top + ah / 2;
      world.style.transform = `translate(${sx.toFixed(2)}px,${sy.toFixed(2)}px) scale(${s.toFixed(5)}) translate(${(-cx).toFixed(2)}px,${(-cy).toFixed(2)}px)`;
      book.style.transform = cam.tilt > .05 ? `perspective(2200px) rotateX(${cam.tilt.toFixed(2)}deg) rotateZ(${(-cam.tilt * .22).toFixed(2)}deg)` : '';
      Object.assign(camState, { s, cx, cy, sx, sy });
      placeCaption();
    }
    const toScreen = (bx, by) => [camState.sx + (bx - camState.cx) * camState.s, camState.sy + (by - camState.cy) * camState.s];
    function placeCaption() {
      const st = steps[curStep];
      if (!st || !st.cap) return;
      const r = rectOf(st.page, st.panel, 0);
      const [x0, y0] = toScreen(r.x, r.y), [x1, y1] = toScreen(r.x + r.w, r.y + r.h);
      const W = innerWidth, cw = capBox.offsetWidth, ch = capPlan.h || capBox.offsetHeight;
      let x = Math.max(8, Math.min(W - cw - 8, x0 + (portrait() ? 0 : 14))), y;
      if (capPlan.side === 'below') y = y1 + 10;
      else if (capPlan.side === 'above') y = y0 - ch - 10;
      else if (capPlan.side === 'in-top') y = y0 + 14;
      else y = y1 - ch - 14;
      capBox.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(-.6deg)`;
    }

    // ---------- текущий шаг: подпись, виджет, приглушение кадров, шапка
    let curStep = -1, curPage = -1, wasFlipping = false;
    const yr = { v: 0 };
    const fmtYear = v => { v = Math.round(v); return v < 0 ? `${-v} до н. э.` : `${v} год`; };
    master.eventCallback('onUpdate', onTime);

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
      visibility();
    }
    function setStep(k) {
      const old = steps[curStep];
      curStep = k;
      const st = steps[k], p = st.page;
      pages.forEach(pg => pg.q && pg.q('.panel').forEach(el => el.classList.toggle('dimmed', !!(pg === p && typeof st.panel === 'string' && st.panel !== 'page' && el.dataset.panel !== st.panel))));
      // подпись рассказчика
      if (st.cap) {
        capBox.innerHTML = `${st.cap.k ? `<p class="cap-k">${st.cap.k}</p>` : ''}<p>${st.cap.t}</p>${st.cap.n ? `<p class="cap-note">${st.cap.n}</p>` : ''}`;
        capBox.classList.add('on');
        capBox.classList.remove('in'); void capBox.offsetWidth; capBox.classList.add('in');
      } else capBox.classList.remove('on', 'in');
      layoutCaption();
      document.querySelectorAll('.widget').forEach(w => w.classList.toggle('on', !!st.widget && w.id === 'w-' + st.widget));
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
    function visibility() {
      const st = steps[curStep]; if (!st) return;
      const L = st.page.leaf, key = String(L);
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
        const lids = steps[curStep].page.q(`.ch-${id} .lids`);
        if (lids.length) { gsap.set(lids, { opacity: 1 }); gsap.delayedCall(.12, () => gsap.set(lids, { opacity: 0 })); }
      }
      gsap.delayedCall(.6 + Math.random() * 1.6, blinkLoop);
    }
    function lookLoop() {
      const chars = allChars();
      if (chars.length && !document.hidden) {
        const id = chars[Math.floor(Math.random() * chars.length)];
        const ir = steps[curStep].page.q(`.ch-${id} .iris`);
        if (ir.length) gsap.to(ir, { x: (Math.random() - .5) * 7, y: (Math.random() - .5) * 4, duration: .18, ease: 'power2.out' });
      }
      gsap.delayedCall(.9 + Math.random() * 1.8, lookLoop);
    }
    let mouthOpen = false;
    gsap.ticker.add(() => {
      const now = performance.now();
      const st = steps[curStep]; if (!st) return;
      const want = now < talkUntil ? (Math.sin(now / 62) + Math.sin(now / 37)) > .2 : false;
      if (want !== mouthOpen) {
        mouthOpen = want;
        for (const id of talking) {
          st.page.q(`.ch-${id} .m1`).forEach(e => e.setAttribute('opacity', want ? 1 : 0));
          st.page.q(`.ch-${id} .m0`).forEach(e => e.setAttribute('opacity', want ? 0 : 1));
        }
      }
    });
    if (!reduce) { blinkLoop(); lookLoop(); }

    // ---------- 3D-бюст Цезаря (обложка и финал)
    let bust = null;
    async function initBust() {
      if (bust || !window.createBust) return;
      try {
        bust = await window.createBust(document.querySelector('.bust-host'), { yaw: -.55 });
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
    initBust();
    BOOK.bustYaw = v => { if (bust) bust.yaw = v; };

    // ---------- суфлёр и текст выступления
    const prompter = $('#prompter'), btnP = $('#btnPrompter');
    btnP.addEventListener('click', () => { const on = prompter.hidden; prompter.hidden = !on; btnP.setAttribute('aria-pressed', on); document.documentElement.classList.toggle('prompting', on); });
    $('#speechList').innerHTML = pages.map(p => (p.speech || []).map(([w, t]) =>
      `<li><span class="sp-k">${p.num != null ? String(p.num).padStart(2, '0') + ' · ' : ''}${p.place || ''}</span><span class="sp-w sp-${w === 'А' ? 'a' : 'b'}">${w}</span><p>${t}</p></li>`).join('')).join('');
    const speech = $('#speech');
    const speechOpen = () => !speech.hidden;
    function openSpeech() { speech.hidden = false; speech.scrollTop = 0; document.documentElement.classList.add('reading'); $('#speechClose').focus({ preventScroll: true }); }
    function closeSpeech() { speech.hidden = true; document.documentElement.classList.remove('reading'); }
    document.addEventListener('click', e => {
      const a = e.target.closest('a[href="#speech"]');
      if (a) { e.preventDefault(); openSpeech(); }
    });
    $('#speechClose').addEventListener('click', closeSpeech);

    // ---------- навигация по шагам
    let cur = 0, navTween = null;
    const dur = d => reduce ? .2 : Math.min(2.3, Math.max(.5, d * .72));
    function finished() {
      navTween = null;
      world.classList.remove('moving');
      history.replaceState(null, '', '#' + (cur + 1));
    }
    function updateNav() {
      navCount.textContent = `${cur + 1} / ${steps.length}`;
      navPrev.disabled = cur === 0;
      navNext.classList.toggle('last', cur === steps.length - 1);
    }
    function go(j, instant) {
      if (navTween) { const tw = navTween; navTween = null; tw.progress(1); }   // догнать текущий переход
      j = Math.max(0, Math.min(steps.length - 1, j));
      const i = cur, now = master.time();
      if (j === i && Math.abs(now - steps[j].stop) < .02) return;
      cur = j; updateNav();
      document.documentElement.classList.add('navigated');
      world.classList.add('moving');
      if (instant || Math.abs(j - i) > 1) { window.SFX && (SFX.mute = true); master.time(steps[j].stop); window.SFX && (SFX.mute = false); onTime(); finished(); return; }
      if (j > i) {
        const start = Math.max(now, steps[i].end);
        if (start > now) master.time(start);             // пропускаем «пустой» хвост шага
        navTween = master.tweenFromTo(start, steps[j].stop, { duration: dur(steps[j].stop - start), ease: 'power1.inOut', onComplete: finished });
      } else {
        const to = steps[j].end;
        navTween = master.tweenFromTo(now, to, { duration: dur(now - to) * .75, ease: 'power1.inOut', onComplete: () => { master.time(steps[j].stop); onTime(); finished(); } });
      }
    }
    const next = () => { if (cur >= steps.length - 1 && !navTween) { openSpeech(); return; } go(cur + 1); };
    const prev = () => go(cur - 1);
    navNext.addEventListener('click', next);
    navPrev.addEventListener('click', prev);
    document.querySelectorAll('[data-goto="0"]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); closeSpeech(); go(0, true); }));

    const modal = $('#trailerModal');
    addEventListener('keydown', e => {
      if (e.key === 'Escape') { if (!modal.hidden) return; if (speechOpen()) { closeSpeech(); return; } }
      if (speechOpen() || !modal.hidden) return;
      const tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      if (tag === 'button' && (e.key === ' ' || e.key === 'Enter')) return;
      const st = steps[curStep];
      if (st && st.page.onKey && !e.metaKey && !e.ctrlKey && !e.altKey && st.page.onKey(e)) { e.preventDefault(); return; }
      if (['ArrowDown', 'ArrowRight', 'PageDown', ' ', 'Enter'].includes(e.key)) { e.preventDefault(); next(); }
      else if (['ArrowUp', 'ArrowLeft', 'PageUp', 'Backspace'].includes(e.key)) { e.preventDefault(); prev(); }
      else if (e.key === 'Home') { e.preventDefault(); go(0, true); }
      else if (e.key === 'End') { e.preventDefault(); go(steps.length - 1, true); }
    });

    // колесо: один жест — один шаг. Пока события идут подряд (без паузы 0,25 с) —
    // это тот же жест, даже если колесо крутится долго или тачпад «докатывает» по инерции
    let wheelAcc = 0, wheelLocked = false, lastWheel = 0;
    addEventListener('wheel', e => {
      if (speechOpen() || !modal.hidden) return;
      const scroller = e.target.closest && e.target.closest('.ctext, .vtab');
      if (scroller && scroller.scrollHeight > scroller.clientHeight + 2) return;
      e.preventDefault();
      const now = performance.now(), gap = now - lastWheel;
      lastWheel = now;
      if (gap > 250) { wheelLocked = false; wheelAcc = 0; }
      if (wheelLocked) return;
      const k = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1;
      wheelAcc += (Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX) * k;
      if (Math.abs(wheelAcc) >= 24) { wheelLocked = true; wheelAcc > 0 ? next() : prev(); wheelAcc = 0; }
    }, { passive: false });

    // свайп на телефоне: вверх или влево — дальше, вниз или вправо — назад
    let touch = null;
    const stage = $('#stage');
    stage.addEventListener('touchstart', e => {
      if (e.touches.length !== 1 || e.target.closest('button, input, .key, .pk-hit, a')) { touch = null; return; }
      touch = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: performance.now() };
    }, { passive: true });
    stage.addEventListener('touchend', e => {
      if (!touch) return;
      const dx = e.changedTouches[0].clientX - touch.x, dy = e.changedTouches[0].clientY - touch.y;
      touch = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 40) return;
      if (Math.abs(dy) >= Math.abs(dx)) dy < 0 ? next() : prev();
      else dx < 0 ? next() : prev();
    }, { passive: true });
    stage.addEventListener('touchmove', e => { if (touch) e.preventDefault(); }, { passive: false });

    // ---------- звук
    const SFX = window.SFX = {
      on: false, mute: false, ctx: null,
      init() { if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); },
      tone(f, d, type = 'sine', g = .08, f2) {
        if (!this.on || this.mute) return; const c = this.ctx, t = c.currentTime;
        const o = c.createOscillator(), a = c.createGain();
        o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
        a.gain.setValueAtTime(g, t); a.gain.exponentialRampToValueAtTime(.0001, t + d);
        o.connect(a).connect(c.destination); o.start(t); o.stop(t + d + .02);
      },
      noise(d, f0, f1, g = .12) {
        if (!this.on || this.mute) return; const c = this.ctx, t = c.currentTime;
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
    const vid = $('#trailerVideo');
    document.addEventListener('click', e => { if (e.target.closest('[data-trailer]')) { modal.hidden = false; vid.currentTime = 0; vid.play().catch(() => { }); } });
    const closeM = () => { modal.hidden = true; vid.pause(); };
    $('#trailerClose').addEventListener('click', closeM);
    modal.addEventListener('click', e => { if (e.target === modal) closeM(); });
    addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hidden) closeM(); });

    addEventListener('resize', () => { layoutCaption(); applyCamera(); });

    // адрес #N — номер шага: можно дать ссылку на любой кадр или поправить адрес руками
    addEventListener('hashchange', () => {
      const m = /^#(\d+)$/.exec(location.hash);
      if (m && +m[1] - 1 !== cur) go(+m[1] - 1, true);
    });

    // ---------- старт: с шага из адреса (#12) или с обложки
    onTime();
    const fromHash = /^#(\d+)$/.exec(location.hash);
    if (fromHash && +fromHash[1] > 1) { cur = -1; go(+fromHash[1] - 1, true); }
    else {
      updateNav();
      navTween = master.tweenFromTo(0, steps[0].stop, { duration: reduce ? .2 : 1.3, ease: 'power1.inOut', onComplete: () => { navTween = null; } });
    }
    document.documentElement.classList.add('ready');
    window.__book = { master, steps, pages, cam, go, get cur() { return cur; } };
  }
})();
