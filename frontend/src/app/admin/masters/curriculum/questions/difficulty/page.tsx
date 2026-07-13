"use client";
import React from "react";
import { AdminProvider } from "../../../../components/ProtectedAdmin";
import DifficultyManager from "../../../../components/DifficultyManager";

export default function DifficultyPage() {
  return (
    <AdminProvider>
      <DifficultyManager />
    </AdminProvider>
  );
}
