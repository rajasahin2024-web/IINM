import React from "react";
import type { Metadata } from "next";
import WebinarLanding from "./WebinarLanding";
import { webinarCopy } from "./copy";

export const metadata: Metadata = {
  title: webinarCopy.meta.title,
  description: webinarCopy.meta.description,
  robots: { index: true, follow: true },
  openGraph: {
    title: webinarCopy.meta.title,
    description: webinarCopy.meta.description,
    type: "website",
  },
};

export default function WebinarPage() {
  return <WebinarLanding />;
}
