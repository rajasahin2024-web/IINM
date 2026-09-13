/**
 * studentApi – typed client for the student panel backend (`/api/student/*`).
 *
 * Auth model: the backend sets an httpOnly cookie (`iinm_student_token`) on
 * login; every call below sends `credentials: "include"` so the browser
 * attaches it. The backend is the auth guard — 401 means "not logged in".
 *
 * Response shapes follow the contract delivered by the backend student-auth
 * issue. The normalizers below are deliberately tolerant about envelope
 * naming (`items` vs `courses` vs bare arrays, nested `course`/`batch`
 * objects vs flat fields) so the UI keeps working if the backend wraps
 * payloads differently.
 */

import { API_BASE_URL } from "./config";

// ─── Types ───────────────────────────────────────────────────

export interface StudentProfile {
  id: number;
  first_name: string;
  last_name: string | null;
  email: string;
  phone: string | null;
  profile_photo_url: string | null;
}

export type EnrollmentStatus =
  | "active"
  | "waitlisted"
  | "graduated"
  | "suspended"
  | "cancelled"
  | string;

export interface StudentInstallment {
  installmentNo: number | null;
  name: string | null;
  dueDate: string | null;
  amount: number | null;
  paidAmount: number | null;
  status: string | null;
}

export interface StudentCourseCard {
  courseId: number;
  title: string;
  slug: string | null;
  thumbnailUrl: string | null;
  batchId: number | null;
  batchName: string | null;
  batchMode: string | null;
  batchStatus: string | null;
  enrollmentStatus: EnrollmentStatus | null;
  joinDate: string | null;
  netFee: number | null;
  paidAmount: number | null;
  dueAmount: number | null;
  purchaseStatus: string | null;
  invoiceUuid: string | null;
  isInstallment: boolean;
  totalInstallments: number | null;
  nextInstallment: StudentInstallment | null;
  progressPercent: number;
  completedMaterials: number;
  totalMaterials: number;
}

export interface StudentMaterial {
  id: number;
  title: string;
  fileType: string | null;
  fileUrl: string | null;
  hlsUrl: string | null;
  youtubeUrl: string | null;
  thumbnailUrl: string | null;
  isCompleted: boolean;
}

export interface StudentChapter {
  id: number;
  title: string;
  orderPosition: number;
  isCompleted: boolean;
  completedDate: string | null;
  unlockDate: string | null;
  notes: string | null;
  materials: StudentMaterial[];
  liveClasses: StudentLiveClass[];
}

export interface StudentLiveClass {
  id: number;
  title: string;
  meetingUrl: string | null;
  scheduledAt: string | null;
  chapterTitle: string | null;
}

export interface StudentRoutine {
  dayOfWeek: string;
  startTime: string | null;
  endTime: string | null;
}

export interface StudentCourseDashboard {
  courseId: number;
  title: string;
  slug: string | null;
  thumbnailUrl: string | null;
  description: string | null;
  batchId: number | null;
  batchName: string | null;
  batchMode: string | null;
  batchStatus: string | null;
  meetingUrl: string | null;
  startDate: string | null;
  endDate: string | null;
  enrollmentStatus: EnrollmentStatus | null;
  joinDate: string | null;
  instructorName: string | null;
  skillLevel: string | null;
  progressPercent: number;
  completedMaterials: number | null;
  totalMaterials: number | null;
  totalChapters: number | null;
  taughtChapters: number | null;
  netFee: number | null;
  paidAmount: number | null;
  dueAmount: number | null;
  purchaseStatus: string | null;
  invoiceUuid: string | null;
  routines: StudentRoutine[];
  liveClasses: StudentLiveClass[];
  chapters: StudentChapter[];
}

export class StudentApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// ─── HTTP helpers ────────────────────────────────────────────

async function studentFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    ...init,
  });
}

async function readDetail(res: Response, fallback: string): Promise<string> {
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  const detail = data.detail ?? data.message;
  return typeof detail === "string" && detail ? detail : fallback;
}

// ─── Auth ────────────────────────────────────────────────────

export async function getStudentMe(): Promise<StudentProfile> {
  const res = await studentFetch("/student/me");
  if (res.status === 401) throw new StudentApiError(401, "Not authenticated");
  if (!res.ok) throw new StudentApiError(res.status, await readDetail(res, "Failed to load profile"));
  const data = (await res.json()) as Record<string, unknown>;
  const s = (data.student ?? data) as Record<string, unknown>;
  return {
    id: num(s.id) ?? 0,
    first_name: str(s.first_name) ?? "Student",
    last_name: str(s.last_name),
    email: str(s.email) ?? "",
    phone: str(s.phone),
    profile_photo_url: str(s.profile_photo_url),
  };
}

export async function studentLogout(): Promise<void> {
  await studentFetch("/student/logout", { method: "POST" }).catch(() => null);
}

export async function forgotPassword(email: string): Promise<void> {
  const res = await studentFetch("/student/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  // Endpoint always returns a generic 200; surface only transport errors.
  if (!res.ok && res.status !== 429) return;
  if (res.status === 429) throw new StudentApiError(429, await readDetail(res, "Please wait before requesting another reset link."));
}

export async function resetPassword(token: string, password: string): Promise<void> {
  const res = await studentFetch("/student/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password }),
  });
  if (!res.ok) {
    throw new StudentApiError(res.status, await readDetail(res, "This reset link is invalid or has expired."));
  }
}

// ─── Courses ─────────────────────────────────────────────────

export async function getMyCourses(): Promise<StudentCourseCard[]> {
  const res = await studentFetch("/student/my-courses");
  if (res.status === 401) throw new StudentApiError(401, "Not authenticated");
  if (!res.ok) throw new StudentApiError(res.status, await readDetail(res, "Failed to load courses"));
  const data = (await res.json()) as unknown;
  const list = pickList(data, ["items", "courses", "data", "enrollments"]);
  return list.map(normalizeCourseCard);
}

export async function getStudentCourse(courseId: number): Promise<StudentCourseDashboard> {
  const res = await studentFetch(`/student/courses/${courseId}`);
  if (res.status === 401) throw new StudentApiError(401, "Not authenticated");
  if (res.status === 403) throw new StudentApiError(403, "You do not have access to this course");
  if (res.status === 404) throw new StudentApiError(404, "Course not found");
  if (!res.ok) throw new StudentApiError(res.status, await readDetail(res, "Failed to load course"));
  const data = (await res.json()) as Record<string, unknown>;
  return normalizeDashboard(data);
}

// ─── Normalizers (tolerant of envelope variants) ─────────────

type Rec = Record<string, unknown>;

function asRec(v: unknown): Rec {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Rec) : {};
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
  return null;
}

function bool(v: unknown): boolean {
  return v === true || v === "true" || v === 1;
}

function pickList(data: unknown, keys: string[]): Rec[] {
  if (Array.isArray(data)) return data.map(asRec);
  const rec = asRec(data);
  for (const k of keys) {
    if (Array.isArray(rec[k])) return (rec[k] as unknown[]).map(asRec);
  }
  return [];
}

function firstStr(...vals: unknown[]): string | null {
  for (const v of vals) {
    const s = str(v);
    if (s) return s;
  }
  return null;
}

function firstNum(...vals: unknown[]): number | null {
  for (const v of vals) {
    const n = num(v);
    if (n !== null) return n;
  }
  return null;
}

function normalizeInstallment(v: unknown): StudentInstallment | null {
  const r = asRec(v);
  if (Object.keys(r).length === 0) return null;
  return {
    installmentNo: num(r.installment_no),
    name: str(r.name),
    dueDate: str(r.due_date),
    amount: num(r.amount),
    paidAmount: num(r.paid_amount),
    status: str(r.status),
  };
}

function normalizeCourseCard(raw: Rec): StudentCourseCard {
  const course = asRec(raw.course);
  const batch = asRec(raw.batch);
  const enrollment = asRec(raw.enrollment);
  const payment = asRec(raw.payment);
  const progress = asRec(raw.progress);

  const pct =
    firstNum(
      progress.progress_pct,
      progress.percent,
      raw.progress_percent,
      raw.progress_pct,
      raw.progress
    ) ?? 0;

  return {
    courseId: firstNum(raw.course_id, course.id, raw.id) ?? 0,
    title: firstStr(raw.title, course.title) ?? "Untitled course",
    slug: firstStr(raw.slug, course.slug),
    thumbnailUrl: firstStr(raw.thumbnail_url, raw.thumbnail, course.thumbnail_url),
    batchId: firstNum(raw.batch_id, batch.id),
    batchName: firstStr(raw.batch_name, batch.name),
    batchMode: firstStr(raw.batch_mode, batch.mode),
    batchStatus: firstStr(raw.batch_status, batch.status),
    enrollmentStatus: firstStr(raw.enrollment_status, enrollment.status, raw.status),
    joinDate: firstStr(raw.join_date, enrollment.join_date),
    netFee: firstNum(payment.net_fee, raw.net_fee),
    paidAmount: firstNum(payment.paid_amount, raw.paid_amount),
    dueAmount: firstNum(payment.due_amount, raw.due_amount),
    purchaseStatus: firstStr(payment.status, payment.purchase_status, raw.purchase_status),
    invoiceUuid: firstStr(payment.invoice_uuid, raw.invoice_uuid),
    isInstallment: bool(payment.is_installment ?? raw.is_installment),
    totalInstallments: firstNum(payment.total_installments, raw.total_installments),
    nextInstallment: normalizeInstallment(payment.next_installment),
    progressPercent: Math.max(0, Math.min(100, pct)),
    completedMaterials: firstNum(progress.completed_materials, progress.completed) ?? 0,
    totalMaterials: firstNum(progress.total_materials, progress.total) ?? 0,
  };
}

function normalizeMaterial(raw: Rec): StudentMaterial {
  return {
    id: num(raw.id) ?? 0,
    title: str(raw.title) ?? "Untitled material",
    fileType: firstStr(raw.file_type, raw.type),
    fileUrl: firstStr(raw.file_url, raw.url),
    hlsUrl: str(raw.hls_url),
    youtubeUrl: str(raw.youtube_url),
    thumbnailUrl: str(raw.thumbnail_url),
    isCompleted: bool(raw.is_completed ?? raw.completed),
  };
}

function normalizeChapter(raw: Rec): StudentChapter {
  const materials = Array.isArray(raw.materials) ? raw.materials.map(asRec).map(normalizeMaterial) : [];
  const chapterTitle = str(raw.title);
  const liveClasses = (Array.isArray(raw.live_classes) ? raw.live_classes : [])
    .map(asRec)
    .map((lc) => {
      const cls = normalizeLiveClass(lc);
      return { ...cls, chapterTitle: cls.chapterTitle ?? chapterTitle };
    });
  return {
    id: num(raw.id) ?? 0,
    title: chapterTitle ?? "Untitled chapter",
    orderPosition: num(raw.order_position) ?? 0,
    // Backend field is `is_taught` (batch chapter progress)
    isCompleted: bool(raw.is_taught ?? raw.is_completed ?? raw.completed),
    completedDate: firstStr(raw.taught_date, raw.completed_date, raw.completed_at),
    unlockDate: str(raw.unlock_date),
    notes: str(raw.notes),
    materials,
    liveClasses,
  };
}

function normalizeLiveClass(raw: Rec): StudentLiveClass {
  const chapter = asRec(raw.chapter);
  return {
    id: num(raw.id) ?? 0,
    title: str(raw.title) ?? "Live class",
    meetingUrl: firstStr(raw.meeting_url, raw.url, raw.join_url),
    scheduledAt: firstStr(raw.scheduled_at, raw.starts_at, raw.date),
    chapterTitle: firstStr(raw.chapter_title, chapter.title),
  };
}

function normalizeRoutine(raw: Rec): StudentRoutine {
  return {
    dayOfWeek: firstStr(raw.day_of_week, raw.day) ?? "",
    startTime: firstStr(raw.start_time, raw.start),
    endTime: firstStr(raw.end_time, raw.end),
  };
}

function normalizeDashboard(raw: Rec): StudentCourseDashboard {
  const course = asRec(raw.course);
  const batch = asRec(raw.batch);
  const enrollment = asRec(raw.enrollment);
  const payment = asRec(raw.payment);
  const progress = asRec(raw.progress);

  const chapters = pickList(
    Array.isArray(raw.chapters) ? raw.chapters : asRec(raw.content).chapters ?? raw.chapters,
    []
  ).map(normalizeChapter);

  // Live classes arrive nested per-chapter in the real contract; also accept a
  // top-level list if the backend ever flattens them.
  const topLevel = pickList(
    raw.live_classes ?? raw.liveClasses ?? asRec(raw.schedule).live_classes,
    []
  ).map(normalizeLiveClass);
  const liveClasses =
    topLevel.length > 0 ? topLevel : chapters.flatMap((c) => c.liveClasses);

  const routines = pickList(
    raw.routines ?? raw.routine ?? batch.routines ?? asRec(raw.schedule).routines,
    []
  ).map(normalizeRoutine);

  const derivedTotal = chapters.reduce((acc, c) => acc + c.materials.length, 0);
  const derivedDone = chapters.reduce(
    (acc, c) => acc + c.materials.filter((m) => m.isCompleted).length,
    0
  );

  return {
    courseId: firstNum(raw.course_id, course.id, raw.id) ?? 0,
    title: firstStr(raw.title, course.title) ?? "Untitled course",
    slug: firstStr(raw.slug, course.slug),
    thumbnailUrl: firstStr(raw.thumbnail_url, raw.thumbnail, course.thumbnail_url),
    description: firstStr(raw.description, course.description),
    batchId: firstNum(raw.batch_id, batch.id),
    batchName: firstStr(raw.batch_name, batch.name),
    batchMode: firstStr(raw.batch_mode, batch.mode),
    batchStatus: firstStr(raw.batch_status, batch.status),
    meetingUrl: firstStr(raw.meeting_url, batch.meeting_url),
    startDate: firstStr(raw.start_date, batch.start_date),
    endDate: firstStr(raw.end_date, batch.end_date),
    enrollmentStatus: firstStr(raw.enrollment_status, enrollment.status, raw.status),
    joinDate: firstStr(raw.join_date, enrollment.join_date),
    instructorName: firstStr(raw.instructor_name, course.instructor_name),
    skillLevel: firstStr(raw.skill_level, course.skill_level),
    progressPercent: Math.max(
      0,
      Math.min(
        100,
        firstNum(progress.progress_pct, progress.percent, progress.value, raw.progress_percent, raw.progress) ??
          (derivedTotal > 0 ? Math.round((derivedDone / derivedTotal) * 100) : 0)
      )
    ),
    completedMaterials: firstNum(progress.completed_materials, progress.completed, raw.completed_materials) ?? derivedDone,
    totalMaterials: firstNum(progress.total_materials, progress.total, raw.total_materials) ?? derivedTotal,
    totalChapters: firstNum(progress.total_chapters, raw.total_chapters) ?? chapters.length,
    taughtChapters: firstNum(progress.taught_chapters, raw.taught_chapters),
    netFee: firstNum(payment.net_fee, raw.net_fee),
    paidAmount: firstNum(payment.paid_amount, raw.paid_amount),
    dueAmount: firstNum(payment.due_amount, raw.due_amount),
    purchaseStatus: firstStr(payment.status, payment.purchase_status, raw.purchase_status),
    invoiceUuid: firstStr(payment.invoice_uuid, raw.invoice_uuid),
    routines,
    liveClasses,
    chapters,
  };
}

// ─── Display helpers ─────────────────────────────────────────

export function formatINR(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return "—";
  return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export function enrollmentLabel(status: string | null | undefined): string {
  switch ((status ?? "").toLowerCase()) {
    case "active":
      return "Active";
    case "admitted":
      return "Admitted";
    case "waitlisted":
    case "waitlist":
      return "Waitlisted";
    case "graduated":
    case "completed":
      return "Completed";
    case "suspended":
      return "Suspended";
    case "cancelled":
    case "canceled":
      return "Cancelled";
    default:
      return status ? status.charAt(0).toUpperCase() + status.slice(1) : "Enrolled";
  }
}

export type BadgeTone = "green" | "amber" | "blue" | "red" | "gray";

export function enrollmentTone(status: string | null | undefined): BadgeTone {
  switch ((status ?? "").toLowerCase()) {
    case "active":
    case "admitted":
      return "green";
    case "waitlisted":
    case "waitlist":
      return "amber";
    case "graduated":
    case "completed":
      return "blue";
    case "suspended":
    case "cancelled":
    case "canceled":
      return "red";
    default:
      return "gray";
  }
}
