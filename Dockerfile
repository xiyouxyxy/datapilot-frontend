# syntax=docker/dockerfile:1

# =============================================================
# 阶段 1：构建（builder）
# 在 node 环境里装依赖、跑 vite build，产出静态文件 dist/
# =============================================================
FROM node:22-alpine AS builder

WORKDIR /app

# 先只复制依赖清单，而不是整个项目 —— 利用 Docker 层缓存：
# 只要 package.json / package-lock.json 没变，下面这层安装就不会重跑
COPY package.json package-lock.json ./

# HUSKY=0：容器里没有 .git 目录，跳过 husky 安装 git hooks 这一步
RUN HUSKY=0 npm ci

# 再复制源码。源码改动只会让这一层及其之后重新构建
COPY . .

RUN npm run build

# =============================================================
# 阶段 2：运行（runner）
# 只把 dist/ 拷进 nginx 镜像 —— node 运行时和源码都不进最终镜像，
# 所以镜像体积从「几百 MB」降到「几十 MB」
# =============================================================
FROM nginx:stable-alpine AS runner

# 用项目自己的 nginx 配置覆盖默认站点配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 只拷贝构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

# 前台运行，容器进程不退出
CMD ["nginx", "-g", "daemon off;"]
