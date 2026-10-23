/**
 * Wrapper around Expo CLI that skips remote dependency validation on start.
 * Prevents startup crashes when Expo API fetch fails (network/proxy/Console Ninja):
 * "TypeError: Body is unusable: Body has already been read"
 */
import { spawn } from 'node:child_process';

if (!process.env.EXPO_NO_DEPENDENCY_VALIDATION) {
    process.env.EXPO_NO_DEPENDENCY_VALIDATION = '1';
}

const args = process.argv.slice(2);
const child = spawn('npx', ['expo', ...args], {
    stdio: 'inherit',
    shell: true,
    env: process.env,
});

child.on('exit', (code, signal) => {
    if (signal) {
        process.kill(process.pid, signal);
        return;
    }
    process.exit(code ?? 1);
});
