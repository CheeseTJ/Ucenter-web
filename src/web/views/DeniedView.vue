<script setup lang="ts">
/**
 * 非管理员被拒整屏：沿用幕帘与公文纸的形制，
 * 只留一个出口——退出登录回到登录幕帘。
 */
import { signOut } from "../session";
</script>

<template>
  <div class="curtain">
    <div class="slip">
      <div class="slip-head">
        <div class="chop">禁</div>
        <div>
          <h1>仅限管理员</h1>
          <p>User Center · Restricted</p>
        </div>
      </div>

      <div class="alert">
        该账号可以正常登录各业务应用，但没有管理后台的访问权限。
      </div>

      <div class="slip-foot">
        <span>如需开通，请联系管理员。</span>
        <button class="btn" type="button" @click="signOut()">退出登录</button>
      </div>
    </div>
  </div>
</template>
