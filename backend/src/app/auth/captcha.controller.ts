import { Controller, Query, Res, Post } from '@nestjs/common';
import { CaptchaService } from './captcha.service';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';

@ApiTags('auth')
@Controller('auth')
export class CaptchaController {
    constructor(private readonly captchaService: CaptchaService) { }

    @Post('captcha')
    @ApiOperation({ summary: '获取验证码' })
    @ApiResponse({ status: 200, description: '返回验证码SVG图片和ID' })
    getCaptcha(
    ) {
        const { svg, id } = this.captchaService.generateCaptcha();

        return {
            success: true,
            data: {
                svg,
                id,
            },
        }
    }
}