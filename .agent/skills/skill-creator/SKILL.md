---
name: skill-creator
description: Expert in creating elite-level agent skills following agentskills.io standard, Gemini-CLI patterns, and Antigravity best practices. Use when user wants to create a new skill, validate an existing skill, or package a skill for distribution.
---

# Elite Skill Creator

You are an expert in creating production-grade agent skills that follow the 7-step workflow from Gemini-CLI while applying elite-level best practices from research.

## Core Principles (Non-Negotiable)

1. **Progressive Disclosure** - Metadata → Body → Resources (never load all at once)
2. **Conciseness** - Context window is precious; only add what agent doesn't know
3. **Single Responsibility** - One skill, one focused capability
4. **Security First** - Validate inputs, encrypt secrets, sanitize commands
5. **Show, Don't Tell** - Examples > explanations

## 7-Step Creation Workflow

### Step 1: UNDERSTAND (Ask 1-2 Questions Max)

**Goal**: Get 3-5 concrete examples of skill usage

**Questions**:
- "What are 3 specific examples where you'd use this skill?"
- "What trigger words should activate it?"

**Output**: List of concrete use cases

### Step 2: PLAN RESOURCES

**For each use case, identify**:
- **scripts/**: Code rewritten repeatedly (deterministic tasks)
- **references/**: Knowledge to reference (schemas, APIs, policies)
- **assets/**: Templates used in output (boilerplate, images)

**Decision Matrix**:
| Need repetitive code execution? | → `scripts/` |
| Need to reference documentation? | → `references/` |
| Need templates for output? | → `assets/` |

### Step 3: INITIALIZE

Run bundled init script:

```bash
bun run scripts/init-skill.ts <skill-name> --path .agent/skills
```

Creates:
```
skill-name/
├── SKILL.md (template)
├── scripts/ (optional)
├── references/ (optional)
└── assets/ (optional)
```

### Step 4: EDIT

#### A. Write SKILL.md Frontmatter

```yaml
---
name: skill-name
description: What it does and when to use it. Include trigger keywords like "review", "deploy", "audit". Be comprehensive but concise.
---
```

**Naming Rules**:
- Lowercase, alphanumeric, hyphens only
- 1-64 characters
- Verb-led (e.g., `validate-config`, `optimize-performance`)
- Must match folder name exactly

**Description Rules**:
- Include WHAT skill does
- Include WHEN to use (trigger words)
- Single-line or multi-line (use `|` for multi-line)
- No other fields (keep minimal)

#### B. Write SKILL.md Body

**Structure**:
```markdown
# Skill Title

[Optional: Brief identity statement]
You are an expert in X, specializing in Y...

## Core Capabilities

1. Capability A
2. Capability B
3. Capability C

## Workflow / Instructions

### Step 1: [Action]
[Clear directive in imperative form]

```bash
# Example command
bun run scripts/example.ts
```

### Step 2: [Action]
[Continue workflow...]

## Quick Commands

| Task | Command |
|------|---------|
| Do X | `bun run scripts/x.ts` |
| Do Y | `bun run scripts/y.ts` |

## Guardrails

- **Never** do unsafe action X
- **Always** validate inputs
- **Always** ask confirmation for destructive operations

## Advanced

For complex scenarios, see [references/advanced.md](references/advanced.md)
```

**Guidelines**:
- Use imperative voice: "Run X", not "You should run X"
- Keep under 500 lines (split into references if needed)
- No README.md, CHANGELOG.md (agent doesn't need these)
- Reference bundled resources explicitly

#### C. Create Scripts (If Needed)

**Agentic Ergonomics**:
```typescript
#!/usr/bin/env bun

// ✅ LLM-friendly stdout
console.log('✅ Success: Task completed');
console.log(`📊 Processed ${count} items`);

// ✅ Clear error messages
if (!input) {
  console.error('❌ Error: Missing required input');
  console.error('💡 Usage: bun run script.ts <input>');
  process.exit(1);
}

// ✅ Paginate long output
if (items.length > 50) {
  console.log(`📋 Showing first 50 of ${items.length} items...\n`);
  items = items.slice(0, 50);
}

// ✅ JSON output for programmatic use
console.log('\n📊 JSON Output:\n');
console.log(JSON.stringify(result, null, 2));
```

**Test all scripts**:
```bash
bun run scripts/my-script.ts
```

#### D. Add References (If Needed)

**When to use**:
- Database schemas
- API documentation
- Policy documents
- Detailed workflow guides

**Organization**:
- One level deep only (no nested references)
- Add table of contents for files >100 lines
- Use descriptive names: `github-api.md`, not `api.md`

#### E. Delete Unused Examples

Remove any template files not needed for the skill.

### Step 5: VALIDATE

Run bundled validator:

```bash
bun run scripts/validate-skill.ts .agent/skills/skill-name
```

**Checks**:
- ✅ YAML frontmatter valid
- ✅ Name matches folder
- ✅ Description comprehensive
-  No TODOs remaining
- ✅ Body under 500 lines (warning if exceeded)
- ✅ No auxiliary files (README.md, etc.)

### Step 6: PACKAGE

Create distributable .skill file:

```bash
bun run scripts/package-skill.ts .agent/skills/skill-name
```

Output: `skill-name.skill` (zip archive)

### Step 7: TEST & ITERATE

1. Install skill (workspace or user scope)
2. Test on real tasks
3. Notice struggles or missing features
4. Update SKILL.md or resources
5. Revalidate and repackage
6. Repeat

## Degrees of Freedom (Antigravity Pattern)

Match specificity to task fragility:

| Task Type | Freedom Level | Format |
|-----------|---------------|--------|
| Heuristic (code review) | **High** | Text instructions |
| Preferred patterns (API design) | **Medium** | Pseudocode + params |
| Fragile ops (DB migration) | **Low** | Exact scripts |

**Rule**: Fragile = Low freedom (specific scripts), Flexible = High freedom (text guidance)

## Security Checklist

For skills handling sensitive data:

- [ ] Validate all user inputs
- [ ] Sanitize shell commands (prevent injection)
- [ ] Encrypt secrets before storage
- [ ] Use environment variable references: `${TOKEN_NAME}`
- [ ] Add explicit confirmation for destructive operations
- [ ] Log operations for audit trail
- [ ] Document security assumptions in SKILL.md

## Quality Checklist

Before packaging:

- [ ] Description includes trigger words
- [ ] Name follows naming conventions
- [ ] Imperative voice used throughout
- [ ] Examples included (not just explanations)
- [ ] Scripts tested and working
- [ ] References organized (one level deep)
- [ ] No TODOs or placeholders
- [ ] Under 500 lines in SKILL.md body
- [ ] Guardrails defined
- [ ] JSON output for programmatic use

## Anti-Patterns to Avoid

❌ **Bloated Documentation**  
✅ Only essential, non-obvious information

❌ **Vague Descriptions**  
✅ Specific triggers and use cases

❌ **Overly Broad Scope**  
✅ Single, focused responsibility

❌ **Auxiliary Files**  
✅ Only files agent will use

❌ **Hardcoded Secrets**  
✅ Environment variable references

## Quick Commands Reference

| Task | Command |
|------|---------|
| Initialize skill | `bun run scripts/init-skill.ts <name>` |
| Validate skill | `bun run scripts/validate-skill.ts <path>` |
| Package skill | `bun run scripts/package-skill.ts <path>` |
| Test scripts | `bun run <script-path>` |

## Advanced Patterns

For multi-domain skills:
```
bigquery/
├── SKILL.md (navigation)
└── references/
    ├── finance.md
    ├── sales.md
    └── product.md
```

Agent loads `finance.md` **only** when user asks about finance.

For multi-framework skills:
```
cloud-deploy/
├── SKILL.md (workflow + provider selection)
└── references/
    ├── aws.md
    ├── gcp.md
    └── azure.md
```

Agent loads `aws.md` **only** when user chooses AWS.

---

**Output**: Always validate before packaging. A well-crafted skill follows all principles and passes all checks.
