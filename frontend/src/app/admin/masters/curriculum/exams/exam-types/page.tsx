"use client";
import React from "react";
import { AdminProvider } from "../../../../components/ProtectedAdmin";
import ExamTypesManager from "../../../../components/ExamTypesManager";

export default function ExamTypesPage() {
  return (
    <AdminProvider>
      <ExamTypesManager />
    </AdminProvider>
  );
}
