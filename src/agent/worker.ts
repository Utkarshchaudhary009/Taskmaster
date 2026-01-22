
import { streamText, generateText } from "ai";
import { getLiteModel } from "../providers/zhipu-provider";
import { getHeavyModel } from "../providers/gemini-provider";
import { loadMcpTools } from "../mcp/loader";
import { ui } from "../cli/ui";
import type { TaskArgs } from "../types";

export async function runWorker(config: TaskArgs): Promise<string> {
    const tools = await loadMcpTools(config.mcp);

    const model = config.model === "heavy" ? getHeavyModel() : getLiteModel();
    const modelName = config.model === "heavy" ? "Gemini Pro" : "GLM Flash";

    if (!config.isSubagent) {
        ui.section(`Worker (${modelName})`);
        if (config.mcp?.length) {
            ui.info(`Tools: ${config.mcp.join(", ")}`);
        }
    }

    try {
        const stream = streamText({
            model,
            tools,
            prompt: config.prompt,
            maxSteps: 10 as any,
            onStepFinish: (step: any) => {
                if (step.toolCalls?.length > 0) {
                    const toolNames = step.toolCalls.map((t: any) => t.toolName).join(", ");
                    ui.item("🛠️", ui.cyan(toolNames));
                }
            }
        });

        let fullText = "";

        if (!config.isSubagent) {
            console.log();
        }

        for await (const chunk of stream.textStream) {
            if (!config.isSubagent) {
                ui.streamToken(chunk);
            }
            fullText += chunk;
        }

        if (!config.isSubagent) {
            ui.streamEnd();
        }

        return fullText;
    } catch (e: any) {
        ui.error(`Worker failed: ${e.message}`);
        return "";
    }
}

export async function runWorkerSync(config: TaskArgs): Promise<string> {
    const tools = await loadMcpTools(config.mcp);
    const model = config.model === "heavy" ? getHeavyModel() : getLiteModel();

    try {
        const result = await generateText({
            model,
            tools,
            prompt: config.prompt,
            maxSteps: 10 as any,
        });
        return result.text;
    } catch (e: any) {
        return `Error: ${e.message}`;
    }
}
