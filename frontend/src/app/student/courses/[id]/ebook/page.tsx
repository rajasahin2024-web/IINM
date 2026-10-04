"use client";
import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getEbookMeta,
  StudentApiError,
  type EbookMeta,
  type StudentMaterial,
} from "@/lib/studentApi";
import { useCourse } from "../context";
import SIcon from "../../../icons";
import EbookReader from "./EbookReader";

/* ────────────────────────────────────────────────────────────
   /student/courses/[id]/ebook — in-platform eBook reader.

   The eBook lives inside the panel only: pdf.js pulls private
   bytes through the authenticated reader API and paints them on
   a canvas — no download link exists anywhere in the UI.
   ──────────────────────────────────────────────────────────── */

function EbookPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { courseId, course } = useCourse();

  const ebookMaterials = useMemo(
    () =>
      course.chapters.flatMap((ch) =>
        ch.materials.filter((m) => (m.fileType ?? "").toLowerCase() === "ebook")
      ),
    [course.chapters]
  );

  const requested = Number(searchParams?.get("material"));
  const material: StudentMaterial | undefined =
    ebookMaterials.find((m) => m.id === requested) ?? ebookMaterials[0];

  // Loaded state is keyed by material id so switching eBooks naturally
  // shows the loading skeleton — no synchronous resets inside the effect.
  const [loaded, setLoaded] = useState<{ id: number; meta: EbookMeta } | null>(null);
  const [failed, setFailed] = useState<{ id: number; message: string } | null>(null);

  useEffect(() => {
    if (!material) return;
    const materialId = material.id;
    let cancelled = false;
    getEbookMeta(materialId)
      .then((m) => !cancelled && setLoaded({ id: materialId, meta: m }))
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof StudentApiError && err.status === 401) {
          router.replace("/signin");
        } else if (err instanceof StudentApiError && err.status === 403) {
          setFailed({ id: materialId, message: "You do not have access to this eBook." });
        } else {
          setFailed({ id: materialId, message: "Could not load the eBook. Please retry." });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [material, router]);

  const meta = material && loaded?.id === material.id ? loaded.meta : null;
  const error = material && failed?.id === material.id ? failed.message : "";

  const switchMaterial = (id: number) => {
    router.replace(`${`/student/courses/${courseId}`}/ebook?material=${id}`);
  };

  if (ebookMaterials.length === 0) {
    return (
      <div className="stu-empty">
        <SIcon name="book-open" size={40} />
        <p className="stu-empty-title">No eBook in this course</p>
        <p className="stu-empty-sub">
          This course does not include an eBook. Check the course content instead.
        </p>
        <Link
          href={`/student/courses/${courseId}/content`}
          className="stu-btn-primary"
          style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}
        >
          Go to course content
        </Link>
      </div>
    );
  }

  return (
    <>
      {ebookMaterials.length > 1 && (
        <div className="stu-ebook-switcher" role="tablist" aria-label="Course eBooks">
          {ebookMaterials.map((m) => (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={m.id === material?.id}
              className={`stu-ebook-tab ${m.id === material?.id ? "active" : ""}`}
              onClick={() => switchMaterial(m.id)}
            >
              <SIcon name="book-open" size={15} />
              <span className="stu-ebook-tab-title">{m.title}</span>
              {m.ebookPageCount ? <span className="stu-ebook-tab-sub">{m.ebookPageCount}p</span> : null}
            </button>
          ))}
        </div>
      )}

      {error ? (
        <div className="stu-empty" role="alert">
          <SIcon name="lock" size={40} />
          <p className="stu-empty-title">eBook unavailable</p>
          <p className="stu-empty-sub">{error}</p>
          <button className="stu-btn-primary" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      ) : meta === null ? (
        <div aria-busy="true">
          <div className="stu-skel" style={{ height: 52, marginBottom: 12 }} />
          <div className="stu-skel" style={{ height: 420 }} />
        </div>
      ) : !meta.hasFile ? (
        <div className="stu-empty">
          <SIcon name="book-open" size={40} />
          <p className="stu-empty-title">eBook coming soon</p>
          <p className="stu-empty-sub">
            The eBook file for “{meta.title}” has not been uploaded yet. Please check back later.
          </p>
        </div>
      ) : (
        <EbookReader key={meta.id} meta={meta} />
      )}
    </>
  );
}

export default function CourseEbookPage() {
  return (
    <Suspense
      fallback={
        <div aria-busy="true">
          <div className="stu-skel" style={{ height: 52, marginBottom: 12 }} />
          <div className="stu-skel" style={{ height: 420 }} />
        </div>
      }
    >
      <EbookPageInner />
    </Suspense>
  );
}
