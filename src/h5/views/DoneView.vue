<script setup lang="ts">
import { useRouter } from "vue-router";
import { registeredEmail } from "../store";

const router = useRouter();
const email = registeredEmail.value;

// 邮箱只暂存在内存里：刷新会丢掉它，此时没有内容可展示，直接回注册页
if (!email) void router.replace("/register");

function backToLogin(): void {
  // replace：从完成页出去后，回退键不该再回到这张已经办完的回执
  void router.replace("/login");
}
</script>

<template>
  <div v-if="email" class="done">
    <div class="done-chop">记</div>
    <h2>登记完成</h2>
    <p class="lead">账号已创建，可以登录各业务应用了</p>

    <!-- 回执只留邮箱：登记号是内部标识，对用户没有用处 -->
    <div class="receipt">
      <dl>
        <dt>邮箱</dt>
        <dd>{{ email }}</dd>
      </dl>
    </div>

    <div class="alert warn">
      管理后台仅限管理员访问。当前账号无法进入，如需开通权限请联系管理员。
    </div>

    <button class="cta ghost" type="button" @click="backToLogin">返回登录</button>
  </div>
</template>

<style scoped>
/* 03 号屏里的局部间距：警示条与按钮略微收紧 */
.alert {
  margin: 18px 0 0;
  text-align: left;
}
.cta {
  margin-top: 22px;
}
</style>
