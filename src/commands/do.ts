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

    let clients: Map<string, any> | undefined;

    try {
        // Select model based on mode
        const model = heavy ? await getHeavyModel() : await getLightModel();
        const modelName = heavy ? 'Gemini 3 Pro' : 'GLM-4-Flash';

        console.log(pc.dim(`\n⚡ ${modelName}\n`));

        // Load MCP tools
        const mcpConfig = await loadMCPConfig();
        const mcpResult = await loadMCPClients(mcpConfig);
        clients = mcpResult.clients;
        const tools = mcpResult.tools;

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
    } finally {
        // Cleanup MCP clients - always runs even if error occurs
        if (clients) {
            for (const client of clients.values()) {
                try {
                    await client.close();
                } catch (closeError) {
                    console.warn('Error closing MCP client:', closeError);
                }
            }
        }
    }
}
