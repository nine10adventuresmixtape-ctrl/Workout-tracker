import { createHmac, randomBytes, timingSafeEqual, pbkdf2 as pbkdf2Callback } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { promisify } from "node:util";

const pbkdf2 = promisify(pbkdf2Callback);
const port = Number(process.env.PORT || 8080);
const host = process.env.HOST || "127.0.0.1";
const sessionSecret = process.env.SESSION_SECRET || "change-this-session-secret-before-hosting";
const adminEmail = (process.env.ADMIN_EMAIL || "admin@workout.local").toLowerCase();
const adminPassword = process.env.ADMIN_PASSWORD || "0000";
const dataDir = new URL("../data/", import.meta.url);
const dbPath = new URL("../data/database.json", import.meta.url);
const publicDir = new URL("../public-online/", import.meta.url);

const defaultExercises = [
  { id: crypto.randomUUID(), name: "Bench press", area: "Chest", equipment: "Barbell", notes: "", image: "" },
  { id: crypto.randomUUID(), name: "Squat", area: "Legs", equipment: "Barbell", notes: "", image: "" },
  { id: crypto.randomUUID(), name: "Lat pulldown", area: "Back", equipment: "Cable", notes: "", image: "" },
  { id: crypto.randomUUID(), name: "Shoulder press", area: "Shoulders", equipment: "Dumbbells", notes: "", image: "" }
];

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml"
};

async function ensureDb() {
  await mkdir(dataDir, { recursive: true });
  try {
    const db = JSON.parse(await readFile(dbPath, "utf8"));
    if (!db.users.some((user) => user.role === "admin")) {
      db.users.push(await createUserRecord(adminEmail, adminPassword, "admin", "approved"));
      await saveDb(db);
    }
    return db;
  } catch {
    const admin = await createUserRecord(adminEmail, adminPassword, "admin", "approved");
    const db = { users: [admin], sessions: [], userData: {} };
    await saveDb(db);
    return db;
  }
}

async function loadDb() {
  return ensureDb();
}

async function saveDb(db) {
  await writeFile(dbPath, JSON.stringify(db, null, 2));
}

async function createUserRecord(email, password, role = "user", status = "pending") {
  return {
    id: crypto.randomUUID(),
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
  const value = `${sessionId}.${sign(sessionId)}`;
  return `wt_session=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800`;
}

function clearCookie() {
  return "wt_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0";
}

function parseCookies(req) {
  return Object.fromEntries((req.headers.cookie || "").split(";").filter(Boolean).map((pair) => {
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
  return { exercises: defaultExercises.map((exercise) => ({ ...exercise, id: crypto.randomUUID() })), workouts: [], cardioWorkouts: [], bodyWeights: [], bloodPressure: [], profile: { height: "", heightUnit: "cm" } };
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function sendJson(res, status, body, headers = {}) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", ...headers });
  res.end(JSON.stringify(body));
}

function publicUser(user) {
  return { id: user.id, email: user.email, role: user.role, status: user.status, createdAt: user.createdAt, approvedAt: user.approvedAt };
}

async function handleApi(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const session = await getSession(req);

  if (req.method === "POST" && url.pathname === "/api/register") {
    const { email, password } = await readJson(req);
    if (!email || !password) return sendJson(res, 400, { error: "Email and password are required." });
    const db = await loadDb();
    const normalizedEmail = email.trim().toLowerCase();
    if (db.users.some((user) => user.email === normalizedEmail)) return sendJson(res, 409, { error: "Email already exists." });
    const user = await createUserRecord(normalizedEmail, password);
    db.users.push(user);
    db.userData[user.id] = defaultUserData();
    await saveDb(db);
    return sendJson(res, 201, { message: "Account created. Awaiting admin approval." });
  }

  if (req.method === "POST" && url.pathname === "/api/login") {
    const { email, password } = await readJson(req);
    const db = await loadDb();
    const user = db.users.find((item) => item.email === String(email || "").trim().toLowerCase());
    if (!user || !(await verifyPassword(password || "", user.passwordHash))) return sendJson(res, 401, { error: "Email or password is incorrect." });
    if (user.status !== "approved") return sendJson(res, 403, { error: "Account is waiting for admin approval." });
    const sessionId = randomBytes(32).toString("hex");
    db.sessions.push({ id: sessionId, userId: user.id, createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 7 * 86400000).toISOString() });
    await saveDb(db);
    return sendJson(res, 200, { user: publicUser(user) }, { "Set-Cookie": makeCookie(sessionId) });
  }

  if (req.method === "POST" && url.pathname === "/api/logout") {
    if (session) {
      session.db.sessions = session.db.sessions.filter((item) => item.id !== session.session.id);
      await saveDb(session.db);
    }
    return sendJson(res, 200, { ok: true }, { "Set-Cookie": clearCookie() });
  }

  if (req.method === "GET" && url.pathname === "/api/me") {
    return sendJson(res, 200, { user: session ? publicUser(session.user) : null });
  }

  if (!session) return sendJson(res, 401, { error: "Login required." });

  if (req.method === "GET" && url.pathname === "/api/data") {
    return sendJson(res, 200, session.db.userData[session.user.id] || defaultUserData());
  }

  if (req.method === "PUT" && url.pathname === "/api/data") {
    if (session.user.role !== "user") return sendJson(res, 403, { error: "Admins do not have workout data." });
    session.db.userData[session.user.id] = await readJson(req);
    await saveDb(session.db);
    return sendJson(res, 200, { ok: true });
  }

  if (session.user.role !== "admin") return sendJson(res, 403, { error: "Admin access required." });

  if (req.method === "GET" && url.pathname === "/api/admin/users") {
    return sendJson(res, 200, { users: session.db.users.filter((user) => user.role === "user").map(publicUser) });
  }

  const approveMatch = url.pathname.match(/^\/api\/admin\/users\/([^/]+)\/approve$/);
  if (req.method === "POST" && approveMatch) {
    const user = session.db.users.find((item) => item.id === approveMatch[1] && item.role === "user");
    if (!user) return sendJson(res, 404, { error: "User not found." });
    user.status = "approved";
    user.approvedAt = new Date().toISOString();
    await saveDb(session.db);
    return sendJson(res, 200, { user: publicUser(user) });
  }

  const pendingMatch = url.pathname.match(/^\/api\/admin\/users\/([^/]+)\/pending$/);
  if (req.method === "POST" && pendingMatch) {
    const user = session.db.users.find((item) => item.id === pendingMatch[1] && item.role === "user");
    if (!user) return sendJson(res, 404, { error: "User not found." });
    user.status = "pending";
    user.approvedAt = "";
    await saveDb(session.db);
    return sendJson(res, 200, { user: publicUser(user) });
  }

  const deleteMatch = url.pathname.match(/^\/api\/admin\/users\/([^/]+)$/);
  if (req.method === "DELETE" && deleteMatch) {
    session.db.users = session.db.users.filter((user) => user.id !== deleteMatch[1]);
    delete session.db.userData[deleteMatch[1]];
    await saveDb(session.db);
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === "POST" && url.pathname === "/api/admin/password") {
    const { currentPassword, newPassword } = await readJson(req);
    if (!(await verifyPassword(currentPassword || "", session.user.passwordHash))) return sendJson(res, 400, { error: "Current password is incorrect." });
    session.user.passwordHash = await hashPassword(newPassword || "");
    await saveDb(session.db);
    return sendJson(res, 200, { ok: true });
  }

  return sendJson(res, 404, { error: "Not found." });
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const requested = url.pathname === "/" ? "/index.html" : url.pathname;
  const safePath = normalize(decodeURIComponent(requested)).replace(/^(\.\.[/\\])+/, "");
  const filePath = new URL(`.${safePath}`, publicDir);
  if (!filePath.href.startsWith(publicDir.href)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  const stream = createReadStream(filePath);
  stream.on("error", () => {
    res.writeHead(404);
    res.end("Not found");
  });
  res.writeHead(200, { "Content-Type": mimeTypes[extname(filePath.pathname)] || "application/octet-stream" });
  stream.pipe(res);
}

createServer(async (req, res) => {
  try {
    if (req.url.startsWith("/api/")) return await handleApi(req, res);
    return serveStatic(req, res);
  } catch (error) {
    console.error(error);
    return sendJson(res, 500, { error: "Server error." });
  }
}).listen(port, host, () => {
  console.log(`Workout tracker running at http://${host}:${port}`);
  console.log(`Default admin: ${adminEmail} / ${adminPassword}`);
});
