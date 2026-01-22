
import { streamText } from "ai";
import { getLiteModel, getHeavyModel } from "../../providers";
import { loadMcpTools } from "../../mcp/loader";
import { ui } from "../../cli/ui";

const GITHUB_SYSTEM_PROMPT = `You are a GitHub CLI specialist. You help users interact with GitHub.

You have expertise in:
- Repository operations (create, fork, clone, view)
- Issues and Pull Requests (create, list, view, merge, review)
- Workflows and Actions (list, run, view logs)
- Releases and tags
- Gists
- GitHub API interactions

When helping users:
1. Use the available GitHub MCP tools when possible
2. Suggest gh CLI commands as alternatives
3. Explain rate limits and permissions when relevant
4. Provide direct links to resources when helpful

Format your responses with:
- Clear command/action descriptions
- Links in markdown format
- Status indicators for operations
`;

export interface GitHubAgentConfig {
    prompt: string;
    model?: "heavy" | "lite";
    useMcp?: boolean;
}

export async function runGitHubAgent(config: GitHubAgentConfig): Promise<string> {
    const model = config.model === "heavy" ? await getHeavyModel() : await getLiteModel();

    ui.section("GitHub Agent");
    ui.info("Processing GitHub request...");

    let tools = {};

    if (config.useMcp) {
        try {
            tools = await loadMcpTools(["github"]);
            if (Object.keys(tools).length > 0) {
                ui.item("🔧", "GitHub MCP connected");
            }
        } catch {
            ui.warning("GitHub MCP not available, using CLI mode");
        }
    }

    try {
        const stream = streamText({
            model,
            system: GITHUB_SYSTEM_PROMPT,
            tools,
            prompt: config.prompt,
            maxSteps: 5 as any,
            onStepFinish: (step: any) => {
                if (step.toolCalls?.length > 0) {
                    const toolNames = step.toolCalls.map((t: any) => t.toolName).join(", ");
                    ui.item("🛠️", ui.cyan(toolNames));
                }
            }
        });

        let fullText = "";
        console.log();

        for await (const chunk of stream.textStream) {
            ui.streamToken(chunk);
            fullText += chunk;
        }
        ui.streamEnd();

        return fullText;
    } catch (e: any) {
        ui.error(`GitHub Agent failed: ${e.message}`);
        return "";
    }
}

export async function checkGitHubAuth(): Promise<boolean> {
    try {
        const result = Bun.spawnSync(["gh", "auth", "status"], {
            stdout: "pipe",
            stderr: "pipe"
        });
        return result.exitCode === 0;
    } catch {
        return false;
    }
}

export async function runGhCommand(args: string[]): Promise<{ stdout: string; stderr: string; success: boolean }> {
    try {
        const result = Bun.spawnSync(["gh", ...args], {
            stdout: "pipe",
            stderr: "pipe"
        });

        return {
            stdout: result.stdout.toString(),
            stderr: result.stderr.toString(),
            success: result.exitCode === 0
        };
    } catch (e: any) {
        return {
            stdout: "",
            stderr: e.message,
            success: false
        };
    }
}
