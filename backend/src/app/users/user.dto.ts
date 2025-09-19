
import { IsString, MinLength, IsOptional, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';


export class CreateUserDto {
    @ApiProperty({ description: '用户名（唯一）', minLength: 4, example: 'alice' })
    @IsString()
    @MinLength(4)
    username!: string;

    @ApiProperty({ description: '用户登录密码（明文传入，服务端会加密存储）', minLength: 6, example: 'Passw0rd!' })
    @IsString()
    @MinLength(6)
    password!: string;

    @ApiProperty({ description: '邮箱（唯一）', example: 'alice@example.com' })
    @IsString()
    @MinLength(6)
    email!: string;

    @ApiProperty({ description: '邀请码', example: 'abc123' })
    @IsString()
    invitationCode!: string;

    @ApiProperty({ description: '用户角色', example: 'user', enum: ['user', 'admin'], required: false })
    @IsOptional()
    @IsString()
    role?: string;
}

export class LoginDto {
    @ApiProperty({ description: '用户名', example: 'alice' })
    username?: string;
    
    @ApiProperty({ description: '密码', example: 'abc123' })
    password?: string;

    @ApiProperty({ description: '验证码 ID', example: 'abc123' })
    captchaId?: string;

    @ApiProperty({ description: '验证码文本', example: 'abc123' })
    captchaText?: string;
}

// 用于对外返回的用户信息（不含密码）
export class UserResponseDto {
    @ApiProperty({ description: '用户 ID', example: 1 })
    id!: number;

    @ApiProperty({ description: '用户名', example: 'alice' })
    username!: string;

    @ApiProperty({ description: '邮箱', example: 'alice@example.com' })
    email!: string;

    @ApiProperty({ description: '头像 URL', example: '1730000000000-123456789.png', required: false })
    @IsOptional()
    avatar?: string;

    @ApiProperty({ description: '角色', example: 'user', enum: ['user', 'admin'] })
    role!: string;

    @ApiProperty({ description: '创建时间 (ISO8601)', example: '2025-08-18T08:00:00.000Z' })
    createdAt!: Date;

    @ApiProperty({ description: '更新时间 (ISO8601)', example: '2025-08-18T09:00:00.000Z' })
    updatedAt!: Date;
}

// 更新个人资料（邮箱 + 头像上传）
export class UpdateProfileDto {
    @ApiProperty({ description: '新的邮箱', example: 'newalice@example.com', required: false })
    @IsOptional()
    @IsEmail()
    email?: string;

    @ApiProperty({ description: '用户的个人网站', example: 'https://kirigaya.cn', required: false })
    website?: string;

    @ApiProperty({ description: '本我属性ID', example: '1', required: false })
    egoId?: string;
}