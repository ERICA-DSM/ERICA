// db.js — 로컬 DB(IndexedDB) 접근 계층
// 온보딩에서 받은 사용자 정보를 "레코드"로 저장하고, 나중에 조회/내보내기 할 수 있게 한다.
// 브라우저 확장은 파일 폴더에 직접 쓸 수 없으므로 실제 데이터는 브라우저의 IndexedDB에 쌓인다.
// (스키마/조회 방법은 프로젝트 루트의 DB/ 폴더 문서를 참고)

const DB_NAME = "wg_db";
const DB_VERSION = 1;
const STORE = "users";

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
        store.createIndex("createdAt", "createdAt");
        store.createIndex("nationality", "nationality");
        store.createIndex("plan", "plan");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(store, mode, run) {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await openDB();
      const t = db.transaction(store, mode);
      const os = t.objectStore(store);
      const req = run(os);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      t.oncomplete = () => db.close();
    } catch (e) {
      reject(e);
    }
  });
}

// 사용자 레코드 추가 → 생성된 id 반환
export async function addUser(record) {
  const row = { ...record, createdAt: new Date().toISOString() };
  return tx(STORE, "readwrite", (os) => os.add(row));
}

// 전체 사용자 조회(최신순)
export async function getAllUsers() {
  const rows = await tx(STORE, "readonly", (os) => os.getAll());
  return (rows || []).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

// id로 단건 조회
export async function getUser(id) {
  return tx(STORE, "readonly", (os) => os.get(id));
}

// 전체 삭제(초기화용)
export async function clearUsers() {
  return tx(STORE, "readwrite", (os) => os.clear());
}

// JSON 문자열로 내보내기(백업/조회용)
export async function exportUsers() {
  const rows = await getAllUsers();
  return JSON.stringify(rows, null, 2);
}
