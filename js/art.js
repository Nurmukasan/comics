/* Рисовалка комикса.
   Каждая сцена — SVG с тремя слоями:
   col  — плоские цвета (белый, красный, жёлтый);
   ink  — тона серого; фильтр «гравюра» превращает их в штрихи:
          чем темнее серый, тем толще линия (как на старых гравюрах);
   top  — чёткие элементы поверх: буквы, глаза, пузыри реплик. */
(function () {
  const C = {
    red: '#e2231a', ink: '#111', paper: '#f7f3ea', white: '#fff',
    yellow: '#f3c117', cream: '#efe6cf'
  };

  const BG = 'x="-700" y="-700" width="3000" height="2400"';

  // фон слоя ink: белый прямоугольник = «нет краски»
  const inkBase = () => `<rect ${BG} fill="#fff"/>`;

  // пузырь реплики: x,y — левый верх, w — ширина, lines — строки, tail — точка хвоста
  function bubble(o) {
    const fs = o.fs || 34, lh = fs * 1.18, pad = 22;
    const h = o.lines.length * lh + pad * 1.4;
    const x = o.x, y = o.y, w = o.w, r = 26;
    const [tx, ty] = o.tail || [x + w * .3, y + h + 60];
    const below = ty > y + h;
    const bx = Math.min(Math.max(tx, x + 50), x + w - 90);
    let d;
    if (below) {
      d = `M${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h}
           H${bx + 46} L${tx},${ty} L${bx + 8},${y + h} H${x + r} Q${x},${y + h} ${x},${y + h - r} V${y + r} Q${x},${y} ${x + r},${y}Z`;
    } else {
      d = `M${x + r},${y} H${bx + 8} L${tx},${ty} L${bx + 46},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h}
           H${x + r} Q${x},${y + h} ${x},${y + h - r} V${y + r} Q${x},${y} ${x + r},${y}Z`;
    }
    const id = o.id ? ` id="${o.id}"` : '';
    const font = o.font || 'Neucha';
    const tspans = o.lines.map((l, i) =>
      `<tspan x="${x + w / 2}" y="${y + pad + fs * .9 + i * lh}">${l}</tspan>`).join('');
    return `<g${id} class="bubble ${o.cls || ''}">
      <path d="${d}" fill="${o.fill || '#fff'}" stroke="#111" stroke-width="4" stroke-linejoin="round" filter="url(#rough)"/>
      <text font-family="${font}, cursive" font-size="${fs}" text-anchor="middle" fill="#111">${tspans}</text>
      ${o.who ? `<rect x="${x + 14}" y="${y - 30}" width="${o.who.length * 15 + 20}" height="30" fill="#111"/><text x="${x + 24}" y="${y - 8}" font-family="Oswald" font-weight="700" font-size="20" letter-spacing="2" fill="#fff">${o.who}</text>` : ''}
    </g>`;
  }

  // ------- профиль головы (смотрит вправо), центр ~ (0,0), высота ~250
  const HEAD = `M-70,-95 C-30,-125 40,-118 70,-80 C82,-62 86,-45 88,-30 L92,-18
    C96,-8 104,8 116,22 L106,30 L100,32 C102,40 104,44 102,48 L96,52 C100,58 99,64 94,68
    C96,78 94,90 84,98 C66,108 44,108 30,104 L34,150 L-50,150 C-55,120 -70,100 -88,70
    C-110,30 -108,-55 -70,-95Z`;

  function laurel(n, rad, a0, a1, fill) {
    let s = '';
    for (let i = 0; i < n; i++) {
      const a = (a0 + (a1 - a0) * i / (n - 1)) * Math.PI / 180;
      const x = Math.cos(a) * rad, y = Math.sin(a) * rad;
      const t = a * 180 / Math.PI + 90;
      s += `<ellipse cx="${x}" cy="${y}" rx="30" ry="10" transform="rotate(${t + 28} ${x} ${y}) translate(14 0)" fill="${fill}"/>`;
      s += `<ellipse cx="${x}" cy="${y}" rx="30" ry="10" transform="rotate(${t - 28} ${x} ${y}) translate(14 0)" fill="${fill}"/>`;
    }
    return s;
  }

  // Цезарь: голова + венок + тога. Возвращает слои.
  function caesar(tr, opt = {}) {
    const dark = opt.dark || '#2a2a2a';
    return {
      col: `<g transform="${tr}">
        <path d="M-50,140 C-150,165 -210,230 -225,380 L235,380 C225,250 170,170 34,140Z" fill="#fff"/>
        <path d="M-200,210 C-80,280 70,300 200,240 L225,320 C70,380 -90,350 -215,280Z" fill="${C.red}"/>
        ${laurel(8, 104, 150, 292, C.yellow)}
      </g>`,
      ink: `<g transform="${tr}">
        <path d="${HEAD}" fill="${dark}"/>
        <ellipse cx="-12" cy="12" rx="17" ry="27" fill="#000"/>
        <path d="M-50,140 C-150,165 -210,230 -225,380 L235,380 C225,250 170,170 34,140Z" fill="url(#gToga)"/>
        <path d="M-200,210 C-80,280 70,300 200,240 L225,320 C70,380 -90,350 -215,280Z" fill="url(#gSash)"/>
        <path d="M-120,190 C-90,260 -60,330 -70,380 M-20,170 C0,250 10,320 0,380 M90,180 C110,250 130,320 140,380" stroke="#000" stroke-width="7" fill="none"/>
        ${laurel(8, 104, 150, 292, '#9a9a9a')}
      </g>`,
      top: `<g transform="${tr}">
        <path d="M54,-12 C62,-18 72,-18 78,-11 C70,-7 62,-7 54,-12Z" fill="#fff"/>
      </g>`
    };
  }

  // гонец (стоит, держит свиток), ноги на (0,0)
  function messenger(tr) {
    return {
      col: `<g transform="${tr}">
        <path d="M-48,-300 L48,-300 L76,-130 L-76,-130Z" fill="#fff"/>
        <rect x="118" y="-262" width="26" height="64" rx="10" fill="${C.cream}"/>
      </g>`,
      ink: `<g transform="${tr}">
        <circle cx="0" cy="-345" r="40" fill="#3a3a3a"/>
        <path d="M-44,-352 C-44,-410 44,-410 46,-352Z" fill="#111"/>
        <path d="M-6,-402 C10,-440 50,-440 70,-400" stroke="#111" stroke-width="12" fill="none"/>
        <path d="M-48,-300 L48,-300 L76,-130 L-76,-130Z" fill="url(#gTunic)"/>
        <rect x="-60" y="-200" width="120" height="16" fill="#000"/>
        <path d="M-25,-135 L-55,-45 L-38,0 M25,-135 L45,-50 L92,-34" stroke="#2c2c2c" stroke-width="28" stroke-linecap="round" fill="none"/>
        <path d="M-36,-285 L-70,-200 L-60,-140 M36,-285 L92,-232 L126,-236" stroke="#3a3a3a" stroke-width="24" stroke-linecap="round" fill="none"/>
        <rect x="118" y="-262" width="26" height="64" rx="10" fill="url(#gScroll)"/>
      </g>`,
      top: ''
    };
  }

  // галл: голова анфас, усы, длинные волосы. Рука-чесалка отдельной группой.
  function gaul(tr, id) {
    return {
      col: `<g transform="${tr}">
        <path d="M-150,120 C-200,160 -230,260 -235,420 L235,420 C230,260 200,160 150,120Z" fill="#fff"/>
        <ellipse cx="0" cy="0" rx="92" ry="118" fill="#fff"/>
      </g>`,
      ink: `<g transform="${tr}">
        <path d="M-150,120 C-200,160 -230,260 -235,420 L235,420 C230,260 200,160 150,120Z" fill="url(#gCloak)"/>
        <path d="M-60,150 L0,260 L60,150" stroke="#000" stroke-width="10" fill="none"/>
        <path d="M-105,-40 C-130,-150 120,-170 110,-40 C150,40 150,140 120,200 L95,60 C80,-40 -80,-40 -95,60 L-120,200 C-150,140 -150,40 -105,-40Z" fill="#1e1e1e"/>
        <ellipse cx="0" cy="12" rx="88" ry="112" fill="url(#gFace)"/>
        <path d="M-70,-90 C-30,-130 40,-125 75,-85 C40,-100 -30,-105 -70,-90Z" fill="#111"/>
        <path d="M-58,-26 L-18,-34 M18,-34 L58,-26" stroke="#000" stroke-width="11" stroke-linecap="round"/>
        <path d="M0,-20 L-10,42 L10,46" stroke="#333" stroke-width="6" fill="none"/>
        <path d="M-12,60 C-40,58 -70,80 -78,140 C-60,110 -40,92 -6,82 C2,82 6,82 6,82 C40,92 60,110 78,140 C70,80 40,58 12,60 C6,64 -6,64 -12,60Z" fill="#000"/>
      </g>`,
      top: `<g transform="${tr}">
        <g class="gaul-eyes">
          <ellipse cx="-36" cy="-6" rx="14" ry="9" fill="#fff"/><circle cx="-33" cy="-5" r="6" fill="#111"/>
          <ellipse cx="36" cy="-6" rx="14" ry="9" fill="#fff"/><circle cx="39" cy="-5" r="6" fill="#111"/>
        </g>
      </g>`
    };
  }

  // аль-Кинди: сидит в профиль (смотрит вправо), тюрбан, борода
  function kindi(tr) {
    return {
      col: `<g transform="${tr}">
        <path d="M-160,120 C-200,200 -220,300 -230,380 L190,380 C170,280 140,190 70,130Z" fill="#fff"/>
        <ellipse cx="-5" cy="-110" rx="112" ry="62" fill="#fff"/>
      </g>`,
      ink: `<g transform="${tr}">
        <path d="${HEAD}" fill="#8a8a8a"/>
        <ellipse cx="-12" cy="12" rx="16" ry="26" fill="#333"/>
        <path d="M54,-12 C62,-18 72,-18 78,-11" stroke="#000" stroke-width="5" fill="none"/>
        <path d="M30,70 C60,80 100,90 104,60 C110,120 90,190 40,230 C10,200 -10,150 0,100Z" fill="#141414"/>
        <ellipse cx="-5" cy="-110" rx="112" ry="62" fill="url(#gTurban)"/>
        <path d="M-110,-120 C-40,-80 60,-90 105,-125 M-112,-95 C-40,-60 60,-70 108,-100 M-100,-145 C-30,-110 50,-118 96,-150" stroke="#000" stroke-width="7" fill="none"/>
        <path d="M-160,120 C-200,200 -220,300 -230,380 L190,380 C170,280 140,190 70,130Z" fill="url(#gRobe)"/>
        <path d="M40,160 C90,200 150,230 200,250" stroke="#2a2a2a" stroke-width="34" stroke-linecap="round" fill="none"/>
        <circle cx="210" cy="252" r="20" fill="#3a3a3a"/>
        <path d="M222,240 L262,180" stroke="#000" stroke-width="5"/>
      </g>`,
      top: ''
    };
  }

  // человек эпохи Возрождения с воротником-фрезой (Белазо/Виженер)
  function ruff(tr) {
    let pleats = '';
    for (let i = 0; i < 28; i++) {
      const a = i / 28 * Math.PI * 2;
      pleats += `<path d="M0,0 L${Math.cos(a) * 150},${Math.sin(a) * 52}" stroke="#555" stroke-width="3"/>`;
    }
    return {
      col: `<g transform="${tr}">
        <ellipse cx="0" cy="150" rx="150" ry="52" fill="#fff"/>
      </g>`,
      ink: `<g transform="${tr}">
        <path d="M-180,170 C-220,240 -240,320 -245,400 L245,400 C240,320 220,240 180,170Z" fill="#161616"/>
        <path d="M-90,190 L-90,400 M0,200 L0,400 M90,190 L90,400" stroke="#555" stroke-width="5"/>
        <path d="${HEAD}" fill="#444"/>
        <path d="M70,96 C80,130 70,170 50,190 C40,150 30,120 30,104Z" fill="#000"/>
        <path d="M-120,-80 C-120,-150 120,-150 130,-95 C90,-110 -60,-105 -120,-80Z" fill="#000"/>
        <ellipse cx="5" cy="-95" rx="125" ry="22" fill="#111"/>
        <g transform="translate(0,150)">
          <ellipse cx="0" cy="0" rx="150" ry="52" fill="#d8d8d8"/>${pleats}
          <ellipse cx="0" cy="0" rx="150" ry="52" fill="none" stroke="#111" stroke-width="5"/>
        </g>
      </g>`,
      top: ''
    };
  }

  // Тьюринг: смотрит влево, костюм
  function turing(tr) {
    return {
      col: `<g transform="${tr}"><path d="M-30,190 L0,240 L30,190 L20,400 L-20,400Z" fill="#fff"/></g>`,
      ink: `<g transform="${tr}">
        <path d="M-200,180 C-240,240 -255,320 -260,400 L260,400 C255,320 240,240 200,180 C150,150 60,140 0,150 C-60,140 -150,150 -200,180Z" fill="#202020"/>
        <path d="M-60,150 L-10,300 L-110,220Z M60,150 L10,300 L110,220Z" fill="#000"/>
        <path d="M-6,200 L6,200 L14,330 L0,350 L-14,330Z" fill="#444"/>
        <g transform="scale(-1,1)"><path d="${HEAD}" fill="#4a4a4a"/>
          <path d="M-80,-60 C-100,-130 30,-150 90,-70 C40,-100 -20,-100 -40,-70 C-60,-80 -70,-70 -80,-60Z" fill="#000"/>
          <ellipse cx="-12" cy="12" rx="16" ry="26" fill="#000"/></g>
      </g>`,
      top: ''
    };
  }

  // шлем коринфского типа (Спарта), смотрит вправо
  function helmet(tr) {
    const body = `M-160,-40 C-170,-190 130,-210 165,-50 L170,30 L150,60 L160,180 C120,200 70,190 40,170 L30,90 L-10,90 L-20,170 C-60,180 -120,170 -150,150 C-175,80 -170,20 -160,-40Z`;
    return {
      col: `<g transform="${tr}">
        <path d="M-200,-70 C-180,-280 170,-300 235,-110 C180,-215 -130,-225 -160,-60Z" fill="${C.red}"/>
      </g>`,
      ink: `<g transform="${tr}">
        <path d="M-200,-70 C-180,-280 170,-300 235,-110 C180,-215 -130,-225 -160,-60Z" fill="url(#gCrest)"/>
        <path d="${body}" fill="url(#gBronze)"/>
        <path d="M58,8 L168,-2 L162,46 L54,62Z" fill="#000"/>
        <path d="M88,62 L104,62 L110,190 L92,190Z" fill="#000"/>
        <path d="M-150,-30 C-80,-60 60,-60 165,-40" stroke="#000" stroke-width="9" fill="none"/>
        <path d="${body}" fill="none" stroke="#000" stroke-width="8"/>
      </g>`,
      top: ''
    };
  }

  // кусты с глазами (засада)
  function bush(x, y, s, eyesId) {
    return {
      ink: `<g transform="translate(${x},${y}) scale(${s})">
        <path d="M-150,40 C-170,-20 -120,-60 -80,-40 C-70,-100 0,-110 20,-60 C50,-110 130,-90 120,-30 C170,-30 180,40 140,50Z" fill="#141414"/>
      </g>`,
      top: `<g transform="translate(${x},${y}) scale(${s})"><g class="blink" ${eyesId ? `id="${eyesId}"` : ''}>
        <ellipse cx="-30" cy="-10" rx="13" ry="8" fill="#fff"/><circle cx="-34" cy="-10" r="5" fill="#111"/>
        <ellipse cx="18" cy="-10" rx="13" ry="8" fill="#fff"/><circle cx="14" cy="-10" r="5" fill="#111"/>
      </g></g>`
    };
  }

  // дерево-силуэт
  function tree(x, y, s) {
    return `<g transform="translate(${x},${y}) scale(${s})">
      <path d="M-14,0 L-10,-160 L10,-160 L14,0Z" fill="#111"/>
      <path d="M0,-420 L-110,-140 L110,-140Z M0,-480 L-80,-260 L80,-260Z" fill="#1b1b1b"/>
    </g>`;
  }

  // общие градиенты (вставляются в каждую сцену с префиксом не нужны — лежат в глобальных defs)
  const GRADS = `
    <linearGradient id="gToga" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#777"/><stop offset=".45" stop-color="#e6e6e6"/><stop offset="1" stop-color="#5a5a5a"/></linearGradient>
    <linearGradient id="gSash" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#555"/><stop offset=".5" stop-color="#bdbdbd"/><stop offset="1" stop-color="#333"/></linearGradient>
    <linearGradient id="gTunic" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#666"/><stop offset=".5" stop-color="#d0d0d0"/><stop offset="1" stop-color="#555"/></linearGradient>
    <linearGradient id="gScroll" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#777"/><stop offset=".5" stop-color="#eee"/><stop offset="1" stop-color="#666"/></linearGradient>
    <linearGradient id="gCloak" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#333"/><stop offset=".5" stop-color="#9a9a9a"/><stop offset="1" stop-color="#2a2a2a"/></linearGradient>
    <radialGradient id="gFace" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#f2f2f2"/><stop offset=".7" stop-color="#a8a8a8"/><stop offset="1" stop-color="#555"/></radialGradient>
    <linearGradient id="gTurban" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d8d8d8"/><stop offset="1" stop-color="#6a6a6a"/></linearGradient>
    <linearGradient id="gRobe" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#4a4a4a"/><stop offset=".6" stop-color="#c8c8c8"/><stop offset="1" stop-color="#3a3a3a"/></linearGradient>
    <linearGradient id="gBronze" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2a2a2a"/><stop offset=".55" stop-color="#d4d4d4"/><stop offset=".8" stop-color="#8a8a8a"/><stop offset="1" stop-color="#1a1a1a"/></linearGradient>
    <linearGradient id="gCrest" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#333"/><stop offset="1" stop-color="#999"/></linearGradient>
    <linearGradient id="gDrip" gradientUnits="userSpaceOnUse" x1="0" y1="-60" x2="0" y2="380"><stop offset="0" stop-color="#000"/><stop offset=".45" stop-color="#3a3a3a"/><stop offset="1" stop-color="#f4f4f4"/></linearGradient>
    <linearGradient id="gFadeDown" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000"/><stop offset=".55" stop-color="#666"/><stop offset="1" stop-color="#fff"/></linearGradient>
    <linearGradient id="gFadeUp" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#222"/><stop offset=".6" stop-color="#aaa"/><stop offset="1" stop-color="#fff"/></linearGradient>
    <linearGradient id="gCylH" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#222"/><stop offset=".35" stop-color="#e8e8e8"/><stop offset="1" stop-color="#1c1c1c"/></linearGradient>
    <linearGradient id="gCylV" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#222"/><stop offset=".35" stop-color="#e8e8e8"/><stop offset="1" stop-color="#1c1c1c"/></linearGradient>
    <linearGradient id="gWood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a8a8a"/><stop offset="1" stop-color="#3a3a3a"/></linearGradient>
    <radialGradient id="gGlow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff"/><stop offset=".6" stop-color="#bbb"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <radialGradient id="gSphere" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#fff"/><stop offset=".6" stop-color="#999"/><stop offset="1" stop-color="#222"/></radialGradient>
    <linearGradient id="gHand" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4f4f4"/><stop offset=".55" stop-color="#bbb"/><stop offset="1" stop-color="#4a4a4a"/></linearGradient>
  `;

  window.ART = { C, BG, inkBase, bubble, caesar, messenger, gaul, kindi, ruff, turing, helmet, bush, tree, laurel, HEAD, GRADS };
})();
