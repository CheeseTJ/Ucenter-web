<script setup lang="ts">
/**
 * 确认 / 表单弹窗外壳：只有 .mask + .ticket 两层，内容由调用方的默认插槽决定。
 * 点击遮罩与按 Esc 都触发 close，交给调用方决定关不关。
 */
import { onMounted, onUnmounted } from "vue";

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: [] }>();

function onKey(e: KeyboardEvent): void {
  if (e.key === "Escape" && props.open) emit("close");
}

onMounted(() => document.addEventListener("keydown", onKey));
onUnmounted(() => document.removeEventListener("keydown", onKey));
</script>

<template>
  <div class="mask" :class="{ on: open }" @click.self="emit('close')">
    <div v-if="open" class="ticket">
      <slot />
    </div>
  </div>
</template>
