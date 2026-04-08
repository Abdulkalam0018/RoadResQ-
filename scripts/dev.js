import { spawn } from 'node:child_process';
import process from 'node:process';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const FRONTEND_URL = process.env.DEV_URL || 'http://localhost:3000';
const SHOULD_OPEN_BROWSER = process.env.NO_OPEN !== '1';

const isWindows = process.platform === 'win32';
const npmCommand = isWindows ? 'npm.cmd' : 'npm';

const runningChildren = new Set();
let browserOpened = false;

const pipeOutput = (child, prefix) => {
  const forwardLine = (line) => {
    if (!line) return;
    process.stdout.write(`[${prefix}] ${line}\n`);
  };

  readline.createInterface({ input: child.stdout }).on('line', (line) => {
    forwardLine(line);

    if (
      prefix === 'frontend' &&
      !browserOpened &&
      (line.includes('Compiled successfully') || line.includes('You can now view'))
    ) {
      browserOpened = true;
      if (SHOULD_OPEN_BROWSER) {
        openBrowser(FRONTEND_URL);
      }
    }
  });

  readline.createInterface({ input: child.stderr }).on('line', (line) => {
    if (!line) return;
    process.stderr.write(`[${prefix}] ${line}\n`);
  });
};

const spawnScript = (name, args, env = {}) => {
  const child = spawn(npmCommand, args, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      ...env,
    },
    stdio: ['inherit', 'pipe', 'pipe'],
  });

  runningChildren.add(child);
  pipeOutput(child, name);

  child.on('exit', (code, signal) => {
    runningChildren.delete(child);

    const reason = signal ? `signal ${signal}` : `code ${code}`;
    process.stdout.write(`[${name}] exited with ${reason}\n`);

    if (code && code !== 0) {
      shutdown(code);
    }
  });

  child.on('error', (error) => {
    process.stderr.write(`[${name}] failed to start: ${error.message}\n`);
    shutdown(1);
  });

  return child;
};

const openBrowser = (url) => {
  let command;
  let args;

  if (process.platform === 'darwin') {
    command = 'open';
    args = [url];
  } else if (process.platform === 'win32') {
    command = 'cmd';
    args = ['/c', 'start', '', url];
  } else {
    command = 'xdg-open';
    args = [url];
  }

  const opener = spawn(command, args, {
    stdio: 'ignore',
    detached: true,
  });

  opener.on('error', (error) => {
    process.stderr.write(`[dev] Could not open browser automatically: ${error.message}\n`);
  });

  opener.unref();
  process.stdout.write(`[dev] Opened ${url}\n`);
};

const shutdown = (exitCode = 0) => {
  for (const child of runningChildren) {
    if (!child.killed) {
      child.kill('SIGTERM');
    }
  }

  setTimeout(() => {
    for (const child of runningChildren) {
      if (!child.killed) {
        child.kill('SIGKILL');
      }
    }
    process.exit(exitCode);
  }, 800);
};

const startDev = () => {
  process.stdout.write('[dev] Starting backend and frontend...\n');
  process.stdout.write(`[dev] Frontend will open at ${FRONTEND_URL}\n`);

  spawnScript('backend', ['run', 'backend:dev']);
  spawnScript('frontend', ['run', 'frontend:dev'], {
    BROWSER: 'none',
  });
};

const currentFile = fileURLToPath(import.meta.url);
const entryFile = process.argv[1];

if (entryFile && currentFile === entryFile) {
  startDev();

  process.on('SIGINT', () => shutdown(0));
  process.on('SIGTERM', () => shutdown(0));
}

export { startDev };
