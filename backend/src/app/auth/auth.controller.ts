import { Controller, Post, Body, HttpCode, Res, Req } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { CreateUserDto, LoginDto } from '@/app/users/user.dto';
import { JwtService } from '@nestjs/jwt';
import { ApiTags, ApiOperation, ApiBody, ApiCreatedResponse, ApiOkResponse } from '@nestjs/swagger';
import { CaptchaService } from './captcha.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
    constructor(
        private authService: AuthService,
        private jwtService: JwtService,
        private captchaService: CaptchaService
    ) { }

    @Post('register')
    @ApiOperation({ summary: '注册新用户' })
    @ApiCreatedResponse({ description: '注册成功，返回新用户（不含密码）' })
    @ApiBody({ type: CreateUserDto })
    async register(@Body() createUserDto: CreateUserDto) {
        return this.authService.register(createUserDto);
    }

    @HttpCode(200)
    @Post('login')
    @ApiOperation({ summary: '用户登录 / Cookie 会话续期', description: '若请求带有效 jwt Cookie，则直接返回用户状态；否则使用用户名+密码登录并写入 httpOnly Cookie。' })
    @ApiBody({ required: false, schema: { type: 'object', properties: { username: { type: 'string', example: 'alice' }, password: { type: 'string', example: '123456' } } } })
    @ApiOkResponse({ description: '返回 { success, message, user } 或错误信息' })
    async login(
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
        @Body() loginDto?: LoginDto
    ) {
        // 检查是否存在有效的 JWT cookie
        const token = req.cookies?.jwt;
        if (token) {
            try {
                // 验证 token 是否有效
                const payload = this.jwtService.verify(token);
                const user = await this.authService.validateUserById(payload.sub);
                if (user) {
                    return {
                        success: true,
                        message: 'Already logged in',
                        user
                    };
                }

                res.clearCookie('jwt', {
                    httpOnly: true,
                    sameSite: 'lax',
                });
                return {
                    success: false,
                    message: 'Invalid token',
                    user
                };
            } catch (e) {
                // token 无效，继续正常登录流程
                res.clearCookie('jwt', {
                    httpOnly: true,
                    sameSite: 'lax',
                });
                return {
                    success: false,
                    message: 'Invalid token',
                    user: null
                };
            }
        }

        if (!loginDto) {
            res.clearCookie('jwt', {
                httpOnly: true,
                sameSite: 'lax',
            });
            return {
                success: false,
                message: 'Invalid token and no login data provided',
                user: null
            };
        }

        const captchaOk = this.captchaService.validateCaptcha(loginDto.captchaId, loginDto.captchaText);
        if (!captchaOk) {
            return { error: 'Invalid captcha' };
        }

        // 正常登录流程
        const user = await this.authService.validateUser(loginDto);

        if (!user) {
            return { error: 'Invalid credentials' };
        }
        const { accessToken } = await this.authService.login(user);

        // 设置 cookie
        res.cookie('jwt', accessToken, {
            httpOnly: true,
            sameSite: 'lax',
            // secure: true, // 生产环境建议开启
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7天
        });

        return {
            success: true,
            message: 'Login successful',
            user
        };
    }

    @Post('logout')
    @HttpCode(200)
    @ApiOperation({ summary: '退出登录', description: '清除 jwt httpOnly Cookie。' })
    @ApiOkResponse({ description: '返回 { success: true }' })
    async logout(
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response
    ) {
        // 清除 JWT Cookie
        res.clearCookie('jwt', {
            httpOnly: true,
            sameSite: 'lax',
        });

        return { success: true, message: 'Logged out successfully' };
    }
}
