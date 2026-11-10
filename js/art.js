/* Рисовалка комикса.
   Каждая сцена — SVG с тремя слоями:
   col  — плоские цвета (кожа, белый, красный, жёлтый);
   ink  — тона серого; фильтр «гравюра» превращает их в штрихи:
          чем темнее серый, тем толще линия; чистый белый стирает краску;
   top  — чёткие элементы поверх: глаза, блики, буквы, пузыри реплик.
   Персонажи — в духе манги: большие глаза с бликами, острые пряди, контур. */
(function () {
  const C = {
    red: '#e2231a', ink: '#111', paper: '#f7f3ea', white: '#fff',
    yellow: '#f3c117', cream: '#efe6cf', skin: '#fbeee0', shade: '#efc9ae', gold: '#e9b415'
  };
  const BG = 'x="-700" y="-700" width="3000" height="2400"';
  const inkBase = () => `<rect ${BG} fill="#fff"/>`;
  const FONT = { bubble: 'Pangolin', title: 'Unbounded', mono: 'JetBrains Mono', serif: 'Alegreya' };

  // ---------- пузырь реплики
  function bubble(o) {
    const fs = o.fs || 40, lh = fs * 1.16, padY = 20;
    const h = o.lines.length * lh + padY * 1.3;
    const x = o.x, y = o.y, w = o.w, r = 30;
    const [tx, ty] = o.tail || [x + w * .3, y + h + 60];
    const below = ty > y + h;
    const bx = Math.min(Math.max(tx - 30, x + 40), x + w - 100);
    let d;
    if (below) {
      d = `M${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h}
           H${bx + 54} L${tx},${ty} L${bx + 14},${y + h} H${x + r} Q${x},${y + h} ${x},${y + h - r} V${y + r} Q${x},${y} ${x + r},${y}Z`;
    } else {
      d = `M${x + r},${y} H${bx + 14} L${tx},${ty} L${bx + 54},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h}
           H${x + r} Q${x},${y + h} ${x},${y + h - r} V${y + r} Q${x},${y} ${x + r},${y}Z`;
    }
    const id = o.id ? ` id="${o.id}"` : '';
    const font = o.font || FONT.bubble;
    const tsp = o.lines.map((l, i) => `<tspan x="${x + w / 2}" y="${y + padY + fs * .86 + i * lh}">${l}</tspan>`).join('');
    return `<g${id} class="bubble ${o.cls || ''}" data-tail="${tx} ${ty}"><g class="bz">
      <path d="${d}" fill="#111" transform="translate(7 7)"/>
      <path d="${d}" fill="${o.fill || '#fff'}" stroke="#111" stroke-width="5" stroke-linejoin="round"/>
      <text font-family="${font}, cursive" font-size="${fs}" text-anchor="middle" fill="#111">${tsp}</text>
      ${o.who ? `<g transform="translate(${x + 18} ${y - 22}) rotate(-3)"><rect x="0" y="-4" width="${o.who.length * 17 + 26}" height="34" fill="${o.whoFill || C.red}" stroke="#111" stroke-width="3"/><text x="13" y="22" font-family="${FONT.title}" font-weight="700" font-size="19" letter-spacing="1" fill="#fff">${o.who}</text></g>` : ''}
    </g></g>`;
  }

  // ---------- аниме-персонаж (бюст). Голова в (0,0), высота лица ~260.
  const FACE = 'M-90,-40 C-94,30 -78,84 -50,116 C-34,134 -14,148 0,152 C14,148 34,134 50,116 C78,84 94,30 90,-40 C86,-125 -86,-125 -90,-40Z';
  const EAR = 'M-88,-2 C-110,-12 -116,32 -92,48 C-89,36 -88,18 -88,-2Z';
  const NECK = 'M-30,110 L-34,206 L34,206 L30,110Z';
  const BODY = 'M-40,192 C-130,198 -212,244 -236,440 L236,440 C212,244 130,198 40,192Z';

  function eye(o) {
    const dx = o.look[0], dy = o.look[1];
    if (o.eyes === 'closed') return `<path d="M-70,26 C-56,38 -30,38 -16,24" stroke="#111" stroke-width="7" fill="none" stroke-linecap="round"/>`;
    const narrow = o.eyes === 'narrow', wide = o.eyes === 'wide';
    const sy = narrow ? .62 : wide ? 1.12 : 1;
    return `<g transform="translate(0 24) scale(1 ${sy}) translate(0 -24)">
      <path d="M-70,22 C-66,0 -30,-6 -14,8 C-16,30 -30,44 -46,44 C-60,44 -70,36 -70,22Z" fill="#fff"/>
      <ellipse cx="${-42 + dx}" cy="${24 + dy}" rx="${wide ? 12 : 15}" ry="${wide ? 16 : 20}" fill="${o.iris}"/>
      <path d="M${-57 + dx},${18 + dy} A15,20 0 0 1 ${-27 + dx},${18 + dy} A15,10 0 0 0 ${-57 + dx},${18 + dy}Z" fill="#111" opacity=".75"/>
      <ellipse cx="${-42 + dx}" cy="${25 + dy}" rx="6" ry="9" fill="#111"/>
      <circle cx="${-48 + dx}" cy="${15 + dy}" r="6" fill="#fff"/><circle cx="${-35 + dx}" cy="${33 + dy}" r="3" fill="#fff"/>
      <path d="M-76,14 C-68,-8 -34,-18 -12,0 L-8,8 C-30,-6 -62,-2 -72,22Z" fill="#111"/>
      <path d="M-73,12 L-88,2 L-72,20Z" fill="#111"/>
      <path d="M-64,40 C-52,47 -32,47 -22,40" stroke="#111" stroke-width="3" fill="none"/>
    </g>`;
  }
  const BROWS = {
    neutral: 'M-72,-24 C-58,-36 -34,-38 -16,-30',
    angry: 'M-74,-38 C-56,-34 -34,-26 -14,-14',
    worried: 'M-72,-22 C-56,-26 -36,-36 -18,-46',
    up: 'M-72,-34 C-58,-48 -34,-50 -16,-42'
  };
  const MOUTH = {
    smile: '<path d="M-22,100 C-10,112 12,112 24,98" stroke="#111" stroke-width="5" fill="none" stroke-linecap="round"/>',
    open: '<path d="M-22,96 C-14,126 14,126 22,96 C8,102 -8,102 -22,96Z" fill="#111"/><ellipse cx="0" cy="114" rx="9" ry="5" fill="#777"/>',
    shout: '<path d="M-30,90 C-26,138 26,138 30,90 C10,98 -10,98 -30,90Z" fill="#111"/><ellipse cx="0" cy="122" rx="13" ry="7" fill="#777"/>',
    worried: '<path d="M-17,108 C-8,98 8,98 17,108" stroke="#111" stroke-width="5" fill="none" stroke-linecap="round"/>',
    neutral: '<path d="M-13,104 C-3,107 7,107 15,102" stroke="#111" stroke-width="5" fill="none" stroke-linecap="round"/>',
    smirk: '<path d="M-16,106 C0,110 14,106 26,92" stroke="#111" stroke-width="5" fill="none" stroke-linecap="round"/>'
  };

  // лавровый венок
  function laurel(rad, a0, a1, n, fill, stroke) {
    let s = '';
    for (let i = 0; i < n; i++) {
      const a = (a0 + (a1 - a0) * i / (n - 1)) * Math.PI / 180;
      const x = Math.cos(a) * rad, y = Math.sin(a) * rad, t = a * 180 / Math.PI;
      [28, -28].forEach(k => s += `<path d="M0,0 C10,-12 30,-12 40,0 C30,12 10,12 0,0Z" transform="translate(${x} ${y}) rotate(${t + 90 + k})" fill="${fill}" ${stroke ? `stroke="${stroke}" stroke-width="3"` : ''}/>`);
    }
    return s;
  }

  // причёски: back — за лицом, front — поверх
  const HAIR = {
    roman: {
      back: 'M-98,-10 C-112,-110 -40,-150 10,-148 C80,-144 116,-92 98,-10 L96,40 L-96,40Z',
      front: 'M-96,-22 C-98,-112 -30,-140 20,-136 C82,-130 108,-82 96,-22 L86,-50 L78,-8 L64,-60 L52,-20 L38,-68 L24,-26 L8,-72 L-8,-28 L-24,-68 L-38,-24 L-54,-64 L-66,-16 L-80,-52 L-90,-6Z',
      shine: 'M-58,-104 C-28,-120 22,-122 54,-106'
    },
    spiky: {
      back: 'M-100,10 L-136,-50 L-100,-64 L-128,-126 L-64,-108 L-66,-172 L-12,-126 L18,-186 L46,-122 L104,-154 L92,-90 L140,-82 L102,-26 L104,30Z',
      front: 'M-98,-20 C-100,-110 -30,-138 20,-134 C84,-128 110,-80 98,-20 L90,-40 L84,6 L66,-56 L56,-6 L38,-66 L26,-12 L8,-74 L-6,-14 L-26,-70 L-38,-12 L-56,-62 L-66,-2 L-82,-48 L-92,10Z',
      shine: 'M-60,-104 C-30,-120 22,-122 56,-106'
    },
    long: {
      back: 'M-104,-40 C-134,40 -146,190 -116,310 L-74,262 L-62,330 L-30,250 L30,250 L62,330 L74,262 L116,310 C146,190 134,40 104,-40 C100,-146 -100,-146 -104,-40Z',
      front: 'M-100,-10 C-104,-116 -30,-146 16,-142 C88,-136 114,-86 100,-10 L94,40 L84,-34 L70,6 L60,-60 L42,-14 L30,-74 L12,-24 L-4,-78 L-18,-24 L-36,-72 L-48,-12 L-64,-60 L-76,8 L-88,-34 L-96,44Z',
      shine: 'M-64,-106 C-30,-124 24,-126 60,-110'
    },
    parted: {
      back: 'M-98,0 C-110,-112 -30,-144 20,-140 C92,-134 114,-82 100,0Z',
      front: 'M-98,-4 C-112,-114 -24,-146 26,-140 C94,-132 116,-80 100,-4 L94,-34 C78,-82 30,-96 -10,-92 L-28,-66 L-40,-86 C-62,-70 -82,-44 -98,-4Z',
      shine: 'M-30,-118 C0,-128 40,-126 70,-110'
    },
    short: {
      back: 'M-96,-10 C-108,-112 -30,-144 16,-142 C84,-138 112,-90 96,-10Z',
      front: 'M-96,-16 C-100,-110 -30,-140 16,-138 C82,-134 108,-86 96,-16 L88,-42 L74,-22 L66,-66 L46,-34 L34,-74 L12,-38 L-6,-80 L-22,-38 L-40,-74 L-56,-30 L-70,-62 L-84,-14Z',
      shine: 'M-56,-106 C-26,-120 22,-122 52,-108'
    },
    pony: {
      back: 'M-102,-20 C-120,40 -120,150 -96,210 L-60,170 L-40,220 L40,220 L60,170 L96,210 C120,150 120,40 102,-20 C98,-140 -98,-140 -102,-20Z M80,-120 C170,-160 230,-60 190,60 C176,100 150,140 130,150 C160,80 170,0 120,-60Z',
      front: 'M-100,-12 C-104,-116 -30,-144 16,-140 C86,-134 112,-86 100,-12 L94,60 L86,-34 L72,-4 L62,-62 L42,-10 L28,-70 L10,-16 L-6,-76 L-24,-14 L-40,-68 L-54,-4 L-70,-56 L-80,20 L-90,-24 L-96,62Z',
      shine: 'M-62,-106 C-30,-122 22,-124 58,-108'
    }
  };

  // одежда
  function outfit(o) {
    const k = o.outfit;
    let col = `<path d="${BODY}" fill="${o.bodyCol || '#fff'}"/>`, ink = '', top = '';
    if (k === 'toga') {
      ink += `<path d="${BODY}" fill="url(#gToga)"/>
        <path d="M-150,250 C-120,320 -100,380 -110,440 M-60,220 C-40,300 -30,370 -40,440 M60,220 C80,300 90,370 80,440 M150,250 C170,320 180,380 170,440" stroke="#000" stroke-width="7" fill="none"/>`;
      col += `<path d="M-206,262 C-60,336 84,330 214,262 L228,334 C74,404 -82,404 -218,330Z" fill="${C.red}"/>`;
      ink += `<path d="M-206,262 C-60,336 84,330 214,262 L228,334 C74,404 -82,404 -218,330Z" fill="url(#gSash)"/>
        <path d="M-206,262 C-60,336 84,330 214,262 L228,334 C74,404 -82,404 -218,330Z" fill="none" stroke="#000" stroke-width="6"/>`;
      col += `<circle cx="160" cy="262" r="22" fill="${C.gold}"/>`;
      ink += `<circle cx="160" cy="262" r="22" fill="url(#gSphere)" opacity=".6"/><circle cx="160" cy="262" r="22" fill="none" stroke="#000" stroke-width="5"/>`;
    } else if (k === 'armor') {
      col = `<path d="${BODY}" fill="${C.red}"/>`;
      ink += `<path d="M-150,215 C-80,205 80,205 150,215 L170,440 L-170,440Z" fill="url(#gCylV)"/>
        ${[255, 300, 345, 390].map(y => `<path d="M-160,${y} C-60,${y + 18} 60,${y + 18} 160,${y}" stroke="#000" stroke-width="7" fill="none"/>`).join('')}
        <path d="M-150,215 C-200,220 -232,280 -236,330 L-170,320 C-170,270 -160,240 -150,215Z M150,215 C200,220 232,280 236,330 L170,320 C170,270 160,240 150,215Z" fill="#555" stroke="#000" stroke-width="6"/>
        <path d="M-150,215 C-80,205 80,205 150,215 L170,440 L-170,440Z" fill="none" stroke="#000" stroke-width="6"/>`;
    } else if (k === 'fur') {
      ink += `<path d="${BODY}" fill="#c4c4c4"/>
        <path d="M-236,440 C-226,280 -160,210 -70,200 L-52,262 L-34,212 L-16,274 L0,216 L16,274 L34,212 L52,262 L70,200 C160,210 226,280 236,440Z" fill="url(#gCloak)"/>
        ${[-180, -130, -80, 80, 130, 180].map(x => `<path d="M${x},${300 + Math.abs(x) / 4} l-10,40 m24,-36 l-8,40" stroke="#000" stroke-width="4"/>`).join('')}`;
      col += `<path d="M-64,196 C-44,252 44,252 64,196" stroke="${C.gold}" stroke-width="18" fill="none" stroke-linecap="round"/>`;
      ink += `<path d="M-64,196 C-44,252 44,252 64,196" stroke="#888" stroke-width="18" fill="none" stroke-linecap="round" opacity=".55"/>
        <circle cx="-64" cy="196" r="13" fill="#555"/><circle cx="64" cy="196" r="13" fill="#555"/>`;
    } else if (k === 'robe') {
      ink += `<path d="${BODY}" fill="url(#gRobe)"/>
        <path d="M-120,240 C-110,320 -100,380 -110,440 M120,240 C110,320 100,380 110,440" stroke="#000" stroke-width="6" fill="none"/>`;
      col += `<path d="M-46,192 L0,310 L46,192 L30,192 L0,276 L-30,192Z" fill="${C.red}"/>`;
      ink += `<path d="M-46,192 L0,310 L46,192" stroke="#000" stroke-width="6" fill="none"/>`;
    } else if (k === 'doublet') {
      ink += `<path d="${BODY}" fill="#1c1c1c"/><path d="M-90,230 L-90,440 M90,230 L90,440" stroke="#666" stroke-width="6"/>`;
      top += [250, 300, 350, 400].map(y => `<circle cx="0" cy="${y}" r="8" fill="${C.gold}" stroke="#111" stroke-width="2"/>`).join('');
      let pleats = '';
      for (let i = 0; i < 30; i++) { const a = i / 30 * Math.PI * 2; pleats += `<path d="M0,0 L${Math.cos(a) * 160},${Math.sin(a) * 50}" stroke="#555" stroke-width="3"/>`; }
      col += `<ellipse cx="0" cy="190" rx="160" ry="50" fill="#fff"/>`;
      ink += `<g transform="translate(0 190)"><ellipse rx="160" ry="50" fill="#ddd"/>${pleats}<ellipse rx="160" ry="50" fill="none" stroke="#111" stroke-width="5"/><ellipse rx="66" ry="20" fill="#fff"/></g>`;
    } else if (k === 'suit') {
      ink += `<path d="${BODY}" fill="#262626"/><path d="M-60,196 L-12,330 L-120,250Z M60,196 L12,330 L120,250Z" fill="#000"/>`;
      col += `<path d="M-46,192 L0,330 L46,192Z" fill="#fff"/><path d="M-10,214 L10,214 L18,320 L0,346 L-18,320Z" fill="${C.red}"/>`;
      ink += `<path d="M-46,192 L0,330 L46,192Z" fill="#fff"/><path d="M-10,214 L10,214 L18,320 L0,346 L-18,320Z" fill="url(#gSash)" opacity=".5"/><path d="M-46,192 L0,226 L46,192" stroke="#000" stroke-width="5" fill="none"/>`;
    } else if (k === 'labcoat') {
      ink += `<path d="${BODY}" fill="#e6e6e6"/>
        <path d="M-50,194 L-20,440 M50,194 L20,440 M-50,194 L-110,280 L-40,300 M50,194 L110,280 L40,300" stroke="#000" stroke-width="6" fill="none"/>
        <rect x="-170" y="330" width="70" height="60" fill="none" stroke="#000" stroke-width="5"/>`;
      col += `<path d="M-30,194 L0,280 L30,194Z" fill="${C.red}"/>`;
      top += `<rect x="-160" y="316" width="8" height="40" fill="${C.red}"/><rect x="-146" y="312" width="8" height="44" fill="#111"/>`;
    } else if (k === 'hoodie') {
      col = `<path d="${BODY}" fill="${C.yellow}"/>`;
      ink += `<path d="${BODY}" fill="url(#gCloak)" opacity=".55"/>
        <path d="M-110,196 C-80,260 80,260 110,196" stroke="#000" stroke-width="7" fill="none"/>
        <path d="M-30,240 L-36,330 M30,240 L36,330" stroke="#000" stroke-width="5"/>`;
    }
    ink += `<path d="${BODY}" fill="none" stroke="#000" stroke-width="7"/>`;
    return { col, ink, top };
  }

  function anime(o) {
    o = Object.assign({ x: 0, y: 0, s: 1, flip: false, hair: 'short', hairCol: null, hairTone: '#262626', eyes: 'normal',
      look: [0, 0], iris: '#555', brows: 'neutral', mouth: 'neutral', beard: null, outfit: 'toga', blush: false, id: '' }, o);
    const tr = `translate(${o.x} ${o.y}) scale(${o.flip ? -o.s : o.s} ${o.s})`;
    const H = HAIR[o.hair] || HAIR.short;
    const of = outfit(o);
    const eyeL = eye(o), eyeR = eye(Object.assign({}, o, { look: [-o.look[0], o.look[1]] }));
    const hw = o.headwear || {};
    let col = '', ink = '', top = '';

    col += of.col;
    if (o.hairCol) col += `<path d="${H.back}" fill="${o.hairCol}"/>`;
    col += `<path d="${NECK}" fill="${C.skin}"/><path d="${EAR}" fill="${C.skin}"/><path d="${EAR}" transform="scale(-1 1)" fill="${C.skin}"/><path d="${FACE}" fill="${C.skin}"/>
      <path d="M-30,118 C-10,150 10,150 30,118 L33,170 C10,184 -10,184 -33,170Z" fill="${C.shade}"/>
      <path d="M52,-60 C74,-20 84,36 64,94 C54,118 30,140 0,152 C30,124 46,84 50,36 C53,-4 54,-36 52,-60Z" fill="${C.shade}"/>
      <path d="M-88,-38 C-60,-14 -20,-28 0,-18 C24,-30 60,-14 88,-38 L88,-22 C60,2 20,-10 0,0 C-20,-10 -60,2 -88,-22Z" fill="${C.shade}"/>`;
    if (o.hairCol) col += `<path d="${H.front}" fill="${o.hairCol}"/>`;
    col += hw.col || '';
    if (o.extraCol) col += o.extraCol;

    ink += hw.inkBack || '';
    ink += `<path d="${H.back}" fill="${o.hairTone}"/><path d="${H.back}" fill="none" stroke="#000" stroke-width="5"/>`;
    ink += of.ink;
    ink += `<path d="${NECK}" fill="#fff" stroke="#000" stroke-width="6"/>
      <path d="${EAR}" fill="#fff" stroke="#000" stroke-width="5"/><path d="${EAR}" transform="scale(-1 1)" fill="#fff" stroke="#000" stroke-width="5"/>
      <path d="${FACE}" fill="#fff"/>
      <path d="${FACE}" fill="none" stroke="#000" stroke-width="6"/>
      <path d="M4,54 C8,62 12,70 4,74" stroke="#000" stroke-width="4" fill="none" stroke-linecap="round"/>
      ${MOUTH[o.mouth] || MOUTH.neutral}`;
    if (o.beard === 'full') ink += `<path d="M-90,20 C-94,110 -56,196 0,216 C56,196 94,110 90,20 C84,80 56,96 30,88 C14,84 8,92 0,92 C-8,92 -14,84 -30,88 C-56,96 -84,80 -90,20Z" fill="#2a2a2a"/>
        <path d="M-90,20 C-94,110 -56,196 0,216 C56,196 94,110 90,20" fill="none" stroke="#000" stroke-width="6"/>
        <path d="M-50,140 l10,30 M-20,160 l4,34 M20,160 l-4,34 M50,140 l-10,30" stroke="#888" stroke-width="4"/>${MOUTH[o.mouth] || ''}`;
    if (o.beard === 'pointed') ink += `<path d="M-46,118 C-30,160 -10,214 0,236 C10,214 30,160 46,118 C24,136 -24,136 -46,118Z" fill="#1c1c1c"/>
        <path d="M-6,84 C-24,80 -46,84 -58,96 C-40,94 -20,94 -4,92Z M6,84 C24,80 46,84 58,96 C40,94 20,94 4,92Z" fill="#111"/>`;
    if (o.beard === 'moustache') ink += `<path d="M-4,80 C-30,72 -72,84 -90,148 C-72,122 -48,100 -6,94 L6,94 C48,100 72,122 90,148 C72,84 30,72 4,80Z" fill="${o.mTone || '#555'}" stroke="#000" stroke-width="4"/>`;
    if (o.beard === 'stubble') ink += `<path d="M-70,90 C-60,130 -30,150 0,154 C30,150 60,130 70,90 C50,120 -50,120 -70,90Z" fill="#d6d6d6"/>`;
    ink += `<path d="${H.front}" fill="${o.hairTone}"/><path d="${H.front}" fill="none" stroke="#000" stroke-width="5"/>`;
    ink += hw.ink || '';
    if (o.extraInk) ink += o.extraInk;

    top += `<g class="eyes">${eyeL}<g transform="scale(-1 1)">${eyeR}</g></g>`;
    const br = BROWS[o.brows] || BROWS.neutral;
    top += `<path d="${br}" stroke="#111" stroke-width="8" fill="none" stroke-linecap="round"/><path d="${br}" transform="scale(-1 1)" stroke="#111" stroke-width="8" fill="none" stroke-linecap="round"/>`;
    if (H.shine && !o.noShine) top += `<path d="${H.shine}" stroke="#fff" stroke-width="7" fill="none" stroke-dasharray="22 12" stroke-linecap="round" opacity=".9"/>`;
    if (o.blush) top += `<path d="M-74,66 l10,-10 M-62,68 l10,-10 M-50,70 l10,-10 M74,66 l-10,-10 M62,68 l-10,-10 M50,70 l-10,-10" stroke="${C.red}" stroke-width="4" stroke-linecap="round"/>`;
    if (o.sweat) top += `<path d="M104,-70 C96,-50 92,-36 100,-28 C108,-22 120,-30 116,-44 C114,-54 108,-62 104,-70Z" fill="#fff" stroke="#111" stroke-width="4"/>`;
    top += hw.top || '';
    top += of.top;
    if (o.extraTop) top += o.extraTop;

    const g = s => `<g transform="${tr}">${s}</g>`;
    return { col: g(col), ink: g(ink), top: `<g transform="${tr}"${o.id ? ` id="${o.id}"` : ''}>${top}</g>` };
  }

  // головные уборы
  const HEADWEAR = {
    laurel: () => ({ col: laurel(116, 196, 344, 8, C.gold), ink: laurel(116, 196, 344, 8, 'none', '#000') }),
    gallic: () => ({
      col: `<path d="M-30,-128 C-20,-210 90,-224 132,-150 C92,-170 34,-160 30,-128Z" fill="${C.red}"/>`,
      ink: `<path d="M-30,-128 C-20,-210 90,-224 132,-150 C92,-170 34,-160 30,-128Z" fill="#999" stroke="#000" stroke-width="5"/>
        <path d="M-108,-20 C-116,-150 116,-150 108,-20 C80,-60 -80,-60 -108,-20Z" fill="#8a8a8a" stroke="#000" stroke-width="6"/>
        <path d="M-100,-30 L-104,70 L-76,82 L-70,-26Z M100,-30 L104,70 L76,82 L70,-26Z" fill="#777" stroke="#000" stroke-width="5"/>
        <path d="M-90,-60 C-40,-80 40,-80 90,-60" stroke="#000" stroke-width="6" fill="none"/>`
    }),
    turban: () => ({
      col: `<path d="M-116,-10 C-136,-124 -60,-176 0,-174 C60,-176 136,-124 116,-10 C92,-46 40,-58 0,-56 C-40,-58 -92,-46 -116,-10Z" fill="#fff"/><circle cx="0" cy="-70" r="16" fill="${C.red}"/>`,
      ink: `<path d="M-116,-10 C-136,-124 -60,-176 0,-174 C60,-176 136,-124 116,-10 C92,-46 40,-58 0,-56 C-40,-58 -92,-46 -116,-10Z" fill="url(#gTurban)"/>
        <path d="M-110,-40 C-50,-110 60,-120 120,-50 M-120,-70 C-60,-140 50,-150 110,-90 M-100,-110 C-40,-160 40,-160 90,-130 M-60,-60 C-30,-130 40,-160 80,-150" stroke="#000" stroke-width="5" fill="none"/>
        <path d="M-116,-10 C-136,-124 -60,-176 0,-174 C60,-176 136,-124 116,-10 C92,-46 40,-58 0,-56 C-40,-58 -92,-46 -116,-10Z" fill="none" stroke="#000" stroke-width="6"/>
        <circle cx="0" cy="-70" r="16" fill="none" stroke="#000" stroke-width="4"/>`
    }),
    beret: () => ({
      col: `<path d="M48,-118 C90,-190 150,-200 170,-170 C130,-170 90,-150 64,-112Z" fill="#fff"/>`,
      ink: `<path d="M-124,-60 C-130,-140 110,-170 140,-90 C100,-66 -50,-50 -124,-60Z" fill="#141414" stroke="#000" stroke-width="5"/>
        <path d="M48,-118 C90,-190 150,-200 170,-170 C130,-170 90,-150 64,-112Z" fill="#ccc" stroke="#000" stroke-width="4"/>
        <path d="M60,-120 C100,-170 140,-180 166,-172" stroke="#000" stroke-width="3" fill="none"/>`
    }),
    corinth: () => ({ // коринфский шлем на затылке
      col: `<path d="M-150,-120 C-150,-300 190,-320 230,-140 C170,-250 -100,-250 -110,-110Z" fill="${C.red}"/>`,
      inkBack: `<path d="M-150,-120 C-150,-300 190,-320 230,-140 C170,-250 -100,-250 -110,-110Z" fill="url(#gCrest)"/>
        ${Array.from({ length: 14 }, (_, i) => `<path d="M${-130 + i * 24},${-150 - Math.sin(i / 13 * Math.PI) * 110} l${6 + i},40" stroke="#000" stroke-width="4"/>`).join('')}
        <path d="M-150,-120 C-150,-300 190,-320 230,-140 C170,-250 -100,-250 -110,-110Z" fill="none" stroke="#000" stroke-width="5"/>`,
      ink: `<path d="M-118,-40 C-130,-190 130,-200 118,-40 L100,-60 L60,-70 L36,-50 L-36,-50 L-60,-70 L-100,-60Z" fill="url(#gBronze)" stroke="#000" stroke-width="6"/>
        <path d="M-90,-88 L-40,-80 L-36,-60 L-86,-66Z M90,-88 L40,-80 L36,-60 L86,-66Z" fill="#000"/>
        <path d="M-6,-80 L6,-80 L6,-50 L-6,-50Z" fill="#000"/>`
    })
  };

  // кулак (держит предмет), центр в (0,0)
  function fist(x, y, s = 1, rot = 0) {
    const t = `translate(${x} ${y}) rotate(${rot}) scale(${s})`;
    const p = 'M-34,-26 C-34,-44 34,-44 38,-26 L40,22 C40,40 -30,42 -34,26Z';
    return {
      col: `<g transform="${t}"><path d="${p}" fill="${C.skin}"/></g>`,
      ink: `<g transform="${t}"><path d="${p}" fill="#fff" stroke="#000" stroke-width="5"/>
        <path d="M20,-30 L38,-26 L40,22 L24,30Z" fill="#bbb"/>
        <path d="M-34,-8 H38 M-34,8 H38" stroke="#000" stroke-width="3" fill="none"/>
        <path d="M6,-22 C26,-34 48,-12 34,6" fill="#fff" stroke="#000" stroke-width="5"/></g>`
    };
  }
  // рукав: путь от плеча к кисти
  function sleeve(d, color, w = 56) {
    return {
      col: `<path d="${d}" stroke="${color}" stroke-width="${w}" fill="none" stroke-linecap="round"/>`,
      ink: `<path d="${d}" stroke="#000" stroke-width="${w + 12}" fill="none" stroke-linecap="round"/><path d="${d}" stroke="#c8c8c8" stroke-width="${w}" fill="none" stroke-linecap="round"/>
            <path d="${d}" stroke="#fff" stroke-width="${w * .4}" fill="none" stroke-linecap="round" transform="translate(-6 -6)"/>`
    };
  }

  // ---------- окружение
  function mountains(y, tone = '#9a9a9a', seed = 1, h = 260) {
    let d = `M-700,${y}`;
    for (let x = -700; x <= 2300; x += 120) {
      const k = Math.sin(x * .013 + seed) * .5 + Math.sin(x * .031 + seed * 2) * .35;
      d += ` L${x + 60},${(y - h * (.45 + k * .5)).toFixed(1)} L${x + 120},${(y - h * (.2 + Math.abs(Math.sin(x * .02 + seed)) * .2)).toFixed(1)}`;
    }
    d += ` L2300,${y + 600} L-700,${y + 600}Z`;
    return `<path d="${d}" fill="${tone}" stroke="#000" stroke-width="4"/>`;
  }
  function cloud(x, y, s = 1) {
    const d = 'M-120,30 C-150,30 -150,-10 -120,-14 C-130,-50 -80,-70 -54,-46 C-40,-90 30,-90 44,-46 C70,-70 120,-50 110,-14 C150,-10 150,30 120,30Z';
    return `<g transform="translate(${x} ${y}) scale(${s})"><path d="${d}" fill="#fff" stroke="#000" stroke-width="5"/><path d="M-120,30 C-60,12 60,12 120,30Z" fill="#bbb"/></g>`;
  }
  function column(x, y, h, w = 60) {
    let fl = '';
    for (let i = 1; i < 5; i++) fl += `<path d="M${x - w / 2 + i * w / 5},${y - h + 30} V${y - 24}" stroke="#000" stroke-width="3"/>`;
    return `<rect x="${x - w / 2}" y="${y - h + 24}" width="${w}" height="${h - 48}" fill="url(#gCylV)"/>${fl}
      <rect x="${x - w / 2 - 14}" y="${y - h}" width="${w + 28}" height="26" fill="#ddd" stroke="#000" stroke-width="4"/>
      <rect x="${x - w / 2 - 10}" y="${y - 26}" width="${w + 20}" height="26" fill="#ddd" stroke="#000" stroke-width="4"/>
      <rect x="${x - w / 2}" y="${y - h + 24}" width="${w}" height="${h - 48}" fill="none" stroke="#000" stroke-width="4"/>`;
  }
  function temple(x, y, s = 1) {
    let cols = '';
    for (let i = 0; i < 6; i++) cols += column(-250 + i * 100, 0, 260, 44);
    return `<g transform="translate(${x} ${y}) scale(${s})">
      <path d="M-320,-260 L0,-380 L320,-260Z" fill="#ccc" stroke="#000" stroke-width="5"/>
      <rect x="-320" y="-262" width="640" height="34" fill="#888" stroke="#000" stroke-width="4"/>${cols}
      <rect x="-340" y="0" width="680" height="30" fill="#aaa" stroke="#000" stroke-width="4"/></g>`;
  }
  function tent(x, y, s = 1) {
    const t = `translate(${x} ${y}) scale(${s})`;
    return {
      col: `<g transform="${t}"><path d="M-170,0 L-120,-190 L120,-190 L170,0Z" fill="#fff"/><path d="M-120,-190 L0,-260 L120,-190Z" fill="${C.red}"/></g>`,
      ink: `<g transform="${t}"><path d="M-170,0 L-120,-190 L120,-190 L170,0Z" fill="#d6d6d6" stroke="#000" stroke-width="5"/>
        <path d="M-120,-190 L0,-260 L120,-190Z" fill="#9a9a9a" stroke="#000" stroke-width="5"/>
        <path d="M-120,-150 L120,-150 M-130,-110 L130,-110" stroke="#000" stroke-width="3"/>
        <path d="M-50,0 L0,-170 L50,0Z" fill="#111"/><path d="M0,-260 V-300" stroke="#000" stroke-width="6"/></g>`
    };
  }
  function palisade(x0, x1, y, h = 120) {
    let s = '';
    for (let x = x0; x < x1; x += 34) { const j = (x * 7 % 20 + 20) % 20; s += `<path d="M${x},${y} V${y - h + j} L${x + 14},${y - h - 22 + j} L${x + 28},${y - h + j} V${y}Z" fill="#7a7a7a" stroke="#000" stroke-width="3"/>`; }
    return s + `<path d="M${x0},${y - h * .45} H${x1}" stroke="#000" stroke-width="8"/>`;
  }
  function aquila(x, y, s = 1) {
    return {
      col: `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-70" y="-250" width="140" height="80" fill="${C.red}"/><path d="M-60,-330 C-30,-300 -10,-300 0,-320 C10,-300 30,-300 60,-330 C50,-290 20,-270 0,-276 C-20,-270 -50,-290 -60,-330Z" fill="${C.gold}"/></g>`,
      ink: `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-6" y="-320" width="12" height="320" fill="#333"/>
        <rect x="-70" y="-250" width="140" height="80" fill="none" stroke="#000" stroke-width="5"/>
        <path d="M-60,-330 C-30,-300 -10,-300 0,-320 C10,-300 30,-300 60,-330 C50,-290 20,-270 0,-276 C-20,-270 -50,-290 -60,-330Z" fill="#aaa" stroke="#000" stroke-width="4"/>
        <path d="M-70,-170 L-60,-150 L-50,-170 L-40,-150 L-30,-170 L-20,-150 L-10,-170 L0,-150 L10,-170 L20,-150 L30,-170 L40,-150 L50,-170 L60,-150 L70,-170" stroke="#000" stroke-width="3" fill="none"/></g>`,
      top: `<text x="${x}" y="${y - 198 * s}" font-family="Cinzel, serif" font-weight="700" font-size="${34 * s}" text-anchor="middle" fill="${C.gold}">SPQR</text>`
    };
  }
  function tree(x, y, s) {
    return `<g transform="translate(${x},${y}) scale(${s})">
      <path d="M-14,0 L-10,-170 L10,-170 L14,0Z" fill="#111"/>
      <path d="M0,-480 L-70,-330 L-40,-330 L-110,-200 L-70,-200 L-130,-110 L130,-110 L70,-200 L110,-200 L40,-330 L70,-330Z" fill="#1b1b1b" stroke="#000" stroke-width="4"/>
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
    let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#555" stroke="#000" stroke-width="6"/>`;
    const rh = h / rows;
    for (let r = 0; r < rows; r++) {
      const yy = y + r * rh;
      s += `<rect x="${x + 10}" y="${yy + 8}" width="${w - 20}" height="${rh - 16}" fill="#222"/>`;
      for (let i = 0; i < Math.floor((w - 30) / 34); i++) {
        const kind = (i * 7 + r * 3) % 4, bx = x + 18 + i * 34;
        if (kind === 0) s += `<circle cx="${bx + 14}" cy="${yy + rh - 30}" r="16" fill="#ddd" stroke="#000" stroke-width="3"/><circle cx="${bx + 14}" cy="${yy + rh - 30}" r="5" fill="#000"/>`;
        else s += `<rect x="${bx}" y="${yy + 16 + kind * 6}" width="28" height="${rh - 32 - kind * 6}" fill="${kind === 2 ? '#bbb' : '#888'}" stroke="#000" stroke-width="3"/>`;
      }
    }
    return s;
  }
  function speedlines(cx, cy, r0, r1, n = 48, tone = '#000') {
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
      s += `<rect x="${x}" y="${y - h}" width="${w}" height="${h}" fill="#555" stroke="#000" stroke-width="3"/>`;
      for (let wy = y - h + 16; wy < y - 14; wy += 26) for (let wx = x + 10; wx < x + w - 14; wx += 20) if ((wx + wy + i) % 3) s += `<rect x="${wx}" y="${wy}" width="9" height="12" fill="#eee"/>`;
      x += w + 6; i++;
    }
    return s;
  }

  // Профиль Цезаря (как на монете) — обложка и финал
  const HEAD = `M-70,-95 C-30,-125 40,-118 70,-80 C82,-62 86,-45 88,-30 L92,-18
    C96,-8 104,8 116,22 L106,30 L100,32 C102,40 104,44 102,48 L96,52 C100,58 99,64 94,68
    C96,78 94,90 84,98 C66,108 44,108 30,104 L34,150 L-50,150 C-55,120 -70,100 -88,70
    C-110,30 -108,-55 -70,-95Z`;
  function caesarCoin(tr, opt = {}) {
    const dark = opt.dark || '#060606';
    let locks = '';
    for (let i = 0; i < 9; i++) { const a = (200 + i * 15) * Math.PI / 180; locks += `<path d="M${(Math.cos(a) * 70).toFixed(1)},${(Math.sin(a) * 70).toFixed(1)} q${(Math.cos(a + 1) * 30).toFixed(1)},${(Math.sin(a + 1) * 30).toFixed(1)} ${(Math.cos(a + .3) * 44).toFixed(1)},${(Math.sin(a + .3) * 44).toFixed(1)}" stroke="#777" stroke-width="5" fill="none"/>`; }
    return {
      col: `<g transform="${tr}">
        <path d="M-50,140 C-150,165 -210,230 -225,380 L235,380 C225,250 170,170 34,140Z" fill="#fff"/>
        <path d="M-200,210 C-80,280 70,300 200,240 L225,320 C70,380 -90,350 -215,280Z" fill="${C.red}"/>
        ${laurel(104, 150, 292, 8, C.yellow)}</g>`,
      ink: `<g transform="${tr}">
        <path d="${HEAD}" fill="${dark}"/>${locks}
        <path d="M-50,140 C-150,165 -210,230 -225,380 L235,380 C225,250 170,170 34,140Z" fill="url(#gToga)"/>
        <path d="M-200,210 C-80,280 70,300 200,240 L225,320 C70,380 -90,350 -215,280Z" fill="url(#gSash)"/>
        <path d="M-120,190 C-90,260 -60,330 -70,380 M-20,170 C0,250 10,320 0,380 M90,180 C110,250 130,320 140,380" stroke="#000" stroke-width="7" fill="none"/>
        ${laurel(104, 150, 292, 8, 'none', '#000')}</g>`,
      top: `<g transform="${tr}"><path d="M50,-14 C60,-24 76,-22 82,-12 C72,-6 60,-6 50,-14Z" fill="#fff"/><circle cx="68" cy="-13" r="5" fill="${C.red}"/>
        <path d="M44,-34 C58,-44 76,-42 88,-34" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round"/></g>`
    };
  }

  const GRADS = `
    <linearGradient id="gToga" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8a8a8a"/><stop offset=".4" stop-color="#f2f2f2"/><stop offset="1" stop-color="#6a6a6a"/></linearGradient>
    <linearGradient id="gSash" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#666"/><stop offset=".5" stop-color="#d0d0d0"/><stop offset="1" stop-color="#444"/></linearGradient>
    <linearGradient id="gCloak" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3a3a3a"/><stop offset=".5" stop-color="#a5a5a5"/><stop offset="1" stop-color="#2e2e2e"/></linearGradient>
    <linearGradient id="gTurban" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e2e2e2"/><stop offset="1" stop-color="#8a8a8a"/></linearGradient>
    <linearGradient id="gRobe" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7a7a7a"/><stop offset=".5" stop-color="#e8e8e8"/><stop offset="1" stop-color="#6a6a6a"/></linearGradient>
    <linearGradient id="gBronze" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2a2a2a"/><stop offset=".55" stop-color="#dcdcdc"/><stop offset=".8" stop-color="#8a8a8a"/><stop offset="1" stop-color="#1a1a1a"/></linearGradient>
    <linearGradient id="gCrest" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#444"/><stop offset="1" stop-color="#bbb"/></linearGradient>
    <linearGradient id="gDrip" gradientUnits="userSpaceOnUse" x1="0" y1="-60" x2="0" y2="380"><stop offset="0" stop-color="#000"/><stop offset=".45" stop-color="#3a3a3a"/><stop offset="1" stop-color="#f4f4f4"/></linearGradient>
    <linearGradient id="gFadeDown" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000"/><stop offset=".55" stop-color="#666"/><stop offset="1" stop-color="#fff"/></linearGradient>
    <linearGradient id="gFadeUp" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#222"/><stop offset=".6" stop-color="#aaa"/><stop offset="1" stop-color="#fff"/></linearGradient>
    <linearGradient id="gCylH" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#222"/><stop offset=".35" stop-color="#ececec"/><stop offset="1" stop-color="#1c1c1c"/></linearGradient>
    <linearGradient id="gCylV" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#333"/><stop offset=".35" stop-color="#ececec"/><stop offset="1" stop-color="#2a2a2a"/></linearGradient>
    <linearGradient id="gWood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a8a8a"/><stop offset="1" stop-color="#3a3a3a"/></linearGradient>
    <radialGradient id="gGlow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff"/><stop offset=".6" stop-color="#bbb"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <radialGradient id="gSphere" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#fff"/><stop offset=".6" stop-color="#999"/><stop offset="1" stop-color="#222"/></radialGradient>
    <linearGradient id="gHand" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4f4f4"/><stop offset=".55" stop-color="#bbb"/><stop offset="1" stop-color="#4a4a4a"/></linearGradient>
    <linearGradient id="gSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#555"/><stop offset="1" stop-color="#fff"/></linearGradient>
  `;

  window.ART = { C, BG, FONT, inkBase, bubble, anime, HEADWEAR, fist, sleeve, mountains, cloud, column, temple, tent, palisade, aquila, tree, bush, shelf, speedlines, skyline, laurel, caesarCoin, HEAD, GRADS };
})();
