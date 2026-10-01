# 01 — Pre-Recorded Webinar Script (~50 min, eWebinar evergreen)

**Title (public):** "AI Agent Se Real Software Kaise Banta Hai — Live Teardown"
**Host:** Raja Sain (tool/trending positioning — agentic dev demo is his lane)
**Register:** Indian English / Hinglish — tech terms in English, connective tissue in Hindi. Speak like a smart senior dev friend, not a professor.
**Format notes:** `[STAGE]` = camera/screen direction · `[eW]` = eWebinar interaction to program (poll, CTA, offer pop-up, seeded chat) · `~MM:SS` = target timestamp.

**Runtime target:** 48–55 min recorded tight. Cut all dead air; keep demo segments brisk — viewers can pause, we can't re-catch attention.

---

## Act 0 — Hook & promise (~0:00–3:00)

**[STAGE: Raja on camera, clean setup, screen visible behind]**

**0:00**
Namaskar doston, main hoon Raja Sain — aur agle 45 minute mein main aapko dikhaunga kaise 2026 mein software *actually* banta hai. Not tutorials. Not "Hello World". Ek real, working app — AI agents ke saath, start to finish.

**0:20**
Pehle ek honest baat. Yeh session recorded hai — lekin chat mein hamara AI assistant live hai, aapke saare questions ka jawab dega, aur jo cheez AI handle nahi kar paaye uske liye hamari team directly aapko call karegi. So chat mein active rahiye — questions poochte rahiye.

**[eW: seeded chat message at 0:45 — "Questions? Type them below — our AI assistant answers live 👇"]**

**0:40**
Ab promise kya hai is session ka? Teen cheezein:
Ek — aapko *samajh* aa jayega ki "agentic development" hota kya hai, hype ke peeche real skill kya hai.
Do — main live ek app banaunga AI agent ke saath, aur aap dekhenge har step — prompt, code, errors, fix, deploy.
Aur teen — end mein main batunga is skill ko *professionally* kaise seekhte ho, aur jo log aaj yahan hain unke liye ek special offer hai — sirf is session ke attendees ke liye. So end tak rahiye — last 10 minute mein woh detail milegi.

**1:40**
Quick question — chat mein batao: aapka background kya hai? Developer? Student? Ya non-tech jo AI se income banana chahta hai? Type karo — "dev", "student", ya "non-tech".

**[eW: poll at 1:50 — "What's your background?" Options: Working developer / Student / Non-tech, want AI income / Freelancer. Poll results feed telecall segmentation.]**

**2:10**
Perfect. Jitne bhi answers aa rahe hain — iss session mein teeno ke liye kuch hai. Chalo, shuru karte hain.

---

## Act 1 — Why agentic development changed everything (~3:00–10:00)

**[STAGE: slides — max 5, big text, no bullets walls]**

**3:00**
2023 tak AI se coding matlab — ChatGPT kholo, sawaal likho, answer copy karo, paste karo, error aaye toh wapas jao. AI ek *shabdkosh* tha — dictionary. Aapko har cheez khud karni padti thi.

**3:40**
2025–26 mein game badal gaya. Ab AI *agent* hai — matlab aap kehte ho "yeh feature banao", aur woh *khud* plan karta hai, files banata hai, code likhta hai, test run karta hai, error dekhta hai, aur khud fix karta hai. Aap developer nahi — aap *architect* ho. AI aapki junior dev team hai.

**4:30**
Yeh ek real example hai. *[Slide: screenshot of an agentic coding tool mid-task — e.g., agent writing multiple files]* Dekho — maine ek line likhi: "Add user login with OTP." Agent ne 4 files banaye, database schema update kiya, test likha, run kiya, ek error aayi — khud fix kiya. 6 minute. Manually? 2–3 ghante, aur ek experienced dev ko.

**5:30**
Ab yahan ek cheez samjho — aur yahi aaj ka sabse important point hai:

> **AI ne developer ki zaroorat khatam nahi ki — AI ne "sirf code likhne wale" developer ki zaroorat khatam ki.**

Jo banda *system samajhta hai*, jo *decompose* kar sakta hai, jo agent ko sahi direction de sakta hai, jo AI ka code *review* kar sakta hai — uski value 10x ho gayi. Aur jo sirf syntax yaad rakhta tha… uski job risk mein hai. Yeh harsh hai, but true hai.

**7:00**
Isliye market mein do tarah ke log ban rahe hain: ek jo AI tools *use* karte hain casually — aur doosre jo AI agents ko *command* karte hain professionally. Second category wale log abhi India mein bahut kam hain — aur companies unko dhundh rahi hain. Freelance market mein bhi — agentic dev skills wale log 2x–3x rate charge kar rahe hain for the same projects.

**8:20**
Proof chahiye? Main aapko demo dikhaata hoon. Koi slides nahi — real screen, real code, real errors. Warts and all.

**[eW: seeded chat at 8:30 — "Demo starting 👀 drop a 🔥 if you're watching"]**

---

## Act 2 — Live demo: agentic build teardown (~10:00–33:00)

**Demo app:** "Study Planner" — ek chhota web app: user subjects add kare, AI-generated revision schedule mile, progress track ho. Chosen because: relatable to our student audience, touches CRUD + AI integration + deploy, completable in ~20 min of screen time.

*Record the demo for real. Edit tight — keep errors and fixes in (that's where trust builds), but cut idle waiting. Use jump cuts during long agent runs.*

**[STAGE: screen share, large font, terminal + editor + browser side by side]**

### Step 1 — The prompt is the spec (~10:00–13:30)

**10:00**
Dekho — main koi code nahi likh raha. Main *spec* likh raha hoon. Yehi pehla skill hai: **clear instructions dena**.

*[Screen: prompt being typed into agentic tool — read it aloud as typing]*
"Build a study planner web app. Users add subjects with exam dates. Generate a day-wise revision schedule. Show progress with a streak counter. Simple clean UI. Use a real database, not localStorage."

**11:00**
Dekha maine kya kiya? Main bola nahi "website banao". Maine bola *kya* banana hai, *features* kya hain, *constraints* kya hain. Vague prompt = vague app. Yeh detail sochna — yeh actual skill hai jo log miss karte hain.

**12:00**
Ab dekho agent kya kar raha hai — *[point at screen]* plan bana raha hai. "I'll create a Next.js app with SQLite…" — ruko, main isko rokta hoon. Main chahta hoon different stack. So main interrupt karke bolta hoon: "Use plain HTML frontend + Python backend." Aur agent ne plan change kiya. **Lesson 2: aap boss ho — agent galat direction jaaye toh rokna aana chahiye.** Iske liye aapko tech samajhna padega — isliye "non-tech bhi kar sakta hai" wale influencers jhooth bolte hain. Non-tech kar sakta hai — *seekhne ke baad*.

### Step 2 — Agent builds, you supervise (~13:30–22:00)

**13:30**
Ab agent code likh raha hai — files ban rahi hain. Dekho kitni files — backend, frontend, database schema. Main kuch type nahi kar raha. But meri aankhein kaam kar rahi hain — main *review* kar raha hoon har file.

**15:00**
*[Run the app — hit first error — keep it]*
Dekho — error aaya. "Database connection failed." Yahan 90% log ruk jaate hain. Ab dekho agent kya karta hai — error read kar raha hai, fix kar raha hai, dobara run kar raha hai. Fixed. **Lesson 3: agentic dev ka matlab zero errors nahi — matlab errors khud solve hote hain. Aapka kaam hai verify karna ki fix sahi hai.**

**17:00**
*[App runs — show UI — it's ugly/basic]*
App chal raha hai — but dekho UI kitna basic hai. Ab main next prompt deta hoon: "Make the UI modern — cards, gradient header, mobile responsive." Aur agent ne polish kar diya. **[Lesson 4: iteration is the workflow. Pehla output final nahi hota — aap sculpt karte ho.]**

**19:30**
Ek aur real moment — *[add feature: "AI-generated schedule" via API]* Ab main bolta hoon: "Schedule generate karne ke liye ek AI API integrate karo — rule-based fallback bhi rakho agar API fail ho." Dekho — yeh line likhne ke liye mujhe *samajhna* pada ki APIs fail ho sakti hain, fallback chahiye. **Yahi difference hai casual user aur professional mein — aapko systems thinking chahiye.**

### Step 3 — Test, fix, deploy (~22:00–33:00)

**22:00**
Ab main bolta hoon: "Write tests for the schedule generator and run them." Agent tests likh raha hai — aur ek test fail hua. Interesting — agent ne apna hi bug pakda. Fix kiya. **Lesson 5: agentic dev mein testing optional nahi hai — yeh aapka safety net hai jab aap code khud nahi likhte.**

**25:00**
*[Deploy step — push to a host / run production build]*
Last step — deploy. "Isko production-ready build karo aur deployment steps batao." Agent build kar raha hai, deployment config bana raha hai… done. App live hai. *[Show live URL / local deploy]*

**27:00**
Ruko — recap karte hain. ~25 minute screen time mein: ek real app — database, AI feature, tests, deploy. Maine **zero lines of code likhi** — but maine ~15 *decisions* liye. Prompts, interrupts, reviews, priorities. Yeh 15 decisions hi actual kaam tha.

**29:00**
Aur yeh seekhne wali skill hai — step by step. Koi magic nahi. Sequence hai:
1. Web fundamentals — HTML, backend, database kya karte hain *(taki aap review kar sako)*
2. Prompt engineering — agent ko kaise instruct karo
3. Agentic workflow — plan mode, interrupts, iteration
4. Testing & debugging AI code
5. Deployment & real projects

**31:00**
Chat mein batao — yeh demo dekh ke sabse surprising cheez kya lagi? *[pause 4 sec]* Kaafi log bol rahe hain "errors khud fix hona". Haan — wahi game-changer hai.

**[eW: seeded chat at 31:30 — "Most people say the self-fixing errors blew their mind. What about you? 👇"]**

**32:00**
Ab ek sawaal — "yeh main akele YouTube se seekh sakta hoon kya?" Honest answer: haan, kar sakte ho — kuch log karte hain. But jo cheez aapko 6–8 mahine mein trial-and-error se milegi, structured path mein 8–12 hafte mein milti hai — kyunki aapko pata nahi aapko kya nahi pata. Aur wahi agla section hai.

---

## Act 3 — Bridge & pitch (~33:00–45:00)

**[STAGE: Raja on camera — this section must feel personal, not a slideshow. Slides only for pricing table.]**

**33:00**
Ab main transparently batata hoon — yeh webinar isliye bana kyunki hum log IINM mein exactly yeh skill padhate hain. Aur haan, end mein ek offer hai. Aap chahein toh sun sakte hain, decide aap karenge. But pehle value ka promise poora kar deta hoon — teen takeaways jo aap aaj se free mein use kar sakte ho:

**33:40**
Ek — aaj se hi kisi bhi agentic coding tool kholke ek *chhota* real project do. Tutorial mat karo — project do.
Do — har prompt ko spec ki tarah likho. Feature list, constraints, tech stack — sab.
Teen — jo output aaye, usko review karna seekho. Trust but verify.

**34:30**
Yeh teen cheezein free hain, aaj se karo. Ab jo log professionally seekhna chahte hain — unke liye:

**35:00**
IINM mein humne AI agentic development ke liye do courses banaye hain — ek structured path, live mentor support, real projects, aur community.

*[Slide: course comparison table]*

**Agentic Pro — ₹8,999.** Yeh hamara flagship hai — working professionals ke liye. Complete agentic workflow: prompt engineering se lekar multi-agent systems, real client-style projects, code review discipline, deployment. ~3 mahine ka structured program.

**AISD — AI Agentic Software Development — ₹17,000.** Yeh serious career program hai — full software development + agentic layer. Internship-style projects, portfolio, placement assistance track. Jo log developer banke AI-era mein aage badhna chahte hain — unke liye.

**Agentic Basic** — jo students ya bilkul beginners hain, unke liye entry point — same ₹8,999 headline range mein, foundation-first path.

**38:00**
Ab — jo log aaj is webinar mein hain, unke liye offer. Kyunki aapne ₹499 pay karke time invest kiya — woh paisa waste nahi jaayega:

*[Slide: offer card — eW offer pop-up fires here too]*

**[eW: offer interaction at 38:30 — "Webinar Attendee Offer" with CTA button linking to checkout URL]**

**38:30**
Ek — **aapka ₹499 ticket full credit ban jaata hai.** Kisi bhi course mein enroll karo — ₹499 minus ho jaayega.
Do — **48 ghante ke andar enroll karo** — aur ₹1,000 extra off. Matlab total ₹1,499 discount. Agentic Pro ₹7,500 mein. AISD ₹15,501 mein.
Teen — 48-hour enroll karne walon ko free **"AI Agent Prompt Toolkit"** module — ready-made prompts jo maine aaj demo mein use kiye, plus 40+ production prompts.

**40:00**
48 ghante kyun? Kyunki humein action-takers chahiye. Yeh recorded session hai, but offer real hai — aur timer real hai. Aapka countdown aapke session end hone se shuru hua hai.

**40:40**
Kaun enroll kare — aur kaun nahi kare. Honest baat:
**Enroll karo agar** — aap developer ho aur AI-era relevant rehna hai; aap student ho aur degree ke saath real skill chahiye; aap freelancer ho aur higher rates chahiye; ya non-tech ho aur AI se income ka serious path chahte ho.
**Mat enroll karo agar** — aapko "bina mehnat paisa" chahiye. Yeh skill hai — 8–12 hafte ka real work. Hum shortcut nahi bechte.

**42:00**
Process simple hai: neeche chat mein link hai — enroll page pe jao, course choose karo, checkout pe aapka ₹499 credit + bonus apply hoga. Payment ke baad hamari team **24 ghante ke andar call karegi** onboarding ke liye. Aur aapke questions abhi bhi chat mein AI assistant answer kar raha hai — poochho.

**[eW: CTA interaction at 42:30 — persistent "Enroll Now — 48h Offer" button, bottom-right]**

**43:00**
Ek common sawaal chat mein aa raha hai — "EMI hai?" — haan, Razorpay pe standard options hain, aur hamari team call pe discuss karegi. Doosra — "certificate milega?" — haan, completion certificate + portfolio projects. Teesra — "Hindi mein padhai hoti hai?" — Hinglish — jaisa main abhi bol raha hoon, waisa hi.

---

## Act 4 — Close (~45:00–50:00)

**45:00**
Toh doston — recap. Aaj aapne dekha: agentic development kya hai, ek real app AI agent ke saath kaise banti hai, aur yeh skill seekhne ka exact path kya hai.

**45:40**
Teen logon ke paas yeh session ke baad kya hota hai — decide karo aap kaun ho:
Pehle — jo kuch nahi karte. Do hafte mein yeh session bhool jaayenge.
Doosre — jo free path try karenge. Respect — shuru karo aaj hi.
Teesre — jo 48 ghante ke andar enroll karenge, ₹1,499 bachayenge, aur 3 mahine mein woh skill rakhenge jo market abhi premium pe maang rahi hai.

**46:40**
Main aapko ek cheez aur bolunga — aapne ₹499 is session ke liye diye. Woh ya toh sunk cost hai — ya aapka pehla installment. Aap decide karo woh kya banega.

**47:10**
Enroll link chat mein pinned hai. 48-hour timer aapke session ke end se chal raha hai. Questions ke liye AI assistant abhi bhi active hai — aur agar aapko insaan se baat karni hai, "CALL ME" type karo chat mein — hamari team priority call karegi.

**[eW: seeded chat at 47:30 — "Type CALL ME if you'd rather talk to our team directly 📞"]**

**47:50**
Thank you for your time — seriously, aapke 50 minute ka investment appreciate karta hoon. Milte hain course mein — ya phir next video mein. Keep building. Jai Hind.

**48:30** *[End card: IINM logo, enroll URL, offer timer reminder. Hold 30–60 sec with background music — viewers finishing late still see the CTA.]*

---

## Production notes for recording

1. **Energy:** record standing or upright — on-camera sections (Act 0, 3, 4) need higher energy than demo section.
2. **Demo integrity:** record a real build. If the real run is too long, cut waiting — never fake output. Keep 2–3 real errors; they build more trust than a perfect run.
3. **Retakes:** record Act 3 (pitch) twice — once faster (~10 min) for a potential cut-down version.
4. **eWebinar upload:** single MP4, 1080p. Interactions to program: poll @1:50, offer @38:30, CTA @42:30, seeded chats at marked timestamps.
5. **Honesty guardrail:** we state upfront it's recorded + AI-assisted chat. Never script claims that it's live — Indian audiences call this out and it burns the brand.
6. **Subtitles:** burn English+Hindi subtitles on export — large share of Indian viewers watch muted/low-volume on mobile.

## Post-recording checklist (eWebinar)

- [ ] Upload video, set title: "AI Agent Se Real Software Kaise Banta Hai — Live Teardown"
- [ ] Program interactions at timestamps above (poll, offer, CTA, 4 seeded chats)
- [ ] Set CTA button URL → course checkout/enroll page (CTO provides final URL)
- [ ] Enable "CALL ME" keyword → Chatbase escalation rule (see 05)
- [ ] Test one full JIT session end-to-end before pilot (see 07 checklist)
