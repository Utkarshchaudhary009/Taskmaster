import pc from 'picocolors';
import { homedir } from 'os';
import { join } from 'path';

export type MCPSource = 'claude' | 'cursor' | 'windsurf' | 'gemini' | 'vscode' | 'continue';

export function getIDEConfigPaths(): Record<MCPSource, string> {
  const home = homedir();
  const isWindows = process.platform === 'win32';
  const isMac = process.platform === 'darwin';

  return {
    claude: isWindows
      ? join(process.env.APPDATA!, 'Claude', 'claude_desktop_config.json')
      : isMac
        ? join(home, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json')
        : join(home, '.config', 'Claude', 'claude_desktop_config.json'),
    cursor: join(home, '.cursor', 'mcp.json'),
    windsurf: join(home, '.codeium', 'windsurf', 'mcp_config.json'),
    gemini: join(home, '.gemini', 'settings.json'),
    vscode: '.vscode/mcp.json', // Relative to workspace
    continue: join(home, '.continue', 'config.yaml'),
  };
}

export async function detectInstalledIDEs() {
  const paths = getIDEConfigPaths();
  const detected: Array<{ name: MCPSource; path: string }> = [];

  for (const [name, path] of Object.entries(paths) as [MCPSource, string][]) {
    try {
      const file = Bun.file(path);
      if (await file.exists()) {
        detected.push({ name, path });
      }
    } catch {
      // Ignore errors
    }
  }

  return detected;
}
