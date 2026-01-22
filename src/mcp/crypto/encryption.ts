import { Buffer } from "node:buffer";
import { join } from "path";
import { homedir } from "os";
import { existsSync, mkdirSync } from "fs";

export class TokenEncryption {
  private masterKey: CryptoKey | null = null;
  
  async initialize(): Promise<void> {
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
    if (!this.masterKey) await this.initialize();
    
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plaintext);
    
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.masterKey!,
      encoded
    );
    
    return `${Buffer.from(iv).toString('base64')}:${Buffer.from(ciphertext).toString('base64')}`;
  }
  
  async decrypt(encrypted: string): Promise<string> {
    if (!this.masterKey) await this.initialize();

    const [ivB64, cipherB64] = encrypted.split(':');
    const iv = Buffer.from(ivB64, 'base64');
    const ciphertext = Buffer.from(cipherB64, 'base64');
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      this.masterKey!,
      ciphertext
    );
    
    return new TextDecoder().decode(decrypted);
  }
  
  private async loadFromKeychain(): Promise<ArrayBuffer | null> {
    if (process.platform === 'win32') {
      return this.loadFromWindowsDPAPI();
    } else if (process.platform === 'darwin') {
      return this.loadFromMacOSKeychain();
    } else {
      return this.loadFromLinuxSecretService();
    }
  }
  
  private async saveToKeychain(keyBuffer: ArrayBuffer): Promise<void> {
    if (process.platform === 'win32') {
      await this.saveToWindowsDPAPI(keyBuffer);
    } else if (process.platform === 'darwin') {
      await this.saveToMacOSKeychain(keyBuffer);
    } else {
      await this.saveToLinuxSecretService(keyBuffer);
    }
  }

  // Windows implementation - Simplified File-Based Storage
  private getWindowsKeyPath(): string {
    const dir = join(homedir(), ".taskmaster");
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    return join(dir, "master.key");
  }

  private async loadFromWindowsDPAPI(): Promise<ArrayBuffer | null> {
    try {
      const keyPath = this.getWindowsKeyPath();
      const file = Bun.file(keyPath);
      if (!(await file.exists())) return null;

      const secretB64 = (await file.text()).trim();
      return Buffer.from(secretB64, 'base64').buffer;
    } catch (e) {
      console.error("Master Key Load Error:", e);
      return null;
    }
  }
  
  private async saveToWindowsDPAPI(keyBuffer: ArrayBuffer): Promise<void> {
    try {
      const secretB64 = Buffer.from(keyBuffer).toString('base64');
      await Bun.write(this.getWindowsKeyPath(), secretB64);
    } catch (e) {
      console.error("Master Key Save Error:", e);
    }
  }
  
  // macOS implementation
  private async loadFromMacOSKeychain(): Promise<ArrayBuffer | null> {
    try {
      const result = Bun.spawnSync([
        "security", "find-generic-password", "-a", "taskmaster", "-s", "taskmaster-master-key", "-w"
      ]);
      
      if (!result.success) return null;
      
      const secretB64 = result.stdout.toString().trim();
      return Buffer.from(secretB64, 'base64').buffer;
    } catch {
      return null;
    }
  }
  
  private async saveToMacOSKeychain(keyBuffer: ArrayBuffer): Promise<void> {
    const b64Key = Buffer.from(keyBuffer).toString('base64');
    
    // Try delete first
    Bun.spawnSync(["security", "delete-generic-password", "-a", "taskmaster", "-s", "taskmaster-master-key"]);
    
    // Add new
    Bun.spawnSync([
      "security", "add-generic-password", "-a", "taskmaster", "-s", "taskmaster-master-key", "-w", b64Key, "-U"
    ]);
  }
  
  // Linux implementation (using secret-tool from libsecret)
  private async loadFromLinuxSecretService(): Promise<ArrayBuffer | null> {
    try {
      const result = Bun.spawnSync([
        "secret-tool", "lookup", "application", "taskmaster", "key", "master-key"
      ]);
      
      if (!result.success) return null;
      
      const secretB64 = result.stdout.toString().trim();
      return Buffer.from(secretB64, 'base64').buffer;
    } catch {
      return null;
    }
  }
  
  private async saveToLinuxSecretService(keyBuffer: ArrayBuffer): Promise<void> {
    const b64Key = Buffer.from(keyBuffer).toString('base64');
    
    Bun.spawnSync(
      ["secret-tool", "store", "--label=TaskMaster Master Key", "application", "taskmaster", "key", "master-key"],
      { stdin: Buffer.from(b64Key) }
    );
  }
}