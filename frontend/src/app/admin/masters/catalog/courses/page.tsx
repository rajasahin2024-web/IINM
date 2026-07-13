"use client";
import React from "react";
import { AdminProvider } from "../../../components/ProtectedAdmin";
import CourseManager from "../../../components/CourseManager";

export default function CoursesPage() {
  return (
    <AdminProvider>
      <CourseManager />
    </AdminProvider>
  );
}
