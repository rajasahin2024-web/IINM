"use client";
import React from "react";
import { AdminProvider } from "../../../components/ProtectedAdmin";
import SubCategoryManager from "../../../components/SubCategoryManager";

export default function SubCategoriesPage() {
  return (
    <AdminProvider>
      <SubCategoryManager />
    </AdminProvider>
  );
}
