import { NextRequest, NextResponse } from "next/server";

// DGX Spark — local LLM inference
const SPARK_URL = process.env.SPARK_URL || "http://192.168.101.178:8000/v1";
const SPARK_MODEL = process.env.SPARK_MODEL || "Qwen/Qwen3-Coder-Next-FP8";

export async function POST(req: NextRequest) {
  try {
    const { contactName, channel, direction, subject, body, employeeName, recentHistory } = await req.json();

    const isSms = channel === "sms" || channel === "text";
    const channelLabel = isSms ? "text message" : channel === "email" ? "email" : "message";

    // Build context from recent conversation history if available
    let historyContext = "";
    if (recentHistory && recentHistory.length > 0) {
      historyContext = "\n\nRecent conversation history (newest first):\n" +
        recentHistory.slice(0, 5).map((h: { direction: string; body: string; channel: string; occurred_at: string }) =>
          `[${h.direction === "inbound" ? contactName : (employeeName || "OSC")}] ${(h.body || "").slice(0, 200)}`
        ).join("\n");
    }

    const systemPrompt = `You are a helpful AI assistant for ${employeeName || "an Online Sales Consultant"} at Schell Brothers, a luxury home builder in Delaware. 
You draft reply ${channelLabel}s to customers and prospects on behalf of the sales team.

Rules:
- Match the tone and length of the channel: short and casual for texts, professional but warm for emails
- Address the specific content of their message — don't give generic "thanks for reaching out" replies
- If they ask about something specific (model home, video, pricing, visit), acknowledge and respond to THAT
- Never make up information about inventory, pricing, or availability — offer to find out or connect them with the right person
- Sign off as ${employeeName || "the sales team"} (first name only for texts)
- For texts: keep it under 160 characters when possible, max 2-3 sentences
- For emails: 3-5 short paragraphs max
- Do NOT include subject lines in your response
- Be genuine, not salesy`;

    const userPrompt = `Draft a reply to this ${direction === "inbound" ? "inbound" : "outbound"} ${channelLabel} from ${contactName}:
${subject ? `Subject: ${subject}\n` : ""}
Message: ${(body || "").slice(0, 1000)}
${historyContext}

Write ONLY the reply text — no subject line, no labels, no explanations.`;

    const sparkRes = await fetch(`${SPARK_URL}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: SPARK_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: isSms ? 200 : 600,
        temperature: 0.7,
      }),
    });

    if (!sparkRes.ok) {
      const errText = await sparkRes.text();
      console.error("[ai-reply] Spark error:", sparkRes.status, errText);
      return NextResponse.json({ reply: null, error: "Spark unavailable" }, { status: 502 });
    }

    const data = await sparkRes.json();
    const reply = data.choices?.[0]?.message?.content?.trim() || null;

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("[ai-reply] Error:", err);
    return NextResponse.json({ reply: null, error: "Internal error" }, { status: 500 });
  }
}
