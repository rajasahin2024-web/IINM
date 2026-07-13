"use client";
import React from "react";
import { AdminProvider } from "../../components/ProtectedAdmin";
import SiteSettingsForm from "../../components/SiteSettingsForm";

export default function SiteSettingsPage() {
  return (
    <AdminProvider>
      <SiteSettingsForm />
    </AdminProvider>
  );
}
