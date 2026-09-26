"use strict";
/* ===== 04 rocks: SDF sculpted sea stacks ===== */
const sdEll = (x, y, z, a, b, c) => { const k0 = Math.hypot(x / a, y / b, z / c), k1 = Math.hypot(x / (a * a), y / (b * b), z / (c * c)); return k1 < 1e-6 ? -Math.min(a, b, c) : k0 * (k0 - 1) / k1; };
const sdBox = (x, y, z, a, b, c, r = 0) => { const qx = Math.abs(x) - a + r, qy = Math.abs(y) - b + r, qz = Math.abs(z) - c + r; return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - r; };
const sdSph = (x, y, z, r) => Math.hypot(x, y, z) - r;
function sdCap(x, y, z, ax, ay, az, bx, by, bz, r) {
  const pax = x - ax, pay = y - ay, paz = z - az, bax = bx - ax, bay = by - ay, baz = bz - az;
  const h = clamp((pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz), 0, 1);
  return Math.hypot(pax - bax * h, pay - bay * h, paz - baz * h) - r;
}
const smin = (a, b, k) => { const h = clamp(0.5 + 0.5 * (b - a) / k, 0, 1); return lerp(b, a, h) - k * h * (1 - h); };
const smax = (a, b, k) => -smin(-a, -b, k);
const cone = (x, y, z, cx, cz, r, h) => Math.max(Math.hypot(x - cx, z - cz) - r * clamp(1 - y / h, 0, 1.25), y - h) * 0.72;

const ROCK_SHAPES = {
  gate: { b: [-26, 32, 12], f: (x, y, z) => { let d = smin(sdBox(x, y - 15, z, 21, 14, 7.5, 5), sdEll(x, y - 3, z, 24, 8, 11), 5); d = smin(d, sdEll(x + 12, y - 26, z, 9, 5, 7), 3); return smax(d, -sdEll(x + 1, y - 5, z, 8.5, 11, 40), 2.2); } },
  candle: { b: [-11, 45, 10], f: (x, y, z) => { const cx = y * 0.035, r = 6.2 - clamp(y, -5, 40) * 0.085; let d = Math.hypot(x - cx, z * 1.1) - r; d = smax(d, y - 38, 3); d = smin(d, sdSph(x - cx, y - 37, z, 2.8), 2); d = smin(d, sdEll(x, y + 1, z, 10, 5, 9), 3.5); d = smin(d, sdEll(x + 6, y - 8, z - 3, 3.5, 10, 3), 2); return d; } },
  threecaves: { b: [-25, 34, 18], f: (x, y, z) => { let d = smin(sdEll(x, y - 11, z, 21, 18, 14), sdBox(x, y - 4, z, 20, 9, 13, 5), 5); for (const xi of [-11, 0, 11]) d = smax(d, -sdEll(x - xi, y - 3, z, 3.1, 4.8, 40), 1.2); return d; } },
  tanggeon: { b: [-23, 45, 21], f: (x, y, z) => { const a = Math.atan2(z, x), col = Math.sin(a * 17) * 0.55; let lo = Math.hypot(x, z * 1.12) - (19.5 - y * 0.14) + col; lo = smax(lo, y - 24, 3.5); let up = Math.hypot(x + 2, z * 1.2) - (11 - Math.max(0, y - 30) * 0.05) + col; up = smax(up, y - 41, 4.5); return smin(lo, up, 3); } },
  elephant: { b: [-28, 34, 16], f: (x, y, z) => { let d = sdEll(x + 7, y - 13, z, 20, 17, 13); d = smin(d, sdCap(x, y, z, 10, 20, 0, 20, 9, 0, 5.2), 3); d = smin(d, sdCap(x, y, z, 20, 9, 0, 22, -4, 0, 4.4), 2); d = smin(d, sdEll(x + 7, y - 26, z, 10, 5, 9), 3); return smax(d, -sdEll(x - 13, y - 2, z, 5, 8.5, 30), 1.5); } },
  face: { b: [-14, 33, 12], f: (x, y, z) => { let d = sdEll(x, y - 13, z, 11, 17, 9); d = smin(d, sdEll(x - 9.5, y - 15, z, 3.2, 4.2, 3.2), 1.6); d = smin(d, sdEll(x - 8.2, y - 20.5, z, 3.8, 2.2, 6), 1.5); d = smin(d, sdEll(x - 8, y - 7.5, z, 4.2, 3.2, 5), 1.8); d = smax(d, -sdSph(x - 9.6, y - 18.2, z - 2.6, 1.4), 0.7); d = smax(d, -sdSph(x - 9.6, y - 18.2, z + 2.6, 1.4), 0.7); d = smax(d, -sdEll(x - 10.5, y - 11.5, z, 2, 0.7, 3), 0.6); return d; } },
  fan: { b: [-24, 20, 9], f: (x, y, z) => { const r = Math.hypot(x, y + 6), a = Math.atan2(y + 6, x); let d = r - 23 - Math.abs(Math.sin(a * 9)) * 0.9; d = smax(d, Math.abs(z) - (4.2 + Math.max(0, -y) * 0.25), 1.5); return d; } },
  chicken: { b: [-22, 30, 13], f: (x, y, z) => { let d = sdEll(x + 2, y - 9, z, 15.5, 10.5, 10); d = smin(d, sdEll(x - 12, y - 19, z, 5, 7.5, 5), 3); d = smin(d, sdEll(x - 12, y - 26.5, z, 3.2, 2.6, 1.6), 1.2); d = smin(d, sdEll(x - 17.5, y - 19, z, 3, 1.4, 1.6), 1); d = smin(d, sdEll(x + 16, y - 17, z, 4, 8.5, 4), 2.5); return d; } },
  whetstone: { b: [-10, 30, 9], f: (x, y, z) => { let d = sdBox(x + y * 0.06, y - 12.5, z, 7, 14, 6, 2.2); d += (Math.sin(y * 2.3) * 0.5 + 0.5) * 0.7; return d; } },
  gaje: { b: [-22, 7, 16], f: (x, y, z) => { let d = sdEll(x, y, z, 10, 4.6, 8); d = smin(d, sdEll(x + 11, y, z - 4, 7, 3.6, 6), 2.5); d = smin(d, sdEll(x - 12, y, z + 3, 8, 4, 6.5), 2.5); d = smin(d, sdEll(x - 3, y, z - 10, 6, 3.2, 5), 2.5); return smin(d, sdEll(x + 5, y, z + 9, 5, 2.6, 4), 2); } },
  bochal: { b: [-22, 19, 14], f: (x, y, z) => { let d = cone(x, y, z, 0, 0, 7, 16); d = smin(d, cone(x, y, z, -9, 4, 6, 12), 2.2); d = smin(d, cone(x, y, z, 10, -3, 6.5, 13), 2.2); d = smin(d, cone(x, y, z, 4, 9, 5, 9), 2); d = smin(d, cone(x, y, z, -14, -6, 5, 7), 2); return smin(d, sdEll(x, y + 1, z, 18, 4, 11), 3); } },
  peninsula: { b: [-26, 42, 20], f: (x, y, z) => { let d = sdEll(x, y - 14, z, 14, 21, 11); d = smin(d, sdEll(x + 9, y - 10, z - 8, 12, 14, 9), 4); d = smin(d, sdEll(x - 11, y - 6, z + 10, 9, 9, 8), 4); d = smin(d, sdEll(x + 2, y - 31, z + 1, 6, 10, 6), 3); return d; } },
  generic: { b: [-13, 17, 12], f: (x, y, z) => smin(sdEll(x, y - 5, z, 10, 10, 8), sdEll(x + 4, y - 11, z - 2, 5, 6, 5), 3) }
};

function rockSDF(shape, seed) {
  const S = ROCK_SHAPES[shape], so = seed * 17.31;
  return (x, y, z) => {
    const yy = Math.max(y, -1.5);
    let d = S.f(x, yy, z) - Math.max(0, -y - 1.5) * 0.42;
    const n = fbm3(x * 0.13 + so, y * 0.17, z * 0.13 - so);
    d += (n - 0.5) * 3.0;
    d += (Math.abs(vnoise3(x * 0.42 + so, y * 0.5, z * 0.42) * 2 - 1) - 0.45) * 0.7;
    d += Math.sin(y * 1.6 + n * 5) * 0.16;
    return Math.max(d, -(y + 19));
  };
}

function surfaceNets(sdf, bmin, bmax, cell) {
  const nx = Math.ceil((bmax[0] - bmin[0]) / cell) + 1, ny = Math.ceil((bmax[1] - bmin[1]) / cell) + 1, nz = Math.ceil((bmax[2] - bmin[2]) / cell) + 1;
  const V = new Float32Array(nx * ny * nz), id = (x, y, z) => (z * ny + y) * nx + x;
  for (let z = 0; z < nz; z++) for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
    let v = sdf(bmin[0] + x * cell, bmin[1] + y * cell, bmin[2] + z * cell);
    if (x === 0 || y === 0 || z === 0 || x === nx - 1 || y === ny - 1 || z === nz - 1) v = Math.max(v, 0.01);
    V[id(x, y, z)] = v;
  }
  const cx = nx - 1, cy = ny - 1, cz = nz - 1, CV = new Int32Array(cx * cy * cz).fill(-1), cid = (x, y, z) => (z * cy + y) * cx + x;
  const pos = [];
  const E = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const cv = new Float32Array(8), co = [];
  for (let k = 0; k < 8; k++) co.push([k & 1, (k >> 1) & 1, (k >> 2) & 1]);
  for (let z = 0; z < cz; z++) for (let y = 0; y < cy; y++) for (let x = 0; x < cx; x++) {
    let mask = 0;
    for (let k = 0; k < 8; k++) { cv[k] = V[id(x + co[k][0], y + co[k][1], z + co[k][2])]; if (cv[k] < 0) mask |= 1 << k; }
    if (mask === 0 || mask === 255) continue;
    let sx = 0, sy = 0, sz = 0, c = 0;
    for (const [a, b] of E) {
      const va = cv[a], vb = cv[b]; if ((va < 0) === (vb < 0)) continue;
      const t = va / (va - vb); sx += co[a][0] + (co[b][0] - co[a][0]) * t; sy += co[a][1] + (co[b][1] - co[a][1]) * t; sz += co[a][2] + (co[b][2] - co[a][2]) * t; c++;
    }
    CV[cid(x, y, z)] = pos.length / 3;
    pos.push(bmin[0] + (x + sx / c) * cell, bmin[1] + (y + sy / c) * cell, bmin[2] + (z + sz / c) * cell);
  }
  const idx = [];
  for (let z = 1; z < nz - 1; z++) for (let y = 1; y < ny - 1; y++) for (let x = 1; x < nx - 1; x++) {
    const v0 = V[id(x, y, z)] < 0;
    if (v0 !== (V[id(x + 1, y, z)] < 0) && x < cx) quad(CV[cid(x, y - 1, z - 1)], CV[cid(x, y, z - 1)], CV[cid(x, y, z)], CV[cid(x, y - 1, z)], v0);
    if (v0 !== (V[id(x, y + 1, z)] < 0) && y < cy) quad(CV[cid(x - 1, y, z - 1)], CV[cid(x - 1, y, z)], CV[cid(x, y, z)], CV[cid(x, y, z - 1)], v0);
    if (v0 !== (V[id(x, y, z + 1)] < 0) && z < cz) quad(CV[cid(x - 1, y - 1, z)], CV[cid(x, y - 1, z)], CV[cid(x, y, z)], CV[cid(x - 1, y, z)], v0);
  }
  function quad(a, b, c, d, flip) {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    if (flip) idx.push(a, b, c, a, c, d); else idx.push(a, c, b, a, d, c);
  }
  return { pos: new Float32Array(pos), idx };
}

function buildRockMesh(shape, seed, quality) {
  const S = ROCK_SHAPES[shape], sdf = rockSDF(shape, seed), b = S.b;
  const bmin = [b[0] - 3, -20, -b[2] - 3], bmax = [-b[0] + 3, b[1] + 3, b[2] + 3];
  const ext = Math.max(bmax[0] - bmin[0], bmax[1] - bmin[1], bmax[2] - bmin[2]);
  const cell = clamp(ext / (quality === 'low' ? 30 : quality === 'mid' ? 40 : 52), 0.6, 2.2);
  const { pos, idx } = surfaceNets(sdf, bmin, bmax, cell);
  const n = pos.length / 3, nrm = new Float32Array(n * 3), col = new Uint8Array(n * 4), e = cell * 0.5;
  for (let i = 0; i < n; i++) {
    const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
    let g = V3.norm([sdf(x + e, y, z) - sdf(x - e, y, z), sdf(x, y + e, z) - sdf(x, y - e, z), sdf(x, y, z + e) - sdf(x, y, z - e)]);
    nrm[i * 3] = g[0]; nrm[i * 3 + 1] = g[1]; nrm[i * 3 + 2] = g[2];
    let occ = 0;
    for (const s of [1.2, 2.6, 5, 9]) occ += Math.max(0, s - sdf(x + g[0] * s, y + g[1] * s, z + g[2] * s)) / s * 0.3;
    const ao = clamp(1 - occ, 0.18, 1) * (y < 0 ? 0.85 : 1);
    col[i * 4] = col[i * 4 + 1] = col[i * 4 + 2] = 255; col[i * 4 + 3] = ao * 255;
  }
  // footprint at the waterline for foam/wave damping
  const fp = [];
  for (let z = bmin[2]; z <= bmax[2]; z += 1.25) for (let x = bmin[0]; x <= bmax[0]; x += 1.25) {
    const d = sdf(x, 0.3, z); if (d < 2.2) fp.push(x, z, d < 0 ? 2.5 : lerp(1.2, -1.2, d / 2.2));
  }
  return { pos, nrm, col, idx: new Uint32Array(idx), footprint: fp, radius: Math.hypot(b[0], b[2]) + 2, top: b[1] };
}
