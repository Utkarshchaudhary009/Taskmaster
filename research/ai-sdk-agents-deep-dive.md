# Deep Dive: AI SDK 6 Agents & OpenAI Compatible Provider

**Research Date**: 2026-01-22
**Framework**: Vercel AI SDK v6 (v6.0.45)
**Packages**: `ai`, `@ai-sdk/openai-compatible`
**Focus**: Agent Architecture, Loop Control, Custom Providers

---

## 🎯 Executive Summary

AI SDK 6 introduces formalized Agent patterns through `ToolLoopAgent` and explicit loop control mechanisms. Simultaneously, the `@ai-sdk/openai-compatible` package provides a standardized way to integrate with any provider adhering to the OpenAI API spec (Ollama, Groq, LM Studio, etc.) without relying on the specific OpenAI provider features.

---

## 1. Agent Architecture & Loop Control

In AI SDK 6, "Agents" are defined as systems that repeatedly call a model with tools until a termination condition is met.

### A. The `ToolLoopAgent` (Standard Pattern)

This is the high-level abstraction for building agents. It manages the conversation history, tool execution, and loop termination automatically.

**Key Components:**
- **`stopWhen`**: The termination logic.
- **`prepareStep`**: Hook for dynamic modification before each step.
- **`tools`**: Zod-validated tool definitions.

**Implementation Example:**
```typescript
import { ToolLoopAgent, stepCountIs, tool } from "ai";
import { z } from "zod";
import { myProvider } from "./provider"; // See Section 2

const researchAgent = new ToolLoopAgent({
  model: myProvider.chatModel("llama-3-70b"),
  instructions: "You are a specialized research assistant.",
  
  // Define tools using the helper
  tools: {
    webSearch: tool({
      description: "Search the web",
      inputSchema: z.object({ query: z.string() }),
      execute: async ({ query }) => {
        return `Results for ${query}...`;
      },
    }),
  },

  // LOOP CONTROL:
  // Stop if 5 steps are reached OR if the 'finish' tool is called
  stopWhen: stepCountIs(5), 
});

// Execution (Streaming)
const stream = researchAgent.stream({ 
  prompt: "Analyze the latest trends in AI agents" 
});

for await (const part of stream) {
  // Handle stream parts
}
```

### B. Manual Loop Control (Low-Level)

For complex use cases (Human-in-the-Loop, branching logic, state machines), you can implement the loop manually using `generateText`.

**Pattern:**
```typescript
import { generateText } from "ai";

const messages = [
  { role: "system", content: "You are a helpful assistant." },
  { role: "user", content: "Do task X" }
];

while (true) {
  const { text, toolCalls, finishReason } = await generateText({
    model: model,
    tools: tools,
    messages: messages,
  });

  // 1. Update History
  messages.push({ role: "assistant", content: text, toolCalls });

  // 2. Handle Tool Execution
  if (toolCalls.length > 0) {
    const toolResults = await executeTools(toolCalls);
    messages.push({ role: "tool", content: toolResults });
  }

  // 3. Custom Termination Logic
  if (finishReason === "stop" && toolCalls.length === 0) {
    break; 
  }
  
  // 4. Human-in-the-loop check
  if (requiresApproval(toolCalls)) {
    // pause and wait for user
    break;
  }
}
```

---

## 2. Working with `@ai-sdk/openai-compatible`

This package is essential for using local LLMs (Ollama) or alternative hosted providers (Groq, Perplexity) that mimic the OpenAI API signature but are not OpenAI.

**Location**: `node_modules/@ai-sdk/openai-compatible`

### Setup Pattern (Singleton)

**Do not** import the factory function in every file. Create a dedicated provider instance.

```typescript
// src/lib/providers.ts
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

// Example: Ollama (Local)
export const ollama = createOpenAICompatible({
  name: 'ollama',
  baseURL: 'http://localhost:11434/v1',
  headers: {
    // Optional headers
  }
});

// Example: Groq (Hosted)
export const groq = createOpenAICompatible({
  name: 'groq',
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY,
});
```

### Usage in Agents

Use the instance methods (`chatModel`, `completionModel`, `embeddingModel`) to create model references.

```typescript
import { generateText } from "ai";
import { ollama } from "./lib/providers";

const result = await generateText({
  // Specify the model ID expected by the provider
  model: ollama.chatModel('llama3'), 
  prompt: "Why is the sky blue?",
});
```

---

## 3. Dependency Structure Analysis

Based on `node_modules` exploration:

| Package | Version | Role | Relationship |
|---------|---------|------|--------------|
| **`ai`** | 6.0.45 | **Core SDK** | Defines interfaces (`LanguageModel`, `Tool`), provides runtime (`generateText`, `ToolLoopAgent`). |
| **`@ai-sdk/openai-compatible`** | 2.0.18 | **Provider** | Implements the Core interfaces for OpenAI-like APIs. Maps standardized calls to JSON-RPC/HTTP calls. |
| **`@ai-sdk/provider`** | 3.0.5 | **Shared Utility** | Common error types (`APICallError`), logic for header management, and base classes used by providers. |

### Data Flow
1. **Application Code** calls `ai.generateText`.
2. **`ai` Core** normalizes inputs (messages, tools).
3. **`ai` Core** delegates to the `model` object passed in config.
4. **`@ai-sdk/openai-compatible`** (the model) formats the HTTP request.
5. **Request** is sent to `baseURL` (e.g., Ollama).
6. **Response** is parsed and mapped back to standard AI SDK result objects.

---

## 4. Key Takeaways for Implementation

1. **Use `ToolLoopAgent`** for standard agentic workflows. It handles the "glue" code of tool execution and history management.
2. **Use Manual Loops** only when you need to intercept the loop for specific logic (approvals, intermediate saving, custom branching).
3. **Centralize Provider Config**: Define your `openaiCompatible` instances in a single file (`src/lib/ai/providers.ts`) to avoid repeating `baseURL` settings.
4. **Type Safety**: The compatible provider supports generic type arguments for model IDs if you want autocomplete:
   ```typescript
   const model = createOpenAICompatible<'llama3' | 'mistral'>({...});
   ```
