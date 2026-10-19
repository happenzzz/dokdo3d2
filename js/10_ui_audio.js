"use strict";
/* ===== 10 ui, audio, fx, boot ===== */
const AUDIO = {
  on: localStorage.getItem('dokdo3d.sound') !== 'off', ctx: null,
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    if (!this.on) return;
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    const c = this.ctx; this.master = c.createGain(); this.master.gain.value = 0.8; this.master.connect(c.destination);
    const len = c.sampleRate * 3, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0); let last = 0;
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.2; }
    this.noiseBuf = buf;
    const src = c.createBufferSource(); src.buffer = buf; src.loop = true;
    this.amF = c.createBiquadFilter(); this.amF.type = 'lowpass'; this.amF.frequency.value = 900;
    this.amG = c.createGain(); this.amG.gain.value = 0.16;
    const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 0.13; lg.gain.value = 0.07; lfo.connect(lg); lg.connect(this.amG.gain); lfo.start();
    src.connect(this.amF); this.amF.connect(this.amG); this.amG.connect(this.master); src.start();
    this.gullT = 4;
  },
  setOn(v) { this.on = v; localStorage.setItem('dokdo3d.sound', v ? 'on' : 'off'); if (!v && this.ctx) this.ctx.suspend(); if (v) { if (this.ctx) this.ctx.resume(); else this.unlock(); } },
  update(dt) {
    if (!this.ctx || !this.on) return; const t = this.ctx.currentTime;
    this.amF.frequency.setTargetAtTime(R.under ? 260 : 900, t, 0.25);
    this.gullT -= dt;
    if (this.gullT < 0) { this.gullT = 5 + Math.random() * 9; if (!R.under && R.cam.pos[1] < 400) this.gull(); }
  },
  tone(f, dur, type = 'sine', vol = 0.2, f2, delay = 0) {
    if (!this.ctx || !this.on) return; const c = this.ctx, t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.05);
  },
  noise(dur, f0, f1, vol, q = 1, delay = 0) {
    if (!this.ctx || !this.on) return; const c = this.ctx, t = c.currentTime + delay, s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noiseBuf; fl.type = 'bandpass'; fl.Q.value = q; fl.frequency.setValueAtTime(f0, t); fl.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(this.master); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  },
  splash(s = 1) { this.noise(0.9 * s + 0.3, 2400, 300, 0.9 * Math.min(s, 1.5), 0.7); this.tone(90, 0.35, 'sine', 0.35 * s, 45); this.noise(0.5, 800, 5000, 0.2, 2, 0.08); },
  bubble() { for (let i = 0; i < 3; i++) this.tone(300 + Math.random() * 500, 0.08, 'sine', 0.05, 900 + Math.random() * 600, i * 0.07); },
  gull() { const f = 1300 + Math.random() * 300; this.tone(f, 0.35, 'sawtooth', 0.025, f * 0.7); this.tone(f * 1.05, 0.3, 'sawtooth', 0.02, f * 0.72, 0.4); },
  correct() { [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.25, 'triangle', 0.18, null, i * 0.08)); },
  wrong() { this.tone(180, 0.35, 'square', 0.08, 120); this.tone(150, 0.4, 'square', 0.06, 100, 0.15); },
  fanfare() { [523, 659, 784, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.16, null, i * 0.12)); },
  pop() { this.tone(600, 0.1, 'sine', 0.15, 1200); }, tick() { this.tone(1400, 0.05, 'square', 0.04); },
  nope() { this.tone(220, 0.15, 'triangle', 0.12, 160); }, focus() { this.noise(0.8, 300, 2400, 0.12, 1.5); this.tone(440, 0.6, 'sine', 0.05, 880); },
  whoosh() { this.noise(0.5, 400, 2000, 0.25, 1); }, discover() { [784, 988, 1318].forEach((f, i) => this.tone(f, 0.22, 'sine', 0.14, null, i * 0.09)); }
};

Object.assign(AUDIO, {
  engine(on) {
    if (!this.ctx || !this.on) { this.engOn = false; return; }
    const c = this.ctx;
    if (on && !this.eng) {
      const o = c.createOscillator(), o2 = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
      o.type = 'sawtooth'; o2.type = 'square'; o.frequency.value = 48; o2.frequency.value = 24.5; f.type = 'lowpass'; f.frequency.value = 320; g.gain.value = 0.0001;
      o.connect(f); o2.connect(f); f.connect(g); g.connect(this.master); o.start(); o2.start(); this.eng = { o, o2, f, g };
      g.gain.setTargetAtTime(0.05, c.currentTime, 0.3); this.tone(70, 0.4, 'sawtooth', 0.08, 110);
    } else if (!on && this.eng) { const e = this.eng; e.g.gain.setTargetAtTime(0.0001, c.currentTime, 0.2); setTimeout(() => { try { e.o.stop(); e.o2.stop(); } catch (x) { } }, 900); this.eng = null; }
  },
  engineSet(v) { if (!this.eng) return; const t = this.ctx.currentTime; this.eng.o.frequency.setTargetAtTime(48 + v * 70, t, 0.2); this.eng.o2.frequency.setTargetAtTime(24.5 + v * 35, t, 0.2); this.eng.f.frequency.setTargetAtTime(320 + v * 900, t, 0.2); this.eng.g.gain.setTargetAtTime(0.05 + v * 0.07, t, 0.2); },
  horn() { this.tone(146, 1.1, 'sawtooth', 0.12, 140); this.tone(220, 1.1, 'sawtooth', 0.08, 214); },
  grip() { this.noise(0.12, 900, 400, 0.25, 2); this.tone(160 + Math.random() * 60, 0.08, 'triangle', 0.05); },
  jump() { this.tone(300, 0.22, 'sine', 0.12, 700); },
  bump() { this.tone(70, 0.4, 'sine', 0.4, 40); this.noise(0.3, 500, 150, 0.4, 1); }
});
const FX = {
  splash(x, z, s, cam) {
    addRipple(x, z, s); PART.spray(x, 0.05, z, Math.round(70 * s), 2 + s * 1.6); PART.bubbles(x, -0.9, z, Math.round(40 * s), 1.4); AUDIO.splash(s);
    if (cam) { const el = $('#fxSplash'); el.classList.remove('go'); void el.offsetWidth; el.classList.add('go'); }
  },
  surface() { const el = $('#fxDrops'); el.classList.remove('go'); void el.offsetWidth; el.classList.add('go'); AUDIO.splash(0.35); addRipple(R.cam.pos[0], R.cam.pos[2], 0.5); },
  thud(v) { if (v > 4) { document.body.classList.remove('shakeAll'); void document.body.offsetWidth; document.body.classList.add('shakeAll'); } },
  stamp(ok) { const el = $('#fxStamp'); el.textContent = ok ? '정답!' : '땡!'; el.className = ok ? 'ok' : 'bad'; void el.offsetWidth; el.classList.add('go'); },
  confetti(btn, n = 70) {
    const cv = $('#confetti'), c = cv.getContext('2d'); cv.width = innerWidth; cv.height = innerHeight;
    let x = innerWidth / 2, y = innerHeight / 2; if (btn) { const r = btn.getBoundingClientRect(); x = r.left + r.width / 2; y = r.top + r.height / 2; }
    const cols = ['#35B3C4', '#E0A262', '#B9A4F5', '#F4CD55', '#5AD39B', '#ffffff'];
    this.cf = (this.cf || []).concat(Array.from({ length: n }, () => ({ x, y, vx: (Math.random() - .5) * 14, vy: -Math.random() * 13 - 4, r: Math.random() * TAU, vr: (Math.random() - .5) * 0.4, w: 6 + Math.random() * 7, h: 4 + Math.random() * 5, c: cols[(Math.random() * cols.length) | 0], life: 1 })));
    if (this.cfRun) return; this.cfRun = true;
    const step = () => {
      c.clearRect(0, 0, cv.width, cv.height); this.cf = this.cf.filter(p => p.life > 0);
      for (const p of this.cf) { p.vy += 0.45; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life -= 0.012; c.save(); c.globalAlpha = Math.min(1, p.life * 2); c.translate(p.x, p.y); c.rotate(p.r); c.fillStyle = p.c; c.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); c.restore(); }
      if (this.cf.length) requestAnimationFrame(step); else { this.cfRun = false; c.clearRect(0, 0, cv.width, cv.height); }
    };
    step();
  }
};

const DEX = {
  set: new Set(JSON.parse(localStorage.getItem('dokdo3d.dex') || '[]')),
  all() { const ids = [...new Set(DEFAULT_ELEMS.map(e => e[0]))].filter(id => KINDS[id]); return ids.concat(Object.keys(AREA_INFO).map(a => 'area:' + a)); },
  info(id) { return id.startsWith('area:') ? Object.assign({ id }, AREA_INFO[id.slice(5)]) : kindInfo(id); },
  discover(info) {
    if (!info || !info.id || this.set.has(info.id)) return false;
    this.set.add(info.id); localStorage.setItem('dokdo3d.dex', JSON.stringify([...this.set]));
    const n = this.all().filter(i => this.set.has(i)).length; UI.dexCount();
    setTimeout(() => { UI.toast(`📖 도감에 새로 등록! 「${info.name}」 (${n}/${this.all().length})`); AUDIO.discover(); }, 400);
    return true;
  }
};

let saveTimer = null;
function saveLater() { clearTimeout(saveTimer); saveTimer = setTimeout(saveNow, 700); }
function saveNow() {
  try { localStorage.setItem('dokdo3d.scene', JSON.stringify({ v: 2, elems: sceneSerialize(), ter: TER.serialize(), sea: seaState() })); UI.saved(); }
  catch (e) { UI.toast('저장 공간이 부족해서 자동 저장을 못 했어요. 파일로 내보내 주세요.'); }
}
function loadSaved() { try { return JSON.parse(localStorage.getItem('dokdo3d.scene') || 'null'); } catch (e) { return null; } }
const TINTS = { base: [1, 1, 1], emerald: [0.75, 1.2, 1.0], cobalt: [0.7, 0.95, 1.35], deep: [0.6, 0.8, 1.05] };
function seaState() { return { amp: R.waveAmp, speed: R.waveSpeed, clarity: R.clarity, tint: R.tintName || 'base' }; }
function applySea(s) { if (!s) return; R.waveAmp = s.amp ?? 1; R.waveSpeed = s.speed ?? 1; R.clarity = s.clarity ?? 0.75; R.tintName = s.tint || 'base'; R.tint = TINTS[R.tintName] || TINTS.base; }
function applyScene(data) {
  SCN.sel = null; if (data.ter) TER.deserialize(data.ter); else TER.reset();
  sceneInit(data); applySea(data.sea); buildLabels(); UI.devRefresh(); saveLater();
}

const UI = {
  autoRotate: false, focusSpin: true,
  init() {
    $$('#tabs .tab').forEach(b => b.onclick = () => { AUDIO.unlock(); AUDIO.tick(); MODE.set(b.dataset.m); });
    $$('#obsHud [data-p]').forEach(b => b.onclick = () => { obsFly(PRESETS[b.dataset.p]); AUDIO.tick(); });
    $('#bLabels').onclick = e => { LABELS.on = !LABELS.on; e.currentTarget.classList.toggle('on', LABELS.on); };
    $('#bRotate').onclick = e => { this.autoRotate = !this.autoRotate; e.currentTarget.classList.toggle('on', this.autoRotate); };
    $('#bSound').onclick = () => { AUDIO.setOn(!AUDIO.on); this.soundIcon(); }; this.soundIcon();
    $('#bDex').onclick = () => this.openDex(); $('#bSet').onclick = () => this.openSettings(); $('#bHelp').onclick = () => this.openHelp();
    $('#modal').onclick = e => { if (e.target.id === 'modal') this.closeModal(); };
    $('#bDive').onclick = () => { AUDIO.unlock(); expDive(); };
    addEventListener('keydown', e => { if (MODE.cur !== 'explorer' || e.target.tagName === 'INPUT' || e.repeat) return; if (e.code === 'KeyJ' || (e.code === 'Space' && EXP.state === 'walk')) expJump(); if (e.code === 'KeyB') EXP.state === 'boat' ? boatLeave(false) : boatBoard(); if (e.code === 'KeyG') $('#bClimb').click(); if (e.code === 'KeyH' && EXP.state === 'boat') AUDIO.horn(); });
    $('#bSurf').onclick = () => { EXP.ascend = true; };
    $('#bRun').onclick = e => { EXP.runLock = !EXP.runLock; EXP.run = EXP.runLock; e.currentTarget.classList.toggle('on', EXP.runLock); };
    $('#bQuay').onclick = () => { AUDIO.unlock(); expGoQuay(); };
    $('#bJump').onclick = () => { AUDIO.unlock(); expJump(); };
    $('#bSwim').onclick = () => { AUDIO.unlock(); expSwim(); };
    $('#bBoat').onclick = () => { AUDIO.unlock(); boatBoard(); };
    $('#bLeave').onclick = () => boatLeave(false);
    $('#bHorn').onclick = () => { AUDIO.unlock(); AUDIO.horn(); };
    $('#bClimb').onclick = () => { AUDIO.unlock(); EXP.climb = !EXP.climb; AUDIO.tick(); this.toast(EXP.climb ? '🧗 등반 모드! 절벽 쪽으로 밀면 붙잡고 올라가요' : '등반 모드를 껐어요'); this.expHud(); };
    $('#bNight').onclick = () => { AUDIO.unlock(); NIGHT.set(!R.night); };
    $('#bMore').onclick = e => { e.stopPropagation(); document.body.classList.toggle('toolsOpen'); };
    $('#top .tools').addEventListener('click', () => setTimeout(() => document.body.classList.remove('toolsOpen'), 150));
    document.addEventListener('pointerdown', e => { if (!e.target.closest('#top')) document.body.classList.remove('toolsOpen'); });
    const fsOk = document.fullscreenEnabled || document.webkitFullscreenEnabled;
    if (!fsOk) $('#bFull').style.display = 'none';
    $('#bFull').onclick = () => this.toggleFull();
    const fsChange = () => { const on = !!(document.fullscreenElement || document.webkitFullscreenElement); $('#bFull').textContent = on ? '🗗' : '⛶'; $('#bFull').title = on ? '전체화면 끝내기' : '전체화면'; setTimeout(resize, 120); };
    document.addEventListener('fullscreenchange', fsChange); document.addEventListener('webkitfullscreenchange', fsChange);
    if (localStorage.getItem('dokdo3d.night') === '1') NIGHT.set(true, true);
    for (const [id, v] of [['#bUp', 1], ['#bDown', -1]]) { const b = $(id); b.onpointerdown = e => { e.preventDefault(); EXP.vert = v; }; b.onpointerup = b.onpointerleave = b.onpointercancel = () => { EXP.vert = 0; }; }
    $('#devToggle').onclick = () => document.body.classList.toggle('devMin');
    $$('#devPanel .dtabs button').forEach(b => b.onclick = () => { $$('#devPanel .dtabs button').forEach(x => x.classList.toggle('on', x === b)); this.devTab = b.dataset.t; this.devRefresh(); });
    this.devTab = 'elems'; this.dexCount();
    if (localStorage.getItem('dokdo3d.fps') === 'on') document.body.classList.add('showFps');
  },
  toggleFull() {
    const d = document, el = d.documentElement;
    if (d.fullscreenElement || d.webkitFullscreenElement) { (d.exitFullscreen || d.webkitExitFullscreen).call(d); return; }
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!req) { this.toast('이 기기에서는 전체화면을 쓸 수 없어요'); return; }
    try { const r = req.call(el, { navigationUI: 'hide' }); if (r && r.catch) r.catch(() => this.toast('전체화면을 열 수 없어요. 새 창에서 열어 보세요')); } catch (e) { this.toast('전체화면을 열 수 없어요'); }
  },
  closeIntro(m) { AUDIO.unlock(); $('#intro').classList.add('hide'); setTimeout(() => $('#intro').remove(), 600); MODE.set(m); },
  soundIcon() { $('#bSound').textContent = AUDIO.on ? '🔊' : '🔇'; },
  modeChanged(m) {
    $$('#tabs .tab').forEach(b => b.classList.toggle('on', b.dataset.m === m));
    this.hideInfo(); this.hideDetail(); if (m === 'dev') this.devRefresh();
    if (m !== 'explorer') this.joy(false);
  },
  toast(msg) {
    const t = document.createElement('div'); t.className = 't'; t.textContent = msg; $('#toast').appendChild(t);
    setTimeout(() => t.classList.add('out'), 2600); setTimeout(() => t.remove(), 3100);
    while ($('#toast').children.length > 3) $('#toast').firstChild.remove();
  },
  infoCard(info, target) {
    const c = $('#infoCard');
    c.innerHTML = `<div class="ichead"><span class="icon">${info.icon}</span><div><b>${info.name}</b><small>${info.group} · ${info.where}</small></div><button class="x" aria-label="닫기">✕</button></div>
      <p>${info.desc}</p><div class="icbtns"><button class="big sea" id="icMore">🔍 가까이 보기</button></div>`;
    c.classList.add('show'); AUDIO.pop();
    c.querySelector('.x').onclick = () => this.hideInfo();
    $('#icMore').onclick = () => { this.hideInfo(); FOCUS.start(target, info); };
  },
  hideInfo() { $('#infoCard').classList.remove('show'); },
  showDetail(info, e) {
    const d = $('#detail');
    d.innerHTML = `<div class="dhandle"></div><div class="dhead"><span class="icon">${info.icon}</span><div><h2>${info.name}</h2><div class="chips"><span class="chip2">${info.group}</span><span class="chip2 where">📍 ${info.where}</span></div></div></div>
      <p class="ddesc">${info.desc}</p><div class="dfact"><b>💡 알아 두기</b><p>${info.fact}</p></div>
      <div class="dbtns"><button class="big line" id="dSpeak">🔈 읽어 주기</button><button class="big line" id="dSpin">⏸ 회전 멈춤</button><button class="big sea" id="dClose">닫기</button></div>`;
    d.classList.add('show');
    $('#dClose').onclick = () => FOCUS.close();
    $('#dSpin').onclick = ev => { this.focusSpin = !this.focusSpin; ev.currentTarget.textContent = this.focusSpin ? '⏸ 회전 멈춤' : '▶ 회전하기'; };
    $('#dSpeak').onclick = () => this.speak(`${info.name}. ${info.desc} ${info.fact}`);
  },
  hideDetail() { $('#detail').classList.remove('show'); if (window.speechSynthesis) speechSynthesis.cancel(); },
  speak(text) {
    if (!window.speechSynthesis) { this.toast('이 브라우저는 읽어 주기를 지원하지 않아요'); return; }
    speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text.replace(/[()「」]/g, ' ')); u.lang = 'ko-KR'; u.rate = 0.95;
    const v = speechSynthesis.getVoices().find(v => v.lang && v.lang.startsWith('ko')); if (v) u.voice = v; speechSynthesis.speak(u);
  },
  expHud() {
    const E = EXP, s = E.state, depth = Math.max(0, -R.cam.pos[1]);
    const txt = s === 'walk' && E.climb ? (E.climbing ? '🧗 절벽을 오르는 중!' : '🧗 등반 모드') : { walk: '🚶 걷는 중', fall: E.jumped ? '🦘 점프!' : '😱 떨어지는 중!', plunge: '🌊 풍덩!', swim: `🤿 잠수 중 · 수심 ${depth.toFixed(1)}m`, float: '🏊 바다 위에서 헤엄치는 중', trans: '✨ 이동 중…', boat: `🚤 배 운전 중 · ${Math.round(Math.abs(E.bspd || 0) * 3.6)} km/h` }[s];
    if (this._st !== txt) { $('#expState').textContent = txt; this._st = txt; }
    const cls = 'es-' + s;
    if (this._cls !== cls) {
      document.body.classList.remove('es-walk', 'es-fall', 'es-plunge', 'es-swim', 'es-float', 'es-trans', 'es-boat'); document.body.classList.add(cls); this._cls = cls;
      $('#bDive span').textContent = s === 'walk' || s === 'boat' ? '뛰어들기' : s === 'swim' ? '더 깊이' : '잠수';
      $('#bRun span').textContent = s === 'boat' ? '빠르게' : '달리기';
    }
    $('#bClimb').classList.toggle('on', !!E.climb);
  },
  hintBtn(sel) { const b = $(sel); if (!b) return; b.classList.remove('hint'); void b.offsetWidth; b.classList.add('hint'); setTimeout(() => b.classList.remove('hint'), 3200); },
  joy(show, x, y, jx = 0, jy = 0) {
    const j = $('#joy'); j.classList.toggle('show', !!show); if (!show) return;
    j.style.left = x + 'px'; j.style.top = y + 'px'; j.firstElementChild.style.transform = `translate(${jx * 44}px,${jy * 44}px)`;
  },
  frame(dt) {
    document.body.classList.toggle('under', R.under);
    if (R.under) { const d = Math.max(0, -R.cam.pos[1]); $('#uw').style.opacity = clamp(0.55 + d * 0.012, 0, 0.9); }
    AUDIO.update(dt);
    const sf = $('#speedFx'); if (sf) { R.sfx = lerp(R.sfx || 0, R.speedFx || 0, Math.min(1, dt * 8)); sf.style.opacity = R.sfx.toFixed(3); }
  },
  dexCount() { const all = DEX.all(); $('#dexCount').textContent = all.filter(i => DEX.set.has(i)).length + '/' + all.length; },
  modal(html, cls = '') { $('#mbox').className = 'mbox ' + cls; $('#mbox').innerHTML = html + '<button class="mclose" aria-label="닫기">✕</button>'; $('#modal').classList.add('show'); $('#mbox .mclose').onclick = () => this.closeModal(); },
  ask(msg) {
    return new Promise(res => {
      this.modal(`<h2>확인해 주세요</h2><p class="askmsg">${msg}</p><div class="askbtns"><button class="big line" id="askNo">취소</button><button class="big bad" id="askYes">네, 할게요</button></div>`, 'askbox');
      const done = v => { this.closeModal(); res(v); };
      $('#askYes').onclick = () => done(true); $('#askNo').onclick = () => done(false); $('#mbox .mclose').onclick = () => done(false);
    });
  },
  closeModal() { $('#modal').classList.remove('show'); },
  openDex() {
    const all = DEX.all(), got = all.filter(i => DEX.set.has(i)).length, groups = {};
    for (const id of all) { const inf = DEX.info(id), g = inf.group; (groups[g] = groups[g] || []).push({ id, inf }); }
    let h = `<h2>📖 독도 도감 <small>${got} / ${all.length}</small></h2><div class="dexbar"><i style="width:${got / all.length * 100}%"></i></div><p class="sub">관찰자·탐험가 모드에서 눌러 본 것들이 도감에 모여요.</p>`;
    for (const [g, list] of Object.entries(groups)) {
      h += `<h3>${g}</h3><div class="dexgrid">` + list.map(({ id, inf }) => DEX.set.has(id) ? `<button class="dx got" data-id="${id}"><span>${inf.icon}</span><b>${inf.name}</b></button>` : `<div class="dx"><span>❔</span><b>???</b></div>`).join('') + '</div>';
    }
    this.modal(h, 'dexbox');
    $$('#mbox .dx.got').forEach(b => b.onclick = () => { const inf = DEX.info(b.dataset.id); this.modal(`<div class="dexone"><span class="icon">${inf.icon}</span><h2>${inf.name}</h2><div class="chips"><span class="chip2">${inf.group}</span><span class="chip2 where">📍 ${inf.where}</span></div><p class="ddesc">${inf.desc}</p><div class="dfact"><b>💡 알아 두기</b><p>${inf.fact}</p></div><div class="dbtns"><button class="big line" id="dxSpeak">🔈 읽어 주기</button><button class="big sea" id="dxBack">도감으로</button></div></div>`); $('#dxBack').onclick = () => this.openDex(); $('#dxSpeak').onclick = () => this.speak(`${inf.name}. ${inf.desc} ${inf.fact}`); });
  },
  openSettings() {
    const q = localStorage.getItem('dokdo3d.quality') || 'auto';
    this.modal(`<h2>⚙️ 설정</h2>
      <div class="setrow"><b>그래픽 품질</b><div class="seg">${[['auto', '자동'], ['high', '높음'], ['mid', '보통'], ['low', '낮음']].map(([v, t]) => `<button data-q="${v}" class="${q === v ? 'on' : ''}">${t}</button>`).join('')}</div><small>지금: ${{ high: '높음', mid: '보통', low: '낮음' }[R.quality]} · 바꾸면 다시 불러와요. 태블릿이 느리면 '낮음'을 골라 주세요.</small></div>
      <div class="setrow"><b>화면 속도 표시</b><div class="seg"><button id="sFps" class="${document.body.classList.contains('showFps') ? 'on' : ''}">FPS 보기</button></div></div>
      <div class="setrow"><b>도감 기록</b><div class="seg"><button id="sDex">도감 비우기</button></div></div>`);
    $$('#mbox [data-q]').forEach(b => b.onclick = () => { localStorage.setItem('dokdo3d.quality', b.dataset.q); location.reload(); });
    $('#sFps').onclick = e => { const on = document.body.classList.toggle('showFps'); e.currentTarget.classList.toggle('on', on); localStorage.setItem('dokdo3d.fps', on ? 'on' : 'off'); };
    $('#sDex').onclick = async () => { if (await UI.ask('도감 기록을 모두 지울까요?')) { DEX.set.clear(); localStorage.removeItem('dokdo3d.dex'); this.dexCount(); this.toast('도감을 비웠어요'); } };
  },
  openHelp() {
    this.modal(`<h2>❔ 사용 방법</h2><div class="help">
      <div><h3 class="c-obs">👁️ 관찰자</h3><p>한 손가락(마우스) 드래그로 돌리고, 두 손가락으로 벌리면 확대, 함께 밀면 이동해요. 마우스 휠로도 확대할 수 있어요. 궁금한 것을 톡 누르면 설명이 나오고, 두 번 톡톡 누르면 그곳으로 날아가요.</p></div>
      <div><h3 class="c-exp">🧭 탐험가</h3><p>화면 왼쪽 아래를 누른 채 움직이면 걸어요(멀리 밀면 달리기). 오른쪽을 드래그하면 둘러봐요. 키보드는 W·A·S·D, 달리기는 Shift예요. 물가에서 〈뛰어들기〉, 바다 위에서 〈잠수〉를 눌러 바닷속을 탐험하세요. 무엇이든 누르면 크게 확대해서 자세히 알려 줘요.</p></div>
      <div><h3 class="c-dev">🛠️ 개발자</h3><p>요소를 눌러 고른 뒤 끌어서 옮기고, 도구 막대로 돌리기·크기·숨기기·복제·삭제를 해요. 〈추가〉에서 생물이나 바위를 골라 원하는 곳을 누르면 놓여요. 〈지형〉에서는 땅을 올리고 내릴 수 있어요. 바뀐 내용은 자동 저장되고 파일로 내보낼 수도 있어요.</p></div>
      <div><h3 class="c-quiz">❓ 퀴즈</h3><p>독도 지형과 생물 문제 10개를 풀어요. 문제마다 3D 화면이 주인공을 비춰 줘요.</p></div></div>`);
  },
  saved() { const s = $('#saveState'); if (s) { s.textContent = '✔ 자동 저장됨 ' + new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }); } },
  devUndoState() { const b = $('#dUndo'); if (b) b.disabled = !DEV.undo.length; },
  devRefresh() {
    if (MODE.cur !== 'dev') { $('#selBar').classList.remove('show'); return; }
    const body = $('#devBody'), t = this.devTab;
    DEV.tool = t === 'terrain' ? 'sculpt' : 'select'; if (t === 'terrain' || t === 'sea' || t === 'save') SCN.sel = null; if (t !== 'terrain') R.brush = [0, 0, 0, 0]; if (t !== 'add') DEV.place = null;
    let h = '';
    if (t === 'elems') {
      const groups = {};
      SCN.elems.forEach(e => { const k = KINDS[e.kind]; (groups[k.group] = groups[k.group] || []).push(e); });
      h = `<p class="dhint">장면을 눌러 요소를 고르거나 목록에서 골라요. 👁️로 보이기/숨기기, 🗑️로 삭제해요.</p>`;
      for (const [g, list] of Object.entries(groups)) h += `<h4>${GROUPS[g]} <small>${list.length}</small></h4>` + list.map(e => { const k = KINDS[e.kind]; return `<div class="erow ${SCN.sel === e ? 'sel' : ''} ${e.hidden ? 'hid' : ''}" data-u="${e.uid}"><span class="en">${k.icon} ${k.name}</span><button data-a="vis" title="보이기">${e.hidden ? '🚫' : '👁️'}</button><button data-a="del" title="삭제">🗑️</button></div>`; }).join('');
    } else if (t === 'add') {
      h = `<p class="dhint">추가할 것을 고른 뒤 장면에서 놓을 곳을 눌러요. 바다 생물은 바닷속에, 식물은 땅 위에 놓여요.</p>`;
      const groups = {}; for (const [id, k] of Object.entries(KINDS)) if (!k.game) (groups[k.group] = groups[k.group] || []).push([id, k]);
      for (const [g, list] of Object.entries(groups)) h += `<h4>${GROUPS[g]}</h4><div class="pal">` + list.map(([id, k]) => `<button data-k="${id}" class="${DEV.place === id ? 'on' : ''}"><span>${k.icon}</span>${k.name.replace(' (과거 복원)', '').replace(' (쉬는 중)', '(앉음)')}</button>`).join('') + '</div>';
    } else if (t === 'terrain') {
      const b = DEV.brush;
      h = `<p class="dhint">땅이나 바다 밑을 누른 채 문질러 모양을 바꿔요. 화면 돌리기는 두 손가락(마우스 오른쪽 버튼)으로 해요.</p>
        <div class="seg4">${[['up', '⛰️ 올리기'], ['down', '🕳️ 내리기'], ['flat', '▭ 평평하게'], ['smooth', '〰️ 부드럽게']].map(([m, tx]) => `<button data-b="${m}" class="${b.mode === m ? 'on' : ''}">${tx}</button>`).join('')}</div>
        <label class="sl">붓 크기 <input type="range" id="bR" min="4" max="45" value="${b.r}"><output>${b.r}m</output></label>
        <label class="sl">세기 <input type="range" id="bS" min="0.2" max="3" step="0.1" value="${b.s}"><output>${b.s}</output></label>
        <button class="big line wide" id="tReset">🗺️ 지형만 처음대로</button>`;
    } else if (t === 'sea') {
      h = `<p class="dhint">바다의 모습을 바꿔 봐요.</p>
        <label class="sl">파도 높이 <input type="range" id="sA" min="0" max="2.5" step="0.05" value="${R.waveAmp}"><output>${R.waveAmp.toFixed(2)}</output></label>
        <label class="sl">파도 빠르기 <input type="range" id="sSp" min="0.3" max="2" step="0.05" value="${R.waveSpeed}"><output>${R.waveSpeed.toFixed(2)}</output></label>
        <label class="sl">물 맑기 <input type="range" id="sC" min="0" max="1" step="0.05" value="${R.clarity}"><output>${R.clarity.toFixed(2)}</output></label>
        <h4>물빛</h4><div class="seg4">${[['base', '기본'], ['emerald', '에메랄드'], ['cobalt', '코발트'], ['deep', '깊은 남색']].map(([v, tx]) => `<button data-tint="${v}" class="${(R.tintName || 'base') === v ? 'on' : ''}">${tx}</button>`).join('')}</div>
        <button class="big line wide" id="sSplash">💦 물보라 시험하기</button>`;
    } else if (t === 'save') {
      h = `<p class="dhint">바꾼 내용은 이 기기(브라우저)에 자동으로 저장돼요.</p><p id="saveState" class="savest">✔ 자동 저장 켜짐</p>
        <button class="big sea wide" id="dUndo" ${DEV.undo.length ? '' : 'disabled'}>↩️ 되돌리기</button>
        <button class="big line wide" id="dExport">💾 파일로 내보내기</button>
        <label class="big line wide filebtn">📂 파일 불러오기<input type="file" id="dImport" accept=".json,application/json"></label>
        <button class="big bad wide" id="dReset">♻️ 모두 처음 상태로</button>`;
    }
    body.innerHTML = h;
    // wire
    body.querySelectorAll('.erow').forEach(r => {
      const e = SCN.elems.find(x => x.uid === +r.dataset.u);
      r.querySelector('.en').onclick = () => { SCN.sel = e; this.devRefresh(); const fc = elemFocus(e, R.time); obsFly({ t: fc.c, d: clamp(fc.r * 4, 8, 150), yaw: OBS.yaw, pitch: fc.c[1] < -0.5 ? -0.15 : -0.35 }, 1.2); };
      r.querySelector('[data-a=vis]').onclick = () => { devSnapshot(false); e.hidden = !e.hidden; if (KINDS[e.kind].beh === 'rock') stampRocks(); buildLabels(); saveLater(); this.devRefresh(); };
      r.querySelector('[data-a=del]').onclick = () => devDelete(e);
    });
    body.querySelectorAll('.pal button').forEach(b => b.onclick = () => { DEV.place = DEV.place === b.dataset.k ? null : b.dataset.k; if (DEV.place) this.toast(KINDS[DEV.place].name + ': 놓을 곳을 눌러 주세요'); this.devRefresh(); });
    body.querySelectorAll('[data-b]').forEach(b => b.onclick = () => { DEV.brush.mode = b.dataset.b; this.devRefresh(); });
    const sl = (id, fn) => { const i = body.querySelector(id); if (!i) return; i.oninput = () => { fn(+i.value); i.nextElementSibling.textContent = i.value + (id === '#bR' ? 'm' : ''); }; i.onchange = saveLater; };
    sl('#bR', v => DEV.brush.r = v); sl('#bS', v => DEV.brush.s = v); sl('#sA', v => R.waveAmp = v); sl('#sSp', v => R.waveSpeed = v); sl('#sC', v => R.clarity = v);
    body.querySelectorAll('[data-tint]').forEach(b => b.onclick = () => { R.tintName = b.dataset.tint; R.tint = TINTS[R.tintName]; saveLater(); this.devRefresh(); });
    const on = (id, fn) => { const b = body.querySelector(id); if (b) b.onclick = fn; };
    on('#sSplash', () => { const p = V3.add(OBS.t, [0, 0, 0]); FX.splash(p[0], p[2], 1.4, false); });
    on('#tReset', async () => { if (await UI.ask('지형을 처음 모양으로 되돌릴까요?')) { devSnapshot(true); TER.reset(); relayoutAll(); saveLater(); } });
    on('#dUndo', devUndo);
    on('#dExport', async () => {
      const json = JSON.stringify({ app: 'dokdo3d', v: 2, elems: sceneSerialize(), ter: TER.serialize(), sea: seaState() }), name = '독도3D_장면_' + new Date().toISOString().slice(0, 10) + '.json';
      let dl = null; try { if (window.claude && window.claude.use) dl = await window.claude.use('downloads'); } catch (e) { dl = null; }
      if (dl) { try { await dl.save({ filename: name, data: json }); this.toast('장면 파일을 저장했어요 💾'); } catch (e) { if (!e || e.code !== 'declined') this.toast('이 화면에서는 파일 저장을 할 수 없어요'); } return; }
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    });
    const imp = body.querySelector('#dImport'); if (imp) imp.onchange = async () => { try { const d = JSON.parse(await imp.files[0].text()); if (!d.elems) throw 0; devSnapshot(true); applyScene(d); this.toast('장면을 불러왔어요'); } catch (e) { this.toast('불러올 수 없는 파일이에요'); } };
    on('#dReset', async () => { if (await UI.ask('모든 요소와 지형, 바다 설정을 처음 상태로 되돌릴까요?')) { devSnapshot(true); localStorage.removeItem('dokdo3d.scene'); applyScene({ sea: { amp: 1, speed: 1, clarity: 0.75, tint: 'base' } }); this.toast('처음 상태로 되돌렸어요'); } });
    this.selBar();
  },
  selBar() {
    const bar = $('#selBar'), e = SCN.sel;
    if (!e || MODE.cur !== 'dev') { bar.classList.remove('show'); return; }
    const k = KINDS[e.kind], vertical = k.place === 'water' || k.place === 'air' || k.place === 'sea';
    bar.innerHTML = `<b>${k.icon} ${k.name}</b><span class="sbhint">끌어서 옮기기</span>
      <button data-s="rl" title="왼쪽으로 돌리기">⟲</button><button data-s="rr" title="오른쪽으로 돌리기">⟳</button>
      <button data-s="sd" title="작게">➖</button><button data-s="su" title="크게">➕</button>
      ${vertical ? '<button data-s="yu" title="위로">⬆️</button><button data-s="yd" title="아래로">⬇️</button>' : ''}
      <button data-s="hide" title="숨기기">🚫</button><button data-s="dup" title="복제">📑</button><button data-s="del" class="bad" title="삭제">🗑️</button><button data-s="x" title="선택 해제">✕</button>`;
    bar.classList.add('show');
    bar.querySelectorAll('button').forEach(b => b.onclick = () => {
      const a = b.dataset.s; if (a === 'x') { SCN.sel = null; this.devRefresh(); return; }
      if (a === 'del') { devDelete(e); return; }
      devSnapshot(false);
      if (a === 'rl') e.yaw += 0.26; if (a === 'rr') e.yaw -= 0.26; if (a === 'su') e.s = Math.min(4, e.s * 1.15); if (a === 'sd') e.s = Math.max(0.25, e.s / 1.15);
      if (a === 'yu') e.y = k.place === 'air' ? e.y + 3 : Math.min(e.y + 1, k.place === 'sea' ? 3 : -1); if (a === 'yd') e.y = Math.max(e.y - (k.place === 'air' ? 3 : 1), TER.heightAt(e.x, e.z) + 1);
      if (a === 'hide') { e.hidden = true; SCN.sel = null; this.toast('숨겼어요. 〈요소〉 목록에서 다시 보이게 할 수 있어요'); }
      if (a === 'dup') { const n = newElem(e.kind, e.x + 8 * e.s, e.y, e.z + 8 * e.s, e.yaw, e.s); if (k.place !== 'water' && k.place !== 'air' && k.place !== 'sea') n.y = placeY(e.kind, [n.x, 0, n.z]); layoutElem(n); SCN.elems.push(n); SCN.sel = n; }
      if (['su', 'sd', 'rl', 'rr'].includes(a)) layoutElem(e);
      if (k.beh === 'rock') stampRocks(); buildLabels(); saveLater(); this.devRefresh(); AUDIO.tick();
    });
  }
};
function devDelete(e) { devSnapshot(false); SCN.elems = SCN.elems.filter(x => x !== e); if (SCN.sel === e) SCN.sel = null; if (KINDS[e.kind].beh === 'rock') stampRocks(); buildLabels(); saveLater(); UI.devRefresh(); AUDIO.pop(); UI.toast(KINDS[e.kind].name + ' 삭제'); }

/* ---------- pixel-art loading screen (3 frames: sailing -> sailing -> arrival) ---------- */
const LOADER = {
  t0: performance.now(), real: 0, shown: -1, MIN: 3200,
  init() {
    const box = $('#loadCells'); box.innerHTML = '<i></i>'.repeat(10); this.cells = [...box.children];
    const tick = () => { if (this.stopped) return; this.render(); requestAnimationFrame(tick); }; tick();
  },
  set(p, msg) { this.real = p; if (msg) $('#loadMsg').textContent = msg; this.render(); },
  render() {
    const time = Math.min(100, (performance.now() - this.t0) / this.MIN * 100), n = Math.floor(Math.min(this.real, time) / 10 + 0.001);
    if (n !== this.shown) {
      this.shown = n; this.cells.forEach((c, i) => c.classList.toggle('on', i < n));
      const L = $('#loading'); if (L && !L.classList.contains('arrived')) { L.classList.toggle('s1', n < 4); L.classList.toggle('s2', n >= 4); }
    }
  },
  finish(warm) {
    return new Promise(res => {
      const go = () => {
        if (this.shown < 10) { requestAnimationFrame(go); return; }
        const L = $('#loading'); L.classList.remove('s1', 's2'); L.classList.add('arrived'); $('#loadMsg').textContent = '독도에 도착했어요! 🎉';

        let done = false; const end = () => { if (done) return; done = true; this.stopped = true; L.classList.add('hide'); setTimeout(() => L.remove(), 800); res(); };
        L.addEventListener('pointerdown', end);
        setTimeout(() => { try { warm && warm(); } catch (e) { } setTimeout(end, 1800); }, 350);   // the arrival picture stays up for its full time even if warm-up is slow
      };
      go();
    });
  }
};

/* ---------- boot ---------- */
async function boot() {
  LOADER.init();
  const step = async (pct, msg) => { LOADER.set(pct, msg); await new Promise(r => setTimeout(r, 0)); await new Promise(r => requestAnimationFrame(() => r())); };
  try {
    R.quality = detectQuality();
    await step(3, '그래픽을 준비하고 있어요…');
    initGL($('#gl'));
    await step(8, '바다와 바위 무늬를 만들고 있어요…');
    R.tex = buildTextures(R.quality);
    await step(22, '독도 지형을 쌓고 있어요…');
    terrainBuild(R.quality);
    await step(36, '태극기와 표지판을 그리고 있어요…');
    await buildAtlas();
    const ids = Object.keys(KINDS);
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i], k = KINDS[id];
      if (k.beh === 'rock' || i % 4 === 0) await step(38 + 56 * i / ids.length, `${k.name.replace(/ \(.*\)/, '')}을(를) 만들고 있어요…`);
      const m = k.beh === 'rock' ? buildRockMesh(k.shape, i * 7 + 3, R.quality) : k.mesh();
      if (k.beh === 'rock') { k.fp = m.footprint; k.r = m.radius; k.top = m.top; }
      SCN.meshes[id] = meshGL(m);
    }
    await step(96, '생물들을 풀어 놓고 있어요…');
    const saved = loadSaved();
    if (saved && saved.ter) TER.deserialize(saved.ter);
    sceneInit(saved); applySea(saved && saved.sea);
    bindSamplers(); UI.init(); setupInput(); buildLabels();
    resize(); addEventListener('resize', resize);
    document.addEventListener('visibilitychange', () => { if (document.hidden && AUDIO.ctx) AUDIO.ctx.suspend(); else if (AUDIO.ctx && AUDIO.on) AUDIO.ctx.resume(); });
    await step(100, '거의 다 왔어요!');
    MODE.set('observer'); OBS.yaw = 0.9; OBS.d = 1300; OBS.t = PRESETS.all.t.slice(); OBS.pitch = PRESETS.all.pitch;
    await LOADER.finish(() => { obsApply(); resize(); drawScene(); });   // warm up shaders while the arrival frame shows
    obsFly(PRESETS.all, 3.2);
    requestAnimationFrame(frame);
    UI.toast('위쪽 탭에서 관찰·관광·탐험·게임·퀴즈를 골라 보세요!');
  } catch (err) {
    console.error(err);
    $('#loadMsg').innerHTML = '앗, 시작하지 못했어요 😢<br><small>' + (err && err.message || err) + '</small>';
    $('#loading').classList.add('err');
  }
}
window.addEventListener('DOMContentLoaded', boot);
