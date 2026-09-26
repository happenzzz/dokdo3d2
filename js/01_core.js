"use strict";
/* ===== 01 core: math, gl helpers, procedural textures ===== */
const TAU = Math.PI * 2;
const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const V3 = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  len: a => Math.hypot(a[0], a[1], a[2]),
  norm: a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
  lerp: (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)],
  dist: (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
};
const angLerp = (a, b, t) => { let d = ((b - a) % TAU + TAU * 1.5) % TAU - TAU / 2; return a + d * t; };
function mat4Persp(out, fovy, aspect, near, far) {
  const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
  out.fill(0); out[0] = f / aspect; out[5] = f; out[10] = (far + near) * nf; out[11] = -1; out[14] = 2 * far * near * nf; return out;
}
function mat4View(out, eye, f, r, u) {
  out[0] = r[0]; out[1] = u[0]; out[2] = -f[0]; out[3] = 0;
  out[4] = r[1]; out[5] = u[1]; out[6] = -f[1]; out[7] = 0;
  out[8] = r[2]; out[9] = u[2]; out[10] = -f[2]; out[11] = 0;
  out[12] = -V3.dot(r, eye); out[13] = -V3.dot(u, eye); out[14] = V3.dot(f, eye); out[15] = 1; return out;
}
function mat4Mul(out, a, b) {
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
    out[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
  }
  return out;
}
function makeRand(seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
const srgb = hex => { const n = parseInt(hex.slice(1), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255].map(c => Math.pow(c, 2.2)); };

/* ---------- WebGL helpers ---------- */
let gl = null;
const GLX = {
  compile(src, type) {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(s);
      console.error(log, src.split('\n').map((l, i) => (i + 1) + ': ' + l).join('\n'));
      throw new Error('셰이더 오류: ' + log);
    }
    return s;
  },
  program(vs, fs, defines = '') {
    const head = '#version 300 es\n' + defines + '\n';
    const p = gl.createProgram();
    gl.attachShader(p, GLX.compile(head + vs, gl.VERTEX_SHADER));
    gl.attachShader(p, GLX.compile(head + fs, gl.FRAGMENT_SHADER));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('셰이더 연결 오류: ' + gl.getProgramInfoLog(p));
    const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i); const name = info.name.replace(/\[0\]$/, ''); u[name] = gl.getUniformLocation(p, info.name); }
    return { p, u };
  },
  buffer(data, target = gl.ARRAY_BUFFER, usage = gl.STATIC_DRAW) {
    const b = gl.createBuffer(); gl.bindBuffer(target, b); gl.bufferData(target, data, usage); return b;
  },
  tex(w, h, data, { wrap = gl.REPEAT, filter = 'mip', srgb = false, format } = {}) {
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    const internal = srgb ? gl.SRGB8_ALPHA8 : gl.RGBA8;
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    if (filter === 'mip') { gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); }
    else gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    const ext = gl.getExtension('EXT_texture_filter_anisotropic');
    if (ext && filter === 'mip') gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(4, gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
    return t;
  },
  texImage(img, opts = {}) {
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
    gl.texImage2D(gl.TEXTURE_2D, 0, opts.srgb ? gl.SRGB8_ALPHA8 : gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return t;
  }
};

/* ---------- tileable noise on the CPU ---------- */
function valueTile(N, P, rnd) {
  const lat = new Float32Array(P * P); for (let i = 0; i < lat.length; i++) lat[i] = rnd();
  const out = new Float32Array(N * N), sc = P / N;
  for (let y = 0; y < N; y++) {
    const fy = y * sc, y0 = Math.floor(fy), ty = fy - y0, sy = ty * ty * (3 - 2 * ty), y1 = (y0 + 1) % P;
    for (let x = 0; x < N; x++) {
      const fx = x * sc, x0 = Math.floor(fx), tx = fx - x0, sx = tx * tx * (3 - 2 * tx), x1 = (x0 + 1) % P;
      const a = lat[y0 * P + x0], b = lat[y0 * P + x1], c = lat[y1 * P + x0], d = lat[y1 * P + x1];
      out[y * N + x] = (a + (b - a) * sx) + ((c + (d - c) * sx) - (a + (b - a) * sx)) * sy;
    }
  }
  return out;
}
function fbmTile(N, P, oct, rnd, gain = 0.5) {
  const out = new Float32Array(N * N); let amp = 1, tot = 0;
  for (let o = 0; o < oct; o++) {
    const n = valueTile(N, P << o, rnd);
    for (let i = 0; i < out.length; i++) out[i] += n[i] * amp;
    tot += amp; amp *= gain;
  }
  let mn = 1e9, mx = -1e9; for (const v of out) { if (v < mn) mn = v; if (v > mx) mx = v; }
  for (let i = 0; i < out.length; i++) out[i] = (out[i] - mn) / (mx - mn);
  return out;
}
function worleyTile(N, P, rnd) {
  const px = new Float32Array(P * P), py = new Float32Array(P * P);
  for (let i = 0; i < P * P; i++) { px[i] = rnd(); py[i] = rnd(); }
  const F1 = new Float32Array(N * N), F2 = new Float32Array(N * N), sc = P / N;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const fx = (x + .5) * sc, fy = (y + .5) * sc, cx = Math.floor(fx), cy = Math.floor(fy);
    let d1 = 9, d2 = 9;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const gx = cx + i, gy = cy + j, wx = ((gx % P) + P) % P, wy = ((gy % P) + P) % P;
      const k = wy * P + wx, dx = gx + px[k] - fx, dy = gy + py[k] - fy, d = Math.sqrt(dx * dx + dy * dy);
      if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
    }
    F1[y * N + x] = d1; F2[y * N + x] = d2;
  }
  return { F1, F2 };
}
function sampleTile(arr, N, x, y) {
  x = ((x % N) + N) % N; y = ((y % N) + N) % N;
  const x0 = Math.floor(x), y0 = Math.floor(y), tx = x - x0, ty = y - y0, x1 = (x0 + 1) % N, y1 = (y0 + 1) % N;
  const a = arr[y0 * N + x0], b = arr[y0 * N + x1], c = arr[y1 * N + x0], d = arr[y1 * N + x1];
  return lerp(lerp(a, b, tx), lerp(c, d, tx), ty);
}

const NOISE = { N: 256 };
function buildTextures(quality) {
  const N = 256, rnd = makeRand(9127);
  const r = fbmTile(N, 4, 5, rnd), g = fbmTile(N, 8, 4, rnd), b = fbmTile(N, 16, 3, rnd), w = worleyTile(N, 12, rnd);
  NOISE.r = r; NOISE.g = g; NOISE.b = b; NOISE.a = new Float32Array(N * N);
  const px = new Uint8Array(N * N * 4);
  for (let i = 0; i < N * N; i++) {
    const cell = clamp(1 - w.F1[i] * 1.4, 0, 1); NOISE.a[i] = cell;
    px[i * 4] = r[i] * 255; px[i * 4 + 1] = g[i] * 255; px[i * 4 + 2] = b[i] * 255; px[i * 4 + 3] = cell * 255;
  }
  const texNoise = GLX.tex(N, N, px);

  // rock detail: normal + height + cracks. Higher resolution + extra grit octave on capable devices (built once, no per-frame cost)
  const RN = quality === 'low' ? 256 : 512;
  const f1 = fbmTile(RN, 8, 5, rnd, 0.55), f2 = fbmTile(RN, 16, 4, rnd, 0.5), f3 = fbmTile(RN, 6, 4, rnd, 0.6), hh = new Float32Array(RN * RN), crack = new Float32Array(RN * RN);
  const gr = fbmTile(RN, 64, 2, rnd, 0.5), pits = worleyTile(RN, 36, rnd), gr2 = RN > 256 ? fbmTile(RN, 160, 2, rnd, 0.5) : null;
  for (let i = 0; i < RN * RN; i++) {
    const rid = 1 - Math.abs(f2[i] * 2 - 1), rid2 = 1 - Math.abs(f3[i] * 2 - 1);
    crack[i] = smooth(0.955, 0.995, rid2) * smooth(0.35, 0.6, f1[i]);
    const pit = smooth(0.3, 0.05, pits.F1[i]) * smooth(0.35, 0.65, f1[i]);
    hh[i] = f1[i] * 0.5 + rid * rid * 0.3 + (gr[i] - 0.5) * 0.34 + (gr2 ? (gr2[i] - 0.5) * 0.16 : 0) - pit * 0.18 - crack[i] * 0.22;
  }
  const rp = new Uint8Array(RN * RN * 4), ns = 10.5 * RN / 256 * 1.1;
  for (let y = 0; y < RN; y++) for (let x = 0; x < RN; x++) {
    const i = y * RN + x, l = hh[y * RN + ((x + RN - 1) % RN)], rr = hh[y * RN + ((x + 1) % RN)], u = hh[((y + RN - 1) % RN) * RN + x], d = hh[((y + 1) % RN) * RN + x];
    const nx = (l - rr) * ns, ny = (u - d) * ns, il = 1 / Math.hypot(nx, ny, 1);
    rp[i * 4] = (nx * il * .5 + .5) * 255; rp[i * 4 + 1] = (ny * il * .5 + .5) * 255; rp[i * 4 + 2] = clamp(hh[i], 0, 1) * 255; rp[i * 4 + 3] = crack[i] * 255;
  }
  const texRock = GLX.tex(RN, RN, rp);

  // water ripples normal + foam pattern
  const wh = fbmTile(N, 8, 5, rnd, 0.52), fw = worleyTile(N, 16, rnd), fw2 = fbmTile(N, 16, 3, rnd);
  const wp = new Uint8Array(N * N * 4);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x, l = wh[y * N + ((x + N - 1) % N)], rr = wh[y * N + ((x + 1) % N)], u = wh[((y + N - 1) % N) * N + x], d = wh[((y + 1) % N) * N + x];
    const s = 9, nx = (l - rr) * s, ny = (u - d) * s, il = 1 / Math.hypot(nx, ny, 1);
    const foam = clamp(smooth(0.05, 0.35, fw.F2[i] - fw.F1[i]) * 0.6 + fw2[i] * 0.55 - 0.1, 0, 1);
    wp[i * 4] = (nx * il * .5 + .5) * 255; wp[i * 4 + 1] = (ny * il * .5 + .5) * 255; wp[i * 4 + 2] = foam * 255; wp[i * 4 + 3] = wh[i] * 255;
  }
  const texWater = GLX.tex(N, N, wp);

  // caustics network
  const cw = worleyTile(N, 7, rnd), cw2 = worleyTile(N, 5, rnd), cp = new Uint8Array(N * N * 4);
  for (let i = 0; i < N * N; i++) {
    const e1 = Math.exp(-(cw.F2[i] - cw.F1[i]) * 9), e2 = Math.exp(-(cw2.F2[i] - cw2.F1[i]) * 7);
    const c = clamp(e1 * 0.85 + e2 * 0.35, 0, 1); cp[i * 4] = cp[i * 4 + 1] = cp[i * 4 + 2] = c * 255; cp[i * 4 + 3] = 255;
  }
  const texCaustic = GLX.tex(N, N, cp);
  const texSky = buildSky(quality);
  return { texNoise, texRock, texWater, texCaustic, texSky };
}

const SUN = V3.norm([-0.52, 0.5, 0.62]);
const SUNCOL = [2.45, 2.25, 1.95];
function buildSky(quality) {
  const W = quality === 'low' ? 256 : 512, Hh = W / 2, px = new Uint8Array(W * Hh * 4), N = NOISE.N;
  const zen = srgb('#2a68cc'), hor = srgb('#b3d1ea'), low = srgb('#8fb0c6');
  for (let y = 0; y < Hh; y++) {
    const th = (0.5 - (y + .5) / Hh) * Math.PI, st = Math.sin(th), ct = Math.cos(th);
    for (let x = 0; x < W; x++) {
      const ph = ((x + .5) / W - .5) * TAU, d = [Math.sin(ph) * ct, st, -Math.cos(ph) * ct];
      let col;
      if (st >= 0) { const t = Math.pow(st, 0.42); col = V3.lerp(hor, zen, t); }
      else col = V3.lerp(hor, low, smooth(0, -0.25, st));
      const dp = Math.max(0, V3.dot(d, SUN));
      const glow = Math.pow(dp, 48) * 0.55 + Math.pow(dp, 5) * 0.16;
      col = V3.add(col, V3.mul([1.0, 0.88, 0.7], glow));
      if (st > 0.015) {
        const k = 1 / (st + 0.09), u = d[0] * k * 22, v = d[2] * k * 22;
        const n1 = sampleTile(NOISE.r, N, u, v), n2 = sampleTile(NOISE.g, N, u * 2.1 + 40, v * 2.1), n3 = sampleTile(NOISE.b, N, u * 4.3, v * 4.3 + 17);
        const n = n1 * 0.62 + n2 * 0.28 + n3 * 0.1;
        const cov = smooth(0.5, 0.74, n) * smooth(0.015, 0.2, st) * 0.95;
        const lit = sampleTile(NOISE.r, N, u + SUN[0] * 3, v + SUN[2] * 3);
        const shade = clamp(0.62 + (n1 - lit) * 3.5, 0.45, 1.05);
        const cc = V3.add(V3.mul([0.93, 0.95, 0.98], shade), V3.mul([1, 0.85, 0.65], Math.pow(dp, 8) * 0.35));
        col = V3.lerp(col, cc, cov);
      }
      const i = (y * W + x) * 4;
      for (let k = 0; k < 3; k++) px[i + k] = clamp(Math.pow(Math.min(col[k], 1), 1 / 2.2) * 255, 0, 255);
      px[i + 3] = 255;
    }
  }
  const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.SRGB8_ALPHA8, W, Hh, 0, gl.RGBA, gl.UNSIGNED_BYTE, px);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  return t;
}
function noise2(x, z, ch = 'r') { return sampleTile(NOISE[ch], NOISE.N, x, z); }

/* 3D value noise for rock sculpting */
function hash3(i, j, k) { let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(k, 1274126177)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function vnoise3(x, y, z) {
  const i = Math.floor(x), j = Math.floor(y), k = Math.floor(z);
  let fx = x - i, fy = y - j, fz = z - k; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); fz = fz * fz * (3 - 2 * fz);
  const a = hash3(i, j, k), b = hash3(i + 1, j, k), c = hash3(i, j + 1, k), d = hash3(i + 1, j + 1, k);
  const e = hash3(i, j, k + 1), f = hash3(i + 1, j, k + 1), g = hash3(i, j + 1, k + 1), h = hash3(i + 1, j + 1, k + 1);
  const x1 = a + (b - a) * fx, x2 = c + (d - c) * fx, x3 = e + (f - e) * fx, x4 = g + (h - g) * fx;
  const y1 = x1 + (x2 - x1) * fy, y2 = x3 + (x4 - x3) * fy; return y1 + (y2 - y1) * fz;
}
function fbm3(x, y, z) { return vnoise3(x, y, z) * 0.58 + vnoise3(x * 2.07, y * 2.07, z * 2.07) * 0.28 + vnoise3(x * 4.3, y * 4.3, z * 4.3) * 0.14; }

/* night sky: deep blue gradient, milky way, stars; the moon sits where the sun was (baked shadows stay valid) */
function buildNightSky(quality) {
  const W = quality === 'low' ? 1024 : 2048, Hh = W / 2, px = new Uint8Array(W * Hh * 4), N = NOISE.N, rnd = makeRand(4242);
  const zen = [0.0035, 0.0075, 0.026], hor = [0.028, 0.050, 0.105], low = [0.012, 0.022, 0.045];
  const mw = V3.norm([0.35, 0.55, -0.76]);
  for (let y = 0; y < Hh; y++) {
    const th = (0.5 - (y + .5) / Hh) * Math.PI, st = Math.sin(th), ct = Math.cos(th);
    for (let x = 0; x < W; x++) {
      const ph = ((x + .5) / W - .5) * TAU, d = [Math.sin(ph) * ct, st, -Math.cos(ph) * ct];
      let col = st >= 0 ? V3.lerp(hor, zen, Math.pow(st, 0.5)) : V3.lerp(hor, low, smooth(0, -0.25, st));
      const dp = Math.max(0, V3.dot(d, SUN));
      col = V3.add(col, V3.mul([0.55, 0.62, 0.8], Math.pow(dp, 180) * 0.35 + Math.pow(dp, 14) * 0.05));
      if (st > 0) {
        const band = Math.exp(-Math.pow(V3.dot(d, mw) / 0.2, 2));
        const n = sampleTile(NOISE.r, N, ph * 18, th * 18) * 0.6 + sampleTile(NOISE.g, N, ph * 40, th * 40) * 0.4;
        col = V3.add(col, V3.mul([0.05, 0.055, 0.07], band * smooth(0.35, 0.8, n) * smooth(0, 0.3, st)));
      }
      const i = (y * W + x) * 4;
      for (let k = 0; k < 3; k++) px[i + k] = clamp(Math.pow(Math.min(col[k], 1), 1 / 2.2) * 255, 0, 255);
      px[i + 3] = 255;
    }
  }
  const NS = quality === 'low' ? 2600 : 5200;
  for (let s = 0; s < NS; s++) {
    const u = rnd(), v = rnd(), st = Math.pow(v, 0.7), th = Math.asin(st), ph = u * TAU;
    const x = Math.floor(u * W), y = Math.floor((0.5 - th / Math.PI) * Hh); if (y < 0 || y >= Hh) continue;
    const d = [Math.sin(ph - Math.PI) * Math.cos(th), st, -Math.cos(ph - Math.PI) * Math.cos(th)];
    if (V3.dot(d, SUN) > 0.985) continue;
    const b = Math.pow(rnd(), 7) * 0.95 + 0.12, tint = rnd(), fade = smooth(0.02, 0.2, st);
    const c = [b * (0.85 + tint * 0.2), b * 0.92, b * (1.05 - tint * 0.2)];
    const i = (y * W + x) * 4;
    for (let k = 0; k < 3; k++) px[i + k] = Math.max(px[i + k], clamp(Math.pow(c[k] * fade, 1 / 2.2) * 255, 0, 255));
    if (b > 0.6 && x + 1 < W) { const j = i + 4; for (let k = 0; k < 3; k++) px[j + k] = Math.max(px[j + k], px[i + k] * 0.5); }
  }
  const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.SRGB8_ALPHA8, W, Hh, 0, gl.RGBA, gl.UNSIGNED_BYTE, px);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  return t;
}
