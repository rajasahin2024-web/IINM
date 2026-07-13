import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AnalyticsScripts from "@/components/AnalyticsScripts";
import MaintenanceGuard from "@/components/MaintenanceGuard";
import SiteHeadUpdater from "@/components/SiteHeadUpdater";
import FomoNotification from "@/components/FomoNotification";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });

export const metadata: Metadata = {
  title: "IINM",
  description: "IINM Learning Management System Admin Panel",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SiteHeadUpdater />
        <AnalyticsScripts />
        <MaintenanceGuard>{children}</MaintenanceGuard>
        <FomoNotification />
      </body>
    </html>
  );
}
