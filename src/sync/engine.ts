
import { join } from "path";
import { homedir } from "os";
import { IDE_DEFINITIONS } from "../clients/definitions";
import { ClientDiscovery } from "../clients/discovery";
import { SecurityValidator } from "../security/validator";
import type { GlobalConfig, MCPServerConfig } from "../types";

export class SyncEngine {
    private configPath: string;

    constructor() {
        this.configPath = join(homedir(), ".taskmaster", "config.json");
    }

    async sync() {
        console.log("🔄 Starting MCP Sync...");

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

        for (const client of clients) {
            if (client.type !== 'file' || !client.configPath) {
                console.log(`   ℹ️  Skipping CLI-only client: ${client.name} (Sync not support yet)`);
                continue;
            }

            const ideFile = Bun.file(client.configPath);
            try {
                console.log(`   Found ${client.name} config at ${client.configPath}`);
                const content = await ideFile.json();

                // Determine the key for MCP servers. Default to 'mcpServers' but fallback if needed
                // Currently definitions don't store key in ClientDiscovery result, need to look up
                const def = Object.values(IDE_DEFINITIONS).find(d => d.name === client.name);
                const key = def?.mcpKey || "mcpServers";

                const servers = content[key];

                if (servers && typeof servers === 'object') {
                    for (const [name, config] of Object.entries(servers)) {
                        // Normalize and validate
                        if (!SecurityValidator.validateServerName(name)) {
                            console.warn(`   ⚠️  Skipping invalid server name: "${name}"`);
                            continue;
                        }

                        if (!registry[name]) {
                            registry[name] = config as MCPServerConfig;
                            console.log(`   + Added ${name} from ${client.name}`);
                            newConfigs++;
                        }
                    }
                }
            } catch (e) {
                console.error(`   Failed to read ${client.name}:`, e);
            }
        }

        // 3. Save
        await Bun.write(this.configPath, JSON.stringify({ mcpRegistry: registry }, null, 2));
        console.log(`✅ Sync complete. ${newConfigs} new servers added.`);
    }
}
