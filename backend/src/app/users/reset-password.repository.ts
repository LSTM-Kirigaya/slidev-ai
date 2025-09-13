import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ResetPassword } from './reset-password.entity';

@Injectable()
export class ResetPasswordRepository {
    constructor(
        @InjectRepository(ResetPassword)
        private readonly repository: Repository<ResetPassword>,
    ) {}

    async create(resetPassword: Partial<ResetPassword>): Promise<ResetPassword> {
        const newResetPassword = this.repository.create(resetPassword);
        return this.repository.save(newResetPassword);
    }

    async findOneByHashId(hashId: string): Promise<ResetPassword | null> {
        return this.repository.findOne({
            where: { hashId }
        });
    }

    async findByUserId(userId: number): Promise<ResetPassword[]> {
        return this.repository.find({
            where: { userId }
        });
    }

    async deleteByHashId(hashId: string): Promise<void> {
        await this.repository.delete({ hashId });
    }

    async deleteById(id: number): Promise<void> {
        await this.repository.delete(id);
    }
}