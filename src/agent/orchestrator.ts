
import { streamText, generateText } from "ai";
import { getLiteModel, getHeavyModel, getLiteModelName, getHeavyModelName } from "../providers";
import { MCPRegistry } from "../mcp/registry";
import { runWorker, runWorkerSync } from "./worker";
import { ui } from "../cli/ui";
import { shellTools } from "../tools";

interface OrchestratorDecision {
    neededMcps: string[];
    reason: string;
    parallelTasks?: Array<{
        mcps: string[];
        subtask: string;
    }>;
}

export async function runOrchestrator(
    prompt: string,
    isHeavy: boolean = false,
    enableParallel: boolean = false
) {
    ui.header("TaskMaster");

    const registry = new MCPRegistry();
    const allServers = await registry.listAll();
    const serverNames = allServers.map(s => s.name);

    const model = isHeavy ? await getHeavyModel() : await getLiteModel();
    const modelName = isHeavy ? await getHeavyModelName() : await getLiteModelName();

    ui.section(`Orchestrator (${modelName})`);
    ui.info(`Analyzing: "${prompt.substring(0, 60)}${prompt.length > 60 ? "..." : ""}"`);


    const analysisPrompt = enableParallel ? `
User Request: "${prompt}"
Available MCP Servers: ${JSON.stringify(serverNames)}

Analyze this request. If it can be broken into independent parallel subtasks, do so.

Output ONLY a JSON object:
{
  "neededMcps": string[],
  "reason": string,
  "parallelTasks": [
    { "mcps": ["server1"], "subtask": "specific task description" }
  ]
}

If parallel execution is not beneficial, omit parallelTasks or set to empty array.
` : `
User Request: "${prompt}"
Available MCP Servers: ${JSON.stringify(serverNames)}

Decide which MCP servers are absolutely necessary to fulfill this request.
If no MCPs are needed (pure logic/math), return empty list.

Output ONLY a JSON object: { "neededMcps": string[], "reason": string }
`;

    let decision: OrchestratorDecision;

    try {
        const analysis = await generateText({
            model,
            prompt: analysisPrompt
        });

        const text = analysis.text.replace(/```json/g, "").replace(/```/g, "").trim();
        decision = JSON.parse(text);
    } catch (e) {
        ui.error("Failed to analyze request. Running directly...");
        await runWorker({ prompt, model: isHeavy ? "heavy" : "lite" });
        return;
    }

    ui.item("📋", `Plan: ${decision.reason}`);
    console.log();

    // Check for parallel execution
    if (enableParallel && decision.parallelTasks && decision.parallelTasks.length > 1) {
        ui.section("Parallel Execution");
        ui.info(`Spawning ${decision.parallelTasks.length} parallel workers...`);

        const tasks = decision.parallelTasks.map((task, i) => {
            ui.item(`🔹`, `Worker ${i + 1}: ${task.subtask.substring(0, 50)}...`);
            return runWorkerSync({
                prompt: task.subtask,
                mcp: task.mcps,
                model: isHeavy ? "heavy" : "lite",
                isSubagent: true
            });
        });

        console.log();
        const results = await Promise.all(tasks);

        ui.section("Combining Results");

        const combinePrompt = `
Original request: "${prompt}"

Results from parallel workers:
${results.map((r, i) => `Worker ${i + 1}: ${r}`).join("\n\n")}

Synthesize these results into a coherent final answer.
`;

        const stream = streamText({
            model,
            prompt: combinePrompt
        });

        for await (const chunk of stream.textStream) {
            ui.streamToken(chunk);
        }
        ui.streamEnd();

    } else {
        // Sequential execution with streaming
        ui.section("Executing");

        if (decision.neededMcps.length > 0) {
            ui.info(`Using MCPs: ${decision.neededMcps.join(", ")}`);
        } else {
            ui.info("No external tools needed");
        }
        console.log();

        await runWorker({
            prompt,
            mcp: decision.neededMcps,
            model: isHeavy ? "heavy" : "lite",
            isSubagent: false
        });
    }
}
