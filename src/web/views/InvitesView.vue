<script setup lang="ts">
import { ref } from "vue";

import { createInvite, type InviteRow } from "@/shared/api";
import { nowSec, shortId, stamp } from "@/shared/format";
import Modal from "../components/Modal.vue";
import { loadAll, state } from "../session";
import { toast } from "../ui";

const open = ref(false);
const busy = ref(false);
/** 签发成功后填上明文；非空时弹窗切换为"已签发"视图 */
const code = ref("");
const note = ref("");
const uses = ref("1");
const days = ref("7");

function inviteState(inv: InviteRow): { kind: "ok" | "off"; label: string } {
  const n = nowSec();
  if (inv.expires_at && inv.expires_at < n) return { kind: "off", label: "已过期" };
  if (inv.max_uses !== 0 && inv.uses >= inv.max_uses) return { kind: "off", label: "已用尽" };
  return { kind: "ok", label: "可用" };
}

function openForm(): void {
  note.value = "";
  uses.value = "1";
  days.value = "7";
  code.value = "";
  open.value = true;
}

function close(): void {
  open.value = false;
}

async function submit(): Promise<void> {
  if (busy.value) return;
  const maxUses = Math.max(0, parseInt(uses.value || "1", 10));
  const expiresInDays = Math.max(0, parseInt(days.value || "7", 10));
  busy.value = true;
  try {
    const res = await createInvite({ note: note.value.trim(), maxUses, expiresInDays });
    await loadAll();
    // 明文只出现这一次，换到"已签发"视图让用户记下
    code.value = res.code;
  } catch (err) {
    toast(err instanceof Error ? err.message : String(err));
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <section class="view" :class="{ on: state.view === 'invites' }">
    <div class="doc-head">
      <div>
        <h1>邀请函</h1>
        <p>明文只在签发时出现一次，库里仅存哈希，事后无法再查</p>
      </div>
      <div class="doc-meta">共 <b>{{ state.invites.length }}</b> 份</div>
    </div>

    <div class="bar">
      <div class="bar-title">已签发</div>
      <div class="grow"></div>
      <button class="btn ink" type="button" @click="openForm()">
        <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>
        签发新邀请函
      </button>
    </div>

    <div class="ledger">
      <table>
        <thead>
          <tr>
            <th>备注</th>
            <th>用量</th>
            <th>有效期</th>
            <th>签发时间</th>
            <th style="text-align: right">状态</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="i in state.invites" :key="i.id">
            <td>
              <div class="mail">{{ i.note || "未备注" }}</div>
              <div class="sub">{{ shortId(i.id) }}</div>
            </td>
            <td class="num">{{ i.uses }} / {{ i.max_uses === 0 ? "不限" : i.max_uses }}</td>
            <td class="mute num">{{ i.expires_at ? stamp(i.expires_at) : "长期有效" }}</td>
            <td class="mute num">{{ stamp(i.created_at) }}</td>
            <td style="text-align: right">
              <span class="stamp" :class="inviteState(i).kind">{{ inviteState(i).label }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>

  <Modal :open="open" @close="close()">
    <template v-if="code">
      <h3>已签发</h3>
      <p>把这一串交给对方，用于注册时填写。关掉之后再也查不到。</p>
      <div class="code">{{ code }}</div>
      <div class="row">
        <button class="btn ink" type="button" @click="close()">我已记下</button>
      </div>
    </template>
    <template v-else>
      <h3>签发新邀请函</h3>
      <p>明文只在签发时显示一次，库里只存哈希，事后无法再查出来。</p>
      <div class="stack">
        <div>
          <label class="lab">备注</label>
          <input v-model="note" class="inp" placeholder="给谁 / 做什么用" />
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px">
          <div>
            <label class="lab">可用次数</label>
            <input v-model="uses" class="inp" type="number" min="0" />
          </div>
          <div>
            <label class="lab">有效天数</label>
            <input v-model="days" class="inp" type="number" min="0" />
          </div>
        </div>
      </div>
      <div class="row">
        <button class="btn" type="button" :disabled="busy" @click="close()">取消</button>
        <button class="btn ink" type="button" :disabled="busy" @click="submit()">
          {{ busy ? "签发中…" : "签发" }}
        </button>
      </div>
    </template>
  </Modal>
</template>
