"use client";
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  enrollmentLabel,
  enrollmentTone,
  formatINR,
  getCourseNotices,
  type StudentCourseDashboard,
  type StudentNotice,
} from "@/lib/studentApi";
import { resolveAssetUrl } from "@/lib/config";
import { useCourse } from "../context";
import SIcon from "../../../icons";

function formatWhen(iso: string | null): string {
  if (!iso) return "Schedule TBA";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ProgressRing({ pct }: { pct: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const off = c - (Math.min(100, Math.max(0, pct)) / 100) * c;
  return (
    <div className="stu-ring" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <svg width="84" height="84" viewBox="0 0 84 84">
        <circle cx="42" cy="42" r={r} fill="none" stroke="#e2e8f0" strokeWidth="8" />
        <circle
          cx="42"
          cy="42"
          r={r}
          fill="none"
          stroke="#e63946"
          strokeWidth="8"
          strokeDasharray={c}
          strokeDashoffset={off}
          strokeLinecap="butt"
          transform="rotate(-90 42 42)"
        />
      </svg>
      <span className="stu-ring-label">{Math.round(pct)}%</span>
    </div>
  );
}

export default function CourseOverviewPage() {
  const { courseId, course, nowTs } = useCourse();
  const base = `/student/courses/${courseId}`;
  const [notices, setNotices] = useState<StudentNotice[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getCourseNotices(courseId, 3, 0)
      .then(({ items }) => !cancelled && setNotices(items))
      .catch(() => !cancelled && setNotices([]));
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  const nextClass = useMemo(() => {
    const now = nowTs || 0;
    const upcoming = course.liveClasses
      .filter((c) => c.scheduledAt && new Date(c.scheduledAt).getTime() >= now - 3600_000)
      .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime());
    return upcoming[0] ?? null;
  }, [course.liveClasses, nowTs]);

  let resume: { chapter: StudentCourseDashboard["chapters"][number]; material: StudentCourseDashboard["chapters"][number]["materials"][number] } | null = null;
  for (const ch of course.chapters) {
    const m = ch.materials.find((mm) => !mm.isCompleted);
    if (m) {
      resume = { chapter: ch, material: m };
      break;
    }
  }

  const tone = enrollmentTone(course.enrollmentStatus);
  const hasDue = (course.dueAmount ?? 0) > 0.5;

  return (
    <>
      <div className="stu-ov-hero">
        {course.thumbnailUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="stu-ov-hero-thumb" src={resolveAssetUrl(course.thumbnailUrl)} alt="" />
        )}
        <div className="stu-ov-hero-body">
          <div className="stu-ov-hero-top">
            <span className={`stu-badge stu-badge-${tone}`}>
              {enrollmentLabel(course.enrollmentStatus)}
            </span>
            <h1 className="stu-hero-title">{course.title}</h1>
            <div className="stu-hero-meta">
              {course.batchName && (
                <span>
                  <SIcon name="groups" size={15} />
                  {course.batchName}
                  {course.batchMode ? ` · ${course.batchMode}` : ""}
                </span>
              )}
              {course.instructorName && (
                <span>
                  <SIcon name="person" size={15} />
                  {course.instructorName}
                </span>
              )}
              {course.skillLevel && (
                <span>
                  <SIcon name="signal" size={15} />
                  {course.skillLevel}
                </span>
              )}
            </div>
          </div>
          <div className="stu-ov-hero-ring">
            <ProgressRing pct={course.progressPercent} />
            <div className="stu-ov-ring-meta">
              <span className="stu-ov-ring-big">
                {course.completedMaterials ?? 0}/{course.totalMaterials ?? 0}
              </span>
              <span className="stu-ov-ring-sub">materials completed</span>
              {course.taughtChapters !== null && course.totalChapters !== null && (
                <span className="stu-ov-ring-sub">
                  {course.taughtChapters}/{course.totalChapters} chapters taught
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Continue where you left off */}
      {resume ? (
        <Link href={`${base}/content?chapter=${resume.chapter.id}`} className="stu-resume">
          <span className="stu-resume-icon" aria-hidden="true">
            <SIcon name="play" size={20} />
          </span>
          <span className="stu-resume-meta">
            <span className="stu-resume-kicker">Continue where you left off</span>
            <span className="stu-resume-title">{resume.material.title}</span>
            <span className="stu-resume-sub">{resume.chapter.title}</span>
          </span>
          <SIcon name="chevron-right" size={20} />
        </Link>
      ) : (
        <div className="stu-resume stu-resume-done">
          <span className="stu-resume-icon" aria-hidden="true">
            <SIcon name="check-circle" size={20} />
          </span>
          <span className="stu-resume-meta">
            <span className="stu-resume-kicker">All caught up</span>
            <span className="stu-resume-title">You have completed all published materials.</span>
          </span>
        </div>
      )}

      <div className="stu-ov-grid">
        {/* Next live class */}
        <section className="stu-section" aria-labelledby="ov-class-h">
          <div className="stu-section-head">
            <h2 className="stu-section-title" id="ov-class-h">
              <SIcon name="video-call" size={19} />
              Next live class
            </h2>
            <Link href={`${base}/classes`} className="stu-section-link">
              All classes
            </Link>
          </div>
          <div className="stu-section-body">
            {nextClass ? (
              <div className="stu-live-row">
                <div className="stu-live-info">
                  <span className="stu-live-title">{nextClass.title}</span>
                  <span className="stu-live-when">
                    <SIcon name="calendar" size={14} />
                    {formatWhen(nextClass.scheduledAt)}
                    {nextClass.chapterTitle ? ` · ${nextClass.chapterTitle}` : ""}
                  </span>
                </div>
                {nextClass.meetingUrl && (
                  <a href={nextClass.meetingUrl} target="_blank" rel="noreferrer" className="stu-join-btn">
                    Join
                  </a>
                )}
              </div>
            ) : course.meetingUrl ? (
              <div className="stu-live-row">
                <div className="stu-live-info">
                  <span className="stu-live-title">Batch class room</span>
                  <span className="stu-live-when">Recurring session link</span>
                </div>
                <a href={course.meetingUrl} target="_blank" rel="noreferrer" className="stu-join-btn">
                  <SIcon name="video-call" size={16} />
                  Join class
                </a>
              </div>
            ) : (
              <p className="stu-page-sub">No upcoming class scheduled yet.</p>
            )}
          </div>
        </section>

        {/* Fee snapshot */}
        <section className="stu-section" aria-labelledby="ov-fee-h">
          <div className="stu-section-head">
            <h2 className="stu-section-title" id="ov-fee-h">
              <SIcon name="payments" size={19} />
              Fees
            </h2>
            <Link href={`${base}/payments`} className="stu-section-link">
              Details
            </Link>
          </div>
          <div className="stu-section-body">
            <div className="stu-pay-grid">
              <div className="stu-pay-cell">
                <span className="stu-pay-cell-label">Course fee</span>
                <span className="stu-pay-cell-value">{formatINR(course.netFee)}</span>
              </div>
              <div className="stu-pay-cell">
                <span className="stu-pay-cell-label">Paid</span>
                <span className="stu-pay-cell-value green">{formatINR(course.paidAmount)}</span>
              </div>
              <div className="stu-pay-cell">
                <span className="stu-pay-cell-label">Due</span>
                <span className={`stu-pay-cell-value ${hasDue ? "red" : "green"}`}>
                  {formatINR(course.dueAmount)}
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Latest notices */}
      <section className="stu-section" aria-labelledby="ov-notice-h">
        <div className="stu-section-head">
          <h2 className="stu-section-title" id="ov-notice-h">
            <SIcon name="bell" size={19} />
            Latest notices
          </h2>
          <Link href={`${base}/notices`} className="stu-section-link">
            View all
          </Link>
        </div>
        <div className="stu-section-body">
          {notices === null ? (
            <>
              <div className="stu-skel stu-skel-line" />
              <div className="stu-skel stu-skel-line" style={{ width: "70%" }} />
            </>
          ) : notices.length === 0 ? (
            <p className="stu-page-sub">No notices right now.</p>
          ) : (
            notices.map((n) => (
              <Link href={`${base}/notices`} key={n.id} className="stu-notice-row">
                {n.isPinned && <SIcon name="flag" size={15} className="stu-notice-pin" />}
                <span className="stu-notice-row-title">{n.title}</span>
                <span className="stu-notice-row-date">{formatWhen(n.noticeDate)}</span>
              </Link>
            ))
          )}
        </div>
      </section>
    </>
  );
}
