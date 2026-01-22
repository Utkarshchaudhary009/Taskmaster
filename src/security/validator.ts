
import { z } from "zod";

export class SecurityValidator {
    /**
     * Validate command name - CRITICAL SECURITY
     * Only allow alphanumeric, hyphens, underscores, dots
     */
    static validateCommandName(cmd: string): boolean {
        return /^[a-zA-Z0-9_.-]+$/.test(cmd);
    }

    /**
     * Validate file path - prevent directory traversal
     */
    static validatePath(path: string): boolean {
        try {
            // Basic check for .. in path
            return !path.includes("..");
        } catch {
            return false;
        }
    }

    /**
     * Validate server name (used in config keys)
     */
    static validateServerName(name: string): boolean {
        return /^[a-zA-Z0-9_-]+$/.test(name);
    }
}

// Zod schema for MCP Server Config validation
export const MCPServerValidator = z.object({
    command: z.string().refine(SecurityValidator.validateCommandName, {
        message: "Invalid command name - only alphanumeric, -, _, . allowed",
    }).optional(),
    args: z.array(z.string()).optional(),
    env: z.record(z.string(), z.string()).optional(),
    cwd: z.string().optional(),
    transport: z.enum(["stdio", "http", "sse"]).optional(),
    url: z.string().url().optional(),
}).refine(data => {
    if (data.transport === "http" || data.transport === "sse") {
        return !!data.url;
    }
    return !!data.command;
}, {
    message: "URL is required for HTTP/SSE, Command is required for Stdio",
});
