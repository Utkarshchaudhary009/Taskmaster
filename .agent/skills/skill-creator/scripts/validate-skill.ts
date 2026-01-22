#!/usr/bin/env bun

/**
 * Skill Validator
 * 
 * Validates agent skills against agentskills.io standard and
 * TM-Bun best practices.
 */

import { readFile, readdir, stat } from 'fs/promises';
import { join, basename } from 'path';

interface ValidationError {
    severity: 'critical' | 'warning' | 'info';
    message: string;
    location: string;
}

interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
    warnings: number;
    score: number;
}

class SkillValidator {
    private errors: ValidationError[] = [];
    private score = 100;

    async validate(skillPath: string): Promise<ValidationResult> {
        try {
            // Check if directory exists
            const stats = await stat(skillPath);
            if (!stats.isDirectory()) {
                this.addError('critical', 'Path must be a directory', skillPath);
                return this.getResult();
            }

            // Get folder name
            const folderName = basename(skillPath);

            // Validate SKILL.md exists
            const skillMdPath = join(skillPath, 'SKILL.md');
            let skillMdContent: string;
            try {
                skillMdContent = await readFile(skillMdPath, 'utf-8');
            } catch {
                this.addError('critical', 'Missing SKILL.md file', skillPath);
                return this.getResult();
            }

            // Parse frontmatter
            const frontmatter = this.parseFrontmatter(skillMdContent);
            if (!frontmatter) {
                this.addError('critical', 'Invalid or missing YAML frontmatter in SKILL.md', 'SKILL.md');
                return this.getResult();
            }

            // Validate frontmatter fields
            this.validateFrontmatter(frontmatter, folderName);

            // Validate body
            this.validateBody(skillMdContent, skillPath);

            // Check for auxiliary files (should not exist)
            await this.checkAuxiliaryFiles(skillPath);

            // Check for TODOs
            this.checkTODOs(skillMdContent);

            // Validate references structure
            await this.validateReferences(skillPath);

            return this.getResult();
        } catch (error) {
            this.addError('critical', `Validation error: ${error instanceof Error ? error.message : 'Unknown'}`, skillPath);
            return this.getResult();
        }
    }

    private parseFrontmatter(content: string): Record<string, string> | null {
        const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
        if (!match) return null;

        const frontmatterText = match[1];
        const result: Record<string, string> = {};

        // Simple YAML parsing (name and description only)
        const lines = frontmatterText.split('\n');
        let currentKey = '';
        let currentValue = '';

        for (const line of lines) {
            const keyMatch = line.match(/^(\w+):\s*(.*)$/);
            if (keyMatch) {
                if (currentKey) {
                    result[currentKey] = currentValue.trim();
                }
                currentKey = keyMatch[1];
                currentValue = keyMatch[2];
            } else if (currentKey && line.trim()) {
                // Multi-line value
                currentValue += ' ' + line.trim();
            }
        }

        if (currentKey) {
            result[currentKey] = currentValue.trim();
        }

        return result;
    }

    private validateFrontmatter(frontmatter: Record<string, string>, folderName: string): void {
        // Check required fields
        if (!frontmatter.name) {
            this.addError('critical', 'Missing "name" field in frontmatter', 'SKILL.md frontmatter');
            this.score -= 30;
        }

        if (!frontmatter.description) {
            this.addError('critical', 'Missing "description" field in frontmatter', 'SKILL.md frontmatter');
            this.score -= 30;
        }

        // Validate name
        if (frontmatter.name) {
            // Check naming convention
            if (!/^[a-z0-9-]{1,64}$/.test(frontmatter.name)) {
                this.addError('critical', `Invalid skill name: "${frontmatter.name}". Use lowercase, alphanumeric, and hyphens only (1-64 chars)`, 'SKILL.md frontmatter.name');
                this.score -= 20;
            }

            // Check name matches folder
            if (frontmatter.name !== folderName) {
                this.addError('critical', `Skill name "${frontmatter.name}" does not match folder name "${folderName}"`, 'SKILL.md frontmatter.name');
                this.score -= 20;
            }
        }

        // Validate description
        if (frontmatter.description) {
            const desc = frontmatter.description;

            // Check length
            if (desc.length < 50) {
                this.addError('warning', 'Description is very short. Include what the skill does AND when to use it.', 'SKILL.md frontmatter.description');
                this.score -= 10;
            }

            if (desc.length > 500) {
                this.addError('warning', 'Description is very long. Keep it concise but comprehensive.', 'SKILL.md frontmatter.description');
                this.score -= 5;
            }

            // Check for trigger keywords
            const hasTriggerKeywords = /use when|trigger|activate|invoke|call/i.test(desc);
            if (!hasTriggerKeywords) {
                this.addError('info', 'Description should include "when to use" guidance (e.g., "Use when...")', 'SKILL.md frontmatter.description');
                this.score -= 5;
            }
        }

        // Check for extra fields (should only have name and description)
        const extraFields = Object.keys(frontmatter).filter(key => key !== 'name' && key !== 'description');
        if (extraFields.length > 0) {
            this.addError('warning', `Extra fields in frontmatter: ${extraFields.join(', ')}. Only "name" and "description" should be present.`, 'SKILL.md frontmatter');
            this.score -= 5;
        }
    }

    private validateBody(content: string, skillPath: string): void {
        // Remove frontmatter
        const bodyMatch = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n([\s\S]*)$/);
        if (!bodyMatch) {
            this.addError('warning', 'No content after frontmatter', 'SKILL.md');
            return;
        }

        const body = bodyMatch[1];
        const lines = body.split('\n');

        // Check line count
        if (lines.length > 500) {
            this.addError('warning', `SKILL.md body has ${lines.length} lines. Consider splitting into references/ if > 500 lines.`, 'SKILL.md');
            this.score -= 10;
        }

        // Check for imperative voice (heuristic)
        const hasImperativeVerbs = /\b(run|use|execute|validate|check|create|delete|update|configure)\b/gi.test(body);
        if (!hasImperativeVerbs) {
            this.addError('info', 'Consider using imperative voice (e.g., "Run X", "Use Y")', 'SKILL.md');
        }

        // Check for examples/code blocks
        const hasCodeBlocks = /```/.test(body);
        if (!hasCodeBlocks) {
            this.addError('info', 'Consider adding code examples. Show, don\'t just tell.', 'SKILL.md');
        }
    }

    private async checkAuxiliaryFiles(skillPath: string): Promise<void> {
        const auxiliaryFiles = ['README.md', 'CHANGELOG.md', 'INSTALLATION.md', 'LICENSE.md'];

        const files = await readdir(skillPath);
        for (const file of files) {
            if (auxiliaryFiles.includes(file)) {
                this.addError('warning', `Auxiliary file "${file}" found. Agent doesn't need this file - remove it.`, file);
                this.score -= 5;
            }
        }
    }

    private checkTODOs(content: string): void {
        const todoMatches = content.match(/TODO/gi);
        if (todoMatches && todoMatches.length > 0) {
            this.addError('warning', `Found ${todoMatches.length} TODO(s) in SKILL.md. Complete all TODOs before packaging.`, 'SKILL.md');
            this.score -= 10;
        }
    }

    private async validateReferences(skillPath: string): Promise<void> {
        const referencesPath = join(skillPath, 'references');

        try {
            const stats = await stat(referencesPath);
            if (!stats.isDirectory()) return;

            const files = await readdir(referencesPath);
            for (const file of files) {
                const filePath = join(referencesPath, file);
                const fileStats = await stat(filePath);

                if (fileStats.isFile()) {
                    const content = await readFile(filePath, 'utf-8');
                    const lines = content.split('\n').length;

                    // Check for table of contents if file is long
                    if (lines > 100 && !content.includes('## Table of Contents')) {
                        this.addError('info', `Reference file "${file}" has ${lines} lines. Consider adding a table of contents.`, `references/${file}`);
                    }
                } else if (fileStats.isDirectory()) {
                    // Nested references (should be avoided)
                    this.addError('warning', `Nested directory in references/: "${file}". Keep references one level deep.`, `references/${file}`);
                    this.score -= 5;
                }
            }
        } catch {
            // references/ doesn't exist, which is okay
        }
    }

    private addError(severity: 'critical' | 'warning' | 'info', message: string, location: string): void {
        this.errors.push({ severity, message, location });
    }

    private getResult(): ValidationResult {
        const criticalErrors = this.errors.filter(e => e.severity === 'critical').length;
        const warnings = this.errors.filter(e => e.severity === 'warning').length;

        return {
            valid: criticalErrors === 0,
            errors: this.errors,
            warnings,
            score: Math.max(0, this.score)
        };
    }
}

// CLI Execution
if (import.meta.main) {
    const skillPath = process.argv[2];

    if (!skillPath) {
        console.error('❌ Usage: bun run validate-skill.ts <skill-path>');
        console.error('\nExample: bun run validate-skill.ts .agent/skills/my-skill');
        process.exit(1);
    }

    const validator = new SkillValidator();
    const result = await validator.validate(skillPath);

    console.log('\n🔍 Skill Validation Report\n');
    console.log(`📊 Score: ${result.score}/100\n`);

    if (result.errors.length > 0) {
        console.log('📋 Issues Found:\n');

        result.errors.forEach(error => {
            const icon = error.severity === 'critical' ? '🔴' : error.severity === 'warning' ? '🟡' : 'ℹ️';
            console.log(`  ${icon} [${error.severity.toUpperCase()}] ${error.message}`);
            console.log(`      Location: ${error.location}\n`);
        });
    } else {
        console.log('✅ No issues found!\n');
    }

    console.log(`\n${result.valid ? '✅ Skill is VALID and ready to package!' : '❌ Skill has CRITICAL issues - fix before packaging'}\n`);

    // JSON output
    console.log('📊 JSON Output:\n');
    console.log(JSON.stringify(result, null, 2));
    console.log();

    process.exit(result.valid ? 0 : 1);
}

export { SkillValidator };
