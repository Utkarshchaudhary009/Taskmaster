
import { generateText } from "ai";
import { getHeavyModel } from "../providers/gemini-provider";
import { getLiteModel } from "../providers/zhipu-provider";
import { MCPRegistry } from "../mcp/registry";

export async function runOrchestrator(prompt: string, isHeavy: boolean = false) {
    const registry = new MCPRegistry();
    const allServers = await registry.listAll();

    // 1. Analyze Request
    const model = isHeavy ? getHeavyModel() : getLiteModel();
    const modelName = isHeavy ? "Gemini Heavy" : "Zhipu Lite";
    console.log(`🧠 Admin Agent (${modelName}) analyzing: "${prompt}"...`);

    const analysis = await generateText({
        model: model,
        prompt: `
      User Request: "${prompt}"
      Available MCP Servers: ${JSON.stringify(allServers.map(s => s.name))}
      
      Decide which MCP servers are absolutely necessary to fulfill this request.
      If no MCPs are needed (pure logic/math), return empty list.
      
      Output ONLY a JSON object: { "neededMcps": string[], "reason": string }
    `
    });

    let decision;
    try {
        // Basic cleanup of potential markdown code blocks
        const text = analysis.text.replace(/```json/g, "").replace(/```/g, "").trim();
        decision = JSON.parse(text);
    } catch (e) {
        console.error("Failed to parse orchestrator decision:", analysis.text);
        return;
    }

    // 2. Spawn Subagent (The "Worker")
    const mcpFlag = decision.neededMcps.join(",");
    console.log(`🤖 Spawning Worker with MCPs: [${mcpFlag || "NONE"}]`);
    console.log(`   Reason: ${decision.reason}`);

    const args = ["run"];
    if (mcpFlag) {
        args.push(`--mcp=${mcpFlag}`);
    }
    args.push(prompt);

    // Spawn self as worker
    const proc = Bun.spawn([process.argv[0], process.argv[1], ...args], {
        stdio: ["inherit", "inherit", "inherit"]
    });

    await proc.exited;
}
