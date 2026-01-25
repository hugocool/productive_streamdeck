import { execFile as nodeExecFile } from 'child_process';
import type { ExecFileOptions } from 'child_process';

import { ensureKeySenderBuilt, parseKeySenderProbe, type KeySenderProbeResult } from './nativeHelper';

export type KeySenderInvocation = {
  bundleId: string;
  shortcut?: string;
  requireVisibleOnActiveDisplay?: boolean;
  requireVisibleOnScreen?: boolean;
  restoreFocus?: boolean;
  probeOnly?: boolean;
};

export type ProbeAppOptions = {
  bundleId: string;
  requireVisibleOnActiveDisplay?: boolean;
  requireVisibleOnScreen?: boolean;
};

export type SendShortcutOptions = {
  bundleId: string;
  shortcut: string;
  requireVisibleOnActiveDisplay?: boolean;
  requireVisibleOnScreen?: boolean;
  restoreFocus?: boolean;
};

type ExecFileLike = (
  file: string,
  args: ReadonlyArray<string>,
  options: ExecFileOptions & { encoding: 'utf8' },
  callback: (error: Error | null, stdout: string, stderr: string) => void
) => void;

export function buildKeySenderArgs(invocation: KeySenderInvocation): string[] {
  const args: string[] = ['--bundle-id', invocation.bundleId];

  if (invocation.probeOnly) {
    args.push('--probe');
  } else {
    if (!invocation.shortcut) {
      throw new Error('buildKeySenderArgs requires shortcut when probeOnly=false');
    }
    args.push('--shortcut', invocation.shortcut);
  }

  if (invocation.requireVisibleOnActiveDisplay) {
    args.push('--require-visible-on-active-display');
  }
  if (invocation.requireVisibleOnScreen) {
    args.push('--require-visible');
  }
  if (invocation.restoreFocus === false) {
    args.push('--no-restore-focus');
  }

  return args;
}

function execFileUtf8(execFile: ExecFileLike, file: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(file, args, { encoding: 'utf8' }, (error, stdout, stderr) => {
      if (error) {
        const wrapped = new Error(stdout || stderr || error.message);
        (wrapped as unknown as { cause?: unknown }).cause = error;
        reject(wrapped);
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

export function createKeySenderClient(deps: {
  ensureKeySenderBuilt?: typeof ensureKeySenderBuilt;
  execFile?: ExecFileLike;
} = {}) {
  const ensureBuilt = deps.ensureKeySenderBuilt ?? ensureKeySenderBuilt;
  const execFile = deps.execFile ?? (nodeExecFile as unknown as ExecFileLike);

  return {
    async probeApp(options: ProbeAppOptions): Promise<KeySenderProbeResult | null> {
      const helperPath = await ensureBuilt();
      const args = buildKeySenderArgs({
        bundleId: options.bundleId,
        probeOnly: true,
        requireVisibleOnActiveDisplay: options.requireVisibleOnActiveDisplay ?? false,
        requireVisibleOnScreen: options.requireVisibleOnScreen ?? false
      });

      const { stdout } = await execFileUtf8(execFile, helperPath, args);
      return parseKeySenderProbe(stdout);
    },

    async sendShortcutToApp(options: SendShortcutOptions): Promise<void> {
      const helperPath = await ensureBuilt();
      const args = buildKeySenderArgs({
        bundleId: options.bundleId,
        shortcut: options.shortcut,
        probeOnly: false,
        requireVisibleOnActiveDisplay: options.requireVisibleOnActiveDisplay ?? false,
        requireVisibleOnScreen: options.requireVisibleOnScreen ?? false,
        restoreFocus: options.restoreFocus ?? true
      });

      await execFileUtf8(execFile, helperPath, args);
    }
  };
}

