"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { cachedFetch } from "@/lib/apiCache";
import { BASE_URL } from "@/lib/config";
import SIcon from "../icons";

interface ContactSettings {
  phone1?: string;
  phone2?: string;
  whatsapp?: string;
  email1?: string;
  email2?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  pin_code?: string;
  weekday_hours?: string;
  weekend_hours?: string;
  [key: string]: string | undefined;
}

const FAQS = [
  {
    q: "How do I join my live class?",
    a: "Open your course → Live Classes. Tap Join next to the session at the scheduled time.",
  },
  {
    q: "Where can I see my fee receipt?",
    a: "Open your course → Payments & Invoices. Your invoice and receipt links are at the top.",
  },
  {
    q: "My exam is locked — what do I do?",
    a: "Locked exams usually need a chapter or material completed first. Check the lock reason on the Exams page, or contact support.",
  },
  {
    q: "How do I get my certificate?",
    a: "Complete all course materials, then open your course → Certificate to download and verify it.",
  },
];

function digits(v: string | undefined): string {
  return (v ?? "").replace(/[^\d]/g, "");
}

export default function StudentHelpPage() {
  const [contact, setContact] = useState<ContactSettings | null>(null);

  useEffect(() => {
    let cancelled = false;
    cachedFetch<ContactSettings>(`${BASE_URL}/api/contact/settings`, 60_000)
      .then((d) => !cancelled && setContact(d))
      .catch(() => !cancelled && setContact({}));
    return () => {
      cancelled = true;
    };
  }, []);

  const phone = contact?.phone1 || contact?.phone2 || "";
  const wa = digits(contact?.whatsapp || contact?.phone1);
  const email = contact?.email1 || contact?.email2 || "";
  const address = [contact?.address_line1, contact?.address_line2, contact?.city, contact?.state, contact?.pin_code]
    .filter(Boolean)
    .join(", ");

  return (
    <>
      <div className="stu-page-head">
        <h1 className="stu-page-title">Help &amp; Support</h1>
        <p className="stu-page-sub">Reach admissions or support — we usually reply the same day.</p>
      </div>

      <div className="stu-help-grid">
        {phone && (
          <a href={`tel:${digits(phone)}`} className="stu-help-card">
            <span className="stu-help-icon" aria-hidden="true">
              <SIcon name="phone" size={22} />
            </span>
            <span className="stu-help-title">Call admissions</span>
            <span className="stu-help-sub">{phone}</span>
          </a>
        )}
        {wa && (
          <a
            href={`https://wa.me/${wa}`}
            target="_blank"
            rel="noreferrer"
            className="stu-help-card"
          >
            <span className="stu-help-icon" aria-hidden="true">
              <SIcon name="whatsapp" size={22} />
            </span>
            <span className="stu-help-title">WhatsApp us</span>
            <span className="stu-help-sub">Chat with the support team</span>
          </a>
        )}
        {email && (
          <a href={`mailto:${email}`} className="stu-help-card">
            <span className="stu-help-icon" aria-hidden="true">
              <SIcon name="mail" size={22} />
            </span>
            <span className="stu-help-title">Email support</span>
            <span className="stu-help-sub">{email}</span>
          </a>
        )}
        {address && (
          <div className="stu-help-card">
            <span className="stu-help-icon" aria-hidden="true">
              <SIcon name="map-pin" size={22} />
            </span>
            <span className="stu-help-title">Visit us</span>
            <span className="stu-help-sub">{address}</span>
          </div>
        )}
      </div>

      {(contact?.weekday_hours || contact?.weekend_hours) && (
        <p className="stu-page-sub" style={{ marginBottom: 14 }}>
          Support hours: {contact?.weekday_hours ?? ""}
          {contact?.weekday_hours && contact?.weekend_hours ? " · " : ""}
          {contact?.weekend_hours ? `Weekends ${contact.weekend_hours}` : ""}
        </p>
      )}

      <section className="stu-section" aria-labelledby="help-faq">
        <div className="stu-section-head">
          <h2 className="stu-section-title" id="help-faq">
            <SIcon name="help" size={19} />
            Common questions
          </h2>
        </div>
        <div className="stu-section-body">
          {FAQS.map((f) => (
            <details className="stu-faq" key={f.q}>
              <summary className="stu-faq-q">
                {f.q}
                <SIcon name="chevron" size={16} />
              </summary>
              <p className="stu-faq-a">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <Link href="/contact-us" className="stu-btn-ghost" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8 }}>
        <SIcon name="external" size={16} />
        Open the full contact page
      </Link>
    </>
  );
}
