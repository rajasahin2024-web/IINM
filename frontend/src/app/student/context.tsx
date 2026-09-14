"use client";
import { createContext, useContext } from "react";
import type { StudentProfile } from "@/lib/studentApi";

export interface StudentContextValue {
  profile: StudentProfile;
  logout: () => Promise<void>;
  siteName: string;
  darkLogoUrl: string;
}

export const StudentContext = createContext<StudentContextValue | null>(null);

export function useStudent(): StudentContextValue {
  const ctx = useContext(StudentContext);
  if (!ctx) throw new Error("useStudent must be used inside the /student layout");
  return ctx;
}
