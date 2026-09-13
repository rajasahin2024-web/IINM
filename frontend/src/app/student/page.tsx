"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  enrollmentLabel,
  enrollmentTone,
  formatINR,
  getMyCourses,
  StudentApiError,
  type StudentCourseCard,
} from "@/lib/studentApi";
import { resolveAssetUrl } from "@/lib/config";
import { useStudent } from "./context";

function CourseCardItem({ card }: { card: StudentCourseCard }) {
  const router = useRouter();
  const tone = enrollmentTone(card.enrollmentStatus);
  const hasDue = (card.dueAmount ?? 0) > 0.5;
  const hasPaid = (card.paidAmount ?? 0) > 0.5;

  return (
    <button
      type="button"
      className="stu-card"
      onClick={() => router.push(`/student/courses/${card.courseId}`)}
      aria-label={`Open ${card.title}`}
    >
      <div className="stu-card-thumb">
        {card.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={resolveAssetUrl(card.thumbnailUrl)} alt="" loading="lazy" />
        ) : (
          <div className="stu-card-thumb-fallback" aria-hidden="true">
            {card.title.slice(0, 2).toUpperCase()}
          </div>
        )}
        <span className={`stu-badge stu-badge-${tone} stu-card-status`}>
          {enrollmentLabel(card.enrollmentStatus)}
        </span>
      </div>

      <div className="stu-card-body">
        <h3 className="stu-card-title">{card.title}</h3>

        {card.batchName && (
          <div className="stu-card-batch">
            <span className="material-symbols-rounded" aria-hidden="true">groups</span>
            <span>
              {card.batchName}
              {card.batchMode ? ` · ${card.batchMode}` : ""}
            </span>
          </div>
        )}

        <div className="stu-progress">
          <div className="stu-progress-track" role="progressbar" aria-valuenow={Math.round(card.progressPercent)} aria-valuemin={0} aria-valuemax={100}>
            <div className="stu-progress-fill" style={{ width: `${card.progressPercent}%` }} />
          </div>
          <div className="stu-progress-label">
            <span>Course progress</span>
            <span>{Math.round(card.progressPercent)}%</span>
          </div>
        </div>

        <div className="stu-pay-row">
          <span>
            {hasPaid && <span className="stu-pay-paid">Paid {formatINR(card.paidAmount)}</span>}
            {hasPaid && hasDue && " · "}
            {hasDue && <span className="stu-pay-due">Due {formatINR(card.dueAmount)}</span>}
            {!hasPaid && !hasDue && (
              <span className="stu-pay-free">
                {card.purchaseStatus === "completed" ? "Fully paid" : "No dues"}
              </span>
            )}
          </span>
          {card.invoiceUuid && (
            <span className="stu-pay-invoice" title="Invoice reference">
              <span className="material-symbols-rounded" aria-hidden="true">receipt_long</span>
              {card.invoiceUuid.slice(0, 8)}
            </span>
          )}
        </div>

        {card.isInstallment && card.nextInstallment?.dueDate && (
          <div className="stu-card-batch" style={{ borderTop: "none", paddingTop: 0 }}>
            <span className="material-symbols-rounded" aria-hidden="true">event_repeat</span>
            <span>
              Next installment {formatINR(card.nextInstallment.amount)} due{" "}
              {new Date(card.nextInstallment.dueDate).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
              })}
            </span>
          </div>
        )}
      </div>
    </button>
  );
}

function CardSkeleton() {
  return (
    <div className="stu-skel-card" aria-hidden="true">
      <div className="stu-skel stu-skel-thumb" />
      <div className="stu-skel stu-skel-line" style={{ width: "70%" }} />
      <div className="stu-skel stu-skel-line" style={{ width: "45%" }} />
      <div className="stu-skel stu-skel-line" style={{ width: "90%" }} />
    </div>
  );
}

export default function StudentHomePage() {
  const router = useRouter();
  const { profile } = useStudent();
  const [cards, setCards] = useState<StudentCourseCard[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    getMyCourses()
      .then((list) => !cancelled && setCards(list))
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof StudentApiError && err.status === 401) {
          router.replace("/signin");
        } else {
          setError("Could not load your courses. Pull to retry.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <>
      <div className="stu-page-head">
        <h1 className="stu-page-title">
          Hi {profile.first_name}, your courses
        </h1>
        <p className="stu-page-sub">
          Track progress, join live classes and manage your enrollments.
        </p>
      </div>

      {error ? (
        <div className="stu-empty" role="alert">
          <span className="material-symbols-rounded" aria-hidden="true">cloud_off</span>
          <p className="stu-empty-title">Couldn&apos;t load courses</p>
          <p className="stu-empty-sub">{error}</p>
          <button className="stu-btn-primary" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      ) : cards === null ? (
        <div className="stu-grid">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : cards.length === 0 ? (
        <div className="stu-empty">
          <span className="material-symbols-rounded" aria-hidden="true">school</span>
          <p className="stu-empty-title">No courses yet</p>
          <p className="stu-empty-sub">
            You are not enrolled in any course yet. Browse the catalogue or contact admissions to
            get started.
          </p>
          <Link href="/courses" className="stu-btn-primary" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
            Browse courses
          </Link>
        </div>
      ) : (
        <div className="stu-grid">
          {cards.map((c) => (
            <CourseCardItem key={`${c.courseId}-${c.batchId ?? "x"}`} card={c} />
          ))}
        </div>
      )}
    </>
  );
}
