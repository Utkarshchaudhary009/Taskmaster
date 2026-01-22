
import { SyncEngine } from "../sync/engine";
import { join } from "path";
import { homedir } from "os";
import { createInterface } from "readline";
import { TokenStorage } from "../mcp/token-storage";

const ask = (query: string) => new Promise<string>((resolve) => {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  rl.question(query, (ans) => {
    rl.close();
    resolve(ans);
  });
});

export async function runSetupTour() {
    console.log(`
╔══════════════════════════════════════════╗
║        Welcome to TaskMaster CLI 🚀      ║
╚══════════════════════════════════════════╝
`);

    console.log("I will help you set up your environment.");

    // 1. Gemini CLI Installation Instructions
    console.log("\n[1/4] Checking Gemini CLI...");
    console.log("If you haven't installed the Gemini CLI, please run one of the following:");
    console.log("  npm:  npm install -g @google/gemini-cli");
    console.log("  pnpm: pnpm add -g @google/gemini-cli");
    console.log("  bun:  bun add -g @google/gemini-cli");
    
    const geminiTokensPath = join(homedir(), ".gemini", "mcp-oauth-tokens.json");
    if (await Bun.file(geminiTokensPath).exists()) {
        console.log("   ✅ Gemini CLI appears to be authenticated.");
    } else {
        console.log("   ⚠️  Gemini CLI authentication tokens not found.");
        console.log("       Please run 'gemini' in your terminal to authenticate.");
    }

    // 2. Sync
    console.log("\n[2/4] Syncing MCP servers from your installed IDEs...");
    const engine = new SyncEngine();
    await engine.sync();

    // 3. Zhipu API Key Verification
    console.log("\n[3/4] Verifying Zhipu AI Provider...");
    const storage = new TokenStorage();
    let zhipuTokens = await storage.get("zhipu");
    let apiKey = process.env.ZHIPU_API_KEY || zhipuTokens?.apiKey;

    if (apiKey) {
        console.log("   ✅ Zhipu API Key found.");
    } else {
        console.log("   ⚠️  Zhipu API Key not found.");
        const answer = await ask("   👉 Enter your Zhipu API Key (or press Enter to skip): ");
        if (answer.trim()) {
            apiKey = answer.trim();
            // Save securely
            await storage.save("zhipu", { apiKey });
            console.log("   ✅ API Key saved securely.");
        } else {
            console.log("   ℹ️  Skipped Zhipu setup.");
        }
    }

    // 4. Complete
    console.log("\n[4/4] Setup Complete! 🎉");
    console.log("\nTry running:");
    console.log("  tm \"Analyze this project\"");
    console.log("  tm run --mcp=git \"Commit changes\"");
}
