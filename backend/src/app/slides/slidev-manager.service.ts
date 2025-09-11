import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import * as net from 'net';
import { spawn, ChildProcess, exec } from 'child_process';
import waitOn from 'wait-on';
import path, { join } from 'path';
import { promisify } from 'util';
import * as fs from 'fs-extra';
import puppeteer from 'puppeteer';
import { Slide } from './slide.entity';
import { SsoLite } from '@/utils';

const execAsync = promisify(exec);

@Injectable()
export class SlidevManagerService implements OnApplicationShutdown {
    private instances = new Map<number, { port: number, process: ChildProcess }>();
    private usedPorts = new Set<number>();

    async startSlidev(id: number, filePath: string): Promise<number> {
        // 检查是否已存在实例
        const existing = this.instances.get(id);

        console.log('cache', existing);

        if (existing) {
            return existing.port;
        }

        // 获取可用端口
        const port = await this.findAvailablePort();
        const process = await this.spawnSlidevProcess(id, filePath, port);

        // 存储实例信息
        const instance = { port, process };
        this.instances.set(id, instance);
        this.usedPorts.add(port);

        // 清理进程退出
        process.on('exit', () => {
            this.instances.delete(id);
            this.usedPorts.delete(port);
        });

        return port;
    }

    getSlidevPort(id: number): number | null {
        return this.instances.get(id)?.port || null;
    }

    private async spawnSlidevProcess(id: number, filePath: string, port: number): Promise<ChildProcess> {
        if (!(await fs.pathExists(filePath))) {
            throw new Error(`Slide file not found: ${filePath}`);
        }

        const bin = this.resolveSlidevBinary();
        const args = this.buildSlidevArgs(bin, filePath, port);
        console.log('[Slidev spawn]', bin, args.join(' '));

        const proc = spawn(bin, args, {
            cwd: process.cwd(),
            detached: true,
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: process.platform === 'win32' && bin === 'npx'
        });

        proc.on('error', (err) => {
            console.error('Failed to start slidev process:', err);
        });

        // 自动检测交互提示并输入 "y"
        proc.stdout?.on('data', (data) => {
            const text = data.toString();
            if (text.includes('do you want to install it now')) {
                console.log('[Slidev spawn] Auto-accept theme installation...');
                proc.stdin?.write('y\n');
            }
            process.stdout.write(text); // 保持正常输出
        });

        proc.stderr?.on('data', (data) => {
            process.stderr.write(data.toString());
        });

        try {
            await waitOn({
                resources: [`tcp:localhost:${port}`],
                timeout: 30000 // 超时延长到 30s
            });
        } catch (e) {
            proc.kill();
            throw new Error(`Slidev failed to start on port ${port}. Root cause: ${(e as any).message}`);
        }

        return proc;
    }

    
    async buildSlidevProject(id: number, filePath: string): Promise<void> {
        // 1. 临时输出目录
        const outDir = join(process.cwd(), '.slidev-temp-build');

        // 2. 清空临时目录
        if (await fs.pathExists(outDir)) {
            await fs.remove(outDir);
        }

        // 3. 调用 slidev build
        const base = `/api/presentation/${id}`;
        const cmd = `slidev build "${filePath}" --base "${base}" --out "${outDir}"`;
        console.log('Executing:', cmd);

        try {
            const { stdout, stderr } = await execAsync(cmd);
            console.log(stdout);
            if (stderr) console.error(stderr);
        } catch (err) {
            console.error('Slidev build failed:', err);
            throw err;
        }

        // 4. 目标目录
        const targetDir = join(process.cwd(), 'presentation', id.toString());

        // 5. 如果存在，先删除
        if (await fs.pathExists(targetDir)) {
            await fs.remove(targetDir);
        }

        // 6. 移动临时输出到目标目录
        await fs.move(outDir, targetDir);

        console.log(`Slidev project built to: ${targetDir}`);
    }

    getSlideCoverFilePath(slide: Slide) {
        let slideCoverFilename = '';
        if (slide.coverFilename) {
            slideCoverFilename = slide.coverFilename;
        } else {
            const name = SsoLite.signID();
            slideCoverFilename = name + '.png';
        }

        return SsoLite.getPath('screenshots', slideCoverFilename);
    }

    async captureScreenshot(id: number, filePath: string, slide: Slide): Promise<string> {
        const outputDir = join(process.cwd(), 'presentation', id.toString());
        const port = await this.startSlidev(id, filePath);
        const slidevServer = `http://localhost:${port}`;

        console.log('capture screenshot at', slidevServer);
        

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const imagePath = this.getSlideCoverFilePath(slide);

        if (!fs.existsSync(path.dirname(imagePath))) {
            fs.mkdirSync(path.dirname(imagePath), { recursive: true });
        }

        // 启动 Puppeteer
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });

        try {
            const page = await browser.newPage();

            // 设置视口为 16:9
            await page.setViewport({
                width: 1280,
                height: 720,
                deviceScaleFactor: 1,
            });

            // 设置为暗色模式
            await page.emulateMediaFeatures([
                { name: "prefers-color-scheme", value: "dark" },
            ]);

            // 打开页面并等待加载完成
            await page.goto(slidevServer, { waitUntil: 'networkidle0', timeout: 30000 });

            // 截图并保存
            await page.screenshot({
                path: imagePath as `${string}.png`,
                // path: 'screenshot.png',
                fullPage: true
            });

            return imagePath;
        } catch (err) {
            console.error('Failed to capture screenshot:', err);
            throw err;
        } finally {
            await browser.close();
        }
    }

    private resolveSlidevBinary(): string {
        // 优先查找本地 node_modules/.bin
        const candidates: string[] = [];
        const binName = process.platform === 'win32' ? 'slidev.cmd' : 'slidev';
        // backend own node_modules
        candidates.push(join(process.cwd(), 'node_modules', '.bin', binName));
        // monorepo root sibling (../node_modules)
        candidates.push(join(process.cwd(), '..', 'node_modules', '.bin', binName));
        for (const c of candidates) if (fs.existsSync(c)) return c;
        // fallback to npx (需确保 npx 可用)
        return 'npx';
    }

    private buildSlidevArgs(bin: string, filePath: string, port: number): string[] {
        if (bin === 'npx') {
            return ['-y', 'slidev', filePath, '--port', port.toString(), '--remote'];
        }
        return [filePath, '--port', port.toString(), '--remote'];
    }

    private async findAvailablePort(start = 5000): Promise<number> {
        // TODO: FIXME
        for (let port = start; port < 65535; port++) {
            if (this.usedPorts.has(port)) continue;
            if (await this.isPortAvailable(port)) return port;
        }
        throw new Error('No available ports');
    }

    private isPortAvailable(port: number): Promise<boolean> {
        return new Promise((resolve) => {
            const server = net.createServer();
            server.once('error', () => resolve(false));
            server.once('listening', () => {
                server.close(() => resolve(true));
            });
            server.listen(port);
        });
    }

    // 获取所有正在使用的端口
    getUsedPorts(): number[] {
        return Array.from(this.usedPorts);
    }

    // 终止所有Slidev进程
    killAllProcesses() {
        console.log('🧹 正在终止所有Slidev进程 ...');
        for (const instance of this.instances.values()) {
            try {
                instance.process.kill();
            } catch (error) {
                console.error(`终止进程时出错 (port: ${instance.port}):`, error);
            }
        }

        // 清空实例和端口记录
        this.instances.clear();
        this.usedPorts.clear();
        console.log('✅ 已终止所有进程');
    }

    onApplicationShutdown() {
        this.killAllProcesses();
    }
}