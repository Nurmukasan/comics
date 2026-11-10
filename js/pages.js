/* Страницы комикса «Тайнопись».
   Страница = кадры (panels) + шаги чтения (steps). Каждый кадр показывает
   участок «мира» страницы своим масштабом: общий план, крупный план, деталь.
   Шаг: какой кадр в фокусе, подпись, кто говорит, анимация по скроллу. */
(function () {
  const A = window.ART, C = A.C, HW = A.HW;
  const LAT = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const RUS = 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ';
  const MONO = 'JetBrains Mono', DISP = 'Unbounded';
  const PW = 1000, PH = 1450;

  function shiftText(txt, k) {
    return [...txt].map(ch => {
      const up = ch.toUpperCase();
      const al = LAT.includes(up) ? LAT : RUS.includes(up) ? RUS : null;
      if (!al) return ch;
      const n = al.length, r = al[((al.indexOf(up) + k) % n + n) % n];
      return ch === up ? r : r.toLowerCase();
    }).join('');
  }
  window.shiftText = shiftText;

  const J = (...p) => {
    const o = { defs: '', col: '', tone: '', toneR: '', ink: '', top: '' };
    p.forEach(x => { if (!x) return; for (const k in o) o[k] += x[k] || ''; });
    return o;
  };
  const LAY = {
    wideTop3: [{ id: 'a', x: 40, y: 84, w: 920, h: 560 }, { id: 'b', x: 40, y: 668, w: 448, h: 702 }, { id: 'c', x: 512, y: 668, w: 448, h: 702 }],
    twoTopWide: [{ id: 'a', x: 40, y: 84, w: 448, h: 620 }, { id: 'b', x: 512, y: 84, w: 448, h: 620 }, { id: 'c', x: 40, y: 728, w: 920, h: 642 }],
    bigTop: [{ id: 'a', x: 40, y: 84, w: 920, h: 800 }, { id: 'b', x: 40, y: 908, w: 920, h: 462 }],
    topBig: [{ id: 'a', x: 40, y: 84, w: 920, h: 560 }, { id: 'b', x: 40, y: 668, w: 920, h: 702 }],
    splash: [{ id: 'a', x: 40, y: 84, w: 920, h: 1286 }]
  };
  const lay = (name, over) => LAY[name].map((p, i) => Object.assign({}, p, over[i] || {}));
  const yawTween = (tl, a, b, t, d) => { const o = { v: a }; tl.fromTo(o, { v: a }, { v: b, duration: d, ease: 'none', onUpdate: () => window.BOOK.bustYaw && window.BOOK.bustYaw(o.v) }, t); };

  // ---------- реквизит
  const scrollProp = (x, y, s = 1, rot = 0) => {
    const t = `translate(${x} ${y}) rotate(${rot}) scale(${s})`;
    return {
      col: `<g transform="${t}"><rect x="-70" y="-20" width="140" height="40" rx="16" fill="${C.cream}"/></g>`,
      ink: `<g transform="${t}"><rect x="-70" y="-20" width="140" height="40" rx="16" fill="url(#gCylH)" stroke="#111" stroke-width="4"/><ellipse cx="70" cy="0" rx="9" ry="20" fill="#ddd" stroke="#111" stroke-width="3"/></g>`,
      top: `<g transform="${t}"><rect x="-8" y="-24" width="16" height="48" fill="${C.red}" stroke="#111" stroke-width="3"/></g>`
    };
  };
  const heldScroll = { col: `<rect x="-70" y="40" width="140" height="40" rx="16" fill="${C.cream}"/>`, ink: `<rect x="-70" y="40" width="140" height="40" rx="16" fill="url(#gCylH)" stroke="#111" stroke-width="4"/>`, tone: `<rect x="-70" y="40" width="140" height="40" fill="#fff"/>`, top: `<rect x="-6" y="36" width="12" height="48" fill="${C.red}" stroke="#111" stroke-width="2"/>` };
  const candle = (x, y, s = 1, cls = 'flame') => ({
    col: `<g transform="translate(${x} ${y}) scale(${s})"><circle cx="0" cy="-150" r="110" fill="${C.yellow}" opacity=".28"/></g>`,
    top: `<g transform="translate(${x} ${y}) scale(${s})"><ellipse class="${cls}" cx="0" cy="-150" rx="16" ry="34" fill="${C.yellow}" stroke="#111" stroke-width="3"/></g>`,
    ink: `<g transform="translate(${x} ${y}) scale(${s})"><circle cx="0" cy="-150" r="170" fill="url(#gGlow)"/><rect x="-18" y="-120" width="36" height="120" fill="#eee" stroke="#111" stroke-width="4"/><path d="M-30,0 H30" stroke="#111" stroke-width="10"/></g>`
  });
  function padlock(x, y, s = 1, id = '') {
    const t = `translate(${x} ${y}) scale(${s})`;
    return {
      col: `<g transform="${t}"><rect x="-150" y="0" width="300" height="270" rx="30" fill="${C.red}"/></g>`,
      tone: `<g transform="${t}"><rect x="-150" y="0" width="300" height="270" rx="30" fill="#fff"/><path d="M60,0 H120 C140,0 150,10 150,30 V240 C150,260 140,270 120,270 H60Z" fill="#9a9a9a"/></g>`,
      ink: `<g transform="${t}"><g class="shackle${id}"><path d="M-95,10 V-110 C-95,-240 95,-240 95,-110 V10" fill="none" stroke="#111" stroke-width="58"/><path d="M-95,10 V-110 C-95,-240 95,-240 95,-110 V10" fill="none" stroke="#e8e8e8" stroke-width="16"/></g>
        <rect x="-150" y="0" width="300" height="270" rx="30" fill="none" stroke="#111" stroke-width="10"/>
        <circle cx="0" cy="115" r="30" fill="#111"/><path d="M-12,125 L12,125 L22,200 L-22,200Z" fill="#111"/></g>`
    };
  }

  // ---------- Энигма (настоящие роторы I, II, III и рефлектор B)
  const ROT = ['EKMFLGDQVZNTOWYHXUSPAIBRCJ', 'AJDKSIRUXBLHWTMCQGZNPYFVOE', 'BDFHJLCPRTXVZNYEIWGAKMUSQO'];
  const NOTCH = ['Q', 'E', 'V'], REFL = 'YRUHQSLDPXNGOKMIEBFZCWVJAT';
  function makeEnigma(start = 'AAA') {
    const pos = [...start].map(c => LAT.indexOf(c));
    function step() {
      if (LAT[pos[1]] === NOTCH[1]) { pos[0] = (pos[0] + 1) % 26; pos[1] = (pos[1] + 1) % 26; }
      else if (LAT[pos[2]] === NOTCH[2]) pos[1] = (pos[1] + 1) % 26;
      pos[2] = (pos[2] + 1) % 26;
    }
    const fwd = (r, c, p) => (LAT.indexOf(ROT[r][(c + p) % 26]) - p + 26) % 26;
    const bwd = (r, c, p) => (ROT[r].indexOf(LAT[(c + p) % 26]) - p + 26) % 26;
    return {
      press(ch) {
        step(); let c = LAT.indexOf(ch);
        c = fwd(2, c, pos[2]); c = fwd(1, c, pos[1]); c = fwd(0, c, pos[0]);
        c = LAT.indexOf(REFL[c]);
        c = bwd(0, c, pos[0]); c = bwd(1, c, pos[1]); c = bwd(2, c, pos[2]);
        return LAT[c];
      },
      window() { return pos.map(p => LAT[p]).join(''); }
    };
  }

  // ---------- персонажи (общие настройки)
  const P = {
    caesar: o => A.person(Object.assign({ hair: 'roman', hairCol: '#3a2a20', hairInk: '#4a4a4a', iris: '#3b2a1a', outfit: 'toga', headwear: HW.laurel, age: 1 }, o)),
    messenger: o => A.person(Object.assign({ hair: 'crop', hairCol: '#2a2018', outfit: 'legion', headwear: HW.legion, beard: 'stubble', iris: '#4a3a2a' }, o)),
    gaul: o => A.person(Object.assign({ hair: 'long', hairCol: C.yellow, hairInk: '#9a9a9a', outfit: 'gaul', beard: 'moustache', iris: '#3a7a5a', browCol: '#8a6a20' }, o)),
    spartan: o => A.person(Object.assign({ hair: 'crop', hairCol: '#2a2018', outfit: 'spartan', headwear: HW.corinth, beard: 'stubble', iris: '#3a2a1a' }, o)),
    kindi: o => A.person(Object.assign({ hair: 'bald', outfit: 'robe', headwear: HW.turban, beard: 'full', hairCol: '#2a2420', hairInk: '#2e2e2e', iris: '#6a4a1a', age: 1 }, o)),
    bellaso: o => A.person(Object.assign({ hair: 'side', outfit: 'doublet', headwear: HW.beret, beard: 'pointed', iris: '#4a4a4a' }, o)),
    turing: o => A.person(Object.assign({ hair: 'side', outfit: 'suit', brows: 'thin', iris: '#4a5a6a' }, o)),
    alice: o => A.person(Object.assign({ sex: 'f', hair: 'pony', hairCol: '#1d1a18', outfit: 'hoodie', iris: '#7a2a1a', blush: true }, o)),
    bob: o => A.person(Object.assign({ hair: 'messy', hairCol: '#2a2420', outfit: 'labcoat', iris: '#3a4a6a' }, o)),
    physicist: o => A.person(Object.assign({ sex: 'f', hair: 'bun', hairCol: '#3a2a20', outfit: 'labcoat', iris: '#3a5a3a' }, o))
  };

  // =====================================================================
  const pages = [];

  // ---------- ОБЛОЖКА
  function coverHTML() {
    let rays = '';
    for (let i = 0; i < 72; i++) {
      const a = i / 72 * Math.PI * 2, a2 = a + Math.PI / 72;
      const p = (r, an) => `${(500 + Math.cos(an) * r).toFixed(1)},${(760 + Math.sin(an) * r).toFixed(1)}`;
      if (i % 2 === 0) rays += `<path d="M${p(300, a)} L${p(1500, a)} L${p(1500, a2)} L${p(300, a2)}Z"/>`;
    }
    let bars = '';
    for (let i = 0, x = 0; i < 46; i++) { const w = [2, 4, 2, 6, 3, 2, 5][i % 7]; bars += `<rect x="${x}" y="0" width="${w}" height="70"/>`; x += w + [3, 2, 4, 2][i % 4]; }
    const coin = A.caesarCoin('translate(500 520) scale(1.1)');
    return `<div class="cv">
      <svg class="cv-rays" viewBox="0 0 1000 1450" preserveAspectRatio="none"><g fill="#111" opacity=".9">${rays}</g></svg>
      <div class="cv-bar"><div class="cv-issue"><b>№1</b><span>ВЫПУСК</span></div><div class="cv-pub">КРИПТО<br>КОМИКС</div><div class="cv-price"><b>3</b><span>сестерция</span></div></div>
      <h1 class="cv-title">ТАЙНОПИСЬ</h1>
      <p class="cv-sub">История самого гениального изобретения</p>
      <div class="cv-art"><div class="cv-sun"></div>
        <svg class="cv-coin" viewBox="0 0 1000 1000"><g>${coin.col}</g><g filter="url(#engV)"><rect x="-1200" y="-1200" width="4000" height="3400" fill="#fff"/>${coin.ink}</g></svg>
        <div class="bust-host"></div></div>
      <div class="cv-burst"><span>2500 лет<br>шифров<br>и взломов!</span></div>
      <div class="cv-foot"><span>Спарта · Рим · Багдад · Блетчли-парк · твой телефон</span><svg viewBox="0 0 200 70" class="cv-code"><g fill="#111">${bars}</g></svg></div>
      <button class="cv-trailer" data-trailer>▶ трейлер</button>
    </div>`;
  }
  pages.push({
    id: 'cover', bare: true, cls: 'cover', place: 'ОБЛОЖКА', html: coverHTML, chars: [],
    steps: [
      { panel: 'page', len: 1.1, move: 0, tilt: 34, zoom: .78, build(tl) { yawTween(tl, -.9, -.45, 0, 1.1); } },
      { panel: 'page', len: 1.0, tilt: 0, zoom: 1, build(tl) { yawTween(tl, -.45, .18, 0, 1.0); } }
    ],
    speech: [['А', 'Какое изобретение самое гениальное? Колесо? Интернет? Мы выбрали шифр: без него ваш телефон был бы открытой книгой. Шифр прячет смысл текста от всех, кроме того, кто знает ключ. Наука о шифрах — криптография, по-гречески «тайнопись».']]
  });

  // ---------- ДЕЙСТВУЮЩИЕ ЛИЦА
  const CAST = [
    ['c1', 'Юлий Цезарь', 'полководец Рима<br>100–44 до н. э.', C.red, P.caesar, { mouth: 'smirk' }],
    ['c2', 'Гонец', 'легионер,<br>возит письма', '#fff', P.messenger, { mouth: 'neutral', brows: 'worried' }],
    ['c3', 'Галл', 'воин<br>из засады', C.yellow, P.gaul, { mouth: 'smirk', brows: 'angry' }],
    ['c4', 'Спартанец', 'хранит<br>скиталу', '#fff', P.spartan, { mouth: 'neutral', brows: 'angry' }],
    ['c5', 'Аль-Кинди', 'учёный из Багдада<br>IX век', C.yellow, P.kindi, { mouth: 'smile', brows: 'up' }],
    ['c6', 'Белазо', 'изобрёл шифр<br>с ключом-словом, 1553', C.red, P.bellaso, { mouth: 'smirk' }],
    ['c7', 'Алан Тьюринг', 'математик<br>1912–1954', '#fff', P.turing, { mouth: 'neutral' }],
    ['c8', 'Алиса', 'криптограф<br>наших дней', C.yellow, P.alice, { mouth: 'smile' }]
  ];
  pages.push({
    id: 'cast', place: 'ДЕЙСТВУЮЩИЕ ЛИЦА', head: 'действующие лица', cls: 'cast',
    html: () => `<h2 class="pg-title">ДЕЙСТВУЮЩИЕ ЛИЦА</h2>`,
    chars: CAST.map(c => c[0]),
    panels: CAST.map((c, i) => ({
      id: c[0], x: i % 2 ? 512 : 40, y: 190 + Math.floor(i / 2) * 296, w: 448, h: 282, crop: [150, 40, 780],
      art: () => { const p = c[4](Object.assign({ id: c[0], x: 0, y: 20, s: .95 }, c[5])); return J({ col: `<rect ${A.BG} fill="${c[3]}"/>`, ink: A.speedlines(0, 20, 260, 1400, 40, '#c8c8c8') }, p); },
      html: `<div class="cast-name"><b>${c[1]}</b><span>${c[2]}</span></div>`
    })),
    steps: [
      { panel: { x: 20, y: 70, w: 960, h: 720 }, len: 1.1 },
      { panel: { x: 20, y: 760, w: 960, h: 640 }, len: 1.1 }
    ]
  });

  // ---------- 1. СПАРТА
  const SC_MSG = 'ВРАГИНАХОЛМЕ';
  const SC_STRIP = (() => { let s = ''; for (let c = 0; c < 4; c++) for (let r = 0; r < 3; r++) s += SC_MSG[r * 4 + c]; return s; })();
  pages.push({
    id: 'sparta', num: 1, place: 'СПАРТА', year: -450, yearText: 'V век до н. э.', head: 'глава 1 · скитала', chars: ['sp'],
    world() {
      const sp = P.spartan({ id: 'sp', x: 450, y: 470, s: .9, mouth: 'neutral', brows: 'angry', arms: { R: { a1: -75, a2: -15, hand: 'fist', bare: 'all' } } });
      let strip = '', bands = '';
      [...SC_STRIP].forEach((ch, i) => strip += `<text class="sc-l" x="${680 + i * 62}" y="960" font-family="${DISP}" font-weight="700" font-size="38" text-anchor="middle" fill="#111">${ch}</text>`);
      for (let i = 0; i < 9; i++) bands += `<path d="M${1040 + i * 40},676 L${1070 + i * 40},834" stroke="${C.cream}" stroke-width="28"/>`;
      return J({
        col: `<rect ${A.BG} fill="${C.red}"/><circle cx="1180" cy="230" r="140" fill="#fff"/>`,
        ink: `<rect x="-1200" y="-1200" width="4000" height="1650" fill="url(#gFadeDown)" opacity=".85"/><circle cx="1180" cy="230" r="140" fill="#fff"/>
          ${A.mountains(760, '#8a8a8a', 1, 300)}${A.temple(1300, 700, .5)}${A.mountains(900, '#4a4a4a', 3, 140)}`
      }, sp, {
        ink: `<rect x="990" y="670" width="440" height="170" rx="24" fill="url(#gCylH)" stroke="#111" stroke-width="5"/><ellipse cx="1430" cy="755" rx="22" ry="85" fill="#222"/>`,
        top: `<g class="sc-bands" opacity="0">${bands}</g>
          <g class="sc-strip"><rect x="640" y="912" width="760" height="70" fill="${C.cream}" stroke="#111" stroke-width="4"/></g>${strip}
          <g class="sc-read" opacity="0"><path d="M1040,722 H1390 M1040,766 H1390 M1040,810 H1390" stroke="${C.red}" stroke-width="4" stroke-dasharray="8 8"/></g>`
      });
    },
    panels: lay('wideTop3', [
      { crop: [820, 560, 1500] },
      { crop: [470, 470, 470], extra: () => ({ top: A.bubble({ id: 'b-sp', x: 250, y: 130, w: 450, fs: 30, lines: ['Снимешь ленту —', 'увидишь *кашу* из букв!'], tail: [400, 330], who: 'СПАРТАНЕЦ' }) }) },
      { crop: [1210, 800, 560], extra: () => ({ top: A.bubble({ id: 'b-read', type: 'box', fill: C.cream, x: 960, y: 450, w: 500, fs: 34, font: DISP, lines: ['«ВРАГИ НА ХОЛМЕ»'], who: 'ЧИТАЕМ ПО КРУГУ' }) }) }
    ]),
    steps: [
      { panel: 'a', len: 1.2, cap: { k: 'Спарта · около V века до н. э.', t: 'Спартанцы наматывали узкую ленту на палку-<b>скиталу</b> и писали вдоль неё.' } },
      { panel: 'b', len: 1.2, talk: ['sp'], build(tl, p, K) { K.pop(tl, p.q1('#b-sp'), .45); K.rot(tl, p.q('.ch-sp .head'), 0, 140, -6, 3, .4, .7); } },
      {
        panel: 'c', len: 1.8, cap: { t: 'Прочтёт только тот, у кого палка такой же толщины.', n: 'О скитале рассказывает Плутарх. Это шифр перестановки: буквы те же, меняется порядок.' },
        build(tl, p, K) {
          p.q('.sc-l').forEach((el, i) => {
            const col = Math.floor(i / 3), row = i % 3;
            tl.to(el, { attr: { x: 1100 + col * 90, y: 736 + row * 44, 'font-size': 32 }, duration: .6, ease: 'power2.inOut' }, .5 + i * .04);
          });
          tl.to(p.q('.sc-strip'), { opacity: 0, duration: .5 }, .6);
          tl.to(p.q('.sc-bands'), { opacity: 1, duration: .4 }, 1.0);
          tl.to(p.q('.sc-read'), { opacity: 1, duration: .3 }, 1.35);
          K.pop(tl, p.q1('#b-read'), 1.4);
        }
      }
    ],
    speech: [['Б', 'В Древней Спарте ленту наматывали на палку-скиталу и писали вдоль неё. Сними ленту — и увидишь кашу из букв.']]
  });

  // ---------- 2. ГАЛЛИЯ: ЛАГЕРЬ
  pages.push({
    id: 'camp', num: 2, place: 'ГАЛЛИЯ', year: -58, head: 'глава 2 · письмо', chars: ['cz', 'ms'],
    world() {
      const cz = P.caesar({ id: 'cz', x: 420, y: 500, s: .72, mouth: 'neutral', brows: 'worried', look: [6, 0] });
      const ms = P.messenger({ id: 'ms', x: 880, y: 560, s: .66, mouth: 'worried', brows: 'worried', look: [-6, 0], arms: { R: { a1: 25, a2: 95, hand: 'fist', sleeve: C.red, hold: heldScroll } } });
      const t1 = A.tent(150, 760, .85), t2 = A.tent(700, 700, .55), aq = A.aquila(1060, 860, .9);
      const b1 = A.bush(1290, 840, 1), b2 = A.bush(1470, 800, .9), b3 = A.bush(1150, 900, .7);
      return J({
        col: `<rect ${A.BG} fill="#fff"/><circle cx="1260" cy="250" r="170" fill="${C.red}"/>`,
        tone: `<rect x="-1200" y="-1200" width="4000" height="1700" fill="url(#gSkyDots)" opacity=".5"/>`,
        ink: `${A.cloud(300, 120, .9)}${A.cloud(860, 80, .6)}${A.mountains(650, '#cfcfcf', 2, 230)}
          <rect x="-1200" y="760" width="4000" height="1400" fill="url(#gFadeUp)"/>
          <path d="M960,1100 C990,960 1100,860 1360,790 L1420,800 C1170,880 1090,980 1100,1100Z" fill="#fff"/>`
      }, t2, t1, aq, { ink: A.palisade(-200, 600, 820, 110) + A.tree(1360, 800, 1) + A.tree(1540, 760, .85) + A.tree(1650, 820, 1.1) + A.tree(1230, 790, .7) }, b3, b1, b2, cz, ms);
    },
    panels: lay('wideTop3', [
      { crop: [800, 540, 1600], extra: () => ({ top: A.sfx({ id: 'sfx-shurh', x: 1360, y: 640, text: 'ШУРХ…', fs: 70, rot: -10, fill: '#fff' }) }) },
      { crop: [430, 470, 500], extra: () => ({ top: A.bubble({ id: 'b-cz', x: 196, y: 90, w: 470, fs: 31, lines: ['Если гонца', 'перехватят, они', 'прочтут *всё!*'], tail: [380, 300], who: 'ЦЕЗАРЬ' }) }) },
      { crop: [860, 520, 500], extra: () => ({ top: A.bubble({ id: 'b-ms', type: 'whisper', x: 630, y: 90, w: 460, fs: 31, lines: ['Поскачу лесом.', 'Авось не заметят…'], tail: [850, 330], who: 'ГОНЕЦ' }) }) }
    ]),
    steps: [
      { panel: 'a', len: 1.25, cap: { k: 'Галлия · 58 год до н. э.', t: 'Юлий Цезарь воюет в Галлии. Письма везут гонцы, а в лесах ждут засады.' }, build(tl, p, K) { K.pop(tl, p.q1('#sfx-shurh'), .55); } },
      { panel: 'b', len: 1.2, talk: ['cz'], build(tl, p, K) { K.pop(tl, p.q1('#b-cz'), .45); K.rot(tl, p.q('.ch-cz .head'), 0, 140, 5, -3, .4, .6); } },
      { panel: 'c', len: 1.2, talk: ['ms'], build(tl, p, K) { K.pop(tl, p.q1('#b-ms'), .45); K.shift(tl, p.q('.ch-ms .feat'), 0, 0, -8, 0, .4, .5); } }
    ],
    init(p) { p.q('.blink').forEach((e, i) => gsap.to(e, { scaleY: .1, transformOrigin: '50% 50%', duration: .08, yoyo: true, repeat: -1, repeatDelay: 2.2 + i * .7, ease: 'none' })); },
    speech: [['А', 'Пятьдесят восьмой год до нашей эры. Гонцы Юлия Цезаря скачут через Галлию, а в лесах — засады. Перехватят письмо — враг узнает план.']]
  });

  // ---------- 3. ИДЕЯ: СДВИГ НА ТРИ
  pages.push({
    id: 'idea', num: 3, place: 'ШАТЁР ЦЕЗАРЯ', year: -58, head: 'глава 3 · сдвиг на три', chars: ['cz2'],
    world() {
      const cz = P.caesar({ id: 'cz2', x: 380, y: 520, s: .95, mouth: 'smile', brows: 'up', look: [8, -6], arms: { R: { a1: -160, a2: 20, hand: 'point', sleeve: '#fbfaf6' } } });
      let row1 = '', row2 = '', arrows = '', rays = '', folds = '';
      for (let i = 0; i < 8; i++) row1 += `<text x="${985 + i * 66}" y="455" font-family="${MONO}" font-weight="700" font-size="44" text-anchor="middle" fill="#111">${LAT[i]}</text>`;
      for (let i = 0; i < 40; i++) row2 += `<text x="${985 + i * 66}" y="575" font-family="${MONO}" font-weight="700" font-size="44" text-anchor="middle" fill="${C.red}">${LAT[i % 26]}</text>`;
      for (let i = 0; i < 8; i++) arrows += `<path d="M${985 + i * 66},472 V528 M${975 + i * 66},516 L${985 + i * 66},530 L${995 + i * 66},516" stroke="#111" stroke-width="3" fill="none"/>`;
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; rays += `<path d="M${(860 + Math.cos(a) * 92).toFixed(1)},${(150 + Math.sin(a) * 92).toFixed(1)} L${(860 + Math.cos(a) * 150).toFixed(1)},${(150 + Math.sin(a) * 150).toFixed(1)}" stroke="#111" stroke-width="10" stroke-linecap="round"/>`; }
      for (let i = 0; i < 22; i++) folds += `<path d="M${-1200 + i * 200},-1200 C${-1160 + i * 200},0 ${-1220 + i * 200},400 ${-1180 + i * 200},1300" stroke="#666" stroke-width="60" fill="none"/>`;
      return J({
        defs: `<clipPath id="i-win"><rect x="945" y="515" width="540" height="80"/></clipPath>`,
        col: `<rect ${A.BG} fill="${C.red}"/><circle class="i-glow" cx="860" cy="150" r="130" fill="${C.yellow}" opacity="0"/>
          <rect x="930" y="360" width="590" height="300" fill="${C.cream}"/><rect x="1540" y="120" width="250" height="230" fill="${C.cream}"/>`,
        ink: `${folds}<path d="M-1200,-260 L800,-80 L2800,-260 V-1200 H-1200Z" fill="#222"/>
          <rect x="-1200" y="900" width="4000" height="1300" fill="url(#gWood)"/>
          <rect x="930" y="360" width="590" height="300" fill="#fff" stroke="#111" stroke-width="12"/>
          <rect x="900" y="660" width="650" height="30" fill="url(#gCylH)" stroke="#111" stroke-width="4"/>
          <rect x="1540" y="120" width="250" height="230" fill="#fff" stroke="#111" stroke-width="6"/>
          <path d="M1580,300 C1570,230 1610,170 1670,180 C1730,150 1770,210 1750,270 C1730,320 1650,330 1580,300Z" fill="none" stroke="#111" stroke-width="5"/>`
      }, cz, {
        ink: `<g class="i-bulb"><circle cx="860" cy="150" r="62" fill="#e6e6e6" stroke="#111" stroke-width="6"/><rect x="835" y="205" width="50" height="40" fill="#333"/>
          <path d="M840,190 L840,160 L850,145 L860,165 L870,145 L880,160 L880,190" stroke="#111" stroke-width="5" fill="none"/><g class="i-rays" opacity="0">${rays}</g></g>`,
        top: `${row1}<g class="i-arrows" opacity="0">${arrows}</g><g clip-path="url(#i-win)"><g class="i-row2">${row2}</g></g>
          <text class="i-form" x="1225" y="640" font-family="${MONO}" font-size="26" text-anchor="middle" fill="#111">y = (x + 0) mod 26</text>
          <text x="1615" y="250" font-family="${DISP}" font-weight="700" font-size="20" fill="${C.red}">✕ ✕</text>`
      });
    },
    panels: lay('bigTop', [
      { crop: [700, 420, 1100], extra: () => ({ top: A.sfx({ id: 'sfx-ding', x: 1110, y: 130, text: 'ДЗЫНЬ!', fs: 66, rot: 8, burst: 112 }) + A.bubble({ id: 'b-idea', type: 'shout', x: 80, y: 40, w: 560, fs: 36, lines: ['Сдвинем каждую', 'букву *на три!*'], tail: [330, 330], who: 'ЦЕЗАРЬ' }) }) },
      { crop: [1225, 520, 780], extra: () => ({}) }
    ]),
    steps: [
      { panel: 'a', len: 1.35, talk: ['cz2'], cap: { k: 'Шатёр Цезаря', t: 'Цезарь придумал, как спрятать смысл письма.', n: '* Лампочку изобретут только через 1900 лет. Идеи приходили в голову и без неё.' },
        build(tl, p, K) {
          K.rot(tl, p.q('.ch-cz2 .armR'), 186, 256, 120, 0, .35, .45, 'back.out(1.6)');
          tl.to(p.q('.i-glow'), { opacity: .9, duration: .15 }, .7);
          tl.to(p.q('.i-rays'), { opacity: 1, duration: .15 }, .7);
          K.pop(tl, p.q1('#sfx-ding'), .72);
          K.pop(tl, p.q1('#b-idea'), .9);
        } },
      { panel: 'b', len: 1.5, widget: 'idea', cap: { t: '<b>A → D, B → E</b>. Метод простой, ключ один: число 3.' },
        build(tl, p) {
          const st = { k: 0 };
          p.render = k => { gsap.set(p.q('.i-row2'), { x: -k * 66 }); p.q('.i-form').forEach(e => e.textContent = `y = (x + ${Math.round(k)}) mod 26`); };
          tl.to(p.q('.i-arrows'), { opacity: 1, duration: .2 }, .4);
          tl.to(st, { k: 3, duration: .8, ease: 'steps(3)', onUpdate: () => p.render(st.k) }, .55);
        } }
    ],
    init(p) {
      const sh = document.getElementById('i-shift'), w = document.getElementById('i-word'), o = document.getElementById('i-out'), v = document.getElementById('i-shiftv');
      const up = () => { const k = +sh.value; v.textContent = k; o.textContent = shiftText(w.value, k); p.render && p.render(k); window.SFX && SFX.tick(); };
      sh.addEventListener('input', up); w.addEventListener('input', up);
    },
    speech: [['Б', 'Цезарь сдвинул каждую букву на три позиции: A стала D, B — E. Ключ — всего одно число.']]
  });

  // ---------- 4. СВИТОК
  pages.push({
    id: 'scroll', num: 4, place: 'ШАТЁР ЦЕЗАРЯ', year: -58, head: 'глава 4 · DWWDFN', chars: ['ms2', 'cz3'],
    world() {
      const ms = P.messenger({ id: 'ms2', x: 300, y: 830, s: .72, mouth: 'worried', brows: 'worried', sweat: true, look: [8, -6] });
      const cz = P.caesar({ id: 'cz3', x: 1300, y: 830, s: .72, mouth: 'smirk', look: [-8, -6] });
      let letters = '';
      'DWWDFN'.split('').forEach((ch, i) => letters += `<text class="s-l" x="${600 + i * 80}" y="430" font-family="Cinzel, serif" font-size="110" font-weight="700" text-anchor="middle" fill="#111">${ch}</text>`);
      return J({
        defs: `<clipPath id="s-clip"><rect class="s-cr" x="800" y="180" width="0" height="420"/></clipPath>`,
        col: `<rect ${A.BG} fill="#fff"/><g clip-path="url(#s-clip)"><rect x="440" y="190" width="720" height="400" fill="${C.cream}"/></g>`,
        ink: `<rect ${A.BG} fill="#7a7a7a"/>${Array.from({ length: 16 }, (_, i) => `<path d="M-1200,${-300 + i * 110} H2800" stroke="#222" stroke-width="6"/>`).join('')}
          <g clip-path="url(#s-clip)"><rect x="440" y="190" width="720" height="400" fill="#fff"/><path d="M470,500 H1130" stroke="#bbb" stroke-width="3"/></g>
          <g class="s-rl"><rect x="770" y="165" width="44" height="450" rx="18" fill="url(#gCylV)" stroke="#111" stroke-width="4"/></g>
          <g class="s-rr"><rect x="786" y="165" width="44" height="450" rx="18" fill="url(#gCylV)" stroke="#111" stroke-width="4"/></g>
          <path d="M1400,190 L1480,60" stroke="#111" stroke-width="6"/><path d="M1480,60 C1520,0 1560,20 1540,70 C1520,90 1500,80 1480,60Z" fill="#ddd" stroke="#111" stroke-width="4"/><rect x="1380" y="190" width="50" height="40" fill="#222"/>`,
        top: `<g clip-path="url(#s-clip)">${letters}<g class="s-seal"><circle cx="1050" cy="530" r="44" fill="${C.red}" stroke="#111" stroke-width="4"/>
          <text x="1050" y="539" font-family="Cinzel, serif" font-size="24" font-weight="700" text-anchor="middle" fill="#111">SPQR</text></g></g>`
      }, candle(170, 480, 1), ms, cz);
    },
    panels: lay('wideTop3', [
      { crop: [800, 380, 1050] },
      { crop: [300, 800, 520], extra: () => ({ top: A.bubble({ id: 'b-ms2', x: 70, y: 450, w: 460, fs: 32, lines: ['Это что,', 'имя *варвара?*'], tail: [290, 640], who: 'ГОНЕЦ' }) }) },
      { crop: [1300, 800, 520], extra: () => ({ top: A.bubble({ id: 'b-cz3', x: 1060, y: 450, w: 480, fs: 32, lines: ['Это *ATTACK.*', 'Атакуем на рассвете.'], tail: [1300, 640], who: 'ЦЕЗАРЬ' }) }) }
    ]),
    steps: [
      { panel: 'a', len: 1.4, cap: { k: 'Свиток уходит к легату', t: 'Слово ATTACK превращается в <b>DWWDFN</b>: A→D, T→W, C→F, K→N.' },
        build(tl, p, K) {
          tl.to(p.q('.s-cr'), { attr: { x: 440, width: 720 }, duration: .6, ease: 'power2.inOut' }, .3);
          tl.to(p.q('.s-rl'), { x: -350, duration: .6, ease: 'power2.inOut' }, .3);
          tl.to(p.q('.s-rr'), { x: 344, duration: .6, ease: 'power2.inOut' }, .3);
          tl.from(p.q('.s-l'), { y: -40, opacity: 0, duration: .22, stagger: .06, ease: 'back.out(3)' }, .8);
          tl.from(p.q('.s-seal'), { scale: 2.5, opacity: 0, svgOrigin: '1050 530', duration: .2, ease: 'power3.in' }, 1.2);
        } },
      { panel: 'b', len: 1.15, talk: ['ms2'], build(tl, p, K) { K.pop(tl, p.q1('#b-ms2'), .45); K.rot(tl, p.q('.ch-ms2 .head'), 0, 140, 0, -7, .4, .5); } },
      { panel: 'c', len: 1.15, talk: ['cz3'], cap: { t: '* Цезарь писал по-латыни. Мы перевели слово на английский, чтобы сдвиг было видно.' }, build(tl, p, K) { K.pop(tl, p.q1('#b-cz3'), .45); K.shift(tl, p.q('.ch-cz3 .feat'), 0, 0, -6, 0, .4, .5); } }
    ],
    speech: [['А', 'Слово ATTACK превратилось в DWWDFN. Гонец решил, что это имя варвара…']]
  });

  // ---------- 5. ЗАСАДА
  pages.push({
    id: 'enemy', num: 5, place: 'ЛЕС У ДОРОГИ', year: -58, head: 'глава 5 · засада', chars: ['ms3', 'ga'],
    world() {
      const ms = P.messenger({ id: 'ms3', x: 330, y: 560, s: .62, mouth: 'shout', brows: 'worried', sweat: true, look: [-8, -4] });
      const ga = P.gaul({ id: 'ga', x: 2100, y: 400, s: 1, mouth: 'worried', brows: 'worried', sweat: true, look: [0, 10], arms: { L: { a1: 172, a2: -45, hand: 'open', sleeve: '#e8e3da' }, R: { a1: 30, a2: 92, hand: 'fist', sleeve: '#e8e3da', hold: heldScroll } } });
      const grab = { // рука галла из куста
        col: `<path d="M1000,560 C900,500 800,430 700,390" stroke="#e8e3da" stroke-width="70" stroke-linecap="round" fill="none"/>`,
        ink: `<path d="M1000,560 C900,500 800,430 700,390" stroke="#111" stroke-width="82" stroke-linecap="round" fill="none"/><path d="M1000,560 C900,500 800,430 700,390" stroke="#8a8a8a" stroke-width="70" stroke-linecap="round" fill="none"/>`
      };
      let L = '';
      'DWWDFN'.split('').forEach((ch, i) => L += `<text class="e-l" x="${1910 + i * 66}" y="${400 + 375}" font-family="Cinzel, serif" font-size="56" font-weight="700" text-anchor="middle" fill="#111">${ch}</text>`);
      return J({
        col: `<rect ${A.BG} fill="${C.red}"/>`,
        ink: `<rect x="-1200" y="-1200" width="4000" height="1900" fill="url(#gFadeDown)"/>
          ${A.tree(80, 860, 1.5)}${A.tree(560, 900, 1.1)}${A.tree(1150, 880, 1.4)}${A.tree(1700, 1000, 1.7)}${A.tree(2500, 1000, 1.6)}
          <g class="e-speed" opacity="0">${A.speedlines(2100, 420, 380, 1500, 70, '#111')}</g>
          <path d="M-1200,860 C-300,820 300,850 1200,840 C1800,830 2400,860 2800,850 V2200 H-1200Z" fill="#555"/>`
      }, ms, A.bush(1050, 610, 1.3, true), grab, scrollProp(560, 260, 1.2, -35), ga, {
        col: `<path d="M630,195 l30,-30 M600,190 l-10,-40 M660,240 l40,0" stroke="#fff" stroke-width="8" stroke-linecap="round"/>`,
        top: `<g transform="translate(700 390) rotate(-120) scale(1.4)"><path d="${'M-22,0 C-26,20 -28,40 -24,52 L-26,92 C-26,100 -16,100 -16,92 L-14,58 L-10,104 C-10,112 0,112 0,104 L0,58 L6,104 C6,112 16,112 16,96 L14,56 L20,90 C20,98 30,96 28,86 L24,44 C26,26 24,10 22,0 Z'}" fill="${C.skin}" stroke="#111" stroke-width="4.5"/></g>
          ${L}<g class="e-q"><text x="1860" y="190" font-family="${DISP}" font-weight="900" font-size="90" fill="#111">?</text>
          <text x="1790" y="300" font-family="${DISP}" font-weight="900" font-size="60" fill="#fff" stroke="#111" stroke-width="3">?</text>
          <text x="2330" y="170" font-family="${DISP}" font-weight="900" font-size="74" fill="#111">?</text></g>`
      });
    },
    panels: lay('topBig', [
      { crop: [640, 450, 1250], extra: () => ({ top: A.sfx({ id: 'sfx-grab', x: 980, y: 230, text: 'ХВАТЬ!', fs: 96, rot: -8, burst: 170 }) }) },
      { crop: [2100, 500, 1000], extra: () => ({ top: A.bubble({ id: 'e-b', type: 'think', x: 2190, y: 100, w: 470, fs: 36, lines: ['Набор букв…', 'Наверное, *проклятие?*'], tail: [2190, 260], who: 'ГАЛЛ ДУМАЕТ' }) + A.bubble({ id: 'e-b2', type: 'shout', x: 2190, y: 100, w: 470, fs: 38, lines: ['*ATTACK?!*', 'Бегу к вождю!'], tail: [2200, 300], who: 'ГАЛЛ', fill: C.yellow }) }) }
    ]),
    steps: [
      { panel: 'a', len: 1.25, talk: ['ms3'], cap: { k: 'Лес у дороги', t: 'Галлы устроили засаду и перехватили гонца.' }, build(tl, p, K) { K.pop(tl, p.q1('#sfx-grab'), .5); } },
      { panel: 'b', len: 1.6, talk: [], widget: 'hold', cap: { t: 'Галл держит свиток и ничего не понимает: метода он не знает, а по-латыни читает не каждый воин.', n: 'Светоний: Цезарь «заменял первую букву четвёртой, то есть A на D».' },
        build(tl, p, K) {
          K.pop(tl, p.q1('#e-b'), .5);
          const sc = { a: 0 };
          tl.to(sc, { a: 1, duration: 1.0, ease: 'none', onUpdate: () => { const v = Math.sin(sc.a * Math.PI * 8) * 12; p.q('.ch-ga .foreL').forEach(e => e.setAttribute('transform', `rotate(${v.toFixed(1)} -153 18)`)); } }, .3);
        } }
    ],
    init(p) {
      gsap.set(p.q('#e-b2'), { opacity: 0 });
      gsap.to(p.q('.e-q text'), { y: -14, duration: .6, yoyo: true, repeat: -1, stagger: .2, ease: 'sine.inOut' });
      const ring = document.getElementById('holdRing'), btn = document.getElementById('holdBtn'), Ls = p.q('.e-l');
      const len = 2 * Math.PI * 54; ring.style.strokeDasharray = len; ring.style.strokeDashoffset = len;
      const st = { v: 0 }; let done = false;
      const render = () => {
        ring.style.strokeDashoffset = len * (1 - st.v);
        const k = Math.min(3, Math.floor(st.v * 3.999));
        const word = shiftText('DWWDFN', -k);
        Ls.forEach((t, i) => t.textContent = word[i]);
        if (!done && st.v >= 1) {
          done = true; window.SFX && SFX.win();
          gsap.to(p.q('#e-b'), { opacity: 0, duration: .2 });
          const b2 = p.q1('#e-b2'), o2 = b2.dataset.tail;
          gsap.fromTo(b2, { opacity: 0, scale: .3, rotation: -10, svgOrigin: o2 }, { opacity: 1, scale: 1, rotation: 0, svgOrigin: o2, duration: .4, ease: 'back.out(2.2)' });
          gsap.to(p.q('.e-speed'), { opacity: 1, duration: .3 });
          gsap.to(p.q('.e-q'), { opacity: 0, duration: .2 });
          p.q('.ch-ga .m0').forEach(e => e.setAttribute('opacity', 0)); p.q('.ch-ga .m1').forEach(e => e.setAttribute('opacity', 1));
          gsap.fromTo(Ls, { y: -12 }, { y: 0, duration: .4, stagger: .05, ease: 'bounce.out' });
          btn.classList.add('ok'); btn.querySelector('span').innerHTML = 'ATTACK';
        }
      };
      let tw;
      const start = e => { e.preventDefault(); if (done) return; tw && tw.kill(); window.SFX && SFX.tick(); tw = gsap.to(st, { v: 1, duration: 1.6 * (1 - st.v), ease: 'none', onUpdate: render }); };
      const stop = () => { if (done) return; tw && tw.kill(); tw = gsap.to(st, { v: 0, duration: .5 * st.v, ease: 'power1.out', onUpdate: render }); };
      btn.addEventListener('pointerdown', start);
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => btn.addEventListener(ev, stop));
      btn.addEventListener('keydown', e => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) start(e); });
      btn.addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Enter') stop(); });
    },
    speech: [['А', '…а враг — что это проклятие. Для того, кто не знает метода, такой шифр — каменная стена.']]
  });

  // ---------- 6. БАГДАД
  const KINDI_PLAIN = 'ВОЙСКО ОБОЙДЁТ ХОЛМ С ЗАПАДА И ОКРУЖИТ ЛАГЕРЬ ВРАГА. ОТРЯД КОННИЦЫ ПОЙДЁТ ВДОЛЬ РЕКИ И ПЕРЕКРОЕТ БРОД. ОГОНЬ ПО СИГНАЛУ С ХОЛМА';
  const KINDI_CIPHER = shiftText(KINDI_PLAIN, 3);
  pages.push({
    id: 'kindi', num: 6, place: 'БАГДАД', year: 850, yearText: 'IX век', head: 'глава 6 · частотный анализ', chars: ['ki'],
    world() {
      const ki = P.kindi({ id: 'ki', x: 560, y: 450, s: .88, mouth: 'smile', brows: 'up', look: [8, 8], arms: { R: { a1: -20, a2: 70, hand: 'fist', sleeve: '#fbfaf6' } } });
      const arch = 'M840,800 V380 C840,170 960,110 1020,110 C1080,110 1200,170 1200,380 V800Z';
      let carpet = '', stars = '', city = '', tally = '';
      for (let i = 0; i < 16; i++) carpet += `<path d="M${-200 + i * 130},1040 l50,-36 l50,36 l-50,36Z" fill="${C.yellow}"/>`;
      for (let i = 0; i < 40; i++) stars += `<circle cx="${1800 + (i * 137) % 1000}" cy="${60 + (i * 89) % 380}" r="${2 + i % 3}" fill="#fff"/>`;
      [[1900, 700, 120, 120], [2120, 640, 170, 190], [2400, 700, 130, 120], [2620, 680, 100, 100]].forEach(([x, y, r, h]) => city += A.dome(x, y, r, h).replace('fill="#9a9a9a"', 'fill="#e2e2e2"') + `<rect x="${x - r}" y="${y}" width="${r * 2}" height="${800 - y}" fill="#d0d0d0" stroke="#111" stroke-width="4"/>`);
      [[2010, 220], [2300, 160], [2530, 260]].forEach(([x, h]) => city += `<rect x="${x - 18}" y="${700 - h - 300}" width="36" height="${h + 300}" fill="#c8c8c8" stroke="#111" stroke-width="4"/><path d="M${x - 26},${400 - h} H${x + 26} L${x},${340 - h}Z" fill="#555" stroke="#111" stroke-width="4"/>`);
      ['О', 'С', 'Р', 'Ж'].forEach((ch, i) => tally += `<text x="1150" y="${540 + i * 70}" font-family="${MONO}" font-weight="700" font-size="40" fill="#111">${ch} —</text><rect x="1250" y="${510 + i * 70}" width="${[220, 160, 110, 80][i]}" height="36" fill="${i ? '#111' : C.red}"/>`);
      return J({
        col: `<rect ${A.BG} fill="#fff"/><path d="${arch}" fill="${C.red}"/><circle cx="1020" cy="250" r="70" fill="#fff"/>
          <rect x="-1200" y="980" width="2800" height="1200" fill="${C.red}"/>${carpet}
          <rect x="1700" y="-1200" width="1100" height="2000" fill="${C.red}"/><circle cx="2560" cy="200" r="90" fill="#fff"/>
          <rect x="1090" y="440" width="420" height="380" fill="${C.cream}"/>
          <path d="M700,0 V110" stroke="#111" stroke-width="4"/><path d="M670,110 H730 L716,190 H684Z" fill="${C.yellow}"/><circle cx="700" cy="160" r="70" fill="${C.yellow}" opacity=".3"/>`,
        ink: `<rect x="-1200" y="-1200" width="2900" height="2200" fill="#a8a8a8"/>${Array.from({ length: 11 }, (_, i) => `<path d="M-1200,${i * 100} H1700" stroke="#111" stroke-width="3"/>`).join('')}
          ${A.shelf(-240, 160, 420, 700, 5)}<path d="${arch}" fill="#fff"/><circle cx="1020" cy="250" r="70" fill="#fff"/>
          <path d="M1020,180 A70,70 0 1,0 1020,320 A54,54 0 1,1 1020,180Z" fill="#9a9a9a"/><path d="${arch}" fill="none" stroke="#111" stroke-width="22"/>
          <path d="M670,110 H730 L716,190 H684Z" fill="#999" stroke="#111" stroke-width="4"/>
          <rect x="-1200" y="980" width="2900" height="1200" fill="#777"/>
          <rect x="740" y="960" width="900" height="34" fill="#111"/>
          <rect x="1090" y="440" width="420" height="380" fill="#fff" stroke="#111" stroke-width="6"/>
          <path d="M1700,-1200 H2800 V800 H1700Z" fill="#6a6a6a"/><circle cx="2560" cy="200" r="90" fill="#fff"/><circle cx="2600" cy="180" r="80" fill="#6a6a6a"/>
          ${city}${A.palm(1820, 800, .9)}${A.palm(2720, 800, 1)}
          <rect x="1700" y="790" width="1100" height="400" fill="#222"/>`,
        top: `${stars}<text x="1300" y="500" font-family="${MONO}" font-size="30" text-anchor="middle" fill="#111">считаю буквы:</text>${tally}`
      }, ki, {
        top: `<g class="k-stamp"><rect x="1900" y="500" width="800" height="150" fill="#111" transform="rotate(-6 2300 575)"/>
          <text x="2300" y="600" font-family="${DISP}" font-weight="900" font-size="70" text-anchor="middle" fill="#fff" transform="rotate(-6 2300 575)">900 ЛЕТ СПУСТЯ</text></g>`
      });
    },
    panels: lay('wideTop3', [
      { crop: [2250, 420, 1050] },
      { crop: [600, 560, 600], extra: () => ({ top: A.bubble({ id: 'b-ki', x: 330, y: 40, w: 520, fs: 30, lines: ['*Самая частая* буква', 'шифровки — самая', 'частая буква *языка!*'], tail: [560, 300], who: 'АЛЬ-КИНДИ' }) }) },
      { crop: [1300, 640, 520] }
    ]),
    steps: [
      { panel: 'a', len: 1.2, cap: { k: 'Багдад · IX век', t: 'Прошло 900 лет. В багдадском «Доме мудрости» собирают книги со всего мира.' }, build(tl, p) { tl.fromTo(p.q('.k-stamp'), { scale: 2, opacity: 0, svgOrigin: '2300 575' }, { scale: 1, opacity: 1, svgOrigin: '2300 575', duration: .25, ease: 'power3.in' }, .5); } },
      { panel: 'b', len: 1.2, talk: ['ki'], cap: { t: 'Учёный <b>аль-Кинди</b> пишет первый известный трактат о взломе шифров.' }, build(tl, p, K) { K.pop(tl, p.q1('#b-ki'), .45); K.rot(tl, p.q('.ch-ki .head'), 0, 140, -4, 4, .4, .6); } },
      { panel: 'c', len: 1.4, widget: 'kindi', cap: { t: 'В любом языке одни буквы встречаются чаще других: в арабском алиф, в английском E, в русском О.', n: 'Это частотный анализ: статистика против тайнописи.' } }
    ],
    init(p) {
      const cnt = {};
      for (const ch of KINDI_CIPHER) if (RUS.includes(ch)) cnt[ch] = (cnt[ch] || 0) + 1;
      const top = Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 12), max = top[0][1];
      const bars = document.getElementById('k-bars'), txt = document.getElementById('k-text'), msg = document.getElementById('k-msg');
      txt.textContent = KINDI_CIPHER;
      bars.innerHTML = top.map(([ch, n]) => `<button class="k-bar" data-ch="${ch}" style="--h:${n / max}"><i></i><b>${ch}</b><small>${n}</small></button>`).join('');
      bars.addEventListener('click', e => {
        const b = e.target.closest('.k-bar'); if (!b) return;
        bars.querySelectorAll('.k-bar').forEach(x => x.classList.remove('on')); b.classList.add('on');
        const k = (RUS.indexOf(b.dataset.ch) - RUS.indexOf('О') + 33) % 33;
        txt.textContent = shiftText(KINDI_CIPHER, -k);
        const ok = k === 3;
        msg.innerHTML = ok ? `<b>Ключ найден: 3.</b> Буква ${b.dataset.ch} оказалась буквой О, и весь текст стал читаемым.` : `Если ${b.dataset.ch} — это О, то ключ ${k}. Текст не читается. Попробуй столбик выше.`;
        txt.classList.toggle('ok', ok); window.SFX && (ok ? SFX.win() : SFX.tick());
      });
    },
    speech: [['Б', 'Стена простояла девять веков. Багдадский учёный аль-Кинди заметил: в любом языке одни буквы встречаются чаще других. В русском это «о». Посчитай буквы в шифровке — и самая частая выдаст ключ.']]
  });

  // ---------- 7. ПЕРЕБОР
  pages.push({
    id: 'brute', num: 7, place: 'ЛАГЕРЬ ГАЛЛОВ', year: -58, yearText: 'а можно проще', head: 'глава 7 · перебор', chars: ['ga2'],
    world() {
      const ga = P.gaul({ id: 'ga2', x: 520, y: 470, s: .9, mouth: 'smirk', brows: 'angry', look: [12, 6], arms: { R: { a1: -10, a2: 60, hand: 'fist', sleeve: '#e8e3da' } } });
      let tally = '', list = '';
      for (let g = 0; g < 5; g++) { const x0 = 900 + g * 110; for (let i = 0; i < 4; i++) tally += `<path d="M${x0 + i * 18},150 l4,90" stroke="#fff" stroke-width="7" stroke-linecap="round"/>`; tally += `<path d="M${x0 - 10},230 L${x0 + 70},160" stroke="#fff" stroke-width="7" stroke-linecap="round"/>`; }
      for (let k = 1; k <= 6; k++) list += `<text x="1780" y="${1180 + k * 70}" font-family="${MONO}" font-weight="700" font-size="50" fill="${k === 3 ? C.red : '#111'}">${k}  ${shiftText('DWWDFN', -k)}</text>`;
      return J({
        col: `<rect ${A.BG} fill="${C.red}"/><rect x="1700" y="1150" width="700" height="560" fill="${C.cream}"/>`,
        ink: `<rect x="-1200" y="-1200" width="2850" height="2400" fill="#a8a8a8"/>
          ${Array.from({ length: 12 }, (_, r) => Array.from({ length: 12 }, (_, c) => `<rect x="${-300 + c * 180 + (r % 2) * 90}" y="${-200 + r * 100}" width="176" height="96" fill="none" stroke="#111" stroke-width="3"/>`).join('')).join('')}
          <rect x="300" y="900" width="1150" height="60" fill="#222" stroke="#111" stroke-width="4"/>
          <rect x="1080" y="840" width="160" height="34" rx="16" fill="url(#gCylH)" stroke="#111" stroke-width="4"/><rect x="1100" y="810" width="140" height="34" rx="16" fill="url(#gCylH)" stroke="#111" stroke-width="4"/>
          <rect x="1650" y="1100" width="1100" height="700" fill="url(#gWood)"/><rect x="1700" y="1150" width="700" height="560" fill="#fff" stroke="#111" stroke-width="6"/>`,
        top: `${tally}${list}<ellipse class="b-circle" cx="1960" cy="1380" rx="230" ry="50" fill="none" stroke="${C.red}" stroke-width="8" opacity="0"/>`
      }, candle(980, 910, 1, 'b-flame'), ga);
    },
    panels: lay('bigTop', [
      { crop: [760, 470, 1150], extra: () => ({ top: A.bubble({ id: 'b-ga2', x: 520, y: 40, w: 560, fs: 38, lines: ['Всего *25* вариантов.', 'Проверю все за вечер.'], tail: [560, 300], who: 'ГАЛЛ' }) }) },
      { crop: [2050, 1430, 900], extra: () => ({ top: A.sfx({ id: 'sfx-found', x: 2320, y: 1280, text: 'НАШЁЛ!', fs: 80, rot: 10, burst: 140 }) }) }
    ]),
    steps: [
      { panel: 'a', len: 1.25, talk: ['ga2'], cap: { k: 'Тем же вечером', t: 'У шифра Цезаря всего 25 ключей.' }, build(tl, p, K) { K.pop(tl, p.q1('#b-ga2'), .45); } },
      { panel: 'b', len: 1.5, widget: 'brute', cap: { t: 'Перебор вручную займёт вечер, компьютер справится за микросекунду.' },
        build(tl, p, K) {
          const st = { i: 0 };
          tl.to(st, { i: 2, duration: .6, ease: 'none', onUpdate: () => p.setRow && p.setRow(st.i) }, .4);
          tl.to(p.q('.b-circle'), { opacity: 1, duration: .15 }, 1.0);
          K.pop(tl, p.q1('#sfx-found'), 1.05);
        } }
    ],
    init(p) {
      const ol = document.getElementById('b-list');
      for (let k = 1; k <= 25; k++) ol.insertAdjacentHTML('beforeend', `<li class="${k === 3 ? 'hit' : ''}"><span>${k}</span>${shiftText('DWWDFN', -k)}</li>`);
      p.setRow = i => { const n = Math.round(i); gsap.set(ol, { y: -n * 40 }); ol.querySelectorAll('li').forEach((li, j) => li.classList.toggle('cur', j === n)); };
      p.setRow(0);
      p.q('.b-flame').forEach(e => gsap.to(e, { scaleY: 1.2, scaleX: .85, transformOrigin: '50% 100%', duration: .17, yoyo: true, repeat: -1 }));
    },
    speech: [['А', 'А можно и проще: у шифра Цезаря всего двадцать пять ключей — их можно перебрать за вечер.']]
  });

  // ---------- 8. ВИЖЕНЕР
  pages.push({
    id: 'vigenere', num: 8, place: 'ИТАЛИЯ', year: 1553, head: 'глава 8 · ключ-слово', chars: ['be'], filter: 'engD',
    world() {
      const be = P.bellaso({ id: 'be', x: 450, y: 470, s: .92, mouth: 'smirk', look: [10, 0], arms: { R: { a1: -40, a2: -60, hand: 'point', sleeve: '#2a2a2a' } } });
      let grid = '', city = '', tiles = '';
      for (let y = 0; y < 13; y++) for (let x = 0; x < 9; x++) {
        const hl = x === 2 || y === 4;
        grid += `<text class="v-g" x="${1080 + x * 50}" y="${200 + y * 48}" font-family="${MONO}" font-size="32" text-anchor="middle" fill="${hl ? C.red : '#111'}" ${hl ? 'font-weight="700"' : ''}>${LAT[(x + y) % 26]}</text>`;
      }
      for (let i = 0; i < 26; i++) tiles += `<rect x="${-300 + i * 100}" y="${880 + (i % 2) * 60}" width="100" height="60" fill="#222"/>`;
      // город эпохи Возрождения (отдельный «план» справа)
      city += `<rect x="1700" y="-1200" width="1100" height="1900" fill="#fff"/>`;
      [[1820, 520, 90, 90], [2280, 470, 150, 170], [2620, 540, 80, 70]].forEach(([x, y, r, h]) => city += A.dome(x, y, r, h) + `<rect x="${x - r}" y="${y}" width="${r * 2}" height="${640 - y}" fill="#bbb" stroke="#111" stroke-width="4"/>`);
      city += `<rect x="2040" y="180" width="70" height="460" fill="#999" stroke="#111" stroke-width="4"/><path d="M2030,180 L2075,100 L2120,180Z" fill="#666" stroke="#111" stroke-width="4"/>`;
      for (let i = 0; i < 9; i++) city += `<rect x="${1720 + i * 120}" y="${560 + (i % 3) * 20}" width="110" height="${100 - (i % 3) * 20}" fill="#ccc" stroke="#111" stroke-width="3"/><path d="M${1715 + i * 120},${560 + (i % 3) * 20} L${1775 + i * 120},${520 + (i % 3) * 20} L${1835 + i * 120},${560 + (i % 3) * 20}Z" fill="#888" stroke="#111" stroke-width="3"/>`;
      city += `<rect x="1700" y="650" width="1100" height="200" fill="#777"/><path d="M1760,720 C1900,700 2100,740 2300,710 M1800,780 C2000,760 2200,800 2400,770" stroke="#fff" stroke-width="5" fill="none"/>
        <path d="M2350,700 C2380,730 2480,730 2520,700 L2510,712 C2470,736 2390,736 2360,712Z" fill="#111"/><path d="M2500,700 L2530,640" stroke="#111" stroke-width="5"/>`;
      return J({
        col: `<rect ${A.BG} fill="#fff"/><rect x="1040" y="150" width="480" height="650" fill="${C.cream}"/>
          <path d="M40,560 V300 C40,200 260,200 260,300 V560Z" fill="${C.red}"/><circle cx="2500" cy="200" r="110" fill="${C.red}"/>`,
        ink: `<rect x="-1200" y="-1200" width="2900" height="2400" fill="#c4c4c4"/>
          <path d="M40,560 V300 C40,200 260,200 260,300 V560Z" fill="#fff" stroke="#111" stroke-width="10"/><path d="M150,210 V560 M40,400 H260" stroke="#111" stroke-width="8"/>
          <rect x="1040" y="150" width="480" height="650" fill="#fff" stroke="#111" stroke-width="10"/>
          <rect x="-1200" y="860" width="2900" height="1300" fill="#ddd"/>${tiles}
          ${city}<circle cx="2500" cy="200" r="110" fill="#fff"/>`,
        top: `${grid}<rect x="1155" y="167" width="50" height="626" fill="none" stroke="${C.red}" stroke-width="4"/><rect x="1055" y="358" width="450" height="48" fill="none" stroke="${C.red}" stroke-width="4"/>`
      }, be);
    },
    panels: lay('wideTop3', [
      { crop: [2250, 420, 1080] },
      { crop: [470, 470, 520], extra: () => ({ top: A.bubble({ id: 'b-be', type: 'shout', x: 230, y: 40, w: 500, fs: 30, lines: ['Ключом будет', 'целое *слово!*'], tail: [470, 300], who: 'БЕЛАЗО' }) }) },
      { crop: [1280, 480, 560] }
    ]),
    steps: [
      { panel: 'a', len: 1.2, cap: { k: '1553 год · Италия', t: 'Эпоха Возрождения. Шифры нужны дипломатам, купцам и папскому двору.' } },
      { panel: 'b', len: 1.2, talk: ['be'], cap: { t: 'Джован Баттиста Белазо делает ключом слово. Позже шифр припишут французу Блезу де Виженеру.' },
        build(tl, p, K) { K.pop(tl, p.q1('#b-be'), .45); K.rot(tl, p.q('.ch-be .armR'), 186, 256, 40, 0, .35, .45, 'back.out(1.6)'); } },
      { panel: 'c', len: 1.4, widget: 'vig', cap: { t: 'Каждая буква сдвигается на своё число. Буква A превращается то в R, то в A: частоты смешиваются.', n: 'Шифр прозвали «неразгаданным». Фридрих Касиски вскрыл его в 1863 году.' },
        build(tl, p) { tl.from(p.q('.v-g'), { opacity: 0, duration: .15, stagger: { each: .0025, from: 'random' } }, .05); } }
    ],
    init() {
      const key = document.getElementById('v-key'), txt = document.getElementById('v-txt'), tab = document.getElementById('v-tab');
      const up = () => {
        const k = key.value.toUpperCase().replace(/[^A-Z]/g, '') || 'A';
        let j = 0; const rows = ['', '', ''];
        for (const ch of txt.value.toUpperCase()) {
          if (!LAT.includes(ch)) { const c = ch === ' ' ? '&nbsp;' : ch; rows[0] += `<span>${c}</span>`; rows[1] += '<span>&nbsp;</span>'; rows[2] += `<span>${c}</span>`; continue; }
          const s = LAT.indexOf(k[j % k.length]);
          rows[0] += `<span>${ch}</span>`; rows[1] += `<span class="sh">+${s}</span>`; rows[2] += `<span class="c">${LAT[(LAT.indexOf(ch) + s) % 26]}</span>`; j++;
        }
        tab.innerHTML = `<div class="vr">${rows[0]}</div><div class="vr sm">${rows[1]}</div><div class="vr">${rows[2]}</div>`;
        window.SFX && SFX.tick();
      };
      key.addEventListener('input', up); txt.addEventListener('input', up); up();
    },
    speech: [['Б', 'В эпоху Возрождения ключом сделали целое слово — и частотный анализ ослеп на триста лет.']]
  });

  // ---------- 9. ЭНИГМА
  const ROWS = ['QWERTZUIO', 'ASDFGHJK', 'PYXCVBNML'];
  pages.push({
    id: 'enigma', num: 9, place: 'БЛЕТЧЛИ-ПАРК', year: 1940, head: 'глава 9 · энигма', chars: ['tu'],
    world() {
      const tu = P.turing({ id: 'tu', x: 2200, y: 470, s: .9, mouth: 'neutral', look: [-10, 4] });
      let lamps = '', keys = '', lampsCol = '', lampsInk = '', rot = '', drums = '', manor = '';
      ROWS.forEach((r, ri) => [...r].forEach((ch, i) => {
        const x = 800 - (r.length - 1) * 31 + i * 62;
        lampsCol += `<circle cx="${x}" cy="${430 + ri * 58}" r="24" fill="#fff"/>`;
        lampsInk += `<circle cx="${x}" cy="${430 + ri * 58}" r="24" fill="#fff" stroke="#111" stroke-width="4"/>`;
        lamps += `<g class="lamp" data-k="${ch}"><circle cx="${x}" cy="${430 + ri * 58}" r="24" fill="${C.yellow}" opacity="0"/><text x="${x}" y="${440 + ri * 58}" font-family="${MONO}" font-weight="700" font-size="26" text-anchor="middle" fill="#111">${ch}</text></g>`;
        keys += `<g class="key" data-k="${ch}"><circle cx="${x}" cy="${660 + ri * 66}" r="27" fill="#111" stroke="#fff" stroke-width="3"/><text x="${x}" y="${670 + ri * 66}" font-family="${MONO}" font-weight="700" font-size="26" text-anchor="middle" fill="#fff" pointer-events="none">${ch}</text></g>`;
      }));
      [690, 800, 910].forEach(x => rot += `<rect x="${x - 26}" y="252" width="52" height="56" fill="#fff" stroke="#111" stroke-width="4"/><text class="rot" x="${x}" y="294" font-family="${MONO}" font-size="36" font-weight="700" text-anchor="middle" fill="#111">A</text>`);
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) drums += `<circle cx="${1290 + c * 100}" cy="${430 + r * 100}" r="40" fill="url(#gSphere)" stroke="#111" stroke-width="5"/><circle cx="${1290 + c * 100}" cy="${430 + r * 100}" r="8" fill="#111"/>`;
      // усадьба Блетчли-парк (отдельный план вверху)
      manor += `<rect x="-200" y="-1200" width="1800" height="900" fill="#fff"/>
        <rect x="200" y="-760" width="800" height="360" fill="#bbb" stroke="#111" stroke-width="5"/><path d="M180,-760 L600,-980 L1020,-760Z" fill="#888" stroke="#111" stroke-width="5"/>
        ${[300, 420, 540, 660, 780, 900].map(x => `<rect x="${x - 30}" y="-700" width="60" height="90" fill="#333" stroke="#111" stroke-width="3"/><rect x="${x - 30}" y="-560" width="60" height="90" fill="#333" stroke="#111" stroke-width="3"/>`).join('')}
        <rect x="330" y="-1040" width="40" height="120" fill="#777" stroke="#111" stroke-width="4"/><rect x="830" y="-1040" width="40" height="120" fill="#777" stroke="#111" stroke-width="4"/>
        <rect x="1080" y="-560" width="380" height="160" fill="#999" stroke="#111" stroke-width="4"/><path d="M1070,-560 L1270,-640 L1470,-560Z" fill="#666" stroke="#111" stroke-width="4"/>
        <rect x="-200" y="-400" width="1800" height="100" fill="#555"/>${A.tree(-60, -390, .7)}${A.tree(1540, -390, .8)}`;
      return J({
        col: `<rect ${A.BG} fill="${C.red}"/><rect x="460" y="220" width="680" height="700" rx="10" fill="${C.cream}"/>${lampsCol}
          <rect x="-200" y="-1200" width="1800" height="900" fill="#fff"/><circle cx="1350" cy="-950" r="110" fill="${C.red}"/>`,
        ink: `<rect x="-1200" y="-300" width="4000" height="1500" fill="url(#gFadeDown)" opacity=".7"/>
          ${manor}<circle cx="1350" cy="-950" r="110" fill="#fff" opacity="0"/>
          <rect x="1220" y="360" width="340" height="320" fill="#333" stroke="#111" stroke-width="6"/>${drums}
          <rect x="430" y="190" width="740" height="760" rx="14" fill="url(#gWood)" stroke="#111" stroke-width="6"/>
          <rect x="470" y="230" width="660" height="680" fill="#e2e2e2"/><rect x="470" y="600" width="660" height="20" fill="#333"/>
          <rect x="640" y="236" width="40" height="88" fill="url(#gCylV)"/><rect x="750" y="236" width="40" height="88" fill="url(#gCylV)"/><rect x="860" y="236" width="40" height="88" fill="url(#gCylV)"/>
          ${lampsInk}
          <rect x="1800" y="-1200" width="1000" height="2400" fill="#bdbdbd"/><rect x="1860" y="120" width="300" height="220" fill="#fff" stroke="#111" stroke-width="6"/>
          <path d="M1890,300 C1910,230 1960,180 2020,190 C2070,140 2140,170 2140,240 C2120,290 2060,310 2020,290 C1970,310 1920,320 1890,300Z" fill="none" stroke="#111" stroke-width="4"/>`,
        top: `${rot}${lamps}${keys}<circle cx="1930" cy="200" r="9" fill="${C.red}"/><circle cx="2080" cy="250" r="9" fill="${C.red}"/>`
      }, tu);
    },
    panels: lay('twoTopWide', [
      { crop: [640, -650, 1400] },
      { crop: [2200, 480, 560], extra: () => ({ top: A.bubble({ id: 'b-tu', x: 1950, y: 40, w: 500, fs: 30, lines: ['*159 квинтиллионов*', 'настроек? Пусть', 'ищет *машина.*'], tail: [2180, 300], who: 'ТЬЮРИНГ' }) }) },
      { crop: [960, 560, 1300], extra: () => ({ top: A.sfx({ id: 'sfx-klac', x: 1420, y: 330, text: 'КЛАЦ!', fs: 70, rot: 8, burst: 120 }) }) }
    ]),
    steps: [
      { panel: 'a', len: 1.2, cap: { k: '1940-е · Англия', t: 'Блетчли-парк. Здесь тайно взламывают немецкие шифры.' } },
      { panel: 'b', len: 1.2, talk: ['tu'], cap: { t: 'Германия шифрует приказы машиной «Энигма». Алан Тьюринг строит «Бомбу» — машину для поиска ключей.', n: 'Ранние версии Энигмы вскрыл польский математик Мариан Реевский ещё в 1932 году.' },
        build(tl, p, K) { K.pop(tl, p.q1('#b-tu'), .45); K.shift(tl, p.q('.ch-tu .feat'), 6, 0, -8, 0, .4, .6); } },
      { panel: 'c', len: 1.6, widget: 'enig', cap: { t: 'Слабость Энигмы: буква никогда не шифруется сама в себя. Проверь на клавиатуре.' },
        build(tl, p, K) {
          const st = { k: 0 };
          tl.to(st, { k: 78, duration: .9, ease: 'power2.out', onUpdate: () => { const n = Math.floor(st.k); p.q('.rot').forEach((t, i) => t.textContent = LAT[(n * ((i % 3) + 1) * 7 + i * 5) % 26]); } }, .3);
          tl.call(() => p.syncRot && p.syncRot(), null, 1.21);
          K.pop(tl, p.q1('#sfx-klac'), .6);
        } }
    ],
    init(p) {
      let E = makeEnigma(), inS = '', outS = '';
      p.syncRot = () => p.q('.rot').forEach((t, i) => t.textContent = E.window()[i % 3]);
      const press = ch => {
        const o = E.press(ch);
        inS = (inS + ch).slice(-16); outS = (outS + o).slice(-16);
        document.getElementById('n-in').textContent = inS; document.getElementById('n-out').textContent = outS;
        p.syncRot();
        gsap.fromTo(p.q(`.lamp[data-k="${o}"] circle`), { opacity: 1 }, { opacity: 0, duration: .9, delay: .25 });
        gsap.fromTo(p.q(`.key[data-k="${ch}"]`), { y: 6 }, { y: 0, duration: .2 });
        window.SFX && SFX.key();
      };
      p.q('.key').forEach(k => k.addEventListener('pointerdown', e => { e.preventDefault(); press(k.dataset.k); }));
      document.querySelectorAll('#w-enig .kb button').forEach(b => b.addEventListener('click', () => press(b.textContent)));
      p.onKey = e => { const ch = e.key.toUpperCase(); if (ch.length === 1 && LAT.includes(ch)) { press(ch); return true; } };
      document.getElementById('n-reset').addEventListener('click', () => { E = makeEnigma(); inS = outS = ''; document.getElementById('n-in').textContent = document.getElementById('n-out').textContent = '—'; p.syncRot(); });
    },
    speech: [['А', 'В двадцатом веке немецкую «Энигму» с её квинтиллионами настроек взломали польские математики и Алан Тьюринг.']]
  });

  // ---------- 10. ОТКРЫТЫЙ КЛЮЧ
  pages.push({
    id: 'pubkey', num: 10, place: 'СТЭНФОРД И MIT', year: 1976, head: 'глава 10 · открытый ключ', chars: ['al', 'bo'], filter: 'engD',
    world() {
      const al = P.alice({ id: 'al', x: 330, y: 480, s: .8, mouth: 'smile', look: [10, 4], arms: { R: { a1: -55, a2: -25, hand: 'open', sleeve: C.yellow } } });
      const bo = P.bob({ id: 'bo', x: 2200, y: 480, s: .85, mouth: 'open', brows: 'up', look: [-10, 0], arms: { L: { a1: -40, a2: -70, hand: 'point', sleeve: '#fbfaf6' } } });
      let grid = '';
      for (let x = -400; x < 2800; x += 50) grid += `<path d="M${x},-400 V1400" stroke="#cfcfcf" stroke-width="2"/>`;
      for (let y = -400; y < 1400; y += 50) grid += `<path d="M-400,${y} H2800" stroke="#cfcfcf" stroke-width="2"/>`;
      const locks = J(padlock(780, 640, .45, ''), padlock(1000, 650, .4, ''), padlock(1180, 640, .45, ''));
      const big = padlock(1300, 1300, 1, 'B');
      return J({
        col: `<rect ${A.BG} fill="#fff"/>`,
        ink: `<rect x="-1200" y="860" width="2400" height="1400" fill="#555"/><rect x="560" y="740" width="800" height="40" fill="#222"/>
          <rect x="1800" y="-400" width="1000" height="1300" fill="#2b2b2b"/><rect x="1830" y="-370" width="940" height="720" fill="#1a1a1a" stroke="#777" stroke-width="10"/>`,
        top: `<g opacity=".9">${grid}</g>
          <text x="1880" y="-250" font-family="${MONO}" font-size="56" fill="#fff">61 × 53 = 3233</text>
          <text x="1880" y="-150" font-family="${MONO}" font-size="56" fill="#fff">3233 = ? × ?</text>
          <text x="1880" y="-40" font-family="${MONO}" font-size="40" fill="${C.yellow}">c = mᵉ mod n</text>
          <text x="1880" y="40" font-family="${MONO}" font-size="40" fill="${C.yellow}">m = cᵈ mod n</text>`
      }, locks, al, bo, big, { ink: `<rect x="900" y="1580" width="800" height="40" fill="#111"/>` });
    },
    panels: lay('wideTop3', [
      { crop: [760, 420, 1200], extra: () => ({ top: A.bubble({ id: 'b-al', x: 260, y: 40, w: 760, fs: 34, lines: ['Защёлкнуть мой замок', 'может кто угодно.', 'Открыть — только *я.*'], tail: [380, 270], who: 'АЛИСА' }) }) },
      { crop: [1300, 1260, 520], extra: () => ({ top: A.sfx({ id: 'sfx-click', x: 1460, y: 960, text: 'ЩЁЛК!', fs: 70, rot: -10, burst: 110 }) + `<rect class="pk-hit" x="1100" y="980" width="400" height="600" fill="transparent" style="cursor:pointer"/>` }) },
      { crop: [2200, 430, 640], extra: () => ({ top: A.bubble({ id: 'b-bo', type: 'shout', x: 1930, y: 40, w: 540, fs: 30, lines: ['Умножить — секунда.', 'Разложить — *вечность!*'], tail: [2190, 590], who: 'БОБ' }) }) }
    ]),
    steps: [
      { panel: 'a', len: 1.3, talk: ['al'], cap: { k: '1976–1977', t: 'Раньше ключ передавали тайно. Уитфилд Диффи и Мартин Хеллман придумали открытый ключ.' },
        build(tl, p, K) { K.pop(tl, p.q1('#b-al'), .45); K.rot(tl, p.q('.ch-al .armR'), 186, 256, 30, 0, .35, .45, 'back.out(1.6)'); } },
      { panel: 'b', len: 1.15, cap: { t: 'Раздай всем открытые замки, ключ оставь себе. Нажми на замок.' },
        build(tl, p, K) { tl.fromTo(p.q('.shackleB'), { y: -90 }, { y: 0, duration: .2, ease: 'power3.in', onComplete: () => window.SFX && SFX.click() }, .55); K.pop(tl, p.q1('#sfx-click'), .72); } },
      { panel: 'c', len: 1.4, talk: ['bo'], widget: 'pk', cap: { t: 'Ривест, Шамир и Адлеман собрали из идеи шифр RSA. Его сила — в простых числах.' },
        build(tl, p, K) { K.pop(tl, p.q1('#b-bo'), .45); } }
    ],
    init(p) {
      let open = false;
      p.q('.pk-hit').forEach(h => h.addEventListener('click', () => { open = !open; gsap.to(p.q('.shackleB'), { y: open ? -90 : 0, duration: .25, ease: open ? 'back.out(2)' : 'power3.in' }); window.SFX && SFX.click(); }));
      document.getElementById('pk-mul').addEventListener('click', () => { document.getElementById('pk-mulv').textContent = '3233 · мгновенно'; window.SFX && SFX.tick(); });
      document.getElementById('pk-fac').addEventListener('click', () => {
        const o = { d: 2 }, out = document.getElementById('pk-facv');
        gsap.to(o, { d: 53, duration: 2.2, ease: 'none', onUpdate: () => { const d = Math.floor(o.d); out.textContent = `делю на ${d}… ${3233 % d ? 'нет' : 'да!'}`; },
          onComplete: () => { out.textContent = '53 × 61 · 52 попытки'; document.getElementById('pk-tip').innerHTML = 'В RSA-2048 число длиной 617 цифр. По оценкам, обычным компьютерам на разложение понадобятся триллионы лет.'; window.SFX && SFX.win(); } });
      });
    },
    speech: [['Б', 'В 1976 году придумали открытый ключ: перемножить простые числа легко, а разложить результат обратно почти невозможно.']]
  });

  // ---------- 11. СЕГОДНЯ
  pages.push({
    id: 'today', num: 11, place: 'ТВОЙ КАРМАН', year: 2026, head: 'глава 11 · сегодня', chars: [], filter: 'engD',
    world() {
      let bin = '', people = '';
      for (let c = 0; c < 26; c++) { let col = ''; for (let r = 0; r < 24; r++) col += `<tspan x="${-300 + c * 95}" dy="46">${(c * 7 + r * 13) % 3 ? 1 : 0}</tspan>`; bin += `<text class="bin" font-family="${MONO}" font-weight="700" font-size="36" fill="#111" opacity=".45" y="-400">${col}</text>`; }
      for (let i = 0; i < 7; i++) {
        const x = -40 + i * 270, s = .8 + (i % 3) * .12;
        people += `<g transform="translate(${x} 880) scale(${s})"><circle cx="0" cy="-330" r="58" fill="#111"/><path d="M-90,0 C-90,-160 -60,-250 0,-250 C60,-250 90,-160 90,0Z" fill="#111"/>
          <rect x="${i % 2 ? 20 : -60}" y="-300" width="40" height="66" rx="8" fill="#fff" stroke="#111" stroke-width="4"/></g>`;
      }
      const hand = 'M600,1100 C600,960 560,860 610,770 C640,720 700,730 700,790 L700,640 C700,600 760,600 760,640 L1010,700 C1080,690 1100,760 1060,800 C1000,860 990,900 1020,960 C1060,1040 1060,1100 1060,1100Z';
      const chat = `<rect x="690" y="200" width="170" height="44" rx="20" fill="#e8e8e8" stroke="#111" stroke-width="3"/><rect x="760" y="256" width="170" height="44" rx="20" fill="${C.red}" stroke="#111" stroke-width="3"/>
        <rect x="706" y="216" width="120" height="10" rx="5" fill="#999"/><rect x="776" y="272" width="120" height="10" rx="5" fill="#fff"/>`;
      const off = 'translate(0 1300)';
      return J({
        col: `<rect ${A.BG} fill="${C.red}"/><g>${bin}</g><circle cx="1350" cy="160" r="90" fill="#fff"/>
          <g transform="${off}"><g transform="rotate(-8 800 520)"><rect x="660" y="150" width="300" height="600" rx="40" fill="#fff"/></g><path d="${hand}" fill="${C.skin}"/></g>`,
        tone: `<g transform="${off}"><path d="M940,700 C1000,720 1040,760 1030,810 C1000,860 990,900 1020,960 C1060,1040 1060,1100 1060,1100 L960,1100 C960,980 980,860 940,700Z" fill="#b5b5b5"/></g>`,
        ink: `<g opacity=".95">${A.skyline(-400, 1900, 980)}</g>${people}
          <g transform="${off}"><g transform="rotate(-8 800 520)"><rect x="640" y="130" width="340" height="640" rx="52" fill="#0a0a0a"/><rect x="660" y="150" width="300" height="600" rx="40" fill="#fff"/><rect x="760" y="160" width="100" height="22" rx="11" fill="#000"/></g>
          <path d="${hand}" fill="#fff" stroke="#111" stroke-width="7"/><path d="M700,790 C690,850 720,880 760,870 M760,700 L1000,760 M650,900 C700,880 760,890 800,920" stroke="#111" stroke-width="6" fill="none"/></g>`,
        top: `<g transform="${off}"><g transform="rotate(-8 800 520)">${chat}
          <rect x="760" y="380" width="100" height="90" rx="12" fill="${C.red}" stroke="#111" stroke-width="4"/><path d="M780,380 V340 C780,300 840,300 840,340 V380" fill="none" stroke="#111" stroke-width="14"/><circle cx="810" cy="420" r="11" fill="#111"/>
          <text x="810" y="530" font-family="${DISP}" font-weight="900" font-size="38" text-anchor="middle" fill="#111">AES-256</text>
          <text x="810" y="568" font-family="${MONO}" font-size="18" text-anchor="middle" fill="#111">сообщение зашифровано</text></g></g>`
      });
    },
    panels: lay('topBig', [
      { crop: [800, 560, 1500] },
      { crop: [980, 1880, 1100], extra: () => ({ top: A.bubble({ id: 'b-today', type: 'box', x: 1110, y: 1400, w: 560, fs: 36, lines: ['Теперь у нас есть шифры,', 'которые не взломать', 'за *миллионы лет.*'] }) }) }
    ]),
    steps: [
      { panel: 'a', len: 1.2, cap: { k: 'Сегодня', t: 'Сообщения в мессенджере, оплата картой, замок в адресной строке: всё это закрыто шифрами.' } },
      { panel: 'b', len: 1.5, widget: 'aes', cap: { t: 'Самый распространённый шифр, AES, утвердили в 2001 году.' },
        build(tl, p, K) { K.pop(tl, p.q1('#b-today'), .45); const st = { n: 0 }; tl.to(st, { n: 1, duration: .7, onUpdate: () => p.numFx && p.numFx(st.n) }, .6); } }
    ],
    init(p) {
      const full = (2n ** 256n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
      const el = document.getElementById('t-num');
      p.numFx = v => { el.textContent = full.slice(0, Math.max(1, Math.round(full.length * v))); };
      p.numFx(0);
    },
    speech: [['А', 'Сегодня шифр охраняет каждое сообщение в мессенджере: чтобы перебрать ключи, не хватит возраста Вселенной.']]
  });

  // ---------- 12. ЗАВТРА
  pages.push({
    id: 'quantum', num: 12, place: 'ЛАБОРАТОРИЯ', year: null, yearText: 'ЗАВТРА', head: 'глава 12 · завтра', chars: ['ph'],
    world() {
      const ph = P.physicist({ id: 'ph', x: 860, y: 1060, s: .9, mouth: 'open', brows: 'up', look: [-6, -10], blush: true, arms: { R: { a1: -150, a2: 10, hand: 'point', sleeve: '#fbfaf6' } } });
      const tiers = [[260, 300], [430, 250], [590, 200], [740, 150]];
      let cl = '', ik = '', tubes = '', panel = '';
      tiers.forEach(([y, w]) => { cl += `<rect x="${500 - w}" y="${y - 22}" width="${w * 2}" height="44" rx="22" fill="${C.yellow}"/>`; ik += `<rect x="${500 - w}" y="${y - 22}" width="${w * 2}" height="44" rx="22" fill="url(#gCylV)" opacity=".85" stroke="#111" stroke-width="5"/>`; });
      for (let i = 0; i < 9; i++) { const x = 260 + i * 60; tubes += `<path d="M${x},280 C${x + 10},420 ${x - 10},560 ${500 + (x - 500) * .5},740" stroke="#3a3a3a" stroke-width="10" fill="none"/>`; }
      for (let r = 0; r < 6; r++) for (let c = 0; c < 2; c++) panel += `<circle cx="${-260 + c * 70}" cy="${320 + r * 90}" r="20" fill="url(#gSphere)" stroke="#111" stroke-width="4"/>`;
      return J({
        col: `<rect ${A.BG} fill="#fff"/><circle cx="500" cy="500" r="430" fill="${C.red}"/><g class="q-ch">${cl}<rect x="470" y="-1200" width="60" height="1460" fill="${C.yellow}"/></g>`,
        ink: `<rect x="-1200" y="-1200" width="4000" height="1500" fill="url(#gFadeDown)" opacity=".7"/>
          <rect x="-330" y="240" width="200" height="600" fill="#666" stroke="#111" stroke-width="6"/>${panel}
          <rect x="1180" y="240" width="200" height="600" fill="#666" stroke="#111" stroke-width="6"/>
          <rect x="-1200" y="1000" width="4000" height="1300" fill="#555"/>
          <circle cx="500" cy="500" r="430" fill="none" stroke="#111" stroke-width="12"/>
          <g class="q-chi"><rect x="470" y="-1200" width="60" height="1460" fill="url(#gCylV)"/>${tubes}${ik}<path d="M460,760 L500,860 L540,760Z" fill="#222"/></g>`,
        top: `<g class="q-dots">${[0, 1, 2, 3, 4].map(i => `<circle cx="${340 + i * 80}" cy="920" r="12" fill="#fff"/>`).join('')}</g>`
      }, ph);
    },
    panels: lay('splash', [{ crop: [520, 620, 1180], extra: () => ({ top: A.bubble({ id: 'b-ph', type: 'shout', x: 30, y: 930, w: 560, fs: 40, lines: ['Он разложит числа *RSA.*', 'Нужны *новые* шифры!'], tail: [800, 1010], who: 'ФИЗИК' }) }) }]),
    steps: [
      { panel: 'a', len: 1.5, talk: ['ph'], capPos: 'top', cap: { k: 'Завтра', t: 'Квантовый компьютер с алгоритмом Шора (1994) сможет разлагать огромные числа и вскрывать RSA.', n: 'В 2024 году американский институт стандартов NIST утвердил первые постквантовые шифры.' },
        build(tl, p, K) { tl.fromTo(p.q('.q-ch, .q-chi'), { y: -700 }, { y: 0, duration: .7, ease: 'power3.out' }, .1); K.pop(tl, p.q1('#b-ph'), .7); K.rot(tl, p.q('.ch-ph .armR'), 186, 256, 60, 0, .5, .4, 'back.out(1.6)'); } }
    ],
    init(p) { gsap.to(p.q('.q-dots circle'), { opacity: .2, duration: .5, yoyo: true, repeat: -1, stagger: { each: .15, repeat: -1, yoyo: true } }); },
    speech: [['А', 'А учёные уже готовят замки против квантовых компьютеров.']]
  });

  // ---------- 13. ВЫВОД (с 3D-бюстом)
  pages.push({
    id: 'verdict', num: 13, place: 'РАЗБОР', year: null, yearText: 'ВЫВОД', head: 'глава 13 · вывод', chars: [], cls: 'verdict-page',
    html: () => `<div class="vd">
      <h2 class="vd-title">Так в чём гениальность?</h2>
      <div class="vd-art"><div class="cv-sun"></div><div class="bust-host"></div><div class="vd-three">III</div></div>
      <div class="vd-col plus"><h3>Плюсы</h3><ul><li>Шифруешь в уме, без приборов.</li><li>Ключ — одно число.</li><li>Метод отделён от ключа.</li></ul></div>
      <div class="vd-col minus"><h3>Минусы</h3><ul><li>Всего 25 ключей.</li><li>Частоты букв выдают текст.</li><li>Видны длины слов.</li></ul></div>
      <div class="vd-concl"><p>Метод знают все.<br>Секрет — в ключе.</p></div>
    </div>`,
    steps: [
      { panel: { x: 20, y: 40, w: 960, h: 760 }, len: 1.3, cap: { k: 'Глава 13 · вывод', t: 'Шифр Цезаря слабый. Но в нём спрятана сильная идея.' }, build(tl) { yawTween(tl, -.7, .25, 0, 1.3); } },
      { panel: { x: 20, y: 790, w: 480, h: 420 }, len: 1.0, cap: { t: 'Плюс: метод и ключ живут отдельно. Эта идея есть в каждом современном шифре.' } },
      { panel: { x: 500, y: 790, w: 480, h: 420 }, len: 1.0, cap: { t: 'Минус: ключей мало, а частоты букв сохраняются. Аль-Кинди вскроет такой текст за минуты.' } },
      { panel: { x: 20, y: 1040, w: 960, h: 400 }, len: 1.4, widget: 'name', capPos: 'top',
        cap: { k: 'Наш вывод', t: 'Метод могут знать все — секрет хранит ключ. В 1883 году Керкгоффс записал это правилом, по нему построены AES и RSA. Каждый взлом рождал шифр сильнее, поэтому шифр — самое гениальное изобретение.' } }
    ],
    init() {
      const n = document.getElementById('v-name'), k = document.getElementById('v-k'), o = document.getElementById('v-out');
      const up = () => { o.textContent = shiftText(n.value, +k.value || 0); window.SFX && SFX.tick(); };
      n.addEventListener('input', up); k.addEventListener('input', up); o.textContent = shiftText(n.value, 3);
    },
    speech: [
      ['Б', 'Плюсы шифра Цезаря — простота и ключ из одного числа. Минусы — всего двадцать пять ключей и заметные частоты букв. Но Цезарь первым отделил метод от ключа: метод знают все, а секрет — одно число.'],
      ['А', 'В этом и гениальность: изобретению не обязательно быть сложным. Хватило одной верной мысли и числа три.']
    ]
  });

  // ---------- ЗАДНЯЯ ОБЛОЖКА
  pages.push({
    id: 'back', place: 'КОНЕЦ', bare: true, cls: 'backcover',
    html: () => `<div class="bc">
      <p class="bc-k">Конец первого выпуска</p>
      <h2 class="bc-title">Продолжение следует…<br><span>в твоём телефоне</span></h2>
      <p class="bc-txt">Каждый раз, когда ты отправляешь сообщение, работает идея Цезаря: метод знают все, а ключ знаешь только ты.</p>
      <div class="bc-thanks">Спасибо<br>за внимание!</div>
      <div class="bc-credits"><b>Как сделано.</b> Персонажи и сцены нарисованы кодом (SVG): штрих как на гравюре и растровые точки как в старых комиксах. 3D-бюст Цезаря — three.js и скан головы Lee Perry-Smith (Infinite-Realities, CC BY 3.0). Анимация — GSAP, листание по шагам. Трейлер — HyperFrames.</div>
      <a class="bc-link" href="#speech">Текст выступления ↓</a>
    </div>`,
    steps: [{ panel: { x: 20, y: 40, w: 960, h: 900 }, len: 1.2 }, { panel: { x: 20, y: 820, w: 960, h: 620 }, len: 1.2 }],
    speech: [['А', 'Спасибо за внимание!']]
  });

  // ---------- виджеты (интерактив в экранных координатах, крупный текст)
  const WIDGETS = {
    idea: `<p class="panel-k">Попробуй сам</p>
      <label class="row">Сдвиг <input type="range" min="1" max="25" value="3" id="i-shift"><output id="i-shiftv">3</output></label>
      <label class="row">Слово <input type="text" id="i-word" value="ATTACK" maxlength="24" autocomplete="off" spellcheck="false"></label>
      <p class="out" id="i-out">DWWDFN</p>`,
    hold: `<button class="hold" id="holdBtn" aria-label="Держи, чтобы расшифровать"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="54" class="hold-bg"/><circle cx="60" cy="60" r="54" class="hold-ring" id="holdRing"/></svg><span>ДЕРЖИ,<br>чтобы<br>прочесть</span></button>
      <p class="panel-tip">Зажми кнопку: буквы поедут назад на три шага.</p>`,
    kindi: `<p class="panel-k">Взломай сам: нажми на самый высокий столбик — это О</p><p class="ctext" id="k-text"></p><div class="bars" id="k-bars"></div><p class="panel-tip" id="k-msg">Под столбиком — буква шифровки и сколько раз она встретилась.</p>`,
    brute: `<p class="panel-k">Перебор ключей для DWWDFN</p><div class="slot"><ol id="b-list"></ol></div><p class="stamp">НАШЁЛ С ТРЕТЬЕЙ ПОПЫТКИ</p>`,
    vig: `<p class="panel-k">Шифр Виженера</p>
      <label class="row">Ключ <input type="text" id="v-key" value="ROMA" maxlength="12" autocomplete="off" spellcheck="false"></label>
      <label class="row">Текст <input type="text" id="v-txt" value="ATTACK AT DAWN" maxlength="28" autocomplete="off" spellcheck="false"></label><div class="vtab" id="v-tab"></div>`,
    enig: `<p class="panel-k">Энигма: нажимай буквы</p><p class="tape"><span>ВВОД</span><b id="n-in">—</b></p><p class="tape"><span>ВЫХОД</span><b id="n-out">—</b></p>
      <div class="kb">${ROWS.map(r => `<div>${[...r].map(c => `<button>${c}</button>`).join('')}</div>`).join('')}</div>
      <p class="panel-tip">Нажми одну букву несколько раз: роторы провернутся, и ответ каждый раз другой. Роторы I, II, III, рефлектор B — как в настоящей.</p>
      <button class="btn btn-sm" id="n-reset">Сбросить на AAA</button>`,
    pk: `<p class="panel-k">Математика замка</p>
      <p class="row"><button class="btn btn-sm" id="pk-mul">61 × 53 = ?</button><b id="pk-mulv"></b></p>
      <p class="row"><button class="btn btn-sm" id="pk-fac">3233 = ? × ?</button><b id="pk-facv"></b></p>
      <p class="panel-tip" id="pk-tip">Перемножить простые числа легко. Разложить ответ обратно приходится перебором.</p>`,
    aes: `<p class="panel-k">«Миллионы лет» — это мы поскромничали</p><p class="big-num" id="t-num"></p>
      <p class="panel-tip">Столько ключей у AES-256 (2<sup>256</sup>). Пусть каждый атом Земли, а их около 10<sup>50</sup>, проверяет миллиард ключей в секунду. Перебор займёт около <b>37 миллиардов лет</b>. Вселенной 13,8 миллиарда.</p>`,
    name: `<p class="panel-k">Зашифруй своё имя</p>
      <label class="row">Имя <input id="v-name" type="text" value="Цезарь" maxlength="24" autocomplete="off" spellcheck="false"></label>
      <label class="row">Сдвиг <input id="v-k" type="number" min="1" max="32" value="3"></label><p class="out" id="v-out"></p>`
  };
  document.getElementById('widgets').innerHTML = Object.entries(WIDGETS).map(([id, html]) => `<div class="widget" id="w-${id}">${html}</div>`).join('');

  window.BOOK = { PW, PH, pages, chapters: 13 };
})();
