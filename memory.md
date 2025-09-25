## 项目描述

这是一个使用AI生成slidev幻灯片的一体式平台。


frontend为前端，使用vue编写，使用了tailwindcss，并且引入了i18n插件，任何展示在前端的内容均不要直接写文字，而是使用i18n的格式，先在frontend\src\i18n的几个json中新建对应的key-value，然后在代码中使用t函数。

backend为后端，使用nestjs编写。

## 项目结构

### 前端 (frontend/)
- 技术栈: Vue.js + TypeScript + Vite
- 样式框架: Tailwind CSS
- 包管理器：Yarn 1.22.22
- 主要目录:
  - `src/api/`: API接口封装
  - `src/components/`: 页面的子组件，例如搜索弹窗。
  - `src/views/`: 每个页面，和路由对应。
  - `src/router/`: 路由配置
  - `src/store/`: 状态管理，把一些数据存储和处理的代码都写到这里面，比如slide的搜索，从这里保存搜索结果，也从这里调用搜索函数，将搜索函数和结果变量对外暴露在组件中使用。
  - `src/i18n/`: 国际化配置文件(JSON)
  - `src/utils/`: 工具函数
  - `src/assets/`: 静态资源
- 构建: 使用命令`yarn dev`命令可运行，Vite构建工具，支持热更新和快速构建。

### 后端 (backend/)
- **技术栈**: NestJS + TypeScript + SQLite
- **主要目录**:
  - `src/app/`: 核心业务模块
  - `src/database/`: 数据库配置和实体
  - `src/middleware/`: 中间件
  - `src/decorators/`: 自定义装饰器
  - `src/utils/`: 工具函数
  - `src/constant/`: 常量定义
  - `src/scripts/`: 脚本文件
- **数据库**: SQLite (`database.sqlite`)
- **文件存储**:
  - `uploads/`: 用户上传文件存储
  - `markdown-files/`: 生成的Markdown幻灯片文件
  - `presentation/`: 构建后的幻灯片展示文件
- **MCP集成**: `slidev-mcp/` - Model Context Protocol服务器，在代码中检测如果没有则从git拉取。

## 部署方案

使用Docker容器化部署，支持`docker-compose`一键部署。