"use client";
import React from "react";
import { AdminProvider } from "../../../components/ProtectedAdmin";
import CategoryManager from "../../../components/CategoryManager";

export default function CategoriesPage() {
  return (
    <AdminProvider>
      <CategoryManager />
    </AdminProvider>
  );
}
