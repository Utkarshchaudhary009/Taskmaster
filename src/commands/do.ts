import { generateText } from 'ai';
import pc from 'picocolors';
import { getLightModel } from '../providers/zhipu';
import { getHeavyModel } from '../providers/gemini';
import { loadMCPClients } from '../mcp/loader';
import { loadMCPConfig } from '../config/store';

export async function doCommand(prompt: string, heavy: boolean): Promise<void> {
    if (!prompt) {
        console.log(pc.red('✖ No prompt provided'));
        console.log(pc.dim('Usage: tm do "your prompt here"'));
        process.exit(1);
    }

    try {
        // Select model based on mode
        const model = heavy ? await getHeavyModel() : await getLightModel();
        const modelName = heavy ? 'Gemini 3 Pro' : 'GLM-4-Flash';

        console.log(pc.dim(`\n⚡ ${modelName}\n`));

        // Load MCP tools
        const mcpConfig = await loadMCPConfig();
        const { clients, tools } = await loadMCPClients(mcpConfig);

        // Generate response
        const { text, toolCalls } = await generateText({
            model,
            tools,
            prompt,
        });

        // Display response
        console.log(text);

        // Show tool calls if any
        if (toolCalls && toolCalls.length > 0) {
            console.log(pc.dim(`\n🛠️  ${toolCalls.length} tool(s) used`));
        }

        // Cleanup MCP clients
        for (const client of clients.values()) {
            await client.close();
        }
    } catch (error) {
        if (error instanceof Error) {
            if (error.message.includes('API key')) {
                console.log(pc.red('\n✖ API key error'));
                console.log(pc.dim('Run: tm setup'));
            } else if (error.message.includes('Gemini CLI')) {
                console.log(pc.red('\n✖ Gemini CLI not configured'));
                console.log(pc.dim('Run: tm setup'));
            } else {
                throw error;
            }
        } else {
            throw error;
        }
    }
}
