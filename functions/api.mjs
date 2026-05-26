import { getStore } from "@netlify/blobs";
import { createHmac, randomBytes, randomUUID, timingSafeEqual, pbkdf2 as pbkdf2Callback } from "node:crypto";
import { promisify } from "node:util";

const pbkdf2 = promisify(pbkdf2Callback);
const sessionSecret = process.env.SESSION_SECRET || "change-this-session-secret-before-hosting";
const adminEmail = (process.env.ADMIN_EMAIL || "admin@workout.local").toLowerCase();
const adminPassword = process.env.ADMIN_PASSWORD || "0000";
const dbKey = "database";

const seedExercises = [
  { id: randomUUID(), name: "Bench press", area: "Chest", equipment: "Barbell", notes: "", image: "" },
  { id: randomUUID(), name: "Squat", area: "Legs", equipment: "Barbell", notes: "", image: "" },
  { id: randomUUID(), name: "Lat pulldown", area: "Back", equipment: "Cable", notes: "", image: "" },
  { id: randomUUID(), name: "Shoulder press", area: "Shoulders", equipment: "Dumbbells", notes: "", image: "" }
];

export const config = {
  path: "/api/*"
};

function store() {
  return getStore({ name: "workout-tracker", consistency: "strong" });
}

async function loadDb() {
  const blobs = store();
  let db = await blobs.get(dbKey, { type: "json", consistency: "strong" });
  if (!db) {
    db = { users: [], sessions: [], userData: {} };
  }
  if (!db.users.some((user) => user.role === "admin")) {
    const admin = await createUserRecord(adminEmail, adminPassword, "admin", "approved");
    admin.id = "local-admin";
    db.users.push(admin);
    await saveDb(db);
  }
  return db;
}

async function saveDb(db) {
  await store().setJSON(dbKey, db);
}

async function createUserRecord(email, password, role = "user", status = "pending") {
  return {
    id: randomUUID(),
    email: email.trim().toLowerCase(),
    passwordHash: await hashPassword(password),
    role,
    status,
    createdAt: new Date().toISOString(),
    approvedAt: status === "approved" ? new Date().toISOString() : ""
  };
}

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derived = await pbkdf2(password, salt, 210000, 32, "sha256");
  return `pbkdf2$210000$${salt}$${derived.toString("hex")}`;
}

async function verifyPassword(password, stored) {
  const [, iterations, salt, hash] = stored.split("$");
  const derived = await pbkdf2(password, salt, Number(iterations), 32, "sha256");
  const expected = Buffer.from(hash, "hex");
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}

function sign(value) {
  return createHmac("sha256", sessionSecret).update(value).digest("hex");
}

function makeCookie(sessionId) {
  const secure = process.env.NETLIFY ? "; Secure" : "";
  return `wt_session=${sessionId}.${sign(sessionId)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800${secure}`;
}

function clearCookie() {
  return "wt_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0";
}

function parseCookies(req) {
  return Object.fromEntries((req.headers.get("cookie") || "").split(";").filter(Boolean).map((pair) => {
    const [key, ...value] = pair.trim().split("=");
    return [key, value.join("=")];
  }));
}

async function getSession(req) {
  const raw = parseCookies(req).wt_session;
  if (!raw) return null;
  const [sessionId, signature] = raw.split(".");
  if (!sessionId || signature !== sign(sessionId)) return null;
  const db = await loadDb();
  const session = db.sessions.find((item) => item.id === sessionId && new Date(item.expiresAt) > new Date());
  if (!session) return null;
  const user = db.users.find((item) => item.id === session.userId);
  return user ? { db, session, user } : null;
}

function defaultUserData() {
  return { exercises: seedExercises.map((exercise) => ({ ...exercise, id: randomUUID() })), workouts: [], cardioWorkouts: [], bodyWeights: [], bloodPressure: [], nutrition: { calorieGoal: "", targetWeight: "", targetWeeks: "", foods: [], water: [] }, profile: { height: "", heightUnit: "cm" } };
}

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...headers }
  });
}

function publicUser(user) {
  return { id: user.id, email: user.email, role: user.role, status: user.status, createdAt: user.createdAt, approvedAt: user.approvedAt };
}

function routePath(req) {
  const url = new URL(req.url);
  return url.pathname
    .replace(/^\/\.netlify\/functions\/api/, "")
    .replace(/^\/api/, "")
    .replace(/^\/?/, "/");
}

export default async function handler(req) {
  try {
    const path = routePath(req);
    const method = req.method;
    const session = await getSession(req);

    if (method === "POST" && path === "/register") {
      const { email, password } = await req.json();
      if (!email || !password) return json({ error: "Email and password are required." }, 400);
      const db = await loadDb();
      const normalizedEmail = email.trim().toLowerCase();
      if (db.users.some((user) => user.email === normalizedEmail)) return json({ error: "Email already exists." }, 409);
      const user = await createUserRecord(normalizedEmail, password);
      db.users.push(user);
      db.userData[user.id] = defaultUserData();
      await saveDb(db);
      return json({ message: "Account created. Awaiting admin approval." }, 201);
    }

    if (method === "POST" && path === "/login") {
      const { email, password } = await req.json();
      const db = await loadDb();
      const user = db.users.find((item) => item.email === String(email || "").trim().toLowerCase());
      if (!user || !(await verifyPassword(password || "", user.passwordHash))) return json({ error: "Email or password is incorrect." }, 401);
      if (user.status !== "approved") return json({ error: "Account is waiting for admin approval." }, 403);
      const sessionId = randomBytes(32).toString("hex");
      db.sessions.push({ id: sessionId, userId: user.id, createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 7 * 86400000).toISOString() });
      await saveDb(db);
      return json({ user: publicUser(user) }, 200, { "Set-Cookie": makeCookie(sessionId) });
    }

    if (method === "POST" && path === "/logout") {
      if (session) {
        session.db.sessions = session.db.sessions.filter((item) => item.id !== session.session.id);
        await saveDb(session.db);
      }
      return json({ ok: true }, 200, { "Set-Cookie": clearCookie() });
    }

    if (method === "GET" && path === "/me") {
      return json({ user: session ? publicUser(session.user) : null });
    }

    if (!session) return json({ error: "Login required." }, 401);

    if (method === "GET" && path === "/data") {
      return json(session.db.userData[session.user.id] || defaultUserData());
    }

    if (method === "PUT" && path === "/data") {
      if (session.user.role !== "user") return json({ error: "Admins do not have workout data." }, 403);
      session.db.userData[session.user.id] = await req.json();
      await saveDb(session.db);
      return json({ ok: true });
    }

    if (session.user.role !== "admin") return json({ error: "Admin access required." }, 403);

    if (method === "GET" && path === "/admin/users") {
      return json({ users: session.db.users.filter((user) => user.role === "user").map(publicUser) });
    }

    const approveMatch = path.match(/^\/admin\/users\/([^/]+)\/approve$/);
    if (method === "POST" && approveMatch) {
      const user = session.db.users.find((item) => item.id === approveMatch[1] && item.role === "user");
      if (!user) return json({ error: "User not found." }, 404);
      user.status = "approved";
      user.approvedAt = new Date().toISOString();
      await saveDb(session.db);
      return json({ user: publicUser(user) });
    }

    const pendingMatch = path.match(/^\/admin\/users\/([^/]+)\/pending$/);
    if (method === "POST" && pendingMatch) {
      const user = session.db.users.find((item) => item.id === pendingMatch[1] && item.role === "user");
      if (!user) return json({ error: "User not found." }, 404);
      user.status = "pending";
      user.approvedAt = "";
      await saveDb(session.db);
      return json({ user: publicUser(user) });
    }

    const deleteMatch = path.match(/^\/admin\/users\/([^/]+)$/);
    if (method === "DELETE" && deleteMatch) {
      session.db.users = session.db.users.filter((user) => user.id !== deleteMatch[1]);
      delete session.db.userData[deleteMatch[1]];
      await saveDb(session.db);
      return json({ ok: true });
    }

    if (method === "POST" && path === "/admin/password") {
      const { currentPassword, newPassword } = await req.json();
      if (!(await verifyPassword(currentPassword || "", session.user.passwordHash))) return json({ error: "Current password is incorrect." }, 400);
      session.user.passwordHash = await hashPassword(newPassword || "");
      await saveDb(session.db);
      return json({ ok: true });
    }

    return json({ error: "Not found." }, 404);
  } catch (error) {
    console.error(error);
    return json({ error: "Server error." }, 500);
  }
}
