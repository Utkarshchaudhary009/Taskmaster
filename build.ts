#!/usr/bin/env bun

const args = process.argv.slice(2);
const isStandalone = args.includes("--standalone");

console.log(`\n🔨 Building TaskMaster CLI...\n`);

if (isStandalone) {
    console.log("Mode: Standalone executable (requires node_modules at runtime)");
    
    const proc = Bun.spawn([
        "bun", "build", "./src/index.ts",
        "--compile",
        "--outfile", "tm",
        "--packages", "external"
    ], {
        stdout: "inherit",
        stderr: "inherit"
    });
    
    const code = await proc.exited;
    
    if (code === 0) {
        console.log("\n✅ Standalone build complete: tm.exe");
        console.log("Note: Requires node_modules to be present at runtime.");
        console.log("\nTo install globally:");
        console.log("  1. Copy tm.exe to a directory in your PATH");
        console.log("  2. Ensure node_modules is accessible or install deps globally");
    }
    process.exit(code);
}

// Default: Bundle build (runs with bun)
const result = await Bun.build({
    entrypoints: ["./src/index.ts"],
    outdir: "./dist",
    target: "bun",
    external: [
        "web-tree-sitter",
        "tree-sitter-bash", 
        "@google/gemini-cli-core"
    ],
    minify: true,
});

if (!result.success) {
    console.error("❌ Build failed:");
    for (const log of result.logs) {
        console.error(log);
    }
    process.exit(1);
}

console.log("✅ Bundle build complete: ./dist/index.js");
console.log("\nTo run:");
console.log("  bun run dist/index.js <command>");
console.log("\nTo install globally:");
console.log("  bun link");
