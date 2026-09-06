import React, { Suspense } from "react";
import type { Metadata } from "next";
import AdmissionClientView from "./AdmissionClientView";

export const metadata: Metadata = {
  title: "Online Admission & Slot Booking | Indian Institute of New Media",
  description:
    "Apply online and reserve your admission slot for AI, Automation, Digital Media, and Future Tech certification courses at IINM. Secure your batch seat with instant verification and official receipt.",
  keywords: [
    "IINM Admission",
    "Slot Booking",
    "Online Course Admission",
    "AI Course Enrollment",
    "Indian Institute of New Media Admissions",
  ],
  openGraph: {
    title: "Online Admission & Slot Booking | Indian Institute of New Media",
    description:
      "Reserve your admission slot for premier AI & Media courses at IINM. Instant batch allocation and official registration receipt.",
    type: "website",
  },
};

export default function AdmissionPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                width: 44,
                height: 44,
                border: "3px solid #e2e8f0",
                borderTopColor: "#4338ca",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
                margin: "0 auto 16px",
              }}
            />
            <p style={{ color: "#64748b", fontSize: "14px", fontWeight: 500 }}>
              Loading Admission Portal…
            </p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      }
    >
      <AdmissionClientView />
    </Suspense>
  );
}
