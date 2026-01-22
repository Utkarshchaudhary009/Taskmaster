# Gemini CLI MCP Authentication Analysis

This document analyzes how the official Gemini CLI handles Model Context Protocol (MCP) and its authentication, based on the codebase in `packages/core` and `packages/cli`.

## Core Architecture

The MCP implementation is split between the core logic and the CLI interface:

*   **Core Logic (`packages/core`)**: Handles the "business logic" of MCP connections, OAuth flows, and token management.
    *   `src/tools/mcp-client.ts`: Main client that manages connections and tool discovery.
    *   `src/mcp/oauth-provider.ts`: Implements the OAuth 2.0 flow (PKCE, discovery, etc.).
    *   `src/mcp/oauth-utils.ts`: Utilities for OAuth metadata discovery (RFC 8414/9728).
    *   `src/mcp/oauth-token-storage.ts`: Secure storage for tokens.
*   **CLI Interface (`packages/cli`)**: Handles user commands.
    *   `src/ui/commands/mcpCommand.ts`: Implements `/mcp auth`, `/mcp list`, etc.

## Authentication Flow

The Gemini CLI implements a robust **OAuth 2.0 Authorization Code Flow with PKCE** for MCP servers.

### 1. Discovery phase
When connecting to an MCP server (or running `/mcp auth`), the CLI attempts to discover OAuth configuration in three ways:
1.  **WWW-Authenticate Header**: If a request fails with `401 Unauthorized`, it parses the `WWW-Authenticate` header for a `resource_metadata` URI.
2.  **Protected Resource Metadata**: It fetches `/.well-known/oauth-protected-resource` to find the associated authorization server.
3.  **Authorization Server Metadata**: It fetches `/.well-known/oauth-authorization-server` (or OpenID configuration) to get endpoints (`authorization_endpoint`, `token_endpoint`, `registration_endpoint`).

### 2. Dynamic Client Registration
If the user hasn't provided a `clientId` in settings, the CLI attempts **Dynamic Client Registration** (RFC 7591).
*   It POSTs to the `registration_endpoint` with metadata like `redirect_uris` and `client_name`.
*   It receives a `client_id` (and optional `client_secret`) to use for the session.

### 3. Authorization Request (PKCE)
*   **PKCE Generation**: Generates a `code_verifier` and `code_challenge` (S256).
*   **Local Server**: Starts a temporary local HTTP server (on a random or specified port) to listen for the redirect callback.
*   **Browser Launch**: Opens the user's default browser pointing to the `authorization_endpoint` with `code_challenge`, `client_id`, `redirect_uri` (e.g., `http://localhost:12345/oauth/callback`), and `scope`.

### 4. Callback & Token Exchange
*   **Redirect**: The OAuth provider redirects the user back to the local server with a `code`.
*   **Exchange**: The CLI exchanges the `code` and `code_verifier` for an `access_token` (and `refresh_token`) at the `token_endpoint`.
*   **Compliance**: It validates that the `state` parameter matches to prevent CSRF.

### 5. Storage & Usage
*   **Storage**: Tokens are saved securely via `MCPOAuthTokenStorage` (typically an encrypted file).
*   **Usage**: The `McpClient` injects the `Authorization: Bearer <token>` header into all subsequent MCP requests (HTTP or SSE).
*   **Refresh**: It automatically refreshes tokens using the `refresh_token` when they expire.

## Key Code Components

### `MCPOAuthProvider` (`packages/core/src/mcp/oauth-provider.ts`)
This is the workhorse class.
*   `authenticate()`: Orchestrates the full flow.
*   `startCallbackServer()`: Spins up the `http` server for the redirect.
*   `exchangeCodeForToken()`: Handles the POST to the token endpoint.
*   `registerClient()`: Handles dynamic registration.

### `McpClient` (`packages/core/src/tools/mcp-client.ts`)
Handles the connection lifecycle.
*   `connectToMcpServer()`: Tries to connect. If it hits a 401, it pauses to check for `WWW-Authenticate` headers and triggers the OAuth flow if configured.
*   `createTransport()`: Selects the transport (SSE/HTTP/Stdio) and attaches the auth provider.

### `OAuthUtils` (`packages/core/src/mcp/oauth-utils.ts`)
Implements the discovery standards.
*   `discoverOAuthConfig()`: The main entry point for finding auth config from a server URL.
*   `buildWellKnownUrls()`: Constructs standard paths.

## User Experience
The user typically interacts via:
*   **Automatic**: If a server returns 401 and metadata is present, the CLI might prompt or handle it (though manual trigger is often safer/preferred).
*   **Manual**: `/mcp auth <server-name>` triggers the `authenticate` method in `MCPOAuthProvider`.
*   **Feedback**: The CLI provides visual feedback (spinners, success messages) via the UI context.
