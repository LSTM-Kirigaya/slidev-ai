import { Controller, Post, Body, HttpCode, Res, Req } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { CreateUserDto } from '@/app/users/user.dto';
import { JwtService } from '@nestjs/jwt';

@Controller('auth')
export class AuthController {
    constructor(
        private authService: AuthService,
        private jwtService: JwtService
    ) { }

    @Post('register')
    async register(@Body() createUserDto: CreateUserDto) {
        return this.authService.register(createUserDto);
    }

    @HttpCode(200)
    @Post('login')
    async login(
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
        @Body() loginDto?: { username: string; password: string }
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

        // 正常登录流程
        const user = await this.authService.validateUser(loginDto.username, loginDto.password);
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
