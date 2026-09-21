<script setup lang="ts">
import { toastState } from "./toast";
</script>

<template>
  <div class="shell">
    <header class="appbar">
      <div class="mchop">籍</div>
      <div>
        <div class="mname">身份登记处</div>
        <div class="msub">User Center</div>
      </div>
    </header>

    <main class="screen">
      <router-view />
    </main>

    <div class="toast" :class="{ on: toastState.on }">{{ toastState.msg }}</div>
  </div>
</template>
