<script setup lang="ts">
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { ApiError, register, tkClear } from "@/shared/api";
import { rememberRegisteredEmail } from "../store";

const router = useRouter();

const form = reactive({ email: "", password: "", confirm: "", invite: "" });
const errors = reactive({ email: "", password: "", confirm: "", invite: "" });
const apiError = ref("");
const submitting = ref(false);

/** 字段级校验：错误挂在自己的字段下方，交接口之前的最后一道网 */
function validate(): boolean {
  errors.email = "";
  errors.password = "";
  errors.confirm = "";
  errors.invite = "";

  const email = form.email.trim();
  if (!email) errors.email = "请填写邮箱";
  else if (!email.includes("@")) errors.email = "邮箱格式不正确";

  if (form.password.length < 8) errors.password = "口令至少 8 位";
  if (form.confirm !== form.password) errors.confirm = "两次输入的口令不一致";
  if (!form.invite.trim()) errors.invite = "请填写邀请码";

  return !errors.email && !errors.password && !errors.confirm && !errors.invite;
}

async function submit(): Promise<void> {
  apiError.value = "";
  if (!validate()) return;

  submitting.value = true;
  try {
    const email = form.email.trim();
    await register({ email, password: form.password, inviteCode: form.invite.trim() });
    // 注册接口会顺带签发令牌，但这里不自动登录：先清干净，别把令牌留在这台机器上
    tkClear();
    rememberRegisteredEmail(email);
    // replace 而非 push：回退键不该再回到已经提交过的表单
    await router.replace("/done");
  } catch (error) {
    // 接口错误贴在按钮上方，不用 toast（手机上 toast 常被软键盘顶到屏幕外）
    apiError.value = error instanceof ApiError ? error.message : "提交失败，请稍后重试";
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="hero">
    <h2>申请登记</h2>
    <p>填入邀请码即可创建账号</p>
  </div>

  <form class="form" novalidate @submit.prevent="submit">
    <div class="fgroup">
      <label class="flab" for="reg-email">邮箱</label>
      <input
        id="reg-email"
        v-model="form.email"
        class="fin"
        :class="{ bad: errors.email }"
        type="email"
        inputmode="email"
        autocomplete="email"
        placeholder="you@example.com"
        @input="errors.email = ''"
      />
      <div v-if="errors.email" class="fhint err">{{ errors.email }}</div>
    </div>

    <div class="fgroup">
      <label class="flab" for="reg-password">口令</label>
      <input
        id="reg-password"
        v-model="form.password"
        class="fin"
        :class="{ bad: errors.password }"
        type="password"
        autocomplete="new-password"
        placeholder="至少 8 位"
        @input="errors.password = ''"
      />
      <div v-if="errors.password" class="fhint err">{{ errors.password }}</div>
      <div v-else class="fhint">字母 + 数字，8 位以上</div>
    </div>

    <div class="fgroup">
      <label class="flab" for="reg-confirm">确认口令</label>
      <input
        id="reg-confirm"
        v-model="form.confirm"
        class="fin"
        :class="{ bad: errors.confirm }"
        type="password"
        autocomplete="new-password"
        placeholder="再输一遍"
        @input="errors.confirm = ''"
      />
      <div v-if="errors.confirm" class="fhint err">{{ errors.confirm }}</div>
    </div>

    <div class="fgroup">
      <label class="flab" for="reg-invite">邀请码</label>
      <input
        id="reg-invite"
        v-model="form.invite"
        class="fin"
        :class="{ bad: errors.invite }"
        type="text"
        autocomplete="off"
        autocapitalize="off"
        autocorrect="off"
        spellcheck="false"
        placeholder="UC-XXXX-XXXX"
        @input="errors.invite = ''"
      />
      <div v-if="errors.invite" class="fhint err">{{ errors.invite }}</div>
    </div>

    <div v-if="apiError" class="alert">{{ apiError }}</div>

    <button class="cta" type="submit" :disabled="submitting">
      {{ submitting ? "提交中…" : "提交申请" }}
    </button>
  </form>

  <div class="swap">已有账号？<router-link to="/login">去登录</router-link></div>
  <div class="footnote">管理后台仅限管理员访问</div>
</template>
