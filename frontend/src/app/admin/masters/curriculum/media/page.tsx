"use client";
import React from "react";
import { AdminProvider } from "../../../components/ProtectedAdmin";
import CourseMaterialsManager from "../../../components/CourseMaterialsManager";

export default function CourseMaterialsPage() {
  return (
    <AdminProvider>
      <CourseMaterialsManager />
    </AdminProvider>
  );
}
