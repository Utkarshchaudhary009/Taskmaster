import { experimental_createMCPClient as createMCPClient } from '@ai-sdk/mcp';
import { Experimental_StdioMCPTransport as StdioMCPTransport } from '@ai-sdk/mcp';
import type { TaskmasterMCPConfig, MCPServerEntry } from '../config/store';

export async function loadMCPClients(config: TaskmasterMCPConfig) {
    const clients = new Map<string, Awaited<ReturnType<typeof createMCPClient>>>();
    const allTools: Record<string, any> = {};

    for (const [name, server] of Object.entries(config.mcpServers)) {
        if (!server.enabled) continue;

        try {
            const client = await createClientForServer(name, server);
            clients.set(name, client);

            // Get tools from this server
            const serverTools = await client.tools();
            // Prefix tool names to avoid conflicts
            for (const [toolName, tool] of Object.entries(serverTools)) {
                allTools[`${name}__${toolName}`] = tool;
            }
        } catch (error) {
            // Silent fail - MCP server not available
        }
    }

    return { clients, tools: allTools };
}

async function createClientForServer(name: string, server: MCPServerEntry) {
    if (server.url) {
        // HTTP transport
        return createMCPClient({
            transport: {
                type: 'http',
                url: server.url,
                headers: server.headers,
            },
            name,
        });
    }

    if (server.command) {
        // stdio transport
        const transport = new StdioMCPTransport({
            command: server.command,
            args: server.args || [],
            env: server.env || {},
            cwd: server.cwd,
        });

        return createMCPClient({ transport, name });
    }

    throw new Error(`Server "${name}" has no valid transport configuration`);
}
