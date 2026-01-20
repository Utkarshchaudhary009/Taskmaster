import { zhipu } from 'zhipu-ai-provider';
import { loadConfig } from '../config/store';

export async function getLightModel() {
    const config = await loadConfig();
    if (!config?.zhipuApiKey) {
        throw new Error('Zhipu API key not configured. Run: tm setup');
    }

    return zhipu('glm-4.5-flash', {
        apiKey: config.zhipuApiKey,
        baseURL: 'https://api.z.ai/api/paas/v4',
    });
}
