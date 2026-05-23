import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { OpenRouterProvider } from "@/lib/ai/providers/openrouter";
import { TOOL_DEFINITIONS, executeTool } from "@/lib/ai/tools";
import ERP_SYSTEM_PROMPT from "@/lib/ai/system-prompt";
import type { ChatMessage, ClientAction } from "@/lib/ai/types";

const MAX_TOOL_ROUNDS = 5;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tenantId = session.user.tenantId;

  let body: { messages: ChatMessage[]; currentPage?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENROUTER_API_KEY is not configured" }, { status: 500 });
  }

  const provider = new OpenRouterProvider(apiKey, process.env.OPENROUTER_MODEL ?? "deepseek/deepseek-v4-flash:free");

  const systemPrompt = `${ERP_SYSTEM_PROMPT}\n\nKullanıcı şu anda şu sayfada: ${body.currentPage ?? "/dashboard"}\nTenant ID: ${tenantId}`;

  const messages: ChatMessage[] = [...body.messages];
  const allClientActions: ClientAction[] = [];
  const toolsUsed: string[] = [];

  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await provider.chat(messages, TOOL_DEFINITIONS, systemPrompt);

      if (response.finishReason === "stop" || !response.toolCalls?.length) {
        return NextResponse.json({
          message: response.content,
          actions: allClientActions,
          toolsUsed,
        });
      }

      messages.push({
        role: "assistant",
        content: response.content || "",
        toolCalls: response.toolCalls,
      });

      for (const toolCall of response.toolCalls) {
        toolsUsed.push(toolCall.name);

        if (toolCall.name === "navigate_to") {
          const url = toolCall.args.url as string;
          const label = (toolCall.args.label as string) ?? "Git";
          allClientActions.push({ type: "navigate", url, label });
          messages.push({
            role: "tool",
            toolName: toolCall.name,
            toolCallId: toolCall.id,
            content: JSON.stringify({ result: `Navigating to ${url}` }),
          });
          continue;
        }

        let toolResult: unknown;
        try {
          const { result, clientActions } = await executeTool(toolCall.name, toolCall.args, tenantId);
          toolResult = result;
          if (clientActions) allClientActions.push(...(clientActions as ClientAction[]));
        } catch (err) {
          toolResult = { error: err instanceof Error ? err.message : "Tool execution failed" };
        }

        messages.push({
          role: "tool",
          toolName: toolCall.name,
          toolCallId: toolCall.id,
          content: JSON.stringify(toolResult),
        });
      }
    }
  } catch (err) {
    console.error("[AI chat] error:", err);
    const message = err instanceof Error ? err.message : "AI servis hatası";
    return NextResponse.json({ error: message, actions: [], toolsUsed }, { status: 200 });
  }

  return NextResponse.json({
    message: "İşlem tamamlandı.",
    actions: allClientActions,
    toolsUsed,
  });
}
