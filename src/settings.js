// settings.js — API 설정을 chrome.storage.local에 저장/로드
// config.js 파일 없이, 사용자가 패널 UI에서 키를 입력하면 브라우저에 저장됩니다.

const KEY = "wg_settings";
const PROFILE_KEY = "wg_profile";

export const DEFAULTS = {
  provider: "gemini",               // "gemini" | "openai"
  geminiApiKey: "",
  geminiModel: "gemini-2.0-flash",  // 빠르고 저렴. 필요시 gemini-2.5-flash 등으로 변경
  openaiApiKey: "",
  openaiModel: "gpt-4o-mini",
};

// 로컬 프로필: 서버/계정 없이 브라우저에만 저장되는 사용자 정보.
// onboarded=true 여야 첫 세션 프로필 화면을 건너뛴다.
// 전체 이력은 db.js(IndexedDB)에 별도 저장되어 나중에 조회 가능.
export const PROFILE_DEFAULTS = {
  name: "",
  email: "",          // 백엔드 로그인 식별자
  birthday: "",
  gender: "",
  age: "",
  nationality: "",
  lang: "베트남어",   // sidepanel의 언어 선택값과 동일한 라벨 사용
  purpose: "",
  plan: "gemini",     // "gemini"(무료) | "openai"(유료) — 구독 티어
  onboarded: false,
};

// 저장된 설정을 기본값 위에 병합해서 반환
export async function getSettings() {
  const obj = await chrome.storage.local.get(KEY);
  return { ...DEFAULTS, ...(obj[KEY] || {}) };
}

// 일부 필드만 patch로 넘겨 저장
export async function saveSettings(patch) {
  const cur = await getSettings();
  const next = { ...cur, ...patch };
  await chrome.storage.local.set({ [KEY]: next });
  return next;
}

// 현재 provider에 맞는 키가 채워져 있는지
export async function hasApiKey() {
  const s = await getSettings();
  return s.provider === "openai" ? !!s.openaiApiKey.trim() : !!s.geminiApiKey.trim();
}

// ---------- 프로필(로컬) ----------
export async function getProfile() {
  const obj = await chrome.storage.local.get(PROFILE_KEY);
  return { ...PROFILE_DEFAULTS, ...(obj[PROFILE_KEY] || {}) };
}

export async function saveProfile(patch) {
  const cur = await getProfile();
  const next = { ...cur, ...patch };
  await chrome.storage.local.set({ [PROFILE_KEY]: next });
  return next;
}

// 첫 세션 여부 판단 (온보딩 완료 안 됐으면 프로필 화면부터)
export async function isOnboarded() {
  const p = await getProfile();
  return !!p.onboarded;
}

// 프로필만 초기화 (로그아웃 시. 백엔드 토큰은 api.clearAuth 가 별도로 지움)
export async function clearProfile() {
  await chrome.storage.local.remove(PROFILE_KEY);
}

// 로그아웃 = 초기화: 프로필 + 로컬 설정을 모두 제거한다.
export async function logout() {
  await chrome.storage.local.remove([PROFILE_KEY, KEY]);
}
