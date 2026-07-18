# DB — 사용자 데이터 저장소

온보딩(첫 입장)에서 받은 사용자 정보와 플랜·사용량을 저장하고, 나중에 조회할 수 있게 하는 곳입니다.

## 데이터가 실제로 저장되는 위치

이제 사용자 데이터는 **백엔드 서버**가 보관합니다 (확장/브라우저가 아니라). 확장은 서버에
로그인 토큰만 두고, 프로필·플랜·사용량은 서버의 파일 DB에 쌓입니다.

- 실제 저장 파일: [`../server/data/users.json`](../server/data/users.json) (gitignore — 커밋 안 됨)
- 접근 코드: [`../server/store.js`](../server/store.js)

이 `DB/` 폴더는 그 레코드의 **스키마 정의(`schema.json`)** 를 담아 두는 곳입니다.

## 스키마

[`schema.json`](./schema.json) 참고. `users` 스토어의 각 레코드가 온보딩 필드 + 플랜 + 사용량입니다.

## 조회 방법

### 1) 파일로
서버 실행 중이면 `server/data/users.json` 을 열어보면 전체 사용자가 보입니다.

### 2) API로
```
GET http://localhost:8787/me      (Authorization: Bearer <token>)
```
로그인한 사용자의 플랜/사용량을 반환합니다.

## 향후: 실제 서버 DB로 옮기려면
지금은 파일(`users.json`) 기반입니다. 사용자가 많아지면 `server/store.js` 의 함수 시그니처를
유지한 채 내부를 PostgreSQL/MongoDB 등으로 바꾸면 나머지 코드는 그대로 씁니다.
