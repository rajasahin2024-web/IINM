# Webinar Funnel — ₹499 Paid Webinar Package (India)

Issue: IIN-149 | Parent epic: IIN-145 | Engineering: IIN-147 (CTO)
Board-approved: 2026-10-01. Ticket **₹499** via Razorpay (UPI). Platform: **eWebinar** (evergreen, JIT slots) + **Chatbase** AI moderator.

## Funnel map

```
Meta ad → Landing/checkout page (₹499 Razorpay UPI)
        → payment success → eWebinar auto-registration → JIT slot
        → pre-recorded webinar (~50 min) + Chatbase AI moderator in chat
        → 48h attendee offer → telecall (<24h) → course enrollment
```

## Offer mechanics (single source of truth)

- **Ticket:** ₹499, payable via UPI/cards/netbanking on Razorpay checkout.
- **Ticket credit:** ₹499 is fully credited toward any IINM course enrollment.
- **48-hour bonus (webinar attendees only):** enroll within 48h of your session → ₹499 credit **+ ₹1,000 bonus discount** (₹1,499 total off) **+ free "AI Agent Prompt Toolkit" bonus module**.
- **Effective prices inside 48h window:**
  - Agentic Pro ₹8,999 → **₹7,500**
  - AISD ₹17,000 → **₹15,501**
  - Agentic Basic (₹8,999 headline per board note — confirm internally if Basic holds a separate price) → **₹7,500**
- **Expiry mechanic for CTO (IIN-147):** v1 = coupon code `WEBINAR1499` valid on course checkout, caller verifies attendee timestamp in eWebinar analytics before honoring; v1.5 = per-registrant expiring checkout link (`?offer_exp=<unix>` signed) generated when their session ends. Deadline anchor = **48h after their attended session ends**, fallback = 48h after registration for no-shows (replay viewers get the same deadline from replay watch).

## Course stack referenced everywhere

| Course | Price | Pitch position |
|---|---|---|
| Agentic Pro | ₹8,999 | Headline offer — working pros, serious agentic coding |
| AISD (AI Agentic Software Development) | ₹17,000 | Developers/agency — full program |
| Agentic Basic | ₹8,999* | Students/beginners — *confirm if Basic is also ₹8,999* |

## Files

| File | Deliverable |
|---|---|
| `01-webinar-script.md` | ~50-min pre-recorded webinar script (Hinglish, for Raja) |
| `02-landing-page-copy.md` | ₹499 checkout LP copy → handed to CTO on IIN-147 |
| `03-telecall-script.md` | Post-webinar caller script + objection handling |
| `04-reminder-sequence.md` | WhatsApp + email: confirmation → T-24h → T-1h → T-10min → replay nudge |
| `05-chatbase-moderator-config.md` | Chatbase knowledge base, system prompt, escalation rules |
| `06-ewebinar-setup.md` | eWebinar evergreen config, JIT schedule, chat playbook, reg sync |
| `07-dry-run-checklist.md` | End-to-end pilot checklist (₹800/day, 1 Meta segment) |

## Targets (from IIN-148 India benchmarks)

- Paid-reg CPA at ₹499 ticket: ~₹350–700 base (ticket ≈ self-funding)
- Show-up rate: **55–70%** (paid + JIT + WhatsApp reminders)
- Telecall connect: 50–65% of regs | Telecall → enroll: 8–12%
- Pilot kill/iterate trigger: CPA > ₹700 sustained 3 days, or show-up < 45%
