// store.js — 파일 기반 사용자 저장소 (데모용)
// 실제 데이터는 server/data/users.json 에 쌓이며, 나중에 조회/통계에 쓸 수 있다.
// 상용 전환 시 이 파일의 함수 시그니처만 유지한 채 내부를 실제 DB로 바꾸면 된다.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "data");
const DB_FILE = join(DATA_DIR, "users.json");

async function readAll() {
  try {
    return JSON.parse(await readFile(DB_FILE, "utf8"));
  } catch {
    return { users: {} }; // 파일 없음 → 빈 DB
  }
}

async function writeAll(db) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DB_FILE, JSON.stringify(db, null, 2), "utf8");
}

const today = () => new Date().toISOString().slice(0, 10); // YYYY-MM-DD

// 로그인/가입: 이메일 기준 upsert. 프로필·플랜 저장하고 토큰 발급.
export async function login({ email, name, plan, profile }) {
  const db = await readAll();
  const key = String(email || "").trim().toLowerCase();
  if (!key) throw new Error("email required");

  const existing = db.users[key] || {
    email: key,
    createdAt: new Date().toISOString(),
    usage: { date: today(), count: 0 },
  };

  const token = randomBytes(16).toString("hex");
  const user = {
    ...existing,
    name: name ?? existing.name ?? "",
    plan: plan ?? existing.plan ?? "gemini",
    profile: profile ?? existing.profile ?? {},
    token,
    lastLoginAt: new Date().toISOString(),
  };
  db.users[key] = user;
  await writeAll(db);
  return user;
}

export async function findByToken(token) {
  if (!token) return null;
  const db = await readAll();
  return Object.values(db.users).find((u) => u.token === token) || null;
}

export async function setPlan(email, plan) {
  const db = await readAll();
  const key = String(email).toLowerCase();
  if (!db.users[key]) return null;
  db.users[key].plan = plan;
  await writeAll(db);
  return db.users[key];
}

// 사용량 1 증가 (날짜 바뀌면 리셋). limit 초과면 {ok:false} 반환.
export async function bumpUsage(email, limit) {
  const db = await readAll();
  const key = String(email).toLowerCase();
  const u = db.users[key];
  if (!u) return { ok: false, reason: "no_user" };

  if (!u.usage || u.usage.date !== today()) u.usage = { date: today(), count: 0 };
  if (u.usage.count >= limit) {
    await writeAll(db);
    return { ok: false, reason: "quota", usage: u.usage, limit };
  }
  u.usage.count += 1;
  await writeAll(db);
  return { ok: true, usage: u.usage, limit };
}
