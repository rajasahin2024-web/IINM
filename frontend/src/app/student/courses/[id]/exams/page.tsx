"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getCourseExams,
  startExamAttempt,
  StudentApiError,
  type StudentExamItem,
} from "@/lib/studentApi";
import { useCourse } from "../context";
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
    default:
      return { label: state, tone: "gray" };
  }
}

export default function CourseExamsPage() {
  const router = useRouter();
  const { courseId } = useCourse();
  const base = `/student/courses/${courseId}`;
  const [exams, setExams] = useState<StudentExamItem[] | null>(null);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState<number | null>(null);
  const [startError, setStartError] = useState("");

  useEffect(() => {
    let cancelled = false;
    getCourseExams(courseId)
      .then((list) => !cancelled && setExams(list))
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof StudentApiError && err.status === 401) router.replace("/signin");
        else setError("Could not load exams. Please retry.");
      });
    return () => {
      cancelled = true;
    };
  }, [courseId, router]);

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
    </>
  );
}
