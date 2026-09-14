"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DOMPurify from "isomorphic-dompurify";
import {
  getCourseResults,
  StudentApiError,
  type StudentResultItem,
} from "@/lib/studentApi";
import { useCourse } from "../context";
import SIcon from "../../../icons";

function clean(html: string | null | undefined): string {
  return DOMPurify.sanitize(html ?? "", { USE_PROFILES: { html: true } });
}

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ResultCard({ item }: { item: StudentResultItem }) {
  const [open, setOpen] = useState(false);
  const reviewable = item.status === "submitted" && item.review !== null;

  return (
    <div className="stu-exam-card stu-result-card">
      <button
        type="button"
        className="stu-result-head"
        onClick={() => reviewable && setOpen(!open)}
        aria-expanded={open}
        disabled={!reviewable}
      >
        <div className="stu-exam-main">
          <div className="stu-exam-titlerow">
            <span className="stu-exam-title">{item.examTitle}</span>
            {item.passed !== null && (
              <span className={`stu-badge stu-badge-${item.passed ? "green" : "red"}`}>
                {item.passed ? "Passed" : "Failed"}
              </span>
            )}
            {item.status === "expired" && (
              <span className="stu-badge stu-badge-red">Expired</span>
            )}
            {item.status === "in_progress" && (
              <span className="stu-badge stu-badge-blue">In progress</span>
            )}
          </div>
          <div className="stu-exam-meta">
            <span>Attempt {item.attemptNo}</span>
            {item.examType && <span>{item.examType}</span>}
            {item.submittedAt && <span>Submitted {formatWhen(item.submittedAt)}</span>}
            {item.passMarks !== null && <span>Pass marks: {item.passMarks}</span>}
          </div>
        </div>
        <div className="stu-result-score">
          <span className="stu-result-score-num">
            {item.score ?? "—"}
            <span className="stu-result-score-total">/{item.totalMarks ?? "—"}</span>
          </span>
          {reviewable && (
            <SIcon name="chevron" size={18} className={`stu-chapter-chevron ${open ? "flip" : ""}`} />
          )}
        </div>
      </button>

      {open && item.review && (
        <div className="stu-review">
          {item.review.map((q, i) => {
            const selIds = q.yourAnswer?.selectedOptionIds ?? [];
            const answerText = q.yourAnswer?.answerText ?? "";
            const unanswered = selIds.length === 0 && !answerText.trim();
            return (
              <div className="stu-review-q" key={q.questionId}>
                <div className="stu-review-qhead">
                  <span className="stu-review-num">
                    {i + 1}. {q.marks} mark{q.marks === 1 ? "" : "s"}
                  </span>
                  {q.isCorrect !== null ? (
                    <span className={`stu-badge stu-badge-${q.isCorrect ? "green" : "red"}`}>
                      {q.isCorrect ? `+${q.marksAwarded ?? q.marks}` : `${q.marksAwarded ?? 0}`}
                    </span>
                  ) : (
                    <span className="stu-badge stu-badge-gray">Not scored</span>
                  )}
                </div>
                {q.questionHtml && (
                  <div className="stu-qhtml stu-review-qhtml" dangerouslySetInnerHTML={{ __html: clean(q.questionHtml) }} />
                )}

                {q.options.length > 0 ? (
                  <div className="stu-opts stu-opts-review">
                    {q.options.map((o) => {
                      const yours = selIds.includes(o.id);
                      const correct = o.isCorrect === true;
                      const cls = correct
                        ? "correct"
                        : yours
                          ? "wrong"
                          : "";
                      return (
                        <div key={o.id} className={`stu-opt stu-opt-review ${cls}`}>
                          <span
                            className="stu-opt-body"
                            dangerouslySetInnerHTML={{ __html: clean(o.contentHtml) }}
                          />
                          {correct && item.solutionsVisible && (
                            <span className="stu-opt-tag ok">Correct</span>
                          )}
                          {yours && !correct && <span className="stu-opt-tag bad">Your answer</span>}
                          {yours && correct && <span className="stu-opt-tag ok">Your answer</span>}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="stu-review-text">
                    <span className="stu-review-label">Your answer:</span>{" "}
                    {answerText.trim() ? answerText : <em>Not answered</em>}
                  </div>
                )}
                {unanswered && q.options.length > 0 && (
                  <div className="stu-review-text"><em>Not answered</em></div>
                )}
                {item.solutionsVisible && q.solutionHtml && (
                  <div className="stu-solution">
                    <span className="stu-review-label">Solution</span>
                    <div dangerouslySetInnerHTML={{ __html: clean(q.solutionHtml) }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function CourseResultsPage() {
  const router = useRouter();
  const { courseId } = useCourse();
  const [results, setResults] = useState<StudentResultItem[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    getCourseResults(courseId)
      .then((list) => !cancelled && setResults(list))
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof StudentApiError && err.status === 401) router.replace("/signin");
        else setError("Could not load results. Please retry.");
      });
    return () => {
      cancelled = true;
    };
  }, [courseId, router]);

  return (
    <>
      <div className="stu-page-head">
        <h1 className="stu-page-title">Results / Gradebook</h1>
        <p className="stu-page-sub">Your exam attempts, scores and answer review.</p>
      </div>

      {error ? (
        <div className="stu-empty" role="alert">
          <SIcon name="cloud-off" size={40} />
          <p className="stu-empty-title">Couldn&apos;t load results</p>
          <p className="stu-empty-sub">{error}</p>
          <button className="stu-btn-primary" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      ) : results === null ? (
        <div aria-busy="true">
          {[0, 1].map((i) => (
            <div className="stu-skel" style={{ height: 84, marginBottom: 12 }} key={i} />
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="stu-empty">
          <SIcon name="chart" size={40} />
          <p className="stu-empty-title">No results yet</p>
          <p className="stu-empty-sub">
            Once you take an exam, your score and answer review will appear here.
          </p>
        </div>
      ) : (
        <div className="stu-exam-list">
          {results.map((r) => (
            <ResultCard key={r.attemptId} item={r} />
          ))}
        </div>
      )}
    </>
  );
}
