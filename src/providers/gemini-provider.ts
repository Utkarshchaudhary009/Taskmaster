
import { createGeminiProvider } from 'ai-sdk-provider-gemini-cli';

// Heavy model for complex reasoning and orchestration
// Supports "thinking" if enabled, good for planning
export function getHeavyModel() {
    // Initialize provider with OAuth (User must run `gemini` to auth first)
    const gemini = createGeminiProvider({ authType: 'oauth-personal' });
    return gemini('gemini-3-pro-preview');
}
