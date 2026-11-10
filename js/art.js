/* Рисовалка комикса «Тайнопись».
   Каждый кадр — SVG из четырёх слоёв:
   col  — плоские цвета (кожа, бумага, красный, жёлтый);
   tone — полутон: серые формы превращаются в растровые точки (как в старых комиксах);
   ink  — гравюра: серые формы превращаются в штрихи, чем темнее, тем толще;
   top  — чёткое поверх: глаза, губы, брови, буквы, пузыри, звуки.
   Персонажи собраны из частей (тело, голова, лицо, руки), чтобы их можно было оживлять. */
(function () {
  const C = {
    red: '#e2231a', ink: '#111', paper: '#f5efe0', white: '#fff',
    yellow: '#f3c117', cream: '#efe6cf', skin: '#f7dcc6', skin2: '#e9bfa3', lip: '#c9675a', gold: '#e9b415', bronze: '#d9a032'
  };
  const BG = 'x="-1200" y="-1200" width="4000" height="3400"';
  const FONT = { bubble: 'Pangolin', title: 'Unbounded', sfx: 'Rubik Mono One', mono: 'JetBrains Mono', serif: 'Alegreya' };
  const L4 = () => ({ col: '', tone: '', ink: '', top: '' });

  // ---------- типографика: текст мерим настоящим шрифтом (книга собирается после загрузки шрифтов)
  const mctx = document.createElement('canvas').getContext('2d');
  function textW(str, fs, family, weight = 400, track = 0) {
    mctx.font = `${weight} ${fs}px ${family}`;
    return mctx.measureText(str).width + track * fs * str.length;
  }
  // детерминированный «случай»: одинаковая форма пузыря при каждой загрузке
  function rng(seed) { let s = (seed >>> 0) || 1; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296; }
  function hashStr(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  const f1 = v => (+v).toFixed(1);
  const esc = t => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // замкнутая плавная кривая через точки (Катмулл-Ром → Безье)
  function smoothClosed(pts) {
    const n = pts.length; let d = `M${f1(pts[0][0])},${f1(pts[0][1])}`;
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      d += ` C${f1(p1[0] + (p2[0] - p0[0]) / 6)},${f1(p1[1] + (p2[1] - p0[1]) / 6)} ${f1(p2[0] - (p3[0] - p1[0]) / 6)},${f1(p2[1] - (p3[1] - p1[1]) / 6)} ${f1(p2[0])},${f1(p2[1])}`;
    }
    return d + 'Z';
  }
  // суперэллипс — «пухлый» прямоугольник: так выглядят пузыри в печатных комиксах
  const SE = 3.4;
  const seR = (a, b, th) => 1 / Math.pow(Math.pow(Math.abs(Math.cos(th)) / a, SE) + Math.pow(Math.abs(Math.sin(th)) / b, SE), 1 / SE);

  // область кадра, внутри которой должны остаться пузыри и звуки (её ставит движок книги)
  let FIT = null;
  function setFit(r) { FIT = r; }

  // ---------- пузырь реплики
  // type: speech (обычный), shout (крик-звезда), think (мысль-облако), whisper (шёпот пунктиром), box (плашка рассказчика)
  // *слово* в строке — акцент красным. x, y, w — желаемое место (верх-лево и ширина), tail — рот говорящего.
  function bubble(o) {
    const type = o.type || 'speech';
    const upper = !o.font;
    const family = o.font || FONT.bubble, weight = o.font ? 700 : 400, track = upper ? .03 : 0;
    const lines = o.lines.map(l => upper ? l.toUpperCase() : l);
    const plain = l => l.replace(/\*/g, '');
    const layout = fs => {
      const lh = fs * 1.14;
      const tw = Math.max(...lines.map(l => textW(plain(l), fs, family, weight, track)));
      const th = (lines.length - 1) * lh + fs * .74;            // от верха заглавных до низа последней строки
      let a, b;
      if (type === 'box') { a = tw / 2 + fs * .75; b = th / 2 + fs * .6; }
      else {
        a = tw / 2 + fs * (type === 'shout' ? 1.3 : 1.05);
        const X = Math.pow((tw / 2) / a, SE);
        b = (th / 2 + fs * .25) / Math.pow(Math.max(.2, .92 - X), 1 / SE);
        if (type === 'shout') { a *= 1.06; b *= 1.18; }
        if (type === 'think') { a *= 1.04; b *= 1.06; }
      }
      return { fs, lh, tw, th, a, b };
    };
    let L = layout((o.fs || 40) * (FIT && FIT.boost || 1));
    const ext = L => {
      const bump = type === 'think' || type === 'shout' ? L.fs * .6 : 0;
      return { l: L.a + bump + L.fs * .2, r: L.a + bump + L.fs * .4, t: L.b + bump + (o.who ? L.fs * 1.0 : L.fs * .2), b: L.b + bump + L.fs * .4 };
    };
    let cx = o.cx != null ? o.cx : o.x + (o.w || 2 * L.a) / 2;
    let cy = o.cy != null ? o.cy : o.y + L.b + (o.who ? L.fs * .5 : 0);
    if (FIT) {
      const m = FIT.m;
      let E = ext(L);
      const k = Math.min(1, (FIT.w - 2 * m) / (E.l + E.r), (FIT.h - 2 * m) / (E.t + E.b));
      if (k < 1) { L = layout(L.fs * k); E = ext(L); }
      const clampX = x => Math.min(Math.max(x, FIT.x + m + E.l), FIT.x + FIT.w - m - E.r);
      const clampY = y => Math.min(Math.max(y, FIT.y + m + E.t), FIT.y + FIT.h - m - E.b);
      cx = clampX(cx); cy = clampY(cy);
      // пузырь не закрывает говорящего: кончик хвоста остаётся снаружи
      if (o.tail) {
        const [tx, ty] = o.tail, gap = L.fs * .9;
        const inside = (x, y) => { const dx = tx - x, dy = ty - y; return Math.hypot(dx, dy) < seR(L.a, L.b, Math.atan2(dy, dx)) + gap; };
        if (inside(cx, cy)) {
          const tries = [[cx, ty - L.b - gap - L.fs * .3], [cx, ty + L.b + gap + L.fs * .3], [tx - L.a - gap, cy], [tx + L.a + gap, cy]];
          for (const [x, y] of tries) { const X = clampX(x), Y = clampY(y); if (!inside(X, Y)) { cx = X; cy = Y; break; } }
        }
      }
    }
    const { fs, lh, a, b } = L;
    const R = rng(hashStr((o.id || '') + lines.join('|')));
    const sw = Math.max(3, fs * .12), sh = fs * .17;
    const fill = o.fill || (type === 'box' ? C.yellow : '#fff');
    // --- контур
    let body;
    if (type === 'box') {
      const j = () => (R() - .5) * fs * .16;
      body = `M${f1(cx - a + j())},${f1(cy - b + j())} L${f1(cx + a + j())},${f1(cy - b + j())} L${f1(cx + a + j())},${f1(cy + b + j())} L${f1(cx - a + j())},${f1(cy + b + j())}Z`;
    } else if (type === 'shout') {
      const per = Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
      const n = Math.max(12, Math.round(per / (fs * 1.5)));
      let d = '';
      for (let i = 0; i < n * 2; i++) {
        const th = (i + (R() - .5) * .35) / (n * 2) * Math.PI * 2, r = seR(a, b, th) * (i % 2 ? .97 : 1.13 + R() * .12);
        d += (i ? 'L' : 'M') + f1(cx + Math.cos(th) * r) + ',' + f1(cy + Math.sin(th) * r);
      }
      body = d + 'Z';
    } else {
      const pts = [];
      for (let i = 0; i < 32; i++) { const th = i / 32 * Math.PI * 2, r = seR(a, b, th) * (1 + (R() - .5) * .028); pts.push([cx + Math.cos(th) * r, cy + Math.sin(th) * r]); }
      body = smoothClosed(pts);
    }
    // --- хвост к говорящему
    let tail = '', bubs = '';
    if (o.tail && type !== 'box') {
      const [tx, ty] = o.tail;
      let dx = tx - cx, dy = ty - cy; const dist = Math.hypot(dx, dy) || 1; dx /= dist; dy /= dist;
      const rEdge = seR(a, b, Math.atan2(dy, dx));
      if (dist > rEdge + fs * .4) {
        if (type === 'think') {
          for (let i = 0; i < 3; i++) {
            const t = rEdge + fs * .45 + (dist - rEdge - fs * .9) * (i + .3) / 3, r = fs * (.38 - i * .09);
            bubs += `<circle cx="${f1(cx + dx * t)}" cy="${f1(cy + dy * t)}" r="${f1(r)}"/>`;
          }
        } else {
          const pull = Math.min(fs * .5, (dist - rEdge) * .2);
          const tip = [tx - dx * pull, ty - dy * pull];
          const base = rEdge * .74, bw = fs * (type === 'shout' ? .62 : .52);
          const bx = cx + dx * base, by = cy + dy * base, px = -dy, py = dx;
          const len = Math.hypot(tip[0] - bx, tip[1] - by), bend = (R() > .5 ? 1 : -1) * len * .14;
          const mx = (bx + tip[0]) / 2 + px * bend, my = (by + tip[1]) / 2 + py * bend;
          tail = type === 'shout'
            ? `M${f1(bx + px * bw)},${f1(by + py * bw)} L${f1(mx + px * bw * .55)},${f1(my + py * bw * .55)} L${f1(tip[0])},${f1(tip[1])} L${f1(mx - px * bw * .1)},${f1(my - py * bw * .1)} L${f1(bx - px * bw)},${f1(by - py * bw)}Z`
            : `M${f1(bx + px * bw)},${f1(by + py * bw)} Q${f1(mx + px * bw * .45)},${f1(my + py * bw * .45)} ${f1(tip[0])},${f1(tip[1])} Q${f1(mx - px * bw * .2)},${f1(my - py * bw * .2)} ${f1(bx - px * bw)},${f1(by - py * bw)}Z`;
        }
      }
    }
    // облако мысли: «барашки» по краю
    let bumps = '';
    if (type === 'think') {
      const per = Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
      const n = Math.max(10, Math.round(per / (fs * 1.25)));
      for (let i = 0; i < n; i++) {
        const th = (i + R() * .3) / n * Math.PI * 2, r = seR(a, b, th) * .98;
        bumps += `<circle cx="${f1(cx + Math.cos(th) * r)}" cy="${f1(cy + Math.sin(th) * r)}" r="${f1(fs * (.5 + R() * .2))}"/>`;
      }
    }
    // --- текст: строки и слова (слова проявляются по очереди)
    const emCol = type === 'box' ? C.red : '#d0170f';
    const y0 = cy - (lines.length - 1) * lh / 2 + fs * .37;
    // *акцент* может занимать несколько слов: «*на три!*», «*159 квинтиллионов*»
    let inEm = false;
    const text = lines.map((line, i) => {
      const words = line.split(/\s+/).filter(Boolean);
      return `<text x="${f1(cx)}" y="${f1(y0 + i * lh)}" text-anchor="middle">` + words.map((w, j) => {
        const sp = j < words.length - 1 ? ' ' : '';
        if (w.startsWith('*')) { inEm = true; w = w.slice(1); }
        let tail = '', close = false;
        const m = w.match(/^(.*?)\*([^*]*)$/);
        if (m) { w = m[1]; tail = m[2]; close = true; }
        const em = inEm;
        if (close) inEm = false;
        const word = em ? `<tspan class="w em" fill="${emCol}" stroke="${emCol}">${esc(w)}</tspan>${tail || sp ? `<tspan class="w">${esc(tail)}${sp}</tspan>` : ''}` : `<tspan class="w">${esc(w + tail)}${sp}</tspan>`;
        return word;
      }).join('') + '</text>';
    }).join('');
    const textAttrs = `font-family="${family}, cursive" font-size="${f1(fs)}" font-weight="${weight}" fill="#111" stroke="#111" stroke-width="${f1(fs * (upper ? .035 : .01))}" paint-order="stroke" style="letter-spacing:${f1(track * fs)}px"`;
    // --- ярлык с именем
    let who = '';
    if (o.who) {
      const wfs = fs * .5, ww = textW(o.who, wfs, FONT.title, 700) + wfs * 1.3;
      const wx = cx - a * .78, wy = cy - b - wfs * .35;
      who = `<g transform="translate(${f1(wx)} ${f1(wy)}) rotate(-4)"><rect x="${f1(sw * .5)}" y="${f1(-wfs * .95 + sw * .5)}" width="${f1(ww)}" height="${f1(wfs * 1.5)}" fill="#111"/><rect x="0" y="${f1(-wfs * .95)}" width="${f1(ww)}" height="${f1(wfs * 1.5)}" fill="${o.whoFill || C.red}" stroke="#111" stroke-width="${f1(sw * .55)}"/>
        <text x="${f1(wfs * .65)}" y="${f1(wfs * .22)}" font-family="${FONT.title}" font-weight="700" font-size="${f1(wfs)}" fill="#fff">${esc(o.who)}</text></g>`;
    }
    const dash = type === 'whisper' ? ` stroke-dasharray="${f1(fs * .32)} ${f1(fs * .2)}"` : '';
    const tipAt = o.tail && type !== 'box' ? `${f1(o.tail[0])} ${f1(o.tail[1])}` : `${f1(cx)} ${f1(cy + b)}`;
    const id = o.id ? ` id="${o.id}"` : '';
    const shadowShapes = `${tail ? `<path d="${tail}"/>` : ''}${bumps}<path d="${body}"/>${bubs}`;
    return `<g${id} class="bubble t-${type} ${o.cls || ''}" data-tail="${tipAt}"><g class="bz">
      <g fill="#111" opacity=".92" transform="translate(${f1(sh)} ${f1(sh)})">${shadowShapes}</g>
      ${tail ? `<path d="${tail}" fill="${fill}" stroke="#111" stroke-width="${f1(sw)}" stroke-linejoin="round"${dash}/>` : ''}
      ${bumps ? `<g fill="${fill}" stroke="#111" stroke-width="${f1(sw)}">${bumps}</g><path d="${body}" fill="${fill}"/>` : `<path d="${body}" fill="${fill}" stroke="#111" stroke-width="${f1(sw)}" stroke-linejoin="round"${dash}/>`}
      ${tail ? `<path d="${tail}" fill="${fill}"/>` : ''}
      ${bubs ? `<g fill="${fill}" stroke="#111" stroke-width="${f1(sw * .8)}">${bubs}</g>` : ''}
      <g ${textAttrs}>${text}</g>${who}
    </g></g>`;
  }

  // звук-надпись («ЩЁЛК!») со взрывом-звездой; тоже не выходит за кадр
  function sfx(o) {
    const fs = o.fs || 90, rot = o.rot || -8, id = o.id ? ` id="${o.id}"` : '';
    let x = o.x, y = o.y;
    if (FIT) {
      const hw = Math.max((o.burst || 0) * 1.42, textW(o.text, fs, FONT.sfx) * .55 + fs * .2) + fs * .12;
      const hh = Math.max((o.burst || 0) * 1.08, fs * .75) + fs * .12, m = FIT.m;
      x = Math.min(Math.max(x, FIT.x + m + hw), FIT.x + FIT.w - m - hw);
      y = Math.min(Math.max(y, FIT.y + m + hh), FIT.y + FIT.h - m - hh);
    }
    let burst = '';
    if (o.burst) {
      const n = 14, r1 = o.burst, r2 = o.burst * .62; let d = '';
      for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * Math.PI * 2, r = i % 2 ? r2 : r1 * (.85 + (i * 37 % 7) / 30); d += (i ? 'L' : 'M') + f1(Math.cos(a) * r * 1.35) + ',' + f1(Math.sin(a) * r); }
      burst = `<path d="${d}Z" fill="#111" transform="translate(${f1(fs * .1)} ${f1(fs * .1)})"/><path d="${d}Z" fill="${o.burstFill || C.yellow}" stroke="#111" stroke-width="${f1(fs * .07)}" stroke-linejoin="round"/>`;
    }
    const T = (dx, dy, extra) => `<text text-anchor="middle" y="${f1(fs * .35)}" font-family="${FONT.sfx}, ${FONT.title}, sans-serif" font-size="${fs}" transform="translate(${f1(dx)} ${f1(dy)}) skewX(-10)" ${extra}>${esc(o.text)}</text>`;
    return `<g${id} class="sfx" data-at="${f1(x)} ${f1(y)}"><g transform="translate(${f1(x)} ${f1(y)}) rotate(${rot})">${burst}
      ${T(fs * .12, fs * .12, 'fill="#111" stroke="#111" stroke-width="' + f1(fs * .08) + '" stroke-linejoin="round"')}
      ${T(0, 0, 'fill="' + (o.fill || C.red) + '" stroke="#111" stroke-width="' + f1(fs * .08) + '" stroke-linejoin="round" paint-order="stroke"')}
      ${T(-fs * .03, -fs * .05, 'fill="none" stroke="#fff" stroke-width="' + f1(fs * .025) + '" opacity=".55"')}</g></g>`;
  }

  // =====================================================================
  //   ПЕРСОНАЖ: полуреалистичная манга. Голова: центр (0,0), макушка −162, подбородок +163
  // =====================================================================
  const faceD = (jw, chin) => `M-98,-40 C-100,10 -98,46 -93,72 C-87,104 -${jw},128 -50,148 C-31,160 -13,${chin} 0,${chin} C13,${chin} 31,160 50,148 C${jw},128 87,104 93,72 C98,46 100,10 98,-40 C96,-122 52,-162 0,-162 C-52,-162 -96,-122 -98,-40Z`;
  const EAR = 'M-94,-10 C-110,-18 -120,10 -114,34 C-110,52 -102,62 -92,60 C-90,40 -90,10 -94,-10Z';
  const TORSO = 'M-44,186 C-100,194 -170,210 -214,246 C-238,268 -248,330 -250,450 L250,450 C248,330 238,268 214,246 C170,210 100,194 44,186Z';
  const NECK = 'M-38,110 C-40,150 -42,180 -46,214 L46,214 C42,180 40,150 38,110Z';

  function eyeTop(o, sideSign) {
    const dx = o.look[0] * sideSign, dy = o.look[1];
    const fem = o.sex === 'f';
    const iris = o.iris || '#5a4632';
    return `
      <path d="M-62,0 C-52,-14 -30,-16 -16,-5 C-28,7 -50,8 -62,0Z" fill="#fbf8f4"/>
      <g class="iris"><circle cx="${-39 + dx}" cy="${-3 + dy}" r="9" fill="${iris}"/>
      <circle cx="${-39 + dx}" cy="${-3 + dy}" r="9" fill="none" stroke="#111" stroke-width="1.6"/>
      <circle cx="${-39 + dx}" cy="${-3 + dy}" r="3.8" fill="#111"/>
      <circle cx="${-42 + dx}" cy="${-6.5 + dy}" r="2.3" fill="#fff"/></g>
      <path d="M-64,0 C-53,-16 -30,-18 -15,-5 L-15,-2 C-30,-12 -51,-11 -62,3Z" fill="#161616"/>
      ${fem ? '<path d="M-63,-1 L-71,-7 M-60,-5 L-66,-12 M-55,-9 L-59,-16" stroke="#161616" stroke-width="2.4" stroke-linecap="round"/>' : '<path d="M-63,0 L-69,-4" stroke="#161616" stroke-width="2.2" stroke-linecap="round"/>'}
      <path d="M-60,3 C-48,9 -30,8 -18,-1" stroke="#7a5a4a" stroke-width="1.7" fill="none"/>
      <path d="M-60,-10 C-50,-22 -30,-23 -18,-12" stroke="#7a5a4a" stroke-width="1.6" fill="none"/>`;
  }
  const BROW = {
    neutral: 'M-71,-25 C-57,-36 -35,-37 -14,-29 L-15,-23 C-35,-30 -55,-29 -69,-19Z',
    angry: 'M-72,-34 C-57,-35 -36,-28 -13,-17 L-16,-11 C-36,-22 -56,-28 -70,-27Z',
    worried: 'M-71,-21 C-57,-26 -36,-34 -16,-41 L-15,-34 C-34,-28 -55,-20 -69,-15Z',
    up: 'M-71,-33 C-57,-45 -35,-46 -14,-38 L-15,-32 C-35,-39 -55,-38 -69,-27Z',
    thin: 'M-70,-26 C-56,-35 -35,-36 -16,-30 L-16,-27 C-35,-32 -55,-32 -69,-22Z'
  };
  const MOUTH = {
    neutral: `<path d="M-30,98 C-20,90 -9,88 -3,91 C-1,89 1,89 3,91 C9,88 20,90 30,98 C20,96 9,95 0,97 C-9,95 -20,96 -30,98Z" fill="${C.lip}"/>
      <path d="M-22,100 C-12,108 12,108 22,100 C12,103 -12,103 -22,100Z" fill="#d98a7a"/>
      <path d="M-30,98 C-20,95 -9,96 0,98 C9,96 20,95 30,98" stroke="#3a1a14" stroke-width="2.6" fill="none" stroke-linecap="round"/>`,
    smile: `<path d="M-33,93 C-22,90 -10,89 -3,91 C-1,89 1,89 3,91 C10,89 22,90 33,93 C22,98 10,99 0,99 C-10,99 -22,98 -33,93Z" fill="${C.lip}"/>
      <path d="M-33,93 C-20,101 -9,103 0,103 C9,103 20,101 33,93" stroke="#3a1a14" stroke-width="2.8" fill="none" stroke-linecap="round"/>
      <path d="M-20,107 C-10,112 10,112 20,107" stroke="#9a5a4a" stroke-width="1.8" fill="none"/>`,
    smirk: `<path d="M-24,98 C-14,92 -4,91 2,93 C10,90 20,88 30,86 C20,92 10,94 2,96 C-6,95 -16,96 -24,98Z" fill="${C.lip}"/>
      <path d="M-26,99 C-16,95 -6,95 2,96 C12,94 22,90 32,86" stroke="#3a1a14" stroke-width="2.8" fill="none" stroke-linecap="round"/>
      <path d="M-16,104 C-6,110 10,108 18,102" stroke="#9a5a4a" stroke-width="1.8" fill="none"/>`,
    worried: `<path d="M-27,103 C-17,96 -7,95 0,96 C7,95 17,96 27,103" stroke="#3a1a14" stroke-width="2.8" fill="none" stroke-linecap="round"/>
      <path d="M-18,106 C-8,111 8,111 18,106" stroke="#9a5a4a" stroke-width="1.8" fill="none"/>`,
    open: `<path d="M-28,96 C-16,90 16,90 28,96 C20,116 -20,116 -28,96Z" fill="#4a1410" stroke="#3a1a14" stroke-width="2.4"/>
      <path d="M-20,96 C-8,93 8,93 20,96 L18,101 C6,99 -6,99 -18,101Z" fill="#fff"/>
      <path d="M-14,110 C-6,106 6,106 14,110 C8,113 -8,113 -14,110Z" fill="#c25a50"/>`,
    shout: `<path d="M-34,92 C-20,84 20,84 34,92 C28,130 -28,130 -34,92Z" fill="#4a1410" stroke="#3a1a14" stroke-width="2.6"/>
      <path d="M-25,92 C-10,88 10,88 25,92 L23,98 C8,95 -8,95 -23,98Z" fill="#fff"/>
      <path d="M-18,120 C-8,113 8,113 18,120 C10,125 -10,125 -18,120Z" fill="#c25a50"/>`
  };

  function hairStyle(name) {
    const S = {
      roman: {
        back: 'M-100,-30 C-108,-120 -52,-170 0,-170 C52,-170 108,-120 100,-30 C104,0 100,30 96,40 L-96,40 C-100,30 -104,0 -100,-30Z',
        front: 'M-99,-44 C-100,-126 -50,-170 0,-172 C50,-170 100,-126 99,-44 C92,-64 84,-74 74,-70 C66,-92 48,-100 30,-94 C16,-104 -14,-106 -30,-96 C-48,-102 -68,-92 -76,-70 C-86,-76 -94,-64 -99,-44Z',
        strands: Array.from({ length: 13 }, (_, i) => { const x = -84 + i * 14; return `M${(x * .3).toFixed(1)},-166 C${(x * .6).toFixed(1)},-140 ${(x * .9).toFixed(1)},-116 ${x},${(-90 + Math.abs(x) * .2).toFixed(1)}`; }).join(' ')
      },
      curly: {
        back: 'M-104,-20 C-112,-130 -50,-176 0,-176 C50,-176 112,-130 104,-20 L96,30 L-96,30Z',
        front: (() => { let d = ''; for (let i = 0; i < 11; i++) { const a = Math.PI * (1.05 + i * .09); const x = Math.cos(a) * 100, y = Math.sin(a) * 120 - 40; d += `M${(x + 18).toFixed(1)},${y.toFixed(1)} a18,18 0 1,0 -36,0 a18,18 0 1,0 36,0 `; } return d; })(),
        strands: ''
      },
      long: {
        back: 'M-104,-50 C-136,40 -150,200 -122,330 L-80,280 L-66,350 L-32,262 L32,262 L66,350 L80,280 L122,330 C150,200 136,40 104,-50 C100,-150 -100,-150 -104,-50Z',
        front: 'M-102,-14 C-108,-120 -40,-168 6,-166 C70,-164 112,-118 102,-14 L96,46 C92,0 86,-40 76,-58 C62,-30 44,-40 34,-80 C18,-50 -2,-60 -12,-92 C-26,-56 -48,-56 -60,-76 C-70,-50 -84,-20 -92,50Z',
        strands: 'M-90,-60 C-100,40 -110,160 -100,300 M-70,-90 C-86,20 -92,140 -84,280 M70,-90 C86,20 92,140 84,280 M90,-60 C100,40 110,160 100,300 M-30,-150 C-40,-110 -50,-80 -54,-60 M20,-156 C26,-120 30,-96 34,-80 M60,-140 C70,-110 76,-80 76,-58'
      },
      side: {
        back: 'M-100,-20 C-110,-124 -40,-170 10,-168 C80,-164 112,-118 100,-20 L96,20 L-96,20Z',
        front: 'M-100,-24 C-112,-128 -30,-174 20,-170 C88,-164 116,-116 100,-24 C96,-60 84,-90 60,-104 C30,-118 -6,-118 -30,-106 L-38,-112 C-62,-96 -84,-64 -100,-24Z',
        strands: 'M-30,-160 C0,-150 40,-140 70,-110 M-20,-140 C10,-132 44,-122 72,-96 M-36,-150 C-60,-130 -80,-96 -94,-50 M-10,-166 C30,-162 70,-150 92,-120'
      },
      pony: {
        back: 'M-104,-30 C-122,40 -120,170 -96,230 L-60,190 L-40,240 L40,240 L60,190 L96,230 C120,170 122,40 104,-30 C100,-150 -100,-150 -104,-30Z M86,-118 C180,-160 240,-60 200,70 C186,110 160,150 136,160 C166,90 176,10 124,-56Z',
        front: 'M-102,-20 C-106,-124 -36,-168 10,-166 C80,-162 112,-118 102,-20 L98,70 C94,20 88,-24 78,-46 C70,-20 56,-30 48,-64 C38,-34 18,-40 10,-74 C0,-42 -20,-40 -28,-70 C-40,-36 -60,-40 -66,-60 C-76,-30 -88,10 -94,72Z',
        strands: 'M-80,-100 C-90,0 -96,100 -90,200 M80,-100 C90,0 96,100 90,200 M150,-90 C190,-40 200,30 180,100 M130,-80 C160,-20 166,40 150,110'
      },
      messy: {
        back: 'M-104,0 L-132,-50 L-100,-62 L-120,-120 L-60,-108 L-58,-168 L-10,-128 L22,-180 L46,-122 L100,-150 L92,-92 L136,-80 L102,-28 L104,30Z',
        front: 'M-100,-24 C-104,-116 -36,-150 14,-148 C80,-144 110,-104 100,-24 L92,-44 L86,0 L70,-56 L58,-8 L42,-66 L28,-14 L12,-72 L-4,-16 L-24,-70 L-36,-12 L-54,-62 L-66,-4 L-82,-48 L-92,10Z',
        strands: 'M-40,-140 C-30,-110 -20,-80 -24,-70 M20,-146 C24,-110 30,-90 28,-14 M60,-130 C66,-100 70,-80 70,-56'
      },
      bun: {
        back: 'M-102,-20 C-110,-130 -40,-166 0,-166 C40,-166 110,-130 102,-20 L96,30 L-96,30Z M-50,-150 C-60,-220 60,-220 50,-150Z',
        front: 'M-100,-30 C-104,-128 -40,-166 0,-166 C40,-166 104,-128 100,-30 C94,-70 70,-104 30,-110 C10,-100 -10,-100 -30,-110 C-70,-104 -94,-70 -100,-30Z',
        strands: 'M-40,-150 C-60,-120 -80,-90 -92,-50 M40,-150 C60,-120 80,-90 92,-50 M-30,-200 C0,-210 30,-200 40,-180'
      },
      crop: {
        back: 'M-100,-30 C-108,-120 -52,-168 0,-168 C52,-168 108,-120 100,-30 L98,24 L-98,24Z',
        front: 'M-99,-40 C-98,-122 -50,-164 0,-164 C50,-164 98,-122 99,-40 C82,-70 42,-84 0,-84 C-42,-84 -82,-70 -99,-40Z',
        strands: 'M-60,-140 C-50,-120 -40,-100 -36,-90 M0,-160 C0,-130 0,-100 0,-86 M60,-140 C50,-120 40,-100 36,-90'
      },
      bald: { back: '', front: '', strands: '' }
    };
    return S[name] || S.messy;
  }

  function handD(type) {
    if (type === 'open') return {
      fill: 'M-22,0 C-26,20 -28,40 -24,52 L-26,92 C-26,100 -16,100 -16,92 L-14,58 L-10,104 C-10,112 0,112 0,104 L0,58 L6,104 C6,112 16,112 16,96 L14,56 L20,90 C20,98 30,96 28,86 L24,44 C26,26 24,10 22,0 Z M-22,14 C-36,24 -44,40 -46,54 C-46,60 -38,62 -36,54 C-32,42 -26,34 -18,30Z',
      lines: 'M-14,58 L-16,92 M0,58 L0,100 M14,56 L16,92'
    };
    if (type === 'point') return {
      fill: 'M-24,0 C-28,20 -28,40 -22,56 C-12,64 10,64 22,54 C28,40 28,18 24,0 Z M2,52 L4,118 C4,126 16,126 16,118 L16,50Z M-24,18 C-36,28 -38,44 -30,52 C-24,54 -20,46 -16,40Z',
      lines: 'M-18,40 C-8,46 8,46 16,40 M-18,50 C-8,56 0,56 2,54'
    };
    return {
      fill: 'M-26,0 C-30,20 -30,42 -24,58 C-12,70 14,70 26,58 C32,42 30,18 26,0 Z M-26,16 C-40,26 -40,46 -28,52 C-20,52 -16,44 -10,38Z',
      lines: 'M-22,38 C-10,44 12,44 26,36 M-22,50 C-10,56 12,56 24,48 M-6,40 L-4,62 M10,40 L12,60'
    };
  }

  function arm(o, side, L) {
    const sg = side === 'R' ? 1 : -1;
    const sx = 186 * sg, sy = 256;
    const a1 = (o.a1 || 0) * Math.PI / 180, a2 = (o.a2 || 0) * Math.PI / 180;
    const l1 = o.l1 || 230, l2 = o.l2 || 210;
    const ex = sx - Math.sin(a1) * l1 * sg, ey = sy + Math.cos(a1) * l1;
    const ang2 = a1 + a2;
    const hx = ex - Math.sin(ang2) * l2 * sg, hy = ey + Math.cos(ang2) * l2;
    const w1 = o.w1 || 78, w2 = o.w2 || 64;
    const sleeve = o.sleeve || '#fff', bare = o.bare;
    const up = `M${sx},${sy} L${ex.toFixed(1)},${ey.toFixed(1)}`, lo = `M${ex.toFixed(1)},${ey.toFixed(1)} L${hx.toFixed(1)},${hy.toFixed(1)}`;
    const hand = handD(o.hand || 'fist');
    const hrot = (-(ang2) * 180 / Math.PI) * sg + (o.hrot || 0);
    const ht = `translate(${hx.toFixed(1)} ${hy.toFixed(1)}) rotate(${hrot.toFixed(1)}) scale(${sg * (o.hs || 1.35)} ${o.hs || 1.35})`;
    const cap = (d, w, c) => `<path d="${d}" stroke="${c}" stroke-width="${w}" stroke-linecap="round" fill="none"/>`;
    const seg = (d, w, colr, isBare) => ({
      col: cap(d, w, isBare ? C.skin : colr),
      tone: cap(d, w + 10, '#fff') + (isBare ? `<path d="${d}" stroke="#bdbdbd" stroke-width="${(w * .32).toFixed(1)}" stroke-linecap="round" transform="translate(${8 * sg} 4)"/>` : ''),
      ink: cap(d, w + 10, '#111') + cap(d, w, '#fff') + (isBare ? '' : `<path d="${d}" stroke="#9a9a9a" stroke-width="${(w * .3).toFixed(1)}" stroke-linecap="round" transform="translate(${10 * sg} 4)"/>`)
    });
    const S1 = seg(up, w1, sleeve, bare === 'all'), S2 = seg(lo, w2, sleeve, !!bare);
    const handL = {
      col: `<g transform="${ht}"><path d="${hand.fill}" fill="${C.skin}"/></g>`,
      tone: `<g transform="${ht}"><path d="${hand.fill}" fill="#fff"/><path d="M8,6 C20,20 22,40 16,56" stroke="#c4c4c4" stroke-width="10" fill="none"/></g>`,
      ink: `<g transform="${ht}"><path d="${hand.fill}" fill="#fff" stroke="#111" stroke-width="4.5" stroke-linejoin="round"/><path d="${hand.lines}" stroke="#111" stroke-width="2.4" fill="none" stroke-linecap="round"/></g>`
    };
    const cls = `arm${side}`;
    for (const k of ['col', 'tone', 'ink']) L[k] += `<g class="${cls}">${S1[k]}<g class="fore${side}">${S2[k]}${handL[k]}${(o.hold && o.hold[k]) ? `<g transform="${ht}">${o.hold[k]}</g>` : ''}</g></g>`;
    L.top += `<g class="${cls}"><g class="fore${side}">${(o.hold && o.hold.top) ? `<g transform="${ht}">${o.hold.top}</g>` : ''}</g></g>`;
    return { shoulder: [sx, sy], elbow: [ex, ey], hand: [hx, hy] };
  }

  function outfit(o, B) {
    const k = o.outfit;
    const T = TORSO;
    const cloth = c => { B.col += `<path d="${T}" fill="${c}"/>`; };
    B.tone += `<path d="${T}" fill="#fff"/>`;
    if (k === 'toga') {
      cloth('#fbfaf6');
      B.tone += `<path d="M120,210 C190,240 230,300 244,450 L150,450 C150,360 140,280 120,210Z" fill="#c8c8c8"/><path d="M-60,300 C-40,350 -30,400 -34,450 L-80,450 C-78,400 -76,350 -60,300Z" fill="#d6d6d6"/>`;
      B.ink += `<path d="M-160,240 C-130,320 -110,380 -118,450 M-70,214 C-48,300 -38,370 -46,450 M60,214 C82,300 92,370 84,450 M160,240 C176,320 186,380 178,450" stroke="#111" stroke-width="5" fill="none"/>
        <path d="M-214,246 C-120,280 -40,300 40,300" stroke="#111" stroke-width="4" fill="none"/>`;
      const sash = 'M-212,258 C-90,322 50,334 176,276 L214,248 C230,266 240,288 244,314 C120,382 -70,384 -232,326Z';
      B.col += `<path d="${sash}" fill="${C.red}"/>`;
      B.ink += `<path d="${sash}" fill="#fff"/><path d="${sash}" fill="url(#gSash)" opacity=".75"/><path d="${sash}" fill="none" stroke="#111" stroke-width="5"/>
        <path d="M-180,300 C-60,350 60,352 200,300" stroke="#111" stroke-width="3" fill="none"/>`;
      B.col += `<circle cx="168" cy="268" r="22" fill="${C.gold}"/>`;
      B.ink += `<circle cx="168" cy="268" r="22" fill="#fff"/><circle cx="168" cy="268" r="22" fill="url(#gSphere)" opacity=".55"/><circle cx="168" cy="268" r="22" fill="none" stroke="#111" stroke-width="4"/>`;
    } else if (k === 'legion') {
      cloth(C.red);
      const plate = 'M-150,232 C-80,218 80,218 150,232 L168,450 L-168,450Z';
      B.col += `<path d="${plate}" fill="#e8e8e8"/>`;
      B.ink += `<path d="${plate}" fill="url(#gCylV)"/>
        ${[270, 312, 354, 396, 438].map(y => `<path d="M-160,${y} C-60,${y + 16} 60,${y + 16} 160,${y}" stroke="#111" stroke-width="6" fill="none"/>`).join('')}
        <path d="M-150,232 C-200,236 -232,290 -238,340 L-172,332 C-170,286 -160,256 -150,232Z M150,232 C200,236 232,290 238,340 L172,332 C170,286 160,256 150,232Z" fill="#8a8a8a" stroke="#111" stroke-width="5"/>
        <path d="${plate}" fill="none" stroke="#111" stroke-width="5"/>`;
      const scarf = 'M-56,188 C-36,230 36,230 56,188 L70,212 C36,262 -36,262 -70,212Z';
      B.col += `<path d="${scarf}" fill="#fff"/>`;
      B.ink += `<path d="${scarf}" fill="#fff" stroke="#111" stroke-width="4"/><path d="M-40,224 C-20,236 20,236 40,224" stroke="#111" stroke-width="2.5" fill="none"/>`;
    } else if (k === 'spartan') {
      B.col += `<path d="M-230,250 C-250,330 -262,400 -266,460 L266,460 C262,400 250,330 230,250 C180,214 -180,214 -230,250Z" fill="${C.red}"/>`;
      B.ink += `<path d="M-230,250 C-250,330 -262,400 -266,460 L266,460 C262,400 250,330 230,250" fill="none" stroke="#111" stroke-width="5"/><path d="M-200,300 C-210,360 -216,410 -214,460 M200,300 C210,360 216,410 214,460" stroke="#111" stroke-width="3"/>`;
      const cuir = 'M-170,232 C-90,214 90,214 170,232 C182,300 186,380 176,450 L-176,450 C-186,380 -182,300 -170,232Z';
      B.col += `<path d="${cuir}" fill="${C.bronze}"/>`;
      B.tone += `<path d="M60,240 C130,250 170,300 176,450 L110,450 C120,360 100,290 60,240Z" fill="#9a9a9a"/>`;
      B.ink += `<path d="${cuir}" fill="none" stroke="#111" stroke-width="6"/>
        <path d="M-120,300 C-80,340 -30,340 -6,310 M120,300 C80,340 30,340 6,310 M0,300 V440 M-90,390 C-50,410 -20,410 -6,400 M90,390 C50,410 20,410 6,400" stroke="#111" stroke-width="4" fill="none"/>`;
    } else if (k === 'gaul') {
      cloth('#fbfaf6');
      let plaid = '';
      for (let i = -6; i <= 6; i++) plaid += `<path d="M${i * 40},200 V450 M-250,${260 + (i + 6) * 30} H250" stroke="${C.red}" stroke-width="${i % 2 ? 2 : 5}"/>`;
      B.col += `<g clip-path="url(#cpTorso)">${plaid}</g>`;
      const fur = 'M-250,450 C-240,300 -180,220 -80,204 L-62,262 L-44,214 L-26,276 L-8,218 L8,276 L26,214 L44,262 L62,204 L80,204 C180,220 240,300 250,450 L200,450 C196,360 160,300 110,276 L-110,276 C-160,300 -196,360 -200,450Z';
      B.col += `<path d="${fur}" fill="#e8e3da"/>`;
      B.ink += `<path d="${fur}" fill="#8a8a8a"/><path d="${fur}" fill="none" stroke="#111" stroke-width="5"/>
        ${[-210, -170, -130, 130, 170, 210].map(x => `<path d="M${x},${330 + Math.abs(x) / 5} l-10,34 m22,-30 l-8,34" stroke="#111" stroke-width="3"/>`).join('')}`;
      B.col += `<path d="M-66,198 C-44,254 44,254 66,198" stroke="${C.gold}" stroke-width="16" fill="none" stroke-linecap="round"/>`;
      B.ink += `<path d="M-66,198 C-44,254 44,254 66,198" stroke="#111" stroke-width="22" fill="none" stroke-linecap="round"/><path d="M-66,198 C-44,254 44,254 66,198" stroke="#fff" stroke-width="14" fill="none" stroke-linecap="round"/><path d="M-60,204 C-40,250 40,250 60,204" stroke="#a8a8a8" stroke-width="5" fill="none" stroke-dasharray="6 5"/>
        <circle cx="-66" cy="198" r="13" fill="#fff" stroke="#111" stroke-width="4"/><circle cx="66" cy="198" r="13" fill="#fff" stroke="#111" stroke-width="4"/>`;
    } else if (k === 'robe') {
      cloth('#fbfaf6');
      B.tone += `<path d="M110,220 C180,250 226,300 240,450 L150,450 C150,360 140,290 110,220Z" fill="#c8c8c8"/>`;
      B.ink += `<path d="M-130,250 C-116,330 -108,390 -114,450 M130,250 C116,330 108,390 114,450 M-60,300 C-50,370 -48,410 -52,450" stroke="#111" stroke-width="4" fill="none"/>`;
      const band = 'M-56,188 L0,330 L56,188 L40,188 L0,292 L-40,188Z';
      B.col += `<path d="${band}" fill="${C.red}"/><path d="M-100,450 L-90,300 L-70,300 L-80,450Z M100,450 L90,300 L70,300 L80,450Z" fill="${C.red}"/>`;
      B.ink += `<path d="${band}" fill="none" stroke="#111" stroke-width="4"/>`;
      B.top += `${[0, 1, 2, 3, 4].map(i => `<circle cx="${-46 + i * 6}" cy="${206 + i * 22}" r="3.5" fill="${C.gold}"/><circle cx="${46 - i * 6}" cy="${206 + i * 22}" r="3.5" fill="${C.gold}"/>`).join('')}`;
    } else if (k === 'doublet') {
      cloth('#2a2a2a');
      B.ink += `<path d="${T}" fill="#1a1a1a"/><path d="M-100,240 L-96,450 M100,240 L96,450 M-10,210 V450" stroke="#555" stroke-width="5"/>`;
      B.top += [250, 296, 342, 388, 434].map(y => `<circle cx="0" cy="${y}" r="8" fill="${C.gold}" stroke="#111" stroke-width="2"/>`).join('');
      let pleats = '';
      for (let i = 0; i < 36; i++) { const a = i / 36 * Math.PI * 2; pleats += `<path d="M${(Math.cos(a) * 64).toFixed(1)},${(Math.sin(a) * 20).toFixed(1)} L${(Math.cos(a) * 170).toFixed(1)},${(Math.sin(a) * 52).toFixed(1)}" stroke="#555" stroke-width="2.6"/>`; }
      B.col += `<ellipse cx="0" cy="196" rx="170" ry="52" fill="#fff"/>`;
      B.ink += `<g transform="translate(0 196)"><ellipse rx="170" ry="52" fill="#e8e8e8"/>${pleats}<ellipse rx="170" ry="52" fill="none" stroke="#111" stroke-width="4"/><ellipse rx="66" ry="20" fill="#fff"/></g>`;
    } else if (k === 'suit') {
      cloth('#2b2b2b');
      B.ink += `<path d="${T}" fill="#262626"/>`;
      const shirt = 'M-50,188 L0,334 L50,188Z';
      B.col += `<path d="${shirt}" fill="#fff"/><path d="M-11,214 L11,214 L19,322 L0,350 L-19,322Z" fill="${C.red}"/>`;
      B.ink += `<path d="${shirt}" fill="#fff"/><path d="M-11,214 L11,214 L19,322 L0,350 L-19,322Z" fill="#fff"/><path d="M-11,214 L11,214 L19,322 L0,350 L-19,322Z" fill="url(#gSash)" opacity=".45"/>
        <path d="M-66,192 L-14,336 L-130,262Z M66,192 L14,336 L130,262Z" fill="#111"/><path d="M-50,188 L-2,222 L50,188" stroke="#111" stroke-width="4" fill="none"/>`;
      B.col += `<path d="M120,300 L170,296 L168,312 L122,316Z" fill="#fff"/>`;
      B.ink += `<path d="M120,300 L170,296 L168,312 L122,316Z" fill="#fff" stroke="#111" stroke-width="2"/>`;
    } else if (k === 'hoodie') {
      cloth(C.yellow);
      B.tone += `<path d="M120,220 C190,250 232,300 244,450 L160,450 C160,360 150,290 120,220Z" fill="#a8a8a8"/>`;
      B.ink += `<path d="M-120,196 C-90,268 90,268 120,196" stroke="#111" stroke-width="7" fill="none"/><path d="M-34,250 L-40,340 M34,250 L40,340" stroke="#111" stroke-width="4"/>
        <path d="M-120,380 H120 V450 H-120Z" fill="none" stroke="#111" stroke-width="4"/>`;
    } else if (k === 'labcoat') {
      cloth('#fbfaf6');
      B.col += `<path d="M-40,190 L0,290 L40,190Z" fill="${C.red}"/>`;
      B.tone += `<path d="M120,220 C190,250 232,300 244,450 L160,450 C160,360 150,290 120,220Z" fill="#c8c8c8"/>`;
      B.ink += `<path d="M-52,192 L-22,450 M52,192 L22,450 M-52,192 L-116,286 L-40,306 M52,192 L116,286 L40,306" stroke="#111" stroke-width="5" fill="none"/>
        <rect x="-176" y="336" width="72" height="60" fill="none" stroke="#111" stroke-width="4"/>`;
      B.top += `<rect x="-166" y="320" width="8" height="40" fill="${C.red}"/><rect x="-152" y="316" width="8" height="44" fill="#111"/>`;
    }
    B.ink += `<path d="${T}" fill="none" stroke="#111" stroke-width="6"/>`;
  }

  function person(o) {
    o = Object.assign({ id: 'p', x: 0, y: 0, s: 1, flip: false, sex: 'm', jaw: 80, chin: 163, hair: 'messy', hairCol: '#2a2420', hairInk: '#3a3a3a',
      brows: 'neutral', mouth: 'neutral', look: [0, 0], iris: '#5a4632', outfit: 'toga', beard: null, age: 0, arms: {} }, o);
    if (o.sex === 'f') { o.jaw = o.jaw === 80 ? 66 : o.jaw; o.chin = 156; }
    const tr = `translate(${o.x} ${o.y}) scale(${o.flip ? -o.s : o.s} ${o.s})`;
    const H = hairStyle(o.hair);
    const FACE = faceD(o.jaw, o.chin);
    const body = L4(), armB = L4(), headBack = L4(), face = L4(), feat = L4(), headFront = L4(), armFront = L4();

    if (o.outfit !== 'none') outfit(o, body);
    face.col += `<path d="${NECK}" fill="${C.skin}"/>`;
    face.tone += `<path d="${NECK}" fill="#fff"/><path d="M-38,118 C-18,166 18,166 38,118 L42,150 C20,176 -20,176 -42,150Z" fill="#c2c2c2"/>`;
    face.ink += `<path d="${NECK}" fill="#fff"/><path d="M-38,112 C-40,150 -42,180 -46,214 M38,112 C40,150 42,180 46,214" stroke="#111" stroke-width="5" fill="none"/>
      <path d="M-30,152 C-18,180 -8,200 -6,216 M30,152 C18,180 8,200 6,216" stroke="#555" stroke-width="2.2" fill="none"/>${o.sex === 'm' ? '<path d="M-5,178 C0,172 6,176 4,186" stroke="#555" stroke-width="2" fill="none"/>' : ''}`;

    if (H.back) { headBack.col += `<path d="${H.back}" fill="${o.hairCol}"/>`; headBack.tone += `<path d="${H.back}" fill="#fff"/>`; headBack.ink += `<path d="${H.back}" fill="${o.hairInk}"/><path d="${H.back}" fill="none" stroke="#111" stroke-width="5"/>`; }
    for (const sgn of [1, -1]) {
      const t = sgn < 0 ? ' transform="scale(-1 1)"' : '';
      headBack.col += `<path d="${EAR}"${t} fill="${C.skin}"/>`;
      headBack.tone += `<path d="${EAR}"${t} fill="#fff"/><path d="M-104,0 C-112,14 -110,30 -102,42"${t} stroke="#b0b0b0" stroke-width="8" fill="none"/>`;
      headBack.ink += `<path d="${EAR}"${t} fill="#fff" stroke="#111" stroke-width="4.5"/><path d="M-104,2 C-112,14 -110,32 -100,42 M-100,14 C-104,22 -102,30 -98,34"${t} stroke="#111" stroke-width="2.4" fill="none"/>`;
    }

    face.col += `<path d="${FACE}" fill="${C.skin}"/>`;
    face.tone += `<path d="${FACE}" fill="#fff"/>
      <path d="M66,-40 C88,0 94,50 86,88 C78,118 58,142 30,158 C56,126 68,96 70,60 C72,18 70,-12 66,-40Z" fill="#b4b4b4"/>
      <ellipse cx="40" cy="-14" rx="26" ry="8" fill="#d8d8d8"/>
      <path d="M4,-6 C8,18 10,38 16,56 L24,58 C18,36 14,16 12,-6Z" fill="#bdbdbd"/>
      <ellipse cx="2" cy="76" rx="16" ry="4.5" fill="#bcbcbc"/>
      <path d="M-20,112 C-8,120 8,120 20,112 C10,124 -10,124 -20,112Z" fill="#c4c4c4"/>
      ${o.age > 0 ? '<path d="M-60,-62 C-30,-70 30,-70 60,-62" stroke="#c8c8c8" stroke-width="5" fill="none"/>' : ''}
      ${o.beard === 'stubble' ? `<path d="M-84,70 C-76,120 -40,156 0,160 C40,156 76,120 84,70 C70,110 40,124 30,118 L-30,118 C-40,124 -70,110 -84,70Z" fill="#cfcfcf"/>` : ''}`;
    face.ink += `<path d="${FACE}" fill="#fff"/><path d="${FACE}" fill="none" stroke="#111" stroke-width="5.5"/>
      <path d="M-76,34 C-68,50 -58,58 -46,62 M76,34 C68,50 58,58 46,62" stroke="#777" stroke-width="2" fill="none"/>
      <path d="M-8,140 C-3,144 3,144 8,140" stroke="#555" stroke-width="2" fill="none"/>
      ${o.age > 0 ? '<path d="M-18,66 C-30,78 -34,90 -32,102 M18,66 C30,78 34,90 32,102 M-50,-58 C-20,-64 20,-64 50,-58 M-62,-6 l-10,-6 M62,-6 l10,-6" stroke="#555" stroke-width="2" fill="none"/>' : ''}`;

    feat.ink += `<path d="M-22,57 C-28,64 -21,71 -12,68 M22,57 C28,64 21,71 12,68 M-11,67 C-7,64 -3,66 -2,69 M11,67 C7,64 3,66 2,69 M-6,72 C-2,74 2,74 6,72" stroke="#111" stroke-width="2.6" fill="none" stroke-linecap="round"/>
      <path d="M-10,-8 C-11,18 -14,38 -20,56" stroke="#999" stroke-width="1.8" fill="none"/>`;
    feat.top += `<g class="eyes"><g class="eye eyeL">${eyeTop(o, 1)}</g><g class="eye eyeR" transform="scale(-1 1)">${eyeTop(o, -1)}</g>
        <g class="lids" opacity="0"><path d="M-64,-1 C-50,-14 -28,-16 -14,-5 C-28,8 -50,8 -64,-1Z" fill="${C.skin}"/><path d="M-62,1 C-48,8 -30,8 -16,0" stroke="#161616" stroke-width="3" fill="none"/>
          <g transform="scale(-1 1)"><path d="M-64,-1 C-50,-14 -28,-16 -14,-5 C-28,8 -50,8 -64,-1Z" fill="${C.skin}"/><path d="M-62,1 C-48,8 -30,8 -16,0" stroke="#161616" stroke-width="3" fill="none"/></g></g></g>
      <g class="brows"><path d="${BROW[o.brows] || BROW.neutral}" fill="${o.browCol || '#2a2420'}"/><path d="${BROW[o.brows] || BROW.neutral}" transform="scale(-1 1)" fill="${o.browCol || '#2a2420'}"/></g>
      <g class="mouth"><g class="m0">${MOUTH[o.mouth] || MOUTH.neutral}</g><g class="m1" opacity="0">${MOUTH[o.mouthOpen || 'open']}</g></g>`;
    if (o.blush) feat.top += `<path d="M-72,56 l12,-10 M-62,58 l12,-10 M72,56 l-12,-10 M62,58 l-12,-10" stroke="${C.red}" stroke-width="3" stroke-linecap="round" opacity=".8"/>`;
    if (o.sweat) feat.top += `<path d="M110,-80 C100,-58 96,-42 104,-34 C112,-28 126,-36 122,-50 C120,-60 114,-70 110,-80Z" fill="#fff" stroke="#111" stroke-width="3.5"/>`;

    if (o.beard === 'full') {
      const bd = 'M-96,20 C-100,110 -60,200 0,226 C60,200 100,110 96,20 C88,80 62,100 36,90 C18,86 10,96 0,96 C-10,96 -18,86 -36,90 C-62,100 -88,80 -96,20Z';
      face.col += `<path d="${bd}" fill="${o.hairCol}"/>`;
      feat.ink += `<path d="${bd}" fill="${o.hairInk}"/><path d="${bd}" fill="none" stroke="#111" stroke-width="5"/>
        <path d="M-60,120 C-50,150 -36,180 -24,200 M-30,130 C-24,160 -16,190 -8,212 M30,130 C24,160 16,190 8,212 M60,120 C50,150 36,180 24,200" stroke="#bbb" stroke-width="2.5" fill="none"/>
        <path d="M-6,86 C-26,80 -52,86 -66,100 C-46,96 -22,96 -4,94Z M6,86 C26,80 52,86 66,100 C46,96 22,96 4,94Z" fill="${o.hairInk}" stroke="#111" stroke-width="3"/>`;
    }
    if (o.beard === 'pointed') {
      const bd = 'M-48,116 C-32,166 -12,222 0,246 C12,222 32,166 48,116 C26,134 -26,134 -48,116Z';
      face.col += `<path d="${bd}" fill="${o.hairCol}"/>`;
      feat.ink += `<path d="${bd}" fill="${o.hairInk}"/><path d="${bd}" fill="none" stroke="#111" stroke-width="4"/>
        <path d="M-4,86 C-22,80 -48,82 -64,92 C-70,96 -72,86 -66,84 C-50,92 -24,94 -4,94Z M4,86 C22,80 48,82 64,92 C70,96 72,86 66,84 C50,92 24,94 4,94Z" fill="#161616"/>`;
    }
    if (o.beard === 'moustache') {
      const md = 'M-4,80 C-30,72 -74,86 -92,150 C-74,124 -50,102 -6,96 L6,96 C50,102 74,124 92,150 C74,86 30,72 4,80Z';
      feat.col += `<path d="${md}" fill="${o.hairCol}"/>`;
      feat.ink += `<path d="${md}" fill="${o.hairInk}"/><path d="${md}" fill="none" stroke="#111" stroke-width="4"/><path d="M-40,90 C-56,104 -70,120 -80,138 M40,90 C56,104 70,120 80,138" stroke="#666" stroke-width="2.4" fill="none"/>`;
    }

    if (H.front) {
      headFront.col += `<path d="${H.front}" fill="${o.hairCol}"/>`;
      headFront.tone += `<path d="${H.front}" fill="#fff"/>`;
      headFront.ink += `<path d="${H.front}" fill="${o.hairInk}"/><path d="${H.strands}" stroke="#fff" stroke-width="3" fill="none" opacity=".9"/><path d="${H.front}" fill="none" stroke="#111" stroke-width="5"/>`;
      headFront.top += `<path d="${H.strands}" stroke="#fff" stroke-width="2.2" fill="none" stroke-dasharray="26 18" opacity=".55"/>`;
    }
    if (o.headwear) { const hw = o.headwear(o); for (const k of ['col', 'tone', 'ink', 'top']) { headFront[k] += hw[k] || ''; headBack[k] = (hw[k + 'Back'] || '') + headBack[k]; } }
    if (o.extra) for (const k of ['col', 'tone', 'ink', 'top']) headFront[k] += o.extra[k] || '';

    const joints = {};
    for (const side of ['L', 'R']) {
      const a = o.arms[side]; if (!a) continue;
      joints[side] = arm(a, side, a.back ? armB : armFront);
    }

    const g = k => `<g class="ch ch-${o.id}" transform="${tr}">
        <g class="armsB">${armB[k]}</g>
        <g class="body">${body[k]}</g>
        <g class="head">${headBack[k]}${face[k]}<g class="feat">${feat[k]}</g>${headFront[k]}</g>
        <g class="armsF">${armFront[k]}</g></g>`;
    const out = { col: g('col'), tone: g('tone'), ink: g('ink'), top: g('top') };
    const G = (lx, ly) => `${(o.x + lx * (o.flip ? -o.s : o.s)).toFixed(1)} ${(o.y + ly * o.s).toFixed(1)}`;
    out.pivots = { neck: G(0, 140), head: G(0, 0) };
    for (const side in joints) { out.pivots['shoulder' + side] = G(...joints[side].shoulder); out.pivots['elbow' + side] = G(...joints[side].elbow); out.pivots['hand' + side] = G(...joints[side].hand); }
    out.id = o.id; out.s = o.s; out.flip = o.flip; out.x = o.x; out.y = o.y;
    return out;
  }

  function laurel(rad, a0, a1, n, fill, stroke) {
    let s = '';
    for (let i = 0; i < n; i++) {
      const a = (a0 + (a1 - a0) * i / (n - 1)) * Math.PI / 180;
      const x = Math.cos(a) * rad, y = Math.sin(a) * rad, t = a * 180 / Math.PI;
      [28, -28].forEach(k => s += `<path d="M0,0 C10,-12 30,-12 40,0 C30,12 10,12 0,0Z" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(t + 90 + k).toFixed(1)})" fill="${fill}" ${stroke ? `stroke="${stroke}" stroke-width="3"` : ''}/>`);
    }
    return s;
  }
  const HW = {
    laurel: () => ({ col: laurel(118, 196, 344, 9, C.gold), tone: laurel(118, 196, 344, 9, '#fff'), ink: laurel(118, 196, 344, 9, '#fff', '#111') }),
    legion: () => ({
      col: `<path d="M-30,-150 C-20,-236 100,-246 140,-166 C100,-188 36,-180 30,-150Z" fill="${C.red}"/><path d="M-112,-36 C-120,-172 120,-172 112,-36 C84,-70 -84,-70 -112,-36Z" fill="#e8e8e8"/>`,
      ink: `<path d="M-30,-150 C-20,-236 100,-246 140,-166 C100,-188 36,-180 30,-150Z" fill="#9a9a9a" stroke="#111" stroke-width="5"/>
        <path d="M-112,-36 C-120,-172 120,-172 112,-36 C84,-70 -84,-70 -112,-36Z" fill="url(#gBronze)" stroke="#111" stroke-width="6"/>
        <path d="M-104,-40 L-108,74 L-80,88 L-74,-34Z M104,-40 L108,74 L80,88 L74,-34Z" fill="#9a9a9a" stroke="#111" stroke-width="5"/>
        <path d="M-96,-74 C-40,-96 40,-96 96,-74" stroke="#111" stroke-width="6" fill="none"/>`,
      tone: `<path d="M-112,-36 C-120,-172 120,-172 112,-36 C84,-70 -84,-70 -112,-36Z" fill="#fff"/>`
    }),
    turban: () => ({
      col: `<path d="M-120,-26 C-142,-140 -62,-196 0,-194 C62,-196 142,-140 120,-26 C96,-62 42,-74 0,-72 C-42,-74 -96,-62 -120,-26Z" fill="#fbfaf6"/><circle cx="0" cy="-86" r="16" fill="${C.red}"/>`,
      tone: `<path d="M-120,-26 C-142,-140 -62,-196 0,-194 C62,-196 142,-140 120,-26 C96,-62 42,-74 0,-72 C-42,-74 -96,-62 -120,-26Z" fill="#fff"/><path d="M40,-180 C100,-160 130,-110 120,-26 C100,-50 70,-66 40,-72Z" fill="#c2c2c2"/>`,
      ink: `<path d="M-120,-26 C-142,-140 -62,-196 0,-194 C62,-196 142,-140 120,-26 C96,-62 42,-74 0,-72 C-42,-74 -96,-62 -120,-26Z" fill="#fff"/>
        <path d="M-114,-56 C-52,-128 62,-138 124,-66 M-124,-88 C-62,-158 52,-168 114,-108 M-104,-128 C-42,-178 42,-178 94,-150 M-64,-76 C-32,-148 42,-178 84,-168" stroke="#111" stroke-width="4.5" fill="none"/>
        <path d="M-120,-26 C-142,-140 -62,-196 0,-194 C62,-196 142,-140 120,-26 C96,-62 42,-74 0,-72 C-42,-74 -96,-62 -120,-26Z" fill="none" stroke="#111" stroke-width="5.5"/>
        <circle cx="0" cy="-86" r="16" fill="none" stroke="#111" stroke-width="4"/>`
    }),
    beret: () => ({
      col: `<path d="M50,-136 C94,-212 156,-222 178,-190 C136,-190 94,-168 66,-128Z" fill="#fff"/>`,
      ink: `<path d="M-128,-72 C-134,-156 112,-188 146,-104 C104,-78 -52,-62 -128,-72Z" fill="#141414" stroke="#111" stroke-width="5"/>
        <path d="M50,-136 C94,-212 156,-222 178,-190 C136,-190 94,-168 66,-128Z" fill="#d8d8d8" stroke="#111" stroke-width="4"/>
        <path d="M62,-138 C102,-188 144,-198 172,-190" stroke="#111" stroke-width="3" fill="none"/>`
    }),
    corinth: () => ({
      colBack: `<path d="M-150,-120 C-150,-290 190,-310 230,-140 C176,-246 -100,-246 -112,-120Z" fill="${C.red}"/>`,
      inkBack: `<path d="M-150,-120 C-150,-290 190,-310 230,-140 C176,-246 -100,-246 -112,-120Z" fill="url(#gCrest)"/>
        ${Array.from({ length: 16 }, (_, i) => `<path d="M${-132 + i * 22},${(-156 - Math.sin(i / 15 * Math.PI) * 100).toFixed(1)} l${6 + i},38" stroke="#111" stroke-width="4"/>`).join('')}
        <path d="M-150,-120 C-150,-290 190,-310 230,-140 C176,-246 -100,-246 -112,-120Z" fill="none" stroke="#111" stroke-width="5"/>`,
      col: `<path d="M-122,-54 C-134,-210 134,-220 122,-54 L104,-76 L62,-86 L38,-66 L-38,-66 L-62,-86 L-104,-76Z" fill="${C.bronze}"/>`,
      tone: `<path d="M-122,-54 C-134,-210 134,-220 122,-54 L104,-76 L62,-86 L38,-66 L-38,-66 L-62,-86 L-104,-76Z" fill="#fff"/><path d="M40,-190 C100,-170 124,-120 122,-54 L104,-76 L62,-86Z" fill="#9a9a9a"/>`,
      ink: `<path d="M-122,-54 C-134,-210 134,-220 122,-54 L104,-76 L62,-86 L38,-66 L-38,-66 L-62,-86 L-104,-76Z" fill="#fff"/><path d="M-122,-54 C-134,-210 134,-220 122,-54 L104,-76 L62,-86 L38,-66 L-38,-66 L-62,-86 L-104,-76Z" fill="none" stroke="#111" stroke-width="6"/>
        <path d="M-94,-104 L-42,-96 L-38,-76 L-90,-82Z M94,-104 L42,-96 L38,-76 L90,-82Z M-6,-96 L6,-96 L6,-66 L-6,-66Z" fill="#111"/>
        <path d="M-110,-140 C-50,-170 50,-170 110,-140" stroke="#111" stroke-width="3" fill="none"/>`
    })
  };

  // ---------- окружение
  function mountains(y, tone = '#9a9a9a', seed = 1, h = 260) {
    let d = `M-1200,${y}`;
    for (let x = -1200; x <= 2800; x += 120) {
      const k = Math.sin(x * .013 + seed) * .5 + Math.sin(x * .031 + seed * 2) * .35;
      d += ` L${x + 60},${(y - h * (.45 + k * .5)).toFixed(1)} L${x + 120},${(y - h * (.2 + Math.abs(Math.sin(x * .02 + seed)) * .2)).toFixed(1)}`;
    }
    d += ` L2800,${y + 900} L-1200,${y + 900}Z`;
    return `<path d="${d}" fill="${tone}" stroke="#111" stroke-width="4"/>`;
  }
  function cloud(x, y, s = 1) {
    const d = 'M-120,30 C-150,30 -150,-10 -120,-14 C-130,-50 -80,-70 -54,-46 C-40,-90 30,-90 44,-46 C70,-70 120,-50 110,-14 C150,-10 150,30 120,30Z';
    return `<g transform="translate(${x} ${y}) scale(${s})"><path d="${d}" fill="#fff" stroke="#111" stroke-width="5"/><path d="M-120,30 C-60,12 60,12 120,30Z" fill="#bbb"/></g>`;
  }
  function column(x, y, h, w = 60) {
    let fl = '';
    for (let i = 1; i < 5; i++) fl += `<path d="M${x - w / 2 + i * w / 5},${y - h + 30} V${y - 24}" stroke="#111" stroke-width="3"/>`;
    return `<rect x="${x - w / 2}" y="${y - h + 24}" width="${w}" height="${h - 48}" fill="url(#gCylV)"/>${fl}
      <rect x="${x - w / 2 - 14}" y="${y - h}" width="${w + 28}" height="26" fill="#ddd" stroke="#111" stroke-width="4"/>
      <rect x="${x - w / 2 - 10}" y="${y - 26}" width="${w + 20}" height="26" fill="#ddd" stroke="#111" stroke-width="4"/>
      <rect x="${x - w / 2}" y="${y - h + 24}" width="${w}" height="${h - 48}" fill="none" stroke="#111" stroke-width="4"/>`;
  }
  function temple(x, y, s = 1) {
    let cols = '';
    for (let i = 0; i < 6; i++) cols += column(-250 + i * 100, 0, 260, 44);
    return `<g transform="translate(${x} ${y}) scale(${s})">
      <path d="M-320,-260 L0,-380 L320,-260Z" fill="#ccc" stroke="#111" stroke-width="5"/>
      <rect x="-320" y="-262" width="640" height="34" fill="#888" stroke="#111" stroke-width="4"/>${cols}
      <rect x="-340" y="0" width="680" height="30" fill="#aaa" stroke="#111" stroke-width="4"/></g>`;
  }
  function tent(x, y, s = 1) {
    const t = `translate(${x} ${y}) scale(${s})`;
    return {
      col: `<g transform="${t}"><path d="M-170,0 L-120,-190 L120,-190 L170,0Z" fill="#fbfaf6"/><path d="M-120,-190 L0,-260 L120,-190Z" fill="${C.red}"/></g>`,
      ink: `<g transform="${t}"><path d="M-170,0 L-120,-190 L120,-190 L170,0Z" fill="#d6d6d6" stroke="#111" stroke-width="5"/>
        <path d="M-120,-190 L0,-260 L120,-190Z" fill="#9a9a9a" stroke="#111" stroke-width="5"/>
        <path d="M-120,-150 L120,-150 M-130,-110 L130,-110" stroke="#111" stroke-width="3"/>
        <path d="M-50,0 L0,-170 L50,0Z" fill="#111"/><path d="M0,-260 V-300" stroke="#111" stroke-width="6"/></g>`
    };
  }
  function palisade(x0, x1, y, h = 120) {
    let s = '';
    for (let x = x0; x < x1; x += 34) { const j = ((x * 7) % 20 + 20) % 20; s += `<path d="M${x},${y} V${y - h + j} L${x + 14},${y - h - 22 + j} L${x + 28},${y - h + j} V${y}Z" fill="#7a7a7a" stroke="#111" stroke-width="3"/>`; }
    return s + `<path d="M${x0},${y - h * .45} H${x1}" stroke="#111" stroke-width="8"/>`;
  }
  function aquila(x, y, s = 1) {
    return {
      col: `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-70" y="-250" width="140" height="80" fill="${C.red}"/><path d="M-60,-330 C-30,-300 -10,-300 0,-320 C10,-300 30,-300 60,-330 C50,-290 20,-270 0,-276 C-20,-270 -50,-290 -60,-330Z" fill="${C.gold}"/></g>`,
      ink: `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-6" y="-320" width="12" height="320" fill="#333"/>
        <rect x="-70" y="-250" width="140" height="80" fill="none" stroke="#111" stroke-width="5"/>
        <path d="M-60,-330 C-30,-300 -10,-300 0,-320 C10,-300 30,-300 60,-330 C50,-290 20,-270 0,-276 C-20,-270 -50,-290 -60,-330Z" fill="#aaa" stroke="#111" stroke-width="4"/>
        <path d="M-70,-170 L-60,-150 L-50,-170 L-40,-150 L-30,-170 L-20,-150 L-10,-170 L0,-150 L10,-170 L20,-150 L30,-170 L40,-150 L50,-170 L60,-150 L70,-170" stroke="#111" stroke-width="3" fill="none"/></g>`,
      top: `<text x="${x}" y="${y - 198 * s}" font-family="Cinzel, serif" font-weight="700" font-size="${34 * s}" text-anchor="middle" fill="${C.gold}">SPQR</text>`
    };
  }
  function tree(x, y, s) {
    return `<g transform="translate(${x},${y}) scale(${s})">
      <path d="M-14,0 L-10,-170 L10,-170 L14,0Z" fill="#111"/>
      <path d="M0,-480 L-70,-330 L-40,-330 L-110,-200 L-70,-200 L-130,-110 L130,-110 L70,-200 L110,-200 L40,-330 L70,-330Z" fill="#1b1b1b" stroke="#111" stroke-width="4"/>
      <path d="M0,-470 L-36,-390 M20,-300 L56,-224 M-30,-220 L-70,-150" stroke="#888" stroke-width="5"/></g>`;
  }
  function bush(x, y, s, eyes = true) {
    return {
      ink: `<g transform="translate(${x},${y}) scale(${s})">
        <path d="M-150,40 C-170,-20 -120,-60 -80,-40 C-70,-100 0,-110 20,-60 C50,-110 130,-90 120,-30 C170,-30 180,40 140,50Z" fill="#141414"/>
        <path d="M-110,-20 l-10,-20 M-30,-70 l-6,-24 M60,-70 l8,-22 M120,-20 l14,-14" stroke="#888" stroke-width="5"/></g>`,
      top: eyes ? `<g transform="translate(${x},${y}) scale(${s})"><g class="blink">
        <path d="M-50,-14 C-40,-26 -18,-26 -10,-12 C-22,-6 -40,-6 -50,-14Z" fill="#fff"/><circle cx="-28" cy="-14" r="6" fill="${C.red}"/>
        <path d="M10,-12 C18,-26 40,-26 50,-14 C40,-6 22,-6 10,-12Z" fill="#fff"/><circle cx="28" cy="-14" r="6" fill="${C.red}"/></g></g>` : ''
    };
  }
  function shelf(x, y, w, h, rows = 4) {
    let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#555" stroke="#111" stroke-width="6"/>`;
    const rh = h / rows;
    for (let r = 0; r < rows; r++) {
      const yy = y + r * rh;
      s += `<rect x="${x + 10}" y="${yy + 8}" width="${w - 20}" height="${rh - 16}" fill="#222"/>`;
      for (let i = 0; i < Math.floor((w - 30) / 34); i++) {
        const kind = (i * 7 + r * 3) % 4, bx = x + 18 + i * 34;
        if (kind === 0) s += `<circle cx="${bx + 14}" cy="${yy + rh - 30}" r="16" fill="#ddd" stroke="#111" stroke-width="3"/><circle cx="${bx + 14}" cy="${yy + rh - 30}" r="5" fill="#111"/>`;
        else s += `<rect x="${bx}" y="${yy + 16 + kind * 6}" width="28" height="${rh - 32 - kind * 6}" fill="${kind === 2 ? '#bbb' : '#888'}" stroke="#111" stroke-width="3"/>`;
      }
    }
    return s;
  }
  function speedlines(cx, cy, r0, r1, n = 48, tone = '#111') {
    let s = '';
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2 + (i % 3) * .02, rr = r0 + (i * 37 % 60);
      const p = (r, d) => `${(cx + Math.cos(a + d) * r).toFixed(1)},${(cy + Math.sin(a + d) * r).toFixed(1)}`;
      s += `<path d="M${p(rr, 0)} L${p(r1, -.016)} L${p(r1, .016)}Z" fill="${tone}"/>`;
    }
    return s;
  }
  function skyline(x0, x1, y) {
    let s = '', x = x0, i = 0;
    while (x < x1) {
      const w = 60 + (i * 37 % 70), h = 120 + (i * 53 % 260);
      s += `<rect x="${x}" y="${y - h}" width="${w}" height="${h}" fill="#555" stroke="#111" stroke-width="3"/>`;
      for (let wy = y - h + 16; wy < y - 14; wy += 26) for (let wx = x + 10; wx < x + w - 14; wx += 20) if ((wx + wy + i) % 3) s += `<rect x="${wx}" y="${wy}" width="9" height="12" fill="#eee"/>`;
      x += w + 6; i++;
    }
    return s;
  }
  function dome(x, y, r, h) { return `<path d="M${x - r},${y} C${x - r},${y - h} ${x - 8},${y - h * 1.2} ${x},${y - h * 1.5} C${x + 8},${y - h * 1.2} ${x + r},${y - h} ${x + r},${y}Z" fill="#9a9a9a" stroke="#111" stroke-width="4"/>`; }
  function palm(x, y, s = 1) {
    let leaves = '';
    for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * .45; leaves += `<path d="M0,-300 C${(Math.cos(a) * 80).toFixed(1)},${(-300 + Math.sin(a) * 80 - 30).toFixed(1)} ${(Math.cos(a) * 160).toFixed(1)},${(-300 + Math.sin(a) * 100).toFixed(1)} ${(Math.cos(a) * 200).toFixed(1)},${(-300 + Math.sin(a) * 70 + 60).toFixed(1)}" stroke="#111" stroke-width="16" fill="none" stroke-linecap="round"/>`; }
    return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-10,0 C-14,-100 -6,-200 0,-300 L10,-300 C6,-200 12,-100 14,0Z" fill="#333" stroke="#111" stroke-width="3"/>${leaves}</g>`;
  }

  const HEAD = `M-70,-95 C-30,-125 40,-118 70,-80 C82,-62 86,-45 88,-30 L92,-18
    C96,-8 104,8 116,22 L106,30 L100,32 C102,40 104,44 102,48 L96,52 C100,58 99,64 94,68
    C96,78 94,90 84,98 C66,108 44,108 30,104 L34,150 L-50,150 C-55,120 -70,100 -88,70
    C-110,30 -108,-55 -70,-95Z`;
  function caesarCoin(tr) {
    return {
      col: `<g transform="${tr}"><path d="M-50,140 C-150,165 -210,230 -225,380 L235,380 C225,250 170,170 34,140Z" fill="#fff"/>
        <path d="M-200,210 C-80,280 70,300 200,240 L225,320 C70,380 -90,350 -215,280Z" fill="${C.red}"/>${laurel(104, 150, 292, 8, C.yellow)}</g>`,
      ink: `<g transform="${tr}"><path d="${HEAD}" fill="#060606"/>
        <path d="M-50,140 C-150,165 -210,230 -225,380 L235,380 C225,250 170,170 34,140Z" fill="url(#gToga)"/>
        <path d="M-200,210 C-80,280 70,300 200,240 L225,320 C70,380 -90,350 -215,280Z" fill="url(#gSash)"/>${laurel(104, 150, 292, 8, 'none', '#111')}</g>`,
      tone: '', top: ''
    };
  }

  const GRADS = `
    <clipPath id="cpTorso"><path d="${TORSO}"/></clipPath>
    <linearGradient id="gToga" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8a8a8a"/><stop offset=".4" stop-color="#f2f2f2"/><stop offset="1" stop-color="#6a6a6a"/></linearGradient>
    <linearGradient id="gSash" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#666"/><stop offset=".5" stop-color="#d0d0d0"/><stop offset="1" stop-color="#444"/></linearGradient>
    <linearGradient id="gCloak" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3a3a3a"/><stop offset=".5" stop-color="#a5a5a5"/><stop offset="1" stop-color="#2e2e2e"/></linearGradient>
    <linearGradient id="gBronze" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2a2a2a"/><stop offset=".55" stop-color="#dcdcdc"/><stop offset=".8" stop-color="#8a8a8a"/><stop offset="1" stop-color="#1a1a1a"/></linearGradient>
    <linearGradient id="gCrest" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#444"/><stop offset="1" stop-color="#bbb"/></linearGradient>
    <linearGradient id="gFadeDown" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000"/><stop offset=".55" stop-color="#666"/><stop offset="1" stop-color="#fff"/></linearGradient>
    <linearGradient id="gFadeUp" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#222"/><stop offset=".6" stop-color="#aaa"/><stop offset="1" stop-color="#fff"/></linearGradient>
    <linearGradient id="gSkyDots" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#777"/><stop offset="1" stop-color="#fff"/></linearGradient>
    <linearGradient id="gCylH" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#222"/><stop offset=".35" stop-color="#ececec"/><stop offset="1" stop-color="#1c1c1c"/></linearGradient>
    <linearGradient id="gCylV" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#333"/><stop offset=".35" stop-color="#ececec"/><stop offset="1" stop-color="#2a2a2a"/></linearGradient>
    <linearGradient id="gWood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a8a8a"/><stop offset="1" stop-color="#3a3a3a"/></linearGradient>
    <radialGradient id="gGlow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff"/><stop offset=".6" stop-color="#bbb"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <radialGradient id="gSphere" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#fff"/><stop offset=".6" stop-color="#999"/><stop offset="1" stop-color="#222"/></radialGradient>
    <radialGradient id="gVignette" cx=".5" cy=".5" r=".7"><stop offset=".55" stop-color="#fff"/><stop offset="1" stop-color="#777"/></radialGradient>
  `;

  window.ART = { C, BG, FONT, L4, bubble, sfx, setFit, textW, person, HW, mountains, cloud, column, temple, tent, palisade, aquila, tree, bush, shelf, speedlines, skyline, dome, palm, laurel, caesarCoin, GRADS };
})();
