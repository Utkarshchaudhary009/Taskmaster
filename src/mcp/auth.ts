
import { TokenStorage } from "./token-storage";
import { TaskMasterAuthProvider } from "./auth-provider";
import { MCPRegistry } from "./registry";

export class MCPAuth {
    private storage: TokenStorage;

    constructor() {
        this.storage = new TokenStorage();
    }

    /**
     * Trigger authentication flow for a server
     * @param serverName Name of the MCP server
     */
    async authenticate(serverName: string) {
        console.log(`🔐 Authenticating ${serverName}...`);

        // specialized logic for Gemini
        if (serverName === "gemini" || serverName === "google") {
            console.log("For Gemini, please run 'gemini login' or 'gemini' in your terminal.");
            console.log("We use the standard Gemini CLI credentials.");
            return;
        }

        const registry = new MCPRegistry();
        const servers = await registry.getServers([serverName]);
        const server = servers[0];

        if (!server || !server.url) {
            console.error(`Error: Server ${serverName} not found or has no URL for OAuth.`);
            return;
        }

        try {
            const provider = new TaskMasterAuthProvider(server.name, server.url, this.storage);
            await provider.authenticate();
        } catch (e) {
            console.error(`❌ Authentication failed for ${serverName}:`, e);
        }
    }

    async getToken(serverName: string) {
        return this.storage.get(serverName);
    }
}
