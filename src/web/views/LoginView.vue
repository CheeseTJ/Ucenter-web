<script setup lang="ts">
import { ref } from "vue";

import { login as apiLogin, saveSession } from "@/shared/api";
import { enterConsole, isAdmin, loadAll, loadMe, showDenied, state } from "../session";
import { toast } from "../ui";

/**
 * 登录幕帘。web 端只做查验，不提供注册入口——注册在 h5 端，
 * 所以这里只有邮箱、口令和登录按钮。
 */
defineProps<{ hide: boolean }>();

const email = ref("");
const pass = ref("");
const busy = ref(false);

async function submit(): Promise<void> {
  const mail = email.value.trim();
  const pwd = pass.value;
  if (!mail.includes("@")) {
    state.curtainAlert = "邮箱格式看起来不对";
    return;
  }
  if (pwd.length < 8) {
    state.curtainAlert = "口令至少 8 位";
    return;
  }
  if (busy.value) return;
  busy.value = true;
  try {
    const r = await apiLogin(mail, pwd);
    // 先落盘令牌，fetchMe 才带得上 Bearer
    saveSession(r);
    // 角色以服务端实时值为准，不能信令牌里的旧声明
    await loadMe();
    saveSession(r, state.role);
    if (!isAdmin()) {
      // 非管理员：立刻清掉登录态，整屏拒绝
      showDenied();
      return;
    }
    pass.value = "";
    enterConsole();
    await loadAll();
    toast("查验通过");
  } catch (err) {
    state.curtainAlert = err instanceof Error ? err.message : String(err);
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="curtain" :class="{ hide }">
    <form class="slip" autocomplete="on" @submit.prevent="submit()">
      <div class="slip-head">
        <div class="chop">籍</div>
        <div>
          <h1>查验身份</h1>
          <p>User Center · Admission</p>
        </div>
      </div>

      <div class="stack">
        <div>
          <label class="lab" for="fEmail">邮箱</label>
          <input
            id="fEmail"
            v-model="email"
            class="inp"
            type="email"
            placeholder="you@example.com"
            required
          />
        </div>
        <div>
          <label class="lab" for="fPass">口令</label>
          <input
            id="fPass"
            v-model="pass"
            class="inp"
            type="password"
            placeholder="至少 8 位"
            required
          />
        </div>
        <button
          class="btn ink"
          type="submit"
          :disabled="busy"
          style="justify-content: center; padding: 11px 14px"
        >
          {{ busy ? "处理中…" : "进入登记处" }}
        </button>
      </div>

      <div v-if="state.curtainAlert">
        <div class="alert">{{ state.curtainAlert }}</div>
      </div>

      <div class="slip-foot">
        <span>没有账号？请在手机端申请登记</span>
      </div>
    </form>
  </div>
</template>
