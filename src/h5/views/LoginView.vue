<script setup lang="ts">
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { ApiError, fetchMe, login, saveSession } from "@/shared/api";
import { saveTokenPair, session } from "../store";

const router = useRouter();

const form = reactive({ email: "", password: "" });
const apiError = ref("");
const submitting = ref(false);

async function submit(): Promise<void> {
  apiError.value = "";
  const email = form.email.trim();
  if (!email || !form.password) {
    apiError.value = "请输入邮箱和口令";
    return;
  }

  submitting.value = true;
  try {
    const result = await login(email, form.password);
    // 令牌先落盘，接下来 fetchMe 才带得上 Authorization
    saveTokenPair(result);
    // 角色以服务端实时值为准，令牌连同角色一起记下
    const me = await fetchMe();
    saveSession(result, me.role);
    session.me = me;
    // h5 没有管理台，任何账号登录后都进「我的账号」
    await router.replace("/account");
  } catch (error) {
    // 失败提示就地放在按钮上方
    apiError.value = error instanceof ApiError ? error.message : "登录失败，请稍后重试";
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="hero">
    <h2>登录</h2>
    <p>用已登记的邮箱登录</p>
  </div>

  <form class="form" novalidate @submit.prevent="submit">
    <div class="fgroup">
      <label class="flab" for="login-email">邮箱</label>
      <input
        id="login-email"
        v-model="form.email"
        class="fin"
        type="email"
        inputmode="email"
        autocomplete="email"
        placeholder="you@example.com"
      />
    </div>

    <div class="fgroup">
      <label class="flab" for="login-password">口令</label>
      <input
        id="login-password"
        v-model="form.password"
        class="fin"
        type="password"
        autocomplete="current-password"
        placeholder="••••••••"
      />
    </div>

    <div v-if="apiError" class="alert">{{ apiError }}</div>

    <button class="cta" type="submit" :disabled="submitting">
      {{ submitting ? "登录中…" : "登录" }}
    </button>
  </form>

  <div class="swap">还没有账号？<router-link to="/register">去注册</router-link></div>
</template>
