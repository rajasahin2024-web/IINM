"use client";
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  enrollmentLabel,
  enrollmentTone,
  formatINR,
  getStudentCourse,
  StudentApiError,
  type StudentCourseDashboard,
  type StudentMaterial,
} from "@/lib/studentApi";
import { resolveAssetUrl } from "@/lib/config";

/* ── Material helpers ── */

function materialHref(m: StudentMaterial): string | null {
  if (m.youtubeUrl) return m.youtubeUrl;
  if (m.hlsUrl) return resolveAssetUrl(m.hlsUrl);
  if (m.fileUrl) return resolveAssetUrl(m.fileUrl);
  return null;
}

function materialIcon(fileType: string | null): string {
  switch ((fileType ?? "").toLowerCase()) {
    case "video":
      return "play_circle";
    case "pdf":
      return "picture_as_pdf";
    case "youtube":
      return "smart_display";
    case "image":
      return "image";
    case "document":
      return "description";
    default:
      return "attach_file";
  }
}

function formatWhen(iso: string | null): string {
  if (!iso) return "Schedule TBA";
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

/* ── Chapter accordion item ── */

function isLocked(unlockDate: string | null, nowTs: number): boolean {
  if (!unlockDate) return false;
  const t = new Date(unlockDate).getTime();
  return Number.isFinite(t) && t > nowTs;
}

function ChapterBlock({
  chapter,
  index,
  defaultOpen,
  nowTs,
}: {
  chapter: StudentCourseDashboard["chapters"][number];
  index: number;
  defaultOpen: boolean;
  nowTs: number;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const doneCount = chapter.materials.filter((m) => m.isCompleted).length;
  const locked = isLocked(chapter.unlockDate, nowTs);

  return (
    <div className={`stu-chapter ${open ? "open" : ""}`}>
      <button
        type="button"
        className="stu-chapter-head"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span className={`stu-chapter-num ${chapter.isCompleted ? "done" : ""}`} aria-hidden="true">
          {chapter.isCompleted ? "✓" : index + 1}
        </span>
        <span className="stu-chapter-title">{chapter.title}</span>
        {locked ? (
          <span className="stu-badge stu-badge-amber">
            Unlocks {formatWhen(chapter.unlockDate)}
          </span>
        ) : (
          <span className="stu-chapter-meta">
            {doneCount}/{chapter.materials.length} done
          </span>
        )}
        <span className="material-symbols-rounded stu-chapter-chevron" aria-hidden="true">
          expand_more
        </span>
      </button>
      <div className="stu-materials">
        {chapter.materials.length === 0 ? (
          <div className="stu-material-row">No materials in this chapter yet.</div>
        ) : (
          chapter.materials.map((m) => {
            const href = materialHref(m);
            const inner = (
              <>
                <span className="stu-material-icon" aria-hidden="true">
                  <span className="material-symbols-rounded">{materialIcon(m.fileType)}</span>
                </span>
                <span className="stu-material-name">{m.title}</span>
                <span className="stu-material-type">{m.fileType ?? "file"}</span>
                {m.isCompleted && (
                  <span className="stu-material-done" aria-label="Completed">
                    <span className="material-symbols-rounded" aria-hidden="true" style={{ fontSize: 18 }}>
                      check_circle
                    </span>
                  </span>
                )}
              </>
            );
            return href ? (
              <a key={m.id} href={href} target="_blank" rel="noreferrer" className="stu-material-row">
                {inner}
              </a>
            ) : (
              <div key={m.id} className="stu-material-row">{inner}</div>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ── Page ── */

export default function StudentCoursePage() {
  const router = useRouter();
  const params = useParams();
  const courseId = Number(params?.id);

  const [data, setData] = useState<StudentCourseDashboard | null>(null);
  const [nowTs, setNowTs] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!Number.isFinite(courseId)) {
      setError("Invalid course link.");
      return;
    }
    let cancelled = false;
    getStudentCourse(courseId)
      .then((d) => {
        if (cancelled) return;
        setNowTs(Date.now());
        setData(d);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof StudentApiError && err.status === 401) {
          router.replace("/signin");
        } else if (err instanceof StudentApiError && err.status === 403) {
          setError("You do not have access to this course.");
        } else if (err instanceof StudentApiError && err.status === 404) {
          setError("This course was not found on your account.");
        } else {
          setError("Could not load the course. Please retry.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [courseId, router]);

  const upcomingClasses = useMemo(() => {
    if (!data) return [];
    const now = nowTs ?? Number.MAX_SAFE_INTEGER;
    const sorted = [...data.liveClasses].sort((a, b) => {
      const ta = a.scheduledAt ? new Date(a.scheduledAt).getTime() : Infinity;
      const tb = b.scheduledAt ? new Date(b.scheduledAt).getTime() : Infinity;
      return ta - tb;
    });
    const future = sorted.filter((c) => c.scheduledAt && new Date(c.scheduledAt).getTime() >= now - 3600_000);
    return future.length > 0 ? future : sorted;
  }, [data, nowTs]);

  if (error) {
    return (
      <div className="stu-empty" role="alert">
        <span className="material-symbols-rounded" aria-hidden="true">lock</span>
        <p className="stu-empty-title">Unavailable</p>
        <p className="stu-empty-sub">{error}</p>
        <Link href="/student" className="stu-btn-primary" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
          Back to my courses
        </Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div aria-busy="true">
        <div className="stu-skel" style={{ height: 140, marginBottom: 16 }} />
        <div className="stu-skel stu-skel-line" style={{ width: "40%" }} />
        <div className="stu-skel stu-skel-line" />
        <div className="stu-skel stu-skel-line" />
        <div className="stu-skel stu-skel-line" style={{ width: "60%" }} />
      </div>
    );
  }

  const tone = enrollmentTone(data.enrollmentStatus);
  const hasDue = (data.dueAmount ?? 0) > 0.5;

  return (
    <>
      <Link href="/student" className="stu-back-link">
        <span className="material-symbols-rounded" aria-hidden="true" style={{ fontSize: 16 }}>
          arrow_back
        </span>
        My courses
      </Link>

      {/* ── Course hero ── */}
      <div className="stu-hero">
        {data.thumbnailUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="stu-hero-thumb" src={resolveAssetUrl(data.thumbnailUrl)} alt="" />
        )}
        <div className="stu-hero-body">
          <span className={`stu-badge stu-badge-${tone}`} style={{ alignSelf: "flex-start" }}>
            {enrollmentLabel(data.enrollmentStatus)}
          </span>
          <h1 className="stu-hero-title">{data.title}</h1>
          <div className="stu-hero-meta">
            {data.batchName && (
              <span>
                <span className="material-symbols-rounded" aria-hidden="true">groups</span>
                {data.batchName}
                {data.batchMode ? ` · ${data.batchMode}` : ""}
              </span>
            )}
            {data.instructorName && (
              <span>
                <span className="material-symbols-rounded" aria-hidden="true">person</span>
                {data.instructorName}
              </span>
            )}
            {data.skillLevel && (
              <span>
                <span className="material-symbols-rounded" aria-hidden="true">signal_cellular_alt</span>
                {data.skillLevel}
              </span>
            )}
            {data.startDate && (
              <span>
                <span className="material-symbols-rounded" aria-hidden="true">event</span>
                {formatWhen(data.startDate)}
                {data.endDate ? ` → ${formatWhen(data.endDate)}` : ""}
              </span>
            )}
          </div>
          <div className="stu-progress stu-hero-progress">
            <div className="stu-progress-track" role="progressbar" aria-valuenow={Math.round(data.progressPercent)} aria-valuemin={0} aria-valuemax={100}>
              <div className="stu-progress-fill" style={{ width: `${data.progressPercent}%` }} />
            </div>
            <div className="stu-progress-label">
              <span>
                {data.completedMaterials ?? 0}/{data.totalMaterials ?? 0} materials
                {data.taughtChapters !== null && data.totalChapters !== null
                  ? ` · ${data.taughtChapters}/${data.totalChapters} chapters taught`
                  : ""}
              </span>
              <span>{Math.round(data.progressPercent)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Class schedule ── */}
      {(data.routines.length > 0 || data.meetingUrl || upcomingClasses.length > 0) && (
        <section className="stu-section" aria-labelledby="stu-schedule-h">
          <div className="stu-section-head">
            <h2 className="stu-section-title" id="stu-schedule-h">
              <span className="material-symbols-rounded" aria-hidden="true">calendar_month</span>
              Class schedule
            </h2>
            {data.meetingUrl && (
              <a href={data.meetingUrl} target="_blank" rel="noreferrer" className="stu-join-btn">
                <span className="material-symbols-rounded" aria-hidden="true" style={{ fontSize: 16 }}>
                  video_call
                </span>
                Join class
              </a>
            )}
          </div>
          <div className="stu-section-body">
            {data.routines.length > 0 && (
              <div className="stu-routine-list">
                {data.routines.map((r, i) => (
                  <div className="stu-routine-row" key={`${r.dayOfWeek}-${i}`}>
                    <span className="stu-routine-day">{r.dayOfWeek}</span>
                    <span className="stu-routine-time">
                      <span className="material-symbols-rounded" aria-hidden="true">schedule</span>
                      {r.startTime ?? "—"}
                      {r.endTime ? ` – ${r.endTime}` : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {upcomingClasses.length > 0 && (
              <div style={{ marginTop: data.routines.length > 0 ? 8 : 0 }}>
                {upcomingClasses.map((c) => (
                  <div className="stu-live-row" key={c.id}>
                    <div className="stu-live-info">
                      <span className="stu-live-title">{c.title}</span>
                      <span className="stu-live-when">
                        <span className="material-symbols-rounded" aria-hidden="true">event</span>
                        {formatWhen(c.scheduledAt)}
                        {c.chapterTitle ? ` · ${c.chapterTitle}` : ""}
                      </span>
                    </div>
                    {c.meetingUrl && (
                      <a href={c.meetingUrl} target="_blank" rel="noreferrer" className="stu-join-btn">
                        Join
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Course content ── */}
      <section className="stu-section" aria-labelledby="stu-content-h">
        <div className="stu-section-head">
          <h2 className="stu-section-title" id="stu-content-h">
            <span className="material-symbols-rounded" aria-hidden="true">menu_book</span>
            Course content
          </h2>
          <span className="stu-chapter-meta">
            {data.chapters.length} chapter{data.chapters.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="stu-section-body">
          {data.chapters.length === 0 ? (
            <p className="stu-page-sub">Course materials will appear here once published.</p>
          ) : (
            data.chapters.map((ch, i) => (
              <ChapterBlock
                key={ch.id}
                chapter={ch}
                index={i}
                defaultOpen={i === 0}
                nowTs={nowTs ?? 0}
              />
            ))
          )}
        </div>
      </section>

      {/* ── Payment summary ── */}
      {(data.netFee !== null || data.paidAmount !== null || data.dueAmount !== null) && (
        <section className="stu-section" aria-labelledby="stu-pay-h">
          <div className="stu-section-head">
            <h2 className="stu-section-title" id="stu-pay-h">
              <span className="material-symbols-rounded" aria-hidden="true">payments</span>
              Payment summary
            </h2>
            {data.invoiceUuid && (
              <Link
                href={`/invoice/${data.invoiceUuid}`}
                className="stu-back-link"
                style={{ marginBottom: 0 }}
              >
                Invoice {data.invoiceUuid.slice(0, 8)}
                <span className="material-symbols-rounded" aria-hidden="true" style={{ fontSize: 15 }}>
                  open_in_new
                </span>
              </Link>
            )}
          </div>
          <div className="stu-section-body">
            <div className="stu-pay-grid">
              <div className="stu-pay-cell">
                <span className="stu-pay-cell-label">Course fee</span>
                <span className="stu-pay-cell-value">{formatINR(data.netFee)}</span>
              </div>
              <div className="stu-pay-cell">
                <span className="stu-pay-cell-label">Paid</span>
                <span className="stu-pay-cell-value green">{formatINR(data.paidAmount)}</span>
              </div>
              <div className="stu-pay-cell">
                <span className="stu-pay-cell-label">Due</span>
                <span className={`stu-pay-cell-value ${hasDue ? "red" : "green"}`}>
                  {formatINR(data.dueAmount)}
                </span>
              </div>
            </div>
            {hasDue && (
              <p className="stu-page-sub" style={{ marginTop: 10 }}>
                A due amount does not block access — please clear it before your next installment
                date or contact admissions.
              </p>
            )}
          </div>
        </section>
      )}
    </>
  );
}
