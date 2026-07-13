"use client";
import React from "react";
import { AdminProvider } from "../../../../components/ProtectedAdmin";
import ExamsManager from "../../../../components/ExamsManager";

export default function ExamsPage() {
  return (
    <AdminProvider>
      <ExamsManager />
    </AdminProvider>
  );
}
