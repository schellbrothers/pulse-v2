# HBx Pv2 BUILD DIRECTIVE — AGENT-FIRST HYBRID ARCHITECTURE

**Status:** GOVERNING DIRECTIVE — All build decisions must align with this document  
**Date:** 2026-04-20  
**Author:** Lance Manlove  

---

## Context

We are building Pulse v2 (Pv2) as part of the HBx AI Operating System.

Pv2 is NOT a traditional CRM.  
Pv2 is a hybrid human + agent operating environment that must:
- Work today with human operators (OSC, CSM, Marketing)
- Transition seamlessly to agent-driven execution in Pv3
- Require ZERO architectural rewrites to achieve Pv3

This means Pv2 must be built as a future autonomous system with a current human approval layer.

---

## Core Principle (Non-Negotiable)

**Every human action in Pv2 must be representable as an agent action.**

If a human can do it, an agent must be able to do it using the same pathway.

---

## System Architecture Requirements

### 1. MCP as the Single Execution Layer

ALL system actions must be executed via MCP tools.
- UI does NOT contain business logic
- UI does NOT directly manipulate the database
- UI ONLY calls MCP tools
- Agents ALSO call the same MCP tools

Examples:
- `assign_lead()`
- `promote_prospect()`
- `send_message()`
- `schedule_appointment()`

There must be ZERO execution paths outside MCP.

---

### 2. Decision Layer (Agent-First Thinking)

All workflows must be structured as:

**Decision → Recommendation → Execution**

Implementation:
- Agents generate decisions (even if not yet visible)
- UI surfaces recommendations
- Humans approve or override (Pv2)
- MCP executes

In Pv3:
→ Human approval layer is removed

---

### 3. Shadow Mode Agents (MANDATORY)

All core workflows must have agents running in parallel in shadow mode.

Shadow agents:
- Evaluate inputs
- Generate recommendations
- Assign confidence scores
- Provide reasoning

BUT:
→ Do NOT execute actions yet

This allows us to:
- Validate agent performance
- Build trust
- Collect decision data
- Transition safely to Pv3

---

### 4. Action Metadata + Attribution

Every action in the system must log:
- `action_type`
- `triggered_by` (human | agent)
- `agent_name` (if applicable)
- `confidence_score`
- `reasoning` (short, human-readable)
- `timestamp`

This is REQUIRED for:
- auditability
- learning
- future automation

---

### 5. UI = Visibility + Approval Layer Only

The UI must NOT be the source of logic.

The UI should:
- Display system state
- Display agent recommendations
- Allow human approval or override
- Show agent reasoning and confidence

The UI should NOT:
- Contain workflow logic
- Make hidden decisions
- Execute actions directly

---

### 6. System Modes (Design Now)

The system must support 3 modes:

1. **Manual Mode** (Pv1 behavior)
   - Human decides and executes

2. **Assisted Mode** (Pv2 — current target)
   - Agent recommends
   - Human approves

3. **Auto Mode** (Pv3)
   - Agent recommends AND executes
   - Human supervises

Mode switching must NOT require architectural changes.

---

### 7. No Temporary Logic

Do NOT build "temporary" workflows for Pv2.

If something is:
- hardcoded
- UI-driven only
- not exposed as an MCP tool

→ It will become technical debt and block Pv3

All logic must be:
- reusable
- callable
- agent-accessible

---

## UX Guidelines (Critical)

All user-facing actions should evolve from:

❌ "Assign to Prospect C"

To:

✅ "Recommended: Promote to Prospect C (92%)"
- Reason: High engagement + visit intent
- [Approve] [Override]

---

## System Intent

We are NOT building software for humans to operate.

We ARE building:

**A system where agents operate the business and humans supervise.**

Pv2 is the training and validation layer for that system.

---

## Success Criteria

- [ ] Every UI action calls an MCP tool (no direct DB writes from UI)
- [ ] Every MCP tool is callable by both human UI and agent
- [ ] Shadow agents run on all core workflows
- [ ] Every action logs triggered_by, confidence_score, reasoning
- [ ] System supports Manual/Assisted/Auto mode switching
- [ ] Zero temporary/hardcoded logic that blocks Pv3
- [ ] Agent recommendations visible on every decision point
