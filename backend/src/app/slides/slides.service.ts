import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { Observable, Subscriber } from 'rxjs';

import { OmAgent } from 'openmcp-sdk/service/sdk';
import { SlidevMcpService } from '@/app/mcp/slidev-mcp.service';
import { SlideRepository } from './slide.repository';
import { CreateSlideDto, SlidevProjectDto } from './slide.dto';
import { Slide } from './slide.entity';
import { toSseData } from '@/utils/sse';
import path from 'path';

// 定义文件类型
type MulterFile = Express.Multer.File;

// 定义SSE事件数据结构
interface SSEEvent {
    type: string;
    message: string;
    progress?: number;
    data?: any;
}

@Injectable()
export class SlidesService {
    constructor(
        private readonly slidesRepository: SlideRepository,
        private readonly slidevMcpService: SlidevMcpService,
    ) { }

    /**
     * @description 创建给定素材的幻灯片项目，并塞入数据库
     */
    async createSlide(userId: string, createSlideDto: CreateSlideDto, file?: MulterFile): Promise<Slide> {
        // TODO: 解析文件 file 并进入数据库

        return this.slidesRepository.create({
            title: createSlideDto.title,
            content: createSlideDto.content,
            visibility: createSlideDto.visibility,
            userId,
            processingStatus: 'pending'
        });
    }

    async getAgentDependency() {
        const configurationPath = this.slidevMcpService.generateOpenMcpConfig();
        const agent = new OmAgent();
        agent.loadMcpConfig(configurationPath);
        const loop = await agent.getLoop();
        return { agent, loop };
    }

    /**
     * 保存幻灯片的 slides_path
     */
    async saveSlidesPath(id: number, userId: string, slidevData: SlidevProjectDto) {
        const slide = await this.slidesRepository.findOneById(id);
        
        if (!slide) {
            throw new Error('Slide not found');
        }
        
        if (slide.userId !== userId) {
            throw new Error('Unauthorized');
        }

        // 标记为完成，并插入 slidevData
        await this.slidesRepository.update(id, { 
            processingStatus: 'completed',
            slidevName: slidevData.name,
            slidevHome: slidevData.home,
            slidevEntryFile: slidevData.slides_path,
        });
        
        return { success: true };
    }

    /**
     * 保存幻灯片的大纲数据
     */
    async saveOutlines(id: number, userId: string, outlines: any) {
        const slide = await this.slidesRepository.findOneById(id);
        
        if (!slide) {
            throw new Error('Slide not found');
        }
        
        if (slide.userId !== userId) {
            throw new Error('Unauthorized');
        }
        
        // 将outlines对象转换为JSON字符串存储
        this.slidesRepository.update(id, { outlines: JSON.stringify(outlines) });
        
        return { success: true }
    }

    /**
     * 检查幻灯片是否已经生成了大纲
     */
    async hasOutlines(id: number, userId: string): Promise<boolean> {
        const slide = await this.slidesRepository.findOneById(id);
        
        if (!slide) {
            throw new Error('Slide not found');
        }
        
        if (slide.userId !== userId && slide.visibility !== 'public') {
            throw new Error('Unauthorized');
        }
        
        return !!slide.outlines;
    }

    /**
     * @description 创建 outline 任务，并返回中途进度
     */
    async makeOutlineHandler(id: number, subscriber: Subscriber<any>) {
        const slide = await this.slidesRepository.findOneById(id);

        if (!slide) {
            subscriber.next(toSseData({ type: 'error', message: 'Slide not found' }));
            subscriber.complete();
            return;
        }

        const { agent, loop } = await this.getAgentDependency();

        const saveOutlineIds = new Set();

        loop.registerOnToolCall(toolcall => {
            subscriber.next(toSseData({
                type: 'toolcall',
                toolcall,
            }));

            if (toolcall.function.name === 'slidev_save_outline') {
                saveOutlineIds.add(toolcall.id);
            }
            
            return toolcall;
        });

        loop.registerOnToolCalled(toolcalled => {

            if (saveOutlineIds.has(toolcalled.id)) {
                loop.abort();
            }
            
            subscriber.next(toSseData({
                type: 'toolcalled',
                toolcalled,
            }));

            return toolcalled;
        });

        loop.registerOnError(error => {
            subscriber.next(toSseData({ error }));
            console.log('error', error);
        });

        const usermcpPrompt = await agent.getPrompt('usermcp_guide_prompt', {});
        const outlinePrompt = await agent.getPrompt('outline_generate_prompt', {
            title: slide.title,
            content: slide.content,
        });

        const prompts = [
            usermcpPrompt,
            outlinePrompt,
        ];

        await agent.ainvoke({ messages: prompts.join('\n\n') });

        subscriber.next(toSseData({ done: true }));
    }

    /**
     * @description 创建 markdown 任务，并返回中途进度
     */
    async makeMarkdownHandler(id: number, subscriber: Subscriber<any>) {
        const { agent, loop } = await this.getAgentDependency();

        const slide = await this.slidesRepository.findOneById(id);

        if (!slide) {
            subscriber.next(toSseData({ type: 'error', message: 'Slide not found' }));
            subscriber.complete();
            return;
        }

        const outlines = slide.outlines || '';
        if (outlines.length === 0) {
            subscriber.next(toSseData({ type: 'message', message: 'Outline not found' }));
            subscriber.complete();
            return;
        }

        const saveOutlineIds = new Set();

        loop.registerOnToolCall(toolcall => {
            subscriber.next(toSseData({
                type: 'toolcall',
                toolcall,
            }));

            if (toolcall.function.name === 'slidev_export_project') {
                saveOutlineIds.add(toolcall.id);
            }

            return toolcall;
        });

        loop.registerOnToolCalled(toolcalled => {
            
            if (saveOutlineIds.has(toolcalled.id)) {
                loop.abort();
            }
            
            subscriber.next(toSseData({
                type: 'toolcalled',
                toolcalled,
            }));
            return toolcalled;
        });

        const usermcpPrompt = await agent.getPrompt('usermcp_guide_prompt', {});
        const slidevPrompt = await agent.getPrompt('slidev_generate_with_specific_outlines_prompt', {
            outlines: outlines,
            title: slide.title,
            content: slide.content,
        });

        const prompts = [
            usermcpPrompt,
            slidevPrompt,
        ];

        await agent.ainvoke({ messages: prompts.join('\n\n') });

        subscriber.next(toSseData({ done: true }));
    }


    getSlidePrjAbsolutePath(slide: Slide): string | null {

        const slidePath = slide.slidevEntryFile;
        if (!slidePath) {
            return null;
        }
        
        // 如果路径以 .slidev-mcp 开头，则将其解析为相对于项目根目录的绝对路径
        if (slidePath.startsWith('.slidev-mcp')) {
            return path.join(process.cwd(), 'slidev-mcp', slidePath);
        }
        
        // 对于其他路径，保持原有逻辑（直接返回 null，需要进一步实现）
        return null;
    }
}