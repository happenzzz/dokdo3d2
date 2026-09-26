"use strict";
/* ===== 05 models: procedural mesh builder ===== */
const COL = {};
const col = h => COL[h] || (COL[h] = srgb(h));
function rotP(p, yaw, pitch, roll) {
  let [x, y, z] = p, c = Math.cos(roll), s = Math.sin(roll);
  [y, z] = [c * y - s * z, s * y + c * z];
  c = Math.cos(pitch); s = Math.sin(pitch); [x, y] = [c * x - s * y, s * x + c * y];
  c = Math.cos(yaw); s = Math.sin(yaw); [x, z] = [c * x + s * z, -s * x + c * z];
  return [x, y, z];
}
class MB {
  constructor() { this.P = []; this.N = []; this.C = []; this.E = []; this.I = []; this.at(); }
  at(o = [0, 0, 0], yaw = 0, pitch = 0, roll = 0, s = 1) { this.T = { o, yaw, pitch, roll, s: Array.isArray(s) ? s : [s, s, s] }; return this; }
  vert(p, n, c, ao = 1, w = 0, t = 0, u = 0, v = 0) {
    const T = this.T, q = rotP([p[0] * T.s[0], p[1] * T.s[1], p[2] * T.s[2]], T.yaw, T.pitch, T.roll);
    const m = V3.norm(rotP([n[0] / T.s[0], n[1] / T.s[1], n[2] / T.s[2]], T.yaw, T.pitch, T.roll));
    this.P.push(q[0] + T.o[0], q[1] + T.o[1], q[2] + T.o[2]); this.N.push(m[0], m[1], m[2]); this.C.push(c[0], c[1], c[2], ao); this.E.push(w, t, u, v);
    return this.P.length / 3 - 1;
  }
  tri(a, b, c) { this.I.push(a, b, c); }
  quad(a, b, c, d) { this.I.push(a, b, c, a, c, d); }
  /* rings along x: [{x, ry, rz, y}] ; colFn(t, ang) ; wFn(t) */
  lathe(rings, seg, colFn, wFn = () => 0, capEnds = true) {
    const base = this.P.length / 3, R = rings.length;
    for (let i = 0; i < R; i++) {
      const r = rings[i], t = i / (R - 1), pr = rings[Math.max(i - 1, 0)], nx = rings[Math.min(i + 1, R - 1)];
      const dr = ((nx.ry + nx.rz) - (pr.ry + pr.rz)) * 0.5, dx = (nx.x - pr.x) || 1e-3;
      for (let k = 0; k <= seg; k++) {
        const a = k / seg * TAU, cy = Math.cos(a), sz = Math.sin(a);
        const n = V3.norm([-dr / dx, cy / Math.max(r.ry, 1e-3) * Math.max(r.ry, r.rz), sz / Math.max(r.rz, 1e-3) * Math.max(r.ry, r.rz)]);
        this.vert([r.x, (r.y || 0) + cy * r.ry, sz * r.rz], n, colFn(t, a, cy, sz), 1, wFn(t));
      }
    }
    for (let i = 0; i < R - 1; i++) for (let k = 0; k < seg; k++) {
      const a = base + i * (seg + 1) + k, b = a + seg + 1; this.quad(a, a + 1, b + 1, b);
    }
    if (capEnds) for (const [i, sgn] of [[0, -1], [R - 1, 1]]) {
      const r = rings[i]; if (r.ry < 1e-3 && r.rz < 1e-3) continue;
      const c = this.vert([r.x, r.y || 0, 0], [sgn, 0, 0], colFn(i / (R - 1), 0, 1, 0), 1, wFn(i / (R - 1)));
      for (let k = 0; k < seg; k++) { const a = base + i * (seg + 1) + k; if (sgn > 0) this.tri(c, a + 1, a); else this.tri(c, a, a + 1); }
    }
    return this;
  }
  ellipsoid(c, r, colr, seg = 10, w = 0, ao = 1) {
    const base = this.P.length / 3, rings = Math.max(4, seg >> 1);
    for (let i = 0; i <= rings; i++) {
      const th = i / rings * Math.PI, st = Math.sin(th), ct = Math.cos(th);
      for (let k = 0; k <= seg; k++) {
        const ph = k / seg * TAU, n = [st * Math.cos(ph), ct, st * Math.sin(ph)];
        const cc = typeof colr === 'function' ? colr(n) : colr;
        this.vert([c[0] + n[0] * r[0], c[1] + n[1] * r[1], c[2] + n[2] * r[2]], V3.norm([n[0] / r[0], n[1] / r[1], n[2] / r[2]]), cc, ao * (0.75 + 0.25 * (n[1] * 0.5 + 0.5)), typeof w === 'function' ? w(n) : w);
      }
    }
    for (let i = 0; i < rings; i++) for (let k = 0; k < seg; k++) { const a = base + i * (seg + 1) + k, b = a + seg + 1; this.quad(a, b, b + 1, a + 1); }
    return this;
  }
  box(c, s, colr, w = 0, ao = 1) {
    const F = [[[1, 0, 0], [0, 1, 0], [0, 0, 1]], [[-1, 0, 0], [0, 1, 0], [0, 0, -1]], [[0, 1, 0], [0, 0, 1], [1, 0, 0]], [[0, -1, 0], [0, 0, -1], [1, 0, 0]], [[0, 0, 1], [1, 0, 0], [0, 1, 0]], [[0, 0, -1], [-1, 0, 0], [0, 1, 0]]];
    for (const [n, u, v] of F) {
      const idx = [];
      for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        const p = [0, 1, 2].map(k => c[k] + (n[k] + u[k] * a + v[k] * b) * s[k] / 2);
        idx.push(this.vert(p, n, typeof colr === 'function' ? colr(n) : colr, ao * (n[1] < 0 ? 0.6 : n[1] > 0 ? 1 : 0.85), w));
      }
      this.quad(idx[0], idx[1], idx[2], idx[3]);
    }
    return this;
  }
  cyl(a, b, r1, r2, colr, seg = 10, caps = true, wFn = () => 0) {
    const ax = V3.sub(b, a), L = V3.len(ax), d = V3.norm(ax);
    const t1 = Math.abs(d[1]) < 0.9 ? V3.norm(V3.cross(d, [0, 1, 0])) : V3.norm(V3.cross(d, [1, 0, 0])), t2 = V3.cross(d, t1);
    const base = this.P.length / 3, slope = (r1 - r2) / L;
    for (let e = 0; e < 2; e++) for (let k = 0; k <= seg; k++) {
      const an = k / seg * TAU, rr = e ? r2 : r1, dir = V3.add(V3.mul(t1, Math.cos(an)), V3.mul(t2, Math.sin(an)));
      const p = V3.add(e ? b : a, V3.mul(dir, rr));
      this.vert(p, V3.norm(V3.add(dir, V3.mul(d, slope))), typeof colr === 'function' ? colr(e, an) : colr, 1, wFn(e));
    }
    for (let k = 0; k < seg; k++) { const i = base + k; this.quad(i, i + 1, i + seg + 2, i + seg + 1); }
    if (caps) for (let e = 0; e < 2; e++) {
      const rr = e ? r2 : r1; if (rr < 1e-3) continue;
      const c = this.vert(e ? b : a, e ? d : V3.mul(d, -1), typeof colr === 'function' ? colr(e, 0) : colr, 1, wFn(e));
      for (let k = 0; k < seg; k++) { const i = base + e * (seg + 1) + k; if (e) this.tri(c, i, i + 1); else this.tri(c, i + 1, i); }
    }
    return this;
  }
  /* flat polygon (fan) visible from both sides */
  poly(pts, colr, wFn = () => 0, uvs) {
    const n = V3.norm(V3.cross(V3.sub(pts[1], pts[0]), V3.sub(pts[2], pts[0])));
    for (const sg of [1, -1]) {
      const b = this.P.length / 3;
      pts.forEach((p, i) => this.vert(p, V3.mul(n, sg), colr, 1, wFn(p), uvs ? 1 : 0, uvs ? uvs[i][0] : 0, uvs ? uvs[i][1] : 0));
      for (let i = 1; i < pts.length - 1; i++) { if (sg > 0) this.tri(b, b + i, b + i + 1); else this.tri(b, b + i + 1, b + i); }
    }
    return this;
  }
  /* textured quad grid (for flags/signs) in local xy plane, facing +z */
  panel(w, h, nx, ny, uv0, uv1, colr, wFn, both = true, z = 0) {
    for (const sg of both ? [1, -1] : [1]) {
      const b = this.P.length / 3;
      for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
        const u = i / nx, v = j / ny;
        this.vert([u * w, h - v * h, z * sg], [0, 0, sg], colr, 1, wFn ? wFn(u, v) : 0, 1, lerp(uv0[0], uv1[0], sg > 0 ? u : u), lerp(uv0[1], uv1[1], v));
      }
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        const a = b + j * (nx + 1) + i, c = a + nx + 1;
        if (sg > 0) this.quad(a, c, c + 1, a + 1); else this.quad(a, a + 1, c + 1, c);
      }
    }
    return this;
  }
  build() {
    return { pos: new Float32Array(this.P), nrm: new Float32Array(this.N), col: new Float32Array(this.C), ext: new Float32Array(this.E), idx: new Uint32Array(this.I) };
  }
}

/* upload a mesh + an instance buffer */
function meshGL(m) {
  const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
  GLX.buffer(m.pos); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
  GLX.buffer(m.nrm); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
  GLX.buffer(m.col); gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 4, m.col instanceof Uint8Array ? gl.UNSIGNED_BYTE : gl.FLOAT, m.col instanceof Uint8Array, 0, 0);
  if (m.ext) { GLX.buffer(m.ext); gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 4, gl.FLOAT, false, 0, 0); }
  else { gl.disableVertexAttribArray(3); gl.vertexAttrib4f(3, 0, 0, 0, 0); }
  const ib = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, ib);
  for (let k = 0; k < 3; k++) { gl.enableVertexAttribArray(4 + k); gl.vertexAttribPointer(4 + k, 4, gl.FLOAT, false, 48, k * 16); gl.vertexAttribDivisor(4 + k, 1); }
  const big = m.pos.length / 3 > 65535, idx = big ? m.idx : new Uint16Array(m.idx);
  GLX.buffer(idx, gl.ELEMENT_ARRAY_BUFFER);
  gl.bindVertexArray(null);
  return { vao, ib, cap: 0, count: m.idx.length, itype: big ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT, inst: new Float32Array(0), n: 0 };
}

/* ---------------- creatures ---------------- */
const up = [0, 1, 0];
function fishMesh(o) {
  const mb = new MB(), L = o.len, Hh = o.h, Wd = o.w, rings = [], R = 14;
  for (let i = 0; i < R; i++) {
    const t = i / (R - 1), s = Math.pow(Math.sin(Math.PI * (0.1 + 0.86 * t)), 0.8);
    const hump = o.hump ? Math.exp(-Math.pow((t - 0.8) / 0.09, 2)) * o.hump : 0;
    rings.push({ x: -L / 2 + t * L, ry: Hh / 2 * s + hump * 0.5, rz: Wd / 2 * s, y: hump * 0.5 });
  }
  const wf = t => Math.pow(1 - t, 1.6);
  mb.lathe(rings, 12, (t, a, cy) => o.color(t, cy, a), wf);
  const tx = -L / 2, tc = o.fin || o.color(0.05, 0.3, 0);
  mb.poly([[tx + L * 0.02, 0, 0], [tx - L * 0.2, Hh * 0.46, 0], [tx - L * 0.13, 0, 0], [tx - L * 0.2, -Hh * 0.46, 0]], tc, () => 1.15);
  mb.poly([[-L * 0.25, Hh * 0.38, 0], [L * 0.02, Hh * 0.62 + (o.hump || 0) * 0.3, 0], [L * 0.2, Hh * 0.42, 0]], o.dorsal || tc, p => wf((p[0] + L / 2) / L));
  mb.poly([[-L * 0.15, -Hh * 0.36, 0], [-L * 0.02, -Hh * 0.55, 0], [L * 0.05, -Hh * 0.35, 0]], tc, p => wf((p[0] + L / 2) / L));
  for (const s of [1, -1]) {
    mb.poly([[L * 0.2, -Hh * 0.05, s * Wd * 0.4], [L * 0.05, -Hh * 0.18, s * Wd * 0.95], [L * 0.1, -Hh * 0.25, s * Wd * 0.45]], tc, () => 0.3);
    mb.ellipsoid([L * 0.36, Hh * 0.07, s * Wd * 0.33], [Hh * 0.075, Hh * 0.075, Hh * 0.04], col('#101010'), 8, 0.1);
    mb.ellipsoid([L * 0.37, Hh * 0.075, s * Wd * 0.36], [Hh * 0.03, Hh * 0.03, Hh * 0.02], col('#e8e8d8'), 6, 0.1);
  }
  return mb.build();
}
const FISH = {
  damsel: () => fishMesh({ len: 0.34, h: 0.15, w: 0.06, color: (t, cy) => { let c = V3.lerp(col('#3d4a4c'), col('#1e2426'), cy * 0.5 + 0.5); if (t < 0.15) c = V3.lerp(c, col('#d8dcd0'), smooth(0.15, 0.05, t)); return c; } }),
  blue: () => fishMesh({ len: 0.26, h: 0.12, w: 0.05, color: (t, cy) => V3.lerp(col('#f0c020'), col('#1f5fe0'), smooth(-0.6, 0.2, cy) * (t < 0.12 ? 0.3 : 1)), fin: col('#e8b818') }),
  hump: () => fishMesh({ len: 1.0, h: 0.38, w: 0.16, hump: 0.2, color: (t, cy) => { let c = V3.lerp(col('#e2a58f'), col('#8a3a4a'), smooth(-0.5, 0.6, cy)); if (t > 0.75) c = V3.lerp(c, col('#b85a60'), 0.5); return c; }, fin: col('#6a2a3a') }),
  stone: () => fishMesh({ len: 0.6, h: 0.3, w: 0.1, color: (t, cy) => { const band = Math.sin(t * 7 * Math.PI) > 0.2 && t > 0.12 && t < 0.92; return V3.mul(band ? col('#1c1c1e') : col('#c9c6b4'), 0.85 + 0.15 * cy); }, fin: col('#222226') })
};
function squidMesh() {
  const mb = new MB(), rings = [];
  for (let i = 0; i < 12; i++) { const t = i / 11, r = 0.075 * Math.pow(Math.sin(Math.PI * (0.02 + 0.6 * t)), 0.9); rings.push({ x: -0.3 + t * 0.4, ry: r, rz: r }); }
  mb.lathe(rings, 12, (t, a, cy) => V3.lerp(col('#f2d8cc'), col('#b8563f'), smooth(-0.3, 0.8, cy) * (0.7 + 0.3 * Math.sin(t * 30))), () => 0);
  for (const s of [1, -1]) mb.poly([[-0.3, 0, 0], [-0.22, 0, s * 0.12], [-0.12, 0, 0]], col('#e0b0a0'));
  mb.ellipsoid([0.12, 0, 0], [0.05, 0.05, 0.055], col('#e8c8bc'), 10);
  for (const s of [1, -1]) mb.ellipsoid([0.13, 0.01, s * 0.045], [0.018, 0.02, 0.01], col('#101218'), 6);
  for (let k = 0; k < 8; k++) {
    const a = k / 8 * TAU, dy = Math.cos(a) * 0.028, dz = Math.sin(a) * 0.028, len = k < 2 ? 0.32 : 0.2;
    mb.cyl([0.15, dy, dz], [0.15 + len, dy * 1.6, dz * 1.6], 0.011, 0.003, col('#e6b8a8'), 5, false, e => e ? 1 : 0.1);
  }
  return mb.build();
}
function shrimpMesh() {
  const mb = new MB(), segs = 9;
  for (let i = 0; i < segs; i++) {
    const t = i / (segs - 1), a = -0.2 + t * 1.9, R = 0.1, x = Math.cos(a) * R * 1.4 - 0.05, y = Math.sin(a) * R * 0.6 + 0.06, r = 0.028 * (1 - t * 0.55);
    mb.ellipsoid([x, y, 0], [0.026, r, r * 0.9], n => V3.lerp(col('#d93a2a'), col('#f4e6dc'), (i % 2) * 0.35 + smooth(0.5, 1, n[1]) * 0.25), 8);
  }
  mb.ellipsoid([0.12, 0.05, 0], [0.05, 0.035, 0.03], col('#cc3322'), 8);
  mb.poly([[-0.14, 0.02, 0], [-0.2, 0.0, 0.05], [-0.2, 0.0, -0.05]], col('#e05a44'));
  for (const s of [1, -1]) {
    mb.cyl([0.16, 0.06, s * 0.01], [0.42, 0.14, s * 0.08], 0.003, 0.0015, col('#e8a090'), 4, false, e => e ? 1 : 0);
    mb.ellipsoid([0.155, 0.075, s * 0.02], [0.008, 0.008, 0.008], col('#111'), 5);
    for (let k = 0; k < 4; k++) mb.cyl([0.06 - k * 0.04, 0.03, s * 0.015], [0.08 - k * 0.04, -0.02, s * 0.05], 0.004, 0.002, col('#e07060'), 4, false);
  }
  return mb.build();
}
function urchinMesh() {
  const mb = new MB(); mb.ellipsoid([0, 0.05, 0], [0.07, 0.055, 0.07], col('#2a1426'), 10);
  const r = makeRand(5);
  for (let k = 0; k < 70; k++) { const u = r() * 2 - 1, a = r() * TAU, s = Math.sqrt(1 - u * u); const d = [s * Math.cos(a), Math.abs(u) * 0.9 + 0.1, s * Math.sin(a)]; const n = V3.norm(d); mb.cyl(V3.add([0, 0.05, 0], V3.mul(n, 0.05)), V3.add([0, 0.05, 0], V3.mul(n, 0.17 + r() * 0.05)), 0.006, 0.0008, col('#3a1a34'), 3, false); }
  return mb.build();
}
function starMesh() {
  const mb = new MB(); mb.ellipsoid([0, 0.015, 0], [0.04, 0.02, 0.04], col('#e2582c'), 10);
  for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; mb.cyl([Math.cos(a) * 0.02, 0.015, Math.sin(a) * 0.02], [Math.cos(a) * 0.15, 0.01, Math.sin(a) * 0.15], 0.03, 0.008, (e) => e ? col('#f07a3a') : col('#d9462a'), 6, true); }
  return mb.build();
}
function abaloneMesh() {
  const mb = new MB(); mb.ellipsoid([0, 0.02, 0], [0.11, 0.035, 0.075], n => V3.lerp(col('#5a4a36'), col('#7a8a5a'), smooth(0, 1, n[1]) * 0.5), 12);
  for (let k = 0; k < 5; k++) mb.ellipsoid([0.06 - k * 0.025, 0.045, 0.045], [0.008, 0.006, 0.008], col('#2a2418'), 5);
  mb.ellipsoid([0, 0.0, 0], [0.1, 0.015, 0.065], col('#c8b070'), 10);
  return mb.build();
}
function conchMesh() {
  const mb = new MB();
  for (let k = 0; k < 6; k++) { const y = k * 0.03, r = 0.07 * (1 - k / 6) + 0.01; mb.ellipsoid([0, y + 0.03, 0], [r, 0.03, r], n => V3.lerp(col('#6a5a44'), col('#a08a64'), k / 6 + n[1] * 0.1), 10); if (k < 4) for (let s = 0; s < 6; s++) { const a = s / 6 * TAU + k; mb.cyl([Math.cos(a) * r * 0.8, y + 0.04, Math.sin(a) * r * 0.8], [Math.cos(a) * (r + 0.03), y + 0.06, Math.sin(a) * (r + 0.03)], 0.008, 0.001, col('#8a7050'), 3, false); } }
  return mb.build();
}
function cucumberMesh() {
  const mb = new MB(), rings = [];
  for (let i = 0; i < 12; i++) { const t = i / 11, r = 0.045 * Math.pow(Math.sin(Math.PI * (0.05 + 0.9 * t)), 0.6); rings.push({ x: -0.15 + t * 0.3, ry: r * 0.8, rz: r, y: r * 0.8 }); }
  mb.lathe(rings, 10, (t, a, cy) => V3.mul(col('#3a2a20'), 0.7 + 0.3 * cy), () => 0);
  const r = makeRand(8); for (let k = 0; k < 16; k++) { const x = -0.12 + r() * 0.24, a = r() * Math.PI; mb.cyl([x, 0.036 + Math.sin(a) * 0.03, Math.cos(a) * 0.035], [x, 0.036 + Math.sin(a) * 0.055, Math.cos(a) * 0.05], 0.009, 0.002, col('#4a3424'), 4, false); }
  return mb.build();
}
function musselMesh() {
  const mb = new MB();
  for (const s of [1, -1]) mb.at([0, 0, 0], 0, 0, s * 0.35).ellipsoid([0, 0.02, s * 0.012], [0.06, 0.02, 0.022], n => V3.lerp(col('#101626'), col('#2a3448'), n[1] * 0.5 + 0.5), 8);
  return mb.build();
}
function kelpMesh(tall) {
  const mb = new MB(), r = makeRand(tall ? 3 : 11), H = tall ? 4.2 : 2.6;
  mb.cyl([0, 0, 0], [0, H * 0.35, 0], 0.035, 0.02, col('#4a3a16'), 6, false, e => e ? 0.35 : 0);
  for (let k = 0; k < (tall ? 9 : 7); k++) {
    const a = r() * TAU, len = H * (0.55 + r() * 0.45), w = tall ? 0.16 : 0.22, y0 = H * 0.3 + r() * 0.1, dx = Math.cos(a), dz = Math.sin(a);
    const pts = [], segs = 6;
    for (let s = 0; s <= segs; s++) { const t = s / segs, y = y0 + t * len, off = t * 0.35, ww = w * Math.sin(Math.PI * Math.min(1, t * 1.1 + 0.08)); pts.push([[dx * off - dz * ww, y, dz * off + dx * ww], [dx * off + dz * ww, y, dz * off - dx * ww]]); }
    for (let s = 0; s < segs; s++) {
      const c = V3.lerp(col(tall ? '#5a4a14' : '#6b5a1e'), col('#8a7a2a'), s / segs);
      mb.poly([pts[s][0], pts[s][1], pts[s + 1][1], pts[s + 1][0]], c, p => clamp(p[1] / (H * 1.1), 0, 1));
    }
  }
  return mb.build();
}
function tunicateMesh() {
  const mb = new MB();
  mb.cyl([0, 0, 0], [0.02, 0.22, 0], 0.045, 0.035, col('#e6eef0'), 12, false);
  mb.ellipsoid([0.02, 0.22, 0], [0.036, 0.02, 0.036], col('#f4f8f8'), 10);
  mb.cyl([0.02, 0.2, 0], [0.05, 0.3, 0.01], 0.014, 0.012, col('#fff4c0'), 8, false);
  mb.cyl([0.01, 0.12, 0], [-0.04, 0.2, 0.0], 0.012, 0.01, col('#fff4c0'), 8, false);
  return mb.build();
}
function hydrateMesh() {
  const mb = new MB(), r = makeRand(21);
  for (let k = 0; k < 9; k++) { const a = r() * TAU, d = r() * 1.2; mb.ellipsoid([Math.cos(a) * d, 0.2 + r() * 0.3, Math.sin(a) * d], [0.35 + r() * 0.35, 0.25 + r() * 0.3, 0.3 + r() * 0.3], n => V3.lerp(col('#cfe6ee'), col('#ffffff'), n[1] * 0.5 + 0.5), 6); }
  return mb.build();
}
function gullMesh(sit) {
  const mb = new MB(), white = col('#f4f4f0'), grey = col('#8e98a2'), black = col('#16181c'), yellow = col('#e8c030');
  mb.ellipsoid([0, 0, 0], [0.26, 0.09, 0.085], n => V3.lerp(white, V3.mul(white, 0.8), n[1] < 0 ? 0 : 0), 10);
  mb.ellipsoid([0.23, 0.07, 0], [0.075, 0.065, 0.058], white, 10);
  mb.cyl([0.29, 0.065, 0], [0.37, 0.055, 0], 0.017, 0.006, c => yellow, 6, true);
  mb.ellipsoid([0.355, 0.055, 0], [0.012, 0.012, 0.011], col('#c02020'), 5);
  for (const s of [1, -1]) mb.ellipsoid([0.255, 0.09, s * 0.042], [0.011, 0.011, 0.008], black, 5);
  mb.poly([[-0.2, 0.01, 0.045], [-0.34, 0.015, 0.07], [-0.34, 0.015, -0.07], [-0.2, 0.01, -0.045]], white);
  mb.poly([[-0.31, 0.015, 0.065], [-0.37, 0.016, 0.07], [-0.37, 0.016, -0.07], [-0.31, 0.015, -0.065]], black);
  if (!sit) {
    for (const s of [1, -1]) {
      mb.poly([[0.1, 0.03, s * 0.06], [0.04, 0.04, s * 0.42], [-0.08, 0.035, s * 0.4], [-0.1, 0.03, s * 0.06]], grey, p => Math.abs(p[2]) / 0.8 * Math.sign(p[2]));
      mb.poly([[0.04, 0.04, s * 0.42], [-0.02, 0.045, s * 0.78], [-0.08, 0.035, s * 0.4]], black, p => Math.abs(p[2]) / 0.8 * Math.sign(p[2]));
    }
  } else {
    for (const s of [1, -1]) mb.at([0, 0, 0], 0, 0, 0).ellipsoid([-0.04, 0.035, s * 0.07], [0.25, 0.05, 0.03], n => n[0] < -0.6 ? black : grey, 8);
    for (const s of [1, -1]) mb.cyl([0.02, -0.07, s * 0.035], [0.02, -0.2, s * 0.035], 0.012, 0.01, yellow, 5, false);
  }
  return mb.build();
}
function petrelMesh() {
  const mb = new MB(), dark = col('#2e2620'), wing = col('#3a302a');
  mb.ellipsoid([0, 0, 0], [0.12, 0.045, 0.045], dark, 8); mb.ellipsoid([0.1, 0.03, 0], [0.04, 0.036, 0.032], dark, 8);
  mb.cyl([0.13, 0.03, 0], [0.17, 0.025, 0], 0.01, 0.004, col('#111'), 5);
  mb.poly([[-0.1, 0.005, 0.02], [-0.2, 0.01, 0.06], [-0.16, 0.01, 0], [-0.2, 0.01, -0.06], [-0.1, 0.005, -0.02]], dark);
  for (const s of [1, -1]) mb.poly([[0.05, 0.02, s * 0.03], [0.0, 0.03, s * 0.25], [-0.06, 0.03, s * 0.32], [-0.05, 0.02, s * 0.03]], wing, p => Math.abs(p[2]) / 0.34 * Math.sign(p[2]));
  return mb.build();
}
function egretMesh() {
  const mb = new MB(), white = col('#f6f6f2'), buff = col('#e0a050');
  mb.ellipsoid([0, 0.5, 0], [0.19, 0.11, 0.1], n => n[1] > 0.5 ? V3.lerp(white, buff, 0.4) : white, 10);
  mb.cyl([0.13, 0.55, 0], [0.18, 0.72, 0], 0.045, 0.035, buff, 8);
  mb.ellipsoid([0.2, 0.75, 0], [0.06, 0.05, 0.045], buff, 8);
  mb.cyl([0.25, 0.75, 0], [0.35, 0.735, 0], 0.016, 0.004, col('#f0c030'), 5);
  for (const s of [1, -1]) { mb.ellipsoid([0.235, 0.77, s * 0.035], [0.009, 0.009, 0.006], col('#111'), 5); mb.cyl([0, 0.42, s * 0.04], [0.01, 0.0, s * 0.05], 0.012, 0.01, col('#3a3020'), 5, false); }
  mb.poly([[-0.15, 0.5, 0.05], [-0.28, 0.46, 0], [-0.15, 0.5, -0.05]], white);
  return mb.build();
}
function sealionMesh() {
  const mb = new MB(), rings = [], c1 = col('#5a4a3e'), c2 = col('#8a7462');
  const prof = [[0, 0.04], [0.1, 0.18], [0.3, 0.3], [0.5, 0.33], [0.68, 0.27], [0.8, 0.17], [0.88, 0.15], [0.95, 0.12], [1, 0.03]];
  for (const [t, r] of prof) rings.push({ x: -1.1 + t * 2.2, ry: r * 0.9, rz: r, y: t > 0.8 ? (t - 0.8) * 0.8 : 0 });
  mb.lathe(rings, 12, (t, a, cy) => V3.lerp(c2, c1, smooth(-0.4, 0.5, cy)), t => Math.pow(1 - t, 1.3));
  for (const s of [1, -1]) {
    mb.poly([[0.35, -0.15, s * 0.22], [0.15, -0.32, s * 0.55], [0.05, -0.3, s * 0.4], [0.15, -0.15, s * 0.2]], c1, () => 0.2);
    mb.poly([[-0.95, 0, s * 0.03], [-1.35, 0, s * 0.28], [-1.25, 0, s * 0.02]], c1, () => 1);
    mb.ellipsoid([1.0, 0.2, s * 0.07], [0.022, 0.022, 0.014], col('#080808'), 6);
  }
  mb.ellipsoid([1.08, 0.13, 0], [0.04, 0.03, 0.035], col('#1a1210'), 6);
  return mb.build();
}
/* ---------------- plants ---------------- */
function flowerMesh(petal, center, leaf, n, petals, petalLen) {
  const mb = new MB(), r = makeRand(petals * 7 + n);
  for (let k = 0; k < 14; k++) { const a = r() * TAU, d = r() * 0.25; mb.poly([[Math.cos(a) * d, 0.02, Math.sin(a) * d], [Math.cos(a + 0.25) * (d + 0.18), 0.14 + r() * 0.1, Math.sin(a + 0.25) * (d + 0.18)], [Math.cos(a - 0.25) * (d + 0.18), 0.12, Math.sin(a - 0.25) * (d + 0.18)]], V3.mul(leaf, 0.8 + r() * 0.4), p => p[1] * 2); }
  for (let k = 0; k < n; k++) {
    const a = r() * TAU, d = r() * 0.25, h = 0.22 + r() * 0.16, cx = Math.cos(a) * d, cz = Math.sin(a) * d;
    mb.cyl([cx * 0.5, 0, cz * 0.5], [cx, h, cz], 0.006, 0.005, leaf, 4, false, e => e);
    for (let p = 0; p < petals; p++) { const b = p / petals * TAU + r(); mb.poly([[cx, h + 0.005, cz], [cx + Math.cos(b - 0.2) * petalLen, h + 0.02, cz + Math.sin(b - 0.2) * petalLen], [cx + Math.cos(b + 0.2) * petalLen, h + 0.02, cz + Math.sin(b + 0.2) * petalLen]], petal, () => 1); }
    mb.ellipsoid([cx, h + 0.012, cz], [0.016, 0.01, 0.016], center, 6, 1);
  }
  return mb.build();
}
function shrubMesh() {
  const mb = new MB(), r = makeRand(33);
  mb.cyl([0, 0, 0], [0.1, 0.9, 0], 0.09, 0.05, col('#4a3a2a'), 6, false);
  for (let k = 0; k < 9; k++) { const a = r() * TAU, d = 0.3 + r() * 0.6; mb.ellipsoid([Math.cos(a) * d, 0.8 + r() * 0.8, Math.sin(a) * d], [0.55 + r() * 0.3, 0.45 + r() * 0.2, 0.55 + r() * 0.3], n => V3.lerp(col('#1e3a14'), col('#3f6a22'), n[1] * 0.5 + 0.5 + r() * 0.1), 7, n => clamp(n[1] * 0.3 + 0.5, 0, 1), 0.85); }
  return mb.build();
}
function grassMesh() {
  const mb = new MB(), r = makeRand(44);
  for (let k = 0; k < 26; k++) { const a = r() * TAU, d = r() * 0.8, x = Math.cos(a) * d, z = Math.sin(a) * d, h = 0.25 + r() * 0.3, b = r() * TAU; mb.poly([[x - Math.cos(b) * 0.04, 0, z - Math.sin(b) * 0.04], [x + Math.cos(b) * 0.04, 0, z + Math.sin(b) * 0.04], [x + Math.cos(b + 1) * 0.06, h, z + Math.sin(b + 1) * 0.06]], V3.lerp(col('#3a5a1a'), col('#8a8a3a'), r()), p => p[1] * 3); }
  return mb.build();
}

/* ---------------- facilities ---------------- */
const ATLAS = { W: 1024, H: 1024 };
const auv = (x, y, w, h) => [[x / ATLAS.W, y / ATLAS.H], [(x + w) / ATLAS.W, (y + h) / ATLAS.H]];
async function buildAtlas() {
  const cv = document.createElement('canvas'); cv.width = ATLAS.W; cv.height = ATLAS.H; const c = cv.getContext('2d');
  c.fillStyle = '#888'; c.fillRect(0, 0, ATLAS.W, ATLAS.H);
  try { const img = new Image(); img.src = DATA_FLAG; await img.decode(); c.drawImage(img, 0, 0, 300, 200); } catch (e) { c.fillStyle = '#fff'; c.fillRect(0, 0, 300, 200); }
  const font = (w, s) => `${w} ${s}px "Gowun Dodum","Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",sans-serif`;
  for (const [x, t, e] of [[0, '독도이사부길', 'Dokdoisabu-gil'], [512, '독도안용복길', 'Dokdoanyongbok-gil']]) {
    c.fillStyle = '#1f4fa8'; c.fillRect(x, 256, 512, 140); c.strokeStyle = '#fff'; c.lineWidth = 8; c.strokeRect(x + 10, 266, 492, 120);
    c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = font('bold', 64); c.fillText(t, x + 256, 312); c.font = font('bold', 30); c.fillText(e, x + 256, 362);
  }
  const stone = (x, y, w, h, base) => { c.fillStyle = base; c.fillRect(x, y, w, h); for (let i = 0; i < 1800; i++) { c.fillStyle = `rgba(${Math.random() < .5 ? '0,0,0' : '255,255,255'},${Math.random() * 0.08})`; c.fillRect(x + Math.random() * w, y + Math.random() * h, 3, 3); } };
  stone(0, 420, 256, 560, '#7d7a72'); stone(256, 420, 256, 560, '#8f8b82');
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillStyle = '#2a2824'; c.font = `bold 150px "Noto Serif CJK KR","Batang","Songti SC",serif`;
  ['韓', '國', '領'].forEach((ch, i) => c.fillText(ch, 128, 530 + i * 160));
  c.fillStyle = '#1e1c1a'; c.font = font('bold', 92);
  ['대한민국', '독 도'].forEach((s, i) => { c.save(); c.translate(384, 620 + i * 190); c.fillText(s, 0, 0); c.restore(); });
  c.fillStyle = '#b82020'; c.fillRect(512, 420, 256, 256); c.fillStyle = '#fff'; c.font = font('bold', 50); c.fillText('우체통', 640, 520); c.font = font('bold', 26); c.fillText('POST 40240', 640, 590);
  const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.SRGB8_ALPHA8, gl.RGBA, gl.UNSIGNED_BYTE, cv);
  gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  ATLAS.tex = t;
}
const white = () => col('#e9e6de');
function windows(mb, x0, x1, y0, y1, z, nx, ny, face = 1, c = col('#233a4a')) {
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const x = lerp(x0, x1, (i + 0.5) / nx), y = lerp(y0, y1, (j + 0.5) / ny);
    mb.box([x, y, z + face * 0.03], [(x1 - x0) / nx * 0.55, (y1 - y0) / ny * 0.5, 0.1], c);
  }
}
const FAC = {
  quay: () => {
    const mb = new MB(), con = col('#7a776f');
    mb.box([0, 1.2, 8], [34, 2.6, 12], n => n[1] > 0.5 ? col('#8d8a80') : V3.mul(con, 0.85));
    mb.box([0, -2.5, 8], [33, 5, 11], col('#5a5a52'));
    mb.box([-10, 2.9, 12], [8, 0.8, 3], col('#c2beb2'));
    for (let i = 0; i < 6; i++) { mb.cyl([-15 + i * 6, 2.5, 13.3], [-15 + i * 6, 2.95, 13.3], 0.16, 0.13, col('#3a3a38'), 8); mb.ellipsoid([-15 + i * 6, 2.97, 13.3], [0.2, 0.08, 0.2], col('#3a3a38'), 8); mb.cyl([-15 + i * 6, 1.6, 14.1], [-15 + i * 6, 2.4, 14.1], 0.35, 0.35, col('#26282a'), 10); }
    for (let i = 0; i < 18; i++) mb.cyl([-16 + i * 1.9, 2.5, 2.2], [-16 + i * 1.9, 3.5, 2.2], 0.05, 0.05, col('#dddddd'), 4, false);
    mb.box([0, 3.45, 2.2], [34, 0.08, 0.08], col('#dddddd'));
    return mb.build();
  },
  guard: () => {
    const mb = new MB(), wall = col('#d8d2c4'), roof = col('#2f5f8a');
    mb.box([0, 3.5, 0], [18, 7, 10], wall); mb.box([0, 7.2, 0], [18.6, 0.5, 10.6], roof);
    mb.box([5, 9.5, 0], [7, 4, 7], wall); mb.box([5, 11.7, 0], [7.5, 0.4, 7.5], roof);
    windows(mb, -8, 8, 1.2, 6.5, 5, 7, 2); windows(mb, -8, 8, 1.2, 6.5, -5, 7, 2, -1);
    mb.cyl([-6, 7.4, -2], [-6, 20, -2], 0.35, 0.12, col('#c8c8c8'), 6); for (let k = 0; k < 4; k++) mb.box([-6, 10 + k * 2.6, -2], [1.6, 0.1, 0.1], col('#bbbbbb'));
    mb.ellipsoid([6.5, 12.6, 1.5], [1.1, 1.1, 1.1], col('#f2f2f2'), 10);
    return mb.build();
  },
  light: () => {
    const mb = new MB(), w = col('#f2f0ea');
    mb.box([0, 2, 0], [8, 4, 6], w); mb.box([0, 4.15, 0], [8.4, 0.3, 6.4], col('#9a3a2a'));
    mb.cyl([2, 0, 0], [2, 12, 0], 1.5, 1.2, w, 14); mb.box([2, 12.1, 0], [3.4, 0.25, 3.4], col('#333'));
    mb.cyl([2, 12.2, 0], [2, 13.8, 0], 0.9, 0.9, col('#ffe9a0'), 10, false);
    mb.cyl([2, 13.8, 0], [2, 14.8, 0], 1.05, 0.2, col('#b02a20'), 10);
    for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; mb.cyl([2 + Math.cos(a) * 1.6, 12.2, Math.sin(a) * 1.6], [2 + Math.cos(a) * 1.6, 13.1, Math.sin(a) * 1.6], 0.04, 0.04, col('#333'), 3, false); }
    windows(mb, -3.5, 0, 1, 3.2, 3, 2, 1);
    return mb.build();
  },
  heli: () => {
    const mb = new MB(); mb.box([0, 0.3, 0], [22, 0.6, 22], col('#6a6e6c'));
    for (let k = 0; k < 40; k++) { const a = k / 40 * TAU; mb.box([Math.cos(a) * 8, 0.62, Math.sin(a) * 8], [1.35, 0.05, 0.4], col('#f0f0f0')); mb.at([0, 0, 0], -a, 0, 0); mb.at(); }
    mb.box([-2.4, 0.62, 0], [0.8, 0.05, 6], col('#f0f0f0')); mb.box([2.4, 0.62, 0], [0.8, 0.05, 6], col('#f0f0f0')); mb.box([0, 0.62, 0], [4, 0.05, 0.8], col('#f0f0f0'));
    return mb.build();
  },
  house: () => {
    const mb = new MB(), wall = col('#eeeae0'), roof = col('#3d6fa0');
    mb.box([0, 7, 0], [10, 14, 8], wall); mb.box([0, 14.3, 0], [10.6, 0.6, 8.6], roof);
    windows(mb, -4.3, 4.3, 0.8, 13.5, 4, 4, 4); windows(mb, -4.3, 4.3, 0.8, 13.5, -4, 4, 4, -1);
    mb.box([0, 1.2, 4.3], [2, 2.4, 0.4], col('#6a4a2a'));
    mb.box([-2, 15.2, 0], [2, 1.2, 2], col('#a0a0a0'));
    return mb.build();
  },
  flag: () => {
    const mb = new MB(); mb.cyl([0, 0, 0], [0, 8.5, 0], 0.09, 0.06, col('#d8d8d8'), 8); mb.ellipsoid([0, 8.55, 0], [0.13, 0.13, 0.13], col('#d4b030'), 8);
    mb.at([0.08, 5.9, 0]).panel(3.0, 2.0, 16, 8, ...auv(2, 2, 296, 196), [1, 1, 1], (u) => u);
    return mb.build();
  },
  post: () => { const mb = new MB(); mb.box([0, 0.55, 0], [0.6, 1.1, 0.5], col('#c02424')); mb.cyl([-0.3, 1.1, 0], [0.3, 1.1, 0], 0.25, 0.25, col('#c02424'), 10); mb.box([0, 0.9, 0.24], [0.4, 0.06, 0.02], col('#222')); mb.at([-0.25, 0.25, 0.26]).panel(0.5, 0.5, 1, 1, ...auv(512, 420, 256, 256), [1, 1, 1], null, false); return mb.build(); },
  inscription: () => { const mb = new MB(); mb.box([0, 1.5, 0], [2.2, 3, 0.9], col('#6f6c64')); mb.at([-0.55, 0.3, 0.46]).panel(1.1, 2.4, 1, 1, ...auv(0, 420, 256, 560), [1, 1, 1], null, false); return mb.build(); },
  territory: () => { const mb = new MB(); mb.box([0, 0.3, 0], [1.6, 0.6, 1.2], col('#77736a')); mb.box([0, 1.7, 0], [1.0, 2.4, 0.6], col('#8a867c')); mb.at([-0.45, 0.6, 0.31]).panel(0.9, 2.1, 1, 1, ...auv(256, 420, 256, 560), [1, 1, 1], null, false); return mb.build(); },
  sign: (k) => () => { const mb = new MB(); for (const x of [-0.8, 0.8]) mb.cyl([x, 0, 0], [x, 2.4, 0], 0.05, 0.05, col('#9a9a9a'), 6); mb.box([0, 2.05, -0.03], [2.1, 0.62, 0.04], col('#1f4fa8')); mb.at([-1.0, 1.77, 0.0]).panel(2.0, 0.56, 1, 1, ...auv(k * 512, 256, 512, 140), [1, 1, 1], null, false); return mb.build(); },
  benchmark: () => { const mb = new MB(); mb.box([0, 0.15, 0], [0.7, 0.3, 0.7], col('#b8b4aa')); mb.cyl([0, 0.3, 0], [0, 0.34, 0], 0.12, 0.12, col('#c8a040'), 10); return mb.build(); },
  camera: () => { const mb = new MB(); mb.cyl([0, 0, 0], [0, 4, 0], 0.1, 0.08, col('#aaaaaa'), 6); mb.box([0.2, 4.2, 0], [0.9, 0.45, 0.45], col('#e8e8e8')); mb.cyl([0.65, 4.2, 0], [0.8, 4.2, 0], 0.16, 0.18, col('#222'), 8); mb.box([0.2, 4.47, 0], [1.0, 0.06, 0.55], col('#cccccc')); return mb.build(); },
  stone: () => { const mb = new MB(); mb.ellipsoid([0, 0.5, 0], [0.55, 0.7, 0.4], col('#7a766c'), 8); return mb.build(); },
  spring: () => { const mb = new MB(); for (let k = 0; k < 14; k++) { const a = k / 14 * TAU; mb.box([Math.cos(a) * 2.2, 0.4, Math.sin(a) * 2.2], [1.1, 0.8, 0.6], col('#8a857a')); } mb.cyl([0, 0.2, 0], [0, 0.5, 0], 2, 2, col('#2d6f7a'), 16); mb.box([-3.2, 1, 0], [0.6, 2, 3], col('#9a958a')); return mb.build(); }
};
FAC.sign1 = FAC.sign(0); FAC.sign2 = FAC.sign(1);

/* ---------------- exploration boat ---------------- */
function boatMesh() {
  const mb = new MB();
  const face = (pts, colr, ao = 1) => {
    const n = V3.norm(V3.cross(V3.sub(pts[1], pts[0]), V3.sub(pts[2], pts[0])));
    const b = pts.map(p => mb.vert(p, n, colr, ao));
    for (let i = 1; i < b.length - 1; i++) mb.tri(b[0], b[i], b[i + 1]);
  };
  const N = 12, S = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, x = -3.6 + t * 7.5;
    const w = t < 0.62 ? 1.3 - Math.pow(1 - t / 0.62, 3) * 0.12 : 1.3 * Math.pow(Math.max(0, 1 - (t - 0.62) / 0.38), 0.75);
    const top = 0.95 + Math.pow(t, 3) * 0.42, bot = -0.42 + t * t * 0.3;
    S.push({ x, w: Math.max(w, 0.02), top, mid: top - 0.32, chine: bot + 0.3, bot });
  }
  const navy = col('#23408e'), white = col('#f3f1ec'), red = col('#a8322a'), wood = col('#b98d5c'), grey = col('#5d646b');
  for (let i = 0; i < N; i++) {
    const a = S[i], b = S[i + 1];
    for (const sg of [1, -1]) {
      const P = (s, y, k) => [s.x, y, sg * s.w * k];
      const q = (p) => sg > 0 ? p : [p[0], p[3], p[2], p[1]];
      face(q([P(a, a.top, 1), P(a, a.mid, 1), P(b, b.mid, 1), P(b, b.top, 1)]).reverse(), navy);
      face(q([P(a, a.mid, 1), P(a, a.chine, 0.86), P(b, b.chine, 0.86), P(b, b.mid, 1)]).reverse(), white);
      face(q([P(a, a.chine, 0.86), [a.x, a.bot, 0], [b.x, b.bot, 0], P(b, b.chine, 0.86)]).reverse(), red, 0.8);
      face(q([P(a, a.top, 1), P(b, b.top, 1), P(b, b.top, 0.9), P(a, a.top, 0.9)]).reverse(), white);
    }
    const dy = 0.5;
    face([[a.x, dy, -a.w * 0.9], [a.x, dy, a.w * 0.9], [b.x, dy, b.w * 0.9], [b.x, dy, -b.w * 0.9]], wood, 0.9);
    for (const sg of [1, -1]) face(sg > 0 ? [[a.x, dy, a.w * 0.9], [a.x, a.top, a.w * 0.9], [b.x, b.top, b.w * 0.9], [b.x, dy, b.w * 0.9]] : [[b.x, dy, -b.w * 0.9], [b.x, b.top, -b.w * 0.9], [a.x, a.top, -a.w * 0.9], [a.x, dy, -a.w * 0.9]], col('#dcd8cf'), 0.75);
  }
  const s0 = S[0];
  face([[s0.x, s0.top, s0.w], [s0.x, s0.top, -s0.w], [s0.x, s0.chine, -s0.w * 0.86], [s0.x, s0.bot, 0], [s0.x, s0.chine, s0.w * 0.86]], white);
  // cabin
  mb.box([0.35, 1.25, 0], [2.1, 1.5, 1.9], white);
  mb.box([0.35, 2.05, 0], [2.4, 0.14, 2.1], navy);
  mb.box([1.42, 1.45, 0], [0.06, 0.62, 1.55], col('#1d3b55'));
  for (const sg of [1, -1]) mb.box([0.35, 1.45, sg * 0.955], [1.6, 0.52, 0.04], col('#1d3b55'));
  mb.box([-0.72, 1.45, 0], [0.04, 0.52, 1.2], col('#1d3b55'));
  mb.cyl([0.35, 2.12, 0], [0.35, 2.9, 0], 0.04, 0.03, col('#d8d8d8'), 5);
  mb.ellipsoid([0.35, 2.95, 0], [0.12, 0.08, 0.12], col('#ffcf3a'), 6);
  // seats, engine, rails, life ring
  mb.box([-1.9, 0.72, 0.62], [0.9, 0.36, 0.5], col('#e9e4d8')); mb.box([-1.9, 0.72, -0.62], [0.9, 0.36, 0.5], col('#e9e4d8'));
  mb.box([-3.85, 0.55, 0], [0.5, 1.1, 0.55], col('#26292d')); mb.box([-3.85, 1.18, 0], [0.62, 0.36, 0.62], grey);
  for (const sg of [1, -1]) {
    for (let k = 0; k < 4; k++) { const s = S[8 + k]; mb.cyl([s.x, s.top, sg * s.w * 0.9], [s.x, s.top + 0.42, sg * s.w * 0.9], 0.025, 0.025, col('#d0d0d0'), 4, false); }
    mb.cyl([S[8].x, S[8].top + 0.42, sg * S[8].w * 0.9], [S[11].x, S[11].top + 0.42, sg * S[11].w * 0.9], 0.03, 0.03, col('#d0d0d0'), 4, false);
  }
  for (let k = 0; k < 12; k++) { const a = k / 12 * TAU; mb.box([-0.2 + Math.cos(a) * 0.32, 1.35 + Math.sin(a) * 0.32, 0.99], [0.16, 0.16, 0.1], k % 3 ? col('#f06a2a') : white); }
  // flag at the stern
  mb.cyl([-3.2, 0.95, -0.9], [-3.2, 2.9, -0.9], 0.03, 0.025, col('#d8d8d8'), 5);
  mb.at([-3.18, 2.2, -0.9]).panel(0.95, 0.63, 4, 2, ...auv(2, 2, 296, 196), [1, 1, 1], null, true, 0.004);
  mb.at();
  return mb.build();
}
