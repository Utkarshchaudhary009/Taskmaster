# Skills Framework Research - Executive Summary

**Date**: 2026-01-22  
**Research Scope**: agentskills.io standard, Gemini-CLI implementation, Antigravity architecture  
**Objective**: Understand best practices for writing agent skills for TM-Bun project

---

## 🎯 What Are Agent Skills?

**TL;DR**: Skills are **on-demand, specialized expertise packages** that agents activate dynamically, unlike rules/prompts that are always loaded.

### Key Distinction

| Concept | Purpose | Loading | Scope |
|---------|---------|---------|-------|
| **Skills** | Specialized tasks | Progressive (metadata → body → resources) | On-demand |
| **Rules (AGENT.md)** | Persistent behavior | Always loaded | Global |
| **MCP Servers** | Tool integration | API invocation | External |

---

## 🏗️ Universal Architecture (All 3 Platforms)

### Minimal Structure

```
skill-name/
├── SKILL.md          ← REQUIRED
│   ├── YAML frontmatter (name + description)
│   └── Markdown instructions
└── Optional bundles
    ├── scripts/      ← Executable code
    ├── references/   ← Docs to load as needed
    └── assets/       ← Files used in output
```

### Progressive Disclosure (The Core Pattern)

```
Level 1: Metadata (~100 words)     → Always in context
Level 2: SKILL.md body (<5k words) → When triggered
Level 3: Resources (unlimited)     → As needed
```

**Why This Matters**: Context window is precious. Only load what's necessary.

---

## 📜 The Three Gold Standards

### 1. agentskills.io - The Specification

**Role**: Defines the **open, interoperable format**

**Key Rules**:
- Name: lowercase, alphanumeric, hyphens, 1-64 chars
- Description: **Primary trigger mechanism** (include "when to use")
- Frontmatter: YAML with `name` and `description` only
- Body: Markdown instructions

**Example**:
```yaml
---
name: api-auditor
description: Expertise in auditing API endpoints. Use when user asks to "check", "test", or "audit" a URL.
---
```

### 2. Gemini-CLI - The Implementation

**Strengths**:
- **Robust creation workflow**: 7-step process (Understand → Plan → Initialize → Edit → Package → Install → Iterate)
- **Built-in tooling**: `init_skill.cjs`, `validate_skill.cjs`, `package_skill.cjs`
- **4-tier discovery**: Built-in → Extension → User → Workspace (precedence)
- **Meta-skill**: `skill-creator` for creating skills

**Skill Definition** (TypeScript):
```typescript
interface SkillDefinition {
  name: string;
  description: string;
  location: string;  // Path to SKILL.md
  body: string;      // Markdown content
  disabled?: boolean;
  isBuiltin?: boolean;
}
```

### 3. Antigravity - The IDE Integration

**Strengths**:
- **Degrees of Freedom concept**: Match specificity to task fragility
  - High: Text instructions (e.g., code review)
  - Medium: Pseudocode (e.g., API patterns)
  - Low: Exact scripts (e.g., DB migration)
- **Enhanced security**: Sandboxing + explicit consent
- **Structured output**: JSON prompting for token efficiency
- **Guardrails**: Define what agent should **never** interact with

---

## 🎨 Best Practices (Universal)

### Content Quality

1. **Concise is Key**
   - "The context window is a public good"
   - Only add what agent **doesn't already know**
   - Prefer examples over explanations

2. **Imperative Voice**
   - ✅ "Run `node audit.js <url>`"
   - ❌ "You should consider running the audit script"

3. **Trigger-Rich Descriptions**
   ```yaml
   description: Code review workflow. Use when reviewing PRs or when user asks for "feedback", "review", or to "check" code.
   ```

### Structure

4. **Progressive References**
   ```markdown
   # BigQuery Skill
   
   ## Quick Start
   [Basic examples]
   
   ## Advanced
   - **Finance**: See [finance.md](references/finance.md)
   - **Sales**: See [sales.md](references/sales.md)
   ```
   Agent loads `sales.md` **only** when needed.

5. **Agentic Ergonomics (for scripts)**
   - LLM-friendly stdout: "✅ Success (Status 200)"
   - Suppress verbose tracebacks
   - Paginate output: "First 50 lines..."

### Organization

6. **Single Responsibility**
   - Narrow scope beats broad
   - Example: `react-components`, not `fullstack-developer`

7. **Namespace When Helpful**
   - `gh-address-comments` (GitHub)
   - `linear-address-issue` (Linear)

---

## 🚫 Universal Anti-Patterns

| Anti-Pattern | Why It's Bad | Fix |
|--------------|--------------|-----|
| **Bloated docs** | "CSV files were invented in 1970s..." | Delete. Agent knows. |
| **Auxiliary files** | README.md, CHANGELOG.md | Agent doesn't need them |
| **Broad scope** | "Expert in all languages" | Split into focused skills |
| **Vague triggers** | "Helps with coding" | "React component creation following Atomic Design" |
| **Nested references** | `advanced.md` → `super-advanced.md` | Keep one level deep |

---

## 🛠️ The 7-Step Creation Workflow (Gemini-CLI Standard)

### Step 1: Understand
- Ask for 3-5 concrete examples
- "What would trigger this skill?"

### Step 2: Plan Resources
For each example, identify:
- Scripts: Code rewritten repeatedly
- References: Knowledge to look up
- Assets: Templates used in output

### Step 3: Initialize
```bash
node init_skill.cjs my-skill --path .agent/skills
```

### Step 4: Edit
- Implement scripts (test them!)
- Add references (schemas, docs)
- Write SKILL.md body
- Delete unused example files

### Step 5: Package
```bash
node package_skill.cjs .agent/skills/my-skill
```
Creates `my-skill.skill` (validated zip file)

### Step 6: Install
```bash
# Workspace
taskmaster skills install my-skill.skill --scope workspace

# User (cross-project)
taskmaster skills install my-skill.skill --scope user
```

### Step 7: Iterate
- Test on real tasks
- Notice struggles
- Update and repackage

---

## 🎯 TM-Bun Implementation Plan

### 1. Adopt Standard Structure

```
.agent/skills/
├── skill-creator/     ← Meta-skill for creating skills
│   ├── SKILL.md
│   └── scripts/
│       ├── init_skill.ts
│       ├── validate_skill.ts
│       └── package_skill.ts
└── [user skills]/
```

### 2. Implement SkillManager

```typescript
class SkillManager {
  private skills: Skill[] = [];
  
  async discoverSkills() {
    // Load metadata only (Level 1)
    const files = await glob('**\/SKILL.md', { cwd: '.agent/skills' });
    for (const file of files) {
      const { name, description } = await parseMetadata(file);
      this.skills.push({ name, description, location: file });
    }
  }
  
  async activateSkill(name: string) {
    // Load body on demand (Level 2)
    const skill = this.skills.find(s => s.name === name);
    if (!skill.body) {
      skill.body = await loadSkillBody(skill.location);
    }
    return skill;
  }
}
```

### 3. Discovery Tiers (Priority)

```
Built-in (lowest) → User (~/.agent/skills/) → Workspace (.agent/skills/) (highest)
```

### 4. Validation Rules

```typescript
interface ValidationRules {
  naming: /^[a-z0-9-]{1,64}$/;
  frontmatter: ['name', 'description']; // Required
  body: {
    maxLines: 500,  // Warn if exceeded
    noTodos: true,
    noAuxFiles: ['README.md', 'CHANGELOG.md']
  };
}
```

---

## 📊 Comparative Analysis

| Feature | agentskills.io | Gemini-CLI | Antigravity |
|---------|----------------|------------|-------------|
| **Standard Compliance** | Defines spec | ✅ Full | ✅ Full |
| **Packaging** | Not specified | `.skill` zip | `.skill` zip |
| **Creation Workflow** | Not specified | 7-step | Similar |
| **Validation Tools** | Not specified | ✅ Built-in | IDE-integrated |
| **Meta-Skill** | Not specified | `skill-creator` | Likely built-in |
| **Security** | Guidelines | User approval | Sandboxing |

---

## 🔑 Key Takeaways

1. **Progressive disclosure is non-negotiable**
   - Load metadata → body → resources (never all at once)

2. **Conciseness beats verbosity**
   - Context window is precious

3. **Description is the trigger**
   - Include **what** and **when** in single-line YAML

4. **Single responsibility**
   - Narrow, focused skills > broad ones

5. **Show, don't tell**
   - Examples > explanations

6. **Platform-agnostic by default**
   - agentskills.io ensures portability

---

## 📚 Full Research Document

For complete details, see: **`SKILLS-FRAMEWORK-RESEARCH.md`** (40+ KB)

Includes:
- Detailed architecture analysis
- Full TypeScript interfaces
- 15+ pattern examples
- Security best practices
- Comparative feature matrix
- Implementation code samples

---

## 🚀 Next Steps

1. **Read full research**: `SKILLS-FRAMEWORK-RESEARCH.md`
2. **Implement SkillManager**: Progressive loading system
3. **Create meta-skill**: `skill-creator` for TM-Bun
4. **Define validation**: YAML + naming + structure checks
5. **Build examples**: `bun-deploy`, `typescript-refactor`, etc.

---

**Document Status**: ✅ Executive Summary Complete  
**For**: TM-Bun Project  
**Date**: 2026-01-22
