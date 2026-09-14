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
import { cachedFetch, invalidateCache } from "./apiCache";

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
  instructorName: string | null;
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

// ─── Course panel types ──────────────────────────────────────

export type ExamItemState =
  | "upcoming"
  | "available"
  | "in_progress"
  | "locked"
  | "completed"
  | "expired";

export interface ExamAttemptSummary {
  attemptId: number;
  attemptNo: number;
  status: "in_progress" | "submitted" | "expired" | string;
  startedAt: string | null;
  submittedAt: string | null;
  score: number | null;
  totalMarks: number | null;
  passed: boolean | null;
  remainingSeconds: number;
}

export interface StudentExamItem {
  assignmentId: number;
  examId: number | null;
  examTitle: string;
  examCode: string | null;
  examType: string | null;
  questionCount: number;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  durationMins: number | null;
  passMarks: number | null;
  passPercentage: number | null;
  state: ExamItemState;
  unlockReason: string | null;
  attemptsUsed: number;
  attemptsAllowed: number | null;
  attemptsRemaining: number | null;
  canRetake: boolean;
  activeAttempt: ExamAttemptSummary | null;
  result: {
    bestScore: number | null;
    totalMarks: number | null;
    passed: boolean | null;
    lastSubmittedAt: string | null;
    submittedAttempts: number;
  } | null;
}

export interface ExamQuestionPublic {
  examQuestionId: number;
  questionId: number;
  orderPosition: number;
  marks: number;
  negativeMarks: number;
  questionTypeCode: string | null;
  questionHtml: string | null;
  hintHtml: string | null;
  options: { id: number; contentHtml: string | null; orderIndex: number }[];
  savedAnswer: { selectedOptionIds: number[] | null; answerText: string | null } | null;
}

export interface ExamAttemptDetail {
  attempt: ExamAttemptSummary;
  exam: {
    examId: number | null;
    title: string | null;
    description: string | null;
    durationMins: number | null;
    passMarks: number | null;
    negativeMarking: boolean;
  };
  questions: ExamQuestionPublic[];
}

export interface ExamAnswerInput {
  question_id: number;
  selected_option_ids?: number[] | null;
  answer_text?: string | null;
}

export interface ResultReviewItem {
  examQuestionId: number;
  questionId: number;
  questionTypeCode: string | null;
  questionHtml: string | null;
  marks: number;
  negativeMarks: number;
  yourAnswer: { selectedOptionIds: number[] | null; answerText: string | null } | null;
  isCorrect: boolean | null;
  marksAwarded: number | null;
  options: { id: number; contentHtml: string | null; isCorrect?: boolean }[];
  solutionHtml: string | null;
}

export interface StudentResultItem extends ExamAttemptSummary {
  assignmentId: number;
  examId: number | null;
  examTitle: string;
  examType: string | null;
  passMarks: number | null;
  passPercentage: number | null;
  solutionsVisible: boolean;
  review: ResultReviewItem[] | null;
}

export interface CoursePayments {
  purchase: {
    purchaseId: number;
    status: string | null;
    totalFee: number | null;
    discount: number | null;
    netFee: number | null;
    paidAmount: number | null;
    dueAmount: number | null;
    refundedAmount: number | null;
    isInstallment: boolean;
    totalInstallments: number | null;
    installmentFrequency: string | null;
    invoiceUuid: string | null;
    invoiceUrl: string | null;
    receiptUrl: string | null;
  } | null;
  installments: {
    id: number;
    installmentNo: number | null;
    name: string | null;
    dueDate: string | null;
    amount: number | null;
    paidAmount: number | null;
    status: string | null;
    paymentMethod: string | null;
    referenceNo: string | null;
    paidAt: string | null;
  }[];
  transactions: {
    id: number;
    amount: number | null;
    paymentMethod: string | null;
    referenceNo: string | null;
    notes: string | null;
    status: string | null;
    screenshotUrl: string | null;
    createdAt: string | null;
  }[];
}

export interface StudentNotice {
  id: number;
  title: string;
  noticeNo: string | null;
  noticeDate: string | null;
  category: string;
  description: string | null;
  coverImage: string | null;
  attachmentUrl: string | null;
  attachmentName: string | null;
  isPinned: boolean;
  scope: "batch" | "institute";
  createdAt: string | null;
}

export interface CourseCertificate {
  state: "not_eligible" | "pending" | "eligible";
  reason?: string;
  certificate?: {
    studentName: string;
    registrationNo: string;
    courseTitle: string;
    courseId: number;
    batchName: string | null;
    completionDate: string | null;
    verificationCode: string;
    verificationUrl: string;
    certificateImageUrl: string | null;
  };
  progress?: {
    totalMaterials: number;
    completedMaterials: number;
    progressPct: number;
  };
}

export interface StudentFullProfile {
  id: number;
  first_name: string;
  last_name: string | null;
  email: string;
  phone: string | null;
  alternative_phone: string | null;
  date_of_birth: string | null;
  gender: string | null;
  city: string | null;
  state: string | null;
  pin_code: string | null;
  address: string | null;
  profile_photo_url: string | null;
  highest_qualification: string | null;
  current_occupation: string | null;
  student_category: string | null;
  job_title: string | null;
  company_name: string | null;
  work_experience: string | null;
  linkedin_url: string | null;
  preferred_language: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  created_at: string | null;
}

export type StudentProfilePatch = Partial<Omit<StudentFullProfile, "id" | "email" | "created_at">>;

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
  // 200 = reset email actually sent (or still valid inside the resend
  // cooldown). 404 = no account for this email, 503 = mail service down —
  // both surface to the caller as errors.
  if (res.ok) return;
  const fallbacks: Record<number, string> = {
    404: "No account found for this email address.",
    429: "Please wait before requesting another reset link.",
    503: "Email service is temporarily unavailable. Please contact support.",
  };
  throw new StudentApiError(
    res.status,
    await readDetail(res, fallbacks[res.status] ?? "Unable to send the reset link. Please try again.")
  );
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

/** "a, b" from an instructors list like [{id, name}] — null when empty/absent. */
function joinNames(v: unknown): string | null {
  if (!Array.isArray(v)) return null;
  const names = v.map(asRec).map((i) => str(i.name)).filter((n): n is string => n !== null);
  return names.length > 0 ? names.join(", ") : null;
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
    instructorName:
      firstStr(raw.instructor_name, raw.instructor, course.instructor_name) ??
      joinNames(raw.instructors ?? batch.instructors),
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

// ─── Course panel endpoints (TEC-52 contract) ────────────────
//
// GETs go through cachedFetch (in-flight dedup + short TTL) per frontend
// rules — cookie auth is preserved by passing credentials:"include" through.
// Mutations and the live-attempt GET stay uncached; mutations invalidate the
// related cache keys so the next read is fresh.

const STUDENT_GET_INIT: RequestInit = { credentials: "include" };

function studentUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

async function studentGet<T>(path: string, ttl = 20_000): Promise<T> {
  const url = studentUrl(path);
  try {
    return await cachedFetch<T>(url, ttl, STUDENT_GET_INIT);
  } catch (e) {
    // cachedFetch wraps non-2xx as a plain Error — re-fetch statusless.
    if (e instanceof Error && /cachedFetch 401/.test(e.message)) {
      throw new StudentApiError(401, "Not authenticated");
    }
    const m = /cachedFetch (\d+)/.exec(e instanceof Error ? e.message : "");
    throw new StudentApiError(m ? Number(m[1]) : 0, "Request failed");
  }
}

export async function getCourseExams(courseId: number): Promise<StudentExamItem[]> {
  const data = await studentGet<{ exams?: Rec[] }>(`/student/courses/${courseId}/exams`, 15_000);
  return (data.exams ?? []).map(normalizeExamItem);
}

export async function startExamAttempt(
  assignmentId: number
): Promise<{ attempt: ExamAttemptSummary; resumed: boolean }> {
  const res = await studentFetch(`/student/exam-assignments/${assignmentId}/start`, { method: "POST" });
  if (!res.ok) throw new StudentApiError(res.status, await readDetail(res, "Could not start the exam"));
  const data = (await res.json()) as Rec;
  // Exam state changed (attempts_used / active_attempt) — drop the short-TTL
  // caches so lists re-fetch fresh on the next mount.
  invalidateCache();
  return { attempt: normalizeAttemptSummary(asRec(data.attempt)), resumed: bool(data.resumed) };
}

/** Live attempt state — deliberately NOT cached (timer is authoritative). */
export async function getExamAttempt(attemptId: number): Promise<ExamAttemptDetail> {
  const res = await studentFetch(`/student/exam-attempts/${attemptId}`);
  if (res.status === 401) throw new StudentApiError(401, "Not authenticated");
  if (res.status === 404) throw new StudentApiError(404, "Exam attempt not found");
  if (!res.ok) throw new StudentApiError(res.status, await readDetail(res, "Failed to load attempt"));
  const data = (await res.json()) as Rec;
  const exam = asRec(data.exam);
  return {
    attempt: normalizeAttemptSummary(asRec(data.attempt)),
    exam: {
      examId: num(exam.exam_id),
      title: str(exam.title),
      description: str(exam.description),
      durationMins: num(exam.duration_mins),
      passMarks: num(exam.pass_marks),
      negativeMarking: bool(exam.negative_marking),
    },
    questions: pickList(data.questions ?? [], []).map(normalizeExamQuestion),
  };
}

export async function saveExamAnswers(
  attemptId: number,
  answers: ExamAnswerInput[]
): Promise<{ saved: number; remainingSeconds: number | null }> {
  const res = await studentFetch(`/student/exam-attempts/${attemptId}/answers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answers }),
  });
  if (!res.ok) throw new StudentApiError(res.status, await readDetail(res, "Could not save answers"));
  const data = (await res.json()) as Rec;
  return { saved: num(data.saved) ?? 0, remainingSeconds: num(data.remaining_seconds) };
}

export async function submitExamAttempt(attemptId: number): Promise<ExamAttemptSummary> {
  const res = await studentFetch(`/student/exam-attempts/${attemptId}/submit`, { method: "POST" });
  if (!res.ok) throw new StudentApiError(res.status, await readDetail(res, "Could not submit the exam"));
  const data = (await res.json()) as Rec;
  invalidateCache();
  return normalizeAttemptSummary(asRec(data.attempt));
}

export async function getCourseResults(courseId: number): Promise<StudentResultItem[]> {
  const data = await studentGet<{ results?: Rec[] }>(`/student/courses/${courseId}/results`, 20_000);
  return (data.results ?? []).map(normalizeResultItem);
}

export async function getCoursePayments(courseId: number): Promise<CoursePayments> {
  const data = await studentGet<Rec>(`/student/courses/${courseId}/payments`, 30_000);
  const p = asRec(data.purchase);
  return {
    purchase:
      Object.keys(p).length === 0
        ? null
        : {
            purchaseId: num(p.purchase_id) ?? 0,
            status: str(p.status),
            totalFee: num(p.total_fee),
            discount: num(p.discount),
            netFee: num(p.net_fee),
            paidAmount: num(p.paid_amount),
            dueAmount: num(p.due_amount),
            refundedAmount: num(p.refunded_amount),
            isInstallment: bool(p.is_installment),
            totalInstallments: num(p.total_installments),
            installmentFrequency: str(p.installment_frequency),
            invoiceUuid: str(p.invoice_uuid),
            invoiceUrl: str(p.invoice_url),
            receiptUrl: str(p.receipt_url),
          },
    installments: pickList(data.installments ?? [], []).map((r) => ({
      id: num(r.id) ?? 0,
      installmentNo: num(r.installment_no),
      name: str(r.name),
      dueDate: str(r.due_date),
      amount: num(r.amount),
      paidAmount: num(r.paid_amount),
      status: str(r.status),
      paymentMethod: str(r.payment_method),
      referenceNo: str(r.reference_no),
      paidAt: str(r.paid_at),
    })),
    transactions: pickList(data.transactions ?? [], []).map((r) => ({
      id: num(r.id) ?? 0,
      amount: num(r.amount),
      paymentMethod: str(r.payment_method),
      referenceNo: str(r.reference_no),
      notes: str(r.notes),
      status: str(r.status),
      screenshotUrl: str(r.screenshot_url),
      createdAt: str(r.created_at),
    })),
  };
}

export async function getCourseNotices(
  courseId: number,
  limit = 50,
  offset = 0
): Promise<{ items: StudentNotice[]; total: number }> {
  const data = await studentGet<Rec>(
    `/student/courses/${courseId}/notices?limit=${limit}&offset=${offset}`,
    30_000
  );
  return { items: pickList(data.items ?? [], []).map(normalizeNotice), total: num(data.total) ?? 0 };
}

export async function getCourseCertificate(courseId: number): Promise<CourseCertificate> {
  const data = await studentGet<Rec>(`/student/courses/${courseId}/certificate`, 30_000);
  const cert = asRec(data.certificate);
  const prog = asRec(data.progress);
  return {
    state: (str(data.state) as CourseCertificate["state"]) ?? "not_eligible",
    reason: str(data.reason) ?? undefined,
    certificate:
      Object.keys(cert).length === 0
        ? undefined
        : {
            studentName: str(cert.student_name) ?? "",
            registrationNo: str(cert.registration_no) ?? "",
            courseTitle: str(cert.course_title) ?? "",
            courseId: num(cert.course_id) ?? 0,
            batchName: str(cert.batch_name),
            completionDate: str(cert.completion_date),
            verificationCode: str(cert.verification_code) ?? "",
            verificationUrl: str(cert.verification_url) ?? "",
            certificateImageUrl: str(cert.certificate_image_url),
          },
    progress:
      Object.keys(prog).length === 0
        ? undefined
        : {
            totalMaterials: num(prog.total_materials) ?? 0,
            completedMaterials: num(prog.completed_materials) ?? 0,
            progressPct: num(prog.progress_pct) ?? 0,
          },
  };
}

export async function getStudentProfile(): Promise<StudentFullProfile> {
  const data = await studentGet<Rec>(`/student/profile`, 30_000);
  return normalizeFullProfile(data);
}

export async function updateStudentProfile(patch: StudentProfilePatch): Promise<StudentFullProfile> {
  const res = await studentFetch(`/student/profile`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new StudentApiError(res.status, await readDetail(res, "Could not save profile"));
  const data = (await res.json()) as Rec;
  invalidateCache(studentUrl(`/student/profile`));
  return normalizeFullProfile(data);
}

export async function changeStudentPassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const res = await studentFetch(`/student/change-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
  if (!res.ok) throw new StudentApiError(res.status, await readDetail(res, "Could not change password"));
}

// ─── Course-panel normalizers ────────────────────────────────

function normalizeAttemptSummary(r: Rec): ExamAttemptSummary {
  return {
    attemptId: num(r.attempt_id) ?? 0,
    attemptNo: num(r.attempt_no) ?? 1,
    status: str(r.status) ?? "in_progress",
    startedAt: str(r.started_at),
    submittedAt: str(r.submitted_at),
    score: num(r.score),
    totalMarks: num(r.total_marks),
    passed: typeof r.passed === "boolean" ? r.passed : null,
    remainingSeconds: num(r.remaining_seconds) ?? 0,
  };
}

function normalizeExamItem(r: Rec): StudentExamItem {
  const active = asRec(r.active_attempt);
  const result = asRec(r.result);
  return {
    assignmentId: num(r.assignment_id) ?? 0,
    examId: num(r.exam_id),
    examTitle: str(r.exam_title) ?? "Exam",
    examCode: str(r.exam_code),
    examType: str(r.exam_type),
    questionCount: num(r.question_count) ?? 0,
    scheduledStart: str(r.scheduled_start),
    scheduledEnd: str(r.scheduled_end),
    durationMins: num(r.duration_mins),
    passMarks: num(r.pass_marks),
    passPercentage: num(r.pass_percentage),
    state: (str(r.state) as ExamItemState) ?? "upcoming",
    unlockReason: str(r.unlock_reason),
    attemptsUsed: num(r.attempts_used) ?? 0,
    attemptsAllowed: num(r.attempts_allowed),
    attemptsRemaining: num(r.attempts_remaining),
    canRetake: bool(r.can_retake),
    activeAttempt: Object.keys(active).length === 0 ? null : normalizeAttemptSummary(active),
    result:
      Object.keys(result).length === 0
        ? null
        : {
            bestScore: num(result.best_score),
            totalMarks: num(result.total_marks),
            passed: typeof result.passed === "boolean" ? result.passed : null,
            lastSubmittedAt: str(result.last_submitted_at),
            submittedAttempts: num(result.submitted_attempts) ?? 0,
          },
  };
}

function normalizeExamQuestion(r: Rec): ExamQuestionPublic {
  const saved = asRec(r.saved_answer);
  return {
    examQuestionId: num(r.exam_question_id) ?? 0,
    questionId: num(r.question_id) ?? 0,
    orderPosition: num(r.order_position) ?? 0,
    marks: num(r.marks) ?? 0,
    negativeMarks: num(r.negative_marks) ?? 0,
    questionTypeCode: str(r.question_type_code),
    questionHtml: str(r.question_html),
    hintHtml: str(r.hint_html),
    options: pickList(r.options ?? [], []).map((o) => ({
      id: num(o.id) ?? 0,
      contentHtml: str(o.content_html),
      orderIndex: num(o.order_index) ?? 0,
    })),
    savedAnswer:
      Object.keys(saved).length === 0
        ? null
        : {
            selectedOptionIds: Array.isArray(saved.selected_option_ids)
              ? (saved.selected_option_ids as unknown[]).map((v) => num(v) ?? 0)
              : null,
            answerText: str(saved.answer_text),
          },
  };
}

function normalizeResultItem(r: Rec): StudentResultItem {
  const review = Array.isArray(r.review)
    ? r.review.map(asRec).map((q) => ({
        examQuestionId: num(q.exam_question_id) ?? 0,
        questionId: num(q.question_id) ?? 0,
        questionTypeCode: str(q.question_type_code),
        questionHtml: str(q.question_html),
        marks: num(q.marks) ?? 0,
        negativeMarks: num(q.negative_marks) ?? 0,
        yourAnswer: (() => {
          const ya = asRec(q.your_answer);
          return Object.keys(ya).length === 0
            ? null
            : {
                selectedOptionIds: Array.isArray(ya.selected_option_ids)
                  ? (ya.selected_option_ids as unknown[]).map((v) => num(v) ?? 0)
                  : null,
                answerText: str(ya.answer_text),
              };
        })(),
        isCorrect: typeof q.is_correct === "boolean" ? q.is_correct : null,
        marksAwarded: num(q.marks_awarded),
        options: pickList(q.options ?? [], []).map((o) => ({
          id: num(o.id) ?? 0,
          contentHtml: str(o.content_html),
          isCorrect: typeof o.is_correct === "boolean" ? o.is_correct : undefined,
        })),
        solutionHtml: str(q.solution_html),
      }))
    : null;
  return {
    ...normalizeAttemptSummary(r),
    assignmentId: num(r.assignment_id) ?? 0,
    examId: num(r.exam_id),
    examTitle: str(r.exam_title) ?? "Exam",
    examType: str(r.exam_type),
    passMarks: num(r.pass_marks),
    passPercentage: num(r.pass_percentage),
    solutionsVisible: bool(r.solutions_visible),
    review,
  };
}

function normalizeNotice(r: Rec): StudentNotice {
  return {
    id: num(r.id) ?? 0,
    title: str(r.title) ?? "Notice",
    noticeNo: str(r.notice_no),
    noticeDate: str(r.notice_date),
    category: str(r.category) ?? "General",
    description: str(r.description),
    coverImage: str(r.cover_image),
    attachmentUrl: str(r.attachment_url),
    attachmentName: str(r.attachment_name),
    isPinned: bool(r.is_pinned),
    scope: str(r.scope) === "batch" ? "batch" : "institute",
    createdAt: str(r.created_at),
  };
}

function normalizeFullProfile(r: Rec): StudentFullProfile {
  return {
    id: num(r.id) ?? 0,
    first_name: str(r.first_name) ?? "",
    last_name: str(r.last_name),
    email: str(r.email) ?? "",
    phone: str(r.phone),
    alternative_phone: str(r.alternative_phone),
    date_of_birth: str(r.date_of_birth),
    gender: str(r.gender),
    city: str(r.city),
    state: str(r.state),
    pin_code: str(r.pin_code),
    address: str(r.address),
    profile_photo_url: str(r.profile_photo_url),
    highest_qualification: str(r.highest_qualification),
    current_occupation: str(r.current_occupation),
    student_category: str(r.student_category),
    job_title: str(r.job_title),
    company_name: str(r.company_name),
    work_experience: str(r.work_experience),
    linkedin_url: str(r.linkedin_url),
    preferred_language: str(r.preferred_language),
    emergency_contact_name: str(r.emergency_contact_name),
    emergency_contact_phone: str(r.emergency_contact_phone),
    created_at: str(r.created_at),
  };
}
