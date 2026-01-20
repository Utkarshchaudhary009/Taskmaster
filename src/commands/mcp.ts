import pc from 'picocolors';
import { loadMCPConfig, saveMCPConfig, type MCPServerEntry } from '../config/store';

export async function mcpCommand(args: string[]): Promise<void> {
    const [subcommand, ...rest] = args;

    switch (subcommand) {
        case 'list':
            await listServers();
            break;
        case 'add':
            await addServer(rest);
            break;
        case 'remove':
            await removeServer(rest);
            break;
        case 'enable':
            await toggleServer(rest[0], true);
            break;
        case 'disable':
            await toggleServer(rest[0], false);
            break;
        default:
            console.log(pc.red(`Unknown mcp command: ${subcommand}`));
            console.log(pc.dim('Available: list, add, remove, enable, disable'));
    }
}

async function listServers() {
    const config = await loadMCPConfig();
    const servers = Object.entries(config.mcpServers);

    if (servers.length === 0) {
        console.log(pc.dim('No MCP servers configured'));
        console.log(pc.dim('Run: tm sync'));
        return;
    }

    console.log(pc.bold('\n📋 MCP Servers\n'));

    for (const [name, server] of servers) {
        const status = server.enabled ? pc.green('✓') : pc.dim('✗');
        console.log(`${status} ${pc.bold(name)}`);
        console.log(pc.dim(`   ${server.description || server.source}`));
        if (server.command) {
            console.log(pc.dim(`   ${server.command} ${(server.args || []).join(' ')}`));
        }
        console.log();
    }
}

async function addServer(args: string[]) {
    const [name, ...cmdArgs] = args;
    if (!name || cmdArgs.length === 0) {
        console.log(pc.red('Usage: tm mcp add <name> <command> [args...]'));
        return;
    }

    const config = await loadMCPConfig();

    const entry: MCPServerEntry = {
        command: cmdArgs[0],
        args: cmdArgs.slice(1),
        source: 'manual',
        enabled: true,
    };

    config.mcpServers[name] = entry;
    await saveMCPConfig(config);

    console.log(pc.green(`✓ Added ${name}`));
}

async function removeServer(args: string[]) {
    const [name] = args;
    if (!name) {
        console.log(pc.red('Usage: tm mcp remove <name>'));
        return;
    }

    const config = await loadMCPConfig();

    if (!config.mcpServers[name]) {
        console.log(pc.red(`Server ${name} not found`));
        return;
    }

    delete config.mcpServers[name];
    await saveMCPConfig(config);

    console.log(pc.green(`✓ Removed ${name}`));
}

async function toggleServer(name: string, enabled: boolean) {
    if (!name) {
        console.log(pc.red(`Usage: tm mcp ${enabled ? 'enable' : 'disable'} <name>`));
        return;
    }

    const config = await loadMCPConfig();

    if (!config.mcpServers[name]) {
        console.log(pc.red(`Server ${name} not found`));
        return;
    }

    config.mcpServers[name].enabled = enabled;
    await saveMCPConfig(config);

    console.log(pc.green(`✓ ${enabled ? 'Enabled' : 'Disabled'} ${name}`));
}
