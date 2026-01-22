import { createMCPClient } from '@ai-sdk/mcp';
import { TaskMasterAuthProvider } from './mcp/auth-provider.js';
import { TokenStorage } from './mcp/token-storage.js';

// Configuration
const SERVER_NAME = 'github-mcp';
const SERVER_URL = 'https://mcp-server.example.com/mcp'; // Replace with actual URL

async function main() {
  const storage = new TokenStorage();
  const authProvider = new TaskMasterAuthProvider(SERVER_NAME, SERVER_URL, storage);

  // Check if we need to login (e.g. no token or user request)
  // authProvider.authenticate(); 

  const client = await createMCPClient({
    transport: {
      type: 'http',
      url: SERVER_URL,
      authProvider: authProvider
    }
  });

  try {
    const tools = await client.tools();
    console.log('Tools discovered:', Object.keys(tools));
  } catch (e) {
    console.error('Error:', e);
    // If error is 401/Unauthorized, you could trigger authProvider.authenticate() here
  } finally {
    await client.close();
  }
}

main();
