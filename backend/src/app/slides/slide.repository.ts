import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Slide } from './slide.entity';
import { searchSlidesRes } from './slide.dto';

@Injectable()
export class SlideRepository {
    constructor(
        @InjectRepository(Slide)
        private readonly slideRepository: Repository<Slide>,
    ) { }

    async create(slide: Partial<Slide>): Promise<Slide> {
        console.log('Creating slide with data:', slide);
        return this.slideRepository.save(
            this.slideRepository.create(slide)
        );
    }

    async findAll(): Promise<Slide[]> {
        return this.slideRepository.find();
    }

     async findOneById(id: number): Promise<Slide | null> {
        return this.slideRepository.findOne({ where: { id } });
    }

    /**
     * 查询某用户的幻灯片，可选 visibility: 'public' | 'private' | 'all'
     */
    async findByUserId(userId: string, visibility: 'public' | 'private' | 'all' = 'all'): Promise<Slide[]> {
        if (visibility === 'all') {
            return this.slideRepository.find({ where: { userId } });
        }
        return this.slideRepository.find({ where: { userId, visibility } });
    }

    async update(id: number, update: Partial<Slide>): Promise<Slide> {
        await this.slideRepository.update(id, update);
        const updated = await this.findOneById(id);
        if (!updated) throw new NotFoundException('Slide not found');
        return updated;
    }

    /**
     * 查询公开幻灯片
     */
    async getPublicSlides(userId: string | null, skip: number, take: number): Promise<[Slide[], number]> {
        const qb = this.slideRepository
            .createQueryBuilder('slide')
            .where('slide.visibility = :visibility AND slide.processingStatus = :processingStatus', {
                visibility: 'public',
                processingStatus: 'completed'
            })
            .leftJoinAndSelect('slide.user', 'user')
            .select([
                'slide.id',
                'slide.title',
                'slide.coverFilename',
                'slide.updatedAt',
                'slide.createdAt',
                'slide.processingStatus',
                'user.username',
                'user.avatar',
                'user.id'
            ])
            .skip(skip)
            .take(take);

        if (userId) {
            qb.andWhere('slide.userId = :userId', { userId });
        }

        return qb.getManyAndCount();
    }


    async remove(id: number): Promise<void> {
        await this.slideRepository.softDelete(id);
    }

    async search(query: string,userId: number | null = null): Promise<searchSlidesRes> {
    const [slides, total] = await this.slideRepository
        .createQueryBuilder('slide')
        .select([
            'slide.id',
            'slide.title', 
            'slide.createdAt',
            'slide.updatedAt',
            'slide.processingStatus',
            'user.id',
            'user.username'
        ])
        .where('slide.title LIKE :query', { query: `%${query}%` })
        .andWhere('slide.visibility = :visibility', { visibility: 'public' })
        .andWhere('slide.processingStatus = :processingStatus', { processingStatus: 'completed' })
        .leftJoin('slide.user', 'user')
        .getManyAndCount();

        return { total, slides };
    }
}
