/* Сцены комикса. У каждой: art() → слои SVG, ui — HTML поверх,
   build(tl, q) — анимация по скроллу (время в «экранах»),
   init(q) — интерактив, beats — точки остановки свайпа, speech — реплики. */
(function () {
  const A = window.ART, C = A.C;
  const LAT = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const RUS = 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ';

  function shiftText(txt, k) {
    return [...txt].map(ch => {
      const up = ch.toUpperCase();
      let al = LAT.includes(up) ? LAT : RUS.includes(up) ? RUS : null;
      if (!al) return ch;
      const n = al.length;
      const r = al[((al.indexOf(up) + k) % n + n) % n];
      return ch === up ? r : r.toLowerCase();
    }).join('');
  }
  window.shiftText = shiftText;

  const cap = (kicker, html, extra = '') =>
    `<div class="cap"><p class="cap-k">${kicker}</p><p>${html}</p>${extra}</div>`;
  const note = t => `<p class="cap-note">${t}</p>`;

  // ---------- Энигма (настоящие роторы I, II, III и рефлектор B)
  const ROT = ['EKMFLGDQVZNTOWYHXUSPAIBRCJ', 'AJDKSIRUXBLHWTMCQGZNPYFVOE', 'BDFHJLCPRTXVZNYEIWGAKMUSQO'];
  const NOTCH = ['Q', 'E', 'V'];
  const REFL = 'YRUHQSLDPXNGOKMIEBFZCWVJAT';
  function makeEnigma(start = 'AAA') {
    const pos = [...start].map(c => LAT.indexOf(c)); // [left, middle, right]
    function step() {
      const midAtNotch = LAT[pos[1]] === NOTCH[1];
      const rightAtNotch = LAT[pos[2]] === NOTCH[2];
      if (midAtNotch) { pos[0] = (pos[0] + 1) % 26; pos[1] = (pos[1] + 1) % 26; }
      else if (rightAtNotch) pos[1] = (pos[1] + 1) % 26;
      pos[2] = (pos[2] + 1) % 26;
    }
    const fwd = (r, c, p) => (LAT.indexOf(ROT[r][(c + p) % 26]) - p + 26) % 26;
    const bwd = (r, c, p) => (ROT[r].indexOf(LAT[(c + p) % 26]) - p + 26) % 26;
    return {
      pos,
      press(ch) {
        step();
        let c = LAT.indexOf(ch);
        c = fwd(2, c, pos[2]); c = fwd(1, c, pos[1]); c = fwd(0, c, pos[0]);
        c = LAT.indexOf(REFL[c]);
        c = bwd(0, c, pos[0]); c = bwd(1, c, pos[1]); c = bwd(2, c, pos[2]);
        return LAT[c];
      },
      window() { return pos.map(p => LAT[p]).join(''); }
    };
  }

  // =====================================================================
  const S = [];

  // 0 — ОБЛОЖКА
  S.push({
    id: 'hero', len: 1.6, place: 'ЛИСТАЙ ВНИЗ', year: null, filter: 'engV',
    art() {
      const c = A.caesar('translate(800,610) scale(1.0)', { dark: '#060606' });
      const drips = 'M-700,-700 H2300 V300 C2200,320 2150,420 2100,330 C2000,360 1960,520 1900,350 C1800,380 1760,300 1700,360 C1640,420 1620,560 1560,380 C1460,330 1420,420 1380,340 C1300,300 1260,470 1200,350 C1120,320 1080,380 1000,330 C940,300 920,440 880,320 C800,300 760,360 700,320 C640,300 620,500 560,330 C480,300 440,380 380,330 C320,300 300,420 240,320 C160,300 100,360 40,320 C-60,300 -100,460 -160,330 C-260,300 -400,360 -700,320Z';
      return {
        col: `<rect ${A.BG} fill="#fff"/><circle id="h-sun" cx="800" cy="610" r="285" fill="${C.red}"/>${c.col}`,
        ink: `${A.inkBase()}<path d="${drips}" fill="url(#gDrip)"/>
              <rect x="-700" y="860" width="3000" height="900" fill="url(#gFadeUp)"/>${c.ink}`,
        top: c.top
      };
    },
    ui: `<div class="hero">
           <h1 class="hero-title" id="heroTitle" aria-label="Тайнопись">ТАЙНОПИСЬ</h1>
           <p class="hero-sub">История самого гениального изобретения</p>
           <p class="hero-meta">комикс в 13 кадрах · от Спарты до квантовых компьютеров</p>
           <div class="hero-actions"><button class="btn" id="btnTrailer">▶ Трейлер</button><span class="hero-hint">листай вниз ↓</span></div>
         </div>`,
    build(tl, q) {
      tl.to(q('.cam'), { scale: 1.08, y: -30, duration: 1.6, ease: 'none', transformOrigin: '50% 50%' }, 0);
      tl.to(q('.hero'), { y: -80, opacity: 0, duration: .8, ease: 'power1.in' }, .5);
    },
    beats: [0],
    speech: [['А', 'Какое изобретение самое гениальное? Колесо? Интернет? Мы выбрали то, без которого ваш телефон стал бы открытой книгой. Это шифр.']]
  });

  // 1 — СПАРТА, СКИТАЛА
  const SC_MSG = 'ВРАГИНАХОЛМЕ'; // 3 строки × 4 столбца
  const SC_STRIP = (() => { let s = ''; for (let c = 0; c < 4; c++) for (let r = 0; r < 3; r++) s += SC_MSG[r * 4 + c]; return s; })();
  S.push({
    id: 'sparta', len: 2.4, place: 'СПАРТА', year: -450, yearText: 'V век до н. э.', filter: 'engV', enter: [50, 45],
    art() {
      const h = A.helmet('translate(560,540) scale(1.05)');
      let strip = '', bands = '';
      [...SC_STRIP].forEach((ch, i) => {
        strip += `<text class="sc-l" data-i="${i}" x="${430 + i * 66}" y="838" font-family="Oswald" font-weight="700" font-size="44" text-anchor="middle" fill="#111">${ch}</text>`;
      });
      for (let i = 0; i < 9; i++) bands += `<path d="M${880 + i * 42},452 L${910 + i * 42},598" stroke="${C.cream}" stroke-width="30" />`;
      return {
        col: `<rect ${A.BG} fill="${C.red}"/><circle cx="1130" cy="260" r="150" fill="#fff"/>${h.col}`,
        ink: `${A.inkBase()}<rect x="-700" y="-700" width="3000" height="1150" fill="url(#gFadeDown)" opacity=".9"/>
              <circle cx="1130" cy="260" r="150" fill="#fff"/>
              <rect x="-700" y="880" width="3000" height="900" fill="#6a6a6a"/>
              ${h.ink}
              <rect x="840" y="440" width="440" height="170" rx="24" fill="url(#gCylH)"/>
              <ellipse cx="1280" cy="525" rx="22" ry="85" fill="#222"/>`,
        top: `<g id="sc-bands" opacity="0">${bands}</g>
              <g id="sc-strip"><rect x="390" y="790" width="820" height="66" fill="${C.cream}" stroke="#111" stroke-width="3"/></g>
              ${strip}
              <g id="sc-read" opacity="0"><path d="M880,488 H1240 M880,532 H1240 M880,576 H1240" stroke="${C.red}" stroke-width="4" stroke-dasharray="8 8"/></g>
              ${A.bubble({ id: 'sc-b', x: 840, y: 90, w: 470, lines: ['«ВРАГИ НА ХОЛМЕ»'], tail: [1010, 430], fs: 40, font: 'Oswald' })}`
      };
    },
    ui: cap('Спарта · около V века до н. э.',
      'Спартанцы наматывали узкую ленту на палку-<b>скиталу</b> и писали вдоль неё. Снимешь ленту и увидишь кашу из букв. Прочтёт тот, у кого палка такой же толщины.',
      note('О скитале рассказывает Плутарх в жизнеописании Лисандра. Это шифр перестановки: буквы те же, меняется порядок.')),
    build(tl, q) {
      tl.fromTo(q('.cam'), { scale: 1 }, { scale: 1.06, duration: 2.4, ease: 'none', transformOrigin: '60% 50%' }, 0);
      const ls = q('.sc-l', true);
      ls.forEach((el, i) => {
        const col = Math.floor(i / 3), row = i % 3;
        const tx = 920 + col * 96, ty = 504 + row * 44;
        const x0 = 430 + i * 66, y0 = 838;
        tl.to(el, { attr: { x: tx, y: ty, 'font-size': 38 }, duration: .7, ease: 'power2.inOut' }, .7 + i * .045);
      });
      tl.to(q('#sc-strip'), { opacity: 0, scaleX: .2, transformOrigin: '50% 50%', duration: .6 }, .8);
      tl.to(q('#sc-bands'), { opacity: 1, duration: .4 }, 1.2);
      tl.to(q('#sc-read'), { opacity: 1, duration: .3 }, 1.65);
      tl.from(q('#sc-b'), { scale: 0, transformOrigin: '1010px 430px', duration: .35, ease: 'back.out(2)' }, 1.75);
    },
    beats: [0.7, 1.9],
    speech: [['Б', 'Двадцать пять веков назад спартанцы наматывали ленту на палку. Снимешь ленту и увидишь кашу из букв. Прочтёт только тот, у кого палка такой же толщины.']]
  });

  // 2 — ГАЛЛИЯ, ЗАСАДА
  S.push({
    id: 'gaul', len: 2.4, place: 'ГАЛЛИЯ', year: -58, filter: 'engV', enter: [72, 30],
    art() {
      const cz = A.caesar('translate(470,640) scale(.6)');
      const ms = A.messenger('translate(800,880) scale(.95)');
      const b1 = A.bush(1180, 800, 1, 'eyes1'), b2 = A.bush(1380, 760, .9), b3 = A.bush(1010, 860, .8);
      return {
        col: `<rect ${A.BG} fill="#fff"/><circle cx="1200" cy="300" r="210" fill="${C.red}"/>
              <path d="M250,860 L470,330 L700,860Z" fill="${C.red}"/>${cz.col}${ms.col}`,
        ink: `${A.inkBase()}
              <path d="M-700,700 C-200,620 300,660 700,700 C1100,740 1500,640 2300,660 V1800 H-700Z" fill="#b0b0b0"/>
              <rect x="-700" y="820" width="3000" height="900" fill="url(#gFadeUp)"/>
              <path d="M880,1000 C900,900 1000,820 1250,760 L1300,770 C1080,840 1000,920 1010,1000Z" fill="#fff"/>
              ${A.tree(1250, 760, 1)}${A.tree(1420, 720, .85)}${A.tree(1530, 780, 1.1)}${A.tree(1080, 760, .7)}
              <path d="M250,860 L470,330 L700,860Z" fill="url(#gCylV)" opacity=".55"/>
              <path d="M470,330 L400,860 L540,860Z" fill="#050505"/>
              ${cz.ink}${b3.ink}${b1.ink}${b2.ink}${ms.ink}`,
        top: `${cz.top}${b3.top}${b1.top}${b2.top}
              ${A.bubble({ id: 'g-b', x: 520, y: 150, w: 520, lines: ['Если гонца перехватят,', 'они прочтут всё!'], tail: [540, 600], who: 'ЦЕЗАРЬ' })}`
      };
    },
    ui: cap('Галлия · 58 год до н. э.',
      'Юлий Цезарь воюет в Галлии. Письма везут гонцы через леса, а в лесах ждут засады. Перехватят письмо, и враг узнает план.'),
    build(tl, q) {
      tl.fromTo(q('#g-b'), { scale: 0, transformOrigin: '540px 600px' }, { scale: 1, duration: .35, ease: 'back.out(2)' }, .7);
      tl.to(q('.cam'), { x: -260, y: -60, scale: 1.18, transformOrigin: '75% 75%', duration: 1, ease: 'power2.inOut' }, 1.3);
      tl.to(q('#g-b'), { opacity: 0, duration: .3 }, 1.4);
    },
    init(q) {
      q('.blink', true).forEach((e, i) => gsap.to(e, { scaleY: .1, transformOrigin: '50% 50%', duration: .08, yoyo: true, repeat: -1, repeatDelay: 2.2 + i * .7, ease: 'none' }));
    },
    beats: [0.9, 2.1],
    speech: [['А', '58 год до нашей эры. Юлий Цезарь воюет в Галлии. Его гонцы скачут через леса, а в лесах засады. Перехватят письмо, и враг узнает план.']]
  });

  // 3 — ИДЕЯ: СДВИГ НА ТРИ
  S.push({
    id: 'idea', len: 3, place: 'ЛАГЕРЬ ЦЕЗАРЯ', year: -58, filter: 'engV', enter: [32, 18],
    art() {
      const cz = A.caesar('translate(420,580) scale(1.15)');
      let row1 = '', row2 = '';
      for (let i = 0; i < 8; i++) row1 += `<text x="${745 + i * 70}" y="395" font-family="PT Mono" font-size="48" text-anchor="middle" fill="#111">${LAT[i]}</text>`;
      for (let i = 0; i < 40; i++) row2 += `<text x="${745 + i * 70}" y="520" font-family="PT Mono" font-size="48" text-anchor="middle" fill="${C.red}" font-weight="700">${LAT[i % 26]}</text>`;
      let arrows = '';
      for (let i = 0; i < 8; i++) arrows += `<path d="M${745 + i * 70},412 V470 M${735 + i * 70},458 L${745 + i * 70},472 L${755 + i * 70},458" stroke="#111" stroke-width="3" fill="none"/>`;
      let rays = '';
      for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; rays += `<path d="M${560 + Math.cos(a) * 95},${170 + Math.sin(a) * 95} L${560 + Math.cos(a) * 150},${170 + Math.sin(a) * 150}" stroke="#000" stroke-width="10" stroke-linecap="round"/>`; }
      return {
        defs: `<clipPath id="i-win"><rect x="705" y="460" width="560" height="80"/></clipPath>`,
        col: `<rect ${A.BG} fill="${C.red}"/><circle id="i-glow" cx="560" cy="170" r="120" fill="${C.yellow}" opacity="0"/>
              <rect x="690" y="300" width="590" height="300" fill="${C.cream}"/>${cz.col}`,
        ink: `${A.inkBase()}<rect x="-700" y="820" width="3000" height="900" fill="#555"/>
              <rect x="690" y="300" width="590" height="300" fill="#fff"/>
              <rect x="690" y="300" width="590" height="300" fill="none" stroke="#111" stroke-width="10"/>
              <rect x="660" y="600" width="660" height="30" fill="url(#gCylH)"/>
              ${cz.ink}
              <g id="i-bulb"><circle cx="560" cy="170" r="62" fill="#ddd"/><rect x="535" y="225" width="50" height="40" fill="#333"/>
              <path d="M540,190 L540,160 L550,145 L560,165 L570,145 L580,160 L580,190" stroke="#000" stroke-width="5" fill="none"/>
              <g id="i-rays" opacity="0">${rays}</g></g>`,
        top: `${cz.top}${row1}<g id="i-arrows" opacity="0">${arrows}</g>
              <g clip-path="url(#i-win)"><g id="i-row2">${row2}</g></g>
              <text id="i-form" x="985" y="580" font-family="PT Mono" font-size="28" text-anchor="middle" fill="#111">y = (x + 0) mod 26</text>
              ${A.bubble({ id: 'i-b', x: 690, y: 680, w: 600, lines: ['Сдвинем каждую букву', 'на три: A → D, B → E…'], tail: [560, 640], who: 'ЦЕЗАРЬ' })}`
      };
    },
    ui: cap('Лагерь Цезаря',
      'Цезарь решает: пусть каждая буква уйдёт на три позиции вперёд по алфавиту. Метод простой, а ключ один: число 3.',
      note('* Лампочку изобретут только через 1900 лет. Изобретения от этого не перестали приходить в голову.')) +
      `<div class="panel" id="p-idea"><p class="panel-k">Попробуй сам</p>
        <label class="row">Сдвиг <input type="range" min="1" max="25" value="3" id="i-shift"><output id="i-shiftv">3</output></label>
        <label class="row">Слово <input type="text" id="i-word" value="ATTACK" maxlength="24" autocomplete="off" spellcheck="false"></label>
        <p class="out" id="i-out">DWWDFN</p></div>`,
    build(tl, q, s) {
      const st = { k: 0 };
      s.render = k => {
        gsap.set(q('#i-row2'), { x: -k * 70 });
        q('#i-form').textContent = `y = (x + ${Math.round(k)}) mod 26`;
      };
      tl.to(q('#i-glow'), { opacity: .9, duration: .2 }, .6);
      tl.to(q('#i-rays'), { opacity: 1, duration: .2 }, .6);
      tl.fromTo(q('#i-rays'), { scale: .6, transformOrigin: '560px 170px' }, { scale: 1, duration: .4, ease: 'back.out(3)' }, .6);
      tl.to(q('#i-arrows'), { opacity: 1, duration: .2 }, .9);
      tl.to(st, { k: 3, duration: .9, ease: 'steps(3)', onUpdate: () => s.render(st.k) }, 1.0);
      tl.fromTo(q('#i-b'), { scale: 0, transformOrigin: '560px 640px' }, { scale: 1, duration: .35, ease: 'back.out(2)' }, 1.2);
      tl.fromTo(q('.cam'), { scale: 1 }, { scale: 1.05, transformOrigin: '60% 45%', duration: 3, ease: 'none' }, 0);
      tl.fromTo(q('#p-idea'), { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: .3 }, 1.55);
    },
    init(q, s) {
      const sh = q('#i-shift'), w = q('#i-word'), o = q('#i-out'), v = q('#i-shiftv');
      const up = () => { const k = +sh.value; v.textContent = k; o.textContent = shiftText(w.value, k); s.render(k); window.SFX && SFX.tick(); };
      sh.addEventListener('input', up); w.addEventListener('input', up);
    },
    beats: [0.7, 1.95],
    speech: [['Б', 'Цезарь придумал простую вещь: сдвинуть каждую букву на три позиции. A становится D, B становится E. Математик запишет это формулой: игрек равен икс плюс три по модулю двадцать шесть.']]
  });

  // 4 — СВИТОК
  S.push({
    id: 'scroll', focus: [130, 1440], len: 2.2, place: 'ЛАГЕРЬ ЦЕЗАРЯ', year: -58, filter: 'engV', enter: [50, 50],
    art() {
      const cz = A.caesar('translate(1360,860) scale(.7)');
      let letters = '';
      'DWWDFN'.split('').forEach((ch, i) => letters += `<text class="s-l" x="${600 + i * 80}" y="485" font-family="Cinzel, serif" font-size="110" font-weight="700" text-anchor="middle" fill="#111">${ch}</text>`);
      return {
        defs: `<clipPath id="s-clip"><rect id="s-cr" x="800" y="240" width="0" height="420"/></clipPath>`,
        col: `<rect ${A.BG} fill="#fff"/><g clip-path="url(#s-clip)"><rect x="440" y="250" width="720" height="400" fill="${C.cream}"/></g>${cz.col}`,
        ink: `${A.inkBase()}<rect ${A.BG} fill="#707070"/>
              <g clip-path="url(#s-clip)"><rect x="440" y="250" width="720" height="400" fill="#fff"/>
              <path d="M470,560 H1130" stroke="#bbb" stroke-width="3"/></g>
              <g id="s-rl"><rect x="770" y="225" width="44" height="450" rx="18" fill="url(#gCylV)"/></g>
              <g id="s-rr"><rect x="786" y="225" width="44" height="450" rx="18" fill="url(#gCylV)"/></g>
              <g transform="translate(240,900) scale(.9)"><circle cx="0" cy="-130" r="70" fill="#2a2a2a"/><path d="M-76,-140 C-76,-240 76,-240 80,-140Z" fill="#000"/><path d="M-120,0 C-110,-60 110,-60 120,0Z" fill="#444"/></g>
              ${cz.ink}`,
        top: `<g clip-path="url(#s-clip)">${letters}
              <g id="s-seal"><circle cx="1050" cy="590" r="44" fill="${C.red}" stroke="#111" stroke-width="4"/>
              <text x="1050" y="600" font-family="Cinzel, serif" font-size="24" font-weight="700" text-anchor="middle" fill="#111">SPQR</text></g></g>
              ${cz.top}
              ${A.bubble({ id: 's-b1', x: 150, y: 690, w: 460, lines: ['Это что,', 'имя варвара?'], tail: [260, 830], who: 'ГОНЕЦ' })}
              ${A.bubble({ id: 's-b2', x: 820, y: 690, w: 470, lines: ['Это ATTACK.', 'Атакуем на рассвете.'], tail: [1330, 860], who: 'ЦЕЗАРЬ' })}`
      };
    },
    ui: cap('Свиток уходит к легату',
      'Слово ATTACK превращается в DWWDFN. Каждая буква сдвинута на три: A→D, T→W, C→F, K→N.',
      note('* Цезарь писал по-латыни. Мы перевели слово на английский, чтобы сдвиг было видно.')),
    build(tl, q) {
      tl.to(q('#s-cr'), { attr: { x: 440, width: 720 }, duration: .7, ease: 'power2.inOut' }, .05);
      tl.to(q('#s-rl'), { x: -350, duration: .7, ease: 'power2.inOut' }, .05);
      tl.to(q('#s-rr'), { x: 344, duration: .7, ease: 'power2.inOut' }, .05);
      tl.from(q('.s-l', true), { y: -40, opacity: 0, duration: .25, stagger: .07, ease: 'back.out(3)' }, .7);
      tl.from(q('#s-seal'), { scale: 2.5, opacity: 0, transformOrigin: '1050px 590px', duration: .25, ease: 'power3.in' }, 1.15);
      tl.fromTo(q('#s-b1'), { scale: 0, transformOrigin: '260px 830px' }, { scale: 1, duration: .3, ease: 'back.out(2)' }, 1.25);
      tl.fromTo(q('#s-b2'), { scale: 0, transformOrigin: '1330px 860px' }, { scale: 1, duration: .3, ease: 'back.out(2)' }, 1.6);
      tl.fromTo(q('.cam'), { scale: 1.04 }, { scale: 1, transformOrigin: '50% 45%', duration: 2.2, ease: 'none' }, 0);
    },
    beats: [0.8, 1.3, 1.75],
    speech: [['А', 'Слово ATTACK превращается в DWWDFN. Гонец решил, что это имя варвара.']]
  });

  // 5 — ВРАГ И СВИТОК (HOLD)
  S.push({
    id: 'enemy', focus: [370, 1470], len: 2.6, place: 'ЛЕС У ДОРОГИ', year: -58, filter: 'engV', enter: [50, 55],
    art() {
      const g = A.gaul('translate(800,430)');
      let L = '';
      'DWWDFN'.split('').forEach((ch, i) => L += `<text class="e-l" x="${640 + i * 64}" y="745" font-family="Cinzel, serif" font-size="62" font-weight="700" text-anchor="middle" fill="#111">${ch}</text>`);
      return {
        col: `<rect ${A.BG} fill="${C.red}"/>${g.col}<rect x="590" y="680" width="420" height="100" fill="${C.cream}"/>`,
        ink: `${A.inkBase()}<rect x="-700" y="-700" width="3000" height="1300" fill="url(#gFadeDown)"/>
              ${A.tree(250, 900, 1.6)}${A.tree(1380, 900, 1.5)}${A.tree(1530, 860, 1.1)}
              ${g.ink}
              <g id="e-arm" transform="translate(0,-90)"><path d="M-170,170 L-150,-10" stroke="#5a5a5a" stroke-width="56" stroke-linecap="round"/>
                <g id="e-fore"><path d="M-150,-10 L-80,-120" stroke="#777" stroke-width="48" stroke-linecap="round"/><circle cx="-74" cy="-130" r="34" fill="#9a9a9a"/></g></g>
              <rect x="590" y="680" width="420" height="100" fill="#fff"/>
              <rect x="570" y="670" width="26" height="120" rx="10" fill="url(#gCylV)"/><rect x="1004" y="670" width="26" height="120" rx="10" fill="url(#gCylV)"/>
              <circle cx="575" cy="740" r="38" fill="#888"/><circle cx="1025" cy="740" r="38" fill="#888"/>`,
        top: `${g.top}${L}
              <g id="e-q"><text x="640" y="230" font-family="Oswald" font-weight="700" font-size="90" fill="#111">?</text>
              <text x="560" y="160" font-family="Oswald" font-weight="700" font-size="60" fill="#fff">?</text>
              <text x="960" y="200" font-family="Oswald" font-weight="700" font-size="74" fill="#111">?</text></g>
              ${A.bubble({ id: 'e-b', x: 930, y: 90, w: 470, lines: ['Набор букв…', 'Наверное, проклятие?'], tail: [880, 340], who: 'ГАЛЛ' })}
              ${A.bubble({ id: 'e-b2', x: 930, y: 90, w: 470, lines: ['ATTACK?!', 'Бегу к вождю!'], tail: [880, 340], who: 'ГАЛЛ', fill: C.yellow })}`
      };
    },
    ui: cap('Лес у дороги',
      'Гонца перехватили. Галл держит свиток и ничего не понимает: метода он не знает, а по-латыни читает не каждый воин.',
      note('Светоний описал этот шифр в «Жизни двенадцати цезарей»: «...заменял первую букву четвёртой, то есть A на D».')) +
      `<div class="panel panel-hold" id="p-hold"><button class="hold" id="holdBtn" aria-label="Держи, чтобы расшифровать">
        <svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="54" class="hold-bg"/><circle cx="60" cy="60" r="54" class="hold-ring" id="holdRing"/></svg>
        <span>ДЕРЖИ,<br>чтобы<br>прочесть</span></button>
        <p class="panel-tip">Зажми кнопку: буквы поедут назад на три шага.</p></div>`,
    build(tl, q) {
      tl.fromTo(q('#e-b'), { scale: 0, transformOrigin: '880px 340px' }, { scale: 1, duration: .3, ease: 'back.out(2)' }, .9);
      tl.fromTo(q('#p-hold'), { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: .3 }, 1.2);
      tl.fromTo(q('.cam'), { scale: 1.08 }, { scale: 1, transformOrigin: '50% 45%', duration: 2.6, ease: 'none' }, 0);
    },
    init(q) {
      gsap.set(q('#e-b2'), { opacity: 0 });
      gsap.to(q('#e-fore'), { rotation: -14, svgOrigin: '-150 -10', duration: .18, yoyo: true, repeat: -1, ease: 'sine.inOut' });
      gsap.to(q('#e-q').children, { y: -14, duration: .6, yoyo: true, repeat: -1, stagger: .2, ease: 'sine.inOut' });
      const ring = q('#holdRing'), btn = q('#holdBtn'), Ls = q('.e-l', true);
      const len = 2 * Math.PI * 54; ring.style.strokeDasharray = len; ring.style.strokeDashoffset = len;
      const p = { v: 0 }; let done = false;
      const render = () => {
        ring.style.strokeDashoffset = len * (1 - p.v);
        const k = Math.min(3, Math.floor(p.v * 3.999));
        const word = shiftText('DWWDFN', -k);
        Ls.forEach((t, i) => t.textContent = word[i]);
        if (!done && p.v >= 1) {
          done = true; window.SFX && SFX.win();
          Ls.forEach(t => t.setAttribute('fill', C.ink));
          gsap.to(q('#e-b'), { opacity: 0, duration: .2 });
          gsap.fromTo(q('#e-b2'), { opacity: 0, scale: .4, transformOrigin: '880px 340px' }, { opacity: 1, scale: 1, duration: .35, ease: 'back.out(2)' });
          gsap.fromTo(Ls, { y: -12 }, { y: 0, duration: .4, stagger: .05, ease: 'bounce.out' });
          btn.classList.add('ok'); btn.querySelector('span').innerHTML = 'ATTACK';
        }
      };
      let tw;
      const start = e => { e.preventDefault(); if (done) return; tw && tw.kill(); window.SFX && SFX.tick(); tw = gsap.to(p, { v: 1, duration: 1.6 * (1 - p.v), ease: 'none', onUpdate: render }); };
      const stop = () => { if (done) return; tw && tw.kill(); tw = gsap.to(p, { v: 0, duration: .5 * p.v, ease: 'power1.out', onUpdate: render }); };
      btn.addEventListener('pointerdown', start);
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => btn.addEventListener(ev, stop));
      btn.addEventListener('keydown', e => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) start(e); });
      btn.addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Enter') stop(); });
    },
    beats: [0.95, 1.6],
    speech: [['Б', 'А враг решил, что это проклятие. Против противника, который не знает метода, такой шифр работал как каменная стена.']]
  });

  // 6 — БАГДАД, АЛЬ-КИНДИ
  const KINDI_PLAIN = 'ВОЙСКО ОБОЙДЁТ ХОЛМ С ЗАПАДА И ОКРУЖИТ ЛАГЕРЬ ВРАГА. ОТРЯД КОННИЦЫ ПОЙДЁТ ВДОЛЬ РЕКИ И ПЕРЕКРОЕТ БРОД. ОГОНЬ ПО СИГНАЛУ С ХОЛМА';
  const KINDI_CIPHER = shiftText(KINDI_PLAIN, 3);
  S.push({
    id: 'kindi', focus: [380, 1320], len: 3, place: 'БАГДАД', year: 850, yearText: 'IX век', filter: 'engV', enter: [50, 40],
    art() {
      const k = A.kindi('translate(600,560) scale(.95)');
      const arch = 'M840,800 V380 C840,170 960,110 1020,110 C1080,110 1200,170 1200,380 V800Z';
      let stars = '';
      [[900, 300], [960, 220], [1100, 260], [1150, 360], [1020, 330], [930, 420], [1110, 470]].forEach(([x, y], i) => stars += `<circle class="k-star" cx="${x}" cy="${y}" r="${4 + i % 3}" fill="#fff"/>`);
      return {
        col: `<rect ${A.BG} fill="#fff"/><path d="${arch}" fill="${C.red}"/>
              <circle cx="1020" cy="250" r="70" fill="#fff"/>
              ${k.col}<ellipse id="k-flame" cx="1260" cy="700" rx="16" ry="30" fill="${C.yellow}"/><circle cx="1260" cy="700" r="80" fill="${C.yellow}" opacity=".35" id="k-glow"/>
              <rect x="900" y="760" width="220" height="40" fill="#fff"/>`,
        ink: `${A.inkBase()}<rect ${A.BG} fill="#a4a4a4"/>
              <path d="${arch}" fill="#fff"/><circle cx="1020" cy="250" r="70" fill="#fff"/>
              <path d="M1020,180 A70,70 0 1,0 1020,320 A54,54 0 1,1 1020,180Z" fill="#9a9a9a"/>
              <path d="${arch}" fill="none" stroke="#000" stroke-width="22"/>
              <path d="M810,800 V360 C810,140 950,80 1020,80 C1090,80 1230,140 1230,360 V800" fill="none" stroke="#fff" stroke-width="8"/>
              <rect x="-700" y="800" width="3000" height="900" fill="url(#gFadeUp)"/>
              <rect x="800" y="790" width="520" height="34" fill="#111"/><rect x="820" y="820" width="20" height="120" fill="#111"/><rect x="1280" y="820" width="20" height="120" fill="#111"/>
              <rect x="900" y="760" width="220" height="40" fill="#fff"/>
              <path d="M1230,735 C1230,760 1290,760 1290,735 L1280,725 H1240Z" fill="#222"/>
              ${k.ink}`,
        top: `${stars}
              <text x="1010" y="786" font-family="PT Mono" font-size="17" text-anchor="middle" fill="#111">С—14 Р—9 Ж—7</text>
              <g id="k-stamp"><rect x="430" y="380" width="740" height="150" fill="#111" transform="rotate(-6 800 455)"/>
              <text x="800" y="490" font-family="Oswald" font-weight="700" font-size="92" text-anchor="middle" fill="#fff" transform="rotate(-6 800 455)">ПРОШЛО 900 ЛЕТ</text></g>
              ${A.bubble({ id: 'k-b', x: 470, y: 120, w: 540, lines: ['Самая частая буква шифровки', 'это самая частая буква языка!'], tail: [640, 400], who: 'АЛЬ-КИНДИ', fs: 31 })}`
      };
    },
    ui: cap('Багдад · IX век · Дом мудрости',
      'Арабский учёный <b>аль-Кинди</b> пишет первый известный трактат о взломе шифров. Его открытие: в любом языке одни буквы встречаются чаще других. В арабском лидирует алиф, в английском E, в русском О.',
      note('Это частотный анализ: статистика против тайнописи.')) +
      `<div class="panel panel-wide" id="p-kindi"><p class="panel-k">Взломай сам: нажми на самый высокий столбик, это О</p>
        <p class="ctext" id="k-text">${KINDI_CIPHER}</p>
        <div class="bars" id="k-bars"></div>
        <p class="panel-tip" id="k-msg">Под столбиком буква шифровки и сколько раз она встретилась.</p></div>`,
    build(tl, q) {
      tl.fromTo(q('#k-stamp'), { scale: 2, opacity: 0, transformOrigin: '800px 455px' }, { scale: 1, opacity: 1, duration: .25, ease: 'power3.in' }, .45);
      tl.to(q('#k-stamp'), { opacity: 0, y: -40, duration: .3 }, 1.0);
      tl.fromTo(q('#k-b'), { scale: 0, transformOrigin: '640px 400px' }, { scale: 1, duration: .3, ease: 'back.out(2)' }, 1.2);
      tl.fromTo(q('#p-kindi'), { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: .3 }, 1.5);
      tl.fromTo(q('.k-bar i', true), { scaleY: 0 }, { scaleY: 1, duration: .4, stagger: .02, ease: 'power2.out' }, 1.55);
      tl.fromTo(q('.cam'), { scale: 1 }, { scale: 1.07, transformOrigin: '40% 55%', duration: 3, ease: 'none' }, 0);
    },
    init(q) {
      gsap.to(q('#k-flame'), { scaleY: 1.25, scaleX: .85, transformOrigin: '50% 100%', duration: .15, yoyo: true, repeat: -1, ease: 'sine.inOut' });
      gsap.to(q('#k-glow'), { opacity: .2, duration: .4, yoyo: true, repeat: -1, ease: 'sine.inOut' });
      const cnt = {};
      for (const ch of KINDI_CIPHER) if (RUS.includes(ch)) cnt[ch] = (cnt[ch] || 0) + 1;
      const top = Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 12);
      const max = top[0][1];
      const bars = q('#k-bars');
      bars.innerHTML = top.map(([ch, n]) => `<button class="k-bar" data-ch="${ch}" style="--h:${n / max}"><i></i><b>${ch}</b><small>${n}</small></button>`).join('');
      bars.addEventListener('click', e => {
        const b = e.target.closest('.k-bar'); if (!b) return;
        bars.querySelectorAll('.k-bar').forEach(x => x.classList.remove('on'));
        b.classList.add('on');
        const k = (RUS.indexOf(b.dataset.ch) - RUS.indexOf('О') + 33) % 33;
        q('#k-text').textContent = shiftText(KINDI_CIPHER, -k);
        const ok = k === 3;
        q('#k-msg').innerHTML = ok
          ? `<b>Ключ найден: 3.</b> Буква ${b.dataset.ch} оказалась буквой О, и весь текст стал читаемым.`
          : `Если ${b.dataset.ch} — это О, то ключ ${k}. Текст не читается. Попробуй столбик выше.`;
        q('#k-text').classList.toggle('ok', ok);
        window.SFX && (ok ? SFX.win() : SFX.tick());
      });
    },
    beats: [0.85, 1.3, 2.25],
    speech: [['А', 'Стена простояла девять веков. В Багдаде учёный аль-Кинди заметил: в любом языке одни буквы встречаются чаще других. В русском лидирует О, в английском E. Посчитай буквы в шифровке, и самая частая выдаст ключ.']]
  });

  // 7 — ПЕРЕБОР
  S.push({
    id: 'brute', len: 2.2, place: 'ЛАГЕРЬ ГАЛЛОВ', year: -58, yearText: 'а можно проще', filter: 'engV', enter: [40, 70],
    art() {
      const g = A.gaul('translate(560,560) scale(.95)');
      return {
        col: `<rect ${A.BG} fill="${C.red}"/>${g.col}<ellipse id="b-flame" cx="930" cy="640" rx="18" ry="36" fill="${C.yellow}"/>
              <circle cx="930" cy="640" r="140" fill="${C.yellow}" opacity=".25"/>`,
        ink: `${A.inkBase()}<rect ${A.BG} fill="#a8a8a8"/><circle cx="930" cy="640" r="220" fill="url(#gGlow)"/>
              ${g.ink}<rect x="300" y="820" width="900" height="60" fill="#222"/>
              <rect x="912" y="676" width="36" height="150" fill="#ddd"/>`,
        top: `${g.top}
              ${A.bubble({ id: 'b-b', x: 520, y: 100, w: 500, lines: ['Всего 25 вариантов.', 'Проверю все за вечер.'], tail: [600, 420], who: 'ГАЛЛ' })}`
      };
    },
    ui: cap('Тем же вечером',
      'У шифра Цезаря всего 25 ключей. Перебор вручную займёт вечер, компьютер справится за микросекунду.') +
      `<div class="panel" id="p-brute"><p class="panel-k">Перебор ключей для DWWDFN</p>
        <div class="slot"><ol id="b-list"></ol></div><p class="stamp" id="b-stamp">НАШЁЛ С ТРЕТЬЕЙ ПОПЫТКИ</p></div>`,
    build(tl, q, s) {
      const st = { i: 0 };
      tl.fromTo(q('#b-b'), { scale: 0, transformOrigin: '600px 420px' }, { scale: 1, duration: .3, ease: 'back.out(2)' }, .6);
      tl.fromTo(q('#p-brute'), { autoAlpha: 0, x: 40 }, { autoAlpha: 1, x: 0, duration: .3 }, .6);
      tl.to(st, { i: 2, duration: .8, ease: 'none', onUpdate: () => s.setRow(st.i) }, 1.0);
      tl.fromTo(q('#b-stamp'), { autoAlpha: 0, scale: 2.4 }, { autoAlpha: 1, scale: 1, duration: .2, ease: 'power3.in' }, 1.85);
      tl.fromTo(q('.cam'), { scale: 1 }, { scale: 1.06, transformOrigin: '40% 50%', duration: 2.2, ease: 'none' }, 0);
    },
    init(q, s) {
      gsap.to(q('#b-flame'), { scaleY: 1.2, scaleX: .85, transformOrigin: '50% 100%', duration: .17, yoyo: true, repeat: -1 });
      const ol = q('#b-list');
      for (let k = 1; k <= 25; k++) { const w = shiftText('DWWDFN', -k); ol.insertAdjacentHTML('beforeend', `<li class="${k === 3 ? 'hit' : ''}"><span>${k}</span>${w}</li>`); }
      s.setRow = i => {
        const n = Math.round(i);
        gsap.set(ol, { y: -n * 36 });
        ol.querySelectorAll('li').forEach((li, j) => li.classList.toggle('cur', j === n));
      };
      s.setRow(0);
    },
    beats: [0.95, 2.15],
    speech: [['Б', 'А можно и проще. У Цезаря всего двадцать пять ключей. Перебрать их можно за один вечер.']]
  });

  // 8 — ВИЖЕНЕР
  S.push({
    id: 'vigenere', focus: [230, 1330], len: 2.4, place: 'ИТАЛИЯ И ФРАНЦИЯ', year: 1553, filter: 'engD', enter: [65, 45],
    art() {
      const r = A.ruff('translate(480,560) scale(1)');
      let grid = '';
      for (let y = 0; y < 13; y++) for (let x = 0; x < 9; x++) {
        const ch = LAT[(x + y) % 26];
        grid += `<text class="v-g" x="${880 + x * 50}" y="${200 + y * 48}" font-family="PT Mono" font-size="34" text-anchor="middle" fill="${(x === 2 || y === 4) ? C.red : '#111'}" ${(x === 2 || y === 4) ? 'font-weight="700"' : ''}>${ch}</text>`;
      }
      return {
        col: `<rect ${A.BG} fill="#fff"/><rect x="840" y="150" width="480" height="650" fill="${C.cream}"/>${r.col}`,
        ink: `${A.inkBase()}<rect ${A.BG} fill="#c4c4c4"/><rect x="840" y="150" width="480" height="650" fill="#fff"/>
              <rect x="840" y="150" width="480" height="650" fill="none" stroke="#111" stroke-width="8"/>
              <rect x="-700" y="860" width="3000" height="900" fill="#444"/>${r.ink}`,
        top: `${grid}<rect x="955" y="167" width="50" height="626" fill="none" stroke="${C.red}" stroke-width="4"/><rect x="855" y="358" width="450" height="48" fill="none" stroke="${C.red}" stroke-width="4"/>
              ${A.bubble({ id: 'v-b', x: 250, y: 300, w: 560, lines: ['Ключом будет целое слово.', 'Каждая буква сдвигается по-своему!'], tail: [560, 470], who: 'БЕЛАЗО', fs: 30 })}`
      };
    },
    ui: cap('1553 год · Возрождение',
      'Итальянец Джован Баттиста Белазо делает ключом слово. Позже шифр припишут французу Блезу де Виженеру. Буква A превращается то в R, то в A: частоты смешиваются, и метод аль-Кинди не срабатывает.',
      note('Шифр прозвали «неразгаданным». Его вскрыл Фридрих Касиски в 1863 году, через 300 лет.')) +
      `<div class="panel" id="p-vig"><p class="panel-k">Шифр Виженера</p>
        <label class="row">Ключ <input type="text" id="v-key" value="ROMA" maxlength="12" autocomplete="off" spellcheck="false"></label>
        <label class="row">Текст <input type="text" id="v-txt" value="ATTACK AT DAWN" maxlength="28" autocomplete="off" spellcheck="false"></label>
        <div class="vtab" id="v-tab"></div></div>`,
    build(tl, q) {
      tl.from(q('.v-g', true), { opacity: 0, duration: .2, stagger: { each: .004, from: 'random' } }, .15);
      tl.fromTo(q('#v-b'), { scale: 0, transformOrigin: '560px 470px' }, { scale: 1, duration: .3, ease: 'back.out(2)' }, .9);
      tl.fromTo(q('#p-vig'), { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: .3 }, 1.25);
      tl.fromTo(q('.cam'), { scale: 1.06, x: -20 }, { scale: 1, x: 0, transformOrigin: '50% 50%', duration: 2.4, ease: 'none' }, 0);
    },
    init(q) {
      const key = q('#v-key'), txt = q('#v-txt'), tab = q('#v-tab');
      const up = () => {
        const k = key.value.toUpperCase().replace(/[^A-Z]/g, '') || 'A';
        let j = 0, rows = ['', '', ''];
        for (const ch of txt.value.toUpperCase()) {
          if (!LAT.includes(ch)) { rows[0] += `<span>${ch === ' ' ? '&nbsp;' : ch}</span>`; rows[1] += '<span>&nbsp;</span>'; rows[2] += `<span>${ch === ' ' ? '&nbsp;' : ch}</span>`; continue; }
          const s = LAT.indexOf(k[j % k.length]);
          rows[0] += `<span>${ch}</span>`; rows[1] += `<span class="sh">+${s}</span>`; rows[2] += `<span class="c">${LAT[(LAT.indexOf(ch) + s) % 26]}</span>`; j++;
        }
        tab.innerHTML = `<div class="vr">${rows[0]}</div><div class="vr sm">${rows[1]}</div><div class="vr">${rows[2]}</div>`;
        window.SFX && SFX.tick();
      };
      key.addEventListener('input', up); txt.addEventListener('input', up); up();
    },
    beats: [0.95, 1.6],
    speech: [['А', 'Тогда в эпоху Возрождения ключом сделали целое слово. Каждая буква сдвигается по-своему, и частотный анализ слепнет. Триста лет этот шифр называли неразгаданным.']]
  });

  // 9 — ЭНИГМА
  const ROWS = ['QWERTZUIO', 'ASDFGHJK', 'PYXCVBNML'];
  S.push({
    id: 'enigma', focus: [400, 1630], len: 3, place: 'БЛЕТЧЛИ-ПАРК', year: 1940, filter: 'engV', enter: [50, 30],
    art() {
      const t = A.turing('translate(1390,620) scale(.85)');
      let lamps = '', keys = '', lampsCol = '';
      ROWS.forEach((r, ri) => [...r].forEach((ch, i) => {
        const x = 800 - (r.length - 1) * 31 + i * 62;
        lampsCol += `<circle cx="${x}" cy="${430 + ri * 58}" r="24" fill="#fff"/>`;
        lamps += `<g class="lamp" data-k="${ch}"><circle cx="${x}" cy="${430 + ri * 58}" r="24" fill="${C.yellow}" opacity="0"/><text x="${x}" y="${441 + ri * 58}" font-family="PT Mono" font-size="28" text-anchor="middle" fill="#111">${ch}</text></g>`;
        keys += `<g class="key" data-k="${ch}" role="button" tabindex="-1"><circle cx="${x}" cy="${660 + ri * 66}" r="27" fill="#111" stroke="#fff" stroke-width="3"/><text x="${x}" y="${671 + ri * 66}" font-family="PT Mono" font-size="28" text-anchor="middle" fill="#fff" pointer-events="none">${ch}</text></g>`;
      }));
      let rot = '';
      [690, 800, 910].forEach((x, i) => rot += `<rect x="${x - 26}" y="252" width="52" height="56" fill="#fff" stroke="#111" stroke-width="4"/><text class="rot" x="${x}" y="294" font-family="PT Mono" font-size="38" font-weight="700" text-anchor="middle" fill="#111">A</text>`);
      return {
        col: `<rect ${A.BG} fill="${C.red}"/><rect x="460" y="220" width="680" height="700" rx="10" fill="${C.cream}"/>${lampsCol}${t.col}`,
        ink: `${A.inkBase()}<rect x="-700" y="-700" width="3000" height="1500" fill="url(#gFadeDown)" opacity=".75"/>
              <rect x="430" y="190" width="740" height="760" rx="14" fill="url(#gWood)"/>
              <rect x="470" y="230" width="660" height="680" fill="#e2e2e2"/>
              <rect x="470" y="600" width="660" height="20" fill="#333"/>
              <rect x="640" y="236" width="40" height="88" fill="url(#gCylV)"/><rect x="750" y="236" width="40" height="88" fill="url(#gCylV)"/><rect x="860" y="236" width="40" height="88" fill="url(#gCylV)"/>
              <rect x="912" y="236" width="20" height="88" fill="url(#gCylV)"/><rect x="802" y="236" width="20" height="88" fill="url(#gCylV)"/><rect x="692" y="236" width="20" height="88" fill="url(#gCylV)"/>
              ${lampsCol.replace(/fill="#fff"/g, 'fill="#fff" stroke="#111" stroke-width="4"')}
              ${t.ink}`,
        top: `${rot}${lamps}${keys}${t.top}
              ${A.bubble({ id: 'n-b', x: 1130, y: 100, w: 440, lines: ['159 квинтиллионов', 'настроек? Пусть ищет', 'машина.'], tail: [1340, 450], who: 'ТЬЮРИНГ', fs: 30 })}`
      };
    },
    ui: cap('1940-е · Вторая мировая',
      'Германия шифрует приказы машиной «Энигма». Польский математик Мариан Реевский вскрыл её ранние версии ещё в 1932 году. Алан Тьюринг в Блетчли-парке построил «Бомбу», машину для поиска ключей.',
      note('Слабость Энигмы: буква никогда не шифруется сама в себя. Проверь на клавиатуре ниже.')) +
      `<div class="panel" id="p-enig"><p class="panel-k">Нажимай клавиши Энигмы (или печатай)</p>
        <p class="tape"><span>ВВОД</span><b id="n-in">—</b></p><p class="tape"><span>ВЫХОД</span><b id="n-out">—</b></p>
        <p class="panel-tip">Нажми одну букву несколько раз: роторы провернутся, и ответ каждый раз другой. Настоящая схема: роторы I, II, III, рефлектор B.</p>
        <button class="btn btn-sm" id="n-reset">Сбросить на AAA</button></div>`,
    build(tl, q, s) {
      const st = { k: 0 };
      tl.to(st, { k: 26 * 3, duration: 1.2, ease: 'power2.out', onUpdate: () => { const n = Math.floor(st.k); q('.rot', true).forEach((t, i) => t.textContent = LAT[(n * (i + 1) * 7 + i * 5) % 26]); } }, 0);
      tl.call(() => s.syncRot && s.syncRot(), null, 1.21);
      tl.fromTo(q('#n-b'), { scale: 0, transformOrigin: '1340px 450px' }, { scale: 1, duration: .3, ease: 'back.out(2)' }, 1.0);
      tl.fromTo(q('#p-enig'), { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: .3 }, 1.3);
      tl.fromTo(q('.cam'), { scale: 1.12, y: 40 }, { scale: 1, y: 0, transformOrigin: '50% 40%', duration: 1.4, ease: 'power2.out' }, 0);
    },
    init(q, s, root) {
      let E = makeEnigma(), inS = '', outS = '';
      s.syncRot = () => q('.rot', true).forEach((t, i) => t.textContent = E.window()[i]);
      const press = ch => {
        const o = E.press(ch);
        inS = (inS + ch).slice(-18); outS = (outS + o).slice(-18);
        q('#n-in').textContent = inS; q('#n-out').textContent = outS;
        s.syncRot();
        const lamp = root.querySelector(`.lamp[data-k="${o}"] circle`);
        gsap.fromTo(lamp, { opacity: 1 }, { opacity: 0, duration: .9, delay: .25 });
        const key = root.querySelector(`.key[data-k="${ch}"]`);
        gsap.fromTo(key, { y: 6 }, { y: 0, duration: .2 });
        window.SFX && SFX.key();
      };
      q('.key', true).forEach(k => k.addEventListener('pointerdown', e => { e.preventDefault(); press(k.dataset.k); }));
      s.onKey = e => { const ch = e.key.toUpperCase(); if (ch.length === 1 && LAT.includes(ch)) { press(ch); return true; } };
      q('#n-reset').addEventListener('click', () => { E = makeEnigma(); inS = outS = ''; q('#n-in').textContent = q('#n-out').textContent = '—'; s.syncRot(); });
    },
    beats: [0.9, 1.65],
    speech: [['Б', 'Двадцатый век. Немецкая Энигма: сто пятьдесят девять квинтиллионов настроек. Её взломали польские математики и Алан Тьюринг. Помогла крошечная слабость: буква никогда не шифровалась сама в себя.']]
  });

  // 10 — ОТКРЫТЫЙ КЛЮЧ
  S.push({
    id: 'pubkey', focus: [510, 1550], len: 2.4, place: 'СТЭНФОРД И MIT', year: 1976, filter: 'engD', enter: [50, 60],
    art() {
      return {
        col: `<rect ${A.BG} fill="#fff"/><rect x="620" y="470" width="360" height="330" rx="34" fill="${C.red}"/>`,
        ink: `${A.inkBase()}<rect ${A.BG} fill="#cfcfcf"/>
              <g id="pk-sh"><path d="M680,480 V340 C680,200 920,200 920,340 V480" fill="none" stroke="#1a1a1a" stroke-width="64"/>
              <path d="M680,480 V340 C680,200 920,200 920,340 V480" fill="none" stroke="#e8e8e8" stroke-width="18"/></g>
              <rect x="620" y="470" width="360" height="330" rx="34" fill="url(#gCylV)" opacity=".75"/>
              <rect x="620" y="470" width="360" height="330" rx="34" fill="none" stroke="#000" stroke-width="10"/>
              <circle cx="800" cy="610" r="34" fill="#000"/><path d="M786,620 L814,620 L824,700 L776,700Z" fill="#000"/>
              <rect x="-700" y="860" width="3000" height="900" fill="#333"/>
              <ellipse cx="800" cy="840" rx="240" ry="26" fill="#000"/>`,
        top: `<g id="pk-click" style="cursor:pointer"><rect x="600" y="180" width="400" height="640" fill="transparent"/></g>
              ${A.bubble({ id: 'pk-b', x: 1010, y: 160, w: 480, lines: ['Защёлкнуть замок', 'может кто угодно.', 'Открыть — только я.'], tail: [930, 420], who: 'ОТКРЫТЫЙ КЛЮЧ' })}`
      };
    },
    ui: cap('1976–1977',
      'Раньше ключ приходилось передавать тайно. Уитфилд Диффи и Мартин Хеллман предложили открытый ключ, а Ривест, Шамир и Адлеман собрали из идеи шифр RSA. Теперь ты раздаёшь всем открытые замки, а ключ хранишь у себя.',
      note('Нажми на замок, чтобы защёлкнуть.')) +
      `<div class="panel" id="p-pk"><p class="panel-k">Математика замка</p>
        <p class="row"><button class="btn btn-sm" id="pk-mul">61 × 53 = ?</button><b id="pk-mulv"></b></p>
        <p class="row"><button class="btn btn-sm" id="pk-fac">3233 = ? × ?</button><b id="pk-facv"></b></p>
        <p class="panel-tip" id="pk-tip">Перемножить простые числа легко. Разложить ответ обратно приходится перебором.</p></div>`,
    build(tl, q, s) {
      tl.fromTo(q('#pk-sh'), { y: -90 }, { y: 0, duration: .25, ease: 'power3.in', onComplete: () => window.SFX && SFX.click() }, 1.0);
      tl.fromTo(q('#pk-b'), { scale: 0, transformOrigin: '930px 420px' }, { scale: 1, duration: .3, ease: 'back.out(2)' }, .7);
      tl.fromTo(q('#p-pk'), { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: .3 }, 1.3);
      tl.fromTo(q('.cam'), { scale: 1 }, { scale: 1.08, transformOrigin: '50% 55%', duration: 2.4, ease: 'none' }, 0);
    },
    init(q) {
      let open = false;
      q('#pk-click').addEventListener('click', () => { open = !open; gsap.to(q('#pk-sh'), { y: open ? -90 : 0, duration: .25, ease: open ? 'back.out(2)' : 'power3.in' }); window.SFX && SFX.click(); });
      q('#pk-mul').addEventListener('click', () => { q('#pk-mulv').textContent = '3233 · мгновенно'; window.SFX && SFX.tick(); });
      q('#pk-fac').addEventListener('click', () => {
        const o = { d: 2 }, out = q('#pk-facv');
        gsap.to(o, { d: 53, duration: 2.2, ease: 'none', onUpdate: () => { const d = Math.floor(o.d); out.textContent = `делю на ${d}… ${3233 % d ? 'нет' : 'да!'}`; },
          onComplete: () => { out.textContent = '53 × 61 · 52 попытки'; q('#pk-tip').innerHTML = 'В RSA-2048 число длиной 617 цифр. По оценкам, обычным компьютерам на разложение понадобятся триллионы лет.'; window.SFX && SFX.win(); } });
      });
    },
    beats: [0.8, 1.65],
    speech: [['А', 'В 1976 году математики решили главную проблему: как передать ключ незнакомцу. Перемножить два простых числа легко, а разложить результат обратно почти невозможно.']]
  });

  // 11 — СЕГОДНЯ
  S.push({
    id: 'today', focus: [530, 1570], len: 2.4, place: 'ТВОЙ КАРМАН', year: 2026, filter: 'engD', enter: [50, 50],
    art() {
      let bin = '';
      for (let c = 0; c < 22; c++) {
        let col = '';
        for (let r = 0; r < 22; r++) col += `<tspan x="${-200 + c * 95}" dy="46">${(c * 7 + r * 13) % 3 ? 1 : 0}</tspan>`;
        bin += `<text class="bin" font-family="PT Mono" font-size="38" fill="#111" opacity=".55" y="-300">${col}</text>`;
      }
      const hand = 'M600,1100 C600,960 560,860 610,770 C640,720 700,730 700,790 L700,640 C700,600 760,600 760,640 L1010,700 C1080,690 1100,760 1060,800 C1000,860 990,900 1020,960 C1060,1040 1060,1100 1060,1100Z';
      return {
        col: `<rect ${A.BG} fill="${C.red}"/><g id="t-bin">${bin}</g>
              <g id="t-ph"><g transform="rotate(-8 800 520)"><rect x="660" y="150" width="300" height="600" rx="40" fill="#fff"/></g></g>
              <g id="t-hand"><path d="${hand}" fill="#fff"/></g>`,
        ink: `${A.inkBase()}
              <g id="t-ph-i"><g transform="rotate(-8 800 520)"><rect x="640" y="130" width="340" height="640" rx="52" fill="#0a0a0a"/>
              <rect x="660" y="150" width="300" height="600" rx="40" fill="#fff"/><rect x="760" y="160" width="100" height="22" rx="11" fill="#000"/></g></g>
              <g id="t-hand-i"><path d="${hand}" fill="url(#gHand)"/>
              <path d="M700,790 C690,850 720,880 760,870 M760,700 L1000,760" stroke="#000" stroke-width="6" fill="none"/></g>`,
        top: `<g id="t-scr"><g transform="rotate(-8 800 520)">
              <rect x="760" y="380" width="100" height="90" rx="12" fill="${C.red}"/>
              <path d="M780,380 V340 C780,300 840,300 840,340 V380" fill="none" stroke="#111" stroke-width="14"/>
              <circle cx="810" cy="420" r="11" fill="#111"/>
              <text x="810" y="530" font-family="Oswald" font-weight="700" font-size="40" text-anchor="middle" fill="#111">AES-256</text>
              <text x="810" y="570" font-family="PT Mono" font-size="20" text-anchor="middle" fill="#111">сообщение зашифровано</text></g></g>
              ${A.bubble({ id: 't-b', x: 1000, y: 120, w: 520, lines: ['Теперь у нас есть шифры,', 'которые не взломать', 'за миллионы лет.'], tail: [930, 330] })}`
      };
    },
    ui: cap('Сегодня',
      'Сообщения в мессенджере, оплата картой, замок в адресной строке: всё это закрыто шифрами. Самый распространённый из них, AES, утвердили в 2001 году.') +
      `<div class="panel panel-wide" id="p-today"><p class="panel-k">«Миллионы лет» — это мы поскромничали</p>
        <p class="big-num" id="t-num"></p>
        <p class="panel-tip">Столько ключей у AES-256 (2<sup>256</sup>). Пусть каждый атом Земли, а их около 10<sup>50</sup>, проверяет миллиард ключей в секунду. Перебор займёт около <b>37 миллиардов лет</b>. Вселенной 13,8 миллиарда.</p></div>`,
    build(tl, q, s) {
      tl.fromTo([q('#t-ph'), q('#t-ph-i'), q('#t-scr')], { y: 500 }, { y: 0, duration: .7, ease: 'power3.out' }, 0);
      tl.fromTo([q('#t-hand'), q('#t-hand-i')], { y: 600 }, { y: 0, duration: .8, ease: 'power3.out' }, .05);
      tl.fromTo(q('#t-b'), { scale: 0, transformOrigin: '930px 330px' }, { scale: 1, duration: .3, ease: 'back.out(2)' }, .85);
      tl.fromTo(q('#p-today'), { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: .3 }, 1.2);
      const st = { n: 0 };
      tl.to(st, { n: 1, duration: .7, ease: 'none', onUpdate: () => s.num(st.n) }, 1.25);
      tl.fromTo(q('.cam'), { scale: 1 }, { scale: 1.06, transformOrigin: '50% 40%', duration: 2.4, ease: 'none' }, 0);
    },
    init(q, s) {
      const full = (2n ** 256n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
      s.num = p => { q('#t-num').textContent = full.slice(0, Math.max(1, Math.round(full.length * p))); };
      s.num(0);
      q('.bin', true).forEach((t, i) => gsap.to(t, { y: 46 * 6, duration: 2 + (i % 5) * .5, repeat: -1, ease: 'none' }));
    },
    beats: [0.9, 1.95],
    speech: [['Б', 'Сегодня каждое сообщение в мессенджере закрыто шифром. Ключей у AES-256 так много, что перебор занял бы больше времени, чем существует Вселенная.']]
  });

  // 12 — ЗАВТРА
  S.push({
    id: 'quantum', len: 1.8, place: 'ЛАБОРАТОРИЯ', year: null, yearText: 'ЗАВТРА', filter: 'engV', enter: [50, 45],
    art() {
      const tiers = [[260, 300], [430, 250], [590, 200], [740, 150]];
      let col = '', ink = '', tubes = '';
      tiers.forEach(([y, w]) => {
        col += `<rect x="${800 - w}" y="${y - 22}" width="${w * 2}" height="44" rx="22" fill="${C.yellow}"/>`;
        ink += `<rect x="${800 - w}" y="${y - 22}" width="${w * 2}" height="44" rx="22" fill="url(#gCylV)" opacity=".85"/>`;
      });
      for (let i = 0; i < 9; i++) { const x = 560 + i * 60; tubes += `<path d="M${x},280 C${x + 10},420 ${x - 10},560 ${800 + (x - 800) * .5},740" stroke="#3a3a3a" stroke-width="10" fill="none"/>`; }
      return {
        col: `<rect ${A.BG} fill="#fff"/><circle cx="800" cy="500" r="360" fill="${C.red}"/><g id="q-ch">${col}<rect x="770" y="-700" width="60" height="960" fill="${C.yellow}"/></g>`,
        ink: `${A.inkBase()}<rect x="-700" y="-700" width="3000" height="900" fill="url(#gFadeDown)" opacity=".7"/>
              <g id="q-chi"><rect x="770" y="-700" width="60" height="960" fill="url(#gCylV)"/>${tubes}${ink}
              <path d="M760,760 L800,860 L840,760Z" fill="#222"/></g>`,
        top: `<g id="q-dots">${[0, 1, 2, 3, 4].map(i => `<circle cx="${640 + i * 80}" cy="900" r="12" fill="#111"/>`).join('')}</g>`
      };
    },
    ui: cap('Завтра',
      'Квантовый компьютер с алгоритмом Питера Шора (1994) сможет разлагать огромные числа и вскрывать RSA. Учёные не ждут: в 2024 году американский институт стандартов NIST утвердил первые постквантовые шифры.',
      note('Гонка шифровальщиков и взломщиков идёт двадцать пять веков. Финиша пока не видно.')),
    build(tl, q) {
      tl.fromTo([q('#q-ch'), q('#q-chi')], { y: -700 }, { y: 0, duration: .8, ease: 'power3.out' }, 0);
      tl.from(q('#q-dots').children, { scale: 0, transformOrigin: '50% 50%', stagger: .06, duration: .2 }, .7);
      tl.fromTo(q('.cam'), { scale: 1 }, { scale: 1.05, transformOrigin: '50% 50%', duration: 1.8, ease: 'none' }, 0);
    },
    init(q) {
      gsap.to(q('#q-dots').children, { opacity: .2, duration: .5, yoyo: true, repeat: -1, stagger: { each: .15, repeat: -1, yoyo: true } });
    },
    beats: [0.9],
    speech: [['А', 'Квантовые компьютеры уже угрожают этим замкам, и учёные заранее готовят новые.']]
  });

  // 13 — РАЗБОР И ВЫВОД
  S.push({
    id: 'verdict', len: 2.6, place: 'РАЗБОР', year: null, yearText: 'ВЫВОД', filter: 'engV', enter: [50, 45],
    art() {
      const c = A.caesar('translate(800,430) scale(.9)', { dark: '#060606' });
      return {
        col: `<rect ${A.BG} fill="${C.red}"/><circle cx="800" cy="440" r="270" fill="#fff"/>${c.col}`,
        ink: `${A.inkBase()}<rect x="-700" y="760" width="3000" height="1000" fill="url(#gFadeUp)"/>
              <circle cx="800" cy="440" r="270" fill="none" stroke="#000" stroke-width="14"/>${c.ink}`,
        top: c.top + `<text id="v-three" x="800" y="900" font-family="Cinzel, serif" font-weight="700" font-size="120" text-anchor="middle" fill="#111">III</text>`
      };
    },
    ui: `<div class="verdict">
        <div class="vcard plus"><h3>Плюсы шифра Цезаря</h3><ul>
          <li>Шифруешь в уме, без приборов и таблиц.</li>
          <li>Ключ — одно число, его легко запомнить.</li>
          <li>Метод отделён от ключа. Эта идея живёт в каждом современном шифре.</li></ul></div>
        <div class="vcard minus"><h3>Минусы</h3><ul>
          <li>Всего 25 ключей: перебор займёт вечер.</li>
          <li>Частоты букв сохраняются: аль-Кинди вскроет текст за минуты.</li>
          <li>Видны длина слов и пробелы.</li></ul></div>
        <div class="vcard concl"><h3>Наш вывод</h3>
          <p>Цезарь придумал слабый шифр и сильную идею: метод могут знать все, а секрет живёт в одном числе. В 1883 году Огюст Керкгоффс записал это правилом, и по нему построены AES и RSA. Поэтому мы называем шифр самым гениальным изобретением: каждый взлом за 2500 лет рождал шифр сильнее.</p>
          <div class="try"><label>Зашифруй своё имя <input id="v-name" type="text" value="Цезарь" maxlength="24" autocomplete="off" spellcheck="false"></label>
          <label>сдвиг <input id="v-k" type="number" min="1" max="32" value="3"></label><p class="out" id="v-out"></p></div>
        </div></div>`,
    build(tl, q) {
      tl.fromTo(q('.vcard', true), { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: .35, stagger: .25, ease: 'power2.out' }, .6);
      tl.fromTo(q('#v-three'), { scale: 0, transformOrigin: '800px 870px' }, { scale: 1, duration: .3, ease: 'back.out(3)' }, .5);
      tl.fromTo(q('.cam'), { scale: 1.05 }, { scale: 1, transformOrigin: '50% 40%', duration: 2.6, ease: 'none' }, 0);
    },
    init(q) {
      const n = q('#v-name'), k = q('#v-k'), o = q('#v-out');
      const up = () => { o.textContent = shiftText(n.value, +k.value || 0); window.SFX && SFX.tick(); };
      n.addEventListener('input', up); k.addEventListener('input', up);
      o.textContent = shiftText(n.value, 3);
    },
    beats: [1.5, 2.4],
    speech: [
      ['Б', 'Шифр Цезаря слаб: ключей мало, частоты букв видны. Но Цезарь первым отделил метод от ключа. Метод знают все, секрет хранит только число три. На этой идее держится вся современная защита.'],
      ['А', 'Гениальному изобретению не обязательно быть сложным. Хватило одной верной мысли и числа три. Спасибо за внимание!']
    ]
  });

  window.SCENES = S;
})();
