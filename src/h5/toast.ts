/** 全局提示：约 2.2 秒后自动消失，重复调用重置计时（与 web 端同一套行为）。 */

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
