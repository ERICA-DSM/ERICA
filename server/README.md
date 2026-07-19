# 웹 길잡이 백엔드 (server)

우리(개발자) API 키를 **서버에만** 두고, 사용자는 **플랜(구독)** 으로 이용하는 프록시 서버입니다.
확장 프로그램엔 키가 없고, 확장은 이 서버만 호출합니다.

## 실행

```bash
cd server
npm install
cp .env.example .env      # Windows(PowerShell): Copy-Item .env.example .env
# .env 에 GEMINI_API_KEY / OPENAI_API_KEY 를 넣기 (비워두면 MOCK 응답으로 동작)
npm start                 # http://localhost:8787
```

키를 안 넣어도 **MOCK 모드**로 전체 흐름이 동작합니다(데모용). 나중에 `.env`에 진짜 키만 넣으면 LIVE로 전환됩니다.

## 엔드포인트

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/health` | 상태 확인 |
| POST | `/auth/login` | 이메일+프로필+플랜 → 토큰 발급(데모용, 비번 없음) |
| GET | `/me` | 내 플랜/사용량 (Bearer 토큰) |
| POST | `/plan` | 플랜 변경 gemini↔openai (Bearer 토큰) |
| POST | `/guide` | 안내 요청 → 플랜 확인·사용량 제한·우리 키로 LLM 호출 |

## 플랜 = 구독 티어

- `gemini` = **무료** (하루 `FREE_DAILY_LIMIT` 회)
- `openai` = **유료** (하루 `PAID_DAILY_LIMIT` 회)

한도 초과 시 `/guide` 는 `429 quota_exceeded` 를 반환합니다.

## 데이터

사용자/사용량은 `server/data/users.json`(파일 DB, gitignore)에 저장됩니다.
상용 전환 시 `store.js` 내부만 실제 DB로 바꾸면 됩니다.

## 보안 메모

- `.env`, `data/` 는 `.gitignore` 처리 — 키·사용자 데이터는 커밋되지 않습니다.
- 실제 서비스에선 이메일 로그인 대신 진짜 인증(비밀번호/OAuth)과 결제(Stripe/토스 등)를 붙여야 합니다.
