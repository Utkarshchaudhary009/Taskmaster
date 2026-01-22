
import { join } from "path";
import { homedir } from "os";

export const IDE_DEFINITIONS = {
    "gemini-cli": {
        name: "Gemini CLI",
        paths: {
            win32: join(homedir(), ".gemini", "settings.json"),
            darwin: join(homedir(), ".gemini", "settings.json"),
            linux: join(homedir(), ".gemini", "settings.json"),
        },
        mcpKey: "mcpServers"
    },
    "claude-desktop": {
        name: "Claude Desktop",
        paths: {
            win32: join(process.env.APPDATA || "", "Claude", "claude_desktop_config.json"),
            darwin: join(homedir(), "Library", "Application Support", "Claude", "claude_desktop_config.json"),
            linux: join(homedir(), ".config", "Claude", "claude_desktop_config.json"),
        },
        mcpKey: "mcpServers"
    },
    "cursor": {
        name: "Cursor",
        paths: {
            win32: join(process.env.APPDATA || "", "Cursor", "User", "settings.json"),
            darwin: join(homedir(), "Library", "Application Support", "Cursor", "User", "settings.json"),
            linux: join(homedir(), ".config", "Cursor", "User", "settings.json"),
        },
        mcpKey: "mcpServers" // Cursor might be different? usually inside "cursor.mcp" or similar, need to verify or assume standard for now
        // Actually Cursor embeds it in settings.json under "mcpServers" key recently or sometimes separate. 
        // Research says `~/Library/Application Support/Cursor/User/settings.json`
    }
};
