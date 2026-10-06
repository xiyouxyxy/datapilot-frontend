# DataPilot · 前端开发手册（内部版）

> 适用项目：`new-bi-analysis`（企业内部 BI 分析平台 · 前端）
> 文档定位：团队统一开发规范，新人照此即可上手；亦作为代码评审（CR）依据。
> 维护人：前端组　版本：v1.2　最后更新：2026-09-11
>
> **v1.1 对齐说明**：本文档已逐行核对 `package.json` 与 `src/` 实际代码，修正了 v1.0（2026-08-26）中
> 与实现不符的技术栈描述（antd 5→6、Mock 方案、图表库、TS 版本）。凡标 **[待接入]** 的条目，
> 表示规范已定但代码尚未落地，不要误以为是现状。
>
> **v1.2 更新**：入口已拆成 `main.tsx`（挂载）+ `App.tsx`（Provider）；新增 `pages/home`、
> `components/Authority`、`components/Field`、`pages/employee`。§3 目录树与 §10.1 已同步。

---

## 0. 文档导航

| 章节         | 内容                            | 何时看            | 落地状态           |
| ------------ | ------------------------------- | ----------------- | ------------------ |
| 1 项目概述   | 定位、技术栈、红线              | 入职第一天        | 定稿               |
| 2 环境准备   | Node / 脚本 / 环境变量          | 拉代码后          | ✅ 可用            |
| 3 目录结构   | 约定目录树与各层职责            | 新建文件前        | ✅ 骨架就位        |
| 4 工程化规范 | TS / ESLint / 别名 / 提交       | 提交代码前        | ⚠️ 部分待接入      |
| 5 状态管理   | Zustand store 划分与红线        | 写 store 时       | ✅ 3 个 store 就位 |
| 6 路由与权限 | react-router v7 + 三级权限      | 加页面 / 加菜单时 | ✅ 路由级就位      |
| 7 请求层     | axios 封装 + 错误码 + mock 开关 | 调接口时          | ✅ 可用            |
| 8 Mock 方案  | axios-mock-adapter 全量 mock    | 联调前            | ✅ 15 个接口全覆盖 |
| 9 接口契约   | 全部 REST 接口清单              | 前后端对齐时      | ✅ 与 mock 一致    |
| 10 UI 规范   | antd 6 配置 / 布局 / 暗坑       | 写组件时          | ✅ 可用            |
| 11 编码规范  | 命名 / 类型 / 性能              | 写任何代码时      | 定稿               |
| 12 构建部署  | 产物 / 静态托管                 | 提测 / 上线时     | 定稿               |
| 13 质量保障  | lint / 测试 / 错误边界          | release 前        | ⚠️ 大部分待接入    |
| 附录         | 命令 / FAQ                      | 踩坑时            | —                  |

---

## 1. 项目概述

### 1.1 定位

面向**企业内部**的 BI 分析平台，核心场景：登录鉴权 → 权限控制的数据看板 → 万级明细表格 → 复杂录入表单 → 审批流 → 消息中心。强调**复杂表单、大数据表格、可视化看板、严格权限**四大能力。

### 1.2 技术栈（已定稿 · 版本号取自 `package.json`）

| 分类       | 选型（实装版本）                                              | 理由                                      |
| ---------- | ------------------------------------------------------------- | ----------------------------------------- |
| 语言       | **TypeScript 7.0.2**（`strict: true`）                        | JD 明确要求；类型即文档                   |
| 构建       | **Vite 8.2.0**                                                | 启动 / HMR 极快，配置简单                 |
| 框架       | **React 19.2.8**                                              | —                                         |
| UI         | **Ant Design 6.6.3** + `@ant-design/icons` 6 + **dayjs** 1.11 | ToB 组件最全，主题/表单/表格开箱即用      |
| 路由       | **react-router-dom 7.18**（library 模式）                     | 标准方案，与 Vite 解耦，不引入 SSR 复杂度 |
| 状态       | **Zustand 5.0**（+ `persist`）                                | 轻量、无 Provider 嵌套，API 简洁易讲      |
| 请求       | **axios 1.20** + 拦截器                                       | 通用、可 mock、可切真后端                 |
| 数据       | **axios-mock-adapter 2.1**                                    | 实例级拦截，业务代码零侵入                |
| 图表       | **echarts 6.1**（裸用）                                       | 看板可视化                                |
| 大数据表格 | **@tanstack/react-virtual 3.14**（配 antd Table）             | 万级行虚拟滚动                            |
| 表格导出   | **xlsx 0.18** + **file-saver 2.0**                            | Excel 导入导出                            |
| 工程化     | ESLint 10 + typescript-eslint                                 | 团队一致性                                |

> ⚠️ **三个"装了但还没用"的依赖**：`echarts`、`@tanstack/react-virtual`、`xlsx` + `file-saver`
> 已在 `package.json` 中，但 `src/` 里**零引用**，属于为需求卡 P0-2 / P0-4 / P0-7 预埋的弹药。
>
> ⚠️ `@ant-design/v5-patch-for-react-19` 也装着，但**这是给 antd 5 用的**，本项目用 antd 6，
> 该补丁未被 `main.tsx` 引入，属于历史残留，可从依赖里移除（见 §10.2）。

### 1.3 关键约束（红线）

- 不引入 Redux / MobX / Saga；状态一律走 Zustand。
- 不引入 Umi / Next；纯 Vite SPA。
- 业务代码**不得直接耦合 mock**；通过 `VITE_USE_MOCK` 环境变量切换。
- 所有接口返回统一 `BaseResponse<T>`，由请求层拦截器解包。

---

## 2. 环境准备

### 2.1 前置

- Node：`>= 20`（推荐 20 LTS）
- 包管理：npm（锁文件 `package-lock.json` 入仓）

### 2.2 安装与脚本（`package.json` 实况）

```bash
npm install            # 安装依赖
npm run dev            # 本地开发（默认走 mock，默认端口 5173）
npm run build          # 生产构建 → dist/
npm run preview        # 预览构建产物
npm run lint           # ESLint 检查
```

> **注意**：目前**没有** `test` / `prepare`（husky）脚本，也没有 `format` 脚本。
> 详见 §4.2 与 §13 的待接入说明。

### 2.3 环境变量（`.env` 系列）

| 文件               | 用途 | 关键变量                                        |
| ------------------ | ---- | ----------------------------------------------- |
| `.env`             | 默认 | `VITE_APP_TITLE=DataPilot`                      |
| `.env.development` | 开发 | `VITE_API_BASE_URL=/api`、`VITE_USE_MOCK=true`  |
| `.env.production`  | 生产 | `VITE_API_BASE_URL=/api`、`VITE_USE_MOCK=false` |

读取方式：`import.meta.env.VITE_API_BASE_URL`（Vite 只暴露 `VITE_` 前缀变量）。

---

## 3. 目录结构

```
src/
├── main.tsx                 # ✅ 挂载入口：reset.css + createRoot，仅此而已
├── App.tsx                  # ✅ ConfigProvider（zh_CN + 主色）+ RouterProvider + dayjs
├── router/                  # ✅ 路由表 + 守卫
│   ├── index.tsx            #    createBrowserRouter 配置（7 条路由）
│   ├── guards.tsx           #    RequireAuth（登录态）+ Authorized（菜单级权限）
│   └── menus.tsx            #    MENU_CONFIG + pathToMenuKey
├── layouts/                 # ✅ 布局
│   └── BasicLayout.tsx      #    侧边栏（按权限过滤菜单）+ 顶栏 + 内容区
├── pages/                   # 🟡 页面
│   ├── home/index.tsx       #    ✅ 受保护主页壳：RequireAuth + BasicLayout
│   ├── login/index.tsx      #    ✅ 完整（表单校验 + 4 套角色快速登录）
│   ├── employee/index.tsx   #    ✅ 员工管理：分页表格 + 按钮/字段权限
│   ├── dashboard/index.tsx  #    ⬜ 占位，待接 P0-4 看板
│   ├── 403.tsx / 404.tsx    #    ✅ 完整
│   └── placeholder/index.tsx#    ✅ 通用占位组件
├── components/              # ✅ 通用组件（目录已创建）
│   ├── Authority/           #    ✅ P0-1 按钮级权限（无权限不渲染，可传 fallback）
│   ├── Field/               #    ✅ P0-1 字段级权限（无权限默认显示 ***）
│   ├── VirtualTable/        #    ⬜ P0-2 虚拟滚动表格（当前是 antd Table 普通分页）
│   ├── BiChart/             #    ⬜ P0-4 ECharts 二次封装
│   ├── ErrorBoundary/       #    ⬜ P1-2
│   └── DashboardCard/       #    ⬜ P0-4
├── store/                   # ✅ Zustand
│   ├── user.ts              #    token / userInfo / permissions + 权限判定
│   ├── app.ts               #    主题 / 主色 / 侧栏折叠
│   └── message.ts           #    消息列表 / 未读数 / 实时订阅
├── services/                # ✅ 接口层（按域分文件）
│   ├── user.ts / employee.ts / dashboard.ts / workflow.ts / message.ts
├── mock/                    # ✅ Mock 数据（axios-mock-adapter）
│   ├── index.ts             #    setupMock 出口，350ms 延迟
│   ├── _shared.ts           #    1 万条员工数据生成器（单例）+ 部门/职位常量
│   ├── users.ts             #    4 套角色账号 + 三级权限表
│   ├── employees.ts / dashboard.ts / workflow.ts / message.ts
├── types/index.ts           # ✅ 全局 TS 类型 / 接口契约类型
├── utils/                   # ✅ request / storage / format
└── constants/index.ts       # ✅ 角色 / 权限码 / 存储键
```

**约定**：

- 页面内私有组件放 `pages/xxx/components/`；跨页面复用的放 `src/components/`。
- 新增业务页面前，先在 `router/menus.tsx` 登记菜单，再到 `router/index.tsx` 加路由。
- 受保护页面必须包在 `<Authorized menuKey="xxx">` 里，`menuKey` 取 `MENU_CONFIG` 的 key。

> **两个习惯性写法，照抄**（`pages/employee/index.tsx` 是范本）：
>
> 1. **渲染期用组件、事件期用方法**。表格列里用 `<Field code={FIELD.SALARY}>` 包住薪资，
>    操作按钮用 `<Authority code={PERM.EMP_DELETE}>` 包住——这是**渲染期**权限，
>    组件订阅了 `permissions` 数组，权限变化会重渲染。
>    而 `onDelete` 回调里再调一次 `hasButton(PERM.EMP_DELETE)` 做**逻辑层双保险**——
>    这是**事件期**权限，防止按钮被绕过（比如快捷键触发、代码里直接调用）。
>    两层各司其职，不要只用一层。
> 2. **`columns` 用 `useMemo` 包**，否则每次渲染都会重建列定义，antd Table 会做无谓的 diff。

---

## 4. 工程化规范

### 4.1 TypeScript ✅

- `tsconfig.json` 已开 `strict: true`、`noFallthroughCasesInSwitch: true`、`isolatedModules: true`。
- 禁止 `any`（CR 红线，确需时用 `unknown` + 类型守卫）。
- 接口响应一律定义类型，统一存于 `types/index.ts`。
- `noUnusedLocals` / `noUnusedParameters` 当前为 `false`，允许开发期留桩，**提测前应打开**。

### 4.2 ESLint / Prettier ⚠️

- ✅ ESLint 10 已配置（`eslint.config.js`，flat config），含 `typescript-eslint`、`react-hooks`、`react-refresh`。
- ⬜ **Prettier 未接入**；husky / lint-staged / commitlint 均**未安装**。
- 现状：`npm run lint` 需手动执行，**提交时不会自动拦截**。

> **待接入清单（P1 工程化补课）**：
>
> ```bash
> npm i -D prettier eslint-config-prettier husky lint-staged @commitlint/cli @commitlint/config-conventional
> npx husky init
> # package.json 加 prepare 脚本 + lint-staged 配置
> ```

### 4.3 路径别名 ✅

- `@` → `src`，已在 **两处**同步配置：
  - `vite.config.ts` 的 `resolve.alias`
  - `tsconfig.json` 的 `compilerOptions.paths`
- 禁止相对路径跨层 `../../`（用 `@/...`）。

### 4.4 提交规范（commitlint）⬜ 待接入

规范先行，接入后按此执行：

| type     | 含义               |
| -------- | ------------------ |
| feat     | 新功能             |
| fix      | 修复               |
| refactor | 重构（无功能变化） |
| docs     | 文档               |
| test     | 测试               |
| chore    | 构建/依赖          |

示例：`feat(employee): 万级表格虚拟滚动`

### 4.5 分支策略

- `main`：受保护，仅 PR 合入。
- `feature/xxx`：功能分支，自 `main` 切出。
- 合入需 1 人 CR + 通过 lint。

---

## 5. 状态管理（Zustand）

### 5.1 store 划分（实况）

| store     | 职责                                                 | 持久化          | 状态                   |
| --------- | ---------------------------------------------------- | --------------- | ---------------------- |
| `user`    | token / userInfo / permissions / 权限判定 / 登录登出 | ✅ **仅 token** | ✅ 完整                |
| `app`     | 主题、主色、侧栏折叠                                 | ✅ `bi-app`     | 🟡 state 就绪，UI 未接 |
| `message` | 消息列表 / 未读数 / 实时订阅                         | 否              | 🟡 state 就绪，UI 未接 |

### 5.2 user store 的关键设计（照抄别改）

```ts
// src/store/user.ts —— 权限判定的三个方法
hasButton: (code) => {
  const b = get().permissions.buttons;
  return b.includes('*') || b.includes(code);
},
hasField: (code) => { /* 同构，读 fields */ },
// 菜单判定在 guards.tsx / BasicLayout.tsx 里用 permissions.menus
```

**为什么只持久化 token？**
`persist` 的 `partialize` 只存 `token`，`userInfo` / `permissions` 在刷新后由
`fetchProfile()` 从服务器重拉。这样**权限变更能即时生效**，不会出现"管理员被降权但本地缓存还是全开"。

配套动作：`guards.tsx` 的 `RequireAuth` 检测到「有 token 但内存无 profile」时，
会先 `fetchProfile()` 再放行（期间显示全屏 `Spin`）。

### 5.3 红线

- 禁止在组件里直接 `useUserStore.setState` 改业务数据（走 action）。
- 跨 store 依赖用 `getState()`，不互相 import store 实例。
- 新增权限维度时，改 `types/index.ts` 的 `PermissionData`，**不要在 store 里临时加字段**。

---

## 6. 路由与权限（RBAC）

### 6.1 react-router v7（library 模式）✅

```tsx
// src/router/index.tsx（已实现，节选）
import { createBrowserRouter, Navigate } from 'react-router-dom';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: (
      <RequireAuth>
        <BasicLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      {
        path: 'dashboard',
        element: (
          <Authorized menuKey="dashboard">
            <DashboardPage />
          </Authorized>
        ),
      },
      {
        path: 'employee',
        element: (
          <Authorized menuKey="employee">
            <Placeholder title="员工管理" />
          </Authorized>
        ),
      },
      // ...
      { path: '403', element: <Forbidden /> },
    ],
  },
  { path: '*', element: <NotFound /> },
]);
```

> **导入约定**：统一从 `react-router-dom` 导入（react-router v7 里它只是转发层，
> 但全仓统一用 `react-router-dom` 可读性更好）。**不要**在同一文件混用两种来源。

**为什么要包一层 `<Authorized>` 而不是用路由 `meta`？**
react-router 的 route object 不支持自定义元字段参与渲染，包组件是最直白的做法，
且权限判定逻辑单一出口在 `guards.tsx`，好改好测。

### 6.2 三级权限模型

| 级别       | 实现位置                                   | 状态                          | 示例                                                    |
| ---------- | ------------------------------------------ | ----------------------------- | ------------------------------------------------------- |
| **菜单级** | `Authorized` 守卫 + `BasicLayout` 菜单过滤 | ✅ 已落地                     | 非授权角色访问 `/employee` → 跳 403；侧边栏不显示该菜单 |
| **按钮级** | `useUserStore().hasButton(code)`           | 🟡 判定函数就绪，**组件待建** | 无 `employee.delete` 码 → 看不到「删除」按钮            |
| **字段级** | `useUserStore().hasField(code)`            | 🟡 判定函数就绪，**组件待建** | 无 `salary` 码 → 薪资列不渲染                           |

**待补组件（组件目录尚未创建）**：

```tsx
// src/components/Authority/index.tsx —— 目标 API
<Authority code={PERM.EMP_DELETE}>
  <Button danger>删除</Button>
</Authority>
// 无权限时返回 null（注意：不是 disabled，是"看不见"）

// src/components/Field/index.tsx —— 目标 API
<Field code={FIELD.SALARY}>{formatMoney(record.salary)}</Field>
// 无权限时渲染占位符 '—'
```

**权限码统一定义**在 `src/constants/index.ts`，禁止在组件里写裸字符串：

```ts
export const PERM = {
  EMP_EXPORT: 'employee.export',
  EMP_DELETE: 'employee.delete',
  WF_APPROVE: 'workflow.approve',
  // ...
} as const;

export const FIELD = { SALARY: 'salary', IDCARD: 'idCard' } as const;
```

### 6.3 菜单渲染 ✅

`router/menus.tsx` 的 `MENU_CONFIG` 是唯一菜单源，`key` 必须与 mock 里
`permissions.menus` 的权限码一致（`dashboard` / `employee` / `workflow` / `form`）。

`BasicLayout` 过滤规则：`menus` 含 `'*'`（admin）→ 全显；否则按 `key` 交集渲染。
做到「**看不到 = 进不去**」——菜单不显示，同时 `Authorized` 也拦得住直接输 URL。

---

## 7. 请求层（axios）

### 7.1 统一响应结构

```ts
interface BaseResponse<T> {
  code: number; // 0 成功，非 0 业务错误
  data: T;
  message: string;
}
```

### 7.2 已实现要点（`src/utils/request.ts`）

- **实例**：`baseURL = import.meta.env.VITE_API_BASE_URL || '/api'`，`timeout = 15000`。
- **请求拦截**：从 `storage` 取 token，注入 `Authorization: Bearer <token>`。
- **响应拦截**：
  - `code === 0` → **直接返回 `body.data`**（业务层拿到的就是解包后的数据）
  - `code === 401 || 40100` → `message.error` + 清 token + 跳 `/login`
  - 其他非 0 → `message.error` + reject
  - 网络异常 → `message.error` + reject
- **导出**：`api.get/post/put/del` 四个泛型方法，类型标注为 `Promise<T>`。

### 7.3 用法（业务代码唯一入口）

```ts
import { api } from '@/utils/request';

export const list = (query: EmployeeQuery) =>
  api.post<PageResult<Employee>>('/employee/list', query);
```

### 7.4 ⚠️ 三个容易踩的坑

1. **不要在业务里再拆一层 `res.data`**。拦截器已经解包，`api.get<T>()` 拿到的就是 `T`。
2. **mock 匹配的是 `config.url`，不是拼上 baseURL 的完整地址**。
   mock 里注册 `'/user/login'` 就能匹配到 `baseURL=/api` + `url=/user/login` 的请求，
   **不要**在 mock 里写 `/api/user/login`，否则匹配不上。
3. **401 跳转用的是 `location.href`**，会整页刷新（清掉内存状态）。
   这是有意为之——避免残留脏状态；如果后续改成 `navigate`，记得同步清 store。

---

## 8. Mock 方案

**方案：`axios-mock-adapter`**（实例级拦截，非 Service Worker）。

| 项       | 现状                                                 |
| -------- | ---------------------------------------------------- |
| 开关     | `VITE_USE_MOCK`（dev `true` / prod `false`）         |
| 注入点   | `utils/request.ts` 末尾条件调用 `setupMock(request)` |
| 延迟     | `delayResponse: 350`（全局 350ms，模拟真实网络）     |
| 数据规模 | 员工 1 万条（`_shared.ts` 单例生成，避免重复构造）   |
| 覆盖     | 15 个接口，5 个域全覆盖                              |
| 离线可跑 | ✅ 是，无后端也能完整演示                            |

**为什么不用 vite-plugin-mock / MSW？**

- `axios-mock-adapter` 挂在 **axios 实例**上，与项目的请求层天然同源，零额外进程、零 SW 注册。
- 代价：只拦 axios，拦不住 `fetch` / `<img>` / SSE。**约定：项目内所有请求必须走 `api`**。

**新增 mock 的正确姿势**：

1. 在 `src/mock/<域>.ts` 里写 `mock.onGet/onPost('/xxx')`（**不带 `/api` 前缀**）。
2. 在 `src/mock/index.ts` 的 `setupMock` 里注册该域。
3. 同步更新 `src/services/<域>.ts` 与 `src/types/index.ts`。

**实时消息（P0-6）**：mock 不支持 SSE 长连接，已在 `store/message.ts` 用
`setInterval`（8 秒一条，数据源 `mock/message.ts` 的 `genRealtimeMessage()`）模拟，
并留了 `startSubscribe / stopSubscribe` 的开关。生产环境替换为 `EventSource` 即可，业务零侵入。

---

## 9. 接口契约（与 mock 严格一致）

> 下表 URL 均省略 `baseURL`（`/api`）。字段定义见 `src/types/index.ts`。

| 模块 | 方法 | URL                  | 返回类型               | 说明                                   |
| ---- | ---- | -------------------- | ---------------------- | -------------------------------------- |
| 认证 | POST | `/user/login`        | `LoginRes`             | 4 套角色账号，密码均为 `123456`        |
| 认证 | POST | `/user/logout`       | `boolean`              | —                                      |
| 权限 | GET  | `/user/info`         | `UserInfo`             | 按 token 返回用户信息                  |
| 权限 | GET  | `/user/permissions`  | `PermissionData`       | **三级权限的唯一来源**                 |
| 员工 | POST | `/employee/list`     | `PageResult<Employee>` | 分页 + 4 维过滤，1 万条数据            |
| 员工 | POST | `/employee/all`      | `Employee[]`           | 全量（供导出/虚拟滚动用）              |
| 员工 | POST | `/employee/add`      | `{ id: number }`       | 入职表单提交                           |
| 看板 | GET  | `/dashboard/summary` | `DashboardSummary`     | 支持 `?dept=` 筛选（图表联动用）       |
| 审批 | POST | `/workflow/list`     | `WorkflowTask[]`       | body `{ tab: 'todo'\|'done'\|'mine' }` |
| 审批 | GET  | `/workflow/detail`   | `WorkflowTask \| null` | 支持 `?id=`，含 4 节点时间线           |
| 审批 | POST | `/workflow/approve`  | `boolean`              | body `{ id }`                          |
| 审批 | POST | `/workflow/reject`   | `boolean`              | body `{ id }`                          |
| 消息 | GET  | `/message/list`      | `AppMessage[]`         | 三类消息                               |
| 消息 | POST | `/message/read`      | `boolean`              | body `{ id }`                          |
| 消息 | POST | `/message/readAll`   | `boolean`              | —                                      |

**关键入参/出参**：

```ts
interface LoginReq {
  username: string;
  password: string;
}
interface LoginRes {
  token: string;
  userInfo: UserInfo;
}
interface UserInfo {
  id: string;
  name: string;
  username: string;
  roles: string[];
  permissions: string[];
}

interface PermissionData {
  // 三级权限
  menus: string[]; // '*' 代表全部
  buttons: string[];
  fields: string[];
}

interface PageResult<T> {
  records: T[];
  total: number;
  current: number;
  pageSize: number;
}
```

---

## 10. UI 规范

### 10.1 全局配置（`App.tsx` + `main.tsx`）✅

职责已经拆干净，**不要把它们合并回去**：

- `main.tsx` 只负责"把 React 挂到 DOM 上"，不写任何业务配置。
- `App.tsx` 负责全局 Provider（主题、语言、路由）。

```tsx
// src/main.tsx —— 只做挂载
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'antd/dist/reset.css';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

```tsx
// src/App.tsx —— 全局 Provider
import { ConfigProvider } from 'antd';
import { RouterProvider } from 'react-router-dom';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import { router } from '@/router';

dayjs.locale('zh-cn');

function App() {
  return (
    <ConfigProvider locale={zhCN} theme={{ token: { colorPrimary: '#1677ff' } }}>
      <RouterProvider router={router} />
    </ConfigProvider>
  );
}

export default App;
```

### 10.2 ⚠️ 暗坑：React 19 + antd

**本项目用 antd 6，原生支持 React 19，不需要任何补丁。**

- v1.0 文档曾要求装 `@ant-design/v5-patch-for-react-19` 并在入口 import —— **该条已作废**。
- 那个包确实还在 `package.json` 里，但 `main.tsx` **没有** import 它，属于残留。
  **建议从依赖中移除**，避免后来人以为项目依赖它：
  ```bash
  npm uninstall @ant-design/v5-patch-for-react-19
  ```
- 如果哪天回退到 antd 5，才需要重新装补丁并在入口首行 import。

**当前主题**：主色 `#1677ff` 硬编码在 `App.tsx`。
`store/app.ts` 已有 `theme` / `primaryColor` 状态（持久化到 `bi-app`），
后续做主题切换时，把 `App.tsx` 的 token 改成读 store 即可（P0-4 的一部分）。

### 10.3 布局

- `BasicLayout`：左侧 `Sider`（宽 220，`theme="light"`）+ 顶栏（用户下拉 / 退出）+ 内容区 `<Outlet/>`。
- 内容区统一 `padding: 24`（当前用 `margin: 24` 实现）。
- ⬜ **顶栏右侧预留了消息铃铛位，尚未实现**（P0-6）。
- ⬜ **无面包屑**，需要在嵌套路由下补。

### 10.4 组件分类

- 通用组件（`components/`）：无业务，纯 UI / 工具。**当前目录不存在，需新建**。
- 业务组件（`pages/x/components/`）：仅本页复用。
- 优先复用 antd，禁止重复造轮子（如自行实现 Modal）。

---

## 11. 编码规范

- **命名**：组件 PascalCase；hook `useXxx`；常量 `UPPER_SNAKE`；文件与默认导出组件同名。
- **类型**：props 必须显式 interface；事件处理 `handleXxx`。
- **权限**：一律用 `constants/index.ts` 的 `PERM` / `FIELD` 常量，禁止裸字符串。
- **存储**：所有 localStorage 读写走 `utils/storage`（已带 try/catch，防隐私模式崩溃），
  key 统一登记在 `STORAGE_KEYS`。
- **性能**：列表用 `React.memo`；大数组用虚拟滚动；`useMemo`/`useCallback` 防无效重渲；路由级 `lazy` 分包。
- **注释**：仅在「为什么」写注释，不写「做了什么」。
  （参见 `store/user.ts` 里解释"为什么只持久化 token"的注释——那是合格示范。）

---

## 12. 构建与部署

- `npm run build` → `dist/` 静态产物。
- 部署至任意静态托管（Vercel / Netlify / GitHub Pages / Nginx）。
- 若用 GitHub Pages 需设 `base`；SPA 需配置 fallback 到 `index.html`。
- 演示环境：`VITE_USE_MOCK=true` 打包，无后端也能跑通全流程。
- `vite.config.ts` 已设 `chunkSizeWarningLimit: 1500`，`server.host: true`（局域网可访问）。

---

## 13. 质量保障

| 项              | 状态                                    |
| --------------- | --------------------------------------- |
| ESLint          | ✅ 已配置，需手动 `npm run lint`        |
| 提交钩子        | ⬜ 未接入（husky）                      |
| 单元测试        | ⬜ 未接入（无 Vitest / RTL）            |
| ErrorBoundary   | ⬜ **未实现**——当前任何渲染异常都会白屏 |
| 埋点 / 错误上报 | ⬜ 未接入                               |
| CI              | ⬜ 无                                   |

**优先级建议**：`ErrorBoundary` 成本最低、收益最高，建议在其他业务卡之前先补。

---

## 附录 A：常用命令速查

```bash
npm run dev          # 开发（mock 开启）
npm run build        # 构建
npm run lint         # ESLint 检查
npm run preview      # 预览产物
```

## 附录 B：FAQ

**Q：切真后端要改多少代码？**
A：只改 `.env.production` 的 `VITE_API_BASE_URL` 并把 `VITE_USE_MOCK` 设为 `false`，业务零改动。

**Q：mock 和真实接口字段不一致怎么办？**
A：以 `src/types/index.ts` 为准，双方对齐契约，不一致即 bug。

**Q：mock 写了但请求 404 / 没被拦到？**
A：见 §7.4 第 2 条——mock 的 path 不能带 `/api` 前缀。

**Q：登录后刷新页面，权限没恢复？**
A：`RequireAuth` 会自动 `fetchProfile()` 重拉。如果卡在 loading，看 `/user/info` 是否返回了 `40100`。

**Q：为什么我用 antd 6 的用法报错，网上教程是 antd 5 的？**
A：注意版本差异。本项目 antd **6.x**，`theme.token` 等 API 基本兼容，
但部分组件的废弃属性已在 6 中移除，优先查 antd 6 官方文档。
