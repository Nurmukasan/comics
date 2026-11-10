// Покадровая съёмка 3D-книги для трейлера → trailer/assets/book.mp4
// 1) в корне проекта: python3 -m http.server 8000
// 2) в папке trailer: node capture.mjs [http://localhost:8000/]   (нужны playwright и ffmpeg)
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';

const URL = process.argv[2] || 'http://localhost:8000/';
const FPS = 15;
const OUT = 'frames';
// [страница, первый шаг, последний шаг, секунд, захватить перелистывание перед страницей]
const PLAN = [
  ['cover', 0, 1, 2.6, true], ['cast', 0, 0, 1.6, true], ['sparta', 1, 2, 2.6], ['camp', 0, 1, 2.4, true],
  ['enemy', 0, 1, 2.2], ['kindi', 0, 1, 2.0, true], ['enigma', 1, 2, 2.0], ['pubkey', 0, 1, 1.8, true], ['verdict', 0, 0, 1.8]
];

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(URL);
await page.waitForFunction(() => document.documentElement.classList.contains('ready'), null, { timeout: 60000 });
await page.waitForTimeout(2000);

const segs = await page.evaluate(plan => {
  const B = window.__book;
  B.stTrig.disable(false);
  for (const s of ['.hud', '.progress', '#scrollHint']) document.querySelector(s).style.display = 'none';
  return plan.map(([id, a, z, sec, withFlip]) => {
    const st = B.steps.filter(s => s.page.id === id);
    let t0 = st[a].T;
    if (withFlip && a === 0) { const prev = B.steps[st[a].idx - 1]; t0 = prev ? prev.T + prev.len - .05 : 0; }
    return [t0, st[z].T + st[z].len - .05, sec];
  });
}, PLAN);

let n = 0;
for (const [t0, t1, sec] of segs) {
  const N = Math.round(sec * FPS);
  for (let i = 0; i < N; i++) {
    const k = i / (N - 1), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    await page.evaluate(t => { window.__book.master.time(t); return new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); }, t0 + (t1 - t0) * (.15 * k + .85 * e));
    await page.screenshot({ path: `${OUT}/${String(n++).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 88 });
  }
  console.log('сегмент готов, кадров:', n);
}
await browser.close();

execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', String(FPS), '-i', `${OUT}/%04d.jpg`, '-vf', 'fps=30',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '22', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', 'assets/book.mp4'], { stdio: 'inherit' });
rmSync(OUT, { recursive: true, force: true });
console.log('assets/book.mp4 готов');
