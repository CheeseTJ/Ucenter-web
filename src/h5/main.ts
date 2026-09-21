import { createApp } from "vue";
import { fetchMe, onSessionExpired, tkClear, tkGet } from "@/shared/api";
import App from "./App.vue";
import router from "./router";

import "@/shared/styles/base.css";
import "./styles.css";

// 刷新也救不回来时，清掉本地登录态并回到登录页
onSessionExpired(() => {
  tkClear();
  void router.replace("/login");
});

createApp(App).use(router).mount("#app");

// 带着令牌启动时（hash 落地页已指向 /account），先向服务端核一次登录态；
// 令牌已失效就清干净退回登录页，别让用户停在一张空白的账号页上。
if (tkGet("access")) {
  void fetchMe().catch(() => {
    tkClear();
    void router.replace("/login");
  });
}
