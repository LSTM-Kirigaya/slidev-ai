import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import * as net from 'net';
import { spawn, ChildProcess } from 'child_process';
import waitOn from 'wait-on';

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
        const proc = spawn('slidev', [filePath, '--port', port.toString(), '--base', `/api/slides/preview/${id}/`], {
            detached: true,
            stdio: 'inherit',
        });

        await waitOn({ resources: [`tcp:localhost:${port}`], timeout: 10000 });
        return proc;
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
        console.log('正在终止所有Slidev进程...');
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
    }

    onApplicationShutdown() {
        this.killAllProcesses();
    }
}