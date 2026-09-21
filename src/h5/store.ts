import { reactive, ref } from "vue";
import { tkSet } from "../shared/api";
import type { Device, MeResponse } from "../shared/api";

/**
 * 登录后的会话快照。只活在内存里：页面之间跳转时复用，
 * 刷新后由「我的账号」重新拉一次。
 */
export const session = reactive<{ me: MeResponse | null; devices: Device[] }>({
  me: null,
  devices: [],
});

export function clearSession(): void {
  session.me = null;
  session.devices = [];
}

/**
 * 保存一对新令牌。改密接口返回的是 TokenPair（不含 user），
 * 与 saveSession 的入参 LoginResult 形状不同，所以单独封一层。
 */
export function saveTokenPair(pair: {
  access_token: string;
  refresh_token: string;
  device_id?: string;
}): void {
  tkSet("access", pair.access_token);
  tkSet("refresh", pair.refresh_token);
  if (pair.device_id) tkSet("device", pair.device_id);
}

/**
 * 最近一次注册成功的邮箱。只暂存在内存里：刷新即丢，
 * 此时「完成」页没有内容可展示，直接退回注册页。
 */
export const registeredEmail = ref("");

export function rememberRegisteredEmail(email: string): void {
  registeredEmail.value = email;
}
