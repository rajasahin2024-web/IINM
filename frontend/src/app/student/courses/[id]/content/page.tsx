"use client";
import React, { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useCourse } from "../context";
import { resolveAssetUrl } from "@/lib/config";
import type { StudentMaterial, StudentChapter } from "@/lib/studentApi";
import SIcon from "../../../icons";

function materialHref(m: StudentMaterial): string | null {
  if (m.youtubeUrl) return m.youtubeUrl;
  if (m.hlsUrl) return resolveAssetUrl(m.hlsUrl);
  if (m.fileUrl) return resolveAssetUrl(m.fileUrl);
  return null;
}

function materialIcon(fileType: string | null): string {
  switch ((fileType ?? "").toLowerCase()) {
    case "video":
      return "play";
    case "pdf":
      return "pdf";
    case "youtube":
      return "youtube";
    case "image":
      return "image";
    default:
      return "file";
  }
}

function formatWhen(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

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
  chapter: StudentChapter;
  index: number;
  defaultOpen: boolean;
  nowTs: number;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const doneCount = chapter.materials.filter((m) => m.isCompleted).length;
  const locked = isLocked(chapter.unlockDate, nowTs);

  return (
    <div className={`stu-chapter ${open ? "open" : ""}`} id={`chapter-${chapter.id}`}>
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
          <span className="stu-badge stu-badge-amber">Unlocks {formatWhen(chapter.unlockDate)}</span>
        ) : (
          <span className="stu-chapter-meta">
            {doneCount}/{chapter.materials.length} done
          </span>
        )}
        <SIcon name="chevron" size={18} className="stu-chapter-chevron" />
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
                  <SIcon name={materialIcon(m.fileType)} size={17} />
                </span>
                <span className="stu-material-name">{m.title}</span>
                <span className="stu-material-type">{m.fileType ?? "file"}</span>
                {m.isCompleted && (
                  <span className="stu-material-done" aria-label="Completed">
                    <SIcon name="check-circle" size={18} />
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
        {chapter.liveClasses.length > 0 && (
          <div className="stu-chapter-classes">
            {chapter.liveClasses.map((lc) => (
              <div className="stu-material-row" key={lc.id}>
                <span className="stu-material-icon" aria-hidden="true">
                  <SIcon name="video-call" size={17} />
                </span>
                <span className="stu-material-name">{lc.title}</span>
                <span className="stu-material-type">{formatWhen(lc.scheduledAt) || "live"}</span>
                {lc.meetingUrl && (
                  <a
                    href={lc.meetingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="stu-join-btn stu-join-sm"
                  >
                    Join
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ContentBody() {
  const { course, nowTs } = useCourse();
  const searchParams = useSearchParams();
  const focusChapter = Number(searchParams?.get("chapter"));

  return (
    <>
      <div className="stu-page-head">
        <h1 className="stu-page-title">Course content</h1>
        <p className="stu-page-sub">
          {course.chapters.length} chapter{course.chapters.length === 1 ? "" : "s"} ·{" "}
          {course.completedMaterials ?? 0}/{course.totalMaterials ?? 0} materials completed
        </p>
      </div>

      {course.chapters.length === 0 ? (
        <div className="stu-empty">
          <SIcon name="book" size={40} />
          <p className="stu-empty-title">No content yet</p>
          <p className="stu-empty-sub">
            Course materials will appear here once published by your instructor.
          </p>
        </div>
      ) : (
        <div>
          {course.chapters.map((ch, i) => (
            <ChapterBlock
              key={ch.id}
              chapter={ch}
              index={i}
              defaultOpen={Number.isFinite(focusChapter) ? ch.id === focusChapter : i === 0}
              nowTs={nowTs}
            />
          ))}
        </div>
      )}
    </>
  );
}

export default function CourseContentPage() {
  return (
    <Suspense
      fallback={
        <div aria-busy="true">
          <div className="stu-skel stu-skel-line" style={{ width: "35%" }} />
          <div className="stu-skel" style={{ height: 52, marginBottom: 10 }} />
          <div className="stu-skel" style={{ height: 52, marginBottom: 10 }} />
          <div className="stu-skel" style={{ height: 52 }} />
        </div>
      }
    >
      <ContentBody />
    </Suspense>
  );
}
