
import { join } from "path";
import { homedir } from "os";

const APPDATA = process.env["APPDATA"] || "";

export interface IDEDefinition {
    name: string;
    paths: {
        win32: string;
        darwin: string;
        linux: string;
    };
    mcpKey: string;
    icon: string;
}

export const IDE_DEFINITIONS: Record<string, IDEDefinition> = {
    "gemini-cli": {
        name: "Gemini CLI",
        paths: {
            win32: join(homedir(), ".gemini", "settings.json"),
            darwin: join(homedir(), ".gemini", "settings.json"),
            linux: join(homedir(), ".gemini", "settings.json"),
        },
        mcpKey: "mcpServers",
        icon: "💎"
    },
    "claude-desktop": {
        name: "Claude Desktop",
        paths: {
            win32: join(APPDATA, "Claude", "claude_desktop_config.json"),
            darwin: join(homedir(), "Library", "Application Support", "Claude", "claude_desktop_config.json"),
            linux: join(homedir(), ".config", "Claude", "claude_desktop_config.json"),
        },
        mcpKey: "mcpServers",
        icon: "🟠"
    },
    "cursor": {
        name: "Cursor",
        paths: {
            win32: join(APPDATA, "Cursor", "User", "globalStorage", "cursor.mcp", "mcp.json"),
            darwin: join(homedir(), "Library", "Application Support", "Cursor", "User", "globalStorage", "cursor.mcp", "mcp.json"),
            linux: join(homedir(), ".config", "Cursor", "User", "globalStorage", "cursor.mcp", "mcp.json"),
        },
        mcpKey: "mcpServers",
        icon: "⚡"
    },
    "vscode": {
        name: "VS Code",
        paths: {
            win32: join(APPDATA, "Code", "User", "settings.json"),
            darwin: join(homedir(), "Library", "Application Support", "Code", "User", "settings.json"),
            linux: join(homedir(), ".config", "Code", "User", "settings.json"),
        },
        mcpKey: "mcp.servers",
        icon: "🔵"
    },
    "vscode-insiders": {
        name: "VS Code Insiders",
        paths: {
            win32: join(APPDATA, "Code - Insiders", "User", "settings.json"),
            darwin: join(homedir(), "Library", "Application Support", "Code - Insiders", "User", "settings.json"),
            linux: join(homedir(), ".config", "Code - Insiders", "User", "settings.json"),
        },
        mcpKey: "mcp.servers",
        icon: "🟢"
    },
    "windsurf": {
        name: "Windsurf",
        paths: {
            win32: join(homedir(), ".codeium", "windsurf", "mcp_config.json"),
            darwin: join(homedir(), ".codeium", "windsurf", "mcp_config.json"),
            linux: join(homedir(), ".codeium", "windsurf", "mcp_config.json"),
        },
        mcpKey: "mcpServers",
        icon: "🏄"
    },
    "zed": {
        name: "Zed",
        paths: {
            win32: join(homedir(), ".config", "zed", "settings.json"),
            darwin: join(homedir(), ".config", "zed", "settings.json"),
            linux: join(homedir(), ".config", "zed", "settings.json"),
        },
        mcpKey: "context_servers",
        icon: "⚙️"
    },
    "continue": {
        name: "Continue",
        paths: {
            win32: join(homedir(), ".continue", "config.json"),
            darwin: join(homedir(), ".continue", "config.json"),
            linux: join(homedir(), ".continue", "config.json"),
        },
        mcpKey: "mcpServers",
        icon: "➡️"
    },
    "amp": {
        name: "Amp",
        paths: {
            win32: join(homedir(), ".ampcode", "settings.json"),
            darwin: join(homedir(), ".ampcode", "settings.json"),
            linux: join(homedir(), ".ampcode", "settings.json"),
        },
        mcpKey: "mcpServers",
        icon: "⚡"
    },
    "cline": {
        name: "Cline (VS Code)",
        paths: {
            win32: join(APPDATA, "Code", "User", "globalStorage", "saoudrizwan.claude-dev", "settings", "cline_mcp_settings.json"),
            darwin: join(homedir(), "Library", "Application Support", "Code", "User", "globalStorage", "saoudrizwan.claude-dev", "settings", "cline_mcp_settings.json"),
            linux: join(homedir(), ".config", "Code", "User", "globalStorage", "saoudrizwan.claude-dev", "settings", "cline_mcp_settings.json"),
        },
        mcpKey: "mcpServers",
        icon: "🤖"
    },
    "roo-cline": {
        name: "Roo Cline (VS Code)",
        paths: {
            win32: join(APPDATA, "Code", "User", "globalStorage", "rooveterinaryinc.roo-cline", "settings", "cline_mcp_settings.json"),
            darwin: join(homedir(), "Library", "Application Support", "Code", "User", "globalStorage", "rooveterinaryinc.roo-cline", "settings", "cline_mcp_settings.json"),
            linux: join(homedir(), ".config", "Code", "User", "globalStorage", "rooveterinaryinc.roo-cline", "settings", "cline_mcp_settings.json"),
        },
        mcpKey: "mcpServers",
        icon: "🦘"
    }
};
