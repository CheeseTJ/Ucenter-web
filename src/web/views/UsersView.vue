<script setup lang="ts">
import { computed, ref } from "vue";

import { revokeUserSessions, setUserStatus, type UserRow } from "@/shared/api";
import { ago, shortId, stamp } from "@/shared/format";
import Modal from "../components/Modal.vue";
import { go, loadAll, state } from "../session";
import { toast } from "../ui";

type Filter = "all" | "active" | "banned" | "deleted";

const filters: { key: Filter; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "active", label: "在册" },
  { key: "banned", label: "已封禁" },
  { key: "deleted", label: "已注销" },
];

interface Confirm {
  title: string;
  lines: string[];
  confirmText: string;
  /** true → .btn.seal（朱砂），false → .btn.ink */
  seal: boolean;
  run: () => Promise<void>;
}

const query = ref("");
const filter = ref<Filter>("all");
const busy = ref(false);
const confirmOpen = ref(false);
const confirm = ref<Confirm>({ title: "", lines: [], confirmText: "", seal: true, run: async () => {} });

const rows = computed(() => {
  const q = query.value.trim().toLowerCase();
  return state.users.filter((u) => {
    if (filter.value !== "all" && u.status !== filter.value) return false;
    if (q && !((u.email || "").toLowerCase().includes(q) || (u.id || "").toLowerCase().includes(q))) {
      return false;
    }
    return true;
  });
});

function pickFilter(key: Filter): void {
  filter.value = key;
}

function isSelf(u: UserRow): boolean {
  return !!state.me && u.id === state.me.id;
}

/** 印章式状态：注销 > 封禁 > 有设备即在册 > 待启用 */
function statusOf(u: UserRow): { kind: "ok" | "no" | "wait" | "off"; label: string } {
  if (u.status === "deleted") return { kind: "off", label: "已注销" };
  if (u.status === "banned") return { kind: "no", label: "已封禁" };
  if (u.devices > 0) return { kind: "ok", label: "在册" };
  return { kind: "wait", label: "待启用" };
}

function subOf(u: UserRow): string {
  if (isSelf(u)) return "我自己";
  if (u.status === "deleted") return "已注销 · 业务数据保留";
  return u.last_seen ? `最近查验 ${ago(u.last_seen)}` : "从未查验";
}

function ask(next: Confirm): void {
  confirm.value = next;
  confirmOpen.value = true;
}

function closeConfirm(): void {
  confirmOpen.value = false;
}

/** 成功后关弹窗；失败保持弹窗打开并 toast（与原实现一致） */
async function fire(): Promise<void> {
  if (busy.value) return;
  busy.value = true;
  try {
    await confirm.value.run();
    closeConfirm();
  } catch (err) {
    toast(err instanceof Error ? err.message : String(err));
  } finally {
    busy.value = false;
  }
}

async function restoreUser(u: UserRow): Promise<void> {
  try {
    await setUserStatus(u.id, "active");
    toast("已恢复该账号");
    await loadAll();
  } catch (err) {
    toast(err instanceof Error ? err.message : String(err));
  }
}

function askDelete(u: UserRow): void {
  ask({
    title: "注销这个账号？",
    lines: [
      u.email,
      "注销后立即无法登录，名下令牌全部作废。",
      "各业务系统的数据不会被删除——收藏、歌单等按 user_id 关联的记录都会保留，只是该账号进不去。",
      "30 天冷静期内可以在这里恢复。",
    ],
    confirmText: "确认注销",
    seal: true,
    run: async () => {
      await setUserStatus(u.id, "deleted");
      toast("已注销，业务数据保留");
      await loadAll();
    },
  });
}

function askBan(u: UserRow): void {
  const banning = u.status !== "banned";
  ask({
    title: `${banning ? "封禁" : "解除封禁"}这个账号？`,
    lines: banning
      ? [u.email, "封禁后该账号的所有令牌会被立即吊销，无需等访问令牌过期。"]
      : [u.email, "解除后该账号可以重新登录，需重新登记设备。"],
    confirmText: banning ? "确认封禁" : "解除封禁",
    seal: banning,
    run: async () => {
      await setUserStatus(u.id, banning ? "banned" : "active");
      toast(banning ? "已封禁，令牌全部吊销" : "已解除封禁");
      await loadAll();
    },
  });
}

function askRevoke(u: UserRow): void {
  ask({
    title: "强制该账号下线？",
    lines: [u.email, "该账号名下所有设备的令牌会全部作废，需重新登录。"],
    confirmText: "全部下线",
    seal: true,
    run: async () => {
      await revokeUserSessions(u.id);
      toast("已强制下线");
      await loadAll();
    },
  });
}
</script>

<template>
  <section class="view" :class="{ on: state.view === 'users' }">
    <div class="doc-head">
      <div>
        <h1>账号</h1>
        <p>封禁后该账号的令牌会被立即吊销，无需等待过期</p>
      </div>
      <div class="doc-meta">共 <b>{{ state.users.length }}</b> 条登记</div>
    </div>

    <div class="bar">
      <div class="field">
        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4-4" /></svg>
        <input v-model="query" type="text" placeholder="按邮箱或登记号检索…" />
      </div>
      <div class="pills">
        <button
          v-for="f in filters"
          :key="f.key"
          class="pill"
          :class="{ on: filter === f.key }"
          type="button"
          @click="pickFilter(f.key)"
        >
          {{ f.label }}
        </button>
      </div>
      <div class="grow"></div>
      <button class="btn" type="button" @click="go('invites')">
        <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>
        发出邀请函
      </button>
    </div>

    <div class="ledger">
      <table>
        <thead>
          <tr>
            <th>登记号</th>
            <th>邮箱</th>
            <th>状态</th>
            <th>设备</th>
            <th>登记时间</th>
            <th style="text-align: right">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in rows" :key="u.id">
            <td><span class="reg-no">{{ shortId(u.id) }}</span></td>
            <td>
              <div class="mail" :class="{ gone: u.status === 'deleted' }">{{ u.email }}</div>
              <div class="sub">{{ subOf(u) }}</div>
            </td>
            <td>
              <span class="stamp" :class="statusOf(u).kind">{{ statusOf(u).label }}</span>
            </td>
            <td class="num">{{ u.devices || 0 }} 台</td>
            <td class="mute num">{{ stamp(u.created_at) }}</td>
            <td>
              <div class="rowacts">
                <button
                  v-if="u.status === 'deleted'"
                  class="btn tiny"
                  type="button"
                  @click="restoreUser(u)"
                >
                  恢复
                </button>
                <template v-else>
                  <button
                    class="btn tiny"
                    type="button"
                    :disabled="(u.devices || 0) === 0"
                    @click="askRevoke(u)"
                  >
                    强制下线
                  </button>
                  <button
                    class="btn tiny"
                    :class="{ danger: u.status !== 'banned' }"
                    type="button"
                    :disabled="isSelf(u)"
                    @click="askBan(u)"
                  >
                    {{ u.status === "banned" ? "解封" : "封禁" }}
                  </button>
                  <button
                    class="btn tiny danger"
                    type="button"
                    :disabled="isSelf(u)"
                    @click="askDelete(u)"
                  >
                    删除
                  </button>
                </template>
              </div>
            </td>
          </tr>
          <tr v-if="!rows.length">
            <td colspan="6">
              <div class="empty">
                <h3>没有匹配的登记</h3>
                <p>换一个关键词，或把筛选切回「全部」</p>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

  </section>

  <Modal :open="confirmOpen" @close="closeConfirm()">
    <h3>{{ confirm.title }}</h3>
    <p>
      <template v-for="(line, i) in confirm.lines" :key="i"
        >{{ line }}<br v-if="i < confirm.lines.length - 1"
      /></template>
    </p>
    <div class="row">
      <button class="btn" type="button" :disabled="busy" @click="closeConfirm()">取消</button>
      <button
        class="btn"
        :class="confirm.seal ? 'seal' : 'ink'"
        type="button"
        :disabled="busy"
        @click="fire()"
      >
        {{ busy ? "处理中…" : confirm.confirmText }}
      </button>
    </div>
  </Modal>
</template>
