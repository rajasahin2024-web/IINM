"use client";
import { AdminProvider } from "../../components/ProtectedAdmin";
import StudentFeedbackManager from "../../components/StudentFeedbackManager";

export default function StudentFeedbackPage() {
  return (
    <AdminProvider>
      <StudentFeedbackManager />
    </AdminProvider>
  );
}
