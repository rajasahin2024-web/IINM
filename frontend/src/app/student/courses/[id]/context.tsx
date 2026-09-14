"use client";
import { createContext, useContext } from "react";
import type { StudentCourseDashboard } from "@/lib/studentApi";

export interface CourseContextValue {
  courseId: number;
  course: StudentCourseDashboard;
  reload: () => void;
  /** Timestamp captured when the dashboard payload arrived (drip locks). */
  nowTs: number;
  /** Cheap badge signals for nav chrome (live exam / unseen notices). */
  badges: { liveExam: boolean; newNotices: boolean };
}

export const CourseContext = createContext<CourseContextValue | null>(null);

export function useCourse(): CourseContextValue {
  const ctx = useContext(CourseContext);
  if (!ctx) throw new Error("useCourse must be used inside the course layout");
  return ctx;
}
