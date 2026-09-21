<script setup lang="ts">
import { ref } from "vue";

import { login as apiLogin, register as apiRegister, saveSession } from "@/shared/api";
import { enterConsole, loadAll, loadMe, state } from "../session";
import { toast } from "../ui";

/**
 * 登录 / 注册幕帘。除管理台之外的功能两头都要有，所以电脑端也保留注册入口，
 * 与 H5 走同一套接口（注册仍需邀请码）。
 */
defineProps<{ hide: boolean }>();

type Mode = "login" | "register";

const mode = ref<Mode>("login");
const email = ref("");
const pass = ref("");
const pass2 = ref("");
const invite = ref("");
const busy = ref(false);

function switchMode(next: Mode): void {
  mode.value = next;
  state.curtainAlert = "";
  pass.value = "";
  pass2.value = "";
  invite.value = "";
}

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
  if (mode.value === "register") {
    if (pass2.value !== pwd) {
      state.curtainAlert = "两次输入的口令不一致";
      return;
    }
    if (!invite.value.trim()) {
      state.curtainAlert = "注册需要邀请码";
      return;
    }
  }
  if (busy.value) return;
  busy.value = true;

  try {
    const registering = mode.value === "register";
    const result = registering
      ? await apiRegister({ email: mail, password: pwd, inviteCode: invite.value.trim() })
      : await apiLogin(mail, pwd);

    // 先落盘令牌，fetchMe 才带得上 Bearer
    saveSession(result);
    // 角色以服务端实时值为准，不能信令牌里的旧声明
    await loadMe();
    saveSession(result, state.role);

    pass.value = "";
    pass2.value = "";
    invite.value = "";
    enterConsole();
    await loadAll();
    toast(registering ? "登记完成，已放行" : "查验通过");
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
          <h1>{{ mode === "register" ? "申请登记" : "查验身份" }}</h1>
          <p>{{ mode === "register" ? "User Center · Enroll" : "User Center · Admission" }}</p>
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
        <div v-if="mode === 'register'">
          <label class="lab" for="fPass2">确认口令</label>
          <input
            id="fPass2"
            v-model="pass2"
            class="inp"
            type="password"
            placeholder="再输一遍"
            autocomplete="new-password"
          />
        </div>
        <div v-if="mode === 'register'">
          <label class="lab" for="fInvite">邀请码</label>
          <input id="fInvite" v-model="invite" class="inp" type="text" placeholder="注册需要邀请码" />
        </div>
        <button
          class="btn ink"
          type="submit"
          :disabled="busy"
          style="justify-content: center; padding: 11px 14px"
        >
          {{ busy ? "处理中…" : mode === "register" ? "提交申请" : "进入登记处" }}
        </button>
      </div>

      <div v-if="state.curtainAlert">
        <div class="alert">{{ state.curtainAlert }}</div>
      </div>

      <div class="slip-foot">
        <span v-if="mode === 'login'">
          还没有账号？<button type="button" class="link" @click="switchMode('register')">
            申请登记
          </button>
        </span>
        <span v-else>
          已有账号？<button type="button" class="link" @click="switchMode('login')">
            返回查验
          </button>
        </span>
      </div>
    </form>
  </div>
</template>
