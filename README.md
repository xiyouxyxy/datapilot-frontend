# DataPilot · 企业数据分析平台（前端）

[![CI](https://github.com/xiyouxyxy/datapilot-frontend/actions/workflows/ci.yml/badge.svg)](https://github.com/xiyouxyxy/datapilot-frontend/actions/workflows/ci.yml)

一个面向 **ToB 信息化场景** 的前端项目，覆盖「权限管控 / 万级数据表格 / 可视化看板 / 审批流 / 消息中心 / 复杂表单 / 数据导入」七大业务叙事。纯前端 + Mock 数据，开箱即跑，作为中后台前端能力的完整演示。

## 技术栈

| 类别     | 选型                                                        |
| -------- | ----------------------------------------------------------- |
| 框架     | React 19 + TypeScript（strict）                             |
| 构建     | Vite 8 + rolldown                                           |
| UI       | Ant Design 6                                                |
| 状态管理 | Zustand 5                                                   |
| 路由     | React Router 7（createBrowserRouter）                       |
| 图表     | ECharts 6（按需注册）                                       |
| 请求     | axios + axios-mock-adapter                                  |
| 国际化   | i18next + react-i18next（中英双语）                         |
| 测试     | Vitest + Testing Library                                    |
| 工程化   | ESLint（typescript-eslint）+ Prettier + husky + lint-staged |

## 功能特性

- **四级 RBAC 权限**：路由级 / 菜单级 / 按钮级（`<Authority>`）/ 字段级（`<Field>`），薪资、身份证等敏感字段按角色脱敏。
- **万级数据表格**：antd Table `virtual` 承载 1 万条数据，支持列设置持久化、多列筛选、批量删除/改状态/CSV 导出。
- **可视化看板**：6 张图表卡（KPI / 趋势 / 部门 / 职位 / 雷达 / 排行），点击部门柱联动筛选，卡片显隐持久化，PNG/PDF/Excel 三种导出。
- **审批流**：三 Tabs（待我审批 / 已办结 / 我发起的）+ 任务表格 + 详情抽屉（Descriptions + 垂直 Steps 时间线），通过/驳回按角色展示。
- **消息中心**：顶栏铃铛 + 未读 Badge + 抽屉四 tab + 单条/全部已读 + 实时订阅。
- **复杂表单向导**：4 步分步校验 + 部门↔岗位联动 + 角色权限预览 + 草稿自动保存 + 附件提交。
- **数据导入**：拖拽上传 Excel/CSV，Web Worker 内解析（30 万行不卡顿），逐行校验 + 错误行高亮 + 批量入库。
- **稳定性与可观测性**：ErrorBoundary + 路由错误兜底 + 全局 `onerror`/`unhandledrejection` 监听 + 埋点 SDK（PV/UV、点击、曝光、FCP/LCP/TTI）。
- **SSO 单点登录模拟**：OAuth2 授权码流（认证中心 → 一次性 code → 回调换 token）。
- **移动端适配**：窄屏 Sider 切 Drawer，抽屉响应式全宽。

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器（默认 http://localhost:5173）
npm run dev

# 生产构建
npm run build

# 预览构建产物
npm run preview

# 代码检查 / 格式化 / 测试
npm run lint
npm run typecheck
npm run format
npm run test
```

## 演示账号

登录页提供「一键快捷登录」，四套角色演示权限差异（密码均为 `123456`）：

| 账号       | 角色       | 权限差异                       |
| ---------- | ---------- | ------------------------------ |
| `admin`    | 系统管理员 | 菜单/按钮/字段全开             |
| `manager`  | 研发主管   | 部门管理 + 审批 + 工资字段可见 |
| `finance`  | 财务       | 金额/身份证字段可见 + 审批     |
| `employee` | 普通员工   | 仅看板/流程，无金额字段        |

## 目录结构

```
src/
├── components/        # 通用组件（Authority 按钮权限 / Field 字段权限 / MessageCenter 等）
├── pages/             # 页面（dashboard / employee / workflow / form / import / login / sso ...）
│   └── components/    # 页面级复用组件（BiChart / BatchActionBar / ColumnSettingModal ...）
│   └── employee/
│       ├── hooks/     # 员工页拆出的 5 个自定义 hook
│       └── columns.tsx# 列定义工厂
├── router/            # 路由 + 守卫（RequireAuth / Authorized）+ 菜单配置
├── store/             # Zustand 状态（user / app / message，只持久化 token）
├── services/          # 接口封装（user / employee / dashboard / workflow / message）
├── mock/              # Mock 数据（18 接口，含 1 万条员工生成器）
├── utils/             # 工具（请求封装 / 权限纯函数 / 导出 / Excel 解析 / 埋点 / 异常监听）
├── i18n/              # 中英双语资源
├── constants/         # 角色 / 权限码 / 字段码 / 存储键
└── types/             # 全局类型契约
```

## 部署

项目自带 **多阶段 Dockerfile + nginx 配置 + GitHub Actions CI/CD**，整条流水线开箱可用。

### 持续集成（CI）

每次 push 到 `main` 或提交 PR，GitHub Actions 自动执行：

```
类型检查 → ESLint → 单元测试 → 生产构建 → Docker 镜像构建 → 容器冒烟测试
```

其中冒烟测试会真的把容器跑起来，验证三件事：

- 首页返回 200
- **SPA 路由回退**：直接访问 `/employee`（磁盘上没有这个文件）也能正确返回 `index.html`
- 静态资源带上了预期的 `Cache-Control` 响应头

配置见 [`.github/workflows/ci.yml`](.github/workflows/ci.yml)。

### 持续部署（CD）

`main` 分支上 CI 全绿后，`deploy-pages` 任务会把构建产物自动发布到 **GitHub Pages**，得到一个不用 clone 就能直接打开的在线地址：

**https://xiyouxyxy.github.io/datapilot-frontend/**

因为是「项目站点」，站点挂在 `/<repo>/` 子路径下，这里顺手解掉了子路径部署特有的两个坑：

- **资源路径**：构建时用 `--base=/datapilot-frontend/` 覆盖 Vite 的 `base`，否则产物里写死的 `/assets/*.js` 会 404、页面白屏。
- **深链接 404**：Pages 没有 nginx 的 `try_files`，直接访问 `/datapilot-frontend/employee` 会真 404。发布前把 `index.html` 复制一份成 `404.html`，让 404 也回到 SPA 入口，由前端路由接管。

配套地，`src/router/index.tsx` 会把 `import.meta.env.BASE_URL` 交给 React Router 当 `basename`，保证子路径下深链接能被正确匹配；根路径部署时该值为空串，行为与之前完全一致。

### 用 Docker 运行

```bash
# 构建镜像
docker build -t datapilot-frontend .

# 启动容器
docker run -d -p 8080:80 --name datapilot datapilot-frontend

# 打开 http://localhost:8080
```

镜像采用**多阶段构建**，最终镜像里只有静态文件 + nginx：

| 阶段   | 基础镜像             | 作用                                  |
| ------ | -------------------- | ------------------------------------- |
| builder | `node:22-alpine`    | 装依赖 + `vite build`，产出 `dist/`   |
| runner  | `nginx:stable-alpine` | 只接收 `dist/`，对外提供静态服务    |

> 先 COPY 依赖清单再 COPY 源码，是为了让「装依赖」这一层能被 Docker 缓存复用 —— 只改业务代码时不会重新 `npm ci`。

### nginx 配置要点

`nginx.conf` 里几个容易踩坑的地方：

- **SPA 路由回退**：`try_files $uri $uri/ /index.html;` —— 少了这行，直接访问 `/employee` 会 404。
- **缓存策略**：`/assets/` 下是带 hash 的产物，可以 `immutable` 缓存一年；而 `index.html` 必须 `no-cache`，否则发版后用户会拿到旧壳子。
- **gzip**：对 JS / CSS / JSON / SVG 开启压缩。
- **反向代理预留**：接真实后端时，打开文件末尾 `/api/` 那段注释即可。

## 设计要点

- **权限模型**：`permissions = { menus, buttons, fields }`，判定逻辑收敛在 `utils/permission.ts` 纯函数，组件层（`Authority`/`Field`）与导出/脱敏共用同一套规则，避免「哪些字段需要脱敏」的知识散落漂移。
- **请求层**：axios 拦截器统一解包 `{ code, data, message }`，token 注入，401 通过自定义事件（`auth:expired`）通知路由层做 SPA 内跳转（避免 `location.href` 整页刷新丢状态）。
- **Mock 分层**：`VITE_USE_MOCK` 开关控制是否注入 `axios-mock-adapter`，业务代码零耦合，切真实后端时只改环境变量。
- **性能**：路由懒加载 + `manualChunks`（react-core / echarts 独立分包，antd 重组件按页分包），万级表格虚拟滚动，大文件导入走 Web Worker。
