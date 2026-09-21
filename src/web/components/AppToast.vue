<script setup lang="ts">
import { toastState } from "../ui";
</script>

<template>
  <div class="toast" :class="{ on: toastState.on }">{{ toastState.msg }}</div>
</template>
