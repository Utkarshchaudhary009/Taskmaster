import { TokenStorage } from "../src/mcp/token-storage";

async function main() {
    try {
        console.log("Injecting Zhipu API Key...");
        const storage = new TokenStorage();
        // Using the key provided in previous turn context
        const apiKey = "478a140cbb6e48268246d02bafaa586b.PCMhGfuJYr94Sf7m"; 
        
        await storage.save("zhipu", { apiKey });
        console.log("✅ Successfully injected Zhipu API key into secure storage.");
        
        // Verify
        const retrieved = await storage.get("zhipu");
        if (retrieved?.apiKey === apiKey) {
            console.log("✅ Verification successful.");
        } else {
            console.error("❌ Verification failed.");
        }
    } catch (e) {
        console.error("❌ Injection failed:", e);
    }
}

main();