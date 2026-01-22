# Agent Skills Framework - Deep Research

> **Research Objective**: Understand how to write the best skills for AI agents by studying agentskills.io standard, Gemini-CLI implementation, and Antigravity's skill system.
>
> **Key Distinction**: Skills are different from Rules (`.gemini/GEMINI.md` or `.agent/AGENT.md`), MCP servers, and Agent personas. Skills are **on-demand, specialized expertise packages** that agents activate dynamically.

---

## Table of Contents

1. [What Are Agent Skills?](#what-are-agent-skills)
2. [The AgentSkills.io Standard](#the-agentskillsio-standard)
3. [Gemini-CLI Implementation](#gemini-cli-implementation)
4. [Antigravity Implementation](#antigravity-implementation)
5. [Core Principles of Excellent Skills](#core-principles-of-excellent-skills)
6. [Skill Structure & Anatomy](#skill-structure--anatomy)
7. [Progressive Disclosure Pattern](#progressive-disclosure-pattern)
8. [Best Practices](#best-practices)
9. [Common Patterns & Anti-Patterns](#common-patterns--anti-patterns)
10. [Skill Creation Workflow](#skill-creation-workflow)
11. [Comparative Analysis](#comparative-analysis)

---

## What Are Agent Skills?

### Definition

Agent Skills are **modular, self-contained packages** that extend an AI agent's capabilities with:
- Specialized knowledge
- Procedural workflows
- Domain expertise
- Tool integrations
- Bundled resources (scripts, references, assets)

### Key Characteristics

1. **On-Demand Activation**: Unlike system prompts or rules that are always active, skills are **progressively disclosed**—loaded only when relevant
2. **Context-Efficient**: Only metadata (name + description) is loaded initially; full content loads upon activation
3. **Portable & Reusable**: Can be shared across projects, teams, and even different agent platforms
4. **Interoperable**: Works across Claude, Copilot, Cursor, Gemini-CLI, and other tools supporting the standard

### Skills vs. Other Agent Configurations

| Concept | Purpose | Scope | Loading |
|---------|---------|-------|---------|
| **Skills** | On-demand expertise | Task-specific, narrow | Progressive (metadata → body → resources) |
| **Rules/AGENT.md** | Persistent behavior | Workspace-wide, always active | Always loaded |
| **MCP Servers** | External tool integration | Function calls, data access | API-based invocation |
| **Agent Persona** | Identity & communication style | Global behavior | Always loaded |

---

## The AgentSkills.io Standard

### Core Specification

[agentskills.io](https://agentskills.io) defines the **open format** for agent skills. Key principles:

#### 1. **Minimal Structure Requirements**

```
skill-folder/
├── SKILL.md          (Required)
│   ├── YAML frontmatter
│   │   ├── name:        (required)
│   │   └── description: (required)
│   └── Markdown body
└── Optional Resources
    ├── scripts/      (Executable code)
    ├── references/   (Documentation to load)
    └── assets/       (Files used in output)
```

#### 2. **Progressive Disclosure Mechanism**

```
Level 1: Metadata (name + description) → Always in context (~100 words)
Level 2: SKILL.md body               → When skill triggers (<5k words)
Level 3: Bundled resources           → As needed by agent
```

#### 3. **Naming Conventions**

- **Lowercase, alphanumeric, hyphens only** (e.g., `plan-mode`, `api-auditor`)
- **Must match folder name** exactly
- **1-64 characters** maximum
- **Verb-led phrases** preferred (e.g., `deploy-to-aws`, `review-code`)

#### 4. **Description Best Practices**

The `description` field is **the primary triggering mechanism**. Include:
- **What** the skill does
- **When** to use it (trigger words: "review," "deploy," "migrate," "audit")
- **Domain context** (e.g., "for Next.js apps," "BigQuery analytics")

**Example**:
```yaml
description: Data ingestion, cleaning, and transformation for tabular data. Use when working with CSV/TSV files to analyze large datasets, normalize schemas, or merge sources.
```

---

## Gemini-CLI Implementation

### Architecture Overview

Gemini-CLI implements the agentskills.io standard with additional features:

#### Discovery Tiers (Precedence Order)

1. **Built-in Skills** (lowest) → Core skills bundled with CLI
2. **Extension Skills** → From installed extensions
3. **User Skills** (`~/.gemini/skills/`) → Personal, cross-project skills
4. **Workspace Skills** (`.gemini/skills/`) → Project-specific, version-controlled

**Override Rule**: Higher-precedence locations override lower ones (Workspace > User > Extension > Built-in).

#### Skill Manager (`skillManager.ts`)

```typescript
export interface SkillDefinition {
  name: string;
  description: string;
  location: string;  // Absolute path to SKILL.md
  body: string;      // Markdown content below frontmatter
  disabled?: boolean;
  isBuiltin?: boolean;
}
```

**Key Methods**:
- `discoverSkills()` - Scans all tiers, applies precedence
- `activate_skill(name)` - Tool called by model to load skill
- `setDisabledSkills()` - User can disable specific skills

#### Skill Loader (`skillLoader.ts`)

**Frontmatter Parsing**:
- YAML-first with fallback to simple key-value parser
- Handles multi-line descriptions with indentation

**Example SKILL.md**:
```markdown
---
name: api-auditor
description: Expertise in auditing and testing API endpoints. Use when the user asks to "check", "test", or "audit" a URL or API.
---

# API Auditor Instructions

You act as a QA engineer specialized in API reliability...
```

#### Built-in Skill: `skill-creator`

Gemini-CLI includes a **meta-skill** for creating skills. Key features:
- **7-step workflow**: Understand → Plan → Initialize → Edit → Package → Install → Iterate
- **Bundled scripts**:
  - `init_skill.cjs` - Generates skill template
  - `validate_skill.cjs` - Checks YAML, naming, TODOs
  - `package_skill.cjs` - Creates `.skill` zip file
- **Progressive references**:
  - `references/workflows.md` - Multi-step process patterns
  - `references/output-patterns.md` - Template and example patterns

---

## Antigravity Implementation

### Integration with Antigravity IDE

Antigravity skills follow the same standard but with enhanced IDE integration:

#### Key Features

1. **Visual Activation UI**: Clear consent prompts when skills activate
2. **Skill Suggestions**: IDE recommends skills based on workspace context
3. **Multi-Framework Support**: Organized by variant (e.g., `aws.md`, `gcp.md`, `azure.md`)
4. **Security Sandboxing**: Scripts run with explicit user consent and logging

#### Best Practices (Antigravity-Specific)

From web research and documentation:

1. **Set Appropriate Degrees of Freedom**:
   - **High freedom** (text): Multiple valid approaches (e.g., "review for security")
   - **Medium freedom** (pseudocode): Preferred patterns with variation
   - **Low freedom** (specific scripts): Fragile operations requiring exact steps

2. **Clear Identity Definition**:
   ```markdown
   You are an expert code reviewer specializing in React security...
   ```

3. **Error Planning**:
   - Anticipate failure modes
   - Provide actionable recovery steps
   - Avoid silent failures

4. **Guardrails & Boundaries**:
   - Define what agent should **never** interact with (secrets, vendor dirs, prod configs)
   - Use `references/` for sensitive schemas or policies

5. **Structured Output**:
   - Prompt for JSON when passing data between tools
   - Improves token efficiency and parsing reliability

---

## Core Principles of Excellent Skills

### 1. **Concise is Key**

> "The context window is a public good."

- **Default assumption**: Gemini/Antigravity is already very smart
- **Only add context the agent doesn't already have**
- **Challenge each paragraph**: "Does this justify its token cost?"
- **Prefer examples over explanations**

**Anti-Pattern**:
```markdown
# CSV Processing

CSV files are comma-separated value files commonly used for data storage.
They were first standardized in... [250 words of history]
```

**Best Practice**:
```markdown
# CSV Processing

Use pandas for analysis. For files >1GB, see [STREAMING.md](STREAMING.md).
```

### 2. **Match Specificity to Fragility**

| Task Type | Specificity Level | Format |
|-----------|-------------------|--------|
| Heuristic decisions (code review) | **High freedom** | Text instructions |
| Preferred patterns (API design) | **Medium freedom** | Pseudocode + parameters |
| Fragile operations (DB migration) | **Low freedom** | Exact scripts |

### 3. **Progressive Disclosure**

- **SKILL.md body**: < 500 lines (split if approaching)
- **References**: For detailed docs, schemas, API specs
- **Assets**: For templates, boilerplate, binary files

**Pattern Example**:
```markdown
# BigQuery Skill

## Quick Start
[Basic query examples]

## Advanced
- **Sales metrics**: See [sales.md](references/sales.md)
- **Finance schemas**: See [finance.md](references/finance.md)
```

Agent loads `sales.md` **only** when user asks about sales.

---

## Skill Structure & Anatomy

### Required: SKILL.md

#### YAML Frontmatter

```yaml
---
name: skill-name
description: What the skill does and when to use it. Include trigger words like "deploy," "review," or "audit." Be comprehensive but concise.
---
```

**Rules**:
- `name`: Lowercase, alphanumeric, hyphens (1-64 chars)
- `description`: Single-line string (quotes optional)
- **No other fields** (keep minimal)

#### Markdown Body

```markdown
# Skill Title

## When to Use (Optional - already in description)

## How to Use

1. Step-by-step workflow
2. Reference bundled resources: "Use `scripts/rotate.cjs`"
3. Link to references: "See [API docs](references/api.md)"

## Examples

```bash
# Example command
node scripts/audit.js https://example.com
```
```

**Guidelines**:
- **Imperative/infinitive form** (e.g., "Run the script," not "You should run")
- **No README.md, CHANGELOG.md, or auxiliary docs** (agent doesn't need them)
- **Under 500 lines** (split into references if longer)

### Optional: scripts/

**Purpose**: Executable code for deterministic, repeatable tasks.

**When to Include**:
- Same code is rewritten repeatedly
- Deterministic reliability needed (e.g., PDF rotation, image resizing)
- Task is fragile or error-prone

**Agentic Ergonomics**:
- **LLM-friendly stdout**: Clear success/failure messages
- **No verbose tracebacks**: Suppress or simplify errors
- **Pagination**: "First 50 lines of output..." (prevent context overflow)

**Example** (`scripts/audit.js`):
```javascript
const url = process.argv[2];
if (!url) {
  console.error('Usage: node audit.js <url>');
  process.exit(1);
}

console.log(`Auditing ${url}...`);
fetch(url, { method: 'HEAD' })
  .then(r => console.log(`✅ Success (Status ${r.status})`))
  .catch(e => console.error(`❌ Failed: ${e.message}`));
```

### Optional: references/

**Purpose**: Documentation to load **as needed** into context.

**Use Cases**:
- Database schemas
- API documentation
- Company policies
- Detailed workflow guides
- Domain knowledge

**Organization Patterns**:

1. **Domain-specific**:
   ```
   bigquery/
   └── references/
       ├── finance.md
       ├── sales.md
       └── product.md
   ```

2. **Framework variants**:
   ```
   cloud-deploy/
   └── references/
       ├── aws.md
       ├── gcp.md
       └── azure.md
   ```

**Best Practices**:
- **Avoid duplication**: Info should live in SKILL.md **OR** references, not both
- **Table of contents**: For files >100 lines, add TOC at top
- **One level deep**: Don't nest references within references

### Optional: assets/

**Purpose**: Files used **in output**, not loaded into context.

**Examples**:
- `logo.png` - Brand assets
- `template.pptx` - PowerPoint templates
- `frontend-template/` - HTML/React boilerplate
- `nda-template.pdf` - Legal documents

**Key Distinction**:
- **References**: Agent **reads** them
- **Assets**: Agent **uses** them (copy, modify, reference in output)

---

## Progressive Disclosure Pattern

### Three-Level Loading System

```
┌─────────────────────────────────────────────────────────────┐
│ Level 1: Metadata (ALWAYS)                                  │
│ - name: "api-auditor"                                       │
│ - description: "Expertise in auditing..."                   │
│ - Cost: ~20 tokens                                          │
└─────────────────────────────────────────────────────────────┘
                           ↓ (skill triggered)
┌─────────────────────────────────────────────────────────────┐
│ Level 2: SKILL.md Body (ON ACTIVATION)                      │
│ - Full markdown instructions                                │
│ - Directory tree of bundled resources                       │
│ - Cost: ~500-5000 tokens                                    │
└─────────────────────────────────────────────────────────────┘
                           ↓ (agent needs more detail)
┌─────────────────────────────────────────────────────────────┐
│ Level 3: Bundled Resources (AS NEEDED)                      │
│ - read references/finance.md                                │
│ - execute scripts/rotate.cjs                                │
│ - Cost: Variable (unlimited for scripts via execution)      │
└─────────────────────────────────────────────────────────────┘
```

### Pattern Implementations

#### Pattern 1: High-Level Guide

```markdown
# PDF Processing

## Quick Start
Extract text with pdfplumber: [code example]

## Advanced
- **Form filling**: See [FORMS.md](references/FORMS.md)
- **API reference**: See [REFERENCE.md](references/REFERENCE.md)
```

Agent loads references **only when needed**.

#### Pattern 2: Conditional Details

```markdown
# CSV Processing

## Basic
Use pandas. See [PANDAS.md](references/PANDAS.md).

## Advanced
For huge files, see [STREAMING.md](references/STREAMING.md).
For timezones, see [TIMESTAMPS.md](references/TIMESTAMPS.md).
```

#### Pattern 3: Multi-Domain Organization

```markdown
# Company Analytics

**Finance**: See [finance.md](references/finance.md)
**Sales**: See [sales.md](references/sales.md)
```

When user asks about sales, agent reads **only** `sales.md`.

---

## Best Practices

### Content Quality

1. **Show, Don't Tell**
   - ✅ `const user = await db.users.findUnique({ where: { id } })`
   - ❌ "First, query the database to retrieve the user..."

2. **Imperative Voice**
   - ✅ "Run the audit script with `node scripts/audit.js`"
   - ❌ "You should consider running the audit script"

3. **Early Commands**
   - Place executable commands **early** in the skill description
   - Agent can start executing while reading full instructions

4. **Specific Parameter Names**
   - ✅ `user_id`, `customer_email`
   - ❌ `user`, `email` (ambiguous)

### Context Management

5. **Avoid Generic Explanations**
   - Don't explain what CSV files are (agent knows)
   - **Do** explain your company's specific CSV schema conventions

6. **Use Markdown Structure**
   - Headers, lists, code blocks for scannability
   - Agent can preview structure before reading

7. **Explicit Boundaries**
   - "Never modify files in `vendor/`, `.env`, or `node_modules/`"
   - "Always ask for confirmation before deploying to production"

### Skill Organization

8. **Single Responsibility**
   - Each skill should do **one thing well**
   - Prefer multiple narrow skills over one broad skill

9. **Namespace by Tool** (when clarity improves)
   - `gh-address-comments` (GitHub-specific)
   - `linear-address-issue` (Linear-specific)

10. **Version Control Integration**
    - Commit workspace skills (`.gemini/skills/`) to Git
    - Share with team via version control

---

## Common Patterns & Anti-Patterns

### ✅ Excellent Patterns

#### 1. **Workflow Skills**

```markdown
---
name: pr-review
description: Code review workflow for pull requests. Use when reviewing PRs or when user asks for "feedback" or "review."
---

# PR Review Workflow

1. **Analyze**: Read staged changes
2. **Style**: Check against workspace conventions (see GEMINI.md)
3. **Security**: Flag vulnerabilities
4. **Tests**: Verify test coverage

Output:
- **Strengths**: [bulleted list]
- **Opportunities**: [bulleted list]
```

#### 2. **Tool Integration Skills**

```markdown
---
name: pdf-editor
description: PDF manipulation using bundled scripts. Use when rotating, merging, or editing PDFs.
---

# PDF Editor

Rotate PDF:
```bash
node scripts/rotate_pdf.cjs <file> <degrees>
```

Merge PDFs:
```bash
node scripts/merge_pdfs.cjs <file1> <file2> -o output.pdf
```
```

#### 3. **Domain Knowledge Skills**

```markdown
---
name: company-bigquery
description: Query company BigQuery schemas. Use when analyzing revenue, users, or sales data.
---

# Company BigQuery

## Schemas
See [references/schema.md](references/schema.md)

## Common Queries

Revenue this month:
```sql
SELECT SUM(amount) FROM revenue WHERE month = CURRENT_MONTH()
```
```

### ❌ Anti-Patterns

#### 1. **Bloated Documentation**

```markdown
# History of CSV Files

CSV files were invented in the 1970s and have been used for...
[500 lines of unnecessary context]
```

**Fix**: Delete. Agent already knows general concepts.

#### 2. **Auxiliary Files**

```
skill/
├── SKILL.md
├── README.md         ❌ Agent doesn't need this
├── INSTALLATION.md   ❌ Not for agent
├── CHANGELOG.md      ❌ Not for agent
```

**Fix**: Only include files agent will **use**.

#### 3. **Overly Broad Scope**

```markdown
---
name: fullstack-developer
description: Expert in frontend, backend, databases, DevOps, and all programming languages.
---
```

**Fix**: Split into focused skills (`react-components`, `postgres-optimization`, etc.)

#### 4. **Vague Descriptions**

```yaml
description: Helps with coding tasks.
```

**Fix**: Be specific about **what** and **when**:
```yaml
description: React component creation following Atomic Design principles. Use when scaffolding UI components or refactoring component hierarchies.
```

#### 5. **Nested References**

```markdown
# Skill

See [advanced.md](references/advanced.md)

# references/advanced.md
See [super-advanced.md](references/super-advanced.md)
```

**Fix**: Keep references one level deep from SKILL.md.

---

## Skill Creation Workflow

### Gemini-CLI 7-Step Process

#### Step 1: Understand with Examples

**Goal**: Clarify concrete use cases.

**Questions to Ask**:
- "What functionality should this skill support?"
- "Can you give examples of how this would be used?"
- "What would trigger this skill?"

**Avoid**: Interrogation loops (max 1-2 questions at a time)

**Output**: List of 3-5 concrete examples

---

#### Step 2: Plan Reusable Contents

**Goal**: Identify what to bundle in `scripts/`, `references/`, `assets/`.

**For Each Example, Ask**:
1. What code gets rewritten repeatedly? → `scripts/`
2. What knowledge needs to be referenced? → `references/`
3. What templates/files are used in output? → `assets/`

**Example**:
- **Task**: "Build me a todo app"
- **Analysis**: Need HTML/React boilerplate each time
- **Decision**: Create `assets/hello-world/` with template project

---

#### Step 3: Initialize the Skill

**Use `init_skill.cjs` script**:

```bash
node ~/.gemini/skills/skill-creator/scripts/init_skill.cjs my-skill --path .gemini/skills
```

**Generates**:
```
my-skill/
├── SKILL.md           (Template with TODOs)
├── scripts/
│   └── example_script.cjs
├── references/
│   └── example_reference.md
└── assets/
    └── example_asset.txt
```

---

#### Step 4: Edit the Skill

**Implement the Contents**:
1. **Create scripts**: Test by running them
2. **Add references**: Copy domain knowledge, schemas, APIs
3. **Include assets**: Add templates, images, boilerplate
4. **Delete unused examples**: Remove example files not needed

**Write SKILL.md**:
- **Frontmatter**: Update `name` and `description`
- **Body**: Instructions for using bundled resources
- **Consult patterns**: See `references/workflows.md`, `references/output-patterns.md`

---

#### Step 5: Package the Skill

**Validate & Package**:

```bash
node ~/.gemini/skills/skill-creator/scripts/package_skill.cjs .gemini/skills/my-skill
```

**Checks**:
- ✅ YAML frontmatter valid
- ✅ Name matches folder
- ✅ Description comprehensive
- ✅ No TODOs remaining

**Output**: `my-skill.skill` (zip file with `.skill` extension)

---

#### Step 6: Install and Reload

**Install**:
```bash
# Workspace scope
gemini skills install my-skill.skill --scope workspace

# User scope (cross-project)
gemini skills install my-skill.skill --scope user
```

**Reload**:
User must manually run in interactive session:
```
/skills reload
/skills list
```

---

#### Step 7: Iterate

**Test in Real Usage**:
1. Activate skill on actual task
2. Notice struggles or inefficiencies
3. Update SKILL.md or bundled resources
4. Repackage and reinstall
5. Repeat

---

## Comparative Analysis

### agentskills.io vs. Gemini-CLI vs. Antigravity

| Feature | agentskills.io | Gemini-CLI | Antigravity |
|---------|----------------|------------|-------------|
| **Standard Compliance** | Defines spec | ✅ Fully compliant | ✅ Fully compliant |
| **Discovery Tiers** | Not specified | 4 tiers (built-in, extension, user, workspace) | User + workspace |
| **Packaging Format** | Not specified | `.skill` zip file | `.skill` zip file |
| **Validation Tools** | Not specified | `validate_skill.cjs` | IDE-integrated validation |
| **Progressive Loading** | ✅ Core principle | ✅ Implemented | ✅ Implemented |
| **Meta-Skill** | Not specified | `skill-creator` built-in | Likely built-in |
| **IDE Integration** | Platform-agnostic | CLI-based | Deep IDE integration |
| **Consent UI** | Not specified | CLI prompts | Visual IDE prompts |
| **Script Sandboxing** | Security guidance | User approval required | Enhanced sandboxing |
| **Multi-Framework Support** | Via references/ pattern | Via references/ pattern | First-class variant support |

### Key Insights

1. **Universal Philosophy**:
   - All three prioritize **progressive disclosure**
   - All share **minimal structure** (SKILL.md + optional resources)
   - All emphasize **conciseness over verbosity**

2. **Gemini-CLI Strengths**:
   - Robust **skill creation workflow** (7 steps)
   - Built-in **validation and packaging tools**
   - Clear **precedence model** (4 tiers)

3. **Antigravity Strengths**:
   - Enhanced **IDE user experience**
   - Better **guardrails and boundaries**
   - **Structured output** patterns (JSON prompting)

4. **agentskills.io Role**:
   - Provides **interoperability** (portable skills across platforms)
   - Sets **minimum viable structure**
   - Focuses on **principles over implementation**

---

## Implementation Recommendations for TM-Bun

### 1. **Adopt agentskills.io Standard**

- Use `.agent/skills/` directory (Antigravity convention)
- Maintain compliance for cross-platform portability
- Support both user (`~/.agent/skills/`) and workspace skills

### 2. **Implement Progressive Disclosure**

```typescript
interface Skill {
  name: string;
  description: string;
  location: string;
  bodyLoaded: boolean; // Lazy-load body content
  body?: string;
}

class SkillManager {
  private skills: Skill[] = [];
  
  async discoverSkills() {
    // Load only metadata initially
    const files = await glob('**\/SKILL.md', { cwd: '.agent/skills' });
    for (const file of files) {
      const { name, description } = await this.parseMetadata(file);
      this.skills.push({ name, description, location: file, bodyLoaded: false });
    }
  }
  
  async activateSkill(name: string) {
    const skill = this.skills.find(s => s.name === name);
    if (!skill.bodyLoaded) {
      skill.body = await this.loadSkillBody(skill.location);
      skill.bodyLoaded = true;
    }
    return skill;
  }
}
```

### 3. **Create Meta-Skill for TM-Bun**

Adapt Gemini-CLI's `skill-creator` pattern:

```
.agent/skills/skill-creator/
├── SKILL.md
└── scripts/
    ├── init_skill.ts      (Template generator)
    ├── validate_skill.ts  (YAML + structure check)
    └── package_skill.ts   (Create .skill bundle)
```

### 4. **Skill Discovery Priority**

```
Built-in → Extension → User (~/.agent/skills/) → Workspace (.agent/skills/)
 Higher precedence →
```

### 5. **Validation Rules**

```typescript
interface ValidationRules {
  naming: {
    pattern: /^[a-z0-9-]{1,64}$/;
    mustMatchFolder: true;
  };
  frontmatter: {
    requiredFields: ['name', 'description'];
    singleLineDescription: true;
  };
  body: {
    maxLines: 500; // Warn if exceeded
    noTodos: true;
    noAuxiliaryFiles: ['README.md', 'CHANGELOG.md', 'INSTALLATION.md'];
  };
}
```

---

## Conclusion

### Universal Truths Across All Platforms

1. **Progressive disclosure is non-negotiable**: Load metadata → body → resources
2. **Conciseness beats verbosity**: Context window is precious
3. **Specificity matches fragility**: High-risk tasks need exact scripts
4. **Single responsibility**: Narrow, focused skills beat broad ones
5. **Show, don't tell**: Examples > explanations

### Platform-Specific Strengths

- **agentskills.io**: Defines interoperable standard
- **Gemini-CLI**: Robust creation workflow + CLI tooling
- **Antigravity**: IDE integration + enhanced UX

### Next Steps for TM-Bun

1. **Implement SkillManager** with progressive loading
2. **Create `skill-creator` meta-skill** with Bun-native utilities
3. **Define validation schema** (YAML + naming + structure)
4. **Document skill creation workflow** in project README
5. **Build example skills** (e.g., `bun-deploy`, `typescript-refactor`)

---

## References

- [agentskills.io](https://agentskills.io) - Official specification
- [Gemini-CLI Skills Docs](https://geminicli.com/docs/cli/skills)
- [Antigravity Skills Guide](https://antigravity.google/skills)
- Gemini-CLI Source: `packages/core/src/skills/`
- Web Research: Agent skills best practices (Medium, GitHub, Anthropic)

---

**Document Status**: ✅ Complete  
**Last Updated**: 2026-01-22  
**Researcher**: Antigravity Agent  
**Next Action**: Implement SkillManager for TM-Bun project
