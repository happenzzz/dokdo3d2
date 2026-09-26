"use strict";
/* ===== 09 quiz ===== */
const QBANK = [
  { q: '독도는 동도와 서도, 그리고 몇 개의 작은 부속 섬으로 이루어져 있을까요?', o: ['89개', '12개', '3개', '150개'], a: 0, ex: '독도는 동도·서도와 89개의 부속 섬, 모두 91개의 섬으로 이루어져 있어요.', f: 'p:all' },
  { q: '동도와 서도 중에서 더 높은 섬은 어디일까요?', o: ['서도', '동도'], a: 0, ex: '서도는 약 168.5m, 동도는 약 98.6m로 서도가 더 높아요.', f: 'p:seo' },
  { q: '독도 주민이 사는 주민숙소는 어느 섬에 있을까요?', o: ['서도', '동도'], a: 0, ex: '주민숙소는 서도의 동쪽 바닷가에 있어요.', f: 'house' },
  { q: '독도 등대와 독도경비대가 있는 섬은 어디일까요?', o: ['동도', '서도'], a: 0, ex: '등대, 경비대, 헬기장, 선착장은 모두 동도에 있어요.', f: 'light' },
  { q: '바위 가운데가 뚫려 있어서 서울의 어떤 건물을 닮았다고 이름 붙은 바위는?', o: ['독립문바위', '촛대바위', '부채바위', '닭바위'], a: 0, ex: '가운데가 문처럼 뚫린 모습이 독립문을 닮아 독립문바위예요.', f: 'gate' },
  { q: '바위에 굴이 세 개 뚫려 있는 바위의 이름은?', o: ['삼형제굴바위', '코끼리바위', '탕건봉', '얼굴바위'], a: 0, ex: '굴이 세 개라서 삼형제굴바위라고 불러요.', f: 'threecaves' },
  { q: '코끼리가 바다에 코를 담그고 물을 마시는 모습을 닮은 바위는?', o: ['코끼리바위', '닭바위', '얼굴바위', '숫돌바위'], a: 0, ex: '코와 몸통 사이에 구멍이 뚫린 모습이 코끼리를 닮았어요.', f: 'elephant' },
  { q: '바위에 구멍이나 굴이 생긴 것은 파도가 오랜 시간 바위를 깎아 냈기 때문이다.', o: ['O', 'X'], a: 0, ox: 1, ex: '맞아요! 파도가 바위의 약한 부분을 계속 때려서 굴과 아치가 생겨요.', f: 'gate' },
  { q: '예전에 강치(바다사자)들이 올라와 쉬던 바위의 이름은?', o: ['가제바위', '보찰바위', '숫돌바위', '부채바위'], a: 0, ex: '가제는 강치를 부르던 울릉도 사투리예요.', f: 'gaje' },
  { q: '독도에 수만 마리가 살던 강치가 사라진 까닭은 무엇일까요?', o: ['일제강점기에 마구 잡아서', '먹이가 없어져서', '너무 추워서', '다른 섬으로 이사해서'], a: 0, ex: '일제강점기에 일본 어부들이 가죽과 기름을 얻으려고 마구 잡아 사라졌어요.', f: 'sealion' },
  { q: '울음소리가 고양이처럼 들려서 이름 붙은 독도의 대표 새는?', o: ['괭이갈매기', '바다제비', '황로', '참새'], a: 0, ex: '괭이는 고양이를 뜻하는 말이에요.', f: 'gull' },
  { q: '바다제비는 낮에 둥지로 돌아오고, 밤에 바다로 먹이를 찾으러 나간다.', o: ['O', 'X'], a: 1, ox: 1, ex: '반대예요! 낮에는 먼 바다에서 먹이를 찾고 밤에 둥지로 돌아와요.', f: 'petrel' },
  { q: '가을에 연한 보라색 꽃이 피는 바닷가 절벽의 국화는?', o: ['해국', '섬기린초', '민들레', '해바라기'], a: 0, ex: '해국은 바닷바람을 견디려고 낮게 자라요.', f: 'aster' },
  { q: '흙이 거의 없는 동도 절벽에서 100년 넘게 살아 천연기념물이 된 나무는?', o: ['사철나무', '소나무', '벚나무', '은행나무'], a: 0, ex: '독도 사철나무는 천연기념물 제538호예요.', f: 'euonymus' },
  { q: '따뜻한 바닷물과 차가운 바닷물이 만나서 물고기가 많이 모이는 곳을 무엇이라고 할까요?', o: ['조경수역', '갯벌', '사막', '빙하'], a: 0, ex: '조경수역에는 물고기의 먹이인 플랑크톤이 많아요.', f: 'p:under' },
  { q: '파랑돔이 독도에서 보이는 것은 바다가 따뜻해지고 있다는 신호이다.', o: ['O', 'X'], a: 0, ox: 1, ex: '맞아요! 파랑돔은 원래 따뜻한 남쪽 바다에 사는 물고기예요.', f: 'bluedam' },
  { q: '성게가 너무 많아져 해조류가 사라지고 바닷속 바위가 하얗게 변하는 현상은?', o: ['갯녹음', '적조', '해일', '밀물'], a: 0, ex: '갯녹음이 생기면 바다숲이 사라져 물고기도 살기 어려워져요.', f: 'urchin' },
  { q: '바닥의 찌꺼기를 먹어 바다의 청소부라고 불리는 동물은?', o: ['해삼', '오징어', '전복', '홍합'], a: 0, ex: '해삼은 바닥의 찌꺼기를 먹어 바다를 깨끗하게 해요.', f: 'cucumber' },
  { q: '이마에 커다란 혹이 볼록 튀어나온 물고기는?', o: ['혹돔', '자리돔', '돌돔', '파랑돔'], a: 0, ex: '혹돔은 자라면서 이마의 혹이 점점 커져요.', f: 'hump' },
  { q: '불타는 얼음이라고 불리는 독도 주변 바다 밑의 미래 에너지 자원은?', o: ['메탄 하이드레이트', '석탄', '금', '소금'], a: 0, ex: '독도 주변 깊은 바다 밑에 약 6억 톤이 묻혀 있을 것으로 추정돼요.', f: 'hydrate' },
  { q: '유령멍게는 원래부터 우리 바다에 살던 토종 생물이다.', o: ['O', 'X'], a: 1, ox: 1, ex: '유령멍게는 다른 곳에서 들어온 외래종이에요.', f: 'tunicate' },
  { q: '독도에 있는 우체통의 우편번호는?', o: ['40240', '12345', '10000', '50505'], a: 0, ex: '독도의 우편번호는 40240이에요. 독도에서도 편지를 보낼 수 있어요.', f: 'post' },
  { q: '1954년 독도의용수비대가 동도 바위에 새긴 글자는?', o: ['韓國領 (한국령)', '大韓 (대한)', '東海 (동해)', '平和 (평화)'], a: 0, ex: '한국령은 한국 땅이라는 뜻이에요.', f: 'inscr' },
  { q: '동도의 도로명 독도이사부길의 이사부는 어떤 사람일까요?', o: ['우산국을 신라 땅으로 만든 장군', '조선의 임금', '등대를 지킨 사람', '독도의 첫 주민'], a: 0, ex: '이사부는 512년 우산국(지금의 울릉도·독도)을 신라 땅으로 만들었어요.', f: 'sign1' },
  { q: '조선 숙종 때 일본에 건너가 울릉도와 독도가 조선 땅임을 밝힌 사람은?', o: ['안용복', '이순신', '장보고', '세종대왕'], a: 0, ex: '그래서 서도의 도로명이 독도안용복길이에요.', f: 'sign2' },
  { q: '독도는 어떻게 만들어진 섬일까요?', o: ['바다 밑 화산이 폭발해서', '빙하가 녹아서', '사람이 흙을 쌓아서', '운석이 떨어져서'], a: 0, ex: '독도는 약 460만~250만 년 전 해저 화산 활동으로 만들어졌어요.', f: 'p:under' },
  { q: '대황·감태 같은 바다숲이 하는 일이 아닌 것은?', o: ['물고기를 잡아먹는다', '물고기의 집이 된다', '산소를 만든다', '알 낳는 곳이 된다'], a: 0, ex: '바다숲은 물고기의 집이자 알 낳는 곳이고, 산소도 만들어요.', f: 'kelp' },
  { q: '독도의 주소로 알맞은 것은?', o: ['경상북도 울릉군 울릉읍 독도리', '부산광역시 해운대구 독도동', '강원특별자치도 강릉시 독도리', '제주특별자치도 서귀포시 독도읍'], a: 0, ex: '독도는 경상북도 울릉군 울릉읍 독도리예요.', f: 'house' }
];
const QUIZ = {
  open() { this.showStart(); },
  showStart() {
    const box = $('#quizBox'); box.className = 'qbox start';
    box.innerHTML = `<div class="qhero">❓</div><h2>독도 퀴즈</h2><p>독도의 지형과 생물에 대한 문제 10개를 풀어 봐요.<br>문제마다 3D 화면이 정답의 주인공을 비춰 줄 거예요.</p>
      <button class="big gull" id="qGo">퀴즈 시작!</button>`;
    $('#qGo').onclick = () => this.start();
  },
  start() {
    const pool = QBANK.map((q, i) => i).sort(() => Math.random() - 0.5).slice(0, 10);
    this.list = pool.map(i => { const q = QBANK[i], idx = q.o.map((_, j) => j); if (!q.ox) idx.sort(() => Math.random() - 0.5); return { ...q, order: idx }; });
    this.i = 0; this.score = 0; this.wrong = []; this.streak = 0; AUDIO.pop(); this.show();
  },
  show() {
    const q = this.list[this.i], box = $('#quizBox'); box.className = 'qbox';
    const dots = this.list.map((_, j) => `<i class="${j < this.i ? (this.list[j].ok ? 'ok' : 'bad') : j === this.i ? 'cur' : ''}"></i>`).join('');
    box.innerHTML = `<div class="qtop"><span class="qnum">${this.i + 1} / ${this.list.length}</span><div class="qdots">${dots}</div><span class="qscore">⭐ ${this.score}</span></div>
      <div class="qq">${q.ox ? '<span class="oxtag">O X</span>' : ''}${q.q}</div>
      <div class="qopts ${q.ox ? 'ox' : ''}">${q.order.map(j => `<button class="qopt" data-j="${j}">${q.ox ? `<b class="${q.o[j] === 'O' ? 'o' : 'x'}">${q.o[j]}</b>` : q.o[j]}</button>`).join('')}</div>
      <div class="qfeed"></div>`;
    box.querySelectorAll('.qopt').forEach(b => b.onclick = () => this.answer(+b.dataset.j, b));
    quizFocus(q.f);
  },
  answer(j, btn) {
    const q = this.list[this.i], box = $('#quizBox'); if (q.done) return; q.done = true; q.ok = j === q.a;
    box.querySelectorAll('.qopt').forEach(b => { b.disabled = true; if (+b.dataset.j === q.a) b.classList.add('right'); });
    const fb = box.querySelector('.qfeed');
    if (q.ok) {
      this.score++; this.streak++; btn.classList.add('pulse'); FX.stamp(true); FX.confetti(btn); AUDIO.correct();
      fb.innerHTML = `<div class="fb ok"><b>정답이에요! ${this.streak >= 3 ? '🔥 ' + this.streak + '연속!' : '👏'}</b><p>${q.ex}</p></div>`;
    } else {
      this.streak = 0; this.wrong.push(q); btn.classList.add('wrong'); box.classList.add('shake'); setTimeout(() => box.classList.remove('shake'), 500); FX.stamp(false); AUDIO.wrong();
      fb.innerHTML = `<div class="fb bad"><b>아쉬워요! 정답은 「${q.o[q.a]}」</b><p>${q.ex}</p></div>`;
    }
    fb.innerHTML += `<button class="big sea" id="qNext">${this.i + 1 < this.list.length ? '다음 문제 ▶' : '결과 보기 🏁'}</button>`;
    $('#qNext').onclick = () => { this.i++; if (this.i < this.list.length) this.show(); else this.end(); };
  },
  end() {
    const s = this.score, n = this.list.length, stars = s >= 9 ? 3 : s >= 6 ? 2 : s >= 3 ? 1 : 0, box = $('#quizBox'); box.className = 'qbox end';
    const msg = ['다시 한번 도전해 봐요!', '좋은 출발이에요!', '잘했어요! 독도 박사가 되어 가고 있어요.', '완벽해요! 독도 박사 인정! 🏅'][stars];
    box.innerHTML = `<div class="stars">${[0, 1, 2].map(i => `<span class="${i < stars ? 'on' : ''}" style="animation-delay:${i * 0.25}s">★</span>`).join('')}</div>
      <h2>${n}문제 중 ${s}문제 정답!</h2><p class="endmsg">${msg}</p>
      ${this.wrong.length ? `<div class="review"><h3>다시 보기</h3>${this.wrong.map(q => `<div class="rv"><b>Q. ${q.q}</b><span>정답: ${q.o[q.a]}</span><p>${q.ex}</p></div>`).join('')}</div>` : ''}
      <div class="endbtns"><button class="big gull" id="qAgain">다시 풀기</button><button class="big tuff" id="qExplore">탐험하러 가기</button></div>`;
    $('#qAgain').onclick = () => this.start(); $('#qExplore').onclick = () => MODE.set('explorer');
    if (stars >= 2) { FX.confetti(null, 140); AUDIO.fanfare(); }
    obsFly(PRESETS.all, 2.2);
  }
};
function quizFocus(f) {
  if (!f) return;
  if (f.startsWith('p:')) { obsFly(PRESETS[f.slice(2)], 1.8); return; }
  const e = SCN.elems.find(x => x.kind === f && !x.hidden); if (!e) return;
  const fc = elemFocus(e, R.time), under = fc.c[1] < -0.5;
  obsFly({ t: fc.c, d: clamp(fc.r * 3.2, 5, 120) + (under ? 2 : 12), yaw: OBS.yaw + 0.4, pitch: under ? -0.12 : -0.32 }, 1.8);
}
