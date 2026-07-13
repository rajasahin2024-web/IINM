"use client";
import React from "react";
import { AdminProvider } from "../../../components/ProtectedAdmin";
import CurriculumManager from "../../../components/CurriculumManager";

export default function SyllabusPage() {
  return (
    <AdminProvider>
      <CurriculumManager />
    </AdminProvider>
  );
}
