"use strict";
/* ===== 11 tour: 강치 가이드와 함께하는 관광 모드 ===== */
const yawFrom = (ux, uz) => Math.atan2(-ux, uz);   // camera placed toward (ux,uz) from the target
const TOUR_STOPS = [
  { place: '독도 전체', title: '독도에 오신 걸 환영해요!', t: [-20, 25, -20], d: 760, yaw: yawFrom(0.45, 0.9), pitch: -0.42,
    text: '안녕하세요! 저는 옛날 독도 바다에서 살던 강치예요. 오늘은 제가 여러분의 독도 관광 가이드! 독도는 동도와 서도, 그리고 89개의 작은 부속 섬으로 이루어져 있어요. 오른쪽 아래 ▶ 버튼을 누르면 다음 장소로 슝 날아가요!' },
  { place: '동도 서쪽 바닷가', title: '독도 선착장', t: [58, 6, 106], d: 78, yaw: yawFrom(-0.82, 0.57), pitch: -0.24, see: 'quay',
    text: '독도를 찾는 사람들은 울릉도에서 배를 타고 와서 동도 서쪽의 이 선착장에 내려요. 선착장에 서서 바다 건너를 바라보면 서도의 주민숙소가 마주 보여요. 파도가 높은 날에는 배가 닿을 수 없어서, 독도 땅을 밟는 건 행운이라고들 해요.' },
  { place: '동도 선착장 → 경비대', title: '계단길과 물자 운반 케이블', t: [128, 48, 86], d: 200, yaw: yawFrom(-0.62, 0.78), pitch: -0.42, see: 'stairs',
    text: '선착장에서 동도 위쪽 독도경비대 숙소까지 꼬불꼬불한 계단길이 이어져 있어요. 그 옆으로는 굵은 쇠줄을 걸어 놓은 케이블(삭도)이 있어서, 쌀이나 물 같은 무거운 짐을 운반차에 실어 끌어올려요. 주황색 운반차가 오르내리는 모습을 찾아보세요!' },
  { place: '동도 꼭대기', title: '독도 등대와 독도경비대', t: [232, null, 16], yo: 8, d: 85, yaw: yawFrom(0.9, 0.45), pitch: -0.35, see: 'light',
    text: '동도 위쪽에는 밤바다의 길잡이 독도 등대와, 독도를 지키는 경비대가 있어요. 등대는 1954년에 처음 불을 밝혔어요. 경비대원들은 24시간 교대로 독도를 지켜요.' },
  { place: '동도 독도경비대 옆', title: '한국령 각석문과 우체통', t: [216, null, 16], yo: -1, d: 40, yaw: yawFrom(-0.1, 0.995), pitch: -0.7, see: 'inscr',
    text: '계단길을 다 올라 경비대 숙소에 닿으면 바위에 새긴 韓國領(한국령) 글자가 보여요. 1954년 독도의용수비대가 한국 땅이라는 뜻으로 새겼어요. 경비대 앞 빨간 우체통으로 편지도 보낼 수 있어요. 우편번호는 40240이에요!' },
  { place: '동도 가운데', title: '신비한 천장굴', t: [102, 2, 68], d: 150, yaw: yawFrom(0.25, 1), pitch: -1.2, see: 'area:cheonjang',
    text: '동도 한가운데가 움푹 꺼져서 바닷물이 들어와 있어요. 이곳이 천장굴이에요. 화산섬이 파도에 깎이고 무너지면서 생긴 신기한 지형이에요.' },
  { place: '동도 동쪽 바다', title: '독립문바위', t: [339, 12, 93], d: 85, yaw: yawFrom(0.3, 0.95), pitch: -0.18, see: 'gate',
    text: '가운데가 문처럼 뻥 뚫린 독립문바위예요! 파도가 아주 오랜 세월 동안 바위의 약한 부분을 깎아서 구멍이 생겼어요. 이런 바위를 해식아치라고 해요.' },
  { place: '동도와 서도 사이', title: '촛대바위', t: [-99, 18, 91], d: 95, yaw: yawFrom(0.2, 1), pitch: -0.2, see: 'candle',
    text: '동도와 서도 사이에 우뚝 선 촛대바위예요. 장군처럼 늠름해 보여서 장군바위라고도 불러요. 파도가 둘레를 깎고 단단한 부분만 기둥처럼 남았어요.' },
  { place: '서도 동쪽 바닷가', title: '주민숙소', t: [-126, null, 47], yo: 8, d: 62, yaw: yawFrom(1, 0.25), pitch: -0.18, see: 'house',
    text: '동도 선착장 맞은편, 서도 절벽 아래에 붙어 있는 4층 건물이 주민숙소예요. 독도에도 주소를 두고 사는 주민이 있어요. 주소는 경상북도 울릉군 울릉읍 독도리예요. 숙소 뒤로는 물골까지 이어지는 998계단이 있어요.' },
  { place: '서도 북쪽', title: '서도와 탕건봉', t: [-232, 70, -170], d: 290, yaw: yawFrom(0.25, -1), pitch: -0.3, see: 'tanggeon',
    text: '서도는 높이 약 168.5m로 동도보다 높고 가팔라요. 북쪽에 솟은 탕건봉은 옛 선비들이 갓 아래에 쓰던 모자, 탕건을 닮았어요.' },
  { place: '서도 서쪽 바다', title: '코끼리바위', t: [-359, 14, 51], d: 88, yaw: yawFrom(-0.52, 0.86), pitch: -0.18, see: 'elephant',
    text: '코끼리가 코를 바다에 담그고 물을 마시는 것처럼 보이죠? 코와 몸통 사이의 구멍도 파도가 깎아서 만든 거예요.' },
  { place: '서도 북서쪽 바다', title: '가제바위, 강치의 쉼터', t: [-290, 5, -287], d: 56, yaw: yawFrom(-0.6, -0.8), pitch: -0.35, see: 'gaje', mood: 'sad',
    text: '여기는 가제바위예요. 옛날 제 친구 강치들이 이 넓적한 바위에 올라와 햇볕을 쬐며 쉬었어요. 하지만 일제강점기에 마구 잡혀서 지금은 독도에서 강치를 볼 수 없어요. 우리 바다를 소중히 지켜 주세요.' },
  { place: '독도 바닷속', title: '바닷속으로 풍덩!', t: [18, -9, 112], d: 22, yaw: -2.6, pitch: -0.2, see: 'damsel', under: true,
    text: '독도 바다는 따뜻한 바닷물과 차가운 바닷물이 만나는 조경수역이라 물고기가 아주 많아요. 자리돔 떼와 흔들리는 대황·감태 바다숲이 보이나요?' },
  { place: '독도 하늘', title: '괭이갈매기의 섬', t: [40, 45, 10], d: 430, yaw: yawFrom(0.3, 0.95), pitch: -0.2, see: 'gull', end: true,
    text: '고양이처럼 우는 괭이갈매기가 날아다니는 독도의 하늘이에요. 오늘 관광 어땠나요? 이제 탐험가 모드에서 직접 걸어 보거나, 퀴즈로 독도 박사에 도전해 보세요!' }
];
const TOUR = {
  stops: TOUR_STOPS, course: 'place',
  i: 0, fly: null, auto: false, voice: false, spin: true, typing: null, built: false,
  build() {
    if (this.built) return; this.built = true;
    $('#tourPrev').onclick = () => { AUDIO.unlock(); this.go(this.i - 1); };
    $('#tourNext').onclick = () => { AUDIO.unlock(); if (this.typing) { this.finishTyping(); return; } this.go(this.i + 1); };
    $('#tourText').onclick = () => { if (this.typing) this.finishTyping(); };
    $('#tourVoice').onclick = e => { this.voice = !this.voice; e.currentTarget.classList.toggle('on', this.voice); if (this.voice) this.speak(); else if (window.speechSynthesis) speechSynthesis.cancel(); };
    $('#tourAuto').onclick = e => { this.auto = !this.auto; e.currentTarget.classList.toggle('on', this.auto); if (this.auto && !this.fly && !this.typing) this.scheduleNext(); else clearTimeout(this.autoT); };
    this.renderDots();
    $$('#tourCourse button').forEach(b => b.onclick = () => { AUDIO.unlock(); this.setCourse(b.dataset.c); });
    $('#tourAgain').onclick = () => this.go(0); $('#tourToExp').onclick = () => MODE.set('explorer'); $('#tourToQuiz').onclick = () => MODE.set('quiz');
    this.drawMapBase();
    addEventListener('keydown', e => { if (MODE.cur !== 'tour') return; if (e.code === 'ArrowRight') $('#tourNext').click(); if (e.code === 'ArrowLeft') $('#tourPrev').click(); });
  },
  renderDots() {
    $('#tourDots').innerHTML = this.stops.map((s, i) => `<button data-i="${i}" aria-label="${s.title}"></button>`).join('');
    $$('#tourDots button').forEach(b => b.onclick = () => this.go(+b.dataset.i));
    $('#tourDots').classList.toggle('many', this.stops.length > 16);
  },
  setCourse(c) {
    if (c === this.course && this.arrived) return;
    this.course = c; this.stops = c === 'life' ? lifeStops() : TOUR_STOPS; this.i = 0; this.arrived = false;
    $$('#tourCourse button').forEach(b => b.classList.toggle('on', b.dataset.c === c));
    this.renderDots(); this.go(0, true);
  },
  follow(dt) {
    const s = this.stops[this.i]; if (!s || !s.kind || !this.arrived) return;
    const e = this.target; if (!e || e.hidden) return;
    const fc = elemFocus(e, R.time); OBS.t = V3.lerp(OBS.t, fc.c, Math.min(1, dt * 1.2));
  },
  open() { this.build(); document.body.classList.add('touring'); this.go(this.i, true); },
  close() { this.fly = null; R.speedFx = 0; clearTimeout(this.autoT); clearInterval(this.typing); this.typing = null; if (window.speechSynthesis) speechSynthesis.cancel(); document.body.classList.remove('touring', 'tour-flying'); },
  pose(s) {
    if (s.kind) {
      const list = SCN.elems.filter(e => e.kind === s.kind && !e.hidden), c = R.cam.pos;
      const e = s.pick === 'near' ? list.sort((a, b) => Math.hypot(a.x - c[0], a.z - c[2]) - Math.hypot(b.x - c[0], b.z - c[2]))[0] : list[s.pick || 0] || list[0];
      this.target = e;
      if (e) {
        const fc = elemFocus(e, R.time), under = fc.c[1] < -0.5, air = fc.c[1] > 8 && KINDS[s.kind].beh === 'fly';
        const d = clamp(fc.r * 3.4, under ? 5 : 7, under ? 16 : 70) + (under ? 1.5 : air ? 18 : 6);
        const dir = V3.sub(fc.c, c), yaw = Math.hypot(dir[0], dir[2]) > 1 ? Math.atan2(dir[0], -dir[2]) : OBS.yaw;
        return { t: fc.c, d, yaw, pitch: under ? -0.1 : air ? -0.05 : -0.38 };
      }
    }
    this.target = null;
    const y = s.t[1] === null ? TER.heightAt(s.t[0], s.t[2]) + (s.yo || 0) : s.t[1]; return { t: [s.t[0], y, s.t[2]], d: s.d, yaw: s.yaw, pitch: s.pitch };
  },
  go(i, first) {
    i = clamp(i, 0, this.stops.length - 1); if (i === this.i && !first && !this.fly && this.arrived) return;
    this.i = i; this.arrived = false; clearTimeout(this.autoT); clearInterval(this.typing); this.typing = null; if (window.speechSynthesis) speechSynthesis.cancel();
    const s = this.stops[i], P = this.pose(s), c = R.cam; camBasis();
    const cp = Math.cos(P.pitch), fwd = [Math.sin(P.yaw) * cp, Math.sin(P.pitch), -Math.cos(P.yaw) * cp];
    const P1 = V3.sub(P.t, V3.mul(fwd, P.d)), P0 = c.pos.slice(), dist = V3.dist(P0, P1);
    const T0 = V3.add(P0, V3.mul(c.fwd, Math.min(OBS.d || 60, dist * 0.5 + 20)));
    this.fly = { P0, P1, T0, T1: P.t, P, k: 0, dur: clamp(1.5 + dist / 360, 1.7, 4.2), H: clamp(dist * 0.3, 10, 240), fov0: c.fov, under: P.t[1] < -0.5, prevY: P0[1] };
    document.body.classList.add('tour-flying'); $('#tourBubble').classList.remove('show'); $('#tourGuide').className = 'fly';
    $('#tourStep').textContent = `${i + 1} / ${this.stops.length}`;
    $$('#tourDots button').forEach((b, k) => { b.classList.toggle('on', k === i); b.classList.toggle('done', k < i); });
    $('#tourPrev').disabled = i === 0; $('#tourNext').disabled = false; $('#tourNext').classList.toggle('last', i === this.stops.length - 1);
    this.drawMap(); AUDIO.whoosh();
  },
  update(dt) {
    const F = this.fly, c = R.cam; F.k = Math.min(1, F.k + dt / F.dur);
    const k = F.k, e = k < .5 ? 4 * k ** 3 : 1 - Math.pow(-2 * k + 2, 3) / 2, u = 1 - e;
    const C1 = V3.add(F.P0, [0, F.H, 0]), C2 = V3.add(F.P1, [0, F.H * (F.under ? 0.3 : 0.55), 0]);
    const p = [0, 1, 2].map(j => u * u * u * F.P0[j] + 3 * u * u * e * C1[j] + 3 * u * e * e * C2[j] + e * e * e * F.P1[j]);
    const floor = TER.heightAt(p[0], p[2]) + (F.under && k > 0.7 ? 1.2 : 5); if (p[1] < floor && !(F.under && k > 0.85)) p[1] = floor;
    const look = V3.sub(V3.lerp(F.T0, F.T1, smooth(0.1, 0.8, k)), p);
    c.pos = p; c.yaw = Math.atan2(look[0], -look[2]); c.pitch = Math.atan2(look[1], Math.hypot(look[0], look[2]));
    c.fov = (55 + Math.sin(k * Math.PI) * 16) * Math.PI / 180; c.near = 0.15;
    R.speedFx = Math.sin(k * Math.PI) * 0.85;
    if ((F.prevY > 0) !== (p[1] > 0) && Math.abs(p[1]) < 6) FX.splash(p[0], p[2], 1.2, true);
    F.prevY = p[1];
    if (k >= 1) this.arrive();
  },
  arrive() {
    const F = this.fly, s = this.stops[this.i]; this.fly = null; R.speedFx = 0; this.arrived = true;
    Object.assign(OBS, { t: F.P.t, d: F.P.d, yaw: F.P.yaw, pitch: F.P.pitch, anim: null, vy: 0, vp: 0 });
    document.body.classList.remove('tour-flying'); $('#tourGuide').className = 'land' + (s.mood ? ' ' + s.mood : '');
    $('#tourPlace').textContent = '📍 ' + s.place; $('#tourTitle').textContent = s.title; $('#tourEnd').classList.toggle('show', !!s.end);
    const b = $('#tourBubble'); b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
    if (s.see) { const info = s.see.startsWith('area:') ? DEX.info(s.see) : KINDS[s.see] && kindInfo(s.see); if (info) DEX.discover(info); }
    this.type(s.text); if (this.voice) this.speak(); AUDIO.pop();
  },
  type(text) {
    const el = $('#tourText'); el.textContent = ''; let n = 0; $('#tourGuide').classList.add('talk');
    this.fullText = text;
    this.typing = setInterval(() => { n += 2; el.textContent = text.slice(0, n); if (n >= text.length) this.finishTyping(); }, 32);
  },
  finishTyping() {
    clearInterval(this.typing); this.typing = null; $('#tourText').textContent = this.fullText || ''; $('#tourGuide').classList.remove('talk');
    $('#tourNext').classList.add('ready'); setTimeout(() => $('#tourNext').classList.remove('ready'), 1600);
    if (this.auto && !this.voice) this.scheduleNext();
  },
  scheduleNext(ms) {
    clearTimeout(this.autoT); if (!this.auto || this.i >= this.stops.length - 1) return;
    this.autoT = setTimeout(() => { if (MODE.cur === 'tour' && this.auto && !this.fly) this.go(this.i + 1); }, ms || 4200);
  },
  speak() {
    if (!window.speechSynthesis || !this.fullText) return; speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(this.fullText.replace(/[()]/g, ' ').replace('韓國領', '한국령').replace('▶', '')); u.lang = 'ko-KR'; u.rate = 1.0; u.pitch = 1.15;
    const v = speechSynthesis.getVoices().find(v => v.lang && v.lang.startsWith('ko')); if (v) u.voice = v;
    u.onend = () => { if (this.auto) this.scheduleNext(1500); };
    speechSynthesis.speak(u);
  },
  /* mini map from the heightfield */
  map: { x0: -430, z0: -345, x1: 410, z1: 300 },
  drawMapBase() {
    const cv = $('#tourMap'); if (!cv) return; const W = cv.width, H = cv.height, m = this.map, img = new ImageData(W, H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const wx = lerp(m.x0, m.x1, x / W), wz = lerp(m.z0, m.z1, y / H), h = TER.heightAt(wx, wz), o = (y * W + x) * 4;
      let c;
      if (h > 0.3) { const t = clamp(h / 170, 0, 1); c = [lerp(150, 236, t), lerp(122, 214, t), lerp(88, 170, t)]; }
      else { const t = clamp(-h / 30, 0, 1); c = [lerp(80, 12, t), lerp(190, 70, t), lerp(200, 110, t)]; }
      img.data.set([c[0], c[1], c[2], 255], o);
    }
    this.mapBase = img;
  },
  drawMap() {
    const cv = $('#tourMap'); if (!cv || !this.mapBase) return; const c = cv.getContext('2d'), W = cv.width, H = cv.height, m = this.map;
    c.putImageData(this.mapBase, 0, 0);
    const P = s => { let t = s.t; if (!t) { const e = SCN.elems.find(x => x.kind === s.kind) || { x: 0, z: 0 }; t = [e.x, 0, e.z]; } return [(t[0] - m.x0) / (m.x1 - m.x0) * W, (t[2] - m.z0) / (m.z1 - m.z0) * H]; };
    c.lineWidth = 3; c.setLineDash([7, 7]); c.strokeStyle = 'rgba(255,255,255,.7)'; c.beginPath();
    this.stops.forEach((s, i) => { const p = P(s); i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); }); c.stroke(); c.setLineDash([]);
    this.stops.forEach((s, i) => {
      const p = P(s), cur = i === this.i; c.beginPath(); c.arc(p[0], p[1], cur ? 13 : 9, 0, TAU);
      c.fillStyle = cur ? '#F4CD55' : i < this.i ? '#3A5BB8' : 'rgba(10,30,40,.85)'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = '#fff'; c.stroke();
      c.fillStyle = cur ? '#1b2340' : '#fff'; c.font = `bold ${cur ? 14 : 11}px sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(i + 1, p[0], p[1] + 0.5);
    });
  }
};

/* ---------- 생물·자원 코스: every living resource and the undersea resources ---------- */
const josa = w => { const c = w.charCodeAt(w.length - 1); return c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 ? '이에요' : '예요'; };
const LIFE_ORDER = [
  ['gull', '독도 하늘', '하늘을 올려다보세요! '], ['gullsit', '동도 절벽', '절벽 위에도 괭이갈매기가 잔뜩 앉아 있어요. '], ['petrel', '서도 하늘', '제비처럼 날쌘 새가 보이나요? '], ['egret', '동도 선착장', '선착장 근처에 하얀 새가 쉬고 있어요. '],
  ['aster', '바닷가 절벽', '바위틈의 보랏빛 꽃을 보세요. '], ['sedum', '햇볕 드는 바위틈', '노란 별 모양 꽃이 피었어요. '], ['euonymus', '동도 절벽', '절벽에 푸른 나무 한 그루가 보이죠? '],
  ['damsel', '바닷속', '이제 바닷속 친구들을 만나 봐요! '], ['bluedam', '동도 남쪽 바다', '파랗게 빛나는 물고기 떼예요. '], ['hump', '바위 굴 근처', '이마가 볼록한 큰 물고기가 지나가요. '], ['stone', '바위 많은 바다', '줄무늬 옷을 입은 물고기예요. '],
  ['squid', '독도 바다', '다리가 많은 친구가 헤엄쳐요. '], ['jelly', '바닷물 위쪽', '둥실둥실 떠다니는 친구도 있어요. '], ['shrimp', '깊은 바다 밑', '빨간 새우들이 모여 있어요. '],
  ['urchin', '바다 밑 바위', '가시투성이 친구예요. '], ['star', '바다 밑 바위', '별 모양 친구를 찾았어요! '], ['abalone', '얕은 바다 바위', '바위에 딱 붙은 조개가 있어요. '], ['conch', '얕은 바다 바위', '돌돌 말린 껍데기가 보여요. '],
  ['cucumber', '바다 밑바닥', '바닥을 기어가는 친구예요. '], ['mussel', '물가 바위', '파도 치는 바위에 까만 조개들이 붙어 있어요. '], ['kelp', '바다숲', '바닷속에 숲이 있어요! '], ['tunicate', '암초', '투명한 친구가 보이나요? '],
  ['sealion', '가제바위', '짠! 바로 저, 강치의 옛 모습이에요. '], ['hydrate', '깊은 바다 밑 (모형)', '이번엔 생물이 아니라 바다 밑에 묻힌 지하자원이에요. ']
];
function lifeStops() {
  const out = [{ place: '독도 바다', title: '생물·자원 코스', t: [60, 20, 150], d: 320, yaw: yawFrom(0.2, 1), pitch: -0.3,
    text: '이번에는 독도에 사는 생물과 바다의 자원을 하나하나 소개할게요. 새, 식물, 물고기, 바다 생물, 그리고 바다 밑 지하자원까지! ▶ 버튼을 눌러 출발해요.' }];
  for (const [kind, place, lead] of LIFE_ORDER) {
    const k = KINDS[kind]; if (!k || !SCN.elems.some(e => e.kind === kind && !e.hidden)) continue;
    const nm = k.name.replace(/ \(.*\)/, '');
    const body = kind === 'sealion' ? `${k.desc} ${k.fact} 우리 바다 생물을 아끼는 마음을 잊지 말아 주세요.` : `이 친구는 ${nm}${josa(nm)}. ${k.desc} ${k.fact}`;
    out.push({ kind, pick: 'near', place, title: k.name, see: kind, text: lead + (kind === 'hydrate' ? `${k.desc} ${k.fact}` : body) });
  }
  out.push({ place: '동해 깊은 바다', title: '해양심층수', t: [-60, -14, -330], d: 18, yaw: yawFrom(0.3, 1), pitch: -0.35,
    text: '햇빛이 닿지 않는 수심 200m보다 깊은 곳의 바닷물을 해양심층수라고 해요. 차갑고 깨끗하며 미네랄이 풍부해서 먹는 물, 식품, 화장품 등에 쓰여요. 독도가 있는 동해 깊은 곳에도 해양심층수가 많아요.' });
  out.push({ place: '독도 바다', title: '독도는 바다의 보물 창고', t: [40, 45, 10], d: 430, yaw: yawFrom(0.3, 0.95), pitch: -0.2, end: true,
    text: '오징어, 독도새우, 전복, 홍합 같은 수산자원과 메탄 하이드레이트, 해양심층수 같은 자원까지! 독도 바다는 정말 소중한 보물 창고예요. 오늘 만난 친구들은 모두 도감에 등록되었어요.' });
  return out;
}
