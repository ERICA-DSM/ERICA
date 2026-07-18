// api.js — 백엔드(프록시 서버) 클라이언트
// 확장엔 API 키가 없다. 로그인 토큰만 chrome.storage 에 두고, 안내 요청은 서버가 우리 키로 대신 호출한다.

// 백엔드 주소. 로컬 개발은 localhost, 배포 시 이 값만 서버 URL로 바꾸면 됨.
export const API_BASE = "http://localhost:8787";

const AUTH_KEY = "wg_auth";

async function getAuth() {
  const o = await chrome.storage.local.get(AUTH_KEY);
  return o[AUTH_KEY] || null;
}
async function setAuth(auth) {
  await chrome.storage.local.set({ [AUTH_KEY]: auth });
  return auth;
}
export async function clearAuth() {
  await chrome.storage.local.remove(AUTH_KEY);
}
export async function getAccount() {
  return getAuth();
}
export async function isLoggedIn() {
  const a = await getAuth();
  return !!a?.token;
}

// 로그인/가입(데모): 이메일 + 프로필 + 플랜 → 토큰
export async function login({ email, name, plan, profile }) {
  let res;
  try {
    res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, plan, profile }),
    });
  } catch {
    throw new Error(`서버에 연결할 수 없어요. 백엔드(${API_BASE})가 켜져 있는지 확인해 주세요.`);
  }
  if (!res.ok) throw new Error("로그인 실패 (" + res.status + ")");
  return setAuth(await res.json());
}

// 플랜(구독 티어) 변경: gemini(무료) ↔ openai(유료)
export async function changePlan(plan) {
  const auth = await getAuth();
  if (!auth?.token) throw new Error("로그인이 필요해요.");
  const res = await fetch(`${API_BASE}/plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + auth.token },
    body: JSON.stringify({ plan }),
  });
  if (!res.ok) throw new Error("플랜 변경 실패");
  return setAuth(await res.json());
}

// 안내 요청 → 서버가 플랜 확인·사용량 제한·우리 키로 LLM 호출
export async function guide(payload) {
  const auth = await getAuth();
  if (!auth?.token) throw new Error("로그인이 필요해요.");

  let res;
  try {
    res = await fetch(`${API_BASE}/guide`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + auth.token },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error(`서버에 연결할 수 없어요. 백엔드(${API_BASE})가 켜져 있는지 확인해 주세요.`);
  }

  const data = await res.json().catch(() => ({}));
  if (res.status === 429) {
    const e = new Error(data.message || "오늘 사용량을 다 썼어요.");
    e.code = "quota"; e.data = data;
    throw e;
  }
  if (res.status === 401) {
    const e = new Error("로그인이 만료됐어요. 다시 로그인해 주세요.");
    e.code = "auth";
    throw e;
  }
  if (!res.ok) throw new Error(data.message || data.error || "요청 실패");

  // 최신 사용량/플랜을 로컬에 반영
  if (data.usage) await setAuth({ ...auth, usage: data.usage, limit: data.limit, plan: data.plan });
  return data;
}
