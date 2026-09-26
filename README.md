# 3D 독도 탐험

우리 땅 독도의 바위와 바다, 생물을 3D로 만나는 수업용 웹앱입니다.
관찰자 · 관광 · 탐험가 · 개발자 · 퀴즈 다섯 가지 모드가 있습니다.

## 폴더 구조

```
dokdo-3d/
├─ index.html            ← 시작 파일
├─ css/style.css         ← 화면 디자인
├─ js/                   ← 기능별로 나눈 코드 (순서대로 불러옴)
│  ├─ 00_data.js         독도 높이 자료, 태극기 그림
│  ├─ 01_core.js         수학·그래픽 기본 도구, 바다·바위 무늬
│  ├─ 02_shaders.js      바다·지형·물체 그리기(셰이더)
│  ├─ 03_terrain.js      독도 지형·해저
│  ├─ 04_rocks.js        이름 있는 바위 12개
│  ├─ 05_models.js       생물·시설·탐험 보트 모형
│  ├─ 06_scene.js        배치, 설명 글, 움직임
│  ├─ 07_render.js       화면 그리기, 속도 자동 조절
│  ├─ 08_modes.js        관찰자·탐험가·개발자 조작 (등반·점프·수영·배)
│  ├─ 09_quiz.js         퀴즈 문제
│  ├─ 10_ui_audio.js     버튼·소리·도감·저장
│  └─ 11_tour.js         관광 모드 (강치 가이드)
├─ assets/
│  ├─ guide/             강치 가이드 그림 (webp)
│  └─ favicon.svg
├─ _headers              Cloudflare Pages 캐시 설정
└─ README.md
```

가장 큰 파일도 200KB가 안 되고 전체가 1MB 안팎이라
GitHub(파일당 100MB)과 Cloudflare Pages(파일당 25MB) 용량 제한에 걸리지 않습니다.

## 내 컴퓨터에서 바로 열기

`index.html`을 더블클릭하면 서버 없이 크롬·엣지에서 열립니다.
인터넷이 없으면 글꼴만 기본 글꼴로 바뀌고 나머지는 그대로 동작합니다.

## GitHub Desktop으로 올리기

1. 압축을 풀어 `dokdo-3d` 폴더를 원하는 곳에 둡니다.
2. GitHub Desktop에서 **File → Add local repository…** 를 누르고 `dokdo-3d` 폴더를 고릅니다.
3. "저장소가 아니다"라는 안내가 나오면 **create a repository** 를 눌러 저장소를 만듭니다.
4. 첫 커밋(Commit to main)을 한 뒤 **Publish repository** 를 누릅니다. 비공개(Private)로 올려도 됩니다.

## Cloudflare Pages에 연결하기

1. Cloudflare 대시보드에서 **Workers & Pages → 만들기(Create) → Pages → Git에 연결** 을 고릅니다.
2. 방금 올린 GitHub 저장소를 선택합니다.
3. 빌드 설정은 다음처럼 둡니다.
   - Framework preset: **None**
   - Build command: **비워 두기**
   - Build output directory: **/** (저장소 맨 위 폴더)
4. **저장 및 배포** 를 누르면 `○○○.pages.dev` 주소가 생깁니다.

그다음부터는 파일을 고치고 GitHub Desktop에서 **Commit → Push** 만 하면 자동으로 다시 배포됩니다.
(Cloudflare 화면의 메뉴 이름은 조금씩 바뀔 수 있어요.)

## 알아 두기

- 개발자 모드에서 바꾼 장면과 도감 기록은 **브라우저(기기)와 주소마다 따로** 저장됩니다.
  내 컴퓨터 파일로 열었을 때와 pages.dev 주소로 열었을 때의 저장 내용이 서로 다릅니다.
  옮기려면 개발자 모드 〈저장〉 탭의 **파일로 내보내기 / 불러오기** 를 쓰세요.
- 태블릿이 느리면 ⚙️ 설정에서 그래픽 품질을 **낮음** 으로 바꿔 주세요.
- WebGL2를 지원하는 최신 크롬·엣지·사파리가 필요합니다.
