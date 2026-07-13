"use client";
import React from "react";
import { AdminProvider } from "../../../../components/ProtectedAdmin";
import QuestionTypesManager from "../../../../components/QuestionTypesManager";

export default function QuestionTypesPage() {
  return (
    <AdminProvider>
      <QuestionTypesManager />
    </AdminProvider>
  );
}
