// sidepanel.js — 패널 UI 로직
import { guide } from "./ai.js";
import {
  getSettings, saveSettings, hasApiKey,
  getProfile, saveProfile, logout,
} from "./settings.js";
import { addUser } from "./db.js";

const $ = (id) => document.getElementById(id);
const statusEl = $("status");
const resultEl = $("result");

function setStatus(msg, isErr = false) {
  statusEl.textContent = msg || "";
  statusEl.classList.toggle("err", isErr);
}

// ---------- 설정(API 키) UI ----------
function toggleProviderFields(provider) {
  $("gemini-fields").hidden = provider !== "gemini";
  $("openai-fields").hidden = provider !== "openai";
}

async function loadSettingsIntoForm() {
  const s = await getSettings();
  $("provider").value = s.provider;
  $("geminiApiKey").value = s.geminiApiKey;
  $("geminiModel").value = s.geminiModel;
  $("openaiApiKey").value = s.openaiApiKey;
  $("openaiModel").value = s.openaiModel;
  toggleProviderFields(s.provider);
}

async function refreshKeyBanner() {
  const ok = await hasApiKey();
  $("key-banner").hidden = ok;
  return ok;
}

function openSettings(open = true) {
  $("settings").hidden = !open;
}

$("settings-toggle").addEventListener("click", () => {
  $("settings").hidden = !$("settings").hidden;
});

$("provider").addEventListener("change", (e) => toggleProviderFields(e.target.value));

$("save-settings").addEventListener("click", async () => {
  await saveSettings({
    provider: $("provider").value,
    geminiApiKey: $("geminiApiKey").value.trim(),
    geminiModel: $("geminiModel").value.trim() || "gemini-2.0-flash",
    openaiApiKey: $("openaiApiKey").value.trim(),
    openaiModel: $("openaiModel").value.trim() || "gpt-4o-mini",
  });
  const s = $("settings-status");
  s.textContent = "저장했어요 ✓";
  s.classList.remove("err");
  const ok = await refreshKeyBanner();
  if (ok) setTimeout(() => openSettings(false), 700);
});

// ---------- 프로필(로컬 로그인) / 온보딩 ----------
// 첫 세션이면 프로필 화면(#onboarding)을, 이후엔 메인(#main-app)을 보여준다.
function showOnboarding(show) {
  $("onboarding").hidden = !show;
  $("main-app").hidden = show;
  $("profile-bar").hidden = show; // 온보딩 중엔 상단 프로필 바 숨김
}

// 프로필을 반영하며 메인 앱으로 진입
async function enterApp(profile) {
  $("profile-name-label").textContent = profile.name || "손님";
  $("lang").value = profile.lang;          // 메인 폼 언어 기본값 = 프로필 모국어
  showOnboarding(false);
  const ok = await refreshKeyBanner();     // API 키 없으면 설정 자동 열기
  if (!ok) openSettings(true);
}

// ---- 플랜 선택(무료 Gemini / 유료 ChatGPT) ----
// 선택한 플랜에 따라 "어떤 API 키를 넣어야 하는지"를 아래에 표시한다.
let selectedPlan = "";
const KEY_HINTS = {
  gemini: { label: "Gemini API 키", ph: "AIza… (Google AI Studio에서 발급)", help: "https://aistudio.google.com/app/apikey" },
  openai: { label: "OpenAI API 키", ph: "sk-… (OpenAI에서 발급)", help: "https://platform.openai.com/api-keys" },
};
function selectPlan(plan) {
  selectedPlan = plan;
  $("plan-gemini").classList.toggle("selected", plan === "gemini");
  $("plan-openai").classList.toggle("selected", plan === "openai");
  const hint = KEY_HINTS[plan];
  $("onb-key-label").textContent = hint.label;
  $("onbApiKey").placeholder = hint.ph;
  $("onbApiKey").value = "";
  $("onb-key-help").href = hint.help;
  $("onb-key-wrap").hidden = false;
}
$("plan-gemini").addEventListener("click", () => selectPlan("gemini"));
$("plan-openai").addEventListener("click", () => selectPlan("openai"));

// "시작하기": 프로필·플랜·키 저장(설정+DB) 후 메인 진입
$("start-btn").addEventListener("click", async () => {
  const s = $("onboarding-status");
  const fail = (msg) => { s.textContent = msg; s.classList.add("err"); };
  s.textContent = ""; s.classList.remove("err");

  const name = $("profileName").value.trim();
  if (!name) return fail("이름을 입력해 주세요.");
  if (!selectedPlan) return fail("플랜을 선택해 주세요.");
  const apiKey = $("onbApiKey").value.trim();
  if (!apiKey) return fail("선택한 플랜의 API 키를 넣어 주세요.");

  const profileData = {
    name,
    birthday: $("profileBirthday").value,
    gender: $("profileGender").value,
    age: $("profileAge").value,
    nationality: $("profileNationality").value,
    lang: $("profileLang").value,
    purpose: $("profilePurpose").value,
    plan: selectedPlan,
  };

  // 1) 설정에 provider + 해당 키 저장 (메인 앱이 바로 동작하도록)
  await saveSettings(
    selectedPlan === "openai"
      ? { provider: "openai", openaiApiKey: apiKey }
      : { provider: "gemini", geminiApiKey: apiKey }
  );

  // 2) DB(IndexedDB)에 조회용 레코드 적재
  try {
    await addUser(profileData);
  } catch (e) {
    console.error("DB 저장 실패:", e);  // DB 실패해도 진입은 막지 않음
  }

  // 3) 빠른 UI용 프로필 저장 + 온보딩 완료 표시
  const profile = await saveProfile({ ...profileData, onboarded: true });

  await loadSettingsIntoForm();  // 방금 저장한 키를 설정 폼에도 반영
  await enterApp(profile);
});

// "로그아웃": 프로필·설정 초기화 후 다시 첫 세션 화면으로
// (DB의 과거 레코드는 조회용으로 보존)
$("logout-btn").addEventListener("click", async () => {
  await logout();
  // 온보딩 폼 상태 리셋
  ["profileName", "profileBirthday", "profileAge", "onbApiKey"].forEach((id) => { $(id).value = ""; });
  ["profileGender", "profileNationality", "profilePurpose"].forEach((id) => { $(id).value = ""; });
  $("profileLang").value = "베트남어";
  selectedPlan = "";
  $("plan-gemini").classList.remove("selected");
  $("plan-openai").classList.remove("selected");
  $("onb-key-wrap").hidden = true;
  $("onboarding-status").textContent = "";
  // 메인 상태 리셋
  openSettings(false);
  resultEl.hidden = true;
  resultEl.innerHTML = "";
  setStatus("");
  await loadSettingsIntoForm();  // 지워진 설정을 기본값으로 되돌림
  showOnboarding(true);
});

// 첫 실행 분기: 온보딩 완료 여부로 화면 결정
(async () => {
  await loadSettingsIntoForm();
  const profile = await getProfile();
  if (profile.onboarded) {
    await enterApp(profile);
  } else {
    showOnboarding(true);
  }
})();

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

// content script에 메시지 (실패 시 주입 후 재시도)
async function sendToContent(tabId, message) {
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch {
    await chrome.scripting.executeScript({ target: { tabId }, files: ["src/content.js"] });
    return await chrome.tabs.sendMessage(tabId, message);
  }
}

function render({ summary, steps, nextLink, warnings }, tabId) {
  resultEl.hidden = false;
  resultEl.innerHTML = "";

  if (summary) {
    const c = document.createElement("div");
    c.className = "wg-card";
    c.innerHTML = `<h3>📄 이 페이지는</h3><div class="wg-summary"></div>`;
    c.querySelector(".wg-summary").textContent = summary;
    resultEl.appendChild(c);
  }

  if (steps?.length) {
    const c = document.createElement("div");
    c.className = "wg-card";
    c.innerHTML = `<h3>🧭 이렇게 하세요</h3>`;
    const ol = document.createElement("ul");
    ol.className = "wg-steps";
    steps.forEach((s, i) => {
      const li = document.createElement("li");
      li.innerHTML = `<span class="n">${i + 1}</span>`;
      li.appendChild(document.createTextNode(s));
      ol.appendChild(li);
    });
    c.appendChild(ol);
    resultEl.appendChild(c);
  }

  if (nextLink) {
    const c = document.createElement("div");
    c.className = "wg-card wg-next";
    c.innerHTML = `<h3>✓ 다음에 누를 곳</h3><div class="lk"></div>
      <button class="hl-btn">페이지에서 찾아주기</button>`;
    c.querySelector(".lk").textContent = nextLink.text;
    c.querySelector(".hl-btn").addEventListener("click", async () => {
      const r = await sendToContent(tabId, { type: "WG_HIGHLIGHT", href: nextLink.href, text: nextLink.text });
      setStatus(r?.ok ? "페이지에서 초록색으로 표시했어요 ✓" : "그 링크를 페이지에서 못 찾았어요.");
    });
    resultEl.appendChild(c);
  }

  if (warnings?.length) {
    const c = document.createElement("div");
    c.className = "wg-card wg-warn";
    c.innerHTML = `<h3>주의하세요</h3>`;
    const ul = document.createElement("ul");
    warnings.forEach((w) => {
      const li = document.createElement("li");
      li.textContent = w;
      ul.appendChild(li);
    });
    c.appendChild(ul);
    resultEl.appendChild(c);
  }
}

$("run").addEventListener("click", async () => {
  const goal = $("goal").value.trim();
  const lang = $("lang").value;
  if (!goal) return setStatus("하고 싶은 일을 입력해 주세요.", true);

  if (!(await hasApiKey())) {
    openSettings(true);
    await refreshKeyBanner();
    return setStatus("먼저 설정에서 API 키를 넣어 주세요.", true);
  }

  const btn = $("run");
  btn.disabled = true;
  setStatus("페이지를 읽는 중…");
  resultEl.hidden = true;

  try {
    const tab = await getActiveTab();
    if (!tab?.id) throw new Error("활성 탭을 찾을 수 없어요.");

    const page = await sendToContent(tab.id, { type: "WG_EXTRACT" });
    if (!page) throw new Error("페이지를 읽지 못했어요. 새로고침 후 다시 시도해 주세요.");

    setStatus("AI가 안내를 준비하는 중…");
    const out = await guide({
      goal,
      lang,
      pageTitle: page.title,
      pageText: page.pageText,
      links: page.links,
    });

    render(out, tab.id);
    setStatus("");
  } catch (e) {
    console.error(e);
    setStatus("오류: " + e.message + "  (⚙ 설정의 API 키/모델을 확인하세요)", true);
  } finally {
    btn.disabled = false;
  }
});
