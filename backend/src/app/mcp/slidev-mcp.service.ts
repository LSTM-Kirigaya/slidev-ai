import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import * as path from 'path';
import * as fs from 'fs-extra';
import chalk from 'chalk';
import { createHash } from 'crypto';
import { SLIDEV_MCP_ROOT } from '@/constant/filepath';
import { Slide } from '../slides/slide.entity';
import { Theme } from './theme.entity';
import { ThemeRepository } from './theme.repository';
import { SsoLite } from '@/utils';
import { HttpService } from '@nestjs/axios';
import { Subscriber } from 'rxjs';
import { toSseData } from '@/utils/sse';

@Injectable()
export class SlidevMcpService implements OnModuleInit {
    private readonly logger = new Logger(SlidevMcpService.name);
    private readonly repoUrl = process.env.SLIDEV_MCP_REPO || 'https://github.com/LSTM-Kirigaya/slidev-mcp';
    private readonly repoPath = path.join(process.cwd(), process.env.SLIDEV_MCP_PATH || 'slidev-mcp');
    private readonly updateInterval = parseInt(process.env.SLIDEV_MCP_UPDATE_INTERVAL || '3600000', 10); // default 1 hour

    constructor(
        private readonly themeRepository: ThemeRepository,
        private readonly httpService: HttpService,
    ) { }

    async onModuleInit() {
        await this.ensureRepo();
        // 初始化主题数据
        await this.initializeThemes();
    }

    private async ensureRepo() {
        if (!existsSync(this.repoPath)) {
            this.logger.log(chalk.yellow(`Repository not found, cloning: ${this.repoUrl}`));
            if (this.gitClone()) {
                this.installDependencies();
                this.installHeadlessBrowser();
            }
        } else {
            this.logger.log(chalk.blue(`Repository already exists at ${this.repoPath}, trying to update dependencies...`));
            this.installDependencies();
        }
    }

    private gitClone(): boolean {
        try {
            execSync(`git clone ${this.repoUrl} ${this.repoPath}`, { stdio: 'inherit' }); 
            return true;
        } catch (error) {
            if (error instanceof Error) {
                this.logger.error(chalk.red(`git clone failed: ${error.message}`));
            } else {
                this.logger.error(chalk.red(`git clone failed: ${JSON.stringify(error)}`));
            }
            return false;
        }
    }

    private installDependencies() {
        try {
            this.logger.log(chalk.blue(`Installing dependencies: uv sync`));
            execSync(`uv sync`, { cwd: this.repoPath, stdio: 'inherit' });
            this.logger.log(chalk.green(`Dependencies installed successfully`));
        } catch (error) {
            if (error instanceof Error) {
                this.logger.error(chalk.red(`uv sync failed: ${error.message}`));
            } else {
                this.logger.error(chalk.red(`uv sync failed: ${JSON.stringify(error)}`));
            }
        }
    }

    private installHeadlessBrowser() {
        try {
            this.logger.log(chalk.blue(`Installing headless browser: uv run playwright install`));
            execSync(`uv run playwright install`, { cwd: this.repoPath, stdio: 'inherit' });
            this.logger.log(chalk.green(`Dependencies installed successfully`));
        } catch (error) {
            if (error instanceof Error) {
                this.logger.error(chalk.red(`uv sync failed: ${error.message}`));
            } else {
                this.logger.error(chalk.red(`uv sync failed: ${JSON.stringify(error)}`));
            }
        }
    }


    private updateRepo() {
        try {
            execSync(`git stash`, { stdio: 'inherit' });
            execSync(`git -C ${this.repoPath} pull`, { stdio: 'inherit' });
            this.logger.log(chalk.green(`Repository updated successfully`));
        } catch (error) {
            if (error instanceof Error) {
                this.logger.error(chalk.red(`git pull failed: ${error.message}`));
            } else {
                this.logger.error(chalk.red(`git pull failed: ${JSON.stringify(error)}`));
            }
        }
    }

    @Interval(parseInt(process.env.SLIDEV_MCP_UPDATE_INTERVAL || '3600000', 10))
    handleUpdate() {
        if (existsSync(this.repoPath)) {
            this.logger.log(chalk.blue(`Starting repository update...`));
            this.updateRepo();
            this.installDependencies();
        } else {
            this.logger.warn(chalk.yellow(`Repository not found, cloning again...`));
            if (this.gitClone()) {
                this.installDependencies();
            }
        }
    }

    /**
     * Initialize themes from the slidev-mcp repository
     */
    private async initializeThemes() {
        try {
            const themesPath = path.join(this.repoPath, 'servers', 'themes');
            if (!existsSync(themesPath)) {
                this.logger.warn(chalk.yellow(`Themes directory not found: ${themesPath}`));
                return;
            }

            const themeDirs = fs.readdirSync(themesPath, { withFileTypes: true })
                .filter(dirent => dirent.isDirectory())
                .map(dirent => dirent.name);

            for (const themeName of themeDirs) {
                await this.processTheme(themesPath, themeName);
            }

            this.logger.log(chalk.green(`Themes initialization completed`));
        } catch (error) {
            if (error instanceof Error) {
                this.logger.error(chalk.red(`Theme initialization failed: ${error.message}`));
            } else {
                this.logger.error(chalk.red(`Theme initialization failed: ${JSON.stringify(error)}`));
            }
        }
    }

    /**
     * Process a single theme
     */
    private async processTheme(themesPath: string, themeName: string) {
        try {
            this.logger.log(chalk.cyan(`=== Processing theme: ${themeName} ===`));

            const themePath = path.join(themesPath, themeName);
            const manifestPath = path.join(themePath, 'manifest.json');

            if (!existsSync(manifestPath)) {
                this.logger.warn(chalk.yellow(`Manifest not found for theme: ${themeName}`));
                return;
            }

            this.logger.log(chalk.blue(`Reading manifest.json for ${themeName}...`));
            const manifestContent = readFileSync(manifestPath, 'utf-8');
            const manifest = JSON.parse(manifestContent);

            // 保存或更新主题信息到数据库
            this.logger.log(chalk.blue(`Saving theme ${themeName} into database...`));
            let theme = await this.themeRepository.findOneByName(themeName);

            this.logger.log(`Found existing theme: ${!!theme}`);

            if (!theme) {
                theme = await this.themeRepository.create({
                    name: themeName
                });

                this.logger.log(`Created new theme object for ${themeName}`);
            }

            // 更新主题属性
            theme.github = manifest.github || null;
            theme.installScripts = manifest.installScripts || [];
            
            this.logger.log(`Theme ${themeName} installed: ${theme.installed}, has install scripts: ${theme.installScripts.length > 0}`);
            
            // 只有未安装的主题才执行安装脚本
            if (!theme.installed && theme.installScripts.length > 0) {
                this.logger.log(chalk.blue(`Executing install scripts for ${themeName}...`));
                const installSuccess = this.executeInstallScripts(themePath, theme.installScripts);
                // 安装完成后根据执行结果设置 installed 标志
                theme.installed = installSuccess;
                if (installSuccess) {
                    this.logger.log(chalk.green(`Installation completed for ${themeName}`));
                } else {
                    this.logger.log(chalk.red(`Installation failed for ${themeName}`));
                }
            }

            theme.images = await Promise.all(
                (manifest.images ?? []).map(async (imageUrl: string) => {
                    // 生成唯一文件名
                    const imageName = await this.generateImageName(imageUrl);

                    // 下载文件
                    const savePath = SsoLite.getPath('theme-examples', imageName);
                    if (!fs.existsSync(savePath)) {
                        await SsoLite.downloadFile(imageUrl, savePath, this.httpService);
                        this.logger.log(chalk.gray(`  ↳ downloaded: ${imageUrl}`));
                    }

                    // 返回映射
                    return { imageUrl, imageName };
                })
            );

            const { id, ...themeData } = theme;
            const savedTheme = await this.themeRepository.update(theme.id, { ...themeData });

            // 重新加载实体以确保获取正确的ID
            const finalTheme = await this.themeRepository.findOneByName(theme.name);
            this.logger.log(`Saved theme ${themeName} with ID: ${finalTheme?.id || savedTheme.id}`);

            this.logger.log(chalk.green(`✓ Processed theme successfully: ${themeName}`));
        } catch (error) {
            if (error instanceof Error) {
                this.logger.error(chalk.red(`✗ Failed to process theme ${themeName}: ${error.message}`));
                this.logger.error(chalk.red(`Error stack: ${error.stack}`));
            } else {
                this.logger.error(chalk.red(`✗ Failed to process theme ${themeName}: ${JSON.stringify(error)}`));
            }
        }
    }

    /**
     * Generate unique image name based on URL
     */
    private async generateImageName(imageUrl: string): Promise<string> {
        const hash = createHash('md5').update(imageUrl).digest('hex');
        const extension = await SsoLite.getImageExtension(imageUrl, this.httpService);
        return `${hash}${extension}`;
    }

    /**
     * Execute install scripts synchronously
     */
    private executeInstallScripts(themePath: string, scripts: string[]): boolean {
        for (const script of scripts) {
            try {
                this.logger.log(chalk.blue(`Executing script: ${script}`));
                execSync(script, { cwd: themePath, stdio: 'inherit' });
                this.logger.log(chalk.green(`Script executed successfully: ${script}`));
            } catch (error) {
                if (error instanceof Error) {
                    this.logger.error(chalk.red(`Script execution failed: ${script} - ${error.message}`));
                } else {
                    this.logger.error(chalk.red(`Script execution failed: ${script} - ${JSON.stringify(error)}`));
                }
                return false;
            }
        }
        return true;
    }

    /**
     * Generate openmcp config file
     */
    generateOpenMcpConfig(slide: Slide): string {
        const apiKey = process.env.OPENAI_API_KEY;
        const baseUrl = process.env.OPENAI_BASE_URL;
        const model = process.env.OPENAI_MODEL;

        if (!apiKey || !baseUrl || !model) {
            this.logger.error(
                chalk.red('Missing required environment variables: OPENAI_API_KEY / OPENAI_BASE_URL / OPENAI_MODEL')
            );
            process.exit(1);
        }

        const theme = slide.theme;

        if (!theme) {
            this.logger.error(chalk.red('Missing required environment variables: theme'));
        }

        const serverRoot = path.join(
            this.repoPath,
            'servers',
            'themes',
            theme
        );

        if (!fs.existsSync(serverRoot)) {
            throw new Error(
                `Theme ${theme} does not exist. Please check the theme name.`
            );
        }

        const serverName = 'slidev-mcp-' + theme;

        const config = {
            version: '0.0.1',
            namespace: 'openmcp',
            mcpServers: {
                'slidev-mcp-academic': {
                    type: 'stdio',
                    command: 'mcp',
                    args: ['run', 'server.py'],
                    cwd: serverRoot,
                    description: serverName,
                    env: {
                        SLIDEV_MCP_ROOT: SLIDEV_MCP_ROOT,
                    }
                }
            },
            defaultLLM: {
                baseURL: baseUrl,
                apiToken: apiKey,
                model: model
            }
        };

        const openMcpDir = path.join(process.cwd(), 'openmcp');
        if (!existsSync(openMcpDir)) {
            mkdirSync(openMcpDir, { recursive: true });
        }


        const configPath = path.join(openMcpDir, `slide-${slide.id}.json`);
        writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
        this.logger.log(chalk.green(`openmcp config generated: ${configPath}`));

        return configPath;
    }

    // 更新所有主题的处理方法
    async updateAllThemesHandler(subscriber: Subscriber<any>) {
        try {
            subscriber.next(toSseData({ type: 'info', message: 'Starting full theme update...' }));
            
            // 更新仓库
            await this.ensureRepo();
            
            // 强制重新初始化所有主题
            await this.forceInitializeAllThemes(subscriber);
            
            subscriber.next(toSseData({ type: 'success', message: 'All themes updated successfully' }));
            subscriber.complete();
        } catch (error) {
            subscriber.next(toSseData({ type: 'error', message: `Update failed: ${error.message}` }));
            subscriber.complete();
        }
    }

    // 强制重新初始化所有主题
    private async forceInitializeAllThemes(subscriber?: Subscriber<any>) {
        try {
            const themesPath = path.join(this.repoPath, 'servers', 'themes');
            if (!existsSync(themesPath)) {
                this.logger.warn(chalk.yellow(`Themes directory not found: ${themesPath}`));
                if (subscriber) {
                    subscriber.next(toSseData({ type: 'warn', message: `Themes directory not found: ${themesPath}` }));
                }
                return;
            }

            const themeDirs = fs.readdirSync(themesPath, { withFileTypes: true })
                .filter(dirent => dirent.isDirectory())
                .map(dirent => dirent.name);

            if (subscriber) {
                subscriber.next(toSseData({ type: 'info', message: `Found ${themeDirs.length} themes to process` }));
            }

            for (const themeName of themeDirs) {
                if (subscriber) {
                    subscriber.next(toSseData({ type: 'info', message: `Processing theme: ${themeName}` }));
                }
                await this.forceProcessTheme(themesPath, themeName, subscriber);
            }

            this.logger.log(chalk.green(`All themes force initialization completed`));
            if (subscriber) {
                subscriber.next(toSseData({ type: 'info', message: 'All themes force initialization completed' }));
            }
        } catch (error) {
            if (error instanceof Error) {
                this.logger.error(chalk.red(`Theme force initialization failed: ${error.message}`));
                if (subscriber) {
                    subscriber.next(toSseData({ type: 'error', message: `Theme force initialization failed: ${error.message}` }));
                }
            } else {
                this.logger.error(chalk.red(`Theme force initialization failed: ${JSON.stringify(error)}`));
                if (subscriber) {
                    subscriber.next(toSseData({ type: 'error', message: `Theme force initialization failed: ${JSON.stringify(error)}` }));
                }
            }
        }
    }

    // 强制处理单个主题（重新下载图片和执行脚本）
    private async forceProcessTheme(themesPath: string, themeName: string, subscriber?: Subscriber<any>) {
        try {
            this.logger.log(chalk.cyan(`=== Force processing theme: ${themeName} ===`));
            subscriber?.next(toSseData({ type: 'info', message: `=== Force processing theme: ${themeName} ===` }));

            const themePath = path.join(themesPath, themeName);
            const manifestPath = path.join(themePath, 'manifest.json');

            if (!existsSync(manifestPath)) {
                this.logger.warn(chalk.yellow(`Manifest not found for theme: ${themeName}`));
                subscriber?.next(toSseData({ type: 'warn', message: `Manifest not found for theme: ${themeName}` }));
                return;
            }

            this.logger.log(chalk.blue(`Reading manifest.json for ${themeName}...`));
            subscriber?.next(toSseData({ type: 'info', message: `Reading manifest.json for ${themeName}...` }));
            const manifestContent = readFileSync(manifestPath, 'utf-8');
            const manifest = JSON.parse(manifestContent);

            // 获取或创建主题
            this.logger.log(chalk.blue(`Saving theme ${themeName} into database...`));
            subscriber?.next(toSseData({ type: 'info', message: `Saving theme ${themeName} into database...` }));
            let theme = await this.themeRepository.findOneByName(themeName);

            if (!theme) {
                theme = new Theme();
                theme.name = themeName;
                this.logger.log(`Created new theme object for ${themeName}`);
                subscriber?.next(toSseData({ type: 'info', message: `Created new theme object for ${themeName}` }));
            }

            // 更新主题属性
            theme.github = manifest.github || null;
            theme.installScripts = manifest.installScripts || [];
            
            // 强制执行安装脚本（无论是否已安装）
            if (theme.installScripts.length > 0) {
                this.logger.log(chalk.blue(`Force executing install scripts for ${themeName}...`));
                subscriber?.next(toSseData({ type: 'info', message: `Force executing install scripts for ${themeName}...` }));
                const installSuccess = this.executeInstallScripts(themePath, theme.installScripts);
                theme.installed = installSuccess;
                
                console.log(installSuccess);
                

                if (installSuccess) {
                    this.logger.log(chalk.green(`Installation completed for ${themeName}`));
                    subscriber?.next(toSseData({ type: 'info', message: `Installation completed for ${themeName}` }));
                } else {
                    this.logger.log(chalk.red(`Installation failed for ${themeName}`));
                    subscriber?.next(toSseData({ type: 'error', message: `Installation failed for ${themeName}` }));
                }
            }

            // 强制重新下载所有图片
            if (subscriber) {
                subscriber.next(toSseData({ type: 'info', message: `Downloading images for ${themeName}...` }));
            }
            theme.images = await Promise.all(
                (manifest.images ?? []).map(async (imageUrl: string) => {
                    // 生成唯一文件名
                    const imageName = await this.generateImageName(imageUrl);

                    // 强制下载文件（删除旧文件）
                    const savePath = SsoLite.getPath('theme-examples', imageName);
                    if (fs.existsSync(savePath)) {
                        fs.unlinkSync(savePath);
                    }
                    
                    await SsoLite.downloadFile(imageUrl, savePath, this.httpService);
                    this.logger.log(chalk.gray(`  ↳ downloaded: ${imageUrl}`));
                    if (subscriber) {
                        subscriber.next(toSseData({ type: 'info', message: `  ↳ downloaded: ${imageUrl}` }));
                    }

                    // 返回映射
                    return { imageUrl, imageName };
                })
            );

            const savedTheme = await this.themeRepository.save(theme);
            this.logger.log(`Saved theme ${themeName} with ID: ${savedTheme.id}`);
            subscriber?.next(toSseData({ type: 'info', message: `Saved theme ${themeName} with ID: ${savedTheme.id}` }));

            this.logger.log(chalk.green(`✓ Force processed theme successfully: ${themeName}`));
            subscriber?.next(toSseData({ type: 'info', message: `✓ Force processed theme successfully: ${themeName}` }));
        } catch (error) {
            if (error instanceof Error) {
                this.logger.error(chalk.red(`✗ Failed to force process theme ${themeName}: ${error.message}`));
                this.logger.error(chalk.red(`Error stack: ${error.stack}`));
                subscriber?.next(toSseData({ type: 'error', message: `✗ Failed to force process theme ${themeName}: ${error.message}` }));
            } else {
                this.logger.error(chalk.red(`✗ Failed to force process theme ${themeName}: ${JSON.stringify(error)}`));
                subscriber?.next(toSseData({ type: 'error', message: `✗ Failed to force process theme ${themeName}: ${JSON.stringify(error)}` }));
            }
        }
    }

    // 更新单个主题的处理方法
    async updateThemeHandler(themeId: number, subscriber: Subscriber<any>) {
        try {
            const theme = await this.themeRepository.findOneById(themeId);
            if (!theme) {
                subscriber.next({ data: { type: 'error', message: 'Theme not found' } });
                subscriber.complete();
                return;
            }

            subscriber.next(toSseData({ type: 'info', message: `Starting update for theme: ${theme.name}` }));
            
            const themesPath = path.join(this.repoPath, 'servers', 'themes');
            await this.forceProcessTheme(themesPath, theme.name, subscriber);
            
            subscriber.next(toSseData({ type: 'success', message: `Theme ${theme.name} updated successfully` }));
            subscriber.complete();
        } catch (error) {
            subscriber.next(toSseData({ type: 'error', message: `Update failed: ${error.message}` }));
            subscriber.complete();
        }
    }
}