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
function sealionMesh(beret) {
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
  if (beret === true) {
    mb.ellipsoid([0.97, 0.3, 0], [0.2, 0.075, 0.21], col('#23408e'), 12);
    mb.ellipsoid([0.97, 0.38, 0], [0.035, 0.03, 0.035], col('#23408e'), 6);
    mb.ellipsoid([1.02, 0.33, 0.14], [0.05, 0.035, 0.02], col('#f2e7cf'), 6);
    mb.poly([[0.86, 0.13, -0.16], [0.86, 0.13, 0.16], [0.78, 0.0, 0]], col('#2c55b8'));
  }
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
  /* 접안시설: 길이 방향 = local x, 바다 쪽 = local +z, 땅 쪽 마당(물양장) = local -z */
  quay: () => {
    const mb = new MB(), con = col('#7a776f'), top = col('#9a968b');
    mb.box([0, 1.2, 4], [40, 2.6, 20], n => n[1] > 0.5 ? top : V3.mul(con, 0.85));
    mb.box([0, -2.7, 8.5], [39.4, 5.4, 11], col('#55564f'));
    mb.box([0, 2.52, 13.55], [40, 0.04, 0.55], col('#e8c23a'));
    for (let i = 0; i < 20; i++) mb.box([-19.5 + i * 2.05, 2.53, 13.84], [1.0, 0.045, 0.12], col('#222222'));
    for (let i = 0; i < 6; i++) {
      const x = -16.25 + i * 6.5;
      mb.cyl([x, 2.5, 12.7], [x, 2.95, 12.7], 0.16, 0.13, col('#3a3a38'), 8); mb.ellipsoid([x, 2.97, 12.7], [0.22, 0.08, 0.22], col('#3a3a38'), 8);
      mb.cyl([x + 3.25, 0.9, 14.25], [x + 3.25, 2.35, 14.25], 0.36, 0.36, col('#26282a'), 10);
    }
    // 바다로 내려가는 계단 (북쪽 끝)
    for (let k = 0; k < 6; k++) mb.box([-18.2, 2.2 - k * 0.42, 15.2 + k * 0.5], [3.2, 0.42, 0.5], col('#8a867c'));
    // 마당 쪽 화단 턱과 안내판
    mb.box([10, 2.75, -4.4], [12, 0.5, 0.6], col('#a8a398'));
    mb.box([-12, 2.75, -4.4], [8, 0.5, 0.6], col('#a8a398'));
    for (const x of [16.2, 17.8]) mb.cyl([x, 2.5, -2.5], [x, 4.2, -2.5], 0.05, 0.05, col('#8a8a8a'), 5, false);
    mb.box([17, 4.25, -2.5], [2.2, 1.0, 0.08], col('#24508f')); mb.box([17, 4.25, -2.45], [2.0, 0.8, 0.02], col('#e8eef6'));
    return mb.build();
  },
  /* 독도경비대 숙소: 3층 건물, 앞(local +z)은 계단길이 올라오는 쪽 */
  guard: () => {
    const mb = new MB(), wall = col('#e4ded0'), roof = col('#2f5f8a'), band = col('#a9a397');
    mb.box([0, 5.25, 0], [18, 10.5, 10], wall);
    for (const y of [3.5, 7]) mb.box([0, y, 0], [18.2, 0.22, 10.2], band);
    mb.box([0, 10.75, 0], [18.6, 0.5, 10.6], roof);
    mb.box([5, 12.5, 0], [7, 3.5, 7], wall); mb.box([5, 14.45, 0], [7.5, 0.4, 7.5], roof);
    windows(mb, -8, 8, 0.9, 10.2, 5, 7, 3); windows(mb, -8, 8, 0.9, 10.2, -5, 7, 3, -1);
    mb.box([-5.5, 1.2, 5.06], [1.8, 2.4, 0.12], col('#40566a')); mb.box([-5.5, 2.75, 5.8], [3.2, 0.18, 1.6], roof);
    for (let k = 0; k < 3; k++) mb.box([-5.5, -0.1 - k * 0.2, 5.4 + k * 0.4], [2.6, 0.4, 0.4], col('#b4aea2'));
    mb.cyl([-6, 11, -2], [-6, 24, -2], 0.35, 0.12, col('#c8c8c8'), 6); for (let k = 0; k < 4; k++) mb.box([-6, 13 + k * 2.6, -2], [1.6, 0.1, 0.1], col('#bbbbbb'));
    mb.ellipsoid([6.5, 15.6, 1.5], [1.2, 1.2, 1.2], col('#f2f2f2'), 10);
    for (let k = 0; k < 3; k++) { mb.at([-2 + k * 2.6, 11.4, -2.5], 0, 0, -0.45); mb.box([0, 0, 0], [2.3, 0.08, 1.6], col('#1f3550')); } mb.at();
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
  /* 서도 주민숙소: 절벽에 붙은 4층 벽돌 건물 + 계단실 탑, 앞마당(서도 선착장), 크레인, 방파 옹벽.
     앞(local +z)은 동도 선착장 쪽 바다를 바라봐요. */
  house: () => {
    const mb = new MB(), brick = col('#6e4339'), dark = col('#3b3837'), slab = col('#d9d5cc'), glass = col('#9fc4cf'), rail = col('#cfcfcf');
    const bw = (n) => n[1] > 0.5 ? slab : brick;
    // main brick block, floors get a little deeper toward the top like the real building
    mb.box([1, 6.6, -0.6], [11, 13.2, 8.8], bw);
    for (let f = 0; f < 4; f++) {
      const y = 3.3 * f;
      mb.box([1.2, y + 3.25, 4.4], [11.2, 0.3, 1.8], slab);                      // balcony slab
      if (f) { mb.box([1.2, y + 0.55, 5.25], [11.2, 0.12, 0.12], rail); for (let i = 0; i < 9; i++) mb.box([-4.2 + i * 1.35, y + 0.28, 5.25], [0.06, 0.55, 0.06], rail); }
      mb.box([1.2, y + 1.6, 3.82], [10.6, 2.5, 0.1], brick);
      for (let i = 0; i < 3; i++) mb.box([-2.4 + i * 3.6, y + 1.9, 3.9], [1.7, 1.25, 0.08], glass);
    }
    // dark stair tower at the front-left with a narrow window column
    mb.box([-5.9, 7.7, 1.6], [3.4, 15.4, 3.6], dark);
    for (let f = 0; f < 4; f++) mb.box([-5.9, 1.9 + f * 3.4, 3.43], [1.25, 1.0, 0.08], glass);
    mb.box([-6.0, 15.7, 1.4], [4.8, 0.3, 5.0], col('#f1efe9'));
    mb.box([1.4, 13.45, -0.4], [12.6, 0.3, 10.2], col('#f1efe9'));
    mb.box([1.4, 13.7, -0.6], [11, 0.2, 8.6], col('#3d6fa0'));
    // roof: flags, antenna
    for (const [x, h] of [[-0.5, 3.4], [1.0, 3.0]]) mb.cyl([x, 13.8, -3.6], [x, 13.8 + h, -3.6], 0.05, 0.04, col('#d8d8d8'), 5);
    mb.at([-0.48, 15.7, -3.6]).panel(1.2, 0.8, 4, 2, ...auv(2, 2, 296, 196), [1, 1, 1], null, true, 0.004); mb.at();
    mb.box([1.6, 16.2, -3.6], [1.0, 0.6, 0.03], col('#2a6fd0'));
    mb.ellipsoid([4.6, 14.5, -2.6], [0.65, 0.65, 0.2], col('#efefef'), 10);
    // ground floor entrance with steps and plastic stools
    mb.box([-1.2, 1.1, 3.92], [1.6, 2.2, 0.12], col('#40362e'));
    for (let k = 0; k < 3; k++) mb.box([-1.2, -0.05 - k * 0.0, 4.4 + k * 0.45], [2.4, 0.3 - k * 0.08, 0.45], col('#a9a59b'));
    for (const x of [2.2, 2.9]) mb.cyl([x, 0, 6.2], [x, 0.75, 6.2], 0.24, 0.2, col('#e8d9b0'), 8);
    // concrete yard = 서도 선착장, thick enough to read as a sea wall
    mb.box([0.5, -3.2, 7.4], [17, 6.4, 7.4], n => n[1] > 0.5 ? col('#b8b3a8') : col('#8d897f'));
    mb.box([-1, -3.7, 12.2], [8, 6.4, 2.8], n => n[1] > 0.5 ? col('#a7a296') : col('#7e7a72'));
    // white jersey barriers with rust streaks
    for (const [x, z, yw] of [[-1.5, 9.6, 0], [3.8, 9.8, 0.08]]) {
      mb.at([x, 0, z], yw); mb.box([0, 0.55, 0], [4.6, 1.1, 0.8], n => n[1] > 0.5 ? col('#e9e5dc') : col('#d6cfc2')); mb.box([0, 0.12, 0], [4.6, 0.24, 1.1], col('#cfc8ba'));
      for (let i = 0; i < 5; i++) mb.box([-1.9 + i * 0.95, 0.6, 0.41], [0.07, 0.6, 0.02], col('#8a4a2a'));
      mb.at();
    }
    // tall wave-impact wall on the right with a fence on top (파도충격완화시설)
    mb.box([7.6, 1.8, 4.6], [1.0, 3.6, 10], n => n[1] > 0.5 ? col('#ece8df') : col('#ddd6c8'));
    for (let i = 0; i < 5; i++) { mb.cyl([7.6, 3.6, 0.4 + i * 2.1], [7.4, 6.6, 0.4 + i * 2.1], 0.12, 0.1, col('#d6d2c8'), 5); }
    mb.box([7.5, 6.0, 4.6], [0.04, 2.0, 9], col('#7b8b88'));
    // small loading crane at the yard corner
    mb.cyl([-6.2, 0, 8.2], [-6.2, 1.8, 8.2], 0.45, 0.4, col('#e6e6e6'), 10);
    mb.cyl([-6.2, 1.6, 8.2], [-4.0, 4.0, 10.6], 0.22, 0.14, col('#f2f2f2'), 8);
    mb.cyl([-4.0, 4.0, 10.6], [-4.0, 1.6, 10.6], 0.02, 0.02, col('#333'), 3, false);
    mb.box([-6.2, 1.1, 7.2], [0.8, 0.8, 0.6], col('#2f3a40'));
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

/* ---------------- 계단길 (terrain-following stairs with handrails) ----------------
   Built in world space around an anchor at the middle of the route, so the element sits at the anchor. */
function routeAt(rt, s) {
  const S = rt.prof; s = clamp(s, 0, rt.len);
  let lo = 0, hi = S.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (S[m].s <= s) lo = m; else hi = m; }
  const a = S[lo], b = S[hi], t = b.s > a.s ? (s - a.s) / (b.s - a.s) : 0, dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz) || 1;
  return { x: lerp(a.x, b.x, t), z: lerp(a.z, b.z, t), y: lerp(a.y, b.y, t), dx: dx / l, dz: dz / l };
}
function routeAnchor(name) {
  const rt = ROUTES[name]; if (!rt.anchor) { const m = routeAt(rt, rt.len * 0.5); rt.anchor = [m.x, TER.heightAt(m.x, m.z), m.z]; }
  return rt.anchor;
}
function routeMesh(name) {
  const rt = ROUTES[name], A = routeAnchor(name), mb = new MB(), hw = rt.w * 0.5;
  const wood = col('#8a6845'), con = col('#8c877d'), post = col('#5b605d'), rail = col('#6d4a2c');
  const treads = [];
  let s = 0;
  while (s < rt.len - 0.05) {
    const p = routeAt(rt, s), q = routeAt(rt, s + 1), g = Math.abs(q.y - p.y);
    const len = Math.min(g < 0.06 ? 1.8 : clamp(0.19 / g, 0.3, 1.5), rt.len - s);
    const m = routeAt(rt, s + len * 0.5); let top = m.y;
    for (const u of [0, 0.5, 1]) { const c = routeAt(rt, s + len * u); for (const l of [-hw, 0, hw]) top = Math.max(top, TER.heightAt(c.x - c.dz * l, c.z + c.dx * l) + 0.06); }
    treads.push({ s0: s, s1: s + len, top });
    mb.at([m.x - A[0], top - A[1], m.z - A[2]], Math.atan2(-m.dz, m.dx));
    mb.box([0, -0.7, 0], [len + 0.04, 1.4, rt.w], n => n[1] > 0.5 ? V3.mul(wood, 0.92 + 0.16 * ((treads.length * 7) % 5) / 5) : con);
    s += len;
  }
  mb.at();
  // handrails on both sides
  const topAt = (s) => { for (const t of treads) if (s <= t.s1 + 1e-6) return t.top; return treads[treads.length - 1].top; };
  for (const side of [-1, 1]) {
    let prev = null;
    for (let s = 0.3; s <= rt.len - 0.2; s += 2.2) {
      const c = routeAt(rt, s), l = side * (hw + 0.06), x = c.x - c.dz * l - A[0], z = c.z + c.dx * l - A[2], y = topAt(s) - A[1];
      mb.box([x, y + 0.5, z], [0.08, 1.0, 0.08], post);
      const P = [x, y + 1.0, z];
      if (prev) {
        const d = V3.sub(P, prev), hl = Math.hypot(d[0], d[2]), L = V3.len(d);
        if (L < 4) {
          const mid = V3.lerp(prev, P, 0.5), yaw = Math.atan2(-d[2], d[0]), pitch = Math.atan2(d[1], hl);
          mb.at(mid, yaw, pitch); mb.box([0, 0, 0], [L + 0.06, 0.07, 0.09], rail); mb.box([0, -0.5, 0], [L, 0.04, 0.04], post); mb.at();
        }
      }
      prev = P;
    }
  }
  return mb.build();
}

/* ---------------- 물자 운반 케이블(삭도) ----------------
   the cable hangs on the upper convex hull of the ground profile (+clearance), so it never cuts the slope */
function cableGeo() {
  if (CABLE.geo) return CABLE.geo;
  const [ax, az] = CABLE.a, [bx, bz] = CABLE.b, dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L;
  const ga = TER.heightAt(ax, az), gb = TER.heightAt(bx, bz), H0 = 5.2;
  const pts = [[0, ga + H0]];
  for (let s = 3; s < L - 3; s += 2) pts.push([s, TER.heightAt(ax + ux * s, az + uz * s) + 7]);
  pts.push([L, gb + H0]);
  const hull = [];
  for (const p of pts) { while (hull.length >= 2) { const a = hull[hull.length - 2], b = hull[hull.length - 1]; if ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]) >= 0) hull.pop(); else break; } hull.push(p); }
  // drop hull points that are too close together (one tower is enough)
  const sup = [hull[0]]; for (let i = 1; i < hull.length - 1; i++) if (hull[i][0] - sup[sup.length - 1][0] > 22 && L - hull[i][0] > 22) sup.push(hull[i]); sup.push(hull[hull.length - 1]);
  const yAt = (s) => {
    for (let i = 0; i < sup.length - 1; i++) { const a = sup[i], b = sup[i + 1]; if (s <= b[0] || i === sup.length - 2) { const t = clamp((s - a[0]) / (b[0] - a[0]), 0, 1), span = b[0] - a[0]; return lerp(a[1], b[1], t) - span * 0.012 * 4 * t * (1 - t); } }
    return sup[0][1];
  };
  CABLE.geo = { ax, az, ga, gb, L, ux, uz, sup, yAt, yaw: Math.atan2(-uz, ux), anchor: [ax, ga, az] };
  return CABLE.geo;
}
/* centre of the cable at fraction u (0 = 선착장, 1 = 경비대), in the cable element's local frame */
function cableLocal(u) { const G = cableGeo(), s = clamp(u, 0, 1) * G.L; return [G.ux * s, G.yAt(s) - G.ga, G.uz * s]; }
function cableMesh() {
  const G = cableGeo(), mb = new MB(), steel = col('#8e959a'), dark = col('#41474c'), wire = col('#2a2c2e'), conc = col('#9a958b');
  const nx = -G.uz, nz = G.ux, Lp = (s, l, y) => [G.ux * s + nx * l, y, G.uz * s + nz * l];
  // two track ropes
  for (const l of [-0.55, 0.55]) {
    let prev = null;
    for (let s = 0; s <= G.L + 0.01; s += Math.min(4, G.L - s || 4)) { const p = Lp(s, l, G.yAt(s) - G.ga); if (prev) mb.cyl(prev, p, 0.065, 0.065, wire, 4, false); prev = p; if (s >= G.L) break; }
  }
  // stations
  for (const end of [0, 1]) {
    const s = end ? G.L : 0, g = (end ? G.gb : G.ga) - G.ga, top = G.yAt(s) - G.ga, back = end ? 1 : -1;
    const c = Lp(s, 0, 0), yaw = G.yaw;
    mb.at([c[0], g, c[2]], yaw);
    mb.box([back * 1.5, -0.6, 0], [6.5, 1.6, 4.2], conc);
    for (const l of [-1.25, 1.25]) { mb.cyl([-0.9, 0.2, l], [0, top - g + 0.2, l * 0.5], 0.14, 0.11, steel, 6); mb.cyl([0.9, 0.2, l], [0, top - g + 0.2, l * 0.5], 0.14, 0.11, steel, 6); }
    mb.cyl([0, top - g + 0.25, -0.9], [0, top - g + 0.25, 0.9], 0.75, 0.75, dark, 14);
    mb.box([back * 3.2, 1.25, 0], [3.0, 2.5, 3.2], col('#eeeae2')); mb.box([back * 3.2, 2.6, 0], [3.4, 0.25, 3.6], col('#2f5f8a'));
    mb.box([back * 1.7, 1.2, 1.62], [0.9, 1.6, 0.06], col('#3e5568'));
    mb.at();
  }
  // lattice towers on the intermediate supports
  for (let i = 1; i < G.sup.length - 1; i++) {
    const s = G.sup[i][0], gx = G.ux * s, gz = G.uz * s, g = TER.heightAt(G.ax + gx, G.az + gz) - G.ga - 0.3, top = G.yAt(s) - G.ga + 0.25;
    mb.at([gx, 0, gz], G.yaw);
    const h = top - g, legs = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    for (const [a, b] of legs) mb.cyl([a * 1.1, g, b * 1.1], [a * 0.35, top - 0.3, b * 0.45], 0.08, 0.06, steel, 4);
    const nb = Math.max(2, Math.round(h / 2.2));
    for (let k = 1; k < nb; k++) { const t = k / nb, y = g + h * t - 0.3 * t, w = lerp(1.1, 0.35, t), wz = lerp(1.1, 0.45, t); mb.box([0, y, -wz], [w * 2, 0.06, 0.06], steel); mb.box([0, y, wz], [w * 2, 0.06, 0.06], steel); mb.box([-w, y, 0], [0.06, 0.06, wz * 2], steel); mb.box([w, y, 0], [0.06, 0.06, wz * 2], steel); }
    mb.box([0, top - 0.2, 0], [0.5, 0.2, 2.2], dark);
    for (const l of [-0.55, 0.55]) mb.cyl([-0.35, top - 0.05, l], [0.35, top - 0.05, l], 0.16, 0.16, dark, 8);
    mb.at();
  }
  return mb.build();
}
function cablecarMesh() {
  const mb = new MB(), frame = col('#e0742c'), steel = col('#5d6468');
  mb.box([0, -0.1, 0], [1.6, 0.35, 1.5], steel);
  for (const x of [-0.55, 0.55]) for (const z of [-0.55, 0.55]) mb.cyl([x, 0.1, z], [x, 0.1, z * 1.01], 0.16, 0.16, col('#222'), 8);
  for (const x of [-0.5, 0.5]) mb.cyl([x, -0.25, 0], [x * 0.9, -1.55, 0], 0.05, 0.05, steel, 5);
  mb.box([0, -1.6, 0], [2.2, 0.12, 1.5], frame);
  mb.box([0, -3.05, 0], [2.2, 0.16, 1.5], col('#6e6e6a'));
  for (const x of [-1.05, 1.05]) for (const z of [-0.7, 0.7]) mb.box([x, -2.32, z], [0.1, 1.45, 0.1], frame);
  for (const z of [-0.7, 0.7]) mb.box([0, -2.32, z], [2.1, 0.06, 0.06], frame);
  mb.box([-0.45, -2.6, 0], [0.9, 0.75, 0.9], col('#a77a4a')); mb.box([0.55, -2.65, -0.2], [0.7, 0.65, 0.7], col('#c9a46c'));
  mb.cyl([0.55, -2.97, 0.45], [0.55, -2.25, 0.45], 0.28, 0.28, col('#3b78c0'), 10);
  return mb.build();
}

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

/* ---------------- game props ---------------- */
function jellyMesh() {
  const mb = new MB(), rings = [];
  for (let i = 0; i < 9; i++) { const t = i / 8, r = 0.32 * Math.sin(Math.PI * 0.5 * (0.15 + t * 0.85)); rings.push({ x: 0.3 - t * 0.3, ry: r, rz: r }); }
  mb.at([0, 0, 0], 0, Math.PI / 2, 0).lathe(rings, 14, (t) => V3.lerp(col('#f7d7ef'), col('#c77fc8'), t * 0.6), () => 0); mb.at();
  for (let k = 0; k < 4; k++) { const a = k / 4 * TAU; mb.ellipsoid([Math.cos(a) * 0.1, 0.12, Math.sin(a) * 0.1], [0.06, 0.03, 0.06], col('#b45ab8'), 6); }
  for (let k = 0; k < 10; k++) { const a = k / 10 * TAU, r = 0.24; mb.cyl([Math.cos(a) * r, 0.02, Math.sin(a) * r], [Math.cos(a) * r * 1.2, -0.75 - (k % 3) * 0.12, Math.sin(a) * r * 1.2], 0.012, 0.004, col('#f2c6e6'), 4, false, e => e ? 1 : 0.1); }
  return mb.build();
}
function trashMesh() {
  const mb = new MB();
  mb.cyl([-0.3, 0, 0], [0.25, 0, 0], 0.11, 0.11, col('#7fc4e8'), 10); mb.cyl([0.25, 0, 0], [0.38, 0, 0], 0.11, 0.045, col('#7fc4e8'), 10); mb.cyl([0.38, 0, 0], [0.44, 0, 0], 0.05, 0.05, col('#e23b3b'), 8);
  mb.box([0.2, 0.02, 0.45], [0.55, 0.28, 0.4], col('#f2f2ee')); mb.box([-0.35, 0.0, -0.4], [0.5, 0.05, 0.5], col('#ff9a3c'));
  return mb.build();
}
function netMesh() {
  const mb = new MB(), c = col('#3d7a6a');
  for (let i = 0; i <= 8; i++) { mb.cyl([-1.6 + i * 0.4, -1.2, 0], [-1.6 + i * 0.4 + Math.sin(i) * 0.1, 1.2, 0], 0.02, 0.02, c, 3, false); mb.cyl([-1.6, -1.2 + i * 0.3, 0], [1.6, -1.2 + i * 0.3 + Math.cos(i) * 0.08, 0], 0.02, 0.02, c, 3, false); }
  for (const x of [-1.6, 1.6]) for (const y of [-1.2, 1.2]) mb.ellipsoid([x, y, 0], [0.12, 0.12, 0.12], col('#f0b429'), 6);
  return mb.build();
}
