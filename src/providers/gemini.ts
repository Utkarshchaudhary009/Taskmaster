import { createGeminiProvider } from 'ai-sdk-provider-gemini-cli';
import { loadConfig } from '../config/store';

export async function getHeavyModel() {
    const config = await loadConfig();
    if (!config?.geminiCliConfigured) {
        throw new Error('Gemini CLI not configured. Run: tm setup');
    }

    const gemini = createGeminiProvider({ authType: 'oauth-personal' });

    return gemini('gemini-3-pro-preview', {
        thinkingConfig: {
            thinkingLevel: 'high',
        },
    });
}
