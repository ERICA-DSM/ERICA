// llm.js — 서버에서 우리 키로 Gemini/OpenAI를 호출 (확장에는 키가 없음)
// 키가 없거나 MOCK=1 이면 목(mock) 응답을 돌려줘 키 없이도 전체 흐름을 데모할 수 있다.

const SYSTEM_PROMPT = (lang) => `당신은 한국 행정·생활 웹사이트를 처음 쓰는 외국인/다문화 가정을 돕는 안내자입니다.

먼저 사용자의 목적(goal)을 정확히 파악하세요. 사용자가 무엇을 "하고 싶은지"(예: 접수 가능한 목록 보기,
신청서 제출, 서류 발급, 조회 등)를 이해하고, 현재 페이지 내용을 바탕으로 그 목적을 끝까지 이루기 위한
**전체 과정을 순서대로** 안내하세요. 한 단계만 알려주지 말고, 목적 달성까지 필요한 단계를 모두 적으세요.

규칙:
- ${lang} 언어로, 쉬운 말로 설명합니다. 어려운 행정용어는 풀어서 씁니다.
- **지금 이 페이지에서 실제로 할 수 있는 단계**를 순서대로 구체적으로 담습니다(보통 1~5단계).
  버튼을 눌러 다른 페이지로 이동해야 하면, 그 "이동시키는 단계"까지만 안내하세요. 이동 후의 화면은
  지금 볼 수 없으므로 추측해서 지어내지 말고, 사용자가 이동한 뒤 그 화면에서 다시 이어서 안내받습니다.
- steps에는 목적 달성까지의 단계를 순서대로 담습니다(보통 1~5단계).
- **각 단계는 객체**입니다: text(그 단계에서 무엇을 하는지 ${lang}로 지시), label(그 단계에서 눌러야 할
  현재 페이지의 실제 버튼/링크 텍스트 — 링크 목록에서 label=official 우선, 있으면 그 text 그대로. 없으면 빈 문자열 ""),
  href(그 링크의 href, 없으면 "").
- 광고/피싱/외부 상업 링크(label이 ad 또는 suspect)는 절대 단계 label로 쓰지 말고 warnings에 경고로 넣습니다.
- 반드시 아래 JSON 형식으로만 답하세요. 다른 텍스트 금지.

{
  "summary": "이 페이지가 무엇을 하는 곳인지, 그리고 사용자의 목적을 이룰 수 있는 곳인지 ${lang}로 2~3줄",
  "steps": [
    { "text": "${lang}로 1단계 지시", "label": "이 단계에서 누를 페이지의 버튼/링크 텍스트 또는 \"\"", "href": "링크 href 또는 \"\"" },
    { "text": "2단계 지시", "label": "...", "href": "..." }
  ],
  "warnings": ["${lang}로 무시해야 할 광고/의심 요소 설명"]
}`;

const SUMMARY_PROMPT = (lang) => `당신은 한국 행정·생활 웹페이지를 외국인/다문화 가정에게 쉽게 요약해 주는 도우미입니다.
현재 페이지의 핵심을 ${lang} 언어로, 아주 쉬운 말로 요약하세요. 반드시 아래 JSON 형식으로만 답하세요.

{
  "summary": "이 페이지가 무엇을 하는 곳인지 ${lang}로 2~3줄",
  "bullets": ["${lang}로 핵심 요점 1", "요점 2", "요점 3 (3~5개)"]
}`;

function buildUserPrompt({ goal, pageTitle, pageText, links }) {
  const linkList = (links || [])
    .map((l, i) => `${i + 1}. [${l.label}] "${l.text}" -> ${l.href}`)
    .join("\n");
  return `사용자 목적: ${goal}

현재 페이지 제목: ${pageTitle}

현재 페이지 본문(일부):
${pageText}

현재 페이지의 링크 목록(label = official/normal/ad/suspect):
${linkList}`;
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
      generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
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
      temperature: 0.2,
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
  return env.MOCK === "1" || (plan === "openai" ? !env.OPENAI_API_KEY : !env.GEMINI_API_KEY);
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
  const raw =
    plan === "openai"
      ? await callOpenAI(system, user, { apiKey: env.OPENAI_API_KEY, model: env.OPENAI_MODEL || "gpt-4o-mini" })
      : await callGemini(system, user, { apiKey: env.GEMINI_API_KEY, model: env.GEMINI_MODEL || "gemini-2.5-flash" });

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
  const user = `현재 페이지 제목: ${payload.pageTitle}\n\n현재 페이지 본문(일부):\n${payload.pageText}`;
  const raw =
    plan === "openai"
      ? await callOpenAI(system, user, { apiKey: env.OPENAI_API_KEY, model: env.OPENAI_MODEL || "gpt-4o-mini" })
      : await callGemini(system, user, { apiKey: env.GEMINI_API_KEY, model: env.GEMINI_MODEL || "gemini-2.5-flash" });
  const parsed = safeParseJson(raw);
  return {
    mock: false,
    summary: parsed.summary || "",
    bullets: Array.isArray(parsed.bullets) ? parsed.bullets : [],
  };
}
