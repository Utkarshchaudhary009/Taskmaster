#!/usr/bin/env bun

/**
 * PKCE (Proof Key for Code Exchange) Generator
 * 
 * Generates cryptographically secure code verifier and code challenge
 * for OAuth 2.1 with PKCE flow.
 * 
 * Spec: RFC 7636 - https://tools.ietf.org/html/rfc7636
 */

import { randomBytes } from 'crypto';

interface PKCEPair {
    codeVerifier: string;
    codeChallenge: string;
    codeChallengeMethod: 'S256';
}

class PKCEGenerator {
    /**
     * Generate a cryptographically secure code verifier (43-128 chars)
     * Uses URL-safe base64 encoding
     */
    static generateCodeVerifier(length: number = 64): string {
        if (length < 43 || length > 128) {
            throw new Error('Code verifier length must be between 43 and 128 characters');
        }

        // Generate random bytes (need more bytes than chars due to encoding)
        const bytes = randomBytes(Math.ceil(length * 3 / 4));

        // URL-safe base64 encoding
        const verifier = bytes
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '')
            .substring(0, length);

        return verifier;
    }

    /**
     * Generate S256 code challenge from verifier
     * Uses SHA-256 hash
     */
    static async generateCodeChallenge(verifier string): Promise<string> {
        // Use Bun's native Web Crypto API
        const encoder = new TextEncoder();
        const data = encoder.encode(verifier);

        // SHA-256 hash
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = new Uint8Array(hashBuffer);

        // URL-safe base64 encoding
        const challenge = btoa(String.fromCharCode(...hashArray))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');

        return challenge;
    }

    /**
     * Generate complete PKCE pair
     */
    static async generate(verifierLength: number = 64): Promise<PKCEPair> {
        const codeVerifier = this.generateCodeVerifier(verifierLength);
        const codeChallenge = await this.generateCodeChallenge(codeVerifier);

        return {
            codeVerifier,
            codeChallenge,
            codeChallengeMethod: 'S256'
        };
    }

    /**
     * Generate secure random state parameter for CSRF protection
     */
    static generateState(length: number = 32): string {
        const bytes = randomBytes(length);
        return bytes.toString('hex');
    }
}

// CLI Execution
if (import.meta.main) {
    const verifierLength = parseInt(process.argv[2]) || 64;

    if (verifierLength < 43 || verifierLength > 128) {
        console.error('❌ Code verifier length must be between 43 and 128');
        process.exit(1);
    }

    console.log('\n🔐 Generating PKCE Pair...\n');

    const pkce = await PKCEGenerator.generate(verifierLength);
    const state = PKCEGenerator.generateState();

    console.log('✅ PKCE Generation Complete!\n');
    console.log('📋 Results:\n');
    console.log(`Code Verifier:  ${pkce.codeVerifier}`);
    console.log(`Code Challenge: ${pkce.codeChallenge}`);
    console.log(`Challenge Method: ${pkce.codeChallengeMethod}`);
    console.log(`State Parameter: ${state}`);
    console.log('\n💡 Usage:\n');
    console.log('1. Store code_verifier securely (you\'ll need it for token exchange)');
    console.log('2. Use code_challenge in authorization URL');
    console.log('3. Use state parameter to prevent CSRF attacks');
    console.log('\n📝 Example Authorization URL:\n');
    console.log(`https://github.com/login/oauth/authorize?`);
    console.log(`  client_id=YOUR_CLIENT_ID&`);
    console.log(`  redirect_uri=YOUR_REDIRECT_URI&`);
    console.log(`  scope=repo read:org&`);
    console.log(`  state=${state}&`);
    console.log(`  code_challenge=${pkce.codeChallenge}&`);
    console.log(`  code_challenge_method=S256`);
    console.log();

    // JSON output for programmatic use
    console.log('📊 JSON Output:\n');
    console.log(JSON.stringify({
        pkce,
        state,
        timestamp: new Date().toISOString()
    }, null, 2));
    console.log();
}

export { PKCEGenerator };
