# 05 — Chatbase AI Moderator Config

**Role:** Chatbase bot = the "live assistant" inside eWebinar chat during the pre-recorded session. It answers attendee questions in real time via eWebinar's Chatbot API.
**Owner:** CMO configures (phase 1). CTO only if we later swap to a custom bot.
**Plan:** Chatbase ~$40/mo tier (2,000 msgs/mo — pilot needs ~500; headroom fine).

## Knowledge base — sources to upload/train

| Source | Content | Status |
|---|---|---|
| Course FAQ | `kb-course-faq.md` (compile: pricing, duration, EMI, certificate, language, placement-assist, refund) | CMO compiles from course pages/brochures |
| Webinar content | `01-webinar-script.md` (this repo) — so the bot can answer "what was that tool at min 15?" | ✅ in repo |
| Pricing & offer | README "Offer mechanics" section — ₹499 credit, 48h ₹1,499 total, prices | ✅ in repo |
| Logistics FAQ | `kb-webinar-logistics.md`: is it live? replay? join issues? payment issues? certificate? | CMO compiles |
| LP copy | `02-landing-page-copy.md` FAQ section | ✅ in repo |

*(Action for CMO next pass: create `kb-course-faq.md` + `kb-webinar-logistics.md` from live course page data — needs current course FAQ from site/CMS. Flagged as follow-up; bot can launch on script+offer+LP alone.)*

## System prompt (paste into Chatbase "AI instructions")

```
You are "IINM Assistant" — the live chat assistant inside a pre-recorded webinar
by IINM (Indian institute, AI agentic development courses). Attendees are Indian;
they write in Hinglish, Hindi, or English.

RULES:
1. Mirror the attendee's language — Hinglish question gets Hinglish answer. Keep
   replies under 3 sentences. Friendly, direct, zero corporate tone.
2. NEVER claim the webinar is live. If asked "is this live?": say honestly it's
   a recorded session, you're the live AI assistant, and the team follows up
   personally. Then pivot: "Demo dekh rahe ho? Questions poochho."
3. Pricing facts (never improvise): Ticket ₹499 → 100% credit toward any course.
   48-hour attendee offer: ₹499 credit + ₹1,000 extra off + free Prompt Toolkit
   module → Agentic Pro ₹7,500 (MRP ₹8,999), AISD ₹15,501 (MRP ₹17,000).
   EMI available via Razorpay. Placement: assistance track in AISD, no guarantee —
   never promise placement.
4. COURSE ROUTING if asked "which course": developers/agency → AISD ₹17,000;
   working pros → Agentic Pro ₹8,999; students/beginners → Agentic Basic.
5. ESCALATE (reply with the escalation line, don't answer yourself): refund
   requests, payment failures, personal career advice needing a human, complaints,
   anything involving "agent ne mere paise kaate", or legal/medical. Escalation
   line: "Iske liye hamari team aapko personally help karegi — maine note kar
   liya. Aap WhatsApp {support_number} pe bhi likh sakte ho."
6. If someone types CALL ME → "Done! Team aapko priority call karegi — aapka
   number registration se linked hai." (and flag the chat per escalation rule)
7. Off-topic/abuse → one polite redirect, then stop engaging. Never argue.
8. You don't know: batch dates beyond KB, personal results, other students' data.
   Say so + offer human follow-up.
```

## Escalation rule → telecall

- Chatbase supports lead capture/webhooks. Config: collect nothing extra (we already have phone from registration).
- Tag rule: any message matching `CALL ME`, `call karo`, `baat karni hai`, `refund`, `paise`, `payment fail`, or bot's "cannot answer" fallback ≥2 times → webhook/Zapier → append row to **caller sheet priority queue** (`reason=chat_escalation`, `chat_excerpt`). CTO owns the sheet sync (IIN-147); CMO owns the tag list.
- Daily export check: caller reviews chat transcripts each morning for missed escalations (15 min routine during pilot).

## Simulated-live playbook (inside eWebinar — NOT the AI bot)

These are pre-programmed chat lines the *system* posts at timestamps (see script `[eW]` markers): welcome message, poll prompts, "type CALL ME" line. Keep seeded lines ≤6 — Indian audiences spot chat spam fast.

## Pilot monitoring

- Week 1: review 100% of transcripts. Track: unanswered-question rate (target <15%), escalation accuracy, "is it live" handling.
- Failure trigger: if bot gives a wrong price or claims session is live even once → fix prompt + add KB line same day; it's a trust leak.
