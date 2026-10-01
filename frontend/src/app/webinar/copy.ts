/**
 * Webinar LP copy — single handoff point for CMO (IIN-149 content package).
 * Replace these strings with the final Hinglish copy; no component changes needed.
 */

export const webinarCopy = {
  meta: {
    title: "Agentic AI Career Blueprint — Live Webinar | IINM",
    description:
      "₹499 mein seekho kaise Agentic AI developers ki careers badal raha hai. Live webinar + Q&A. Limited seats — abhi book karo.",
  },

  brand: {
    name: "IINM",
    tagline: "Institute of Innovation & New Media",
  },

  hero: {
    badge: "LIVE WEBINAR · LIMITED SEATS",
    title: "Agentic AI se apni career fast-track karo",
    subtitle:
      "90-minute live webinar: dekho kaise top developers AI agents se 10x output nikaal rahe hain — aur kaise tum bhi kar sakte ho.",
    bullets: [
      "Agentic AI workflows ka live demo — real projects, real code",
      "India ke job market mein AI-skilled developers ki demand breakdown",
      "Roadmap: beginner se job-ready — kaunsa course kab lena hai",
      "Live Q&A — apne career questions directly poochho",
    ],
  },

  offer: {
    priceLabel: "Webinar ticket",
    currencySymbol: "₹",
    priceNote: "one-time · UPI / card / netbanking",
    bonus: "Attendees-only: 48-hour bonus offer on Agentic Pro (₹8,999) & AISD (₹17,000)",
    guarantee: "Full-session watch karo — webinar ke baad caller team se personal roadmap call milegi.",
  },

  form: {
    heading: "Apni seat book karo",
    subheading: "Payment ke turant baad join link email pe milega.",
    nameLabel: "Full name",
    namePlaceholder: "Aapka naam",
    emailLabel: "Email",
    emailPlaceholder: "you@example.com",
    phoneLabel: "Mobile number",
    phonePlaceholder: "10-digit mobile (WhatsApp preferred)",
    cta: "Pay ₹499 & Book My Seat",
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

  trust: {
    line: "IINM — Institute of Innovation & New Media",
    points: ["Razorpay secure payments", "Instant eWebinar registration", "Call-back support"],
  },
} as const;

export type WebinarCopy = typeof webinarCopy;
