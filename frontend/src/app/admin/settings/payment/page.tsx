"use client";
import React from "react";
import { AdminProvider } from "../../components/ProtectedAdmin";
import PaymentSettingsForm from "../../components/PaymentSettingsForm";

export default function PaymentSettingsPage() {
  return (
    <AdminProvider>
      <PaymentSettingsForm />
    </AdminProvider>
  );
}
