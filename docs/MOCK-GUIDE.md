# DataPilot · Mock 层实现与扩展指南

> 目标：**没有后端也能把项目完整跑起来演示**，且业务代码零侵入。
> 版本：v3.0　最后更新：**2026-10-07**（按 `src/mock/` 实际代码逐文件核对）
> 配套阅读：`DEVELOPMENT.md` §7（请求层）、§8（Mock 方案）、§9（接口契约）

> **v3.0 相比 v2.x 的修订**
> v2.x 的头部写着"已按实际代码全量核对"，但实际是过时的：接口数写 15（真实 **22**）、
> mock 目录写 7 个文件（真实 **8** 个，漏了 `sso.ts`）、生产开关写 `false`（真实 **`true`**）、
> 员工域写"3 个接口"（真实 **8 个**）。
> 另外 v2.x 里多处只用 `P0-x` 这类编号指代功能（连功能名都不写），读者无从对应；
> v3.0 一律写成功能名，编号最多作为附属标记。
>
> 所以这一版老老实实重新核对了一遍，并把结论写在这里，方便你判断该信哪句。

---

## 0. 现状

| 项             | 现状                            | 说明                                                                  |
| -------------- | ------------------------------- | --------------------------------------------------------------------- |
| 实现方案       | **axios-mock-adapter 2.1**      | 实例级拦截，不是 Service Worker                                       |
| 开关           | `VITE_USE_MOCK`                 | `.env.development` 与 `.env.production` **都是 `true`**（原因见 §2.3） |
| 注入点         | `src/utils/request.ts` 末尾     | `if (import.meta.env.VITE_USE_MOCK === 'true') setupMock(request)`     |
| 全局延迟       | **350ms**                       | `new MockAdapter(instance, { delayResponse: 350 })`                   |
| Mock 目录      | **8 个文件**                    | `src/mock/`                                                           |
| 接口覆盖       | **22 个，6 个域**               | user / sso / employee / dashboard / workflow / message                |
| 数据规模       | 员工 **1 万条**                 | `_shared.ts` 单例懒生成，避免重复构造                                 |
| 离线可跑       | ✅ 是                           | 无后端也能走通：登录 → 看板 → 表格 → 审批 → 消息 → 导入               |
| 新增接口的成本 | 约 10 行                        | 见 §4                                                                 |

**一句话**：mock 这一层已经完整覆盖了当前所有页面，缺的不是接口而是别的东西。

---

## 1. 为什么选 axios-mock-adapter

| 方案                   | 实现方式                     | 优点                                                        | 缺点                       |
| ---------------------- | ---------------------------- | ----------------------------------------------------------- | -------------------------- |
| **axios-mock-adapter** | 挂在 axios 实例的 adapter 上 | 与请求层同源、零额外进程、零 SW 注册、TS 友好、可精确控延迟 | 只拦 axios                 |
| vite-plugin-mock       | Vite 插件起本地中间件        | 可拦 fetch、可返回真文件                                    | 需额外配置、绑定 Vite 生命周期 |
| MSW                    | Service Worker 拦截          | 最接近真实请求、可上生产演示                                | 要注册 SW、调试链路长       |

**为什么这个项目适合第一种**：所有请求都被收敛到 `utils/request.ts` 的 `api` 上（见 `DEVELOPMENT.md` §7），
拦截点天然唯一。用插件或 SW 属于"为了通用性付不必要的复杂度"。

### 三条红线（新增 mock 时必须遵守）

1. **mock 的 path 不带 `/api` 前缀**。
   `MockAdapter` 匹配的是 `config.url`（即 `request.ts` 里传的相对路径），`baseURL` 是 axios 事后拼的。
   写 `'/user/login'` 能命中；写 `'/api/user/login'` 匹配不上。
2. **返回结构必须是 `{ code, data, message }`**。
   请求层拦截器会检查 `code`，只有 `code === 0` 才解包 `data` 交给业务层。
3. **业务代码不 import 任何 mock 文件**。全项目只有两处例外，且都是刻意的：
   - `utils/request.ts` → `setupMock`（注入点本身）
   - `store/message.ts` → `genRealtimeMessage`（实时消息演示，见 §6）

---

## 2. 目录与注入

### 2.1 各文件职责

```
src/mock/
├── index.ts       # setupMock(instance)：统一出口，注册 6 个域 + 设置全局延迟
├── _shared.ts     # 共享数据：DEPTS / STATUSES / DEPT_POSITIONS + getEmployees() / setEmployees()
├── users.ts       # 登录 / 用户信息 / 权限查询 / 退出（4 套账号 + 三级权限表 + 内存 token 表）
├── sso.ts         # SSO 授权码流：签发一次性 code / code+client_id 换 token
├── employees.ts   # 员工：分页 / 全量 / 新增 / 批量导入 / 更新 / 批量删除 / 批量更新 / 字典
├── dashboard.ts   # 看板汇总（KPI / 趋势 / 部门 / 职位 / 雷达 / 排行），支持 ?dept=
├── workflow.ts    # 审批：列表（按 tab）/ 详情 / 通过 / 驳回
└── message.ts     # 消息列表 / 标记已读 / 全部已读 + genRealtimeMessage()
```

### 2.2 `index.ts`（照这个模式扩展）

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
  ssoMock(mock);
}
```

### 2.3 ⚠️ 生产环境也开着 mock

`.env.development` 与 `.env.production` 里 `VITE_USE_MOCK` **都是 `true`**。

这不是漏改：本项目**没有任何真实后端**，关掉 mock 之后生产构建会去请求不存在的 `/api`，
页面直接白屏（Docker 和 GitHub Pages 都一样）。所以线上 Demo 跑的就是前端本地 mock。

接真实后端时把生产那份改成 `false`，并打开 `nginx.conf` 末尾的 `/api` 反向代理注释。

> **隐蔽点**：CI 的容器冒烟测试**查不出这个问题**——它只验证首页返回 200（HTML 外壳正常），
> 而白屏发生在 JS 执行、发出请求之后。冒烟测试过了 ≠ 页面能用。

---

## 3. 边界：能 mock / 不能 mock

| 能 mock                                  | 不能 mock / 要小心                                                         |
| ---------------------------------------- | -------------------------------------------------------------------------- |
| 所有 RESTful 接口（GET/POST/PUT/DELETE） | SSE / WebSocket 长连接（用 store 定时器兜底，见 §6）                        |
| 分页、过滤、排序、权限差异               | 真实文件上传（能接住请求但拿不到文件对象——文件解析一律放前端做）             |
| 跨角色权限切换、假 token                 | 需要**服务端密钥**的流程（OAuth 换 token、支付、签名）——只能模拟，不能真做   |
| 延迟、空数据、业务错误码                 | 真实 AI 模型响应                                                            |
| 内存态的数据变更（新增/删除/审批）       | **刷新后仍然保留的数据**（mock 数据在内存里，刷新即重置，见 §8.1）           |

**判断原则：能在浏览器里算完的，就不要加 mock 接口。**
mock 只负责"假装有后端"，不负责实现业务计算。
所以草稿保存走 `localStorage`、导入解析走 Web Worker、看板导出走前端 `xlsx`/`html2canvas`——
这些**都没有、也不需要**对应的 mock 接口。

---

## 4. 如何新增一个 mock 接口（4 步）

假设将来要加一个批量改密码的接口 `POST /user/password`。

**Step 1**：在对应域文件里加 handler（新域才需要建文件）

```ts
// src/mock/users.ts
mock.onPost('/user/password').reply((config) => {
  // ⚠️ config.data 是字符串，必须 JSON.parse
  const { ids, password } = config.data ? JSON.parse(config.data) : {};
  if (!Array.isArray(ids) || !password) {
    return [200, { code: 400, data: null, message: '参数不合法' }];
  }
  return [200, { code: 0, data: { updated: ids.length }, message: 'ok' }];
});
```

**Step 2**：如果是新文件，在 `src/mock/index.ts` 的 `setupMock` 里注册。

**Step 3**：在 `src/services/` 加封装，用 `api.post<返回类型>`

```ts
export const updatePassword = (ids: string[], password: string) =>
  api.post<{ updated: number }>('/user/password', { ids, password });
```

**Step 4**：返回类型加进 `src/types/index.ts`。

> **Step 3 与 Step 1 的 path 字符串必须完全一致**，且都不带 `/api`。这三处（mock / service / types）
> 是一组，改一个就要改全。

### 常用写法速查

```ts
// GET + query 参数（注意用 config.params，不是 config.data）
mock.onGet('/dashboard/summary').reply((config) => {
  const dept = config.params?.dept as string | undefined;
  return [200, { code: 0, data: build(dept), message: 'ok' }];
});

// 业务错误走 code，不要用 HTTP 状态码 —— 请求层只看 code
mock.onPost('/employee/update').reply(200, { code: 400, data: null, message: '未找到该员工' });

// 模拟慢接口（局部覆盖全局 350ms）——适合演示大文件/导出
mock
  .onPost('/xxx')
  .reply(() => [200, { code: 0, data: null, message: 'ok' }])
  .delayResponse(1500);

// 读取请求头（本项目用它做 token 校验）
mock.onGet('/user/info').reply((config) => {
  const token = ((config.headers?.Authorization as string) || '').replace('Bearer ', '');
  // ...
});

// 需要保存内存态时，务必用 _shared.ts 的同源访问器，别自己再持一份
const list = getEmployees();   // 拿到单例数组，直接改它
setEmployees(newList);         // 整体替换时走 setter
```

---

## 5. 各域实现要点

### `users.ts` —— 4 套账号 + 三级权限 + 内存 token 表

- 账号：`admin` / `manager` / `finance` / `employee`，密码统一 `123456`。
- **内存 token 表** `tokens: Record<string, Account>`：登录时生成 `tok_<id>_<timestamp>` 存入，
  之后 `/user/info`、`/user/permissions` 靠 `Authorization` 头反查。
  未命中返回 `code: 40100` → 请求层清 token 并派发 `auth:expired` 事件（见 `DEVELOPMENT.md` §7.4）。
- 权限表 `rolePermissions` 按角色给 `{ menus, buttons, fields }`，`'*'` 表示全部：

  | 角色      | menus                                       | buttons                                                            | fields         |
  | --------- | ------------------------------------------- | ------------------------------------------------------------------ | -------------- |
  | `admin`   | `*`                                         | `*`                                                                | `*`            |
  | `manager` | dashboard / employee / import / workflow / form | export, import, add, edit, delete, approve, reject              | salary         |
  | `finance` | dashboard / employee / import / workflow    | export, import, approve                                            | salary, idCard |
  | `user`    | dashboard / workflow / form                 | submit                                                             | —              |

- `createToken()` / `buildSsoUserInfo()` 是**给 `sso.ts` 复用的导出**——
  SSO 签发的 token 也注册进同一张 `tokens` 表，所以 `/user/info` 能识别它。

### `sso.ts` —— 真的按 OAuth2 授权码模式走了一遍

模拟对象是"SSO 认证服务器 + 本应用后端换 token"两步，全部落在本地：

- `POST /sso/login`：校验账号 → 生成一次性 `sso_code_*` 存入 `codes` Map → 返回 code。
  （真实 OAuth 这里会 302 回跳，本项目把 code 交给前端自己拼回跳 URL。）
- `POST /sso/token`：**先校验 `client_id`**（不等于 `SSO_CLIENT_ID` 直接拒），
  再校验 code 是否存在，**用完立即 `codes.delete(code)`** 复刻 one-time code 语义，
  最后复用 `createToken` 签发业务 token。
- 前端链路：`/login` → `/sso?redirect=` → `/login/callback?code=` → `store.ssoExchange(code)` → 跳回。

**为什么值得这么写**：`client_id` 校验 + code 一次性销毁这两个动作，正是"前端不接触密钥、
token 只能由后端用 code 换取"的关键。少了它们，这个模拟就退化成"前端自己发个 token"。

### `_shared.ts` + `employees.ts` —— 1 万条数据

- `getEmployees()` 是**单例懒生成**：首次调用构造 1 万条缓存在模块变量里，之后所有请求共用同一份。
  所以 `POST /employee/add` 加的人，后续列表能查到；`delete` 删掉的人也会真的消失。
- 数据用**确定性算法**生成（`i % DEPTS.length`、`(i * 7919) % ...`、`(i * 37) % 25000`），
  **不是随机数**——保证每次刷新数据一致，演示与截图可复现。
- 部门→岗位用 `DEPT_POSITIONS` 联动字典，`getEmployees` 生成职位时也用它，
  保证现有 1 万条数据与表单里的下拉联动**对得上**（否则筛选会出现空结果）。
- 员工域共 **8 个接口**：`list`（分页 + 5 维过滤）/ `all`（全量，供导出）/ `add` / `import`（一次 POST 全量，
  避免逐条往返）/ `update` / `delete`（批量）/ `batchUpdate`（批量改字段）/ `options`（字典，GET）。

### `dashboard.ts` —— 支持图表联动的筛选参数

- 唯一接口 `GET /dashboard/summary?dept=`。
- **跟 `dept` 变**：KPI 里的"员工总数"、部门分布、职位分布（都从 `getEmployees()` 现算）。
- **固定演示数据**：趋势（12 个月正弦曲线）、能力雷达（6 项）、部门绩效排行。
- 返回体带 `filterDept` 字段，前端用来回显当前筛选。

### `workflow.ts` —— 状态机 + 4 节点时间线

- 18 条任务，三类（`leave` / `reimburse` / `travel`），四种状态
  （`pending` / `approved` / `rejected` / `withdrawn`）。
- `buildNodes(status, rejectAt)` 生成 4 节点时间线（发起 → 部门主管 → HR → 财务），
  节点状态 `done` / `current` / `wait`；`rejected` 时在对应节点写 `comment`，
  `approved` 时给每个节点补 `time`。
- `POST /workflow/list` 按 `tab` 过滤：`todo` = pending，`done` = approved + rejected，
  `mine` = 全量里每 3 条取 1 条。
- `approve` / `reject` **会真的改内存里那条任务的状态**，所以审批完切 Tab 能看到它移动过去。

### `message.ts` —— 4 条种子 + 实时推送源

- 4 条种子消息覆盖 `todo` / `notice` / `system` 三类，两条未读两条已读（便于验证未读角标）。
- `genRealtimeMessage()` 是**给 `store/message.ts` 调用的推送生成器**（见 §6），
  内部 `_seq` 自增，消息 id 形如 `rt101`，每次从对应类型的文案池里取一条。

---

## 6. 实时消息（SSE）的处理

mock 拦不住长连接，所以走"**前端定时器模拟 + 生产换 EventSource**"：

```ts
// src/store/message.ts（已实现）
let _timer: ReturnType<typeof setInterval> | null = null;

startSubscribe: () => {
  if (_timer) return;                       // 幂等，防重复
  _timer = setInterval(() => {
    get().addMessage(genRealtimeMessage()); // 从 mock 拿假消息
  }, 8000);
},
stopSubscribe: () => {
  if (_timer) { clearInterval(_timer); _timer = null; }
},
```

**已接入位置**：`components/MessageCenter` 在一个 `useEffect` 里做"挂载：拉历史消息 + 开启实时订阅；
卸载：`return () => stopSubscribe()` 停定时器防泄漏"。接入时踩到的两个点，换谁来写都要注意：

- **清理函数里必须 `stopSubscribe()`**，否则组件重挂载会累积定时器（`if (_timer) return` 只能挡住一部分）。
- **设计成 store action 而不是组件内 effect**，是为了让调用方在切换到真实 SSE 时零改动：
  生产环境把 `genRealtimeMessage()` 换成 `new EventSource('/api/message/sse')` 的 `onmessage` 即可，
  调 `startSubscribe` / `stopSubscribe` 的地方一行都不用动。

| 方案                    | 实现              | 复杂度 | 本项目    |
| ----------------------- | ----------------- | ------ | --------- |
| 前端 `setInterval` 模拟 | store action 触发 | 极简   | ✅ 已采用 |
| 独立本地 SSE server     | express 跑在 8081 | 中等   | ❌ 没必要 |

---

## 7. 接口清单（22 个，与 `DEVELOPMENT.md` §9 一致）

> URL 均省略 `baseURL`（`/api`）。

### 认证与权限 —— `users.ts`（4）

| 功能     | 方法 | URL                 | 备注                                  |
| -------- | ---- | ------------------- | ------------------------------------- |
| 登录     | POST | `/user/login`       | 4 套账号，密码 `123456`；失败返 401   |
| 当前用户 | GET  | `/user/info`        | 靠 token 反查，未命中返 40100         |
| 权限查询 | GET  | `/user/permissions` | 三级权限唯一来源                      |
| 退出     | POST | `/user/logout`      | —                                     |

### SSO —— `sso.ts`（2）

| 功能           | 方法 | URL           | 备注                                   |
| -------------- | ---- | ------------- | -------------------------------------- |
| 签发授权码     | POST | `/sso/login`  | 返回一次性 `code`                       |
| code 换 token  | POST | `/sso/token`  | 校验 `client_id`；code 用完即销毁       |

### 员工 —— `employees.ts`（8）

| 功能       | 方法 | URL                     | 备注                            |
| ---------- | ---- | ----------------------- | ------------------------------- |
| 分页列表   | POST | `/employee/list`        | 1 万条 + 5 维过滤                |
| 全量       | POST | `/employee/all`         | 供导出用                        |
| 新增       | POST | `/employee/add`         | unshift 到列表头部              |
| 批量导入   | POST | `/employee/import`      | body `{ rows }`，返回写入条数    |
| 更新单条   | POST | `/employee/update`      | 未命中返 `code 400`             |
| 批量删除   | POST | `/employee/delete`      | body `{ ids }`，返回删除条数     |
| 批量更新   | POST | `/employee/batchUpdate` | body `{ ids, patch }`，返回条数  |
| 字典       | GET  | `/employee/options`     | 部门 / 职位 / 部门→职位联动表    |

### 看板 —— `dashboard.ts`（1）

| 功能     | 方法 | URL                  | 备注                |
| -------- | ---- | -------------------- | ------------------- |
| 看板汇总 | GET  | `/dashboard/summary` | 支持 `?dept=` 联动  |

### 审批 —— `workflow.ts`（4）

| 功能     | 方法 | URL                 | 备注                                   |
| -------- | ---- | ------------------- | -------------------------------------- |
| 任务列表 | POST | `/workflow/list`    | body `{ tab: 'todo'\|'done'\|'mine' }`  |
| 流程详情 | GET  | `/workflow/detail`  | `?id=`，含 4 节点时间线                 |
| 通过     | POST | `/workflow/approve` | 改内存状态                              |
| 驳回     | POST | `/workflow/reject`  | 改内存状态                              |

### 消息 —— `message.ts`（3）

| 功能     | 方法 | URL                | 备注                        |
| -------- | ---- | ------------------ | --------------------------- |
| 消息列表 | GET  | `/message/list`    | todo / notice / system 三类 |
| 标记已读 | POST | `/message/read`    | body `{ id }`               |
| 全部已读 | POST | `/message/readAll` | —                           |

---

## 8. 已知限制

### 8.1 刷新页面会掉登录（最影响演示体验的一条）

mock 的 `tokens` 表在**模块内存**里，页面刷新会让模块重新求值 → token 表清空 →
`/user/info` 返回 `40100` → `RequireAuth` 的 `fetchProfile()` 失败 → 按未登录跳回 `/login`。

**这是 mock 的固有限制，不是 bug**，但它对"点开网址随手体验一下"的场景不太友好：
刷新之后会回到登录页，得重新登一次。演示时**登完别刷新**即可绕开。

要修的话最省事的做法：在 `users.ts` 里把 token 表落一份到 `localStorage`，
`setupMock` 时读回来；或者干脆预置几个长期有效的假 token。
（代价是要额外处理"什么时候清"的逻辑，所以当前没做。）

### 8.2 新增/删除的数据刷新即重置

所有 mock 数据都在内存里。`add` 加的员工、`delete` 删的记录、`approve` 改的状态，
刷新后全部回到初始状态。可复现性反而是这里的优点（见 §5 `_shared.ts`）。

### 8.3 只拦 axios

`fetch` / `<img>` / `EventSource` 都拦不住。**约定：项目内所有请求必须走 `api`**。
这也是实时消息只能靠 `setInterval` 模拟的原因。

### 8.4 不做服务端计算

草稿、导入解析、看板导出这些需求**故意没有 mock 接口**——它们本来就应该在浏览器里算完（见 §3）。

---

## 9. 设计取舍

- **为什么是 axios-mock-adapter**：项目里所有请求收敛在一个 axios 实例上，拦截点唯一。
  比 MSW 少一层 Service Worker，比 vite-plugin-mock 少一个构建期依赖。
- **为什么加 350ms 全局延迟**：让加载态、骨架屏、按钮 loading 这些交互真的被看到，
  否则本地 mock 太快，这些状态在演示里等于不存在。
- **为什么数据用确定性算法而不是随机数**：每次演示看到的 1 万条数据完全一样，
  截图、录屏、排查问题都可复现。随机数据会让"上次那个 bug 复现不出来"。
- **为什么长连接封装成 store action**：调用方与"推送怎么来的"解耦，
  dev 用 `setInterval`、prod 换 `EventSource`，调用方代码不变。
- **为什么 SSO 要真的校验 client_id 和一次性 code**：这是授权码模式的实质。
  去掉这两步，模拟就只剩"前端自己发个 token"，讲不清楚它和直接登录的区别。
- **为什么产物里 mock 也在**：没有后端。见 §2.3。

---

## 10. 常见坑（踩过的）

| 现象                             | 原因                                      | 解法                                                    |
| -------------------------------- | ----------------------------------------- | ------------------------------------------------------- |
| 请求没被拦截，直接打到网络报 404 | mock 里 path 写了 `/api/xxx`              | 去掉 `/api` 前缀（§1 红线 1）                            |
| `JSON.parse` 报错 / 拿不到参数   | `config.data` 是**字符串**不是对象        | `JSON.parse(config.data)`；GET 用 `config.params`        |
| 业务层拿到 `undefined`           | 返回的不是 `{ code, data, message }`      | 必须包这层壳，`code: 0` 才会解包                        |
| 业务错误没被识别成错误           | 用了 HTTP 状态码（如 403）而非业务 `code` | 统一 `200 + code: 40xxx`，请求层只看 `code`             |
| 刷新页面后掉登录                 | mock 的 token 表在内存里，刷新即清空      | 见 §8.1（演示前先登录，别刷新）                          |
| 新增的员工刷新后消失             | 所有 mock 数据都在内存里                  | 正常现象（§8.2）                                        |
| 定时器越滚越多                   | 组件卸载没调 `stopSubscribe`              | `useEffect` 清理函数里务必调用（§6）                     |
| 看板筛选点了没反应               | 忘了把 `dept` 传给 `summary()`            | `services/dashboard.ts` 的 `summary(dept?)` 已支持       |
| 筛选部门后岗位下拉出现空结果     | 字典和生成数据的岗位对不上                | 两处都读 `_shared.ts` 的 `DEPT_POSITIONS`，别各写一份    |
