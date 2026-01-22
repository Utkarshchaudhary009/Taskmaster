
import { SyncEngine } from "../sync/engine";
import { MCPRegistry } from "../mcp/registry";
import { MCPAuth } from "../mcp/auth";

export async function handleMcpCommand(subcommand: string, args: string[]) {
    switch (subcommand) {
        case "sync":
            const engine = new SyncEngine();
            await engine.sync();
            break;

        case "list":
            const registry = new MCPRegistry();
            const servers = await registry.listAll();
            console.log(`\n📋 Available MCP Servers (${servers.length}):`);
            servers.forEach(s => {
                console.log(`  - ${s.name} (${s.command})`);
            });
            break;

        case "auth":
            const [name] = args;
            if (!name) {
                console.error("Usage: tm mcp auth <server-name>");
                return;
            }
            console.log(`🔐 Triggering auth for ${name}...`);
            const auth = new MCPAuth();
            await auth.authenticate(name);
            break;

        default:
            console.log(`Unknown subcommand: ${subcommand}`);
            console.log("Available: sync, list, auth");
    }
}
