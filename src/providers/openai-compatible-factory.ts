/**
 * OpenAI Compatible Provider Factory
 * Creates AI SDK providers using @ai-sdk/openai-compatible
 */

import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { ProviderConfig } from "../types";

// Cache for provider instances (singleton pattern)
const providerCache = new Map<string, ReturnType<typeof createOpenAICompatible>>();

/**
 * Create or retrieve a cached OpenAI-compatible provider instance
 */
export function getCompatibleProvider(config: ProviderConfig) {
    const cacheKey = config.name;

    if (providerCache.has(cacheKey)) {
        return providerCache.get(cacheKey)!;
    }

    const provider = createOpenAICompatible({
        name: config.name,
        baseURL: config.baseUrl,
        apiKey: config.apiKey || undefined,
        headers: config.apiKey ? undefined : {
            // Some local providers (Ollama) don't need auth headers
        },
    });

    providerCache.set(cacheKey, provider);
    return provider;
}

/**
 * Get a chat model from a provider
 */
export function getCompatibleModel(config: ProviderConfig, modelId: string) {
    const provider = getCompatibleProvider(config);
    return provider.chatModel(modelId);
}

/**
 * Clear the provider cache (useful for testing or config changes)
 */
export function clearProviderCache() {
    providerCache.clear();
}

/**
 * Check if a model is available from a provider
 * This is a simple validation - we just check if the model ID is in the config
 */
export function isModelAvailable(config: ProviderConfig, modelId: string): boolean {
    return config.models.includes(modelId);
}
