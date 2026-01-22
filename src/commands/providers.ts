/**
 * Provider Management CLI Commands
 * tm providers list | add | delete
 */

import { providerRegistry } from "../providers/provider-registry";
import { ui } from "../cli/ui";
import type { ProviderConfig } from "../types";

export async function handleProviderCommand(subcommand: string, args: string[]) {
    switch (subcommand) {
        case "list":
            await listProviders();
            break;

        case "add":
            await addProvider();
            break;

        case "delete":
        case "remove":
            const [name] = args;
            if (!name) {
                ui.error("Usage: tm providers delete <provider-name>");
                return;
            }
            await deleteProvider(name);
            break;

        default:
            ui.error(`Unknown subcommand: ${subcommand}`);
            ui.info("Available commands: list, add, delete");
    }
}

async function listProviders() {
    ui.header("AI Providers");

    // Built-in providers
    ui.info("Built-in Providers:");
    ui.item("🟢", ui.bold("gemini"), ui.dim("(Gemini CLI OAuth - requires 'gemini' auth)"));
    ui.item("🟢", ui.bold("zhipu"), ui.dim("(ZhiPu API - uses ZHIPU_API_KEY env)"));
    console.log();

    // Custom providers
    const providers = await providerRegistry.list();

    if (providers.length === 0) {
        ui.info("Custom Providers: None");
        ui.dim("  Run 'tm providers add' to add a custom provider (Ollama, Groq, etc.)");
    } else {
        ui.info(`Custom Providers (${providers.length}):`);
        for (const p of providers) {
            const models = p.models.join(", ");
            const hasKey = p.apiKey ? "🔑" : "🔓";
            ui.item(hasKey, ui.bold(p.name), ui.dim(`${p.baseUrl} [${models}]`));
        }
    }
    console.log();

    // Current settings
    const settings = await providerRegistry.getSettings();
    ui.info("Current Model Settings:");
    ui.item("⚡", `Lite Model: ${ui.cyan(`${settings.liteModel.provider}/${settings.liteModel.model}`)}`);
    ui.item("🧠", `Heavy Model: ${ui.cyan(`${settings.heavyModel.provider}/${settings.heavyModel.model}`)}`);
    console.log();
}

async function addProvider() {
    ui.header("Add Custom Provider");
    ui.info("Add an OpenAI-compatible provider (Ollama, Groq, LM Studio, etc.)");
    console.log();

    // Collect provider info
    const name = await ui.ask("Provider name (e.g., ollama, groq):");
    if (!name.trim()) {
        ui.error("Provider name is required");
        return;
    }

    // Check if exists
    if (await providerRegistry.exists(name)) {
        const overwrite = await ui.ask(`Provider '${name}' already exists. Overwrite? (y/N):`);
        if (overwrite.toLowerCase() !== "y") {
            ui.info("Cancelled");
            return;
        }
    }

    const baseUrl = await ui.ask("Base URL (e.g., http://localhost:11434/v1):");
    if (!baseUrl.trim()) {
        ui.error("Base URL is required");
        return;
    }

    const apiKey = await ui.ask("API Key (leave empty if not needed):");

    const modelsStr = await ui.ask("Models (comma-separated, e.g., llama3,mistral,codellama):");
    if (!modelsStr.trim()) {
        ui.error("At least one model is required");
        return;
    }

    const models = modelsStr.split(",").map(m => m.trim()).filter(Boolean);

    // Create provider config
    const config: ProviderConfig = {
        name: name.trim(),
        baseUrl: baseUrl.trim(),
        apiKey: apiKey.trim(),
        models,
        createdAt: new Date().toISOString(),
    };

    await providerRegistry.add(config);
    ui.success(`Provider '${name}' added successfully!`);
    ui.info(`You can now use it with: tm settings lite ${name} ${models[0]}`);
}

async function deleteProvider(name: string) {
    const exists = await providerRegistry.exists(name);

    if (!exists) {
        ui.error(`Provider '${name}' not found`);
        return;
    }

    const confirm = await ui.ask(`Delete provider '${name}'? This cannot be undone. (y/N):`);
    if (confirm.toLowerCase() !== "y") {
        ui.info("Cancelled");
        return;
    }

    await providerRegistry.delete(name);
    ui.success(`Provider '${name}' deleted`);
}
