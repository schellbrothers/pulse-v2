# PRD: Mobile Command Center — OSC + CSM

**Version:** 1.0  
**Date:** 2026-04-18  
**Author:** Schellie (AI Architect)  
**Status:** Draft for Review  

---

## 1. Problem Statement

OSCs and CSMs are not desk-bound workers. OSCs juggle phone calls throughout the day and need to route queue items between conversations. CSMs are at model homes, community events, and on the road meeting prospects. Both roles need full command center functionality from their phone — managing the queue, responding to communications, and making routing decisions in real time.

The current desktop dashboard (50/50 split layout) is not usable on mobile. We need a purpose-built mobile experience that makes the most critical actions effortless on a 6" screen.

---

## 2. Design Philosophy

### Phone-First Principles
1. **One-handed operation** — all primary actions reachable by right thumb
2. **Minimal typing** — AI pre-fills everything, user just confirms
3. **Glanceable** — see the most important number (queue count, unread count) in < 1 second
4. **Interrupt-friendly** — OSC gets a call, puts phone down, picks up later, no lost state
5. **Speed over features** — mobile does 80% of the work, desktop does 100%

### What Mobile MUST Do
- View and work the queue (assign items to lanes)
- View and respond to communications (email, text, phone)
- See key metrics (queue count, unread count)
- Receive push notifications for new items

### What Mobile DOES NOT Need
- Reference module (plans, lots, amenities) — nice to have but not critical
- Sales goal strip — desktop view
- Pipeline drill-down (timeline/card/list views) — desktop view
- Team member filter — mobile is personal, shows your items by default
- Edit contact details — desktop task

---

## 3. Technical Approach

### Option A: Responsive Web (Recommended for Phase 1)
- Same Next.js app, responsive breakpoints
- No app store deployment needed
- Add to Home Screen (PWA) for app-like experience
- Push notifications via Web Push API
- **Pros:** Fastest to build, single codebase, instant updates
- **Cons:** Slightly less native feel, web push less reliable than native push

### Option B: Native App (Phase 2 if needed)
- React Native or Expo wrapping the same API
- True native push notifications
- Better offline support
- **Pros:** Native performance, reliable notifications
- **Cons:** Separate codebase, app store approval, longer build

### Recommendation
**Phase 1: Responsive PWA** — build mobile layouts into the existing app with a responsive wrapper. If the team needs more native features (offline, reliable push), build Phase 2.

---

## 4. Mobile Layout — OSC

### Bottom Navigation Bar (fixed, always visible)
```
┌────────────────────────────────────────────┐
│  [Queue (12)]    [Comm Hub (5)]    [More]  │
└────────────────────────────────────────────┘
```
- Queue shows pending count (red badge when > 0)
- Comm Hub shows unread count
- More: Reference, Settings, Profile

### Screen 1: Queue (default)

#### Header (compact)
```
┌────────────────────────────────────────────┐
│  Queue                    12 pending       │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐     │
│  │New(8)│ │Re(2) │ │Dem(1)│ │AI(1) │     │
│  └──────┘ └──────┘ └──────┘ └──────┘     │
└────────────────────────────────────────────┘
```
Sub-bucket pills (horizontal scroll if needed)

#### Queue Cards (scrollable list)
Each card is a full-width card:
```
┌────────────────────────────────────────────┐
│  Glenn Bouthillette              📞 💬 📧  │
│  Delaware Beaches · Monarch                │
│  schedule_visit · Apr 17, 12:11 PM         │
│                                            │
│  AI: "Assign → Lead (Community) → Monarch" │
│                                            │
│  ┌─────────────┐  ┌───┐                   │
│  │  → Assign   │  │ ⋯ │                   │
│  └─────────────┘  └───┘                   │
└────────────────────────────────────────────┘
```

- **Tap name** → opens detail panel (slides up from bottom as a sheet)
- **Tap → Assign** → one-tap quick assign with AI suggestion (toast confirmation)
- **Tap ⋯** → full assign picker (bottom sheet with lane options)
- **Tap 📞** → initiates call
- **Tap 💬** → initiates SMS
- **Tap 📧** → opens email compose

#### Quick Assign Flow (mobile optimized)
1. User sees card with AI suggestion: "Assign → Lead (Community) → Monarch"
2. Taps → Assign
3. Toast: "✓ Glenn assigned to Lead (Community) at Monarch"
4. Card slides out, next card slides up
5. Done. No modal, no dropdown, no extra taps.

#### Custom Assign (⋯ button)
Bottom sheet slides up with lane options:
```
┌────────────────────────────────────────────┐
│  Assign Glenn Bouthillette                 │
│                                            │
│  ○ Lead (Division)                         │
│  ● Lead (Community)  [Monarch ▾]           │
│  ○ Prospect C        [Select community ▾]  │
│  ○ Prospect B                              │
│  ○ Prospect A                              │
│  ○ Archive                                 │
│  ○ Delete                                  │
│                                            │
│  [         Confirm Assign         ]        │
└────────────────────────────────────────────┘
```

### Screen 2: Comm Hub

#### Header
```
┌────────────────────────────────────────────┐
│  Comm Hub                   5 unread       │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐     │
│  │Urg(1)│ │NR(3) │ │📧(4) │ │📞(2) │     │
│  └──────┘ └──────┘ └──────┘ └──────┘     │
└────────────────────────────────────────────┘
```

#### Communication Cards
```
┌────────────────────────────────────────────┐
│  📧 ← Email                  NEEDS RESPONSE│
│  Karen Miller               Apr 17, 5:22PM │
│  "What are the HOA fees for Cardinal..."    │
│                                            │
│  AI Reply:                                 │
│  "Hi Karen! The HOA fees at Cardinal Grove │
│   are $206/month..."                       │
│                                            │
│  ┌─────────┐  ┌──────┐  ┌────┐            │
│  │ → Send  │  │ Edit │  │ ✓  │            │
│  └─────────┘  └──────┘  └────┘            │
└────────────────────────────────────────────┘
```

- **→ Send** — sends the AI reply immediately
- **Edit** — opens reply editor (expandable textarea)
- **✓** — mark as read (no response needed)

#### Reply Editor (bottom sheet)
```
┌────────────────────────────────────────────┐
│  Reply to Karen Miller         [📧 Email ▾]│
│                                            │
│  ┌────────────────────────────────────┐    │
│  │ Hi Karen! The HOA fees at Cardinal │    │
│  │ Grove are $206/month. This covers  │    │
│  │ community maintenance and...       │    │
│  │                                    │    │
│  └────────────────────────────────────┘    │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │           Send Reply            ↑   │  │
│  └──────────────────────────────────────┘  │
└────────────────────────────────────────────┘
```

### Screen 3: Detail Panel (bottom sheet)
When tapping a name, a bottom sheet slides up (3/4 height) showing:
- Contact info (name, email, phone with action icons)
- Stage badge
- History timeline (compact)
- Activity feed (compact)
- Notes (add note button)

---

## 5. Mobile Layout — CSM

### Bottom Navigation
```
┌────────────────────────────────────────────┐
│  [Pipeline (25)]  [Comm Hub (3)]  [More]   │
└────────────────────────────────────────────┘
```

### Screen 1: Pipeline (Prospect Queue)
Same card pattern as OSC but with:
- Sub-buckets: New from OSC | Stale | AI Hot | Follow-up Due
- Actions: **↑ Promote** (C→B→A→Homeowner) and **↓ Demote** (back to Queue)
- Each card shows prospect name, stage badge (A/B/C), community, last activity

#### Quick Promote Flow
1. Card shows: "Patricia Chen · Prospect C · Cardinal Grove"
2. Tap ↑ Promote
3. Toast: "✓ Patricia promoted to Prospect B"
4. Card updates in place (or moves to new bucket)

### Screen 2: Comm Hub
Same as OSC Comm Hub — AI replies, send, mark read.

---

## 6. Push Notifications

### Events That Trigger Push
| Event | Notification | Priority |
|---|---|---|
| New queue item (web form) | "New: Glenn Bouthillette — schedule_visit" | Normal |
| Queue item > 15 min unassigned | "⚠ Glenn still in queue (15m)" | High |
| Urgent comm (missed call) | "📞 Missed call from Karen Miller" | High |
| Needs Response > 30 min | "📧 Karen waiting for reply (30m)" | High |
| New prospect promoted to your community | "New prospect: Patricia Chen → Cardinal Grove" | Normal |
| Prospect stale > 30 days | "⚠ Patricia Chen — no contact in 32 days" | Normal |

### Implementation
- **Phase 1:** Web Push API (service worker)
- **Phase 2:** Native push via Firebase Cloud Messaging (if PWA push isn't reliable enough)

---

## 7. Responsive Breakpoints

```css
/* Desktop: full 50/50 split layout */
@media (min-width: 1024px) { /* current layout */ }

/* Tablet: stacked layout, full-width panels */
@media (min-width: 768px) and (max-width: 1023px) {
  /* Queue and Comm Hub as tabs, not side-by-side */
  /* Cards slightly narrower */
}

/* Mobile: single column, bottom nav */
@media (max-width: 767px) {
  /* Bottom nav bar */
  /* Full-width cards */
  /* Bottom sheets instead of side panels */
  /* Larger touch targets (min 44px) */
  /* No hover states — all tap */
}
```

---

## 8. Key UX Patterns for Mobile

### Bottom Sheets (instead of side panels)
- Slide up from bottom on tap
- 3 stops: peek (30%), half (50%), full (90%)
- Swipe down to dismiss
- Used for: detail panel, custom assign, reply editor

### Toast Confirmations (instead of modals)
- "✓ Assigned to Lead (Community)" — auto-dismiss after 3s
- "✓ Reply sent to Karen" — auto-dismiss
- "↩ Undo" link on toasts for accidental actions

### Swipe Actions (optional enhancement)
- Swipe right on queue card → quick assign (green)
- Swipe left on queue card → custom assign (blue)
- Swipe right on comm item → mark read
- Swipe left on comm item → reply

### Pull to Refresh
- Pull down on any list → refresh from server
- Supplement to Realtime (which may not work reliably on mobile browsers)

---

## 9. Implementation Phases

### Phase 1: Responsive Queue + Comm Hub (1-2 weeks)
1. Add responsive CSS breakpoints to existing components
2. Create mobile bottom navigation component
3. Create mobile card layouts (full-width, larger touch targets)
4. Create bottom sheet component (for detail panel + assign picker)
5. Toast notification component
6. Mobile-optimized assign flow (one-tap + bottom sheet fallback)
7. Mobile-optimized comm hub (AI reply + send)
8. Test on iPhone + Android Chrome

### Phase 2: PWA + Push Notifications (1 week)
1. Service worker registration
2. Web Push API integration
3. Notification permission flow
4. Add to Home Screen manifest
5. Offline indicator (show cached data)

### Phase 3: Native App (if needed) (2-3 weeks)
1. React Native or Expo wrapper
2. Native push notifications
3. Biometric auth (Face ID / fingerprint)
4. Offline queue management (sync when back online)

---

## 10. Success Metrics

| Metric | Target |
|---|---|
| Queue items assigned per hour (mobile) | Same as desktop |
| Avg time to assign a queue item | < 5 seconds (one-tap) |
| Avg time to respond to communication | < 60 seconds |
| Queue > 0 for more than 30 min | < 5% of time |
| Comm Hub unread > 0 for more than 15 min | < 10% of time |
| Mobile usage adoption | > 50% of OSC/CSM actions from mobile within 30 days |

---

## 11. Technical Requirements

### Performance
- Page load < 2 seconds on 4G
- Time to interactive < 3 seconds
- Card render < 100ms
- Assign action < 500ms round-trip

### Accessibility
- Touch targets minimum 44x44px
- Contrast ratio 4.5:1 minimum
- Screen reader compatible
- No gesture-only actions (always have a tap alternative)

### Browser Support
- Safari iOS 15+ (iPhone)
- Chrome Android 100+
- Tablet: Safari iPadOS, Chrome

---

*Document prepared by Schellie — April 18, 2026*  
*For review: Lance Manlove*
