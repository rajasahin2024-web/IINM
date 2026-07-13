"use client";
import React from "react";
import { AdminProvider } from "../../../../components/ProtectedAdmin";
import ComprehensionManager from "../../../../components/ComprehensionManager";

export default function ComprehensionsPage() {
  return (
    <AdminProvider>
      <ComprehensionManager />
    </AdminProvider>
  );
}
