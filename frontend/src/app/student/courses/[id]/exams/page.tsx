"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createMockTestOrder,
  formatINR,
  getCourseExams,
  getPublicPaymentSettings,
  startExamAttempt,
  StudentApiError,
  verifyMockTestPayment,
  type StudentExamItem,
} from "@/lib/studentApi";
import { useCourse } from "../context";
import { useStudent } from "../../../context";
import SIcon from "../../../icons";

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function stateChip(state: StudentExamItem["state"]): { label: string; tone: string } {
  switch (state) {
    case "available":
      return { label: "Available now", tone: "green" };
    case "in_progress":
      return { label: "In progress", tone: "blue" };
    case "upcoming":
      return { label: "Upcoming", tone: "gray" };
    case "locked":
      return { label: "Locked", tone: "amber" };
    case "completed":
      return { label: "Completed", tone: "blue" };
    case "expired":
      return { label: "Closed", tone: "red" };
    case "payment_required":
      return { label: "Unlock required", tone: "amber" };
    default:
      return { label: state, tone: "gray" };
  }
}

// `Window.Razorpay` is declared globally in app/invoice/[uuid]/page.tsx.
interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

let razorpayScriptPromise: Promise<boolean> | null = null;
function loadRazorpayScript(): Promise<boolean> {
  if (razorpayScriptPromise) return razorpayScriptPromise;
  razorpayScriptPromise = new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
  return razorpayScriptPromise;
}

/* Mini checkout for the course-scoped paid mock test. */
function MockTestCheckout({
  exam,
  courseId,
  onClose,
  onUnlocked,
}: {
  exam: StudentExamItem;
  courseId: number;
  onClose: () => void;
  onUnlocked: () => void;
}) {
  const { profile } = useStudent();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  const pay = async () => {
    setPaying(true);
    setError("");
    try {
      const settings = await getPublicPaymentSettings();
      if (!settings.razorpayKeyId) {
        throw new Error("Payment gateway is not configured. Please contact support.");
      }
      const order = await createMockTestOrder(courseId);
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        throw new Error("Could not load the payment gateway. Check your connection and retry.");
      }
      const rzp = new window.Razorpay!({
        key: settings.razorpayKeyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: "IINM",
        description: `Mock Test — ${exam.examTitle}`,
        prefill: {
          name: `${profile.first_name} ${profile.last_name ?? ""}`.trim(),
          email: profile.email,
          contact: profile.phone ?? undefined,
        },
        theme: { color: "#0a1628" },
        handler: async (response: RazorpaySuccessResponse) => {
          try {
            await verifyMockTestPayment(courseId, {
              razorpayPaymentId: response.razorpay_payment_id,
              razorpayOrderId: response.razorpay_order_id,
              razorpaySignature: response.razorpay_signature,
            });
            onUnlocked();
          } catch (e) {
            setPaying(false);
            setError(
              e instanceof StudentApiError
                ? e.message
                : "Payment received but verification failed. Contact support with your receipt."
            );
          }
        },
        modal: {
          ondismiss: () => {
            setPaying(false);
          },
        },
      });
      rzp.open();
    } catch (e) {
      setPaying(false);
      setError(e instanceof Error ? e.message : "Could not start the payment. Please retry.");
    }
  };

  return (
    <div className="stu-mtpay-wrap" role="dialog" aria-modal="true" aria-label="Unlock mock test">
      <button type="button" className="stu-mtpay-scrim" onClick={onClose} aria-label="Close" />
      <div className="stu-mtpay-card">
        <div className="stu-mtpay-head">
          <span className="stu-mtpay-icon" aria-hidden="true">
            <SIcon name="clipboard" size={20} />
          </span>
          <div className="stu-mtpay-headmeta">
            <span className="stu-mtpay-kicker">Course mock test</span>
            <span className="stu-mtpay-title">{exam.examTitle}</span>
          </div>
          <button type="button" className="stu-topbar-icon" onClick={onClose} aria-label="Close">
            <SIcon name="close" size={20} />
          </button>
        </div>
        <div className="stu-mtpay-body">
          <div className="stu-mtpay-pricerow">
            <span>Mock test unlock</span>
            <strong>{formatINR(exam.mockTestPrice)}</strong>
          </div>
          <p className="stu-mtpay-note">
            One-time purchase for this course. Passing the mock test issues your certificate.
          </p>
          {error && (
            <div className="stu-alert" role="alert">
              <SIcon name="alert" size={16} />
              {error}
            </div>
          )}
        </div>
        <div className="stu-mtpay-foot">
          <button type="button" className="stu-cta" onClick={pay} disabled={paying}>
            {paying ? "Opening secure checkout…" : `Pay ${formatINR(exam.mockTestPrice)}`}
            <SIcon name="arrow-right" size={16} />
          </button>
          <span className="stu-mtpay-secure">
            <SIcon name="lock" size={13} /> Secured by Razorpay
          </span>
        </div>
      </div>
    </div>
  );
}

export default function CourseExamsPage() {
  const router = useRouter();
  const { courseId } = useCourse();
  const base = `/student/courses/${courseId}`;
  const [exams, setExams] = useState<StudentExamItem[] | null>(null);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState<number | null>(null);
  const [startError, setStartError] = useState("");
  const [checkout, setCheckout] = useState<StudentExamItem | null>(null);
  const [unlockedMsg, setUnlockedMsg] = useState("");
  const mountedRef = useRef(true);

  const load = useCallback(() => {
    getCourseExams(courseId)
      .then((list) => mountedRef.current && setExams(list))
      .catch((err) => {
        if (!mountedRef.current) return;
        if (err instanceof StudentApiError && err.status === 401) router.replace("/signin");
        else setError("Could not load exams. Please retry.");
      });
  }, [courseId, router]);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  useEffect(() => {
    if (!unlockedMsg) return;
    const t = setTimeout(() => setUnlockedMsg(""), 4000);
    return () => clearTimeout(t);
  }, [unlockedMsg]);

  const begin = async (exam: StudentExamItem) => {
    setStartError("");
    setStarting(exam.assignmentId);
    try {
      // Resume an already-live attempt directly when the id is known.
      const attemptId = exam.state === "in_progress" && exam.activeAttempt
        ? exam.activeAttempt.attemptId
        : (await startExamAttempt(exam.assignmentId)).attempt.attemptId;
      router.push(`${base}/exams/${attemptId}`);
    } catch (e) {
      setStartError(e instanceof StudentApiError ? e.message : "Could not start the exam. Please retry.");
    } finally {
      setStarting(null);
    }
  };

  return (
    <>
      <div className="stu-page-head">
        <h1 className="stu-page-title">Exams</h1>
        <p className="stu-page-sub">Scheduled exams for your batch — start, resume or review.</p>
      </div>

      {unlockedMsg && (
        <div className="stu-alert stu-alert-ok" role="status">
          <SIcon name="check-circle" size={18} />
          {unlockedMsg}
        </div>
      )}

      {startError && (
        <div className="stu-alert" role="alert">
          <SIcon name="alert" size={18} />
          {startError}
        </div>
      )}

      {error ? (
        <div className="stu-empty" role="alert">
          <SIcon name="cloud-off" size={40} />
          <p className="stu-empty-title">Couldn&apos;t load exams</p>
          <p className="stu-empty-sub">{error}</p>
          <button className="stu-btn-primary" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      ) : exams === null ? (
        <div aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div className="stu-skel" style={{ height: 92, marginBottom: 12 }} key={i} />
          ))}
        </div>
      ) : exams.length === 0 ? (
        <div className="stu-empty">
          <SIcon name="clipboard" size={40} />
          <p className="stu-empty-title">No exams yet</p>
          <p className="stu-empty-sub">Exams assigned to your batch will appear here.</p>
        </div>
      ) : (
        <div className="stu-exam-list">
          {exams.map((e) => {
            const chip = stateChip(e.state);
            const actionable = e.state === "available" || e.state === "in_progress";
            return (
              <div className="stu-exam-card" key={e.assignmentId}>
                <div className="stu-exam-main">
                  <div className="stu-exam-titlerow">
                    <span className="stu-exam-title">{e.examTitle}</span>
                    {e.isMockTest && <span className="stu-badge stu-badge-ebook">Mock test</span>}
                    <span className={`stu-badge stu-badge-${chip.tone}`}>{chip.label}</span>
                  </div>
                  <div className="stu-exam-meta">
                    {e.examType && <span>{e.examType}</span>}
                    <span>{e.questionCount} question{e.questionCount === 1 ? "" : "s"}</span>
                    {e.durationMins !== null && <span>{e.durationMins} min</span>}
                    {e.passMarks !== null && <span>Pass: {e.passMarks} marks</span>}
                  </div>
                  <div className="stu-exam-meta stu-exam-window">
                    <SIcon name="calendar" size={14} />
                    {formatWhen(e.scheduledStart)} → {formatWhen(e.scheduledEnd)}
                  </div>
                  {e.state === "locked" && e.unlockReason && (
                    <div className="stu-exam-lock">
                      <SIcon name="lock" size={15} />
                      {e.unlockReason}
                    </div>
                  )}
                  {e.state === "payment_required" && (
                    <div className="stu-exam-lock">
                      <SIcon name="lock" size={15} />
                      {e.unlockReason ?? "This mock test requires a separate purchase."}
                    </div>
                  )}
                  {e.state === "completed" && e.result && (
                    <div className="stu-exam-resultline">
                      Score {e.result.bestScore ?? "—"}/{e.result.totalMarks ?? "—"}
                      {e.result.passed !== null && (
                        <span className={`stu-badge stu-badge-${e.result.passed ? "green" : "red"}`}>
                          {e.result.passed ? "Passed" : "Failed"}
                        </span>
                      )}
                      {e.attemptsAllowed !== null && (
                        <span className="stu-exam-meta">
                          · {e.attemptsUsed}/{e.attemptsAllowed} attempts used
                        </span>
                      )}
                    </div>
                  )}
                  {e.attemptsRemaining !== null && e.state !== "completed" && (
                    <div className="stu-exam-meta">
                      {e.attemptsRemaining} attempt{e.attemptsRemaining === 1 ? "" : "s"} remaining
                    </div>
                  )}
                </div>
                <div className="stu-exam-actions">
                  {e.state === "payment_required" && (
                    <button type="button" className="stu-cta" onClick={() => setCheckout(e)}>
                      Unlock — {formatINR(e.mockTestPrice)}
                      <SIcon name="lock" size={15} />
                    </button>
                  )}
                  {e.state === "available" && (
                    <button
                      type="button"
                      className="stu-cta"
                      disabled={starting === e.assignmentId}
                      onClick={() => begin(e)}
                    >
                      {starting === e.assignmentId ? "Starting…" : "Start exam"}
                      <SIcon name="arrow-right" size={16} />
                    </button>
                  )}
                  {e.state === "in_progress" && (
                    <button
                      type="button"
                      className="stu-cta"
                      disabled={starting === e.assignmentId}
                      onClick={() => begin(e)}
                    >
                      {starting === e.assignmentId ? "Opening…" : "Resume"}
                      <SIcon name="arrow-right" size={16} />
                    </button>
                  )}
                  {e.state === "completed" && (
                    <>
                      <Link href={`${base}/results`} className="stu-btn-ghost">
                        Review
                      </Link>
                      {e.canRetake && (
                        <button
                          type="button"
                          className="stu-cta"
                          disabled={starting === e.assignmentId}
                          onClick={() => begin(e)}
                        >
                          Retake
                        </button>
                      )}
                    </>
                  )}
                  {e.state === "upcoming" && (
                    <span className="stu-exam-soon">
                      <SIcon name="timer" size={15} />
                      Opens {formatWhen(e.scheduledStart)}
                    </span>
                  )}
                  {(e.state === "locked" || e.state === "expired") && !actionable && (
                    <span className="stu-exam-soon">
                      <SIcon name="lock" size={15} />
                      {e.state === "expired" ? "Window closed" : "Locked"}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {checkout && (
        <MockTestCheckout
          exam={checkout}
          courseId={courseId}
          onClose={() => setCheckout(null)}
          onUnlocked={() => {
            setCheckout(null);
            setExams(null);
            load();
            setUnlockedMsg("Mock test unlocked — you can start it now.");
          }}
        />
      )}
    </>
  );
}
