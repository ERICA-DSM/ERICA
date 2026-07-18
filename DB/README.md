# DB — 사용자 데이터 저장소

온보딩(첫 입장)에서 받은 사용자 정보를 저장하고, 나중에 조회할 수 있게 하는 곳입니다.

## 데이터가 실제로 저장되는 위치

브라우저 확장은 이 `DB/` 폴더 같은 로컬 파일 폴더에 **직접 쓸 수 없습니다.** 그래서 실제
데이터는 브라우저 내장 DB인 **IndexedDB(`wg_db`)** 에 쌓입니다. 이 폴더는 그 DB의 **스키마
정의(`schema.json`)와 조회/내보내기 방법**을 담아 두는 곳입니다.

접근 코드: [`../src/db.js`](../src/db.js)

## 스키마

[`schema.json`](./schema.json) 참고. 핵심은 `users` 스토어이며 온보딩 필드가 그대로 레코드가 됩니다.

## 조회 방법

### 1) 코드에서
```js
import { getAllUsers, getUser, exportUsers } from "./db.js";
const all = await getAllUsers();     // 전체(최신순)
const one = await getUser(1);        // id로 단건
const json = await exportUsers();    // JSON 문자열로 백업
```

### 2) 브라우저에서 눈으로 확인
1. 사이드패널에서 우클릭 → **검사(Inspect)** 로 DevTools 열기
2. **Application 탭 → Storage → IndexedDB → `wg_db` → `users`**
3. 저장된 레코드가 표로 보입니다.

## 향후: 실제 서버 DB로 옮기려면
지금은 브라우저 로컬에만 저장됩니다(기기·브라우저마다 별개). 여러 기기에서 공유하거나 팀이
통계를 보려면 백엔드 서버 + DB(PostgreSQL 등)가 필요합니다. 그때 `src/db.js`의 함수 시그니처를
유지한 채 내부만 서버 API 호출로 바꾸면 UI 코드는 그대로 씁니다.
