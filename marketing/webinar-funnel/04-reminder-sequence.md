# 04 — Reminder Sequence (WhatsApp + Email)

**Goal:** show-up rate **55–70%** (paid + JIT benchmark). Every message has one job: get them into the room.
**Channels:** WhatsApp (primary — India opens WhatsApp, not email) + Email (backup/record).
**Send timing anchored to their JIT slot** (`{slot_time}` = their session start). eWebinar handles its own reminder emails too — we add WhatsApp + tighter copy; keep eWebinar emails ON as redundancy.
**Sender:** IINM WhatsApp Business number. Keep messages <300 chars where possible; 1 link max.

Personalization tokens: `{name}`, `{slot_time}`, `{join_link}`, `{deadline_48h}`.

---

## M1 — Instant confirmation (payment success → +0 min)

**WhatsApp:**
> ✅ *Seat Confirmed, {name}!*
> Aapka ₹499 ka webinar seat book ho gaya 🎉
> 📺 *AI Agent Se Real Software Kaise Banta Hai* — Raja Sain
> 🕐 Aapka session: *{slot_time}* (starts soon!)
> ▶️ Join link: {join_link}
>
> Bonus: aapka ₹499 course enrollment pe 100% credit banega. Session end tak dekhna — attendee offer wahi unlock hota hai.

**Email:**
- Subject: `✅ Seat confirmed — {slot_time} pe join karo (₹499 credit details inside)`
- Body: same content + join button + "add to calendar" link + host line "— Raja Sain, IINM"

## M2 — T-24h (for next-day slots only; skip if slot is <24h away — most JIT regs are same-hour)

**WhatsApp:**
> {name}, kal aapka webinar hai 📺
> *AI Agents Se Software Banana* — {slot_time}
> Ek kaam karo: join link save kar lo 👉 {join_link}
> Aur ek question ready rakho — chat mein AI assistant live answer karega.

**Email:** Subject `Kal {slot_time} — aapka AI webinar (link inside)` — same body.

## M3 — T-1h

**WhatsApp:**
> ⏰ 1 ghanta — {name}, aapka session {slot_time} pe hai
> Headphone + chai ready? ☕
> ▶️ {join_link}
> Pro tip: end tak ruko — 48-hour attendee offer wahi reveal hota hai.

**Email:** Subject `1 hour to go — join link inside` — body = 2 lines + button.

## M4 — T-10min

**WhatsApp:**
> 🔴 *10 minute!* Aapka session almost start — seat reserve hai
> ▶️ Abhi join karo: {join_link}
> (Late ho gaye? Link pe click karo — next session auto-assign ho jaayega)

**Email:** Subject `Starting in 10 min 🔴` — single button.

## M5 — Missed webinar / replay nudge (no-show detected → +30 min after their slot)

**WhatsApp:**
> {name}, aapka session miss ho gaya — koi baat nahi 🙂
> Aapka ₹499 active hai — replay yahan hai: {join_link}
> ⏳ Aapka 48-hour offer replay dekhne ke baad bhi milega — but timer {deadline_48h} ko khatam.
> Kal hamari team ek quick call karegi — koi question ho toh reply karo.

**Email:** Subject `Missed it? Your ₹499 seat is still valid — replay inside` — replay link + deadline + "questions? reply to this email".

## M6 — Post-attendance thank-you (attended → +1h)

**WhatsApp:**
> {name}, thanks for attending 🙌
> Aapka attendee offer active hai:
> 🎁 ₹499 credit + ₹1,000 extra off + Prompt Toolkit — sirf 48h ({deadline_48h} tak)
> Enroll: {enroll_link}
> Questions? Reply karo — ya kal call pe baat karte hain.

**Email:** Subject `Your 48-hour offer is live (₹1,499 total off)` — offer card + enroll button + deadline.

---

## Sequence rules

- **Suppression:** once enrolled in a course → stop all funnel messages, move to onboarding sequence. Once telecall marks `not_interested` → stop marketing nudges.
- **Frequency cap:** max 2 messages/day across WhatsApp+email combined.
- **No-show loop:** max 2 replay nudges (M5 + one at 48h), then hand to monthly re-invite list — don't spam paid users.
- **Opt-out:** WhatsApp "STOP" → suppress. Honor fast — a blocked WhatsApp number kills the whole funnel.
- **Template approval:** WhatsApp Business API needs these as approved templates (utility/marketing category) — submit day 1; keep SMS fallback text identical minus emojis if approval lags.
