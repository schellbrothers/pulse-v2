"use client";

import { useState, useEffect } from "react";

interface CodeViewerProps {
  open: boolean;
  onClose: () => void;
  type: "script" | "api" | "mcp";
  name: string;
}

export default function CodeViewer({ open, onClose, type, name }: CodeViewerProps) {
  const [content, setContent] = useState<string>("");
  const [meta, setMeta] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !name) return;
    setLoading(true);
    setError(null);
    fetch(`/api/inspect?type=${type}&name=${encodeURIComponent(name)}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else {
          setContent(data.content || "");
          setMeta(data);
        }
      })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, [open, type, name]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const language = (meta.language as string) || "text";
  const lines = content.split("\n").length;
  const filePath = (meta.path as string) || name;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      backgroundColor: "rgba(0,0,0,0.8)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "85vw", maxWidth: 1000, height: "80vh",
          backgroundColor: "#0d0d12", border: "1px solid #27272a",
          borderRadius: 12, display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "12px 20px", borderBottom: "1px solid #1a1a22",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{
              fontSize: 9, padding: "3px 8px", borderRadius: 4, fontWeight: 600,
              textTransform: "uppercase", letterSpacing: "0.05em",
              backgroundColor: type === "script" ? "#0c4a6e" : type === "mcp" ? "#134e4a" : "#422006",
              color: type === "script" ? "#38bdf8" : type === "mcp" ? "#5eead4" : "#fbbf24",
            }}>{type}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#fafafa" }}>{name}</span>
            <span style={{ fontSize: 10, color: "#52525b" }}>
              {language} · {lines} lines
            </span>
          </div>
          <button onClick={onClose} style={{
            padding: "4px 12px", borderRadius: 6, border: "1px solid #27272a",
            backgroundColor: "transparent", color: "#71717a", fontSize: 12, cursor: "pointer",
          }}>Close (Esc)</button>
        </div>

        {/* Path */}
        <div style={{ padding: "6px 20px", borderBottom: "1px solid #111116", fontSize: 10, color: "#3f3f46", fontFamily: "monospace" }}>
          {filePath}
        </div>

        {/* Code */}
        <div style={{ flex: 1, overflow: "auto", padding: 0 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "#52525b" }}>Loading source...</div>
          ) : error ? (
            <div style={{ padding: 40, textAlign: "center", color: "#f87171" }}>{error}</div>
          ) : (
            <pre style={{
              margin: 0, padding: "16px 0", fontSize: 12, lineHeight: 1.7,
              fontFamily: "'SF Mono', 'Fira Code', 'JetBrains Mono', Consolas, monospace",
              color: "#d4d4d8", counterReset: "line",
            }}>
              {content.split("\n").map((line, i) => (
                <div key={i} style={{
                  display: "flex", padding: "0 20px",
                  backgroundColor: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                }}>
                  <span style={{
                    color: "#3f3f46", minWidth: 45, textAlign: "right",
                    paddingRight: 16, userSelect: "none", fontSize: 11,
                  }}>{i + 1}</span>
                  <span style={{ flex: 1, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                    {highlightLine(line, language)}
                  </span>
                </div>
              ))}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

// Simple syntax highlighting
function highlightLine(line: string, lang: string): React.ReactNode {
  if (lang === "json") {
    return <span style={{ color: "#a78bfa" }}>{line}</span>;
  }
  
  // Python / TypeScript highlighting
  const parts: React.ReactNode[] = [];
  let remaining = line;
  let key = 0;

  // Comments
  const commentIdx = lang === "python" ? remaining.indexOf("#") : remaining.indexOf("//");
  if (commentIdx >= 0 && (commentIdx === 0 || remaining[commentIdx - 1] !== ":")) {
    if (commentIdx > 0) {
      parts.push(<span key={key++}>{remaining.slice(0, commentIdx)}</span>);
    }
    parts.push(<span key={key++} style={{ color: "#52525b", fontStyle: "italic" }}>{remaining.slice(commentIdx)}</span>);
    return <>{parts}</>;
  }

  // Strings
  const strMatch = remaining.match(/(["'`])(.*?)\1/);
  if (strMatch) {
    const idx = remaining.indexOf(strMatch[0]);
    if (idx > 0) parts.push(<span key={key++}>{remaining.slice(0, idx)}</span>);
    parts.push(<span key={key++} style={{ color: "#4ade80" }}>{strMatch[0]}</span>);
    remaining = remaining.slice(idx + strMatch[0].length);
    if (remaining) parts.push(<span key={key++}>{remaining}</span>);
    return <>{parts}</>;
  }

  // Keywords
  const keywords = lang === "python" 
    ? /\b(def|class|import|from|return|if|else|elif|for|while|try|except|with|as|in|not|and|or|True|False|None|async|await|raise|print)\b/g
    : /\b(const|let|var|function|return|if|else|for|while|try|catch|async|await|import|from|export|default|interface|type|new|true|false|null|undefined)\b/g;
  
  const highlighted = line.replace(keywords, "___KW___$1___/KW___");
  if (highlighted !== line) {
    const segments = highlighted.split(/(___KW___|___\/KW___)/);
    let inKw = false;
    for (const seg of segments) {
      if (seg === "___KW___") { inKw = true; continue; }
      if (seg === "___/KW___") { inKw = false; continue; }
      if (inKw) {
        parts.push(<span key={key++} style={{ color: "#c084fc" }}>{seg}</span>);
      } else {
        parts.push(<span key={key++}>{seg}</span>);
      }
    }
    return <>{parts}</>;
  }

  return line;
}
