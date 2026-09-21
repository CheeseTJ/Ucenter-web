/**
 * 会话与数据状态（web 端组件之间共享）。
 *
 * 管理台（总览 / 账号 / 邀请函）只对 admin 开放，而且只在电脑上；
 * 其余功能——注册、登录、我的档案、我的设备——任何账号都能用，
 * 所以这里不做"非管理员一律拒之门外"，只是把管理那块整个不渲染。
 * 真正的准入由服务端的 requireAdmin 兜底：前端藏导航只是体验，不是防线。
 */

import { reactive } from "vue";

import {
  fetchDevices,
  fetchInvites,
  fetchMe,
  fetchOverview,
  fetchUsers,
  logout as apiLogout,
  onSessionExpired,
  tkClear,
  tkGet,
  tkSet,
  type Device,
  type InviteRow,
  type LoginAttempt,
  type MeResponse,
  type OverviewStats,
  type UserRow,
} from "@/shared/api";

export type ViewKey = "overview" | "users" | "invites" | "profile" | "devices";

/** 闸门：幕帘 ↔ 控制台。进控制台后再按角色决定看得到哪些导航 */
export type Gate = "login" | "app";

/** 管理台那一组，非管理员看不到也不该看到 */
export const ADMIN_VIEWS: ViewKey[] = ["overview", "users", "invites"];

export interface WebState {
  gate: Gate;
  /** 幕帘里的朱砂警示条文案 */
  curtainAlert: string;
  view: ViewKey;
  role: string;
  me: MeResponse["user"] | null;
  deviceId: string;
  stats: OverviewStats;
  attempts: LoginAttempt[];
  users: UserRow[];
  invites: InviteRow[];
  devices: Device[];
}

function emptyStats(): OverviewStats {
  return { users: 0, banned: 0, deleted: 0, devices: 0, invites: 0 };
}

export const state = reactive<WebState>({
  gate: "login",
  curtainAlert: "",
  view: "overview",
  role: "",
  me: null,
  deviceId: "",
  stats: emptyStats(),
  attempts: [],
  users: [],
  invites: [],
  devices: [],
});

export function isAdmin(): boolean {
  return state.role === "admin";
}

export function go(view: ViewKey): void {
  // 非管理员即使被外来调用切到管理视图，也退回自己的档案页
  if (!isAdmin() && ADMIN_VIEWS.includes(view)) return;
  state.view = view;
}

/** 通过闸门：收起幕帘。管理员落总览，其余账号落自己的档案 */
export function enterConsole(): void {
  state.curtainAlert = "";
  state.view = isAdmin() ? "overview" : "profile";
  state.gate = "app";
}

/** 弹回幕帘（可选携带提示），同时确保不残留任何管理数据 */
export function showCurtain(message = ""): void {
  state.gate = "login";
  state.curtainAlert = message;
}

function resetData(): void {
  state.role = "";
  state.me = null;
  state.deviceId = "";
  state.stats = emptyStats();
  state.attempts = [];
  state.users = [];
  state.invites = [];
  state.devices = [];
  state.view = "overview";
}

/** 拉取登录态：role 取服务端实时值，而不是令牌里的旧声明 */
export async function loadMe(): Promise<void> {
  const d = await fetchMe();
  state.me = d.user;
  state.deviceId = d.device_id;
  state.role = d.role || d.user.role || "user";
  tkSet("role", state.role);
}

/** 单块失败不阻断其余数据（与原实现一致），失败信息在本层忽略、由各视图决定是否提示 */
export async function loadAll(): Promise<void> {
  if (isAdmin()) {
    try {
      const ov = await fetchOverview();
      state.stats = ov.stats;
      state.attempts = ov.attempts;
    } catch {
      /* 忽略 */
    }
    try {
      const us = await fetchUsers(200);
      state.users = us.users;
    } catch {
      /* 忽略 */
    }
    try {
      const inv = await fetchInvites();
      state.invites = inv.invites;
    } catch {
      /* 忽略 */
    }
  }
  await loadDevices();
}

export async function loadDevices(): Promise<void> {
  try {
    const dv = await fetchDevices();
    state.devices = dv.devices;
  } catch {
    /* 忽略 */
  }
}

/** 令牌彻底失效（刷新也救不回来）时由 api 层回调到这里：清登录态 + 弹回幕帘 */
export function initSession(): void {
  onSessionExpired(() => {
    tkClear();
    resetData();
    showCurtain("登录已过期，请重新登录");
  });
}

/** 启动引导：无令牌显示幕帘；有令牌则恢复会话（角色决定看得到哪些导航） */
export async function boot(): Promise<void> {
  if (!tkGet("access")) {
    showCurtain();
    return;
  }
  try {
    await loadMe();
  } catch {
    tkClear();
    resetData();
    showCurtain("登录已过期，请重新登录");
    return;
  }
  enterConsole();
  await loadAll();
}

/** 退出登录：先吊销服务端刷新令牌，再本地清干净回到幕帘 */
export async function signOut(): Promise<void> {
  try {
    await apiLogout();
  } catch {
    /* 本地照常清除 */
  }
  tkClear();
  resetData();
  showCurtain();
}
