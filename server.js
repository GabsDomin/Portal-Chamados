const path = require("path");
const crypto = require("crypto");
const fs = require("fs");

const dotenv = require("dotenv");
const express = require("express");
const multer = require("multer");

dotenv.config();

const { isSupabaseConfigured, signInPortalUser } = require("./lib/supabase");
const { getPrisma, isPrismaConfigured } = require("./lib/db");
const { getPortalContent } = require("./lib/portal-content");

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

const PORT = Number(process.env.PORT || 4173);
const TOPDESK_BASE_URL = normalizeBaseUrl(process.env.TOPDESK_BASE_URL || "https://keep-sottelli.topdesk.net");
const TOPDESK_USERNAME = process.env.TOPDESK_USERNAME;
const TOPDESK_APP_PASSWORD = process.env.TOPDESK_APP_PASSWORD;
const USERS_FILE = path.join(__dirname, "data", "users.json");
const sessions = new Map();
const loginAttempts = new Map();
const SESSION_COOKIE = "keep_portal_session";
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 8;

app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(securityHeaders);
app.use(requireSameOriginForMutations);
app.use("/assets", express.static(path.join(__dirname, "assets")));
app.get("/", (_request, response) => response.sendFile(path.join(__dirname, "index.html")));
app.get("/index.html", (_request, response) => response.sendFile(path.join(__dirname, "index.html")));
app.get("/app.js", (_request, response) => response.sendFile(path.join(__dirname, "app.js")));
app.get("/styles.css", (_request, response) => response.sendFile(path.join(__dirname, "styles.css")));

app.get("/api/health", (_request, response) => {
  response.json({
    ok: true,
    topdeskBaseUrl: TOPDESK_BASE_URL,
    credentialsConfigured: Boolean(TOPDESK_USERNAME && TOPDESK_APP_PASSWORD),
    supabaseConfigured: isSupabaseConfigured(),
    prismaConfigured: isPrismaConfigured(),
  });
});

app.get("/api/conteudo-portal", async (_request, response) => {
  try {
    const content = await getPortalContent();
    response.json({ ok: true, ...content });
  } catch (error) {
    response.status(500).json({
      ok: false,
      message: "Não foi possível carregar o conteúdo do portal.",
      detail: error.message,
    });
  }
});

app.get("/api/me", (request, response) => {
  const session = getSession(request);

  if (!session) {
    response.status(401).json({ ok: false, authenticated: false });
    return;
  }

  response.json({
    ok: true,
    authenticated: true,
    user: {
      email: session.email,
      displayName: session.displayName,
      email: session.email,
      company: session.company,
      callerId: session.callerId,
      source: "Portal",
    },
  });
});

app.post("/api/login", async (request, response) => {
  try {
    const email = String(request.body.email || "").trim().toLowerCase();
    const password = String(request.body.password || "");

    if (!email || !password) {
      response.status(400).json({ ok: false, message: "Informe e-mail e senha." });
      return;
    }

    if (isLoginRateLimited(request, email)) {
      response.status(429).json({
        ok: false,
        message: "Muitas tentativas de login. Aguarde alguns minutos e tente novamente.",
      });
      return;
    }

    const user = await authenticatePortalUser(email, password);
    if (!user) {
      recordLoginFailure(request, email);
      response.status(401).json({ ok: false, message: "Usuário ou senha inválidos." });
      return;
    }

    clearLoginAttempts(request, email);
    const sessionId = crypto.randomBytes(32).toString("hex");
    sessions.set(sessionId, {
      userId: user.id,
      email: user.email,
      company: user.company,
      callerId: user.callerId,
      displayName: user.name,
      createdAt: Date.now(),
    });

    response.setHeader("Set-Cookie", buildSessionCookie(sessionId, request));
    response.json({
      ok: true,
      user: {
        email: user.email,
        displayName: user.name,
        email: user.email,
        company: user.company,
        callerId: user.callerId,
        source: "Portal",
      },
    });
  } catch (error) {
    response.status(error.status || 401).json({
      ok: false,
      message: error.message || "Não foi possível autenticar.",
      detail: error.detail,
    });
  }
});

async function authenticatePortalUser(email, password) {
  if (isSupabaseConfigured()) {
    return signInPortalUser(email, password);
  }

  if (isPrismaConfigured()) {
    const user = await findPortalUserByEmailPrisma(email);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return null;
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      company: user.company || "",
      callerId: user.callerId || "",
      role: user.role,
    };
  }

  const user = findPortalUserByEmail(email);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return null;
  }

  return user;
}

app.post("/api/logout", (request, response) => {
  const sessionId = getSessionId(request);
  if (sessionId) {
    sessions.delete(sessionId);
  }

  response.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${getSecureCookieSuffix(request)}`,
  );
  response.json({ ok: true });
});

app.post("/api/chamados", async (request, response) => {
  try {
    const auth = getTopdeskAuth(request);
    const session = getSession(request);
    const caller = await resolveCallerForSession(session, auth);

    const payload = buildIncidentPayload(request.body, caller);
    const incident = await topdeskFetch("/tas/api/incidents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }, auth);

    response.status(201).json({
      ok: true,
      number: incident.number || incident.id || incident.unid,
      incident,
    });
  } catch (error) {
    response.status(error.status || 500).json({
      ok: false,
      message: error.message,
      detail: error.detail,
    });
  }
});

app.get("/api/solicitante", async (request, response) => {
  try {
    const auth = getTopdeskAuth(request);
    const session = getSession(request);
    const caller = await resolveCallerForSession(session, auth);

    response.json({
      ok: true,
      caller,
    });
  } catch (error) {
    response.status(error.status || 500).json({
      ok: false,
      message: error.message,
      detail: error.detail,
    });
  }
});

app.get("/api/perfil", async (request, response) => {
  try {
    const auth = getTopdeskAuth(request);
    const session = getSession(request);
    const caller = await resolveCallerForSession(session, auth);

    response.json({
      ok: true,
      profile: caller,
    });
  } catch (error) {
    response.status(error.status || 500).json({
      ok: false,
      message: error.message,
      detail: error.detail,
    });
  }
});

app.patch("/api/perfil", async (request, response) => {
  try {
    const auth = getTopdeskAuth(request);
    const session = getSession(request);
    const caller = await resolveCallerForSession(session, auth);
    const payload = buildPersonUpdatePayload(request.body);

    const updatedPerson = await topdeskFetch(`/tas/api/persons/id/${encodeURIComponent(caller.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }, auth);

    const sanitized = sanitizeCaller(updatedPerson || { ...caller, ...payload });
    if (session) {
      session.displayName = sanitized.name || session.displayName;
    }

    response.json({
      ok: true,
      profile: sanitized,
    });
  } catch (error) {
    response.status(error.status || 500).json({
      ok: false,
      message: error.message || "Não foi possível atualizar seu perfil.",
      detail: error.detail,
    });
  }
});

app.get("/api/chamados", async (request, response) => {
  try {
    const auth = getTopdeskAuth(request);
    const session = getSession(request);
    const caller = await resolveCallerForSession(session, auth);

    const pageSize = Number(request.query.page_size || 100);
    const incidents = await topdeskFetch(`/tas/api/incidents?all=true&page_size=${encodeURIComponent(pageSize)}`, {}, auth);
    const list = Array.isArray(incidents) ? incidents : incidents?.results || incidents?.incidents || [];
    const filtered = list
      .filter((incident) => isIncidentFromCaller(incident, caller))
      .map(normalizeIncident);

    response.json({ ok: true, caller, incidents: filtered });
  } catch (error) {
    response.status(error.status || 500).json({
      ok: false,
      message: error.message,
      detail: error.detail,
    });
  }
});

app.get("/api/chamados/:id", async (request, response) => {
  try {
    const auth = getTopdeskAuth(request);

    const incident = await topdeskFetch(`/tas/api/incidents/id/${encodeURIComponent(request.params.id)}`, {}, auth);
    response.json({ ok: true, incident });
  } catch (error) {
    response.status(error.status || 500).json({
      ok: false,
      message: error.message,
      detail: error.detail,
    });
  }
});

app.post("/api/chamados/:id/anexos", upload.single("attachment"), async (request, response) => {
  try {
    getTopdeskAuth(request);

    if (!request.file) {
      response.status(400).json({ ok: false, message: "Nenhum arquivo enviado." });
      return;
    }

    response.status(501).json({
      ok: false,
      message: "Upload de anexo ainda precisa ser mapeado no atendimento.",
    });
  } catch (error) {
    response.status(error.status || 500).json({
      ok: false,
      message: error.message,
      detail: error.detail,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Portal rodando em http://localhost:${PORT}`);
  console.log(`Serviço de atendimento configurado em ${TOPDESK_BASE_URL}`);
});

function normalizeBaseUrl(url) {
  return String(url).replace(/\/+$/, "");
}

function getTopdeskAuth(request) {
  const session = getSession(request);
  if (!session) {
    const error = new Error("Sessão expirada. Faça login novamente.");
    error.status = 401;
    throw error;
  }

  if (!TOPDESK_USERNAME || !TOPDESK_APP_PASSWORD) {
    const error = new Error("Credenciais de atendimento não configuradas no servidor.");
    error.status = 503;
    error.detail = "Faça login no portal ou configure as credenciais do servidor.";
    throw error;
  }

  return {
    username: TOPDESK_USERNAME,
    password: TOPDESK_APP_PASSWORD,
  };
}

function findPortalUserByEmail(email) {
  return readPortalUsers().find((user) => {
    const login = String(email).toLowerCase();
    return String(user.email).toLowerCase() === login;
  });
}

async function findPortalUserByEmailPrisma(email) {
  try {
    const prisma = getPrisma();
    return await prisma.portalUser.findFirst({
      where: {
        email: String(email).toLowerCase(),
        active: true,
      },
    });
  } catch (_error) {
    return null;
  }
}

function readPortalUsers() {
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
  } catch (_error) {
    return [];
  }
}

function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(":")) return false;

  const [salt, expectedHash] = storedHash.split(":");
  const actualHash = crypto.scryptSync(password, salt, 32).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(actualHash, "hex"), Buffer.from(expectedHash, "hex"));
}

async function topdeskFetch(endpoint, options = {}, authConfig = getEnvTopdeskAuth()) {
  const auth = Buffer.from(`${authConfig.username}:${authConfig.password}`).toString("base64");
  const response = await fetch(`${TOPDESK_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  const data = text ? safeJson(text) : null;

  if (!response.ok) {
    const error = new Error(`Erro ao chamar atendimento: HTTP ${response.status}`);
    error.status = response.status;
    error.detail = data || text;
    throw error;
  }

  return data;
}

function getEnvTopdeskAuth() {
  if (!TOPDESK_USERNAME || !TOPDESK_APP_PASSWORD) {
    const error = new Error("Credenciais de atendimento não configuradas no servidor.");
    error.status = 503;
    error.detail = "Configure as credenciais do servidor no arquivo .env.";
    throw error;
  }

  return {
    username: TOPDESK_USERNAME,
    password: TOPDESK_APP_PASSWORD,
  };
}

function securityHeaders(_request, response, next) {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' https://unpkg.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data:",
      "connect-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join("; "),
  );
  next();
}

function requireSameOriginForMutations(request, response, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    next();
    return;
  }

  const origin = request.headers.origin;
  if (!origin) {
    next();
    return;
  }

  if (origin !== getRequestOrigin(request)) {
    response.status(403).json({ ok: false, message: "Origem da requisiÃ§Ã£o nÃ£o permitida." });
    return;
  }

  next();
}

function getRequestOrigin(request) {
  const protocol = request.headers["x-forwarded-proto"] || request.protocol || "http";
  return `${String(protocol).split(",")[0]}://${request.get("host")}`;
}

async function validateTopdeskCredentials(username, password) {
  try {
    await topdeskFetch("/tas/api/incidents?page_size=1", {}, { username, password });
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      const authError = new Error("Login inválido, ou este ambiente não permite senha comum para acesso via API.");
      authError.status = 401;
      throw authError;
    }

    throw error;
  }
}

function getSession(request) {
  const sessionId = getSessionId(request);
  if (!sessionId) return null;

  const session = sessions.get(sessionId);
  if (!session) return null;

  const maxAgeMs = 8 * 60 * 60 * 1000;
  if (Date.now() - session.createdAt > maxAgeMs) {
    sessions.delete(sessionId);
    return null;
  }

  return session;
}

function getSessionId(request) {
  const cookieHeader = request.headers.cookie || "";
  const cookies = Object.fromEntries(
    cookieHeader
      .split(";")
      .map((cookie) => cookie.trim())
      .filter(Boolean)
      .map((cookie) => {
        const [name, ...value] = cookie.split("=");
        return [name, decodeURIComponent(value.join("="))];
      }),
  );

  return cookies[SESSION_COOKIE];
}

function buildSessionCookie(sessionId, request) {
  const maxAgeSeconds = 8 * 60 * 60;
  return `${SESSION_COOKIE}=${encodeURIComponent(sessionId)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${getSecureCookieSuffix(request)}`;
}

function getSecureCookieSuffix(request) {
  const forwardedProto = String(request?.headers?.["x-forwarded-proto"] || "").split(",")[0];
  const isHttps = request?.secure || forwardedProto === "https" || process.env.NODE_ENV === "production";
  return isHttps ? "; Secure" : "";
}

function isLoginRateLimited(request, email) {
  const key = getLoginAttemptKey(request, email);
  const attempt = loginAttempts.get(key);
  if (!attempt) return false;

  const now = Date.now();
  if (now - attempt.firstAt > LOGIN_WINDOW_MS) {
    loginAttempts.delete(key);
    return false;
  }

  return attempt.count >= MAX_LOGIN_ATTEMPTS;
}

function recordLoginFailure(request, email) {
  const key = getLoginAttemptKey(request, email);
  const now = Date.now();
  const attempt = loginAttempts.get(key);

  if (!attempt || now - attempt.firstAt > LOGIN_WINDOW_MS) {
    loginAttempts.set(key, { count: 1, firstAt: now });
    return;
  }

  attempt.count += 1;
}

function clearLoginAttempts(request, email) {
  loginAttempts.delete(getLoginAttemptKey(request, email));
}

function getLoginAttemptKey(request, email) {
  return `${getClientIp(request)}:${String(email).toLowerCase()}`;
}

function getClientIp(request) {
  return String(request.headers["x-forwarded-for"] || request.socket.remoteAddress || "unknown")
    .split(",")[0]
    .trim();
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch (_error) {
    return text;
  }
}

async function resolveCallerForSession(session, auth) {
  if (!session?.email) {
    const error = new Error("Não foi possível identificar o e-mail do solicitante logado.");
    error.status = 400;
    throw error;
  }

  const caller = await findCallerByEmail(session.email, auth);
  if (!caller) {
    const error = new Error("Seu e-mail ainda não está cadastrado como solicitante no atendimento.");
    error.status = 404;
    error.detail = `E-mail não encontrado: ${session.email}`;
    throw error;
  }

  return sanitizeCaller(caller);
}

async function findCallerByEmail(email, auth) {
  const query = `email=='${escapeFiqlValue(email)}'`;
  const endpoint = `/tas/api/persons?query=${encodeURIComponent(query)}&page_size=10`;
  const people = await topdeskFetch(endpoint, {}, auth);
  const list = Array.isArray(people) ? people : people?.results || people?.persons || [];
  const normalizedEmail = String(email).toLowerCase();

  return (
    list.find((person) => String(person.email || "").toLowerCase() === normalizedEmail && person.id) ||
    list.find((person) => person.id) ||
    null
  );
}

function escapeFiqlValue(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function sanitizeCaller(caller) {
  return {
    id: caller.id,
    name: caller.dynamicName || caller.name || `${caller.firstName || ""} ${caller.surName || ""}`.trim(),
    firstName: caller.firstName || "",
    surName: caller.surName || "",
    email: caller.email,
    phone: caller.mobileNumber || caller.phoneNumber || "",
    phoneNumber: caller.phoneNumber || "",
    mobileNumber: caller.mobileNumber || "",
    branch: caller.branch?.name,
  };
}

function buildPersonUpdatePayload(body) {
  const payload = {
    firstName: cleanProfileValue(body.firstName),
    surName: cleanProfileValue(body.surName),
    phoneNumber: cleanProfileValue(body.phoneNumber),
    mobileNumber: cleanProfileValue(body.mobileNumber),
  };

  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));
}

function cleanProfileValue(value) {
  if (value === undefined || value === null) return undefined;
  return String(value).trim();
}

function isIncidentFromCaller(incident, caller) {
  const incidentCaller = incident.caller || {};
  const callerId = String(caller.id || "").toLowerCase();
  const callerEmail = String(caller.email || "").toLowerCase();

  return (
    String(incidentCaller.id || "").toLowerCase() === callerId ||
    String(incidentCaller.email || "").toLowerCase() === callerEmail
  );
}

function normalizeIncident(incident) {
  return {
    id: incident.id,
    number: incident.number,
    subject: incident.briefDescription || "Sem assunto",
    service: incident.callType?.name || incident.category?.name || "Atendimento",
    category: incident.category?.name || "",
    subcategory: incident.subcategory?.name || "",
    status: normalizeIncidentStatus(incident),
    opened: incident.creationDate,
    targetDate: incident.targetDate,
    caller: {
      id: incident.caller?.id,
      name: incident.caller?.dynamicName || incident.caller?.name,
      email: incident.caller?.email,
    },
  };
}

function normalizeIncidentStatus(incident) {
  if (incident.completed) return "Concluído";
  if (incident.closed) return "Fechado";
  if (incident.onHold) return "Aguardando";
  if (incident.status === "secondLine") return "Em atendimento especializado";
  if (incident.status === "firstLine") return "Em andamento";
  return incident.processingStatus?.name || incident.status || "Em andamento";
}

function buildIncidentPayload(body, caller) {
  const attachmentNote = Array.isArray(body.attachments) && body.attachments.length
    ? `\n\nAnexos selecionados no portal:\n${body.attachments.map((file) => `- ${file.name || "Arquivo"}${file.size ? ` (${formatBytes(file.size)})` : ""}`).join("\n")}`
    : "";

  const payload = {
    briefDescription: body.subject,
    request: `${body.description || ""}${attachmentNote}`,
    caller: caller?.id ? { id: caller.id } : undefined,
    category: body.categoryId ? { id: body.categoryId } : body.category ? { name: body.category } : undefined,
    subcategory: body.subcategoryId ? { id: body.subcategoryId } : body.subcategory ? { name: body.subcategory } : undefined,
    callType: body.callTypeId ? { id: body.callTypeId } : process.env.TOPDESK_CALL_TYPE_ID ? { id: process.env.TOPDESK_CALL_TYPE_ID } : undefined,
    entryType: body.entryTypeId ? { id: body.entryTypeId } : process.env.TOPDESK_ENTRY_TYPE_ID ? { id: process.env.TOPDESK_ENTRY_TYPE_ID } : undefined,
    operatorGroup: body.operatorGroupId
      ? { id: body.operatorGroupId }
      : process.env.TOPDESK_OPERATOR_GROUP_ID
        ? { id: process.env.TOPDESK_OPERATOR_GROUP_ID }
        : undefined,
  };

  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined && value !== ""));
}

function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (!value) return "0 KB";
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}
