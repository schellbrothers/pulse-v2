import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const SB_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://mrpxtbuezqrlxybnhyne.supabase.co";
const SB_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_XGwL4p2FD0Af58_sidErwg_In1FU_9o";
const OLLAMA_URL =
  process.env.OLLAMA_BASE_URL || "http://192.168.101.178:11434";
const CHAT_MODEL = process.env.CHAT_MODEL || "llama3.1:8b";

const SYSTEM_PROMPT = `You are an internal assistant for Schell Brothers sales staff (CSMs and sales agents). You have access to real-time data from the Schell Brothers database.

RULES:
- Be concise and data-dense. CSMs want facts, not marketing fluff.
- Always include specific numbers: prices, lot counts, sqft ranges.
- For pricing: always show BASE price, INCENTIVE amount, and NET price (what buyer pays).
- Format prices as $XXX,XXX.
- If asked about lots, list them with lot number, status, premium, and address.
- For floor plans, include beds/baths/sqft range and style (Ranch, First Floor Suite, etc).
- No "schedule a tour" or sales CTAs — this is internal staff use.
- If data is missing or unclear, say so directly.
- Keep responses under 300 words unless specifically asked for more detail.`;

// ---------------------------------------------------------------------------
// Intent detection
// ---------------------------------------------------------------------------

function detectIntent(msg: string): string {
  const m = msg.toLowerCase();
  if (
    m.includes("available lot") ||
    m.includes("lot available") ||
    (m.includes("lot") && m.includes("avail"))
  )
    return "lots";
  if (
    m.includes("floor plan") ||
    m.includes("plan") ||
    m.includes("ranch") ||
    m.includes("suite") ||
    m.includes("sqft") ||
    m.includes("bedroom") ||
    m.includes("bath")
  )
    return "plans";
  if (
    m.includes("school") ||
    m.includes("district") ||
    m.includes("elementary") ||
    m.includes("high school")
  )
    return "schools";
  if (
    m.includes("price") ||
    m.includes("cost") ||
    m.includes("afford") ||
    m.includes("budget") ||
    m.includes("incentive")
  )
    return "pricing";
  if (
    m.includes("hoa") ||
    m.includes("fee") ||
    m.includes("amenity") ||
    m.includes("pool") ||
    m.includes("amenities")
  )
    return "community_info";
  if (
    m.includes("model home") ||
    m.includes("quick delivery") ||
    m.includes("spec home")
  )
    return "model_homes";
  return "general";
}

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

interface CommunityRow {
  id: string;
  name: string;
  slug: string | null;
  status: string | null;
  city: string | null;
  state: string | null;
  hoa_fee: number | null;
  priced_from: number | null;
  school_district: string | null;
  school_elementary: string | null;
  school_middle: string | null;
  school_high: string | null;
  amenities: string | null;
  description: string | null;
  sales_phone: string | null;
}

async function fetchData(
  intent: string,
  message: string,
  supabase: any
): Promise<string> {
  const m = message.toLowerCase();

  // Always fetch communities for name matching + fallback
  const { data: communities } = await supabase
    .from("communities")
    .select(
      "id, name, slug, status, city, state, hoa_fee, priced_from, school_district, school_elementary, school_middle, school_high, amenities, description, sales_phone"
    )
    .order("name");

  const commList = (communities ?? []) as CommunityRow[];
  const mentionedComm = commList.find(
    (c) =>
      m.includes(c.name.toLowerCase()) ||
      (c.slug !== null && m.includes(c.slug))
  );

  // ---- LOTS ----------------------------------------------------------------

  if (intent === "lots" && mentionedComm) {
    const { data: lots } = await supabase
      .from("lots")
      .select(
        "lot_number, lot_status, construction_status, is_available, lot_premium, address, block, phase"
      )
      .eq("community_id", mentionedComm.id)
      .neq("lot_status", "Sold")
      .order("lot_number");

    return `Community: ${mentionedComm.name}, ${mentionedComm.city} ${mentionedComm.state}\nLots:\n${JSON.stringify(
      (lots ?? []).slice(0, 20),
      null,
      2
    )}`;
  }

  if (intent === "lots") {
    const { data: lots } = await supabase
      .from("lots")
      .select("community_name_raw, lot_number, lot_status, lot_premium, address")
      .eq("lot_status", "Available Homesite")
      .order("community_name_raw")
      .limit(30);

    return `Available lots across all communities:\n${JSON.stringify(
      lots ?? [],
      null,
      2
    )}`;
  }

  // ---- FLOOR PLANS ---------------------------------------------------------

  if (intent === "plans" && mentionedComm) {
    const { data: plans } = await supabase
      .from("floor_plans")
      .select(
        "plan_name, base_price, incentive_amount, net_price, min_bedrooms, max_bedrooms, min_bathrooms, max_bathrooms, min_heated_sqft, max_heated_sqft, style_filters, popularity, virtual_tour_url"
      )
      .eq("community_id", mentionedComm.id)
      .order("net_price");

    return `Community: ${mentionedComm.name}\nFloor plans:\n${JSON.stringify(
      plans ?? [],
      null,
      2
    )}`;
  }

  if (intent === "plans") {
    const maxPriceMatch = m.match(/\$?(\d{3,})k?/);
    const maxPrice = maxPriceMatch
      ? parseInt(maxPriceMatch[1]) *
        (maxPriceMatch[0].includes("k") ? 1000 : 1)
      : null;
    const bedsMatch = m.match(/(\d)\+?\s*bed/);
    const minBeds = bedsMatch ? parseInt(bedsMatch[1]) : null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = supabase
      .from("floor_plans")
      .select(
        "plan_name, community_id, base_price, incentive_amount, net_price, min_bedrooms, max_bedrooms, min_heated_sqft, style_filters"
      )
      .order("net_price")
      .limit(20);

    if (maxPrice !== null) query = query.lte("net_price", maxPrice);
    if (minBeds !== null) query = query.gte("min_bedrooms", minBeds);
    if (m.includes("ranch"))
      query = query.contains("style_filters", ["Ranch"]);
    if (m.includes("first floor") || m.includes("1st floor"))
      query = query.contains("style_filters", ["First Floor Suite"]);

    const { data: plans } = await query;

    const planData = ((plans ?? []) as Array<Record<string, unknown>>).map(
      (p) => ({
        ...p,
        community:
          commList.find((c) => c.id === p.community_id)?.name ?? "Unknown",
      })
    );

    return `Floor plans matching query:\n${JSON.stringify(planData, null, 2)}`;
  }

  // ---- PRICING -------------------------------------------------------------

  if (intent === "pricing" && mentionedComm) {
    const { data: plans } = await supabase
      .from("floor_plans")
      .select(
        "plan_name, base_price, incentive_amount, net_price, base_price_effective_date, incentive_effective_date"
      )
      .eq("community_id", mentionedComm.id)
      .order("net_price");

    return `Pricing for ${mentionedComm.name}:\nPriced from: $${mentionedComm.priced_from?.toLocaleString()}\nPlans:\n${JSON.stringify(
      plans ?? [],
      null,
      2
    )}`;
  }

  // ---- SCHOOLS -------------------------------------------------------------

  if (intent === "schools" && mentionedComm) {
    return `Schools for ${mentionedComm.name}:\nDistrict: ${mentionedComm.school_district}\nElementary: ${mentionedComm.school_elementary}\nMiddle: ${mentionedComm.school_middle}\nHigh: ${mentionedComm.school_high}`;
  }

  // ---- MODEL HOMES ---------------------------------------------------------

  if (intent === "model_homes") {
    const { data: comm } = await supabase
      .from("communities")
      .select("name, model_homes, spec_homes, city, state")
      .eq("has_model", true);

    const formatted = ((comm ?? []) as Array<{
      name: string;
      city: string;
      state: string;
      model_homes: string | null;
      spec_homes: string | null;
    }>).map((c) => ({
      name: c.name,
      city: c.city,
      state: c.state,
      model_homes: c.model_homes ? JSON.parse(c.model_homes) : [],
    }));

    return `Communities with model homes:\n${JSON.stringify(formatted, null, 2)}`;
  }

  // ---- GENERAL COMMUNITY INFO ----------------------------------------------

  if (mentionedComm) {
    const { data: lots } = await supabase
      .from("lots")
      .select("lot_status")
      .eq("community_id", mentionedComm.id);

    const available = ((lots ?? []) as Array<{ lot_status: string }>).filter(
      (l) => l.lot_status === "Available Homesite"
    ).length;

    const { data: plans } = await supabase
      .from("floor_plans")
      .select("plan_name, net_price, style_filters")
      .eq("community_id", mentionedComm.id)
      .order("net_price");

    return `Community: ${mentionedComm.name}
Location: ${mentionedComm.city}, ${mentionedComm.state}
Priced From: $${mentionedComm.priced_from?.toLocaleString()}
HOA: $${mentionedComm.hoa_fee}/mo
Available Lots: ${available}
Schools: ${mentionedComm.school_district} district
Amenities: ${mentionedComm.amenities}
Plans: ${JSON.stringify(plans ?? [], null, 2)}`;
  }

  // ---- FALLBACK: list all communities --------------------------------------

  return `All communities:\n${JSON.stringify(
    commList.map((c) => ({
      name: c.name,
      city: c.city,
      state: c.state,
      priced_from: c.priced_from,
      hoa: c.hoa_fee,
      status: c.status,
    })),
    null,
    2
  )}`;
}

// ---------------------------------------------------------------------------
// Ollama / Spark call
// ---------------------------------------------------------------------------

function formatDataDirect(context: string): string {
  try {
    const lines = context.split("\n").filter((l) => l.trim());
    return lines.slice(0, 15).join("\n");
  } catch {
    return context.slice(0, 500);
  }
}

async function callSpark(
  systemPrompt: string,
  userMessage: string,
  context: string
): Promise<string> {
  const prompt = `${systemPrompt}\n\n## DATA FROM DATABASE:\n${context}\n\n## USER QUESTION:\n${userMessage}\n\n## ANSWER:`;

  try {
    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: CHAT_MODEL,
        prompt,
        stream: false,
        options: { temperature: 0.3, num_predict: 500 },
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) throw new Error(`Ollama ${res.status}`);
    const data = await res.json();
    return (data.response as string) || "No response";
  } catch {
    return formatDataDirect(context);
  }
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: "No message" }, { status: 400 });
    }

    const supabase = createClient(SB_URL, SB_KEY);
    const intent = detectIntent(message as string);
    const context = await fetchData(intent, message as string, supabase);
    const response = await callSpark(SYSTEM_PROMPT, message as string, context);

    return NextResponse.json({ response, intent });
  } catch (e) {
    console.error("Chat error:", e);
    return NextResponse.json(
      {
        error: "Internal error",
        response: "Sorry, something went wrong. Please try again.",
      },
      { status: 500 }
    );
  }
}
