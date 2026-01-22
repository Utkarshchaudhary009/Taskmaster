
import { Experimental_StdioMCPTransport as StdioMCPTransport } from "@ai-sdk/mcp/mcp-stdio";
import { createMCPClient } from "@ai-sdk/mcp";
import type { MCPServerConfig } from "../types";
import { TaskMasterAuthProvider } from "./auth-provider";
import { TokenStorage } from "./token-storage";

export interface MCPToolSet {
    [key: string]: any; // AI SDK tool definition
}

/**
 * Load MCP tools from a list of server configurations
 */
export async function loadMcpClients(servers: Array<{ name: string } & MCPServerConfig>) {
    const clients = await Promise.all(
        servers.map(async (server) => {
            try {
                if (server.transport === "http" || server.transport === "sse") {
                    if (!server.url) {
                        console.warn(`Skipping ${server.name}: URL required for ${server.transport} transport`);
                        return null;
                    }

                    let authProvider;
                    if (server.authRequired !== false) {
                        const storage = new TokenStorage();
                        authProvider = new TaskMasterAuthProvider(
                            server.name,
                            server.url,
                            storage
                        );
                    }

                    const client = await createMCPClient({
                        transport: {
                            type: server.transport,
                            url: server.url,
                            authProvider,
                        },
                    });

                    return { name: server.name, client };
                }

                // Default to stdio
                if (!server.command) {
                    console.warn(`Skipping ${server.name}: Command required for stdio transport`);
                    return null;
                }

                const transport = new StdioMCPTransport({
                    command: server.command,
                    args: server.args || [],
                    env: { ...process.env, ...server.env }, // Pass through env + defaults
                });

                const client = await createMCPClient({
                    transport,
                });

                return { name: server.name, client };
            } catch (e) {
                console.error(`Failed to connect to MCP server ${server.name}:`, e);
                return null;
            }
        })
    );

    return clients.filter((c): c is NonNullable<typeof c> => c !== null);
}

/**
 * High-level function to clean tool names and merge them
 * Prefix tools with server name to avoid collisions: "git_commit", "vercel_deploy"
 */
export async function loadMcpTools(serverNames?: string[]): Promise<MCPToolSet> {
    const { MCPRegistry } = await import("./registry");
    const registry = new MCPRegistry();
    const servers = await registry.getServers(serverNames);

    const clients = await loadMcpClients(servers);
    const allTools: MCPToolSet = {};

    for (const { name, client } of clients) {
        const tools = await client.tools(); // Record<string, Tool>

        for (const [toolName, tool] of Object.entries(tools)) {
            // Namespacing: serverName_toolName (e.g. github_create_issue)
            // If server name is "github", tool is "create_issue" -> "github_create_issue"
            const namespacedToolName = `${name}_${toolName}`;
            allTools[namespacedToolName] = tool;
        }
    }

    return allTools;
}
