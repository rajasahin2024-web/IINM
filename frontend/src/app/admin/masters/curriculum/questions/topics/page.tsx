"use client";
import React from "react";
import { AdminProvider } from "../../../../components/ProtectedAdmin";
import TopicsTagsManager from "../../../../components/TopicsTagsManager";

export default function TopicsPage() {
  return (
    <AdminProvider>
      <TopicsTagsManager />
    </AdminProvider>
  );
}
