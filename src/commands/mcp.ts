
import { SyncEngine } from "../sync/engine";
import { MCPRegistry } from "../mcp/registry";
import { MCPAuth } from "../mcp/auth";
import { ui } from "../cli/ui";

export async function handleMcpCommand(subcommand: string, args: string[]) {
    switch (subcommand) {
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
