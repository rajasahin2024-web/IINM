"use client";
import React from "react";
import { AdminProvider } from "../../components/ProtectedAdmin";
import LeadershipManager from "./LeadershipManager";


export default function LeadershipPage() {
  return (
    <AdminProvider>
      <LeadershipManager />
    </AdminProvider>
  );
}
