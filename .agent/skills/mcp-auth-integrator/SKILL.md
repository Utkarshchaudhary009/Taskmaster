---
name: mcp-auth-integrator
description: Expert in integrating Model Context Protocol (MCP) servers with OAuth authentication into projects. Use when adding authenticated MCP servers (GitHub, Supabase, etc.) to applications, implementing secure token management, or building MCP-enabled features with auth.
---

# MCP + Auth Integration Expert

You are an expert in integrating authenticated Model Context Protocol servers into applications, specializing in secure token management, OAuth flows, and production-ready implementations.

## Core Integration Scenarios

1. **Add GitHub MCP** with OAuth to a Next.js/React app
2. **Add Supabase MCP** with RLS and JWT tokens
3. **Add Custom MCP Server** with API key auth
4. **Implement Token Storage** with encryption (AES-256-GCM)
5. **Build MCP Selection UI** for user-facing features

## Prerequisites Check

Before integration, ensure project has:
- [ ] TypeScript configured (strict mode recommended)
- [ ] Environment variable management (.env.local)
- [ ] HTTP client (fetch, axios, or Bun native)
- [ ] Auth provider (Clerk, Supabase Auth, NextAuth, etc.)

## Integration Workflow

### Step 1: Choose MCP Server & Auth Method

**Common MCP Servers**:
| Server | Auth Method | Tokens Required |
|--------|-------------|-----------------|
| GitHub MCP | OAuth 2.1 + PKCE | GitHub Personal Access Token |
| Supabase MCP | JWT from Supabase Auth | Service role key |
| Filesystem MCP | No auth | None (local only) |
| Custom MCP | API Key or OAuth | Depends on server |

Determine auth requirements:
```bash
# Check MCP server documentation
npx @modelcontextprotocol/server-github --help
```

### Step 2: Set Up OAuth Flow (If Needed)

For OAuth-based MCPs (GitHub, GitLab), use the `mcp-oauth-handler` skill:

```typescript
// src/lib/mcp/oauth.ts
import { PKCEGenerator } from '@/lib/pkce';

export async function initiateGitHubOAuth() {
  // Generate PKCE pair
  const { codeVerifier, codeChallenge } = await PKCEGenerator.generate();
  
  // Store verifier securely (encrypted in session/DB)
  await storeCodeVerifier(codeVerifier);
  
  // Build authorization URL
  const authUrl = new URL('https://github.com/login/oauth/authorize');
  authUrl.searchParams.set('client_id', process.env.GITHUB_CLIENT_ID!);
  authUrl.searchParams.set('redirect_uri', process.env.GITHUB_REDIRECT_URI!);
  authUrl.searchParams.set('scope', 'repo read:org');
  authUrl.searchParams.set('state', generateSecureState());
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  
  return authUrl.toString();
}
```

**Security Note**: Reference the `mcp-oauth-handler` skill for complete PKCE implementation.

### Step 3: Implement Token Exchange & Storage

After OAuth callback, exchange code for token:

```typescript
// src/app/api/auth/github/callback/route.ts
import { exchangeCodeForToken } from '@/lib/mcp/oauth';
import { encryptToken } from '@/lib/mcp/encryption';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  
  // Validate state (CSRF protection)
  if (!validateState(state)) {
    return new Response('Invalid state', { status: 400 });
  }
  
  // Retrieve code verifier
  const verifier = await getCodeVerifier();
  
  // Exchange code for token
  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
      code_verifier: verifier,
    }),
  });
  
  const { access_token, expires_in } = await tokenResponse.json();
  
  // Encrypt token before storage
  const encryptedToken = await encryptToken(access_token);
  
  // Store encrypted token in database
  await db.mcpTokens.create({
    data: {
      userId: session.user.id,
      provider: 'github',
      encryptedToken,
      expiresAt: new Date(Date.now() + expires_in * 1000),
    },
  });
  
  return Response.redirect('/dashboard?mcp=github&status=connected');
}
```

### Step 4: Configure MCP Client

Create MCP client configuration that uses stored tokens:

```typescript
// src/lib/mcp/client.ts
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { decryptToken } from './encryption';

export async function createGitHubMCPClient(userId: string) {
  // Retrieve encrypted token from DB
  const tokenRecord = await db.mcpTokens.findFirst({
    where: { userId, provider: 'github' },
  });
  
  if (!tokenRecord) {
    throw new Error('GitHub MCP not connected. Please authenticate first.');
  }
  
  // Check if token expired
  if (tokenRecord.expiresAt < new Date()) {
    throw new Error('Token expired. Please re-authenticate.');
  }
  
  // Decrypt token
  const token = await decryptToken(tokenRecord.encryptedToken);
  
  // Create MCP client with stdio transport
  const transport = new StdioClientTransport({
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-github'],
    env: {
      GITHUB_PERSONAL_ACCESS_TOKEN: token,
    },
  });
  
  const client = new Client({
    name: 'my-app-github-mcp',
    version: '1.0.0',
  }, {
    capabilities: {},
  });
  
  await client.connect(transport);
  
  return client;
}
```

### Step 5: Use MCP in Application Logic

**Example: AI-Powered GitHub Integration**

```typescript
// src/app/api/ai/github/route.ts
import { createGitHubMCPClient } from '@/lib/mcp/client';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';

export async function POST(request: Request) {
  const { prompt, userId } = await request.json();
  
  // Create authenticated MCP client
  const mcpClient = await createGitHubMCPClient(userId);
  
  // List available MCP tools
  const { tools } = await mcpClient.listTools();
  
  // Convert MCP tools to AI SDK format
  const aiTools = tools.map(tool => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.inputSchema,
    execute: async (params) => {
      const result = await mcpClient.callTool({
        name: tool.name,
        arguments: params,
      });
      return result.content;
    },
  }));
  
  // Generate AI response with MCP tools
  const result = await generateText({
    model: google('gemini-2.0-flash-exp'),
    prompt,
    tools: aiTools,
    maxSteps: 5,
  });
  
  // Cleanup
  await mcpClient.close();
  
  return Response.json({ result: result.text });
}
```

### Step 6: Implement Token Encryption

**CRITICAL**: Always encrypt tokens before database storage.

```typescript
// src/lib/mcp/encryption.ts
import { subtle } from 'bun:crypto'; // or Web Crypto API

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;

// Derive encryption key from environment secret
async function getEncryptionKey(): Promise<CryptoKey> {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret) throw new Error('ENCRYPTION_KEY not set');
  
  const encoder = new TextEncoder();
  const keyMaterial = await subtle.importKey(
    'raw',
    encoder.encode(secret),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );
  
  return subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('mcp-tokens-salt'),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptToken(token: string): Promise<string> {
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const encrypted = await subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    new TextEncoder().encode(token)
  );
  
  // Combine IV + encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

export async function decryptToken(encryptedToken: string): Promise<string> {
  const key = await getEncryptionKey();
  const combined = Uint8Array.from(atob(encryptedToken), c => c.charCodeAt(0));
  
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);
  
  const decrypted = await subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    data
  );
  
  return new TextDecoder().decode(decrypted);
}
```

### Step 7: Build User-Facing MCP Management UI

```typescript
// src/components/mcp-connections.tsx
'use client';

import { useState } from 'react';

export function MCPConnections() {
  const [connections, setConnections] = useState([
    { provider: 'github', connected: false },
    { provider: 'supabase', connected: false },
  ]);
  
  async function connectMCP(provider: string) {
    if (provider === 'github') {
      // Initiate OAuth flow
      const authUrl = await fetch('/api/mcp/auth/github/initiate').then(r => r.json());
      window.location.href = authUrl.url;
    }
  }
  
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">MCP Connections</h2>
      {connections.map(conn => (
        <div key={conn.provider} className="flex items-center justify-between p-4 border rounded">
          <div>
            <h3 className="font-semibold capitalize">{conn.provider} MCP</h3>
            <p className="text-sm text-gray-600">
              {conn.connected ? 'Connected ✅' : 'Not connected'}
            </p>
          </div>
          {!conn.connected && (
            <button
              onClick={() => connectMCP(conn.provider)}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Connect
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
```

## Database Schema

Add MCP tokens table to your schema:

```prisma
// prisma/schema.prisma
model MCPToken {
  id             String   @id @default(cuid())
  userId         String
  provider       String   // 'github', 'supabase', etc.
  encryptedToken String   @db.Text
  refreshToken   String?  @db.Text
  expiresAt      DateTime
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([userId, provider])
  @@index([userId])
}
```

## Environment Variables Setup

```bash
# .env.local

# OAuth Configuration
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_REDIRECT_URI=http://localhost:3000/api/auth/github/callback

# Token Encryption (generate with: openssl rand -base64 32)
ENCRYPTION_KEY=your_32_byte_base64_key

# Database
DATABASE_URL=postgresql://...
```

## Security Checklist

Before deploying MCP auth integration:

- [ ] Tokens encrypted with AES-256-GCM before DB storage
- [ ] PKCE used for OAuth flows (no plain authorization code flow)
- [ ] State parameter validated (CSRF protection)
- [ ] Environment variables never committed to Git
- [ ] Token expiration checked before MCP client creation
- [ ] Refresh token flow implemented (if server supports)
- [ ] HTTPS enforced for OAuth redirects (production)
- [ ] Rate limiting on token endpoints
- [ ] Audit logging for token operations

## Testing MCP Integration

```typescript
// src/__tests__/mcp-integration.test.ts
import { test, expect, describe } from 'bun:test';
import { createGitHubMCPClient } from '@/lib/mcp/client';

describe('MCP Integration', () => {
  test('creates authenticated client', async () => {
    const client = await createGitHubMCPClient('test-user-id');
    const tools = await client.listTools();
    
    expect(tools).toBeDefined();
    expect(tools.tools.length).toBeGreaterThan(0);
    
    await client.close();
  });
  
  test('encrypts and decrypts tokens', async () => {
    const originalToken = 'github_pat_test123';
    const encrypted = await encryptToken(originalToken);
    const decrypted = await decryptToken(encrypted);
    
    expect(decrypted).toBe(originalToken);
    expect(encrypted).not.toBe(originalToken);
  });
});
```

## Quick Commands

| Task | Command |
|------|---------|
| Generate PKCE | `bun run .agent/skills/mcp-oauth-handler/scripts/generate-pkce.ts` |
| Validate config | `bun run .agent/skills/mcp-config-validator/scripts/validate-security.ts` |
| Test encryption | `bun test src/lib/mcp/encryption.test.ts` |
| Run dev server | `bun run dev` |

## Common Pitfalls

❌ **Don't**: Store tokens in localStorage (XSS risk)  
✅ **Do**: Store encrypted tokens in database, server-side only

❌ **Don't**: Use plain OAuth code flow  
✅ **Do**: Always use PKCE for public clients

❌ **Don't**: Skip token expiration checks  
✅ **Do**: Implement automatic refresh or re-auth flow

❌ **Don't**: Hardcode MCP server paths  
✅ **Do**: Use environment variables or user configuration

## Advanced: Multi-Tenant MCP

For SaaS applications with multiple users/teams:

```typescript
// src/lib/mcp/multi-tenant.ts
export async function createTeamMCPClient(teamId: string, provider: string) {
  // Retrieve team-level token (not user-level)
  const token = await db.teamMCPTokens.findUnique({
    where: { teamId_provider: { teamId, provider } },
  });
  
  // Rate limiting per team
  await checkTeamRateLimit(teamId, provider);
  
  // Audit log
  await logMCPUsage(teamId, provider, 'client_created');
  
  return createMCPClient(provider, token.encryptedToken);
}
```

## Reference Skills

- **OAuth Implementation**: See `mcp-oauth-handler` skill for PKCE generation
- **Config Validation**: See `mcp-config-validator` skill for security checks
- **TypeScript Patterns**: See `bun-typescript-optimizer` skill for type safety

## Troubleshooting

**"Token expired"**: Implement refresh token flow or prompt user to re-authenticate

**"MCP server not responding"**: Check that `npx` command is in PATH and server package is accessible

**"Encryption key missing"**: Set `ENCRYPTION_KEY` environment variable (32-byte base64)

**"CORS errors"**: Ensure OAuth redirect URI matches exactly (including protocol and port)

---

**Output**: Fully functional MCP integration with secure auth, encrypted token storage, and production-ready patterns.
