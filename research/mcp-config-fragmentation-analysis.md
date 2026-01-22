# MCP Configuration Fragmentation: A Deep Architectural Analysis

**Author**: Omni-Architect (Top 1% Analysis)  
**Date**: 2026-01-22  
**Subject**: Why Different IDEs Use Different MCP Storage Approaches Despite Protocol Standardization

---

## 🎯 Executive Summary

Despite the Model Context Protocol (MCP) standardizing the **protocol layer** (message formats, transport mechanisms, capabilities), it **intentionally leaves configuration storage as an implementation detail**. This creates fragmentation across IDEs, where each tool chooses different file locations, formats, and management strategies based on their own architectural constraints and design philosophies.

**Key Finding**: MCP is like HTTP – it standardizes the wire protocol, not where you store your server list.

---

## 🔍 Part 1: The "Why" - Root Cause Analysis

### 1.1 The Protocol vs. Implementation Boundary

**MCP's Scope** (What It Standardizes):
- ✅ JSON-RPC 2.0 message format
- ✅ Transport mechanisms (stdio, SSE)
- ✅ Capability negotiation
- ✅ Tool/Resource/Prompt schemas
- ✅ Client-Server handshake

**MCP's Non-Scope** (Implementation Freedom):
- ❌ Configuration file location
- ❌ Configuration file format (JSON vs TOML vs YAML)
- ❌ Authentication token storage
- ❌ Server lifecycle management
- ❌ Multi-workspace vs global settings

### 1.2 Architectural Drivers for Fragmentation

#### **Driver #1: Existing Ecosystem Constraints**
Each IDE/tool has pre-existing architectural patterns:

| IDE | Ecosystem | Config Philosophy |
|-----|-----------|-------------------|
| **VS Code** | Extensions ecosystem | `.vscode/` folder pattern for workspace settings |
| **Gemini CLI** | CLI-first | Unix convention: `~/.gemini/settings.json` |
| **Claude Desktop** | Electron app | OS-native app support dirs |
| **Cursor** | Fork of VS Code | Maintains VS Code patterns but isolated from Code settings |
| **Zed** | Native Rust app | Single `settings.json` with nested objects |

**Why It Matters**: Changing config location breaks backward compatibility and user expectations.

#### **Driver #2: Scope Granularity Conflicts**
Different tools have different config scope models:

```
VS Code/Cline Model (Hierarchical):
├── System-wide: /etc/gemini-cli/settings.json
├── User-global: ~/.vscode/mcp.json
├── Workspace: .vscode/mcp.json
└── Project-root: .mcp.json

Claude Desktop Model (Flat):
└── User-global only: ~/Library/Application Support/Claude/claude_desktop_config.json

Cursor Model (Two-tier):
├── User-global: ~/.cursor/mcp.json
└── Project-local: <project>/.cursor/mcp.json
```

**Conflict**: MCP doesn't mandate scope precedence, so each tool invents its own.

#### **Driver #3: Security Model Divergence**

**Token Storage Strategies**:
- **Gemini CLI**: Separate `~/.gemini/mcp-oauth-tokens.json` with OS keychain encryption
- **Claude Desktop**: API keys embedded in `claude_desktop_config.json` (less secure)
- **VS Code**: Input variables + Secret Storage API (encrypted)
- **Windsurf**: Embedded in `mcp_config.json`

**Why This Diverges**: MCP doesn't specify auth token storage, so each tool applies its own security principles.

#### **Driver #4: Multi-Tenant vs Single-Tenant Design**

| Tool | Design Model | Config Justification |
|------|--------------|---------------------|
| **VS Code** | Multi-tenant (Extensions) | Each extension needs isolated globalStorage |
| **Cline (extension)** | Isolated from VS Code settings | `globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json` |
| **Gemini CLI** | Single-purpose CLI | Single `~/.gemini/settings.json` |
| **Zed** | Single-purpose IDE | Single `~/.config/zed/settings.json` |

**The Tension**: Extensions must isolate configs to avoid collisions, while native apps prefer unified config files.

#### **Driver #5: Platform Conventions**

**OS-Specific Paths**:
```plaintext
Claude Desktop:
- macOS:   ~/Library/Application Support/Claude/
- Windows: %APPDATA%\Claude\
- Linux:   ~/.config/Claude/

Zed:
- macOS:   ~/.config/zed/
- Linux:   ~/.config/zed/
- Windows: %APPDATA%\Roaming\Zed\
```

**Why It Matters**: Following platform conventions improves user trust and integration with backup/sync tools.

---

## 📂 Part 2: Configuration File Location Map

### Complete IDE/Tool Configuration Matrix

| Tool | OS | Global Config Location | Project-Local Config | Format |
|------|----|-----------------------|---------------------|--------|
| **Claude Desktop** | macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` | N/A | JSON |
| | Windows | `%APPDATA%\Claude\claude_desktop_config.json` | N/A | JSON |
| | Linux | `~/.config/Claude/claude_desktop_config.json` | N/A | JSON |
| **Cursor** | macOS/Linux | `~/.cursor/mcp.json` | `<project>/.cursor/mcp.json` | JSON |
| | Windows | `%USERPROFILE%\.cursor\mcp.json` | `<project>\.cursor\mcp.json` | JSON |
| **Gemini CLI** | macOS/Linux | `~/.gemini/settings.json` | N/A | JSON |
| | Windows | `%USERPROFILE%\.gemini\settings.json` | N/A | JSON |
| | System-wide (Linux) | `/etc/gemini-cli/settings.json` | N/A | JSON |
| **VS Code (Native MCP)** | All | Open via `MCP: Open User Configuration` | `.vscode/mcp.json` | JSON |
| **Cline (VS Code Extension)** | macOS | `~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json` | N/A | JSON |
| | Windows | `%APPDATA%\Code\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json` | N/A | JSON |
| | Linux | `~/.config/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json` | N/A | JSON |
| **Continue (VS Code Extension)** | All | Workspace-specific via `.vscode/mcp.json` | `.vscode/mcp.json` | JSON |
| **Windsurf** | macOS/Linux | `~/.codeium/windsurf/mcp_config.json` | N/A | JSON |
| | Windows | `%USERPROFILE%\.codeium\windsurf\mcp_config.json` | N/A | JSON |
| | Linux (Flatpak) | `~/.var/app/com.codeium.windsurf/config/Codeium/Windsurf/mcp_config.json` | N/A | JSON |
| **Zed** | macOS/Linux | `~/.config/zed/settings.json` (nested `context_servers` object) | N/A | JSON |
| | Windows | `%APPDATA%\Roaming\Zed\settings.json` | N/A | JSON |
| **OpenAI Codex** | All | `~/.codex/config.toml` | `.mcp.json` (project root) | TOML |
| **LibreChat** | All | `librechat.yaml` | N/A | YAML |
| **mcp-cli** | All | `~/.config/mcp/mcp_servers.json` OR `./mcp_servers.json` (current dir) | N/A | JSON |

### Token/Secret Storage Locations

| Tool | Token Storage Location | Encryption Method |
|------|----------------------|-------------------|
| **Gemini CLI** | `~/.gemini/mcp-oauth-tokens.json` | OS Keychain |
| **VS Code** | Secret Storage API | OS Credential Manager |
| **Claude Desktop** | Embedded in `claude_desktop_config.json` | None (plaintext) |
| **Windsurf** | Embedded in `mcp_config.json` | None (plaintext) |
| **Zed** | Extension-managed secure storage | Extension-dependent |

---

## 🧠 Part 3: Architectural Patterns & Anti-Patterns

### ✅ Best Practices Observed

#### **1. Separation of Concerns (Gemini CLI)**
```
~/.gemini/
├── settings.json          # Configuration
└── mcp-oauth-tokens.json  # Secrets (encrypted)
```
**Why Good**: Security boundaries. If config is compromised, tokens remain safe.

#### **2. Hierarchical Config (VS Code)**
```
Precedence:
System → User → Workspace → Project-root
```
**Why Good**: Allows global defaults with project-specific overrides.

#### **3. Extension Vendoring (Claude Code)**
```
~/.claude/mcp.json         # User global
.claude/mcp.json           # Project local
.mcp.json                  # Project root (fallback)
```
**Why Good**: Namespace isolation prevents conflicts.

### ❌ Anti-Patterns Observed

#### **1. God Config Files (Zed)**
```json
{
  "theme": "dark",
  "context_servers": { ... },  // MCP config buried in settings
  "lsp": { ... }
}
```
**Why Bad**: Poor separation of concerns. MCP config is mixed with UI preferences.

#### **2. Plaintext Secrets (Claude Desktop, Windsurf)**
```json
{
  "mcpServers": {
    "github": {
      "env": {
        "GITHUB_TOKEN": "ghp_1234567890..."  // ❌ PLAINTEXT
      }
    }
  }
}
```
**Why Bad**: Violates security principle: **Never store secrets in config files**.

#### **3. Inconsistent Scoping (Various)**
Some tools support both global + project configs but have unclear precedence rules.

---

## 🔬 Part 4: Design Decision Consequences

### Scenario: Adding a GitHub MCP Server

#### **In Gemini CLI**:
```bash
# 1. Edit ~/.gemini/settings.json
# 2. Add to "mcpServers" object
# 3. Run OAuth flow: gemini mcp auth github
# 4. Token stored in ~/.gemini/mcp-oauth-tokens.json
# 5. Restart CLI
```

**Consequences**:
- ✅ Secure token storage
- ✅ Reusable across all projects
- ❌ No per-project customization

#### **In VS Code (Native MCP)**:
```bash
# 1. Command Palette → MCP: Add Server
# 2. Choose "Global" or "Workspace"
# 3. VS Code creates .vscode/mcp.json OR updates user config
# 4. Secrets via Input Variables
# 5. Auto-restart
```

**Consequences**:
- ✅ GUI-driven (easier for non-technical users)
- ✅ Per-workspace customization
- ❌ Secrets management requires Input Variables (extra step)

#### **In Claude Desktop**:
```bash
# 1. Menu → Developer → Edit Config
# 2. Manually add JSON block
# 3. Hardcode API key in config
# 4. Restart app
```

**Consequences**:
- ✅ Simple (single file)
- ❌ Insecure (plaintext secrets)
- ❌ Risk of committing secrets to git

---

## 🎓 Part 5: Lessons for Your TaskMaster CLI

### Strategic Recommendations

#### **Recommendation #1: Adopt Hierarchical Config**
```
Precedence (highest to lowest):
1. Project-root: ./.taskmaster/mcp.json
2. Workspace: ./.taskmaster-workspace.json
3. User-global: ~/.taskmaster/config.json
4. System-wide: /etc/taskmaster/config.json (Linux)
```

**Rationale**: Flexibility for both personal dev and team projects.

#### **Recommendation #2: Separate Secrets from Config**
```
~/.taskmaster/
├── config.json           # Public config
└── tokens.json.enc       # Encrypted tokens (AES-256-GCM)
```

**Rationale**: Follow Gemini CLI's model. Prevents accidental secret leaks.

#### **Recommendation #3: IDE Auto-Discovery**
```typescript
// Implement in TaskMaster CLI
const IDE_CONFIG_PATHS = {
  claude: '~/Library/Application Support/Claude/claude_desktop_config.json',
  cursor: '~/.cursor/mcp.json',
  gemini: '~/.gemini/settings.json',
  vscode: () => execSync('code --locate-extension ms-vscode.mcp').trim(),
  // ... etc
};

async function syncFromIDE(ideName: string) {
  const configPath = IDE_CONFIG_PATHS[ideName];
  const ideConfig = await parseConfig(configPath);
  await importMCPServers(ideConfig.mcpServers);
}
```

**Rationale**: Your stated goal – auto-sync with different IDEs.

#### **Recommendation #4: Support Multiple Config Formats**
```
Read:  JSON, TOML, YAML
Write: JSON (default), TOML (if --format=toml)
```

**Rationale**: Interoperability with Codex (TOML) and LibreChat (YAML).

#### **Recommendation #5: Implement Config Migration**
```bash
taskmaster migrate --from=claude --to=taskmaster
# Reads ~/Library/Application Support/Claude/claude_desktop_config.json
# Converts to ~/.taskmaster/config.json
# Extracts secrets to ~/.taskmaster/tokens.json.enc
```

**Rationale**: Reduces friction for users switching from other tools.

---

## 📊 Part 6: Comparative Analysis Matrix

### Feature Comparison

| Feature | Gemini CLI | Claude Desktop | VS Code | Cursor | Zed | OpenAI Codex |
|---------|-----------|---------------|---------|--------|-----|-------------|
| **Global Config** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Project-Local Config** | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ |
| **Hierarchical Precedence** | ⚠️ (2 levels) | ❌ | ✅ (4 levels) | ⚠️ (2 levels) | ❌ | ⚠️ (2 levels) |
| **Separate Secret Storage** | ✅ | ❌ | ✅ (API) | ❌ | Extension-dependent | ❌ |
| **OS Keychain Integration** | ✅ | ❌ | ✅ | ❌ | Extension-dependent | ❌ |
| **GUI Config Editor** | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ (Extension) |
| **Multi-Format Support** | JSON only | JSON only | JSON only | JSON only | JSON only | TOML |
| **Auto-Discovery** | ❌ | ❌ | ⚠️ (from Claude) | ❌ | ⚠️ (Extensions) | ❌ |
| **Config Sync Across Devices** | ❌ | ❌ | ✅ (Settings Sync) | ❌ | ❌ | ❌ |
| **IntelliSense in Config** | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ |

**Legend**: ✅ Full Support | ⚠️ Partial Support | ❌ Not Supported

---

## 🚨 Part 7: Security Analysis

### Critical Vulnerabilities

#### **High Severity: Plaintext API Keys**
**Affected**: Claude Desktop, Windsurf, some Cursor configs

**Attack Vector**:
```bash
# Attacker with file system access
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json
# Result: Full API keys exposed
```

**Mitigation**:
```typescript
// TaskMaster approach
import { subtle } from 'crypto';

async function encryptToken(token: string, masterKey: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await subtle.encrypt(
    { name: 'AES-GCM', iv },
    masterKey,
    new TextEncoder().encode(token)
  );
  return `${Buffer.from(iv).toString('base64')}:${Buffer.from(encrypted).toString('base64')}`;
}
```

#### **Medium Severity: Config File Injection**
**Affected**: All tools reading JSON without schema validation

**Attack Vector**:
```json
{
  "mcpServers": {
    "malicious": {
      "command": "rm -rf /",  // ❌ No input validation
      "args": ["--no-preserve-root"]
    }
  }
}
```

**Mitigation**:
```typescript
import { z } from 'zod';

const MCPServerSchema = z.object({
  command: z.string().regex(/^[a-zA-Z0-9_\-\/\.]+$/), // Whitelist
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional()
});
```

---

## 🎯 Part 8: Recommendations for MCP Spec Evolution

### Proposed Standard: MCP Config Convention (MCPC)

**Problem**: Current fragmentation makes multi-IDE workflows painful.

**Solution**: Non-binding convention (like XDG Base Directory):

```toml
[mcpc]
version = "1.0"

[mcpc.paths]
# Recommended (not mandatory) locations
global = "~/.config/mcp/config.json"
project = "./.mcp/config.json"
secrets = "~/.config/mcp/secrets.enc"

[mcpc.precedence]
# Suggested order
order = ["project", "workspace", "user", "system"]

[mcpc.security]
# Minimum requirements
token_storage = "encrypted"
allowed_encryption = ["AES-256-GCM", "ChaCha20-Poly1305"]
```

**Benefits**:
- ✅ Guidance for new implementations
- ✅ Doesn't break existing tools
- ✅ Enables cross-tool config migration tools

---

## 📝 Conclusion

### Key Takeaways

1. **MCP Fragmentation Is Intentional Design**
   - Protocol standardizes wire format, not config storage
   - Analogous to HTTP not mandating `.htaccess` location

2. **Fragmentation Drivers Are Legitimate**
   - Existing ecosystem constraints
   - Security model differences
   - Multi-tenant vs single-tenant design

3. **Security Is the Biggest Gap**
   - Many tools store plaintext secrets
   - Only Gemini CLI and VS Code properly encrypt tokens

4. **Your TaskMaster CLI Opportunity**
   - **Differentiate**: Multi-IDE auto-discovery and migration
   - **Secure**: Encrypted token vault (AES-256-GCM)
   - **Flexible**: Support hierarchical configs and multiple formats

### Final Recommendation

**Implement a "Config Adapter" Pattern**:
```typescript
interface IDEConfigAdapter {
  detect(): Promise<boolean>;
  locate(): Promise<string[]>;
  parse(path: string): Promise<MCPConfig>;
  import(): Promise<void>;
}

class ClaudeDesktopAdapter implements IDEConfigAdapter { /* ... */ }
class GeminiCLIAdapter implements IDEConfigAdapter { /* ... */ }
class VSCodeAdapter implements IDEConfigAdapter { /* ... */ }
```

This allows TaskMaster to **read from any IDE** but **write to its own secure, standardized format**.

---

**End of Analysis**

*For implementation guidance, see: `./taskmaster-config-spec.md`*
