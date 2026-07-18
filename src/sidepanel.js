// sidepanel.js — 패널 UI 로직 (백엔드 프록시 + 플랜 구독 모델)
import { guide, login, changePlan, getAccount, clearAuth } from "./api.js";
import { getProfile, saveProfile, clearProfile } from "./settings.js";

const $ = (id) => document.getElementById(id);
const statusEl = $("status");
const resultEl = $("result");

const PLAN_LABEL = { gemini: "무료 (Gemini)", openai: "유료 (ChatGPT)" };

function setStatus(msg, isErr = false) {
  statusEl.textContent = msg || "";
  statusEl.classList.toggle("err", isErr);
}

function openSettings(open = true) { $("settings").hidden = !open; }
$("settings-toggle").addEventListener("click", () => { $("settings").hidden = !$("settings").hidden; });

// ---------- 계정/플랜 표시 ----------
function renderAccount(account) {
  if (!account) return;
  $("acct-email").textContent = account.email || "—";
  $("acct-plan").textContent = PLAN_LABEL[account.plan] || account.plan || "—";
  const used = account.usage?.count ?? 0;
  const limit = account.limit ?? "—";
  $("acct-usage").textContent = `${used} / ${limit}회`;
  $("plan-switch-gemini").classList.toggle("selected", account.plan === "gemini");
  $("plan-switch-openai").classList.toggle("selected", account.plan === "openai");
  // 상단 바
  $("profile-name-label").textContent = account.name || account.email || "손님";
  $("profile-plan-label").textContent = account.plan === "openai" ? "유료" : "무료";
  $("profile-plan-label").className = "wg-plan-badge " + (account.plan === "openai" ? "wg-plan-paid" : "wg-plan-free");
}

// ---------- 화면 전환 ----------
function showOnboarding(show) {
  $("onboarding").hidden = !show;
  $("main-app").hidden = show;
  $("profile-bar").hidden = show;
}

async function enterApp(profile, account) {
  $("lang").value = profile.lang || "베트남어";
  renderAccount(account);
  showOnboarding(false);
}

// ---- 플랜 선택 (온보딩) ----
let selectedPlan = "";
function selectPlan(plan) {
  selectedPlan = plan;
  $("plan-gemini").classList.toggle("selected", plan === "gemini");
  $("plan-openai").classList.toggle("selected", plan === "openai");
}
$("plan-gemini").addEventListener("click", () => selectPlan("gemini"));
$("plan-openai").addEventListener("click", () => selectPlan("openai"));

// ---- 시작하기 (로그인 + 구독) ----
$("start-btn").addEventListener("click", async () => {
  const s = $("onboarding-status");
  const fail = (msg) => { s.textContent = msg; s.classList.add("err"); };
  s.textContent = ""; s.classList.remove("err");

  const name = $("profileName").value.trim();
  const email = $("profileEmail").value.trim();
  if (!name) return fail("이름을 입력해 주세요.");
  if (!email || !email.includes("@")) return fail("이메일을 정확히 입력해 주세요.");
  if (!selectedPlan) return fail("플랜을 선택해 주세요.");

  const profileData = {
    name, email,
    birthday: $("profileBirthday").value,
    gender: $("profileGender").value,
    age: $("profileAge").value,
    nationality: $("profileNationality").value,
    lang: $("profileLang").value,
    purpose: $("profilePurpose").value,
    plan: selectedPlan,
  };

  $("start-btn").disabled = true;
  s.textContent = "로그인 중…"; s.classList.remove("err");
  try {
    const account = await login({ email, name, plan: selectedPlan, profile: profileData });
    const profile = await saveProfile({ ...profileData, onboarded: true });
    s.textContent = "";
    await enterApp(profile, account);
  } catch (e) {
    fail(e.message || "로그인 실패");
  } finally {
    $("start-btn").disabled = false;
  }
});

// ---- 플랜 전환 (설정 패널) ----
async function switchPlan(plan) {
  try {
    const account = await changePlan(plan);
    await saveProfile({ plan });
    renderAccount(account);
    setStatus(`플랜을 ${PLAN_LABEL[plan]}(으)로 바꿨어요 ✓`);
  } catch (e) {
    setStatus("플랜 변경 실패: " + e.message, true);
  }
}
$("plan-switch-gemini").addEventListener("click", () => switchPlan("gemini"));
$("plan-switch-openai").addEventListener("click", () => switchPlan("openai"));

// ---- 로그아웃 (토큰·프로필 초기화 → 첫 세션 화면) ----
$("logout-btn").addEventListener("click", async () => {
  await clearAuth();
  await clearProfile();
  ["profileName", "profileEmail", "profileBirthday", "profileAge"].forEach((id) => { $(id).value = ""; });
  ["profileGender", "profileNationality", "profilePurpose"].forEach((id) => { $(id).value = ""; });
  $("profileLang").value = "베트남어";
  selectedPlan = "";
  $("plan-gemini").classList.remove("selected");
  $("plan-openai").classList.remove("selected");
  $("onboarding-status").textContent = "";
  openSettings(false);
  resultEl.hidden = true; resultEl.innerHTML = "";
  setStatus("");
  showOnboarding(true);
});

// ---- 첫 실행 분기: 온보딩+로그인 완료 여부로 화면 결정 ----
(async () => {
  const profile = await getProfile();
  const account = await getAccount();
  if (profile.onboarded && account?.token) {
    await enterApp(profile, account);
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

// ---- 안내받기: 페이지 추출 → 백엔드로 요청 ----
$("run").addEventListener("click", async () => {
  const goal = $("goal").value.trim();
  const lang = $("lang").value;
  if (!goal) return setStatus("하고 싶은 일을 입력해 주세요.", true);

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
    const out = await guide({ goal, lang, pageTitle: page.title, pageText: page.pageText, links: page.links });

    render(out, tab.id);
    renderAccount(await getAccount());  // 사용량 갱신 반영
    setStatus(out.mock ? "· 데모(mock) 응답이에요. 서버에 키를 넣으면 실제 AI로 바뀝니다." : "");
  } catch (e) {
    console.error(e);
    if (e.code === "quota") {
      openSettings(true);
      renderAccount(await getAccount());
      setStatus(e.message + " (설정에서 유료 플랜으로 전환할 수 있어요)", true);
    } else if (e.code === "auth") {
      await clearAuth();
      showOnboarding(true);
      setStatus(e.message, true);
    } else {
      setStatus("오류: " + e.message, true);
    }
  } finally {
    btn.disabled = false;
  }
});
