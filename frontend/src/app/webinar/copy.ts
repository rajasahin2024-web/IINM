/**
 * Webinar LP copy — CMO content package, marketing/webinar-funnel/02-landing-page-copy.md.
 * Edit copy here only; no component changes needed for copy tweaks.
 */

export const webinarCopy = {
  meta: {
    title: "AI Agent Se Real App Banao — Live Teardown Webinar | IINM",
    description:
      "₹499 mein dekho Raja Sain ek real app AI agents ke saath kaise banate hain — prompt se deploy tak. UPI se book karo, next session auto-join.",
  },

  brand: {
    name: "IINM",
    tagline: "Institute of Innovation & New Media",
  },

  topbar: {
    countdownLabel: "Next session starts in",
    countdownUnit: "min",
  },

  hero: {
    badge: "PRE-RECORDED MASTERCLASS · JIT SESSIONS EVERY 30 MIN",
    title: "AI Agent Se Real App Banao — Live Teardown Webinar",
    // A/B variants for week 2 (CMO owns testing):
    //   B: "50 Minute Mein Dekho: AI Agent Ek Poora App Kaise Banata Hai"
    //   C: "Coding Ka Future Yahan Hai — AI Agents Se Software Banana Seekho"
    subtitle:
      "Ek pre-recorded masterclass jahan Raja Sain ek real app AI agents ke saath banake dikhate hain — prompt se deploy tak. Koi fluff nahi. Sirf real kaam.",
    trustPoints: [
      "Sirf ₹499 — jo course enroll karne pe 100% credit ban jaata hai",
      "UPI / Cards / Netbanking",
      "Instant access — next session auto-join",
    ],
    cta: "Seat Book Karo",
    ctaMicrocopy: "UPI se 30 second mein pay karo · Seat instantly reserve",
    // {time} and {seats} are interpolated from the live JIT schedule
    urgencyTemplate: "Next session: {time} · Sirf {seats} seats per session — chhota batch rakhte hain taaki chat mein har question ka answer mile.",
  },

  outcomes: {
    heading: "50 minute mein aap dekhenge:",
    items: [
      "🎯 Agentic development kya hai — AI \"junior dev team\" banake kaam karwana (aur kyun yeh skill 2026 ka sabse bada shift hai)",
      "🛠️ Real app live build — prompt → plan → code → errors → fix → deploy, poora process screen pe",
      "🧠 5 lessons jo aap aaj se apply kar sakte ho — prompt-as-spec, interrupts, review discipline, testing, iteration",
      "💰 Career angle — agentic dev skills se job, freelance rates, aur income paths kaise badhte hain",
      "🎁 Attendee-only offer — ₹499 ticket course credit ban jaata hai + 48h bonus (session mein reveal)",
    ],
  },

  host: {
    heading: "Aapke host: Raja Sain",
    bio: "Raja Sain — IINM co-founder. AI tools aur agentic development pe kaam karte hain, aur Indian creators/students ko AI skills sikhate hain. Is session mein woh wohi workflow dikhayenge jo roz use karte hain — no theory, sirf real screen.",
    // Headshot upload slot — set a URL/path when CMO supplies the photo.
    photoSrc: "",
    photoAlt: "Raja Sain, IINM co-founder",
    initials: "RS",
  },

  proof: {
    heading: "Learners kya kehte hain",
    // Launch-week honest placeholders — replace with real named testimonials
    // in week 1–2. Never ship fabricated names.
    items: [
      { quote: "Pehli baar samjha AI se coding actually kaise hoti hai — sirf ChatGPT copy-paste nahi.", attribution: "IINM learner" },
      { quote: "Demo mein errors khud fix hote dekha — mind blown.", attribution: "IINM learner" },
    ],
  },

  forWhom: {
    yesHeading: "Yeh aapke liye hai agar:",
    yes: [
      "Aap developer ho aur AI-era mein relevant rehna hai",
      "Student ho — degree ke saath real income skill chahiye",
      "Freelancer ho — higher rates, faster delivery chahiye",
      "Non-tech ho — but AI se income ka serious path chahiye",
    ],
    noHeading: "Yeh aapke liye NAHI hai agar:",
    no: [
      "\"Bina mehnat paisa\" shortcut chahiye",
      "Aap already senior agentic-dev workflows professionally use karte ho",
    ],
  },

  steps: {
    heading: "How it works",
    items: [
      "Pay karo — UPI/Card se ₹499, 30 second",
      "Auto-join — payment ke turant baad next session ka link milta hai (WhatsApp + email)",
      "Attend + offer — session dekho, 48-hour attendee offer unlock hota hai",
    ],
  },

  faq: {
    heading: "FAQ",
    items: [
      {
        q: "Yeh live hai ya recorded?",
        a: "Session pre-recorded hai — isliye aap abhi join kar sakte ho, koi wait nahi. Lekin chat mein hamara AI assistant live hai jo aapke questions answer karega, aur team baad mein personally follow up karti hai.",
      },
      {
        q: "₹499 refundable hai?",
        a: "Ticket refundable nahi hai — but yeh 100% course credit ban jaata hai. Matlab agar aap kisi bhi IINM course mein enroll karte ho, ₹499 adjust ho jaata hai. Webinar free jaisa ho gaya.",
      },
      {
        q: "Mujhe coding aati nahi — kya yeh mere liye hai?",
        a: "Haan — session beginner-friendly hai. Demo technical hai but har step explain hota hai. Agar aap seriously seekhna chahte ho, yeh aapko exact roadmap dega.",
      },
      {
        q: "Kitne time ka session hai?",
        a: "~50 minute. End mein attendee-only offer + Q&A answers.",
      },
      {
        q: "Payment safe hai?",
        a: "Razorpay — India ka leading payment gateway. UPI, cards, netbanking sab supported. Payment ke baad instant confirmation + join link.",
      },
      {
        q: "Session miss ho gaya toh?",
        a: "Koi baat nahi — registered users ko replay link milta hai (WhatsApp + email). 48-hour offer replay watchers pe bhi apply hota hai.",
      },
    ],
  },

  finalCta: {
    heading: "₹499 — aur woh bhi course credit ban jaata hai.",
    body: "Agle 50 minute mein aapko pata chal jaayega ki AI se software ka future kaisa dikhta hai — aur usmein aapki jagah kahan hai.",
    cta: "Seat Book Karo",
    microcopy: "Next session {time} · Seats limited per slot · UPI accepted",
  },

  form: {
    heading: "Apni seat book karo",
    ticketLabel: "Webinar ticket",
    subheading: "Payment ke turant baad join link email + WhatsApp pe milega.",
    nameLabel: "Full name",
    namePlaceholder: "Aapka naam",
    emailLabel: "Email",
    emailPlaceholder: "you@example.com",
    phoneLabel: "Mobile number",
    phonePlaceholder: "10-digit mobile (WhatsApp preferred)",
    ctaPrefix: "Seat Book Karo —",
    ctaProcessing: "Opening secure checkout…",
    disclaimer: "Secure payment via Razorpay · UPI, cards & netbanking supported",
  },

  success: {
    title: "Payment successful — seat confirmed!",
    joinCta: "Join the Webinar",
    joinPending: "Join link aa raha hai — email check karo, aur yeh page refresh karo agar 1 minute mein na dikhe.",
    emailNote: "Confirmation email bheja gaya hai:",
    nextStepsTitle: "Next steps",
    nextSteps: [
      "Join link apne calendar mein save karo",
      "Webinar time pe 5 min pehle join karo (JIT session)",
      "Session ke end tak ruko — 48h bonus unlock hoga",
    ],
  },

  footer: {
    whatsappLabel: "Questions? WhatsApp us:",
    // Terms/Privacy CMS page slugs go here once those pages exist.
    links: [
      { label: "Contact", href: "/contact-us" },
    ],
    smallPrint: "This is a recorded educational session. ₹499 ticket is fully credited toward any IINM course enrollment.",
  },
} as const;

export type WebinarCopy = typeof webinarCopy;
