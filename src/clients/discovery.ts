
import { IDE_DEFINITIONS } from "./definitions";
import { SecurityValidator } from "../security/validator";

export interface DiscoveredClient {
    id: string;
    name: string;
    configPath?: string;
    type: 'file' | 'cli';
    available: boolean;
}

export class ClientDiscovery {
    /**
     * Discover all supported clients on the system
     */
    async discoverAll(): Promise<DiscoveredClient[]> {
        const results: DiscoveredClient[] = [];
        const platform = process.platform as 'win32' | 'darwin' | 'linux';

        for (const [id, def] of Object.entries(IDE_DEFINITIONS)) {
            // Check file-based config
            if (def.paths && def.paths[platform]) {
                const path = def.paths[platform];
                const exists = await Bun.file(path).exists();

                if (exists) {
                    results.push({
                        id,
                        name: def.name,
                        configPath: path,
                        type: 'file',
                        available: true
                    });
                    continue;
                }
            }

            // Check CLI availability (if applicable)
            // For now, checks if binary matches the ID (e.g. 'cursor', 'code')
            // This is a heuristic.
            const binName = id.split("-")[0]; // gemini-cli -> gemini
            if (await Bun.which(binName)) {
                results.push({
                    id,
                    name: def.name,
                    type: 'cli',
                    available: true
                });
            }
        }

        return results;
    }
}
