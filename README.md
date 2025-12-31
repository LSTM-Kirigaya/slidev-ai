<div align="center">


<img src="frontend/src/assets/icons/slidev-ai.svg" height="200px" />

<a href="https://github.com/LSTM-Kirigaya/slidev-ai"> <img src="https://img.shields.io/github/stars/LSTM-Kirigaya/slidev-ai?style=social" alt="GitHub Stars"></a><a href="https://opensource.org/licenses/MIT"> <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License"></a><a href="https://kirigaya.cn/openmcp/"> <img src="https://img.shields.io/badge/OpenMCP_SDK-0.1.0-blue" alt="License"></a>

<h3>Slidev AI - AI-Powered Presentation Creation Platform</h3>

*From ideas to presentations to content distribution — our mission is to shorten the distance.*

English | [中文](README.zh.md) | [Video](https://www.bilibili.com/video/BV1SMhBzJEUL)

</div>


## 🚀 Overview

Slidev-AI is a web app that leverages LLM (Large Language Model) technology to make creating Slidev-based online presentations elegant and effortless. It is designed to help engineers and academics quickly produce content-focused, minimalist PPTs that are easily shareable online.

> 🎉 SlidevAI received the Best Application Award in [ModelScope MCP&Agent Competition](https://modelscope.cn/active/aihackathon-mcp-agent).

slidev-ai is a downstream implementation within the [OpenMCP](https://github.com/LSTM-Kirigaya/openmcp-client) ecosystem, demonstrating how developers can build specialized agents using OpenMCP's powerful framework. This project serves as:

- A reference implementation for OpenMCP agent development
- A production-ready presentation generation solution
- A template for creating domain-specific AI agents

## 🎯 Design Boundary

### What Slidev AI Can Do

Slidev AI is designed for scenarios where you have a high-density text material that you want to present in PPT format along with a speech. It's perfect for creating presentations from well-structured content where the main purpose is to convert text into visual slides. Typical use cases include: team meeting reports, internal technical presentations.

### What Slidev AI Cannot Do

Slidev AI cannot understand and interpret text that you yourself don't fully comprehend, nor can it create PPTs that conform to your specific contextual requirements. It cannot deeply analyze and restructure unclear content. Typical scenarios that are not suitable for Slidev AI include: paper interpretation PPTs, company annual reports, where the content requires deep understanding and contextual adaptation.



Check out the full demo on Bilibili: 


<a href="https://www.bilibili.com/video/BV1SMhBzJEUL/?spm_id_from=333.1387.homepage.video_card.click&vd_source=3f248073d6ebdb61308992901b606f24" target="_blank"><img src="https://pica.zhimg.com/80/v2-3674ccdc2ceef8255724dbf078cf6ee7_1440w.png" /></a>

🔗 [OpenMCP Document](https://kirigaya.cn/openmcp/)

## 💡 AI-Powered Project Generation Prompt

For developers looking to create similar AI-powered applications, here's a comprehensive prompt you can use with LLM to generate a similar website project:

[PROMPT.md](docs/PROMPT.md)

## Getting Started

Please refer to [Quick Start](docs/quickstart.md). For containerized deployment, see [Deploy with Docker](docs/deploy_docker.md) | [中文文档](docs/deploy_docker_zh.md).

## Deploy with Docker

Two containers are recommended:
- backend: NestJS API on port 3001 (uses SQLite and Puppeteer)
- frontend: Vite+Vue static site served by Nginx on port 8080

We provide `backend/Dockerfile`, `frontend/Dockerfile`, and `docker-compose.yml`.

1) Prepare environment variables (backend validates these at startup):

On Windows cmd (temporarily for current shell):

```
set OPENAI_API_KEY=your_key
set OPENAI_BASE_URL=https://api.openai.com/v1
set OPENAI_MODEL=gpt-4o-mini
```

Or create a `.env` at repo root:

```
OPENAI_API_KEY=your_key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
```

2) Build and start:

```
docker compose up -d --build
```

3) Access:
- Frontend: http://localhost:8080
- Backend API: http://localhost:3001/api

Volumes: uploads (backend_data), presentations (presentation_data), and sqlite (sqlite_data) persist across restarts.

Notes:
- Frontend API endpoint is configured at build time via `VITE_DOMAIN`, `VITE_PORT`, and `VITE_ENABLE_HTTPS`. The compose file defaults to `localhost:3001`.
- Puppeteer dependencies are preinstalled in the backend image and run with `--no-sandbox` flags.
- If ports 8080 or 3001 are occupied, edit the `ports` section in `docker-compose.yml`.

## 🤝 Contributing

We welcome contributions from the community! Please see our [Contribution Guidelines](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md) for details.

## 📜 License

Slidev AI is open-source software licensed under the **MIT License** with additional terms for commercial use. See [LICENSE](LICENSE) for full details.

## 🌍 Community & Support

If you seek for tech support and deeper understanding of Slidev AI, please join our OpenMCP qq group:

<div align="center"> <a href="https://qm.qq.com/cgi-bin/qm/qr?k=C6ZUTZvfqWoI12lWe7L93cWa1hUsuVT0&jump_from=webapi&authKey=McW6B1ogTPjPDrCyGttS890tMZGQ1KB3QLuG4aqVNRaYp4vlTSgf2c6dMcNjMuBD" target="_blank" > <img src="https://img.icons8.com/color/24/000000/qq.png" style="vertical-align: middle; margin-right: 8px;" alt="QQ"> OpenMCP Developer Group </a> </div>

---

*"From ideas to presentations to content distribution — our mission is to shorten the distance."* - The Slidev AI Team