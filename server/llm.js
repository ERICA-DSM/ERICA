// llm.js — 서버에서 우리 키로 Gemini/OpenAI를 호출 (확장에는 키가 없음)
// 키가 없거나 MOCK=1 이면 목(mock) 응답을 돌려줘 키 없이도 전체 흐름을 데모할 수 있다.

const LANG_NAME = { "한국어": "Korean", "영어": "English", "중국어": "Chinese (中文)", "베트남어": "Vietnamese (Tiếng Việt)", ko: "Korean", en: "English", zh: "Chinese (中文)", vi: "Vietnamese (Tiếng Việt)" };
const langName = (l) => LANG_NAME[l] || l;

const SYSTEM_PROMPT = (lang) => `당신은 한국 행정·생활 웹사이트를 처음 쓰는 외국인/다문화 가정을 돕는 안내자입니다.
사용자의 목적을 파악하고, 현재 페이지에서 그 목적을 이루기 위해 "지금 이 화면에서 할 수 있는 단계"를 순서대로 안내하세요.
버튼을 눌러 다른 페이지로 넘어가야 하면 그 단계까지만 안내하고, 이동 후의 화면은 추측해서 지어내지 마세요.

규칙:
- 모든 답변 텍스트(summary, 각 step의 text, warnings)는 반드시 ${langName(lang)}로 씁니다. 쉬운 말로, 행정용어는 풀어서.
- 각 step은 {text, label, href} 객체입니다. text=그 단계에서 할 일 안내(${langName(lang)}).
  label=그 단계에서 누를 페이지의 실제 버튼/링크 텍스트(페이지 원문 그대로, label=official 우선, 없으면 "").
  href=그 링크 주소(없으면 "").
- 광고/피싱 링크(label이 ad 또는 suspect)는 절대 step label로 쓰지 말고 warnings에 경고로 넣습니다.
- 아래 JSON 형식으로만 답하세요(다른 텍스트 금지):
{"summary":"...","steps":[{"text":"...","label":"...","href":"..."}],"warnings":["..."]}`;

const SUMMARY_PROMPT = (lang) => `당신은 한국 웹페이지를 외국인/다문화 가정에게 쉽게 요약해 주는 도우미입니다.
현재 페이지의 핵심을 반드시 ${langName(lang)}로, 아주 쉬운 말로 요약하세요. 아래 JSON 형식으로만 답하세요(다른 텍스트 금지):
{"summary":"2~3줄 요약","bullets":["요점1","요점2","요점3"]}`;

function buildUserPrompt({ goal, pageTitle, pageText, links, lang }) {
  const linkList = (links || [])
    .map((l, i) => `${i + 1}. [${l.label}] "${l.text}" -> ${l.href}`)
    .join("\n");
  return `사용자 목적: ${goal}

현재 페이지 제목: ${pageTitle}

현재 페이지 본문(일부):
${pageText}

현재 페이지의 링크 목록(label = official/normal/ad/suspect):
${linkList}

[중요] summary·steps.text·warnings는 반드시 ${langName(lang)}로 작성하세요(label 값만 페이지 원문 유지).`;
}

function safeParseJson(text) {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const slice = start >= 0 && end >= 0 ? cleaned.slice(start, end + 1) : cleaned;
  return JSON.parse(slice);
}

async function callGemini(system, user, { apiKey, model }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: { temperature: 0.2, responseMimeType: "application/json", maxOutputTokens: 1200 },
    }),
  });
  if (!res.ok) throw new Error("Gemini API error: " + res.status + " " + (await res.text()));
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

async function callOpenAI(system, user, { apiKey, model }) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      max_tokens: 1500,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error("OpenAI API error: " + res.status + " " + (await res.text()));
  const data = await res.json();
  return data?.choices?.[0]?.message?.content || "";
}

async function callAnthropic(system, user, { apiKey, model }) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model,
      max_tokens: 1500,
      temperature: 0.3,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) throw new Error("Anthropic API error: " + res.status + " " + (await res.text()));
  const data = await res.json();
  return (data?.content || []).map((b) => b.text || "").join("") || "";
}

// 실제 LLM 호출: 사용 가능한 키를 우선순위로 선택 (Gemini > OpenAI > Claude)
async function callLLM(system, user, plan, env) {
  if (env.GEMINI_API_KEY) {
    return callGemini(system, user, { apiKey: env.GEMINI_API_KEY, model: env.GEMINI_MODEL || "gemini-flash-latest" });
  }
  if (env.OPENAI_API_KEY) {
    return callOpenAI(system, user, { apiKey: env.OPENAI_API_KEY, model: env.OPENAI_MODEL || "gpt-4o-mini" });
  }
  return callAnthropic(system, user, { apiKey: env.ANTHROPIC_API_KEY, model: env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001" });
}

// steps를 항상 {text,label,href} 객체 배열로 정규화
function normalizeSteps(steps) {
  if (!Array.isArray(steps)) return [];
  return steps.map((s) =>
    typeof s === "string"
      ? { text: s, label: "", href: "" }
      : { text: s.text || "", label: s.label || "", href: s.href || "" }
  );
}

function isMock(plan, env) {
  if (env.MOCK === "1") return true;
  return !(env.ANTHROPIC_API_KEY || env.OPENAI_API_KEY || env.GEMINI_API_KEY);
}

function mockGuide({ goal, lang, pageTitle, links }) {
  const officials = (links || []).filter((l) => l.label === "official");
  const steps = [
    { text: `[데모·${lang}] '${goal}'을(를) 위해 먼저 아래 버튼을 누르세요.`, label: officials[0]?.text || "", href: officials[0]?.href || "" },
    { text: `[데모·${lang}] 다음 페이지에서 안내에 따라 필요한 항목을 선택하세요.`, label: officials[1]?.text || officials[0]?.text || "", href: officials[1]?.href || officials[0]?.href || "" },
    { text: `[데모·${lang}] 정보를 확인하고 신청/조회를 완료하세요.`, label: "", href: "" },
  ];
  return {
    summary: `[데모(mock)] '${pageTitle || "이 페이지"}'에 대한 ${lang} 안내입니다. 서버에 실제 API 키를 넣으면 진짜 AI 안내로 바뀝니다.`,
    steps,
    nextLink: officials[0] ? { text: officials[0].text, href: officials[0].href } : null,
    warnings: (links || []).filter((l) => l.label === "ad" || l.label === "suspect").slice(0, 2)
      .map((l) => `"${l.text}" 은(는) 광고/의심 링크로 보여요. 누르지 마세요.`),
  };
}

// plan: "gemini"(무료) | "openai"(유료)
export async function guide(payload, plan, env) {
  if (isMock(plan, env)) return { mock: true, ...mockGuide(payload) };

  const system = SYSTEM_PROMPT(payload.lang);
  const user = buildUserPrompt(payload);
  const raw = await callLLM(system, user, plan, env);

  const parsed = safeParseJson(raw);
  const steps = normalizeSteps(parsed.steps);
  const nextLink = (parsed.nextLink && parsed.nextLink.href)
    ? parsed.nextLink
    : (steps.find((s) => s.href) ? { text: steps.find((s) => s.href).label, href: steps.find((s) => s.href).href } : null);
  return {
    mock: false,
    summary: parsed.summary || "",
    steps,
    nextLink,
    warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
  };
}

// 현재 페이지 요약 (요약 버튼용)
export async function summarize(payload, plan, env) {
  if (isMock(plan, env)) {
    return {
      mock: true,
      summary: `[데모(mock)] '${payload.pageTitle || "이 페이지"}'에 대한 ${payload.lang} 요약입니다. 서버에 키를 넣으면 실제 AI 요약으로 바뀝니다.`,
      bullets: ["[데모] 이 페이지의 핵심 요점 1", "[데모] 핵심 요점 2", "[데모] 핵심 요점 3"],
    };
  }
  const system = SUMMARY_PROMPT(payload.lang);
  const user = `현재 페이지 제목: ${payload.pageTitle}\n\n현재 페이지 본문(일부):\n${payload.pageText}\n\n[중요] summary·bullets는 반드시 ${langName(payload.lang)}로 작성.`;
  const raw = await callLLM(system, user, plan, env);
  const parsed = safeParseJson(raw);
  return {
    mock: false,
    summary: parsed.summary || "",
    bullets: Array.isArray(parsed.bullets) ? parsed.bullets : [],
  };
}
