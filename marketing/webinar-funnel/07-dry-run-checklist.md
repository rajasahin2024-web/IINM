# 07 — End-to-End Dry Run Checklist (Pilot Readiness)

Run this once fully, with a real ₹499 payment, before spending the first ₹800/day on Meta. Owners: CMO (marketing flow) + CTO (plumbing, IIN-147).

## A. Funnel plumbing

- [ ] Meta test ad → LP loads <3s on 4G mobile, UTM params preserved in URL
- [ ] LP: next JIT slot time displays correctly; countdown ticks; seat cap copy matches eWebinar config
- [ ] Pay click → Razorpay checkout opens, amount = ₹499 exactly
- [ ] Meta Pixel: `InitiateCheckout` fires on pay click; `Purchase` (value 499, INR) fires on success — verify in Events Manager test events
- [ ] Test UPI payment succeeds → redirect lands on eWebinar join page for correct next slot
- [ ] Registrant row appears in eWebinar with name/email/phone/UTM/payment_id
- [ ] Caller sheet row created (or next sync verified)

## B. Messaging layer

- [ ] M1 confirmation WhatsApp + email arrive <2 min after payment, `{join_link}` works
- [ ] T-1h and T-10min messages fire relative to assigned slot (test with a slot 1h+ out)
- [ ] No-show branch: skip a session → M5 replay nudge arrives, replay link works, deadline stamped
- [ ] Attended branch: M6 thank-you + offer message arrives <1h post-session
- [ ] STOP/opt-out suppresses further WhatsApp messages

## C. Webinar room

- [ ] JIT session starts on schedule; video plays end-to-end on mobile + desktop
- [ ] Poll appears ~1:50 and records answer to registrant profile
- [ ] Seeded chats post at correct timestamps (0:45, 8:30, 31:30, 47:30)
- [ ] Offer pop-up at 38:30 with working enroll link; CTA widget at 42:30
- [ ] Chatbase answers: "is this live?" (honest), "price kya hai?" (₹8,999/₹17,000 + offer math), "EMI?", "certificate?", a Hinglish question, a garbage/abuse input (redirect)
- [ ] "CALL ME" typed → escalation row lands in caller sheet with excerpt
- [ ] Watch-% + poll data visible in eWebinar analytics for the test attendee

## D. Sales handoff

- [ ] Caller can open caller sheet and see: attended, watch %, poll answer, callme flag, offer deadline, UTM
- [ ] Offer expiry honored: coupon `WEBINAR1499` (or signed link v1.5) applies ₹1,499 off at course checkout; expiry blocks it after deadline
- [ ] Telecall script dry-run: one role-play call each for opener branches A (attended) and C (no-show)

## E. Pilot go/no-go gates

- [ ] All A–D boxes checked, defects fixed or documented
- [ ] Meta campaign built: 1 segment, ₹800/day, LP URL with UTMs, Purchase objective
- [ ] Dashboard: daily CPA, show-up %, call-connect %, enrollments — owner CMO
- [ ] Kill/iterate triggers agreed: CPA > ₹700 for 3 days → pause creative; show-up <45% → fix reminders before scaling
