import { Controller, Get, Post,Delete, Body, Param, UseGuards, Request, Query, UseInterceptors, UploadedFile, Sse, Res } from '@nestjs/common';
import { SlidesService } from './slides.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Request as ExpressRequest, Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { Observable } from 'rxjs';
import { SlideRepository } from '@/app/slides/slide.repository';
import { CreateSlideDto, OutlinesDto, SlidevProjectDto } from './slide.dto';
import { SlidevManagerService } from './slidev-manager.service';
import httpProxy from 'http-proxy';
import { PrivateSlideOwnerGuard, PublicSlideOwnerGuard } from '../auth/slide-owner.guard';

const proxy = httpProxy.createProxyServer();

// 定义文件类型
type MulterFile = Express.Multer.File;


@Controller('slides')
export class SlidesController {
    constructor(
        private readonly slidesService: SlidesService,
        private readonly slidevManager: SlidevManagerService,
        private readonly slideRepository: SlideRepository,
    ) { }



    /**
     * 获取自己的幻灯片，支持 visibility 筛选
     */
    @UseGuards(JwtAuthGuard)
    @Get('self')
    async getSelfSlides(
        @Request() req: ExpressRequest,
        @Query('visibility') visibility?: 'public' | 'private' | 'all'
    ) {
        const userId = (req.user as any).id;
        return this.slideRepository.findByUserId(userId, visibility ?? 'all');
    }

    /**
     * 获取公开幻灯片，可以根据用户id筛选
     */
    @Get('public')
    async getPublicSlides(
        @Query('userId') userId: string,
        @Query('skip') skip: number = 0,
        @Query('take') take: number = 10
    ) {
        return this.slideRepository.getPublicSlides(userId, Number(skip) || 0, Number(take) || 10);
    }

    @UseGuards(JwtAuthGuard)
    @UseInterceptors(
        FileInterceptor('file', {
            storage: diskStorage({
                destination: './uploads',
                filename: (req, file, callback) => {
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                    const ext = extname(file.originalname);
                    const filename = `${file.fieldname}-${uniqueSuffix}${ext}`;
                    callback(null, filename);
                },
            }),
        }),
    )


    @UseGuards(JwtAuthGuard)
    @Post('create')
    async createSlide(
        @Request() req: ExpressRequest,
        @Body() createSlideDto: CreateSlideDto,
        @UploadedFile() file: MulterFile
    ) {
        return this.slidesService.createSlide((req.user as any).id, createSlideDto, file);
    }


    @UseGuards(JwtAuthGuard, PrivateSlideOwnerGuard)
    @Post(':id/save-slide')
    async saveSlide(
        @Param('id') id: number,
        @Body() createSlideDto: CreateSlideDto,
        @UploadedFile() file: MulterFile
    ) {
        return this.slidesService.saveSlide(id, createSlideDto, file);
    }

    /**
     * 删除幻灯片，只有本人可以删除
     */
    @UseGuards(JwtAuthGuard, PrivateSlideOwnerGuard)
    @Delete(':id')
    async deleteSlide(
        @Param('id') id: string
    ): Promise<{ success: boolean }> {
        await this.slideRepository.remove(id);
        return { success: true };
    }



    /**
     * 保存幻灯片的大纲数据
     */
    @UseGuards(JwtAuthGuard, PrivateSlideOwnerGuard)
    @Post(':id/save-outlines')
    async saveOutlines(
        @Param('id') id: number,
        @Body() outlinesDto: OutlinesDto,
    ) {
        return this.slidesService.saveOutlines(id, outlinesDto.outlines);
    }

    /**
     * 保存幻灯片的 slides_path
     */
    @UseGuards(JwtAuthGuard, PrivateSlideOwnerGuard)
    @Post(':id/save-slides-prj-meta')
    async saveSlidesPath(
        @Param('id') id: number,
        @Body() projectData: SlidevProjectDto,
    ) {
        return this.slidesService.saveSlidesPath(id, projectData);
    }

    /**
     * 检查幻灯片是否已经生成了大纲
     */
    @UseGuards(JwtAuthGuard, PrivateSlideOwnerGuard)
    @Get(':id/has-outlines')
    async hasOutlines(
        @Param('id') id: number,
    ) {
        return this.slidesService.hasOutlines(id);
    }

    @UseGuards(JwtAuthGuard)
    @Sse('process/make-outline/:id')
    makeOutline(
        @Param('id') id: number,
    ): Observable<any> {
        return new Observable(subscriber => {
            this.slidesService.makeOutlineHandler(id, subscriber);
        });
    }


    @UseGuards(JwtAuthGuard)
    @Sse('process/make-markdown/:id')
    makeMarkdown(
        @Param('id') id: number
    ): Observable<any> {
        return new Observable(subscriber => {
            this.slidesService.makeMarkdownHandler(id, subscriber);
        });
    }

    @UseGuards(JwtAuthGuard, PublicSlideOwnerGuard)
    @Get(':id')
    async getSlideById(
        @Param('id') id: number
    ) {
        const slide = await this.slideRepository.findOneById(id);
        return slide;
    }

    @Get('preview-id/:id')
    async getPreviewId(
        @Param('id') id: number,
    ) {
        // const userId = (req.user as any).id;
        const slide = await this.slideRepository.findOneById(id);

        if (!slide) {
            throw new Error('Slide not found');
        }

        // 计算Markdown文件绝对路径
        const absolutePath = this.slidesService.getSlidePrjAbsolutePath(slide);

        console.log('get path', absolutePath);


        if (!absolutePath) {
            throw new Error('Slidev project not found');
        }

        // 启动或获取Slidev实例
        const port = await this.slidevManager.startSlidev(id, absolutePath);

        console.log('get process, port is', port);

        return {
            port,
        };
    }

    @Get('preview/:id')
    async previewSlidev(
        @Param('id') id: number,
        @Request() req: ExpressRequest,
        @Res() res: Response,
    ) {
        //TODO: finish this

        // const userId = (req.user as any).id;
        const slide = await this.slideRepository.findOneById(id);

        if (!slide) {
            throw new Error('Slide not found');
        }

        // 计算Markdown文件绝对路径
        const absolutePath = this.slidesService.getSlidePrjAbsolutePath(slide);

        console.log('get path', absolutePath);


        if (!absolutePath) {
            throw new Error('Slidev project not found');
        }

        // 启动或获取Slidev实例
        const port = await this.slidevManager.startSlidev(id, absolutePath);

        proxy.on('proxyReq', (proxyReq, req, res, options) => {
            // 浏览器原始请求路径
            const incoming = req.url;
            // 最终发送到目标的路径
            const targetHost = proxyReq.getHeader('host');
            const targetPath = proxyReq.path;

            console.log(`[Proxy] ${req.method} ${incoming} -> http://${targetHost}${targetPath}`);
        });

        proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log(`[ProxyRes] ${req.url} -> status ${proxyRes.statusCode}`);
        });

        // 代理请求到Slidev服务
        proxy.web(req, res, {
            target: `http://localhost:${port}`,
            changeOrigin: true,
            ws: true,
        });
    }

}