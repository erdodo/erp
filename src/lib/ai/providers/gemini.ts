import { GoogleGenAI } from "@google/genai";
import type { AIProvider, AIResponse, ChatMessage, ToolDefinition } from "../types";

const DEFAULT_MODEL = "antigravity-preview-05-2026";

export class GeminiProvider implements AIProvider {
  readonly name = "gemini";
  private ai: GoogleGenAI;
  private model: string;

  constructor(apiKey: string, model = DEFAULT_MODEL) {
    this.ai = new GoogleGenAI({ apiKey });
    this.model = model;
  }

  async chat(
    messages: ChatMessage[],
    tools: ToolDefinition[],
    systemPrompt: string
  ): Promise<AIResponse> {
    const contents = messages.map((m) => {
      if (m.role === "tool") {
        return {
          role: "user" as const,
          parts: [
            {
              functionResponse: {
                name: m.toolName ?? "tool",
                response: { result: m.content },
              },
            },
          ],
        };
      }
      return {
        role: (m.role === "assistant" ? "model" : "user") as "model" | "user",
        parts: [{ text: m.content }],
      };
    });

    const config: Record<string, unknown> = {
      systemInstruction: systemPrompt,
      temperature: 0.4,
      maxOutputTokens: 2048,
    };

    if (tools.length > 0) {
      config.tools = [
        {
          functionDeclarations: tools.map((t) => ({
            name: t.name,
            description: t.description,
            parameters: t.parameters,
          })),
        },
      ];
    }

    const response = await this.ai.models.generateContent({
      model: this.model,
      contents,
      config,
    });

    const candidate = response.candidates?.[0];
    const parts = candidate?.content?.parts ?? [];

    const textParts = parts.filter((p) => p.text).map((p) => p.text!);
    const fnCalls = parts.filter((p) => p.functionCall);

    if (fnCalls.length > 0) {
      return {
        content: textParts.join(""),
        toolCalls: fnCalls.map((p, i) => ({
          id: `call_${i}`,
          name: p.functionCall!.name as string,
          args: (p.functionCall!.args ?? {}) as Record<string, unknown>,
        })),
        finishReason: "tool_calls",
      };
    }

    return {
      content: textParts.join(""),
      finishReason: "stop",
    };
  }
}

export function createGeminiProvider(): GeminiProvider {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY env variable is not set");
  const model = process.env.GEMINI_MODEL ?? DEFAULT_MODEL;
  return new GeminiProvider(key, model);
}
