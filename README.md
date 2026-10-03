# 🍁 홍대·연남 2박 3일 가족여행 2026

2026.10.3(토) – 10.5(월, 대체공휴일) · 어른 2 + 중3 딸 1, 홍대입구역을 거점으로 홍대·연남·망원·신촌을 도는 가족여행 웹페이지입니다.
구조와 형식은 [삿포로, 겨울 동화](https://github.com/HS-code97/japan)를 그대로 따랐습니다.

👉 **보기: https://hs-code97.github.io/seoul/** (GitHub Pages 설정 후)

## 구성
- `index.html` / `style.css` / `app.js` — 모바일용 페이지 (하단 탭: 일정 · 지도 · 맛집 · 쇼핑 · 준비)
- `data.js` — **일정·장소·메뉴 데이터** (내용 수정은 이 파일만 고치면 됩니다)
  - 원본: Claude Docs "홍대·연남 2박 3일 가족여행 일정 (대시보드 제작용) V1.3"

## 자주 고칠 부분
- 숙소가 정해지면 `data.js` → `TRIP.hotels`를 한 곳으로 줄이고 `TRIP.stayNote` 수정
- 일정 변경은 `DAYS[].rows`의 `time`, `place`, `text`, `tip` 수정 (`[글자](주소)`는 링크가 됨)
- 핀 위치는 `PLACES`의 `lat`, `lng` — `exact: false`인 곳은 대략 위치라서 정확한 좌표로 바꾸면 `exact: true`로

## GitHub Pages
Settings → Pages → Branch: `main` / `(root)` 선택. (`.nojekyll` 포함)

지도: © OpenStreetMap contributors · 좌표 일부: Nominatim(OpenStreetMap) 검색
