# Skills by Vercel: Discovery and Installation Research

## Overview
**Skills by Vercel** (accessed via [skills.sh](https://skills.sh)) is an open ecosystem often described as an "npm for AI Agents." It provides a standardized way to package, share, and install procedural knowledge ("skills") for AI coding assistants. These skills help agents adhere to specific frameworks, best practices, and team conventions.

## 1. Discovery
Currently, there is no native CLI command for searching skills (e.g., `npx skills search` does not exist). Discovery is primarily web-based.

### Methods
*   **Official Directory (skills.sh):** The primary method is browsing the [skills.sh](https://skills.sh) website.
    *   **Leaderboard:** The homepage features a "Top Skills" leaderboard based on installation telemetry.
    *   **Categories:** Skills are categorized (e.g., Frameworks, Languages) to help users find relevant packages.
    *   **Search:** The website provides a search interface to query the registry.
*   **GitHub:** Since skills are hosted in public GitHub repositories, standard GitHub search can be used.
*   **Standardized URI:** There is a proposed standard for discovering skills using `.well-known` URI path prefixes, though manual discovery via the website is currently the dominant method.

## 2. Installation
Installation is handled via the `npx` command-line tool. It does not require a global installation of a package manager; `npx` (Node Package Execute) downloads and runs the `skills` binary temporarily.

### Command
To install a skill, run the following command in your project root:

```bash
npx skills add <owner/repo>
```

**Arguments:**
*   `owner`: The GitHub username or organization name.
*   `repo`: The repository name containing the skill.

**Example:**
To install the Next.js skill from Vercel:
```bash
npx skills add vercel/next-js
```

### What Happens During Installation
1.  **Download:** The CLI fetches the skill content (primarily the `SKILL.md` file and any associated resources) from the specified GitHub repository.
2.  **Placement:** It typically creates a `.gemini/skills/` (or similar, depending on the agent configuration) directory in your project.
3.  **Structure:** Inside, it places the skill in a dedicated folder (e.g., `.gemini/skills/next-js/SKILL.md`).
4.  **Telemetry:** By default, the CLI reports the installation to the skills.sh leaderboard. This can be disabled by setting `SKILLS_NO_TELEMETRY=1`.

## 3. Anatomy of a Skill
A standardized skill package typically contains:
*   **`SKILL.md`:** The core file containing the system prompt or instructions for the agent. This file defines *how* the agent should perform tasks related to that skill.
*   **Prompt Engineering:** The instructions often include "Role," "Workflow," and "Constraints" sections to guide the AI's behavior.

## 4. Usage
Once installed, compatible AI agents (like Gemini CLI, Cursor, Claude Code) automatically detect these files. When you interact with the agent in that project:
1.  **Context Loading:** The agent reads the `SKILL.md` files to augment its context.
2.  **Behavior Adaptation:** The agent adopts the personas, rules, and workflows defined in the skills (e.g., "Always use App Router for Next.js projects").

## 5. Creating Skills
You can also create your own skills to share or use locally:
1.  Create a folder: `.gemini/skills/<my-skill>/`.
2.  Add a `SKILL.md` file.
3.  Write instructions in Markdown format.
4.  (Optional) Push to GitHub to share via `skills.sh`.
