# Research: Community Providers for AI SDK

This document outlines the installation and usage instructions for the Gemini CLI and Zhipu AI community providers for the Vercel AI SDK.

## 1. Gemini CLI Provider
**URL:** [https://sdk.vercel.ai/providers/community-providers/gemini-cli](https://sdk.vercel.ai/providers/community-providers/gemini-cli)

### Overview
This provider allows you to access Google's Gemini models via the Gemini CLI, supporting local OAuth authentication and API key modes.

### Installation
Depending on your AI SDK version:

**AI SDK v6 (default):**
```bash
npm install ai-sdk-provider-gemini-cli ai
```

**AI SDK v5:**
```bash
npm install ai-sdk-provider-gemini-cli@ai-sdk-v5 ai@^5.0.0
```

### Authentication
There are multiple authentication methods, but **OAuth (Personal)** is recommended for local development.

#### Method A: OAuth (Recommended)
1.  Install the Gemini CLI globally:
    ```bash
    npm install -g @google/gemini-cli
    ```
2.  Authenticate via terminal:
    ```bash
    gemini
    ```
    (Follow the interactive login flow).

3.  Code Usage:
    ```typescript
    import { createGeminiProvider } from 'ai-sdk-provider-gemini-cli';

    const gemini = createGeminiProvider({ authType: 'oauth-personal' });
    ```

#### Method B: API Key
1.  Get an API key from [Google AI Studio](https://aistudio.google.com/apikey).
2.  Set environment variable:
    ```bash
    export GEMINI_API_KEY="YOUR_API_KEY"
    ```
3.  Code Usage:
    ```typescript
    import { createGeminiProvider } from 'ai-sdk-provider-gemini-cli';

    const gemini = createGeminiProvider({
      authType: 'api-key', // or 'gemini-api-key'
      apiKey: process.env.GEMINI_API_KEY,
    });
    ```

### Example Usage
```typescript
import { createGeminiProvider } from 'ai-sdk-provider-gemini-cli';
import { generateText } from 'ai';

const gemini = createGeminiProvider({ authType: 'oauth-personal' });

const { text } = await generateText({
  model: gemini('gemini-2.5-pro'),
  prompt: 'Write a hello world program in Bun.',
});

console.log(text);
```

### Supported Models
- `gemini-3-pro-preview` (Supports `thinkingLevel`)
- `gemini-3-flash-preview`
- `gemini-2.5-pro` (Supports `thinkingBudget`)
- `gemini-2.5-flash`

---

## 2. Zhipu AI (Z.AI) Provider
**URL:** [https://sdk.vercel.ai/providers/community-providers/zhipu](https://sdk.vercel.ai/providers/community-providers/zhipu)

### Overview
Provider for Zhipu AI's GLM models.

### Installation
```bash
npm install zhipu-ai-provider
# or
pnpm add zhipu-ai-provider
# or
bun add zhipu-ai-provider
```

### Authentication
1.  Get your API key from [Zhipu BigModel Platform](https://bigmodel.cn/).
2.  Set the environment variable:
    ```env
    ZHIPU_API_KEY=<your-api-key>
    ```

### Usage
You can use the default instance which reads from the environment variable:

```typescript
import { zhipu } from 'zhipu-ai-provider';
import { generateText } from 'ai';

const { text } = await generateText({
  model: zhipu('glm-4-plus'),
  prompt: 'Explain quantum computing.',
});

console.log(text);
```

### Custom Configuration (Z.AI Infrastructure)
If you are using the non-Chinese [Z.AI](https://docs.z.ai/guides) infrastructure:

```typescript
import { createZhipu } from 'zhipu-ai-provider';

const zhipu = createZhipu({
  baseURL: 'https://api.z.ai/api/paas/v4',
  apiKey: 'your-api-key',
});
```

### Key Models
- `glm-4.7-plus`
- `glm-4.7-air`
- `glm-4.7-flash`
