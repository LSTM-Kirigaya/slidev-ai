import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Invitation } from './invitation.entity';

@Injectable()
export class InvitationRepository {
    constructor(
        @InjectRepository(Invitation)
        private readonly repository: Repository<Invitation>,
    ) {}

    async create(invitation: Partial<Invitation>): Promise<Invitation> {
        const newInvitation = this.repository.create(invitation);
        return this.repository.save(newInvitation);
    }

    async findAll(): Promise<Invitation[]> {
        return this.repository.find();
    }

    async findOneById(id: number): Promise<Invitation | null> {
        return this.repository.findOneBy({ id });
    }

    async findOneByCode(code: string): Promise<Invitation | null> {
        return this.repository.findOneBy({ code });
    }

    async update(id: number, updateData: Partial<Invitation>): Promise<Invitation | null> {
        await this.repository.update(id, updateData);
        return this.findOneById(id);
    }

    async delete(id: number): Promise<void> {
        await this.repository.delete(id);
    }
}