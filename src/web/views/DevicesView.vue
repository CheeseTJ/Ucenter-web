<script setup lang="ts">
import { computed, ref } from "vue";

import { revokeDevice, type Device } from "@/shared/api";
import { ago, stamp } from "@/shared/format";
import Modal from "../components/Modal.vue";
import { loadDevices, state } from "../session";
import { toast } from "../ui";

const target = ref<Device | null>(null);
const busy = ref(false);

/** "在用"只算没被吊销的：吊销过的仍留在列表里，便于回溯 */
const liveCount = computed(() => state.devices.filter((d) => !d.revoked_at).length);

function ask(d: Device): void {
  target.value = d;
}

function close(): void {
  target.value = null;
}

async function fire(): Promise<void> {
  const d = target.value;
  if (!d || busy.value) return;
  busy.value = true;
  try {
    await revokeDevice(d.id);
    close();
    toast("设备已吊销");
    await loadDevices();
  } catch (err) {
    toast(err instanceof Error ? err.message : String(err));
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <section class="view" :class="{ on: state.view === 'devices' }">
    <div class="doc-head">
      <div>
        <h1>我的设备</h1>
        <p>每次登录登记一台；吊销某台只影响它自己持有的令牌</p>
      </div>
      <div class="doc-meta">在用 <b>{{ liveCount }}</b> 台</div>
    </div>

    <div class="dev-list">
      <div v-for="d in state.devices" :key="d.id" class="dev">
        <span class="dot" :class="d.revoked_at ? 'off' : d.current ? 'now' : ''"></span>
        <div class="dev-body">
          <div class="dev-name">
            {{ d.name || "未命名设备" }}
            <span v-if="d.current" class="stamp ok" style="margin-left: 6px">本机</span>
          </div>
          <div class="dev-meta">
            {{ d.platform || "" }} · 登记于 {{ stamp(d.created_at) }} · 最近活跃
            {{ ago(d.last_seen) }}
          </div>
          <div class="dev-meta">{{ d.id }}</div>
        </div>
        <span v-if="d.revoked_at" class="stamp off">已吊销</span>
        <button
          v-else
          class="btn tiny"
          :class="{ danger: !d.current }"
          type="button"
          :disabled="d.current"
          @click="ask(d)"
        >
          {{ d.current ? "当前设备" : "吊销" }}
        </button>
      </div>
    </div>
  </section>

  <Modal :open="!!target" @close="close()">
    <h3>吊销这台设备？</h3>
    <p>
      {{ target?.name || "未命名设备" }} · {{ target?.platform || "" }}<br />
      吊销后它持有的刷新令牌立即失效，需重新登录。
    </p>
    <div class="row">
      <button class="btn" type="button" :disabled="busy" @click="close()">取消</button>
      <button class="btn seal" type="button" :disabled="busy" @click="fire()">确认吊销</button>
    </div>
  </Modal>
</template>
