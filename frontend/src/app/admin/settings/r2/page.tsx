"use client";
import React from "react";
import { AdminProvider } from "../../components/ProtectedAdmin";
import R2BucketSettingsForm from "../../components/R2BucketSettingsForm";

export default function R2BucketSettingsPage() {
  return (
    <AdminProvider>
      <R2BucketSettingsForm />
    </AdminProvider>
  );
}
