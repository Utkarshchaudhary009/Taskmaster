# MCP Configuration Quick Reference Guide

**Quick Lookup Table for Accessing MCP Configurations**

## 🗺️ Configuration File Locations

### Desktop Applications

#### Claude Desktop
| OS | Path |
|----|------|
| Windows | `%APPDATA%\Claude\claude_desktop_config.json`<br>`C:\Users\[USERNAME]\AppData\Roaming\Claude\claude_desktop_config.json` |
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Linux | `~/.config/Claude/claude_desktop_config.json` |

**Access**: Menu → Developer → Edit Config

---

#### Zed Editor
| OS | Path |
|----|------|
| Windows | `C:\Users\<UserName>\AppData\Roaming\Zed\settings.json` |
| macOS | `~/.config/zed/settings.json` |
| Linux | `~/.config/zed/settings.json` |

**Access**: Press `ctrl-alt-,` (Windows/Linux) or `⌘-,` (macOS)  
**Note**: MCP config is nested under `"context_servers"` object

---

#### Windsurf IDE
| OS | Path |
|----|------|
| Windows | `%USERPROFILE%\.codeium\windsurf\mcp_config.json` |
| macOS | `~/.codeium/windsurf/mcp_config.json` |
| Linux | `~/.codeium/windsurf/mcp_config.json` |
| Linux (Flatpak) | `~/.var/app/com.codeium.windsurf/config/Codeium/Windsurf/mcp_config.json` |

**Access**: Windsurf Settings → Advanced Settings → View Raw JSON Config

---

### VS Code & Extensions

#### VS Code Native MCP
| Scope | Path |
|-------|------|
| User Global | Open via Command Palette: `MCP: Open User Configuration` |
| Workspace | `.vscode/mcp.json` (in workspace root) |
| Project Root | `.mcp.json` |

**Access**: Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) → `MCP: Open User Configuration`

---

#### Cline Extension (VS Code)
| OS | Path |
|----|------|
| Windows | `%APPDATA%\Code\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json` |
| macOS | `~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json` |
| Linux | `~/.config/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json` |

**Note**: Located in VS Code's `globalStorage`, not standard settings

---

#### Continue Extension (VS Code)
| Scope | Path |
|-------|------|
| Workspace | `.vscode/mcp.json` |

**Access**: Workspace-specific configuration only

---

### Code Editors (Fork-based)

#### Cursor
| Scope | Path |
|-------|------|
| User Global (Windows) | `%USERPROFILE%\.cursor\mcp.json` |
| User Global (macOS/Linux) | `~/.cursor/mcp.json` |
| Project Local | `<project>/.cursor/mcp.json` |

**Note**: Inherits VS Code patterns but isolated from VS Code settings

---

### CLI Tools

#### Gemini CLI
| Scope | Path |
|-------|------|
| User Global (Windows) | `%USERPROFILE%\.gemini\settings.json` |
| User Global (macOS/Linux) | `~/.gemini/settings.json` |
| System-wide (Linux) | `/etc/gemini-cli/settings.json` |
| System-wide (Windows) | `C:\ProgramData\gemini-cli\settings.json` |
| System-wide (macOS) | `/Library/Application Support/GeminiCli/settings.json` |

**Token Storage**: `~/.gemini/mcp-oauth-tokens.json` (encrypted)

---

#### OpenAI Codex
| Scope | Path |
|-------|------|
| User Global | `~/.codex/config.toml` |
| Project Root | `.mcp.json` |

**Access**: 
- CLI: Modify via `codex mcp` commands
- IDE Extension: Gear Icon → Codex Settings → Open config.toml

**Note**: Uses TOML format instead of JSON

---

#### mcp-cli
| Scope | Path |
|-------|------|
| User Global | `~/.config/mcp/mcp_servers.json` |
| Current Directory | `./mcp_servers.json` |

**Precedence**: Current directory > User global

---

### Other AI Tools

#### LibreChat
| Scope | Path |
|-------|------|
| Application Root | `librechat.yaml` |

**Note**: Uses YAML format

---

## 🔐 Secret Storage Locations

| Tool | Token Location | Encryption |
|------|---------------|------------|
| Gemini CLI | `~/.gemini/mcp-oauth-tokens.json` | ✅ OS Keychain (AES-256) |
| VS Code | Built-in Secret Storage API | ✅ OS Credential Manager |
| Claude Desktop | Embedded in config file | ❌ Plaintext |
| Cursor | Embedded in config file | ❌ Plaintext |
| Windsurf | Embedded in config file | ❌ Plaintext |
| Zed | Extension-managed | Depends on extension |
| Codex | Embedded in `config.toml` | ❌ Plaintext |

---

## ⚙️ Configuration Format Examples

### JSON Format (Most Common)
```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "YOUR_TOKEN_HERE"
      }
    }
  }
}
```

**Used by**: Claude Desktop, Cursor, VS Code, Cline, Gemini CLI, Windsurf

---

### TOML Format
```toml
[mcp.servers.github]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-github"]

[mcp.servers.github.env]
GITHUB_TOKEN = "YOUR_TOKEN_HERE"
```

**Used by**: OpenAI Codex

---

### YAML Format
```yaml
mcpServers:
  github:
    command: npx
    args:
      - "-y"
      - "@modelcontextprotocol/server-github"
    env:
      GITHUB_TOKEN: YOUR_TOKEN_HERE
```

**Used by**: LibreChat

---

### Nested in Settings.json (Zed)
```json
{
  "theme": "Ayu Dark",
  "ui_font_size": 16,
  "context_servers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"]
    }
  }
}
```

**Used by**: Zed Editor

---

## 🔄 How to Migrate Configs Between Tools

### From Claude Desktop → Gemini CLI
```bash
# 1. Locate Claude config
# Windows: %APPDATA%\Claude\claude_desktop_config.json
# macOS: ~/Library/Application Support/Claude/claude_desktop_config.json

# 2. Copy mcpServers object to ~/.gemini/settings.json
# 3. Extract secrets and run: gemini mcp auth <provider>
```

### From Cursor → VS Code
```bash
# 1. Copy ~/.cursor/mcp.json
# 2. Paste to .vscode/mcp.json in workspace
# 3. Or add to VS Code user settings via Command Palette
```

### From Gemini CLI → TaskMaster (Future)
```bash
# Proposed TaskMaster command
taskmaster import --from=gemini --merge
```

---

## 🚀 Quick Commands

| Tool | Open Config Command |
|------|---------------------|
| Claude Desktop | Menu → Developer → Edit Config |
| VS Code | `Ctrl+Shift+P` → `MCP: Open User Configuration` |
| Zed | `Ctrl+Alt+,` (Windows/Linux)<br>`⌘+,` (macOS) |
| Gemini CLI | `code ~/.gemini/settings.json` (or your editor) |
| Cursor | `code ~/.cursor/mcp.json` |
| Codex | IDE: Gear → Codex Settings → Open config.toml<br>CLI: `code ~/.codex/config.toml` |

---

## ⚠️ Security Best Practices

### ❌ DON'T
```json
{
  "mcpServers": {
    "github": {
      "env": {
        "GITHUB_TOKEN": "ghp_real_token_here"  // ❌ Never hardcode
      }
    }
  }
}
```

### ✅ DO (VS Code Input Variables)
```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "${input:githubToken}"
      }
    }
  }
}
```

### ✅ DO (Gemini CLI OAuth)
```bash
# 1. Configure in settings.json without token
# 2. Authenticate separately
gemini mcp auth github

# Token is stored encrypted in ~/.gemini/mcp-oauth-tokens.json
```

---

## 📚 Additional Resources

- **MCP Specification**: https://spec.modelcontextprotocol.io/
- **Gemini CLI Docs**: https://geminicli.com/
- **VS Code MCP Guide**: https://code.visualstudio.com/docs/
- **Full Analysis**: See `mcp-config-fragmentation-analysis.md`

---

**Last Updated**: 2026-01-22  
**Maintained by**: TaskMaster CLI Research Team
