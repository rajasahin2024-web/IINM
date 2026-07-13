"use client";
import React from "react";
import { AdminProvider } from "../../../components/ProtectedAdmin";
import SubjectManager from "../../../components/SubjectManager";

export default function SubjectsPage() {
  return (
    <AdminProvider>
      <SubjectManager />
    </AdminProvider>
  );
}
