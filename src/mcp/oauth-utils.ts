import { z } from 'zod';

export const OAuthMetadataSchema = z.object({
  authorization_endpoint: z.string(),
  token_endpoint: z.string(),
  registration_endpoint: z.string().optional(),
  scopes_supported: z.array(z.string()).optional(),
});

export const ResourceMetadataSchema = z.object({
  resource: z.string(),
  authorization_servers: z.array(z.string()).optional(),
});

export class OAuthUtils {
  static async discoverConfig(serverUrl: string) {
    const url = new URL(serverUrl);
    const base = `${url.protocol}//${url.host}`;
    
    // Parallelize discovery for speed
    const [protectedResource, wellKnown] = await Promise.all([
        this.fetchProtectedResource(base),
        this.fetchWellKnown(base)
    ]);

    if (protectedResource?.authorization_servers?.[0]) {
       return this.discoverAuthServer(protectedResource.authorization_servers[0]);
    }

    return wellKnown || this.discoverAuthServer(base);
  }

  private static async fetchProtectedResource(base: string) {
    try {
      const resp = await fetch(`${base}/.well-known/oauth-protected-resource`);
      if (resp.ok) return ResourceMetadataSchema.parse(await resp.json());
    } catch {}
    return null;
  }

  private static async fetchWellKnown(base: string) {
      // Direct discovery fallback
      return this.discoverAuthServer(base);
  }

  static async discoverAuthServer(issuer: string) {
    const wellKnown = `${issuer.replace(/\/$/, '')}/.well-known/oauth-authorization-server`;
    try {
      const resp = await fetch(wellKnown);
      if (!resp.ok) return null;
      return OAuthMetadataSchema.parse(await resp.json());
    } catch (e) {
      console.error('Discovery failed:', e);
      return null;
    }
  }

  static async generatePKCE() {
    // Bun implements the Web Crypto API standard natively and efficiently
    const codeVerifier = Buffer.from(crypto.getRandomValues(new Uint8Array(32)))
      .toString('base64url');
    
    // Use crypto.subtle for max performance (hardware accelerated)
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const codeChallenge = Buffer.from(hashBuffer).toString('base64url');

    return { codeVerifier, codeChallenge, state: crypto.randomUUID() };
  }
}