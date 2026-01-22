/**
 * Permission Manager for Shell Command Execution
 * Implements 4-tier permission model: session, always, once, denied
 */

import { join } from "path";
import { homedir } from "os";
import { ui } from "../cli/ui";
import type { PermissionDecision, PermissionsConfig, SessionPermissions, GlobalConfig } from "../types";

export class PermissionManager {
    private configPath: string;
    private session: SessionPermissions;

    constructor() {
        this.configPath = join(homedir(), ".taskmaster", "config.json");
        this.session = {
            sessionAllow: new Set<string>(),
            sessionDeny: new Set<string>(),
        };
    }

    /**
     * Check if command is allowed to execute
     * Returns true if allowed, false if denied
     * If undecided, prompts user and returns their choice
     */
    async checkPermission(command: string): Promise<boolean> {
        const normalized = this.normalizeCommand(command);

        // 1. Check session permissions (in-memory)
        if (this.session.sessionAllow.has(normalized)) {
            return true;
        }
        if (this.session.sessionDeny.has(normalized)) {
            return false;
        }

        // 2. Check persistent permissions
        const config = await this.loadPermissions();

        if (config.alwaysAllow.some(pattern => this.matchPattern(normalized, pattern))) {
            return true;
        }
        if (config.alwaysDeny.some(pattern => this.matchPattern(normalized, pattern))) {
            return false;
        }

        // 3. Prompt user for decision
        return this.promptUser(command, normalized);
    }

    /**
     * Prompt user for permission decision
     */
    private async promptUser(command: string, normalized: string): Promise<boolean> {
        console.log();
        ui.warning("Shell command requires permission:");
        console.log(`  ${ui.cyan(command)}`);
        console.log();
        console.log(`  ${ui.dim("[s]")} Allow for this ${ui.bold("session")} only`);
        console.log(`  ${ui.dim("[a]")} ${ui.bold("Always")} allow this command`);
        console.log(`  ${ui.dim("[o]")} Allow ${ui.bold("once")} (this time only)`);
        console.log(`  ${ui.dim("[d]")} ${ui.bold("Deny")} this command`);
        console.log(`  ${ui.dim("[n]")} ${ui.bold("Never")} allow (always deny)`);
        console.log();

        const answer = await ui.ask("Your choice [s/a/o/d/n]:");
        const choice = answer.toLowerCase().trim();

        switch (choice) {
            case "s":
            case "session":
                this.session.sessionAllow.add(normalized);
                ui.success("Allowed for this session");
                return true;

            case "a":
            case "always":
                await this.addPersistentPermission(normalized, "allow");
                ui.success("Always allowed (saved)");
                return true;

            case "o":
            case "once":
                ui.info("Allowed once");
                return true;

            case "d":
            case "deny":
                this.session.sessionDeny.add(normalized);
                ui.warning("Denied for this session");
                return false;

            case "n":
            case "never":
                await this.addPersistentPermission(normalized, "deny");
                ui.warning("Always denied (saved)");
                return false;

            default:
                ui.error("Invalid choice, denying by default");
                return false;
        }
    }

    /**
     * Normalize command for pattern matching
     * Extracts the base command (e.g., "git" from "git status")
     */
    private normalizeCommand(command: string): string {
        // Get the first word (the actual command)
        const parts = command.trim().split(/\s+/);
        return parts[0] || command;
    }

    /**
     * Match command against a pattern
     * Supports exact match and wildcard prefix (e.g., "git*" matches "git", "git-lfs")
     */
    private matchPattern(command: string, pattern: string): boolean {
        if (pattern.endsWith("*")) {
            const prefix = pattern.slice(0, -1);
            return command.startsWith(prefix);
        }
        return command === pattern;
    }

    /**
     * Load persistent permissions from config
     */
    private async loadPermissions(): Promise<PermissionsConfig> {
        try {
            const file = Bun.file(this.configPath);
            if (!(await file.exists())) {
                return { alwaysAllow: [], alwaysDeny: [] };
            }
            const config: GlobalConfig = await file.json();
            return config.permissions || { alwaysAllow: [], alwaysDeny: [] };
        } catch {
            return { alwaysAllow: [], alwaysDeny: [] };
        }
    }

    /**
     * Add a persistent permission rule
     */
    private async addPersistentPermission(command: string, type: "allow" | "deny"): Promise<void> {
        try {
            const file = Bun.file(this.configPath);
            let config: GlobalConfig = { mcpRegistry: {}, providers: {}, settings: { liteModel: { provider: "zhipu", model: "glm-4.7-flash" }, heavyModel: { provider: "gemini", model: "gemini-3-pro-preview" } }, permissions: { alwaysAllow: [], alwaysDeny: [] } };

            if (await file.exists()) {
                config = await file.json();
            }

            if (!config.permissions) {
                config.permissions = { alwaysAllow: [], alwaysDeny: [] };
            }

            if (type === "allow") {
                if (!config.permissions.alwaysAllow.includes(command)) {
                    config.permissions.alwaysAllow.push(command);
                }
            } else {
                if (!config.permissions.alwaysDeny.includes(command)) {
                    config.permissions.alwaysDeny.push(command);
                }
            }

            // Ensure directory exists
            const dir = join(homedir(), ".taskmaster");
            const { mkdirSync } = await import("fs");
            try {
                mkdirSync(dir, { recursive: true });
            } catch {
                // Directory may already exist
            }

            await Bun.write(this.configPath, JSON.stringify(config, null, 2));
        } catch (e) {
            ui.error(`Failed to save permission: ${e}`);
        }
    }

    /**
     * Check if a command matches dangerous patterns
     */
    isDangerous(command: string): boolean {
        const dangerousPatterns = [
            /^sudo\s/i,
            /rm\s+(-rf?|--recursive)\s+[\/~]/i,
            /rm\s+-rf?\s*$/i,
            /mkfs\./i,
            /dd\s+if=/i,
            />\s*\/dev\/sd/i,
            /chmod\s+777\s+\//i,
            /curl.*\|\s*(ba)?sh/i,
            /wget.*\|\s*(ba)?sh/i,
            /format\s+[cC]:/i,
            /del\s+\/[sS]\s+\/[qQ]/i,
            /rd\s+\/[sS]\s+\/[qQ]/i,
        ];

        return dangerousPatterns.some(pattern => pattern.test(command));
    }

    /**
     * Reset session permissions
     */
    resetSession(): void {
        this.session.sessionAllow.clear();
        this.session.sessionDeny.clear();
    }
}

export const permissionManager = new PermissionManager();
