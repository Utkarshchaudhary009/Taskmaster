
export interface MCPServerConfig {
    command?: string;
    args?: string[];
    env?: Record<string, string>;
    transport?: 'stdio' | 'http' | 'sse';
    url?: string;  // For HTTP/SSE transports
    authRequired?: boolean;
}

export interface GlobalConfig {
    // Registry of all known MCPs (synced from IDEs)
    mcpRegistry: Record<string, MCPServerConfig>;
}

export interface TaskArgs {
    prompt: string;
    mcp?: string[]; // Server names to load
    model?: 'heavy' | 'lite';
    isSubagent?: boolean;
}

export interface AgentConfig {
    model: 'heavy' | 'lite';
    mcpServers?: string[];  // Limited MCPs
    maxSteps?: number;
    prompt: string;
}
