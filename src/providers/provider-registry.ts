/**
 * Provider Registry
 * Manages custom AI providers in ~/.taskmaster/config.json
 */

import { join } from "path";
import { homedir } from "os";
import type { GlobalConfig, ProviderConfig, ModelReference, SettingsConfig } from "../types";

const DEFAULT_SETTINGS: SettingsConfig = {
    liteModel: { provider: "zhipu", model: "glm-4.7-flash" },
    heavyModel: { provider: "gemini", model: "gemini-3-pro-preview" },
};

export class ProviderRegistry {
    private configPath: string;

    constructor() {
        this.configPath = join(homedir(), ".taskmaster", "config.json");
    }

    /**
     * List all registered providers
     */
    async list(): Promise<ProviderConfig[]> {
        const config = await this.loadConfig();
        return Object.values(config.providers || {});
    }

    /**
     * Get a specific provider by name
     */
    async get(name: string): Promise<ProviderConfig | null> {
        const config = await this.loadConfig();
        return config.providers?.[name] || null;
    }

    /**
     * Add or update a provider
     */
    async add(provider: ProviderConfig): Promise<void> {
        const config = await this.loadConfig();

        if (!config.providers) {
            config.providers = {};
        }

        config.providers[provider.name] = provider;
        await this.saveConfig(config);
    }

    /**
     * Delete a provider
     */
    async delete(name: string): Promise<boolean> {
        const config = await this.loadConfig();

        if (!config.providers?.[name]) {
            return false;
        }

        delete config.providers[name];
        await this.saveConfig(config);
        return true;
    }

    /**
     * Get current model settings
     */
    async getSettings(): Promise<SettingsConfig> {
        const config = await this.loadConfig();
        return config.settings || DEFAULT_SETTINGS;
    }

    /**
     * Update model settings
     */
    async setLiteModel(provider: string, model: string): Promise<void> {
        const config = await this.loadConfig();

        if (!config.settings) {
            config.settings = { ...DEFAULT_SETTINGS };
        }

        config.settings.liteModel = { provider, model };
        await this.saveConfig(config);
    }

    /**
     * Update heavy model settings
     */
    async setHeavyModel(provider: string, model: string): Promise<void> {
        const config = await this.loadConfig();

        if (!config.settings) {
            config.settings = { ...DEFAULT_SETTINGS };
        }

        config.settings.heavyModel = { provider, model };
        await this.saveConfig(config);
    }

    /**
     * Check if a provider exists
     */
    async exists(name: string): Promise<boolean> {
        const provider = await this.get(name);
        return provider !== null;
    }

    /**
     * Get all provider names
     */
    async listNames(): Promise<string[]> {
        const providers = await this.list();
        return providers.map(p => p.name);
    }

    /**
     * Load full config
     */
    async loadConfig(): Promise<GlobalConfig> {
        try {
            const file = Bun.file(this.configPath);
            if (!(await file.exists())) {
                return {
                    mcpRegistry: {},
                    providers: {},
                    settings: DEFAULT_SETTINGS,
                    permissions: { alwaysAllow: [], alwaysDeny: [] }
                };
            }
            const config = await file.json();
            return {
                mcpRegistry: config.mcpRegistry || {},
                providers: config.providers || {},
                settings: config.settings || DEFAULT_SETTINGS,
                permissions: config.permissions || { alwaysAllow: [], alwaysDeny: [] },
            };
        } catch (e) {
            console.error("Failed to load config:", e);
            return {
                mcpRegistry: {},
                providers: {},
                settings: DEFAULT_SETTINGS,
                permissions: { alwaysAllow: [], alwaysDeny: [] }
            };
        }
    }

    /**
     * Save config to disk
     */
    private async saveConfig(config: GlobalConfig): Promise<void> {
        try {
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
            console.error("Failed to save config:", e);
            throw e;
        }
    }
}

export const providerRegistry = new ProviderRegistry();
