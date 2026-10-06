# DataPilot · Mock 层实现与扩展指南

> 目标：**没有后端也能把项目完整跑起来演示**，且业务代码零侵入。
> 版本：v2.0　最后更新：**2026-09-11**（已按 `src/mock/` 实际代码全量核对）
>
> **v2.0 相比 v1.0 的重大修订**
> v1.0 是"如何给旧 Umi 项目从零搭 mock"的**施工方案**（讲 `MOCK=none`、`mockjs`、Umi 内置 mock 目录）。
> 现在 mock 层**已经建好了**，所以本文档的定位改成：
> **① 记录已实现的东西 → ② 说明怎么加新接口 → ③ 常见问答与设计取舍。**
> 配套阅读：`DEVELOPMENT.md` §8（Mock 方案）。

---

## 0. 现状（已完成，不是待办）

| 项             | 现状                        | 说明                                                                |
| -------------- | --------------------------- | ------------------------------------------------------------------- |
| 实现方案       | **axios-mock-adapter 2.1**  | 实例级拦截，不是 Service Worker                                     |
| 开关           | `VITE_USE_MOCK`             | dev `true`（`.env.development`）/ prod `false`（`.env.production`） |
| 注入点         | `src/utils/request.ts` 末尾 | `if (import.meta.env.VITE_USE_MOCK === 'true') setupMock(request)`  |
| 全局延迟       | **350ms**                   | `new MockAdapter(instance, { delayResponse: 350 })`                 |
| Mock 目录      | ✅ **已存在**，7 个文件     | `src/mock/`                                                         |
| 接口覆盖       | ✅ **15 个**，5 个域        | user / employee / dashboard / workflow / message                    |
| 数据规模       | 员工 **1 万条**             | `_shared.ts` 单例懒生成，避免重复构造                               |
| 离线可跑       | ✅ **是**                   | 无后端也能完整走通登录 → 看板 → 表格 → 审批 → 消息                  |
| 新增接口的成本 | 约 10 行代码                | 见第 3 节                                                           |

**一句话**：mock 这一层已经不用你操心了，缺的是**用这些数据的页面**。

---

## 1. 为什么选 axios-mock-adapter

| 方案                   | 实现方式                     | 优点                                                        | 缺点                           | 本项目               |
| ---------------------- | ---------------------------- | ----------------------------------------------------------- | ------------------------------ | -------------------- |
| **axios-mock-adapter** | 挂在 axios 实例的 adapter 上 | 与请求层同源、零额外进程、零 SW 注册、TS 友好、可精确控延迟 | 只拦 axios                     | ✅ **已采用**        |
| vite-plugin-mock       | Vite 插件起本地中间件        | 可拦 fetch、可返回真文件                                    | 需额外配置、依赖 Vite 生命周期 | ❌                   |
| MSW                    | Service Worker 拦截          | 最贴近真实请求、可上生产演示                                | 要注册 SW、调试链路长          | ❌（如需拦截 fetch 可另加） |

**为什么本项目适合方案 A**：
项目已经强制"所有请求走 `utils/request.ts` 的 `api`"（见 `DEVELOPMENT.md` §7），
拦截点天然唯一。用插件或 SW 属于"为了通用性付出不必要的复杂度"。

### 三条红线（新增 mock 时必须遵守）

1. **mock 的 path 不带 `/api` 前缀**。
   `MockAdapter` 匹配的是 `config.url`（即 `request.ts` 里传的相对路径），
   而 baseURL `/api` 是 axios 后拼的。所以 mock 里写 `'/user/login'`，
   **写 `/api/user/login` 会匹配不上**。
2. **mock 的返回结构必须是 `{ code, data, message }`**。
   请求层拦截器会检查 `code`：`0` 才解包 `data` 返回给业务。
3. **业务代码不 import 任何 mock 文件**（除了 `store/message.ts` 引用实时消息生成器这一处，
   属于演示用的显式例外）。

---

## 2. 目录与各文件职责

```
src/mock/
├── index.ts       # setupMock(instance)：统一出口，注册所有域 + 设置全局延迟
├── _shared.ts     # 共享数据：DEPTS / POSITIONS / STATUSES 常量 + getEmployees()（1 万条，单例）
├── users.ts       # 登录 / 用户信息 / 权限查询 / 退出（4 套角色 + 三级权限表）
├── employees.ts   # 员工分页 / 全量 / 新增
├── dashboard.ts   # 看板汇总（KPI / 趋势 / 部门 / 职位 / 雷达 / 排行），支持 ?dept=
├── workflow.ts    # 审批任务列表（按 tab）/ 详情 / 通过 / 驳回
└── message.ts     # 消息列表 / 标记已读 / 全部已读 + genRealtimeMessage()
```

`index.ts` 的实现（照这个模式扩展）：

```ts
import type { AxiosInstance } from 'axios';
import MockAdapter from 'axios-mock-adapter';
// ... 各域 import

export function setupMock(instance: AxiosInstance) {
  const mock = new MockAdapter(instance, { delayResponse: 350 });
  userMock(mock);
  employeeMock(mock);
  dashboardMock(mock);
  workflowMock(mock);
  messageMock(mock);
}
```

---

## 3. 如何新增一个 mock 接口（4 步）

假设要给 P0-7 加一个"导入结果校验"接口 `POST /import/validate`。

**Step 1**：建 `src/mock/import.ts`

```ts
import type MockAdapter from 'axios-mock-adapter';

export function importMock(mock: MockAdapter) {
  mock.onPost('/import/validate').reply((config: any) => {
    // ⚠️ config.data 是字符串，必须 JSON.parse
    const { rows } = config.data ? JSON.parse(config.data) : {};
    const errors = (rows ?? []).filter((r: any) => !r.name).map((r: any) => r.id);
    return [200, { code: 0, data: { errors }, message: 'ok' }];
  });
}
```

**Step 2**：在 `src/mock/index.ts` 里注册 `importMock(mock);`

**Step 3**：在 `src/services/` 加封装（或并入已有域文件）

```ts
export const validate = (rows: unknown[]) =>
  api.post<{ errors: string[] }>('/import/validate', { rows });
```

**Step 4**：在 `src/types/index.ts` 加返回类型。**三步的 path 字符串必须完全一致。**

### 常用写法速查

```ts
// GET + query 参数（注意用 config.params，不是 config.data）
mock.onGet('/dashboard/summary').reply((config: any) => {
  const dept = config.params?.dept as string | undefined;
  return [200, { code: 0, data: build(dept), message: 'ok' }];
});

// 模拟错误（业务错误走 code，不要用 HTTP 状态码）
mock.onPost('/xxx').reply(200, { code: 40300, data: null, message: '无权限' });

// 模拟慢接口（局部覆盖全局的 350ms）——适合演示导出/大文件
mock
  .onPost('/employee/export')
  .reply(() => {
    /* ... */
  })
  .delayResponse(1500);

// 读取请求头（本项目用它做 token 校验）
mock.onGet('/user/info').reply((config: any) => {
  const token = ((config.headers?.Authorization as string) || '').replace('Bearer ', '');
  // ...
});
```

---

## 4. 已实现域的实现要点

### `users.ts` —— 4 套角色 + 三级权限

- 账号表：`admin` / `manager` / `finance` / `employee`，密码统一 `123456`。
- **内存 token 表** `tokens: Record<string, Account>`：登录时生成 `tok_<userId>_<timestamp>` 存入，
  后续 `/user/info`、`/user/permissions` 靠 `Authorization` 头反查。
  未命中返回 `code: 40100`（触发请求层清态跳登录）。
- 权限表 `rolePermissions` 按角色给 `{ menus, buttons, fields }`，`'*'` 表示全部：
  | 角色    | menus                            | buttons                              | fields         |
  | ------- | -------------------------------- | ------------------------------------ | -------------- |
  | admin   | `*`                              | `*`                                  | `*`            |
  | manager | dashboard/employee/workflow/form | export/import/add/delete + 审批/驳回 | salary         |
  | finance | dashboard/employee/workflow      | export/import + 审批                 | salary, idCard |
  | user    | dashboard/workflow/form          | 仅 submit                            | 无             |
- ⚠️ **token 存在内存里，刷新页面后 mock 的 token 表会清空**，
  此时 `/user/info` 返回 40100 → `RequireAuth` 会走 `fetchProfile()` →
  失败后按未登录处理。**这是 mock 的固有限制，不是 bug**；
  如果演示时需要"刷新不掉线"，把 `tokens` 改成模块级 Map 之外再加一层
  `localStorage` 兜底，或在 `users.ts` 里预置几个长期有效的假 token。

### `_shared.ts` + `employees.ts` —— 1 万条数据

- `getEmployees()` 是**单例懒生成**：首次调用构造 1 万条并缓存在模块变量里，
  之后所有请求共用同一份（所以 `POST /employee/add` 加的人，后续列表能查到）。
- 数据用确定性算法生成（`i % DEPTS.length`、`(i * 7919) % ...`），
  **不是随机数**——保证每次刷新看到的数据一致，便于演示和截图。
- 三个接口：`/employee/list`（分页 + 4 维过滤）/ `/employee/all`（全量）/
  `/employee/add`（unshift 到列表头部）。

### `dashboard.ts` —— 支持图表联动的筛选参数

- 唯一接口 `GET /dashboard/summary?dept=`。
- KPI、部门分布、职位分布都会跟着 `dept` 变；
  趋势 / 雷达 / 排行是固定演示数据。
- 返回体里带 `filterDept` 字段，前端可用来回显当前筛选（P0-4 图表联动直接用）。

### `workflow.ts` —— 状态机 + 时间线

- 18 条任务，三类（`leave` / `reimburse` / `travel`），四种状态
  （`pending` / `approved` / `rejected` / `withdrawn`）。
- `buildNodes()` 按状态生成 4 节点时间线（发起 → 部门主管 → HR → 财务），
  节点状态 `done` / `current` / `wait`，驳回时在对应节点写 `comment`。
- `POST /workflow/list` 按 `tab` 过滤：`todo`（pending）/ `done`（approved+rejected）/
  `mine`（每 3 条取 1 条）。**审批/驳回会真的改内存里的状态**，演示有反馈。

### `message.ts` —— 三类消息 + 实时推送源

- 4 条种子消息（`todo` / `notice` / `system` 三类）。
- `genRealtimeMessage()` 是**给 `store/message.ts` 调用的推送生成器**，
  由 `setInterval` 8 秒触发一次，模拟 SSE。

---

## 5. 实时消息（SSE）的处理

mock 拦不住长连接，所以走"**前端定时器模拟 + 生产环境换 EventSource**"：

```ts
// src/store/message.ts（已实现）
let _timer: ReturnType<typeof setInterval> | null = null;

startSubscribe: () => {
  if (_timer) return;                      // 幂等，防重复
  _timer = setInterval(() => {
    get().addMessage(genRealtimeMessage()); // 从 mock 拿假消息
  }, 8000);
},
stopSubscribe: () => {
  if (_timer) { clearInterval(_timer); _timer = null; }
},
```

**接 UI 时（P0-6）的注意事项**：

- 在 `useEffect` 里 `startSubscribe()`，**清理函数里必须 `stopSubscribe()`**，
  否则组件重挂载会累积定时器（`if (_timer) return` 只能挡住一部分）。
- 生产环境替换：把 `genRealtimeMessage()` 换成 `new EventSource('/api/message/sse')` 的
  `onmessage`，`startSubscribe` / `stopSubscribe` 的**调用方代码完全不用改**——
  这就是当初把它设计成 store action 的原因。

| 方案                    | 实现              | 复杂度 | 本项目    |
| ----------------------- | ----------------- | ------ | --------- |
| 前端 `setInterval` 模拟 | store action 触发 | 极简   | ✅ 已采用 |
| 独立的本地 SSE server   | express 跑在 8081 | 中等   | ❌ 不必要 |

---

## 6. 接口清单（15 个，与 `DEVELOPMENT.md` §9 一致）

| 需求卡        | 方法 | URL（省略 `/api`）   | Mock 文件      | 备注                          |
| ------------- | ---- | -------------------- | -------------- | ----------------------------- |
| 登录          | POST | `/user/login`        | `users.ts`     | 4 套角色，密码 `123456`       |
| 退出          | POST | `/user/logout`       | `users.ts`     | —                             |
| 当前用户      | GET  | `/user/info`         | `users.ts`     | 靠 token 反查，未命中返 40100 |
| 权限查询      | GET  | `/user/permissions`  | `users.ts`     | 三级权限唯一来源              |
| P0-2 分页     | POST | `/employee/list`     | `employees.ts` | 1 万条 + 4 维过滤             |
| P0-2 全量     | POST | `/employee/all`      | `employees.ts` | 供虚拟滚动/导出               |
| P0-3 新增     | POST | `/employee/add`      | `employees.ts` | 入职表单                      |
| P0-4 看板     | GET  | `/dashboard/summary` | `dashboard.ts` | 支持 `?dept=` 联动            |
| P0-5 任务列表 | POST | `/workflow/list`     | `workflow.ts`  | body `{ tab }`                |
| P0-5 流程详情 | GET  | `/workflow/detail`   | `workflow.ts`  | 含 4 节点时间线               |
| P0-5 通过     | POST | `/workflow/approve`  | `workflow.ts`  | 改内存状态                    |
| P0-5 驳回     | POST | `/workflow/reject`   | `workflow.ts`  | 改内存状态                    |
| P0-6 消息列表 | GET  | `/message/list`      | `message.ts`   | 三类消息                      |
| P0-6 标记已读 | POST | `/message/read`      | `message.ts`   | —                             |
| P0-6 全部已读 | POST | `/message/readAll`   | `message.ts`   | —                             |

**尚未有 mock、做需求卡时要补的接口**：
`/employee/draft`（P0-3 草稿，也可以纯前端 localStorage 实现，**推荐后者**）、
`/workflow/submit`（P0-5 发起新流程）、
`/dashboard/export`（P0-4 导出，**推荐纯前端 `xlsx` 实现**）、
`/import/*`（P0-7，**全部纯前端**）。

> **判断原则**：能在浏览器里算完的，就不要加 mock 接口。
> mock 只负责"假装有后端"，不负责实现业务计算。

---

## 7. 边界：能 mock / 不能 mock

| 能 mock                                  | 不能 mock / 要小心                                                        |
| ---------------------------------------- | ------------------------------------------------------------------------- |
| 所有 RESTful 接口（GET/POST/PUT/DELETE） | SSE / WebSocket 长连接（用 store 定时器兜底）                             |
| 分页、过滤、排序、权限差异               | 文件**上传**（mock 能接住请求但拿不到真文件——文件解析类需求一律纯前端做） |
| 跨角色权限切换、假 token                 | 第三方 OAuth / SSO 跳转（mock 假跳转 + 假 token）                         |
| 延迟、空数据、错误码                     | 真实 AI 模型响应                                                          |
| 内存态的数据变更（新增/审批）            | **刷新后仍然保留的数据**（mock 数据在内存里，刷新即重置）                 |

> 常见疑问："你这后端是真的吗？"——
> "为了方便演示，前端做了完整 mock 层，业务代码零侵入，切到真实后端只换 `baseURL`
> 和 `VITE_USE_MOCK` 两个环境变量。"（这是企业级前端的标准做法）

---

## 8. 设计取舍与讲解要点

- "为了能离线演示，我用 **axios-mock-adapter** 在请求实例上拦了一层，全量覆盖了
  权限、表格、看板、审批、消息 15 个接口——现场不需要后端，`npm run dev` 起来就能演示。"
- "选它是因为项目里所有请求都收敛在一个 axios 实例上，拦截点唯一，
  比 MSW 少一层 Service Worker，比 vite-plugin-mock 少一个构建期依赖。"
- "mock 里我加了 **350ms 全局延迟**，让加载态、骨架屏这些交互能真的被看到。"
- "长连接 mock 不了，我把推送封装成了 store 的 `startSubscribe`，
  dev 走 `setInterval` 模拟，prod 换成 `EventSource` ——**调用方代码不用改**。"
- "数据我用了确定性算法生成而不是随机数，这样每次演示看到的一万条数据是一样的，
  截图和录屏可复现。"

---

## 9. 常见坑（踩过的）

| 现象                             | 原因                                      | 解法                                                 |
| -------------------------------- | ----------------------------------------- | ---------------------------------------------------- |
| 请求没被拦截，直接打到网络报 404 | mock 里 path 写了 `/api/xxx`              | 去掉 `/api` 前缀（见 §1 红线 1）                     |
| `JSON.parse` 报错 / 拿不到参数   | `config.data` 是**字符串**不是对象        | 用 `JSON.parse(config.data)`，GET 用 `config.params` |
| 业务层拿到 `undefined`           | mock 返回的不是 `{ code, data, message }` | 必须包这层壳，`code: 0` 才会解包                     |
| 刷新页面后掉登录                 | mock 的 token 表在内存里，刷新即清空      | 见 §4 `users.ts` 说明（演示前先登录，别刷新）        |
| 新增的员工刷新后消失             | 所有 mock 数据都在内存里                  | 正常现象；需要持久化就用 `localStorage` 兜底         |
| 定时器越滚越多                   | 组件卸载没调 `stopSubscribe`              | `useEffect` 清理函数里务必调用（见 §5）              |
| 看板筛选点了没反应               | 忘了把 `dept` 传给 `summary()`            | `services/dashboard.ts` 的 `summary(dept?)` 已支持   |
