# 03 — Telecall Script (Post-Webinar Sales Calls)

**Goal:** webinar attendee/no-show → course enrollment (Agentic Pro ₹8,999 / AISD ₹17,000 / Basic).
**Timing:** attended → call within **24h** (speed-to-lead is the biggest lever). No-show → replay nudge first, call at 48h.
**Caller data source:** eWebinar analytics per registrant — attended Y/N, watch %, chat engagement, poll answer (background: dev/student/non-tech), CALL ME keyword flag.
**Call length target:** 5–8 min. Language: Hinglish matching caller's lead.

## Pre-call checklist (30 sec)

Pull from caller sheet (CTO builds: eWebinar → sheet sync):
- [ ] Name, phone, UTM segment
- [ ] Attended? Watch %? Stayed till offer (38:30+)? Asked chat questions?
- [ ] Poll answer: dev / student / non-tech / freelancer
- [ ] CALL ME flag? (priority — call these first, within 2h if possible)

## Openers — branch by watch state

### A. Attended most of webinar (watch ≥70%)

> "Namaste {name} ji, main {caller} bol raha hoon IINM se — aapne kal/aaj Raja sir ka AI agents wala webinar attend kiya tha na? … Haan, wohi — jahan live app bana ke dikhaya. Aapne almost poora dekha, toh main seedha poochunga — **demo mein sabse interesting kya laga aapko?**"

*[Listen. Their answer = your pitch angle for the rest of the call.]*

### B. Partial watch (30–70%)

> "Namaste {name} ji, IINM se — aapne AI agents webinar join kiya tha. Maine dekha aap beech mein nikal gaye — kaam aa gaya hoga. Aapko woh part miss hua jahan offer explain kiya — isliye call kiya. Quick question — aapne jo dekha, usmein AI ka app banana kaise laga?"

### C. Registered but no-show / replay viewer

> "Namaste {name} ji, IINM se — aapne ₹499 ka AI agents webinar book kiya tha. Session miss ho gaya — no problem, aapko replay link bheja hai WhatsApp pe. Main isliye call kar raha hoon kyunki aapka **48-hour offer abhi bhi active hai** — replay dekhne ke baad bhi apply hoga. Ek minute mein batata hoon kya hai…"

### D. CALL ME flag (hottest)

> "Namaste {name} ji — aapne webinar chat mein CALL ME likha tha, isliye priority pe call kar raha hoon. Bataiye, kya jaanna chahte hain?"

*[These close at 2–3x base rate. Keep it conversational, answer, then offer recap → close.]*

## Discovery (60–90 sec) — pick 2–3

- "Aap abhi kya karte ho — job / college / freelancing?" *(poll answer se confirm)*
- "AI se aapka goal kya hai — better job, freelance income, ya apna kuch banana?"
- "Kya aapne kabhi coding try ki hai / aap already developer ho?"
- "Aur aapko yeh skill seekhne mein kitna time de sakte ho weekly?"

## Pitch routing

| Caller profile | Pitch | Close line |
|---|---|---|
| Working dev / tech job | **AISD ₹17,000** — full program, career track | "Aapke liye AISD sahi hai — aap already basics jaante ho" |
| Working pro / freelancer / upskill | **Agentic Pro ₹8,999** — flagship, agentic workflow | "Pro aapke schedule ke liye perfect hai" |
| Student / beginner / price-sensitive | **Agentic Basic ₹8,999** — foundation-first | "Basic se shuru karo, same investment" |
| Non-tech serious | Basic → Pro path | "Basic foundation dega, phir Pro pe upgrade" |

## Offer recap (say it exactly)

> "Aapka ₹499 ticket **poora credit** ban jaata hai — zero waste. Aur kyunki aap attendee hain, **48 ghante ke andar** enroll karne pe ₹1,000 extra off — matlab Agentic Pro ₹8,999 ki jagah **₹7,500**, AISD **₹15,501** — plus free Prompt Toolkit module. Aapka deadline {date/time} hai."

## Objection handling

| Objection | Response |
|---|---|
| **"₹8,999 bahut hai"** | "Samajhta hoon. Do cheezein — ek, EMI options hain Razorpay pe, monthly ~₹X. Do, aapka ₹499 already adjusted hai — effective ₹7,500. Aur sochiye — ek freelance project is se zyada deta hai. Aap skill mein invest kar rahe ho, expense nahi." *[If still hesitant → Basic same price point: same pitch, foundation route]* |
| **"Time nahi hai"** | "Course self-paced hai — weekly 4–5 ghante. Office ke saath log karte hain. Aur recorded + mentor support hai — aapki speed pe." |
| **"Yeh live tha ya recorded?"** *(trap question — answer honestly)* | "Session recorded hai — isliye aapko instantly mila. Lekin course mein live mentor support aur real projects hain. Webinar ka format alag hai, course ka experience alag." *Never claim it was live.* |
| **"YouTube pe free mein sab hai"** | "Bilkul hai — aur maine webinar mein bhi bola, free path possible hai. Difference: 6–8 mahine ka trial-error vs 8–12 hafte ka structured path + mentor jab atak jaoge + portfolio projects. Aap time pe value rakhte ho ya paise pe — woh choice hai." |
| **"Placement guarantee hai?"** | "Guarantee nahi bolta — woh jhooth hoga. AISD mein placement-assistance track hai: portfolio, interview prep, referrals. Jo bhi 'guarantee' bolta hai, usse sambhalke." |
| **"Sochke batata hoon"** | "Bilkul — sirf ek reminder: aapka 48-hour window {deadline} pe expire hota hai, ₹1,499 ka difference hai. Main {tomorrow same time} ek last call kar doon decision ke liye?" *[Book the callback — never let it float.]* |
| **"Certificate milega?"** | "Haan — completion certificate + portfolio projects jo aap interview/freelance profile pe dikha sakte ho." |
| **"Pehle demo/trial chahiye"** | "Webinar hi aapka demo tha — aapne actual teaching style dekha. Course wohi hai, structured aur deeper." |

## Close

> "Toh {name} ji, main aapko enrollment link abhi WhatsApp kar raha hoon — checkout pe WEBINAR1499 apply kar dena, ₹1,499 total off ho jaayega. Payment UPI se 2 minute. Payment ke baad 24h mein onboarding call. Deal?"

**If yes:** send link on WhatsApp while on call, stay on line till checkout done if possible.
**If callback booked:** log exact date/time, send WhatsApp summary + reminder morning of callback.

## Follow-up cadence (non-buyers)

- **D0:** call #1 (attended) — above script
- **D1:** WhatsApp recap + offer link *(template in 04)*
- **D3:** call #2 + objection-specific WhatsApp (result proof / EMI detail)
- **D7:** last-call WhatsApp — "bonus window closing" *(only if inside a valid deadline)*

## Logging (caller sheet columns)

`call_date | outcome (enrolled/callback/not_interested/unreachable) | objection_type | course_pitched | callback_at | notes`

Unreachable rule: 3 attempts over 48h (different day-parts incl. 6–8 PM) → move to WhatsApp-only nurture.
