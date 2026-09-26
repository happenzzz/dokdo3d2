"use strict";
/* ===== 08 modes & controls ===== */
const INPUT = { ptrs: new Map(), keys: {}, lastTap: 0, lastTapXY: [0, 0], joy: null };
const OBS = { t: [0, 20, 0], d: 820, yaw: 0.35, pitch: -0.42, vy: 0, vp: 0, anim: null };
const EXP = { pos: [199, 3.7, 186], vel: [0, 0, 0], yaw: Math.PI, pitch: -0.05, state: 'walk', move: [0, 0], vert: 0, run: false, bubT: 0, diving: null, ascend: false, bob: 0 };
const PRESETS = {
  all: { t: [-20, 25, -20], d: 820, yaw: 0.35, pitch: -0.42 }, dong: { t: [175, 35, 80], d: 270, yaw: -0.75, pitch: -0.36 },
  seo: { t: [-235, 60, -90], d: 340, yaw: 0.95, pitch: -0.3 }, top: { t: [-20, 0, -30], d: 980, yaw: 0, pitch: -1.5 }, under: { t: [18, -9, 112], d: 22, yaw: -2.6, pitch: -0.2 }
};
function obsFly(p, dur = 1.6) { OBS.anim = { from: { t: OBS.t.slice(), d: OBS.d, yaw: OBS.yaw, pitch: OBS.pitch }, to: p, k: 0, dur }; OBS.vy = OBS.vp = 0; }
function obsApply() {
  const c = R.cam; c.yaw = OBS.yaw; c.pitch = OBS.pitch; camBasis();
  c.pos = V3.sub(OBS.t, V3.mul(c.fwd, OBS.d));
  const g = TER.heightAt(c.pos[0], c.pos[2]) + 2;
  if (c.pos[1] < g) c.pos[1] = g;
  c.near = clamp(OBS.d * 0.004, 0.15, 2.5); c.fov = 55 * Math.PI / 180;
}
function obsUpdate(dt) {
  if (OBS.anim) {
    const a = OBS.anim; a.k = Math.min(1, a.k + dt / a.dur); const e = a.k < .5 ? 4 * a.k ** 3 : 1 - Math.pow(-2 * a.k + 2, 3) / 2;
    OBS.t = V3.lerp(a.from.t, a.to.t, e); OBS.d = Math.exp(lerp(Math.log(a.from.d), Math.log(a.to.d), e)); OBS.yaw = angLerp(a.from.yaw, a.to.yaw, e); OBS.pitch = lerp(a.from.pitch, a.to.pitch, e);
    if (a.k >= 1) OBS.anim = null;
  } else {
    OBS.yaw += OBS.vy; OBS.pitch = clamp(OBS.pitch + OBS.vp, -1.52, 0.35);
    const f = Math.pow(0.0025, dt); OBS.vy *= f; OBS.vp *= f;
    if (!INPUT.ptrs.size && (UI.autoRotate || (MODE.cur === 'tour' && TOUR.spin))) OBS.yaw += dt * (MODE.cur === 'tour' ? 0.025 : 0.035);
  }
  OBS.d = clamp(OBS.d, 6, 1600);
  obsApply();
}
function obsPan(dx, dy) {
  const c = R.cam, s = OBS.d * 0.0016, fl = V3.norm([c.fwd[0], 0, c.fwd[2]]);
  OBS.t = V3.add(OBS.t, V3.add(V3.mul(c.right, -dx * s), V3.mul(fl, dy * s)));
  OBS.t[0] = clamp(OBS.t[0], -700, 700); OBS.t[2] = clamp(OBS.t[2], -700, 700);
}
function obsZoom(f, sx, sy) {
  OBS.anim = null; const nd = clamp(OBS.d * f, 6, 1600);
  if (sx !== undefined && f < 1) { const hit = worldHit(sx, sy); if (hit) OBS.t = V3.lerp(OBS.t, hit, (1 - nd / OBS.d) * 0.9); }
  OBS.d = nd;
}
/* world hit: terrain or water surface */
function worldHit(sx, sy, withWater = true) {
  const d = screenRay(sx, sy), o = R.cam.pos, th = TER.raycast(o, d);
  let tw = null; if (withWater && !R.under && d[1] < 0) tw = -o[1] / d[1];
  if (th && (tw === null || th.t < tw)) return th.p;
  if (tw !== null && tw > 0) return [o[0] + d[0] * tw, 0, o[2] + d[2] * tw];
  return th ? th.p : null;
}

/* ---------- explorer ---------- */
function expEyeY() { const s = EXP.state; return s === 'walk' || s === 'fall' ? 1.6 : s === 'trans' ? 1.3 : s === 'float' ? 0.3 : 0; }
function stampAt(x, z) { const i = Math.round((x - TER.X0) / TER.C), j = Math.round((z - TER.Z0) / TER.C); if (i < 0 || j < 0 || i >= TER.W || j >= TER.D) return -99; return TER.ST[j * TER.W + i]; }
const DOCK = { boat: [208, 205, 0], quay: [199, 186] };
const yawTo = (from, to) => Math.atan2(to[0] - from[0], -(to[2] - from[2]));
const inBounds = (x, z, m = 20) => x > TER.X0 + m && z > TER.Z0 + m && x < TER.X0 + TER.SIZE_X - m && z < TER.Z0 + TER.SIZE_Z - m;
function findBoat(create) {
  let b = SCN.elems.find(e => e.kind === 'boat' && !e.hidden);
  if (!b && create && KINDS.boat) { b = newElem('boat', DOCK.boat[0], 0, DOCK.boat[1], DOCK.boat[2], 1); SCN.elems.push(b); }
  return b;
}
function nearestWater(x, z, maxR = 120) {
  for (let r = 2; r <= maxR; r += 2) {
    const n = Math.max(12, Math.round(r * 1.2));
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU, px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
      if (inBounds(px, pz, 30) && TER.heightAt(px, pz) < -2.2 && stampAt(px, pz) < 1 && TER.heightAt(px + Math.cos(a) * 4, pz + Math.sin(a) * 4) < -2.2) return [px, 0, pz];
    }
  }
  return null;
}
function nearestShore(x, z, maxR = 16) {
  for (let r = 2; r <= maxR; r += 1.5) {
    const n = Math.max(10, Math.round(r * 1.3));
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU, px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r, h = TER.heightAt(px, pz);
      if (h > 0.5 && h < 7 && stampAt(px, pz) < 2) {
        const s = Math.abs(TER.heightAt(px + 1.5, pz) - TER.heightAt(px - 1.5, pz)) + Math.abs(TER.heightAt(px, pz + 1.5) - TER.heightAt(px, pz - 1.5));
        if (s < 2.2) return [px, h, pz];
      }
    }
  }
  return null;
}
/* scripted, dynamic move (arc flight) of the player */
function expTransit(to, o = {}) {
  const E = EXP, from = E.pos.slice(), dist = Math.hypot(to[0] - from[0], to[2] - from[2]);
  let top = Math.max(from[1], to[1]);
  for (let i = 1; i < 24; i++) { const t = i / 24; top = Math.max(top, TER.heightAt(lerp(from[0], to[0], t), lerp(from[2], to[2], t))); }
  const arc = Math.max(o.arc || 0, top - Math.max(from[1], to[1]) + 4);
  E.trans = { from, to, k: 0, dur: o.dur || clamp(0.9 + dist / 45, 1.1, 3.4), arc, then: o.then, face: o.face === undefined ? yawTo(from, to) : o.face, yaw0: E.yaw, pitch0: E.pitch };
  E.state = 'trans'; E.vel = [0, 0, 0]; E.diving = null; E.ascend = false;
  if (dist > 25) AUDIO.whoosh();
}
function boatSeat(b) { const f = [Math.cos(b.yaw), 0, -Math.sin(b.yaw)]; return [b.x - f[0] * 1.3, (b.y || 0) + 1.05, b.z - f[2] * 1.3]; }
function boatPose(b, lean = 0) {
  const f = [Math.cos(b.yaw), -Math.sin(b.yaw)], r = [Math.sin(b.yaw), Math.cos(b.yaw)];
  const hb = waveHeight(b.x + f[0] * 3, b.z + f[1] * 3), hs = waveHeight(b.x - f[0] * 3, b.z - f[1] * 3);
  const hr = waveHeight(b.x + r[0] * 1.3, b.z + r[1] * 1.3), hl = waveHeight(b.x - r[0] * 1.3, b.z - r[1] * 1.3);
  b.y = (hb + hs + hr + hl) / 4 + 0.02; b.pitch = Math.atan2(hb - hs, 6) * 0.85 + (b.lift || 0); b.roll = Math.atan2(hl - hr, 2.6) * 0.8 + lean;
}
function expUpdate(dt) {
  const E = EXP, c = R.cam, K = INPUT.keys;
  let mx = E.move[0], mz = E.move[1];
  if (K.KeyW || K.ArrowUp) mz += 1; if (K.KeyS || K.ArrowDown) mz -= 1; if (K.KeyA || K.ArrowLeft) mx -= 1; if (K.KeyD || K.ArrowRight) mx += 1;
  const ml = Math.hypot(mx, mz); if (ml > 1) { mx /= ml; mz /= ml; }
  E.lastMove = [mx, mz];
  let vert = E.vert + (K.KeyE || K.Space ? 1 : 0) - (K.KeyQ || K.KeyC ? 1 : 0);
  const run = E.run || K.ShiftLeft || K.ShiftRight;
  const fw = [Math.sin(E.yaw), 0, -Math.cos(E.yaw)], rt = [Math.cos(E.yaw), 0, Math.sin(E.yaw)];
  const g = TER.heightAt(E.pos[0], E.pos[2]), wh = waveHeight(E.pos[0], E.pos[2]);
  let shake = 0;
  if (E.state === 'boat') { boatDrive(dt, mx, mz, run); UI.expHud(); return; }
  if (E.state === 'trans') {
    const T = E.trans; T.k = Math.min(1, T.k + dt / T.dur); const e = T.k < .5 ? 4 * T.k ** 3 : 1 - Math.pow(-2 * T.k + 2, 3) / 2;
    const p = V3.lerp(T.from, T.to, e); p[1] += Math.sin(e * Math.PI) * T.arc; E.pos = p;
    const dir = V3.sub(T.to, T.from), hd = Math.hypot(dir[0], dir[2]);
    const travelYaw = hd > 1 ? Math.atan2(dir[0], -dir[2]) : T.face;
    E.yaw = angLerp(angLerp(T.yaw0, travelYaw, smooth(0, 0.3, T.k)), T.face, smooth(0.6, 1, T.k));
    E.pitch = lerp(T.pitch0, -0.12, smooth(0, 0.3, T.k)) - Math.cos(e * Math.PI) * 0.18 * smooth(0, 0.2, T.k) * (1 - smooth(0.8, 1, T.k));
    R.speedFx = Math.sin(T.k * Math.PI) * clamp(hd / 60, 0.2, 1);
    if (T.k >= 1) { E.trans = null; R.speedFx = 0; E.state = 'walk'; if (T.then) T.then(); }
  } else if (E.diving) { // scripted dive arc
    const d = E.diving; d.k += dt;
    if (d.k < 0.45) { E.pos[1] = d.y0 + Math.sin(d.k / 0.45 * Math.PI * 0.5) * 1.4; E.pitch = lerp(d.p0, -0.9, d.k / 0.45); }
    else { if (!d.splashed) { d.splashed = true; FX.splash(E.pos[0] + fw[0], E.pos[2] + fw[2], 1.1, true); } E.pos[1] -= dt * 6.5; E.pos[0] += fw[0] * dt * 2; E.pos[2] += fw[2] * dt * 2; E.pitch = lerp(E.pitch, -0.35, dt * 3); if (E.pos[1] < Math.max(-4.5, g + 1.2)) { E.diving = null; E.state = 'swim'; E.vel = [0, 0, 0]; } }
  } else if (E.state === 'walk') {
    const climb = E.climb, sp = climb ? (run ? 3.4 : 2.1) : (run ? 7 : 3.4), step = sp * dt;
    const nx = E.pos[0] + (fw[0] * mz + rt[0] * mx) * step, nz = E.pos[2] + (fw[2] * mz + rt[2] * mx) * step;
    const ng = TER.heightAt(nx, nz), rise = ng - g, ok = (climb || rise < 1.2 * step + 0.08) && stampAt(nx, nz) < 2 && inBounds(nx, nz);
    if (ok && (mx || mz)) { E.pos[0] = nx; E.pos[2] = nz; E.blockT = 0; }
    else if ((mx || mz) && rise > 0 && !climb) {
      E.blockT = (E.blockT || 0) + dt;
      if (E.blockT > 0.5 && R.time - (E.hintT || -99) > 7) { E.hintT = R.time; UI.toast('가파른 절벽이에요. 🧗 등반하기를 켜면 올라갈 수 있어요!'); UI.hintBtn('#bClimb'); }
    }
    const g2 = TER.heightAt(E.pos[0], E.pos[2]);
    if (climb) {
      E.pos[1] = lerp(E.pos[1], g2, Math.min(1, dt * 14));
      if ((mx || mz) && Math.abs(rise) > step * 0.9) { E.climbing = true; shake = 0.035; if (!INPUT.ptrs.size || INPUT.joy) E.pitch = lerp(E.pitch, rise > 0 ? 0.22 : -0.45, Math.min(1, dt * 1.2)); E.gripT = (E.gripT || 0) - dt; if (E.gripT < 0) { E.gripT = 0.42; AUDIO.grip(); } } else E.climbing = false;
    } else if (E.pos[1] - g2 > 0.8) { E.state = 'fall'; E.vel = [(fw[0] * mz + rt[0] * mx) * sp, 0, (fw[2] * mz + rt[2] * mx) * sp]; }
    else E.pos[1] = lerp(E.pos[1], g2, Math.min(1, dt * 18));
    if (E.state === 'walk' && g2 < wh - 1.1) { E.state = 'float'; }
    E.bob += dt * (mx || mz ? sp * (climb ? 3 : 1.8) : 0);
  } else if (E.state === 'fall') {
    E.vel[1] -= 9.8 * dt; E.pos = V3.add(E.pos, V3.mul(E.vel, dt)); E.vel[0] *= 0.995; E.vel[2] *= 0.995;
    if (!inBounds(E.pos[0], E.pos[2], 22)) { E.vel[0] = 0; E.vel[2] = 0; }
    const g2 = TER.heightAt(E.pos[0], E.pos[2]), w2 = waveHeight(E.pos[0], E.pos[2]);
    if (E.pos[1] <= g2 && g2 > w2) { E.pos[1] = g2; E.state = 'walk'; E.jumped = false; FX.thud(-E.vel[1]); E.vel = [0, 0, 0]; }
    else if (E.pos[1] < w2 + 0.1) { const v = -E.vel[1]; FX.splash(E.pos[0], E.pos[2], clamp(v / 12, 0.5, 2.2), true); E.state = 'plunge'; E.vel[1] = -Math.min(v * 0.55, 9); if (!E.jumped) UI.toast('풍덩! 바다에 빠졌어요 🌊'); E.jumped = false; }
  } else if (E.state === 'plunge') {
    E.vel[1] += (3.2 - E.vel[1] * 1.6) * dt; E.pos = V3.add(E.pos, V3.mul(E.vel, dt)); E.vel[0] *= 0.96; E.vel[2] *= 0.96;
    E.pos[1] = Math.max(E.pos[1], g + 0.8);
    if (E.vel[1] > 0.3) { E.state = 'swim'; E.ascend = true; }
  } else if (E.state === 'swim') {
    const sp = run ? 4.2 : 2.4, cp = Math.cos(E.pitch), look = [Math.sin(E.yaw) * cp, Math.sin(E.pitch), -Math.cos(E.yaw) * cp];
    let tv = V3.add(V3.mul(look, mz * sp), V3.mul(rt, mx * sp)); tv[1] += vert * sp * 0.8;
    if (E.ascend) { tv[1] = 2.4; if (E.pos[1] > wh - 0.6) E.ascend = false; }
    E.vel = V3.lerp(E.vel, tv, Math.min(1, dt * 2.5));
    const np = V3.add(E.pos, V3.mul(E.vel, dt));
    if (stampAt(np[0], np[2]) < 2 || np[1] < -3) { E.pos = np; }
    E.pos[0] = clamp(E.pos[0], TER.X0 + 20, TER.X0 + TER.SIZE_X - 20); E.pos[2] = clamp(E.pos[2], TER.Z0 + 20, TER.Z0 + TER.SIZE_Z - 20);
    const g2 = TER.heightAt(E.pos[0], E.pos[2]); if (E.pos[1] < g2 + 0.7) E.pos[1] = g2 + 0.7;
    E.bubT -= dt; if (E.bubT < 0) { E.bubT = 1.6 + Math.random(); PART.bubbles(c.pos[0] + c.fwd[0] * 0.5, c.pos[1] + 0.1, c.pos[2] + c.fwd[2] * 0.5, 6, 0.2); AUDIO.bubble(); }
    if (E.pos[1] > wh - 0.25 && E.vel[1] > -0.1) { E.state = 'float'; FX.surface(); }
  } else if (E.state === 'float') {
    const sp = run ? 3.4 : 2.0, nx = E.pos[0] + (fw[0] * mz + rt[0] * mx) * sp * dt, nz = E.pos[2] + (fw[2] * mz + rt[2] * mx) * sp * dt;
    const ng = TER.heightAt(nx, nz), nw = waveHeight(nx, nz);
    if (ng > nw - 0.9) {
      if ((mx || mz) && (ng < nw + 1.4 || E.climb)) { E.pos = [nx, ng, nz]; E.state = 'walk'; UI.toast(E.climb ? '바위를 붙잡고 올라왔어요 🧗' : '뭍으로 올라왔어요 👣'); AUDIO.grip(); }
      else if ((mx || mz) && R.time - (E.hintT || -99) > 7) { E.hintT = R.time; UI.toast('절벽이 높아요. 🧗 등반하기를 켜고 밀면 올라갈 수 있어요!'); UI.hintBtn('#bClimb'); }
    }
    else if (stampAt(nx, nz) < 2) { E.pos[0] = nx; E.pos[2] = nz; }
    E.pos[0] = clamp(E.pos[0], TER.X0 + 20, TER.X0 + TER.SIZE_X - 20); E.pos[2] = clamp(E.pos[2], TER.Z0 + 20, TER.Z0 + TER.SIZE_Z - 20);
    if (E.state === 'float') E.pos[1] = lerp(E.pos[1], waveHeight(E.pos[0], E.pos[2]), Math.min(1, dt * 6));
    if (vert < 0) expDive();
  }
  // camera
  c.yaw = E.yaw; c.pitch = E.pitch; c.fov = lerp(c.fov, ((run && (mx || mz)) || E.state === 'trans' ? 72 : 66) * Math.PI / 180, dt * 4); c.near = 0.08;
  const bob = E.state === 'walk' ? Math.sin(E.bob) * (E.climbing ? 0.1 : 0.05) : 0;
  c.pos = [E.pos[0] + (Math.random() - .5) * shake, E.pos[1] + expEyeY() + bob, E.pos[2] + (Math.random() - .5) * shake];
  if (E.state === 'float') c.pos[1] = Math.max(c.pos[1], waveHeight(c.pos[0], c.pos[2]) + 0.25);
  if (E.state === 'swim' || E.state === 'plunge') c.pos[1] = Math.min(c.pos[1], waveHeight(c.pos[0], c.pos[2]) - 0.3);
  UI.expHud();
}
function expDive() {
  const E = EXP;
  if (E.state === 'boat') { boatLeave(true); return; }
  if (E.state === 'walk') {
    const fw = [Math.sin(E.yaw), 0, -Math.cos(E.yaw)];
    for (let d = 1; d < 30; d += 0.5) {
      const x = E.pos[0] + fw[0] * d, z = E.pos[2] + fw[2] * d;
      if (TER.heightAt(x, z) < -1.5 && TER.heightAt(x + fw[0] * 3, z + fw[2] * 3) < -1.5) {
        const vy = 5, h = E.pos[1] + 0.5, tf = (vy + Math.sqrt(vy * vy + 2 * 9.8 * Math.max(h, 0.1))) / 9.8, vx = clamp((d + 2.5) / tf, 2, 14);
        E.vel = [fw[0] * vx, vy, fw[2] * vx]; E.state = 'fall'; E.jumped = true; UI.toast('바다로 뛰어들어요!'); AUDIO.whoosh(); return;
      }
    }
    UI.toast('앞쪽에 바다가 없어요. 🏊 수영하기를 누르면 가까운 바다로 가요.'); UI.hintBtn('#bSwim'); return;
  }
  if (E.state === 'float') { E.diving = { k: 0, y0: E.pos[1], p0: E.pitch }; AUDIO.whoosh(); }
  else if (E.state === 'swim') { E.vel[1] = -3; }
}
function expJump() {
  const E = EXP, fw = [Math.sin(E.yaw), 0, -Math.cos(E.yaw)], rt = [Math.cos(E.yaw), 0, Math.sin(E.yaw)], m = E.lastMove || [0, 0];
  if (E.state === 'walk') {
    const sp = E.run ? 6.5 : 3.6; E.vel = [(fw[0] * m[1] + rt[0] * m[0]) * sp, 5.6, (fw[2] * m[1] + rt[2] * m[0]) * sp];
    E.pos[1] += 0.05; E.state = 'fall'; E.jumped = true; AUDIO.jump();
  } else if (E.state === 'float') {
    E.vel = [fw[0] * 3, 5.4, fw[2] * 3]; E.pos[1] = Math.max(E.pos[1], 0.15); E.state = 'fall'; E.jumped = true;
    FX.splash(E.pos[0], E.pos[2], 0.5, false); AUDIO.jump(); UI.toast('돌고래 점프! 🐬');
  } else if (E.state === 'boat') boatLeave(true);
}
function expSwim() {
  const E = EXP;
  if (E.state === 'float' || E.state === 'swim') { UI.toast('벌써 바다에서 헤엄치고 있어요 🏊'); return; }
  if (E.state === 'boat') { boatLeave(true); return; }
  if (E.state !== 'walk') return;
  const w = nearestWater(E.pos[0], E.pos[2]); if (!w) { UI.toast('가까운 바다를 찾지 못했어요'); return; }
  expTransit(w, { arc: 3, face: yawTo(E.pos, w), then: () => { EXP.state = 'float'; EXP.pos[1] = waveHeight(w[0], w[2]); FX.splash(w[0], w[2], 0.9, true); UI.toast('바다에 들어왔어요! 조이스틱으로 헤엄쳐요 🏊'); } });
  UI.toast('가까운 바다로 가요!');
}
function expGoQuay() {
  const E = EXP; if (E.state === 'boat') { AUDIO.engine(false); }
  const q = [DOCK.quay[0], TER.heightAt(DOCK.quay[0], DOCK.quay[1]), DOCK.quay[1]];
  expTransit(q, { arc: 18, face: Math.PI, then: () => { EXP.state = 'walk'; UI.toast('선착장에 도착했어요 ⚓'); } });
}
/* ---------- boat ---------- */
function boatBoard() {
  const E = EXP; if (E.state === 'boat' || E.state === 'trans') return;
  const b = findBoat(true); if (!b) { UI.toast('배가 없어요'); return; }
  const inWater = E.state === 'float' || E.state === 'swim';
  let d = Math.hypot(b.x - E.pos[0], b.z - E.pos[2]);
  if (inWater && d > 30) { // call the boat beside the swimmer
    const rt = [Math.cos(E.yaw), 0, Math.sin(E.yaw)];
    let px = E.pos[0] + rt[0] * 5, pz = E.pos[2] + rt[2] * 5; if (TER.heightAt(px, pz) > -2.5) { px = E.pos[0]; pz = E.pos[2]; }
    b.x = px; b.z = pz; b.yaw = Math.PI / 2 - E.yaw; boatPose(b); d = 5; addRipple(px, pz, 0.6); UI.toast('배를 불렀어요! 🚤');
    if (E.state === 'swim') E.pos[1] = 0;
  }
  const seat = boatSeat(b); E.boat = b;
  expTransit(seat, {
    arc: d > 60 ? 28 : 2.2, dur: d > 60 ? clamp(1.4 + d / 260, 1.8, 3.8) : 1.1, face: Math.PI / 2 - b.yaw,
    then: () => { EXP.state = 'boat'; EXP.bspd = 0; EXP.bcam = 0; EXP.belev = 0.3; EXP.bcamPos = null; AUDIO.engine(true); UI.toast('배에 탔어요! 조이스틱을 위로 밀면 앞으로, 옆으로 밀면 방향을 바꿔요 🚤'); }
  });
}
function boatLeave(intoWater) {
  const E = EXP, b = E.boat; if (E.state !== 'boat' || !b) return;
  AUDIO.engine(false); E.bspd = 0; b.lift = 0;
  const shore = intoWater ? null : nearestShore(b.x, b.z, 18);
  E.pos = boatSeat(b); E.yaw = Math.PI / 2 - b.yaw; E.pitch = -0.1;
  if (shore) { expTransit(shore, { arc: 2.5, dur: 1.2, face: yawTo([b.x, 0, b.z], shore), then: () => { EXP.state = 'walk'; UI.toast('뭍에 내렸어요 👣'); } }); return; }
  const r = [Math.sin(b.yaw), 0, Math.cos(b.yaw)];
  E.vel = [r[0] * 2.6, 4.4, r[2] * 2.6]; E.state = 'fall'; E.jumped = true; AUDIO.jump();
  UI.toast(intoWater ? '배에서 바다로 풍덩! 🌊' : '가까운 뭍이 없어서 바다로 뛰어내렸어요 🌊');
}
function boatDrive(dt, mx, mz, run) {
  const E = EXP, b = E.boat, c = R.cam;
  if (!b || !SCN.elems.includes(b) || b.hidden) { E.state = 'float'; AUDIO.engine(false); return; }
  const maxV = run ? 15 : 9, target = mz * maxV * (mz < 0 ? 0.4 : 1);
  E.bspd = lerp(E.bspd, target, Math.min(1, dt * (Math.abs(target) > Math.abs(E.bspd) ? 0.8 : 1.3)));
  const turn = 0.85 * clamp(0.35 + Math.abs(E.bspd) / 6, 0.35, 1.25) * (E.bspd < -0.3 ? -1 : 1);
  b.yaw -= mx * turn * dt;
  const f = [Math.cos(b.yaw), 0, -Math.sin(b.yaw)], sg = E.bspd >= 0 ? 1 : -1;
  const nx = b.x + f[0] * E.bspd * dt, nz = b.z + f[2] * E.bspd * dt, px = nx + f[0] * 3.8 * sg, pz = nz + f[2] * 3.8 * sg;
  const hit = TER.heightAt(px, pz) > -1.2 || stampAt(px, pz) >= 1 || !inBounds(px, pz, 30);
  if (hit && Math.abs(E.bspd) > 0.3) {
    if (Math.abs(E.bspd) > 2.5) { FX.thud(7); AUDIO.bump(); if (R.time - (E.bumpT || -9) > 4) { E.bumpT = R.time; UI.toast('쿵! 앞이 얕거나 바위가 있어요. 방향을 바꿔 봐요'); } }
    E.bspd *= -0.3;
  } else if (!hit) { b.x = nx; b.z = nz; }
  b.lift = lerp(b.lift || 0, clamp(E.bspd / maxV, 0, 1) * 0.07, dt * 2);
  boatPose(b, -mx * clamp(E.bspd / 9, -1, 1) * 0.12);
  const spd = Math.abs(E.bspd);
  E.wakeT = (E.wakeT || 0) - dt;
  if (spd > 1.5 && E.wakeT < 0) {
    E.wakeT = 0.06; const r = [Math.sin(b.yaw), 0, Math.cos(b.yaw)], s = [b.x - f[0] * 3.2, b.z - f[2] * 3.2];
    for (const k of [-1, 1]) PART.spray(s[0] + r[0] * k * 1.1, 0.1, s[1] + r[2] * k * 1.1, Math.round(1 + spd / 5), 0.45 + spd * 0.05);
    if (spd > 6 && Math.random() < 0.3) PART.spray(b.x + f[0] * 3.3, 0.2, b.z + f[2] * 3.3, 2, 0.8);
  }
  E.ripT = (E.ripT || 0) - dt; if (spd > 2 && E.ripT < 0) { E.ripT = 1.1; addRipple(b.x - f[0] * 3, b.z - f[2] * 3, 0.25); }
  AUDIO.engineSet(spd / 15);
  E.pos = boatSeat(b);
  // chase camera
  if (!INPUT.ptrs.size) E.bcam *= Math.pow(0.35, dt);
  const cy = Math.PI / 2 - b.yaw + E.bcam, cf = [Math.sin(cy), 0, -Math.cos(cy)], D = 15 + spd * 0.35, el = E.belev;
  const want = [b.x - cf[0] * D * Math.cos(el), b.y + 1.5 + D * Math.sin(el), b.z - cf[2] * D * Math.cos(el)];
  E.bcamPos = E.bcamPos ? V3.lerp(E.bcamPos, want, Math.min(1, dt * 3.2)) : want;
  const cp = E.bcamPos.slice(); cp[1] = Math.max(cp[1], waveHeight(cp[0], cp[2]) + 1.3, TER.heightAt(cp[0], cp[2]) + 1.5);
  const look = V3.sub([b.x + f[0] * 5, b.y + 1.6, b.z + f[2] * 5], cp);
  c.pos = cp; c.yaw = Math.atan2(look[0], -look[2]); c.pitch = Math.atan2(look[1], Math.hypot(look[0], look[2])); c.near = 0.15;
  c.fov = lerp(c.fov, (60 + spd * 0.7) * Math.PI / 180, dt * 3);
  R.speedFx = clamp((spd - 8) / 10, 0, 0.5);
}
function expTeleport(p, yaw) { EXP.pos = p.slice(); EXP.yaw = yaw; EXP.pitch = -0.08; EXP.vel = [0, 0, 0]; EXP.diving = null; EXP.trans = null; EXP.state = TER.heightAt(p[0], p[2]) > waveHeight(p[0], p[2]) - 0.5 ? 'walk' : (p[1] < -1 ? 'swim' : 'float'); }

/* ---------- focus cinematic ---------- */
const FOCUS = {
  active: false, k: 0, closing: false,
  start(target, info) {
    if (this.active) this.restore(true);
    const c = R.cam; this.from = { pos: c.pos.slice(), yaw: c.yaw, pitch: c.pitch, fov: c.fov, near: c.near };
    this.target = target; this.info = info; this.e = target.e || null; this.k = 0; this.active = true; this.closing = false; this.orbit = 0;
    if (this.e) { this.e.frozen = true; this.e.ft = R.time; SCN.sel = MODE.cur === 'dev' ? SCN.sel : null; }
    const fc = elemOrPoint(target); this.c = fc.c; this.r = fc.r;
    let dir = V3.sub(this.from.pos, this.c); dir[1] = 0; if (V3.len(dir) < 0.01) dir = [0, 0, 1]; dir = V3.norm(dir);
    const dist = this.r * (this.r > 6 ? 3.1 : 2.6) + 1.4;
    this.base = { dir, dist, elev: this.c[1] < -0.5 ? 0.12 : 0.32 };
    R.focus.c = this.c; R.focus.r = this.r * 1.3;
    document.body.classList.add('focusing'); UI.showDetail(info, this.e); AUDIO.focus();
  },
  pose(orbit) {
    const b = this.base, a = orbit, d = [b.dir[0] * Math.cos(a) - b.dir[2] * Math.sin(a), 0, b.dir[0] * Math.sin(a) + b.dir[2] * Math.cos(a)];
    let p = V3.add(this.c, [d[0] * b.dist * Math.cos(b.elev), b.dist * Math.sin(b.elev), d[2] * b.dist * Math.cos(b.elev)]);
    const g = TER.heightAt(p[0], p[2]); if (p[1] < g + 1) p[1] = g + 1;
    if (this.c[1] < -0.5) p[1] = Math.min(p[1], -1.2); else if (p[1] < 1.5 && TER.heightAt(p[0], p[2]) < 0) p[1] = 1.5;
    const look = V3.sub(V3.sub(this.c, [0, b.dist * 0.2, 0]), p), yaw = Math.atan2(look[0], -look[2]), pitch = Math.atan2(look[1], Math.hypot(look[0], look[2]));
    return { pos: p, yaw, pitch };
  },
  update(dt) {
    if (!this.active) { R.focus.amt = Math.max(0, R.focus.amt - dt * 2); return; }
    const c = R.cam;
    if (this.closing) {
      this.k = Math.max(0, this.k - dt / 0.9); const e = this.k * this.k * (3 - 2 * this.k), P = this.pose(this.orbit);
      c.pos = V3.lerp(this.from.pos, P.pos, e); c.yaw = angLerp(this.from.yaw, P.yaw, e); c.pitch = lerp(this.from.pitch, P.pitch, e); c.fov = lerp(this.from.fov, 42 * Math.PI / 180, e);
      R.focus.amt = e;
      if (this.k <= 0) this.restore(false);
      return;
    }
    this.k = Math.min(1, this.k + dt / 1.5); const e = this.k < .5 ? 4 * this.k ** 3 : 1 - Math.pow(-2 * this.k + 2, 3) / 2;
    if (this.k >= 1) this.orbit += dt * 0.07 * (UI.focusSpin ? 1 : 0);
    const P = this.pose(this.orbit);
    const mid = V3.add(V3.lerp(this.from.pos, P.pos, e), [0, Math.sin(e * Math.PI) * this.base.dist * 0.25 * (this.c[1] < -0.5 ? 0 : 1), 0]);
    c.pos = mid; c.yaw = angLerp(this.from.yaw, P.yaw, e); c.pitch = lerp(this.from.pitch, P.pitch, e); c.fov = lerp(this.from.fov, 42 * Math.PI / 180, e); c.near = 0.08;
    R.focus.amt = e;
    if (this.c[1] < -0.5 && this.from.pos[1] > 0 && !this.dipped && c.pos[1] < 0.2) { this.dipped = true; FX.splash(c.pos[0], c.pos[2], 0.6, false); }
  },
  close() { if (!this.active || this.closing) return; this.closing = true; UI.hideDetail(); document.body.classList.remove('focusing'); },
  restore(instant) {
    if (this.e) this.e.frozen = false;
    const c = R.cam; c.pos = this.from.pos.slice(); c.yaw = this.from.yaw; c.pitch = this.from.pitch; c.fov = this.from.fov; c.near = this.from.near;
    this.active = false; this.dipped = false; R.focus.amt = instant ? 0 : R.focus.amt; document.body.classList.remove('focusing'); if (instant) UI.hideDetail();
  }
};
function elemOrPoint(t) { if (t.e) return elemFocus(t.e, R.time, t.sub); return { c: t.p, r: t.r || 10 }; }

/* ---------- developer ---------- */
const DEV = { tool: 'select', place: null, brush: { mode: 'up', r: 14, s: 1 }, undo: [], dragging: false, sculpting: false, flatH: 0 };
function devSnapshot(withTer) { DEV.undo.push({ elems: JSON.stringify(sceneSerialize()), ter: withTer ? TER.snapshot() : null }); if (DEV.undo.length > 20) DEV.undo.shift(); UI.devUndoState(); }
function devUndo() {
  const s = DEV.undo.pop(); if (!s) return;
  if (s.ter) TER.restore(s.ter);
  const keepSel = null; SCN.sel = keepSel; sceneInit({ elems: JSON.parse(s.elems) }); relayoutAll(); buildLabels(); UI.devRefresh(); saveLater(); UI.devUndoState(); UI.toast('되돌렸어요');
}
function relayoutAll() { for (const e of SCN.elems) layoutElem(e); stampRocks(); }
function placeY(kind, p) {
  const k = KINDS[kind], g = TER.heightAt(p[0], p[2]);
  if (k.place === 'sea') return 0; if (k.place === 'air') return Math.max(g, 0) + 30;
  if (k.place === 'water') return g < -2 ? lerp(g, 0, 0.55) : -2;
  return g;
}
function devPlace(kind, p) {
  const k = KINDS[kind], g = TER.heightAt(p[0], p[2]);
  if ((k.place === 'seabed' || k.place === 'water') && g > -1.5) { UI.toast(k.name + '은(는) 바닷속에 놓아 주세요'); AUDIO.nope(); return; }
  if (k.place === 'ground' && g < 0.3 && k.beh !== 'static') { UI.toast(k.name + '은(는) 땅 위에 놓아 주세요'); AUDIO.nope(); return; }
  devSnapshot(false);
  const e = newElem(kind, p[0], placeY(kind, p), p[2], Math.random() * TAU, 1); SCN.elems.push(e); SCN.sel = e;
  if (k.beh === 'rock') stampRocks(); buildLabels(); UI.devRefresh(); saveLater(); AUDIO.pop(); UI.toast(k.name + ' 추가!');
}
function devMoveSel(p) {
  const e = SCN.sel; if (!e) return; const k = KINDS[e.kind];
  e.x = p[0]; e.z = p[2]; if (k.place !== 'water' && k.place !== 'air') e.y = placeY(e.kind, p); else if (k.place === 'water') e.y = Math.max(Math.min(e.y, -1), TER.heightAt(e.x, e.z) + 1.5);
  layoutElem(e); if (k.beh === 'rock') stampRocks();
}
function devSculpt(p, dt) {
  const b = DEV.brush, amt = b.s * dt * (b.mode === 'up' || b.mode === 'down' ? 9 : 10);
  TER.sculpt(p[0], p[2], b.r, b.mode, amt, DEV.flatH);
}

/* ---------- mode manager ---------- */
const MODE = {
  cur: 'observer',
  set(m) {
    if (m === this.cur && m !== 'observer') return;
    if (FOCUS.active) FOCUS.restore(true);
    const prev = this.cur; this.cur = m; SCN.sel = null; R.brush[3] = 0;
    document.body.classList.remove('m-observer', 'm-explorer', 'm-dev', 'm-quiz', 'm-tour'); document.body.classList.add('m-' + m);
    if (m === 'explorer' && prev !== 'explorer') { if (!EXP.placed) { expTeleport([199, TER.heightAt(199, 186), 186], Math.PI); EXP.placed = true; } UI.toast('탐험가 모드: 움직여 보고, 궁금한 것을 눌러 보세요!'); }
    if (prev === 'tour' && m !== 'tour') TOUR.close();
    AUDIO.engine(m === 'explorer' && EXP.state === 'boat'); R.speedFx = 0;
    if (m === 'tour') TOUR.open();
    if (m === 'observer' || m === 'dev' || m === 'quiz') { if (prev === 'explorer') { const c = R.cam; OBS.t = V3.add(c.pos, V3.mul(c.fwd, 40)); OBS.d = 40; OBS.yaw = c.yaw; OBS.pitch = Math.min(c.pitch, -0.2); obsFly(PRESETS.dong, 2); } }
    if (m === 'quiz') QUIZ.open();
    UI.modeChanged(m);
  },
  update(dt) {
    if (FOCUS.active) { if (this.cur === 'explorer') { /* keep player still */ } return; }
    if (this.cur === 'explorer') expUpdate(dt); else if (this.cur === 'tour' && TOUR.fly) TOUR.update(dt); else obsUpdate(dt);
    if (this.cur === 'dev' && DEV.sculpting && DEV.lastP) devSculpt(DEV.lastP, dt);
  }
};

/* ---------- pointer input ---------- */
function setupInput() {
  const cv = R.canvas;
  cv.addEventListener('contextmenu', e => e.preventDefault());
  cv.addEventListener('pointerdown', e => {
    cv.setPointerCapture(e.pointerId); AUDIO.unlock();
    const p = { id: e.pointerId, x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t0: performance.now(), btn: e.button, type: e.pointerType, moved: 0, role: null };
    INPUT.ptrs.set(e.pointerId, p);
    if (FOCUS.active) { p.role = 'none'; return; }
    OBS.anim = null;
    if (MODE.cur === 'explorer') {
      const w = cv.clientWidth, h = cv.clientHeight;
      if (e.pointerType !== 'mouse' && e.clientX < w * 0.45 && e.clientY > h * 0.35 && !INPUT.joy) { p.role = 'joy'; INPUT.joy = { id: e.pointerId, bx: e.clientX, by: e.clientY }; UI.joy(true, e.clientX, e.clientY, 0, 0); }
      else p.role = 'look';
    } else if (MODE.cur === 'dev' && INPUT.ptrs.size === 1 && e.button === 0) {
      if (DEV.tool === 'sculpt') { const hit = worldHit(e.clientX, e.clientY, false); if (hit) { p.role = 'sculpt'; devSnapshot(true); DEV.sculpting = true; DEV.lastP = hit; DEV.flatH = TER.heightAt(hit[0], hit[2]); } }
      else if (DEV.tool === 'select' && SCN.sel) {
        const pk = scenePick(R.cam.pos, screenRay(e.clientX, e.clientY), R.time, x => x === SCN.sel);
        if (pk) { p.role = 'drag'; devSnapshot(false); DEV.dragging = true; }
      }
    }
    if (!p.role) p.role = (e.button === 2 || e.button === 1 || e.shiftKey) ? 'pan' : 'orbit';
  });
  cv.addEventListener('pointermove', e => {
    const p = INPUT.ptrs.get(e.pointerId);
    if (!p) { if (MODE.cur === 'dev' && DEV.tool === 'sculpt') { const hit = worldHit(e.clientX, e.clientY, false); R.brush = hit ? [hit[0], 0, hit[2], DEV.brush.r] : [0, 0, 0, 0]; } return; }
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.moved += Math.abs(dx) + Math.abs(dy); p.x = e.clientX; p.y = e.clientY;
    if (p.role === 'none') return;
    const n = INPUT.ptrs.size;
    if (MODE.cur === 'explorer') {
      if (p.role === 'joy') { const J = INPUT.joy; let jx = (e.clientX - J.bx) / 60, jy = (e.clientY - J.by) / 60; const l = Math.hypot(jx, jy); if (l > 1) { jx /= l; jy /= l; } EXP.move = [jx, -jy]; EXP.run = l > 1.35; UI.joy(true, J.bx, J.by, jx, jy); }
      else if (p.role === 'look') { const s = p.type === 'mouse' ? 0.0032 : 0.0055; if (EXP.state === 'boat') { EXP.bcam += dx * s; EXP.belev = clamp(EXP.belev + dy * s * 0.6, 0.06, 1.1); } else if (EXP.state !== 'trans') { EXP.yaw += dx * s; EXP.pitch = clamp(EXP.pitch - dy * s, -1.35, 1.35); } }
      return;
    }
    if (p.role === 'sculpt') { const hit = worldHit(e.clientX, e.clientY, false); if (hit) { DEV.lastP = hit; R.brush = [hit[0], 0, hit[2], DEV.brush.r]; } return; }
    if (p.role === 'drag') { const hit = worldHit(e.clientX, e.clientY, true); if (hit) devMoveSel(hit); return; }
    if (n >= 2) { multiTouch(); return; }
    if (p.role === 'pan') obsPan(dx, dy);
    else { const s = p.type === 'mouse' ? 1 : 1.4; OBS.vy = dx * 0.0042 * s; OBS.vp = -dy * 0.0034 * s; OBS.yaw += OBS.vy; OBS.pitch = clamp(OBS.pitch + OBS.vp, -1.52, 0.35); OBS.vy *= 0.5; OBS.vp *= 0.5; }
  });
  const end = e => {
    const p = INPUT.ptrs.get(e.pointerId); if (!p) return; INPUT.ptrs.delete(e.pointerId); INPUT.pinch = null;
    if (p.role === 'joy') { INPUT.joy = null; EXP.move = [0, 0]; EXP.run = false; UI.joy(false); }
    if (p.role === 'sculpt') { DEV.sculpting = false; TER.relight(); relayoutAll(); saveLater(); }
    if (p.role === 'drag') { DEV.dragging = false; saveLater(); UI.devRefresh(); buildLabels(); }
    if (e.type === 'pointerup' && p.moved < 10 && performance.now() - p.t0 < 400 && INPUT.ptrs.size === 0 && p.role !== 'joy') {
      const now = performance.now(), dbl = now - INPUT.lastTap < 320 && Math.hypot(e.clientX - INPUT.lastTapXY[0], e.clientY - INPUT.lastTapXY[1]) < 30;
      INPUT.lastTap = dbl ? 0 : now; INPUT.lastTapXY = [e.clientX, e.clientY];
      if (dbl) onDoubleTap(e.clientX, e.clientY); else onTap(e.clientX, e.clientY);
    }
  };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  cv.addEventListener('wheel', e => { e.preventDefault(); if (MODE.cur === 'explorer' || FOCUS.active) return; obsZoom(Math.exp(e.deltaY * (e.deltaMode ? 0.05 : 0.0012)), e.clientX, e.clientY); }, { passive: false });
  addEventListener('keydown', e => { if (e.target.tagName === 'INPUT') return; INPUT.keys[e.code] = true; if (e.code === 'Escape' && FOCUS.active) FOCUS.close(); if (e.code === 'KeyF' && MODE.cur === 'explorer') expDive(); });
  addEventListener('keyup', e => { INPUT.keys[e.code] = false; });
  addEventListener('blur', () => { INPUT.keys = {}; });
}
function multiTouch() {
  const pts = [...INPUT.ptrs.values()].slice(0, 2); if (pts.length < 2) return;
  const mx = (pts[0].x + pts[1].x) / 2, my = (pts[0].y + pts[1].y) / 2, span = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y), ang = Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x);
  const P = INPUT.pinch;
  if (P) {
    obsZoom(P.span / Math.max(span, 1));
    let da = ang - P.ang; if (da > Math.PI) da -= TAU; if (da < -Math.PI) da += TAU; OBS.yaw -= da;
    obsPan(mx - P.mx, my - P.my);
    OBS.pitch = clamp(OBS.pitch - (my - P.my) * 0.0 , -1.52, 0.35);
  }
  INPUT.pinch = { mx, my, span, ang };
}
function onTap(x, y) {
  if (FOCUS.active || MODE.cur === 'tour') return;
  const d = screenRay(x, y), o = R.cam.pos;
  if (MODE.cur === 'dev') {
    if (DEV.place) { const hit = worldHit(x, y, true); if (hit) devPlace(DEV.place, hit); return; }
    if (DEV.tool === 'sculpt') return;
    const pk = scenePick(o, d, R.time); const th = TER.raycast(o, d);
    SCN.sel = pk && (!th || pk.t < th.t + 3) ? pk.e : null; UI.devRefresh(); if (SCN.sel) AUDIO.tick(); return;
  }
  const pk = scenePick(o, d, R.time), th = TER.raycast(o, d);
  let tw = (!R.under && d[1] < 0) ? -o[1] / d[1] : null;
  if (pk && (!th || pk.t < th.t + 2)) { const k = KINDS[pk.e.kind]; openInfo({ e: pk.e, sub: pk.sub }, kindInfo(pk.e.kind)); return; }
  if (tw !== null && (!th || tw < th.t)) { const p = [o[0] + d[0] * tw, 0, o[2] + d[2] * tw]; openInfo({ p, r: 14 }, AREA_INFO.sea, 'sea'); return; }
  if (th) { const a = areaAt(th.p); openInfo({ p: th.p, r: a === 'cheonjang' ? 22 : 18 }, AREA_INFO[a], a); }
}
function onDoubleTap(x, y) {
  if (MODE.cur === 'explorer' || MODE.cur === 'tour' || FOCUS.active) return;
  const hit = worldHit(x, y, true); if (!hit) return;
  obsFly({ t: hit, d: Math.max(30, OBS.d * 0.45), yaw: OBS.yaw, pitch: OBS.pitch }, 1.1);
}
function kindInfo(id) { const k = KINDS[id]; return { id, name: k.name, icon: k.icon, group: GROUPS[k.group], where: k.where, desc: k.desc, fact: k.fact }; }
function openInfo(target, info, areaId) {
  if (areaId) info = Object.assign({ id: 'area:' + areaId }, info);
  DEX.discover(info);
  if (MODE.cur === 'explorer') FOCUS.start(target, info);
  else UI.infoCard(info, target);
}
