"use client";
import React, { useMemo } from "react";
import { useCourse } from "../context";
import SIcon from "../../../icons";

function formatWhen(iso: string | null): string {
  if (!iso) return "Schedule TBA";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CourseClassesPage() {
  const { course, nowTs } = useCourse();

  const { upcoming, past } = useMemo(() => {
    const now = nowTs || 0;
    const sorted = [...course.liveClasses].sort((a, b) => {
      const ta = a.scheduledAt ? new Date(a.scheduledAt).getTime() : Infinity;
      const tb = b.scheduledAt ? new Date(b.scheduledAt).getTime() : Infinity;
      return ta - tb;
    });
    return {
      upcoming: sorted.filter((c) => !c.scheduledAt || new Date(c.scheduledAt).getTime() >= now - 3600_000),
      past: sorted
        .filter((c) => c.scheduledAt && new Date(c.scheduledAt).getTime() < now - 3600_000)
        .reverse(),
    };
  }, [course.liveClasses, nowTs]);

  return (
    <>
      <div className="stu-page-head">
        <h1 className="stu-page-title">Live classes</h1>
        <p className="stu-page-sub">Weekly routine and scheduled sessions for your batch.</p>
      </div>

      {/* Weekly routine */}
      {course.routines.length > 0 && (
        <section className="stu-section" aria-labelledby="cl-routine-h">
          <div className="stu-section-head">
            <h2 className="stu-section-title" id="cl-routine-h">
              <SIcon name="repeat" size={19} />
              Weekly routine
            </h2>
            {course.meetingUrl && (
              <a href={course.meetingUrl} target="_blank" rel="noreferrer" className="stu-join-btn">
                <SIcon name="video-call" size={16} />
                Join class
              </a>
            )}
          </div>
          <div className="stu-section-body">
            <div className="stu-routine-list">
              {course.routines.map((r, i) => (
                <div className="stu-routine-row" key={`${r.dayOfWeek}-${i}`}>
                  <span className="stu-routine-day">{r.dayOfWeek}</span>
                  <span className="stu-routine-time">
                    <SIcon name="clock" size={15} />
                    {r.startTime ?? "—"}
                    {r.endTime ? ` – ${r.endTime}` : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Upcoming sessions */}
      <section className="stu-section" aria-labelledby="cl-upcoming-h">
        <div className="stu-section-head">
          <h2 className="stu-section-title" id="cl-upcoming-h">
            <SIcon name="calendar" size={19} />
            Upcoming sessions
          </h2>
        </div>
        <div className="stu-section-body">
          {upcoming.length === 0 ? (
            <p className="stu-page-sub">No upcoming sessions scheduled.</p>
          ) : (
            upcoming.map((c) => (
              <div className="stu-live-row" key={c.id}>
                <div className="stu-live-info">
                  <span className="stu-live-title">{c.title}</span>
                  <span className="stu-live-when">
                    <SIcon name="calendar" size={14} />
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
            ))
          )}
        </div>
      </section>

      {/* Past sessions */}
      {past.length > 0 && (
        <section className="stu-section" aria-labelledby="cl-past-h">
          <div className="stu-section-head">
            <h2 className="stu-section-title" id="cl-past-h">
              <SIcon name="clock" size={19} />
              Past sessions
            </h2>
          </div>
          <div className="stu-section-body">
            {past.map((c) => (
              <div className="stu-live-row" key={c.id}>
                <div className="stu-live-info">
                  <span className="stu-live-title">{c.title}</span>
                  <span className="stu-live-when">
                    <SIcon name="calendar" size={14} />
                    {formatWhen(c.scheduledAt)}
                    {c.chapterTitle ? ` · ${c.chapterTitle}` : ""}
                  </span>
                </div>
                <span className="stu-badge stu-badge-gray">Done</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {course.routines.length === 0 && upcoming.length === 0 && past.length === 0 && (
        <div className="stu-empty">
          <SIcon name="video-call" size={40} />
          <p className="stu-empty-title">No live classes yet</p>
          <p className="stu-empty-sub">
            Your batch schedule and class links will appear here once published.
          </p>
        </div>
      )}
    </>
  );
}
