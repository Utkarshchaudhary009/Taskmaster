/**
 * Provider Module
 * Unified model access with registry-based selection
 */

import { createGeminiProvider } from 'ai-sdk-provider-gemini-cli';
import { zhipu } from 'zhipu-ai-provider';
import { providerRegistry } from './provider-registry';
import { getCompatibleModel } from './openai-compatible-factory';
import type { ModelReference, ProviderConfig } from '../types';

// Built-in providers (always available)
const BUILTIN_PROVIDERS = {
    gemini: () => {
        const gemini = createGeminiProvider({ authType: 'oauth-personal' });
        return (modelId: string) => gemini(modelId);
    },
    zhipu: () => {
        return (modelId: string) => zhipu(modelId);
    },
};

/**
 * Get a model by reference (provider + model ID)
 */
export async function getModel(ref: ModelReference) {
    const { provider, model } = ref;

    // 1. Check built-in providers first
    if (provider in BUILTIN_PROVIDERS) {
        const factory = BUILTIN_PROVIDERS[provider as keyof typeof BUILTIN_PROVIDERS];
        return factory()(model);
    }

    // 2. Check custom providers from registry
    const customProvider = await providerRegistry.get(provider);
    if (customProvider) {
        return getCompatibleModel(customProvider, model);
    }

    throw new Error(`Unknown provider: ${provider}. Run 'tm providers list' to see available providers.`);
}

/**
 * Get the configured lite model (fast, for subagents)
 */
export async function getLiteModel() {
    const settings = await providerRegistry.getSettings();
    return getModel(settings.liteModel);
}

/**
 * Get the configured heavy model (powerful, for orchestration)
 */
export async function getHeavyModel() {
    const settings = await providerRegistry.getSettings();
    return getModel(settings.heavyModel);
}

/**
 * Get model display name
 */
export async function getLiteModelName(): Promise<string> {
    const settings = await providerRegistry.getSettings();
    return `${settings.liteModel.provider}/${settings.liteModel.model}`;
}

export async function getHeavyModelName(): Promise<string> {
    const settings = await providerRegistry.getSettings();
    return `${settings.heavyModel.provider}/${settings.heavyModel.model}`;
}

// Re-export for backward compatibility
export { providerRegistry } from './provider-registry';
export { getCompatibleProvider, getCompatibleModel } from './openai-compatible-factory';
