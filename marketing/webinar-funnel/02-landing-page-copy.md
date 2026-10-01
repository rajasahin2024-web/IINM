# 02 — Landing Page Copy (₹499 Checkout Page)

**Purpose:** Meta ad click → this page → Razorpay ₹499 payment → auto-register to next eWebinar JIT slot.
**Handoff:** This file is the copy source for CTO on IIN-147. Keep section order; design is CTO's.
**Language:** Hinglish primary, English tech terms. Mobile-first (95%+ traffic is mobile).

---

## Page structure (top → bottom)

### 1. Top bar
- Logo: IINM
- Right side: "🔴 Next session starts in **{countdown}** min" — live countdown to next JIT slot (eWebinar provides next-slot data; see §Engineering notes)

### 2. Hero

**Headline (primary):**
> **AI Agent Se Real App Banao — Live Teardown Webinar**

**Headline A/B variants (test in week 2):**
- B: `50 Minute Mein Dekho: AI Agent Ek Poora App Kaise Banata Hai`
- C: `Coding Ka Future Yahan Hai — AI Agents Se Software Banana Seekho`

**Subheadline:**
> Ek pre-recorded masterclass jahan Raja Sain ek real app AI agents ke saath banake dikhate hain — prompt se deploy tak. Koi fluff nahi. Sirf real kaam.

**Trust microcopy (under sub):**
> ✅ Sirf ₹499 — jo course enroll karne pe **100% credit** ban jaata hai · ✅ UPI / Cards / Netbanking · ✅ Instant access — next session auto-join

**CTA button:**
> **Seat Book Karo — ₹499** →
Microcopy under button: `UPI se 30 second mein pay karo · Seat instantly reserve`

**Seat urgency block (real, not fake):**
> ⚡ Next session: **Today, {next_slot_time}** · Sirf **{n} seats** per session — chhota batch rakhte hain taaki chat mein har question ka answer mile.

*(Engineering note: eWebinar JIT slots run every 30 min — display next slot time; seat cap = 25/session shown honestly as our per-slot capacity setting.)*

### 3. "Is webinar mein kya milega" — outcome bullets

**Section header:** `50 minute mein aap dekhenge:`

- 🎯 **Agentic development kya hai** — AI "junior dev team" banake kaam karwana (aur kyun yeh skill 2026 ka sabse bada shift hai)
- 🛠️ **Real app live build** — prompt → plan → code → errors → fix → deploy, poora process screen pe
- 🧠 **5 lessons jo aap aaj se apply kar sakte ho** — prompt-as-spec, interrupts, review discipline, testing, iteration
- 💰 **Career angle** — agentic dev skills se job, freelance rates, aur income paths kaise badhte hain
- 🎁 **Attendee-only offer** — ₹499 ticket course credit ban jaata hai + 48h bonus (session mein reveal)

### 4. Host bio

**Header:** `Aapke host: Raja Sain`

> Raja Sain — IINM co-founder. AI tools aur agentic development pe kaam karte hain, aur Indian creators/students ko AI skills sikhate hain. Is session mein woh wohi workflow dikhayenge jo roz use karte hain — no theory, sirf real screen.

[Placeholder: Raja ki photo — 1 strong headshot. CTO: slot for image upload.]

### 5. Social proof slot

**Header:** `Learners kya kehte hain`

> *Launch week ke liye 2–3 honest placeholders — real testimonials aate hi replace:*
> - ⭐⭐⭐⭐⭐ "Pehli baar samjha AI se coding actually kaise hoti hai — sirf ChatGPT copy-paste nahi." — *[Student name pending — CTO: keep CMS-editable slot]*
> - ⭐⭐⭐⭐⭐ "Demo mein errors khud fix hote dekha — mind blown." — *[pending]*

*(CTO: make this an editable block — we'll swap real quotes in week 1–2. Never ship fabricated names.)*

### 6. "Yeh kiske liye hai"

**Two columns:**

**✅ Yeh aapke liye hai agar:**
- Aap developer ho aur AI-era mein relevant rehna hai
- Student ho — degree ke saath real income skill chahiye
- Freelancer ho — higher rates, faster delivery chahiye
- Non-tech ho — but AI se income ka *serious* path chahiye

**❌ Yeh aapke liye NAHI hai agar:**
- "Bina mehnat paisa" shortcut chahiye
- Aap already senior agentic-dev workflows professionally use karte ho

### 7. How it works (3 steps)

> **1. Pay karo** — UPI/Card se ₹499, 30 second
> **2. Auto-join** — payment ke turant baad next session ka link milta hai (WhatsApp + email)
> **3. Attend + offer** — session dekho, 48-hour attendee offer unlock hota hai

### 8. FAQ

**Q: Yeh live hai ya recorded?**
Session pre-recorded hai — isliye aap *abhi* join kar sakte ho, koi wait nahi. Lekin chat mein hamara AI assistant live hai jo aapke questions answer karega, aur team baad mein personally follow up karti hai.

**Q: ₹499 refundable hai?**
Ticket refundable nahi hai — but yeh **100% course credit** ban jaata hai. Matlab agar aap kisi bhi IINM course mein enroll karte ho, ₹499 adjust ho jaata hai. Webinar free jaisa ho gaya.

**Q: Mujhe coding aati nahi — kya yeh mere liye hai?**
Haan — session beginner-friendly hai. Demo technical hai but har step explain hota hai. Agar aap seriously seekhna chahte ho, yeh aapko exact roadmap dega.

**Q: Kitne time ka session hai?**
~50 minute. End mein attendee-only offer + Q&A answers.

**Q: Payment safe hai?**
Razorpay — India ka leading payment gateway. UPI, cards, netbanking sab supported. Payment ke baad instant confirmation + join link.

**Q: Session miss ho gaya toh?**
Koi baat nahi — registered users ko replay link milta hai (WhatsApp + email). 48-hour offer replay watchers pe bhi apply hota hai.

### 9. Final CTA block

> **₹499 — aur woh bhi course credit ban jaata hai.**
> Agle 50 minute mein aapko pata chal jaayega ki AI se software ka future kaisa dikhta hai — aur usmein aapki jagah kahan hai.

**[Seat Book Karo — ₹499 →]**

Microcopy: `Next session {next_slot_time} · Seats limited per slot · UPI accepted`

### 10. Footer
- IINM logo + "Questions? WhatsApp us: {support_number}" (CTO: wire to WhatsApp business number)
- Links: Terms · Privacy · Contact — existing site pages
- Small print: `This is a recorded educational session. ₹499 ticket is fully credited toward any IINM course enrollment.`

---

## Engineering notes for CTO (IIN-147)

1. **Pixel events:** fire `InitiateCheckout` on pay click, `Purchase` (value: 499, currency: INR) on Razorpay success callback — required for Meta optimization.
2. **Post-payment flow:** Razorpay webhook success → create eWebinar registration (their API/Zapier) → redirect user to eWebinar join URL for next JIT slot → fire WhatsApp + email confirmation (templates in `04-reminder-sequence.md`).
3. **Next-slot display:** pull next JIT slot time from eWebinar or compute from our schedule config (`06-ewebinar-setup.md`); countdown in top bar.
4. **Offer expiry:** v1 = static coupon `WEBINAR1499` on course checkout, telecaller verifies attendance timestamp in eWebinar before honoring. v1.5 = per-registrant expiring link (signed `offer_exp` param, 48h from attended session end). Spec in README "Offer mechanics".
5. **UTM passthrough:** preserve `utm_source/medium/campaign/content` from ad URL through payment → registration → caller sheet columns.
6. **Mobile-first:** single-column, CTA sticky on mobile, total scroll ≤ 3 screens above FAQ.
