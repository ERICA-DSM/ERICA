# Handoff: 길잡이 (Hi :D) — AI 사이드패널 길안내 크롬 확장

## Overview
"Hi :D"(길잡이)는 한국 행정·생활 웹사이트(정부24, 홈택스, 건강보험 등)에서 외국인·다문화 가정 사용자를 돕는 **Chrome 사이드패널 확장 프로그램**입니다. 사용자가 "하고 싶은 일"을 자기 모국어로 입력하면, **지금 보고 있는 페이지에서 다음에 눌러야 할 단 하나의 버튼**을 모국어로 안내하고, 페이지의 **광고·피싱(의심) 링크를 자동으로 걸러줍니다.**

핵심 가치: 컴퓨터에 익숙하지 않은 사용자도 "한 번에 하나씩" 따라 할 수 있는 극도로 단순한 UX.

## About the Design Files
이 번들의 `길잡이 사이드패널.dc.html` 파일은 **HTML로 제작된 디자인 레퍼런스(프로토타입)**입니다. 의도한 외형·동작을 보여주기 위한 것이지, 그대로 복사해 배포할 프로덕션 코드가 아닙니다.

작업 목표는 이 디자인을 **대상 코드베이스의 기존 환경에서 재구현**하는 것입니다. Chrome 확장(Manifest V3) 사이드패널이므로 일반적으로 다음 스택을 권장합니다:
- **React + TypeScript + Vite** (또는 CRXJS / WXT 같은 확장 전용 번들러)
- `chrome.sidePanel` API 로 사이드패널 등록
- 콘텐츠 스크립트(content script)로 현재 탭의 DOM을 읽어 "다음 버튼" 하이라이트 및 광고/피싱 링크 필터링
- 실제 안내 생성은 LLM(예: Claude API) + 페이지 DOM/텍스트 컨텍스트로 구현

정해진 프레임워크가 없다면 위 조합을 사용하세요.

## Fidelity
**High-fidelity (hifi)** 입니다. 색상, 타이포그래피, 간격, 인터랙션이 최종안에 가깝습니다. 아래 토큰/치수를 그대로 사용해 픽셀에 가깝게 재현하되, 대상 코드베이스의 컴포넌트/패턴이 있으면 그것으로 구성하세요. 콘텐츠(정부24 시나리오, 예시 문구)는 **더미 데이터**이며 런타임에 실제 페이지/API로 대체되어야 합니다.

## 전역 프레임 (사이드패널 컨테이너)
- 실제 확장에서는 브라우저 사이드패널 폭(대략 360–420px)에 맞춰 **세로로 꽉 차는** 반응형이어야 합니다. 목업은 390 × 800px 고정 카드(라운드 18px, 1px `#e6e6e6` 테두리)로 표현 — 이 카드 테두리/그림자/라운드는 목업 표현용이며 실제 패널에서는 제거하고 전체 높이를 사용하세요.
- 최상단의 "SIDE PANEL / ×" 스트립은 목업용 mock chrome이므로 실제 구현에서 제거.
- 내부 세로 레이아웃: `display:flex; flex-direction:column`. 콘텐츠 영역만 스크롤(`overflow-y:auto`), 헤더와 하단 탭바는 고정(`flex:none`).
- 폰트: **Geist** (본문/UI), **Geist Mono** (라벨·URL·배지 등 모노 강조). Google Fonts weights 400/500/600/700.

## 인증 상태 (2가지)
전역 상태 `authed: boolean` (기본 `false`).
- `false` → **로그인 화면**만 표시 (헤더·탭바 없음)
- `true` → 앱(헤더 + 콘텐츠 탭 + 하단 탭바)

---

## Screens / Views

### 0. 로그인 화면 (authed=false 일 때 첫 화면)
- **목적**: 진입 시 언어 선택 + 로그인. 컴맹 사용자를 위해 극단적으로 단순.
- **레이아웃**: 세로 flex, `padding: 30px 24px 26px`, 가운데 정렬. 상단(로고+이름+태그라인)은 `flex:1`로 세로 중앙, 하단에 언어칩 + 버튼.
- **컴포넌트**:
  - 로고: 66×66px, `background:#0a0a0a`, `border-radius:20px`, 안에 흰색 스마일 SVG(아래 Assets 참고), 40×40.
  - 워드마크 "Hi :D": 27px, weight 700, `letter-spacing:-.02em`. (":D" 앞은 `&nbsp;` 논브레이킹 스페이스)
  - 태그라인(모국어): 13.5px, `#737373`, `line-height:1.55`, `max-width:250px`. 예(EN): "Life in Korea, made simple. I will help you, one step at a time."
  - 언어 라벨(모국어): 12px `#a3a3a3`, 좌측 정렬.
  - 언어칩 4개(한국어/English/中文/Tiếng Việt): 가로 flex, `gap:6px`, 각 `flex:1; height:38px; border-radius:9px`. 선택됨 = `background:#0a0a0a; color:#fff`; 미선택 = `border:1px solid #e6e6e6; color:#525252`.
  - 기본 버튼 "로그인": 100% × 50px, `background:#0a0a0a; color:#fff; border-radius:12px`, 14.5px/600.
  - 보조 버튼 "로그인 없이 둘러보기": 100% × 42px, 투명 배경, `#737373`, 13px.
  - "로그인"·"둘러보기" 둘 다 클릭 시 `authed=true`, `tab='home'`. (실제 구현: 로그인은 OAuth/간편인증 등으로 대체)

### 1. 홈 / 기능 (tab='home', 로그인 로고 클릭 시 복귀)
- **목적**: 하고 싶은 일 입력(→대화로 이동) + 기능 On/Off.
- **레이아웃**: `padding: 18px 16px 24px`. 위에서부터 (a) 검정 히어로 카드, (b) 기능 섹션, (c) 안전 배너.
- **컴포넌트**:
  - **히어로 카드(입력)**: `background:#0a0a0a; border-radius:14px; padding:16px; color:#fff`.
    - 제목 "무엇을 도와드릴까요?" 15.5px/600.
    - 서브 "하고 싶은 일을 적어 주세요" 12.5px `#a3a3a3`.
    - 입력행(relative): `<input>` 100%×46px, `border:none; border-radius:11px; background:#fff; color:#0a0a0a`, `padding:0 50px 0 14px`, placeholder 예(EN) "e.g. I need a certificate".
    - 전송 버튼(absolute, 우측 6/6): 34×34px, `background:#0a0a0a; color:#fff; border-radius:9px`, 화살표 "➜".
    - **동작**: Enter 또는 전송 클릭 → `tab='chat'`, 입력값을 `userGoal`로 저장(빈 값이면 예시 목표 사용), `cstep=1, cdone=false`.
  - **기능 섹션 헤더**: "기능"(14px/600) + "필요한 것만 켜세요"(12px `#a3a3a3`).
  - **카테고리 그룹** (각 그룹 `margin-bottom:16px`): 그룹 라벨(Geist Mono 11px `#737373`, letter-spacing .06em) + 우측으로 이어지는 1px `#ededed` 구분선. 그 아래 `border:1px solid #ededed; border-radius:14px` 카드 안에 기능 행들.
    - **안전 (Safety)**: 🛡️ 광고성 글 필터링 — "광고·피싱 링크를 자동으로 가려요"
    - **이해 돕기 (Understand)**: 🌐 실시간 번역 — "이 페이지를 모국어로 바꿔요" / 📝 요약 — "긴 내용을 핵심만 정리해요"
    - **기록 (History)**: 🕘 화면 기록 — "방문한 단계를 저장해 다시 봐요"
  - **기능 행**: `display:flex; align-items:center; gap:13px; padding:14px`, 행 사이 `border-bottom:1px solid #f4f4f4`(그룹 마지막 행은 없음).
    - 아이콘 박스: 44×44px, `border-radius:11px; background:#f5f5f5`, 가운데 이모지 17px.
    - 이름 14.5px/600 + 설명 12px `#8a8a8a`.
    - 토글(pill 버튼): height 38px, `padding:0 15px; border-radius:999px`, 내부에 7px 점 + 라벨. **On** = `background:#0a0a0a; color:#fff; border:1px solid #0a0a0a`, 점 `#fff`. **Off** = `background:#fff; color:#8a8a8a; border:1px solid #e2e2e2`, 점 `#c4c4c4`. 라벨 12.5px/600.
    - 기본 On: 광고 필터, 번역. 기본 Off: 요약, 기록.
  - **안전 배너**: `background:#fafafa; border:1px solid #f0f0f0; border-radius:10px; padding:10px 12px`. 좌측 18px 체크 박스(1.5px `#0a0a0a` 테두리) + 문구 예 "이 페이지에서 광고·의심 링크 2개를 가렸어요"(12.5px `#525252`).

### 2. 대화 내용 (tab='chat')
- **목적**: 입력한 목표에 대해 단계별로 "다음 버튼"을 안내하는 대화 흐름.
- **레이아웃**: `padding:16px 16px 20px; display:flex; flex-direction:column; gap:10px`.
- **컴포넌트**:
  - 상단 안전 배너(홈과 동일 스타일).
  - **메시지 버블**:
    - 사용자(우측 정렬): `background:#0a0a0a; color:#fff; border-radius:14px 14px 4px 14px; padding:11px 13px; max-width:85%`. 내용 = 사용자가 입력한 목표(`userGoal`) 또는 예시 목표.
    - 봇 일반(좌측): `background:#f5f5f5; border-radius:4px 14px 14px 14px; padding:11px 13px`. 예: "네! 4단계로 안내할게요." (모국어)
    - **봇 단계 버블**(좌측, max-width 90%): 상단에 20×20 검정 번호 배지(Geist Mono 11px, 흰 글자) + "STEP n/4"(Geist Mono 10.5px `#a3a3a3`). 그 아래 안내문(13.5px/600, 모국어). 그 아래 **대상 버튼 카드**: `border:1px dashed #d4d4d4; border-radius:10px; background:#fafafa; padding:10px`, 소제목 "화면에서 이 버튼을 누르세요"(10.5px `#a3a3a3`) + **버튼 칩**: `border:2px solid #0a0a0a; border-radius:9px; background:#fff; padding:7px 12px; font-weight:600; box-shadow:0 0 0 4px rgba(10,10,10,.07)`, 텍스트 "▸ <페이지의 실제 한국어 버튼 라벨>". (라벨은 페이지에 실제 있는 한국어 그대로: 검색/발급하기/간편인증/신청)
  - **진행 버튼**(좌측 정렬 pill, 검정): 상태에 따라 "다 했어요, 다음"(cstep<4 → cstep+1) / "완료"(cstep=4 → cdone=true) / "처음부터"(cdone → cstep=1,cdone=false). 완료 시 봇 "끝났어요! 잘하셨어요." 버블 추가.
  - **하단 입력행**: `<input>` 100%×44px, `border:1px solid #e6e6e6; border-radius:12px`, 우측 32×32 검정 전송 버튼.
- **참고 시나리오(더미)**: 정부24에서 주민등록등본 발급 — 4단계: ① 검색창에 '주민등록등본' 입력(버튼 라벨 "검색") ② '주민등록표 등본 발급' 선택("발급하기") ③ 로그인 '간편인증'("간편인증") ④ 주소 확인 후 '신청'("신청").

### 3. 요약본 (tab='sum')
- **목적**: 현재 페이지를 모국어 요점으로 정리.
- **레이아웃**: `padding:18px 16px 24px`.
- **컴포넌트**: 상단 태그 "이 페이지 요약"(Geist Mono 11px `#a3a3a3`, letter-spacing .08em) + 페이지 제목(16px/600, 예 "주민등록표 등본(초본) 발급"). 그 아래 요점 리스트: 각 항목 = 20px 원형 번호 배지(검정/흰 글자) + 텍스트(13.5px `#262626`, line-height 1.5), `gap:10px`. 하단 "원문 페이지 보기" 버튼(100%×42px, `border:1px solid #e6e6e6; border-radius:10px`).

### 4. 보관함 (tab='save')
- **목적**: 저장한 요약/길안내 목록.
- **컴포넌트**: 행 = 38×38 아이콘 박스(1px `#ededed` 테두리, 이모지) + [타입 칩(Geist Mono 10px, `background:#f0f0f0; border-radius:5px; padding:2px 6px`) + 날짜(Geist Mono 10.5px `#b4b4b4`)] + 제목(13.5px/500, 한 줄 말줄임) + 우측 "›". 행 사이 `border-bottom:1px solid #f4f4f4`. 더미: 📝 주민등록등본 발급/방금, 🧭 건강보험 자격득실확인서/3일 전, 📝 국민연금 가입내역/지난주.

### 5. 마이페이지 (tab='my')
- **컴포넌트**: 상단 프로필(48px 라운드 검정 아바타 "N" + 이름 "Nguyen T." 15px/600 + "사용 언어 · English" 12.5px `#8a8a8a`). "표시 언어" 라벨 + 언어칩 4개(로그인 화면과 동일 bigStyle, 선택 시 즉시 전체 UI 언어 변경). 설정 카드(`border:1px solid #ededed; border-radius:14px`): 행 "알림"(값 ON), "도움말", "개인정보", 각 우측 "›". 카드 아래 **로그아웃** 버튼(100%×46px, `border:1px solid #e6e6e6; border-radius:11px; color:#525252`) → `authed=false`.

### 하단 탭바 (authed=true 상시)
- `flex:none; height:62px; border-top:1px solid #ededed; background:#fff; display:flex`. 4개 탭 각 `flex:1`, 세로 정렬(아이콘 21px 스트로크 SVG + 라벨 10.5px). 활성 = `#0a0a0a`/weight 600, 비활성 = `#b0b0b0`/weight 500.
- 탭: **요약본**(문서 아이콘) · **대화 내용**(말풍선) · **보관함**(북마크) · **마이페이지**(사람). 홈 화면은 별도 탭 없이 헤더의 로고 클릭으로 복귀.

### 헤더 (authed=true 상시)
- `flex:none; padding:16px 16px 12px; border-bottom:1px solid #f2f2f2`.
- 로고 버튼(클릭 시 홈): 30×30 검정 라운드10 + 흰 스마일 SVG(18px) + "Hi :D"(18.5px/700, letter-spacing -.02em). 우측 언어칩 4개(작은 사이즈: minWidth 30px, height 26px, Geist Mono 11px).
- **현재 사이트 카드**: `margin-top:11px; background:#fafafa; border:1px solid #f0f0f0; border-radius:10px; padding:8px 10px; display:flex; align-items:center; gap:9px`. 사이트명(12.5px/600) + URL(Geist Mono 10px `#a3a3a3`) + 우측 "현재 사이트" 라벨(Geist Mono 9px `#b0b0b0`, letter-spacing .08em). **실제 구현에서 사이트명/URL은 `chrome.tabs` 현재 활성 탭에서 동적으로 채웁니다** (목업은 정부24 / www.gov.kr 고정).

---

## Interactions & Behavior
- **로그인 → 앱**: `authed` 토글. 로그아웃은 마이페이지 버튼.
- **홈 입력 → 대화**: Enter/전송 시 탭 전환 + 목표 시드.
- **탭 전환**: 하단 탭바 클릭으로 `tab` 변경, 헤더/탭바는 유지되고 콘텐츠 영역만 교체.
- **기능 토글**: 즉시 On/Off (`on` 맵 갱신). 실제 구현에서는 콘텐츠 스크립트 동작(번역/필터링/요약/기록)과 연동.
- **언어 전환**: `lang` 변경 시 안내문·기능명/설명·요약·태그라인·On/Off 등 **콘텐츠성 문자열**이 즉시 재렌더. (탭바 라벨·헤더 "정부24" 등 한국 서비스 chrome 문자열은 한국어 고정 — 필요 시 정책 조정 가능)
- 트랜지션: 토글 `transition: all .15s ease`, pill 배경/색. 특별한 애니메이션 없음(단순함 우선).
- 접근성: 큰 히트 타깃(기능 행 44px 아이콘·38–50px 버튼), 명확한 On/Off 텍스트 라벨.

## State Management
- `authed: boolean` — 인증 여부(로그인/앱 분기).
- `lang: 'ko'|'en'|'zh'|'vi'` — 표시 언어(기본 'en'). 실제 구현: 최초 로그인 시 선택, `chrome.storage`에 영속.
- `tab: 'home'|'chat'|'sum'|'save'|'my'` — 현재 화면(기본 'home').
- `query: string` — 홈 입력값.
- `userGoal: string|null` — 대화에 시드된 목표.
- `on: { filter, trans, sum, rec: boolean }` — 기능 On/Off (기본 filter/trans = true).
- `cstep: 1..4`, `cdone: boolean` — 대화 진행 단계.
- **데이터 페칭 요구**: (1) 현재 탭 URL/제목 → 헤더 사이트 카드, (2) 페이지 DOM/텍스트 + 사용자 목표 → LLM 호출로 단계별 안내·요약 생성, (3) 페이지 앵커/링크 스캔 → 광고·피싱 링크 판정 후 숨김.

## Design Tokens
**Colors**
- 잉크/Primary: `#0a0a0a`
- 본문 보조: `#262626`, `#525252`
- 뮤트 텍스트: `#737373`, `#8a8a8a`, `#a3a3a3`, `#b0b0b0`, `#b4b4b4`, `#c4c4c4`
- 서브 배경: `#fafafa`, `#f5f5f5`, `#f0f0f0`
- 테두리: `#e6e6e6`, `#ededed`, `#f0f0f0`, `#f2f2f2`, `#f4f4f4`
- 토글 Off 테두리: `#e2e2e2`
- 배경(목업 데스크): `#f4f4f5` + 도트 그리드
- 흰색: `#fff`

**Typography**
- Sans: Geist (400/500/600/700)
- Mono: Geist Mono (400/500) — 라벨/URL/배지/태그
- 크기: 27(로그인 워드마크)/18.5(헤더 워드마크)/16/15.5/14.5/13.5/12.5/12/11/10.5/10/9px. 주요 letter-spacing: 워드마크 -.02em, 모노 라벨 +.06~.08em.

**Radius**: 20(로그인 로고)/18(프레임)/14/12/11/10/9/8/7/6/5px, pill/원형 999px·50%.

**Spacing**: 4/6/8/9/10/11/12/13/14/16/18/24/30px 스케일.

**Shadow**: 프레임 `0 20px 60px -24px rgba(0,0,0,.28)`(목업용); 대상 버튼 칩 링 `0 0 0 4px rgba(10,10,10,.07)`; 토글 knob(참고) `0 1px 2px rgba(0,0,0,.25)`.

## Assets
- **스마일 로고 (SVG, 인라인, 흰색 stroke)** — 눈 2개 + 웃는 입:
  ```html
  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M8.5 9.5h.01"></path>
    <path d="M15.5 9.5h.01"></path>
    <path d="M8 14.5a5 5 0 0 0 8 0"></path>
  </svg>
  ```
  (로그인 40px / 헤더 18px, 검정 라운드 박스 위에 올림)
- **하단 탭 아이콘 (SVG, stroke=currentColor, 21px)**: 요약본=문서(`M7 3h7l4 4v14H7z` + 접힘 + 줄), 대화=말풍선(`M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-5A8 8 0 1 1 21 12z`), 보관함=북마크(`M6 4h12v16l-6-3.5L6 20z`), 마이페이지=사람(circle+arc). 원본 파일의 하단 탭바 마크업에서 그대로 복사 가능. → 대상 코드베이스에 아이콘 세트(lucide 등)가 있으면 유사 아이콘으로 대체 권장.
- **기능/보관함 이모지**: 🛡️(광고 필터) 🌐(번역) 📝(요약) 🕙(기록) 🧭(길안내). 유저 요청으로 이모지 사용하되 흑백 톤을 위해 **`filter: grayscale(1)`** 적용(컬러 이모지를 회색조로 표시). 대상 앱 스타일에 따라 모노 커스텀 아이콘으로 교체 가능.
- 외부 이미지 없음. 폰트만 Google Fonts(Geist, Geist Mono).

## Files
- `길잡이 사이드패널.dc.html` — 전체 디자인(로그인 + 5개 화면 + 헤더/탭바). 4개 언어(한/영/중/베) 문자열, 토글·탭·대화 진행·언어 전환 인터랙션 모두 동작하는 프로토타입.
  - 참고: 이 파일은 "Design Component" 포맷(상단 `<x-dc>` 템플릿 + 하단 `class Component extends DCLogic`의 `renderVals()`)입니다. 값·문자열·기본 상태는 로직 클래스의 `state`/`UI`/`featDefs`/`steps`/`sumB`/`savedItems`에 정리돼 있어 그대로 참고해 이식하면 됩니다.
