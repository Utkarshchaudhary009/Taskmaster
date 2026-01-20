import pc from 'picocolors';
import { detectInstalledIDEs } from '../mcp/paths';
import { loadMCPConfig, saveMCPConfig, type MCPServerEntry } from '../config/store';

interface SyncOptions {
    from?: string;
    to?: string;
    dryRun: boolean;
}

export async function syncCommand(options: SyncOptions): Promise<void> {
    console.log(pc.bold('\n🔄 MCP Sync\n'));

    // Detect installed IDEs
    const detected = await detectInstalledIDEs();

    if (detected.length === 0) {
        console.log(pc.yellow('No IDE MCP configs found'));
        return;
    }

    console.log(pc.dim(`Found ${detected.length} IDE(s) with MCP configs:`));
    for (const { name } of detected) {
        console.log(pc.dim(`  • ${name}`));
    }

    // Load Taskmaster config
    const tmConfig = await loadMCPConfig();
    let newServers = 0;

    // Parse each IDE config
    for (const { name, path } of detected) {
        if (options.from && name !== options.from) continue;

        try {
            const file = Bun.file(path);
            const content = await file.text();
            const parsed = JSON.parse(content);

            // Simple parser - assumes standard mcpServers format
            const servers = parsed.mcpServers || {};

            for (const [serverName, serverConfig] of Object.entries(servers) as [string, any][]) {
                const fullName = `${name}_${serverName}`;

                if (!tmConfig.mcpServers[fullName]) {
                    const entry: MCPServerEntry = {
                        command: serverConfig.command,
                        args: serverConfig.args || [],
                        env: serverConfig.env || {},
                        source: name,
                        enabled: true,
                        description: `From ${name}`,
                    };

                    if (!options.dryRun) {
                        tmConfig.mcpServers[fullName] = entry;
                    }

                    newServers++;
                    console.log(pc.green(`  ✓ ${fullName}`));
                }
            }
        } catch (error) {
            console.log(pc.yellow(`  ⚠ Failed to parse ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
    }

    if (options.dryRun) {
        console.log(pc.dim(`\n${newServers} server(s) would be added`));
        console.log(pc.dim('Run without --dry-run to apply'));
    } else if (newServers > 0) {
        tmConfig.lastSync = new Date().toISOString();
        await saveMCPConfig(tmConfig);
        console.log(pc.green(`\n✓ Added ${newServers} server(s)`));
    } else {
        console.log(pc.dim('\n✓ Already synced'));
    }
}
