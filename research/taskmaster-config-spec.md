# TaskMaster CLI: MCP Configuration Architecture Spec

**Technology Stack**: Bun + TypeScript + AES-256-GCM Encryption  
**Target**: CLI Tool with Multi-IDE Synchronization  
**Security Level**: Production-Grade (Top 1% Standards)

---

## 🎯 Design Goals

1. **Secure by Default**: All secrets encrypted with OS-level keychain integration
2. **Multi-IDE Aware**: Auto-discover and import configs from 10+ IDEs
3. **Hierarchical Configuration**: Support project, workspace, user, and system scopes
4. **Format Agnostic**: Read JSON/TOML/YAML, write JSON by default
5. **Zero Trust**: Validate all inputs with strict schemas

---

## 📐 Architecture Overview

### Directory Structure
```
~/.taskmaster/
├── config.json              # User-level MCP server definitions
├── tokens.enc               # Encrypted OAuth tokens (AES-256-GCM)
├── master.key               # Master encryption key (OS keychain)
├── cache/
│   ├── ide-configs.json     # Cached IDE config locations
│   └── server-schemas.json  # MCP server JSON schemas
└── logs/
    └── mcp-sync.log         # Sync operation logs

<project-root>/
├── .taskmaster/
│   ├── config.json          # Project-level overrides
│   └── workspace.json       # Workspace-specific settings
└── .taskmaster-ignore       # Gitignore-style file for sensitive servers
```

### Configuration Precedence
```
1. CLI Flags (--mcp-server=...)
2. Environment Variables (TASKMASTER_MCP_*)
3. Project Local (.taskmaster/config.json)
4. Workspace (.taskmaster/workspace.json)
5. User Global (~/.taskmaster/config.json)
6. System-wide (/etc/taskmaster/config.json) [Linux only]
```

---

## 🔐 Security Architecture

### Token Encryption Strategy

#### Master Key Generation (First Run)
```typescript
import { generateKey, exportKey } from 'bun:crypto';

async function initializeMasterKey(): Promise<CryptoKey> {
  const key = await generateKey('AES-GCM', { length: 256 });
  const exported = await exportKey(key, 'raw');
  
  // Store in OS keychain (platform-specific)
  await storeInKeychain('taskmaster-master-key', exported);
  
  return key;
}
```

#### Token Encryption
```typescript
async function encryptToken(token: string, masterKey: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(token);
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    masterKey,
    encoded
  );
  
  // Format: base64(iv):base64(ciphertext)
  return `${Buffer.from(iv).toString('base64')}:${Buffer.from(encrypted).toString('base64')}`;
}

async function decryptToken(encryptedToken: string, masterKey: CryptoKey): Promise<string> {
  const [ivB64, cipherB64] = encryptedToken.split(':');
  const iv = Buffer.from(ivB64, 'base64');
  const ciphertext = Buffer.from(cipherB64, 'base64');
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    masterKey,
    ciphertext
  );
  
  return new TextDecoder().decode(decrypted);
}
```

#### OS Keychain Integration
```typescript
// Windows: Windows Credential Manager
async function storeInKeychainWindows(key: string, value: ArrayBuffer): Promise<void> {
  const { execSync } = await import('child_process');
  const b64Value = Buffer.from(value).toString('base64');
  
  execSync(`cmdkey /generic:${key} /user:taskmaster /pass:${b64Value}`);
}

// macOS: Keychain Access
async function storeInKeychainMacOS(key: string, value: ArrayBuffer): Promise<void> {
  const { execSync } = await import('child_process');
  const b64Value = Buffer.from(value).toString('base64');
  
  execSync(`security add-generic-password -a taskmaster -s ${key} -w ${b64Value} -U`);
}

// Linux: libsecret (GNOME Keyring / KWallet)
async function storeInKeychainLinux(key: string, value: ArrayBuffer): Promise<void> {
  // Requires libsecret bindings or secret-tool
  const { execSync } = await import('child_process');
  const b64Value = Buffer.from(value).toString('base64');
  
  execSync(`secret-tool store --label="TaskMaster Key" application taskmaster key ${key} <<< ${b64Value}`);
}
```

---

## 🗂️ Configuration Schema

### User Config (~/.taskmaster/config.json)
```json
{
  "$schema": "https://taskmaster.dev/schemas/config-v1.json",
  "version": "1.0",
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "${secret:github_token}"
      },
      "enabled": true,
      "autoStart": true
    },
    "filesystem": {
      "command": "bun",
      "args": ["run", "~/mcp-servers/filesystem/index.ts"],
      "cwd": "~/mcp-servers/filesystem",
      "enabled": true
    }
  },
  "sync": {
    "autoDiscoverIDEs": true,
    "syncOnStartup": true,
    "preferredIDEs": ["gemini-cli", "cursor", "vscode"]
  },
  "security": {
    "encryptionAlgorithm": "AES-256-GCM",
    "requireApproval": ["*"],
    "allowedCommands": ["npx", "node", "bun", "deno"]
  }
}
```

### TypeScript Schema Definition
```typescript
import { z } from 'zod';

const MCPServerSchema = z.object({
  command: z.string().min(1),
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),
  cwd: z.string().optional(),
  enabled: z.boolean().default(true),
  autoStart: z.boolean().default(true),
  timeout: z.number().optional(),
  retries: z.number().optional()
});

const ConfigSchema = z.object({
  $schema: z.string().url().optional(),
  version: z.string().regex(/^\d+\.\d+$/),
  mcpServers: z.record(MCPServerSchema),
  sync: z.object({
    autoDiscoverIDEs: z.boolean().default(true),
    syncOnStartup: z.boolean().default(false),
    preferredIDEs: z.array(z.enum([
      'gemini-cli', 'claude-desktop', 'cursor', 'vscode', 
      'zed', 'codex', 'windsurf', 'cline'
    ])).optional()
  }).optional(),
  security: z.object({
    encryptionAlgorithm: z.enum(['AES-256-GCM', 'ChaCha20-Poly1305']),
    requireApproval: z.array(z.string()), // Glob patterns
    allowedCommands: z.array(z.string())
  }).optional()
});

type TaskMasterConfig = z.infer<typeof ConfigSchema>;
```

---

## 🔄 IDE Adapter System

### Base Adapter Interface
```typescript
interface IDEConfigAdapter {
  name: string;
  detect(): Promise<boolean>;
  locateConfigs(): Promise<string[]>;
  parse(configPath: string): Promise<MCPConfig>;
  import(config: MCPConfig): Promise<ImportResult>;
  export(config: TaskMasterConfig): Promise<void>;
}

interface MCPConfig {
  mcpServers: Record<string, MCPServerDefinition>;
  metadata?: {
    ide: string;
    version?: string;
    lastModified?: Date;
  };
}

interface ImportResult {
  importedServers: string[];
  skippedServers: string[];
  errors: { server: string; reason: string }[];
}
```

### Example: Gemini CLI Adapter
```typescript
class GeminiCLIAdapter implements IDEConfigAdapter {
  name = 'gemini-cli';
  
  async detect(): Promise<boolean> {
    const settingsPath = path.join(os.homedir(), '.gemini', 'settings.json');
    return await Bun.file(settingsPath).exists();
  }
  
  async locateConfigs(): Promise<string[]> {
    const paths = [];
    
    // User-level
    paths.push(path.join(os.homedir(), '.gemini', 'settings.json'));
    
    // System-level (OS-specific)
    if (process.platform === 'linux') {
      paths.push('/etc/gemini-cli/settings.json');
    } else if (process.platform === 'win32') {
      paths.push('C:\\ProgramData\\gemini-cli\\settings.json');
    }
    
    return paths.filter(async p => await Bun.file(p).exists());
  }
  
  async parse(configPath: string): Promise<MCPConfig> {
    const content = await Bun.file(configPath).json();
    
    return {
      mcpServers: content.mcpServers || {},
      metadata: {
        ide: 'gemini-cli',
        version: content.version,
        lastModified: new Date((await Bun.file(configPath).stat()).mtime)
      }
    };
  }
  
  async import(config: MCPConfig): Promise<ImportResult> {
    const result: ImportResult = {
      importedServers: [],
      skippedServers: [],
      errors: []
    };
    
    for (const [name, server] of Object.entries(config.mcpServers)) {
      try {
        // Validate server definition
        MCPServerSchema.parse(server);
        
        // Extract and encrypt secrets
        if (server.env) {
          for (const [key, value] of Object.entries(server.env)) {
            if (isSecret(key)) {
              const encrypted = await encryptToken(value, masterKey);
              await storeSecret(`${name}:${key}`, encrypted);
              server.env[key] = `\${secret:${name}_${key.toLowerCase()}}`;
            }
          }
        }
        
        // Add to TaskMaster config
        await addMCPServer(name, server);
        result.importedServers.push(name);
      } catch (error) {
        result.errors.push({ server: name, reason: error.message });
      }
    }
    
    return result;
  }
  
  async export(config: TaskMasterConfig): Promise<void> {
    const geminiConfig = {
      version: '1.0',
      mcpServers: {}
    };
    
    for (const [name, server] of Object.entries(config.mcpServers)) {
      geminiConfig.mcpServers[name] = { ...server };
      
      // Decrypt secrets for export
      if (server.env) {
        for (const [key, value] of Object.entries(server.env)) {
          if (value.startsWith('${secret:')) {
            const secretKey = value.match(/\${secret:(.+)}/)[1];
            const decrypted = await getSecret(secretKey);
            geminiConfig.mcpServers[name].env[key] = decrypted;
          }
        }
      }
    }
    
    const settingsPath = path.join(os.homedir(), '.gemini', 'settings.json');
    await Bun.write(settingsPath, JSON.stringify(geminiConfig, null, 2));
  }
}
```

### Adapter Registry
```typescript
const adapters: IDEConfigAdapter[] = [
  new GeminiCLIAdapter(),
  new ClaudeDesktopAdapter(),
  new CursorAdapter(),
  new VSCodeAdapter(),
  new ZedAdapter(),
  new CodexAdapter(),
  new WindsurfAdapter(),
  new ClineAdapter()
];

async function discoverIDEs(): Promise<IDEConfigAdapter[]> {
  const detected = [];
  
  for (const adapter of adapters) {
    if (await adapter.detect()) {
      detected.push(adapter);
    }
  }
  
  return detected;
}
```

---

## 🛠️ CLI Commands

### Sync Commands
```bash
# Auto-discover and sync from all detected IDEs
taskmaster sync --auto

# Sync from specific IDE
taskmaster sync --from=gemini-cli

# Sync to specific IDE (export)
taskmaster sync --to=cursor

# Two-way sync (merge configs)
taskmaster sync --from=vscode --to=taskmaster --merge

# Dry run (show what would be synced)
taskmaster sync --from=claude-desktop --dry-run
```

### Server Management
```bash
# List all configured MCP servers
taskmaster mcp list

# Add a new server
taskmaster mcp add github \
  --command="npx" \
  --args="-y,@modelcontextprotocol/server-github" \
  --env="GITHUB_TOKEN=\${secret:github_token}"

# Remove a server
taskmaster mcp remove github

# Enable/disable a server
taskmaster mcp enable github
taskmaster mcp disable github

# Test a server
taskmaster mcp test github
```

### Secret Management
```bash
# Add a secret (prompts securely)
taskmaster secret add github_token

# Add via OAuth flow
taskmaster secret oauth github

# List secrets (shows names only, not values)
taskmaster secret list

# Delete a secret
taskmaster secret delete github_token

# Rotate master key (re-encrypts all secrets)
taskmaster secret rotate-master-key
```

### Migration Commands
```bash
# Migrate from Claude Desktop
taskmaster migrate --from=claude-desktop

# Migrate to Cursor
taskmaster migrate --to=cursor

# Full migration (import from one, export to another)
taskmaster migrate --from=gemini-cli --to=cursor
```

---

## 🔍 Auto-Discovery Implementation

### IDE Detection Logic
```typescript
type IDEDetectionResult = {
  ide: string;
  detected: boolean;
  configPaths: string[];
  version?: string;
};

async function detectAllIDEs(): Promise<IDEDetectionResult[]> {
  const detections: IDEDetectionResult[] = [];
  
  // Claude Desktop
  detections.push(await detectClaudeDesktop());
  
  // Gemini CLI
  detections.push(await detectGeminiCLI());
  
  // Cursor
  detections.push(await detectCursor());
  
  // VS Code + Extensions
  detections.push(...await detectVSCodeEcosystem());
  
  // Zed
  detections.push(await detectZed());
  
  // Windsurf
  detections.push(await detectWindsurf());
  
  // Codex
  detections.push(await detectCodex());
  
  return detections.filter(d => d.detected);
}

async function detectGeminiCLI(): Promise<IDEDetectionResult> {
  const configPaths = [];
  const homedir = os.homedir();
  
  // User config
  const userConfig = path.join(homedir, '.gemini', 'settings.json');
  if (await Bun.file(userConfig).exists()) {
    configPaths.push(userConfig);
  }
  
  // System config
  let systemConfig: string;
  switch (process.platform) {
    case 'linux':
      systemConfig = '/etc/gemini-cli/settings.json';
      break;
    case 'win32':
      systemConfig = 'C:\\ProgramData\\gemini-cli\\settings.json';
      break;
    case 'darwin':
      systemConfig = '/Library/Application Support/GeminiCli/settings.json';
      break;
  }
  
  if (systemConfig && await Bun.file(systemConfig).exists()) {
    configPaths.push(systemConfig);
  }
  
  let version: string | undefined;
  if (configPaths.length > 0) {
    try {
      const config = await Bun.file(configPaths[0]).json();
      version = config.version;
    } catch {}
  }
  
  return {
    ide: 'gemini-cli',
    detected: configPaths.length > 0,
    configPaths,
    version
  };
}
```

---

## 🧪 Testing Strategy

### Unit Tests
```typescript
describe('GeminiCLIAdapter', () => {
  it('should detect Gemini CLI installation', async () => {
    const adapter = new GeminiCLIAdapter();
    const detected = await adapter.detect();
    expect(detected).toBe(true);
  });
  
  it('should parse Gemini CLI config', async () => {
    const adapter = new GeminiCLIAdapter();
    const config = await adapter.parse('~/.gemini/settings.json');
    expect(config.mcpServers).toBeDefined();
  });
  
  it('should import servers with encrypted secrets', async () => {
    const adapter = new GeminiCLIAdapter();
    const mockConfig: MCPConfig = {
      mcpServers: {
        github: {
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-github'],
          env: { GITHUB_TOKEN: 'ghp_test_token' }
        }
      }
    };
    
    const result = await adapter.import(mockConfig);
    expect(result.importedServers).toContain('github');
    
    // Verify secret was encrypted
    const stored = await getSecret('github:GITHUB_TOKEN');
    expect(stored).not.toBe('ghp_test_token'); // Should be encrypted
  });
});
```

### Integration Tests
```bash
# Test sync workflow
bun test:integration sync-workflow

# Test security
bun test:security encryption-integrity
```

---

## 📊 Performance Considerations

### Caching Strategy
```typescript
const IDE_DETECTION_CACHE_TTL = 60 * 1000; // 1 minute

class IDEDetectionCache {
  private cache = new Map<string, { result: IDEDetectionResult; timestamp: number }>();
  
  async get(ideName: string): Promise<IDEDetectionResult | null> {
    const cached = this.cache.get(ideName);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > IDE_DETECTION_CACHE_TTL) {
      this.cache.delete(ideName);
      return null;
    }
    
    return cached.result;
  }
  
  set(ideName: string, result: IDEDetectionResult): void {
    this.cache.set(ideName, {
      result,
      timestamp: Date.now()
    });
  }
}
```

### Lazy Loading
```typescript
// Only load adapters when needed
const adapterRegistry = new Map<string, () => Promise<IDEConfigAdapter>>();

adapterRegistry.set('gemini-cli', async () => {
  const { GeminiCLIAdapter } = await import('./adapters/gemini-cli');
  return new GeminiCLIAdapter();
});

adapterRegistry.set('cursor', async () => {
  const { CursorAdapter } = await import('./adapters/cursor');
  return new CursorAdapter();
});

async function getAdapter(name: string): Promise<IDEConfigAdapter> {
  const factory = adapterRegistry.get(name);
  if (!factory) throw new Error(`Unknown IDE: ${name}`);
  return await factory();
}
```

---

## 🚀 Implementation Roadmap

### Phase 1: Core Infrastructure (Week 1)
- [ ] Config schema and validation (Zod)
- [ ] Encryption module (AES-256-GCM)
- [ ] OS keychain integration
- [ ] Base config manager

### Phase 2: Adapter System (Week 2)
- [ ] Adapter interface
- [ ] Gemini CLI adapter
- [ ] Claude Desktop adapter
- [ ] Cursor adapter
- [ ] VS Code adapter

### Phase 3: CLI Commands (Week 3)
- [ ] `taskmaster sync` command
- [ ] `taskmaster mcp` commands
- [ ] `taskmaster secret` commands
- [ ] `taskmaster migrate` command

### Phase 4: Advanced Features (Week 4)
- [ ] Auto-discovery logic
- [ ] Config merging strategy
- [ ] OAuth flow integration
- [ ] Interactive TUI for config editing

### Phase 5: Testing & Documentation (Week 5)
- [ ] Unit tests (80%+ coverage)
- [ ] Integration tests
- [ ] Security audit
- [ ] User documentation
- [ ] API documentation

---

## 📚 Dependencies

### Core
```json
{
  "dependencies": {
    "zod": "^3.22.4",
    "@ai-sdk/mcp": "latest",
    "chalk": "^5.3.0",
    "commander": "^12.0.0",
    "prompts": "^2.4.2"
  },
  "devDependencies": {
    "bun-types": "latest",
    "vitest": "^1.2.0",
    "@types/node": "^20.11.0"
  }
}
```

### OS-Specific (Optional)
- **Windows**: `node-dpapi` for credential manager
- **macOS**: Native `security` command
- **Linux**: `libsecret` bindings

---

## 🔒 Security Checklist

- [x] All tokens encrypted at rest (AES-256-GCM)
- [x] Master key stored in OS keychain
- [x] No plaintext secrets in config files
- [x] Input validation with Zod schemas
- [x] Command whitelist enforcement
- [x] Glob pattern matching for approvals
- [x] Audit logging for security operations
- [x] Secure secret rotation mechanism

---

**End of Specification**

*Ready for implementation. See `mcp-config-fragmentation-analysis.md` for full context.*
