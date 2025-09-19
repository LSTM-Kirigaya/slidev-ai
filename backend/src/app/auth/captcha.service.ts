// captcha.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as svgCaptcha from 'svg-captcha';

interface CaptchaEntry {
    text: string;
    expiresAt: number;
}

@Injectable()
export class CaptchaService implements OnModuleInit, OnModuleDestroy {
    private readonly captchaStore: Map<string, CaptchaEntry> = new Map();
    private cleanupInterval: NodeJS.Timeout;
    private readonly ttl = 5 * 60 * 1000; // 验证码有效期：5 分钟

    onModuleInit() {
        // 定期清理过期的验证码
        this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 1000);
    }

    onModuleDestroy() {
        clearInterval(this.cleanupInterval);
    }

    generateCaptcha(): { svg: string; id: string } {
        const captcha = svgCaptcha.create({
            size: 4,
            ignoreChars: '0o1i',
            noise: 2,
            color: true,
            background: '#f0f0f0',
        });

        const id = this.generateId();
        this.captchaStore.set(id, {
            text: captcha.text.toLowerCase(),
            expiresAt: Date.now() + this.ttl,
        });

        // 限制存储大小
        if (this.captchaStore.size > 1000) {
            const firstKey = this.captchaStore.keys().next().value;
            this.captchaStore.delete(firstKey);
        }

        return {
            svg: captcha.data,
            id,
        };
    }

    validateCaptcha(id: string, text: string): boolean {
        const entry = this.captchaStore.get(id);

        // 验证码不存在或已过期
        if (!entry || entry.expiresAt < Date.now()) {
            this.captchaStore.delete(id);
            return false;
        }

        // 一次性使用
        this.captchaStore.delete(id);

        return entry.text === text.toLowerCase();
    }

    private generateId(): string {
        return (
            Math.random().toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15)
        );
    }

    private cleanup() {
        const now = Date.now();
        for (const [id, entry] of this.captchaStore.entries()) {
            if (entry.expiresAt < now) {
                this.captchaStore.delete(id);
            }
        }
    }
}
