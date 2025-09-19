import { CreateUserDto, LoginDto } from '@/app/users/user.dto';
import { UserRepository } from '@/app/users/users.repository';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { InvitationService } from '@/app/users/invitation.service';
import { CaptchaService } from './captcha.service';

@Injectable()
export class AuthService {
    constructor(
        private userRepository: UserRepository,
        private jwtService: JwtService,
        private invitationService: InvitationService,
        private captchaService: CaptchaService,
    ) { }

    async register(createUserDto: CreateUserDto): Promise<{ accessToken: string }> {
        // Check if user already exists
        const existingUser = await this.userRepository.findOneByUsername(createUserDto.username);
        if (existingUser) {
            throw new UnauthorizedException('Username already exists');
        }

        // Check invitation code
        const isValidInvitation = await this.invitationService.isValid(createUserDto.invitationCode);
        if (!isValidInvitation) {
            throw new UnauthorizedException('Invalid invitation code');
        }

        // 加密密码
        const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
        createUserDto.password = hashedPassword;
        createUserDto.role = 'user';

        // 创建用户
        const user = await this.userRepository.create(createUserDto);

        // Delete the invitation code after successful registration
        const invitation = await this.invitationService.findOneByCode(createUserDto.invitationCode);
        if (invitation) {
            await this.invitationService.delete(invitation.id);
        }

        // Generate JWT token
        const payload = { username: user.username, sub: user.id };
        return {
            accessToken: this.jwtService.sign(payload),
        };
    }

    async validateUser(loginDto: LoginDto): Promise<any> {
        // 然后再搜索用户进行密码比对
        const user = await this.userRepository.findOneByUsername(loginDto.username);
        if (user && await bcrypt.compare(loginDto.password, user.password)) {
            const { password, ...result } = user;
            return result;
        }
        return null;
    }

    async validateUserById(id: number) {
        const user = await this.userRepository.findOneById(id);
        return user;
    }

    async login(user: any): Promise<{ accessToken: string }> {
        const payload = { username: user.username, sub: user.id };
        return {
            accessToken: this.jwtService.sign(payload),
        };
    }
}