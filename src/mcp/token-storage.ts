
import { join } from "path";
import { homedir } from "os";
import { mkdirSync } from "fs";
import { TokenEncryption } from "./crypto/encryption";

export class TokenStorage {
  private filePath: string;
  private encryption: TokenEncryption;
  private initialized = false;

  constructor() {
    const configDir = join(homedir(), ".taskmaster");
    mkdirSync(configDir, { recursive: true });
    this.filePath = join(configDir, "tokens.enc");
    this.encryption = new TokenEncryption();
  }

  private async ensureInitialized() {
    if (!this.initialized) {
      await this.encryption.initialize();
      this.initialized = true;
    }
  }

  async get(serverName: string): Promise<any | undefined> {
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

  async save(serverName: string, tokens: any) {
    await this.ensureInitialized();
    
    const file = Bun.file(this.filePath);
    let data: Record<string, any> = {};
    
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
}