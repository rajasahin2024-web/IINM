# 06 — eWebinar Setup Spec (Evergreen + JIT)

**Plan:** eWebinar Level 1 — $99/mo, 1 active webinar, 1,000 registrants/mo (pilot projects ~60–150/mo).
**Goal:** Meta ad → pay ₹499 → *instantly* land in a session that "starts soon" — that's the whole JIT (just-in-time) trick: nobody waits days for a webinar they just paid for.

## Schedule config

**Mode:** Just-in-time + recurring schedule hybrid.

- **JIT:** "Next session starts in ≤15 min" — attendee arriving post-payment always sees a near-term start. Configure sessions every **30 min** during open hours.
- **Open hours (IST, India-optimized):**
  - Weekdays: 12:00–14:00 and 18:00–22:30 (lunch + evening prime — Meta India traffic peaks post-7pm)
  - Weekends: 10:00–22:30 (longer — weekend watch time is higher)
  - Outside open hours: page shows "next session tomorrow {time}" — registration still allowed, replay-friendly.
- **Timezone:** Asia/Kolkata fixed (never auto-detect — Indian audience only).
- **Per-session seat display cap:** 25 (honest config — keeps chat manageable for the AI moderator and supports "limited seats" LP copy; it's our real per-slot setting, not a fake counter).

## Registration sync (payment → auto-registration)

Coordination point with CTO (IIN-147):

1. Razorpay webhook `payment.captured` → backend creates eWebinar registration via eWebinar API (or Zapier/Make bridge if API scope is easier).
2. Fields passed: name, email, phone, `utm_*` params, razorpay_payment_id.
3. eWebinar returns join URL for next JIT slot → redirect user + inject `{join_link}` into M1 confirmation messages.
4. **Caller sheet:** eWebinar registrant + attendance analytics → Google Sheet nightly (or webhook live): `name, phone, email, registered_at, attended, watch_pct, chat_msgs, poll_answer, callme_flag, offer_deadline, utm_*`. This is the telecaller's queue.
5. Replay rule: no-show → auto-enrolled in next-day replay availability + M5 nudge.

## Chat playbook

| Timestamp | Type | Content |
|---|---|---|
| 0:45 | Seeded | "Questions? Type below — our AI assistant answers live 👇" |
| 1:50 | **Poll** | "What's your background?" → Working developer / Student / Non-tech want AI income / Freelancer *(segmentation feeds caller sheet)* |
| 8:30 | Seeded | "Demo starting 👀 drop a 🔥 if you're watching" |
| 31:30 | Seeded | "Most people say self-fixing errors blew their mind — what about you?" |
| 38:30 | **Offer pop-up** | "Webinar Attendee Offer — ₹499 credit + ₹1,000 extra off + Prompt Toolkit. 48h only." Button → enroll/checkout URL |
| 42:30 | **CTA widget** | Persistent "Enroll Now — 48h Offer" button (bottom-right) till end |
| 47:30 | Seeded | "Type CALL ME if you'd rather talk to our team directly 📞" |

- **Live attendee messages** → routed to Chatbase via eWebinar Chatbot API (config in `05`).
- **Notifications:** enable eWebinar chat notification email → ops address, so a human can jump in during pilot week.

## Analytics we need (verify eWebinar exposes these on Level 1)

- Per-registrant: attended Y/N, watch duration/%, chat messages, poll answer, CTA clicks
- Aggregate: show-up rate per slot, drop-off curve (find where people leave → tighten script later)
- Export: CSV/API for caller sheet

*If watch-% per user isn't on L1, upgrade decision goes to CEO — it's the single most valuable telecall input.*

## Pre-launch config checklist

- [ ] Webinar created, video uploaded, interactions programmed per `01` timestamps
- [ ] JIT schedule set per open-hours table above; timezone IST
- [ ] Chatbot API connected → Chatbase bot live (test 10 questions incl. Hinglish + "is this live?")
- [ ] Registration webhook tested end-to-end with a ₹499 test payment
- [ ] Reminder emails enabled in eWebinar + our WhatsApp layer active (04)
- [ ] Caller sheet receiving rows
- [ ] One full attended session dry-run by CMO+CTO (see `07`)
