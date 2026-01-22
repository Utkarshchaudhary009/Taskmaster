# TaskMaster CLI: Implementation Quick-Start Guide

**Based on mcp-sync Analysis**  
**Start Date**: 2026-01-22  
**Tech Stack**: Bun + TypeScript + AES-256-GCM

---

## 🎯 Implementation Phases

### Phase 1: Foundation (Days 1-3) ⭐ START HERE

#### Day 1: Core Structure & Client Definitions

```bash
# 1. Project setup
cd src/taskmaster
mkdir -p {clients,config,sync,security,types}

# 2. Install dependencies
bun add zod commander chalk prompts
bun add -d @types/node
```

**Create: `src/clients/definitions.ts`**
```typescript
import { z } from 'zod';

// Client definition schema
const ClientPathsSchema = z.object({
  darwin: z.string().optional(),
  win32: z.string().optional(),
  linux: z.string().optional(),
});

const FileBasedClientSchema = z.object({
  name: z.string(),
  description: z.string(),
  configType: z.literal("file"),
  paths: ClientPathsSchema,
  mcpKey: z.string().default("mcpServers"),
  format: z.enum(["json", "toml", "yaml"]).default("json"),
});

const CLIBasedClientSchema = z.object({
  name: z.string(),
  description: z.string(),
  configType: z.literal("cli"),
  cliCommands: z.object({
    list: z.string(),
    add: z.string(),
    remove: z.string(),
    get: z.string().optional(),
  }),
  fallbackPaths: ClientPathsSchema.optional(),
});

export const ClientDefinitionSchema = z.union([
  FileBasedClientSchema,
  CLIBasedClientSchema,
]);

export type ClientDefinition = z.infer<typeof ClientDefinitionSchema>;

// Built-in client definitions
export const clientDefinitions = {
  "gemini-cli": {
    name: "Gemini CLI",
    description: "Google Gemini CLI",
    configType: "file",
    paths: {
      darwin: "~/.gemini/settings.json",
      win32: "%USERPROFILE%\\.gemini\\settings.json",
      linux: "~/.gemini/settings.json",
    },
    mcpKey: "mcpServers",
    format: "json",
  },
  "claude-desktop": {
    name: "Claude Desktop",
    description: "Anthropic Claude Desktop",
    configType: "file",
    paths: {
      darwin: "~/Library/Application Support/Claude/claude_desktop_config.json",
      win32: "%APPDATA%/Claude/claude_desktop_config.json",
      linux: "~/.config/claude/claude_desktop_config.json",
    },
    mcpKey: "mcpServers",
    format: "json",
  },
  "cursor": {
    name: "Cursor",
    description: "Cursor AI Editor",
    configType: "file",
    paths: {
      darwin: "~/Library/Application Support/Cursor/User/settings.json",
      win32: "%APPDATA%/Cursor/User/settings.json",
      linux: "~/.config/Cursor/User/settings.json",
    },
    mcpKey: "mcpServers",
    format: "json",
  },
  "claude-code": {
    name: "Claude Code",
    description: "Claude CLI",
    configType: "cli",
    cliCommands: {
      list: "claude mcp list",
      add: "claude mcp add {name} {envFlags} --scope {scope} --transport stdio -- {commandArgs}",
      remove: "claude mcp remove --scope {scope} {name}",
      get: "claude mcp get {name}",
    },
  },
} as const satisfies Record<string, ClientDefinition>;

export type ClientId = keyof typeof clientDefinitions;
```

---

#### Day 2: Security Utilities

**Create: `src/security/validator.ts`**
```typescript
import { z } from 'zod';

export class SecurityValidator {
  /**
   * Validate command name - CRITICAL SECURITY
   * Only allow alphanumeric, hyphens, underscores, dots
   */
  static validateCommandName(cmd: string): boolean {
    return /^[a-zA-Z0-9_.-]+$/.test(cmd);
  }

  /**
   * Validate file path - prevent directory traversal
   */
  static validatePath(path: string): boolean {
    try {
      const normalized = new URL(`file:///${path}`).pathname;
      return !normalized.split('/').some(part => part === '..');
    } catch {
      return false;
    }
  }

  /**
   * Validate environment variable name
   */
  static validateEnvVarName(name: string): boolean {
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
  }

  /**
   * Sanitize command arguments for safe subprocess execution
   */
  static sanitizeArgs(args: string[]): string[] {
    return args.map(arg => {
      // Check if arg needs quoting (contains special chars)
      if (/[\s;|&$`\\]/.test(arg)) {
        // Escape quotes and wrap in quotes
        return `"${arg.replace(/"/g, '\\"')}"`;
      }
      return arg;
    });
  }

  /**
   * Validate server name (used in config keys)
   */
  static validateServerName(name: string): boolean {
    return /^[a-zA-Z0-9_-]+$/.test(name);
  }
}

// Zod schemas for validation
export const MCPServerSchema = z.object({
  command: z.string().refine(SecurityValidator.validateCommandName, {
    message: "Invalid command name - only alphanumeric, -, _, . allowed",
  }),
  args: z.array(z.string()).optional(),
  env: z.record(z.string().refine(SecurityValidator.validateEnvVarName), z.string()).optional(),
  cwd: z.string().optional(),
});

export type MCPServer = z.infer<typeof MCPServerSchema>;
```

---

#### Day 3: Client Discovery

**Create: `src/clients/discovery.ts`**
```typescript
import { clientDefinitions, type ClientId } from './definitions';
import { SecurityValidator } from '../security/validator';
import type { ClientDefinition } from './definitions';

export interface DiscoveredClient {
  clientId: ClientId;
  type: 'file' | 'cli';
  path: string;
  definition: ClientDefinition;
  exists: boolean;
}

export class ClientDiscovery {
  /**
   * Auto-discover all installed/configured IDEs on system
   */
  async discoverAll(): Promise<DiscoveredClient[]> {
    const discovered: DiscoveredClient[] = [];

    for (const [clientId, definition] of Object.entries(clientDefinitions)) {
      const result = await this.discoverClient(clientId as ClientId, definition);
      if (result) {
        discovered.push(result);
      }
    }

    return discovered;
  }

  /**
   * Discover a specific client
   */
  private async discoverClient(
    clientId: ClientId,
    definition: ClientDefinition
  ): Promise<DiscoveredClient | null> {
    if (definition.configType === 'cli') {
      const available = await this.isCLIAvailable(definition);
      return {
        clientId,
        type: 'cli',
        path: `cli:${clientId}`,
        definition,
        exists: available,
      };
    } else {
      const platform = process.platform as keyof typeof definition.paths;
      const pathTemplate = definition.paths[platform];

      if (!pathTemplate) {
        return null;
      }

      const expandedPath = this.expandPathTemplate(pathTemplate);
      const exists = await Bun.file(expandedPath).exists();

      return {
        clientId,
        type: 'file',
        path: expandedPath,
        definition,
        exists,
      };
    }
  }

  /**
   * Check if CLI tool is available
   */
  private async isCLIAvailable(definition: Extract<ClientDefinition, { configType: 'cli' }>): Promise<boolean> {
    try {
      const baseCmd = definition.cliCommands.list.split(' ')[0];

      if (!SecurityValidator.validateCommandName(baseCmd)) {
        console.warn(`Invalid CLI command: ${baseCmd}`);
        return false;
      }

      const proc = Bun.spawn([baseCmd, '--version'], {
        stdout: 'pipe',
        stderr: 'pipe',
        env: process.env,
      });

      const exitCode = await proc.exited;
      return exitCode === 0;
    } catch (error) {
      console.debug(`CLI not available: ${error}`);
      return false;
    }
  }

  /**
   * Expand path template (~ and %ENV_VAR%)
   */
  private expandPathTemplate(pathTemplate: string): string {
    let expanded = pathTemplate;

    // Handle ~ for home directory
    if (expanded.startsWith('~/')) {
      const home = process.env.HOME || process.env.USERPROFILE || '~';
      expanded = home + expanded.slice(1);
    }

    // Handle Windows environment variables (%VAR%)
    expanded = expanded.replace(/%([^%]+)%/g, (_match, varName) => {
      return process.env[varName] || '';
    });

    return expanded;
  }
}
```

---

### Phase 2: Configuration Management (Days 4-5)

#### Day 4: Config Manager

**Create: `src/config/manager.ts`**
```typescript
import { join } from 'path';
import { MCPServerSchema, type MCPServer } from '../security/validator';

export interface GlobalConfig {
  mcpServers: Record<string, MCPServer>;
}

export interface LocationEntry {
  path: string;
  name: string;
  type: 'auto' | 'manual';
  clientId?: string;
}

export class ConfigManager {
  private configDir: string;
  private globalConfigPath: string;
  private locationsPath: string;

  constructor(configDir?: string) {
    this.configDir = configDir || join(Bun.env.HOME || '~', '.taskmaster');
    this.globalConfigPath = join(this.configDir, 'config.json');
    this.locationsPath = join(this.configDir, 'locations.json');
  }

  /**
   * Initialize config directory and files
   */
  async init(): Promise<void> {
    // Create config directory
    await Bun.write(join(this.configDir, '.gitkeep'), '');

    // Initialize global config if not exists
    if (!(await Bun.file(this.globalConfigPath).exists())) {
      await this.saveGlobalConfig({ mcpServers: {} });
    }

    // Initialize locations if not exists
    if (!(await Bun.file(this.locationsPath).exists())) {
      await this.saveLocations([]);
    }
  }

  /**
   * Load global config
   */
  async loadGlobalConfig(): Promise<GlobalConfig> {
    const file = Bun.file(this.globalConfigPath);
    if (!(await file.exists())) {
      return { mcpServers: {} };
    }

    const data = await file.json();
    return data;
  }

  /**
   * Save global config
   */
  async saveGlobalConfig(config: GlobalConfig): Promise<void> {
    await Bun.write(this.globalConfigPath, JSON.stringify(config, null, 2));
  }

  /**
   * Add server to global config
   */
  async addServer(name: string, server: MCPServer): Promise<void> {
    // Validate
    MCPServerSchema.parse(server);

    const config = await this.loadGlobalConfig();
    config.mcpServers[name] = server;
    await this.saveGlobalConfig(config);
  }

  /**
   * Remove server from global config
   */
  async removeServer(name: string): Promise<boolean> {
    const config = await this.loadGlobalConfig();
    if (name in config.mcpServers) {
      delete config.mcpServers[name];
      await this.saveGlobalConfig(config);
      return true;
    }
    return false;
  }

  /**
   * Load registered locations
   */
  async loadLocations(): Promise<LocationEntry[]> {
    const file = Bun.file(this.locationsPath);
    if (!(await file.exists())) {
      return [];
    }

    const data = await file.json();
    return data.locations || [];
  }

  /**
   * Save locations
   */
  async saveLocations(locations: LocationEntry[]): Promise<void> {
    await Bun.write(this.locationsPath, JSON.stringify({ locations }, null, 2));
  }

  /**
   * Add location
   */
  async addLocation(entry: LocationEntry): Promise<boolean> {
    const locations = await this.loadLocations();

    // Check if already exists
    if (locations.some(loc => loc.path === entry.path)) {
      return false;
    }

    locations.push(entry);
    await this.saveLocations(locations);
    return true;
  }
}
```

---

### Phase 3: Sync Engine (Days 6-8)

#### Day 6-7: Core Sync Logic

**Create: `src/sync/engine.ts`**
```typescript
import type { ConfigManager } from '../config/manager';
import type { MCPServer } from '../security/validator';

export interface SyncOptions {
  dryRun?: boolean;
  globalOnly?: boolean;
  projectOnly?: boolean;
  specificLocation?: string;
}

export interface SyncResult {
  updatedLocations: string[];
  plannedChanges?: Array<{ location: string; diff: ServerDiff }>;
  conflicts: Array<{
    server: string;
    location: string;
    action: 'overridden';
    source: string;
  }>;
  errors: Array<{ location: string; error: string }>;
}

export interface ServerDiff {
  toAdd: string[];
  toRemove: string[];
  toUpdate: string[];
  hasChanges: boolean;
}

export class SyncEngine {
  constructor(private configManager: ConfigManager) {}

  /**
   * Sync all registered locations
   */
  async syncAll(options: SyncOptions = {}): Promise<SyncResult> {
    const result: SyncResult = {
      updatedLocations: [],
      plannedChanges: options.dryRun ? [] : undefined,
      conflicts: [],
      errors: [],
    };

    try {
      // 1. Build master server list
      const masterServers = await this.buildMasterServerList(options);

      // 2. Get target locations
      const locations = await this.getTargetLocations(options);

      // 3. Sync each location
      for (const location of locations) {
        try {
          await this.syncLocation(location, masterServers, result, options);
        } catch (error) {
          result.errors.push({
            location: location.path,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      return result;
    } catch (error) {
      result.errors.push({
        location: 'sync_engine',
        error: `Critical sync error: ${error}`,
      });
      return result;
    }
  }

  /**
   * Build merged server list from global + project configs
   */
  private async buildMasterServerList(options: SyncOptions): Promise<Record<string, MCPServer>> {
    const master: Record<string, MCPServer> = {};

    // Add global servers
    if (!options.projectOnly) {
      const globalConfig = await this.configManager.loadGlobalConfig();
      Object.assign(master, globalConfig.mcpServers);
    }

    // Add project servers (overrides global)
    if (!options.globalOnly) {
      const projectConfig = await this.loadProjectConfig();
      if (projectConfig) {
        Object.assign(master, projectConfig.mcpServers);
      }
    }

    return master;
  }

  /**
   * Load project config from .mcp.json
   */
  private async loadProjectConfig(): Promise<{ mcpServers: Record<string, MCPServer> } | null> {
    const file = Bun.file('.mcp.json');
    if (!(await file.exists())) {
      return null;
    }

    const data = await file.json();
    return data;
  }

  /**
   * Get target locations to sync
   */
  private async getTargetLocations(options: SyncOptions) {
    const allLocations = await this.configManager.loadLocations();

    if (options.specificLocation) {
      return allLocations.filter(
        loc => loc.path === options.specificLocation || loc.name === options.specificLocation
      );
    }

    return allLocations;
  }

  /**
   * Sync a single location
   */
  private async syncLocation(
    location: any,
    masterServers: Record<string, MCPServer>,
    result: SyncResult,
    options: SyncOptions
  ): Promise<void> {
    // Read current config
    const file = Bun.file(location.path);
    if (!(await file.exists())) {
      result.errors.push({ location: location.path, error: 'Config file not found' });
      return;
    }

    const currentConfig = await file.json();
    const currentServers = currentConfig.mcpServers || {};

    // Calculate diff
    const diff = this.calculateDiff(currentServers, masterServers);

    if (!diff.hasChanges) {
      return;
    }

    if (options.dryRun) {
      result.plannedChanges?.push({ location: location.path, diff });
    } else {
      // Apply changes
      currentConfig.mcpServers = { ...masterServers };
      await Bun.write(location.path, JSON.stringify(currentConfig, null, 2));
      result.updatedLocations.push(location.path);
    }
  }

  /**
   * Calculate diff between current and master servers
   */
  private calculateDiff(
    current: Record<string, MCPServer>,
    master: Record<string, MCPServer>
  ): ServerDiff {
    const currentKeys = new Set(Object.keys(current));
    const masterKeys = new Set(Object.keys(master));

    const toAdd = [...masterKeys].filter(k => !currentKeys.has(k));
    const toRemove = [...currentKeys].filter(k => !masterKeys.has(k));
    const toUpdate = [...masterKeys].filter(
      k => currentKeys.has(k) && JSON.stringify(current[k]) !== JSON.stringify(master[k])
    );

    return {
      toAdd,
      toRemove,
      toUpdate,
      hasChanges: toAdd.length > 0 || toRemove.length > 0 || toUpdate.length > 0,
    };
  }
}
```

---

### Phase 4: CLI Commands (Day 9-10)

**Create: `src/cli/commands.ts`**
```typescript
import { Command } from 'commander';
import chalk from 'chalk';
import { ConfigManager } from '../config/manager';
import { SyncEngine } from '../sync/engine';
import { ClientDiscovery } from '../clients/discovery';

export function createCLI() {
  const program = new Command();

  program
    .name('taskmaster')
    .description('Universal MCP Configuration Manager')
    .version('1.0.0');

  // Scan command
  program
    .command('scan')
    .description('Auto-discover IDE configs on your system')
    .action(async () => {
      console.log(chalk.blue('🔍 Scanning for IDE configurations...\\n'));

      const discovery = new ClientDiscovery();
      const clients = await discovery.discoverAll();

      const found = clients.filter(c => c.exists);
      const notFound = clients.filter(c => !c.exists);

      if (found.length > 0) {
        console.log(chalk.green('✓ Found:'));
        found.forEach(client => {
          console.log(`  ${chalk.bold(client.definition.name)} - ${client.path}`);
        });
      }

      if (notFound.length > 0) {
        console.log(chalk.gray('\\n✗ Not found:'));
        notFound.forEach(client => {
          console.log(chalk.gray(`  ${client.definition.name}`));
        });
      }
    });

  // Sync command
  program
    .command('sync')
    .description('Sync MCP servers to all IDE configs')
    .option('--dry-run', 'Preview changes without applying')
    .option('--global-only', 'Sync only global servers')
    .option('--project-only', 'Sync only project servers')
    .action(async (options) => {
      const configManager = new ConfigManager();
      const syncEngine = new SyncEngine(configManager);

      console.log(chalk.blue(`🔄 ${options.dryRun ? 'Preview' : 'Starting'} sync...\\n`));

      const result = await syncEngine.syncAll({
        dryRun: options.dryRun,
        globalOnly: options.globalOnly,
        projectOnly: options.projectOnly,
      });

      if (options.dryRun && result.plannedChanges) {
        console.log(chalk.yellow('Planned changes:'));
        result.plannedChanges.forEach(change => {
          console.log(`\\n${chalk.bold(change.location)}:`);
          if (change.diff.toAdd.length > 0) {
            console.log(chalk.green(`  + Add: ${change.diff.toAdd.join(', ')}`));
          }
          if (change.diff.toRemove.length > 0) {
            console.log(chalk.red(`  - Remove: ${change.diff.toRemove.join(', ')}`));
          }
          if (change.diff.toUpdate.length > 0) {
            console.log(chalk.yellow(`  ~ Update: ${change.diff.toUpdate.join(', ')}`));
          }
        });
      } else {
        console.log(chalk.green(`\\n✓ Synced ${result.updatedLocations.length} locations`));
      }

      if (result.errors.length > 0) {
        console.log(chalk.red('\\n✗ Errors:'));
        result.errors.forEach(err => {
          console.log(chalk.red(`  ${err.location}: ${err.error}`));
        });
      }
    });

  // Status command
  program
    .command('status')
    .description('Show current sync status')
    .action(async () => {
      const configManager = new ConfigManager();
      const globalConfig = await configManager.loadGlobalConfig();
      const locations = await configManager.loadLocations();

      console.log(chalk.bold('\\n📊 TaskMaster Status\\n'));
      console.log(`Global servers: ${chalk.green(Object.keys(globalConfig.mcpServers).length)}`);
      console.log(`Registered locations: ${chalk.blue(locations.length)}\\n`);

      if (Object.keys(globalConfig.mcpServers).length > 0) {
        console.log(chalk.bold('Servers:'));
        Object.keys(globalConfig.mcpServers).forEach(name => {
          console.log(`  • ${name}`);
        });
      }
    });

  return program;
}
```

**Create: `src/index.ts`**
```typescript
#!/usr/bin/env bun

import { createCLI } from './cli/commands';

const program = createCLI();
program.parse(process.argv);
```

---

## 🚀 Quick Test

```bash
# 1. Build
bun run build

# 2. Test discovery
bun run src/index.ts scan

# 3. Test sync (dry-run)
bun run src/index.ts sync --dry-run

# 4. Test status
bun run src/index.ts status
```

---

## 📝 Next Steps

After completing Phases 1-4, prioritize:

1. **Token Encryption** (See `token-storage-enhancement.md`)
2. **CLI-Based Client Support** (Claude Code, etc.)
3. **OAuth Integration** (GitHub, GitLab)
4. **Interactive TUI** (Conflict resolution)
5. **Auto-Sync Daemon** (File watching)

---

**End of Quick-Start Guide**

*Follow this step-by-step to get a functional MVP in 10 days!*
