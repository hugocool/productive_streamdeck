import { execFile } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

type EnsureOptions = {
  rootDir?: string;
  runBuild?: () => Promise<void>;
};

export type KeySenderProbeResult = {
  ok: boolean;
  code: number;
  message: string;
  bundleId: string;
  visibleOnActiveDisplay: boolean;
  visibleOnScreen: boolean;
};

export function getKeySenderPath(rootDir: string = process.cwd()): string {
  return path.join(rootDir, 'native', 'keysender', '.build', 'release', 'keysender');
}

async function runDefaultBuild(rootDir: string): Promise<void> {
  const buildCwd = path.join(rootDir, 'native', 'keysender');
  const attempt = (command: string, args: string[]) =>
    new Promise<void>((resolve, reject) => {
      execFile(command, args, { cwd: buildCwd, encoding: 'utf8' }, (error, stdout, stderr) => {
        if (error) {
          const detail = stderr || stdout || error.message || String(error);
          reject(new Error(`${command} ${args.join(' ')} failed: ${detail}`));
          return;
        }
        resolve();
      });
    });

  try {
    await attempt('swift', ['build', '-c', 'release']);
  } catch (error) {
    try {
      await attempt('xcrun', ['swift', 'build', '-c', 'release']);
    } catch (fallbackError) {
      const primary = error instanceof Error ? error.message : String(error);
      const fallback = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
      throw new Error(`Swift build failed.\n- swift: ${primary}\n- xcrun: ${fallback}`);
    }
  }
}

export async function ensureKeySenderBuilt(options: EnsureOptions = {}): Promise<string> {
  const rootDir = options.rootDir ?? process.cwd();
  const helperPath = getKeySenderPath(rootDir);

  try {
    await fs.access(helperPath);
    return helperPath;
  } catch {
    const build = options.runBuild ?? (() => runDefaultBuild(rootDir));
    await build();
    return helperPath;
  }
}

export function parseKeySenderProbe(raw: string): KeySenderProbeResult | null {
  try {
    const parsed = JSON.parse(raw) as KeySenderProbeResult;
    if (typeof parsed?.ok !== 'boolean') return null;
    return parsed;
  } catch {
    return null;
  }
}
