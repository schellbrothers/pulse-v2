# HBx Pv2 — Pipeline Rules of Engagement
**Established: 2026-03-20 | Author: Lance Manlove + Schellie 🦞**

---

## The Flow

```
Lance proposes task / feature
        ↓
Schellie drafts plan (scope, agents, approach, risks)
        ↓
Lance approves plan → "go ahead" or similar
        ↓
Schellie creates feature branch off main
  e.g. feat/mission-control-dashboard
        ↓
Agent team executes (Nemo builds, QA Parity checks, etc.)
        ↓
Schellie reviews output, runs validation
        ↓
Schellie deploys to Vercel preview (branch deploy)
        ↓
Schellie sends Lance SMS + email with preview link
        ↓
Lance reviews on Vercel preview
        ↓
  ┌─────────────────────────────────────────┐
  │ APPROVED                │ REVISIONS     │
  │ Lance says "approved"   │ Lance gives   │
  │ or similar              │ feedback      │
  └────────────┬────────────┴───────┬───────┘
               ↓                    ↓
    Schellie opens PR         Schellie revises
    (branch → main)           on same branch
               ↓                    ↓
    Lance merges OR           Loop back to
    sends {PUSH_MAIN}         Schellie review
               ↓
    Schellie merges to main
    Production deploys
```

---

## Branch Naming

| Type | Pattern | Example |
|---|---|---|
| New feature | `feat/<description>` | `feat/lead-dashboard` |
| Bug fix | `fix/<description>` | `fix/activity-timeline` |
| Schema/DB | `schema/<description>` | `schema/add-transcripts-table` |
| Agent work | `agent/<description>` | `agent/shelley-chat` |
| Chore | `chore/<description>` | `chore/update-deps` |

---

## Authorization Keys

| Key | What it authorizes |
|---|---|
| `{PUSH_MAIN}` | Schellie may merge directly to main (production deploy) |
| `{APPROVE_DDL}` | Schellie may run schema changes against production Supabase |
| `{APPROVE_DEPLOY}` | Schellie may trigger a manual production deployment |

Keys are case-sensitive and must appear exactly as shown. No key = no action.

---

## What Schellie Never Does Without Authorization

- Push directly to `main`
- Merge a PR without Lance approval or `{PUSH_MAIN}`
- Run DDL against production Supabase without `{APPROVE_DDL}`
- Send emails or SMS to real buyers
- Access Pv1 codebase or database without explicit per-session authorization

---

## Agent Roles in Pipeline

| Agent | Pipeline Role |
|---|---|
| **Schellie** | Plan, orchestrate, review, deploy, notify Lance |
| **Nemo** | Build — code generation, DB ops, file processing |
| **QA Parity** | Test — compare expected vs actual, regression checks |
| **Code Builder** | Generate — services, APIs, UI components |
| **Schema Migration** | DDL — schema changes, migrations |

---

## Notification on Completion

When a build is ready for Lance's review, Schellie will send:

**SMS (Twilio):** Short summary + Vercel preview URL
**Email (SendGrid):** Full summary — what was built, what to test, known issues, preview link

Format:
```
Subject: [Pv2] Ready for review — {feature name}

Branch: feat/...
Preview: https://pulse-v2-xxxxx-heartbeat-v2.vercel.app

What's in it:
- [bullet list of what was built]

What to test:
- [specific things to click/verify]

Known issues / notes:
- [anything Lance should know]

To approve: reply "approved" or send {PUSH_MAIN} to merge.
To request changes: just reply with feedback.
```

---

## Current Issue: First Push Was Direct to Main

The Mission Control dashboard was pushed directly to `main` as a bootstrap — this is a one-time exception to get the repo initialized. All future work follows this protocol.

---

*This document lives in the repo at `docs/PIPELINE.md` and in the workspace at `HBx/PIPELINE.md`.*
*Update it when the protocol evolves.*
