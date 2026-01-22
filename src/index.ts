#!/usr/bin/env bun
import { parseArgs } from "util";
import { runOrchestrator } from "./agent/orchestrator";
import { runWorker } from "./agent/worker";
import { handleMcpCommand } from "./commands/mcp";
import { runSetupTour } from "./commands/setup";
import { TokenStorage } from "./mcp/token-storage";

// Helper to print help
function printHelp() {
    console.log(`
TaskMaster CLI 🚀
High-performance Agentic CLI

Usage:
  tm <prompt>                 Run orchestrator (auto-detects tools)
  tm run --mcp=<names> <ask>  Run worker with specific MCPs
  tm mcp list                 List available MCPs
  tm mcp sync                 Sync MCPs from IDEs
  tm mcp auth <name>          Authenticate an MCP
  tm setup                    Run setup tour

Options:
  --mcp=<names>   Comma-separated list of MCP servers to load
  -h, --heavy     Use heavy model (gemini-3-pro)
  --help          Show this help message
`);
}

async function main() {
    // 0. Load cached credentials
    try {
        const storage = new TokenStorage();
        const zhipu = await storage.get("zhipu");
        if (zhipu?.apiKey) {
            process.env.ZHIPU_API_KEY = zhipu.apiKey;
            console.log("Loaded cached credentials.");
        }
    } catch (e) {
        console.error("Failed to load cached credentials:", e);
    }

    const { values, positionals } = parseArgs({
        args: Bun.argv,
        options: {
            mcp: { type: "string" },
            heavy: { type: "boolean", short: "h" },
            help: { type: "boolean" },
        },
        strict: false,
        allowPositionals: true,
    });

    const args = positionals.slice(2); // Skip bun binary and script path
    const command = args[0]; // First actual argument

    // Check help
    if (values.help) {
        printHelp();
        return;
    }

    // 1. Setup Command
    if (command === "setup") {
        await runSetupTour();
        return;
    }

    // 2. MCP Management Commands
    if (command === "mcp") {
        const subcommand = args[1];
        const rest = args.slice(2);
        await handleMcpCommand(subcommand, rest);
        return;
    }

    // 3. Subagent Worker Mode (Has specific MCPs)
    // Usage: tm run --mcp=vercel "do something"
    if (command === "run" && values.mcp) {
        const prompt = args.slice(1).join(" ");
        if (!prompt) {
            console.error("Error: Worker mode requires a prompt.");
            process.exit(1);
        }

        await runWorker({
            prompt,
            mcp: values.mcp.split(","),
            model: values.heavy ? "heavy" : "lite",
            isSubagent: true
        });
        return;
    }

    // 4. Orchestrator Mode (Default)
    // Usage: tm "check my vercel"
    const prompt = args.join(" ");
    if (!prompt) {
        printHelp(); // No args = show help
        return;
    }

    await runOrchestrator(prompt, values.heavy);
}

main().catch(console.error);
