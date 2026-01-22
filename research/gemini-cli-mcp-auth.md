# Gemini CLI MCP & Auth Implementation Research

This document details how the official [Gemini CLI](https://github.com/google-gemini/gemini-cli) handles the Model Context Protocol (MCP) and its authentication mechanisms, based on codebase analysis.

## Core Architecture

The MCP implementation is primarily located in `packages/core/src/mcp/` and `packages/core/src/tools/`.

### Key Components

1.  **`McpClient`** (`packages/core/src/tools/mcp-client.ts`):
    *   The main client class that wraps the underlying `@modelcontextprotocol/sdk` client.
    *   Handles connection lifecycle, tool/resource/prompt discovery, and error handling.
    *   **Automatic Auth Trigger**: It intercepts connection errors. If a `401 Unauthorized` occurs, or if `httpUrl` connection fails, it attempts to discover authentication requirements.
    *   It supports **Stdio**, **SSE**, and **HTTP** transports.

2.  **`MCPOAuthProvider`** (`packages/core/src/mcp/oauth-provider.ts`):
    *   Implements a full **OAuth 2.1** client with **PKCE** (Proof Key for Code Exchange).
    *   **Dynamic Client Registration (DCR)**: It can automatically register itself as a client with the MCP server's auth provider if supported (`registerClient`).
    *   **Discovery**: Implements robust discovery of OAuth endpoints using RFC 8414 (Authorization Server Metadata) and RFC 9728 (OAuth 2.0 Protected Resource Metadata).
    *   **Local Callback Server**: Starts a temporary local Node.js HTTP server (on a random or specified port) to handle the OAuth redirect callback (`startCallbackServer`).

3.  **`MCPOAuthTokenStorage`** (`packages/core/src/mcp/oauth-token-storage.ts`):
    *   Manages persistence of OAuth tokens.
    *   Uses a filesystem-based approach, saving tokens to a specific config path using `Storage.getMcpOAuthTokensPath()`.
    *   Supports an optional "Hybrid" storage (likely encrypted) via `HybridTokenStorage`.

4.  **`GoogleCredentialProvider`** (`packages/core/src/mcp/google-auth-provider.ts`):
    *   A specialized provider for Google services.
    *   Uses `google-auth-library` to fetch **Application Default Credentials (ADC)**.
    *   Automatically manages token lifecycles and injects the `Authorization: Bearer <token>` header.
    *   Also handles `X-Goog-User-Project` headers for quota management.

## Authentication Flow (The "Dance")

The Gemini CLI implements a "Resource-First" authentication flow, often referred to as "Step-up Authentication" or deferred auth.

1.  **Transport Connection Attempt**:
    *   The client first tries to connect to the MCP server *without* explicitly prompting for auth, unless credentials are already cached.
    *   It checks `MCPOAuthTokenStorage` for existing valid tokens.

2.  **Challenge (401)**:
    *   If the connection fails with `401 Unauthorized`, the `McpClient` inspects the `WWW-Authenticate` header (parsed in `extractWWWAuthenticateHeader`).
    *   It looks for the `resource_metadata` attribute in the header to find the OAuth configuration endpoint.

3.  **Discovery**:
    *   `OAuthUtils.discoverOAuthConfig` is called.
    *   It checks standard `.well-known` paths (e.g., `/.well-known/oauth-protected-resource`).
    *   It fetches metadata to find the `authorization_endpoint`, `token_endpoint`, and `registration_endpoint`.

4.  **Registration (Optional)**:
    *   If the server requires it, the CLI dynamically registers itself using `registerClient` to get a `client_id`.

5.  **User Authorization**:
    *   Generates **PKCE** verifier and challenge.
    *   Constructs the authorization URL.
    *   **Opens the System Browser** for the user to log in.
    *   Simultaneously starts a **local HTTP server** (`startCallbackServer`) to listen for the redirect.

6.  **Token Exchange**:
    *   The local server captures the auth `code` from the browser redirect.
    *   Calls `exchangeCodeForToken` to swap the code + verifier for an `access_token` and `refresh_token`.

7.  **Reconnect**:
    *   The transport is re-created with the new `Authorization` header.
    *   The connection is retried.

## Implementation Details for TaskMaster

To replicate this robust behavior in TaskMaster:

*   **Do not hardcode auth flows**: Use discovery. The CLI doesn't assume it knows the auth server; it asks the resource server where to authenticate.
*   **Local Callback Server**: We need a temporary HTTP server for the OAuth callback if we are building a CLI.
*   **Token Storage**: We need a secure way to store these tokens (e.g., system keychain or encrypted file).
*   **Transport Flexibility**: We should support switching between HTTP and SSE as the Gemini CLI does (trying HTTP first, falling back to SSE).

## Code Snippets of Interest

**Detecting Auth Requirement:**
```typescript
// packages/core/src/tools/mcp-client.ts
if (isAuthenticationError(error) && hasNetworkTransport(mcpServerConfig)) {
  const wwwAuthenticate = extractWWWAuthenticateHeader(errorString);
  // ... trigger discovery
}
```

**Starting Callback Server:**
```typescript
// packages/core/src/mcp/oauth-provider.ts
private startCallbackServer(expectedState: string, port?: number) {
  const server = http.createServer(async (req, res) => {
    // ... handle callback ...
    res.end('Authentication Successful! You can close this window.');
    server.close();
  });
  server.listen(0); // Random port
}
```
