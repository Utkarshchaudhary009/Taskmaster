
import { join } from "path";
import { homedir } from "os";
import { IDE_DEFINITIONS } from "../clients/definitions";
import { ClientDiscovery } from "../clients/discovery";
import { SecurityValidator } from "../security/validator";
import { ui } from "../cli/ui";
import type { GlobalConfig, MCPServerConfig } from "../types";

export class SyncEngine {
    private configPath: string;

    constructor() {
        this.configPath = join(homedir(), ".taskmaster", "config.json");
    }

    private getNestedValue(obj: Record<string, any>, path: string): any {
        const keys = path.split(".");
        let current = obj;
        for (const key of keys) {
            if (current && typeof current === "object" && key in current) {
                current = current[key];
            } else {
                return undefined;
            }
        }
        return current;
    }

    async sync() {
        ui.header("MCP Sync");
        ui.info("Scanning for IDE configurations...");

        // 1. Load existing
        let registry: Record<string, MCPServerConfig> = {};
        const file = Bun.file(this.configPath);
        if (await file.exists()) {
            try {
                const data = await file.json();
                registry = data.mcpRegistry || {};
            } catch { }
        }

        // 2. Scan IDEs using Discovery Module
        const discovery = new ClientDiscovery();
        const clients = await discovery.discoverAll();
        let newConfigs = 0;
        let foundClients = 0;

        ui.section("Discovered IDEs");

        for (const client of clients) {
            if (client.type !== 'file' || !client.configPath) {
                ui.item("⏭️", ui.dim(client.name), "(CLI-only, skipped)");
                continue;
            }

            foundClients++;
            const ideFile = Bun.file(client.configPath);
            
            try {
                const content = await ideFile.json();

                // Determine the key for MCP servers (supports nested paths like "mcp.servers")
                const def = Object.values(IDE_DEFINITIONS).find(d => d.name === client.name);
                const key = def?.mcpKey || "mcpServers";
                const icon = def?.icon || "📦";

                // Handle nested keys like "mcp.servers"
                const servers = this.getNestedValue(content, key);

                if (servers && typeof servers === 'object') {
                    const serverCount = Object.keys(servers).length;
                    ui.item(icon, ui.bold(client.name), `(${serverCount} servers)`);

                    for (const [name, rawConfig] of Object.entries(servers)) {
                        if (!SecurityValidator.validateServerName(name)) {
                            ui.item("  ⚠️", ui.yellow(name), "(invalid name, skipped)");
                            continue;
                        }

                        if (!registry[name]) {
                            const config = rawConfig as MCPServerConfig;
                            
                            // Auto-detect transport type if not specified
                            if (!config.transport) {
                                if (config.url) {
                                    config.transport = config.url.includes("/sse") ? "sse" : "http";
                                } else if (config.command) {
                                    config.transport = "stdio";
                                }
                            }
                            
                            registry[name] = config;
                            ui.item("  ➕", ui.green(name), "(new)");
                            newConfigs++;
                        } else {
                            ui.item("  ✓", ui.dim(name), "(exists)");
                        }
                    }
                } else {
                    ui.item(icon, client.name, ui.dim("(no MCP servers)"));
                }
            } catch (e) {
                ui.item("❌", ui.red(client.name), `(read error)`);
            }
        }

        console.log();

        // 3. Save
        await Bun.write(this.configPath, JSON.stringify({ mcpRegistry: registry }, null, 2));
        
        ui.divider();
        ui.success(`Sync complete: ${newConfigs} new servers from ${foundClients} IDEs`);
        ui.info(`Total servers in registry: ${Object.keys(registry).length}`);
    }
}
