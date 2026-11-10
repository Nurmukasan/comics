/* Сборка комикса: фильтры гравюры, сцены, скролл-таймлайн, HUD, звук. */
(function () {
  const SCENES = window.SCENES;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const NS = 'http://www.w3.org/2000/svg';

  // ---------- 1. Штриховка: заранее рисуем «волнистые полосы» на canvas.
  // Значение пикселя — треугольная волна поперёк линий. Фильтр сравнивает
  // её с темнотой рисунка: где темнее, там линия толще.
  function stripes(angleDeg, seed, period) {
    const W = 1500, H = 1200, SC = 2;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    const img = ctx.createImageData(W, H), d = img.data;
    const a = angleDeg * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
    for (let y = 0; y < H; y++) {
      const uy = y * SC - 700;
      for (let x = 0; x < W; x++) {
        const ux = x * SC - 700;
        const u = ux * ca + uy * sa, v = -ux * sa + uy * ca;
        const w = 4.4 * Math.sin(v * .011 + seed) + 2.4 * Math.sin(v * .027 + u * .004 + seed * 2.1) + 1.3 * Math.sin(v * .07 + u * .015 + seed * 3.3);
        let t = ((u + w) / period) % 1; if (t < 0) t += 1;
        const tri = 1 - Math.abs(2 * t - 1);
        const g = 14 + tri * 226 | 0;
        const i = (y * W + x) * 4; d[i] = d[i + 1] = d[i + 2] = g; d[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return cv.toDataURL('image/png');
  }

  const gdefs = document.getElementById('gdefs');
  gdefs.insertAdjacentHTML('beforeend', window.ART.GRADS + `
    <filter id="rough" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="2" seed="4" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="5" xChannelSelector="R" yChannelSelector="G"/>
    </filter>`);

  const FILTERS = { engV: { angle: 0, imgs: [] }, engD: { angle: -38, imgs: [] } };
  function makeFilter(id) {
    const f = document.createElementNS(NS, 'filter');
    f.setAttribute('id', id);
    ['filterUnits:userSpaceOnUse', 'x:-700', 'y:-700', 'width:3000', 'height:2400', 'color-interpolation-filters:sRGB']
      .forEach(p => { const [k, v] = p.split(':'); f.setAttribute(k, v); });
    f.innerHTML = `
      <feImage x="-700" y="-700" width="3000" height="2400" preserveAspectRatio="none" result="st"/>
      <feColorMatrix in="st" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  .2126 .7152 .0722 0 0" result="S"/>
      <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -.2126 -.7152 -.0722 0 1" result="D"/>
      <feComposite in="D" in2="S" operator="arithmetic" k1="0" k2="1" k3="-1" k4=".5"/>
      <feComponentTransfer result="M"><feFuncA type="linear" slope="12" intercept="-5.6"/></feComponentTransfer>
      <feFlood flood-color="#111"/>
      <feComposite in2="M" operator="in"/>`;
    gdefs.appendChild(f);
    return f.querySelector('feImage');
  }
  function setImg(fe, url) { fe.setAttribute('href', url); fe.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', url); }
  for (const id in FILTERS) {
    const F = FILTERS[id];
    F.fe = makeFilter(id);
    F.imgs[0] = stripes(F.angle, 1.3, 9);
    setImg(F.fe, F.imgs[0]);
  }
  // второй вариант штриховки — для «кипения» линий, считаем, когда браузер свободен
  const idle = window.requestIdleCallback || (cb => setTimeout(cb, 400));
  idle(() => { for (const id in FILTERS) FILTERS[id].imgs[1] = stripes(FILTERS[id].angle, 4.1, 9); });

  // ---------- 2. Сцены
  const stage = document.getElementById('stage');
  let T = 0;
  SCENES.forEach((s, k) => {
    s.T = T; T += s.len;
    const art = s.art();
    const el = document.createElement('section');
    el.className = 'scene'; el.id = 'sc-' + s.id; el.dataset.k = k;
    el.innerHTML = `
      <svg class="art" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Кадр ${k}: ${s.place}">
        <defs>${art.defs || ''}</defs>
        <g class="cam">
          <g class="col">${art.col}</g>
          <g class="ink" filter="url(#${s.filter || 'engV'})">${art.ink}</g>
          <g class="top">${art.top}</g>
        </g>
      </svg>
      <div class="ui">${s.ui || ''}</div>
      <div class="shade"></div>`;
    stage.appendChild(el);
    s.el = el;
    s.q = (sel, all) => all ? [...el.querySelectorAll(sel)] : el.querySelector(sel);
  });
  const TOTAL = T;

  // ракурс: на телефоне показываем середину кадра целиком
  function fit() {
    const W = innerWidth, Hh = innerHeight, portrait = W / Hh < .9;
    document.documentElement.classList.toggle('portrait', portrait);
    SCENES.forEach(s => {
      const svg = s.el.querySelector('.art');
      if (!portrait) { svg.setAttribute('viewBox', '0 0 1600 1000'); svg.setAttribute('preserveAspectRatio', 'xMidYMid slice'); return; }
      // телефон: рисунок начинается сразу под подписью, фон тянется вверх и вниз
      const [x0, x1] = s.focus || [300, 1300];
      const fw = x1 - x0, k = W / fw;
      const cap = s.el.querySelector('.cap');
      let top = cap ? cap.offsetTop + cap.offsetHeight + 4 : 0;
      if (top + 1000 * k > Hh) top = Math.max(0, Hh - 1000 * k - 10);
      svg.setAttribute('viewBox', `${x0} ${(-top / k).toFixed(1)} ${fw} ${(Hh / k).toFixed(1)}`);
      svg.setAttribute('preserveAspectRatio', 'xMidYMin meet');
    });
    // реплики на телефоне крупнее: увеличиваем пузырь от хвостика и не даём вылезти за край
    SCENES.forEach(s => {
      const [x0, x1] = s.focus || [300, 1300];
      const p = portrait ? Math.min(1.6, Math.max(1, 15 / (40 * W / (x1 - x0)))) : 1;
      s.el.querySelectorAll('.bubble .bz').forEach(g => {
        g.removeAttribute('transform');
        if (p === 1) return;
        const [tx, ty] = g.parentNode.dataset.tail.split(' ').map(Number);
        const b = g.getBBox();
        const L = tx + (b.x - tx) * p, R = tx + (b.x + b.width - tx) * p, T = ty + (b.y - 34 - ty) * p;
        let dx = 0, dy = 0;
        if (L < x0 + 8) dx = x0 + 8 - L; else if (R > x1 - 8) dx = x1 - 8 - R;
        if (T < 4) dy = 4 - T;
        g.setAttribute('transform', `translate(${dx.toFixed(1)} ${dy.toFixed(1)}) translate(${tx} ${ty}) scale(${p.toFixed(3)}) translate(${-tx} ${-ty})`);
      });
    });
  }
  fit();
  addEventListener('resize', fit);
  document.fonts && document.fonts.ready.then(fit);

  // ---------- 3. Главный таймлайн по скроллу
  gsap.registerPlugin(ScrollTrigger);
  const scroller = document.getElementById('scroller');
  scroller.style.height = (TOTAL * 100 + 100) + 'vh';

  const master = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
  // интерактив сцен (до таймлайна: он использует созданные здесь элементы)
  SCENES.forEach(s => s.init && s.init(s.q, s, s.el));
  SCENES.forEach((s, k) => {
    if (k > 0) gsap.set(s.el, { autoAlpha: 0 });
    const tl = gsap.timeline({ defaults: { ease: 'none' } });
    s.build && s.build(tl, s.q, s);
    tl.set({}, {}, s.len);
    if (k > 0) {
      const prev = SCENES[k - 1];
      const [ox, oy] = s.enter || [50, 50];
      master.set(s.el, { autoAlpha: 1 }, s.T);
      master.fromTo(s.el, { clipPath: `circle(0% at ${ox}% ${oy}%)` }, { clipPath: `circle(150% at ${ox}% ${oy}%)`, duration: .6, ease: 'power2.in' }, s.T);
      master.fromTo(prev.el.querySelector('.art'), { scale: 1 }, { scale: 1.14, duration: .6, ease: 'power1.in' }, s.T);
      master.fromTo(prev.el.querySelector('.shade'), { opacity: 0 }, { opacity: .55, duration: .6 }, s.T);
      master.set(prev.el, { autoAlpha: 0 }, s.T + .6);
      master.set(s.el, { clipPath: 'none' }, s.T + .6);
    }
    master.add(tl, s.T);
    (s.beats || [0]).forEach((b, i) => master.addLabel(`s${k}b${i}`, s.T + b));
  });
  master.addLabel('end', TOTAL);

  const st = ScrollTrigger.create({
    trigger: scroller, start: 'top top', end: 'bottom bottom',
    animation: master, scrub: reduce ? true : .7
  });
  master.eventCallback('onUpdate', () => hud(master.progress()));

  // «Свайп»: когда скролл остановился, доезжаем до ближайшего кадра по ходу движения
  let lastY = scrollY, dir = 1, navUntil = 0;
  addEventListener('scroll', () => { const y = scrollY; if (y !== lastY) dir = y > lastY ? 1 : -1; lastY = y; }, { passive: true });
  ScrollTrigger.addEventListener('scrollEnd', () => {
    if (reduce || Date.now() < navUntil) return;
    const y = scrollY;
    if (y < st.start - 2 || y > st.end - 2) return;
    const pos = Object.keys(master.labels).map(l => st.labelToScroll(l)).sort((a, b) => a - b);
    if (pos.some(p => Math.abs(p - y) < 4)) return;
    let target = dir > 0 ? pos.find(p => p > y) : [...pos].reverse().find(p => p < y);
    const near = pos.reduce((a, b) => Math.abs(b - y) < Math.abs(a - y) ? b : a);
    if (target == null || Math.abs(target - y) > innerHeight * 1.3) target = near;
    smooth(target);
  });
  function smooth(y) { navUntil = Date.now() + 900; scrollTo({ top: y, behavior: 'smooth' }); }

  // ---------- 4. HUD: место, год, номер кадра, суфлёр
  const hudPlace = document.getElementById('hudPlace'), hudYear = document.getElementById('hudYear'),
    hudFrame = document.getElementById('hudFrame'), fill = document.getElementById('progressFill'),
    prompter = document.getElementById('prompter'), prompterText = document.getElementById('prompterText');
  const N = SCENES.length - 1;
  let cur = -1; const yr = { v: 0 };
  const fmtYear = v => { v = Math.round(v); return v < 0 ? `${-v} до н. э.` : `${v} год`; };
  function hud(p) {
    fill.style.transform = `scaleX(${p})`;
    const t = master.time();
    let k = 0; SCENES.forEach((s, i) => { if (t >= s.T + .3 || i === 0) k = i; });
    if (k === cur) return;
    const old = cur; cur = k;
    const s = SCENES[k];
    SCENES.forEach((x, i) => x.el.classList.toggle('on', i === k));
    hudPlace.textContent = s.place;
    hudFrame.textContent = `${String(k).padStart(2, '0')}/${N}`;
    if (s.year != null && !s.yearText) {
      gsap.to(yr, { v: s.year, duration: old < 0 ? 0 : .8, ease: 'power2.out', onUpdate: () => hudYear.textContent = fmtYear(yr.v) });
    } else { if (s.year != null) yr.v = s.year; hudYear.textContent = s.yearText || ''; }
    prompterText.innerHTML = (s.speech || []).map(([w, t]) => `<p><b>${w}</b>${t}</p>`).join('');
    if (old >= 0) window.SFX && SFX.whoosh();
  }
  hud(0);

  // ---------- 5. Навигация клавишами (удобно с пультом)
  const labels = Object.keys(master.labels).sort((a, b) => master.labels[a] - master.labels[b]);
  function go(dir) {
    const t = master.time();
    let target;
    if (dir > 0) target = labels.find(l => master.labels[l] > t + .02);
    else target = [...labels].reverse().find(l => master.labels[l] < t - .02);
    if (!target) { if (dir > 0) document.getElementById('speech').scrollIntoView({ behavior: 'smooth' }); return; }
    smooth(st.labelToScroll(target));
  }
  addEventListener('keydown', e => {
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;
    if (tag === 'button' && (e.key === ' ' || e.key === 'Enter')) return;
    if (scrollY > st.end + 10) return;
    const s = SCENES[cur];
    if (s && s.onKey && !e.metaKey && !e.ctrlKey && s.onKey(e)) { e.preventDefault(); return; }
    if (['ArrowDown', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); go(1); }
    if (['ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); go(-1); }
  });
  document.querySelectorAll('[data-goto="0"]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); scrollTo({ top: 0, behavior: 'smooth' }); }));

  // ---------- 6. Суфлёр и текст речи
  const btnP = document.getElementById('btnPrompter');
  btnP.addEventListener('click', () => {
    const on = prompter.hidden; prompter.hidden = !on; btnP.setAttribute('aria-pressed', on);
    document.documentElement.classList.toggle('prompting', on);
  });
  document.getElementById('speechList').innerHTML = SCENES.map((s, k) => (s.speech || []).map(([w, t]) =>
    `<li><span class="sp-k">${String(k).padStart(2, '0')} · ${s.place}</span><span class="sp-w sp-${w === 'А' ? 'a' : 'b'}">${w}</span><p>${t}</p></li>`).join('')).join('');

  // ---------- 7. «Кипение» линий: две версии штриховки сменяют друг друга
  if (!reduce) {
    let f = 0;
    setInterval(() => {
      if (document.hidden || scrollY > st.end) return;
      f ^= 1;
      for (const id in FILTERS) { const F = FILTERS[id]; if (F.imgs[1]) setImg(F.fe, F.imgs[f]); }
    }, 220);
  }

  // ---------- 8. Заголовок обложки собирается из шифра
  const title = document.getElementById('heroTitle');
  if (title) {
    const plain = title.textContent;
    const o = { p: 0 };
    gsap.to(o, {
      p: 1, duration: reduce ? 0 : 1.6, delay: .3, ease: 'power2.out',
      onUpdate: () => {
        title.textContent = [...plain].map((ch, i) => {
          const left = Math.max(0, Math.round((1 - o.p) * 12 - i * .6));
          return window.shiftText(ch, left);
        }).join('');
      }
    });
  }

  // ---------- 9. Трейлер (HyperFrames)
  const modal = document.getElementById('trailerModal'), vid = document.getElementById('trailerVideo');
  const bt = document.getElementById('btnTrailer');
  bt && bt.addEventListener('click', () => { modal.hidden = false; vid.currentTime = 0; vid.play().catch(() => { }); });
  const close = () => { modal.hidden = true; vid.pause(); };
  document.getElementById('trailerClose').addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hidden) close(); });

  // ---------- 10. Звук (процедурный, выключен по умолчанию)
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
    whoosh() { this.noise(.45, 300, 2400, .09); },
    win() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, .25, 'triangle', .07), i * 70)); }
  };
  const bs = document.getElementById('btnSound');
  bs.addEventListener('click', () => { SFX.init(); SFX.on = !SFX.on; bs.setAttribute('aria-pressed', SFX.on); if (SFX.on) SFX.win(); });

  document.documentElement.classList.add('ready');
})();
