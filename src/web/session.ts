/**
 * 会话与数据状态（web 端组件之间共享）。
 *
 * 管理员闸门是这一端的核心：只有服务端实时角色为 admin 时才进入控制台，
 * 其余账号一律清掉令牌并整屏显示 DeniedView——绝不"先渲染再把侧栏藏起来"。
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

/** 闸门：幕帘 → 控制台；非管理员停在 denied，既不渲染侧栏也不渲染任何管理视图 */
export type Gate = "login" | "app" | "denied";

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
  state.view = view;
}

/** 通过闸门：收起幕帘，落到总览 */
export function enterConsole(): void {
  state.curtainAlert = "";
  state.view = "overview";
  state.gate = "app";
}

/** 弹回幕帘（可选携带提示），同时确保不残留任何管理数据 */
export function showCurtain(message = ""): void {
  state.gate = "login";
  state.curtainAlert = message;
}

/** 非管理员：立刻吊销本地登录态，整屏拒绝，绝不进入控制台 */
export function showDenied(): void {
  tkClear();
  resetData();
  state.curtainAlert = "";
  state.gate = "denied";
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

/** 启动引导：无令牌显示幕帘；有令牌先验证实时角色，非管理员直接拒绝 */
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
  if (!isAdmin()) {
    showDenied();
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
