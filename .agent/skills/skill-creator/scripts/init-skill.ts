#!/usr/bin/env bun

/**
 * Skill Initializer
 * 
 * Creates a new skill template following agentskills.io standard
 * with Bun + TypeScript optimizations.
 */

import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

interface InitOptions {
    name: string;
    path: string;
    includeScripts?: boolean;
    includeReferences?: boolean;
    includeAssets?: boolean;
}

class SkillInitializer {
    async init(options: InitOptions): Promise<void> {
        const { name, path, includeScripts = true, includeReferences = true, includeAssets = true } = options;

        // Validate skill name
        if (!/^[a-z0-9-]{1,64}$/.test(name)) {
            throw new Error(`Invalid skill name: "${name}". Use lowercase, alphanumeric, and hyphens only (1-64 chars)`);
        }

        const skillDir = join(path, name);

        // Create directories
        await mkdir(skillDir, { recursive: true });
        if (includeScripts) await mkdir(join(skillDir, 'scripts'), { recursive: true });
        if (includeReferences) await mkdir(join(skillDir, 'references'), { recursive: true });
        if (includeAssets) await mkdir(join(skillDir, 'assets'), { recursive: true });

        // Create SKILL.md template
        const skillMd = this.generateSkillTemplate(name);
        await writeFile(join(skillDir, 'SKILL.md'), skillMd);

        // Create example script
        if (includeScripts) {
            const exampleScript = this.generateExampleScript(name);
            await writeFile(join(skillDir, 'scripts', 'example.ts'), exampleScript);
        }

        // Create example reference
        if (includeReferences) {
            const exampleRef = this.generateExampleReference(name);
            await writeFile(join(skillDir, 'references', 'example.md'), exampleRef);
        }

        // Create example asset
        if (includeAssets) {
            const exampleAsset = 'This is an example asset file. Replace with actual templates or binary files.';
            await writeFile(join(skillDir, 'assets', 'example.txt'), exampleAsset);
        }

        console.log(`\n✅ Skill "${name}" initialized successfully!\n`);
        console.log(`📁 Location: ${skillDir}\n`);
        console.log('📋 Next steps:');
        console.log('  1. Edit SKILL.md frontmatter (name and description)');
        console.log('  2. Implement scripts/ if needed');
        console.log('  3. Add references/ for documentation');
        console.log('  4. Delete unused example files');
        console.log(`  5. Validate: bun run validate-skill.ts ${skillDir}`);
        console.log(`  6. Package: bun run package-skill.ts ${skillDir}\n`);
    }

    private generateSkillTemplate(name: string): string {
        return `---
name: ${name}
description: TODO - Describe what this skill does and when to use it. Include trigger keywords like "review", "deploy", "audit". Be comprehensive but concise.
---

# ${this.toTitleCase(name)}

TODO - Brief identity statement
You are an expert in X, specializing in Y...

## Core Capabilities

1. TODO - Capability A
2. TODO - Capability B
3. TODO - Capability C

## Workflow / Instructions

### Step 1: TODO - First Action

TODO - Clear directive in imperative form

\`\`\`bash
# Example command
bun run scripts/example.ts
\`\`\`

### Step 2: TODO - Next Action

TODO - Continue workflow...

## Quick Commands

| Task | Command |
|------|---------|
| Do X | \`bun run scripts/example.ts\` |

## Guardrails

- **Never** TODO - unsafe action
- **Always** TODO - safety check
- **Always** ask confirmation for destructive operations

## Advanced

For complex scenarios, see [references/example.md](references/example.md)

---

**Output**: TODO - Define expected output format
`;
    }

    private generateExampleScript(name: string): string {
        return `#!/usr/bin/env bun

/**
 * Example Script for ${name} skill
 * 
 * TODO: Describe what this script does
 */

interface ScriptResult {
  success: boolean;
  message: string;
  data?: unknown;
}

async function main(): Promise<ScriptResult> {
  try {
    // TODO: Implement script logic
    
    console.log('✅ Success: Task completed');
    
    return {
      success: true,
      message: 'Operation completed successfully'
    };
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
    
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// CLI Execution
if (import.meta.main) {
  const result = await main();
  
  console.log('\n📊 JSON Output:\n');
  console.log(JSON.stringify(result, null, 2));
  
  process.exit(result.success ? 0 : 1);
}

export { main };
`;
    }

    private generateExampleReference(name: string): string {
        return `# ${this.toTitleCase(name)} - Reference Documentation

TODO: Add detailed reference material here.

## Section 1

TODO: Content

## Section 2

TODO: Content

## Examples

TODO: Add examples
`;
    }

    private toTitleCase(str: string): string {
        return str
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }
}

// CLI Execution
if (import.meta.main) {
    const args = process.argv.slice(2);
    const name = args[0];
    const pathArg = args.find(arg => arg.startsWith('--path='));
    const path = pathArg ? pathArg.split('=')[1] : '.agent/skills';

    if (!name) {
        console.error('❌ Usage: bun run init-skill.ts <skill-name> [--path=<output-path>]');
        console.error('\nExample: bun run init-skill.ts my-awesome-skill --path=.agent/skills');
        process.exit(1);
    }

    const initializer = new SkillInitializer();
    await initializer.init({ name, path });
}

export { SkillInitializer };
`;
  }

  private toTitleCase(str: string): string {
    return str
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}

// CLI Execution
if (import.meta.main) {
  const args = process.argv.slice(2);
  const name = args[0];
  const pathArg = args.find(arg => arg.startsWith('--path='));
  const path = pathArg ? pathArg.split('=')[1] : '.agent/skills';

  if (!name) {
    console.error('❌ Usage: bun run init-skill.ts <skill-name> [--path=<output-path>]');
    console.error('\nExample: bun run init-skill.ts my-awesome-skill --path=.agent/skills');
    process.exit(1);
  }

  const initializer = new SkillInitializer();
  await initializer.init({ name, path });
}

export { SkillInitializer };
