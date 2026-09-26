"use strict";
/* ===== 12 game: 강치와 독도 한 바퀴 수영 경주 ===== */
const GTYPES = {
  damsel: { band: 'surf', bonus: 1, label: '자리돔', kind: 'damsel', sc: 3.2, n: 5, w: 22 },
  squid: { band: 'deep', bonus: 2, label: '오징어', kind: 'squid', sc: 4, n: 1, w: 12 },
  shrimp: { band: 'deep', bonus: 2, label: '독도새우', kind: 'shrimp', sc: 6, n: 3, w: 8 },
  jelly: { band: 'surf', hurt: '해파리에 쏘였어요!', kind: 'jelly', sc: 3.2, n: 1, w: 19 },
  trash: { band: 'surf', hurt: '바다 쓰레기에 걸렸어요! 바다를 깨끗이 해요', kind: 'trash', sc: 2.6, n: 1, w: 15 },
  net: { band: 'deep', hurt: '버려진 그물에 걸렸어요!', kind: 'net', sc: 1.35, n: 1, w: 10 },
  gull: { band: 'air', hurt: '갈매기와 부딪혔어요!', kind: 'gull', sc: 2.2, n: 1, w: 12 }
};
const GAME = {
  on: false, state: 'idle', LANE: 4.5, BASE: 21, RIVAL: 21.8,
  records: JSON.parse(localStorage.getItem('dokdo3d.race') || '[]'),
  built: false,
  build() {
    if (this.built) return; this.built = true;
    const C = [-15, -25], N = 128, need = [], rs = [];
    const X0 = TER.X0 + 28, X1 = TER.X0 + TER.SIZE_X - 28, Z0 = TER.Z0 + 28, Z1 = TER.Z0 + TER.SIZE_Z - 28;
    for (let i = 0; i < N; i++) {
      const a = i / N * TAU, dx = Math.cos(a), dz = Math.sin(a); let far = 0, rmax = 0;
      for (let r = 0; r < 800; r += 4) {
        const x = C[0] + dx * r, z = C[1] + dz * r; if (x < X0 || x > X1 || z < Z0 || z > Z1) break; rmax = r;
        if (TER.heightAt(x, z) > -3.5 || stampAt(x, z) > -1) far = r;
      }
      need.push(Math.min(far + 42, rmax)); rs.push(need[i]);
    }
    for (let pass = 0; pass < 6; pass++) { const c = rs.slice(); for (let i = 0; i < N; i++) rs[i] = Math.max(need[i], (c[(i + N - 1) % N] + c[i] * 2 + c[(i + 1) % N]) / 4); }
    const i0 = Math.round(Math.atan2(215, 215) / TAU * N), P = [];
    for (let k = 0; k < N; k++) { const i = (i0 + k) % N, a = i / N * TAU; P.push([C[0] + Math.cos(a) * rs[i], C[1] + Math.sin(a) * rs[i]]); }
    const px = [], pz = [], cum = [0];
    for (let k = 0; k < N; k++) {
      const p0 = P[(k + N - 1) % N], p1 = P[k], p2 = P[(k + 1) % N], p3 = P[(k + 2) % N];
      for (let j = 0; j < 8; j++) {
        const t = j / 8, t2 = t * t, t3 = t2 * t, f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        px.push(f(p0[0], p1[0], p2[0], p3[0])); pz.push(f(p0[1], p1[1], p2[1], p3[1]));
      }
    }
    px.push(px[0]); pz.push(pz[0]);
    for (let i = 1; i < px.length; i++) cum.push(cum[i - 1] + Math.hypot(px[i] - px[i - 1], pz[i] - pz[i - 1]));
    this.rt = { px, pz, cum }; this.len = cum[cum.length - 1];
    $('#gLeft').onpointerdown = e => { e.preventDefault(); this.steer(-1); };
    $('#gRight').onpointerdown = e => { e.preventDefault(); this.steer(1); };
    $('#gJump').onpointerdown = e => { e.preventDefault(); this.jump(); };
    $('#gDive').onpointerdown = e => { e.preventDefault(); this.dive(); };
    addEventListener('keydown', e => {
      if (MODE.cur !== 'game' || this.state !== 'race' || e.repeat) return;
      const k = e.code;
      if (k === 'ArrowLeft' || k === 'KeyA') this.steer(-1); else if (k === 'ArrowRight' || k === 'KeyD') this.steer(1);
      else if (k === 'ArrowUp' || k === 'KeyW' || k === 'Space') this.jump(); else if (k === 'ArrowDown' || k === 'KeyS') this.dive(); else return;
      e.preventDefault();
    });
    let sw = null; const cv = R.canvas;
    cv.addEventListener('pointerdown', e => { if (MODE.cur === 'game') sw = [e.clientX, e.clientY, performance.now()]; });
    cv.addEventListener('pointerup', e => {
      if (MODE.cur !== 'game' || !sw || this.state !== 'race') return; const dx = e.clientX - sw[0], dy = e.clientY - sw[1]; sw = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 36) return;
      if (Math.abs(dx) > Math.abs(dy)) this.steer(dx > 0 ? 1 : -1); else if (dy < 0) this.jump(); else this.dive();
    });
  },
  at(s) {
    const { px, pz, cum } = this.rt, L = this.len; s = ((s % L) + L) % L;
    let lo = 0, hi = cum.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= s) lo = m; else hi = m; }
    const t = (s - cum[lo]) / Math.max(1e-6, cum[hi] - cum[lo]), x = lerp(px[lo], px[hi], t), z = lerp(pz[lo], pz[hi], t);
    let tx = px[hi] - px[lo], tz = pz[hi] - pz[lo]; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
    return { x, z, tx, tz, rx: -tz, rz: tx };
  },
  open() { this.build(); this.on = true; this.state = 'idle'; this.reset(); this.panelStart(); },
  close() { this.on = false; this.state = 'idle'; R.speedFx = 0; $('#gPanel').classList.remove('show'); $('#gMsg').textContent = ''; },
  reset() {
    this.p = { s: 0, lane: 0, lx: 0, y: 0, vy: 0, mode: 'surf', diveT: 0, speed: 0, boostT: 0, slowT: 0, invT: 0, score: 0, hits: 0, eaten: 0 };
    this.rv = { s: 0, y: 0, vy: 0, jumpT: 2.5, done: 0 }; this.t = 0; this.cp = 0; this.finish = 0; this.camYaw = null;
    const W = Object.entries(GTYPES), tot = W.reduce((a, [, g]) => a + g.w, 0), items = [];
    let s = 90;
    while (s < this.len - 60) {
      const pick = () => { let r = Math.random() * tot; for (const [id, g] of W) { r -= g.w; if (r <= 0) return id; } return 'damsel'; };
      const type = pick(), lane = Math.floor(Math.random() * 3) - 1;
      items.push({ s, lane, type, ph: Math.random() * 9 });
      if (!GTYPES[type].bonus && Math.random() < 0.3) { const l2 = [-1, 0, 1].filter(l => l !== lane)[Math.random() < 0.5 ? 0 : 1], t2 = ['jelly', 'trash', 'gull', 'net'][Math.floor(Math.random() * 4)]; items.push({ s: s + 2, lane: l2, type: t2, ph: Math.random() * 9 }); }
      s += 26 + Math.random() * 18;
    }
    this.items = items; this.bubT = 0;
  },
  start() {
    AUDIO.unlock(); this.reset(); this.state = 'count'; this.cd = 3.6; this.lastCd = 4; $('#gPanel').classList.remove('show');
    document.body.classList.add('g-racing');
  },
  steer(d) { if (this.state !== 'race') return; const p = this.p; const nl = clamp(p.lane + d, -1, 1); if (nl !== p.lane) { p.lane = nl; AUDIO.tick(); } },
  jump() { const p = this.p; if (this.state !== 'race' || p.mode !== 'surf') return; p.mode = 'jump'; p.vy = 8.2; AUDIO.jump(); PART.spray(R.cam.pos[0], 0.1, R.cam.pos[2], 14, 1.2); },
  dive() { const p = this.p; if (this.state !== 'race' || p.mode !== 'surf') return; p.mode = 'dive'; p.diveT = 1.35; AUDIO.whoosh(); FX.splash(R.cam.pos[0], R.cam.pos[2], 0.6, true); },
  fmt(t) { const m = Math.floor(t / 60), s = t - m * 60; return `${m}:${s < 10 ? '0' : ''}${s.toFixed(2)}`; },
  update(dt) {
    const p = this.p, c = R.cam;
    if (this.state === 'count') {
      this.cd -= dt; const n = Math.ceil(this.cd - 0.6);
      if (n !== this.lastCd) { this.lastCd = n; if (n > 0) { this.msg(String(n), 'cd'); AUDIO.tone(440, 0.18, 'square', 0.1); } else { this.msg('출발!', 'go'); AUDIO.tone(880, 0.45, 'square', 0.12); } }
      if (this.cd <= 0) this.state = 'race';
    } else if (this.state === 'race' || this.state === 'done') {
      if (this.state === 'race') this.t += dt;
      const target = (this.BASE + (p.boostT > 0 ? 9 : 0)) * (p.slowT > 0 ? 0.45 : 1) * (this.state === 'done' ? 0.4 : 1);
      p.speed = lerp(p.speed, target, Math.min(1, dt * (p.slowT > 0 ? 6 : 1.6)));
      p.boostT -= dt; p.slowT -= dt; p.invT -= dt;
      const prev = p.s; p.s += p.speed * dt;
      p.lx = lerp(p.lx, p.lane * this.LANE, Math.min(1, dt * 9));
      if (p.mode === 'jump') { p.vy -= 17 * dt; p.y += p.vy * dt; if (p.y <= 0) { p.y = 0; p.mode = 'surf'; addRipple(c.pos[0], c.pos[2], 0.5); AUDIO.splash(0.35); PART.spray(c.pos[0], 0.1, c.pos[2], 18, 1.4); } }
      else if (p.mode === 'dive') { p.diveT -= dt; p.y = lerp(p.y, p.diveT > 0 ? -2.8 : 0.05, Math.min(1, dt * 6)); if (p.diveT <= 0 && p.y > -0.25) { p.y = 0; p.mode = 'surf'; FX.surface(); } }
      const band = p.y > 1.1 ? 'air' : p.y < -1.4 ? 'deep' : 'surf';
      if (this.state === 'race') for (const it of this.items) {
        if (it.gone || it.s <= prev || it.s > p.s) continue;
        const g = GTYPES[it.type]; if (Math.abs(p.lx - it.lane * this.LANE) > 2.4 || g.band !== band) continue;
        if (g.bonus) { it.gone = true; p.score += g.bonus; p.eaten++; p.boostT = 2.2; AUDIO.discover(); this.msg(`+${g.bonus} ${g.label}! 부스트`, 'bonus'); }
        else if (p.invT <= 0) { it.gone = true; p.hits++; p.slowT = 1.1; p.invT = 1.6; AUDIO.bump(); FX.thud(8); this.msg(g.hurt, 'hurt'); }
      }
      // rival (rubber-banded so the race stays close)
      const rv = this.rv, gap = rv.s - p.s, rs = this.RIVAL + (gap > 55 ? -2.2 : gap < -35 ? 3.2 : 0) + Math.sin(this.t * 0.7) * 0.8;
      if (!rv.done) { rv.s += rs * dt; if (rv.s >= this.len) { rv.done = this.t; this.msg('강치가 먼저 들어왔어요! 힘내요!', 'hurt'); } }
      rv.jumpT -= dt; if (rv.jumpT < 0 && rv.y === 0) { rv.vy = 7; rv.jumpT = 3 + Math.random() * 3; }
      if (rv.vy || rv.y > 0) { rv.vy -= 16 * dt; rv.y = Math.max(0, rv.y + rv.vy * dt); if (rv.y === 0) rv.vy = 0; }
      // checkpoints & finish
      const q = Math.floor(p.s / this.len * 4);
      if (this.state === 'race' && q > this.cp && q < 4) { this.cp = q; this.msg(`구간 ${q} 통과 · ${this.fmt(this.t)} · ${p.s >= rv.s ? '1등!' : '2등'}`, 'split'); AUDIO.pop(); }
      if (this.state === 'race' && p.s >= this.len) this.end();
      // deep-bonus bubble hints
      this.bubT -= dt; if (this.bubT < 0) { this.bubT = 0.2; for (const it of this.items) { if (it.gone || GTYPES[it.type].band !== 'deep' || !GTYPES[it.type].bonus || it.s < p.s || it.s > p.s + 90) continue; const a = this.at(it.s); PART.bubbles(a.x + a.rx * it.lane * this.LANE, -2.2, a.z + a.rz * it.lane * this.LANE, 2, 0.6); } }
      R.speedFx = p.boostT > 0 ? 0.7 : 0.25;
    }
    // camera
    const a = this.at(p.s), f = this.at(p.s + 16), px = a.x + a.rx * p.lx, pz = a.z + a.rz * p.lx;
    let y = p.y + 0.55; if (p.mode !== 'dive') y = Math.max(y, waveHeight(px, pz) + 0.4); if (p.mode === 'dive') y = p.y;
    const lookX = f.x + f.rx * p.lx - px, lookZ = f.z + f.rz * p.lx - pz, wantYaw = Math.atan2(lookX, -lookZ);
    this.camYaw = this.camYaw === null ? wantYaw : angLerp(this.camYaw, wantYaw, Math.min(1, dt * 5));
    c.pos = [px, y, pz]; c.yaw = this.camYaw + (p.lane * this.LANE - p.lx) * 0.02; c.pitch = p.mode === 'jump' ? -0.18 : p.mode === 'dive' ? -0.05 : -0.07;
    c.near = 0.1; c.fov = lerp(c.fov, (74 + (p.boostT > 0 ? 10 : 0)) * Math.PI / 180, Math.min(1, dt * 3));
    this.hud();
  },
  msg(t, cls) { const m = $('#gMsg'); m.textContent = t; m.className = ''; void m.offsetWidth; m.className = 'show ' + (cls || ''); },
  hud() {
    if (!this.on) return; const p = this.p, rv = this.rv, L = this.len;
    $('#gTime').textContent = this.fmt(this.t); $('#gScore').textContent = p.score;
    $('#gMe').style.left = clamp(p.s / L, 0, 1) * 100 + '%'; $('#gRival').style.left = clamp(rv.s / L, 0, 1) * 100 + '%';
    const d = Math.round(p.s - rv.s); $('#gPos').textContent = d >= 0 ? `1등 · ${d}m 앞섬` : `2등 · ${-d}m 뒤짐`;
  },
  end() {
    const p = this.p, rv = this.rv; this.state = 'done'; document.body.classList.remove('g-racing');
    const rt = rv.done || this.t + (this.len - rv.s) / this.RIVAL, win = this.t <= rt, t = this.t;
    this.records.push({ t, win, score: p.score, d: new Date().toLocaleDateString('ko-KR') });
    this.records.sort((a, b) => a.t - b.t); this.records = this.records.slice(0, 5);
    localStorage.setItem('dokdo3d.race', JSON.stringify(this.records));
    const best = this.records[0].t === t;
    if (win) { AUDIO.fanfare(); FX.confetti(null, 150); } else AUDIO.wrong();
    this.panel(`<div class="gres ${win ? 'win' : 'lose'}">${win ? '🏆' : '🦭'}</div><h2>${win ? '우승! 강치를 이겼어요!' : '아쉬워요! 강치가 이겼어요'}</h2>
      <div class="gstats"><div><small>내 기록</small><b>${this.fmt(t)}</b></div><div><small>강치 기록</small><b>${this.fmt(rt)}</b></div><div><small>보너스</small><b>${p.score}</b></div><div><small>부딪힘</small><b>${p.hits}</b></div></div>
      ${best ? '<p class="gnew">🎉 새 최고 기록!</p>' : ''}${this.recHtml(t)}
      <div class="endbtns"><button class="big gull" id="gAgain">다시 도전</button><button class="big line" id="gOut">관찰자 모드로</button></div>`);
    $('#gAgain').onclick = () => this.start(); $('#gOut').onclick = () => MODE.set('observer');
  },
  recHtml(cur) {
    if (!this.records.length) return '';
    return `<div class="grec"><h3>🏅 이 기기의 최고 기록</h3>${this.records.map((r, i) => `<div class="${r.t === cur ? 'me' : ''}"><span>${i + 1}</span><b>${this.fmt(r.t)}</b><small>${r.win ? '승리' : '패배'} · 보너스 ${r.score} · ${r.d}</small></div>`).join('')}</div>`;
  },
  panelStart() {
    this.panel(`<div class="gres">🏁</div><h2>강치와 수영 경주!</h2>
      <p>강치 가이드와 독도를 한 바퀴(약 ${(this.len / 1000).toFixed(1)}km) 헤엄쳐요. 자동으로 앞으로 나아가요!</p>
      <div class="ghelp"><div><b>◀ ▶</b><span>줄 바꾸기</span></div><div><b>점프</b><span>물 위 장애물 뛰어넘기</span></div><div><b>잠수</b><span>물속 먹이 먹기·위 장애물 피하기</span></div></div>
      <p class="gsub">🐟 자리돔 · 🦑 오징어 · 🦐 독도새우를 먹으면 부스트! 🪼 해파리 · 🧴 쓰레기 · 🕸️ 그물 · 🕊️ 갈매기는 피해요.<br>키보드: ← → 이동, ↑·스페이스 점프, ↓ 잠수 · 태블릿: 버튼이나 밀기(스와이프)</p>
      ${this.recHtml(-1)}<div class="endbtns"><button class="big gull" id="gGo">출발!</button></div>`);
    $('#gGo').onclick = () => this.start();
  },
  panel(h) { const b = $('#gPanel'); b.innerHTML = h; b.classList.add('show'); },
  frame() { },
  instances(T, add) {
    const p = this.p; if (!p || !this.rt) return;
    for (const it of this.items) {
      if (it.gone || it.s < p.s - 15 || it.s > p.s + 240) continue;
      const g = GTYPES[it.type], a = this.at(it.s), bx = a.x + a.rx * it.lane * this.LANE, bz = a.z + a.rz * it.lane * this.LANE;
      const toward = Math.atan2(a.tz, -a.tx);
      const y = g.band === 'deep' ? -2.7 : g.band === 'air' ? 2.3 + Math.sin(T * 2 + it.ph) * 0.3 : (it.type === 'jelly' ? 0.35 : 0.08) + Math.sin(T * 1.5 + it.ph) * 0.08;
      if (it.type === 'net') { add('net', bx, -1.9, bz, g.sc, Math.atan2(-a.rz, a.rx), 0, 0, it.ph); continue; }
      for (let k = 0; k < g.n; k++) {
        const o = k ? [(Math.sin(k * 2.1 + it.ph) * 1.2), Math.cos(k * 1.7) * 0.25, Math.cos(k * 2.9 + it.ph) * 1.2] : [0, 0, 0];
        add(g.kind, bx + o[0], y + o[1], bz + o[2], g.sc, toward + Math.sin(T * 3 + k) * 0.15, 0, 0, it.ph + k);
      }
    }
    const rv = this.rv, r = this.at(rv.s), side = 8.5;
    add('racer', r.x + r.rx * side, rv.y - 0.25 + Math.sin(T * 5) * 0.05, r.z + r.rz * side, 2.3, Math.atan2(-r.tz, r.tx), rv.vy * 0.06, 0, T);
  }
};
