# Deep Dive: @ai-sdk/mcp

The `@ai-sdk/mcp` package provides first-class support for the **Model Context Protocol (MCP)** within the Vercel AI SDK. It allows AI applications to connect securely to external data sources, tools, and prompts via standardized servers.

## Package Version Details
- **Target Version:** 1.0.9
- **Latest Fixes (1.0.9):** Introduced **lenient JSON-RPC parsing for the HTTP transport** (`ec84ffd`). This improves robustness when dealing with MCP servers that might return slightly non-compliant JSON-RPC responses.
- **Installed Version:** 1.0.11

## Core API & Architecture

The package is centered around the `createMCPClient` function, which establishes a connection to an MCP server.

### 1. Creating a Client
You initialize a client by defining a `transport`. The package supports `http`, `sse` (Server-Sent Events), and `stdio` (local processes).

```typescript
import { createMCPClient } from '@ai-sdk/mcp';

const client = await createMCPClient({
  transport: {
    type: 'http', // or 'sse'
    url: 'https://mcp-server.example.com/api',
    authProvider: myOAuthProvider, // Optional: OAuth support
  },
  capabilities: {
    elicitation: { applyDefaults: true } // Optional: Client capabilities
  }
});
```

### 2. Transports
- **HTTP / SSE:** Built-in via the configuration object.
- **Stdio:** For running local MCP servers (e.g., CLI tools). This is exported separately to keep the core package lightweight.

```typescript
// Sub-export for Stdio Transport
import { Experimental_StdioMCPTransport as StdioMCPTransport } from '@ai-sdk/mcp/mcp-stdio';

const client = await createMCPClient({
  transport: new StdioMCPTransport({
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem', '/path/to/files']
  })
});
```

### 3. Using Tools
The client converts MCP tools into standard AI SDK tools, ready for use with `generateText` or `streamText`.

```typescript
const tools = await client.tools(); // Returns Record<string, Tool>

const result = await generateText({
  model: openai('gpt-4'),
  tools: tools, // Plug and play
  prompt: 'Analyze the data in the file...'
});
```

## Features & Capabilities

- **Resources:** Support for reading external data as "resources" (`listResources`, `readResource`).
- **Prompts:** Support for fetching and executing prompt templates hosted on the server (`experimental_listPrompts`, `experimental_getPrompt`).
- **Elicitation:** Supports the "elicitation" capability, allowing the server to ask the client for more information/clarification during execution (`onElicitationRequest`).
- **OAuth 2.1:** Built-in support for OAuth flows via the `authProvider` config, including token refresh handling.

## Usage Notes
- **Stdio Transport:** The transport class is exported as `Experimental_StdioMCPTransport` in the current version. It is common practice to alias it: `import { Experimental_StdioMCPTransport as StdioMCPTransport } ...`.
- **Renaming:** While `createMCPClient` handles the client creation, the transport configuration often requires this specific class for local processes.

Deep Dive: @ai-sdk/mcp (v1.0.11)
Overview
@ai-sdk/mcp is a client implementation of the Model Context Protocol (MCP) designed to integrate seamlessly with the Vercel AI SDK. It allows applications to connect to MCP servers to access tools, resources, and prompts, standardizing context provision for LLMs.

Core Architecture
1. 
createMCPClient
The main entry point is 
createMCPClient(config: MCPClientConfig): Promise
.

interface MCPClientConfig {
    transport: MCPTransportConfig | MCPTransport;
    onUncaughtError?: (error: unknown) => void;
    name?: string; // default: 'ai-sdk-mcp-client'
    version?: string; // default: '1.0.0'
    capabilities?: ClientCapabilities;
}
2. 
MCPClient
 Interface
The client exposes methods to interact with the MCP server:

Tools: 
tools(options?)
: Fetches tools from the server, optionally with schema validation. Returns an 
McpToolSet
 compatible with AI SDK.
Resources:
listResources(options?)
: Lists available resources (paginated).
readResource(args)
: Reads the content of a specific resource by URI.
listResourceTemplates(options?)
: Lists resource templates.
Prompts (Experimental):
experimental_listPrompts(options?)
: Lists available prompts.
experimental_getPrompt(args)
: Gets a specific prompt with arguments.
Elicitation: 
onElicitationRequest(schema, handler)
: Handles server requests for user sampling/elicitation.
Lifecycle: 
close()
: Closes the client and transport.
3. Transport
The library supports different transport mechanisms via 
MCPTransportConfig
:

Types: 'sse' (Server-Sent Events) or 'http'.
Configuration:
url: Server URL.
headers: Custom headers.
authProvider: Optional 
OAuthClientProvider
 for authentication.
4. Authentication (OAuth 2.1)
The package includes built-in support for OAuth 2.1 via the 
OAuthClientProvider
 interface and 
auth
 function.

OAuthClientProvider
: Interface for managing tokens (
tokens()
, 
saveTokens()
), handling redirects (
redirectToAuthorization
), and PKCE (
codeVerifier
).
auth
 Function: Helper to perform authentication flows.
Usage Patterns
Connecting to a Server
import { createMCPClient } from '@ai-sdk/mcp';
const client = await createMCPClient({
  transport: {
    type: 'http',
    url: 'http://localhost:3000/mcp',
  },
});
Using Tools with AI SDK
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
const mcpTools = await client.tools();
const result = await generateText({
  model: openai('gpt-4-turbo'),
  tools: mcpTools,
  prompt: '...',
});
Key Findings for TaskMaster CLI
Transport Flexibility: We can use HTTP or SSE. For a CLI, we might also need stdio support if connecting to local MCP servers running as subprocesses. The type definition shows mcp-stdio export in 
package.json
 (./dist/mcp-stdio/index.d.ts), implying stdio support is available but separated.
Auth Integration: The 
OAuthClientProvider
 is crucial for our requirement of securely handling tokens.
Dynamic Discovery: 
listResources
 and 
experimental_listPrompts
 allow dynamic discovery of capabilities, fitting our "dynamic tool discovery" goal.