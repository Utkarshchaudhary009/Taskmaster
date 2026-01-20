import { text, confirm, spinner } from '@clack/prompts';
import pc from 'picocolors';
import { zhipu } from 'zhipu-ai-provider';
import { generateText } from 'ai';
import { loadConfig, saveConfig, ensureConfigDir, type TaskmasterConfig } from './store';

export async function setupCommand(): Promise<void> {
    console.log(pc.bold('\n🔧 Taskmaster Setup\n'));

    await ensureConfigDir();

    const config: TaskmasterConfig = {
        version: '0.1.0',
    };

    // Step 1: GLM API Key
    console.log(pc.cyan('Step 1: Zhipu GLM API Key'));
    console.log(pc.dim('Get your key from: https://api.z.ai/'));

    const apiKey = await text({
        message: 'Enter your Zhipu GLM API key:',
        placeholder: 'sk-...',
        validate: (value) => {
            if (!value) return 'API key is required';
            if (!value.startsWith('sk-')) return 'Invalid API key format';
            return undefined;
        },
    });

    if (typeof apiKey !== 'string') {
        console.log(pc.red('\n✖ Setup cancelled'));
        process.exit(1);
    }

    // Validate API key
    const s = spinner();
    s.start('Validating API key...');

    try {
        const model = zhipu('glm-4-flash', {
            apiKey,
            baseURL: 'https://api.z.ai/api/paas/v4',
        });

        await generateText({
            model,
            prompt: 'test',
            maxTokens: 5,
        });

        s.stop('API key validated ✓');
        config.zhipuApiKey = apiKey;
    } catch (error) {
        s.stop('API key validation failed ✗');
        console.log(pc.red('\n✖'), error instanceof Error ? error.message : 'Validation failed');
        process.exit(1);
    }

    // Step 2: Gemini CLI
    console.log(pc.cyan('\nStep 2: Gemini CLI Setup'));

    // Check if gemini CLI is installed
    const checkGemini = Bun.spawn(['gemini', '--version'], {
        stdout: 'pipe',
        stderr: 'pipe',
    });

    const geminiInstalled = (await checkGemini.exited) === 0;

    if (!geminiInstalled) {
        console.log(pc.yellow('Gemini CLI not found.'));
        const shouldInstall = await confirm({
            message: 'Install Gemini CLI globally?',
        });

        if (shouldInstall) {
            const installSpinner = spinner();
            installSpinner.start('Installing @google/gemini-cli...');

            const install = Bun.spawn(['bun', 'add', '-g', '@google/gemini-cli'], {
                stdout: 'pipe',
                stderr: 'pipe',
            });

            const exitCode = await install.exited;
            if (exitCode !== 0) {
                installSpinner.stop('Installation failed ✗');
                console.log(pc.red('\n✖ Failed to install Gemini CLI'));
                console.log(pc.dim('Run manually: bun add -g @google/gemini-cli'));
                process.exit(1);
            }

            installSpinner.stop('Gemini CLI installed ✓');
        } else {
            console.log(pc.yellow('\n⚠️  Gemini CLI not installed. Heavy mode (-H) will not work.'));
            console.log(pc.dim('Install manually: bun add -g @google/gemini-cli'));
            config.geminiCliConfigured = false;
        }
    }

    // Prompt for authentication
    console.log(pc.cyan('\nAuthenticate Gemini CLI:'));
    console.log(pc.dim('Run'), pc.bold('gemini'), pc.dim('and follow OAuth prompts'));

    const authenticated = await confirm({
        message: 'Have you authenticated Gemini CLI?',
    });

    config.geminiCliConfigured = authenticated === true;

    // Save config
    await saveConfig(config);

    console.log(pc.green('\n✓ Setup complete!'));
    console.log(pc.dim('\nTry:'), pc.cyan('tm do "hello world"'));
}
