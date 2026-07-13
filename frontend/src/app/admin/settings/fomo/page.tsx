"use client";
import React from "react";
import { AdminProvider } from "../../components/ProtectedAdmin";
import FomoSettingsForm from "../../components/FomoSettingsForm";

export default function FomoSettingsPage() {
  return (
    <AdminProvider>
      <FomoSettingsForm />
    </AdminProvider>
  );
}
