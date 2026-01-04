import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs-extra';

import { Injectable } from '@nestjs/common';
import { Observable, Subscriber } from 'rxjs';
import { OmAgent } from 'openmcp-sdk/service/sdk';

import { SlidevMcpService } from '@/app/mcp/slidev-mcp.service';
import { SlideRepository } from './slide.repository';
import { CreateSlideDto, ImportSlideDto, SlidevProjectDto } from './slide.dto';
import { Slide } from './slide.entity';
import { toSseData } from '@/utils/sse';
import { SLIDEV_MCP_ROOT } from '@/constant/filepath';
import { SlideLockService } from './slide-lock.service';
import BaseResponse from '@/app/base/base.dto';
import  STATUS_CODE  from '@/constant/status-code';
import { SlidevManagerService } from './slidev-manager.service';
import { User } from '../users/user.entity';
import { readLayout } from '@/utils/slidev';

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
        private readonly slideLock: SlideLockService,
        private readonly slidevManager: SlidevManagerService,

    ) { }

    /**
     * @description 创建给定素材的幻灯片项目，并塞入数据库
     */
    async createSlide(userId: string, createSlideDto: CreateSlideDto, file?: MulterFile): Promise<Slide> {
        // TODO: 解析文件 file 并进入数据库
        const filePath = uuidv4()
        return this.slidesRepository.create({
            title: createSlideDto.title,
            content: createSlideDto.content,
            visibility: createSlideDto.visibility,
            theme: createSlideDto.theme,
            userId: String(userId),
            user: { id: parseInt(userId) } as User,
            processingStatus: 'pending'
        });
    }

    /**
     * @description 导入幻灯片文件
     */
    async importSlide(userId: string, createSlideDto: ImportSlideDto, file?: MulterFile) {

        if (!file) {
            throw new Error('No file uploaded');
        }

        const theme = await readLayout(file.path);

        // 创建项目名
        const projectName = `import-${uuidv4()}`;

        fs.moveSync(file.path, path.join(SLIDEV_MCP_ROOT, projectName, 'slides.md'));

        // 创建幻灯片实体
        const slide = await this.slidesRepository.create({
            title: createSlideDto.title,
            content: '{{IMPORT}}',
            outlines: JSON.stringify([{ group: '{{IMPORT}}', content: '{{IMPORT}}' }]),
            visibility: createSlideDto.visibility,
            theme: theme,
            userId: userId,
            processingStatus: 'markdown-saved',
            importFilename: file.path,
            slidevName: projectName,
            slidevHome: projectName,
            coverFilename: ''
        });

        await this.buildSlidevProject(slide.id);

        return slide;
    }

    async getSlideStatus(slide: Slide | null | undefined, defaultStatus?: string) {
        let status = defaultStatus || 'user-input-saved';
        if (!slide) {
            return status;
        }

        if (slide.outlines) {
            status = 'outline-saved';
        } else {
            return status;
        }

        const mdPath = this.getSlidePrjAbsolutePath(slide);
        if (mdPath && fs.existsSync(mdPath)) {
            status = 'markdown-saved';
        } else {
            return status;
        }

        const coverPath = this.slidevManager.getSlideCoverFilePath(slide);
        if (coverPath && fs.existsSync(coverPath)) {
            status = 'completed';
        } else {
            return status;
        }

        return status;
    }

    async saveSlide(id: number, createSlideDto: CreateSlideDto, file?: MulterFile) {

        // 根据当前 slide 的状态决定，如果已经完成了任何一个步骤，则被标记为当前的步骤
        const slide = await this.slidesRepository.findOneById(id);
        const status = await this.getSlideStatus(slide, 'user-input-saved');

        console.log(status);
        console.log(slide);
        

        await this.slidesRepository.update(id, {
            title: createSlideDto.title,
            content: createSlideDto.content,
            visibility: createSlideDto.visibility,
            theme: createSlideDto.theme,
            processingStatus: status
        });

        return { success: true };
    }

    async getAgentDependency(slide: Slide) {
        const configurationPath = this.slidevMcpService.generateOpenMcpConfig(slide);
        const agent = new OmAgent();
        agent.loadMcpConfig(configurationPath);
        const loop = await agent.getLoop();
        return { agent, loop };
    }


    /**
     * 保存幻灯片的大纲数据
     */
    async saveOutlines(id: number, outlines: any) {
        const slide = await this.slidesRepository.findOneById(id);
        const status = await this.getSlideStatus(slide, 'outline-saved');

        this.slidesRepository.update(id, {
            outlines: JSON.stringify(outlines),
            processingStatus: status,
        });
        return { success: true }
    }

    /**
     * 保存幻灯片的 slides_path
     */
    async saveSlidesPath(id: number, slidevData: SlidevProjectDto) {
        // 这里应使用传入的 home 字段（而不是 name）作为 slidevHome
        const slide = await this.slidesRepository.findOneById(id);
        const status = await this.getSlideStatus(slide, 'markdown-saved');

        await this.slidesRepository.update(id, {
            slidevName: slidevData.name,
            slidevHome: slidevData.name,
            processingStatus: status,
        });
        return { success: true };
    }

    /**
     * 检查幻灯片是否已经生成了大纲
     */
    async hasOutlines(id: number): Promise<boolean> {
        const slide = await this.slidesRepository.findOneById(id);

        if (!slide) {
            throw new Error('幻灯片不存在');
        }

        return !!slide.outlines;
    }

    private async runSseWithLock(id: number, operation: string, subscriber: Subscriber<any>, core: () => Promise<void>) {
        try {
            await this.slideLock.withLock(id, operation, async () => {
                try {
                    await core();
                } catch (inner) {
                    throw inner;
                }
            });
        } catch (e: any) {
            if (e.code === 'SLIDE_BUSY') {
                subscriber.next(toSseData({
                    type: 'busy',
                    message: `当前幻灯片正在执行 ${e.current?.operation}`,
                    current: e.current,
                }));
            } else {
                subscriber.next(toSseData({ type: 'error', message: e.message }));
            }
        } finally {
            subscriber.complete();
        }
    }

    /** 创建 outline 任务（带锁） */
    async makeOutlineHandler(id: number, user: User, subscriber: Subscriber<any>) {
        // await this.runSseWithLock(id, 'make-outline', subscriber, async () => {
            const slide = await this.slidesRepository.findOneById(id);
            if (!slide) {
                subscriber.next(toSseData({ type: 'error', message: 'Slide not found' }));
                return;
            }

            const { agent, loop } = await this.getAgentDependency(slide);
            const saveOutlineIds = new Set();
            
            loop.registerOnToolCall(toolcall => {
                subscriber.next(toSseData({ type: 'toolcall', toolcall }));
                if (toolcall.function.name === 'slidev_save_outline') {
                    saveOutlineIds.add(toolcall.id);
                    // 更新 slide 状态                    
                    try {
                        const args = JSON.parse(toolcall.function.arguments);
                        if (args?.param?.outlines) {
                            this.saveOutlines(id, args.param.outlines);
                            console.log('saveOutlines');
                        }
                    } catch (parseError) {
                        console.error('Error parsing outline:', parseError);
                    }
                }
                return toolcall;
            });
            
            loop.registerOnToolCalled(toolcalled => {
                if (saveOutlineIds.has(toolcalled.id)) {
                    loop.abort();
                }
                subscriber.next(toSseData({ type: 'toolcalled', toolcalled }));
                return toolcalled;
            });
            
            loop.registerOnError(error => {
                subscriber.next(toSseData({ error }));
                console.log('error', error);
            });
            
            const usermcpPrompt = await agent.getPrompt('usermcp_guide_prompt', {});
            const outlinePrompt = await agent.getPrompt('outline_generate_prompt', {
                title: slide.title,
                content: slide.content
            });
            const userInfoPrompt = await agent.getPrompt('slidev_user_info', {
                username: user.username || '',
                email: user.email || '',
                // avatar: user.avatar,
                // egoId: user.egoId,
                website: user.website || '',
            });

            await agent.ainvoke({ messages: [usermcpPrompt, outlinePrompt, userInfoPrompt].join('\n\n') });
            subscriber.next(toSseData({ done: true }));
        // });
    }

    /**
     * @description 创建 markdown 任务，并返回中途进度
     */
    async makeMarkdownHandler(id: number, user: User, subscriber: Subscriber<any>) {
        await this.runSseWithLock(id, 'make-markdown', subscriber, async () => {            
            const slide = await this.slidesRepository.findOneById(id);
            if (!slide) {
                subscriber.next(toSseData({ type: 'error', message: 'Slide not found' }));
                return;
            }

            const { agent, loop } = await this.getAgentDependency(slide);

            const outlines = slide.outlines || '';
            if (outlines.length === 0) {
                subscriber.next(toSseData({ type: 'message', message: 'Outline not found' }));
                return;
            }
            const saveOutlineIds = new Set();
            loop.registerOnToolCall(toolcall => {
                subscriber.next(toSseData({ type: 'toolcall', toolcall }));
                if (toolcall.function.name === 'slidev_export_project') {
                    saveOutlineIds.add(toolcall.id);
                }
                return toolcall;
            });
            loop.registerOnToolCalled(toolcalled => {
                if (saveOutlineIds.has(toolcalled.id)) {
                    // 异步持久化，不阻塞返回类型
                    (async () => {
                        try {
                            const raw = toolcalled?.content?.[0]?.text;
                            if (typeof raw === 'string') {
                                const parsed: any = JSON.parse(raw);
                                if (parsed && parsed.name) {
                                    await this.slidesRepository.update(id, {
                                        slidevName: parsed.name,
                                        slidevHome: parsed.home ?? parsed.name,
                                        processingStatus: 'markdown-saved'
                                    });
                                }
                            }
                        } catch (e) {
                            console.warn('Failed to persist slidev export metadata:', e);
                        }
                    })();
                    loop.abort();
                }
                subscriber.next(toSseData({ type: 'toolcalled', toolcalled }));
                return toolcalled;
            });
            const usermcpPrompt = await agent.getPrompt('usermcp_guide_prompt', {});
            let slidevHome = slide.slidevHome;
            if (!slidevHome || slidevHome.length === 0) {
                slidevHome = uuidv4();
            }
            
            const slidevPrompt = await agent.getPrompt('slidev_generate_with_specific_outlines_prompt', { outlines, title: slide.title, content: slide.content, path: slidevHome });
            const userInfoPrompt = await agent.getPrompt('slidev_user_info', {
                username: user.username || '',
                email: user.email || '',
                // avatar: user.avatar,
                // egoId: user.egoId,
                website: user.website || '',
            });
            
            await agent.ainvoke({ messages: [usermcpPrompt, slidevPrompt, userInfoPrompt].join('\n\n') });
            subscriber.next(toSseData({ done: true }));
        });
    }


    getSlidePrjAbsolutePath(slide: Slide): string | null {

        if (!slide.slidevHome) {
            return null;
        }

        const slidePath = path.join(SLIDEV_MCP_ROOT, slide.slidevHome, "slides.md");
        if (!slidePath) {
            return null;
        }

        return slidePath;
    }

    async getSlideSource(id: number): Promise<{ source: string }> {
        const slide = await this.slidesRepository.findOneById(id);
        if (!slide) {
            throw new Error('Slide not found');
        }

        const absolutePath = this.getSlidePrjAbsolutePath(slide);
        if (!absolutePath || !fs.existsSync(absolutePath)) {
            throw new Error('Slide source file not found');
        }

        const source = await fs.readFile(absolutePath, 'utf-8');
        return { source };
    }

    async updateSlideSource(id: number, source: string): Promise<{ success: boolean }> {
        const slide = await this.slidesRepository.findOneById(id);
        if (!slide) {
            throw new Error('Slide not found');
        }

        const absolutePath = this.getSlidePrjAbsolutePath(slide);
        if (!absolutePath) {
            throw new Error('Slide project path not found');
        }

        // Ensure directory exists
        const dirPath = path.dirname(absolutePath);
        await fs.ensureDir(dirPath);

        // Write the new source to the file
        await fs.writeFile(absolutePath, source, 'utf-8');

        // Update the processing status to reflect that markdown has been modified
        await this.slidesRepository.update(id, {
            processingStatus: 'markdown-saved'
        });

        return { success: true };
    }

    async deploySlide(id: number): Promise<{ success: boolean }> {
        // For deployment, we'll rebuild the slidev project
        const result = await this.buildSlidevProject(id);
        return { success: result.code === STATUS_CODE.SUCCESS };
    }
    async buildSlidevProject(id: number): Promise<BaseResponse> {
        try {
            await this.slideLock.withLock(id, 'build-slidev', async () => {
                const slide = await this.slidesRepository.findOneById(id);
                if (!slide) {
                    throw new Error('NOT_FOUND:Slide not found');
                }
                const absolutePath = this.getSlidePrjAbsolutePath(slide);
                if (!absolutePath) {
                    throw new Error('NOT_FOUND:Slide project path not found');
                }
                this.slidesRepository.update(id, { processingStatus: 'markdown-saved' });
                const screenshotPath = await this.slidevManager.captureScreenshot(id, absolutePath, slide);
                if (screenshotPath) {
                    this.slidesRepository.update(id, { coverFilename: path.basename(screenshotPath) });
                }
                await this.slidevManager.buildSlidevProject(id, absolutePath);
                this.slidesRepository.update(id, { processingStatus: 'completed' });
            });
            return BaseResponse.success();
        } catch (e: any) {
            if (e.code === 'SLIDE_BUSY') {
                return BaseResponse.error(STATUS_CODE.BAD_REQUEST, `Slide busy: running ${e.current?.operation}`);
            }
            if (typeof e.message === 'string' && e.message.startsWith('NOT_FOUND:')) {
                return BaseResponse.error(STATUS_CODE.NOT_FOUND, e.message.split(':')[1]);
            }
            return BaseResponse.error(STATUS_CODE.INTERNAL_SERVER_ERROR, e.message || 'Unknown error');
        }
    }
}