import { homedir } from 'os';
import { join } from 'path';

export const CONFIG_DIR = join(homedir(), '.taskmaster');
export const CONFIG_FILE = join(CONFIG_DIR, 'config.json');
export const MCP_CONFIG_FILE = join(CONFIG_DIR, 'mcp-config.json');

export interface TaskmasterConfig {
    zhipuApiKey?: string;
    geminiCliConfigured?: boolean;
    version: string;
}

export interface MCPServerEntry {
    command?: string;
    args?: string[];
    env?: Record<string, string>;
    cwd?: string;
    url?: string;
    headers?: Record<string, string>;
    description?: string;
    source: 'claude' | 'cursor' | 'windsurf' | 'gemini' | 'vscode' | 'continue' | 'manual';
    enabled: boolean;
}

export interface TaskmasterMCPConfig {
    version: string;
    lastSync?: string;
    mcpServers: Record<string, MCPServerEntry>;
}

export async function loadConfig(): Promise<TaskmasterConfig | null> {
    try {
        const file = Bun.file(CONFIG_FILE);
        if (!(await file.exists())) return null;
        return await file.json();
    } catch {
        return null;
    }
}

export async function saveConfig(config: TaskmasterConfig): Promise<void> {
    await Bun.write(CONFIG_FILE, JSON.stringify(config, null, 2));
}

export async function loadMCPConfig(): Promise<TaskmasterMCPConfig> {
    try {
        const file = Bun.file(MCP_CONFIG_FILE);
        if (!(await file.exists())) {
            return { version: '1.0', mcpServers: {} };
        }
        return await file.json();
    } catch {
        return { version: '1.0', mcpServers: {} };
    }
}

export async function saveMCPConfig(config: TaskmasterMCPConfig): Promise<void> {
    await Bun.write(MCP_CONFIG_FILE, JSON.stringify(config, null, 2));
}

export async function ensureSetup(): Promise<boolean> {
    const config = await loadConfig();
    if (!config) return false;
    if (!config.zhipuApiKey) return false;
    if (!config.geminiCliConfigured) return false;
    return true;
}

export async function ensureConfigDir(): Promise<void> {
    await Bun.write(join(CONFIG_DIR, '.keep'), '');
}
