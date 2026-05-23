"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import type { ChatMessage, ClientAction } from "@/lib/ai/types";

interface UIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions?: ClientAction[];
  toolsUsed?: string[];
  isLoading?: boolean;
}

const SUGGESTED_PROMPTS = [
  "Genel istatistikleri göster",
  "Yeni müşteri ekle",
  "Stok durumunu listele",
  "Yeni çalışan ekle",
  "Üretim emirlerini göster",
];

export function AiChat() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<UIMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Merhaba! Ben ERP asistanınım ✨\n\nSoru sorabilir, sayfalara yönlendirme isteyebilir veya benim aracılığımla işlem yapabilirsiniz.",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatHistory = useRef<ChatMessage[]>([]);

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        inputRef.current?.focus();
      }, 50);
    }
  }, [open, messages]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      const userMsg: UIMessage = { id: crypto.randomUUID(), role: "user", content: trimmed };
      const loadingId = crypto.randomUUID();
      const loadingMsg: UIMessage = { id: loadingId, role: "assistant", content: "", isLoading: true };

      setMessages((prev) => [...prev, userMsg, loadingMsg]);
      setInput("");
      setLoading(true);

      chatHistory.current.push({ role: "user", content: trimmed });

      try {
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: chatHistory.current, currentPage: pathname }),
        });

        const data = (await res.json()) as {
          message?: string;
          actions?: ClientAction[];
          toolsUsed?: string[];
          error?: string;
        };

        const responseText = data.error
          ? `⚠️ ${data.error}`
          : (data.message ?? "Yanıt alınamadı.");

        chatHistory.current.push({ role: "assistant", content: responseText });

        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadingId
              ? { ...m, content: responseText, isLoading: false, actions: data.actions ?? [], toolsUsed: data.toolsUsed ?? [] }
              : m
          )
        );
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadingId
              ? { ...m, content: "Bağlantı hatası. Lütfen tekrar deneyin.", isLoading: false }
              : m
          )
        );
      } finally {
        setLoading(false);
      }
    },
    [loading, pathname]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage(input);
    }
  };

  const clearChat = () => {
    chatHistory.current = [];
    setMessages([{ id: "welcome", role: "assistant", content: "Sohbet temizlendi. Nasıl yardımcı olabilirim?" }]);
  };

  const primaryColor = "var(--color-primary, #2563eb)";

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="AI Asistan"
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          zIndex: 9999,
          width: "52px",
          height: "52px",
          borderRadius: "50%",
          background: primaryColor,
          color: "#fff",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
          transition: "transform 0.15s ease",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.08)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
      >
        {open ? (
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
        )}
      </button>

      {/* Chat Panel */}
      <div
        style={{
          position: "fixed",
          bottom: "88px",
          right: "24px",
          zIndex: 9998,
          width: "360px",
          maxHeight: "560px",
          display: "flex",
          flexDirection: "column",
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
          border: "1px solid var(--border, #e2e8f0)",
          background: "var(--background, #ffffff)",
          transition: "opacity 0.2s ease, transform 0.2s ease",
          opacity: open ? 1 : 0,
          transform: open ? "translateY(0) scale(1)" : "translateY(12px) scale(0.97)",
          pointerEvents: open ? "auto" : "none",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            background: primaryColor,
            color: "#fff",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "32px", height: "32px", borderRadius: "50%",
              background: "rgba(255,255,255,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <div>
              <p style={{ fontWeight: 600, fontSize: "13px", margin: 0 }}>ERP Asistan</p>
            </div>
          </div>
          <button
            onClick={clearChat}
            title="Sohbeti temizle"
            style={{
              background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "8px",
              color: "#fff", cursor: "pointer", padding: "5px 8px",
              fontSize: "11px", display: "flex", alignItems: "center", gap: "4px",
            }}
          >
            <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Temizle
          </button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
          {messages.map((msg) => (
            <div key={msg.id} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
              {msg.role === "assistant" && (
                <div style={{
                  width: "26px", height: "26px", borderRadius: "50%",
                  background: primaryColor, color: "#fff", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "11px", marginRight: "7px", alignSelf: "flex-end", marginBottom: "2px",
                }}>
                  ✦
                </div>
              )}
              <div style={{ maxWidth: "82%" }}>
                <div style={{
                  borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  padding: "9px 13px",
                  fontSize: "13px",
                  lineHeight: "1.55",
                  background: msg.role === "user" ? primaryColor : "var(--surface, #f8fafc)",
                  color: msg.role === "user" ? "#fff" : "var(--foreground, #171717)",
                  border: msg.role === "user" ? "none" : "1px solid var(--border, #e2e8f0)",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                }}>
                  {msg.isLoading ? (
                    <span style={{ display: "flex", gap: "4px", alignItems: "center", height: "18px" }}>
                      {[0, 150, 300].map((delay) => (
                        <span key={delay} style={{
                          width: "6px", height: "6px", borderRadius: "50%",
                          background: "currentColor", opacity: 0.6,
                          animation: `bounce 1.2s ${delay}ms infinite`,
                        }} />
                      ))}
                    </span>
                  ) : (
                    <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{msg.content}</p>
                  )}
                </div>

                {/* Tool badges */}
                {!msg.isLoading && msg.toolsUsed && msg.toolsUsed.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "5px" }}>
                    {msg.toolsUsed.map((t) => (
                      <span key={t} style={{
                        fontSize: "10px", padding: "2px 6px", borderRadius: "20px",
                        background: "var(--surface, #f1f5f9)", border: "1px solid var(--border, #e2e8f0)",
                        color: "var(--foreground, #64748b)", opacity: 0.8,
                      }}>
                        ⚡ {t}
                      </span>
                    ))}
                  </div>
                )}

                {/* Action buttons */}
                {!msg.isLoading && msg.actions && msg.actions.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "7px" }}>
                    {msg.actions.map((action, i) =>
                      action.type === "navigate" && action.url ? (
                        <button
                          key={i}
                          onClick={() => router.push(action.url!)}
                          style={{
                            fontSize: "12px", padding: "5px 11px", borderRadius: "20px",
                            background: primaryColor, color: "#fff", border: "none",
                            cursor: "pointer", display: "flex", alignItems: "center", gap: "5px",
                          }}
                        >
                          <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                          {action.label ?? "Git"}
                        </button>
                      ) : null
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggested prompts */}
        {messages.length === 1 && (
          <div style={{ padding: "0 12px 8px", flexShrink: 0 }}>
            <p style={{ fontSize: "11px", color: "var(--foreground, #94a3b8)", opacity: 0.6, margin: "0 0 6px" }}>Hızlı sorular:</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
              {SUGGESTED_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => void sendMessage(p)}
                  style={{
                    fontSize: "11px", padding: "4px 10px", borderRadius: "20px",
                    border: "1px solid var(--border, #e2e8f0)", background: "var(--surface, #f8fafc)",
                    color: "var(--foreground, #374151)", cursor: "pointer",
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div style={{
          padding: "10px 12px 12px",
          borderTop: "1px solid var(--border, #e2e8f0)",
          background: "var(--background, #fff)",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Soru sorun veya işlem yaptırın..."
              rows={1}
              disabled={loading}
              style={{
                flex: 1, resize: "none", border: "1px solid var(--border, #e2e8f0)",
                borderRadius: "12px", padding: "9px 12px", fontSize: "13px",
                background: "var(--surface, #f8fafc)", color: "var(--foreground, #171717)",
                outline: "none", lineHeight: "1.4", maxHeight: "100px",
                overflowY: input.split("\n").length > 2 ? "auto" : "hidden",
                fontFamily: "inherit",
              }}
            />
            <button
              onClick={() => void sendMessage(input)}
              disabled={loading || !input.trim()}
              style={{
                width: "36px", height: "36px", borderRadius: "10px", flexShrink: 0,
                background: input.trim() && !loading ? primaryColor : "var(--border, #e2e8f0)",
                color: input.trim() && !loading ? "#fff" : "var(--foreground, #94a3b8)",
                border: "none", cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "background 0.15s ease",
              }}
            >
              <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
          <p style={{ fontSize: "10px", color: "var(--foreground, #94a3b8)", opacity: 0.5, textAlign: "center", margin: "6px 0 0" }}>
            Enter · gönder &nbsp;·&nbsp; Shift+Enter · yeni satır
          </p>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-5px); }
        }
      `}</style>
    </>
  );
}
