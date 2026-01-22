/**
 * TaskMaster Type Definitions
 */

// ============ MCP Server Types ============
export interface MCPServerConfig {
    command?: string;
    args?: string[];
    env?: Record<string, string>;
    transport?: 'stdio' | 'http' | 'sse';
    url?: string;
    authRequired?: boolean;
}

export interface GlobalConfig {
    mcpRegistry: Record<string, MCPServerConfig>;
    providers: Record<string, ProviderConfig>;
    settings: SettingsConfig;
    permissions: PermissionsConfig;
}

// ============ Provider Types ============
export interface ProviderConfig {
    name: string;
    baseUrl: string;
    apiKey: string;
    models: string[];
    createdAt: string;
}

export interface SettingsConfig {
    liteModel: ModelReference;
    heavyModel: ModelReference;
}

export interface ModelReference {
    provider: string;  // Provider name (e.g., "ollama", "groq", "gemini")
    model: string;     // Model ID (e.g., "llama3", "gemini-3-pro")
}

// ============ Permission Types ============
export type PermissionDecision = 'session' | 'always' | 'once' | 'denied';

export interface PermissionsConfig {
    // Commands that are always allowed (persisted)
    alwaysAllow: string[];
    // Commands that are always denied (persisted)
    alwaysDeny: string[];
}

export interface SessionPermissions {
    // Commands allowed for this session only
    sessionAllow: Set<string>;
    // Commands denied for this session only
    sessionDeny: Set<string>;
}

// ============ Task/Agent Types ============
export interface TaskArgs {
    prompt: string;
    mcp?: string[];
    model?: 'heavy' | 'lite';
    isSubagent?: boolean;
}

export interface AgentConfig {
    model: 'heavy' | 'lite';
    mcpServers?: string[];
    maxSteps?: number;
    prompt: string;
}

// ============ Shell Tool Types ============
export interface ShellCommandResult {
    stdout: string;
    stderr: string;
    exitCode: number;
}

export interface ShellToolOptions {
    onBeforeExecute?: (command: string) => Promise<boolean>;
    workingDirectory?: string;
}
