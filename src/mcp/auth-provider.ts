import { type OAuthClientProvider, type OAuthTokens } from '@ai-sdk/mcp';
import { TokenStorage } from './token-storage.js';
import { OAuthUtils } from './oauth-utils.js';

export class TaskMasterAuthProvider implements OAuthClientProvider {
  private tokensData: OAuthTokens | undefined;
  
  constructor(
    private serverName: string,
    private serverUrl: string,
    private storage: TokenStorage
  ) {}

  async tokens() {
    if (!this.tokensData) {
      this.tokensData = await this.storage.get(this.serverName);
    }
    return this.tokensData;
  }

  async saveTokens(tokens: OAuthTokens) {
    this.tokensData = tokens;
    await this.storage.save(this.serverName, tokens);
  }

  async redirectToAuthorization(url: URL) {
    console.log(`
🔐 Authentication required for ${this.serverName}`);
    console.log(`Opening browser...`);
    
    // Native Bun browser launch replacing 'open' package
    const link = url.toString();
    const platform = process.platform;

    try {
      if (platform === 'darwin') {
        Bun.spawn(['open', link]);
      } else if (platform === 'win32') {
        // Windows 'start' is a shell command, so we use 'cmd /c start'
        // Escape & characters for Windows shell if needed, but URL mostly safe
        Bun.spawn(['cmd', '/c', 'start', '', link.replace(/&/g, '^&')]);
      } else {
        // Linux (xdg-open is standard)
        Bun.spawn(['xdg-open', link]);
      }
    } catch (e) {
      console.error(`Failed to open browser automatically. Please open this link:
${link}`);
    }
  }

  async authenticate() {
    console.log(`Discovering auth configuration for ${this.serverUrl}...`);
    const config = await OAuthUtils.discoverConfig(this.serverUrl);
    
    if (!config) {
      throw new Error(`Could not discover OAuth configuration for ${this.serverUrl}`);
    }

    const clientId = "taskmaster-client"; 
    const { codeVerifier, codeChallenge, state } = await OAuthUtils.generatePKCE();

    // Bun.serve is highly optimized (uses native system calls)
    const server = Bun.serve({
      port: 0, 
      fetch: async (req) => {
        const url = new URL(req.url);
        if (url.pathname === '/callback') {
          const code = url.searchParams.get('code');
          const returnedState = url.searchParams.get('state');

          if (returnedState !== state) return new Response("State mismatch!", { status: 400 });
          if (code) {
            try {
              await this.exchangeCode(code, codeVerifier, config.token_endpoint, clientId, `http://localhost:${server.port}/callback`);
              return new Response("<h1>Authentication Successful!</h1><p>You can close this window.</p>", { 
                headers: { "Content-Type": "text/html" } 
              });
            } catch (e) {
              return new Response(`Error exchanging token: ${e}`, { status: 500 });
            } finally {
              // Graceful shutdown
              setTimeout(() => server.stop(), 500);
            }
          }
        }
        return new Response("Not found", { status: 404 });
      }
    });

    const redirectUri = `http://localhost:${server.port}/callback`;
    
    const authUrl = new URL(config.authorization_endpoint);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');
    authUrl.searchParams.set('state', state);
    if (config.scopes_supported) {
        authUrl.searchParams.set('scope', config.scopes_supported.join(' '));
    }

    await this.redirectToAuthorization(authUrl);
    console.log(`Waiting for callback on port ${server.port}...`);
  }

  private async exchangeCode(code: string, verifier: string, tokenEndpoint: string, clientId: string, redirectUri: string) {
    console.log('Exchanging code for token...');
    
    // Bun's native fetch
    const resp = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        code: code,
        redirect_uri: redirectUri,
        code_verifier: verifier
      })
    });

    if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Token exchange failed: ${text}`);
    }

    const tokens = await resp.json() as OAuthTokens;
    await this.saveTokens(tokens);
    console.log('✅ Authentication successful and saved.');
  }

  async saveCodeVerifier(codeVerifier: string) { /* handled internally */ }
  async codeVerifier() { return ''; }
  get redirectUrl() { return new URL('http://localhost'); }
  get clientMetadata() { return { redirect_uris: [] }; }
}