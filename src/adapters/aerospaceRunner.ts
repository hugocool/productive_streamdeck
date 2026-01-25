import { execFile } from 'child_process';
import { promisify } from 'util';

export interface AerospaceRunner {
  run(args: string[]): Promise<string>;
}

const execFileAsync = promisify(execFile);

export class RealRunner implements AerospaceRunner {
  async run(args: string[]): Promise<string> {
    const { stdout, stderr } = await execFileAsync('aerospace', args, {
      encoding: 'utf8',
      env: process.env
    });
    if (stderr?.trim()) {
      console.error('[AeroSpace stderr]', stderr.trim());
    }
    return stdout;
  }
}

export class DryRunner implements AerospaceRunner {
  constructor(private real: AerospaceRunner) {}

  async run(args: string[]): Promise<string> {
    return this.real.run(args);
  }
}

export class MockRunner implements AerospaceRunner {
  private fixtures = new Map<string, string>();
  public calls: string[][] = [];

  setFixture(args: string[], output: string): void {
    this.fixtures.set(args.join('\0'), output);
  }

  async run(args: string[]): Promise<string> {
    this.calls.push(args);
    return this.fixtures.get(args.join('\0')) ?? '';
  }
}
