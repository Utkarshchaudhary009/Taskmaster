
import { runGitAgent } from "../agent/specialists/git-agent";
import { runGitHubAgent, checkGitHubAuth } from "../agent/specialists/github-agent";
import { ui } from "../cli/ui";

export async function handleGitCommand(args: string[], options: { heavy?: boolean; execute?: boolean }) {
    const prompt = args.join(" ");
    
    if (!prompt) {
        ui.header("Git Agent");
        ui.info("Usage: tm git <prompt>");
        ui.log("");
        ui.section("Examples");
        console.log(`  ${ui.dim("$")} tm git "how do I undo the last commit"`);
        console.log(`  ${ui.dim("$")} tm git "show me recent commits with changes to package.json"`);
        console.log(`  ${ui.dim("$")} tm git --execute "stage all changed files and commit with message 'fix: typo'"`);
        console.log();
        return;
    }

    await runGitAgent({
        prompt,
        model: options.heavy ? "heavy" : "lite",
        execute: options.execute ?? false
    });
}

export async function handleGitHubCommand(args: string[], options: { heavy?: boolean; mcp?: boolean }) {
    const prompt = args.join(" ");
    
    if (!prompt) {
        ui.header("GitHub Agent");
        ui.info("Usage: tm gh <prompt>");
        ui.log("");
        ui.section("Examples");
        console.log(`  ${ui.dim("$")} tm gh "list my open pull requests"`);
        console.log(`  ${ui.dim("$")} tm gh "create an issue for bug in login page"`);
        console.log(`  ${ui.dim("$")} tm gh "show workflow runs for main branch"`);
        console.log();
        
        // Check auth status
        const isAuthed = await checkGitHubAuth();
        if (isAuthed) {
            ui.success("GitHub CLI authenticated");
        } else {
            ui.warning("GitHub CLI not authenticated. Run 'gh auth login' first.");
        }
        return;
    }

    await runGitHubAgent({
        prompt,
        model: options.heavy ? "heavy" : "lite",
        useMcp: options.mcp ?? false
    });
}
