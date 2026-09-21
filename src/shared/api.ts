/**
 * 用户中心 API 客户端 —— web 端与 h5 端共用。
 *
 * 本服务只认 Authorization 头里的 Bearer 令牌，不依赖 Cookie，
 * 所以令牌存 localStorage，跨域请求不需要 credentials。
 */

// 默认指向线上用户中心；本地联调时用 .env 里的 VITE_API_BASE 覆盖
export const API_BASE: string =
  (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/+$/, "") ||
  "https://ucenter.june-t.top";

/** 本端在用户中心注册的应用标识，决定 JWT 的 aud */
export const APP_ID = "cicd";

/* ---------- 令牌与设备号 ---------- */

const TOKEN_KEYS = {
  access: "uc_access_token",
  refresh: "uc_refresh_token",
  device: "uc_device_id",
  role: "uc_role",
} as const;

export type TokenKey = keyof typeof TOKEN_KEYS;

export function tkGet(key: TokenKey): string {
  try {
    return localStorage.getItem(TOKEN_KEYS[key]) || "";
  } catch {
    // 隐私模式下 localStorage 可能不可用
    return "";
  }
}

export function tkSet(key: TokenKey, value: string): void {
  try {
    if (value) localStorage.setItem(TOKEN_KEYS[key], value);
    else localStorage.removeItem(TOKEN_KEYS[key]);
  } catch {
    /* 同上 */
  }
}

/** 只清登录态，保留设备号：设备号是「同一台设备」的身份，换账号也该延续 */
export function tkClear(): void {
  tkSet("access", "");
  tkSet("refresh", "");
  tkSet("role", "");
}

/**
 * 设备号持久化。用户中心靠它把令牌归到同一台设备下，
 * 便于在「我的设备」里单独吊销某一台。
 */
export function deviceId(): string {
  let id = tkGet("device");
  if (!id) {
    id = `web_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
    tkSet("device", id);
  }
  return id;
}

/* ---------- 错误 ---------- */

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

/* ---------- 令牌续签 ---------- */

interface TokenPair {
  access_token: string;
  refresh_token: string;
  device_id?: string;
}

let refreshing: Promise<void> | null = null;

/**
 * 刷新令牌是一次性的，并发复用会被服务端判为泄露并吊销整条链，
 * 所以这里做单飞：同一时刻只发一次刷新请求。
 */
export function refreshTokens(): Promise<void> {
  if (!refreshing) {
    refreshing = doRefresh().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

async function doRefresh(): Promise<void> {
  const refreshToken = tkGet("refresh");
  if (!refreshToken) throw new ApiError(401, "no_refresh_token", "未登录");

  const res = await fetch(`${API_BASE}/v1/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken, app: APP_ID }),
  });
  const pair = await parse<TokenPair>(res);
  tkSet("access", pair.access_token);
  tkSet("refresh", pair.refresh_token);
}

/* ---------- 请求出口 ---------- */

export interface ApiOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  /** 是否附带访问令牌，默认附带 */
  auth?: boolean;
}

let sessionExpiredHandler: (() => void) | null = null;

/** 注册登录态失效回调：刷新也救不回来时，由各端决定弹回哪一屏 */
export function onSessionExpired(handler: () => void): void {
  sessionExpiredHandler = handler;
}

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true } = options;

  const send = (): Promise<Response> => {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers["Content-Type"] = "application/json";
    const token = tkGet("access");
    if (auth && token) headers.Authorization = `Bearer ${token}`;
    return fetch(API_BASE + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  };

  let res = await send();
  if (res.status === 401 && auth) {
    try {
      await refreshTokens();
      res = await send();
    } catch {
      sessionExpiredHandler?.();
      throw new ApiError(401, "session_expired", "登录已过期，请重新登录");
    }
  }
  return parse<T>(res);
}

async function parse<T>(res: Response): Promise<T> {
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const err = (data ?? {}) as { code?: string; message?: string; error?: string };
    throw new ApiError(
      res.status,
      err.code || err.error || "request_failed",
      err.message || err.error || `请求失败 ${res.status}`
    );
  }
  return data as T;
}

/* ---------- 接口封装 ---------- */

export interface AuthUser {
  id: string;
  email: string;
}

export interface LoginResult extends TokenPair {
  user: AuthUser;
}

export interface RegisterInput {
  email: string;
  password: string;
  inviteCode: string;
}

/** 注册。成功后服务端会直接签发令牌，但 h5 端按流程不自动登录，故此处不落盘 */
export function register(input: RegisterInput): Promise<LoginResult> {
  return api<LoginResult>("/v1/auth/register", {
    method: "POST",
    auth: false,
    body: {
      email: input.email,
      password: input.password,
      app: APP_ID,
      invite_code: input.inviteCode,
      device_id: deviceId(),
      device_name: deviceLabel(),
      platform: "web",
    },
  });
}

export function login(email: string, password: string): Promise<LoginResult> {
  return api<LoginResult>("/v1/auth/login", {
    method: "POST",
    auth: false,
    body: {
      email,
      password,
      app: APP_ID,
      device_id: deviceId(),
      device_name: deviceLabel(),
      platform: "web",
    },
  });
}

export function logout(): Promise<{ ok: boolean }> {
  const refreshToken = tkGet("refresh");
  if (!refreshToken) return Promise.resolve({ ok: true });
  return api<{ ok: boolean }>("/v1/auth/logout", {
    method: "POST",
    auth: false,
    body: { refresh_token: refreshToken },
  });
}

/** 当前登录态。返回的 role 是服务端实时角色，不是令牌里的旧声明 */
export interface MeResponse {
  user: { id: string; email: string; status: string; role: string; created_at: number };
  device_id: string;
  app: string;
  role: string;
}

export function fetchMe(): Promise<MeResponse> {
  return api<MeResponse>("/v1/me");
}

export interface Device {
  id: string;
  name: string;
  platform: string;
  last_seen: number;
  created_at: number;
  revoked_at: number | null;
  current: boolean;
}

export function fetchDevices(): Promise<{ devices: Device[] }> {
  return api<{ devices: Device[] }>("/v1/me/devices");
}

export function revokeDevice(id: string): Promise<{ ok: boolean; current: boolean }> {
  return api<{ ok: boolean; current: boolean }>(`/v1/me/devices/${id}`, { method: "DELETE" });
}

export function changePassword(
  oldPassword: string,
  newPassword: string
): Promise<{ ok: boolean } & TokenPair> {
  return api<{ ok: boolean } & TokenPair>("/v1/me/password", {
    method: "POST",
    body: { old_password: oldPassword, new_password: newPassword },
  });
}

/* ---------- 管理接口（web 端专用，h5 端不用） ---------- */

export interface UserRow {
  id: string;
  email: string;
  status: "active" | "banned" | "deleted";
  role: "admin" | "user";
  created_at: number;
  devices: number;
  last_seen: number | null;
}

export interface InviteRow {
  id: string;
  note: string;
  max_uses: number;
  uses: number;
  expires_at: number | null;
  created_at: number;
}

export interface LoginAttempt {
  email: string;
  ip: string;
  ok: number;
  at: number;
}

export interface OverviewStats {
  users: number;
  banned: number;
  deleted: number;
  devices: number;
  invites: number;
}

export function fetchOverview(): Promise<{ stats: OverviewStats; attempts: LoginAttempt[] }> {
  return api("/v1/admin/overview");
}

export function fetchUsers(limit = 200): Promise<{ users: UserRow[]; total: number }> {
  return api(`/v1/admin/users?limit=${limit}`);
}

export function setUserStatus(
  id: string,
  status: UserRow["status"]
): Promise<{ ok: boolean; id: string; status: string }> {
  return api(`/v1/admin/users/${id}`, { method: "PATCH", body: { status } });
}

export function setUserRole(
  id: string,
  role: UserRow["role"]
): Promise<{ ok: boolean; id: string; role: string }> {
  return api(`/v1/admin/users/${id}`, { method: "PATCH", body: { role } });
}

export function revokeUserSessions(id: string): Promise<{ ok: boolean }> {
  return api(`/v1/admin/users/${id}/revoke`, { method: "POST" });
}

export function fetchInvites(): Promise<{ invites: InviteRow[] }> {
  return api("/v1/admin/invites");
}

export function createInvite(input: {
  note: string;
  maxUses: number;
  expiresInDays: number;
}): Promise<{ code: string; note: string; max_uses: number; expires_at: number | null }> {
  return api("/v1/admin/invites", {
    method: "POST",
    body: {
      note: input.note,
      max_uses: input.maxUses,
      expires_in_days: input.expiresInDays,
    },
  });
}

/** 把令牌写进 localStorage 并记住角色 */
export function saveSession(pair: LoginResult, role?: string): void {
  tkSet("access", pair.access_token);
  tkSet("refresh", pair.refresh_token);
  if (pair.device_id) tkSet("device", pair.device_id);
  if (role) tkSet("role", role);
}

/** 上报给用户中心的设备名：区分 web 控制台与手机端 */
function deviceLabel(): string {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return "iPhone · Safari";
  if (/Android/i.test(ua)) return "Android · 浏览器";
  return "桌面 · 浏览器";
}
