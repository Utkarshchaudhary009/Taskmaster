# GitHub OAuth with @ai-sdk/mcp

This guide explains how to integrate GitHub OAuth with `@ai-sdk/mcp` to authenticate users for secure MCP server access.

## The Flow

1.  **Trigger**: The AI application (MCP Client) connects to an MCP server (e.g., a GitHub MCP server).
2.  **Challenge**: The server responds with `401 Unauthorized` and a `WWW-Authenticate` header pointing to its OAuth metadata.
3.  **Discovery**: The SDK discovers the authorization endpoint (GitHub's OAuth page).
4.  **Redirect**: The SDK calls your `OAuthClientProvider.redirectToAuthorization()`, sending the user to GitHub.
5.  **User Action**: User approves the app on GitHub.
6.  **Callback**: GitHub redirects the user back to your application's `redirect_uri` with a `code`.
7.  **Exchange**: Your application captures the `code` and calls the `auth()` function (or re-initializes the client) to exchange it for an access token.
8.  **Access**: The token is stored via `saveTokens()` and attached to subsequent requests.

## Implementation Guide

### 1. The Provider
You need a custom `OAuthClientProvider` that knows how to handle tokens and redirection.

```typescript
import { OAuthClientProvider, OAuthTokens } from '@ai-sdk/mcp';

export class GitHubOAuthProvider implements OAuthClientProvider {
  constructor(
    private clientId: string,
    private redirectUri: string,
    // Storage mechanism (e.g., DB, session, file)
    private storage: {
      getTokens: () => Promise<OAuthTokens | undefined>;
      saveTokens: (t: OAuthTokens) => Promise<void>;
    }
  ) {}

  async tokens() {
    return this.storage.getTokens();
  }

  async saveTokens(tokens: OAuthTokens) {
    await this.storage.saveTokens(tokens);
  }

  async redirectToAuthorization(url: URL) {
    // CLI: Open browser
    // Web: Window.location.href = url
    console.log(`Please log in at: ${url.toString()}`);
  }

  async saveCodeVerifier(verifier: string) {
    // Save this securely! It's needed for the callback step.
    // e.g., Set a cookie or save to session.
  }

  async codeVerifier() {
    // Retrieve the saved verifier
    return 'retrieved-verifier';
  }

  get redirectUrl() {
    return new URL(this.redirectUri);
  }

  get clientMetadata() {
    return {
      redirect_uris: [this.redirectUri],
      token_endpoint_auth_method: 'none', // GitHub uses POST body for secrets usually
    };
  }
}
```

### 2. The Client Initialization
Pass your provider when creating the client.

```typescript
const client = await createMCPClient({
  transport: {
    type: 'http',
    url: 'https://mcp-github-server.com/mcp',
    authProvider: new GitHubOAuthProvider(...),
  },
});
```

### 3. Handling the Callback (Crucial Step)
When GitHub redirects back to your `redirectUri` (e.g., `http://localhost:3000/callback?code=xyz`), you must:

1.  Extract the `code` parameter.
2.  Re-invoke the auth flow to perform the exchange.

**SDK Helper for Callback:**
The `@ai-sdk/mcp` package exports an `auth` function. You can use this to manually complete the exchange if your architecture requires it (e.g., in a route handler), or simply re-creating the client with the same provider might trigger the exchange if you've primed the provider with the code.

However, the cleanest way in a stateless environment (like a server route) is often:

```typescript
// On /callback route:
const code = req.query.code;

// 1. Instantiate provider
const provider = new GitHubOAuthProvider(...);

// 2. Call auth() manually to exchange code
// Note: You must import 'auth' from '@ai-sdk/mcp'
import { auth } from '@ai-sdk/mcp';

await auth(provider, {
  serverUrl: 'https://mcp-github-server.com/mcp',
  authorizationCode: code,
});

// 3. Now provider.saveTokens() has been called internally.
// Redirect user to success page.
```

## GitHub Specifics

*   **Scopes**: Ensure you request the correct scopes (e.g., `repo`, `user`) in your `clientMetadata` or initial auth request.
*   **Redirect URI**: Must match exactly what is registered in GitHub Developer Settings.
*   **Client Secret**: If using a Confidential Client flow (server-side), you'll need to handle the client secret injection. The SDK supports `client_secret_post` auth method, which you can configure in `clientMetadata`.
