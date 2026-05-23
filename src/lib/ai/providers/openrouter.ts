import type { AIProvider, AIResponse, ChatMessage, ToolDefinition } from "../types";

const OPENROUTER_BASE = "https://openrouter.ai/api/v1";
const DEFAULT_MODEL = "deepseek/deepseek-v4-flash:free";

interface OAIToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

interface OAIMessage {
  role: "user" | "assistant" | "tool" | "system";
  content: string | null;
  tool_calls?: OAIToolCall[];
  tool_call_id?: string;
}

export class OpenRouterProvider implements AIProvider {
  readonly name = "openrouter";
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model = DEFAULT_MODEL) {
    this.apiKey = apiKey;
    this.model = model;
  }

  async chat(
    messages: ChatMessage[],
    tools: ToolDefinition[],
    systemPrompt: string
  ): Promise<AIResponse> {
    const oaiMessages: OAIMessage[] = [
      { role: "system", content: systemPrompt },
      ...messages.map((m): OAIMessage => {
        if (m.role === "tool") {
          return {
            role: "tool",
            content: m.content,
            tool_call_id: m.toolCallId ?? m.toolName ?? "tool",
          };
        }
        if (m.role === "assistant" && m.toolCalls?.length) {
          return {
            role: "assistant",
            content: m.content || null,
            tool_calls: m.toolCalls.map((tc) => ({
              id: tc.id,
              type: "function" as const,
              function: {
                name: tc.name,
                arguments: JSON.stringify(tc.args),
              },
            })),
          };
        }
        return { role: m.role, content: m.content };
      }),
    ];

    const body: Record<string, unknown> = {
      model: this.model,
      messages: oaiMessages,
      temperature: 0.4,
      max_tokens: 2048,
    };

    if (tools.length > 0) {
      body.tools = tools.map((t) => ({
        type: "function",
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        },
      }));
      body.tool_choice = "auto";
    }

    const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        "HTTP-Referer": process.env.NEXTAUTH_URL ?? "http://localhost:3000",
        "X-Title": "ERP Assistant",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenRouter API error ${res.status}: ${err}`);
    }

    const data = (await res.json()) as {
      choices?: Array<{
        message?: {
          content?: string | null;
          tool_calls?: OAIToolCall[];
        };
        finish_reason?: string;
      }>;
    };

    const choice = data.choices?.[0];
    const msg = choice?.message;
    const content = msg?.content ?? "";

    if (msg?.tool_calls?.length) {
      return {
        content,
        toolCalls: msg.tool_calls.map((tc) => ({
          id: tc.id,
          name: tc.function.name,
          args: JSON.parse(tc.function.arguments) as Record<string, unknown>,
        })),
        finishReason: "tool_calls",
      };
    }

    return {
      content,
      finishReason: "stop",
    };
  }
}
