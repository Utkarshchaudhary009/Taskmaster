/**
 * Settings Management CLI Commands
 * tm settings | tm settings lite <provider> <model> | tm settings heavy <provider> <model>
 */

import { providerRegistry } from "../providers/provider-registry";
import { ui } from "../cli/ui";

export async function handleSettingsCommand(subcommand: string, args: string[]) {
    switch (subcommand) {
        case "lite":
            await setLiteModel(args);
            break;

        case "heavy":
            await setHeavyModel(args);
            break;

        case "":
        case undefined:
            await showSettings();
            break;

        default:
            ui.error(`Unknown subcommand: ${subcommand}`);
            ui.info("Usage: tm settings [lite|heavy] [provider] [model]");
    }
}

async function showSettings() {
    ui.header("TaskMaster Settings");

    const settings = await providerRegistry.getSettings();

    ui.section("Model Configuration");

    console.log(`  ${ui.bold("Lite Model")} ${ui.dim("(fast, for subagents)")}`);
    console.log(`    Provider: ${ui.cyan(settings.liteModel.provider)}`);
    console.log(`    Model:    ${ui.cyan(settings.liteModel.model)}`);
    console.log();

    console.log(`  ${ui.bold("Heavy Model")} ${ui.dim("(powerful, for orchestration)")}`);
    console.log(`    Provider: ${ui.cyan(settings.heavyModel.provider)}`);
    console.log(`    Model:    ${ui.cyan(settings.heavyModel.model)}`);
    console.log();

    ui.section("Available Providers");

    // Built-in
    console.log(`  ${ui.dim("Built-in:")} gemini, zhipu`);

    // Custom
    const custom = await providerRegistry.listNames();
    if (custom.length > 0) {
        console.log(`  ${ui.dim("Custom:")} ${custom.join(", ")}`);
    }
    console.log();

    ui.info("To change models:");
    console.log(`  ${ui.dim("$")} tm settings lite <provider> <model>`);
    console.log(`  ${ui.dim("$")} tm settings heavy <provider> <model>`);
    console.log();
}

async function setLiteModel(args: string[]) {
    const [provider, model] = args;

    if (!provider || !model) {
        ui.error("Usage: tm settings lite <provider> <model>");
        ui.info("Example: tm settings lite ollama llama3");
        return;
    }

    // Validate provider exists
    const isBuiltIn = provider === "gemini" || provider === "zhipu";
    const customProvider = await providerRegistry.get(provider);

    if (!isBuiltIn && !customProvider) {
        ui.error(`Provider '${provider}' not found`);
        ui.info("Run 'tm providers list' to see available providers");
        ui.info("Run 'tm providers add' to add a new provider");
        return;
    }

    // Validate model exists for custom provider
    if (customProvider && !customProvider.models.includes(model)) {
        ui.warning(`Model '${model}' not in provider's model list: ${customProvider.models.join(", ")}`);
        const confirm = await ui.ask("Continue anyway? (y/N):");
        if (confirm.toLowerCase() !== "y") {
            ui.info("Cancelled");
            return;
        }
    }

    await providerRegistry.setLiteModel(provider, model);
    ui.success(`Lite model set to ${ui.cyan(`${provider}/${model}`)}`);
}

async function setHeavyModel(args: string[]) {
    const [provider, model] = args;

    if (!provider || !model) {
        ui.error("Usage: tm settings heavy <provider> <model>");
        ui.info("Example: tm settings heavy gemini gemini-3-pro-preview");
        return;
    }

    // Validate provider exists
    const isBuiltIn = provider === "gemini" || provider === "zhipu";
    const customProvider = await providerRegistry.get(provider);

    if (!isBuiltIn && !customProvider) {
        ui.error(`Provider '${provider}' not found`);
        ui.info("Run 'tm providers list' to see available providers");
        ui.info("Run 'tm providers add' to add a new provider");
        return;
    }

    // Validate model exists for custom provider
    if (customProvider && !customProvider.models.includes(model)) {
        ui.warning(`Model '${model}' not in provider's model list: ${customProvider.models.join(", ")}`);
        const confirm = await ui.ask("Continue anyway? (y/N):");
        if (confirm.toLowerCase() !== "y") {
            ui.info("Cancelled");
            return;
        }
    }

    await providerRegistry.setHeavyModel(provider, model);
    ui.success(`Heavy model set to ${ui.cyan(`${provider}/${model}`)}`);
}
