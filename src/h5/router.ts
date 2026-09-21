import { createRouter, createWebHashHistory } from "vue-router";
import type { RouteLocationRaw } from "vue-router";
import { tkGet } from "@/shared/api";

/**
 * h5 端路由。用 hash history：静态站可能被直接以 file:// 打开，
 * 或托管在没有 rewrite 规则的静态空间里，history 模式会 404。
 * 只做注册 / 登录 / 我的账号三件事，没有任何管理台入口。
 */
const landing = (): RouteLocationRaw =>
  tkGet("access") ? { name: "account" } : { name: "register" };

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: "/", redirect: landing },
    { path: "/register", name: "register", component: () => import("./views/RegisterView.vue") },
    { path: "/done", name: "done", component: () => import("./views/DoneView.vue") },
    { path: "/login", name: "login", component: () => import("./views/LoginView.vue") },
    { path: "/account", name: "account", component: () => import("./views/AccountView.vue") },
    { path: "/:pathMatch(.*)*", redirect: landing },
  ],
});

/**
 * 「我的账号」只是个资料页，任何账号登录后都能进，不做角色拦截；
 * 只挡没登录的人。
 */
router.beforeEach((to) => {
  if (to.name === "account" && !tkGet("access")) return { name: "login" };
  return true;
});

export default router;
