"use client";

import React, { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/config";
import { cachedFetch } from "@/lib/apiCache";
import { webinarCopy as C } from "./copy";
import { initMetaPixel, fbTrack, captureAttribution } from "./pixel";

type Phase = "form" | "paying" | "success";
type PublicLead = {
  uuid: string;
  status: string;
  join_url: string | null;
  replay_url: string | null;
  session_time: string | null;
  registered: boolean;
};
type WebinarConfig = {
  amount_inr?: number;
  next_slot?: string;
  seats_per_session?: number;
};
type ContactSettings = { whatsapp?: string; phone1?: string };

const IST_OPTS = { timeZone: "Asia/Kolkata" } as const;

function formatSlotTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = (a: Date, b: Date) =>
    a.toLocaleDateString("en-IN", IST_OPTS) === b.toLocaleDateString("en-IN", IST_OPTS);
  const time = d.toLocaleTimeString("en-IN", { ...IST_OPTS, hour: "numeric", minute: "2-digit", hour12: true });
  if (sameDay(d, now)) return `Today, ${time}`;
  const tmr = new Date(now.getTime() + 86400000);
  if (sameDay(d, tmr)) return `Tomorrow, ${time}`;
  return `${d.toLocaleDateString("en-IN", { ...IST_OPTS, weekday: "short" })}, ${time}`;
}

/** Minutes until the next JIT slot; ticks every 15s for the top-bar countdown. */
function useSlotCountdown(nextSlotIso: string | null): number | null {
  const [mins, setMins] = useState<number | null>(null);
  useEffect(() => {
    if (!nextSlotIso) return;
    const tick = () =>
      setMins(Math.max(0, Math.ceil((new Date(nextSlotIso).getTime() - Date.now()) / 60000)));
    tick();
    const t = setInterval(tick, 15000);
    return () => clearInterval(t);
  }, [nextSlotIso]);
  return mins;
}

export default function WebinarLanding() {
  const [phase, setPhase] = useState<Phase>("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [amountInr, setAmountInr] = useState<number>(499);
  const [nextSlot, setNextSlot] = useState<string | null>(null);
  const [seats, setSeats] = useState<number>(25);
  const [whatsapp, setWhatsapp] = useState<string>("");
  const [lead, setLead] = useState<PublicLead | null>(null);
  const [purchaseFired, setPurchaseFired] = useState(false);
  const minsLeft = useSlotCountdown(nextSlot);

  // Razorpay checkout.js + Meta Pixel + public config (next JIT slot, seat cap)
  useEffect(() => {
    initMetaPixel();
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    document.body.appendChild(s);

    cachedFetch<WebinarConfig>(`${API_BASE_URL}/webinar/config`, 30_000)
      .then((d) => {
        if (d?.amount_inr) setAmountInr(d.amount_inr);
        if (d?.next_slot) setNextSlot(d.next_slot);
        if (d?.seats_per_session) setSeats(d.seats_per_session);
      })
      .catch(() => {});
    cachedFetch<ContactSettings>(`${API_BASE_URL}/contact/settings`, 300_000)
      .then((d) => setWhatsapp((d?.whatsapp || d?.phone1 || "").replace(/\D/g, "")))
      .catch(() => {});
  }, []);

  // Poll for the eWebinar join link when registration is still pending
  useEffect(() => {
    if (phase !== "success" || !lead || lead.join_url) return;
    let tries = 0;
    const t = setInterval(async () => {
      tries += 1;
      try {
        const r = await fetch(`${API_BASE_URL}/webinar/status/${lead.uuid}`);
        if (r.ok) {
          const d = await r.json();
          if (d.lead?.join_url) {
            setLead(d.lead);
            clearInterval(t);
          }
        }
      } catch { /* retry silently */ }
      if (tries >= 10) clearInterval(t);
    }, 6000);
    return () => clearInterval(t);
  }, [phase, lead]);

  // Fire the Meta Pixel Purchase event once per verified payment.
  // eventID = lead_uuid → stable key for future Conversions API dedup.
  useEffect(() => {
    if (phase === "success" && lead && !purchaseFired) {
      fbTrack("Purchase", {
        value: amountInr,
        currency: "INR",
        content_name: "webinar_ticket",
        content_type: "product",
      }, { eventID: lead.uuid });
      setPurchaseFired(true);
    }
  }, [phase, lead, amountInr, purchaseFired]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim() || !email.trim() || !phone.trim()) {
      setError("Please fill name, email and mobile number.");
      return;
    }
    fbTrack("InitiateCheckout", { value: amountInr, currency: "INR", content_name: "webinar_ticket" });
    setPhase("paying");

    try {
      const res = await fetch(`${API_BASE_URL}/webinar/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, ...captureAttribution() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Could not start checkout");

      if (data.already_paid) {
        setLead(data.lead);
        setPhase("success");
        return;
      }

      if (!window.Razorpay) throw new Error("Payment gateway still loading — try again in a second");

      const rzp = new window.Razorpay({
        key: data.razorpay_key_id,
        amount: data.amount,
        currency: data.currency,
        name: C.brand.name,
        description: C.form.ticketLabel,
        order_id: data.order_id,
        prefill: { name, email, contact: phone },
        theme: { color: "#0a1628" },
        handler: async (resp: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
          try {
            const ver = await fetch(`${API_BASE_URL}/webinar/verify`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                lead_uuid: data.lead_uuid,
                razorpay_payment_id: resp.razorpay_payment_id,
                razorpay_order_id: resp.razorpay_order_id,
                razorpay_signature: resp.razorpay_signature,
              }),
            });
            const vd = await ver.json();
            if (!ver.ok) throw new Error(vd.detail || "Verification failed");
            setLead(vd.lead);
            setPhase("success");
          } catch (err) {
            setError(err instanceof Error ? err.message : "Verification failed");
            setPhase("form");
          }
        },
        modal: { ondismiss: () => setPhase("form") },
      });
      rzp.on("payment.failed", (resp: { error?: { description?: string } }) => {
        const desc = resp?.error?.description;
        setError(`Payment failed${desc ? `: ${desc}` : ""}`);
        setPhase("form");
      });
      rzp.open();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setPhase("form");
    }
  };

  const slotLabel = nextSlot ? formatSlotTime(nextSlot) : null;
  const urgencyText = slotLabel
    ? C.hero.urgencyTemplate.replace("{time}", slotLabel).replace("{seats}", String(seats))
    : null;

  return (
    <div className="min-h-screen bg-[#0a1628] text-white">
      {/* Top bar: brand + live next-session countdown */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0a1628]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt={`${C.brand.name} logo`} className="h-9 w-auto" />
            <p className="text-sm font-bold tracking-wide">{C.brand.name}</p>
          </div>
          {nextSlot && (
            <p className="rounded-full bg-[#e63946]/15 px-3 py-1.5 text-[11px] font-semibold text-[#ff8f99] sm:text-xs">
              🔴 {minsLeft !== null && minsLeft <= 120
                ? `${C.topbar.countdownLabel} ${minsLeft} ${C.topbar.countdownUnit}`
                : `Next session: ${slotLabel}`}
            </p>
          )}
        </div>
      </header>

      {/* Hero + checkout card */}
      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-10 md:grid-cols-2 md:py-14">
        <div>
          <span className="inline-block rounded-full bg-[#e63946]/15 px-3 py-1 text-xs font-semibold tracking-wider text-[#ff8f99]">
            {C.hero.badge}
          </span>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight md:text-4xl">
            {C.hero.title}
          </h1>
          <p className="mt-3 text-base text-white/70">{C.hero.subtitle}</p>

          <ul className="mt-5 space-y-2">
            {C.hero.trustPoints.map((p) => (
              <li key={p} className="flex items-start gap-2 text-sm text-white/85">
                <span aria-hidden="true">✅</span>{p}
              </li>
            ))}
          </ul>

          <a
            href="#book-seat"
            className="mt-6 inline-block rounded-lg bg-[#e63946] px-8 py-3.5 text-base font-bold text-white transition-colors hover:bg-[#d32736]"
          >
            {C.hero.cta} — ₹{amountInr} →
          </a>
          <p className="mt-2 text-xs text-white/50">{C.hero.ctaMicrocopy}</p>

          {urgencyText && (
            <div className="mt-6 rounded-xl border border-[#e63946]/30 bg-[#e63946]/10 p-4 text-sm text-[#ffb3b8]">
              ⚡ {urgencyText}
            </div>
          )}
        </div>

        {/* Checkout card — Razorpay UPI/card flow */}
        <div id="book-seat" className="scroll-mt-24 self-start rounded-2xl bg-white p-6 text-slate-900 shadow-2xl md:p-8">
          {phase === "success" && lead ? (
            <SuccessPanel lead={lead} email={email} amountInr={amountInr} />
          ) : (
            <>
              <div className="mb-1 flex items-baseline justify-between">
                <h2 className="text-xl font-bold">{C.form.heading}</h2>
                <div className="text-right">
                  <p className="text-2xl font-extrabold text-[#e63946]">₹{amountInr}</p>
                  <p className="text-[11px] text-slate-500">one-time · UPI / card / netbanking</p>
                </div>
              </div>
              <p className="mb-5 text-sm text-slate-500">{C.form.subheading}</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="wb-name" className="mb-1 block text-sm font-medium">{C.form.nameLabel}</label>
                  <input
                    id="wb-name" type="text" required value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={C.form.namePlaceholder}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition-colors focus:border-[#0a1628] focus:ring-2 focus:ring-[#0a1628]/10"
                  />
                </div>
                <div>
                  <label htmlFor="wb-email" className="mb-1 block text-sm font-medium">{C.form.emailLabel}</label>
                  <input
                    id="wb-email" type="email" required value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={C.form.emailPlaceholder}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition-colors focus:border-[#0a1628] focus:ring-2 focus:ring-[#0a1628]/10"
                  />
                </div>
                <div>
                  <label htmlFor="wb-phone" className="mb-1 block text-sm font-medium">{C.form.phoneLabel}</label>
                  <input
                    id="wb-phone" type="tel" required value={phone} inputMode="numeric"
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={C.form.phonePlaceholder}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition-colors focus:border-[#0a1628] focus:ring-2 focus:ring-[#0a1628]/10"
                  />
                </div>

                {error && (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={phase === "paying"}
                  className="w-full rounded-lg bg-[#e63946] px-4 py-3.5 text-base font-bold text-white transition-colors hover:bg-[#d32736] disabled:opacity-60"
                >
                  {phase === "paying" ? C.form.ctaProcessing : `${C.form.ctaPrefix} ₹${amountInr}`}
                </button>
                <p className="text-center text-[11px] text-slate-400">{C.form.disclaimer}</p>
              </form>
            </>
          )}
        </div>
      </section>

      {/* Content sections — single column, mobile-first */}
      <main className="mx-auto max-w-3xl space-y-14 px-4 pb-20">
        <Section heading={C.outcomes.heading}>
          <ul className="space-y-3">
            {C.outcomes.items.map((it) => (
              <li key={it} className="text-sm text-white/85 md:text-base">{it}</li>
            ))}
          </ul>
        </Section>

        <Section heading={C.host.heading}>
          <div className="flex items-start gap-4">
            {C.host.photoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={C.host.photoSrc} alt={C.host.photoAlt} className="h-16 w-16 shrink-0 rounded-full object-cover" />
            ) : (
              <div aria-hidden="true" className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#e63946]/20 text-lg font-bold text-[#ff8f99]">
                {C.host.initials}
              </div>
            )}
            <p className="text-sm text-white/80 md:text-base">{C.host.bio}</p>
          </div>
        </Section>

        <Section heading={C.proof.heading}>
          <ul className="space-y-4">
            {C.proof.items.map((t) => (
              <li key={t.quote} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-white/90 md:text-base">⭐⭐⭐⭐⭐ &ldquo;{t.quote}&rdquo;</p>
                <p className="mt-2 text-xs text-white/50">— {t.attribution}</p>
              </li>
            ))}
          </ul>
        </Section>

        <Section heading="Yeh kiske liye hai">
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <h3 className="mb-3 text-sm font-bold text-green-400">✅ {C.forWhom.yesHeading}</h3>
              <ul className="space-y-2">
                {C.forWhom.yes.map((it) => <li key={it} className="text-sm text-white/80">• {it}</li>)}
              </ul>
            </div>
            <div>
              <h3 className="mb-3 text-sm font-bold text-red-400">❌ {C.forWhom.noHeading}</h3>
              <ul className="space-y-2">
                {C.forWhom.no.map((it) => <li key={it} className="text-sm text-white/60">• {it}</li>)}
              </ul>
            </div>
          </div>
        </Section>

        <Section heading={C.steps.heading}>
          <ol className="space-y-3">
            {C.steps.items.map((s, i) => (
              <li key={s} className="flex items-start gap-3 text-sm text-white/85 md:text-base">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#e63946] text-xs font-bold">{i + 1}</span>
                {s}
              </li>
            ))}
          </ol>
        </Section>

        <Section heading={C.faq.heading}>
          <div className="space-y-3">
            {C.faq.items.map((f) => (
              <details key={f.q} className="group rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <summary className="cursor-pointer list-none text-sm font-semibold text-white/90 md:text-base">
                  {f.q}
                  <span className="float-right text-white/40 transition-transform group-open:rotate-180">▾</span>
                </summary>
                <p className="mt-2 text-sm text-white/70">{f.a}</p>
              </details>
            ))}
          </div>
        </Section>

        <section className="rounded-2xl border border-[#e63946]/30 bg-[#e63946]/10 p-8 text-center">
          <h2 className="text-2xl font-extrabold">{C.finalCta.heading}</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-white/70 md:text-base">{C.finalCta.body}</p>
          <a
            href="#book-seat"
            className="mt-6 inline-block rounded-lg bg-[#e63946] px-10 py-3.5 text-base font-bold text-white transition-colors hover:bg-[#d32736]"
          >
            {C.finalCta.cta} — ₹{amountInr} →
          </a>
          <p className="mt-3 text-xs text-white/50">
            {C.finalCta.microcopy.replace("{time}", slotLabel ?? "starting soon")}
          </p>
        </section>
      </main>

      {/* Footer: WhatsApp support + links + small print */}
      <footer className="border-t border-white/10 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 text-center">
          {whatsapp && (
            <a
              href={`https://wa.me/${whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-green-600/20 px-5 py-2 text-sm font-semibold text-green-300 transition-colors hover:bg-green-600/30"
            >
              {C.footer.whatsappLabel} +{whatsapp}
            </a>
          )}
          <nav className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-xs text-white/50">
            {C.footer.links.map((l) => (
              <a key={l.href} href={l.href} className="transition-colors hover:text-white/80">{l.label}</a>
            ))}
            <span>{C.brand.name} — {C.brand.tagline}</span>
          </nav>
          <p className="max-w-xl text-[11px] text-white/40">{C.footer.smallPrint}</p>
        </div>
      </footer>

      {/* Sticky mobile CTA — scroll to the checkout card */}
      {phase !== "success" && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0a1628]/95 p-3 backdrop-blur md:hidden">
          <a
            href="#book-seat"
            className="block w-full rounded-lg bg-[#e63946] px-4 py-3 text-center text-base font-bold text-white"
          >
            {C.hero.cta} — ₹{amountInr} →
          </a>
        </div>
      )}
    </div>
  );
}

function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-5 text-xl font-extrabold md:text-2xl">{heading}</h2>
      {children}
    </section>
  );
}

function SuccessPanel({ lead, email, amountInr }: { lead: PublicLead; email: string; amountInr: number }) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl text-green-600">✓</div>
      <h2 className="text-xl font-bold text-slate-900">{C.success.title}</h2>
      <p className="mt-1 text-sm text-slate-500">₹{amountInr} · {C.form.ticketLabel}</p>

      {lead.join_url ? (
        <a
          href={lead.join_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-block w-full rounded-lg bg-[#0a1628] px-4 py-3.5 text-base font-bold text-white transition-colors hover:bg-[#14263f]"
        >
          {C.success.joinCta} →
        </a>
      ) : (
        <p className="mt-5 rounded-lg bg-amber-50 px-3 py-3 text-sm text-amber-800">{C.success.joinPending}</p>
      )}

      {lead.session_time && (
        <p className="mt-3 text-xs text-slate-500">
          Session: {new Date(lead.session_time).toLocaleString("en-IN", { ...IST_OPTS, dateStyle: "medium", timeStyle: "short" })}
        </p>
      )}
      <p className="mt-4 text-xs text-slate-500">{C.success.emailNote} <b>{email}</b></p>

      <ul className="mt-5 space-y-2 border-t border-slate-200 pt-4 text-left text-sm text-slate-600">
        {C.success.nextSteps.map((s) => <li key={s}>• {s}</li>)}
      </ul>
    </div>
  );
}
