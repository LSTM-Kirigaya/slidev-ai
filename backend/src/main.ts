// 先执行 LLM 环境变量检查（若缺失会直接退出）
import './init-llm';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { existsSync, mkdirSync } from 'fs';
import cookieParser from 'cookie-parser';
import { SlidevManagerService } from './app/slides/slidev-manager.service';
import morgan from 'morgan';
import { SsoLite } from './utils';
import { setupSwaggerMiddleware } from './middleware/swagger.middleware';
import { spaFallbackMiddleware } from './middleware/spa-fallback.middleware';
import path from 'path';

async function bootstrap() {

    // 确保uploads目录存在
    const uploadDir = SsoLite.root();
    if (!existsSync(uploadDir)) {
        mkdirSync(uploadDir);
    }

    const app = await NestFactory.create(AppModule);
    
    // 设置全局前缀 api
    app.setGlobalPrefix('api');

    // 添加 swagger
    setupSwaggerMiddleware(app);

    // 添加 cookie 解析器
    app.use(cookieParser());

    // 添加参数验证
    app.useGlobalPipes(new ValidationPipe());

    if (process.env.NODE_ENV === 'development') {
        app.enableCors({
            origin: 'http://localhost:3000',
            credentials: true,
        });
    } else if (process.env.CORS_ORIGIN) {
        // Allow CORS in production when explicitly configured
        app.enableCors({
            origin: process.env.CORS_ORIGIN,
            credentials: true,
        });
    }

    // 设置 logger
    app.use(morgan('dev'));

    // 在容器环境下禁用 SPA fallback，因为前端由独立容器服务
    if (process.env.NODE_ENV === 'development') {
        // 启动 SPA 回退中间件（仅开发环境）
        app.use(spaFallbackMiddleware({
            spaPath: path.join(__dirname, '..', '..', 'dist', 'app'),
            excludedPrefixes: ['/api', '/docs', '/uploads'],
        }));
    }


    await app.listen(process.env.PORT || 3001);
}
bootstrap();