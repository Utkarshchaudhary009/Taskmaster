
import { join } from "path";
import { homedir } from "os";
import type { GlobalConfig, MCPServerConfig } from "../types";

export class MCPRegistry {
    private configPath: string;

    constructor() {
        this.configPath = join(homedir(), ".taskmaster", "config.json");
    }

    /**
     * List all available MCP servers from the global config
     */
    async listAll(): Promise<Array<{ name: string } & MCPServerConfig>> {
        const config = await this.loadConfig();
        return Object.entries(config.mcpRegistry).map(([name, config]) => ({
            name,
            ...config,
        }));
    }

    /**
     * Get specific servers by name, or all if no filter provided
     */
    async getServers(filter?: string[]): Promise<Array<{ name: string } & MCPServerConfig>> {
        const all = await this.listAll();

        if (!filter || filter.length === 0) {
            return all;
        }

        return all.filter(s => filter.includes(s.name));
    }

    private async loadConfig(): Promise<GlobalConfig> {
        const file = Bun.file(this.configPath);
        if (!(await file.exists())) {
            return { mcpRegistry: {} };
        }

        try {
            return await file.json();
        } catch (e) {
            console.error("Failed to load generic config:", e);
            return { mcpRegistry: {} };
        }
    }

    /**
     * Initialize default config if not exists
     */
    async initDefaults() {
        const file = Bun.file(this.configPath);
        if (!(await file.exists())) {
            // Create dir if needed
            const dir = join(homedir(), ".taskmaster");
            /* Bun doesn't have mkdir native in stable yet for recursive? 
               Actually Bun.write handles file creation but not recursive dir creation 
               if valid parent doesn't exist? 
               Use node compat for safety. */
            const { mkdirSync } = await import("fs");
            mkdirSync(dir, { recursive: true });

            await Bun.write(this.configPath, JSON.stringify({ mcpRegistry: {} }, null, 2));
        }
    }

    /**
     * Add or update a server configuration
     */
    async addServer(name: string, config: MCPServerConfig) {
        const current = await this.loadConfig();
        current.mcpRegistry[name] = config;
        
        // Ensure directory exists
        const dir = join(homedir(), ".taskmaster");
        const { mkdirSync } = await import("fs");
        if (!await Bun.file(dir).exists()) {
             mkdirSync(dir, { recursive: true });
        }

        await Bun.write(this.configPath, JSON.stringify(current, null, 2));
    }
}
