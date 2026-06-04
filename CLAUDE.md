# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Pulse v2 (Pv2) is an AI-powered pre-sale platform for Schell Brothers (homebuilder), the first product built on the broader "HBx AI Factory" platform. It manages the lead → prospect → buyer lifecycle for sales staff (OSC = online sales counselors, CSM = community sales managers, DSM, Marketing).

## Commands

All commands run from the repo root (npm workspaces). The only deployable app is `apps/web`.

```bash
npm install            # install all workspace deps
npm run dev            # next dev (apps/web)
npm run build          # next build (apps/web)
npm run lint           # next lint (apps/web)
```

There is **no test suite** in this repo. Don't claim tests pass — there are none to run. Verify changes via `npm run build` and `npm run lint`, and by exercising the running app.

Deployment is automatic: pushing to `main` deploys to production on Vercel. Branch pushes create Vercel preview deploys. `apps/web/vercel.json` registers a cron hitting `/api/sync/webforms` every 5 minutes.

## Stack

- **Next.js 15** (App Router) + **React 19**, TypeScript, Tailwind CSS 3. Path alias `@/*` → `apps/web/src/*`.
- **Supabase Postgres** as the data layer. No ORM — queries use `@supabase/supabase-js` directly.
- **Local LLM inference** via Ollama (the Schellie chatbot in `/api/chat` calls an Ollama host on the LAN, model `llama3.1:8b`). Architecturally this routes through an `inference.local` abstraction targeting Nemotron on a DGX Spark; Claude is a policy-gated escalation only.
- **MCP server** (`pv2-mcp`, deployed separately) reached via `/api/mcp-proxy` — currently read-only tools for the chatbot (search_communities, get_floor_plans, etc.).

## The governing directive — agent-first architecture

`docs/DIRECTIVE-agent-first-architecture.md` is the **governing document**; read it before designing anything substantial. The core rule:

> **Every human action must be representable as an agent action.** If a human can do it, an agent must do it via the same pathway.

Consequences that shape the code:
- The UI is a **visibility + approval layer**, not the source of business logic. UI should not hold workflow logic or write to the DB directly.
- Every action flows **Decision → Recommendation → Execution** and logs attribution: `triggered_by` (human|agent), `agent_name`, `confidence_score`, `reasoning`, `timestamp`.
- The system is designed for three modes — Manual / Assisted (current target) / Auto — switchable by config, not by rewrite.

`docs/AUDIT-directive-compliance.md` is the honest assessment of how far the code is from that ideal (much of the UI still writes to Supabase directly, shadow agents and most attribution are not yet built). When touching action-executing code, move it **toward** the directive — route through the action layer below rather than adding new direct-from-component DB writes.

## The CRM action layer (the directive in practice)

The intended single execution pathway is implemented in `apps/web/src/app/api/crm/route.ts` with the client wrapper `apps/web/src/lib/crm-api.ts`:

```
UI component / Agent  →  lib/crm-api.ts  →  POST /api/crm  →  Supabase (service role)
```

- `POST /api/crm` takes `{ action, params, context }`. `action` is a key into a `TOOLS` registry (e.g. `assign_opportunity`, `promote_opportunity`, `send_email`, `send_sms`, `generate_response`, `update_contact`, `mark_read`, `evaluate_queue_item`). Adding a CRM capability = add a handler + register it in `TOOLS`.
- `context` carries the attribution fields and defaults `triggered_by` to `"human"`. Every handler calls `logAction(...)` into the `action_log` table.
- This route uses the **service role key** (bypasses RLS) and runs `dynamic = "force-dynamic"`. Prefer this for mutations over ad-hoc direct Supabase writes from components.

Note: many existing components still call Supabase directly for mutations — that's the known gap, not the target pattern.

## App structure

- `apps/web/src/app/` — App Router. Top-level route folders are the product surfaces (`leads`, `prospects`, `lots`, `communities`, `tasks`, `queue`, `csm-queue`, `violations`, `settings`, `tools`, etc.). Convention: a thin server `page.tsx` renders a client `*Client.tsx` component that does its own data fetching against the global division filter.
- `apps/web/src/app/workspace/{osc,csm,marketing,dsm}/` — the role-specific operator workspaces (the heart of the app). Each has a `page.tsx` + `*Client.tsx` (+ dashboards like `CommunityDashboard.tsx`).
- `apps/web/src/app/api/` — route handlers: the `crm` action layer; integration webhooks (`webhooks/sendgrid`, `webhooks/zoom`); `sync/webforms` (cron); `chat`/`test-chat` (Ollama); `mcp-proxy`; plus `sla`, `tasks`, `meetings`, `users`, `docs`, `activity`, `track`, `token-sync`.
- `apps/web/src/components/` — shared UI. Layout shell (`Sidebar`, `GlobalFilterBar`, `MobileNav`, `ChatWidget`, `Toast`) is wired in `app/layout.tsx`. Reusable primitives: `DataTable`, `DetailPanel`, `SlideOver`, `BottomSheet`, `PageShell`. Domain panels: `CommHub`, `OpportunityPanel`, `PipelineDetailView`, `OpportunitySearch` (⌘K global search).
- `apps/web/src/context/GlobalFilterProvider.tsx` — app-wide **division filter**; most pages scope their data to the selected division.
- `apps/web/src/lib/` — `supabase.ts` (browser client, publishable key), `crm-api.ts`, `contact-matcher.ts`, `email-validator.ts`, `crm-api.ts`, `activity-styles.ts`.

## Data model

Schema lives in `supabase/migrations/` (sequential `NNN_*.sql`, additive `create table if not exists` / `alter table`). There is no separate `packages/` directory despite the README — schema and types live under `supabase/` and `apps/web/src`.

Key domain tables: `orgs`, `divisions`, `users`, `communities`, `floor_plans`, `lots`/`home_sites`, `contacts`/`contact_members`, `leads`, `prospects`, `opportunities` + `stage_transitions` (the pipeline), `activities` (the unified timeline for all channels), `tasks`. AI/agent tables: `ai_summaries`, `lead_scores`, `buying_signals`, `transcripts`, `opportunity_profiles`, `agent_run_logs`, `action_log`, `response_templates`, `system_config`. Integrations: `form_submissions`, `integration_credentials`, `webhook_events`, `sms_log`, `email_drafts`, `notifications`.

`org_id` scoping is pervasive (RLS-based multi-tenancy by division; external builder partners get separate Supabase projects). A hardcoded default `ORG_ID = "00000000-0000-0000-0000-000000000001"` appears in server routes.

## Integrations (channel ownership matters)

Per `docs/integrations.md`, the three email channels are deliberately distinct — don't conflate them:
- **Mailchimp** = mass marketing broadcasts.
- **SendGrid** = system transactional (confirmations, reminders).
- **Outlook / Microsoft Graph** = 1:1 AI-generated nurture from the OSC's own inbox.

SMS: **Twilio** = system-initiated automated messages; **Zoom SMS** = OSC manual/conversational. All inbound channel events normalize into the `activities` table; **Rilla**/Zoom transcripts feed the AI intelligence layer (`transcripts` + pgvector).

## Working conventions

- **Branching & authorization** (`docs/PIPELINE.md`): branch off `main` as `feat/`, `fix/`, `schema/`, `agent/`, `chore/`. Never push directly to `main`, merge a PR, or run DDL against production Supabase without the explicit authorization keys (`{PUSH_MAIN}`, `{APPROVE_DDL}`, `{APPROVE_DEPLOY}`). Never send email/SMS to real buyers without authorization.
- Several server routes hardcode Supabase URL/keys and the Ollama host as fallback defaults. Mutating routes need `SUPABASE_SERVICE_ROLE_KEY`; the browser client uses `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
