<script setup lang="ts">
import { computed, ref, watch } from "vue";

import { shortId } from "@/shared/format";
import AppToast from "./components/AppToast.vue";
import { boot, go, initSession, isAdmin, state, type ViewKey } from "./session";
import DevicesView from "./views/DevicesView.vue";
import InvitesView from "./views/InvitesView.vue";
import LoginView from "./views/LoginView.vue";
import OverviewView from "./views/OverviewView.vue";
import ProfileView from "./views/ProfileView.vue";
import UsersView from "./views/UsersView.vue";

initSession();

const mainEl = ref<HTMLElement | null>(null);

const whoamiSub = computed(() => {
  const role = isAdmin() ? "管理员" : "普通用户";
  return state.me ? `${role} · ${shortId(state.me.id)}` : role;
});

// 切视图时主区回到顶部（原实现里点导航会重置 #main 的 scrollTop）
watch(
  () => state.view,
  () => {
    if (mainEl.value) mainEl.value.scrollTop = 0;
  }
);

function pick(view: ViewKey): void {
  go(view);
}

void boot();
</script>

<template>
  <!-- 控制台只在通过管理员闸门后出现：角色不对时连侧栏都不渲染 -->
  <div v-if="state.gate === 'app'" class="shell">
    <aside class="spine">
      <div class="brand">
        <div class="chop">籍</div>
        <div>
          <div class="brand-name">身份登记处</div>
          <div class="brand-sub">User Center</div>
        </div>
      </div>

      <nav class="nav">
        <!-- 管理台这一组整个不渲染：非管理员在服务端本来也会被 requireAdmin 挡下 -->
        <template v-if="isAdmin()">
          <div class="nav-label">登记册</div>
          <button
            class="nav-item"
            :class="{ on: state.view === 'overview' }"
            type="button"
            @click="pick('overview')"
          >
            <svg viewBox="0 0 24 24"><path d="M4 19V5m0 14h16M4 19V9m5 10V9m5 10V9m5 10V9" /></svg>
            总览 <span class="nav-count">{{ state.stats.users }}</span>
          </button>
          <button
            class="nav-item"
            :class="{ on: state.view === 'users' }"
            type="button"
            @click="pick('users')"
          >
            <svg viewBox="0 0 24 24">
              <circle cx="9" cy="8" r="3.2" />
              <path d="M3 20c0-3.4 2.7-5.4 6-5.4s6 2 6 5.4" />
              <path d="M16 11.2a3 3 0 1 0 0-6" />
              <path d="M18 20c0-2.4-.8-4-2-5" />
            </svg>
            账号 <span class="nav-count">{{ state.stats.users }}</span>
          </button>
          <button
            class="nav-item"
            :class="{ on: state.view === 'invites' }"
            type="button"
            @click="pick('invites')"
          >
            <svg viewBox="0 0 24 24">
              <path d="M3 7.5h18v9H3z" />
              <path d="M3 10.5h18" />
              <circle cx="17" cy="13.5" r="1.2" />
            </svg>
            邀请函 <span class="nav-count">{{ state.invites.length }}</span>
          </button>
        </template>
        <div class="nav-label" :style="isAdmin() ? 'margin-top: 16px' : ''">我本人</div>
        <button
          class="nav-item"
          :class="{ on: state.view === 'profile' }"
          type="button"
          @click="pick('profile')"
        >
          <svg viewBox="0 0 24 24">
            <rect x="4.5" y="3.5" width="15" height="17" rx="1.5" />
            <path d="M8 8.5h8M8 12h8M8 15.5h4" />
          </svg>
          我的档案
        </button>
        <button
          class="nav-item"
          :class="{ on: state.view === 'devices' }"
          type="button"
          @click="pick('devices')"
        >
          <svg viewBox="0 0 24 24">
            <rect x="3" y="5" width="13" height="10" rx="1.5" />
            <path d="M7 19h6" />
            <rect x="17.5" y="10" width="4" height="9" rx="1.2" />
          </svg>
          我的设备 <span class="nav-count">{{ state.stats.devices }}</span>
        </button>
      </nav>

      <div class="spine-foot">
        当前身份
        <b>{{ state.me?.email || "—" }}</b>
        <span>{{ whoamiSub }}</span>
      </div>
    </aside>

    <main ref="mainEl" class="main">
      <OverviewView />
      <UsersView />
      <InvitesView />
      <ProfileView />
      <DevicesView />
    </main>
  </div>

  <!-- 幕帘常驻，登录成功时靠 .hide 淡出，露出后面的控制台 -->
  <LoginView :hide="state.gate !== 'login'" />
  <AppToast />
</template>
