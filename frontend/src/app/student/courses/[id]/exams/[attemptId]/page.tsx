"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import DOMPurify from "isomorphic-dompurify";
import {
  getExamAttempt,
  saveExamAnswers,
  submitExamAttempt,
  StudentApiError,
  type ExamAnswerInput,
  type ExamAttemptDetail,
  type ExamAttemptSummary,
  type ExamQuestionPublic,
} from "@/lib/studentApi";
import SIcon from "../../../../icons";

/* ────────────────────────────────────────────────────────────
   Timed exam attempt screen.
   - remaining_seconds from the server is authoritative; the
     client timer is cosmetic and re-syncs on every save.
   - Answers autosave (debounced) + flush on navigation/submit.
   ──────────────────────────────────────────────────────────── */

const AUTOSAVE_MS = 800;

function clean(html: string | null | undefined): string {
  return DOMPurify.sanitize(html ?? "", { USE_PROFILES: { html: true } });
}

function fmtClock(total: number): string {
  const s = Math.max(0, Math.floor(total));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

type AnswerMap = Record<number, { selectedOptionIds: number[] | null; answerText: string | null }>;

function questionAnswered(q: ExamQuestionPublic, a: AnswerMap[number] | undefined): boolean {
  if (!a) return false;
  if (a.selectedOptionIds && a.selectedOptionIds.length > 0) return true;
  return !!(a.answerText && a.answerText.trim().length > 0);
}

export default function ExamAttemptPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = Number(params?.id);
  const attemptId = Number(params?.attemptId);
  const base = `/student/courses/${courseId}`;

  const [detail, setDetail] = useState<ExamAttemptDetail | null>(null);
  const [error, setError] = useState("");
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const dirtyRef = useRef<Set<number>>(new Set());
  const answersRef = useRef<AnswerMap>({});
  const deadlineRef = useRef<number | null>(null);
  const [clock, setClock] = useState<number | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ExamAttemptSummary | null>(null);
  const [finished, setFinished] = useState<"submitted" | "expired" | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submittedRef = useRef(false);

  /* ── Load attempt ── */
  useEffect(() => {
    if (!Number.isFinite(attemptId)) {
      setError("Invalid exam link.");
      return;
    }
    let cancelled = false;
    getExamAttempt(attemptId)
      .then((d) => {
        if (cancelled) return;
        setDetail(d);
        const initial: AnswerMap = {};
        for (const q of d.questions) {
          if (q.savedAnswer) {
            initial[q.questionId] = {
              selectedOptionIds: q.savedAnswer.selectedOptionIds,
              answerText: q.savedAnswer.answerText,
            };
          }
        }
        answersRef.current = initial;
        setAnswers(initial);
        if (d.attempt.status === "submitted") {
          setResult(d.attempt);
          setFinished("submitted");
          submittedRef.current = true;
        } else if (d.attempt.status === "expired") {
          setFinished("expired");
          submittedRef.current = true;
        } else {
          deadlineRef.current = Date.now() + d.attempt.remainingSeconds * 1000;
          setClock(d.attempt.remainingSeconds);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof StudentApiError && err.status === 401) router.replace("/signin");
        else if (err instanceof StudentApiError && err.status === 404) setError("This exam attempt was not found.");
        else setError("Could not load the exam. Please retry.");
      });
    return () => {
      cancelled = true;
    };
  }, [attemptId, router]);

  /* ── Countdown ── */
  useEffect(() => {
    if (deadlineRef.current === null || finished) return;
    const t = setInterval(() => {
      const left = Math.max(0, Math.round(((deadlineRef.current ?? 0) - Date.now()) / 1000));
      setClock(left);
      if (left <= 0 && !submittedRef.current) {
        submittedRef.current = true;
        // Try a final submit; server marks expired past the grace window.
        submitExamAttempt(attemptId)
          .then((a) => {
            setResult(a);
            setFinished("submitted");
          })
          .catch(() => setFinished("expired"));
      }
    }, 1000);
    return () => clearInterval(t);
  }, [attemptId, finished]);

  /* ── Autosave ── */
  const flushAnswers = useCallback(async () => {
    if (!detail || submittedRef.current || dirtyRef.current.size === 0) return;
    const dirty = [...dirtyRef.current];
    dirtyRef.current.clear();
    const payload: ExamAnswerInput[] = dirty.map((qid) => {
      const a = answersRef.current[qid];
      return {
        question_id: qid,
        selected_option_ids: a?.selectedOptionIds ?? null,
        answer_text: a?.answerText ?? null,
      };
    });
    setSaveState("saving");
    try {
      const res = await saveExamAnswers(attemptId, payload);
      setSaveState("saved");
      if (res.remainingSeconds !== null) {
        deadlineRef.current = Date.now() + res.remainingSeconds * 1000;
        setClock(res.remainingSeconds);
      }
    } catch (e) {
      // Re-queue dirty answers so a later flush retries them.
      dirty.forEach((qid) => dirtyRef.current.add(qid));
      setSaveState("error");
      if (e instanceof StudentApiError && (e.status === 400 || e.status === 401)) {
        if (e.status === 401) router.replace("/signin");
        else if (!submittedRef.current) {
          submittedRef.current = true;
          setFinished("expired");
        }
      }
    }
  }, [attemptId, detail, router]);

  const scheduleSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void flushAnswers();
    }, AUTOSAVE_MS);
  }, [flushAnswers]);

  const setAnswer = useCallback(
    (qid: number, patch: { selectedOptionIds?: number[] | null; answerText?: string | null }) => {
      const cur = answersRef.current[qid] ?? { selectedOptionIds: null, answerText: null };
      const next = {
        selectedOptionIds:
          patch.selectedOptionIds !== undefined ? patch.selectedOptionIds : cur.selectedOptionIds,
        answerText: patch.answerText !== undefined ? patch.answerText : cur.answerText,
      };
      answersRef.current = { ...answersRef.current, [qid]: next };
      setAnswers(answersRef.current);
      dirtyRef.current.add(qid);
      setSaveState("idle");
      scheduleSave();
    },
    [scheduleSave]
  );

  /* Flush on page hide / unmount */
  useEffect(() => {
    const onHide = () => {
      if (dirtyRef.current.size > 0 && !submittedRef.current) void flushAnswers();
    };
    window.addEventListener("beforeunload", onHide);
    return () => {
      window.removeEventListener("beforeunload", onHide);
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [flushAnswers]);

  const doSubmit = useCallback(async () => {
    if (submittedRef.current) return;
    setSubmitting(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    await flushAnswers();
    try {
      const a = await submitExamAttempt(attemptId);
      submittedRef.current = true;
      setResult(a);
      setFinished("submitted");
    } catch (e) {
      if (e instanceof StudentApiError && e.status === 400) {
        submittedRef.current = true;
        setFinished("expired");
      } else if (e instanceof StudentApiError && e.status === 401) {
        router.replace("/signin");
      } else {
        setError(e instanceof Error ? e.message : "Could not submit. Please retry.");
      }
    } finally {
      setSubmitting(false);
      setConfirming(false);
    }
  }, [attemptId, flushAnswers, router]);

  const questions = useMemo(() => detail?.questions ?? [], [detail]);
  const q = questions[idx] ?? null;
  const answeredCount = useMemo(
    () => questions.filter((qq) => questionAnswered(qq, answers[qq.questionId])).length,
    [questions, answers]
  );

  /* ── States ── */
  if (error) {
    return (
      <div className="stu-empty" role="alert">
        <SIcon name="alert" size={40} />
        <p className="stu-empty-title">Exam unavailable</p>
        <p className="stu-empty-sub">{error}</p>
        <Link href={`${base}/exams`} className="stu-btn-primary" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
          Back to exams
        </Link>
      </div>
    );
  }

  if (!detail) {
    return (
      <div aria-busy="true">
        <div className="stu-skel" style={{ height: 48, marginBottom: 14 }} />
        <div className="stu-skel" style={{ height: 180, marginBottom: 12 }} />
        <div className="stu-skel stu-skel-line" style={{ width: "60%" }} />
      </div>
    );
  }

  if (finished === "expired") {
    return (
      <div className="stu-empty" role="alert">
        <SIcon name="timer" size={40} />
        <p className="stu-empty-title">Time is up</p>
        <p className="stu-empty-sub">
          This attempt has expired. Your saved answers were recorded where the deadline allowed.
        </p>
        <Link href={`${base}/exams`} className="stu-btn-primary" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
          Back to exams
        </Link>
      </div>
    );
  }

  if (finished === "submitted" && result) {
    return (
      <div className="stu-exam-done">
        <span className={`stu-exam-done-icon ${result.passed === false ? "fail" : "pass"}`}>
          <SIcon name={result.passed === false ? "x-circle" : "check-circle"} size={44} />
        </span>
        <h1 className="stu-page-title">Exam submitted</h1>
        <p className="stu-page-sub">
          {detail.exam.title ?? "Your exam"} — attempt {result.attemptNo}
        </p>
        <div className="stu-exam-done-score">
          <span className="stu-exam-done-num">
            {result.score ?? "—"}
            <span className="stu-exam-done-total">/{result.totalMarks ?? "—"}</span>
          </span>
          {result.passed !== null && (
            <span className={`stu-badge stu-badge-${result.passed ? "green" : "red"}`}>
              {result.passed ? "Passed" : "Failed"}
            </span>
          )}
        </div>
        <div className="stu-exam-done-actions">
          <Link href={`${base}/results`} className="stu-cta" style={{ textDecoration: "none" }}>
            View gradebook
            <SIcon name="arrow-right" size={16} />
          </Link>
          <Link href={`${base}/exams`} className="stu-btn-ghost">
            Back to exams
          </Link>
        </div>
      </div>
    );
  }

  /* ── Live attempt ── */
  const typeCode = (q?.questionTypeCode ?? "").toUpperCase();
  const isSingle = typeCode === "MSA" || typeCode === "TOF";
  const isMulti = typeCode === "MMA";
  const isShort = typeCode === "SAQ";
  const cur = q ? answers[q.questionId] : undefined;
  const lowTime = clock !== null && clock <= 60;

  return (
    <div className="stu-exam-run">
      {/* Sticky attempt bar */}
      <div className="stu-exam-bar">
        <div className="stu-exam-bar-info">
          <span className="stu-exam-bar-title">{detail.exam.title ?? "Exam"}</span>
          <span className="stu-exam-bar-sub">
            {answeredCount}/{questions.length} answered
            {saveState === "saving" && " · saving…"}
            {saveState === "saved" && " · saved"}
            {saveState === "error" && " · save failed — retrying"}
          </span>
        </div>
        {clock !== null && (
          <span className={`stu-timer ${lowTime ? "low" : ""}`} role="timer" aria-label="Time remaining">
            <SIcon name="timer" size={16} />
            {fmtClock(clock)}
          </span>
        )}
        <button type="button" className="stu-cta stu-cta-sm" onClick={() => setConfirming(true)}>
          Submit
        </button>
      </div>

      {/* Question palette */}
      <div className="stu-palette" role="navigation" aria-label="Question palette">
        {questions.map((qq, i) => (
          <button
            key={qq.questionId}
            type="button"
            className={`stu-pal ${i === idx ? "cur" : ""} ${questionAnswered(qq, answers[qq.questionId]) ? "done" : ""}`}
            onClick={() => setIdx(i)}
            aria-label={`Question ${i + 1}${questionAnswered(qq, answers[qq.questionId]) ? ", answered" : ""}`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      {/* Current question */}
      {q && (
        <div className="stu-qcard">
          <div className="stu-qcard-head">
            <span className="stu-qcard-num">Question {idx + 1} of {questions.length}</span>
            <span className="stu-qcard-marks">
              {q.marks} mark{q.marks === 1 ? "" : "s"}
              {q.negativeMarks > 0 ? ` · −${q.negativeMarks} wrong` : ""}
            </span>
          </div>
          {q.questionHtml ? (
            <div
              className="stu-qhtml"
              dangerouslySetInnerHTML={{ __html: clean(q.questionHtml) }}
            />
          ) : (
            <p className="stu-qhtml">(Question text unavailable)</p>
          )}
          {q.hintHtml && (
            <details className="stu-qhint">
              <summary>Hint</summary>
              <div dangerouslySetInnerHTML={{ __html: clean(q.hintHtml) }} />
            </details>
          )}

          {/* Objective options */}
          {(isSingle || isMulti || q.options.length > 0) && !isShort && (
            <div className="stu-opts" role={isMulti ? "group" : "radiogroup"}>
              {[...q.options]
                .sort((a, b) => a.orderIndex - b.orderIndex)
                .map((o) => {
                  const selected = cur?.selectedOptionIds?.includes(o.id) ?? false;
                  return (
                    <label key={o.id} className={`stu-opt ${selected ? "sel" : ""}`}>
                      <input
                        type={isMulti ? "checkbox" : "radio"}
                        name={`q-${q.questionId}`}
                        checked={selected}
                        onChange={() => {
                          if (isMulti) {
                            const set = new Set(cur?.selectedOptionIds ?? []);
                            if (set.has(o.id)) set.delete(o.id);
                            else set.add(o.id);
                            setAnswer(q.questionId, { selectedOptionIds: [...set] });
                          } else {
                            setAnswer(q.questionId, { selectedOptionIds: [o.id] });
                          }
                        }}
                      />
                      <span
                        className="stu-opt-body"
                        dangerouslySetInnerHTML={{ __html: clean(o.contentHtml) }}
                      />
                    </label>
                  );
                })}
            </div>
          )}

          {/* Written answers */}
          {(isShort || q.options.length === 0) && (
            <textarea
              className="stu-qtext"
              rows={isShort ? 2 : 4}
              placeholder={isShort ? "Type your answer…" : "Write your answer…"}
              value={cur?.answerText ?? ""}
              onChange={(e) => setAnswer(q.questionId, { answerText: e.target.value })}
            />
          )}
        </div>
      )}

      {/* Prev / next */}
      <div className="stu-qnav">
        <button
          type="button"
          className="stu-btn-ghost"
          disabled={idx === 0}
          onClick={() => setIdx((i) => Math.max(0, i - 1))}
        >
          <SIcon name="arrow-left" size={16} />
          Previous
        </button>
        {idx < questions.length - 1 ? (
          <button type="button" className="stu-cta" onClick={() => setIdx((i) => i + 1)}>
            Next
            <SIcon name="arrow-right" size={16} />
          </button>
        ) : (
          <button type="button" className="stu-cta" onClick={() => setConfirming(true)}>
            <SIcon name="send" size={16} />
            Finish &amp; submit
          </button>
        )}
      </div>

      {/* Submit confirm */}
      {confirming && (
        <div className="stu-modal-wrap" role="dialog" aria-modal="true" aria-label="Submit exam">
          <button
            type="button"
            className="stu-drawer-scrim"
            onClick={() => setConfirming(false)}
            aria-label="Cancel"
          />
          <div className="stu-modal">
            <h2 className="stu-modal-title">Submit exam?</h2>
            <p className="stu-modal-sub">
              You have answered {answeredCount} of {questions.length} questions.
              {questions.length - answeredCount > 0 &&
                ` ${questions.length - answeredCount} unanswered will score 0.`}{" "}
              This cannot be undone.
            </p>
            <div className="stu-modal-actions">
              <button
                type="button"
                className="stu-btn-ghost"
                onClick={() => setConfirming(false)}
                disabled={submitting}
              >
                Keep working
              </button>
              <button
                type="button"
                className="stu-cta"
                onClick={doSubmit}
                disabled={submitting}
              >
                {submitting ? "Submitting…" : "Submit exam"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
