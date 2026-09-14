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
import SIcon from "./icons";

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function AdmissionCard({ card }: { card: StudentCourseCard }) {
  const router = useRouter();
  const tone = enrollmentTone(card.enrollmentStatus);
  const hasDue = (card.dueAmount ?? 0) > 0.5;
  const hasPaid = (card.paidAmount ?? 0) > 0.5;
  const admissionDate = formatDate(card.joinDate);
  const pct = Math.round(card.progressPercent);

  const open = () => router.push(`/student/courses/${card.courseId}`);

  return (
    <article className="stu-adm-card">
      <button
        type="button"
        className="stu-adm-hit"
        onClick={open}
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
          {card.batchMode && (
            <span className="stu-badge stu-badge-navy stu-card-mode">{card.batchMode}</span>
          )}
        </div>

        <div className="stu-card-body">
          <h3 className="stu-card-title">{card.title}</h3>

          <div className="stu-adm-meta">
            {card.instructorName && (
              <span className="stu-adm-meta-item">
                <SIcon name="person" size={15} />
                {card.instructorName}
              </span>
            )}
            {card.batchName && (
              <span className="stu-adm-meta-item">
                <SIcon name="groups" size={15} />
                {card.batchName}
              </span>
            )}
            {admissionDate && (
              <span className="stu-adm-meta-item">
                <SIcon name="calendar" size={15} />
                Admitted {admissionDate}
              </span>
            )}
          </div>

          <div className="stu-progress">
            <div
              className="stu-progress-track"
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className="stu-progress-fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="stu-progress-label">
              <span>
                {card.completedMaterials}/{card.totalMaterials} materials
              </span>
              <span>{pct}%</span>
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
                <SIcon name="receipt" size={14} />
                {card.invoiceUuid.slice(0, 8)}
              </span>
            )}
          </div>

          {card.isInstallment && card.nextInstallment?.dueDate && (
            <div className="stu-adm-meta-item stu-card-installment">
              <SIcon name="repeat" size={15} />
              <span>
                Next installment {formatINR(card.nextInstallment.amount)} due{" "}
                {formatDate(card.nextInstallment.dueDate)}
              </span>
            </div>
          )}
        </div>
      </button>

      <div className="stu-adm-cta-row">
        <button type="button" className="stu-cta" onClick={open}>
          Enter course
          <SIcon name="arrow-right" size={16} />
        </button>
      </div>
    </article>
  );
}

function CardSkeleton() {
  return (
    <div className="stu-skel-card" aria-hidden="true">
      <div className="stu-skel stu-skel-thumb" />
      <div className="stu-skel stu-skel-line" style={{ width: "70%" }} />
      <div className="stu-skel stu-skel-line" style={{ width: "45%" }} />
      <div className="stu-skel stu-skel-line" style={{ width: "90%" }} />
      <div className="stu-skel" style={{ height: 44, margin: "10px 14px 0" }} />
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
          <SIcon name="cloud-off" size={40} />
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
          <SIcon name="school" size={40} />
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
            <AdmissionCard key={`${c.courseId}-${c.batchId ?? "x"}`} card={c} />
          ))}
        </div>
      )}
    </>
  );
}
