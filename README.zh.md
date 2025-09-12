<div align="center">

<img src="frontend/src/assets/icons/slidev-ai.svg" height="200px" />

<a href="https://github.com/LSTM-Kirigaya/slidev-ai"> <img src="https://img.shields.io/github/stars/LSTM-Kirigaya/slidev-ai?style=social" alt="GitHub Stars"></a><a href="https://opensource.org/licenses/MIT"> <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License"></a><a href="https://kirigaya.cn/openmcp/"> <img src="https://img.shields.io/badge/OpenMCP_SDK-0.1.0-blue" alt="License"></a>

<h3>Slidev AI - AI 驱动的演示文稿生成平台</h3>

*从想法到演示再到内容传播，我们的任务就是缩短它*

[English](./README.md) | 中文 | [视频](https://www.bilibili.com/video/BV1SMhBzJEUL)


</div>

---

## 🚀 项目简介

Slidev-AI 是一个基于 LLM（大语言模型）的 Web 应用，它能让创建基于 Slidev 的在线演示文稿变得优雅而轻松。  
它的设计目标是帮助工程师与学术人员快速生成内容为中心、简洁美观且易于在线分享的 PPT。

> 本项目同时是我参加 [ModelScope MCP&Agent Competition](https://modelscope.cn/active/aihackathon-mcp-agent) 的作品。

slidev-ai 是 [OpenMCP](https://github.com/LSTM-Kirigaya/openmcp-client) 生态下的一个下游实现，展示了开发者如何利用 OpenMCP 的强大框架构建专用 Agent。  
该项目的定位包括：

- OpenMCP Agent 开发的参考实现
- 可直接用于生产环境的演示文稿生成方案
- 构建领域专用 AI Agent 的模板

请在B站上查看介绍视频： 

<a href="https://www.bilibili.com/video/BV1SMhBzJEUL/?spm_id_from=333.1387.homepage.video_card.click&vd_source=3f248073d6ebdb61308992901b606f24" target="_blank"><img src="https://pica.zhimg.com/80/v2-3674ccdc2ceef8255724dbf078cf6ee7_1440w.png" /></a>



🔗 [OpenMCP 文档](https://kirigaya.cn/openmcp/)

## 💡 AI 项目生成提示词

对于想要开发类似 AI 应用的开发者，这里提供了一个完整的 LLM Prompt，可用于生成类似的前后端项目：

[PROMPT.md](docs/PROMPT.md)

## 📦 快速开始

请参阅[快速开始](docs/quickstart_zh.md)。如需容器化部署，见[Docker 部署说明](docs/deploy_docker_zh.md) | [English](docs/deploy_docker.md)。

## 使用 Docker 部署

推荐拆分为 2 个容器：
- backend：NestJS API（默认端口 3001），内置 Puppeteer 依赖与 SQLite
- frontend：Vite+Vue 构建产物，使用 Nginx 提供静态服务（默认映射 8080）

仓库已提供 `backend/Dockerfile`、`frontend/Dockerfile` 与 `docker-compose.yml`。

1) 准备环境变量（后端启动时会校验）：

在 Windows cmd.exe（当前窗口临时设置）：

```
set OPENAI_API_KEY=你的key
set OPENAI_BASE_URL=https://api.openai.com/v1
set OPENAI_MODEL=gpt-4o-mini
```

或在仓库根目录创建 `.env`：

```
OPENAI_API_KEY=你的key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
```

2) 构建并启动：

```
docker compose up -d --build
```

3) 访问：
- 前端：http://localhost:8080
- 后端 API：http://localhost:3001/api

数据持久化：compose 将 `backend/uploads`、`backend/presentation`、`backend/database.sqlite` 绑定到容器内路径，重启不丢数据。

注意：
- 前端在构建时通过 `VITE_DOMAIN`、`VITE_PORT`、`VITE_ENABLE_HTTPS` 注入 API 地址，默认指向 `localhost:3001`，如需变更可编辑 `docker-compose.yml`。
- 如 8080 或 3001 端口占用，可在 compose 中调整 `ports` 映射。
## 🤝 贡献指南

欢迎社区贡献！请参考 [贡献指南](CONTRIBUTING.md) 和 [行为准则](CODE_OF_CONDUCT.md)。

## 📜 开源协议

Slidev AI 基于 **MIT License** 开源，并对商业用途附加条款。详情请见 [LICENSE](LICENSE)。

## 🌍 社区与支持

如果你希望获取更多技术支持或深入理解 Slidev AI，欢迎加入 OpenMCP QQ 群：

<div align="center"> <a href="https://qm.qq.com/cgi-bin/qm/qr?k=C6ZUTZvfqWoI12lWe7L93cWa1hUsuVT0&jump_from=webapi&authKey=McW6B1ogTPjPDrCyGttS890tMZGQ1KB3QLuG4aqVNRaYp4vlTSgf2c6dMcNjMuBD" target="_blank" > <img src="https://img.icons8.com/color/24/000000/qq.png" style="vertical-align: middle; margin-right: 8px;" alt="QQ"> OpenMCP 开发者交流群 </a> </div>

---

*"从想法到演示再到内容传播，我们的任务就是缩短它"* - Slidev AI 团队
