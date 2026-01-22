#!/usr/bin/env bun
import { parseArgs } from "util";
import { runOrchestrator } from "./agent/orchestrator";
import { runWorker } from "./agent/worker";
import { handleMcpCommand } from "./commands/mcp";
import { handleGitCommand, handleGitHubCommand } from "./commands/git";
import { handleProviderCommand } from "./commands/providers";
import { handleSettingsCommand } from "./commands/settings";
import { runSetupTour } from "./commands/setup";
import { TokenStorage } from "./mcp/token-storage";
import { ui } from "./cli/ui";

function printHelp() {
    ui.banner();

    ui.section("Usage");
    ui.item("📝", "tm <prompt>", "Run orchestrator (auto-detects tools)");
    ui.item("🔧", "tm run --mcp=<names> <prompt>", "Run worker with specific MCPs");
    ui.item("📋", "tm mcp list", "List available MCP servers");
    ui.item("🔄", "tm mcp sync", "Sync MCPs from installed IDEs");
    ui.item("🔐", "tm mcp auth <name>", "Authenticate an MCP server");
    ui.item("⚙️", "tm setup", "Run interactive setup tour");

    console.log();
    ui.section("Provider & Model Management");
    ui.item("📦", "tm providers list", "List all AI providers");
    ui.item("➕", "tm providers add", "Add custom provider (Ollama, Groq)");
    ui.item("🗑️", "tm providers delete <name>", "Remove a provider");
    ui.item("⚡", "tm settings", "View/change model settings");
    ui.item("⚡", "tm settings lite <provider> <model>", "Set lite model");
    ui.item("🧠", "tm settings heavy <provider> <model>", "Set heavy model");

    console.log();
    ui.section("Specialist Agents");
    ui.item("🔀", "tm git <prompt>", "Git CLI specialist");
    ui.item("🐙", "tm gh <prompt>", "GitHub specialist");

    console.log();
    ui.section("Options");
    ui.item("--mcp=<names>", "Comma-separated list of MCP servers");
    ui.item("-h, --heavy", "Use heavy model (Gemini Pro)");
    ui.item("--parallel", "Enable parallel sub-agents");
    ui.item("--execute", "Execute suggested commands (git agent)");
    ui.item("--help", "Show this help message");

    console.log();
    ui.section("Examples");
    console.log(`  ${ui.dim("$")} tm "what's the weather in Tokyo?"`);
    console.log(`  ${ui.dim("$")} tm run --mcp=github "list my repos"`);
    console.log(`  ${ui.dim("$")} tm git "undo last commit"`);
    console.log(`  ${ui.dim("$")} tm gh "list my open PRs"`);
    console.log(`  ${ui.dim("$")} tm --heavy --parallel "complex analysis"`);
    console.log();
}

async function main() {
    // 0. Load cached credentials silently
    try {
        const storage = new TokenStorage();
        const zhipu = await storage.get("zhipu");
        if (zhipu?.apiKey) {
            process.env["ZHIPU_API_KEY"] = zhipu.apiKey;
        }
    } catch {
        // Silently continue
    }

    const { values, positionals } = parseArgs({
        args: Bun.argv,
        options: {
            mcp: { type: "string" },
            heavy: { type: "boolean", short: "h" },
            parallel: { type: "boolean" },
            execute: { type: "boolean" },
            help: { type: "boolean" },
        },
        strict: false,
        allowPositionals: true,
    });

    const args = positionals.slice(2);
    const command = args[0];

    // Check help
    if (values.help || args.length === 0) {
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
        const subcommand = args[1] || "";
        const rest = args.slice(2);
        await handleMcpCommand(subcommand, rest);
        return;
    }

    // 3. Git Specialist Agent
    if (command === "git") {
        await handleGitCommand(args.slice(1), {
            heavy: !!values.heavy,
            execute: !!values.execute
        });
        return;
    }

    // 4. GitHub Specialist Agent
    if (command === "gh") {
        await handleGitHubCommand(args.slice(1), {
            heavy: !!values.heavy,
            mcp: !!values.mcp
        });
        return;
    }

    // 5. Provider Management Commands
    if (command === "providers" || command === "provider") {
        const subcommand = args[1] || "list";
        const rest = args.slice(2);
        await handleProviderCommand(subcommand, rest);
        return;
    }

    // 6. Settings Commands
    if (command === "settings" || command === "config") {
        const subcommand = args[1] || "";
        const rest = args.slice(2);
        await handleSettingsCommand(subcommand, rest);
        return;
    }

    // 7. Subagent Worker Mode
    if (command === "run" && typeof values.mcp === "string") {
        const prompt = args.slice(1).join(" ");
        if (!prompt) {
            ui.error("Worker mode requires a prompt.");
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

    // 6. Orchestrator Mode (Default)
    const prompt = args.join(" ");
    await runOrchestrator(prompt, !!values.heavy, !!values.parallel);
}

main().catch((e) => {
    ui.error(`Fatal error: ${e.message}`);
    process.exit(1);
});
