<div align="center">
  <h1>Ucenter · Web</h1>
  <p>统一身份中心前端 · Vue 3 + Vite，一套代码两种界面（H5 与 PC）</p>
</div>

<div align="center">

![Vue](https://img.shields.io/badge/Vue-3-42b883)
![Vite](https://img.shields.io/badge/Vite-8-646CFF)
![License](https://img.shields.io/badge/License-MIT-green)

</div>

## 项目定位

统一身份中心的**前端**，配套后端是
[Ucenter-worker](https://github.com/CheeseTJ/Ucenter-worker)。

一套代码构建出**两个入口**：手机端的 H5 流程（登录/注册/改密）与桌面端的管理控制台
（用户、邀请码、设备）。两者共用同一个构建配置，靠各自的 `html` 入口分开。

```text
index.html  ──> src/web/   PC 管理控制台
h5.html     ──> src/h5/    手机端登录/注册流程
                    │
                    └──fetch──> Ucenter-worker (Cloudflare Worker)
```

## 功能

### H5 流程（`h5.html`）
- 登录、注册（邀请码）、修改密码
- 完成页，用于登录成功后跳回下游应用
- 移动端优先的单列布局、轻量 toast

### PC 控制台（`index.html`）
- 用户列表与管理操作
- 邀请码生成与管理
- 设备查看与会话撤销
- 模态框、全局 toast

## 快速开始

```bash
npm install
npm run dev
```

开发时默认加载 PC 入口；访问 `/h5.html` 切到手机端流程。

构建：

```bash
npm run build
npm run preview
```

## 目录结构

```text
index.html          PC 入口
h5.html             H5 入口
src/
  web/              PC 侧：App.vue、session.ts、ui.ts、components/
  h5/               H5 侧：App.vue、router.ts、store.ts、toast.ts、views/
```

两侧完全独立，只在构建配置层面共享，避免样式与状态互相污染。

## 技术取舍

- **双入口而非响应式一套**：管理台与登录流程的使用场景差异太大，硬塞进一套布局反而
  两边都别扭
- **不引 UI 框架**：体量小，手写 CSS 更可控
- **会话集中在 `session.ts` / `store.ts`**，组件不直接读写 localStorage

## License

[MIT](./LICENSE) © 2026 JuneT
