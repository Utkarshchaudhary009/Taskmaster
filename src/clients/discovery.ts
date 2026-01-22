
import { IDE_DEFINITIONS } from "./definitions";

export interface DiscoveredClient {
    id: string;
    name: string;
    configPath?: string;
    type: 'file' | 'cli';
    available: boolean;
}

export class ClientDiscovery {
    async discoverAll(): Promise<DiscoveredClient[]> {
        const results: DiscoveredClient[] = [];
        const platform = process.platform as 'win32' | 'darwin' | 'linux';

        for (const [id, def] of Object.entries(IDE_DEFINITIONS)) {
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

            const binName = id.split("-")[0];
            const which = await Bun.which(binName);
            if (which) {
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
