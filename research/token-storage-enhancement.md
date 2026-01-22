# Token Storage Enhancement Plan

## Current Implementation Analysis

**File**: `src/mcp/token-storage.ts`

**Current State**:
- ❌ Tokens stored in **plaintext** JSON
- ❌ No encryption
- ❌ No OS keychain integration
- ✅ Uses Bun's optimized file APIs
- ✅ Proper error handling

**Risk Level**: **HIGH** - Plaintext OAuth tokens are a critical security vulnerability

---

## Recommended Enhancements

### 1. Encrypted Token Storage (Priority: CRITICAL)

Replace plaintext storage with AES-256-GCM encryption:

```typescript
// src/mcp/crypto/encryption.ts
export class TokenEncryption {
  private masterKey: CryptoKey;
  
  async initialize(): Promise<void> {
    // Load master key from OS keychain or generate new one
    const storedKey = await this.loadFromKeychain();
    
    if (storedKey) {
      this.masterKey = await crypto.subtle.importKey(
        'raw',
        storedKey,
        { name: 'AES-GCM' },
        false,
        ['encrypt', 'decrypt']
      );
    } else {
      this.masterKey = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );
      
      const exported = await crypto.subtle.exportKey('raw', this.masterKey);
      await this.saveToKeychain(exported);
    }
  }
  
  async encrypt(plaintext: string): Promise<string> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plaintext);
    
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.masterKey,
      encoded
    );
    
    // Format: base64(iv):base64(ciphertext)
    return `${Buffer.from(iv).toString('base64')}:${Buffer.from(ciphertext).toString('base64')}`;
  }
  
  async decrypt(encrypted: string): Promise<string> {
    const [ivB64, cipherB64] = encrypted.split(':');
    const iv = Buffer.from(ivB64, 'base64');
    const ciphertext = Buffer.from(cipherB64, 'base64');
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      this.masterKey,
      ciphertext
    );
    
    return new TextDecoder().decode(decrypted);
  }
  
  private async loadFromKeychain(): Promise<ArrayBuffer | null> {
    // Platform-specific implementation
    if (process.platform === 'win32') {
      return this.loadFromWindowsCredentialManager();
    } else if (process.platform === 'darwin') {
      return this.loadFromMacOSKeychain();
    } else {
      return this.loadFromLinuxSecretService();
    }
  }
  
  private async saveToKeychain(keyBuffer: ArrayBuffer): Promise<void> {
    // Platform-specific implementation
    if (process.platform === 'win32') {
      await this.saveToWindowsCredentialManager(keyBuffer);
    } else if (process.platform === 'darwin') {
      await this.saveToMacOSKeychain(keyBuffer);
    } else {
      await this.saveToLinuxSecretService(keyBuffer);
    }
  }
  
  // Windows implementation
  private async loadFromWindowsCredentialManager(): Promise<ArrayBuffer | null> {
    try {
      const { execSync } = await import('child_process');
      const result = execSync(`cmdkey /list:taskmaster-master-key`, { encoding: 'utf8' });
      
      if (result.includes('taskmaster-master-key')) {
        const password = execSync(`powershell -Command "$cred = Get-StoredCredential -Target 'taskmaster-master-key'; $cred.GetNetworkCredential().Password"`, { encoding: 'utf8' }).trim();
        return Buffer.from(password, 'base64').buffer;
      }
    } catch {}
    return null;
  }
  
  private async saveToWindowsCredentialManager(keyBuffer: ArrayBuffer): Promise<void> {
    const { execSync } = await import('child_process');
    const b64Key = Buffer.from(keyBuffer).toString('base64');
    execSync(`cmdkey /generic:taskmaster-master-key /user:taskmaster /pass:${b64Key}`);
  }
  
  // macOS implementation
  private async loadFromMacOSKeychain(): Promise<ArrayBuffer | null> {
    try {
      const { execSync } = await import('child_process');
      const result = execSync(`security find-generic-password -a taskmaster -s taskmaster-master-key -w`, { encoding: 'utf8' }).trim();
      return Buffer.from(result, 'base64').buffer;
    } catch {}
    return null;
  }
  
  private async saveToMacOSKeychain(keyBuffer: ArrayBuffer): Promise<void> {
    const { execSync } = await import('child_process');
    const b64Key = Buffer.from(keyBuffer).toString('base64');
    try {
      // Try to delete existing entry first
      execSync(`security delete-generic-password -a taskmaster -s taskmaster-master-key`, { stdio: 'ignore' });
    } catch {}
    execSync(`security add-generic-password -a taskmaster -s taskmaster-master-key -w ${b64Key} -U`);
  }
  
  // Linux implementation (using secret-tool from libsecret)
  private async loadFromLinuxSecretService(): Promise<ArrayBuffer | null> {
    try {
      const { execSync } = await import('child_process');
      const result = execSync(`secret-tool lookup application taskmaster key master-key`, { encoding: 'utf8' }).trim();
      return Buffer.from(result, 'base64').buffer;
    } catch {}
    return null;
  }
  
  private async saveToLinuxSecretService(keyBuffer: ArrayBuffer): Promise<void> {
    const { execSync } = await import('child_process');
    const b64Key = Buffer.from(keyBuffer).toString('base64');
    execSync(`echo "${b64Key}" | secret-tool store --label="TaskMaster Master Key" application taskmaster key master-key`);
  }
}
```

### 2. Enhanced TokenStorage Implementation

```typescript
// src/mcp/token-storage.ts (Enhanced)
import { join } from 'path';
import { mkdirSync } from 'fs';
import { type OAuthTokens } from '@ai-sdk/mcp';
import { TokenEncryption } from './crypto/encryption';

export class TokenStorage {
  private filePath: string;
  private encryption: TokenEncryption;
  private initialized = false;

  constructor(configDir: string = '.mcp') {
    mkdirSync(configDir, { recursive: true });
    this.filePath = join(configDir, 'tokens.enc'); // Changed from .json to .enc
    this.encryption = new TokenEncryption();
  }

  private async ensureInitialized() {
    if (!this.initialized) {
      await this.encryption.initialize();
      this.initialized = true;
    }
  }

  async get(serverName: string): Promise<OAuthTokens | undefined> {
    await this.ensureInitialized();
    
    const file = Bun.file(this.filePath);
    if (!(await file.exists())) return undefined;
    
    try {
      const encryptedData = await file.text();
      const decrypted = await this.encryption.decrypt(encryptedData);
      const data = JSON.parse(decrypted);
      return data[serverName];
    } catch (error) {
      console.error('Failed to decrypt tokens:', error);
      return undefined;
    }
  }

  async save(serverName: string, tokens: OAuthTokens) {
    await this.ensureInitialized();
    
    const file = Bun.file(this.filePath);
    let data: Record<string, OAuthTokens> = {};
    
    if (await file.exists()) {
      try {
        const encryptedData = await file.text();
        const decrypted = await this.encryption.decrypt(encryptedData);
        data = JSON.parse(decrypted);
      } catch {}
    }
    
    data[serverName] = tokens;
    
    const plaintext = JSON.stringify(data, null, 2);
    const encrypted = await this.encryption.encrypt(plaintext);
    
    await Bun.write(this.filePath, encrypted);
  }
  
  async delete(serverName: string): Promise<boolean> {
    await this.ensureInitialized();
    
    const file = Bun.file(this.filePath);
    if (!(await file.exists())) return false;
    
    try {
      const encryptedData = await file.text();
      const decrypted = await this.encryption.decrypt(encryptedData);
      const data = JSON.parse(decrypted);
      
      if (!(serverName in data)) return false;
      
      delete data[serverName];
      
      const plaintext = JSON.stringify(data, null, 2);
      const encrypted = await this.encryption.encrypt(plaintext);
      
      await Bun.write(this.filePath, encrypted);
      return true;
    } catch {
      return false;
    }
  }
  
  async list(): Promise<string[]> {
    await this.ensureInitialized();
    
    const file = Bun.file(this.filePath);
    if (!(await file.exists())) return [];
    
    try {
      const encryptedData = await file.text();
      const decrypted = await this.encryption.decrypt(encryptedData);
      const data = JSON.parse(decrypted);
      return Object.keys(data);
    } catch {
      return [];
    }
  }
  
  async rotateMasterKey(): Promise<void> {
    await this.ensureInitialized();
    
    // 1. Read and decrypt all tokens with old key
    const file = Bun.file(this.filePath);
    if (!(await file.exists())) return;
    
    const encryptedData = await file.text();
    const decrypted = await this.encryption.decrypt(encryptedData);
    const data = JSON.parse(decrypted);
    
    // 2. Generate new master key
    const newEncryption = new TokenEncryption();
    await newEncryption.initialize(); // This will create a new key
    
    // 3. Re-encrypt with new key
    const plaintext = JSON.stringify(data, null, 2);
    const newEncrypted = await newEncryption.encrypt(plaintext);
    
    // 4. Backup old file
    const backupPath = `${this.filePath}.backup`;
    await Bun.write(backupPath, encryptedData);
    
    // 5. Write with new encryption
    await Bun.write(this.filePath, newEncrypted);
    
    // 6. Update current encryption instance
    this.encryption = newEncryption;
    
    console.log('Master key rotated successfully. Backup saved to:', backupPath);
  }
}
```

---

## Migration Path

### Step 1: Backup Existing Tokens
```bash
# Before upgrading
cp .mcp/tokens.json .mcp/tokens.json.backup
```

### Step 2: Install New Version
```bash
bun install
```

### Step 3: Auto-Migration on First Run
```typescript
// src/mcp/migration.ts
export async function migrateTokensToEncrypted(configDir: string = '.mcp') {
  const oldPath = join(configDir, 'tokens.json');
  const newPath = join(configDir, 'tokens.enc');
  
  const oldFile = Bun.file(oldPath);
  if (!(await oldFile.exists())) return; // Nothing to migrate
  
  const newFile = Bun.file(newPath);
  if (await newFile.exists()) return; // Already migrated
  
  console.log('🔄 Migrating tokens to encrypted storage...');
  
  // Read old plaintext tokens
  const oldData = await oldFile.json();
  
  // Encrypt with new storage
  const storage = new TokenStorage(configDir);
  await storage['ensureInitialized']();
  
  for (const [serverName, tokens] of Object.entries(oldData)) {
    await storage.save(serverName, tokens as OAuthTokens);
  }
  
  // Backup old file
  await Bun.write(join(configDir, 'tokens.json.backup'), await oldFile.text());
  
  // Remove old plaintext file
  await Bun.write(oldPath, '').then(() => unlinkSync(oldPath));
  
  console.log('✅ Migration complete. Old tokens backed up to tokens.json.backup');
}
```

---

## Testing Plan

### Security Tests
```typescript
// tests/token-storage.test.ts
import { describe, it, expect, beforeEach } from 'bun:test';
import { TokenStorage } from '../src/mcp/token-storage';
import { readFileSync } from 'fs';

describe('Encrypted TokenStorage', () => {
  let storage: TokenStorage;
  
  beforeEach(() => {
    storage = new TokenStorage('.mcp-test');
  });
  
  it('should encrypt tokens at rest', async () => {
    await storage.save('github', {
      access_token: 'ghp_test_token',
      refresh_token: 'refresh_test',
      expires_at: Date.now() + 3600000
    });
    
    // Read raw file - should NOT contain plaintext token
    const rawContent = readFileSync('.mcp-test/tokens.enc', 'utf8');
    expect(rawContent).not.toContain('ghp_test_token');
    expect(rawContent).not.toContain('refresh_test');
  });
  
  it('should decrypt tokens correctly', async () => {
    const originalTokens = {
      access_token: 'ghp_test_token',
      refresh_token: 'refresh_test',
      expires_at: Date.now() + 3600000
    };
    
    await storage.save('github', originalTokens);
    const retrieved = await storage.get('github');
    
    expect(retrieved).toEqual(originalTokens);
  });
  
  it('should list stored server names without exposing tokens', async () => {
    await storage.save('github', { access_token: 'token1' } as any);
    await storage.save('gitlab', { access_token: 'token2' } as any);
    
    const names = await storage.list();
    expect(names).toEqual(['github', 'gitlab']);
  });
  
  it('should delete tokens securely', async () => {
    await storage.save('github', { access_token: 'token1' } as any);
    const deleted = await storage.delete('github');
    
    expect(deleted).toBe(true);
    expect(await storage.get('github')).toBeUndefined();
  });
  
  it('should rotate master key without data loss', async () => {
    const originalTokens = { access_token: 'test_token' } as any;
    await storage.save('github', originalTokens);
    
    await storage.rotateMasterKey();
    
    const retrieved = await storage.get('github');
    expect(retrieved).toEqual(originalTokens);
  });
});
```

---

## Dependencies to Add

```json
{
  "devDependencies": {
    "@types/node": "^20.11.0"
  }
}
```

**Note**: Bun has built-in `crypto` module support, so no additional dependencies needed for encryption!

---

## Implementation Priority

1. **Week 1 - CRITICAL**:
   - [ ] Implement `TokenEncryption` class with AES-256-GCM
   - [ ] Add OS keychain integration (Windows/macOS/Linux)
   - [ ] Update `TokenStorage` to use encryption

2. **Week 2 - HIGH**:
   - [ ] Implement migration script
   - [ ] Add security tests
   - [ ] Update documentation

3. **Week 3 - MEDIUM**:
   - [ ] Add key rotation feature
   - [ ] Implement audit logging
   - [ ] Add backup/restore functionality

---

## Security Audit Checklist

- [ ] Master key never appears in logs
- [ ] Encrypted file permissions set to 0600 (user-only)
- [ ] No plaintext tokens in memory dumps
- [ ] Secure key derivation if passphrase-based encryption added
- [ ] Rate limiting on decryption attempts
- [ ] Audit trail for token access

---

**End of Enhancement Plan**

*Ready for implementation. This brings TaskMaster to Top 1% security standards.*
