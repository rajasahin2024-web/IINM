"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getCourseCertificate,
  StudentApiError,
  type CourseCertificate,
} from "@/lib/studentApi";
import { resolveAssetUrl } from "@/lib/config";
import { useCourse } from "../context";
import SIcon from "../../../icons";

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
}

export default function CourseCertificatePage() {
  const router = useRouter();
  const { courseId, course } = useCourse();
  const [cert, setCert] = useState<CourseCertificate | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    getCourseCertificate(courseId)
      .then((c) => !cancelled && setCert(c))
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof StudentApiError && err.status === 401) router.replace("/signin");
        else setError("Could not load certificate status. Please retry.");
      });
    return () => {
      cancelled = true;
    };
  }, [courseId, router]);

  const pct = cert?.progress?.progressPct ?? 0;

  return (
    <>
      <div className="stu-page-head">
        <h1 className="stu-page-title">Certificate</h1>
        <p className="stu-page-sub">Your course completion certificate and verification.</p>
      </div>

      {error ? (
        <div className="stu-empty" role="alert">
          <SIcon name="cloud-off" size={40} />
          <p className="stu-empty-title">Couldn&apos;t load certificate</p>
          <p className="stu-empty-sub">{error}</p>
          <button className="stu-btn-primary" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      ) : cert === null ? (
        <div aria-busy="true">
          <div className="stu-skel" style={{ height: 220 }} />
        </div>
      ) : cert.state === "eligible" && cert.certificate ? (
        <div className="stu-cert">
          <div className="stu-cert-frame">
            <SIcon name="award" size={40} className="stu-cert-icon" />
            <span className="stu-cert-kicker">Certificate of Completion</span>
            <span className="stu-cert-name">{cert.certificate.studentName}</span>
            <span className="stu-cert-line">has successfully completed</span>
            <span className="stu-cert-course">{cert.certificate.courseTitle}</span>
            {cert.certificate.batchName && (
              <span className="stu-cert-line">Batch: {cert.certificate.batchName}</span>
            )}
            <span className="stu-cert-line">
              Completed on {formatDate(cert.certificate.completionDate)}
            </span>
            <span className="stu-cert-reg">Reg. no: {cert.certificate.registrationNo}</span>
            <span className="stu-cert-code">
              Verification code: <strong>{cert.certificate.verificationCode}</strong>
            </span>
          </div>
          <div className="stu-cert-actions">
            {cert.certificate.certificateImageUrl && (
              <a
                href={resolveAssetUrl(cert.certificate.certificateImageUrl)}
                target="_blank"
                rel="noreferrer"
                className="stu-cta"
                style={{ textDecoration: "none" }}
              >
                <SIcon name="download" size={16} />
                Download
              </a>
            )}
            <Link
              href={cert.certificate.verificationUrl}
              className="stu-btn-ghost"
              style={{ textDecoration: "none" }}
            >
              <SIcon name="check-circle" size={16} />
              Verify certificate
            </Link>
          </div>
          {cert.certificate.certificateImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="stu-cert-preview"
              src={resolveAssetUrl(cert.certificate.certificateImageUrl)}
              alt={`Certificate for ${cert.certificate.courseTitle}`}
            />
          )}
        </div>
      ) : cert.state === "pending" ? (
        <div className="stu-empty">
          <SIcon name="award" size={40} />
          <p className="stu-empty-title">Certificate in progress</p>
          <p className="stu-empty-sub">
            {cert.reason ?? "Complete the course requirements to unlock your certificate."}
          </p>
          {cert.progress && (
            <div className="stu-progress" style={{ width: "100%", maxWidth: 340 }}>
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
                  {cert.progress.completedMaterials}/{cert.progress.totalMaterials} materials
                </span>
                <span>{pct}%</span>
              </div>
            </div>
          )}
          <Link
            href={`/student/courses/${courseId}/content`}
            className="stu-btn-primary"
            style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}
          >
            Continue learning — {course.title}
          </Link>
        </div>
      ) : (
        <div className="stu-empty">
          <SIcon name="award" size={40} />
          <p className="stu-empty-title">No certificate for this course</p>
          <p className="stu-empty-sub">
            {cert.reason ?? "This course does not issue a completion certificate."}
          </p>
        </div>
      )}
    </>
  );
}
