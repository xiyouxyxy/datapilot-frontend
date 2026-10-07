# DataPilot · 开发手册

> 项目：`new-bi-analysis`（DataPilot · ToB 数据分析平台前端，纯前端 + Mock 演示工程）
> 定位：这个项目由我独立完成。这份手册回答三个问题——**它现在长什么样、关键决策为什么这么做、改的时候要注意什么**。
> 读者设定：下一个接手的人，以及半年后的我自己。
> 版本：v2.0　最后更新：2026-10-07
>
> **写作边界**：本文只写「已实现」的部分。还没做的统一收进 §14，写清现状与取舍理由。
> 上一版（v1.x）的问题正是把「规范定了但代码没写」混在正文里当现状描述，这次全部按 `src/` 实际代码重过一遍——
> 包括测试、husky/Prettier、权限组件、目录结构、接口清单在内共十余处都被修正了。

---

## 0. 文档导航

| 章节         | 内容                            | 何时看            | 状态          |
| ------------ | ------------------------------- | ----------------- | ------------- |
| 1 项目概述   | 定位、技术栈、红线              | 第一次打开仓库    | ✅ 定稿       |
| 2 环境准备   | Node / 脚本 / 环境变量          | 拉代码后          | ✅ 可用       |
| 3 目录结构   | 目录树与各层职责                | 新建文件前        | ✅ 与代码一致 |
| 4 工程化规范 | TS / ESLint / Prettier / 提交   | 提交代码前        | ✅ 全接入     |
| 5 状态管理   | Zustand 三个 store              | 写 store 时       | ✅ 就位       |
| 6 路由与权限 | react-router v7 + 四级 RBAC     | 加页面 / 加菜单时 | ✅ 全落地     |
| 7 请求层     | axios 拦截器 + 401 事件 + mock  | 调接口时          | ✅ 可用       |
| 8 Mock 方案  | axios-mock-adapter 全量 mock    | 联调前            | ✅ 22 个接口  |
| 9 接口契约   | 全部 REST 接口清单              | 对齐契约时        | ✅ 与 mock 一致 |
| 10 UI 规范   | antd 6 配置 / 布局 / 暗坑       | 写组件时          | ✅ 可用       |
| 11 编码规范  | 命名 / 类型 / 性能              | 写任何代码时      | ✅ 定稿       |
| 12 构建部署  | Docker / nginx / CI / CD        | 提测 / 发布时     | ✅ 流水线可用 |
| 13 质量保障  | 类型 / lint / 测试 / 兜底       | 提交前            | ✅ 全绿       |
| 14 已知问题  | 死依赖、预留未接、取舍说明      | 想动手改之前      | —             |
| 附录         | 命令速查 / FAQ                  | 踩坑时            | —             |

---

## 1. 项目概述

### 1.1 定位

面向**企业内部**的 BI 分析平台前端。核心链路：登录鉴权 → 按权限渲染的数据看板 → 万级明细表格 → 复杂录入表单向导 → 审批流 → 消息中心。

刻意覆盖七个 ToB 中后台的高频难点，因为它们是「能不能做业务前端」的分水岭，而不是什么新框架：

1. **四级权限管控**（路由 / 菜单 / 按钮 / 字段）
2. **万级数据表格**（虚拟滚动 + 列设置 + 批量操作）
3. **可视化看板**（多图联动 + 三种导出）
4. **审批流**（三视图 + 流程时间线）
5. **消息中心**（未读联动 + 实时订阅）
6. **复杂表单向导**（分步校验 + 联动 + 草稿）
7. **大数据导入**（Web Worker 解析 + 逐行校验）

**它没有后端**。所有接口由 `axios-mock-adapter` 在 axios 实例上拦截，`npm install && npm run dev` 就能跑通全流程。

### 1.2 技术栈（版本取自 `package.json`）

| 分类        | 选型                                                              | 为什么是它                                     |
| ----------- | ----------------------------------------------------------------- | ---------------------------------------------- |
| 语言        | **TypeScript 5.9**（`strict: true`）                              | 接口契约多、字段权限多，类型即文档              |
| 构建        | **Vite 8**（rolldown）                                            | 冷启动 / HMR 快，配置面小                      |
| 框架        | **React 19**                                                      | —                                              |
| UI          | **Ant Design 6** + `@ant-design/icons` 6 + **dayjs** 1.11         | ToB 组件最全，表格/表单/主题开箱可用            |
| 路由        | **react-router-dom 7**（library 模式，`createBrowserRouter`）     | 标准方案、与 Vite 解耦、不引 SSR 复杂度         |
| 状态        | **Zustand 5**（+ `persist`）                                      | 轻量、无 Provider 嵌套、上手成本低              |
| 请求        | **axios 1.20** + 拦截器                                           | 通用，且能被 mock 在实例层拦截                  |
| Mock        | **axios-mock-adapter 2.1**                                        | 实例级拦截，业务代码零侵入                      |
| 图表        | **echarts 6**（`echarts/core` 按需注册）                          | 看板六图 + 联动                                |
| 表格虚拟化  | **antd Table 原生 `virtual`**                                     | 见下方"一个必须说清的选型"                      |
| 导入导出    | **xlsx** / **read-excel-file** / **file-saver** / **html2canvas** / **jspdf** | Excel 导入、看板 PNG/PDF/Excel 导出 |
| 国际化      | **i18next 26** + **react-i18next 17**                             | 中英双语，语言偏好持久化                        |
| 测试        | **Vitest 5** + Testing Library + jsdom                            | 与 Vite 同源，零额外构建配置                    |
| 工程化      | **ESLint 10** + typescript-eslint + **Prettier 3** + husky + lint-staged | 提交即拦截                              |

> **一个必须说清的选型：虚拟滚动没用 `@tanstack/react-virtual`。**
> `package.json` 里确实装着它，但 `src/` 零引用；万级表格用的是 antd Table 自带的 `virtual` 属性
> （`src/pages/employee/index.tsx` 的 `<Table virtual ... />`）。
> 理由：antd 6 已经把 `virtual` 做进了 Table，自己再叠一层虚拟列表要和 antd 的 `scroll`、`rowSelection`、
> 固定列语义对齐，成本远大于收益。**该依赖属于历史残留，见 §14.1。**

### 1.3 关键约束（红线）

- 不引 Redux / MobX / Saga；状态一律走 Zustand。
- 不引 Umi / Next；纯 Vite SPA。
- **业务代码不得直接耦合 mock**：mock 只在 `utils/request.ts` 里由 `VITE_USE_MOCK` 条件注入。
- 所有接口返回统一 `BaseResponse<T>`，由请求层拦截器解包为 `data`，业务层拿到的就是裸数据。
- 权限码一律走 `constants/index.ts` 的 `PERM` / `FIELD`，组件里禁止裸字符串。

---

## 2. 环境准备

### 2.1 前置

- Node `>= 20`（CI 用的是 22）
- 包管理：npm，锁文件 `package-lock.json` 入库，CI 用 `npm ci`

### 2.2 脚本（`package.json` 实况）

| 命令                 | 作用                                       |
| -------------------- | ------------------------------------------ |
| `npm run dev`        | 开发服务器（默认 mock 开启，端口 5173）     |
| `npm run build`      | 生产构建 → `dist/`                          |
| `npm run preview`    | 预览构建产物                                |
| `npm run lint`       | ESLint 检查（`eslint .`）                   |
| `npm run typecheck`  | `tsc --noEmit` 类型检查                     |
| `npm run format`     | Prettier 写入                               |
| `npm run format:check` | Prettier 只校验（CI 可用）                |
| `npm run test`       | `vitest run`（4 个文件 / 23 个用例）        |
| `npm run prepare`    | `husky` 安装 git hooks（`npm install` 后自动跑） |

### 2.3 环境变量（`.env` 系列）

| 文件               | 关键变量                                          |
| ------------------ | ------------------------------------------------- |
| `.env`             | `VITE_APP_TITLE=DataPilot`                        |
| `.env.development` | `VITE_API_BASE_URL=/api`、`VITE_USE_MOCK=true`     |
| `.env.production`  | `VITE_API_BASE_URL=/api`、`VITE_USE_MOCK=true`     |

读取方式：`import.meta.env.VITE_API_BASE_URL`（Vite 只暴露 `VITE_` 前缀变量）。

> ⚠️ **生产也开着 mock，这是刻意的，不是漏改。**
> 本工程没有任何真实后端，`VITE_USE_MOCK=false` 会让生产构建去请求不存在的 `/api`，页面直接白屏
> （Docker 和 GitHub Pages 都一样）。所以线上 Demo 走的就是前端本地 mock。
> 接真实后端时把这里改回 `false`，并打开 `nginx.conf` 末尾那段 `/api` 反向代理注释。
>
> 这个坑的隐蔽之处：**CI 的容器冒烟测试查不出来**——它只验证首页返回 200（HTML 壳子正常），
> 而白屏发生在 JS 执行、发请求之后。所以冒烟测试过了不等于页面能用。

---

## 3. 目录结构

```
src/
├── main.tsx                     # 挂载入口：reset.css + 全局异常监听 + 埋点 init + createRoot
├── App.tsx                      # ConfigProvider(i18n 语言) + AntApp + MessageBridge + ErrorBoundary + RouterProvider
├── index.css                    # 唯一全局样式：最小重置，视觉交给 antd 主题
│
├── router/                      # 路由与权限守卫
│   ├── index.tsx                #   路由表（懒加载 + Suspense）+ createBrowserRouter(basename)
│   ├── guards.tsx               #   RequireAuth（登录态）+ Authorized（菜单级权限）
│   ├── menus.tsx                #   MENU_CONFIG + pathToMenuKey + filterMenusByPermission（纯函数）
│   └── __tests__/menus.test.ts  #   菜单过滤单测
│
├── layouts/
│   └── BasicLayout.tsx          # Sider(220/light) + Header + Content；窄屏切 Drawer
│
├── pages/
│   ├── home/index.tsx           # 受保护壳：RequireAuth + BasicLayout（login/sso/403/404 不套布局）
│   ├── login/index.tsx          # 登录表单 + 四套角色一键填充 + SSO 入口
│   ├── sso/index.tsx            # 模拟第三方「统一身份认证中心」，签一次性 code 后回跳
│   ├── loginCallback/index.tsx  # 用 code 换 token → 写入登录态 → 跳回 redirect
│   ├── dashboard/index.tsx      # 看板：6 张图卡 + 部门柱联动 + 卡片显隐 + PNG/PDF/Excel 导出
│   ├── employee/
│   │   ├── index.tsx            #   表格页：装配 5 个 hook + 权限按钮 + 批量条 + 列设置弹窗
│   │   ├── columns.tsx          #   列定义工厂 buildColumns() + 列宽计算 + 列 key 常量
│   │   └── hooks/               #   页面私有 hook（见下）
│   ├── workflow/index.tsx       # 审批：三 Tab + 表格 + 详情抽屉（Descriptions + 垂直 Steps）
│   ├── form/index.tsx           # 4 步表单向导：分步校验 + 部门↔岗位联动 + 草稿 + 权限预览 + 附件
│   ├── import/index.tsx         # 数据导入：Dragger 上传 → Worker 解析 → 逐行校验 → 批量入库
│   ├── placeholder/index.tsx    # 通用占位（保持路由可访问性的兜底）
│   ├── 403.tsx / 404.tsx
│   └── components/              # 页面级复用组件（跨页复用，但不属于"通用无业务"层）
│       ├── BiChart/             #   echarts 薄封装：生命周期/loading/空态/ResizeObserver/暗色
│       ├── DashboardCard/       #   看板卡片壳（标题 + 显隐 + 导出入口）
│       ├── EmployeeFormModal/   #   员工新增/编辑弹窗
│       ├── BatchActionBar/      #   批量操作条（已选 N 条 → 删除/改状态）
│       └── ColumnSettingModal.tsx
│
├── components/                  # 通用组件（无业务语义）
│   ├── Authority/index.tsx      #   按钮级权限（无权限不渲染，可传 fallback）
│   ├── Authority/__tests__/
│   ├── Field/index.tsx          #   字段级权限（无权限默认显示 ***）
│   ├── ErrorBoundary/           #   类组件边界 + fallback UI + 上报
│   ├── RouteErrorFallback.tsx   #   路由 errorElement 兜底（路由元素抛错时接管）
│   └── MessageCenter/index.tsx  #   顶栏铃铛 + Badge + Drawer + 四 Tab
│
├── store/                       # Zustand（只持久化 token / 局部 UI 偏好）
│   ├── user.ts / app.ts / message.ts
├── services/                    # 接口封装，按域分文件
│   ├── user.ts / employee.ts / dashboard.ts / workflow.ts / message.ts
├── mock/                        # axios-mock-adapter 各域 mock（22 个接口）
│   ├── index.ts                 #   setupMock 出口，delayResponse 350
│   ├── _shared.ts               #   1 万条员工数据单例生成器 + 部门/职位常量
│   ├── users.ts                 #   4 套账号 + 角色三级权限表
│   ├── employees.ts / dashboard.ts / workflow.ts / message.ts / sso.ts
├── utils/                       # 工具层（见 §3.2）
├── i18n/                        # i18next 初始化 + zh/en 资源
├── constants/index.ts           # 角色 / 权限码 / 字段码 / 存储键 / SSO 常量
└── types/index.ts               # 全局类型与接口契约
```

### 3.1 员工页为什么要拆 hook

`pages/employee/index.tsx` 是全项目最重的页面（表格 + 筛选 + 批量 + 列设置 + 导出 + 弹窗）。
它现在只剩「装配」，逻辑按职责切成了 5 个页面私有 hook：

| hook                   | 职责                                       |
| ---------------------- | ------------------------------------------ |
| `useEmployeeTable`     | 取数、loading、筛选字典、reload             |
| `useTableFilter`       | 列筛选状态 + 与表格 onChange 的衔接         |
| `useColumnSettings`    | 列显隐/顺序 + localStorage 持久化           |
| `useBatchSelection`    | 勾选态、rowSelection、清空                  |
| `useEmployeeExport`    | 全量/选中导出（含敏感字段脱敏）             |

**约定**：只有这一个页面用的逻辑，放 `pages/<页>/hooks/`；跨页面才提到 `src/components/`。

### 3.2 工具层清单

| 文件                     | 职责                                                       |
| ------------------------ | ---------------------------------------------------------- |
| `request.ts`             | axios 实例 + 拦截器 + 统一解包 + mock 注入 + 401 事件       |
| `permission.ts`          | 权限判定纯函数（`hasMenu` / `hasButton` / `hasField`）      |
| `desensitize.ts`         | 敏感字段 → 字段权限码的单一映射，表格与导出共用              |
| `storage.ts`             | localStorage 封装，全部 try/catch                           |
| `format.ts`              | 数字 / 金额 / 日期格式化                                    |
| `export.ts`              | 看板导出 PNG / PDF / Excel（重依赖全部动态 import）          |
| `employeeCsv.ts`         | 员工列表 CSV 导出（带脱敏）                                  |
| `excel.worker.ts`        | Worker 内解析 xlsx/csv 骨架                                  |
| `excelParser.ts`         | 主线程侧 Worker 通信封装 + 模板下载                          |
| `excelValidate.ts`       | 逐行校验 + 错误行收集                                        |
| `errorMonitor.ts`        | `reportError` + `initGlobalErrorCapture`（onerror / unhandledrejection） |
| `track.ts`               | 埋点 SDK：PV/UV、点击委托、曝光、FCP/LCP/TTI                  |

---

## 4. 工程化规范

### 4.1 TypeScript ✅

`tsconfig.json` 关键项：

| 选项                       | 值      | 说明                                     |
| -------------------------- | ------- | ---------------------------------------- |
| `strict`                   | `true`  | 基础红线                                  |
| `noUnusedLocals`           | `true`  | **已开**，开发期也不许留死变量             |
| `noUnusedParameters`       | `true`  | **已开**                                  |
| `noFallthroughCasesInSwitch` | `true` | switch 不许穿透                          |
| `isolatedModules`          | `true`  | 为 esbuild/rolldown 的逐文件转译做准备     |
| `noEmit`                   | `true`  | 构建交给 Vite，tsc 只做检查                |
| `moduleResolution`         | `bundler` | 对齐 Vite 的解析方式                     |
| `paths`                    | `@/* → ./src/*` | 与 `vite.config.ts` 的 alias 双向同步 |

- 禁止 `any`（lint 里降为 warn 兜底，CR 层面按红线处理；确需时用 `unknown` + 类型守卫）。
- 接口响应一律定义类型，统一放 `types/index.ts`。

### 4.2 ESLint ✅

`eslint.config.js` 是 flat config，几处**刻意为之**、别当成配置疏漏：

- `files: ['**/*.{js,jsx,ts,tsx}']` —— TS 文件在检查范围内（这是本项目早期修过的一个 bug：只配了 js/jsx，
  等于 `npm run lint` 从来没检查过源码）。
- `ignores: ['src/router/index.tsx']` —— 该文件同时导出 `router` 配置对象和一个组件，
  是 `createBrowserRouter` 的标准写法，不适用 react-refresh「文件只导组件」的约束，单独豁免。
- `globalIgnores`: `dist`、`node_modules`、`scripts/**`（一次性校验脚本）、`*.config.js`。
- **react-hooks 7.x 的 React Compiler 系列规则显式关掉 14 条**（`refs` / `set-state-in-effect` /
  `immutability` / `purity` …）。项目没启用 React Compiler，这些规则会把「latest-ref」「effect 里拉数据」
  这类业界标准写法误报成 error。只保留经典两条：`rules-of-hooks: error`、`exhaustive-deps: warn`。
- `eslint-config-prettier` 放 extends 最后，压掉与 Prettier 冲突的格式规则。
- `no-unused-vars` / `no-explicit-any` 降为 warn（类型层面已由 tsc + strict 兜住）。
- 实测：74 个文件，0 error 0 warning。

### 4.3 Prettier ✅

`.prettierrc.json`：`singleQuote` / `semi` / `trailingComma: all` / `printWidth: 100` / `tabWidth: 2` / `endOfLine: lf`。

### 4.4 提交钩子 ✅

- `.husky/pre-commit` → `npx lint-staged`
- `.lintstagedrc.json`：
  - `*.{ts,tsx,js,jsx}` → `prettier --write` + `eslint --fix`
  - `*.{css,scss,json,md}` → `prettier --write`

> CI 里所有 job 都设了 `HUSKY: 0`——CI 不提交代码，没必要装 git hooks。

### 4.5 提交规范

按 Conventional Commits 写，实际提交记录长这样：

```
feat: 万级员工表 - 虚拟滚动 + 列设置 + 批量操作
feat: 业务域 - 看板/审批流/消息中心/表单向导/数据导入
feat: 稳定性兜底 + 应用入口 + 项目文档
chore: 补充部署基建 - Dockerfile + nginx + GitHub Actions CI
fix: 去掉 configure-pages 自动开通（GitHub 不允许 GITHUB_TOKEN 创建 Pages 站点）
```

| type     | 含义               |
| -------- | ------------------ |
| feat     | 新功能             |
| fix      | 修复               |
| refactor | 重构（无功能变化） |
| docs     | 文档               |
| test     | 测试               |
| chore    | 构建 / 依赖 / 配置 |

**没装 commitlint**：单人项目，靠自觉 + CI 把关就够了，加一道提交信息校验的收益不足以抵上它的摩擦。

### 4.6 分支策略

单人开发，直接推 `main`，由 CI（推 main + PR 都触发）做质量闸门。
真要协作时再切 `feature/xxx` 从 `main` 拉出、走 PR——`ci.yml` 里 `pull_request` 触发已经配好了。

---

## 5. 状态管理（Zustand）

### 5.1 store 划分（实况）

| store     | 职责                                          | 持久化          | 消费方                                        |
| --------- | --------------------------------------------- | --------------- | --------------------------------------------- |
| `user`    | token / userInfo / permissions / 权限判定 / 登录登出 / SSO 换取 | ✅ **仅 token** | 全局：守卫、布局、权限组件、各业务页           |
| `message` | 消息列表 / 未读数 / 实时订阅                   | 否              | `MessageCenter`                                |
| `app`     | collapsed / theme / primaryColor               | ✅ `bi-app`     | 目前只有 `BiChart` 读 `theme`（暗色适配）      |

> `app` 的 `collapsed` / `primaryColor` 暂时没有消费方（窄屏菜单用的是 `BasicLayout` 内的局部 state）。
> 属于预留，见 §14.2。

### 5.2 user store 的关键设计（照抄别改）

```ts
// src/store/user.ts
hasButton: (code) => checkButton(get().permissions.buttons, code),
hasField:  (code) => checkField(get().permissions.fields, code),
// 菜单判定在 guards.tsx / BasicLayout.tsx 里走 utils/permission.ts 的 hasMenu
```

判定逻辑**不在 store 里**，而是收敛到 `utils/permission.ts` 的三个纯函数，store 只做委托。
好处：守卫、权限组件、CSV 导出、脱敏全都调用同一份规则，且能被单测覆盖（`permission.test.ts`）。

**为什么只持久化 token？**

`persist` 的 `partialize` 只存 `token`，`userInfo` / `permissions` 刷新后由 `fetchProfile()` 从服务器重拉。
这样**权限变更能即时生效**，不会出现「管理员被降权了、本地缓存还是全开」这种越权残留。
配了 `version: 1` + `migrate`，保证旧版本地缓存一定会被丢弃重拉。

配套动作在 `guards.tsx`：`RequireAuth` 检测到「有 token 但内存无 profile」时先 `fetchProfile()` 再放行，
期间显示全屏 `Spin`。

### 5.3 红线

- 禁止在组件里直接 `useUserStore.setState` 改业务数据（走 action）。
- 跨 store 依赖用 `useUserStore.getState()`，不互相 import store 实例。
- 新增权限维度时改 `types/index.ts` 的 `PermissionData`，不要在 store 里临时加字段。

---

## 6. 路由与权限（RBAC）

### 6.1 路由表（`router/index.tsx`）

| 路径            | 布局 | 守卫                                  | 页面            |
| --------------- | ---- | ------------------------------------- | --------------- |
| `/login`        | 无   | —                                     | 登录            |
| `/sso`          | 无   | —                                     | 模拟认证中心    |
| `/login/callback` | 无 | —                                     | SSO 回调换 token |
| `/`             | Home | `RequireAuth`                         | 由子路由决定    |
| `/`（index）    | —    | —                                     | `→ /dashboard`  |
| `/dashboard`    | —    | `Authorized menuKey="dashboard"`      | 看板            |
| `/employee`     | —    | `Authorized menuKey="employee"`       | 员工表          |
| `/import`       | —    | `Authorized menuKey="import"`         | 数据导入        |
| `/workflow`     | —    | `Authorized menuKey="workflow"`       | 审批流          |
| `/form`         | —    | `Authorized menuKey="form"`           | 表单向导        |
| `/403`          | —    | —                                     | 无权限          |
| `*`             | 无   | —                                     | 404             |

**两个实现细节：**

- **页面全部 `React.lazy`**，外面套统一的 `<Suspense fallback={<Spin/>}>`。
  这样 echarts（只在看板用）、excel 解析（只在导入页用）会自动落进各自的 page chunk，不会进首屏。
- **`basename` 从 `import.meta.env.BASE_URL` 推导**：
  ```ts
  const basename = import.meta.env.BASE_URL.replace(/\/$/, '');
  export const router = createBrowserRouter(routes, { basename });
  ```
  根路径部署时 `BASE_URL` 是 `/`，去掉尾斜杠得空串，等价于不设 basename；
  子路径部署（GitHub Pages）时它是 `/datapilot-frontend/`，深链接才能被正确匹配。详见 §12.3。

**为什么权限是包一层 `<Authorized>` 而不是用路由 `meta`？**
react-router 的 route object 不支持自定义元字段参与渲染；包组件最直白，且权限判定只有
`guards.tsx` 一个出口，好改好测。

### 6.2 四级权限模型

| 级别       | 实现                                        | 落到哪一层        | 表现                                              |
| ---------- | ------------------------------------------- | ----------------- | ------------------------------------------------- |
| **路由级** | `RequireAuth`（`guards.tsx`）               | 登录态            | 未登录 → `/login`，并把 `from` 存进 location state |
| **菜单级** | `Authorized` 守卫 + `BasicLayout` 菜单过滤  | 页面              | 无权限进 `/employee` → 跳 403；侧栏也不显示该菜单  |
| **按钮级** | `<Authority code={...}>` + `hasButton()`    | 元素              | 无权限**不渲染**（不是 disabled，是看不见）        |
| **字段级** | `<Field code={...}>` + `hasField()`         | 字段值            | 无权限显示 `***`（默认 fallback）                  |

```tsx
// 渲染期：用组件
<Authority code={PERM.EMP_DELETE}>
  <Button danger>删除</Button>
</Authority>

<Field code={FIELD.SALARY}>{formatMoney(record.salary)}</Field>

// 事件期：再判一次（防绕过）
const onDelete = (id: number) => {
  if (!hasButton(permissions.buttons, PERM.EMP_DELETE)) return;
  ...
};
```

**两层各司其职，不要只用一层**：组件层管"看不看得见"，逻辑层管"调不调得动"——
按钮藏了不代表回调不能被别处调用（批量操作、快捷键、代码里直接调）。

**字段级权限不只服务 UI**：`utils/desensitize.ts` 维护「敏感字段 → 权限码」的单一映射，
表格渲染（`<Field>`）和 CSV 导出（`employeeCsv.ts`）共用它。
**这是刻意的**——否则"哪些字段要脱敏"的知识散落两处，早晚漂移成导出泄漏。

**权限码统一定义**在 `constants/index.ts`：

```ts
export const PERM = {
  EMP_EXPORT: 'employee.export', EMP_IMPORT: 'employee.import',
  EMP_ADD: 'employee.add', EMP_EDIT: 'employee.edit', EMP_DELETE: 'employee.delete',
  WF_APPROVE: 'workflow.approve', WF_REJECT: 'workflow.reject', WF_SUBMIT: 'workflow.submit',
} as const;

export const FIELD = { SALARY: 'salary', IDCARD: 'idCard' } as const;
```

### 6.3 角色 → 权限（`mock/users.ts`）

| 账号       | 角色   | menus                          | buttons                                                     | fields        |
| ---------- | ------ | ------------------------------ | ----------------------------------------------------------- | ------------- |
| `admin`    | 管理员 | `*`                            | `*`                                                         | `*`           |
| `manager`  | 主管   | dashboard, employee, import, workflow, form | export, import, add, edit, delete, approve, reject | salary      |
| `finance`  | 财务   | dashboard, employee, import, workflow | export, import, approve                              | salary, idCard |
| `employee` | 员工   | dashboard, workflow, form      | submit                                                      | —             |

密码统一 `123456`。登录页提供一键填充，四个账号切一遍就能直观看到四级权限的差异。

### 6.4 菜单渲染

`router/menus.tsx` 的 `MENU_CONFIG` 是唯一菜单源，`key` 必须等于 mock 里 `permissions.menus` 的权限码。

```ts
// 纯函数，抽出来是为了能单测（menus.test.ts）
export function filterMenusByPermission(menus, permissionKeys) {
  if (permissionKeys.includes('*')) return menus;
  return menus.filter((m) => permissionKeys.includes(m.key));
}
```

`BasicLayout` 用它算 `visibleMenus`，`Authorized` 用 `hasMenu` 拦直接输 URL 的情况。
**「看不到 = 进不去」，两边都拦。**

---

## 7. 请求层（axios）

### 7.1 统一响应结构

```ts
interface BaseResponse<T = unknown> {
  code: number; // 0 成功，非 0 业务错误
  data: T;
  message: string;
}
```

### 7.2 已实现要点（`src/utils/request.ts`）

- **实例**：`baseURL = import.meta.env.VITE_API_BASE_URL || '/api'`，`timeout = 15000`。
- **请求拦截**：从 storage 取 token，注入 `Authorization: Bearer <token>`。
- **响应拦截**：
  - `code === 0` → **直接返回 `body.data`**（业务层拿到的是解包后的数据）
  - `code === 401 || 40100` → 报错 + 清 token + **派发 `auth:expired` 事件**
  - 其他非 0 → 报错 + reject
  - 网络异常 → 报错 + reject
- **导出**：`api.get/post/put/del` 四个泛型方法，类型标注为 `Promise<T>`。

### 7.3 错误提示为什么要绕一圈（`bindMessageError`）

antd 6.6 起静态 `message.xxx` 已弃用（拿不到主题上下文）。请求层是**非组件模块**，
用不了 `App.useApp()`，所以做了个最小桥接：

```ts
// request.ts：暴露一个可绑定的提示函数，未注入前是空实现
let showError = () => undefined;
export function bindMessageError(fn) { showError = fn; }

// App.tsx：在 <AntApp> 内把 App.useApp().message 注进去
function MessageBridge() {
  const { message } = AntApp.useApp();
  bindMessageError((content) => void message.error(content));  // 注意：render 期赋值，不放 useEffect
  return null;
}
```

**为什么放在 render 期而不是 `useEffect`？** 因为 `bindMessageError` 只是幂等的模块变量赋值，
放 effect 会让「首次 render 完成前就已发出的请求」的报错被空实现静默吞掉。

### 7.4 401 为什么不用 `location.href`

请求层不直接跳转，而是派发事件，由 `App.tsx` 用 `router.navigate` 做 SPA 内跳转：

```ts
export const AUTH_EXPIRED_EVENT = 'auth:expired';
// 请求层：window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT))

// App.tsx
const onExpired = () => {
  if (router.state.location.pathname !== '/login') {
    router.navigate('/login', { replace: true });
  }
};
```

两个理由：

1. `location.href` 会整页刷新，丢掉 SPA 内存态；
2. **子路径部署时 `location.href='/login'` 会跳错**——站点在 `/datapilot-frontend/` 下，
   根路径的 `/login` 根本不存在。`router.navigate` 会自动带上 basename。

另外加了「不在登录页才跳」的判断，防止登录页自身 401 时死循环。

### 7.5 三个容易踩的坑

1. **不要在业务里再拆一层 `res.data`**——拦截器已经解包，`api.get<T>()` 拿到的就是 `T`。
2. **mock 匹配的是 `config.url`，不是拼上 baseURL 的完整地址**。注册 `'/user/login'` 就能命中
   `baseURL=/api` + `url=/user/login` 的请求；**不要**在 mock 里写 `/api/user/login`，匹配不上。
3. **`api` 的四个方法返回的是 `Promise<T>`，不是 `AxiosResponse`**。写 `await` 之后直接就是数据。

---

## 8. Mock 方案

**方案：`axios-mock-adapter`**（实例级拦截，不是 MSW / Service Worker）。

| 项       | 现状                                                     |
| -------- | -------------------------------------------------------- |
| 开关     | `VITE_USE_MOCK`（dev `true` / **prod 也是 `true`**，理由见 §2.3） |
| 注入点   | `utils/request.ts` 末尾 `if (VITE_USE_MOCK === 'true') setupMock(request)` |
| 延迟     | `delayResponse: 350`（全局 350ms，模拟真实网络）          |
| 域       | 6 个：users / employees / dashboard / workflow / message / sso |
| 接口数   | **22 个**                                                |
| 数据规模 | 员工 1 万条（`_shared.ts` 单例生成，避免每次请求重新构造） |
| 离线可跑 | ✅ 无后端也能完整演示                                     |

**为什么不用 vite-plugin-mock / MSW？**

- `axios-mock-adapter` 挂在 **axios 实例**上，和请求层天然同源，零额外进程、零 SW 注册、零构建插件。
- 代价：只拦 axios，拦不住 `fetch` / `<img>` / SSE。**约定：项目内所有请求必须走 `api`**。

**新增一个 mock 的姿势**：

1. 在 `src/mock/<域>.ts` 里写 `mock.onGet/onPost('/xxx')`（**不带 `/api` 前缀**），统一返回 `{ code, data, message }`。
2. 在 `src/mock/index.ts` 的 `setupMock` 里注册该域（新文件才需要这步）。
3. 同步更新 `src/services/<域>.ts` 与 `src/types/index.ts`——三者必须一起改，否则类型对不上。

**实时消息怎么模拟的**：mock 撑不起 SSE 长连接，所以 `store/message.ts` 用
`setInterval`（8 秒一条，数据源 `mock/message.ts` 的 `genRealtimeMessage()`）模拟推送，
并留了 `startSubscribe / stopSubscribe` 开关，`MessageCenter` 挂载时开启、卸载时关闭。
生产替换成 `EventSource` 即可，业务层零改动。

---

## 9. 接口契约（与 mock 严格一致）

> 下表 URL 均省略 `baseURL`（`/api`）。字段定义见 `src/types/index.ts`。

### 认证与权限（4）

| 方法 | URL                 | 返回类型         | 说明                              |
| ---- | ------------------- | ---------------- | --------------------------------- |
| POST | `/user/login`       | `LoginRes`       | 4 套角色账号，密码均为 `123456`    |
| GET  | `/user/info`        | `UserInfo`       | 按 Bearer token 返回用户信息       |
| GET  | `/user/permissions` | `PermissionData` | **菜单/按钮/字段三级权限的唯一来源** |
| POST | `/user/logout`      | `boolean`        | —                                 |

### SSO（2）

| 方法 | URL           | 返回类型          | 说明                                        |
| ---- | ------------- | ----------------- | ------------------------------------------- |
| POST | `/sso/login`  | `{ code: string }` | 模拟认证中心签发**一次性 authorization code** |
| POST | `/sso/token`  | `LoginRes`        | `code + client_id` 换业务 token              |

### 员工（8）

| 方法 | URL                   | 返回类型               | 说明                                |
| ---- | --------------------- | ---------------------- | ----------------------------------- |
| POST | `/employee/list`      | `PageResult<Employee>` | 分页 + 多列筛选，1 万条数据          |
| POST | `/employee/all`       | `Employee[]`           | 全量（供导出用）                     |
| POST | `/employee/add`       | `{ id: number }`       | 入职表单提交                        |
| POST | `/employee/import`    | `{ imported: number }` | 批量导入（body `{ rows }`）          |
| POST | `/employee/update`    | `boolean`              | 单条更新                            |
| POST | `/employee/delete`    | `{ deleted: number }`  | 批量删除（body `{ ids }`）           |
| POST | `/employee/batchUpdate` | `{ updated: number }` | 批量改字段（body `{ ids, patch }`）  |
| GET  | `/employee/options`   | `EmployeeOptions`      | 部门/职位字典，表单向导联动用        |

### 看板（1）

| 方法 | URL                  | 返回类型           | 说明                          |
| ---- | -------------------- | ------------------ | ----------------------------- |
| GET  | `/dashboard/summary` | `DashboardSummary` | 支持 `?dept=` 筛选（图表联动） |

### 审批（4）

| 方法 | URL                 | 返回类型               | 说明                                  |
| ---- | ------------------- | ---------------------- | ------------------------------------- |
| POST | `/workflow/list`    | `WorkflowTask[]`       | body `{ tab: 'todo'\|'done'\|'mine' }` |
| GET  | `/workflow/detail`  | `WorkflowTask \| null` | 支持 `?id=`，含节点时间线              |
| POST | `/workflow/approve` | `boolean`              | body `{ id }`                          |
| POST | `/workflow/reject`  | `boolean`              | body `{ id }`                          |

### 消息（3）

| 方法 | URL                | 返回类型        | 说明                        |
| ---- | ------------------ | --------------- | --------------------------- |
| GET  | `/message/list`    | `AppMessage[]`  | todo / notice / system 三类 |
| POST | `/message/read`    | `boolean`       | body `{ id }`               |
| POST | `/message/readAll` | `boolean`       | —                           |

### 关键类型

```ts
interface LoginReq  { username: string; password: string }
interface LoginRes  { token: string; userInfo: UserInfo }

interface UserInfo  { id: string; name: string; username: string; avatar?: string;
                      roles: string[]; permissions: string[] }

interface PermissionData { menus: string[]; buttons: string[]; fields: string[] }  // '*' = 全部

interface PageResult<T> { records: T[]; total: number; current: number; pageSize: number }

interface Employee {
  id: number; name: string; gender: '男' | '女'; dept: string; position: string;
  salary: number; phone: string; email: string; entryDate: string;
  status: '在职' | '试用期' | '离职'; idCard: string; role?: string; attachment?: string;
}

interface WorkflowTask {
  id: string; type: 'leave' | 'reimburse' | 'travel'; title: string; applicant: string;
  amount?: number; status: 'pending' | 'approved' | 'rejected' | 'withdrawn';
  currentNode: string; createdAt: string; nodes: WorkflowNode[];
}
```

---

## 10. UI 规范

### 10.1 入口职责划分（`main.tsx` / `App.tsx`）✅

**不要把它们合并回去**：

- `main.tsx` = 挂到 DOM 上 + 两件一次性的全局初始化（全局异常监听、埋点 init）。不写业务配置。
- `App.tsx` = 全局 Provider 与横切关注点。

```tsx
// main.tsx
initGlobalErrorCapture(); // P1-2 onerror / unhandledrejection
track.init();             // P1-3 埋点：点击委托 + FCP/LCP/TTI
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);

// App.tsx（结构）
<ConfigProvider locale={isEn ? enUS : zhCN} theme={{ token: { colorPrimary: '#1677ff' } }}>
  <AntApp>
    <MessageBridge />              {/* 把 message 注入请求层 */}
    <ErrorBoundary>                {/* 兜住路由之外的渲染异常 */}
      <RouterProvider router={router} />
    </ErrorBoundary>
  </AntApp>
</ConfigProvider>
```

`App.tsx` 里还挂着两件事：**语言切换时同步 `dayjs.locale()`**（否则日期控件语言不跟随），
以及**监听 `auth:expired` 事件做 SPA 内跳转**（见 §7.4）。

**三层错误兜底的分工，别混：**

| 层                    | 覆盖范围                                    |
| --------------------- | ------------------------------------------- |
| `errorElement`（路由级） | 某个路由元素渲染/加载抛错                    |
| `ErrorBoundary`（应用级） | 路由**之外**的渲染异常（App、布局自身）      |
| `initGlobalErrorCapture` | 上面两层都盖不到的：异步回调、未捕获的 Promise rejection |

### 10.2 ⚠️ antd 6 的两个使用要点

1. **本项目用 antd 6，原生支持 React 19，不需要任何 React 19 兼容补丁。**
   （早期曾装过 `@ant-design/v5-patch-for-react-19`，那是给 antd 5 的，**已从依赖中移除**。
   如果哪天回退到 antd 5，才需要重新装它并在入口首行 import。）
2. **静态 `message.xxx` / `notification.xxx` 在 6.6 起弃用**（触达不了主题上下文）。
   组件内用 `App.useApp()`；非组件模块（请求层）走 `bindMessageError` 桥接，见 §7.3。

### 10.3 布局（`BasicLayout`）

- 桌面：`Sider theme="light" width={220}` + Header（消息铃铛 / 语言切换 / 用户下拉）+ `Content <Outlet/>`。
- **窄屏（`screens.lg === false`）：Sider 换成 `Drawer`**，菜单点完自动收起。
  同一份菜单同时给 Sider 与 Drawer 用，避免两处渲染逻辑。
  判定用 `screens.lg === false` 而非 `!screens.lg`——`useBreakpoint` 首帧返回 `undefined`，
  取反会误判成移动端导致首屏布局闪烁。
- 菜单按 `permissions.menus` 过滤，选中态用 `pathToMenuKey(location.pathname)`。
- 暂无面包屑（路由层级浅：一级菜单直达页面，加面包屑只是重复信息）。见 §14.3。

### 10.4 组件分类

| 层                      | 判定标准                    | 例子                                                    |
| ----------------------- | --------------------------- | ------------------------------------------------------- |
| `src/components/`       | 无业务语义，可跨项目复用     | `Authority`、`Field`、`ErrorBoundary`、`MessageCenter`   |
| `src/pages/components/` | 跨页面复用，但带业务上下文   | `BiChart`、`DashboardCard`、`BatchActionBar`、`EmployeeFormModal` |
| `src/pages/x/` 内       | 只有该页用                   | `employee/columns.tsx`、`employee/hooks/*`               |

优先复用 antd，不重复造轮子。

### 10.5 样式

只有**一个** `src/index.css`：全局最小重置 + 字体栈。**其余视觉一律走 antd 主题**（`ConfigProvider` 的 token）。
没有 SASS/LESS——antd 6 的 token + CSS-in-JS 已经够用，多引一套预处理器只会多一份构建配置要维护。

---

## 11. 编码规范

- **命名**：组件 PascalCase；hook `useXxx`；常量 `UPPER_SNAKE`；文件与默认导出组件同名。
  store 类型 `XxxState`；mock 出口函数 `xxxMock(mock)`。
- **类型**：props 必须显式 interface；事件处理 `handleXxx`；面向后端的契约类型放 `types/index.ts`。
- **权限**：一律用 `PERM` / `FIELD` 常量；渲染期用组件、事件期用方法（见 §6.2）。
- **存储**：所有 localStorage 走 `utils/storage`（自带 try/catch，防隐私模式/超配额崩溃），
  key 统一登记在 `STORAGE_KEYS`。
- **性能**：路由级 `lazy` 分包；列表 `useMemo` 包 `columns`；重依赖（echarts/xlsx/jspdf/html2canvas）
  函数内 `await import()`；大量数据计算丢 Web Worker。
- **注释**：只在「为什么」写注释，不写「做了什么」。
  （`store/user.ts` 解释"为什么只持久化 token"、`request.ts` 解释"为什么不用 location.href" 是合格示范。）

---

## 12. 构建与部署

### 12.1 构建

- `npm run build` → `dist/` 静态产物。
- `chunkSizeWarningLimit: 1000`；`server.host: true`（局域网可访问）。
- `manualChunks` 只钉两个 chunk：`react-core`（react/react-dom/scheduler）与 `echarts`（含 zrender）。
  **antd 重组件故意不合并**，交给 rolldown 按页面自动分包——合并反而会让登录页多下载用不到的 UI。
- 体积分析：`ANALYZE=1 npm run build`（Windows PowerShell 用 `$env:ANALYZE=1; npm run build`），
  额外产出 `dist/stats.html`。

### 12.2 Docker + nginx

多阶段构建，最终镜像只有静态文件 + nginx：

| 阶段   | 基础镜像              | 作用                                |
| ------ | --------------------- | ----------------------------------- |
| builder | `node:22-alpine`     | 装依赖 + `vite build`，产出 `dist/`  |
| runner  | `nginx:stable-alpine` | 只接 `dist/`，对外提供静态服务       |

> 先 COPY 依赖清单再 COPY 源码，是为了让"装依赖"这一层能被 Docker 缓存复用——
> 只改业务代码时不会重新 `npm ci`。

```bash
docker build -t datapilot-frontend .
docker run -d -p 8080:80 --name datapilot datapilot-frontend
```

`nginx.conf` 里几个关键点：

- **SPA 回退**：`try_files $uri $uri/ /index.html;` —— 少了这行，直接访问 `/employee` 会 404。
- **缓存策略**：`/assets/` 是带 hash 的产物，可以 `immutable` 缓存一年；`index.html` 必须 `no-cache`，
  否则发版后用户拿到旧壳子。
- **gzip**：JS / CSS / JSON / SVG。
- **反向代理预留**：接真实后端时打开文件末尾 `/api/` 那段注释。

### 12.3 CI / CD（`.github/workflows/ci.yml`）

三个 job：

```
quality（类型检查 → ESLint → 单测 → 生产构建 → 上传 artifact）
  ├── docker（构建镜像 → 起容器 → 冒烟测试：首页 200 / SPA 回退 / 缓存头）
  └── deploy-pages（仅 push main：构建 → 生成 404.html → 发布 GitHub Pages）
```

Docker 冒烟测试是真的把容器跑起来验三件事，所以它能证明 `Dockerfile` 与 `nginx.conf` **真的可用**，
而不只是"能 build 出来"。

**CD 到 GitHub Pages（子路径部署）——三个必须一起做的动作：**

1. **`--base` 覆盖**：`npm run build -- --base=/datapilot-frontend/`
   项目站点挂在 `https://<user>.github.io/<repo>/` 下，不改 base 的话产物里写死的 `/assets/*.js` 会 404、白屏。
   > 注意写法：Vite 的 config 文件会先被 bundle 再执行，**读不到 shell 注入的 `process.env.VITE_BASE_PATH`**，
   > 所以只能走 CLI 参数，不能靠环境变量。
2. **`cp dist/index.html dist/404.html`**：Pages 没有 nginx 的 `try_files`，
   直接访问 `/datapilot-frontend/employee` 会真 404。复制一份让 404 也回到 SPA 入口。
3. **`basename`**：`router/index.tsx` 把 `BASE_URL` 交给 React Router（见 §6.1），深链接才匹配得上。

**一个做不了的事**：`actions/configure-pages` 的 `enablement: true` **无法**自动创建 Pages 站点
（会报 `Resource not accessible by integration`——GitHub 只允许 token 往已存在的站点发布，
不允许创建）。所以首次发布前必须手动做一次：
**仓库 `Settings → Pages → Build and deployment → Source` 选 `GitHub Actions`**。

在线地址：**https://xiyouxyxy.github.io/datapilot-frontend/**

---

## 13. 质量保障

| 项                | 状态                                                          |
| ----------------- | ------------------------------------------------------------- |
| TypeScript 严格模式 | ✅ `strict` + `noUnusedLocals` + `noUnusedParameters`        |
| ESLint            | ✅ 74 文件 0 error 0 warning，已接入 pre-commit               |
| Prettier          | ✅ 接入，`format:check` 可在 CI 用                            |
| 提交钩子          | ✅ husky + lint-staged（`pre-commit` → `npx lint-staged`）     |
| 单元测试          | ✅ Vitest 5，**4 文件 / 23 用例全绿**                          |
| 渲染异常兜底      | ✅ ErrorBoundary（应用级）+ RouteErrorFallback（路由级）        |
| 全局异常监听      | ✅ `onerror` + `unhandledrejection` → `reportError`            |
| 埋点 / 性能观测   | ✅ PV/UV + 点击委托 + 曝光 + FCP/LCP/TTI                        |
| CI                | ✅ 3 个 job（质量 / Docker 冒烟 / 发布）                        |
| CD                | ✅ GitHub Pages 自动发布                                       |

**测试覆盖了哪些**（都是纯逻辑，不碰 DOM 渲染细节）：

| 文件                            | 用例 | 覆盖                                        |
| ------------------------------- | ---- | ------------------------------------------- |
| `utils/__tests__/permission.test.ts` | 6 | 三级权限判定 + `'*'` 通配                    |
| `utils/__tests__/format.test.ts`     | 7 | 数字/金额/日期/趋势文案                      |
| `router/__tests__/menus.test.ts`     | 6 | 菜单按权限过滤（含 admin 全开）              |
| `components/Authority/__tests__/`    | 4 | 有/无权限时渲染 children 还是 fallback      |
| 合计                                 | **23** | 权限与格式化是全项目的横向依赖，优先覆盖 |

> 组件测试默认跑在 `node` 环境（`vite.config.ts` 的 `test.environment`），
> 需要 DOM 的用例在文件头写 `// @vitest-environment jsdom` 单独声明。

---

## 14. 已知问题与取舍

坦白列出目前不完美的地方——写清"是什么、为什么暂时不动"：

### 14.1 `@tanstack/react-virtual` 是死依赖

`package.json` 里有它，`src/` 零引用（虚拟滚动走 antd Table 原生 `virtual`）。
属于早期评估阶段的残留。**建议移除**：`npm uninstall @tanstack/react-virtual`。
留在那里会误导后来人以为项目的虚拟滚动是自己实现的。

### 14.2 `store/app.ts` 有两个字段没有消费方

`collapsed` / `setPrimaryColor` 目前没人用（窄屏菜单用的是 `BasicLayout` 内的局部 state，
主题色还硬编码在 `App.tsx` 的 `ConfigProvider` token 里）。只有 `theme` 被 `BiChart` 消费。
留着是为了将来接「主题切换 / 可折叠侧栏」时不用回头改 store 结构。属于**有意预留**，不是 bug。

### 14.3 没有面包屑

路由层级是一级菜单直达页面，"首页 > 员工管理"这种面包屑提供不了额外信息。
真出现二级/三级页面时再加。

### 14.4 `playwright-core` 在 devDependencies 里但 `src/` 不用它

它服务于 `scripts/` 下那些一次性强校验脚本（puppeteer/playwright 驱动的端到端自查），
而 `scripts/` 已 gitignore、不进仓库。所以这个依赖在仓库视角看是孤立的。
保留理由：本地重跑那些自查脚本还需要它。如果要求仓库绝对干净，可以删掉、需要时再装。

### 14.5 端口固定 5173 同时 `host: true`

为局域网手机调移动端适配方便。如果 5173 被占，Vite 会自动 +1。

---

## 附录 A：常用命令速查

```bash
npm install              # 装依赖（会顺带跑 husky）
npm run dev              # 开发（mock 开启）
npm run build            # 生产构建
npm run preview          # 预览产物
npm run typecheck        # 类型检查
npm run lint             # ESLint
npm run format           # Prettier 写入
npm run test             # 单元测试
npm run build -- --base=/datapilot-frontend/   # 子路径部署构建（GitHub Pages 用）
ANALYZE=1 npm run build  # 构建 + 体积分析（产出 dist/stats.html）
```

## 附录 B：FAQ

**Q：切真后端要改多少？**
A：只改 `.env.production` 的 `VITE_API_BASE_URL`，并把 `VITE_USE_MOCK` 设为 `false`，
再打开 `nginx.conf` 末尾的 `/api` 反向代理。业务代码零改动。

**Q：mock 和真实接口字段不一致怎么办？**
A：以 `src/types/index.ts` 为准，双方对齐契约，不一致即 bug。

**Q：mock 写了但请求 404 / 没被拦到？**
A：见 §7.5 第 2 条——mock 的 path 不能带 `/api` 前缀；另外确认该域已在 `mock/index.ts` 的 `setupMock` 里注册。

**Q：登录后刷新页面，权限没恢复？**
A：`RequireAuth` 会自动 `fetchProfile()` 重拉。如果一直卡在 loading，检查 `/user/info` 是否返回 `40100`
（mock 里 token 表是内存的，重启 dev server 后旧 token 会失效，属预期）。

**Q：请求报错但页面上看不到提示？**
A：检查 `App.tsx` 里的 `MessageBridge` 是否在渲染。它是请求层拿到 antd `message` 的唯一通道（见 §7.3）。

**Q：为什么线上 Demo 不连真实后端却也不白屏？**
A：因为 `.env.production` 里 `VITE_USE_MOCK=true`（见 §2.3）。改成 `false` 且没有后端，就会白屏。

**Q：为什么我用 antd 6 的写法报错，网上教程是 antd 5 的？**
A：注意版本差异。本项目 **antd 6.x**，`theme.token` 等 API 基本兼容，
但静态 `message` / `notification` 已弃用、部分组件废弃属性已移除，优先查 antd 6 官方文档。

**Q：子路径部署后页面白屏 / 深链接 404？**
A：三件套是否齐（§12.3）：`--base` 覆盖了没、`404.html` 复制了没、`basename` 生效没。
