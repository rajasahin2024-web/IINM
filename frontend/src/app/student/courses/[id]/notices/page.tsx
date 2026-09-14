"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DOMPurify from "isomorphic-dompurify";
import { getCourseNotices, StudentApiError, type StudentNotice } from "@/lib/studentApi";
import { resolveAssetUrl } from "@/lib/config";
import { useCourse } from "../context";
import SIcon from "../../../icons";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function CourseNoticesPage() {
  const router = useRouter();
  const { courseId } = useCourse();
  const [notices, setNotices] = useState<StudentNotice[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    getCourseNotices(courseId, 50, 0)
      .then(({ items }) => {
        if (cancelled) return;
        setNotices(items);
        // Mark the newest notice as seen → clears the sidebar "NEW" badge.
        try {
          if (items[0]) localStorage.setItem(`stu_notices_seen_${courseId}`, String(items[0].id));
        } catch {}
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof StudentApiError && err.status === 401) router.replace("/signin");
        else setError("Could not load notices. Please retry.");
      });
    return () => {
      cancelled = true;
    };
  }, [courseId, router]);

  return (
    <>
      <div className="stu-page-head">
        <h1 className="stu-page-title">Notices</h1>
        <p className="stu-page-sub">Announcements from the institute and your batch.</p>
      </div>

      {error ? (
        <div className="stu-empty" role="alert">
          <SIcon name="cloud-off" size={40} />
          <p className="stu-empty-title">Couldn&apos;t load notices</p>
          <p className="stu-empty-sub">{error}</p>
          <button className="stu-btn-primary" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      ) : notices === null ? (
        <div aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div className="stu-skel" style={{ height: 96, marginBottom: 12 }} key={i} />
          ))}
        </div>
      ) : notices.length === 0 ? (
        <div className="stu-empty">
          <SIcon name="bell" size={40} />
          <p className="stu-empty-title">No notices</p>
          <p className="stu-empty-sub">You&apos;re all caught up. New notices will show here.</p>
        </div>
      ) : (
        <div className="stu-notice-list">
          {notices.map((n) => (
            <article className={`stu-notice-card ${n.isPinned ? "pinned" : ""}`} key={n.id}>
              {n.coverImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="stu-notice-cover" src={resolveAssetUrl(n.coverImage)} alt="" loading="lazy" />
              )}
              <div className="stu-notice-body">
                <div className="stu-notice-toprow">
                  <span className="stu-badge stu-badge-blue">{n.category}</span>
                  {n.scope === "batch" && <span className="stu-badge stu-badge-gray">Your batch</span>}
                  {n.isPinned && (
                    <span className="stu-badge stu-badge-red">
                      <SIcon name="flag" size={11} />
                      Pinned
                    </span>
                  )}
                  <span className="stu-notice-date">{formatDate(n.noticeDate)}</span>
                </div>
                <h2 className="stu-notice-title">{n.title}</h2>
                {n.noticeNo && <span className="stu-notice-no">Notice no. {n.noticeNo}</span>}
                {n.description && (
                  <div
                    className="stu-notice-desc"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(n.description, { USE_PROFILES: { html: true } }) }}
                  />
                )}
                {n.attachmentUrl && (
                  <a
                    href={resolveAssetUrl(n.attachmentUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="stu-notice-attach"
                  >
                    <SIcon name="download" size={15} />
                    {n.attachmentName || "Download attachment"}
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
