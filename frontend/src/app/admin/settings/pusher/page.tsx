"use client";
import React from "react";
import { AdminProvider } from "../../components/ProtectedAdmin";
import PusherSettingsForm from "../../components/PusherSettingsForm";

export default function PusherSettingsPage() {
  return (
    <AdminProvider>
      <PusherSettingsForm />
    </AdminProvider>
  );
}
