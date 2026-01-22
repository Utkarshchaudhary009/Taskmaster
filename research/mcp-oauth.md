# OAuth with @ai-sdk/mcp

The `@ai-sdk/mcp` package (from v1.0.0 onwards) includes first-class support for OAuth 2.1 authentication when connecting to MCP servers. This is crucial for accessing secure MCP resources that require user context or authorization.

## The OAuthClientProvider Interface

To implement custom authentication, you need to provide an object that satisfies the `OAuthClientProvider` interface. This interface handles the lifecycle of tokens (access, refresh) and the authorization flow.

### Core Methods

*   **`tokens()`**: Returns the current access token (and optional refresh token).
*   **`saveTokens(tokens)`**: Persists new tokens after a successful exchange or refresh.
*   **`redirectToAuthorization(url)`**: Handles the user-facing step of redirecting to the auth provider.
*   **`saveCodeVerifier(codeVerifier)`**: Stores the PKCE code verifier for the callback step.
*   **`codeVerifier()`**: Retrieves the stored PKCE verifier.
*   **`refreshTokens`**: While not explicitly a method you always call manually, the internal logic uses the refresh token (if present) to get a new access token when the current one expires.

## Conceptual Implementation

Below is a robust conceptual implementation of an `OAuthClientProvider`.

```typescript
import { createMCPClient, OAuthClientProvider, OAuthTokens } from '@ai-sdk/mcp';

class MyOAuthProvider implements OAuthClientProvider {
  private _tokens: OAuthTokens | undefined;
  
  constructor(
    private readonly clientId: string,
    private readonly redirectUri: string,
    private readonly authEndpoint: string,
    private readonly tokenEndpoint: string
  ) {}

  async tokens(): Promise<OAuthTokens | undefined> {
    // 1. Check in-memory or persistent storage
    // 2. Check for expiration
    // 3. Return valid tokens
    return this._tokens;
  }

  async saveTokens(tokens: OAuthTokens): Promise<void> {
    this._tokens = tokens;
    // Persist to database/session storage here
  }

  async redirectToAuthorization(url: URL): Promise<void> {
    // For web apps: window.location.href = url.toString();
    // For Node apps: print URL to console or open system browser
    console.log('Please authenticate at:', url.toString());
  }

  async saveCodeVerifier(codeVerifier: string): Promise<void> {
    // Store securely (e.g., HTTP-only cookie, secure session)
    // for the callback phase
  }

  async codeVerifier(): Promise<string> {
    // Retrieve the stored verifier
    return 'retrieved-verifier';
  }

  get redirectUrl(): URL {
    return new URL(this.redirectUri);
  }

  get clientMetadata() {
    return {
      redirect_uris: [this.redirectUri],
      token_endpoint_auth_method: 'none', // or 'client_secret_post' etc.
    };
  }
  
  async clientInformation() {
      // Optional: Return client info if dynamic registration is used
      return { client_id: this.clientId };
  }
}
```

## Integrating with createMCPClient

Once you have your provider, pass it to the `transport` configuration:

```typescript
const client = await createMCPClient({
  transport: {
    type: 'http',
    url: 'https://secure-mcp-server.com/mcp',
    authProvider: new MyOAuthProvider(
      'my-client-id',
      'http://localhost:3000/callback',
      'https://auth.example.com/authorize',
      'https://auth.example.com/token'
    ),
  },
});
```

## The Authorization Flow

1.  **Initialization**: When `createMCPClient` is called, it initializes the transport.
2.  **Challenge**: If the MCP server returns a 401 (Unauthorized) or indicates auth is needed, the client consults the `authProvider`.
3.  **Token Check**: It calls `tokens()`. If a valid access token exists, it's used.
4.  **Refresh (if needed)**: If the token is expired but a refresh token exists, the client (or provider logic) attempts a refresh.
5.  **Redirect**: If no valid tokens are available, the client constructs an authorization URL and calls `redirectToAuthorization()`.
6.  **Callback**: After the user approves, your app's callback handler must capture the `code` and `state`. You typically then manually trigger the code exchange or let the SDK helper (if available/exposed) handle the exchange using the stored code verifier. *Note: The exact callback handling mechanism often involves re-instantiating the flow or using helper functions provided by the SDK's auth module.*

## Key Considerations

*   **PKCE**: The SDK uses PKCE (Proof Key for Code Exchange) by default for security, hence the need for `saveCodeVerifier` and `codeVerifier`.
*   **Persistence**: In a real app, `saveTokens` and `tokens` must interface with a secure storage mechanism (Cookies, LocalStorage, encrypted database).
*   **Error Handling**: Robust implementations should handle `refresh_token` failures by forcing a new login flow.

Deep Dive: OAuth in @ai-sdk/mcp
architecture Overview
Authentication in @ai-sdk/mcp is designed around the OAuth 2.1 standard (incorporating PKCE) and is tightly integrated into the HTTP and SSE transports.

Key Components:

Transport Layer (
HttpMCPTransport
 / 
SseMCPTransport
):
Automatically injects Authorization: Bearer <token> headers if an authProvider is configured.
Intercepts 401 Unauthorized responses.
Triggers the 
auth(...)
 flow to refresh tokens or initiate a new login flow when a 401 occurs.
auth
 Function:
A built-in helper that orchestrates the complex OAuth dance:
Discovery (Metadata, DCR).
Authorization Code Flow (PKCE).
Token Refresh.
Crucially: It relies on an abstract provider to handle side-effects (redirecting users, saving tokens).
OAuthClientProvider
 Interface:
This is what you must implement. There is no "default" provider exported by the package.
It acts as the bridge between the logic (finding the token URL) and the environment (saving the token to disk/db, opening a browser).
The 
OAuthClientProvider
 Interface
To use OAuth, you must provide an object satisfying this interface (defined in 
index.d.ts
):

interface OAuthClientProvider {
    // 1. Token Management
    tokens(): Promise<OAuthTokens | undefined>;
    saveTokens(tokens: OAuthTokens): Promise<void>;
    invalidateCredentials?(scope: 'all' | 'client' | 'tokens' | 'verifier'): Promise<void>;
    // 2. Client Metadata (DCR - Dynamic Client Registration)
    get clientMetadata(): OAuthClientMetadata;
    clientInformation(): Promise<OAuthClientInformation | undefined>;
    saveClientInformation?(info: OAuthClientInformation): Promise<void>;
    // 3. Authorization Flow (User Interaction)
    redirectToAuthorization(url: URL): Promise<void>; // e.g. open system browser
    get redirectUrl(): string | URL; // e.g. http://localhost:8080/callback
    
    // 4. PKCE State
    codeVerifier(): Promise<string>;
    saveCodeVerifier(verifier: string): Promise<void>;
    state?(): Promise<string>;
    
    // 5. Customization
    validateResourceURL?(serverUrl: string | URL, resource?: string): Promise<URL | undefined>;
}
How It Works (The Flow)
Init: You pass your 
OAuthClientProvider
 to 
createMCPClient
.
Request: Client sends a request. Transport adds existing token (if 
tokens()
 returns one).
401 Handling:
If the server returns 401, the transport calls the internal 
auth(provider, ...)
 structure.
auth
 realizes the token is invalid or missing.
It tries using the refresh token (if available).
If that fails, it initiates a full login:
Discovers auth endpoints (.well-known/...).
Generates PKCE verifier (calls 
saveCodeVerifier
).
Constructs Auth URL.
Calls 
redirectToAuthorization(url)
 (User logs in).
Callback:
Your local server (listening on 
redirectUrl
) receives the code.
Important: The Client does NOT automatically listen for the callback. Your application must have a route/server to catch the redirect.
Once you have the 
code
, you seem to need to trigger the exchange manually or let the retry mechanism handle it?
Correction based on code analysis: The 
authInternal
 function inside 
index.mjs
 handles 
exchangeAuthorization
. But since 
auth
 is called by the transport during a retry loop, it expects the flow to be synchronous or promised-based.
Wait: 
authInternal
 returns "REDIRECT" status if it had to redirect. The transport (e.g. 
SseMCPTransport
) sees "REDIRECT" and... stops. It does not automatically pause and wait for the code.
Re-entry: The 
auth
 function logic implies that if you have an authorizationCode (e.g. passed back from your callback handler), you call 
auth
 again with that code to complete the exchange.
Implementation Guide (Conceptual)
Since there is no default provider, you would likely build a LocalOAuthProvider using node:http for the callback and node:fs for storage.

import { createMCPClient } from '@ai-sdk/mcp';
// 1. Implement the Provider
const myAuthProvider = {
    async tokens() { return readTokensFromDisk(); },
    async saveTokens(t) { writeTokensToDisk(t); },
    // ... implement other methods ...
    async redirectToAuthorization(url) { 
        console.log("Please visit:", url.href);
        // open(url.href) 
    },
    redirectUrl: "http://localhost:3000/callback"
};
// 2. Initialize Client
const client = await createMCPClient({
    transport: {
        type: 'sse', // or 'http'
        url: 'https://my-mcp-server.com/sse',
        authProvider: myAuthProvider
    }
});
// 3. Handling the Callback
// You need a separate HTTP server listening on port 3000.
// When you get /callback?code=xyz:
// Call the 'auth' helper directly to exchange the code? 
// OR the client expects the user to re-trigger the action?
Note: The integration of the "callback" step back into the 
client
 instance is slightly opaque in the automated flow. The transport simply fails/rejects if 
auth
 returns "REDIRECT". The application layer likely needs to handle the "login required" error, facilitate the login, and then retry the operation.