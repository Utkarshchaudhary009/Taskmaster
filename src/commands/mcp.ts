
import { SyncEngine } from "../sync/engine";
import { MCPRegistry } from "../mcp/registry";
import { MCPAuth } from "../mcp/auth";
import { ui } from "../cli/ui";
import { generateObject } from "ai";
import { getHeavyModel } from "../providers/gemini-provider";
import { z } from "zod";

export async function handleMcpCommand(subcommand: string, args: string[]) {
    switch (subcommand) {
        case "discover":
            const query = args.join(" ");
            if (!query) {
                ui.error("Usage: tm mcp discover <search query>");
                return;
            }

            ui.section(`Discovering MCP Server for: "${query}"`);
            ui.spinner.start("Consulting AI knowledge base...");

            try {
                const model = getHeavyModel();
                const { object: result } = await generateObject({
                    model,
                    schema: z.object({
                        name: z.string().describe("Short unique name for the server (e.g. github, postgres)"),
                        description: z.string(),
                        transport: z.enum(["stdio", "http", "sse"]),
                        command: z.string().optional().describe("Command to run (e.g. npx)"),
                        args: z.array(z.string()).optional().describe("Arguments for the command"),
                        url: z.string().optional().describe("URL for HTTP/SSE transport"),
                        envVars: z.array(z.object({
                            name: z.string(),
                            description: z.string(),
                            required: z.boolean(),
                            instructions: z.string().describe("How the user can get this key")
                        })).optional(),
                        installCommand: z.string().optional().describe("Command to install prerequisites (e.g. npm install -g ...)")
                    }),
                    prompt: `You are an expert on the Model Context Protocol (MCP). 
                    The user wants to find the best MCP server for: "${query}".
                    
                    Analyze the request and provide configuration for the most standard/official MCP server available.
                    If it's a popular service (GitHub, Postgres, SQLite, Slack, etc.), prefer the official implementation.
                    
                    For 'stdio' transport, provide the 'npx' command if possible to avoid manual installation, or the binary name.
                    For 'http'/'sse', provide the public URL if it exists, or local URL if it needs to be self-hosted.
                    
                    Check if it requires Authentication (API Keys, OAuth tokens) and list them in envVars.
                    `
                });

                ui.spinner.stop(true);
                
                ui.item("📦", ui.bold(result.name));
                ui.item("📝", result.description);
                ui.item("🔌", `Transport: ${result.transport}`);
                
                if (result.command) {
                    ui.item("🚀", `Command: ${result.command} ${(result.args || []).join(" ")}`);
                }
                if (result.url) {
                    ui.item("🌐", `URL: ${result.url}`);
                }

                console.log();
                const confirm = await ui.ask(`Do you want to add '${result.name}' to your configuration? (y/N)`);
                
                if (confirm.toLowerCase() !== "y") {
                    ui.info("Cancelled.");
                    return;
                }

                // Collect Environment Variables
                const env: Record<string, string> = {};
                if (result.envVars && result.envVars.length > 0) {
                    ui.section("Configuration Needed");
                    for (const variable of result.envVars) {
                        if (variable.required) {
                            ui.info(variable.instructions);
                            const value = await ui.ask(`Enter value for ${variable.name}:`);
                            if (value) {
                                env[variable.name] = value;
                            } else {
                                ui.warning(`Skipping empty required variable ${variable.name}. Server might fail.`);
                            }
                        }
                    }
                }

                // Construct Config
                const config: any = {
                    transport: result.transport,
                    enabled: true
                };

                if (result.transport === "stdio") {
                    config.command = result.command;
                    config.args = result.args;
                } else {
                    config.url = result.url;
                    // For now, we don't automate OAuth flow here, just manual keys or URL
                }

                if (Object.keys(env).length > 0) {
                    config.env = env;
                }

                // Save
                const registry = new MCPRegistry();
                await registry.addServer(result.name, config);
                
                ui.success(`Server '${result.name}' added successfully!`);
                ui.info("Run 'tm mcp list' to see it.");

            } catch (e: any) {
                ui.spinner.stop(false);
                ui.error(`Discovery failed: ${e.message}`);
            }
            break;

        case "sync":
            const engine = new SyncEngine();
            await engine.sync();
            break;

        case "list":
            const registry = new MCPRegistry();
            const servers = await registry.listAll();
            
            ui.header("MCP Servers");
            
            if (servers.length === 0) {
                ui.warning("No MCP servers registered. Run 'tm mcp sync' to import from IDEs.");
            } else {
                ui.info(`Found ${servers.length} registered servers:`);
                
                for (const s of servers) {
                    // Infer transport: if URL exists, it's http/sse; otherwise stdio
                    let transport = s.transport;
                    if (!transport) {
                        transport = s.url ? "http" : "stdio";
                    }
                    
                    const detail = s.url || s.command || "";
                    const icon = transport === "stdio" ? "🖥️" : "🌐";
                    ui.item(icon, ui.bold(s.name), ui.dim(`(${transport}) ${detail}`));
                }
                console.log();
            }
            break;

        case "auth":
            const [name] = args;
            if (!name) {
                ui.error("Usage: tm mcp auth <server-name>");
                return;
            }
            
            ui.header(`Authenticate: ${name}`);
            const auth = new MCPAuth();
            await auth.authenticate(name);
            break;

        default:
            ui.error(`Unknown subcommand: ${subcommand}`);
            ui.info("Available commands: sync, list, auth");
    }
}
