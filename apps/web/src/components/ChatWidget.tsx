"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
  ts: number;
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm your HBx community assistant. Ask me about communities, floor plans, lot availability, pricing, or schools.",
      ts: Date.now(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesEndRef_parent = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleSend(text?: string) {
    const msg = text || input.trim();
    if (!msg || loading) return;

    const userMsg: Message = { role: "user", content: msg, ts: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            data.response || "Sorry, I couldn't get an answer right now.",
          ts: Date.now(),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Connection error. Please try again.",
          ts: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const suggestedQuestions = [
    "Available lots at Cardinal Grove?",
    "Ranch plans under $550K in DE?",
    "What communities have a model home?",
    "Show me the Monterey plan details",
  ];

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 12,
      }}
    >
      {/* Chat panel */}
      {open && (
        <div
          style={{
            width: 400,
            height: 560,
            backgroundColor: "#0f0f0f",
            border: "1px solid #2a2a2a",
            borderRadius: 12,
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "14px 16px",
              borderBottom: "1px solid #1f1f1f",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: "#0a0a0a",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16 }}>🦞</span>
              <div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#ededed",
                  }}
                >
                  HBx Assistant
                </div>
                <div style={{ fontSize: 10, color: "#555" }}>
                  Powered by Spark · Schell Brothers data
                </div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{
                background: "none",
                border: "none",
                color: "#555",
                cursor: "pointer",
                fontSize: 18,
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>

          {/* Messages */}
          <div
            ref={messagesEndRef_parent}
            style={{
              flex: 1,
              overflowY: "auto",
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent:
                    msg.role === "user" ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
                    maxWidth: "85%",
                    padding: "8px 12px",
                    borderRadius:
                      msg.role === "user"
                        ? "12px 12px 2px 12px"
                        : "12px 12px 12px 2px",
                    backgroundColor:
                      msg.role === "user" ? "#1a2a3f" : "#161616",
                    border: `1px solid ${
                      msg.role === "user" ? "#1a2a4f" : "#2a2a2a"
                    }`,
                    color: "#ededed",
                    fontSize: 13,
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div
                  style={{
                    padding: "8px 12px",
                    borderRadius: "12px 12px 12px 2px",
                    backgroundColor: "#161616",
                    border: "1px solid #2a2a2a",
                    color: "#555",
                    fontSize: 13,
                  }}
                >
                  Thinking...
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggested questions (only show when no user messages yet) */}
          {messages.filter((m) => m.role === "user").length === 0 && (
            <div
              style={{
                padding: "0 12px 8px",
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
              }}
            >
              {suggestedQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => handleSend(q)}
                  style={{
                    fontSize: 11,
                    padding: "4px 10px",
                    borderRadius: 20,
                    backgroundColor: "#1a1a1a",
                    border: "1px solid #2a2a2a",
                    color: "#a1a1a1",
                    cursor: "pointer",
                    transition: "all 0.1s",
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div
            style={{
              padding: "10px 12px",
              borderTop: "1px solid #1f1f1f",
              display: "flex",
              gap: 8,
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && !e.shiftKey && handleSend()
              }
              placeholder="Ask about communities, plans, lots..."
              disabled={loading}
              style={{
                flex: 1,
                backgroundColor: "#111",
                border: "1px solid #2a2a2a",
                borderRadius: 8,
                padding: "8px 12px",
                color: "#ededed",
                fontSize: 12,
                outline: "none",
              }}
            />
            <button
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              style={{
                padding: "8px 14px",
                backgroundColor: loading ? "#1a1a1a" : "#ededed",
                color: loading ? "#555" : "#0a0a0a",
                border: "none",
                borderRadius: 8,
                cursor: loading ? "default" : "pointer",
                fontSize: 12,
                fontWeight: 600,
                transition: "all 0.15s",
              }}
            >
              →
            </button>
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: 52,
          height: 52,
          borderRadius: "50%",
          backgroundColor: open ? "#1a1a1a" : "#ededed",
          border: open ? "1px solid #2a2a2a" : "none",
          color: open ? "#555" : "#0a0a0a",
          fontSize: 22,
          cursor: "pointer",
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.2s",
        }}
      >
        {open ? "×" : "🦞"}
      </button>
    </div>
  );
}
