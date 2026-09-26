"use strict";
/* ===== 06 scene: catalog, elements, behaviors, picking ===== */
const GROUPS = { rock: '바위·지형', fish: '물고기', sea: '바다 생물', bird: '새', plant: '식물', fac: '시설·표지', res: '자원·과거' };
const K = (o) => Object.assign({ mat: 0, anim: 0, animP: [0, 0, 0, 0], two: 0, gloss: 0.1, alpha: 1, emis: 0, skirt: 0, beh: 'static', n: 1, spread: 0, s: 1, r: 1, label: false }, o);
const R_ = (name, where, desc, fact, shape, o = {}) => K(Object.assign({ name, group: 'rock', icon: '🪨', where, desc, fact, shape, mat: 1, skirt: 1, beh: 'rock', label: true, place: 'sea' }, o));
const KINDS = {
  gate: R_('독립문바위', '동도 동쪽 바다', '바위 가운데가 문처럼 뻥 뚫려 있어요. 서울에 있는 독립문과 닮아서 독립문바위라는 이름이 붙었어요.', '파도가 아주 오랜 시간 바위의 약한 부분을 깎아 내면 이렇게 구멍 뚫린 바위 문(해식아치)이 생겨요.', 'gate'),
  candle: R_('촛대바위', '서도 동쪽 바다', '촛불을 꽂는 촛대처럼 가늘고 높게 솟아 있어요. 장군처럼 늠름하다고 해서 장군바위라고도 불러요.', '파도가 바위 둘레를 깎고 단단한 부분만 기둥처럼 남은 바위를 시스택(해식주)이라고 해요.', 'candle'),
  threecaves: R_('삼형제굴바위', '서도 북동쪽 바다', '바위에 굴이 세 개 뚫려 있어서 삼형제굴바위라고 불러요.', '파도가 바위 틈을 계속 때리면 틈이 점점 넓어져 굴(해식동굴)이 돼요.', 'threecaves'),
  tanggeon: R_('탕건봉', '서도 북쪽', '옛날 선비들이 갓 아래에 쓰던 모자인 탕건을 닮은 봉우리예요.', '바위 표면에 세로로 갈라진 틈이 많아 기둥을 여러 개 세워 놓은 것처럼 보여요.', 'tanggeon'),
  elephant: R_('코끼리바위', '서도 서쪽 바다', '코끼리가 바다에 코를 담그고 물을 마시는 모습처럼 보여요.', '코와 몸통 사이의 구멍도 파도가 깎아서 만든 거예요.', 'elephant'),
  face: R_('얼굴바위', '동도 남동쪽 바다', '옆에서 보면 사람의 옆얼굴처럼 보여요. 이마, 코, 턱을 찾아보세요.', '같은 바위도 보는 방향에 따라 모양이 달라 보여요. 화면을 돌려서 확인해 보세요!', 'face'),
  fan: R_('부채바위', '동도 남쪽 바다', '쫙 펼친 부채처럼 얇고 넓게 펼쳐진 바위예요.', '부챗살처럼 보이는 줄무늬는 바위가 쪼개지고 깎이며 생겼어요.', 'fan'),
  chicken: R_('닭바위', '동도 북서쪽 바다', '닭이 알을 품고 앉아 있는 모습을 닮았어요.', '머리, 볏, 몸통, 꼬리를 찾아보세요.', 'chicken'),
  whetstone: R_('숫돌바위', '동도 서쪽 바다', '칼을 가는 숫돌처럼 층층이 쌓인 바위예요. 옛날에 실제로 칼을 가는 데 썼다고 전해져요.', '층층이 보이는 무늬는 화산재와 돌 부스러기가 차곡차곡 쌓여서 생긴 층이에요.', 'whetstone'),
  gaje: R_('가제바위', '서도 북서쪽 바다', '물 위로 낮고 넓적하게 드러난 바위예요. 예전에 강치(바다사자)들이 올라와 쉬던 곳이에요.', '가제는 강치를 부르던 울릉도 사투리예요.', 'gaje'),
  bochal: R_('보찰바위', '서도 남서쪽 바다', '뾰족뾰족한 바위에 거북손이 많이 붙어 살아요. 울릉도 사람들은 거북손을 보찰이라고 불렀어요.', '거북손은 거북의 발을 닮은 동물로 따개비의 친척이에요.', 'bochal'),
  peninsula: R_('한반도바위', '동도 북동쪽', '바위 모양이 한반도를 닮았다고 해서 붙은 이름이에요.', '독도에는 생김새를 따서 이름 붙인 바위가 아주 많아요.', 'peninsula'),
  rock: R_('바위', '독도 바다', '파도에 깎인 바위예요.', '독도는 동도·서도와 89개의 작은 부속 섬으로 이루어져 있어요.', 'generic', { label: false }),

  damsel: K({ name: '자리돔', group: 'fish', icon: '🐟', mesh: () => FISH.damsel(), anim: 1, animP: [9, 14, 0.035, 0], beh: 'school', n: 36, spread: 5, s: 1.3, r: 0.25, where: '독도 바닷속 곳곳', place: 'water', desc: '손가락만 한 작은 물고기로 수백 마리가 떼를 지어 다녀요. 꼬리 쪽에 흰 점이 있어요.', fact: '독도 바닷속에서 가장 흔하게 볼 수 있는 물고기 중 하나예요.' }),
  bluedam: K({ name: '파랑돔', group: 'fish', icon: '🐠', mesh: () => FISH.blue(), anim: 1, animP: [10, 18, 0.03, 0], beh: 'school', n: 14, spread: 3, s: 1.5, r: 0.2, gloss: 0.3, where: '동도 남쪽 바다', place: 'water', desc: '몸은 파랗게 빛나고 배와 꼬리는 노란 작은 물고기예요.', fact: '원래 따뜻한 남쪽 바다에 사는 물고기예요. 독도에서 보이는 것은 바다가 따뜻해지고 있다는 신호예요.' }),
  hump: K({ name: '혹돔', group: 'fish', icon: '🐟', mesh: () => FISH.hump(), anim: 1, animP: [4, 4, 0.08, 0], beh: 'swim', n: 2, spread: 12, s: 1, r: 0.6, where: '바위 굴 근처', place: 'water', desc: '이마에 커다란 혹이 볼록 튀어나온 물고기예요. 1m 가까이 자라요.', fact: '자라면서 이마의 혹이 점점 커져요. 낮에는 바위 굴에 숨어 있기도 해요.' }),
  stone: K({ name: '돌돔', group: 'fish', icon: '🐟', mesh: () => FISH.stone(), anim: 1, animP: [6, 7, 0.05, 0], beh: 'swim', n: 4, spread: 10, s: 1, r: 0.35, where: '바위가 많은 바다', place: 'water', desc: '몸에 굵은 검은 줄무늬가 있는 물고기예요.', fact: '튼튼한 이빨로 성게나 소라 껍데기도 부숴 먹어요.' }),
  squid: K({ name: '오징어', group: 'sea', icon: '🦑', mesh: squidMesh, anim: 5, animP: [3, 0.02, 0, 0], beh: 'swim', n: 6, spread: 14, s: 2.2, r: 0.3, gloss: 0.4, where: '독도 주변 바다', place: 'water', desc: '다리가 10개인 바다 동물이에요. 몸 끝의 지느러미로 헤엄쳐요.', fact: '독도 주변 바다는 오징어가 많이 잡히는 좋은 어장이에요. 위험하면 먹물을 뿜고 도망가요.' }),
  shrimp: K({ name: '독도새우', group: 'sea', icon: '🦐', mesh: shrimpMesh, beh: 'patch', n: 12, spread: 3, s: 2.2, r: 0.2, gloss: 0.4, where: '깊고 차가운 바다 밑', place: 'seabed', desc: '도화새우, 물렁가시붉은새우, 가시배새우 등을 함께 부르는 이름이에요. 붉은 몸에 흰 무늬가 있어요.', fact: '독도 주변의 깊고 차가운 바다에서 사는 귀한 새우예요.' }),
  urchin: K({ name: '성게', group: 'sea', icon: '🟣', mesh: urchinMesh, beh: 'patch', n: 16, spread: 4, s: 1.6, r: 0.15, where: '바닷속 바위 위', place: 'seabed', desc: '온몸이 뾰족한 가시로 덮인 동그란 동물이에요. 해조류를 갉아 먹어요.', fact: '성게가 너무 많아지면 해조류를 다 먹어 치워 바닷속 바위가 하얗게 변하는 갯녹음이 생겨요.' }),
  star: K({ name: '불가사리', group: 'sea', icon: '⭐', mesh: starMesh, beh: 'patch', n: 8, spread: 4, s: 2, r: 0.15, where: '바닷속 바위 위', place: 'seabed', desc: '팔이 다섯 개인 별 모양 동물이에요.', fact: '팔이 잘려도 다시 자라나요. 조개를 벌려서 먹기도 해요.' }),
  abalone: K({ name: '전복', group: 'sea', icon: '🐚', mesh: abaloneMesh, beh: 'patch', n: 6, spread: 3, s: 2.2, r: 0.12, where: '얕은 바다 바위', place: 'seabed', desc: '넓적한 껍데기를 가진 조개 무리예요. 바위에 딱 붙어 미역 같은 해조류를 먹어요.', fact: '껍데기에 줄지어 난 구멍으로 물을 내보내며 숨을 쉬어요.' }),
  conch: K({ name: '소라', group: 'sea', icon: '🐚', mesh: conchMesh, beh: 'patch', n: 6, spread: 3, s: 2.2, r: 0.12, where: '얕은 바다 바위', place: 'seabed', desc: '돌돌 말린 껍데기에 뾰족한 돌기가 난 고둥이에요.', fact: '껍데기는 자라면서 나선 모양으로 점점 커져요.' }),
  cucumber: K({ name: '해삼', group: 'sea', icon: '🥒', mesh: cucumberMesh, beh: 'patch', n: 5, spread: 3, s: 2.2, r: 0.15, where: '바다 밑바닥', place: 'seabed', desc: '울퉁불퉁한 오이처럼 생긴 동물이에요.', fact: '바닥의 찌꺼기를 먹어서 바다를 깨끗하게 하는 바다의 청소부예요.' }),
  mussel: K({ name: '홍합', group: 'sea', icon: '🦪', mesh: musselMesh, beh: 'patch', n: 22, spread: 5, s: 2, r: 0.07, where: '물가 바위', place: 'shore', desc: '검푸른 껍데기를 가진 조개예요. 파도가 치는 바위에 무리 지어 붙어 살아요.', fact: '몸에서 튼튼한 실(족사)을 뽑아 바위에 단단히 붙어 있어요.' }),
  kelp: K({ name: '대황·감태 숲', group: 'plant', icon: '🌿', mesh: () => kelpMesh(true), anim: 3, animP: [0.9, 0.35, 0, 0], two: 1, beh: 'patch', n: 12, spread: 6, s: 1, r: 0.8, where: '수심 5~20m 바위', place: 'seabed', desc: '바닷속에 숲을 이루는 갈색 해조류예요. 물결 따라 하늘하늘 흔들려요.', fact: '바다숲은 물고기의 집이자 알 낳는 곳이에요. 광합성으로 산소도 만들어요.' }),
  tunicate: K({ name: '유령멍게', group: 'sea', icon: '👻', mesh: tunicateMesh, mat: 2, alpha: 0.35, gloss: 0.6, beh: 'patch', n: 10, spread: 2.5, s: 2.2, r: 0.12, where: '바위와 암초', place: 'seabed', desc: '몸이 투명해서 유령처럼 보이는 멍게예요.', fact: '원래 우리 바다에 살지 않던 외래종이에요. 많이 퍼지면 원래 살던 생물의 자리를 빼앗아요.' }),
  hydrate: K({ name: '메탄 하이드레이트', group: 'res', icon: '💎', mesh: hydrateMesh, mat: 3, emis: 0.5, gloss: 0.8, beh: 'plume', s: 1.4, r: 1.6, where: '독도 주변 깊은 바다 밑 (모형)', place: 'seabed', desc: '천연가스가 물과 얼어붙은 얼음 같은 물질로, 불을 붙이면 타서 불타는 얼음이라고 불러요.', fact: '독도 주변 깊은 바다 밑에 약 6억 톤이 묻혀 있을 것으로 추정되는 미래 에너지 자원이에요. 실제로는 수심 2,000m 가까운 곳에 있어요.' }),
  sealion: K({ name: '강치 (과거 복원)', group: 'res', icon: '🦭', mesh: sealionMesh, anim: 6, animP: [1.2, 2, 0.05, 0], beh: 'rest', s: 1, r: 1.1, gloss: 0.35, where: '가제바위 (과거)', place: 'ground', desc: '독도에 수만 마리가 살던 바다사자예요. 지금은 볼 수 없어서 옛 모습을 되살려 보여 줘요.', fact: '일제강점기에 일본 어부들이 가죽과 기름을 얻으려고 마구 잡아서 독도에서 사라졌어요.' }),

  gull: K({ name: '괭이갈매기', group: 'bird', icon: '🕊️', mesh: () => gullMesh(false), anim: 2, animP: [7, 0.16, 0, 0], two: 1, beh: 'fly', n: 10, spread: 45, s: 1.4, r: 0.5, where: '독도 하늘과 절벽', place: 'air', desc: '울음소리가 고양이(괭이)처럼 "냐오~" 들려서 괭이갈매기예요. 부리 끝에 빨간 점과 검은 띠가 있어요.', fact: '봄부터 여름까지 수만 마리가 독도에서 알을 낳고 새끼를 키워요. 독도를 대표하는 새예요.' }),
  gullsit: K({ name: '괭이갈매기 (쉬는 중)', group: 'bird', icon: '🕊️', mesh: () => gullMesh(true), beh: 'patch', n: 10, spread: 12, s: 1.4, r: 0.35, where: '동도 절벽 위', place: 'ground', desc: '절벽 위에서 쉬거나 알을 품고 있는 괭이갈매기예요.', fact: '괭이갈매기는 해마다 같은 곳에 돌아와 둥지를 트는 경우가 많아요.' }),
  petrel: K({ name: '바다제비', group: 'bird', icon: '🐦', mesh: petrelMesh, anim: 2, animP: [10, 0.12, 0, 0], two: 1, beh: 'fly', n: 6, spread: 30, s: 1.6, r: 0.3, where: '서도와 바다 위', place: 'air', desc: '몸이 작고 짙은 갈색인 바다새예요. 제비처럼 날렵하게 바다 위를 날아요.', fact: '독도에서 굴을 파고 알을 낳아요. 낮에는 먼 바다에서 먹이를 찾고 밤에 둥지로 돌아와요.' }),
  egret: K({ name: '황로', group: 'bird', icon: '🦩', mesh: egretMesh, beh: 'patch', n: 3, spread: 4, s: 1.3, r: 0.5, where: '선착장 근처', place: 'ground', desc: '하얀 몸에 머리와 목이 주황빛을 띠는 백로 무리의 새예요.', fact: '독도는 먼 바다를 건너는 철새들이 잠시 쉬어 가는 쉼터예요.' }),

  aster: K({ name: '해국', group: 'plant', icon: '🪻', mesh: () => flowerMesh(col('#b9a0e6'), col('#f0c020'), col('#4a6a3a'), 7, 16, 0.045), anim: 3, animP: [1.6, 0.05, 0, 0], two: 1, beh: 'patch', n: 8, spread: 6, s: 1.6, r: 0.3, where: '바닷가 절벽', place: 'ground', desc: '바닷가 절벽에서 자라는 국화예요. 가을에 연한 보라색 꽃이 피어요.', fact: '거센 바닷바람을 견디려고 땅에 붙은 듯 낮게 자라요.' }),
  sedum: K({ name: '섬기린초', group: 'plant', icon: '🌼', mesh: () => flowerMesh(col('#f4c81c'), col('#e09a10'), col('#3f7a2a'), 9, 5, 0.035), anim: 3, animP: [1.8, 0.04, 0, 0], two: 1, beh: 'patch', n: 6, spread: 5, s: 1.6, r: 0.3, where: '햇볕 드는 바위틈', place: 'ground', desc: '두툼한 잎에 물을 저장하는 식물이에요. 여름에 노란 별 모양 꽃이 피어요.', fact: '울릉도와 독도에서 자라는 식물로, 물이 부족한 바위틈에서도 잘 견뎌요.' }),
  euonymus: K({ name: '독도 사철나무', group: 'plant', icon: '🌳', mesh: shrubMesh, anim: 3, animP: [1.1, 0.06, 0, 0], beh: 'patch', n: 2, spread: 3, s: 1.3, r: 1.2, where: '동도 절벽', place: 'ground', desc: '사계절 내내 잎이 푸른 나무예요. 흙이 거의 없는 절벽에서 100년 넘게 살아왔어요.', fact: '독도에서 가장 오래된 나무로 알려져 있고, 천연기념물 제538호로 지정되었어요.' }),

  quay: K({ name: '독도 선착장', group: 'fac', icon: '⚓', mesh: FAC.quay, beh: 'static', r: 17, label: true, where: '동도 남쪽', place: 'sea', desc: '배가 닿는 곳이에요. 독도를 찾은 사람들이 여기서 내려 독도 땅을 밟아요.', fact: '파도가 높으면 배가 닿을 수 없어서 독도 땅을 밟기가 쉽지 않아요.' }),
  guard: K({ name: '독도경비대', group: 'fac', icon: '👮', mesh: FAC.guard, beh: 'static', r: 11, label: true, where: '동도 위쪽', place: 'ground', desc: '독도를 지키는 경찰 경비대원들이 생활하며 근무하는 곳이에요.', fact: '경비대원들은 24시간 교대로 독도의 바다와 하늘을 지켜요.' }),
  light: K({ name: '독도 등대', group: 'fac', icon: '🗼', mesh: FAC.light, beh: 'static', r: 8, label: true, where: '동도 꼭대기 부근', place: 'ground', desc: '밤바다를 지나는 배들에게 길을 알려 주는 등대예요.', fact: '1954년에 처음 불을 밝혔어요.' }),
  heli: K({ name: '헬기장', group: 'fac', icon: '🚁', mesh: FAC.heli, beh: 'static', r: 12, label: true, where: '동도 위쪽', place: 'ground', desc: '헬리콥터가 뜨고 내리는 곳이에요.', fact: '배가 닿기 어려운 날에도 헬리콥터로 사람과 물건을 나를 수 있어요.' }),
  house: K({ name: '주민숙소', group: 'fac', icon: '🏠', mesh: FAC.house, beh: 'static', r: 9, label: true, where: '서도 동쪽 바닷가', place: 'ground', desc: '독도 주민이 사는 집이에요.', fact: '독도에는 주소를 두고 실제로 사는 주민이 있어요. 주소는 경상북도 울릉군 울릉읍 독도리예요.' }),
  flag: K({ name: '태극기', group: 'fac', icon: '🇰🇷', mesh: FAC.flag, anim: 4, animP: [5, 2.2, 0.28, 0], two: 1, beh: 'static', r: 3, where: '동도', place: 'ground', desc: '독도가 대한민국 땅임을 보여 주는 태극기예요.', fact: '독도의 태극기는 바닷바람을 맞으며 늘 힘차게 펄럭여요.' }),
  post: K({ name: '독도 우체통', group: 'fac', icon: '📮', mesh: FAC.post, beh: 'static', r: 1.2, where: '동도', place: 'ground', desc: '독도에서도 편지를 보낼 수 있는 빨간 우체통이에요.', fact: '독도의 우편번호는 40240이에요.' }),
  inscr: K({ name: '한국령 각석문', group: 'fac', icon: '🪧', mesh: FAC.inscription, beh: 'static', r: 2, where: '동도 바위', place: 'ground', desc: '바위에 한자로 韓國領(한국령), 즉 한국 땅이라고 새겨 놓았어요.', fact: '1954년 독도의용수비대가 새겼어요. 독도의용수비대는 독도를 지키려고 스스로 모인 사람들이에요.' }),
  territory: K({ name: '영토 표지석', group: 'fac', icon: '🗿', mesh: FAC.territory, beh: 'static', r: 1.8, where: '동도', place: 'ground', desc: '대한민국 독도라고 새긴 돌 표지석이에요.', fact: '이곳이 우리나라 영토임을 알리는 표시예요.' }),
  sign1: K({ name: '도로명판 독도이사부길', group: 'fac', icon: '🪧', mesh: FAC.sign1, beh: 'static', r: 1.6, where: '동도 선착장', place: 'ground', desc: '동도의 도로명은 독도이사부길이에요.', fact: '이사부는 512년 우산국(지금의 울릉도·독도)을 신라 땅으로 만든 장군이에요.' }),
  sign2: K({ name: '도로명판 독도안용복길', group: 'fac', icon: '🪧', mesh: FAC.sign2, beh: 'static', r: 1.6, where: '서도', place: 'ground', desc: '서도의 도로명은 독도안용복길이에요.', fact: '안용복은 조선 숙종 때 일본에 건너가 울릉도와 독도가 조선 땅임을 당당히 밝힌 어부예요.' }),
  spring: K({ name: '물골', group: 'fac', icon: '💧', mesh: FAC.spring, beh: 'static', r: 3, where: '서도 북서쪽', place: 'ground', desc: '서도의 바위틈에서 물이 조금씩 고이는 샘이에요.', fact: '바닷물로 둘러싸인 독도에서 사람이 마실 수 있는 물을 얻을 수 있는 귀한 곳이에요.' }),
  bench: K({ name: '국가기준점', group: 'fac', icon: '📍', mesh: FAC.benchmark, beh: 'static', r: 0.8, where: '동도', place: 'ground', desc: '땅의 위치와 높이를 정확하게 재는 기준이 되는 표시예요.', fact: '지도를 만들 때 이런 기준점을 바탕으로 위치를 재요.' }),
  camera: K({ name: 'KBS 카메라', group: 'fac', icon: '📹', mesh: FAC.camera, beh: 'static', r: 2.5, where: '동도', place: 'ground', desc: '독도의 모습을 찍어 방송으로 보여 주는 카메라예요.', fact: '멀리 있어도 카메라 덕분에 독도의 날씨와 바다를 볼 수 있어요.' }),
  boat: K({ name: '탐험 보트', group: 'fac', icon: '🚤', mesh: boatMesh, beh: 'boat', two: 1, r: 4.2, gloss: 0.35, label: true, where: '동도 선착장 앞바다', place: 'sea', desc: '독도 둘레를 돌아볼 수 있는 작은 보트예요. 탐험가 모드에서 〈배 타기〉를 누르면 직접 운전할 수 있어요.', fact: '실제로 독도에 가려면 울릉도에서 여객선을 타고 1시간 30분 정도 바다를 건너야 해요.' }),
  alpine: K({ name: '산악회 표석', group: 'fac', icon: '🪨', mesh: FAC.stone, beh: 'static', r: 1, where: '동도', place: 'ground', desc: '한국산악회가 독도를 조사하고 세운 표석이에요.', fact: '광복 뒤 여러 차례 독도 학술 조사가 이루어졌어요.' })
};
/* terrain / sea info cards (not elements) */
const AREA_INFO = {
  dongdo: { name: '동도', icon: '⛰️', group: '섬', where: '독도의 동쪽 섬', desc: '높이 약 98.6m의 섬이에요. 선착장, 독도경비대, 등대, 헬기장이 있어요. 도로명은 독도이사부길이에요.', fact: '섬 가운데에는 바닷물과 이어진 깊은 구멍, 천장굴이 있어요.' },
  seodo: { name: '서도', icon: '🏔️', group: '섬', where: '독도의 서쪽 섬', desc: '높이 약 168.5m로 동도보다 높고 가팔라요. 주민숙소와 물골이 있어요. 도로명은 독도안용복길이에요.', fact: '독도는 동도, 서도와 89개의 부속 섬, 모두 91개의 섬으로 이루어져 있어요.' },
  cheonjang: { name: '천장굴', icon: '🕳️', group: '지형', where: '동도 가운데', desc: '동도 한가운데가 깊게 꺼져 바닷물이 들어와 있는 구멍이에요.', fact: '화산섬이 파도에 깎이고 무너지면서 생긴 특별한 지형이에요.' },
  sea: { name: '독도 바다', icon: '🌊', group: '바다', where: '독도 주변', desc: '따뜻한 바닷물(난류)과 차가운 바닷물(한류)이 만나는 곳이에요. 이런 곳을 조경수역이라고 해요.', fact: '조경수역에는 물고기의 먹이인 플랑크톤이 많아서 물고기가 아주 많이 모여요.' },
  seabed: { name: '독도 해저', icon: '🌋', group: '지형', where: '바다 밑', desc: '독도는 바다 밑 화산이 폭발하며 솟아오른 화산섬이에요. 약 460만 년 전부터 250만 년 전 사이에 만들어졌어요.', fact: '물 위로 보이는 독도는 거대한 해저 화산의 꼭대기 부분일 뿐이에요.' }
};

const DEFAULT_ELEMS = [
  ['gate', 339, 0, 93, 0.3], ['candle', -99, 0, 91, 1.2], ['threecaves', -65, 0, -105, 0.4], ['tanggeon', -218, 0, -246, 0.2], ['elephant', -359, 0, 51, 2.6],
  ['face', 290, 0, 166, -0.6], ['fan', 125, 0, 222, 0.15], ['chicken', 49, 0, -91, 2.2], ['whetstone', 49, 0, 144, 0.5], ['gaje', -290, 0, -287, 0.3],
  ['bochal', -380, 0, 112, 1.0], ['peninsula', 271, 0, -104, 0.7],
  ['quay', 200, 1.2, 181, 0], ['guard', 222, 0, 6, 0.3], ['light', 243, 0, 26, 1.1], ['heli', 166, 0, 4, 0.2], ['house', -121, 0, 47, 1.57],
  ['flag', 208, 0, 184, 0.4], ['flag', 205, 0, 41, 0.4], ['post', 204, 0, 45, -0.5], ['inscr', 199, 0, 42, 2.4], ['territory', 169, 0, 75, 0.3],
  ['sign1', 188, 0, 184, 0.1], ['sign2', -116, 0, 40, 1.4], ['spring', -312, 0, -166, 0.6], ['bench', 220, 0, -10, 0], ['bench', 181, 0, 185, 0],
  ['camera', 226, 0, -15, 2.4], ['alpine', 278, 0, 100, 0], ['boat', 208, 0, 205, 0],
  ['damsel', -40, -6, 40, 0], ['damsel', 20, -5, 118, 0], ['damsel', -60, -6, -40, 0], ['damsel', 180, -5, 212, 0], ['bluedam', 255, -5, 214, 0], ['bluedam', -150, -4, 122, 0],
  ['hump', 255, -8, 222, 0], ['hump', -200, -8, 150, 0], ['stone', -150, -6, 125, 0], ['stone', 25, -6, 125, 0], ['squid', -20, -9, -80, 0],
  ['shrimp', 0, 0, -150, 0], ['shrimp', -40, 0, 45, 0], ['urchin', -35, 0, 30, 0], ['urchin', 30, 0, 118, 0], ['urchin', -155, 0, 118, 0], ['urchin', 170, 0, 208, 0],
  ['star', -48, 0, 50, 0], ['star', 18, 0, 128, 0], ['abalone', -150, 0, 112, 0], ['abalone', 60, 0, 190, 0], ['conch', -160, 0, 128, 0], ['conch', 62, 0, 182, 0],
  ['cucumber', -30, 0, 55, 0], ['cucumber', -205, 0, 145, 0], ['mussel', 282, 0, 147, 0], ['mussel', -128, 0, 30, 0], ['kelp', 20, 0, 108, 0], ['kelp', -150, 0, 130, 0],
  ['kelp', -60, 0, -32, 0], ['kelp', 170, 0, 218, 0], ['kelp', 250, 0, 205, 0], ['tunicate', 262, 0, 212, 0], ['tunicate', -52, 0, -48, 0], ['hydrate', -10, 0, -205, 0],
  ['sealion', -292, 5, -287, 0.4], ['sealion', -283, 4.5, -292, 2.8], ['sealion', -298, 4, -282, 1.6],
  ['gull', 110, 45, 60, 0], ['gull', -220, 80, -90, 0], ['gull', 250, 30, 150, 0], ['gullsit', 110, 0, 158, 0], ['gullsit', -150, 0, 70, 0], ['gullsit', 150, 0, 60, 0],
  ['petrel', 120, 24, 183, 0], ['petrel', -260, 30, 20, 0], ['egret', 196, 0, 190, 0], ['aster', 183, 0, 138, 0], ['aster', 140, 0, 120, 0], ['aster', -140, 0, 20, 0],
  ['sedum', 181, 0, 130, 0], ['sedum', -150, 0, 60, 0], ['euonymus', 184, 0, 131, 0]
];

const SCN = { elems: [], uid: 1, meshes: {}, sel: null, t: 0 };
function sceneMeshes(quality) {
  for (const [id, k] of Object.entries(KINDS)) {
    const m = k.beh === 'rock' ? buildRockMesh(k.shape, id.length * 7 + 3, quality) : k.mesh();
    if (k.beh === 'rock') { k.fp = m.footprint; k.r = m.radius; k.top = m.top; }
    SCN.meshes[id] = meshGL(m);
  }
}
function newElem(kind, x, y, z, yaw = 0, s = 1) {
  const e = { uid: SCN.uid++, kind, x, y, z, yaw, s, hidden: false, frozen: false, ft: 0, sub: [] };
  layoutElem(e); return e;
}
function groundY(x, z) { return TER.heightAt(x, z); }
function layoutElem(e) {
  const k = KINDS[e.kind], rnd = makeRand(e.uid * 977 + 13); e.sub = [];
  if (k.place === 'ground' && k.beh === 'static') e.y = Math.max(groundY(e.x, e.z), 0.2);
  if (k.beh === 'patch') {
    let tries = 0;
    while (e.sub.length < k.n && tries++ < k.n * 30) {
      const a = rnd() * TAU, d = Math.sqrt(rnd()) * k.spread * e.s, x = e.x + Math.cos(a) * d, z = e.z + Math.sin(a) * d, h = groundY(x, z);
      if (k.place === 'seabed' && h > -1.2) continue;
      if (k.place === 'ground' && h < 0.4) continue;
      if (k.place === 'shore' && (h < -1.4 || h > 0.7)) continue;
      const n = TER.normalAt(x, z);
      e.sub.push({ x, y: h - 0.02, z, yaw: rnd() * TAU, pitch: -n[0] * 0.6, roll: n[2] * 0.6, s: k.s * (0.75 + rnd() * 0.5), ph: rnd() * 10 });
    }
    if (!e.sub.length && k.place !== 'shore') e.sub.push({ x: e.x, y: groundY(e.x, e.z), z: e.z, yaw: 0, pitch: 0, roll: 0, s: k.s, ph: 0 });
  } else if (k.beh === 'school' || k.beh === 'swim' || k.beh === 'fly') {
    for (let i = 0; i < k.n; i++) e.sub.push({ ox: (rnd() - .5) * 2, oy: (rnd() - .5) * 2, oz: (rnd() - .5) * 2, ph: rnd() * TAU, sp: 0.75 + rnd() * 0.5, s: k.s * (0.8 + rnd() * 0.4), r: 0.5 + rnd() * 0.5 });
  }
}
function sceneInit(saved) {
  SCN.elems = [];
  if (saved && saved.elems) { for (const s of saved.elems) if (KINDS[s.kind]) { const e = newElem(s.kind, s.x, s.y, s.z, s.yaw, s.s); e.hidden = !!s.hidden; SCN.elems.push(e); } }
  else for (const [kind, x, y, z, yaw] of DEFAULT_ELEMS) SCN.elems.push(newElem(kind, x, y, z, yaw, 1));
  stampRocks();
}
function sceneSerialize() { return SCN.elems.map(e => ({ kind: e.kind, x: +e.x.toFixed(2), y: +e.y.toFixed(2), z: +e.z.toFixed(2), yaw: +e.yaw.toFixed(3), s: +e.s.toFixed(3), hidden: e.hidden || undefined })); }
function stampRocks() {
  const { W, D, C, X0, Z0 } = TER; TER.ST.fill(-99);
  for (const e of SCN.elems) {
    const k = KINDS[e.kind]; if (k.beh !== 'rock' || e.hidden) continue;
    const c = Math.cos(e.yaw), s = Math.sin(e.yaw), f = k.fp;
    for (let i = 0; i < f.length; i += 3) {
      const lx = f[i] * e.s, lz = f[i + 1] * e.s, x = e.x + c * lx + s * lz, z = e.z - s * lx + c * lz;
      const gi = Math.round((x - X0) / C), gj = Math.round((z - Z0) / C); if (gi < 0 || gj < 0 || gi >= W || gj >= D) continue;
      const k2 = gj * W + gi; TER.ST[k2] = Math.max(TER.ST[k2], f[i + 2]);
    }
  }
  if (TER.tex) { terrainFillTex(0, TER.D - 1); gl.bindTexture(gl.TEXTURE_2D, TER.tex); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, TER.W, TER.D, gl.RGBA, gl.UNSIGNED_BYTE, TER.tp); }
}

/* behavior → world transforms for each sub-instance; out(x,y,z,s,yaw,pitch,roll,ph) */
function elemInstances(e, T, out) {
  const k = KINDS[e.kind], t = e.frozen ? e.ft : T;
  if (k.beh === 'rock' || k.beh === 'static' || k.beh === 'plume') { out(e.x, e.y, e.z, e.s * k.s, e.yaw, 0, 0, 0); return; }
  if (k.beh === 'boat') { if (!(EXP.state === 'boat' && EXP.boat === e && MODE.cur === 'explorer')) boatPose(e); out(e.x, e.y, e.z, e.s * k.s, e.yaw, e.pitch || 0, e.roll || 0, 0); return; }
  if (k.beh === 'rest') { out(e.x, e.y, e.z, e.s * k.s, e.yaw, 0, 0.12, e.uid); return; }
  if (k.beh === 'patch') { for (const s of e.sub) out(s.x, s.y, s.z, s.s * e.s, s.yaw, s.pitch, s.roll, s.ph); return; }
  if (k.beh === 'school') {
    const w = 0.09 / Math.max(0.6, e.s), R = k.spread * 2.2 * e.s, a = t * w + e.uid;
    const cx = e.x + Math.cos(a) * R, cz = e.z + Math.sin(a) * R * 0.75, cy = e.y + Math.sin(t * 0.13 + e.uid) * 1.2;
    const hx = -Math.sin(a) * R, hz = Math.cos(a) * R * 0.75, yaw = Math.atan2(-hz, hx), ch = Math.cos(yaw), sh = Math.sin(yaw);
    for (const s of e.sub) {
      const lx = s.ox * k.spread * e.s + Math.sin(t * 0.7 * s.sp + s.ph) * 0.6, lz = s.oz * k.spread * 0.6 * e.s, ly = s.oy * k.spread * 0.3 * e.s;
      let x = cx + ch * lx + sh * lz, z = cz - sh * lx + ch * lz, y = cy + ly + Math.sin(t * 1.1 + s.ph) * 0.2;
      const g = groundY(x, z); y = clamp(y, g + 0.8, -0.9);
      out(x, y, z, s.s * e.s, yaw + Math.sin(t * 1.3 + s.ph) * 0.18, Math.sin(t * 0.9 + s.ph) * 0.08, 0, s.ph);
    }
    return;
  }
  if (k.beh === 'swim') {
    for (const s of e.sub) {
      const w = 0.12 * s.sp / Math.max(0.5, e.s), a = t * w + s.ph, R = k.spread * s.r * e.s;
      const x = e.x + Math.cos(a) * R + s.ox * 3, z = e.z + Math.sin(a * 1.3) * R * 0.6 + s.oz * 3;
      const dx = -Math.sin(a) * R, dz = Math.cos(a * 1.3) * R * 0.78;
      let y = e.y + s.oy * 2 + Math.sin(a * 0.7) * 1.5; const g = groundY(x, z); y = clamp(y, g + 1.2, -1.2);
      out(x, y, z, s.s * e.s, Math.atan2(-dz, dx), Math.sin(a * 0.7) * 0.1, 0, s.ph);
    }
    return;
  }
  if (k.beh === 'fly') {
    for (const s of e.sub) {
      const w = 0.22 * s.sp, dir = s.ox > 0 ? 1 : -1, a = t * w * dir + s.ph, R = k.spread * s.r * e.s;
      const x = e.x + Math.cos(a) * R, z = e.z + Math.sin(a) * R, dx = -Math.sin(a) * dir, dz = Math.cos(a) * dir;
      let y = e.y + s.oy * 12 + Math.sin(t * 0.4 + s.ph) * 5; y = Math.max(y, groundY(x, z) + 6);
      out(x, y, z, s.s * e.s, Math.atan2(-dz, dx), Math.sin(t * 0.8 + s.ph) * 0.12, -dir * 0.35, s.ph);
    }
  }
}

/* build instance arrays per kind */
function sceneUpdateInstances(T) {
  const bufs = {};
  for (const e of SCN.elems) {
    if (e.hidden) continue;
    const m = SCN.meshes[e.kind], sel = SCN.sel === e ? 1 : 0, fz = e.frozen ? 1 : 0, flap = 1;
    const arr = bufs[e.kind] || (bufs[e.kind] = []);
    elemInstances(e, T, (x, y, z, s, yaw, pitch, roll, ph) => arr.push(x, y, z, s, yaw, pitch, roll, ph, sel, fz, e.ft, flap));
  }
  for (const [id, m] of Object.entries(SCN.meshes)) {
    const a = bufs[id]; m.n = a ? a.length / 12 : 0; if (!m.n) continue;
    if (m.inst.length < a.length) m.inst = new Float32Array(Math.max(a.length, m.inst.length * 2));
    m.inst.set(a);
    gl.bindBuffer(gl.ARRAY_BUFFER, m.ib);
    if (m.cap < m.inst.length) { gl.bufferData(gl.ARRAY_BUFFER, m.inst, gl.DYNAMIC_DRAW); m.cap = m.inst.length; }
    else gl.bufferSubData(gl.ARRAY_BUFFER, 0, m.inst, 0, a.length);
  }
}

/* picking: ray vs spheres around each sub-instance */
function elemSpheres(e, T, cb) {
  const k = KINDS[e.kind];
  if (k.beh === 'rock') { cb(e.x, (k.top || 10) * 0.42 * e.s, e.z, k.r * 0.72 * e.s); return; }
  if (k.beh === 'static' || k.beh === 'plume' || k.beh === 'rest' || k.beh === 'boat') { cb(e.x, e.y + k.r * 0.3 * e.s * k.s, e.z, k.r * e.s * k.s); return; }
  let n = 0;
  elemInstances(e, T, (x, y, z, s) => { cb(x, y + k.r * s * 0.4, z, Math.max(k.r * s * 2.2, 0.55), n); n++; });
}
function scenePick(o, d, T, filter) {
  let best = null;
  for (const e of SCN.elems) {
    if (e.hidden || (filter && !filter(e))) continue;
    elemSpheres(e, T, (x, y, z, r, si) => {
      const ox = o[0] - x, oy = o[1] - y, oz = o[2] - z, b = ox * d[0] + oy * d[1] + oz * d[2], c = ox * ox + oy * oy + oz * oz - r * r, h = b * b - c;
      if (h < 0) return; const t = -b - Math.sqrt(h); if (t < 0.05) return;
      if (!best || t < best.t) best = { e, t, p: [x, y, z], r, sub: si };
    });
  }
  return best;
}
/* focus target (center + radius) for an element */
function elemFocus(e, T, sub) {
  const k = KINDS[e.kind]; let sx = 0, sy = 0, sz = 0, n = 0, rr = 0;
  const moving = k.beh === 'school' || k.beh === 'swim' || k.beh === 'fly';
  if (moving) {
    let pick = null; const want = sub === undefined ? 0 : sub;
    elemSpheres(e, T, (x, y, z, r, si) => { if (si === want || !pick) pick = [x, y, z, r]; });
    if (pick) return { c: pick.slice(0, 3), r: k.beh === 'fly' ? Math.max(pick[3] * 1.1, 1.4) : k.beh === 'school' ? Math.max(pick[3] * 2.2, 1.3) : Math.max(pick[3] * 1.2, 0.9) };
  }
  elemSpheres(e, T, (x, y, z, r) => { sx += x; sy += y; sz += z; n++; rr = Math.max(rr, r); });
  if (!n) return { c: [e.x, e.y, e.z], r: 2 };
  const c = [sx / n, sy / n, sz / n]; let spread = 0;
  elemSpheres(e, T, (x, y, z) => { spread = Math.max(spread, Math.hypot(x - c[0], y - c[1], z - c[2])); });
  const r = k.beh === 'rock' || k.beh === 'static' || k.beh === 'plume' || k.beh === 'rest' || k.beh === 'boat' ? rr : clamp(spread * 0.5, rr * 0.8, 8);
  return { c, r };
}
function areaAt(p) {
  if (p[1] < -0.6) return 'seabed';
  if (Math.hypot(p[0] - 102, (p[2] - 68) * 1.15) < 24) return 'cheonjang';
  return p[0] > -20 ? 'dongdo' : 'seodo';
}
