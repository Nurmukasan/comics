/* Фильтры печати: «гравюра» (штрихи) и «полутон» (растровые точки).
   Узор — маленькая бесшовная плитка 360×360 единиц, которую feTile
   размножает по кадру. SVG-фильтр сравнивает узор с темнотой рисунка:
   где темнее, там толще штрих или крупнее точка. */
(function () {
  const T = 180;      // размер плитки в единицах кадра
  const PX = 4;       // пикселей плитки на единицу
  const TAU = Math.PI * 2;

  // kind: lines (dir 0 — вертикальные, 1 — диагональ 45°) или dots
  function tile(kind, dir, k, seed) {
    const N = T * PX;
    const cv = document.createElement('canvas'); cv.width = N; cv.height = N;
    const ctx = cv.getContext('2d');
    const img = ctx.createImageData(N, N), d = img.data;
    for (let py = 0; py < N; py++) {
      const y = py / PX;
      for (let px = 0; px < N; px++) {
        const x = px / PX;
        let val;
        if (kind === 'lines') {
          const u = dir ? (x + y) : x, v = dir ? (y - x) : y;
          const w = 3.6 * Math.sin(TAU * v / T + seed) + 2 * Math.sin(TAU * 3 * v / T + TAU * u / T + seed * 2.1) + 1.1 * Math.sin(TAU * 7 * v / T + TAU * 2 * u / T + seed * 3.3);
          let t = ((u + w * (dir ? 1.4142 : 1)) * k / T) % 1; if (t < 0) t += 1;
          val = 1 - Math.abs(2 * t - 1);
        } else {
          let fu = ((x + y) * k / T) % 1, fv = ((y - x) * k / T) % 1;
          if (fu < 0) fu += 1; if (fv < 0) fv += 1;
          const du = fu - .5, dv = fv - .5;
          val = Math.min(1, Math.sqrt(du * du + dv * dv) / .7071);
        }
        const g = 14 + val * 226 | 0;
        const i = (py * N + px) * 4; d[i] = d[i + 1] = d[i + 2] = g; d[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    const data = cv.toDataURL('image/png'), bin = atob(data.split(',')[1]);
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    try { return URL.createObjectURL(new Blob([u8], { type: 'image/png' })); } catch (e) { return data; }
  }

  // engV: 20 вертикальных линий на плитку (шаг 9); engD: 14 диагоналей (шаг ≈ 9,1)
  // dotK: 12 ячеек по диагонали (шаг ≈ 10,6); dotR: 10 (шаг ≈ 12,7)
  const LIST = {
    engV: { kind: 'lines', dir: 0, k: 20, color: '#111' },
    engD: { kind: 'lines', dir: 1, k: 14, color: '#111' },
    dotK: { kind: 'dots', dir: 0, k: 12, color: '#111' },
    dotR: { kind: 'dots', dir: 0, k: 10, color: '#e2231a' }
  };

  // плитка кладётся в угол области фильтра: иначе она обрезается и feTile нечего повторять
  function body(type, href, ox = 0, oy = 0) {
    const F = LIST[type];
    return `<feImage data-fx="${type}" href="${href}" x="${ox}" y="${oy}" width="${T}" height="${T}" preserveAspectRatio="none" result="t"/>
      <feTile in="t" result="st"/>
      <feColorMatrix in="st" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  .2126 .7152 .0722 0 0" result="S"/>
      <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -.2126 -.7152 -.0722 0 1" result="D"/>
      <feComposite in="D" in2="S" operator="arithmetic" k1="0" k2="1" k3="-1" k4=".5"/>
      <feComponentTransfer result="M"><feFuncA type="linear" slope="12" intercept="-5.6"/></feComponentTransfer>
      <feFlood flood-color="${F.color}"/><feComposite in2="M" operator="in"/>`;
  }
  function setImg(fe, url) { fe.setAttribute('href', url); fe.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', url); }

  let uid = 0;
  window.FX = {
    install(defs) {
      for (const id in LIST) {
        const F = LIST[id];
        F.imgs = [tile(F.kind, F.dir, F.k, 1.3)];
        defs.insertAdjacentHTML('beforeend', `<filter id="${id}" filterUnits="userSpaceOnUse" x="-1200" y="-1200" width="4000" height="3400" color-interpolation-filters="sRGB">${body(id, F.imgs[0], -1200, -1200)}</filter>`);
      }
      const idle = window.requestIdleCallback || (cb => setTimeout(cb, 600));
      idle(() => { for (const id in LIST) { const F = LIST[id]; if (F.kind === 'lines') F.imgs[1] = tile(F.kind, F.dir, F.k, 4.1); } });
      defs.insertAdjacentHTML('beforeend', `<filter id="rough" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="2" seed="4" result="n"/>
        <feDisplacementMap in="SourceGraphic" in2="n" scale="5" xChannelSelector="R" yChannelSelector="G"/></filter>`);
    },
    // фильтр под конкретный кадр: область = видимая часть кадра
    local(type, region) {
      const [x, y, w, h] = region, id = 'fx' + (++uid);
      const ox = Math.floor(x / T) * T, oy = Math.floor(y / T) * T;   // сетка плиток общая — без швов
      const fx = Math.max(x, ox), fy = Math.max(y, oy);
      return { id, svg: `<filter id="${id}" filterUnits="userSpaceOnUse" x="${ox}" y="${oy}" width="${(w + x - ox + T).toFixed(1)}" height="${(h + y - oy + T).toFixed(1)}" color-interpolation-filters="sRGB">${body(type, LIST[type].imgs[0], ox, oy)}</filter>` };
    },
    // «кипение» штриха: две версии узора сменяют друг друга (только в видимых кадрах)
    boil(flag, root) {
      (root || document).querySelectorAll('feImage[data-fx]').forEach(fe => {
        const F = LIST[fe.dataset.fx]; if (F && F.imgs[1]) setImg(fe, F.imgs[flag ? 1 : 0]);
      });
    }
  };
})();
