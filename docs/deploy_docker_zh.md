# 使用 Docker 部署

本文档介绍如何使用 Docker 与 docker compose 以两个容器（后端 NestJS、前端 Nginx）方式运行 slidev-ai。

## 前置条件
- 可访问公网以拉取基础镜像
- OPENAI 凭证（后端启动时会校验）

## 服务与端口
- 后端（NestJS）：监听 3001（对外暴露 3001）
- 前端（Nginx）：监听 80（映射到宿主机 8080）

## 环境变量（后端）
后端启动时会校验以下变量：

- `OPENAI_API_KEY`: 你的 API key
- `OPENAI_BASE_URL`: 如 `https://api.openai.com/v1`
- `OPENAI_MODEL`: 如 `gpt-4o-mini`

可以在 shell 中设置，也可以在仓库根目录创建 `.env` 文件。

Windows cmd（当前窗口临时设置）：

```
set OPENAI_API_KEY=你的key
set OPENAI_BASE_URL=https://api.openai.com/v1
set OPENAI_MODEL=gpt-4o-mini
```

或 `.env` 文件：

```
OPENAI_API_KEY=你的key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
```

## 构建与运行

在仓库根目录执行：

```
docker compose up -d --build
```

访问：
- 前端：http://localhost:8080
- 后端 API：http://localhost:3001/api

## 数据持久化
compose 将以下宿主机路径与容器路径绑定：
- `backend/uploads` -> `/app/uploads`
- `backend/presentation` -> `/app/presentation`
- `backend/database.sqlite` -> `/app/database.sqlite`

## 配置前端的 API 地址
前端在构建时通过以下变量注入后端地址：
- `VITE_DOMAIN`（默认：`localhost`）
- `VITE_PORT`（默认：`3001`）
- `VITE_ENABLE_HTTPS`（默认：`false`）

如果将后端部署到其他域名/端口/协议，请修改 `docker-compose.yml` 中 frontend 的环境变量并重新构建。

## 常见问题
- 端口冲突：修改 `docker-compose.yml` 中的 `ports` 映射。
- Puppeteer 依赖：后端镜像已安装常用 Chromium 库；如个别主机缺库，按报错提示在 `backend/Dockerfile` 增加对应库。
- Slidev CLI 在线安装：后端找不到本地 CLI 时会回退到 `npx slidev`。为避免运行期联网拉包，建议将 `@slidev/cli` 加入 backend 的依赖后重建镜像。
