
import { generateText } from "ai";
import { getLiteModel } from "../providers/zhipu-provider";
import { getHeavyModel } from "../providers/gemini-provider";
import { loadMcpTools } from "../mcp/loader";
import type { TaskArgs } from "../types";

export async function runWorker(config: TaskArgs) {
    // Load ONLY requested MCPs
    const tools = await loadMcpTools(config.mcp);

    // Worker always uses Lite model
    const model = getLiteModel();
    const modelName = "Zhipu Lite";

    console.log(`👷 Worker started (${modelName})`);
    if (config.mcp?.length) {
        console.log(`   Tools loaded from: ${config.mcp.join(", ")}`);
    }

    try {
        const result = await generateText({
            model,
            tools,
            prompt: config.prompt,
            maxSteps: 10, // Multi-step capability
            onStepFinish: (step) => {
                if (step.toolCalls.length > 0) {
                    console.log(`   🛠️  ${step.toolCalls.map(t => t.toolName).join(", ")}`);
                }
            }
        });

        console.log("\n" + result.text);
    } catch (e) {
        console.error("\n❌ Worker failed:", e);
    }
}
