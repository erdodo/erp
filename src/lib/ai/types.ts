export type MessageRole = "user" | "assistant" | "tool";

export interface ChatMessage {
  role: MessageRole;
  content: string;
  toolCallId?: string;
  toolName?: string;
  toolCalls?: ToolCallRef[];
}

export interface ToolCallRef {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

export interface ToolParameter {
  type: string;
  description?: string;
  enum?: string[];
  items?: ToolParameter;
  properties?: Record<string, ToolParameter>;
  required?: string[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, ToolParameter>;
    required?: string[];
  };
}

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

export interface ToolResult {
  toolCallId: string;
  name: string;
  result: unknown;
  error?: string;
}

export interface AIResponse {
  content: string;
  toolCalls?: ToolCall[];
  finishReason: "stop" | "tool_calls" | "error";
}

export interface ClientAction {
  type: "navigate" | "open_modal" | "refresh";
  url?: string;
  label?: string;
}

export interface AgentResponse {
  message: string;
  actions: ClientAction[];
  toolsUsed: string[];
}

export interface AIProvider {
  name: string;
  chat(
    messages: ChatMessage[],
    tools: ToolDefinition[],
    systemPrompt: string
  ): Promise<AIResponse>;
}
