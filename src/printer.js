// Интерактивният принтер в hero секцията.
// Bed-slinger като Ender-а в ателието: масата се движи по Y, главата по X, гредата по Z.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const MM_PER_UNIT = 20;
const LAYER_MM = 0.2;
const NOZZLE_Z = 0.2;

/* ───────────── геометрии ───────────── */

function prep(g) {
  const n = g.index ? g.toNonIndexed() : g;
  n.deleteAttribute('uv');
  return n;
}
const merge = (list) => mergeGeometries(list.map(prep), false);
const v2 = (pts) => pts.map(([r, y]) => new THREE.Vector2(r, y));

// Капачка за джанта — печата се „с лицето надолу“, както е на снимките им.
function capModel() {
  const shape = new THREE.Shape();
  const N = 200;
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2;
    const r = 1.42 + 0.07 * Math.cos(a * 10);
    i ? shape.lineTo(r * Math.cos(a), r * Math.sin(a)) : shape.moveTo(r, 0);
  }
  const plate = new THREE.ExtrudeGeometry(shape, {
    depth: 0.1, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2, curveSegments: 1,
  });
  plate.rotateX(-Math.PI / 2).translate(0, 0.03, 0);

  const rim = new THREE.LatheGeometry(v2([[1.2, 0.13], [1.3, 0.13], [1.3, 0.26], [1.2, 0.26], [1.2, 0.13]]), 72);
  const clip = new THREE.LatheGeometry(
    v2([[0.53, 0.13], [0.62, 0.13], [0.62, 0.58], [0.68, 0.63], [0.68, 0.68], [0.62, 0.72], [0.53, 0.72], [0.53, 0.13]]), 72);
  const hub = new THREE.CylinderGeometry(0.2, 0.24, 0.2, 32).translate(0, 0.23, 0);

  const parts = [plate, rim, clip, hub];
  for (let i = 0; i < 6; i++) {
    const rib = new THREE.BoxGeometry(0.6, 0.15, 0.06).translate(0.91, 0.2, 0).rotateY((i / 6) * Math.PI * 2);
    parts.push(rib);
  }
  return {
    name: 'Капачка за джанта',
    geo: merge(parts), H: 0.72, time: 9,
    section: (y) => ({ cx: 0, cz: 0, r: y < 0.14 ? 1.4 : y < 0.27 ? 1.25 : 0.6 }),
  };
}

// Въздуховод с редукция и страничен щуцер — по intake-а за Kia Sportage.
function intakeModel() {
  const body = new THREE.LatheGeometry(v2([
    [1.02, 0], [1.02, 0.12], [0.9, 0.14], [0.9, 0.72], [0.5, 1.7], [0.5, 2.48], [0.56, 2.52], [0.56, 2.6],
    [0.43, 2.6], [0.43, 1.72], [0.83, 0.72], [0.83, 0], [1.02, 0],
  ]), 80);
  const parts = [body];
  for (const y of [1.95, 2.1, 2.25]) {
    parts.push(new THREE.TorusGeometry(0.5, 0.04, 10, 64).rotateX(Math.PI / 2).translate(0, y, 0));
  }
  const side = new THREE.LatheGeometry(v2([[0.15, 0], [0.22, 0], [0.22, 0.62], [0.26, 0.64], [0.26, 0.72], [0.15, 0.72], [0.15, 0]]), 32);
  side.rotateZ(-Math.PI / 2).translate(0.8, 0.42, 0).rotateY(-0.6);
  parts.push(side);

  const prof = [[0, 1.02], [0.12, 1.02], [0.14, 0.9], [0.72, 0.9], [1.7, 0.5], [2.6, 0.54]];
  const R = (y) => {
    for (let i = 1; i < prof.length; i++) {
      if (y <= prof[i][0]) {
        const [y0, r0] = prof[i - 1], [y1, r1] = prof[i];
        return r0 + ((r1 - r0) * (y - y0)) / (y1 - y0 || 1);
      }
    }
    return 0.54;
  };
  return {
    name: 'Въздуховод',
    geo: merge(parts), H: 2.6, time: 15,
    section: (y) => ({ cx: 0, cz: 0, r: R(y) - 0.04 }),
  };
}

// Рог за кукерска маска — Сурва.
function hornModel() {
  const H = 3.0, RINGS = 150, SEG = 40;
  const cx = (s) => 0.85 * (1 - Math.cos(s * Math.PI * 0.95)) - 0.75;
  const cz = (s) => 0.3 * Math.sin(s * Math.PI * 1.3);
  const rad = (s) => (0.56 * Math.pow(1 - s, 0.75) + 0.025) * (1 + 0.075 * Math.sin(s * 62) * (1 - s));
  const pos = [], idx = [];
  for (let i = 0; i <= RINGS; i++) {
    const s = i / RINGS;
    for (let j = 0; j < SEG; j++) {
      const a = (j / SEG) * Math.PI * 2;
      pos.push(cx(s) + rad(s) * Math.cos(a), s * H, cz(s) + rad(s) * Math.sin(a));
    }
  }
  for (let i = 0; i < RINGS; i++) {
    for (let j = 0; j < SEG; j++) {
      const a = i * SEG + j, b = (i + 1) * SEG + j, c = i * SEG + ((j + 1) % SEG), d = (i + 1) * SEG + ((j + 1) % SEG);
      idx.push(a, b, c, b, d, c);
    }
  }
  const horn = new THREE.BufferGeometry();
  horn.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  horn.setIndex(idx);
  horn.computeVertexNormals();
  const brim = new THREE.CylinderGeometry(0.78, 0.78, 0.05, 48).translate(cx(0), 0.025, cz(0));
  return {
    name: 'Рог за Сурва',
    geo: merge([horn, brim]), H, time: 15,
    section: (y) => { const s = Math.min(y / H, 1); return { cx: cx(s), cz: cz(s), r: y < 0.05 ? 0.74 : rad(s) }; },
  };
}

// Кубът от логото, стъпил на връх.
function cubeModel() {
  const a = 1.5, rs = 0.1, rv = 0.17;
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 1, 1).normalize(), new THREE.Vector3(0, 1, 0));
  const lift = (a * Math.sqrt(3)) / 2 + rv;
  const V = [];
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) {
    V.push(new THREE.Vector3(x, y, z).multiplyScalar(a / 2).applyQuaternion(q).add(new THREE.Vector3(0, lift, 0)));
  }
  const parts = [];
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < 8; i++) {
    parts.push(new THREE.SphereGeometry(rv, 20, 14).translate(V[i].x, V[i].y, V[i].z));
    for (let j = i + 1; j < 8; j++) {
      if (Math.abs(V[i].distanceTo(V[j]) - a) > 1e-3) continue;
      const dir = V[j].clone().sub(V[i]);
      const mid = V[i].clone().add(V[j]).multiplyScalar(0.5);
      const m = new THREE.Matrix4().compose(mid, new THREE.Quaternion().setFromUnitVectors(up, dir.clone().normalize()), new THREE.Vector3(1, 1, 1));
      parts.push(new THREE.CylinderGeometry(rs, rs, a, 14).applyMatrix4(m));
    }
  }
  parts.push(new THREE.CylinderGeometry(0.55, 0.55, 0.05, 40).translate(0, 0.025, 0));
  const Hc = a * Math.sqrt(3), rmax = a * Math.sqrt(2 / 3);
  return {
    name: 'Кубът от логото',
    geo: merge(parts), H: Hc + rv * 2, time: 14,
    section: (y) => {
      const t = THREE.MathUtils.clamp((y - rv) / Hc, 0, 1);
      return { cx: 0, cz: 0, r: Math.max(0.16, rmax * Math.min(1, t * 3, (1 - t) * 3)) };
    },
  };
}

/* ───────────── материал „печат“ ───────────── */

function printMaterial(u) {
  const m = new THREE.MeshStandardMaterial({ color: 0x9bd93b, roughness: 0.6, metalness: 0.02, side: THREE.DoubleSide });
  m.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, u);
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vP;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvP = position;');
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vP;
        uniform float uPrintY; uniform float uLayer; uniform float uGlow; uniform vec3 uHot;`)
      .replace('#include <clipping_planes_fragment>', 'if (vP.y > uPrintY) discard;\n#include <clipping_planes_fragment>')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float lf = fract(vP.y / uLayer);
        float ridge = smoothstep(0.0, 0.28, lf) * smoothstep(1.0, 0.72, lf);
        diffuseColor.rgb *= mix(0.68, 1.0, ridge);
        if (!gl_FrontFacing) {
          float ga = abs(fract((vP.x + vP.z) * 4.0) - 0.5);
          float gb = abs(fract((vP.x - vP.z) * 4.0) - 0.5);
          float grid = 1.0 - smoothstep(0.03, 0.1, min(ga, gb));
          diffuseColor.rgb *= mix(0.2, 0.8, grid);
        }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += uHot * smoothstep(uPrintY - 0.07, uPrintY, vP.y) * uGlow;`);
  };
  return m;
}

function bedTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 1024;
  const x = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const draw = () => {
    x.fillStyle = '#161916'; x.fillRect(0, 0, 1024, 1024);
    x.strokeStyle = 'rgba(255,255,255,.055)'; x.lineWidth = 2;
    for (let i = 64; i < 1024; i += 64) {
      x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 1024); x.moveTo(0, i); x.lineTo(1024, i); x.stroke();
    }
    x.strokeStyle = 'rgba(155,217,59,.5)'; x.lineWidth = 5; x.strokeRect(26, 26, 972, 972);
    x.fillStyle = 'rgba(155,217,59,.9)';
    x.font = 'italic 900 118px "Sofia Sans Extra Condensed Variable", "Arial Narrow", sans-serif';
    x.textBaseline = 'alphabetic';
    x.fillText('3D KRU', 62, 962);
    const w = x.measureText('3D KRU').width;
    x.fillStyle = 'rgba(255,255,255,.4)';
    x.font = '500 34px "JetBrains Mono Variable", monospace';
    x.fillText('L A B', 62 + w + 26, 958);
    x.textAlign = 'right';
    x.fillText('220 × 220', 962, 958);
    x.textAlign = 'left';
    tex.needsUpdate = true;
  };
  draw();
  document.fonts?.ready.then(draw);
  return tex;
}

/* ───────────── сцена ───────────── */

export function createPrinter(canvas, { onStatus = () => {}, reducedMotion = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  const target = new THREE.Vector3(0, 2.85, 0);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x182016, 1.25));
  const key = new THREE.DirectionalLight(0xffffff, 2.3); key.position.set(4, 8, 7); scene.add(key);
  const rimL = new THREE.DirectionalLight(0x9bd93b, 1.3); rimL.position.set(-7, 3, -5); scene.add(rimL);

  const metal = new THREE.MeshStandardMaterial({ color: 0x1b1e1b, roughness: 0.42, metalness: 0.65 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x101210, roughness: 0.7, metalness: 0.2 });
  const accent = new THREE.MeshStandardMaterial({ color: 0x9bd93b, roughness: 0.5 });
  const filamentMat = new THREE.MeshStandardMaterial({ color: 0x9bd93b, roughness: 0.55 });
  const hotMat = new THREE.MeshStandardMaterial({ color: 0xc98a3a, roughness: 0.3, metalness: 0.8, emissive: 0xff5a14, emissiveIntensity: 0.9 });
  const box = (w, h, d, mat, x, y, z, parent = scene) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); parent.add(m); return m;
  };

  // рамка
  box(7.5, 0.3, 1.0, metal, 0, -0.55, -0.2);
  box(0.32, 6.3, 0.32, metal, -3.5, 2.45, -0.2);
  box(0.32, 6.3, 0.32, metal, 3.5, 2.45, -0.2);
  box(7.32, 0.32, 0.32, metal, 0, 5.6, -0.2);
  box(1.0, 0.22, 8.4, metal, 0, -0.48, 0);
  box(0.36, 0.1, 0.36, accent, -3.5, 5.81, -0.2);
  box(0.36, 0.1, 0.36, accent, 3.5, 5.81, -0.2);

  // макара
  const spool = new THREE.Group(); spool.position.set(-1.7, 6.42, -0.2); scene.add(spool);
  const wind = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.3, 40), filamentMat); wind.rotation.x = Math.PI / 2; spool.add(wind);
  for (const z of [-0.18, 0.18]) {
    const fl = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.66, 0.05, 40), dark); fl.rotation.x = Math.PI / 2; fl.position.z = z; spool.add(fl);
    for (let i = 0; i < 3; i++) {
      const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.06, 16), accent);
      hole.rotation.x = Math.PI / 2; hole.position.set(Math.cos(i * 2.094) * 0.34, Math.sin(i * 2.094) * 0.34, z); spool.add(hole);
    }
  }
  box(0.12, 0.7, 0.12, metal, -1.7, 6.05, -0.2);

  // маса
  const bed = new THREE.Group(); scene.add(bed);
  box(5.7, 0.14, 5.7, dark, 0, -0.072, 0, bed);
  box(3.2, 0.14, 3.2, metal, 0, -0.22, 0, bed);
  const top = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 5.6), new THREE.MeshStandardMaterial({ map: bedTexture(), roughness: 0.85, metalness: 0.05 }));
  top.rotation.x = -Math.PI / 2; top.position.y = 0.001; bed.add(top);

  // греда X + глава
  const gantry = new THREE.Group(); scene.add(gantry);
  box(7.0, 0.26, 0.26, metal, 0, 0.55, -0.2, gantry);
  box(0.5, 0.56, 0.5, accent, -3.5, 0.55, -0.2, gantry);
  box(0.5, 0.56, 0.5, accent, 3.5, 0.55, -0.2, gantry);
  const head = new THREE.Group(); gantry.add(head);
  box(0.82, 0.78, 0.46, dark, 0, 0.56, 0.12, head);
  const fan = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.05, 28), accent); fan.rotation.x = Math.PI / 2; fan.position.set(0, 0.6, 0.37); head.add(fan);
  const fanHub = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.07, 16), dark); fanHub.rotation.x = Math.PI / 2; fanHub.position.set(0, 0.6, 0.38); head.add(fanHub);
  box(0.3, 0.2, 0.3, hotMat, 0, 0.22, NOZZLE_Z, head);
  const nozzle = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.22, 20), hotMat); nozzle.rotation.x = Math.PI; nozzle.position.set(0, 0.11, NOZZLE_Z); head.add(nozzle);
  const glow = new THREE.PointLight(0xff7a2a, 0, 3.2, 1.6); glow.position.set(0, 0.06, NOZZLE_Z + 0.25); head.add(glow);

  // нишката от макарата до главата
  const lineGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 3));
  const lineMat = new THREE.LineBasicMaterial({ color: 0x9bd93b });
  scene.add(new THREE.Line(lineGeo, lineMat));

  // модел
  const uni = { uPrintY: { value: 0 }, uLayer: { value: 0.045 }, uGlow: { value: 1 }, uHot: { value: new THREE.Color(1.6, 0.62, 0.12) } };
  const mat = printMaterial(uni);
  const models = [capModel(), intakeModel(), hornModel(), cubeModel()];
  const mesh = new THREE.Mesh(models[0].geo, mat);
  mesh.frustumCulled = false;
  bed.add(mesh);

  /* ── състояние ── */
  let cur = 0, pending = -1, state = 'printing', p = reducedMotion ? 1 : 0, timer = 0, angle = 0, auto = !reducedMotion;
  if (reducedMotion) state = 'done';
  const colorTarget = new THREE.Color(0x9bd93b);
  let headX = -2.6, bedZ = 0, gantryY = 0.3;
  let az = -0.62, pol = 1.2, userAz = 0, userPol = 0, drag = null, dist = 16, active = true, lastStatus = '';

  const emit = () => {
    const m = models[cur];
    const layers = Math.round((m.H * MM_PER_UNIT) / LAYER_MM);
    const layer = Math.min(layers, Math.round(p * layers));
    const key = `${cur}|${layer}|${state}`;
    if (key === lastStatus) return;
    lastStatus = key;
    onStatus({ index: cur, name: m.name, state, layer, layers, z: p * m.H * MM_PER_UNIT, pct: p });
  };

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    dist = Math.max(4.25 / t, 4.6 / (t * camera.aspect)) * 1.04;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  canvas.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); canvas.classList.add('is-drag');
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    userAz -= (e.clientX - drag.x) * 0.007;
    userPol = THREE.MathUtils.clamp(userPol - (e.clientY - drag.y) * 0.004, -0.55, 0.3);
    drag = { x: e.clientX, y: e.clientY };
  });
  const end = () => { drag = null; canvas.classList.remove('is-drag'); };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);

  const clock = new THREE.Clock();
  let time = 0;
  function frame() {
    requestAnimationFrame(frame);
    if (!active) { clock.getDelta(); return; }
    const dt = Math.min(clock.getDelta(), 0.05);
    time += dt;
    const m = models[cur];
    const k = (r) => 1 - Math.exp(-dt * r);

    let tx = -2.6, tz = 1.1, ty;
    if (state === 'printing') {
      p = Math.min(1, p + dt / m.time);
      const y = p * m.H;
      const s = m.section(y);
      angle += dt * Math.min(7.5, 2.3 / Math.max(s.r, 0.2));
      const rr = s.r * (0.8 + 0.2 * Math.sin(angle * 0.37));
      tx = s.cx + rr * Math.cos(angle);
      tz = NOZZLE_Z - (s.cz + rr * Math.sin(angle));
      ty = y;
      uni.uGlow.value += (1 - uni.uGlow.value) * k(8);
      if (p >= 1) { state = 'done'; timer = 0; }
    } else if (state === 'done') {
      timer += dt;
      ty = Math.min(m.H + 1.1, 4.3);
      uni.uGlow.value += (0 - uni.uGlow.value) * k(3);
      if (auto && pending < 0 && timer > 3.4) pending = (cur + 1) % models.length;
      if (pending >= 0) { state = 'clearing'; timer = 0; }
    } else {
      timer += dt;
      ty = gantryY;
      const s = Math.max(0.001, 1 - timer / 0.32);
      mesh.scale.setScalar(s * s);
      if (timer >= 0.32) {
        cur = pending; pending = -1; p = 0; state = 'printing'; angle = 0;
        mesh.geometry = models[cur].geo; mesh.scale.setScalar(1);
      }
    }
    uni.uPrintY.value = p * m.H + 0.0005;

    headX += (tx - headX) * k(state === 'printing' ? 16 : 4);
    bedZ += (tz - bedZ) * k(state === 'printing' ? 16 : 3);
    gantryY += (ty - gantryY) * k(state === 'printing' ? 30 : 4);
    head.position.x = headX; bed.position.z = bedZ; gantry.position.y = gantryY;
    glow.intensity = uni.uGlow.value * 5;
    hotMat.emissiveIntensity = 0.25 + uni.uGlow.value * 0.9;
    fanHub.rotation.y += dt * 20;
    if (state === 'printing') spool.rotation.z -= dt * 0.9;

    mat.color.lerp(colorTarget, k(6));
    filamentMat.color.copy(mat.color); lineMat.color.copy(mat.color);
    const lp = lineGeo.attributes.position;
    lp.setXYZ(0, -1.7 + 0.52, 6.42, -0.2); lp.setXYZ(1, headX, gantryY + 0.95, 0.12); lp.needsUpdate = true;

    const sway = reducedMotion || drag ? 0 : Math.sin(time * 0.22) * 0.22;
    const a = az + userAz + sway, po = THREE.MathUtils.clamp(pol + userPol, 0.55, 1.5);
    camera.position.set(target.x + dist * Math.sin(po) * Math.sin(a), target.y + dist * Math.cos(po), target.z + dist * Math.sin(po) * Math.cos(a));
    camera.lookAt(target);

    renderer.render(scene, camera);
    emit();
  }
  frame();

  return {
    count: models.length,
    setModel(i) { if (i === cur && state === 'printing' && p < 0.15) return; auto = false; pending = i; if (state !== 'clearing') { state = 'clearing'; timer = 0; } },
    setColor(hex) { colorTarget.set(hex); },
    setActive(v) { active = v; },
  };
}
