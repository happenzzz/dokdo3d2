"use strict";
/* ===== 03 terrain ===== */
const TER = { X0: -450, Z0: -370, C: 2.5, W: 357, D: 277, stride: 1 };
TER.SIZE_X = (TER.W - 1) * TER.C; TER.SIZE_Z = (TER.D - 1) * TER.C;

function edt1(f, n, d, v, z) {
  let k = 0; v[0] = 0; z[0] = -1e30; z[1] = 1e30;
  for (let q = 1; q < n; q++) {
    let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) { k--; s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
    k++; v[k] = q; z[k] = s; z[k + 1] = 1e30;
  }
  k = 0;
  for (let q = 0; q < n; q++) { while (z[k + 1] < q) k++; d[q] = (q - v[k]) * (q - v[k]) + f[v[k]]; }
}
/* euclidean distance (in cells) from every cell to nearest cell where feat(i)=true */
function edt2(W, D, feat) {
  const INF = 1e20, g = new Float64Array(W * D), n = Math.max(W, D);
  const f = new Float64Array(n), d = new Float64Array(n), v = new Int32Array(n), z = new Float64Array(n + 1);
  for (let i = 0; i < W * D; i++) g[i] = feat(i) ? 0 : INF;
  for (let x = 0; x < W; x++) { for (let y = 0; y < D; y++) f[y] = g[y * W + x]; edt1(f, D, d, v, z); for (let y = 0; y < D; y++) g[y * W + x] = d[y]; }
  const out = new Float32Array(W * D);
  for (let y = 0; y < D; y++) { for (let x = 0; x < W; x++) f[x] = g[y * W + x]; edt1(f, W, d, v, z); for (let x = 0; x < W; x++) out[y * W + x] = Math.sqrt(d[x]); }
  return out;
}
function boxBlur(src, W, D, r) {
  const tmp = new Float32Array(W * D), out = new Float32Array(W * D);
  for (let y = 0; y < D; y++) { let s = 0, c = 0; const row = y * W;
    for (let x = -r; x < W; x++) {
      if (x + r < W) { s += src[row + x + r]; c++; }
      if (x - r - 1 >= 0) { s -= src[row + x - r - 1]; c--; }
      if (x >= 0) tmp[row + x] = s / c;
    } }
  for (let x = 0; x < W; x++) { let s = 0, c = 0;
    for (let y = -r; y < D; y++) {
      if (y + r < D) { s += tmp[(y + r) * W + x]; c++; }
      if (y - r - 1 >= 0) { s -= tmp[(y - r - 1) * W + x]; c--; }
      if (y >= 0) out[y * W + x] = s / c;
    } }
  return out;
}

/* 독도 선착장(접안시설)은 동도 서쪽 바닷가, 서도를 마주 보는 곳에 있어요.
   선착장에 서면 바다 건너 서도 동쪽 바닷가의 주민숙소가 정면으로 보여요. */
const PADS = [
  { name: 'quay', x: 51, z: 96, r: 8, f: 5, h: 3.3, force: true },
  { name: 'quay2', x: 51, z: 108, r: 8, f: 5, h: 3.3, force: true },
  { name: 'quay3', x: 51, z: 120, r: 8, f: 5, h: 3.3, force: true },
  { name: 'apron', x: 63, z: 108, r: 9, f: 8, h: 3.7 },
  { name: 'cableLow', x: 69, z: 121, r: 4, f: 5, h: 5.5 },
  { name: 'house', x: -127, z: 47, r: 9, f: 4, h: 3.6, force: true },
  { name: 'seoquay', x: -119, z: 47, r: 6, f: 3, h: 2.2, force: true },
  { name: 'seostair', x: -123.5, z: 56.5, r: 3.6, f: 3, h: 3.4, force: true },   // 998계단이 시작되는 숙소 옆 바위턱
  { name: 'spring', x: -306, z: -163, r: 6, f: 4, h: 2.4, force: true },
  { name: 'guard', x: 222, z: 6, r: 11, f: 10 },
  { name: 'guardYard', x: 214, z: 18, r: 8, f: 7, same: 'guard' },   // 경비대 앞마당 (계단길이 닿는 곳)
  { name: 'cableTop', x: 196, z: 36, r: 4, f: 5 },
  { name: 'light', x: 243, z: 26, r: 6, f: 6 },
  { name: 'heli', x: 166, z: 4, r: 12, f: 9 }
];

/* 계단길: 동도 선착장 → 독도경비대 숙소(경비대 등반로), 서도 주민숙소 → 물골(998계단).
   지형을 길 모양대로 살짝 깎아 계단을 놓아요. pts는 위에서 본 x,z 좌표예요. */
const ROUTES = {
  guard: { w: 1.4, pts: [[64, 110], [66, 101], [72, 93], [80, 98], [87, 102], [95, 111], [103, 113], [110, 107], [118, 100], [131, 92], [140, 83], [153, 75], [166, 70], [176, 68], [186, 61], [193, 51], [200, 42], [207, 31], [213, 22]] },
  seo: { w: 1.1, pts: [[-123, 57], [-128, 59], [-132, 66], [-140, 69], [-155, 77], [-166, 93], [-176, 93], [-186, 83], [-195, 73], [-205, 64], [-212, 52], [-217, 42], [-222, 24], [-231, 10], [-248, 8], [-268, 5], [-282, -12], [-295, -31], [-310, -42], [-320, -55], [-328, -76], [-331, -92], [-328, -110], [-328, -132], [-332, -148], [-326, -157], [-314, -163], [-308, -163]] }
};
/* 물자 운반 케이블(삭도): 선착장 옆 아래 정류장 → 경비대 숙소 앞 위 정류장 */
const CABLE = { a: [69, 121], b: [196, 36] };

/* densify a route to ~1m samples, smooth its height profile and cut it into the slope */
function routeProfile(rt, H, W, C, X0, Z0) {
  const hs = (x, z) => { const fx = (x - X0) / C, fz = (z - Z0) / C, ix = fx | 0, iz = fz | 0, tx = fx - ix, tz = fz - iz, b = iz * W + ix; return (H[b] * (1 - tx) + H[b + 1] * tx) * (1 - tz) + (H[b + W] * (1 - tx) + H[b + W + 1] * tx) * tz; };
  const S = [];
  for (let i = 0; i < rt.pts.length - 1; i++) {
    const [ax, az] = rt.pts[i], [bx, bz] = rt.pts[i + 1], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az)));
    for (let k = 0; k < n; k++) { const t = k / n; S.push({ x: lerp(ax, bx, t), z: lerp(az, bz, t) }); }
  }
  const last = rt.pts[rt.pts.length - 1]; S.push({ x: last[0], z: last[1] });
  let y = S.map(p => Math.max(hs(p.x, p.z), 2.6));
  for (let pass = 0; pass < 4; pass++) y = y.map((_, i) => { let s = 0, c = 0; for (let k = -4; k <= 4; k++) { const j = clamp(i + k, 0, y.length - 1); s += y[j]; c++; } return s / c; });
  let L = 0; S.forEach((p, i) => { if (i) L += Math.hypot(p.x - S[i - 1].x, p.z - S[i - 1].z); p.s = L; p.y = y[i]; });
  rt.prof = S; rt.len = L;
}
function routeCarve(rt, H, L, W, D, C, X0, Z0, RD) {
  const S = rt.prof, pad = rt.w + 3.5;
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const p of S) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z); }
  const i0 = Math.max(0, Math.floor((x0 - pad - X0) / C)), i1 = Math.min(W - 1, Math.ceil((x1 + pad - X0) / C));
  const j0 = Math.max(0, Math.floor((z0 - pad - Z0) / C)), j1 = Math.min(D - 1, Math.ceil((z1 + pad - Z0) / C));
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const k = j * W + i, x = X0 + i * C, z = Z0 + j * C; let bd = 1e9, by = 0;
    for (let s = 0; s < S.length - 1; s++) { // nearest point on the polyline
      const a = S[s], b = S[s + 1], dx = b.x - a.x, dz = b.z - a.z, l2 = dx * dx + dz * dz || 1e-6;
      const t = clamp(((x - a.x) * dx + (z - a.z) * dz) / l2, 0, 1), d = Math.hypot(x - a.x - dx * t, z - a.z - dz * t);
      if (d < bd) { bd = d; by = lerp(a.y, b.y, t); }
    }
    RD[k] = Math.min(RD[k], bd);
    if (!L[k] || bd > pad) continue;
    H[k] = lerp(H[k], by - 0.2, 1 - smooth(rt.w, pad, bd));
  }
}

function terrainBuild(quality) {
  const { W, D, C, X0, Z0 } = TER, N = W * D;
  const H = new Float32Array(N), L = new Uint8Array(N);
  // decode original heightmap
  const bin = atob(DATA_H.b64), i0 = Math.round((DATA_H.x0 - X0) / C), j0 = Math.round((DATA_H.z0 - Z0) / C);
  for (let j = 0; j < DATA_H.d; j++) for (let i = 0; i < DATA_H.w; i++) {
    const k = (j * DATA_H.w + i) * 2, v = bin.charCodeAt(k) | (bin.charCodeAt(k + 1) << 8);
    if (v > 0) { const idx = (j + j0) * W + i + i0; H[idx] = (v - 1) / 65534 * 172 - 2; L[idx] = 1; }
  }
  const wx = i => X0 + (i % W) * C, wz = i => Z0 + Math.floor(i / W) * C;
  // jagged shoreline + small sea stacks (부속 바위섬)
  let dIn = edt2(W, D, i => !L[i]), dOut = edt2(W, D, i => L[i]);
  for (let i = 0; i < N; i++) {
    const x = wx(i), z = wz(i);
    if (L[i] && dIn[i] * C < 5.5) {
      const n = noise2(x * 0.09, z * 0.09, 'g') * 0.7 + noise2(x * 0.3, z * 0.3, 'b') * 0.3;
      if (n < 0.34 - dIn[i] * 0.02) L[i] = 0;
    } else if (!L[i] && dOut[i] * C < 16 && dOut[i] * C > 2) {
      const n = noise2(x * 0.16 + 31, z * 0.16, 'a') * 0.6 + noise2(x * 0.05, z * 0.05, 'r') * 0.4;
      if (n > 0.73) { L[i] = 1; H[i] = 1.5 + (n - 0.73) * 60 * (1 - dOut[i] * C / 20) + noise2(x * 0.5, z * 0.5, 'b') * 3; }
    }
  }
  dIn = edt2(W, D, i => !L[i]); dOut = edt2(W, D, i => L[i]);
  // land enhancement
  for (let i = 0; i < N; i++) {
    if (!L[i]) continue;
    const x = wx(i), z = wz(i), di = dIn[i] * C;
    let h = H[i];
    h *= 1 + 0.22 * smooth(0, 7, di) * (1 - smooth(15, 60, di));
    const amp = 1.6 + h * 0.028;
    h += (noise2(x * 0.06, z * 0.06, 'r') - 0.5) * amp * 2.2 + (noise2(x * 0.22, z * 0.22, 'b') - 0.5) * amp;
    h += (noise2(x * 0.11, z * 0.11, 'a') - 0.4) * 2.2 * smooth(3, 20, h);
    h = Math.max(h, 0.6 + noise2(x * 0.4, z * 0.4, 'b') * 1.2);
    H[i] = h;
  }
  // 천장굴 (Cheonjang cave pit on 동도)
  for (let i = 0; i < N; i++) {
    const x = wx(i), z = wz(i), d = Math.hypot(x - 102, (z - 68) * 1.15);
    if (d < 34) {
      const r = 21 + (noise2(x * 0.2, z * 0.2, 'g') - 0.5) * 6;
      const t = smooth(r * 0.45, r * 1.02, d);
      const bottom = -5 + noise2(x * 0.3, z * 0.3, 'r') * 2;
      H[i] = lerp(bottom, H[i] + 3 * (1 - smooth(r, r + 10, d)) * smooth(r * 0.9, r, d), t); if (H[i] < 0) L[i] = 1;
    }
  }
  // flatten pads for facilities
  for (const p of PADS) {
    if (p.same) p.h = PADS.find(q => q.name === p.same).h;
    if (p.h === undefined) { let s = 0, c = 0; for (let i = 0; i < N; i++) { if (L[i] && Math.hypot(wx(i) - p.x, wz(i) - p.z) < p.r) { s += H[i]; c++; } } p.h = c ? s / c : 5; }
    for (let i = 0; i < N; i++) {
      const d = Math.hypot(wx(i) - p.x, wz(i) - p.z); if (d > p.r + p.f) continue;
      const t = 1 - smooth(p.r, p.r + p.f, d);
      if (!L[i]) { if (!p.force || d > p.r) continue; L[i] = 1; H[i] = p.h; continue; }
      H[i] = lerp(H[i], p.h, t);
    }
  }
  // stair routes cut into the slopes
  TER.RD = new Float32Array(N).fill(99);
  for (const rt of Object.values(ROUTES)) { routeProfile(rt, H, W, C, X0, Z0); routeCarve(rt, H, L, W, D, C, X0, Z0, TER.RD); }
  dOut = edt2(W, D, i => L[i]);
  // seabed
  for (let i = 0; i < N; i++) {
    if (L[i]) continue;
    const x = wx(i), z = wz(i), d = dOut[i] * C;
    let h = -(2.2 + 11 * (1 - Math.exp(-d / 9)) + 0.04 * d);
    const reef = (noise2(x * 0.07, z * 0.07, 'r') - 0.5) * 5 + (noise2(x * 0.2, z * 0.2, 'a') - 0.35) * 3.2 + (noise2(x * 0.5, z * 0.5, 'b') - 0.5) * 1.1;
    h += reef * smooth(1, 14, d) * (1 - smooth(120, 200, d) * 0.5);
    const gx = i % W, gy = Math.floor(i / W), e = Math.min(gx, gy, W - 1 - gx, D - 1 - gy) * C;
    h = lerp(-45, h, smooth(0, 30, e));
    H[i] = clamp(Math.min(h, -0.6), -45, -0.6);
  }
  TER.H = H; TER.L = L; TER.ST = new Float32Array(N).fill(-99);
  TER.H0 = H.slice();
  terrainLighting();
  terrainGL(quality);
}

function terrainLighting() {
  const { W, D, C, H } = TER, N = W * D;
  const S = TER.S || (TER.S = new Float32Array(N)), A = TER.A || (TER.A = new Float32Array(N));
  const hl = Math.hypot(SUN[0], SUN[2]), sx = SUN[0] / hl, sz = SUN[2] / hl, slope = SUN[1] / hl;
  let maxH = -1e9; for (let i = 0; i < N; i++) if (H[i] > maxH) maxH = H[i];
  for (let j = 0; j < D; j++) for (let i = 0; i < W; i++) {
    const k = j * W + i, h0 = H[k] + 0.25; let vis = 1;
    for (let s = 1; s < 140; s++) {
      const dist = s * 1.25 * C, rh = h0 + dist * slope; if (rh > maxH + 1) break;
      const fx = i + sx * s * 1.25, fz = j + sz * s * 1.25;
      if (fx < 0 || fz < 0 || fx >= W - 1 || fz >= D - 1) break;
      const ix = fx | 0, iz = fz | 0, tx = fx - ix, tz = fz - iz, b = iz * W + ix;
      const th = (H[b] * (1 - tx) + H[b + 1] * tx) * (1 - tz) + (H[b + W] * (1 - tx) + H[b + W + 1] * tx) * tz;
      const v = clamp((rh - th) / (0.6 + dist * 0.035) * 0.5 + 0.5, 0, 1);
      if (v < vis) { vis = v; if (vis <= 0) break; }
    }
    S[k] = vis * vis * (3 - 2 * vis);
  }
  const b1 = boxBlur(H, W, D, 4), b2 = boxBlur(H, W, D, 14);
  for (let i = 0; i < N; i++) A[i] = clamp(1 - Math.max(0, b1[i] - H[i]) * 0.045 - Math.max(0, b2[i] - H[i]) * 0.012, 0.22, 1);
  terrainMaterials(b1);
}
/* per-vertex material masks: vegetation coverage + rock tone (read by the shader, no per-pixel cost) */
function terrainMaterials(blur) {
  const { W, D, C, H, X0, Z0 } = TER, N = W * D;
  const V = TER.V || (TER.V = new Float32Array(N)), T = TER.T || (TER.T = new Float32Array(N));
  const dIn = edt2(W, D, i => H[i] <= 0.2);
  const b2 = boxBlur(H, W, D, 2);
  for (let j = 0; j < D; j++) for (let i = 0; i < W; i++) {
    const k = j * W + i, h = H[k], x = X0 + i * C, z = Z0 + j * C;
    const tn = noise2(x * 0.03, z * 0.03, 'g') - 0.5, tf = noise2(x * 0.11, z * 0.11, 'b') - 0.5;
    T[k] = clamp(0.46 + tn * 0.7 + tf * 0.3 + smooth(4, 60, h) * 0.16 - smooth(9, 0, h) * 0.22, 0, 1);
    if (h < 2) { V[k] = 0; continue; }
    const ny = terrainNormal(i, j)[1];
    const curv = clamp(((blur[k] - h) * 0.5 + (b2[k] - h) * 0.6) * 0.35, -1, 1);
    let v = smooth(0.26, 0.62, ny) * (0.85 + curv * 0.5) + Math.max(0, curv) * 0.3 * smooth(0.15, 0.35, ny);
    v *= smooth(3, 11, h) * smooth(2, 10, dIn[k] * C);
    v *= 0.72 + 0.6 * noise2(x * 0.018 + 7, z * 0.018, 'r');
    v *= x < -20 ? 1.18 : 0.95;
    for (const p of PADS) { const dd = Math.hypot(x - p.x, z - p.z); if (dd < p.r + 4) v *= smooth(p.r * 0.6, p.r + 4, dd); }
    if (TER.RD) v *= 0.35 + 0.65 * smooth(1.2, 4.5, TER.RD[k]);
    V[k] = clamp(v, 0, 1);
  }
}

function terrainNormal(i, j) {
  const { W, D, C, H } = TER;
  const l = H[j * W + Math.max(i - 1, 0)], r = H[j * W + Math.min(i + 1, W - 1)];
  const u = H[Math.max(j - 1, 0) * W + i], d = H[Math.min(j + 1, D - 1) * W + i];
  const nx = (l - r), nz = (u - d), ny = 2 * C, il = 1 / Math.hypot(nx, ny, nz);
  return [nx * il, ny * il, nz * il];
}

function terrainFillVerts(j0, j1) {
  const { W, C, X0, Z0, H, S, A } = TER, f = TER.vf, b = TER.vb;
  for (let j = j0; j <= j1; j++) for (let i = 0; i < W; i++) {
    const k = j * W + i, o = k * 5;
    f[o] = X0 + i * C; f[o + 1] = H[k]; f[o + 2] = Z0 + j * C;
    const n = terrainNormal(i, j), bo = o * 4 + 12;
    b[bo] = Math.round(n[0] * 127); b[bo + 1] = Math.round(n[1] * 127); b[bo + 2] = Math.round(n[2] * 127); b[bo + 3] = 0;
    b[bo + 4] = S[k] * 255; b[bo + 5] = A[k] * 255; b[bo + 6] = TER.V[k] * 255; b[bo + 7] = TER.T[k] * 255;
  }
}
function terrainFillTex(j0, j1) {
  const { W, H, S, A } = TER, t = TER.tp;
  for (let j = j0; j <= j1; j++) for (let i = 0; i < W; i++) {
    const k = j * W + i, o = k * 4;
    t[o] = clamp((Math.max(H[k], TER.ST[k]) + 45) / 90 * 255, 0, 255); t[o + 1] = S[k] * 255; t[o + 2] = A[k] * 255; t[o + 3] = 255;
  }
}

function terrainGL(quality) {
  const { W, D } = TER, N = W * D;
  TER.ab = new ArrayBuffer(N * 20); TER.vf = new Float32Array(TER.ab); TER.vb = new Uint8Array(TER.ab); // int8 normals written via wrap-around
  TER.tp = new Uint8Array(N * 4);
  terrainFillVerts(0, D - 1);
  terrainFillTex(0, D - 1);
  const st = TER.stride = quality === 'low' ? 2 : 1;
  const idx = [];
  for (let j = 0; j + st < D; j += st) for (let i = 0; i + st < W; i += st) {
    const a = j * W + i, b = a + st, c = a + st * W, d = c + st;
    const H = TER.H; if (H[a] < -44.8 && H[b] < -44.8 && H[c] < -44.8 && H[d] < -44.8) continue;
    idx.push(a, c, b, b, c, d);
  }
  TER.count = idx.length;
  TER.vao = gl.createVertexArray(); gl.bindVertexArray(TER.vao);
  TER.vbo = GLX.buffer(TER.ab, gl.ARRAY_BUFFER, gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 20, 0);
  gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.BYTE, true, 20, 12);
  gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 4, gl.UNSIGNED_BYTE, true, 20, 16);
  GLX.buffer(new Uint32Array(idx), gl.ELEMENT_ARRAY_BUFFER);
  gl.bindVertexArray(null);
  // deep floor plane
  const P = 8000, dp = new ArrayBuffer(4 * 20), df = new Float32Array(dp), db = new Uint8Array(dp);
  [[-P, -P], [P, -P], [-P, P], [P, P]].forEach(([x, z], k) => { df[k * 5] = x; df[k * 5 + 1] = -45.3; df[k * 5 + 2] = z; db[k * 20 + 12] = 0; db[k * 20 + 13] = 127; db[k * 20 + 14] = 0; db[k * 20 + 16] = 255; db[k * 20 + 17] = 200; db[k * 20 + 19] = 255; });
  TER.deepVao = gl.createVertexArray(); gl.bindVertexArray(TER.deepVao);
  GLX.buffer(dp);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 20, 0);
  gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.BYTE, true, 20, 12);
  gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 4, gl.UNSIGNED_BYTE, true, 20, 16);
  GLX.buffer(new Uint16Array([0, 2, 1, 1, 2, 3]), gl.ELEMENT_ARRAY_BUFFER);
  gl.bindVertexArray(null);
  // height texture
  TER.tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, TER.tex);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, W, D, 0, gl.RGBA, gl.UNSIGNED_BYTE, TER.tp);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  TER.hinfo = [TER.X0 - TER.C / 2, TER.Z0 - TER.C / 2, W * TER.C, D * TER.C];
}
function terrainUpload(j0, j1) {
  const W = TER.W; j0 = Math.max(0, j0); j1 = Math.min(TER.D - 1, j1);
  gl.bindBuffer(gl.ARRAY_BUFFER, TER.vbo);
  gl.bufferSubData(gl.ARRAY_BUFFER, j0 * W * 20, new Uint8Array(TER.ab, j0 * W * 20, (j1 - j0 + 1) * W * 20));
  gl.bindTexture(gl.TEXTURE_2D, TER.tex); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, j0, W, j1 - j0 + 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(TER.tp.buffer, j0 * W * 4, (j1 - j0 + 1) * W * 4));
}

TER.heightAt = function (x, z) {
  const { W, D, C, X0, Z0, H } = TER;
  const fx = (x - X0) / C, fz = (z - Z0) / C;
  if (fx < 0 || fz < 0 || fx >= W - 1 || fz >= D - 1) return -45.3;
  const ix = fx | 0, iz = fz | 0, tx = fx - ix, tz = fz - iz, b = iz * W + ix;
  return (H[b] * (1 - tx) + H[b + 1] * tx) * (1 - tz) + (H[b + W] * (1 - tx) + H[b + W + 1] * tx) * tz;
};
/* true when (x,z) is on one of the stair routes: there you can walk up even where the slope is steep */
TER.onStairs = function (x, z) {
  for (const rt of Object.values(ROUTES)) {
    const S = rt.prof; if (!S) continue; const lim = rt.w * 0.5 + 0.6;
    for (let i = 0; i < S.length - 1; i += 1) {
      const a = S[i], b = S[i + 1]; if (Math.abs(a.x - x) > 4 || Math.abs(a.z - z) > 4) continue;
      const dx = b.x - a.x, dz = b.z - a.z, l2 = dx * dx + dz * dz || 1e-6, t = clamp(((x - a.x) * dx + (z - a.z) * dz) / l2, 0, 1);
      if (Math.hypot(x - a.x - dx * t, z - a.z - dz * t) < lim) return true;
    }
  }
  return false;
};
TER.normalAt = function (x, z) {
  const e = 1.5, l = TER.heightAt(x - e, z), r = TER.heightAt(x + e, z), u = TER.heightAt(x, z - e), d = TER.heightAt(x, z + e);
  return V3.norm([l - r, 2 * e, u - d]);
};
TER.raycast = function (o, d, maxT = 3000) {
  let t = 0, prev = 0;
  for (let k = 0; k < 900 && t < maxT; k++) {
    const p = [o[0] + d[0] * t, o[1] + d[1] * t, o[2] + d[2] * t], h = TER.heightAt(p[0], p[2]);
    const gap = p[1] - h;
    if (gap < 0) {
      let a = prev, b = t;
      for (let s = 0; s < 18; s++) { const m = (a + b) / 2, q = [o[0] + d[0] * m, o[1] + d[1] * m, o[2] + d[2] * m]; if (q[1] - TER.heightAt(q[0], q[2]) < 0) b = m; else a = m; }
      return { t: b, p: [o[0] + d[0] * b, o[1] + d[1] * b, o[2] + d[2] * b] };
    }
    prev = t; t += clamp(gap * 0.45, 0.35, 9);
  }
  return null;
};

/* sculpt brush: mode up/down/flat/smooth */
TER.sculpt = function (x, z, r, mode, amt, flatH) {
  const { W, D, C, X0, Z0, H } = TER;
  const ci = (x - X0) / C, cj = (z - Z0) / C, rc = r / C;
  const a0 = Math.max(1, Math.floor(ci - rc)), a1 = Math.min(W - 2, Math.ceil(ci + rc));
  const b0 = Math.max(1, Math.floor(cj - rc)), b1 = Math.min(D - 2, Math.ceil(cj + rc));
  if (a0 > a1 || b0 > b1) return;
  const src = mode === 'smooth' ? H.slice() : null;
  for (let j = b0; j <= b1; j++) for (let i = a0; i <= a1; i++) {
    const d = Math.hypot(i - ci, j - cj) / rc; if (d >= 1) continue;
    const w = (1 - d * d) * (1 - d * d), k = j * W + i;
    if (mode === 'up') H[k] += amt * w;
    else if (mode === 'down') H[k] -= amt * w;
    else if (mode === 'flat') H[k] = lerp(H[k], flatH, clamp(amt * 0.08 * w, 0, 1));
    else if (mode === 'smooth') { const av = (src[k - 1] + src[k + 1] + src[k - W] + src[k + W] + src[k] * 2) / 6; H[k] = lerp(H[k], av, clamp(amt * 0.15 * w, 0, 1)); }
    H[k] = clamp(H[k], -45, 230);
  }
  terrainFillVerts(b0 - 1, b1 + 1); terrainFillTex(b0 - 1, b1 + 1); terrainUpload(b0 - 1, b1 + 1);
  TER.dirty = true;
};
TER.relight = function () {
  terrainLighting(); terrainFillVerts(0, TER.D - 1); terrainFillTex(0, TER.D - 1); terrainUpload(0, TER.D - 1);
};
TER.snapshot = () => TER.H.slice();
TER.restore = function (arr) { TER.H.set(arr); TER.relight(); };
TER.serialize = function () {
  const { H, H0 } = TER; let changed = false; const q = new Int16Array(H.length);
  for (let i = 0; i < H.length; i++) { const dv = Math.round((H[i] - H0[i]) * 20); q[i] = clamp(dv, -32767, 32767); if (dv) changed = true; }
  if (!changed) return null;
  let s = ''; const u8 = new Uint8Array(q.buffer); for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192));
  return btoa(s);
};
TER.deserialize = function (b64) {
  const s = atob(b64), u8 = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u8[i] = s.charCodeAt(i);
  const q = new Int16Array(u8.buffer); if (q.length !== TER.H.length) return;
  for (let i = 0; i < q.length; i++) TER.H[i] = TER.H0[i] + q[i] / 20;
  TER.relight();
};
TER.reset = function () { TER.H.set(TER.H0); TER.relight(); };
