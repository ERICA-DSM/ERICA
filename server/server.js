// server.js — 웹 길잡이 백엔드 프록시
// 확장은 이 서버만 호출한다. 우리 API 키는 .env 에만 있고 확장/깃엔 없다.

import "dotenv/config";
import express from "express";
import cors from "cors";
import { login, findByToken, setPlan, bumpUsage } from "./store.js";
import { guide } from "./llm.js";

const app = express();
app.use(express.json({ limit: "1mb" }));
// 확장(사이드패널)의 origin 은 chrome-extension://... 이므로 CORS 허용
app.use(cors());

const PORT = process.env.PORT || 8787;
const LIMITS = {
  gemini: Number(process.env.FREE_DAILY_LIMIT || 10),  // 무료 플랜
  openai: Number(process.env.PAID_DAILY_LIMIT || 100), // 유료 플랜
};

// 인증 미들웨어: Authorization: Bearer <token>
async function auth(req, res, next) {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
  const user = await findByToken(token);
  if (!user) return res.status(401).json({ error: "unauthorized" });
  req.user = user;
  next();
}

app.get("/health", (_req, res) => res.json({ ok: true }));

// 로그인/가입(데모용): 이메일 + 프로필 + 플랜 → 토큰 발급
app.post("/auth/login", async (req, res) => {
  try {
    const { email, name, plan, profile } = req.body || {};
    if (!email) return res.status(400).json({ error: "email required" });
    const user = await login({ email, name, plan, profile });
    res.json(publicUser(user));
  } catch (e) {
    res.status(400).json({ error: String(e.message || e) });
  }
});

// 내 정보/플랜/사용량
app.get("/me", auth, (req, res) => res.json(publicUser(req.user)));

// 플랜 변경(구독 티어 전환)
app.post("/plan", auth, async (req, res) => {
  const { plan } = req.body || {};
  if (!["gemini", "openai"].includes(plan)) return res.status(400).json({ error: "invalid plan" });
  const user = await setPlan(req.user.email, plan);
  res.json(publicUser(user));
});

// 핵심: 안내 요청 → 플랜 확인 + 사용량 제한 + 우리 키로 LLM 호출
app.post("/guide", auth, async (req, res) => {
  const plan = req.user.plan || "gemini";
  const limit = LIMITS[plan] ?? LIMITS.gemini;

  const bump = await bumpUsage(req.user.email, limit);
  if (!bump.ok) {
    return res.status(429).json({
      error: "quota_exceeded",
      message: plan === "gemini"
        ? "오늘 무료 사용량을 다 썼어요. 유료 플랜으로 업그레이드하면 더 쓸 수 있어요."
        : "오늘 사용 한도를 초과했어요.",
      usage: bump.usage, limit,
    });
  }

  try {
    const out = await guide(req.body || {}, plan, process.env);
    res.json({ ...out, plan, usage: bump.usage, limit });
  } catch (e) {
    res.status(502).json({ error: "llm_error", message: String(e.message || e) });
  }
});

function publicUser(u) {
  return {
    email: u.email,
    name: u.name || "",
    plan: u.plan || "gemini",
    token: u.token,
    usage: u.usage || { date: null, count: 0 },
    limit: LIMITS[u.plan || "gemini"] ?? LIMITS.gemini,
  };
}

app.listen(PORT, () => {
  console.log(`웹 길잡이 서버 실행: http://localhost:${PORT}`);
  const mock = process.env.MOCK === "1" || (!process.env.GEMINI_API_KEY && !process.env.OPENAI_API_KEY);
  console.log(mock ? "  · 모드: MOCK (키 없음 → 목 응답)" : "  · 모드: LIVE (실제 API 호출)");
});
