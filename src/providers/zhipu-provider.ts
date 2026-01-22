
import { zhipu } from 'zhipu-ai-provider';

// Lite model for speed-critical subagent tasks
// Uses GLM-4.7-Flash for low latency
export function getLiteModel() {
    return zhipu('glm-4.7-flash');
}
