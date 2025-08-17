import { exec } from 'child_process';
import os from 'os';
import chalk from 'chalk';

/**
 * 关闭占用指定端口的进程
 * @param {number} port - 要关闭的端口号
 * @returns {Promise<boolean>} - 是否成功关闭
 */
function killProcessOnPort(port) {
    return new Promise((resolve, reject) => {
        const platform = os.platform();
        let command;

        if (platform === 'win32') {
            // Windows: 使用 `netstat` 查找 PID，然后用 `taskkill` 终止
            command = `netstat -ano | findstr :${port} | findstr LISTENING`;
            exec(command, (err, stdout) => {
                if (err || !stdout.trim()) {
                    reject(new Error(`No process found on port ${port}`));
                    return;
                }

                const pid = stdout.trim().split(/\s+/).pop();
                exec(`taskkill /PID ${pid} /F`, (err) => {
                    if (err) reject(err);
                    else resolve(true);
                });
            });
        } else if (platform === 'linux' || platform === 'darwin') {
            // Linux/macOS: 使用 `lsof` 查找 PID，然后用 `kill` 终止
            command = `lsof -i :${port} | grep LISTEN | awk '{print $2}'`;
            exec(command, (err, stdout) => {
                if (err || !stdout.trim()) {
                    reject(new Error(`No process found on port ${port}`));
                    return;
                }

                const pid = stdout.trim();
                exec(`kill -9 ${pid}`, (err) => {
                    if (err) reject(err);
                    else resolve(true);
                });
            });
        } else {
            reject(new Error(`Unsupported platform: ${platform}`));
        }
    });
}

const USED_PORTS = [3000, 3001, 5000]

for (const port of USED_PORTS) {
    try {
        await killProcessOnPort(port);
        console.log(
            chalk.green.bold(`✓ Port ${chalk.underline(port)} has been freed!`)
        );
    } catch (err) {
        // console.log(
        //     chalk.red.bold(`✗ Failed to kill process on port ${chalk.underline(port)}:`),
        //     chalk.yellow(err.message)
        // );
    }
}


console.log(
    chalk.green.bold(`✓ Ports Check for [3000, 3001, 5000] are ${chalk.underline('okey dockey')} !`)
);