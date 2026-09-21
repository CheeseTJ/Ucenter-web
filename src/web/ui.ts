/** 全局提示：与原实现一致，约 2.2 秒后自动消失，重复调用会重置计时。 */

import { reactive } from "vue";

export const toastState = reactive({ msg: "", on: false });

let timer: ReturnType<typeof setTimeout> | undefined;

export function toast(msg: string): void {
  toastState.msg = msg;
  toastState.on = true;
  clearTimeout(timer);
  timer = setTimeout(() => {
    toastState.on = false;
  }, 2200);
}
