#!/usr/bin/env bun
import { parseArgs } from 'util';
import { intro, outro, isCancel } from '@clack/prompts';
import pc from 'picocolors';
import { doCommand } from './commands/do';
import { syncCommand } from './commands/sync';
import { mcpCommand } from './commands/mcp';
import { setupCommand } from './config/setup';
import { ensureSetup } from './config/store';

const args = parseArgs({
    args: Bun.argv.slice(2),
    options: {
        help: { type: 'boolean', short: 'h' },
        heavy: { type: 'boolean', short: 'H' },
        from: { type: 'string' },
        to: { type: 'string' },
        'dry-run': { type: 'boolean' },
    },
    allowPositionals: true,
});

async function main() {
    const [command, ...rest] = args.positionals;

    // Show help
    if (args.values.help || !command) {
        showHelp();
        return;
    }

    // Check first-run setup
    const setupOk = await ensureSetup();
    if (!setupOk && command !== 'setup') {
        console.log(pc.yellow('\n⚠️  Run'), pc.cyan('tm setup'), pc.yellow('to configure Taskmaster\n'));
        process.exit(1);
    }

    try {
        switch (command) {
            case 'do':
                await doCommand(rest.join(' '), args.values.heavy ?? false);
                break;
            case 'sync':
                await syncCommand({
                    from: args.values.from,
                    to: args.values.to,
                    dryRun: args.values['dry-run'] ?? false,
                });
                break;
            case 'mcp':
                await mcpCommand(rest);
                break;
            case 'setup':
                await setupCommand();
                break;
            default:
                console.log(pc.red(`Unknown command: ${command}`));
                showHelp();
                process.exit(1);
        }
    } catch (error) {
        console.error(pc.red('\n✖'), error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
}

function showHelp() {
    console.log(`
${pc.bold('Taskmaster')} - AI-powered MCP management CLI

${pc.bold('USAGE')}
  ${pc.cyan('tm do')} ${pc.dim('"prompt"')}           Execute task with GLM-4.5-Flash
  ${pc.cyan('tm do -H')} ${pc.dim('"prompt"')}         Execute with Gemini 3 Pro (deep thinking)
  ${pc.cyan('tm sync')}                    Sync MCP configs from all detected IDEs
  ${pc.cyan('tm sync --from')} ${pc.dim('cursor')}     Sync from specific IDE
  ${pc.cyan('tm mcp list')}                List configured MCP servers
  ${pc.cyan('tm mcp add')} ${pc.dim('<name>')}         Add new MCP server
  ${pc.cyan('tm setup')}                   Run first-time setup

${pc.bold('FLAGS')}
  ${pc.cyan('-H, --heavy')}                Use Gemini 3 Pro for complex reasoning
  ${pc.cyan('--from')} ${pc.dim('<ide>')}               Sync from specific IDE
  ${pc.cyan('--dry-run')}                  Show changes without applying

${pc.bold('EXAMPLES')}
  ${pc.dim('tm do "sync my cursor mcp config"')}
  ${pc.dim('tm do -H "analyze and fix all my IDE configs"')}
  ${pc.dim('tm sync --from cursor')}
`);
}

main();
