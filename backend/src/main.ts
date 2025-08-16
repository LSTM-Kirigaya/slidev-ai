import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import cookieParser from 'cookie-parser';
import { SlidevManagerService } from './app/slides/slidev-manager.service';

async function bootstrap() {
    // 确保uploads目录存在
    const uploadDir = join(__dirname, '..', 'uploads');
    if (!existsSync(uploadDir)) {
        mkdirSync(uploadDir);
    }

    const app = await NestFactory.create(AppModule);
    app.setGlobalPrefix('api');
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe());
    app.enableCors({
        origin: 'http://localhost:3000',
        credentials: true,
    });

    // 获取 SlidevManagerService 实例
    const slidevManager = app.get(SlidevManagerService);

    // 处理意外退出的清理函数
    const cleanup = () => {
        console.log('应用程序正在关闭，清理所有Slidev进程...');
        slidevManager.onApplicationShutdown();
    };

    // 监听进程退出信号
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('SIGQUIT', cleanup);
    process.on('uncaughtException', (error) => {
        console.error('未捕获的异常:', error);
        cleanup();
        process.exit(1);
    });
    process.on('unhandledRejection', (reason, promise) => {
        console.error('未处理的Promise拒绝:', reason);
        cleanup();
        process.exit(1);
    });

    await app.listen(3001);
}
bootstrap();