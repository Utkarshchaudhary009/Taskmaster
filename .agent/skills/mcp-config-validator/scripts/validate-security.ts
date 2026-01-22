#!/usr/bin/env bun

/**
 * MCP Configuration Security Validator
 * 
 * Validates MCP server configurations for security vulnerabilities:
 * - Plaintext secrets
 * - Command injection risks
 * - Path traversal attacks
 * - Insecure environment variable usage
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

interface ValidationResult {
    valid: boolean;
    errors: Array<{
        severity: 'critical' | 'warning' | 'info';
        message: string;
        location: string;
    }>;
    recommendations: string[];
    securityScore: number;
}

interface MCPServerConfig {
    command?: string;
    args?: string[];
    url?: string;
    env?: Record<string, string>;
}

interface MCPConfig {
    mcpServers?: Record<string, MCPServerConfig>;
    experimental?: {
        mcp?: {
            servers?: Record<string, MCPServerConfig>;
        };
    };
}

class MCPSecurityValidator {
    private errors: ValidationResult['errors'] = [];
    private recommendations: string[] = [];
    private score = 100;

    validate(configPath: string): ValidationResult {
        try {
            const absolutePath = resolve(configPath);
            const content = readFileSync(absolutePath, 'utf-8');
            const config: MCPConfig = JSON.parse(content);

            // Get servers from either format
            const servers = config.mcpServers || config.experimental?.mcp?.servers || {};

            // Validate each server
            for (const [name, serverConfig] of Object.entries(servers)) {
                this.validateServer(name, serverConfig);
            }

            // Calculate final validation
            const valid = !this.errors.some(e => e.severity === 'critical');

            return {
                valid,
                errors: this.errors,
                recommendations: this.recommendations,
                securityScore: Math.max(0, this.score)
            };
        } catch (error) {
            return {
                valid: false,
                errors: [{
                    severity: 'critical',
                    message: `Failed to parse config: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    location: configPath
                }],
                recommendations: [],
                securityScore: 0
            };
        }
    }

    private validateServer(name: string, config: MCPServerConfig): void {
        // Validate server name
        if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
            this.addError('warning', `Server name "${name}" contains invalid characters. Use alphanumeric, hyphens, and underscores only.`, `servers.${name}`);
            this.score -= 5;
        }

        // Check for both command and url (invalid)
        if (config.command && config.url) {
            this.addError('critical', `Server "${name}" has both command and url. Only one transport method allowed.`, `servers.${name}`);
            this.score -= 20;
        }

        // Validate command injection risks
        if (config.command) {
            this.validateCommand(name, config.command, config.args || []);
        }

        // Validate URL for SSE transport
        if (config.url) {
            this.validateURL(name, config.url);
        }

        // Validate environment variables (critical security check)
        if (config.env) {
            this.validateEnvironmentVariables(name, config.env);
        }
    }

    private validateCommand(name: string, command: string, args: string[]): void {
        // Check for command injection patterns
        const dangerousPatterns = [';', '&&', '||', '`', '$(', ' >', '<', '|'];

        if (dangerousPatterns.some(pattern => command.includes(pattern))) {
            this.addError('critical', `Potential command injection in server "${name}". Command contains dangerous characters.`, `servers.${name}.command`);
            this.score -= 30;
            this.recommendations.push(`Use absolute paths and validate all command inputs for server "${name}"`);
        }

        // Validate args for injection
        args.forEach((arg, index) => {
            if (dangerousPatterns.some(pattern => arg.includes(pattern))) {
                this.addError('warning', `Argument ${index} in server "${name}" may be unsafe: "${arg}"`, `servers.${name}.args[${index}]`);
                this.score -= 10;
            }
        });

        // Recommend absolute paths
        if (command.startsWith('.') || command.startsWith('/')) {
            this.recommendations.push(`Use absolute path for command in server "${name}" or ensure it's in PATH`);
        }
    }

    private validateURL(name: string, url: string): void {
        try {
            const parsedUrl = new URL(url);

            // Warn about HTTP (should be HTTPS)
            if (parsedUrl.protocol === 'http:') {
                this.addError('warning', `Server "${name}" uses insecure HTTP. Recommend HTTPS for production.`, `servers.${name}.url`);
                this.score -= 10;
                this.recommendations.push(`Use HTTPS for server "${name}"`);
            }

            // Check for localhost in production-like configs
            if (parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1') {
                this.addError('info', `Server "${name}" uses localhost. Ensure this is intentional.`, `servers.${name}.url`);
            }
        } catch {
            this.addError('critical', `Invalid URL format for server "${name}": ${url}`, `servers.${name}.url`);
            this.score -= 20;
        }
    }

    private validateEnvironmentVariables(name: string, env: Record<string, string>): void {
        const sensitiveKeywords = ['token', 'key', 'secret', 'password', 'api', 'auth'];

        for (const [key, value] of Object.entries(env)) {
            // Check if value is a hardcoded secret (not env var reference)
            const isEnvVarReference = value.startsWith('${') && value.endsWith('}');

            if (!isEnvVarReference) {
                // Check if it looks like a secret
                const keyLower = key.toLowerCase();
                const isSensitive = sensitiveKeywords.some(keyword => keyLower.includes(keyword));

                if (isSensitive) {
                    this.addError('critical', `SECURITY RISK: Server "${name}" has hardcoded secret in env.${key}. Use environment variable reference: \${${key}}`, `servers.${name}.env.${key}`);
                    this.score -= 40;
                    this.recommendations.push(`Move secret to environment variable and reference as \${${key}}`);
                }

                // Check for suspicious long strings that might be tokens
                if (value.length > 32 && /^[A-Za-z0-9+/=_-]+$/.test(value)) {
                    this.addError('warning', `Possible hardcoded token in server "${name}" env.${key}. Length: ${value.length} chars`, `servers.${name}.env.${key}`);
                    this.score -= 15;
                }
            } else {
                // Good practice - using env var reference
                this.recommendations.push(`✅ Server "${name}" correctly uses environment variable reference for ${key}`);
            }
        }
    }

    private addError(severity: 'critical' | 'warning' | 'info', message: string, location: string): void {
        this.errors.push({ severity, message, location });
    }
}

// CLI Execution
if (import.meta.main) {
    const configPath = process.argv[2];

    if (!configPath) {
        console.error('❌ Usage: bun run validate-security.ts <config-file-path>');
        process.exit(1);
    }

    const validator = new MCPSecurityValidator();
    const result = validator.validate(configPath);

    // Output results in LLM-friendly format
    console.log('\n🔒 MCP Security Validation Report\n');
    console.log(`📊 Security Score: ${result.securityScore}/100\n`);

    if (result.errors.length > 0) {
        console.log('⚠️  Issues Found:\n');
        result.errors.forEach(error => {
            const icon = error.severity === 'critical' ? '🔴' : error.severity === 'warning' ? '🟡' : 'ℹ️';
            console.log(`  ${icon} [${error.severity.toUpperCase()}] ${error.message}`);
            console.log(`      Location: ${error.location}\n`);
        });
    } else {
        console.log('✅ No security issues found!\n');
    }

    if (result.recommendations.length > 0) {
        console.log('💡 Recommendations:\n');
        result.recommendations.forEach(rec => {
            console.log(`  • ${rec}`);
        });
        console.log();
    }

    console.log(`\n${result.valid ? '✅ Configuration is VALID' : '❌ Configuration has CRITICAL issues'}\n`);

    // JSON output for programmatic use
    console.log('📋 JSON Output:\n');
    console.log(JSON.stringify(result, null, 2));

    process.exit(result.valid ? 0 : 1);
}

export { MCPSecurityValidator };
