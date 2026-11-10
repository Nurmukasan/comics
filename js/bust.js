/* 3D-бюст Цезаря: реальный скан головы + лавровый венок и тога.
   Шейдер «гравюра»: штрихи — горизонтальные сечения формы, поэтому они
   огибают голову, как на старинных гравюрах; в глубокой тени добавляется
   перекрёстная штриховка. Голова следит за курсором или пальцем. */
import * as THREE from 'three';
import { GLTFLoader } from '../vendor/three/addons/loaders/GLTFLoader.js';

const hex = h => { const n = parseInt(h.slice(1), 16); return new THREE.Vector3((n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255); };

function engrave(o) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: o.rough ?? .6, metalness: 0, normalMap: o.normalMap || null, side: o.side || THREE.FrontSide });
  if (o.normalMap) m.normalScale = new THREE.Vector2(1.2, 1.2);
  m.onBeforeCompile = sh => {
    sh.uniforms.uPaper = { value: hex(o.paper) };
    sh.uniforms.uInk = { value: hex(o.ink || '#111111') };
    sh.uniforms.uDen = { value: o.den || 34 };
    sh.uniforms.uBias = { value: o.bias || 0 };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWP;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWP; uniform vec3 uPaper; uniform vec3 uInk; uniform float uDen; uniform float uBias;')
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
        float lum = clamp(dot(gl_FragColor.rgb, vec3(.299, .587, .114)), 0., 1.);
        float D = clamp(1. - lum + uBias, 0., 1.);
        float wob = sin(vWP.x * 7.0 + vWP.z * 3.0) * .018 + sin(vWP.z * 17.0) * .006;
        float c1 = (vWP.y + wob) * uDen;
        float t1 = abs(fract(c1) - .5) * 2.;
        float w1 = fwidth(c1) * 1.2;
        float ink1 = 1. - smoothstep(D - w1, D + w1, t1);
        float c2 = (vWP.x * .74 - vWP.y * .67 + wob) * uDen * 1.15;
        float t2 = abs(fract(c2) - .5) * 2.;
        float D2 = clamp((D - .58) * 2.3, 0., 1.);
        float w2 = fwidth(c2) * 1.2;
        float ink2 = 1. - smoothstep(D2 - w2, D2 + w2, t2);
        float ink = max(ink1, ink2);
        gl_FragColor = vec4(mix(uPaper, uInk, ink), 1.);`);
  };
  return m;
}

export async function createBust(host, opts = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.setClearColor(0x000000, 0);
  host.appendChild(renderer.domElement);
  renderer.domElement.className = 'bust-canvas';

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(26, 1, .1, 50);
  camera.position.set(0, .15, 7.2);
  camera.lookAt(0, -.15, 0);

  scene.add(new THREE.AmbientLight(0xffffff, .28));
  const key = new THREE.DirectionalLight(0xffffff, 2.3); key.position.set(-3, 3.2, 4); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, .9); rim.position.set(4, 1, -2); scene.add(rim);
  const fill = new THREE.DirectionalLight(0xffffff, .25); fill.position.set(2, -2, 3); scene.add(fill);

  const pivot = new THREE.Group(); scene.add(pivot);
  const headG = new THREE.Group(); pivot.add(headG);

  const tex = await new THREE.TextureLoader().loadAsync(opts.normal || 'assets/3d/head-normal.jpg');
  tex.flipY = false;
  const gltf = await new GLTFLoader().loadAsync(opts.model || 'assets/3d/head.glb');
  let head;
  gltf.scene.traverse(o => { if (o.isMesh && !head) head = o; });
  head.geometry.computeBoundingBox();
  const bb = head.geometry.boundingBox, size = new THREE.Vector3(), ctr = new THREE.Vector3();
  bb.getSize(size); bb.getCenter(ctr);
  const k = 2.1 / size.y;
  head.geometry.translate(-ctr.x, -ctr.y, -ctr.z);
  head.geometry.scale(k, k, k);
  head.material = engrave({ paper: '#ffffff', normalMap: tex, den: 36, rough: .7 });
  head.position.set(0, 0, 0); head.rotation.set(0, 0, 0); head.scale.set(1, 1, 1);
  headG.add(head);

  // лавровый венок: веточки по кругу черепа, листья смотрят вперёд и вверх, спереди разрыв
  const H = size.y * k, W = size.x * k, Dp = size.z * k;
  const leafGeo = new THREE.SphereGeometry(1, 12, 8); leafGeo.scale(.1, .018, .036);
  const leafMat = engrave({ paper: '#f3c117', den: 80, rough: .35 });
  const wreath = new THREE.Group();
  const rx = opts.rx ?? W * .35, rz = opts.rz ?? Dp * .47, y0 = opts.wy ?? H * .31, zc = opts.zc ?? -Dp * .06;
  const up = new THREE.Vector3(0, 1, 0), m4 = new THREE.Matrix4();
  for (let i = 0; i < 34; i++) {
    const th = .55 + (i / 33) * (Math.PI * 2 - 1.1);
    const front = th < Math.PI ? new THREE.Vector3(-Math.cos(th), 0, Math.sin(th)) : new THREE.Vector3(Math.cos(th), 0, -Math.sin(th));
    const out = new THREE.Vector3(Math.sin(th), 0, Math.cos(th) * rz / rx).normalize();
    for (const [phi, dy] of [[.75, .035], [-.25, -.02]]) {
      const leaf = new THREE.Mesh(leafGeo, leafMat);
      const X = front.clone().multiplyScalar(Math.cos(phi)).add(up.clone().multiplyScalar(Math.sin(phi))).normalize();
      const Z = new THREE.Vector3().crossVectors(X, out).normalize();
      const Y = new THREE.Vector3().crossVectors(Z, X).normalize();
      m4.makeBasis(X, Y, Z);
      leaf.quaternion.setFromRotationMatrix(m4);
      leaf.position.set(Math.sin(th) * rx * 1.02, y0 + .06 * Math.cos(th) + dy, Math.cos(th) * rz + zc).add(X.clone().multiplyScalar(.06)).add(out.clone().multiplyScalar(.015));
      wreath.add(leaf);
    }
  }
  headG.add(wreath);

  // плечи в тоге и красная перевязь (полоса той же формы, наискосок)
  const togaGeo = new THREE.SphereGeometry(1, 64, 32, 0, Math.PI * 2, 0, Math.PI * .5);
  togaGeo.scale(1.38, .9, .78);
  const toga = new THREE.Mesh(togaGeo, engrave({ paper: '#ffffff', den: 30 }));
  toga.position.set(0, -H * .64, -.08);
  pivot.add(toga);
  const sashGeo = new THREE.SphereGeometry(1.012, 64, 8, 0, Math.PI, Math.PI * .28, Math.PI * .1);
  sashGeo.scale(1.38, .9, .78);
  const sash = new THREE.Mesh(sashGeo, engrave({ paper: '#e2231a', den: 40 }));
  sash.position.copy(toga.position); sash.rotation.set(.15, 0, -.55);
  pivot.add(sash);

  // состояние
  const st = { yaw: opts.yaw ?? -.5, tilt: 0, lookX: 0, lookY: 0, tx: 0, ty: 0, visible: true, t: 0 };
  const onMove = (x, y) => { st.tx = x; st.ty = y; };
  addEventListener('pointermove', e => onMove(e.clientX / innerWidth * 2 - 1, e.clientY / innerHeight * 2 - 1), { passive: true });
  addEventListener('deviceorientation', e => { if (e.gamma != null) onMove(Math.max(-1, Math.min(1, e.gamma / 30)), Math.max(-1, Math.min(1, (e.beta - 45) / 30))); }, { passive: true });

  function resize() {
    // размер в единицах страницы (без учёта зума камеры), плотность ограничена
    const w = Math.max(2, host.offsetWidth || 600), h = Math.max(2, host.offsetHeight || 600);
    renderer.setPixelRatio(Math.min(1.5, (devicePixelRatio || 1)));
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(host); resize();

  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    if (!st.visible || document.hidden) return;
    if (now - last < 32) return;            // ~30 кадров/с хватает бюсту
    const dt = Math.min(.05, (now - last) / 1000); last = now; st.t += dt;
    st.lookX += (st.tx - st.lookX) * Math.min(1, dt * 3);
    st.lookY += (st.ty - st.lookY) * Math.min(1, dt * 3);
    pivot.rotation.y = st.yaw + st.lookX * .45;
    headG.rotation.x = st.tilt + st.lookY * .18 + Math.sin(st.t * 1.1) * .012;
    headG.rotation.z = Math.sin(st.t * .7) * .015;
    pivot.position.y = Math.sin(st.t * 1.3) * .02;
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);

  return {
    set yaw(v) { st.yaw = v; }, get yaw() { return st.yaw; },
    set tilt(v) { st.tilt = v; },
    set visible(v) { st.visible = v; },
    resize,
    moveTo(newHost) { newHost.appendChild(renderer.domElement); host = newHost; resize(); }
  };
}
