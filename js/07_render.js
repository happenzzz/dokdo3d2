"use strict";
/* ===== 07 render ===== */
const R = {
  scale: 1, time: 0, dt: 0.016, under: false, underAmt: 0, exposure: 1.0,
  cam: { pos: [0, 200, 600], yaw: 0, pitch: -0.3, fov: 55 * Math.PI / 180, near: 0.3, far: 14000, fwd: [0, 0, -1], right: [1, 0, 0], up: [0, 1, 0] },
  focus: { c: [0, 0, 0], r: 1, amt: 0 }, clarity: 0.75, waveAmp: 1, waveSpeed: 1, tint: [1, 1, 1], brush: [0, 0, 0, 0],
  vp: new Float32Array(16), view: new Float32Array(16), proj: new Float32Array(16), rip: new Float32Array(16), ripI: 0, frames: 0, ft: [], paused: false
};
const WAVES = [[0.8, 0.6, 38, 0.55, 0.62, 0.3], [-0.3, 0.95, 21, 0.30, 0.55, 1.7], [0.95, -0.3, 12, 0.16, 0.5, 4.1], [-0.7, -0.7, 6.5, 0.08, 0.4, 2.2]];
function waveUniforms() {
  const A = new Float32Array(16), B = new Float32Array(16);
  WAVES.forEach((w, i) => { const l = Math.hypot(w[0], w[1]), k = TAU / w[2], c = Math.sqrt(9.8 / k); A.set([w[0] / l, w[1] / l, k, w[3]], i * 4); B.set([w[4], c, w[5], 0], i * 4); });
  return { A, B };
}
R.waveU = null;
function waveHeight(x, z, t = R.time) {
  const depth = -TER.heightAt(x, z), amp = R.waveAmp * smooth(-0.8, 5, depth); let y = 0, px = x, pz = z;
  const W = R.waveU; if (!W) return 0;
  for (let it = 0; it < 2; it++) { // invert horizontal displacement roughly
    let dx = 0, dz = 0; y = 0;
    for (let i = 0; i < 4; i++) { const a = W.A.subarray(i * 4), b = W.B.subarray(i * 4); const f = a[2] * (a[0] * px + a[1] * pz - b[1] * t * R.waveSpeed) + b[2], A = a[3] * amp; dx += b[0] * A * a[0] * Math.cos(f); dz += b[0] * A * a[1] * Math.cos(f); y += A * Math.sin(f); }
    px = x - dx; pz = z - dz;
  }
  for (let i = 0; i < 4; i++) { const r = R.rip.subarray(i * 4); if (r[3] <= 0) continue; const age = R.time - r[2]; if (age < 0 || age > 9) continue; const rr = Math.hypot(x - r[0], z - r[1]), fr = age * 3.4, xx = rr - fr; y += Math.sin(xx * 2.4) * Math.exp(-xx * xx * 0.28) * Math.exp(-age * 0.55) * r[3] * smooth(0, 0.25, age) / (1 + fr * 0.15) * 0.45; }
  return y;
}
function addRipple(x, z, s) { R.rip.set([x, z, R.time, s], R.ripI * 4); R.ripI = (R.ripI + 1) % 4; }

function detectQuality() {
  const saved = localStorage.getItem('dokdo3d.quality'); if (saved && saved !== 'auto') return saved;
  const touch = (navigator.maxTouchPoints || 0) > 0 && matchMedia('(pointer:coarse)').matches;
  const weak = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 3;
  return touch ? (weak ? 'low' : 'mid') : (weak ? 'mid' : 'high');
}

function initGL(canvas) {
  gl = canvas.getContext('webgl2', { antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
  if (!gl) throw new Error('이 기기(브라우저)는 WebGL2를 지원하지 않아요. 최신 크롬·엣지·사파리에서 열어 주세요.');
  R.canvas = canvas;
  const def = R.quality === 'low' ? '#define LOW 1' : '';
  const P = n => GLX.program(SHADERS[n + 'V'], SHADERS[n + 'F'], def);
  R.P = { terrain: P('terrain'), obj: P('obj'), water: P('water'), sky: P('sky'), pt: P('pt'), ray: P('ray') };
  R.waveU = waveUniforms();
  // water polar grid
  const RINGS = R.quality === 'low' ? 80 : 110, SEG = R.quality === 'low' ? 72 : 96, v = [0, 0, 0], idx = [];
  for (let i = 1; i <= RINGS; i++) { const r = 0.35 * i * Math.exp(0.052 * i); for (let s = 0; s < SEG; s++) { const a = s / SEG * TAU; v.push(Math.cos(a) * r, 0, Math.sin(a) * r); } }
  for (let s = 0; s < SEG; s++) idx.push(0, 1 + (s + 1) % SEG, 1 + s);
  for (let i = 0; i < RINGS - 1; i++) for (let s = 0; s < SEG; s++) { const a = 1 + i * SEG + s, b = 1 + i * SEG + (s + 1) % SEG, c = a + SEG, d = b + SEG; idx.push(a, b, d, a, d, c); }
  R.water = { vao: gl.createVertexArray(), n: idx.length };
  gl.bindVertexArray(R.water.vao); GLX.buffer(new Float32Array(v)); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
  GLX.buffer(new Uint16Array(idx), gl.ELEMENT_ARRAY_BUFFER); gl.bindVertexArray(null);
  // fullscreen tri
  R.tri = gl.createVertexArray(); gl.bindVertexArray(R.tri); GLX.buffer(new Float32Array([-1, -1, 3, -1, -1, 3])); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); gl.bindVertexArray(null);
  // marine snow (static, wrapped)
  const NS = R.quality === 'low' ? 700 : 1600, sn = new Float32Array(NS * 8), rnd = makeRand(77);
  for (let i = 0; i < NS; i++) sn.set([rnd() * 40, rnd() * 40, rnd() * 40, 0.035 + rnd() * 0.05, 0.35 + rnd() * 0.5, 0, 0, 0], i * 8);
  R.snow = { vao: gl.createVertexArray(), n: NS }; gl.bindVertexArray(R.snow.vao); GLX.buffer(sn);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 32, 0); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 32, 16); gl.bindVertexArray(null);
  // dynamic particles
  PART.init();
  // god rays
  const NR = 22, rr = new Float32Array(NR * 4);
  for (let i = 0; i < NR; i++) { const a = rnd() * TAU, d = 3 + rnd() * 30; rr.set([Math.cos(a) * d, Math.sin(a) * d, 0.6 + rnd() * 2.2, rnd()], i * 4); }
  R.rays = { vao: gl.createVertexArray(), n: NR }; gl.bindVertexArray(R.rays.vao);
  GLX.buffer(new Float32Array([-0.5, 0, 0.5, 0, 0.5, 1, -0.5, 0, 0.5, 1, -0.5, 1])); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  GLX.buffer(rr); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 0, 0); gl.vertexAttribDivisor(1, 1); gl.bindVertexArray(null);
}
function bindSamplers() {
  const T = R.tex; const units = [[TER.tex, 'uHeight'], [T.texCaustic, 'uCaustic'], [T.texNoise, 'uNoise'], [T.texRock, 'uRockN'], [T.texSky, 'uSky'], [T.texWater, 'uWaterTex'], [ATLAS.tex, 'uTex']];
  units.forEach(([t], i) => { gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, t); });
  for (const p of Object.values(R.P)) { gl.useProgram(p.p); units.forEach(([, n], i) => { if (p.u[n]) gl.uniform1i(p.u[n], i); }); }
}

/* ---------- particles ---------- */
const PART = {
  N: 1400, list: [],
  init() { this.buf = new Float32Array(this.N * 8); this.vao = gl.createVertexArray(); gl.bindVertexArray(this.vao); this.vbo = GLX.buffer(this.buf, gl.ARRAY_BUFFER, gl.DYNAMIC_DRAW); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 32, 0); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 32, 16); gl.bindVertexArray(null); },
  add(p) { if (this.list.length < this.N) this.list.push(p); },
  spray(x, y, z, n, power) {
    for (let i = 0; i < n; i++) { const a = Math.random() * TAU, sp = (0.3 + Math.random()) * power; this.add({ x: x + Math.cos(a) * 0.4, y, z: z + Math.sin(a) * 0.4, vx: Math.cos(a) * sp * 0.55, vy: (1.2 + Math.random() * 1.6) * power, vz: Math.sin(a) * sp * 0.55, life: 1.2 + Math.random() * 0.9, age: 0, size: 0.08 + Math.random() * 0.22, type: 2 }); }
  },
  bubbles(x, y, z, n, spread = 0.5) {
    for (let i = 0; i < n; i++) this.add({ x: x + (Math.random() - .5) * spread, y: y + (Math.random() - .5) * spread, z: z + (Math.random() - .5) * spread, vx: 0, vy: 0.6 + Math.random() * 0.9, vz: 0, life: 3 + Math.random() * 4, age: 0, size: 0.03 + Math.random() * 0.08, type: 1, ph: Math.random() * 9 });
  },
  update(dt) {
    const L = this.list; let w = 0;
    for (let i = 0; i < L.length; i++) {
      const p = L[i]; p.age += dt; if (p.age > p.life) continue;
      if (p.type === 2) { p.vy -= 9.8 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; if (p.y < -0.2 && p.vy < 0) { p.age = p.life; if (Math.random() < 0.3) this.bubbles(p.x, -0.3, p.z, 1, 0.1); } }
      else if (p.type === 1) { p.vy = Math.min(p.vy + dt * 0.8, 1.6 + p.size * 8); p.y += p.vy * dt; p.x += Math.sin(p.age * 6 + p.ph) * dt * 0.25; p.z += Math.cos(p.age * 5 + p.ph) * dt * 0.25; if (p.y > -0.05) p.age = p.life; }
      L[w++] = p;
    }
    L.length = w;
    const b = this.buf;
    for (let i = 0; i < w; i++) { const p = L[i], f = p.age / p.life; const a = p.type === 2 ? (1 - f) * 0.9 : smooth(0, 0.08, f) * (1 - smooth(0.85, 1, f)); b.set([p.x, p.y, p.z, p.size * (p.type === 2 ? 1 + f : 1), a, p.type, 0, 0], i * 8); }
    this.n = w;
    if (w) { gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo); gl.bufferSubData(gl.ARRAY_BUFFER, 0, b, 0, w * 8); }
  }
};

function resize() {
  const c = R.canvas, cap = R.quality === 'high' ? 2 : R.quality === 'mid' ? 1.5 : 1.1;
  const dpr = Math.min(window.devicePixelRatio || 1, cap) * R.scale;
  const w = Math.max(1, Math.round(c.clientWidth * dpr)), h = Math.max(1, Math.round(c.clientHeight * dpr));
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
}
function camBasis() {
  const c = R.cam, cp = Math.cos(c.pitch);
  c.fwd = [Math.sin(c.yaw) * cp, Math.sin(c.pitch), -Math.cos(c.yaw) * cp];
  c.right = V3.norm([Math.cos(c.yaw), 0, Math.sin(c.yaw)]);
  c.up = V3.cross(c.right, c.fwd);
}
function screenRay(sx, sy) {
  const c = R.cam, rect = R.canvas.getBoundingClientRect(), nx = ((sx - rect.left) / rect.width) * 2 - 1, ny = 1 - ((sy - rect.top) / rect.height) * 2;
  const th = Math.tan(c.fov / 2), asp = rect.width / rect.height;
  return V3.norm(V3.add(c.fwd, V3.add(V3.mul(c.right, nx * th * asp), V3.mul(c.up, ny * th))));
}
function project(p) {
  const m = R.vp, x = m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], y = m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], w = m[3] * p[0] + m[7] * p[1] + m[11] * p[2] + m[15];
  if (w <= 0.01) return null;
  return [(x / w * 0.5 + 0.5) * R.canvas.clientWidth, (1 - (y / w * 0.5 + 0.5)) * R.canvas.clientHeight, w];
}

const HAZE = srgb('#b9d3e2'), ZEN = srgb('#3f78c4');
function setCommon(p) {
  const u = p.u, c = R.cam;
  gl.uniformMatrix4fv(u.uVP, false, R.vp); gl.uniform3fv(u.uCam, c.pos); gl.uniform1f(u.uTime, R.time);
  if (u.uSun) gl.uniform3fv(u.uSun, SUN); if (u.uSunCol) gl.uniform3fv(u.uSunCol, SUNCOL);
  if (u.uHaze) gl.uniform3fv(u.uHaze, HAZE); if (u.uZenith) gl.uniform3fv(u.uZenith, ZEN);
  if (u.uUnder) gl.uniform1f(u.uUnder, R.under ? 1 : 0); if (u.uClarity) gl.uniform1f(u.uClarity, R.clarity);
  if (u.uFocus) gl.uniform4f(u.uFocus, R.focus.c[0], R.focus.c[1], R.focus.c[2], R.focus.r); if (u.uFocusAmt) gl.uniform1f(u.uFocusAmt, R.focus.amt);
  if (u.uExposure) gl.uniform1f(u.uExposure, R.exposure); if (u.uHInfo) gl.uniform4fv(u.uHInfo, TER.hinfo);
}

function drawScene() {
  const c = R.cam; camBasis();
  const asp = R.canvas.width / R.canvas.height;
  mat4Persp(R.proj, c.fov, asp, c.near, c.far); mat4View(R.view, c.pos, c.fwd, c.right, c.up); mat4Mul(R.vp, R.proj, R.view);
  const wh = waveHeight(c.pos[0], c.pos[2]);
  R.under = c.pos[1] < wh - 0.02;
  R.underAmt = lerp(R.underAmt, R.under ? 1 : 0, 0.2);
  R.exposure = R.under ? 1.35 : 1.0;
  sceneUpdateInstances(R.time);
  PART.update(R.dt);
  gl.viewport(0, 0, R.canvas.width, R.canvas.height);
  gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LESS); gl.depthMask(true); gl.disable(gl.BLEND); gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
  // terrain
  let p = R.P.terrain; gl.useProgram(p.p); setCommon(p); gl.uniform4fv(p.u.uBrush, R.brush);
  gl.bindVertexArray(TER.vao); gl.drawElements(gl.TRIANGLES, TER.count, gl.UNSIGNED_INT, 0);
  gl.bindVertexArray(TER.deepVao); gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
  // opaque objects
  p = R.P.obj; gl.useProgram(p.p); setCommon(p);
  const drawKinds = (translucent) => {
    for (const [id, m] of Object.entries(SCN.meshes)) {
      if (!m.n) continue; const k = KINDS[id]; if ((k.mat === 2) !== translucent) continue;
      gl.uniform1i(p.u.uAnim, k.anim); gl.uniform4fv(p.u.uAnimP, k.animP); gl.uniform1f(p.u.uSkirt, k.skirt); gl.uniform1i(p.u.uMat, k.mat);
      gl.uniform1f(p.u.uTwoSided, k.two || k.mat === 2 ? 1 : 0); gl.uniform1f(p.u.uEmis, k.emis); gl.uniform1f(p.u.uAlpha, k.alpha); gl.uniform1f(p.u.uGloss, k.gloss);
      if (k.two || k.mat === 2) gl.disable(gl.CULL_FACE); else gl.enable(gl.CULL_FACE);
      gl.bindVertexArray(m.vao); gl.drawElementsInstanced(gl.TRIANGLES, m.count, m.itype, 0, m.n);
    }
  };
  drawKinds(false);
  // sky
  gl.enable(gl.CULL_FACE); gl.disable(gl.CULL_FACE);
  p = R.P.sky; gl.useProgram(p.p); setCommon(p);
  const th = Math.tan(c.fov / 2); gl.uniform3fv(p.u.uFwd, c.fwd); gl.uniform3fv(p.u.uRight, c.right); gl.uniform3fv(p.u.uUp, c.up); gl.uniform2f(p.u.uTan, th * asp, th);
  gl.depthFunc(gl.LEQUAL); gl.depthMask(false); gl.bindVertexArray(R.tri); gl.drawArrays(gl.TRIANGLES, 0, 3); gl.depthFunc(gl.LESS);
  // translucent objects
  gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  p = R.P.obj; gl.useProgram(p.p); drawKinds(true);
  // water
  p = R.P.water; gl.useProgram(p.p); setCommon(p);
  gl.uniform4fv(p.u.uWA, R.waveU.A); gl.uniform4fv(p.u.uWB, R.waveU.B); gl.uniform1f(p.u.uWaveAmp, R.waveAmp); gl.uniform1f(p.u.uWaveSpeed, R.waveSpeed);
  gl.uniform1f(p.u.uWScale, clamp(Math.abs(c.pos[1]) / 6, 1, 90)); gl.uniform4fv(p.u.uRip, R.rip); gl.uniform3fv(p.u.uWaterTint, R.tint);
  gl.bindVertexArray(R.water.vao); gl.drawElements(gl.TRIANGLES, R.water.n, gl.UNSIGNED_SHORT, 0);
  // particles
  p = R.P.pt; gl.useProgram(p.p); setCommon(p); gl.uniform1f(p.u.uPx, R.canvas.height / (2 * th));
  if (R.under) { gl.uniform1i(p.u.uWrap, 1); gl.uniform1f(p.u.uWrapSize, 40); gl.bindVertexArray(R.snow.vao); gl.drawArrays(gl.POINTS, 0, R.snow.n); }
  if (PART.n) { gl.uniform1i(p.u.uWrap, 0); gl.bindVertexArray(PART.vao); gl.drawArrays(gl.POINTS, 0, PART.n); }
  // god rays
  if (R.under) {
    gl.blendFunc(gl.ONE, gl.ONE); p = R.P.ray; gl.useProgram(p.p); setCommon(p);
    const r2 = V3.norm([c.right[0], 0, c.right[2]]); gl.uniform3fv(p.u.uRight2, r2); gl.uniform3fv(p.u.uSlant, V3.norm([-SUN[0] * 0.35, -1, -SUN[2] * 0.35]));
    gl.bindVertexArray(R.rays.vao); gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, R.rays.n);
  }
  gl.bindVertexArray(null); gl.depthMask(true); gl.disable(gl.BLEND);
}

/* labels overlay */
const LABELS = { on: true, items: [] };
function buildLabels() {
  const box = $('#labels'); box.innerHTML = ''; LABELS.items = [];
  const add = (text, pos, cls, e) => { const d = document.createElement('div'); d.className = 'lbl ' + (cls || ''); d.textContent = text; box.appendChild(d); LABELS.items.push({ d, pos, e }); };
  add('동도', [150, 112, 40], 'big'); add('서도', [-240, 182, -110], 'big');
  for (const e of SCN.elems) { const k = KINDS[e.kind]; if (k.label && !e.hidden) add(k.name, null, k.group === 'fac' ? 'fac' : '', e); }
}
function updateLabels() {
  const show = LABELS.on && MODE.cur === 'observer' && !R.under && !FOCUS.active;
  $('#labels').style.display = show ? '' : 'none'; if (!show) return;
  const W = R.canvas.clientWidth, H = R.canvas.clientHeight, placed = [], its = LABELS.items, cam = R.cam.pos;
  // round-robin occlusion test against terrain (a few per frame)
  for (let k = 0; k < 4 && its.length; k++) {
    LABELS.rr = ((LABELS.rr || 0) + 1) % its.length; const L = its[LABELS.rr]; if (!L.wp) continue;
    const v = V3.sub(L.wp, cam), dist = V3.len(v), hit = TER.raycast(cam, V3.mul(v, 1 / dist), dist - 4);
    L.occ = !!hit;
  }
  const order = its.map((L, i) => i).sort((a, b) => (its[a].pos ? -1 : 0) - (its[b].pos ? -1 : 0) || (its[a].z || 0) - (its[b].z || 0));
  for (const i of order) {
    const L = its[i];
    let p = L.pos; if (L.e) { const k = KINDS[L.e.kind]; p = [L.e.x, L.e.y + (k.top ? k.top * L.e.s + 5 : k.r * 1.2 + 3), L.e.z]; }
    L.wp = p; const s = project(p); L.z = s ? s[2] : 1e9;
    let vis = s && s[2] < (L.pos ? 2600 : 900) && s[0] > -50 && s[1] > 40 && s[0] < W + 50 && s[1] < H + 20 && !L.occ;
    if (vis && !L.pos) { const w = L.d.offsetWidth || 80; for (const q of placed) if (Math.abs(q[0] - s[0]) < (w + q[2]) / 2 + 4 && Math.abs(q[1] - s[1]) < 30) { vis = false; break; } }
    if (!vis) { if (L.shown !== false) { L.d.style.opacity = 0; L.shown = false; } continue; }
    placed.push([s[0], s[1], L.d.offsetWidth || 80]);
    if (L.shown !== true) { L.d.style.opacity = 1; L.shown = true; }
    L.d.style.transform = `translate(${s[0].toFixed(1)}px,${s[1].toFixed(1)}px) translate(-50%,-100%) scale(${clamp(420 / s[2], 0.75, 1.15).toFixed(2)})`;
  }
}

/* frame loop with dynamic resolution */
let lastT = 0, fpsAcc = 0, fpsN = 0, fpsCheck = 0;
function frame(now) {
  requestAnimationFrame(frame);
  if (R.paused || document.hidden) { lastT = now; return; }
  const dt = Math.min(window.__maxDt || 0.05, (now - lastT) / 1000 || 0.016); lastT = now; R.dt = dt; R.time += dt;
  fpsAcc += dt; fpsN++; fpsCheck += dt;
  if (fpsCheck > 1.5) {
    const avg = fpsAcc / fpsN; fpsAcc = 0; fpsN = 0; fpsCheck = 0;
    const old = R.scale;
    if (avg > 1 / 26) R.scale = Math.max(0.5, R.scale - 0.12); else if (avg < 1 / 50) R.scale = Math.min(1, R.scale + 0.08);
    if (old !== R.scale) resize();
    const fe = $('#fps'); if (fe) fe.textContent = Math.round(1 / avg) + ' fps · ' + Math.round(R.scale * 100) + '%';
  }
  MODE.update(dt);
  FOCUS.update(dt);
  drawScene();
  R.frames++; updateLabels();
  UI.frame(dt);
}
