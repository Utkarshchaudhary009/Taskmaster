
import { streamText } from "ai";
import { getLiteModel } from "../../providers/zhipu-provider";
import { getHeavyModel } from "../../providers/gemini-provider";
import { ui } from "../../cli/ui";

const GIT_SYSTEM_PROMPT = `You are a Git CLI specialist. You help users with Git operations.

You have expertise in:
- Repository management (init, clone, remote)
- Branching and merging (branch, checkout, merge, rebase)
- Staging and committing (add, commit, reset, stash)
- History and inspection (log, diff, show, blame)
- Collaboration (fetch, pull, push)
- Advanced operations (cherry-pick, bisect, reflog)

When suggesting commands:
1. Always explain what the command does
2. Warn about destructive operations
3. Suggest --dry-run or preview options when available
4. Provide alternatives when relevant

Format your responses with:
- Clear command syntax in code blocks
- Brief explanations
- Warnings for dangerous operations (marked with ⚠️)
`;

export interface GitAgentConfig {
    prompt: string;
    model?: "heavy" | "lite";
    execute?: boolean;
}

export async function runGitAgent(config: GitAgentConfig): Promise<string> {
    const model = config.model === "heavy" ? getHeavyModel() : getLiteModel();
    
    ui.section("Git Agent");
    ui.info("Analyzing Git request...");

    try {
        const stream = streamText({
            model,
            system: GIT_SYSTEM_PROMPT,
            prompt: config.prompt,
        });

        let fullText = "";
        console.log();

        for await (const chunk of stream.textStream) {
            ui.streamToken(chunk);
            fullText += chunk;
        }
        ui.streamEnd();

        // If execute mode, extract and run commands
        if (config.execute) {
            const commands = extractGitCommands(fullText);
            if (commands.length > 0) {
                ui.section("Executing Commands");
                for (const cmd of commands) {
                    await executeGitCommand(cmd);
                }
            }
        }

        return fullText;
    } catch (e: any) {
        ui.error(`Git Agent failed: ${e.message}`);
        return "";
    }
}

function extractGitCommands(text: string): string[] {
    const codeBlockRegex = /```(?:bash|sh|shell)?\n(git[^\n`]+)/g;
    const commands: string[] = [];
    let match;
    
    while ((match = codeBlockRegex.exec(text)) !== null) {
        if (match[1]) {
            commands.push(match[1].trim());
        }
    }
    
    return commands;
}

async function executeGitCommand(command: string): Promise<void> {
    const dangerousPatterns = [
        /--force/i,
        /--hard/i,
        /-f\b/,
        /push.*--delete/i,
        /branch.*-[dD]/,
        /reset/i,
        /clean/i,
    ];

    const isDangerous = dangerousPatterns.some(p => p.test(command));
    
    if (isDangerous) {
        ui.warning(`Skipping dangerous command: ${command}`);
        ui.item("💡", "Run manually if intended");
        return;
    }

    ui.item("▶️", ui.cyan(command));
    
    try {
        const parts = command.split(" ");
        const result = Bun.spawnSync(parts, {
            stdout: "pipe",
            stderr: "pipe"
        });
        
        if (result.stdout.length > 0) {
            console.log(result.stdout.toString());
        }
        if (result.stderr.length > 0) {
            console.log(ui.yellow(result.stderr.toString()));
        }
        
        if (result.exitCode === 0) {
            ui.success("Command completed");
        } else {
            ui.error(`Command failed with exit code ${result.exitCode}`);
        }
    } catch (e: any) {
        ui.error(`Failed to execute: ${e.message}`);
    }
}
