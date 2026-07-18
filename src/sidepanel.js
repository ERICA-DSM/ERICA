// sidepanel.js — Hi :D 길잡이 (design/ 핸드오프 반영)
import { guide, summarize, login, changePlan, getAccount, clearAuth } from "./api.js";
import { getProfile, saveProfile, clearProfile, getHighlightColor, saveHighlightColor } from "./settings.js";

const $ = (id) => document.getElementById(id);
const LANGS = { "한국어": "ko", "영어": "en", "중국어": "zh", "베트남어": "vi" };

// ---------- 상태 ----------
const state = {
  lang: "한국어",
  tab: "home",
  toggles: { filter: false },
  loginPlan: "gemini",
  guideResult: null,
  userGoal: "",
};

// ---------- i18n ----------
const T = {
  "login-tagline": { ko: "한국 생활, 쉽게. 제가 한 걸음씩 도와드릴게요.", en: "Life in Korea, made simple. I'll help you, one step at a time.", zh: "在韩生活，变简单。我会一步步帮您。", vi: "Cuộc sống ở Hàn, đơn giản hơn. Tôi sẽ giúp bạn từng bước." },
  "lbl-lang": { ko: "언어 / Language", en: "Language", zh: "语言", vi: "Ngôn ngữ" },
  "lbl-name": { ko: "이름 / Name", en: "Name", zh: "姓名", vi: "Tên" },
  "lbl-email": { ko: "이메일 / Email", en: "Email", zh: "邮箱", vi: "Email" },
  "lbl-plan": { ko: "플랜 / Plan", en: "Plan", zh: "套餐", vi: "Gói" },
  "login-btn": { ko: "로그인", en: "Log in", zh: "登录", vi: "Đăng nhập" },
  "guest-btn": { ko: "로그인 없이 둘러보기", en: "Look around without login", zh: "不登录先看看", vi: "Xem thử không cần đăng nhập" },
  "hero-title": { ko: "무엇을 도와드릴까요?", en: "How can I help?", zh: "需要什么帮助？", vi: "Tôi giúp gì được?" },
  "hero-sub": { ko: "하고 싶은 일을 적어 주세요", en: "Tell me what you want to do", zh: "写下您想做的事", vi: "Hãy viết điều bạn muốn làm" },
  "feat-title": { ko: "기능", en: "Features", zh: "功能", vi: "Tính năng" },
  "feat-sub": { ko: "필요한 기능을 눌러 쓰세요", en: "Tap a feature to use it", zh: "点按需要的功能", vi: "Chạm để dùng tính năng" },
  "f-filter": { ko: "광고성 글 필터링", en: "Ad filtering", zh: "广告过滤", vi: "Lọc quảng cáo" },
  "f-filter-d": { ko: "광고를 박스로 가리고 \"광고·AD\"로 표시해요", en: "Covers ads with a box labeled \"AD\"", zh: "用方框遮盖广告并标注\"广告\"", vi: "Che quảng cáo bằng ô \"AD\"" },
  "f-sum": { ko: "요약", en: "Summary", zh: "摘要", vi: "Tóm tắt" },
  "f-sum-d": { ko: "현재 화면을 대화창에 요약해요", en: "Summarizes this page into the chat", zh: "把此页面摘要到对话", vi: "Tóm tắt trang này vào trò chuyện" },
  "f-rec": { ko: "화면 기록", en: "Screen capture", zh: "屏幕记录", vi: "Chụp màn hình" },
  "f-rec-d": { ko: "지금 화면을 캡처해 보관함에 저장해요", en: "Captures the screen into Saved", zh: "截图并保存到收藏", vi: "Chụp màn hình vào Đã lưu" },
  "btn-summarize": { ko: "요약하기", en: "Summarize", zh: "摘要", vi: "Tóm tắt" },
  "btn-capture": { ko: "캡처", en: "Capture", zh: "截图", vi: "Chụp" },
  "tabl-home": { ko: "홈", en: "Home", zh: "主页", vi: "Trang chủ" },
  "tabl-sum": { ko: "요약본", en: "Summary", zh: "摘要", vi: "Tóm tắt" },
  "tabl-chat": { ko: "대화 내용", en: "Chat", zh: "对话", vi: "Trò chuyện" },
  "tabl-save": { ko: "보관함", en: "Saved", zh: "收藏", vi: "Đã lưu" },
  "tabl-my": { ko: "마이페이지", en: "My page", zh: "我的", vi: "Của tôi" },
  "my-lang-label": { ko: "표시 언어 / Language", en: "Display language", zh: "显示语言", vi: "Ngôn ngữ hiển thị" },
  "my-plan-label": { ko: "플랜 / Plan", en: "Plan", zh: "套餐", vi: "Gói" },
  "my-color-label": { ko: "표시 색상 / Highlight", en: "Highlight color", zh: "标记颜色", vi: "Màu đánh dấu" },
  "set-usage-l": { ko: "오늘 사용량", en: "Today's usage", zh: "今日用量", vi: "Dùng hôm nay" },
  "set-help": { ko: "도움말", en: "Help", zh: "帮助", vi: "Trợ giúp" },
  "set-privacy": { ko: "개인정보", en: "Privacy", zh: "隐私", vi: "Quyền riêng tư" },
  "logout-btn": { ko: "로그아웃", en: "Log out", zh: "退出登录", vi: "Đăng xuất" },
  "site-tag": { ko: "현재 사이트", en: "CURRENT SITE", zh: "当前网站", vi: "TRANG HIỆN TẠI" },
};
const PH = {
  "login-name": { ko: "예: Nguyen", en: "e.g. Nguyen", zh: "例：Nguyen", vi: "vd: Nguyen" },
  "hero-input": { ko: "Ask me anything!", en: "Ask me anything!", zh: "Ask me anything!", vi: "Ask me anything!" },
};
function tr(key) { const c = LANGS[state.lang]; return (T[key] && T[key][c]) || (T[key] && T[key].ko) || ""; }
function applyI18n() {
  Object.keys(T).forEach((id) => { const el = $(id); if (el) el.textContent = tr(id); });
  Object.keys(PH).forEach((id) => { const el = $(id); const c = LANGS[state.lang]; if (el) el.placeholder = PH[id][c] || PH[id].ko; });
  // 언어칩 활성 표시
  document.querySelectorAll("[data-lang]").forEach((b) => b.classList.toggle("on", b.dataset.lang === state.lang));
}

// ---------- 화면 전환 ----------
function showLogin() { $("view-login").hidden = false; $("view-app").hidden = true; }
function showApp() { $("view-login").hidden = true; $("view-app").hidden = false; }

const TABS = ["home", "chat", "sum", "save", "my"];
function setTab(tab) {
  state.tab = tab;
  TABS.forEach((t) => { const el = $("tab-" + t); if (el) el.hidden = t !== tab; });
  document.querySelectorAll(".hd-tab").forEach((b) => b.classList.toggle("on", b.dataset.tab === tab));
  if (tab === "chat") renderChatPage();
  if (tab === "sum") renderSummary();
  if (tab === "save") renderSaved();
  if (tab === "my") renderMy();
}

// ---------- 대화 페이지 (안전배너 + 본문 + 입력행) ----------
function tLang(o) { return o[LANGS[state.lang]] || o.ko; }
const SUGGESTIONS = [
  { ko: "등본·서류 발급받기", en: "Get a document or certificate", zh: "开具证明或文件", vi: "Xin giấy tờ / chứng nhận" },
  { ko: "이 페이지 번역하기", en: "Translate this page", zh: "翻译此页面", vi: "Dịch trang này" },
  { ko: "이 페이지 요약하기", en: "Summarize this page", zh: "总结此页面", vi: "Tóm tắt trang này" },
];
const CHAT_TXT = {
  safety: { ko: "이 페이지에서 광고·의심 링크를 가려드려요.", en: "I hide ad / suspicious links on this page.", zh: "我会在此页隐藏广告和可疑链接。", vi: "Tôi ẩn liên kết quảng cáo/đáng ngờ trên trang này." },
  sub: { ko: "아래에서 고르거나, 하고 싶은 일을 직접 적어 주세요.", en: "Pick one below, or type what you want to do.", zh: "在下方选择，或输入您想做的事。", vi: "Chọn bên dưới, hoặc nhập việc bạn muốn làm." },
  ph: { ko: "예: 등본 떼고 싶어요", en: "e.g. I need a certificate", zh: "例：我要开证明", vi: "vd: Tôi cần giấy tờ" },
};

function renderChatPage() {
  const el = $("tab-chat");
  el.innerHTML = "";

  const safety = document.createElement("div");
  safety.className = "hd-chat-safety";
  safety.innerHTML = `<span class="chk">✓</span><span class="txt"></span>`;
  safety.querySelector(".txt").textContent = tLang(CHAT_TXT.safety);
  el.appendChild(safety);

  const body = document.createElement("div");
  body.className = "hd-chat-body";
  if (state.guideResult) buildChatMessages(body);
  else buildChatEmpty(body);
  el.appendChild(body);
}

function buildChatEmpty(body) {
  const title = document.createElement("div");
  title.className = "hd-chat-empty-title"; title.textContent = tr("hero-title");
  const sub = document.createElement("div");
  sub.className = "hd-chat-empty-sub"; sub.textContent = tLang(CHAT_TXT.sub);
  body.appendChild(title); body.appendChild(sub);
  const list = document.createElement("div");
  list.className = "hd-suggest-list";
  SUGGESTIONS.forEach((s) => {
    const b = document.createElement("button");
    b.className = "hd-suggest";
    b.innerHTML = `<span class="plus">+</span><span class="lbl"></span>`;
    b.querySelector(".lbl").textContent = tLang(s);
    b.addEventListener("click", () => runGuide(tLang(s)));
    list.appendChild(b);
  });
  body.appendChild(list);
}

function buildChatMessages(body) {
  const r = state.guideResult;
  body.appendChild(bubble("user", r.goal));
  if (r.summary) body.appendChild(bubble("bot", r.summary));
  if (r.kind === "summary") {
    if (r.bullets && r.bullets.length) body.appendChild(bulletCard(r.bullets));
    return;
  }
  const steps = r.steps || [];
  if (steps.length) {
    body.appendChild(bubble("bot", introMsg(steps.length)));
    body.appendChild(stepNavigator(steps, r.tabId));
  }
  if (r.warnings && r.warnings.length) body.appendChild(warnCard(r.warnings));
}

// 요약 bullet 카드
function bulletCard(bullets) {
  const ul = document.createElement("ul"); ul.className = "hd-bullets";
  bullets.forEach((b, i) => {
    const li = document.createElement("li");
    li.innerHTML = `<span class="n">${i + 1}</span><p></p>`;
    li.querySelector("p").textContent = b;
    ul.appendChild(li);
  });
  return ul;
}

// 스텝 네비게이터: STEP n/N + < > 로 단계 이동, 각 단계의 버튼을 페이지에서 자동 하이라이트
function stepNavigator(steps, tabId) {
  let idx = 0;
  const wrap = document.createElement("div"); wrap.className = "hd-step";
  async function highlightCurrent() {
    const s = steps[idx];
    if (!s || !s.label) { setStatus(""); return; }
    try {
      const color = await getHighlightColor();
      const res = await sendToContent(tabId, { type: "WG_HIGHLIGHT", href: s.href, text: s.label, color });
      setStatus(res?.ok ? `STEP ${idx + 1}: 페이지에서 표시했어요 ✓` : "그 버튼을 페이지에서 못 찾았어요.");
    } catch { /* 특수 페이지 */ }
  }
  function render() {
    const s = steps[idx];
    wrap.innerHTML = "";
    const head = document.createElement("div"); head.className = "hd-stepnav-head";
    const n = document.createElement("span"); n.className = "hd-step-n"; n.textContent = `STEP ${idx + 1}/${steps.length}`;
    const ctrl = document.createElement("div"); ctrl.className = "hd-stepnav-ctrl";
    const prev = document.createElement("button"); prev.textContent = "‹"; prev.disabled = idx === 0;
    const next = document.createElement("button"); next.textContent = "›"; next.disabled = idx === steps.length - 1;
    prev.addEventListener("click", () => { if (idx > 0) { idx--; render(); highlightCurrent(); } });
    next.addEventListener("click", () => { if (idx < steps.length - 1) { idx++; render(); highlightCurrent(); } });
    ctrl.appendChild(prev); ctrl.appendChild(next);
    head.appendChild(n); head.appendChild(ctrl);
    wrap.appendChild(head);
    const txt = document.createElement("div"); txt.className = "hd-step-txt"; txt.textContent = s.text;
    wrap.appendChild(txt);
    if (s.label) {
      const tgt = document.createElement("div"); tgt.className = "hd-target";
      const lbl = { ko: "화면에서 이 버튼을 누르세요", en: "Press this button on the page", zh: "在页面上点这个按钮", vi: "Nhấn nút này trên trang" }[LANGS[state.lang]];
      const small = document.createElement("small"); small.textContent = lbl; tgt.appendChild(small);
      const chip = document.createElement("button"); chip.className = "btnchip"; chip.textContent = `▸ ${s.label}`;
      chip.title = { ko: "페이지에서 찾기", en: "Find on page", zh: "在页面查找", vi: "Tìm trên trang" }[LANGS[state.lang]];
      chip.addEventListener("click", highlightCurrent);
      tgt.appendChild(chip);
      wrap.appendChild(tgt);
    }
  }
  render();
  highlightCurrent(); // 첫 스텝 자동 하이라이트
  return wrap;
}

// ---------- 로그인 ----------
function setLoginPlan(plan) {
  state.loginPlan = plan;
  document.querySelectorAll("#login-plans button").forEach((b) => b.classList.toggle("on", b.dataset.plan === plan));
}
document.querySelectorAll("#login-plans button").forEach((b) => b.addEventListener("click", () => setLoginPlan(b.dataset.plan)));
document.querySelectorAll("#login-langs [data-lang]").forEach((b) => b.addEventListener("click", () => { state.lang = b.dataset.lang; applyI18n(); }));

async function doLogin({ email, name, plan }) {
  const account = await login({ email, name, plan, profile: { lang: state.lang } });
  await saveProfile({ name, email, lang: state.lang, plan, onboarded: true });
  await enterApp(account);
}

$("login-btn").addEventListener("click", async () => {
  const err = $("login-err");
  err.textContent = "";
  const name = $("login-name").value.trim();
  const email = $("login-email").value.trim();
  if (!name) return (err.textContent = "이름을 입력해 주세요.");
  if (!email || !email.includes("@")) return (err.textContent = "이메일을 정확히 입력해 주세요.");
  $("login-btn").disabled = true;
  try { await doLogin({ email, name, plan: state.loginPlan }); }
  catch (e) { err.textContent = e.message || "로그인 실패"; }
  finally { $("login-btn").disabled = false; }
});

$("guest-btn").addEventListener("click", async () => {
  const err = $("login-err"); err.textContent = "";
  const email = "guest" + Math.floor(Math.random() * 1e7) + "@wg.local";
  try { await doLogin({ email, name: "게스트", plan: "gemini" }); }
  catch (e) { err.textContent = e.message || "연결 실패"; }
});

// ---------- 앱 진입 ----------
async function enterApp(account) {
  state.account = account;
  showApp();
  setLoginPlan(account.plan || "gemini");
  applyI18n();
  await loadSiteInfo();
  setTab("home");
  renderMy();
}

async function loadSiteInfo() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;
    let host = "";
    try { host = new URL(tab.url).hostname; } catch {}
    $("site-name").textContent = tab.title || host || "현재 사이트";
    $("site-url").textContent = host || (tab.url || "").slice(0, 40) || "—";
  } catch { /* 특수 페이지 */ }
}

// 사용자가 탭을 바꾸거나 페이지를 이동하면 현재 사이트 카드를 따라가게 갱신
try {
  chrome.tabs.onActivated?.addListener(() => loadSiteInfo());
  chrome.tabs.onUpdated?.addListener((_id, info, tab) => { if (tab?.active && (info.title || info.url || info.status === "complete")) loadSiteInfo(); });
} catch { /* 리스너 미지원 환경 */ }

// 상단 로고 = 홈
$("brand-btn").addEventListener("click", () => setTab("home"));
document.querySelectorAll(".hd-tab").forEach((b) => b.addEventListener("click", () => setTab(b.dataset.tab)));
// 언어 변경 → 정적 문자열 + 현재 탭의 동적 콘텐츠까지 즉시 갱신(저장은 대기 없이 백그라운드)
function changeLang(lang) {
  if (!lang || lang === state.lang) return;
  state.lang = lang;
  applyI18n();
  rerenderCurrentTab();
  saveProfile({ lang }); // fire-and-forget → UI 즉시 반영
}
function rerenderCurrentTab() {
  if (state.tab === "chat") renderChatPage();
  else if (state.tab === "sum") renderSummary();
  else if (state.tab === "save") renderSaved();
  else if (state.tab === "my") renderMy();
}
document.querySelectorAll("#app-langs [data-lang], #my-langs [data-lang]").forEach((b) =>
  b.addEventListener("click", () => changeLang(b.dataset.lang)));

// ---------- 기능 토글 ----------
function renderToggles() {
  document.querySelectorAll("[data-feat]").forEach((btn) => {
    const on = state.toggles[btn.dataset.feat];
    btn.classList.toggle("on", on);
    btn.querySelector(".lbl").textContent = on ? "ON" : "OFF";
  });
}
document.querySelectorAll("[data-feat]").forEach((btn) =>
  btn.addEventListener("click", async () => {
    const f = btn.dataset.feat;
    state.toggles[f] = !state.toggles[f];
    renderToggles();
    if (f === "filter") {
      try {
        const tab = await getActiveTab();
        if (tab?.id) {
          const res = await sendToContent(tab.id, { type: state.toggles.filter ? "WG_FILTER_ADS" : "WG_UNFILTER" });
          setStatus(state.toggles.filter ? `광고 ${res?.count ?? 0}개를 가렸어요 ✓` : "광고 가리기를 껐어요.");
        }
      } catch { setStatus("이 페이지에서는 광고 가리기를 쓸 수 없어요.", true); }
    }
  }));

// ---- 요약 버튼: 현재 화면을 대화창에 요약 ----
$("btn-summarize")?.addEventListener("click", async () => {
  const btn = $("btn-summarize"); btn.disabled = true;
  setStatus("현재 화면을 요약하는 중…");
  setTab("chat");
  const body = $("tab-chat").querySelector(".hd-chat-body");
  if (body) body.innerHTML = `<div class="hd-bub bot">${esc(loadingMsg())}</div>`;
  try {
    const tab = await getActiveTab();
    if (!tab?.id) throw new Error("활성 탭을 찾을 수 없어요.");
    const page = await sendToContent(tab.id, { type: "WG_EXTRACT" });
    if (!page) throw new Error("페이지를 읽지 못했어요. 새로고침 후 다시 시도해 주세요.");
    const out = await summarize({ lang: state.lang, pageTitle: page.title, pageText: page.pageText });
    state.guideResult = { kind: "summary", goal: tr("f-sum"), summary: out.summary, bullets: out.bullets || [], pageTitle: page.title };
    renderChatPage();
    await saveEntry({ type: "summary", title: page.title || tr("f-sum"), at: new Date().toISOString() });
    renderAccount(await getAccount());
    setStatus(out.mock ? "· 데모(mock) 요약이에요. 서버에 키를 넣으면 실제 AI로 바뀝니다." : "");
  } catch (e) {
    if (e.code === "quota") { setTab("my"); setStatus(e.message, true); renderAccount(await getAccount()); }
    else if (e.code === "auth") { await clearAuth(); showLogin(); setStatus(e.message, true); }
    else { const b = $("tab-chat").querySelector(".hd-chat-body"); if (b) b.innerHTML = `<div class="hd-bub bot">${esc("오류: " + e.message)}</div>`; setStatus("오류: " + e.message, true); }
  } finally { btn.disabled = false; }
});

// ---- 화면 기록 버튼: 지금 화면 캡처 → 보관함 ----
$("btn-capture")?.addEventListener("click", async () => {
  const btn = $("btn-capture"); btn.disabled = true;
  setStatus("화면을 캡처하는 중…");
  try {
    let thumb = "";
    try { if (chrome.tabs?.captureVisibleTab) thumb = await chrome.tabs.captureVisibleTab({ format: "png" }); } catch { /* 특수 페이지 캡처 불가 */ }
    const tab = await getActiveTab();
    const title = (tab?.title || "화면") + " 캡처";
    await saveEntry({ type: "capture", title, at: new Date().toISOString(), thumb });
    setTab("save");
    setStatus("보관함에 저장했어요 ✓");
  } catch (e) {
    setStatus("캡처 실패: " + e.message, true);
  } finally { btn.disabled = false; }
});

// ---------- 안내(홈 입력 → 대화) ----------
async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}
async function sendToContent(tabId, message) {
  try { return await chrome.tabs.sendMessage(tabId, message); }
  catch {
    await chrome.scripting.executeScript({ target: { tabId }, files: ["src/content.js"] });
    return await chrome.tabs.sendMessage(tabId, message);
  }
}
function setStatus(msg, isErr = false) { $("status").textContent = msg || ""; $("status").classList.toggle("err", isErr); }

$("hero-send").addEventListener("click", () => runGuide($("hero-input").value));
$("hero-input").addEventListener("keydown", (e) => { if (e.key === "Enter") runGuide($("hero-input").value); });

async function runGuide(goalText) {
  const goal = String(goalText != null ? goalText : "").trim();
  if (!goal) return setStatus("하고 싶은 일을 적어 주세요.", true);
  state.userGoal = goal;
  setStatus("페이지를 읽는 중…");
  setTab("chat");
  const body = $("tab-chat").querySelector(".hd-chat-body");
  if (body) body.innerHTML = `<div class="hd-bub bot">${esc(loadingMsg())}</div>`;
  try {
    const tab = await getActiveTab();
    if (!tab?.id) throw new Error("활성 탭을 찾을 수 없어요.");
    const page = await sendToContent(tab.id, { type: "WG_EXTRACT" });
    if (!page) throw new Error("페이지를 읽지 못했어요. 새로고침 후 다시 시도해 주세요.");
    const out = await guide({ goal, lang: state.lang, pageTitle: page.title, pageText: page.pageText, links: page.links });
    state.guideResult = { ...out, goal, pageTitle: page.title, tabId: tab.id };
    renderChatPage();
    await saveEntry({ type: "guide", title: goal, at: new Date().toISOString() });
    renderAccount(await getAccount());
    setStatus(out.mock ? "· 데모(mock) 응답이에요. 서버에 키를 넣으면 실제 AI로 바뀝니다." : "");
  } catch (e) {
    if (e.code === "quota") { setTab("my"); setStatus(e.message + " (마이페이지에서 유료 플랜으로 전환)", true); renderAccount(await getAccount()); }
    else if (e.code === "auth") { await clearAuth(); showLogin(); setStatus(e.message, true); }
    else {
      const b = $("tab-chat").querySelector(".hd-chat-body");
      if (b) b.innerHTML = `<div class="hd-bub bot">${esc("오류: " + e.message)}</div>`;
      setStatus("오류: " + e.message, true);
    }
  }
}
function loadingMsg() { return { ko: "페이지를 읽고 안내를 준비하고 있어요…", en: "Reading the page and preparing guidance…", zh: "正在读取页面并准备指引…", vi: "Đang đọc trang và chuẩn bị hướng dẫn…" }[LANGS[state.lang]]; }

function introMsg(n) { return { ko: `${n}단계로 안내할게요.`, en: `Let me guide you in ${n} steps.`, zh: `我分${n}步为您指引。`, vi: `Tôi hướng dẫn bạn ${n} bước.` }[LANGS[state.lang]]; }
function bubble(kind, text) { const d = document.createElement("div"); d.className = "hd-bub " + kind; d.textContent = text; return d; }
function stepBubble(i, n, text) {
  const d = document.createElement("div"); d.className = "hd-step";
  const head = document.createElement("div"); head.className = "hd-step-head";
  head.innerHTML = `<span class="hd-step-badge">${i}</span><span class="hd-step-n">STEP ${i}/${n}</span>`;
  const t = document.createElement("div"); t.className = "hd-step-txt"; t.textContent = text;
  d.appendChild(head); d.appendChild(t); return d;
}
function targetCard(nextLink, tabId) {
  const d = document.createElement("div"); d.className = "hd-target";
  const label = { ko: "화면에서 이 버튼을 누르세요", en: "Press this button on the page", zh: "在页面上点这个按钮", vi: "Nhấn nút này trên trang" }[LANGS[state.lang]];
  d.innerHTML = `<small>${esc(label)}</small><span class="btnchip">▸ ${esc(nextLink.text)}</span>`;
  const find = document.createElement("button"); find.className = "hd-linkbtn"; find.style.marginTop = "8px";
  find.textContent = { ko: "페이지에서 찾아주기", en: "Find it on the page", zh: "在页面中找到", vi: "Tìm trên trang" }[LANGS[state.lang]];
  find.addEventListener("click", async () => {
    const color = await getHighlightColor();
    const res = await sendToContent(tabId, { type: "WG_HIGHLIGHT", href: nextLink.href, text: nextLink.text, color });
    setStatus(res?.ok ? "페이지에서 표시했어요 ✓" : "그 링크를 페이지에서 못 찾았어요.");
  });
  d.appendChild(find); return d;
}
function warnCard(warnings) {
  const d = document.createElement("div"); d.className = "hd-warn";
  const head = { ko: "주의하세요", en: "WATCH OUT", zh: "请注意", vi: "CHÚ Ý" }[LANGS[state.lang]];
  d.innerHTML = `<b>⚠ ${esc(head)}</b>`;
  const ul = document.createElement("ul");
  warnings.forEach((w) => { const li = document.createElement("li"); li.textContent = w; ul.appendChild(li); });
  d.appendChild(ul); return d;
}

// ---------- 요약 렌더 ----------
function renderSummary() {
  const el = $("tab-sum"); const r = state.guideResult;
  const tag = { ko: "이 페이지 요약", en: "PAGE SUMMARY", zh: "本页摘要", vi: "TÓM TẮT TRANG" }[LANGS[state.lang]];
  if (!r) {
    const empty = { ko: "먼저 홈에서 안내를 받아 보세요.", en: "Get guidance from Home first.", zh: "请先在首页获取指引。", vi: "Hãy nhận hướng dẫn ở Trang chủ trước." }[LANGS[state.lang]];
    el.innerHTML = `<div class="hd-empty">${esc(empty)}</div>`; return;
  }
  el.innerHTML = `<div class="hd-sum-tag">${esc(tag)}</div><div class="hd-sum-title"></div><ul class="hd-sum-list"></ul>`;
  el.querySelector(".hd-sum-title").textContent = r.pageTitle || r.goal;
  const ul = el.querySelector(".hd-sum-list");
  const items = [r.summary, ...(r.steps || [])].filter(Boolean);
  items.forEach((it, i) => { const li = document.createElement("li"); li.innerHTML = `<span class="n">${i + 1}</span><p></p>`; li.querySelector("p").textContent = it; ul.appendChild(li); });
}

// ---------- 보관함 ----------
async function getSaved() { const o = await chrome.storage.local.get("wg_saved"); return o.wg_saved || []; }
async function saveEntry(entry) { const list = await getSaved(); list.unshift(entry); await chrome.storage.local.set({ wg_saved: list.slice(0, 50) }); }
// 보관함 카테고리 정의 + 접힘 상태
const SAVE_CATS = [
  { type: "guide", chip: "GUIDE", em: "🧭", label: { ko: "길안내", en: "Guides", zh: "指引", vi: "Hướng dẫn" } },
  { type: "summary", chip: "SUM", em: "📝", label: { ko: "요약", en: "Summaries", zh: "摘要", vi: "Tóm tắt" } },
  { type: "capture", chip: "SHOT", em: "📸", label: { ko: "캡처", en: "Captures", zh: "截图", vi: "Ảnh chụp" } },
];
const savedCollapsed = {};

async function renderSaved() {
  const el = $("tab-save"); const list = await getSaved();
  if (!list.length) {
    const empty = { ko: "저장된 안내가 없어요.", en: "Nothing saved yet.", zh: "还没有收藏。", vi: "Chưa có mục nào." }[LANGS[state.lang]];
    el.innerHTML = `<div class="hd-empty">${esc(empty)}</div>`; return;
  }
  el.innerHTML = "";
  SAVE_CATS.forEach((cat) => {
    const items = list.filter((it) => it.type === cat.type);
    if (!items.length) return;
    const collapsed = !!savedCollapsed[cat.type];

    const section = document.createElement("div"); section.className = "hd-save-cat";
    const head = document.createElement("button"); head.className = "hd-save-cathead";
    head.innerHTML = `<span class="ct"><span class="em">${cat.em}</span>${esc(tLang(cat.label))}<span class="cnt">${items.length}</span></span><span class="chev${collapsed ? "" : " open"}">›</span>`;
    head.addEventListener("click", () => { savedCollapsed[cat.type] = !savedCollapsed[cat.type]; renderSaved(); });
    section.appendChild(head);

    const catBody = document.createElement("div"); catBody.className = "hd-save-catbody"; catBody.hidden = collapsed;
    items.forEach((it) => catBody.appendChild(savedRow(it, cat)));
    section.appendChild(catBody);
    el.appendChild(section);
  });
}

function savedRow(it, cat) {
  const row = document.createElement("div"); row.className = "hd-save-row";
  const d = new Date(it.at); const date = `${d.getMonth() + 1}/${d.getDate()}`;
  const isShot = it.type === "capture" && it.thumb;
  const icon = isShot
    ? `<img class="thumb" src="${esc(it.thumb)}" alt="">`
    : `<div class="ic"><span style="filter:grayscale(1)">${cat.em}</span></div>`;
  row.innerHTML = `${icon}
    <div class="meta"><div class="top"><span class="type mono">${cat.chip}</span><span class="date">${date}</span></div>
    <div class="title"></div></div><span class="chev">›</span>`;
  row.querySelector(".title").textContent = it.title;
  if (isShot) {
    row.classList.add("clickable");
    row.addEventListener("click", () => openImageModal(it.thumb, it.title));
  }
  return row;
}

// 캡처 이미지 크게 보기(모달)
function openImageModal(src, title) {
  const m = document.createElement("div"); m.className = "hd-modal";
  const inner = document.createElement("div"); inner.className = "hd-modal-inner";
  const img = document.createElement("img"); img.src = src; img.alt = title || "";
  const close = document.createElement("button"); close.className = "hd-modal-close"; close.textContent = "×";
  inner.appendChild(close); inner.appendChild(img);
  m.appendChild(inner);
  m.addEventListener("click", (e) => { if (e.target === m || e.target === close) m.remove(); });
  document.body.appendChild(m);
}

// 텍스트 정보 모달(도움말/개인정보 공용)
function openInfoModal(title, bodyEl) {
  const m = document.createElement("div"); m.className = "hd-modal";
  const inner = document.createElement("div"); inner.className = "hd-modal-inner hd-infomodal";
  const close = document.createElement("button"); close.className = "hd-modal-close"; close.textContent = "×";
  const h = document.createElement("div"); h.className = "hd-info-title"; h.textContent = title;
  inner.appendChild(close); inner.appendChild(h); inner.appendChild(bodyEl);
  m.appendChild(inner);
  m.addEventListener("click", (e) => { if (e.target === m || e.target === close) m.remove(); });
  document.body.appendChild(m);
}

const HELP_TXT = {
  ko: [
    "‘Ask me!’(다문화 웹 길잡이)는 한국의 행정·생활 웹사이트를 돕는 AI 안내 도우미예요.",
    "하고 싶은 일을 적으면, 지금 화면에서 다음에 눌러야 할 곳을 모국어로 단계별 안내해요.",
    "광고·피싱 링크는 가려주고, 현재 화면을 요약하거나 캡처해 보관함에 저장할 수 있어요.",
    "무료(Gemini)·유료(ChatGPT) 플랜 중 골라 쓸 수 있습니다.",
  ],
  en: [
    "‘Ask me!’ is an AI guide for Korean government & everyday websites.",
    "Type what you want to do, and it guides you step by step in your language.",
    "It hides ad/phishing links, and can summarize or capture the current screen.",
    "Choose between the free (Gemini) and paid (ChatGPT) plans.",
  ],
  zh: [
    "‘Ask me!’ 是帮助您使用韩国政务与生活网站的 AI 向导。",
    "输入您想做的事，它会用您的语言一步步指引下一步该点哪里。",
    "它会遮盖广告/钓鱼链接，并能摘要或截图当前页面保存到收藏。",
    "可在免费(Gemini)与付费(ChatGPT)套餐中选择。",
  ],
  vi: [
    "‘Ask me!’ là trợ lý AI cho các trang hành chính & đời sống ở Hàn Quốc.",
    "Nhập việc bạn muốn làm, nó hướng dẫn từng bước bằng tiếng của bạn.",
    "Nó che link quảng cáo/lừa đảo, tóm tắt hoặc chụp màn hình để lưu.",
    "Chọn giữa gói miễn phí (Gemini) và trả phí (ChatGPT).",
  ],
};

function openHelp() {
  const lines = HELP_TXT[LANGS[state.lang]] || HELP_TXT.ko;
  const body = document.createElement("div"); body.className = "hd-info-body";
  lines.forEach((l) => { const p = document.createElement("p"); p.textContent = l; body.appendChild(p); });
  openInfoModal(tr("set-help"), body);
}

async function openPrivacy() {
  const account = state.account || (await getAccount());
  const profile = await getProfile();
  const planLabel = ((account?.plan || profile.plan) === "openai") ? "유료 (ChatGPT)" : "무료 (Gemini)";
  const rows = [
    { label: { ko: "이름", en: "Name", zh: "姓名", vi: "Tên" }, value: profile.name || account?.name || "—" },
    { label: { ko: "이메일", en: "Email", zh: "邮箱", vi: "Email" }, value: account?.email || profile.email || "—" },
    { label: { ko: "모국어", en: "Language", zh: "语言", vi: "Ngôn ngữ" }, value: profile.lang || "—" },
    { label: { ko: "플랜", en: "Plan", zh: "套餐", vi: "Gói" }, value: planLabel },
  ];
  const body = document.createElement("div"); body.className = "hd-info-body";
  rows.forEach((r) => {
    const d = document.createElement("div"); d.className = "hd-info-row";
    d.innerHTML = `<span></span><b></b>`;
    d.querySelector("span").textContent = tLang(r.label);
    d.querySelector("b").textContent = r.value;
    body.appendChild(d);
  });
  const note = document.createElement("p"); note.className = "hd-info-note";
  note.textContent = { ko: "이 정보는 로그인 시 입력한 값이며, 이 기기에만 저장됩니다.", en: "What you entered at login, stored only on this device.", zh: "登录时输入的信息，仅存于本设备。", vi: "Thông tin bạn nhập khi đăng nhập, chỉ lưu trên thiết bị này." }[LANGS[state.lang]];
  body.appendChild(note);
  openInfoModal(tr("set-privacy"), body);
}

$("row-help")?.addEventListener("click", openHelp);
$("row-privacy")?.addEventListener("click", openPrivacy);

// ---------- 마이페이지 ----------
function renderAccount(account) {
  if (!account) return;
  state.account = account;
  const used = account.usage?.count ?? 0, limit = account.limit ?? "—";
  $("set-usage").textContent = `${used} / ${limit}`;
  document.querySelectorAll("#my-plans button").forEach((b) => b.classList.toggle("on", b.dataset.plan === account.plan));
}
async function renderMy() {
  const account = state.account || (await getAccount());
  const profile = await getProfile();
  const name = account?.name || profile.name || "게스트";
  $("my-avatar").textContent = (name[0] || "N").toUpperCase();
  $("my-name").textContent = name;
  $("my-sub").textContent = (account?.email || "") + " · " + state.lang;
  renderAccount(account);
  await renderColorPicker();
}

// 페이지 하이라이트 색상 선택
async function renderColorPicker() {
  const color = (await getHighlightColor()).toLowerCase();
  document.querySelectorAll("#my-colors .hd-color").forEach((b) =>
    b.classList.toggle("on", (b.dataset.color || "").toLowerCase() === color));
  const custom = $("my-color-custom");
  if (custom) custom.value = color;
}
document.querySelectorAll("#my-colors .hd-color").forEach((b) =>
  b.addEventListener("click", async () => {
    await saveHighlightColor(b.dataset.color);
    await renderColorPicker();
    setStatus("표시 색상을 바꿨어요 ✓");
  }));
$("my-color-custom")?.addEventListener("input", async (e) => {
  await saveHighlightColor(e.target.value);
  await renderColorPicker();
});

document.querySelectorAll("#my-plans button").forEach((b) =>
  b.addEventListener("click", async () => {
    try { const account = await changePlan(b.dataset.plan); await saveProfile({ plan: b.dataset.plan }); renderAccount(account);
      setStatus(`플랜을 ${b.dataset.plan === "openai" ? "유료" : "무료"}로 바꿨어요 ✓`); }
    catch (e) { setStatus("플랜 변경 실패: " + e.message, true); }
  }));

$("logout-btn").addEventListener("click", async () => {
  await clearAuth(); await clearProfile();
  state.account = null; state.guideResult = null;
  $("login-name").value = ""; $("login-email").value = ""; $("login-err").textContent = "";
  setStatus("");
  showLogin();
});

// ---------- 유틸 ----------
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

// ---------- 부팅 ----------
(async () => {
  const profile = await getProfile();
  if (profile.lang) state.lang = profile.lang;
  renderToggles();
  const account = await getAccount();
  if (profile.onboarded && account?.token) { await enterApp(account); }
  else { showLogin(); applyI18n(); setLoginPlan("gemini"); }
})();
