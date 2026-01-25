import fs from 'fs/promises';
import net from 'net';
import path from 'path';
import os from 'os';

type SyncOptions = {
  preferredPort?: number;
  maxAttempts?: number;
  templatePath?: string;
  targetPath?: string;
  portFilePath?: string;
};

export async function findAvailablePort(
  preferredPort: number,
  maxAttempts: number
): Promise<number> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const port = preferredPort + attempt;
    const available = await new Promise<boolean>((resolve) => {
      const server = net.createServer();
      server.once('error', () => resolve(false));
      server.listen(port, () => {
        server.close(() => resolve(true));
      });
    });

    if (available) return port;
  }

  throw new Error(`No free port found after ${maxAttempts} attempts starting at ${preferredPort}`);
}

export function renderAeroSpaceConfig(template: string, port: number): string {
  return template.replace(/127\.0\.0\.1:\d+/g, `127.0.0.1:${port}`);
}

export async function syncAeroSpaceConfig(options: SyncOptions = {}): Promise<number> {
  const rootDir = process.cwd();
  const preferredPort =
    options.preferredPort ?? (Number(process.env.PORT) || 3000);
  const maxAttempts = options.maxAttempts ?? 20;
  const templatePath = options.templatePath ?? path.join(rootDir, 'config', 'aerospace.toml');
  const targetPath = options.targetPath ?? path.join(os.homedir(), '.aerospace.toml');
  const portFilePath = options.portFilePath ?? path.join(rootDir, '.streamdeck-port');

  const template = await fs.readFile(templatePath, 'utf8');
  const port = await findAvailablePort(preferredPort, maxAttempts);
  const rendered = renderAeroSpaceConfig(template, port);

  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, rendered, 'utf8');
  await fs.writeFile(portFilePath, String(port), 'utf8');

  return port;
}

async function main(): Promise<void> {
  const port = await syncAeroSpaceConfig();
  console.log(`AeroSpace config synced with port ${port}`);
}

if (require.main === module) {
  void main();
}
