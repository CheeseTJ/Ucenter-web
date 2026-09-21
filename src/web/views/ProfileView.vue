<script setup lang="ts">
import { ref } from "vue";

import { changePassword, tkSet } from "@/shared/api";
import { stamp } from "@/shared/format";
import Modal from "../components/Modal.vue";
import { signOut, state } from "../session";
import { toast } from "../ui";

const oldPwd = ref("");
const newPwd = ref("");
const logoutOpen = ref(false);
const busy = ref(false);

function statusOf(): { kind: "ok" | "no" | "off"; label: string } {
  if (state.me?.status === "banned") return { kind: "no", label: "已封禁" };
  if (state.me?.status === "deleted") return { kind: "off", label: "已注销" };
  return { kind: "ok", label: "在册" };
}

async function savePassword(): Promise<void> {
  if (!oldPwd.value || !newPwd.value) {
    toast("请填写当前口令与新口令");
    return;
  }
  if (newPwd.value.length < 8) {
    toast("新口令至少 8 位");
    return;
  }
  if (busy.value) return;
  busy.value = true;
  try {
    // 改密会吊销本账号全部设备，服务端同时给本机换发了新令牌
    const res = await changePassword(oldPwd.value, newPwd.value);
    tkSet("access", res.access_token);
    tkSet("refresh", res.refresh_token);
    oldPwd.value = "";
    newPwd.value = "";
    toast("口令已更新，本机已换发新令牌");
  } catch (err) {
    toast(err instanceof Error ? err.message : String(err));
  } finally {
    busy.value = false;
  }
}

async function confirmLogout(): Promise<void> {
  logoutOpen.value = false;
  await signOut();
}
</script>

<template>
  <section class="view" :class="{ on: state.view === 'profile' }">
    <div class="doc-head">
      <div>
        <h1>我的档案</h1>
        <p>改密会吊销本账号全部设备，当前设备自动换发新令牌</p>
      </div>
    </div>

    <div class="panels">
      <div>
        <div class="card">
          <h2>登记信息</h2>
          <p class="hint">身份由 user-center 签发，各业务系统只本地验签，不回源</p>
          <dl class="def">
            <dt>登记号</dt>
            <dd>{{ state.me?.id || "—" }}</dd>
            <dt>邮箱</dt>
            <dd>{{ state.me?.email || "—" }}</dd>
            <dt>状态</dt>
            <dd>
              <span class="stamp" :class="statusOf().kind">{{ statusOf().label }}</span>
            </dd>
            <dt>登记时间</dt>
            <dd>{{ state.me?.created_at ? stamp(state.me.created_at) : "—" }}</dd>
            <dt>最近查验</dt>
            <dd>—</dd>
          </dl>
        </div>

        <div class="card">
          <h2>更改口令</h2>
          <p class="hint">旧口令需校验通过；新口令会以更高迭代次数重新派生哈希</p>
          <div class="stack">
            <div>
              <label class="lab" for="pOld">当前口令</label>
              <input
                id="pOld"
                v-model="oldPwd"
                class="inp"
                type="password"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label class="lab" for="pNew">新口令</label>
              <input id="pNew" v-model="newPwd" class="inp" type="password" placeholder="至少 8 位" />
            </div>
            <button
              class="btn ink"
              type="button"
              :disabled="busy"
              style="justify-content: center; padding: 11px 14px"
              @click="savePassword()"
            >
              保存并重新签发令牌
            </button>
          </div>
        </div>
      </div>

      <div class="card">
        <h2>会话</h2>
        <p class="hint">令牌有效期 15 分钟，到期由前端静默续签</p>
        <dl class="def">
          <dt>访问令牌</dt>
          <dd>15 分钟后过期，前端静默续签</dd>
          <dt>刷新令牌</dt>
          <dd>90 天，每次刷新即轮换</dd>
          <dt>本机设备号</dt>
          <dd>{{ state.deviceId || "—" }}</dd>
        </dl>
        <div class="row" style="display: flex; justify-content: flex-end; margin-top: 22px">
          <button class="btn" type="button" @click="logoutOpen = true">退出登录</button>
        </div>
      </div>
    </div>
  </section>

  <Modal :open="logoutOpen" @close="logoutOpen = false">
    <h3>退出登录？</h3>
    <p>会同时吊销本机在服务端的刷新令牌。</p>
    <div class="row">
      <button class="btn" type="button" @click="logoutOpen = false">取消</button>
      <button class="btn ink" type="button" @click="confirmLogout()">退出</button>
    </div>
  </Modal>
</template>
