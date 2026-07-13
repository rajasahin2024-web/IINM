"use client";
import React from "react";
import { AdminProvider } from "../../components/ProtectedAdmin";
import EmailSettingsForm from "../../components/EmailSettingsForm";

export default function EmailSettingsPage() {
  return (
    <AdminProvider>
      <EmailSettingsForm />
    </AdminProvider>
  );
}
