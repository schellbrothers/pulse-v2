# SPEC: HBx AI Intelligence Layer + Personalized Nurture Engine

**Version:** 1.0  
**Date:** 2026-04-16  
**Author:** Schellie (AI Architect)  
**Status:** Draft — Ready for Build  
**Scope:** Pv2 CRM — Contact Intelligence, AI Scoring, Personalized Nurture

---

## 1. Objective

Build a unified AI intelligence layer that aggregates every customer touchpoint into a living profile, algorithmically scores and ranks contacts, auto-routes them through the 7-stage CRM funnel, and generates hyper-personalized nurture campaigns that drive each contact toward an in-person meeting and ultimately homeownership.

**This is the capability that no other builder has.**

---

## 2. The Intelligence Loop

```
SIGNALS (all channels)
    ↓
CONTACT PROFILE (unified AI dossier)
    ↓
AI SCORING ENGINE (algorithmic ranking)
    ↓
STAGE AUTOMATION (auto-promote/demote)
    ↓
PERSONALIZED NURTURE (AI-generated 1:1 emails via SendGrid)
    ↓
CONVERSION (in-person meeting → homeowner)
    ↓
(new signals feed back into profile)
```

---

## 3. Signal Sources (Input Channels)

Every interaction creates a signal that feeds the intelligence layer:

| Channel | Source System | Signal Type | Key Data |
|---|---|---|---|
| Email | Outlook/Microsoft Graph | Opens, replies, content | Subject, body, sentiment, response time |
| Phone | Zoom Phone | Calls, duration, voicemail | Call direction, duration, frequency |
| Text/SMS | Zoom SMS | Messages in/out | Content, response time, intent |
| Video Meeting | Zoom Meetings | Attendance, duration | Recording, participants, engagement |
| In-Person | Rilla | Transcripts, recordings | Full transcript, buying signals, objections |
| Web Form | Pv2 Webform Handler | Form submissions | Fields, UTMs, what they're asking |
| Chat | Schellie (website chatbot) | Conversations | Intent, questions asked, lead capture data |
| Session Recording | LogRocket / Heartbeat | Browsing behavior | Pages viewed, time on site, plans browsed, lots explored |
| Walk-In | Traffic tracking | Physical visit | Date, community, CSM interaction |

All signals feed into the unified `activities` table with channel enum.

---

## 4. Contact Intelligence Profile

Each contact gets a living AI dossier built from aggregated signals.

### 4.1 Profile Data Model

**Table: `ai_contact_profiles`** (new, or extend `ai_summaries`)

| Field | Type | Description |
|---|---|---|
| contact_id | uuid FK | The contact this profile belongs to |
| narrative_summary | text | AI-generated natural language summary of who this person is |
| key_interests | jsonb | Extracted interests: plans, lot preferences, features, lifestyle |
| personal_details | jsonb | Family info, pets, hobbies, employer, origin city — gleaned from conversations |
| buying_signals | jsonb | Positive signals: budget confirmed, timeline set, toured, etc. |
| objections | jsonb | Concerns: price, location, timing, spouse buy-in |
| preferred_plans | uuid[] | Plans they've shown interest in |
| preferred_lots | uuid[] | Lots they've viewed or discussed |
| communication_prefs | jsonb | Best channel, best time of day, response patterns |
| future_promise | text | AI-generated description of their ideal life in new home |
| last_updated | timestamptz | When profile was last refreshed by AI |

### 4.2 Future Promise

This is the key insight — the AI constructs what their life *could* look like:

> *"John and Sarah are relocating from Baltimore after John's retirement. They want a single-story with a screened porch for evening relaxation. They have two dogs (Ralph and Snippy) and are avid Orioles fans — outdoor living and yard space are priorities. Budget is $550-650K, targeting the Coronado plan with a southeast-facing lot."*

This powers the personalized nurture content.

---

## 5. AI Scoring Engine

### 5.1 Score Components

Each contact receives a composite score (0-100) computed from weighted signals:

| Component | Weight | Signals |
|---|---|---|
| **Recency** | 20% | Days since last activity (any channel). Decays over time. |
| **Engagement Depth** | 25% | Total interactions, response rate, multiple channels used |
| **Intent Signals** | 25% | Budget confirmed, timeline set, specific plan/lot interest, appointment requests |
| **Budget Fit** | 15% | Does their budget match available inventory? |
| **Behavioral** | 15% | Web sessions (pages/time), email open rate, chat engagement |

### 5.2 Score → Stage Mapping

| Score Range | Recommended Stage | Action |
|---|---|---|
| 80-100 | Prospect A | CSM: Close this week. AI drafts contract prep email. |
| 60-79 | Prospect B | CSM: Schedule follow-up. AI drafts personalized check-in. |
| 40-59 | Prospect C / Queue | OSC: Route to CSM or nurture. AI suggests next touch. |
| 20-39 | Lead | Marketing: Active nurture campaign. AI personalizes content. |
| 0-19 | Marketing | Passive: Mailchimp drip + occasional AI nudge. |

### 5.3 Auto-Promotion / Demotion

- Score crosses threshold → auto-promote/demote
- Every transition logged to `stage_transitions` table
- Daily 7am digest to OSC/CSM: "Here's what moved overnight"
- Any auto-transition can be overridden within 24h

### 5.4 Scoring Table

**Table: `lead_scores`** (exists in schema)

| Field | Type | Description |
|---|---|---|
| id | uuid PK | |
| contact_id / lead_id / prospect_id | uuid FK | Entity being scored |
| composite_score | numeric(5,2) | Overall 0-100 score |
| recency_score | numeric(5,2) | Recency component |
| engagement_score | numeric(5,2) | Engagement component |
| intent_score | numeric(5,2) | Intent component |
| budget_score | numeric(5,2) | Budget fit component |
| behavioral_score | numeric(5,2) | Web/session component |
| signals_used | jsonb | Which signals contributed to this score |
| computed_at | timestamptz | When score was last computed |

Scores are **append-only** (historical tracking) with a current score view.

---

## 6. Personalized Nurture Engine

### 6.1 Architecture

```
Mailchimp = BROADCAST (division lists, mass campaigns, stage tags)
SendGrid  = PERSONAL NURTURE (AI-generated 1:1 from CSM's email)
```

Mailchimp handles the megaphone. SendGrid handles the whisper.

### 6.2 How It Works

1. AI reads the Contact Intelligence Profile
2. AI determines the nurture goal (based on current stage + score)
3. AI generates a personalized email using profile data (future promise, interests, objections)
4. Email is sent via SendGrid **from the CSM's actual email address**
5. Email is stored in `email_drafts` table (AI-generated, CSM can review/edit before send or auto-send)
6. Recipient sees an email that reads like their CSM personally wrote it

### 6.3 Nurture Triggers

| Trigger | Action |
|---|---|
| New web form submission | AI parses intent → generates welcome email with answers to their questions |
| Score increase crosses threshold | AI generates stage-appropriate nurture email |
| No activity in X days ("going cold") | AI generates re-engagement email using personal details |
| Post-appointment | AI generates follow-up email referencing specific topics discussed |
| Lot/plan they liked becomes available | AI generates "good news" email |
| Price change on plan of interest | AI generates "heads up" email |
| New community event | AI generates personalized invitation |

### 6.4 Email Draft Table

**Table: `email_drafts`** (exists in schema)

| Field | Type | Description |
|---|---|---|
| id | uuid PK | |
| contact_id | uuid FK | Recipient |
| draft_type | text | 'nurture', 'follow_up', 'appointment_prep', 're_engagement' |
| subject | text | AI-generated subject line |
| body | text | AI-generated email body (HTML) |
| from_user_id | uuid FK | CSM who "sends" it |
| status | text | 'draft', 'approved', 'sent', 'opened', 'replied' |
| ai_model | text | Which model generated it |
| profile_snapshot | jsonb | Contact profile at time of generation |
| sent_at | timestamptz | When actually sent |
| created_at | timestamptz | When draft was created |

### 6.5 CSM Opt-In

Per PRD Decision 9.6: AI email drafts are **opt-in**. Pilot with 3-4 CSMs.
`users.ai_drafts_enabled` flag, default false.

---

## 7. Web Form AI Handler

When a web form comes in:

1. Store in `form_submissions` table
2. AI reads the form fields + any free-text questions
3. AI deciphers intent: What are they asking? What do they want?
4. AI generates a response recommendation
5. Creates an Queue record (stage = queue)
6. Routes to duty OSC
7. AI drafts a personalized response email addressing their specific questions
8. OSC reviews and sends (or auto-sends if configured)

### Example

**Form submission:** *"We're interested in a 4 bedroom with a big backyard for our dogs. Do you have anything under $600K? Also is Cardinal Grove near any good schools?"*

**AI parses:**
- Interest: 4 bedrooms, yard space, pet-friendly
- Budget: <$600K
- Community: Cardinal Grove
- Question: School quality

**AI generates response:**
> *"Hi! Great news — Cardinal Grove has several plans that would be perfect for you and your dogs. The Camden starts at $490K and the Orchid at $505K, both with 4 bedrooms. The community is in the Cape Henlopen school district, which is one of the top-rated in Sussex County. I'd love to show you some lots with larger yard space — are you free this Saturday?"*

---

## 8. Implementation Sequence

### Phase 1: Foundation (Sprint 5-6 equivalent)
1. Wire `activities` table — all channels feed unified activity stream
2. Build Contact Intelligence Profile view in CSM dashboard
3. Implement basic scoring engine (recency + engagement)
4. Add score display to prospect/lead cards

### Phase 2: AI Layer (Sprint 6)
1. AI summary generator (transcript → narrative)
2. AI buying signal extractor
3. Score computation engine with all 5 components
4. Auto-promote/demote with stage_transitions logging
5. Daily digest notification

### Phase 3: Nurture Engine (New)
1. SendGrid integration for 1:1 personalized emails
2. AI email draft generator using contact profiles
3. CSM review/approve workflow (or auto-send)
4. Trigger system (going cold, post-appointment, inventory match)
5. Web form AI handler

### Phase 4: Full Loop
1. Email open/reply tracking feeds back into scoring
2. Rilla transcript → profile enrichment pipeline
3. LogRocket session data → behavioral scoring
4. Schellie chat → intent extraction + profile updates

---

## 9. Schema Tables Involved

**Already exist in migration:**
- `activities` — unified interaction log
- `lead_scores` — scoring history
- `buying_signals` — AI-extracted signals
- `ai_summaries` — AI narrative summaries
- `email_drafts` — AI-generated email content
- `transcripts` — Rilla + Zoom recordings
- `stage_transitions` — funnel movement audit
- `webhook_events` — idempotent webhook processing
- `form_submissions` — web form data

**New / Extended:**
- `ai_contact_profiles` — unified intelligence profile per contact (or extend ai_summaries)
- `nurture_campaigns` — track which nurture sequences are active per contact
- `nurture_events` — log of nurture touches sent

---

## 10. Key Decisions (Locked)

| Decision | Status |
|---|---|
| Mailchimp = broadcast, SendGrid = personal nurture | ✅ Locked |
| AI drafts opt-in per CSM | ✅ Locked (PRD 9.6) |
| Auto stage transitions by AI score | ✅ Locked (PRD 9.9) |
| Rilla full API access confirmed | ✅ Locked (PRD 9.7) |
| 4 Mailchimp lists (per division) + tags | ✅ Locked (PRD 9.5) |
| Score = Recency + Engagement + Intent + Budget + Behavioral | ✅ New — needs Lance approval |
| SendGrid sends from CSM's email address | ✅ New — needs Lance approval |

---

## 11. The Competitive Moat

No builder has:
- Unified multi-channel intelligence profiles
- AI-generated personalized nurture (not templates)
- Algorithmic scoring that auto-routes the funnel
- Real-time signal aggregation across 9+ channels
- AI that knows your dogs' names and uses it to sell you a home

**This is the HBx platform advantage.**

---

*Document prepared by Schellie — April 16, 2026*
*For review: Lance Manlove*
*Next: Build Phase 1 once approved*
