# bash-tool: Safe Shell Execution for AI Agents

**Research Date**: 2026-01-22  
**Package**: `bash-tool` (v1.3.9)  
**Dependencies**: `just-bash` (lightweight) or `@vercel/sandbox` (full VM)  
**Compatibility**: Vercel AI SDK v6+

---

## 🎯 Executive Summary

`bash-tool` provides a standardized, secure way for AI agents to execute shell commands and manipulate files. It bridges the gap between an LLM's text output and actual system operations by offering a structured tool interface (`bash`, `readFile`, `writeFile`).

**Key Value Propositions:**
1.  **Safety First**: Defaults to `just-bash`, a simulated, in-memory shell that prevents accidental system damage.
2.  **Full VM Support**: seamlessly upgrades to `@vercel/sandbox` for real execution environments (Node.js, Python, binaries) without code changes.
3.  **Context-Aware**: Automatically populates the tool description with the current working directory and file list, helping the LLM stay grounded.
4.  **Skills System**: Experimental support for loading modular capabilities from `SKILL.md` files.

---

## 🛠️ Core Tools

The package exports a `createBashTool` function that returns a set of tools ready for the AI SDK.

### 1. `bash`
Executes shell commands.
- **Input**: `{ command: string }`
- **Output**: `{ stdout: string, stderr: string, exitCode: number }`
- **Behavior**: Runs in the configured sandbox (`just-bash` or real VM).

### 2. `readFile`
Reads file contents.
- **Input**: `{ path: string }`
- **Output**: File content as string.
- **Error**: Throws if file doesn't exist.

### 3. `writeFile`
Writes content to a file, creating parent directories if needed.
- **Input**: `{ path: string, content: string }`
- **Output**: `{ success: boolean }`

---

## 🚀 Usage Patterns

### Basic Setup (Simulated)
Ideal for simple file manipulations and directory traversal without external dependencies.

```typescript
import { createBashTool } from "bash-tool";
import { ToolLoopAgent, stepCountIs } from "ai";

// 1. Initialize tools with some mock files
const { tools } = await createBashTool({
  files: {
    "package.json": '{"name": "test-app"}',
    "README.md": "# Hello World"
  }
});

// 2. Create Agent
const agent = new ToolLoopAgent({
  model: myModel,
  tools, // { bash, readFile, writeFile }
  stopWhen: stepCountIs(10)
});

// 3. Execute
await agent.generate({ prompt: "Check the package name in package.json" });
```

### Full VM (Production/Heavy Duty)
Use this when you need to run `npm install`, `python scripts`, or compile code. Requires `@vercel/sandbox`.

```typescript
import { createBashTool } from "bash-tool";
import { Sandbox } from "@vercel/sandbox";

// 1. Create a real MicroVM
const vm = await Sandbox.create();

// 2. Bind bash-tool to the VM
const { tools } = await createBashTool({
  sandbox: vm,
  files: { "script.py": "print('Hello from Python')" }
});

// 3. Agent can now execute real code
await agent.generate({ prompt: "Run the python script" });

// 4. Cleanup
await vm.stop();
```

### Uploading Local Context
Pre-load the sandbox with your current project files.

```typescript
const { tools } = await createBashTool({
  uploadDirectory: {
    source: "./src",
    include: "**/*.ts",  // Glob pattern
    exclude: "**/*.test.ts"
  }
});
```

---

## ⚙️ Advanced Capabilities

### Command Interception (Hooks)
You can inspect or modify commands *before* they run, and sanitize output *after*.

```typescript
const { tools } = await createBashTool({
  onBeforeBashCall: ({ command }) => {
    // Security Gate
    if (command.includes("rm -rf /")) {
      throw new Error("Dangerous command blocked");
    }
    console.log(`[Agent Executing]: ${command}`);
  },
  onAfterBashCall: ({ result }) => {
    // Log output length
    console.log(`[Output Size]: ${result.stdout.length} chars`);
    return undefined; // Return modified result if needed
  }
});
```

### Persistent Sandboxes
For serverless environments (like Next.js API routes), you can reconnect to an existing sandbox instance to maintain state across HTTP requests.

```typescript
// Request 1: Init
const vm = await Sandbox.create();
const id = vm.sandboxId; // Return to client

// Request 2: Resume
const vm = await Sandbox.get({ sandboxId: id });
const { tools } = await createBashTool({ sandbox: vm });
```

---

## 🧩 The "Skills" System (Experimental)

`bash-tool` introduces a standardized way to package capabilities as "Skills".

**Structure:**
```
skills/
  git-helper/
    SKILL.md      # Instructions & Frontmatter
    scripts/      # Optional helper scripts
      status.sh
```

**Loading Skills:**
```typescript
import { experimental_createSkillTool } from "bash-tool";

const { skill, files, instructions } = await experimental_createSkillTool({
  skillsDirectory: "./my-skills"
});

// The 'skill' tool allows the agent to explicitly "activate" a skill,
// receiving its instructions dynamically.
```

---

## ⚠️ Important Limitations

1.  **`just-bash` Limitations**: The default simulated shell DOES NOT support:
    *   Binaries (`node`, `git`, `python`, `npm`)
    *   Pipes (`|`) or complex redirects (some support exists but limited)
    *   Network requests (curl, wget)
    *   *Solution*: Use `@vercel/sandbox` for these features.

2.  **File Types**: `files` option currently accepts strings only (text files). Binary uploads require the `uploadDirectory` or custom handling.

3.  **Streaming**: Command output is returned strictly after completion. Long-running commands will block the agent.

---

## 🎓 Recommendation for TaskMaster

**Adoption Strategy:**
1.  **Use `bash-tool`** as the standard interface for all shell execution within TaskMaster agents.
2.  **Default to `just-bash`** for "Read-Only" or "Safe" modes where the agent only needs to explore the codebase.
3.  **Upgrade to `@vercel/sandbox`** (or a local Docker container wrapper implementing the `Sandbox` interface) when the user authorizes "Execution Mode" (running tests, builds, etc.).
4.  **Leverage Hooks**: Implement `onBeforeBashCall` to add a "Human-in-the-loop" approval step for high-risk commands (`rm`, `mv`, `git push`).

---

**End of Research**
