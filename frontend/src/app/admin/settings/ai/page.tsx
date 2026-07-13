"use client";
import React from "react";
import { AdminProvider } from "../../components/ProtectedAdmin";
import AISettingsForm from "../../components/AISettingsForm";

export default function AISettingsPage() {
  return (
    <AdminProvider>
      <AISettingsForm />
    </AdminProvider>
  );
}
