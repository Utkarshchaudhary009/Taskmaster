/**
 * Shell Tool for AI Agents
 * Provides safe shell command execution with permission checks
 */

import { tool } from "ai";
import { z } from "zod";
import { PermissionManager } from "./permission-manager";
import { ui } from "../cli/ui";
import type { ShellCommandResult, ShellToolOptions } from "../types";

/**
 * Execute a shell command with Bun.spawn
 */
async function executeCommand(command: string, cwd?: string): Promise<ShellCommandResult> {
    const isWindows = process.platform === "win32";

    // Use shell to handle complex commands (pipes, redirects, etc.)
    const shellCmd = isWindows ? "cmd" : "sh";
    const shellArgs = isWindows ? ["/c", command] : ["-c", command];

    const proc = Bun.spawn([shellCmd, ...shellArgs], {
        cwd: cwd || process.cwd(),
        stdout: "pipe",
        stderr: "pipe",
    });

    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;

    return { stdout, stderr, exitCode };
}

/**
 * Create shell tools for AI SDK integration
 * Returns a set of tools that agents can use
 */
export function createShellTools(options: ShellToolOptions = {}) {
    const pm = new PermissionManager();

    const shellTool = tool({
        description: `Execute a shell command on the user's system. Use this to run CLI tools, scripts, or system commands. Always explain what command you're about to run and why. Be cautious with destructive operations.`,
        parameters: z.object({
            command: z.string().describe("The shell command to execute"),
            workingDirectory: z.string().optional().describe("Working directory for the command (defaults to current directory)"),
        }),
        execute: async ({ command, workingDirectory }: { command: string; workingDirectory?: string }): Promise<ShellCommandResult & { blocked?: boolean }> => {
            const cwd = workingDirectory || options.workingDirectory;

            // 1. Check for dangerous commands
            if (pm.isDangerous(command)) {
                ui.error(`Blocked dangerous command: ${command}`);
                return {
                    stdout: "",
                    stderr: "Command blocked: This command pattern is considered dangerous and has been blocked for safety.",
                    exitCode: 1,
                    blocked: true,
                };
            }

            // 2. Custom hook check
            if (options.onBeforeExecute) {
                const allowed = await options.onBeforeExecute(command);
                if (!allowed) {
                    return {
                        stdout: "",
                        stderr: "Command was rejected by custom handler.",
                        exitCode: 1,
                        blocked: true,
                    };
                }
            }

            // 3. Permission check
            const hasPermission = await pm.checkPermission(command);
            if (!hasPermission) {
                return {
                    stdout: "",
                    stderr: "Command was denied by user.",
                    exitCode: 1,
                    blocked: true,
                };
            }

            // 4. Execute
            ui.item("▶️", ui.cyan(command));

            try {
                const result = await executeCommand(command, cwd);

                if (result.exitCode === 0) {
                    if (result.stdout.trim()) {
                        console.log(result.stdout);
                    }
                } else {
                    if (result.stderr.trim()) {
                        console.log(ui.yellow(result.stderr));
                    }
                }

                return result;
            } catch (e: unknown) {
                const error = e as Error;
                ui.error(`Command failed: ${error.message}`);
                return {
                    stdout: "",
                    stderr: `Execution error: ${error.message}`,
                    exitCode: 127,
                };
            }
        },
    });

    const readFileTool = tool({
        description: "Read the contents of a file from the user's filesystem",
        parameters: z.object({
            path: z.string().describe("Path to the file to read"),
        }),
        execute: async ({ path }) => {
            try {
                const file = Bun.file(path);
                if (!(await file.exists())) {
                    return { content: null, error: "File not found" };
                }
                const content = await file.text();
                return { content, error: null };
            } catch (e: any) {
                return { content: null, error: e.message };
            }
        },
    });

    const writeFileTool = tool({
        description: "Write content to a file on the user's filesystem. Creates parent directories if needed.",
        parameters: z.object({
            path: z.string().describe("Path to the file to write"),
            content: z.string().describe("Content to write to the file"),
        }),
        execute: async ({ path, content }) => {
            // Permission check for file writes
            const hasPermission = await pm.checkPermission(`write:${path}`);
            if (!hasPermission) {
                return { success: false, error: "Write permission denied by user." };
            }

            try {
                // Ensure directory exists
                const { dirname } = await import("path");
                const { mkdirSync } = await import("fs");
                const dir = dirname(path);
                try {
                    mkdirSync(dir, { recursive: true });
                } catch {
                    // Directory may already exist
                }

                await Bun.write(path, content);
                ui.success(`Wrote ${content.length} bytes to ${path}`);
                return { success: true, error: null };
            } catch (e: any) {
                ui.error(`Failed to write file: ${e.message}`);
                return { success: false, error: e.message };
            }
        },
    });

    const listDirTool = tool({
        description: "List files and directories in a given path",
        parameters: z.object({
            path: z.string().describe("Directory path to list"),
        }),
        execute: async ({ path }) => {
            try {
                const { readdirSync, statSync } = await import("fs");
                const { join } = await import("path");

                const entries = readdirSync(path);
                const result = entries.map(name => {
                    try {
                        const fullPath = join(path, name);
                        const stat = statSync(fullPath);
                        return {
                            name,
                            type: stat.isDirectory() ? "directory" : "file",
                            size: stat.isFile() ? stat.size : undefined,
                        };
                    } catch {
                        return { name, type: "unknown" as const };
                    }
                });

                return { entries: result, error: null };
            } catch (e: any) {
                return { entries: [], error: e.message };
            }
        },
    });

    return {
        shell: shellTool,
        readFile: readFileTool,
        writeFile: writeFileTool,
        listDir: listDirTool,
    };
}

// Default singleton instance
export const shellTools = createShellTools();
