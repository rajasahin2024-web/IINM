import React, { Suspense } from "react";
import type { Metadata } from "next";
import AdmissionVerificationClient from "./AdmissionVerificationClient";

export const metadata: Metadata = {
  title: "Online Admission Verification | Central Academic Registry | IINM",
  description:
    "Verify student admission status, course enrollments, batch allocations, and academic credentials online. Official student verification portal of Indian Institute of New Media.",
  keywords: [
    "IINM Admission Verification",
    "Student Verification Portal",
    "Verify Student Enrollment",
    "IINM Registration Check",
    "Indian Institute of New Media Credentials",
  ],
  openGraph: {
    title: "Online Admission Verification | Indian Institute of New Media",
    description:
      "Verify student admission status, course enrollments, batch allocations, and academic credentials online.",
    type: "website",
  },
};

export default function VerificationPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            background: "#f8fafc",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: "16px",
            color: "#64748b",
            fontSize: "15px",
            fontWeight: 500,
          }}
        >
          <div
            style={{
              width: "42px",
              height: "42px",
              border: "3px solid #e2e8f0",
              borderTopColor: "#4338ca",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <span>Loading Admission Verification Portal…</span>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      }
    >
      <AdmissionVerificationClient />
    </Suspense>
  );
}
