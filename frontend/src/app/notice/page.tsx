"use client";

import React, { Suspense } from "react";
import NoticeBoardClient from "./NoticeBoardClient";

export default function NoticePage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
          Loading Notice Board...
        </div>
      }
    >
      <NoticeBoardClient />
    </Suspense>
  );
}
