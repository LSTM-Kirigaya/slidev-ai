import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, Query, UploadedFile, Sse, Res, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { SlidesService } from './slides.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Request as ExpressRequest, Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import path, { extname } from 'path';
import { Observable } from 'rxjs';
import { SlideRepository } from '@/app/slides/slide.repository';
import { CreateSlideDto, ImportSlideDto, OutlinesDto, searchSlidesReq, SlidevProjectDto } from './slide.dto';
import { SlidevManagerService } from './slidev-manager.service';
import httpProxy from 'http-proxy';
import { PrivateSlideOwnerGuard, PublicSlideOwnerGuard } from '../auth/slide-owner.guard';
import { UseFileUploader } from '@/decorators/file-upload.decorator';
import { ApiTags, ApiOperation, ApiQuery, ApiOkResponse, ApiConsumes, ApiBody, ApiParam, ApiBearerAuth, ApiProduces } from '@nestjs/swagger';
import BaseResponse from '../base/base.dto';
import { User } from '../users/user.entity';

const proxy = httpProxy.createProxyServer();

// 定义文件类型
type MulterFile = Express.Multer.File;


@ApiTags('slides')
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
    @ApiOperation({ summary: '获取自己的幻灯片列表' })
    @ApiBearerAuth()
    @ApiQuery({ name: 'visibility', required: false, enum: ['public', 'private', 'all'], description: '按可见性过滤（默认 all）' })
    @ApiOkResponse({ description: '返回当前用户的幻灯片数组' })
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
    @ApiOperation({ summary: '获取公开幻灯片列表' })
    @ApiQuery({ name: 'userId', required: false, description: '按用户 ID 过滤' })
    @ApiQuery({ name: 'skip', required: false, example: 0, description: '分页 skip（默认 0）' })
    @ApiQuery({ name: 'take', required: false, example: 10, description: '分页 take（默认 10）' })
    @ApiOkResponse({ description: '返回公开幻灯片数组' })
    async getPublicSlides(
        @Query('userId') userId: string,
        @Query('skip') skip: number = 0,
        @Query('take') take: number = 10
    ) {
        return this.slideRepository.getPublicSlides(userId, Number(skip) || 0, Number(take) || 10);
    }

    @UseGuards(JwtAuthGuard)
    @UseFileUploader('file')
    @Post('create')
    @ApiOperation({ summary: '创建幻灯片' })
    @ApiBearerAuth()
    @ApiConsumes('multipart/form-data')
    @ApiBody({ description: '幻灯片元数据与可选封面文件', schema: { type: 'object', properties: { title: { type: 'string' }, description: { type: 'string' }, visibility: { type: 'string', enum: ['public', 'private'] }, file: { type: 'string', format: 'binary', description: '可选封面' } } } })
    @ApiOkResponse({ description: '返回创建后的幻灯片实体' })
    async createSlide(
        @Request() req: ExpressRequest,
        @Body() createSlideDto: CreateSlideDto,
        @UploadedFile() file?: MulterFile
    ) {
        const user = req.user as any;
        if (!user || !user.id) {
            throw new Error('用户信息缺失，无法获取 userId');
        }
        const userId = user.id;
        return this.slidesService.createSlide(userId, createSlideDto, file);
    }


    @UseGuards(JwtAuthGuard, PrivateSlideOwnerGuard)
    @UseFileUploader('file')
    @Post(':id/save-slide')
    @ApiOperation({ summary: '更新幻灯片基本信息 / 封面' })
    @ApiBearerAuth()
    @ApiParam({ name: 'id', description: '幻灯片 ID' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({ description: '需更新的字段与可选封面文件', schema: { type: 'object', properties: { title: { type: 'string' }, description: { type: 'string' }, visibility: { type: 'string', enum: ['public', 'private'] }, file: { type: 'string', format: 'binary' } } } })
    @ApiOkResponse({ description: '返回更新后的实体' })
    async saveSlide(
        @Param('id') id: number,
        @Body() createSlideDto: CreateSlideDto,
        @UploadedFile() file?: MulterFile
    ) {
        return this.slidesService.saveSlide(id, createSlideDto, file);
    }

    /**
     * 删除幻灯片，只有本人可以删除
     */
    @UseGuards(JwtAuthGuard, PrivateSlideOwnerGuard)
    @Delete(':id')
    @ApiOperation({ summary: '删除幻灯片（仅本人）' })
    @ApiBearerAuth()
    @ApiParam({ name: 'id', description: '幻灯片 ID' })
    @ApiOkResponse({ description: '删除结果', schema: { type: 'object', properties: { success: { type: 'boolean' } } } })
    async deleteSlide(
        @Param('id') id: number,
    ): Promise<{ success: boolean }> {
        await this.slideRepository.remove(id);
        return { success: true };
    }


    /**
     * 保存幻灯片的大纲数据
     */
    @UseGuards(JwtAuthGuard, PrivateSlideOwnerGuard)
    @Post(':id/save-outlines')
    @ApiOperation({ summary: '保存大纲' })
    @ApiBearerAuth()
    @ApiParam({ name: 'id', description: '幻灯片 ID' })
    @ApiBody({ description: '大纲数组', schema: { type: 'object', properties: { outlines: { type: 'array', items: { type: 'object' } } } } })
    @ApiOkResponse({ description: '返回保存后的结果' })
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
    @ApiOperation({ summary: '保存 Slidev 项目元数据 / 路径' })
    @ApiBearerAuth()
    @ApiParam({ name: 'id', description: '幻灯片 ID' })
    @ApiBody({ description: '项目元数据（例如 slides_path 等）', schema: { type: 'object' } })
    @ApiOkResponse({ description: '返回保存后的状态或实体' })
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
    @ApiOperation({ summary: '是否已有大纲' })
    @ApiBearerAuth()
    @ApiParam({ name: 'id', description: '幻灯片 ID' })
    @ApiOkResponse({ description: '返回布尔状态' })
    async hasOutlines(
        @Param('id') id: number,
    ) {
        return this.slidesService.hasOutlines(id);
    }

    @UseGuards(JwtAuthGuard)
    @Sse('process/make-outline/:id')
    @ApiOperation({ summary: '生成大纲 (SSE)', description: '服务端事件流，推送生成过程。' })
    @ApiBearerAuth()
    @ApiParam({ name: 'id', description: '幻灯片 ID' })
    @ApiProduces('text/event-stream')
    makeOutline(
        @Param('id') id: number,
        @Request() req: ExpressRequest,
    ): Observable<any> {
        const user = req.user as User;
        return new Observable(subscriber => {
            this.slidesService.makeOutlineHandler(id, user, subscriber);
        });
    }


    @UseGuards(JwtAuthGuard)
    @Sse('process/make-markdown/:id')
    @ApiOperation({ summary: '生成 Markdown (SSE)', description: '服务端事件流，推送生成过程。' })
    @ApiBearerAuth()
    @ApiParam({ name: 'id', description: '幻灯片 ID' })
    @ApiProduces('text/event-stream')
    makeMarkdown(
        @Param('id') id: number,
        @Request() req: ExpressRequest,
    ): Observable<any> {
        const user = req.user as User;
        return new Observable(subscriber => {
            this.slidesService.makeMarkdownHandler(id, user, subscriber);
        });
    }


    @UseGuards(JwtAuthGuard, PublicSlideOwnerGuard)
    @Get(':id')
    @ApiOperation({ summary: '获取单个幻灯片（权限控制）' })
    @ApiBearerAuth()
    @ApiParam({ name: 'id', description: '幻灯片 ID' })
    @ApiOkResponse({ description: '返回幻灯片实体' })
    async getSlideById(
        @Param('id') id: number
    ) {
        const slide = await this.slideRepository.findOneById(id);
        return slide;
    }

    @Get('preview-id/:id')
    @ApiOperation({ summary: '获取预览端口', description: '启动或复用 Slidev 进程并返回端口号。' })
    @ApiParam({ name: 'id', description: '幻灯片 ID' })
    @ApiOkResponse({ description: '返回 { port: number }' })
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

        if (!absolutePath) {
            throw new Error('Slidev project not found');
        }

        // 启动或获取Slidev实例
        const port = await this.slidevManager.startSlidev(id, absolutePath);

        return {
            port,
        };
    }

    @Get('preview/:id')
    @ApiOperation({ summary: '代理 Slidev 预览 (浏览器 HTML/静态资源)', description: '内部 http-proxy 转发到对应 Slidev 服务。' })
    @ApiParam({ name: 'id', description: '幻灯片 ID' })
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

    @UseGuards(JwtAuthGuard, PrivateSlideOwnerGuard)
    @Post(':id/build-slidev')
    @ApiOperation({ summary: '构建 Slidev 项目', description: '进行项目打包与首页截图生成，更新状态。' })
    @ApiBearerAuth()
    @ApiParam({ name: 'id', description: '幻灯片 ID' })
    @ApiOkResponse({ description: '返回构建结果' })
    async buildSlidevProject(
        @Param('id') id: number,
    ) {
        const resp: BaseResponse = await this.slidesService.buildSlidevProject(id);
        return resp;
    }

    @Post('search')
    @ApiOperation({ summary: '搜索幻灯片' })
    @ApiBody({ description: '搜索请求', schema: { type: 'object', properties: { query: { type: 'string' } } } })
    async searchSlides(
        @Body() body: searchSlidesReq
    ) {
        return this.slideRepository.search(body.query);
    }

    @UseGuards(JwtAuthGuard, PrivateSlideOwnerGuard)
    @Get(':id/source')
    @ApiOperation({ summary: '获取幻灯片源代码' })
    @ApiBearerAuth()
    @ApiParam({ name: 'id', description: '幻灯片 ID' })
    @ApiOkResponse({ description: '返回幻灯片的 Markdown 源代码' })
    async getSlideSource(
        @Param('id') id: number,
    ) {
        return this.slidesService.getSlideSource(id);
    }

    @UseGuards(JwtAuthGuard, PrivateSlideOwnerGuard)
    @Put(':id/source')
    @ApiOperation({ summary: '更新幻灯片源代码' })
    @ApiBearerAuth()
    @ApiParam({ name: 'id', description: '幻灯片 ID' })
    @ApiBody({ description: '源代码内容', schema: { type: 'object', properties: { source: { type: 'string' } } } })
    @ApiOkResponse({ description: '返回更新结果' })
    async updateSlideSource(
        @Param('id') id: number,
        @Body() body: { source: string }
    ) {
        return this.slidesService.updateSlideSource(id, body.source);
    }

    @UseGuards(JwtAuthGuard, PrivateSlideOwnerGuard)
    @Post(':id/deploy')
    @ApiOperation({ summary: '部署幻灯片' })
    @ApiBearerAuth()
    @ApiParam({ name: 'id', description: '幻灯片 ID' })
    @ApiOkResponse({ description: '返回部署结果' })
    async deploySlide(
        @Param('id') id: number,
    ) {
        return this.slidesService.deploySlide(id);
    }

    @UseGuards(JwtAuthGuard)
    @UseFileUploader('file')
    @Post('import')
    @ApiOperation({ summary: '创建幻灯片' })
    @ApiBearerAuth()
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        description: '导入幻灯片文件',
        schema: {
            type: 'object',
            properties: {
                title: { type: 'string' },
                file: { type: 'string', format: 'binary', description: 'Markdown或Slidev文件' },
                visibility: { type: 'string', enum: ['public', 'private'] }
            }
        }
    })
    @ApiOkResponse({ description: '返回导入后的幻灯片实体' })
    async importSlide(
        @Request() req: ExpressRequest,
        @Body() createSlideDto: ImportSlideDto,
        @UploadedFile() file?: MulterFile
    ) {
        const user = req.user as any;
        if (!user || !user.id) {
            throw new Error('用户信息缺失，无法获取 userId');
        }
        const userId = user.id;
        return this.slidesService.importSlide(userId, createSlideDto, file);
    }

}