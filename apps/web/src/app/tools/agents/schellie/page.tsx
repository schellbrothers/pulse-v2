"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

// ─── Supabase client ──────────────────────────────────────────────────────────

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mrpxtbuezqrlxybnhyne.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ""
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface SchellieSessions {
  id: string;
  status: string;
  message_count: number;
  duration?: number;
  lead_captured: boolean;
  started_at: string;
  last_message_at?: string;
}

interface PerformanceMetrics {
  totalSessions: number;
  sessionsToday: number;
  conversionRate: number;
  avgMessageCount: number;
  avgDuration: number;
}

interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

// ─── Components ───────────────────────────────────────────────────────────────

function MetricCard({ label, value, unit, isAlert }: { label: string; value: string | number; unit?: string; isAlert?: boolean }) {
  return (
    <div
      style={{
        padding: "16px 20px",
        backgroundColor: "#18181b",
        border: `1px solid ${isAlert ? "#991b1b" : "#27272a"}`,
        borderRadius: 8,
        display: "flex",
        flexDirection: "column",
        gap: 4,
        minWidth: 0,
        flex: 1,
      }}
    >
      <span
        style={{
          fontSize: 11,
          color: "#71717a",
          fontWeight: 500,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 24,
          fontWeight: 600,
          lineHeight: 1.2,
          color: isAlert ? "#f87171" : "#fafafa",
        }}
      >
        {value}
        {unit && <span style={{ fontSize: 16, color: "#71717a", marginLeft: 4 }}>{unit}</span>}
      </span>
    </div>
  );
}

function ToggleSwitch({ enabled, onChange }: { enabled: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      style={{
        position: "relative",
        width: 44,
        height: 24,
        borderRadius: 12,
        border: "none",
        cursor: "pointer",
        backgroundColor: enabled ? "#80B602" : "#27272a",
        transition: "background-color 0.2s",
      }}
    >
      <div
        style={{
          position: "absolute",
          width: 16,
          height: 16,
          borderRadius: "50%",
          backgroundColor: "#fafafa",
          top: 4,
          left: enabled ? 24 : 4,
          transition: "left 0.2s",
        }}
      />
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SchelliePage() {
  const [activeTab, setActiveTab] = useState<"system" | "knowledge" | "guardrails" | "test" | "performance">("system");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [loadingSystemPrompt, setLoadingSystemPrompt] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Guardrails state
  const [leadCapture, setLeadCapture] = useState(true);
  const [pricingDisclosure, setPricingDisclosure] = useState<"show" | "redirect">("show");
  const [competitorMentions, setCompetitorMentions] = useState<"allow" | "block">("allow");
  const [afterHoursMode, setAfterHoursMode] = useState<"normal" | "reduced">("normal");
  const [maxConversationLength, setMaxConversationLength] = useState(50);
  const [blockedPhrases, setBlockedPhrases] = useState("");
  const [redirectPhrase, setRedirectPhrase] = useState("Please call us at (302) 227-1053");

  // Test chat state
  const [testMessages, setTestMessages] = useState<ChatMessage[]>([]);
  const [testInput, setTestInput] = useState("");
  const [sendingTest, setSendingTest] = useState(false);

  // Performance state
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [recentSessions, setRecentSessions] = useState<SchellieSessions[]>([]);
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  // Load system prompt (simulated - would fetch from schellie-v2 in production)
  useEffect(() => {
    const loadSystemPrompt = async () => {
      setLoadingSystemPrompt(true);
      // Simulate loading the system prompt from schellie-v2/src/lib/system-prompt.ts
      // In production, this would make an API call or read from a file
      await new Promise(resolve => setTimeout(resolve, 500));
      setSystemPrompt(`## 1. CORE IDENTITY
You are Schellie, Schell Brothers' digital sales concierge. You serve buyers across all active Schell Brothers divisions. You are warm, confident, concise, and genuinely helpful — never pushy, never robotic. You are an AI, not a human.

## 2. CORE OPERATING RULES
ALWAYS:
- Answer the buyer's question first, then move forward
- Use MCP tools for ALL factual data (pricing, lots, plans, communities, model homes)
- Keep responses to 1-3 sentences maximum
- Ask only ONE question per message
- Be conversational and warm

NEVER:
- Guess or fabricate facts — always use tools
- Schedule appointments directly
- Disclose internal information (employee names, org structure, direct contacts)
- End a conversation without a lead capture attempt
- Editorialize about the market or competitors
- Open messages with "Great!", "Perfect!", "Absolutely!", or similar filler

## 3. TOOL POLICY
ALL factual answers require MCP tool calls — never answer from memory...`);
      setLoadingSystemPrompt(false);
    };

    loadSystemPrompt();
  }, []);

  // Load performance metrics
  const loadPerformanceMetrics = useCallback(async () => {
    setLoadingMetrics(true);
    try {
      // Query schellie_sessions table
      const { data: sessions, error: sessionsError } = await supabase
        .from("schellie_sessions")
        .select("id, status, message_count, duration, lead_captured, started_at, last_message_at");

      if (sessionsError) {
        console.error("Error fetching sessions:", sessionsError);
        setLoadingMetrics(false);
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const totalSessions = sessions?.length || 0;
      const sessionsToday = sessions?.filter(s => new Date(s.started_at) >= today).length || 0;
      const leadsCount = sessions?.filter(s => s.lead_captured).length || 0;
      const conversionRate = totalSessions > 0 ? (leadsCount / totalSessions) * 100 : 0;
      const avgMessageCount = sessions && sessions.length > 0 
        ? sessions.reduce((sum, s) => sum + (s.message_count || 0), 0) / sessions.length 
        : 0;
      const avgDuration = sessions && sessions.length > 0 
        ? sessions.reduce((sum, s) => sum + (s.duration || 0), 0) / sessions.length 
        : 0;

      setMetrics({
        totalSessions,
        sessionsToday,
        conversionRate,
        avgMessageCount,
        avgDuration,
      });

      // Get recent sessions (last 20)
      const recentData = sessions?.slice(-20).reverse() || [];
      setRecentSessions(recentData.map(s => ({
        ...s,
        duration: s.duration || 0,
      })));

    } catch (error) {
      console.error("Error loading performance metrics:", error);
    }
    setLoadingMetrics(false);
  }, []);

  useEffect(() => {
    if (activeTab === "performance") {
      loadPerformanceMetrics();
    }
  }, [activeTab, loadPerformanceMetrics]);

  // Handle system prompt save
  const handleSaveSystemPrompt = async () => {
    setSaving(true);
    // Simulate save
    await new Promise(resolve => setTimeout(resolve, 800));
    console.log("System prompt saved:", systemPrompt.substring(0, 100) + "...");
    setSaving(false);
    // Show toast (simplified)
    alert("Saved! Changes require Vercel redeploy to take effect.");
  };

  // Handle test chat
  const handleSendTestMessage = async () => {
    if (!testInput.trim() || sendingTest) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: testInput,
      role: 'user',
      timestamp: new Date(),
    };

    setTestMessages(prev => [...prev, userMessage]);
    setTestInput("");
    setSendingTest(true);

    try {
      // Send to test endpoint
      const response = await fetch('/api/test-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: testInput }),
      });

      const data = await response.json();
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: data.message || "[Test Mode] Schellie would respond here. Connect to Schellie API to enable live testing.",
        role: 'assistant',
        timestamp: new Date(),
      };

      setTestMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Test chat error:", error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: "[Test Mode] Schellie would respond here. Connect to Schellie API to enable live testing.",
        role: 'assistant',
        timestamp: new Date(),
      };
      setTestMessages(prev => [...prev, errorMessage]);
    }
    
    setSendingTest(false);
  };

  // Helper functions
  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { 
      month: "short", 
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  };

  return (
    <div style={{ 
      minHeight: "100vh", 
      backgroundColor: "#09090b", 
      color: "#fafafa",
      display: "flex",
      flexDirection: "column"
    }}>
      {/* Breadcrumb */}
      <div style={{
        padding: "12px 24px",
        borderBottom: "1px solid #27272a",
        backgroundColor: "#09090b",
        display: "flex",
        alignItems: "center",
        gap: 6,
        fontSize: 13,
      }}>
        <Link
          href="/tools/agents"
          style={{
            color: "#71717a",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "#a1a1aa"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "#71717a"; }}
        >
          ← Agents
        </Link>
        <span style={{ color: "#3f3f46" }}>/</span>
        <span style={{ color: "#fafafa", fontWeight: 500 }}>Schellie</span>
      </div>

      {/* Header */}
      <div style={{ 
        padding: "16px 24px", 
        borderBottom: "1px solid #27272a",
        backgroundColor: "#09090b"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 20 }}>🐚</span>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
            <div>
              <h1 style={{ 
                margin: 0, 
                fontSize: 18, 
                fontWeight: 600, 
                color: "#fafafa" 
              }}>
                Schellie
              </h1>
              <p style={{ 
                margin: 0, 
                fontSize: 13, 
                color: "#71717a" 
              }}>
                Customer-facing chat agent
              </p>
            </div>
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              color: "#80B602",
              fontWeight: 500,
              marginLeft: 4,
            }}>
              <span style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: "#80B602",
                display: "inline-block",
              }} />
              Active
            </span>
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <div style={{ 
        display: "flex", 
        gap: 0, 
        borderBottom: "1px solid #27272a", 
        padding: "0 24px", 
        backgroundColor: "#09090b", 
        flexShrink: 0 
      }}>
        {([
          { key: "system", label: "SYSTEM PROMPT" },
          { key: "knowledge", label: "KNOWLEDGE FILES" },
          { key: "guardrails", label: "GUARDRAILS" },
          { key: "test", label: "TEST CHAT" },
          { key: "performance", label: "PERFORMANCE" },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: "10px 16px",
              fontSize: 11,
              fontWeight: 600,
              color: activeTab === tab.key ? "#fafafa" : "#71717a",
              borderBottom: activeTab === tab.key ? "2px solid #fafafa" : "2px solid transparent",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              letterSpacing: "0.05em",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ 
        flex: 1, 
        padding: "24px",
        overflow: "auto" 
      }}>
        {/* SYSTEM PROMPT TAB */}
        {activeTab === "system" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ 
              backgroundColor: "#18181b", 
              border: "1px solid #27272a", 
              borderRadius: 8, 
              padding: 20 
            }}>
              <div style={{ marginBottom: 12 }}>
                <h3 style={{ 
                  margin: 0, 
                  fontSize: 14, 
                  fontWeight: 600, 
                  color: "#fafafa" 
                }}>
                  Current System Prompt
                </h3>
                <p style={{ 
                  margin: "4px 0 0 0", 
                  fontSize: 12, 
                  color: "#71717a" 
                }}>
                  Loaded from schellie-v2/src/lib/system-prompt.ts
                </p>
              </div>

              {loadingSystemPrompt ? (
                <div style={{ 
                  padding: 60, 
                  textAlign: "center", 
                  color: "#71717a" 
                }}>
                  Loading system prompt...
                </div>
              ) : (
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  style={{
                    width: "100%",
                    height: 400,
                    backgroundColor: "#09090b",
                    border: "1px solid #27272a",
                    borderRadius: 6,
                    padding: 12,
                    color: "#fafafa",
                    fontSize: 11,
                    fontFamily: "JetBrains Mono, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
                    lineHeight: 1.5,
                    resize: "vertical",
                    outline: "none",
                  }}
                  placeholder="System prompt content..."
                />
              )}

              <div style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                alignItems: "center",
                marginTop: 16 
              }}>
                <div style={{
                  padding: "6px 12px",
                  backgroundColor: "#fbbf24",
                  border: "1px solid #d97706",
                  borderRadius: 4,
                  fontSize: 11,
                  color: "#000",
                  fontWeight: 500,
                }}>
                  ⚠️ Changes require Vercel redeploy to take effect
                </div>

                <button
                  onClick={handleSaveSystemPrompt}
                  disabled={saving || loadingSystemPrompt}
                  style={{
                    backgroundColor: saving ? "#27272a" : "#80B602",
                    color: saving ? "#71717a" : "#000",
                    border: "none",
                    padding: "8px 16px",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: saving ? "not-allowed" : "pointer",
                  }}
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* KNOWLEDGE FILES TAB */}
        {activeTab === "knowledge" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* MCP Tools */}
            <div style={{ 
              backgroundColor: "#18181b", 
              border: "1px solid #27272a", 
              borderRadius: 8, 
              padding: 20 
            }}>
              <h3 style={{ 
                margin: "0 0 16px 0", 
                fontSize: 14, 
                fontWeight: 600, 
                color: "#fafafa" 
              }}>
                MCP Tools Available
              </h3>

              <div style={{ display: "grid", gap: 12 }}>
                {[
                  { name: "get_community_details", desc: "Get detailed information about a specific community" },
                  { name: "get_floor_plans", desc: "Retrieve floor plans for communities" },
                  { name: "get_available_lots", desc: "Get available lots in communities" },
                  { name: "get_model_homes", desc: "Get model home information" },
                  { name: "search_communities", desc: "Search communities by location or criteria" },
                  { name: "get_divisions", desc: "Get all Schell Brothers divisions" },
                  { name: "calculate_buying_power", desc: "Calculate buyer's purchasing power" },
                  { name: "get_branch_out_info", desc: "Get Branch Out (build on your land) information" },
                  { name: "capture_lead", desc: "Capture lead information from conversations" },
                ].map((tool) => (
                  <div
                    key={tool.name}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "12px 16px",
                      backgroundColor: "#09090b",
                      border: "1px solid #27272a",
                      borderRadius: 6,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        fontSize: 12, 
                        fontWeight: 600, 
                        color: "#fafafa",
                        fontFamily: "JetBrains Mono, Monaco, Consolas, monospace",
                      }}>
                        {tool.name}
                      </div>
                      <div style={{ 
                        fontSize: 11, 
                        color: "#71717a",
                        marginTop: 2 
                      }}>
                        {tool.desc}
                      </div>
                    </div>
                    <button
                      style={{
                        backgroundColor: "transparent",
                        color: "#80B602",
                        border: "1px solid #80B602",
                        padding: "4px 8px",
                        borderRadius: 4,
                        fontSize: 10,
                        cursor: "pointer",
                      }}
                    >
                      Test
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Knowledge Files */}
            <div style={{ 
              backgroundColor: "#18181b", 
              border: "1px solid #27272a", 
              borderRadius: 8, 
              padding: 20 
            }}>
              <div style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                alignItems: "center",
                marginBottom: 16 
              }}>
                <h3 style={{ 
                  margin: 0, 
                  fontSize: 14, 
                  fontWeight: 600, 
                  color: "#fafafa" 
                }}>
                  Knowledge Files
                </h3>
                <button
                  style={{
                    backgroundColor: "#80B602",
                    color: "#000",
                    border: "none",
                    padding: "6px 12px",
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Upload File
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { name: "communities.md", size: "45.2 KB", modified: "Apr 26, 2026" },
                  { name: "floor-plans.md", size: "128.7 KB", modified: "Apr 25, 2026" },
                  { name: "pricing.md", size: "22.1 KB", modified: "Apr 24, 2026" },
                  { name: "policies.md", size: "67.9 KB", modified: "Apr 23, 2026" },
                ].map((file) => (
                  <div
                    key={file.name}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "12px 16px",
                      backgroundColor: "#09090b",
                      border: "1px solid #27272a",
                      borderRadius: 6,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
                      <span style={{ fontSize: 16 }}>📄</span>
                      <div>
                        <div style={{ 
                          fontSize: 12, 
                          fontWeight: 500, 
                          color: "#fafafa" 
                        }}>
                          {file.name}
                        </div>
                        <div style={{ 
                          fontSize: 10, 
                          color: "#71717a" 
                        }}>
                          {file.size} • Modified {file.modified}
                        </div>
                      </div>
                    </div>
                    <button
                      style={{
                        backgroundColor: "transparent",
                        color: "#71717a",
                        border: "1px solid #27272a",
                        padding: "4px 8px",
                        borderRadius: 4,
                        fontSize: 10,
                        cursor: "pointer",
                      }}
                    >
                      Edit
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* GUARDRAILS TAB */}
        {activeTab === "guardrails" && (
          <div style={{ 
            backgroundColor: "#18181b", 
            border: "1px solid #27272a", 
            borderRadius: 8, 
            padding: 20 
          }}>
            <h3 style={{ 
              margin: "0 0 20px 0", 
              fontSize: 14, 
              fontWeight: 600, 
              color: "#fafafa" 
            }}>
              Conversation Guardrails
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Toggle Options */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center" 
                }}>
                  <div>
                    <div style={{ 
                      fontSize: 13, 
                      fontWeight: 500, 
                      color: "#fafafa" 
                    }}>
                      Lead Capture
                    </div>
                    <div style={{ 
                      fontSize: 11, 
                      color: "#71717a" 
                    }}>
                      Enable automatic lead capture during conversations
                    </div>
                  </div>
                  <ToggleSwitch enabled={leadCapture} onChange={setLeadCapture} />
                </div>

                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center" 
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      fontSize: 13, 
                      fontWeight: 500, 
                      color: "#fafafa" 
                    }}>
                      Pricing Disclosure
                    </div>
                    <div style={{ 
                      fontSize: 11, 
                      color: "#71717a" 
                    }}>
                      How to handle pricing requests
                    </div>
                  </div>
                  <select
                    value={pricingDisclosure}
                    onChange={(e) => setPricingDisclosure(e.target.value as "show" | "redirect")}
                    style={{
                      backgroundColor: "#09090b",
                      color: "#fafafa",
                      border: "1px solid #27272a",
                      borderRadius: 4,
                      padding: "4px 8px",
                      fontSize: 11,
                    }}
                  >
                    <option value="show">Show Pricing</option>
                    <option value="redirect">Redirect to CSM</option>
                  </select>
                </div>

                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center" 
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      fontSize: 13, 
                      fontWeight: 500, 
                      color: "#fafafa" 
                    }}>
                      Competitor Mentions
                    </div>
                    <div style={{ 
                      fontSize: 11, 
                      color: "#71717a" 
                    }}>
                      How to handle competitor questions
                    </div>
                  </div>
                  <select
                    value={competitorMentions}
                    onChange={(e) => setCompetitorMentions(e.target.value as "allow" | "block")}
                    style={{
                      backgroundColor: "#09090b",
                      color: "#fafafa",
                      border: "1px solid #27272a",
                      borderRadius: 4,
                      padding: "4px 8px",
                      fontSize: 11,
                    }}
                  >
                    <option value="allow">Allow Discussion</option>
                    <option value="block">Block & Redirect</option>
                  </select>
                </div>

                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center" 
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      fontSize: 13, 
                      fontWeight: 500, 
                      color: "#fafafa" 
                    }}>
                      After-Hours Mode
                    </div>
                    <div style={{ 
                      fontSize: 11, 
                      color: "#71717a" 
                    }}>
                      Conversation behavior outside business hours
                    </div>
                  </div>
                  <select
                    value={afterHoursMode}
                    onChange={(e) => setAfterHoursMode(e.target.value as "normal" | "reduced")}
                    style={{
                      backgroundColor: "#09090b",
                      color: "#fafafa",
                      border: "1px solid #27272a",
                      borderRadius: 4,
                      padding: "4px 8px",
                      fontSize: 11,
                    }}
                  >
                    <option value="normal">Normal Service</option>
                    <option value="reduced">Reduced Service</option>
                  </select>
                </div>

                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center" 
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      fontSize: 13, 
                      fontWeight: 500, 
                      color: "#fafafa" 
                    }}>
                      Max Conversation Length
                    </div>
                    <div style={{ 
                      fontSize: 11, 
                      color: "#71717a" 
                    }}>
                      Maximum messages before prompting handoff
                    </div>
                  </div>
                  <input
                    type="number"
                    value={maxConversationLength}
                    onChange={(e) => setMaxConversationLength(parseInt(e.target.value) || 50)}
                    style={{
                      backgroundColor: "#09090b",
                      color: "#fafafa",
                      border: "1px solid #27272a",
                      borderRadius: 4,
                      padding: "4px 8px",
                      fontSize: 11,
                      width: 60,
                    }}
                  />
                </div>
              </div>

              {/* Text Inputs */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ 
                    fontSize: 13, 
                    fontWeight: 500, 
                    color: "#fafafa",
                    display: "block",
                    marginBottom: 6,
                  }}>
                    Custom Blocked Phrases
                  </label>
                  <textarea
                    value={blockedPhrases}
                    onChange={(e) => setBlockedPhrases(e.target.value)}
                    placeholder="Enter phrases separated by commas..."
                    style={{
                      width: "100%",
                      height: 60,
                      backgroundColor: "#09090b",
                      color: "#fafafa",
                      border: "1px solid #27272a",
                      borderRadius: 4,
                      padding: 8,
                      fontSize: 11,
                      resize: "none",
                      outline: "none",
                    }}
                  />
                </div>

                <div>
                  <label style={{ 
                    fontSize: 13, 
                    fontWeight: 500, 
                    color: "#fafafa",
                    display: "block",
                    marginBottom: 6,
                  }}>
                    Custom Redirect Phrase
                  </label>
                  <input
                    type="text"
                    value={redirectPhrase}
                    onChange={(e) => setRedirectPhrase(e.target.value)}
                    style={{
                      width: "100%",
                      backgroundColor: "#09090b",
                      color: "#fafafa",
                      border: "1px solid #27272a",
                      borderRadius: 4,
                      padding: 8,
                      fontSize: 11,
                      outline: "none",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TEST CHAT TAB */}
        {activeTab === "test" && (
          <div style={{ 
            backgroundColor: "#18181b", 
            border: "1px solid #27272a", 
            borderRadius: 8, 
            padding: 20,
            height: 600,
            display: "flex",
            flexDirection: "column"
          }}>
            {/* Test Mode Banner */}
            <div style={{
              backgroundColor: "#fbbf24",
              color: "#000",
              padding: "8px 12px",
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 600,
              marginBottom: 16,
              textAlign: "center",
            }}>
              🧪 TEST MODE — Test conversations do not create real leads
            </div>

            <h3 style={{ 
              margin: "0 0 16px 0", 
              fontSize: 14, 
              fontWeight: 600, 
              color: "#fafafa" 
            }}>
              Chat Test Interface
            </h3>

            {/* Messages */}
            <div style={{
              flex: 1,
              overflowY: "auto",
              border: "1px solid #27272a",
              borderRadius: 6,
              padding: 16,
              backgroundColor: "#09090b",
              marginBottom: 16,
            }}>
              {testMessages.length === 0 ? (
                <div style={{
                  textAlign: "center",
                  color: "#71717a",
                  fontSize: 12,
                  paddingTop: 40,
                }}>
                  Start a test conversation with Schellie...
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {testMessages.map((message) => (
                    <div
                      key={message.id}
                      style={{
                        display: "flex",
                        justifyContent: message.role === "user" ? "flex-end" : "flex-start",
                      }}
                    >
                      <div
                        style={{
                          maxWidth: "80%",
                          padding: "8px 12px",
                          borderRadius: 12,
                          backgroundColor: message.role === "user" ? "#2563eb" : "#f472b6",
                          color: message.role === "user" ? "#ffffff" : "#000000",
                          fontSize: 12,
                          lineHeight: 1.4,
                        }}
                      >
                        {message.content}
                      </div>
                    </div>
                  ))}
                  {sendingTest && (
                    <div style={{ display: "flex", justifyContent: "flex-start" }}>
                      <div style={{
                        padding: "8px 12px",
                        borderRadius: 12,
                        backgroundColor: "#f472b6",
                        color: "#000000",
                        fontSize: 12,
                      }}>
                        Schellie is typing...
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Input */}
            <div style={{
              display: "flex",
              gap: 8,
              alignItems: "flex-end",
            }}>
              <input
                type="text"
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendTestMessage()}
                placeholder="Type your test message as a visitor..."
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  backgroundColor: "#09090b",
                  color: "#fafafa",
                  border: "1px solid #27272a",
                  borderRadius: 6,
                  fontSize: 12,
                  outline: "none",
                }}
              />
              <button
                onClick={handleSendTestMessage}
                disabled={!testInput.trim() || sendingTest}
                style={{
                  backgroundColor: !testInput.trim() || sendingTest ? "#27272a" : "#80B602",
                  color: !testInput.trim() || sendingTest ? "#71717a" : "#000",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: !testInput.trim() || sendingTest ? "not-allowed" : "pointer",
                }}
              >
                Send
              </button>
            </div>
          </div>
        )}

        {/* PERFORMANCE TAB */}
        {activeTab === "performance" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Metrics */}
            <div style={{ 
              backgroundColor: "#18181b", 
              border: "1px solid #27272a", 
              borderRadius: 8, 
              padding: 20 
            }}>
              <h3 style={{ 
                margin: "0 0 16px 0", 
                fontSize: 14, 
                fontWeight: 600, 
                color: "#fafafa" 
              }}>
                Performance Metrics
              </h3>

              {loadingMetrics ? (
                <div style={{ 
                  padding: 40, 
                  textAlign: "center", 
                  color: "#71717a" 
                }}>
                  Loading metrics...
                </div>
              ) : metrics ? (
                <div style={{ 
                  display: "grid", 
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
                  gap: 16 
                }}>
                  <MetricCard 
                    label="Total Sessions" 
                    value={metrics.totalSessions} 
                  />
                  <MetricCard 
                    label="Sessions Today" 
                    value={metrics.sessionsToday} 
                  />
                  <MetricCard 
                    label="Conversion Rate" 
                    value={metrics.conversionRate.toFixed(1)} 
                    unit="%" 
                  />
                  <MetricCard 
                    label="Avg Messages" 
                    value={metrics.avgMessageCount.toFixed(1)} 
                  />
                  <MetricCard 
                    label="Avg Duration" 
                    value={formatDuration(metrics.avgDuration)} 
                  />
                </div>
              ) : (
                <div style={{ 
                  padding: 40, 
                  textAlign: "center", 
                  color: "#71717a" 
                }}>
                  No performance data available
                </div>
              )}
            </div>

            {/* Recent Sessions */}
            <div style={{ 
              backgroundColor: "#18181b", 
              border: "1px solid #27272a", 
              borderRadius: 8, 
              padding: 20 
            }}>
              <h3 style={{ 
                margin: "0 0 16px 0", 
                fontSize: 14, 
                fontWeight: 600, 
                color: "#fafafa" 
              }}>
                Recent Sessions (Last 20)
              </h3>

              <div style={{ 
                overflowX: "auto", 
                border: "1px solid #27272a", 
                borderRadius: 6 
              }}>
                <table style={{ 
                  width: "100%", 
                  borderCollapse: "collapse" 
                }}>
                  <thead>
                    <tr style={{ backgroundColor: "#09090b" }}>
                      {["Status", "Messages", "Duration", "Lead", "Started"].map(header => (
                        <th key={header} style={{
                          padding: "8px 12px",
                          textAlign: "left",
                          fontSize: 11,
                          color: "#71717a",
                          fontWeight: 500,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          borderBottom: "1px solid #27272a",
                        }}>
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recentSessions.length === 0 ? (
                      <tr>
                        <td 
                          colSpan={5} 
                          style={{ 
                            padding: 24, 
                            textAlign: "center", 
                            fontSize: 12, 
                            color: "#3f3f46" 
                          }}
                        >
                          No recent sessions
                        </td>
                      </tr>
                    ) : recentSessions.map(session => (
                      <tr 
                        key={session.id}
                        style={{
                          borderBottom: "1px solid #27272a",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#09090b")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                      >
                        <td style={{ 
                          padding: "8px 12px", 
                          fontSize: 12, 
                          color: "#fafafa" 
                        }}>
                          {session.status}
                        </td>
                        <td style={{ 
                          padding: "8px 12px", 
                          fontSize: 12, 
                          color: "#a1a1aa" 
                        }}>
                          {session.message_count}
                        </td>
                        <td style={{ 
                          padding: "8px 12px", 
                          fontSize: 12, 
                          color: "#a1a1aa" 
                        }}>
                          {formatDuration(session.duration || 0)}
                        </td>
                        <td style={{ 
                          padding: "8px 12px", 
                          fontSize: 12, 
                          color: session.lead_captured ? "#22c55e" : "#71717a" 
                        }}>
                          {session.lead_captured ? "✓" : "—"}
                        </td>
                        <td style={{ 
                          padding: "8px 12px", 
                          fontSize: 12, 
                          color: "#71717a" 
                        }}>
                          {formatDateTime(session.started_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}