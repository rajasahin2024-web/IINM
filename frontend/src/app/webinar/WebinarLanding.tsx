"use client";

import React, { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/config";
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

export default function WebinarLanding() {
  const [phase, setPhase] = useState<Phase>("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [amountInr, setAmountInr] = useState<number>(499);
  const [lead, setLead] = useState<PublicLead | null>(null);
  const [purchaseFired, setPurchaseFired] = useState(false);

  // Razorpay checkout.js + Meta Pixel + public config
  useEffect(() => {
    initMetaPixel();
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    document.body.appendChild(s);

    fetch(`${API_BASE_URL}/webinar/config`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.amount_inr) setAmountInr(d.amount_inr); })
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
        description: C.offer.priceLabel,
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

  return (
    <div className="min-h-screen bg-[#0a1628] text-white">
      {/* Top brand strip */}
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt={`${C.brand.name} logo`} className="h-9 w-auto" />
          <div className="leading-tight">
            <p className="text-sm font-bold tracking-wide">{C.brand.name}</p>
            <p className="text-[11px] text-white/50">{C.brand.tagline}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-10 px-4 py-10 md:grid-cols-2 md:py-16">
        {/* Hero / value */}
        <section>
          <span className="inline-block rounded-full bg-[#e63946]/15 px-3 py-1 text-xs font-semibold tracking-wider text-[#ff8f99]">
            {C.hero.badge}
          </span>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight md:text-4xl">
            {C.hero.title}
          </h1>
          <p className="mt-3 text-base text-white/70">{C.hero.subtitle}</p>
          <ul className="mt-6 space-y-3">
            {C.hero.bullets.map((b) => (
              <li key={b} className="flex items-start gap-3 text-sm text-white/85 md:text-base">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#e63946] text-[11px] font-bold">✓</span>
                {b}
              </li>
            ))}
          </ul>
          <div className="mt-8 rounded-xl border border-[#e63946]/30 bg-[#e63946]/10 p-4 text-sm text-[#ffb3b8]">
            {C.offer.bonus}
          </div>
        </section>

        {/* Checkout card */}
        <section className="self-start rounded-2xl bg-white p-6 text-slate-900 shadow-2xl md:p-8">
          {phase === "success" && lead ? (
            <SuccessPanel lead={lead} email={email} amountInr={amountInr} />
          ) : (
            <>
              <div className="mb-1 flex items-baseline justify-between">
                <h2 className="text-xl font-bold">{C.form.heading}</h2>
                <div className="text-right">
                  <p className="text-2xl font-extrabold text-[#e63946]">₹{amountInr}</p>
                  <p className="text-[11px] text-slate-500">{C.offer.priceNote}</p>
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
                  {phase === "paying" ? C.form.ctaProcessing : `Pay ₹${amountInr} & Book My Seat`}
                </button>
                <p className="text-center text-[11px] text-slate-400">{C.form.disclaimer}</p>
              </form>
            </>
          )}
        </section>
      </main>

      {/* Trust strip */}
      <footer className="border-t border-white/10 py-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-2 px-4 text-xs text-white/50">
          {C.trust.points.map((p) => <span key={p}>✓ {p}</span>)}
          <span>{C.trust.line}</span>
        </div>
      </footer>
    </div>
  );
}

function SuccessPanel({ lead, email, amountInr }: { lead: PublicLead; email: string; amountInr: number }) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl text-green-600">✓</div>
      <h2 className="text-xl font-bold text-slate-900">{C.success.title}</h2>
      <p className="mt-1 text-sm text-slate-500">₹{amountInr} · {C.offer.priceLabel}</p>

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
          Session: {new Date(lead.session_time).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
        </p>
      )}
      <p className="mt-4 text-xs text-slate-500">{C.success.emailNote} <b>{email}</b></p>

      <ul className="mt-5 space-y-2 border-t border-slate-200 pt-4 text-left text-sm text-slate-600">
        {C.success.nextSteps.map((s) => <li key={s}>• {s}</li>)}
      </ul>
    </div>
  );
}
