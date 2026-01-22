
import { streamText, generateText } from "ai";
import { getLiteModel, getHeavyModel, getLiteModelName, getHeavyModelName } from "../providers";
import { loadMcpTools } from "../mcp/loader";
import { ui } from "../cli/ui";
import { shellTools } from "../tools";
import type { TaskArgs } from "../types";

export async function runWorker(config: TaskArgs): Promise<string> {
    const mcpTools = await loadMcpTools(config.mcp);

    // Merge MCP tools with shell tools
    const tools = {
        ...mcpTools,
        ...shellTools,
    };

    const model = config.model === "heavy" ? await getHeavyModel() : await getLiteModel();
    const modelName = config.model === "heavy" ? await getHeavyModelName() : await getLiteModelName();

    if (!config.isSubagent) {
        ui.section(`Worker (${modelName})`);
        if (config.mcp?.length) {
            ui.info(`Tools: ${config.mcp.join(", ")}`);
        }
        ui.info("Shell tools enabled");
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
    const mcpTools = await loadMcpTools(config.mcp);
    const tools = { ...mcpTools, ...shellTools };
    const model = config.model === "heavy" ? await getHeavyModel() : await getLiteModel();

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

