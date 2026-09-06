"use client";
import React from "react";
import { AdminProvider } from "../../components/ProtectedAdmin";
import NoticeManager from "./NoticeManager";

export default function AdminNoticesPage() {
  return (
    <AdminProvider>
      <NoticeManager />
    </AdminProvider>
  );
}
