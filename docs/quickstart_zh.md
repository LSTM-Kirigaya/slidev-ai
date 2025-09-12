## 快速开始

### 系统需求

- Node.js v18+
- Python 3.10+
- yarn 1.22+（推荐）或 npm 9+
- 至少 4GB 内存（推荐 8GB 开发环境）
- Playwright Chromium 运行所需的系统库；若首次运行提示缺依赖，可执行 `sudo uv run playwright install-deps`。

### 环境变量

下列变量可在项目backend目录创建 `.env` 文件进行配置。生产环境请使用安全的密钥管理方案（如 Vault / 环境注入等），不要将真实密钥写入代码库。

| 变量名 | 是否必填 | 示例值 | 说明 |
| ------ | -------- | ------ | ---- |
| JWT_SECRET | 是 | slidev-ai-jwt-secret-key | 用于签发/验证 JWT 的对称密钥，生产环境请使用足够复杂的随机字符串。 |
| PORT | 否 | 3001 | 后端服务监听端口。 |
| SLIDEV_MCP_REPO | 否 | https://github.com/LSTM-Kirigaya/slidev-mcp | MCP（模型能力插件）仓库地址，启动时若本地不存在会尝试克隆。 |
| SLIDEV_MCP_PATH | 否 | slidev-mcp | MCP 本地存放路径（相对项目根目录或绝对路径）。 |
| SLIDEV_MCP_UPDATE_INTERVAL | 否 | 3600000 | MCP 自动更新检查间隔，单位毫秒（示例为 1 小时）。 |
| OPENAI_API_KEY | 是（启用 AI 功能时） | sk-xxxxxxxPLACEHOLDER | OpenAI 兼容接口的 API Key。请使用你自己的密钥，不要提交到版本库。 |
| OPENAI_BASE_URL | 是 | https://api.deepseek.com | OpenAI 兼容接口的 Base URL，可替换为自建或代理地址。 |
| OPENAI_MODEL | 是 | deepseek-chat | 使用的模型名称，可按需要调整。 |
| ADMIN_USER | 否（未设置则默认 admin） | admin | 系统初始化时创建的管理员用户名。首次部署请修改为自定义值。 |
| ADMIN_PASSWORD | 否（未设置则默认 admin） | ChangeMe_123! | 系统初始化时管理员账户的明文密码（启动时会被哈希后存库）。强烈建议在生产中显式设置为高强度随机密码。 |

安全提示：
1. 生产环境绝不要保留默认 admin / admin 组合。
2. 修改 ADMIN_PASSWORD 后可在数据库中删除旧管理员再重启服务以重新生成。


示例 `.env`：

```bash
JWT_SECRET=slidev-ai-jwt-secret-key
PORT=3001
SLIDEV_MCP_REPO=https://github.com/LSTM-Kirigaya/slidev-mcp
SLIDEV_MCP_PATH=slidev-mcp
SLIDEV_MCP_UPDATE_INTERVAL=3600000
OPENAI_API_KEY=sk-xxxxxxxPLACEHOLDER
OPENAI_BASE_URL=https://api.deepseek.com
OPENAI_MODEL=deepseek-chat
ADMIN_USER=admin
ADMIN_PASSWORD=ChangeMe_123!
```

### 快速安装

以下脚本演示本地快速拉起（前端 + 后端 + Playwright Chromium）。在生产前请替换敏感变量。

```bash
git clone https://github.com/yourorg/slidev-ai.git
cd slidev-ai

# 安装工作区依赖（根/前端/后端）
yarn

# 进入 Python 子项目安装依赖与 Chromium 浏览器
cd backend/slidev-mcp
uv sync
uv run playwright install chromium
# （可选）若提示缺少系统库
sudo uv run playwright install-deps || true
```

首次触发需要无头浏览的功能（如 websearch）时，Python 侧 Playwright 将使用其缓存目录（通常位于 `~/.cache/ms-playwright`）。CI 环境可缓存该目录以加速重复构建。

#### Playwright 说明
- 以后想安装全部浏览器：`uv run playwright install`
- Python 侧使用 `crawl4ai` 间接依赖的 Playwright，与 Node 侧的 `@playwright/test` 分离。
- 若 `install-deps` 不可用，可根据启动警告列出的包手动 `apt-get install`。

### 本地开发

```bash
yarn dev
```

应用启动后可访问：

* 前端：[http://localhost:3000](http://localhost:3000)
* 后端 API：[http://localhost:3001](http://localhost:3001)
