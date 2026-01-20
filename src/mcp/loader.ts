import { createMCPClient } from '@ai-sdk/mcp';
import { Experimental_StdioMCPTransport } from '@ai-sdk/mcp/mcp-stdio';
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
            console.warn(
                `Failed to connect to MCP server "${name}": `,
                error instanceof Error ? error.message : String(error)
            );
        }
    }

    return { clients, tools: allTools };
}

async function createClientForServer(name: string, server: MCPServerEntry) {
    if (server.url) {
        const url = server.url.toLowerCase();
        
        if (url.startsWith('sse://') || server.url.includes('/sse') || server.url.includes('?stream=sse')) {
            return createMCPClient({
                transport: {
                    type: 'sse',
                    url: server.url.replace('sse://', ''),
                    headers: server.headers,
                },
            });
        }
        
        return createMCPClient({
            transport: {
                type: 'http',
                url: server.url,
                headers: server.headers,
            },
        });
    }

    if (server.command) {
        const transport = new Experimental_StdioMCPTransport({
            command: server.command,
            args: server.args || [],
            env: server.env || {},
            cwd: server.cwd,
        });

        return createMCPClient({ transport });
    }

    throw new Error(`Server "${name}" has no valid transport configuration`);
}
