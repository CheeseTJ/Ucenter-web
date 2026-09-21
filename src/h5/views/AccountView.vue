<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import {
  ApiError,
  changePassword,
  fetchDevices,
  fetchMe,
  logout,
  revokeDevice,
  tkClear,
} from "@/shared/api";
import type { Device } from "@/shared/api";
import { ago, stamp } from "@/shared/format";
import { clearSession, saveTokenPair, session } from "../store";
import { toast } from "../toast";

const router = useRouter();

const loading = ref(true);
const loadError = ref("");

const pw = reactive({ old: "", next: "" });
const pwErrors = reactive({ old: "", next: "" });
const pwApiError = ref("");
const pwSaving = ref(false);

const STATUS_TEXT: Record<string, string> = {
  active: "在册",
  banned: "已封禁",
  deleted: "已注销",
};
const STATUS_CLASS: Record<string, string> = {
  active: "ok",
  banned: "no",
  deleted: "off",
};

const statusText = computed(() => STATUS_TEXT[session.me?.user.status ?? ""] ?? "—");
const statusClass = computed(() => STATUS_CLASS[session.me?.user.status ?? ""] ?? "off");

/** 设备「登记于」只取月日，与设计稿一致 */
function shortDay(ts: number): string {
  return stamp(ts).slice(5, 10);
}

async function load(): Promise<void> {
  loading.value = true;
  loadError.value = "";
  try {
    const [me, devices] = await Promise.all([fetchMe(), fetchDevices()]);
    session.me = me;
    session.devices = devices.devices;
  } catch (error) {
    // 401 由 onSessionExpired 统一弹回登录页，这里只提示其它失败
    if (!(error instanceof ApiError && error.status === 401)) {
      loadError.value = error instanceof ApiError ? error.message : "加载失败，请稍后重试";
    }
  } finally {
    loading.value = false;
  }
}

async function refreshDevices(): Promise<void> {
  session.devices = (await fetchDevices()).devices;
}

/* ---------- 二次确认弹层：吊销设备、退出登录都从这里走 ---------- */

interface PendingConfirm {
  title: string;
  line: string;
  confirmText: string;
  run: () => Promise<void>;
}

const pending = ref<PendingConfirm | null>(null);
const confirming = ref(false);

async function runPending(): Promise<void> {
  const target = pending.value;
  if (!target || confirming.value) return;

  confirming.value = true;
  try {
    await target.run();
    pending.value = null;
  } catch (error) {
    // 失败时保留弹层，让用户可以再试一次
    toast(error instanceof ApiError ? error.message : "操作失败，请稍后重试");
  } finally {
    confirming.value = false;
  }
}

function askRevoke(device: Device): void {
  pending.value = {
    title: "吊销该设备",
    line: `${device.name} 将立即退出登录，需要重新输入邮箱与口令才能继续使用。`,
    confirmText: "吊销",
    run: async () => {
      const result = await revokeDevice(device.id);
      if (result.current) {
        // 吊销的正是本机：令牌已失效，回登录页
        tkClear();
        clearSession();
        await router.replace("/login");
        return;
      }
      await refreshDevices();
      toast("设备已吊销");
    },
  };
}

async function doLogout(): Promise<void> {
  try {
    await logout();
  } catch {
    // 服务端不可达也要让本地退得掉
  }
  tkClear();
  clearSession();
  await router.replace("/login");
}

function askLogout(): void {
  pending.value = {
    title: "退出登录",
    line: "本机将清除登录态，需要重新输入邮箱与口令。",
    confirmText: "退出",
    run: doLogout,
  };
}

/* ---------- 更改口令 ---------- */

async function savePassword(): Promise<void> {
  pwApiError.value = "";
  pwErrors.old = pw.old ? "" : "请输入当前口令";
  pwErrors.next = pw.next.length >= 8 ? "" : "新口令至少 8 位";
  if (pwErrors.old || pwErrors.next) return;

  pwSaving.value = true;
  try {
    const result = await changePassword(pw.old, pw.next);
    // 改密会吊销所有设备并给本机换发新令牌，直接续上，不让用户重新登录
    saveTokenPair(result);
    pw.old = "";
    pw.next = "";
    toast("口令已更新");
    await refreshDevices();
  } catch (error) {
    pwApiError.value = error instanceof ApiError ? error.message : "更改失败，请稍后重试";
  } finally {
    pwSaving.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="hero">
    <h2>我的账号</h2>
    <p>查看登记信息、吊销设备、更换口令</p>
  </div>

  <div v-if="loading" class="fhint">加载中…</div>

  <template v-else>
    <div v-if="loadError" class="alert">{{ loadError }}</div>

    <div v-if="session.me" class="pcard">
      <h3>登记信息</h3>
      <div class="prow">
        <span class="k">邮箱</span>
        <span class="v">{{ session.me.user.email }}</span>
      </div>
      <div class="prow">
        <span class="k">状态</span>
        <span class="v"><span class="stamp" :class="statusClass">{{ statusText }}</span></span>
      </div>
      <div class="prow">
        <span class="k">登记时间</span>
        <span class="v">{{ stamp(session.me.user.created_at) }}</span>
      </div>
    </div>

    <div class="pcard">
      <h3>我的设备</h3>
      <div v-for="device in session.devices" :key="device.id" class="dev-row">
        <span class="dot" :class="{ now: device.current, off: !!device.revoked_at }" />
        <div class="dev-body">
          <div class="dev-name">{{ device.name }}</div>
          <div class="dev-meta">
            登记于 {{ shortDay(device.created_at) }} · 最近活跃 {{ ago(device.last_seen) }}
          </div>
        </div>
        <button v-if="device.current" class="btn-xs" disabled>本机</button>
        <button v-else-if="device.revoked_at" class="btn-xs" disabled>已吊销</button>
        <button v-else class="btn-xs danger" @click="askRevoke(device)">吊销</button>
      </div>
      <div v-if="!session.devices.length" class="fhint">暂无设备</div>
    </div>

    <div class="pcard">
      <h3>更改口令</h3>
      <div class="fgroup">
        <label class="flab" for="pw-old">当前口令</label>
        <input
          id="pw-old"
          v-model="pw.old"
          class="fin"
          :class="{ bad: pwErrors.old }"
          type="password"
          autocomplete="current-password"
          placeholder="••••••••"
          @input="pwErrors.old = ''"
        />
        <div v-if="pwErrors.old" class="fhint err">{{ pwErrors.old }}</div>
      </div>
      <div class="fgroup">
        <label class="flab" for="pw-next">新口令</label>
        <input
          id="pw-next"
          v-model="pw.next"
          class="fin"
          :class="{ bad: pwErrors.next }"
          type="password"
          autocomplete="new-password"
          placeholder="至少 8 位"
          @input="pwErrors.next = ''"
        />
        <div v-if="pwErrors.next" class="fhint err">{{ pwErrors.next }}</div>
      </div>

      <div v-if="pwApiError" class="alert">{{ pwApiError }}</div>

      <button class="cta" :disabled="pwSaving" @click="savePassword">
        {{ pwSaving ? "保存中…" : "保存并换发令牌" }}
      </button>
    </div>

    <button class="cta ghost" @click="askLogout">退出登录</button>
  </template>

  <div class="mask" :class="{ on: !!pending }">
    <div v-if="pending" class="ticket">
      <h3>{{ pending.title }}</h3>
      <p>{{ pending.line }}</p>
      <div class="row">
        <button class="btn" type="button" :disabled="confirming" @click="pending = null">取消</button>
        <button class="btn seal" type="button" :disabled="confirming" @click="runPending">
          {{ confirming ? "处理中…" : pending.confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 卡片内的主按钮不再额外顶开间距，与设计稿 05 号屏一致 */
.pcard .cta {
  margin-top: 0;
}
.pcard .fgroup {
  margin-bottom: 12px;
}
</style>
