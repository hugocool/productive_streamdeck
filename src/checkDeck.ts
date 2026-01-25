import { execFile } from 'child_process';
import { promisify } from 'util';
import { listStreamDecks, openStreamDeck, StreamDeck } from '@elgato-stream-deck/node';

const execFileAsync = promisify(execFile);

export type OSState = 'IDLE' | 'ACTIVE' | 'PAUSED';

const KEY_STATE = 0;
const KEY_INFO = 1;
const KEY_FOCUS_LEFT_MON = 2;
const KEY_FOCUS_RIGHT_MON = 3;
const KEY_EXIT = 14;

export function colorForState(state: OSState): { r: number; g: number; b: number } {
  if (state === 'IDLE') return { r: 0, g: 180, b: 0 };
  if (state === 'ACTIVE') return { r: 255, g: 160, b: 0 };
  return { r: 0, g: 120, b: 255 };
}

export function nextState(state: OSState): OSState {
  if (state === 'IDLE') return 'ACTIVE';
  if (state === 'ACTIVE') return 'PAUSED';
  return 'IDLE';
}

export function formatInfoLines(state: OSState, workspace: string | null): [string, string] {
  const safeWorkspace = workspace && workspace.trim().length > 0 ? workspace.trim() : 'NO WS';
  return [state, safeWorkspace];
}

async function tryAeroSpace(args: string[]): Promise<string> {
  try {
    const { stdout } = await execFileAsync('aerospace', args, { encoding: 'utf8' });
    return stdout.trim();
  } catch (error) {
    const err = error as { stderr?: string; message?: string };
    return `AeroSpace call failed: ${err?.stderr || err?.message || String(error)}`;
  }
}

async function getFocusedWorkspace(): Promise<string | null> {
  const output = await tryAeroSpace(['list-workspaces', '--focused']);
  if (output.startsWith('AeroSpace call failed')) return null;
  return output.split('\n')[0]?.trim() ?? null;
}

async function renderInfoKey(deck: StreamDeck, iconSize: number, state: OSState): Promise<void> {
  const workspace = await getFocusedWorkspace();
  const [line1, line2] = formatInfoLines(state, workspace);
  const fontSize = Math.max(12, Math.round(iconSize * 0.22));

  const svg = `
    <svg width="${iconSize}" height="${iconSize}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#3C3C3C"/>
      <text x="50%" y="45%" text-anchor="middle" font-family="Arial, sans-serif"
            font-size="${fontSize}" font-weight="700" fill="white">${line1}</text>
      <text x="50%" y="70%" text-anchor="middle" font-family="Arial, sans-serif"
            font-size="${Math.max(10, Math.round(fontSize * 0.8))}" fill="white">${line2}</text>
    </svg>
  `;

  const { default: sharp } = await import('sharp');
  const buffer = await sharp(Buffer.from(svg))
    .resize(iconSize, iconSize)
    .removeAlpha()
    .raw()
    .toBuffer();

  await deck.fillKeyBuffer(KEY_INFO, buffer);
}

async function paintTopRow(deck: StreamDeck, state: OSState, iconSize: number): Promise<void> {
  await deck.clearPanel();
  try {
    await deck.setBrightness(30);
  } catch {
    // Some models or environments may not support brightness; ignore.
  }

  const c = colorForState(state);
  await deck.fillKeyColor(KEY_STATE, c.r, c.g, c.b);
  await renderInfoKey(deck, iconSize, state);
  await deck.fillKeyColor(KEY_FOCUS_LEFT_MON, 40, 40, 120);
  await deck.fillKeyColor(KEY_FOCUS_RIGHT_MON, 120, 40, 40);
  await deck.fillKeyColor(KEY_EXIT, 160, 0, 0);

  console.log(`STATE = ${state}`);
}

export async function main(): Promise<void> {
  const devices = await listStreamDecks();
  if (!devices.length) {
    console.error('No Stream Deck devices found.');
    process.exit(1);
  }

  const first = devices[0];
  const devicePath = typeof first === 'string' ? first : first.path;
  const deck = await openStreamDeck(devicePath);

  console.log(`Connected to: ${deck.MODEL}`);
  console.log(`Key count: ${deck.NUM_KEYS}`);

  let state: OSState = 'IDLE';
  const iconSize = (deck as { ICON_SIZE?: number }).ICON_SIZE ?? 72;
  await paintTopRow(deck, state, iconSize);

  deck.on('down', async (keyIndex: number) => {
    console.log(`DOWN key=${keyIndex}`);

    if (keyIndex === KEY_STATE) {
      state = nextState(state);
      await paintTopRow(deck, state, iconSize);
      return;
    }

    if (keyIndex === KEY_INFO) {
      const out = await tryAeroSpace([
        'list-windows',
        '--focused',
        '--format',
        '%{window-id} | %{app-name} | %{workspace} | %{window-title}'
      ]);
      console.log(out);
      await renderInfoKey(deck, iconSize, state);
      return;
    }

    if (keyIndex === KEY_FOCUS_LEFT_MON) {
      const out = await tryAeroSpace(['focus-monitor', 'left']);
      console.log(out);
      return;
    }

    if (keyIndex === KEY_FOCUS_RIGHT_MON) {
      const out = await tryAeroSpace(['focus-monitor', 'right']);
      console.log(out);
      return;
    }

    if (keyIndex === KEY_EXIT) {
      console.log('Exiting: clearing panel + closing device.');
      await deck.clearPanel();
      await deck.close();
      process.exit(0);
    }
  });

  deck.on('up', (keyIndex: number) => {
    console.log(`UP key=${keyIndex}`);
  });

  deck.on('error', (error: unknown) => {
    console.error('Stream Deck error:', error);
  });

  process.on('SIGINT', async () => {
    try {
      await deck.clearPanel();
      await deck.close();
    } finally {
      process.exit(0);
    }
  });
}

if (require.main === module) {
  void main();
}
