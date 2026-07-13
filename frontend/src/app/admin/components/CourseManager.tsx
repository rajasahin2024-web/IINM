"use client";
import { apiFetch } from "@/lib/apiFetch";
import React, { useEffect, useState, useCallback } from "react";
import { useToast } from "./ToastProvider";
import DeleteModal from "./DeleteModal";
import { Icon } from "../icons";
import { API_BASE_URL } from "@/lib/config";

const API = `${API_BASE_URL}`;

function getYouTubeId(url: string): string | null {
  const regExp = /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/;
  const match = url.match(regExp);
  return match ? match[1] : null;
}

const TYPE_CONFIG: Record<string, { bg: string; color: string; label: string }> = {
  video:    { bg: "#ede9fe", color: "#7c3aed", label: "VIDEO" },
  youtube:  { bg: "#fee2e2", color: "#dc2626", label: "YT" },
  pdf:      { bg: "#fef3c7", color: "#d97706", label: "PDF" },
  image:    { bg: "#d1fae5", color: "#059669", label: "IMG" },
  document: { bg: "#dbeafe", color: "#2563eb", label: "DOC" },
};

function getTypeConfig(type: string) {
  return TYPE_CONFIG[type] || { bg: "#f1f5f9", color: "#64748b", label: type.toUpperCase() };
}

function MediaPreviewModal({ material, onClose }: { material: Material; onClose: () => void }) {
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const ytId = material.youtube_url ? getYouTubeId(material.youtube_url) : null;
  const tc = getTypeConfig(material.file_type || "document");

  const renderPlayer = () => {
    if (material.file_type === "youtube" && ytId) {
      return (
        <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, width: "100%" }}>
          <iframe src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none", borderRadius: 10 }} />
        </div>
      );
    }
    if (material.file_type === "video" && material.file_url) {
      return <video src={material.file_url} controls autoPlay controlsList="nodownload" style={{ width: "100%", maxHeight: "70vh", borderRadius: 10, background: "#000", display: "block" }} />;
    }
    if (material.file_type === "pdf" && material.file_url) {
      return <iframe src={material.file_url} style={{ width: "100%", height: "70vh", border: "none", borderRadius: 10 }} title={material.title} />;
    }
    if (material.file_type === "image" && material.file_url) {
      return <img src={material.file_url} alt={material.title} style={{ maxWidth: "100%", maxHeight: "70vh", borderRadius: 10, display: "block", margin: "0 auto", objectFit: "contain" }} />;
    }
    return (
      <div style={{ textAlign: "center", padding: "60px 20px", color: "#94a3b8" }}>
        <p style={{ margin: 0, fontSize: 14 }}>No preview available.</p>
        {material.file_url && (
          <a href={material.file_url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: 14, padding: "8px 20px", background: "#6366f1", color: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>Open File ↗</a>
        )}
      </div>
    );
  };

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }} style={{ position: "fixed", inset: 0, zIndex: 99999, background: "rgba(10,15,30,0.85)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ background: "#0f172a", borderRadius: 18, width: "100%", maxWidth: 900, boxShadow: "0 40px 100px rgba(0,0,0,0.6)", overflow: "hidden", animation: "slideUp 0.3s ease-out" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", background: "#1e293b", borderBottom: "1px solid #334155" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ background: tc.bg, color: tc.color, fontSize: 10, fontWeight: 800, padding: "3px 9px", borderRadius: 6 }}>{tc.label}</span>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#f1f5f9", maxWidth: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{material.title}</h3>
          </div>
          <button onClick={onClose} style={{ background: "#334155", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8" }}>
            <Icon name="x" size={16} />
          </button>
        </div>
        <div style={{ padding: "20px", background: "#0f172a" }}>{renderPlayer()}</div>
      </div>
    </div>
  );
}



interface SubCategory {
  id: number;
  name: string;
}

interface Subject {
  id: number;
  name: string;
  subcategory_id: number;
}

interface Material {
  id: number;
  title: string;
  file_type: string;
  file_url: string;
  youtube_url: string;
}


interface LiveClass {
  id: number;
  chapter_id: number;
  title: string;
  meeting_url: string;
  scheduled_at: string | null;
  created_at: string;
}

interface Chapter {
  id: number;
  title: string;
  subject_id: number;
  is_active: boolean;
}

interface Instructor {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  bio?: string;
  avatar_url?: string;
}

interface Course {
  id: number;
  title: string;
  description: string;
  subjects: Subject[];
  chapter_ids: number[];
  start_date?: string;
  end_date?: string;
  validity_days?: number;
  price?: number;
  discount_price?: number;
  price_usd?: number;
  discount_price_usd?: number;
  is_free?: boolean;
  thumbnail_url?: string;
  promo_video_url?: string;
  status?: string;
  is_featured?: boolean;
  instructor_name?: string;
  instructors?: { id: number; name: string; phone?: string }[];
  skill_level?: string;
  prerequisites?: string;
  what_you_will_learn?: string;
  target_audience?: string;
  has_certificate?: boolean;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string;
  upload_syllabus?: string;
  created_at: string;
}

function ImageDropzoneField({
  label, value, onChange, placeholder
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string;
}) {
  const { showToast } = useToast();
  const [uploading, setUploading] = React.useState(false);
  const [dragOver, setDragOver] = React.useState(false);

  const handleFile = async (file: File) => {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await apiFetch(`${API_BASE_URL}/settings/site/upload`, {
        method: "POST",
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        onChange(data.url);
        showToast("File uploaded!");
      } else {
        showToast("Upload failed", "error");
      }
    } catch {
      showToast("Network error. Could not upload file.", "error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 10, fontWeight: 800, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</label>
      <div 
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => {
           e.preventDefault(); setDragOver(false); 
           if(e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
        }}
        style={{
          border: dragOver ? "2px dashed #0ea5e9" : "1px solid #e2e8f0",
          background: dragOver ? "#f0f9ff" : "#f8fafc",
          borderRadius: 8,
          padding: "16px",
          transition: "all 0.2s"
        }}
      >
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
           {value && (value.startsWith("http") || value.startsWith("/")) && (
             value.toLowerCase().endsWith(".pdf") ? (
               <div style={{ width: 36, height: 36, borderRadius: 6, background: "#fef3c7", color: "#d97706", display: "flex", alignItems: "center", justifyContent: "center" }}>
                 <Icon name="file-text" size={20} />
               </div>
             ) : (
               <img src={value.startsWith("http") ? value : `${API_BASE_URL.replace('/api', '')}${value}`} alt="Preview" style={{ width: 36, height: 36, borderRadius: 6, objectFit: "cover" }} />
             )
           )}
           <div style={{ flex: 1 }}>
             <input 
               type="text" 
               value={value} 
               onChange={e => onChange(e.target.value)} 
               placeholder={placeholder} 
               style={{ width: "100%", padding: "8px 0", border: "none", background: "transparent", outline: "none", fontSize: 13, color: "#0f172a" }} 
             />
           </div>
           
           <div style={{ position: "relative", overflow: "hidden" }}>
             <button type="button" disabled={uploading} style={{ background: "#e0f2fe", color: "#0284c7", border: "1px solid #bae6fd", padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
               {uploading ? "Uploading..." : "Upload File"}
             </button>
             <input type="file" accept="image/*,application/pdf" onChange={e => {
                if (e.target.files) handleFile(e.target.files[0]);
                e.target.value = ""; // reset
             }} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer" }} />
           </div>
        </div>
        <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 8, fontWeight: 600 }}>
          {uploading ? "Uploading, please wait..." : "Paste a URL or drag & drop a file here"}
        </div>
      </div>
    </div>
  );
}

function FloatingField({ label, type = "text", value, onChange, placeholder, isTextArea = false, isSelect = false, options = [], min, autoFocus = false }: any) {
  const [focused, setFocused] = React.useState(false);
  const hasValue = value !== undefined && value !== null && value !== "";
  
  const containerStyle: React.CSSProperties = { position: "relative", width: "100%" };
  // For select fields, ALWAYS float the label because select always shows an option visually
  const floatActive = focused || hasValue || isSelect;
  
  const labelStyle: React.CSSProperties = {
    position: "absolute", left: "12px", 
    top: floatActive ? "-8px" : (isTextArea ? "14px" : "50%"),
    transform: floatActive ? "none" : (isTextArea ? "none" : "translateY(-50%)"),
    fontSize: floatActive ? "11px" : "13.5px", 
    fontWeight: floatActive ? 700 : 500,
    color: focused ? "#0ea5e9" : floatActive ? "#64748b" : "#94a3b8",
    background: floatActive ? "#fff" : "transparent", 
    padding: floatActive ? "0 4px" : "0 4px", 
    transition: "all 0.2s cubic-bezier(.4,0,.2,1)",
    pointerEvents: "none", zIndex: 5, letterSpacing: floatActive ? "0.3px" : "0"
  };

  const fieldStyle: React.CSSProperties = {
    width: "100%", padding: "14px 16px", borderRadius: "8px",
    border: `1.5px solid ${focused ? "#0ea5e9" : "#e2e8f0"}`,
    outline: "none", fontSize: "14px", color: "#0f172a", background: "#fff",
    transition: "border-color 0.2s, box-shadow 0.2s", boxSizing: "border-box",
    resize: isTextArea ? "vertical" : "none", fontFamily: "inherit",
    appearance: isSelect ? "none" : undefined,
    minHeight: isTextArea ? "100px" : "auto",
    boxShadow: focused ? "0 0 0 3px rgba(14, 165, 233, 0.15)" : "none"
  };

  const commonProps = {
    value, onChange: (e: any) => onChange(e.target.value),
    onFocus: () => setFocused(true), onBlur: () => setFocused(false),
    style: fieldStyle, placeholder: floatActive ? placeholder : "",
    autoFocus, required: false
  };

  return (
    <div style={containerStyle}>
      <label style={labelStyle}>{label}</label>
      {isTextArea ? (
         <textarea {...commonProps}></textarea>
      ) : isSelect ? (
         <div style={{ position: "relative" }}>
           <select {...commonProps}>
             {options.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
           </select>
           <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#94a3b8" }}>
             <Icon name="chevron-down" size={14} />
           </span>
         </div>
      ) : (
         <input type={type} min={min} {...commonProps} />
      )}
    </div>
  );
}

function ProfessionalDatePicker({ label, value, min, onChange }: { label: string, value: string, min?: string, onChange: (v: string) => void }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <label style={{ display: "block", fontSize: 10, fontWeight: 800, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</label>
      <div style={{ position: "relative", display: "flex", alignItems: "center", background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "12px 14px", transition: "border 0.2s" }}>
        <div style={{ color: "#64748b", display: "flex", alignItems: "center", marginRight: 8 }}>
          <Icon name="calendar" size={16} />
        </div>
        <input 
          type="datetime-local" 
          value={value} 
          min={min}
          onChange={e => onChange(e.target.value)} 
          style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 13, color: value ? "#0f172a" : "#94a3b8", cursor: "pointer", position: "relative", zIndex: 2 }} 
        />
        <style dangerouslySetInnerHTML={{__html:`
          input[type="datetime-local"]::-webkit-calendar-picker-indicator {
            position: absolute; top: 0; left: 0; right: 0; bottom: 0;
            width: 100%; height: 100%; opacity: 0; cursor: pointer; z-index: 3;
          }
        `}} />
      </div>
    </div>
  );
}

function wizardTabStyle(active: boolean): React.CSSProperties {
  return {
    padding: "16px 20px", display: "flex", alignItems: "center", gap: 10,
    background: "none", border: "none", borderBottom: active ? "3px solid #0ea5e9" : "3px solid transparent",
    fontSize: 14, fontWeight: active ? 800 : 600, color: active ? "#0ea5e9" : "#64748b",
    cursor: "pointer", transition: "all 0.2s"
  };
}
function wizardBadgeStyle(active: boolean): React.CSSProperties {
  return {
    width: 24, height: 24, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
    background: active ? "#0ea5e9" : "#e2e8f0", color: active ? "#fff" : "#94a3b8", fontSize: 12, fontWeight: 800
  };
}

export default function CourseManager({ isInlineModal = false, onCloseInline, onCourseSaved }: any = {}) {
  const { showToast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subcategories, setSubcategories] = useState<SubCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterSubjectId, setFilterSubjectId] = useState<string>("all");

  const [deleteTarget, setDeleteTarget] = useState<{ id: number; title: string } | null>(null);
  const [viewTarget, setViewTarget] = useState<Course | null>(null);

  // ── Modal State ─────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formDurationMonths, setFormDurationMonths] = useState<string>("");
  const [formCurrency, setFormCurrency] = useState("INR");
  const [formPrice, setFormPrice] = useState<number | "">("");
  const [formDiscount, setFormDiscount] = useState<number | "">("");
  const [formPriceUsd, setFormPriceUsd] = useState<number | "">("");
  const [formDiscountUsd, setFormDiscountUsd] = useState<number | "">("");
  const [formIsFree, setFormIsFree] = useState(false);
  const [formThumbnail, setFormThumbnail] = useState("");
  const [formPromo, setFormPromo] = useState("");
  const [formStatus, setFormStatus] = useState("DRAFT");
  const [formIsFeatured, setFormIsFeatured] = useState(false);
  const [formShowOnHomepage, setFormShowOnHomepage] = useState(false);
  const [formIsNew, setFormIsNew] = useState(false);
  const [allInstructors, setAllInstructors] = useState<Instructor[]>([]);
  const [formInstructorIds, setFormInstructorIds] = useState<number[]>([]);
  const [showAddInstructorModal, setShowAddInstructorModal] = useState(false);
  const [newInstructor, setNewInstructor] = useState({ name: "", email: "", phone: "", bio: "", avatar_url: "", is_active: true, qualification: "", experience_years: "", designation: "", specialization: "", social_linkedin: "", social_twitter: "", social_website: "", intro_video_url: "", achievements: "" });
  const [addingInstructor, setAddingInstructor] = useState(false);
    const [formSkillLevel, setFormSkillLevel] = useState("");
  const [formPrerequisites, setFormPrerequisites] = useState("");
  const [formLearn, setFormLearn] = useState("");
  const [formTargetAudience, setFormTargetAudience] = useState("");
  const [formHasCertificate, setFormHasCertificate] = useState(false);
  const [formCertificateImageUrl, setFormCertificateImageUrl] = useState("");
  const [formUploadSyllabus, setFormUploadSyllabus] = useState("");
  const [formSeoTitle, setFormSeoTitle] = useState("");
  const [formSeoDesc, setFormSeoDesc] = useState("");
  const [formSeoKeywords, setFormSeoKeywords] = useState("");
  const [wizardStep, setWizardStep] = useState(1);
  const [formSubjectIds, setFormSubjectIds] = useState<number[]>([]);
  const [formChapterIds, setFormChapterIds] = useState<number[]>([]);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [formMinPayType, setFormMinPayType] = useState<string>("");
  const [formMinPayValue, setFormMinPayValue] = useState<number | "">("");
  const [formShowInstructorPublicly, setFormShowInstructorPublicly] = useState(true);

  // Cache for fetched chapters per subject
  const [subjectChapters, setSubjectChapters] = useState<Record<number, Chapter[]>>({});
  const [fetchingChaptersFor, setFetchingChaptersFor] = useState<Record<number, boolean>>({});

  const [activeChapterId, setActiveChapterId] = useState<number | null>(null);
  const [previewMaterial, setPreviewMaterial] = useState<Material | null>(null);
  const [chapterMaterials, setChapterMaterials] = useState<Record<number, Material[]>>({});
  const [fetchingMaterialsFor, setFetchingMaterialsFor] = useState<Record<number, boolean>>({});


  const [chapterLiveClasses, setChapterLiveClasses] = useState<Record<number, LiveClass[]>>({});
  const [fetchingLiveClassesFor, setFetchingLiveClassesFor] = useState<Record<number, boolean>>({});
  const [liveClassForm, setLiveClassForm] = useState({ title: "", meeting_url: "", scheduled_at: "" });
  const [addingLiveClass, setAddingLiveClass] = useState(false);
  const [savingLiveClass, setSavingLiveClass] = useState(false);

  const fetchLiveClasses = (chapterId: number) => {
    if (chapterLiveClasses[chapterId] !== undefined || fetchingLiveClassesFor[chapterId]) return;
    setFetchingLiveClassesFor(p => ({ ...p, [chapterId]: true }));
    apiFetch(`${API}/chapters/${chapterId}/live-classes`)
      .then(res => res.json())
      .then(data => setChapterLiveClasses(p => ({ ...p, [chapterId]: data })))
      .catch(e => console.error(e))
      .finally(() => setFetchingLiveClassesFor(p => ({ ...p, [chapterId]: false })));
  };

  const selectActiveChapter = (chapterId: number) => {
    // Toggle off if already active
    if (activeChapterId === chapterId) {
      setActiveChapterId(null);
      return;
    }
    setActiveChapterId(chapterId);
    fetchLiveClasses(chapterId);
    setAddingLiveClass(false);
    setLiveClassForm({ title: "", meeting_url: "", scheduled_at: "" });
    if (!chapterMaterials[chapterId] && !fetchingMaterialsFor[chapterId]) {
      setFetchingMaterialsFor(p => ({ ...p, [chapterId]: true }));
      apiFetch(`${API}/chapters/${chapterId}/materials`)
        .then(res => res.json())
        .then(data => {
          setChapterMaterials(p => ({ ...p, [chapterId]: data }));
        })
        .catch(e => console.error(e))
        .finally(() => setFetchingMaterialsFor(p => ({ ...p, [chapterId]: false })));
    }
  };

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [scRes, subRes, courseRes, instRes] = await Promise.all([
        apiFetch(`${API}/subcategories`),
        apiFetch(`${API}/subjects`),
        apiFetch(
          `${API}/courses?search=${encodeURIComponent(search)}${
            filterSubjectId !== "all" ? `&subject_id=${filterSubjectId}` : ""
          }`
        ),
        apiFetch(`${API}/instructors`),
      ]);
      if (scRes.ok) setSubcategories(await scRes.json());
      if (subRes.ok) setSubjects(await subRes.json());
      if (courseRes.ok) setCourses(await courseRes.json());
      if (instRes && instRes.ok) setAllInstructors(await instRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, filterSubjectId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (isInlineModal) {
      openModal("create");
    }
  }, [isInlineModal]);

  // Load chapters when a subject is added to the form
  useEffect(() => {
    formSubjectIds.forEach(subId => {
      if (!subjectChapters[subId] && !fetchingChaptersFor[subId]) {
        setFetchingChaptersFor(p => ({ ...p, [subId]: true }));
        apiFetch(`${API}/subjects/${subId}/chapters`)
          .then(res => res.json())
          .then(data => {
            setSubjectChapters(p => ({ ...p, [subId]: data }));
          })
          .catch(e => console.error(e))
          .finally(() => setFetchingChaptersFor(p => ({ ...p, [subId]: false })));
      }
    });
  }, [formSubjectIds, subjectChapters, fetchingChaptersFor]);

  const openModal = (mode: "create" | "edit", course?: Course) => {
    setModalMode(mode);
    setFormError("");
    if (mode === "edit" && course) {
      setEditingId(course.id);
      setFormTitle(course.title);
      setFormDesc(course.description || "");
      setFormDurationMonths(course.validity_days ? String(Math.floor(course.validity_days / 30)) : "");
      setFormCurrency((course as any).currency || "INR");
      setFormPrice(course.price ?? "");
      setFormDiscount(course.discount_price ?? "");
      setFormPriceUsd(course.price_usd ?? "");
      setFormDiscountUsd(course.discount_price_usd ?? "");
      setFormIsFree(course.is_free ?? false);
      setFormThumbnail(course.thumbnail_url || "");
      setFormPromo(course.promo_video_url || "");
      setFormStatus(course.status || "DRAFT");
      setFormIsFeatured(course.is_featured ?? false);
      setFormIsNew((course as any).is_new ?? false);
      apiFetch(`${API}/courses/${course.id}/instructors`).then(r => r.json()).then(data => {
        setFormInstructorIds((data || []).map((i: any) => i.id));
      }).catch(e => console.error(e));
      setFormSkillLevel(course.skill_level || "");
      setFormPrerequisites(course.prerequisites || "");
      setFormLearn(course.what_you_will_learn || "");
      setFormTargetAudience(course.target_audience || "");
      setFormUploadSyllabus((course as any).upload_syllabus || "");
      setFormHasCertificate(course.has_certificate || false);
      setFormCertificateImageUrl((course as any).certificate_image_url || "");
      setFormSeoTitle(course.seo_title || "");
      setFormSeoDesc(course.seo_description || "");
      setFormSeoKeywords(course.seo_keywords || "");
      setFormSubjectIds(course.subjects.map(s => s.id));
      setFormChapterIds(course.chapter_ids || []);
      setFormMinPayType((course as any).min_payment_type || "");
      setFormMinPayValue((course as any).min_payment_value ?? "");
      setFormShowInstructorPublicly((course as any).show_instructor_publicly ?? true);
      setWizardStep(1);
    } else {
      setEditingId(null);
      setFormTitle("");
      setFormDesc("");
      setFormDurationMonths("");
      setFormCurrency("INR");
      setFormPrice("");
      setFormDiscount("");
      setFormPriceUsd("");
      setFormDiscountUsd("");
      setFormIsFree(false);
      setFormThumbnail("");
      setFormPromo("");
      setFormStatus("DRAFT");
      setFormIsFeatured(false);
      setFormShowOnHomepage(false);
      setFormIsNew(false);
      setFormInstructorIds([]);
      setFormSkillLevel("");
      setFormPrerequisites("");
      setFormLearn("");
      setFormTargetAudience("");
      setFormUploadSyllabus("");
      setFormHasCertificate(false);
      setFormCertificateImageUrl("");
      setFormSeoTitle("");
      setFormSeoDesc("");
      setFormSeoKeywords("");
      setFormSubjectIds([]);
      setFormChapterIds([]);
      setFormMinPayType("");
      setFormMinPayValue("");
      setFormShowInstructorPublicly(true);
      setWizardStep(1);
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
  };

  const handleSave = async () => {
    if (!formTitle.trim()) { setFormError("Course title is required"); return; }
    if (formSubjectIds.length === 0) { setFormError("Select at least one subject"); return; }
    
    setFormError("");
    setSaving(true);
    
    // Parse duration string to extract numbers
    const parsedDuration = parseInt(String(formDurationMonths).replace(/\D/g, ""), 10);
    const resolvedValidityDays = isNaN(parsedDuration) ? null : parsedDuration * 30;

    try {
      const payload = {
        title: formTitle.trim(),
        description: formDesc.trim(),
        subject_ids: formSubjectIds,
        chapter_ids: formChapterIds,
        start_date: null,
        end_date: null,
        validity_days: resolvedValidityDays,
        currency: formCurrency,
        price: formPrice === "" ? null : Number(formPrice),
        discount_price: formDiscount === "" ? null : Number(formDiscount),
        price_usd: formPriceUsd === "" ? null : Number(formPriceUsd),
        discount_price_usd: formDiscountUsd === "" ? null : Number(formDiscountUsd),
        is_free: formIsFree,
        thumbnail_url: formThumbnail.trim() || null,
        promo_video_url: formPromo.trim() || null,
        status: formStatus,
        is_featured: formIsFeatured,
        show_on_homepage: formShowOnHomepage,
        is_new: formIsNew,
        
        skill_level: formSkillLevel || null,
        prerequisites: formPrerequisites.trim() || null,
        what_you_will_learn: formLearn.trim() || null,
        target_audience: formTargetAudience.trim() || null,
        upload_syllabus: formUploadSyllabus.trim() || null,
        has_certificate: formHasCertificate,
        certificate_image_url: formCertificateImageUrl.trim() || null,
        seo_title: formSeoTitle.trim() || null,
        seo_description: formSeoDesc.trim() || null,
        seo_keywords: formSeoKeywords.trim() || null,
        min_payment_type: formMinPayValue === "" ? null : "amount",
        min_payment_value: formMinPayValue === "" ? null : Number(formMinPayValue),
        show_instructor_publicly: formShowInstructorPublicly,
      };

      const url = modalMode === "create" ? `${API}/courses` : `${API}/courses/${editingId}`;
      const res = await apiFetch(url, {
        method: modalMode === "create" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

            if (res.ok) {
        const savedCourse = await res.json();
        try {
          await apiFetch(`${API}/courses/${modalMode === "create" ? savedCourse.id : editingId}/instructors`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ instructor_ids: formInstructorIds })
          });
        } catch (e) {
          console.error("Failed to save instructors", e);
        }
        
        showToast(`Course ${modalMode === "create" ? "created" : "updated"}!`);
        if (isInlineModal) {
          if (onCourseSaved) onCourseSaved(savedCourse);
          if (onCloseInline) onCloseInline();
          return;
        }
        closeModal();
        fetchAll();
      } else {
        const err = await res.json();
        setFormError(err.detail || "Operation failed");
      }
    } catch {
      setFormError("Network error");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await apiFetch(`${API}/courses/${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Course deleted!");
        fetchAll();
      } else {
        showToast("Failed to delete course", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setDeleteTarget(null);
    }
  };

  const toggleSubject = (subId: number) => {
    setFormSubjectIds(prev => {
      if (prev.includes(subId)) {
        // If removing subject, also remove its chapters from selected
        const chapsToRemove = (subjectChapters[subId] || []).map(c => c.id);
        setFormChapterIds(cIds => cIds.filter(id => !chapsToRemove.includes(id)));
        // If the active chapter belonged to this subject, close Chapter Details
        setActiveChapterId(current => {
          if (current !== null && chapsToRemove.includes(current)) return null;
          return current;
        });
        return prev.filter(id => id !== subId);
      }
      return [...prev, subId];
    });
  };

  const selectAllChaptersForSubject = (subId: number) => {
    const chaps = (subjectChapters[subId] || []).filter(c => c.is_active);
    const ids = chaps.map(c => c.id);
    setFormChapterIds(prev => Array.from(new Set([...prev, ...ids])));
  };

  const deselectAllChaptersForSubject = (subId: number) => {
    const chaps = (subjectChapters[subId] || []).filter(c => c.is_active);
    const ids = chaps.map(c => c.id);
    setFormChapterIds(prev => prev.filter(id => !ids.includes(id)));
  };

  const toggleChapter = (chapId: number) => {
    setFormChapterIds(prev => prev.includes(chapId) ? prev.filter(id => id !== chapId) : [...prev, chapId]);
  };

  const subcatName = (id: number) => subcategories.find(s => s.id === id)?.name || "";
  const groupedSubjects: Record<string, Subject[]> = {};
  subjects.forEach(s => {
    const key = subcatName(s.subcategory_id) || "Other";
    if (!groupedSubjects[key]) groupedSubjects[key] = [];
    groupedSubjects[key].push(s);
  });

  return (
    <div className={!isInlineModal ? "manager-content" : undefined}>
      {/* ── Page Content (Hidden when inline modal) ── */}
      {!isInlineModal && (
        <>
          <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.5px" }}>Course Catalog</h1>
              <p style={{ margin: "4px 0 0", fontSize: 14, color: "#64748b" }}>Build and manage course bundles, assigning specific subjects and chapters.</p>
            </div>
            <button
              onClick={() => openModal("create")}
              style={{
                background: "#0ea5e9", color: "#fff", border: "none", padding: "10px 20px",
                borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 8, boxShadow: "0 2px 8px rgba(14,165,233,0.3)",
                transition: "all 0.2s",
              }}
            >
              <Icon name="plus" size={16} /> New Course
            </button>
          </header>

          <div style={{ marginBottom: 24, display: "flex", gap: 14, background: "#fff", padding: "16px 20px", borderRadius: 14, boxShadow: "0 2px 10px rgba(0,0,0,0.03)", border: "1px solid #f1f5f9" }}>
        <div style={{ position: "relative", flex: 1 }}>
          <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}>
            <Icon name="search" size={16} />
          </span>
          <input
            type="text"
            placeholder="Search courses…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%", padding: "12px 14px 12px 42px", borderRadius: 10, border: "1px solid #e2e8f0",
              fontSize: 14, outline: "none", boxSizing: "border-box", background: "#f8fafc", transition: "border 0.2s"
            }}
          />
        </div>
        <div style={{ position: "relative", minWidth: 220 }}>
          <select
            value={filterSubjectId}
            onChange={(e) => setFilterSubjectId(e.target.value)}
            style={{
              width: "100%", padding: "12px 30px 12px 16px", borderRadius: 10, border: "1px solid #e2e8f0",
              fontSize: 14, outline: "none", background: "#f8fafc", appearance: "none", cursor: "pointer"
            }}
          >
            <option value="all">All Subjects</option>
            {Object.entries(groupedSubjects).map(([group, subs]) => (
              <optgroup key={group} label={`📂 ${group}`}>
                {subs.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
          <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#94a3b8" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </span>
        </div>
      </div>

      {/* ── Table ────────────────────────────────────── */}
      <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.04)", border: "1px solid #e2e8f0", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
            <tr>
              <th style={thStyle}>#</th>
              <th style={thStyle}>Course Info</th>
              <th style={thStyle}>Instructors</th>
              <th style={thStyle}>Curriculum</th>
              <th style={thStyle}>Status & Timeline</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={emptyCellStyle}>Loading courses…</td></tr>
            ) : courses.length === 0 ? (
              <tr>
                <td colSpan={6} style={emptyCellStyle}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>📦</div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#64748b" }}>No courses found.</p>
                </td>
              </tr>
            ) : (
              courses.map((c, idx) => (
                <tr key={c.id} style={{ borderBottom: "1px solid #f1f5f9" }} onMouseEnter={(e) => (e.currentTarget.style.background = "#fafafa")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                  <td style={{ padding: "16px 20px", color: "#94a3b8", fontWeight: 600, width: 40 }}>{idx + 1}</td>
                  <td style={{ padding: "16px 20px" }}>
                    <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                      {c.thumbnail_url ? (
                        <img src={c.thumbnail_url.startsWith("http") ? c.thumbnail_url : `${API_BASE_URL.replace("/api", "")}${c.thumbnail_url}`} alt="" style={{ width: 64, height: 48, objectFit: "cover", borderRadius: 8, boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }} />
                      ) : (
                        <div style={{ width: 64, height: 48, background: "#f1f5f9", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", border: "1px solid #e2e8f0" }}><Icon name="monitor" size={20}/></div>
                      )}
                      <div>
                        <div style={{ fontWeight: 800, color: "#0f172a", fontSize: 14.5, marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
                          {c.title}
                          {c.is_featured && <span title="Featured Course" style={{ color: "#eab308", fontSize: 13 }}>★</span>}
                        </div>
                        <div style={{ display: "flex", gap: 8, fontSize: 12, fontWeight: 600 }}>
                          <span style={{ color: c.is_free ? "#16a34a" : "#0284c7", background: c.is_free ? "#dcfce7" : "#e0f2fe", padding: "2px 6px", borderRadius: 4 }}>
                            {c.is_free ? "FREE" : c.price ? `$${c.price}` : "No Price Setup"}
                          </span>
                          <span style={{ color: "#64748b", display: "flex", alignItems: "center" }}>{c.skill_level || "Any Level"}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "16px 20px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {c.instructors && c.instructors.length > 0 ? c.instructors.map(inst => (
                         <div key={inst.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                           <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#e0f2fe", color: "#0284c7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800 }}>
                              {inst.name.charAt(0).toUpperCase()}
                           </div>
                           <div style={{ display: "flex", flexDirection: "column" }}>
                             <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{inst.name}</span>
                             {inst.phone && <span style={{ fontSize: 11, color: "#64748b", fontWeight: 500 }}>{inst.phone}</span>}
                           </div>
                         </div>
                      )) : <span style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic", background: "#f8fafc", padding: "4px 8px", borderRadius: 6 }}>No Instructors Assigned</span>}
                    </div>
                  </td>
                  <td style={{ padding: "16px 20px", maxWidth: 220 }}>
                    <div style={{ marginBottom: 8 }}>
                       <span style={{ fontWeight: 800, color: "#475569", background: "#f1f5f9", padding: "4px 8px", borderRadius: 6, fontSize: 10, border: "1px solid #e2e8f0" }}>
                         {c.chapter_ids?.length || 0} Chapters Mapped
                       </span>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", maxHeight: 40, overflowY: "auto" }}>
                      {c.subjects.map(sub => (
                         <span key={sub.id} style={{ background: "#f0f9ff", color: "#0284c7", border: "1px solid #bae6fd", fontSize: 10, fontWeight: 700, padding: "3px 6px", borderRadius: 4, whiteSpace: "nowrap" }}>
                           {sub.name}
                         </span>
                      ))}
                      {c.subjects.length === 0 && <span style={{ color: "#94a3b8", fontSize: 11, fontStyle: "italic" }}>No Subjects</span>}
                    </div>
                  </td>
                  <td style={{ padding: "16px 20px" }}>
                    <div style={{ marginBottom: 8 }}>
                       <span style={{ 
                           fontSize: 10, fontWeight: 800, padding: "4px 8px", borderRadius: 6, textTransform: "uppercase", letterSpacing: "0.5px",
                           background: c.status === "PUBLISHED" ? "#dcfce7" : c.status === "ARCHIVED" ? "#f1f5f9" : "#ffedd5",
                           color: c.status === "PUBLISHED" ? "#16a34a" : c.status === "ARCHIVED" ? "#64748b" : "#ea580c"
                       }}>
                         • {c.status || "DRAFT"}
                       </span>
                    </div>
                    <div style={{ fontSize: 12, color: "#475569", display: "flex", flexDirection: "column", gap: 4, fontWeight: 500 }}>
                       <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <Icon name="calendar" size={12} />
                          {c.start_date ? new Date(c.start_date).toLocaleDateString() : "Anytime"}
                       </div>
                       <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#64748b" }}>
                          <Icon name="award" size={12} />
                          {c.validity_days ? `${c.validity_days} Days Valid` : "Lifetime Access"}
                       </div>
                    </div>
                  </td>
                  <td style={{ padding: "16px 20px", textAlign: "right" }}>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <button onClick={() => setViewTarget(c)} title="View Details" style={actionBtnStyle("#f0fdf4", "#16a34a", "#bbf7d0")}>
                        <Icon name="eye" size={14} />
                      </button>
                      <button onClick={() => openModal("edit", c)} title="Edit" style={actionBtnStyle("#f8fafc", "#475569", "#e2e8f0")}>
                        <Icon name="edit" size={14} />
                      </button>
                      <button onClick={() => setDeleteTarget({ id: c.id, title: c.title })} title="Delete" style={actionBtnStyle("#fef2f2", "#ef4444", "#fecaca")}>
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {deleteTarget && (
        <DeleteModal title={`Delete "${deleteTarget.title}"?`} description="This will permanently delete this course." onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
      )}

      {/* ══════════════════════════════════════════════
          VIEW MODAL FOR COURSE SUMMARY
      ══════════════════════════════════════════════ */}
      {viewTarget && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)", padding: 24 }}>
          <div style={{ background: "#fff", width: "95%", maxWidth: 600, maxHeight: "85vh", borderRadius: 20, display: "flex", flexDirection: "column", boxShadow: "0 20px 40px rgba(0,0,0,0.2)", overflow: "hidden", animation: "slideUp 0.3s ease-out" }}>
            
            {/* Header */}
            <div style={{ padding: "20px 28px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "#e0f2fe", color: "#0284c7", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name="book" size={20} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0f172a" }}>Course Details</h2>
                  <p style={{ margin: "2px 0 0", fontSize: 13, color: "#64748b" }}>Read-only summary of the course.</p>
                </div>
              </div>
              <button onClick={() => setViewTarget(null)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: 8 }}>
                <Icon name="x" size={20} />
              </button>
            </div>

            {/* Content */}
            <div style={{ flex: 1, padding: 28, overflowY: "auto", background: "#fff" }}>
              
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ margin: "0 0 8px 0", fontSize: 22, fontWeight: 800, color: "#0f172a" }}>{viewTarget.title}</h3>
                {viewTarget.description ? (
                  <p style={{ margin: 0, fontSize: 14, color: "#475569", lineHeight: 1.6 }}>{viewTarget.description}</p>
                ) : (
                  <p style={{ margin: 0, fontSize: 14, color: "#94a3b8", fontStyle: "italic" }}>No description provided.</p>
                )}
              </div>

              <div style={{ marginBottom: 24 }}>
                <h4 style={{ margin: "0 0 12px 0", fontSize: 12, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Instructors</h4>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {viewTarget.instructors && viewTarget.instructors.length > 0 ? (
                    viewTarget.instructors.map(inst => (
                      <div key={inst.id} style={{ display: "flex", alignItems: "center", gap: 12, background: "#f8fafc", padding: "10px 16px", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#0ea5e9", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800 }}>
                          {inst.name.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{inst.name}</span>
                          {inst.phone && <span style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>📞 {inst.phone}</span>}
                        </div>
                      </div>
                    ))
                  ) : (
                    <span style={{ fontSize: 13, color: "#94a3b8", fontStyle: "italic" }}>No Instructors Assigned</span>
                  )}
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <h4 style={{ margin: "0 0 12px 0", fontSize: 12, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Subjects Included</h4>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {viewTarget.subjects && viewTarget.subjects.length > 0 ? (
                    viewTarget.subjects.map(s => (
                      <span key={s.id} style={{ background: "#f0f9ff", color: "#0284c7", border: "1px solid #bae6fd", fontSize: 13, fontWeight: 600, padding: "6px 12px", borderRadius: 8 }}>
                        {s.name}
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: 13, color: "#94a3b8", fontStyle: "italic" }}>No subjects mapped</span>
                  )}
                </div>
              </div>

              <div>
                <h4 style={{ margin: "0 0 12px 0", fontSize: 12, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Connected Chapters</h4>
                <div style={{ background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0", padding: "16px 20px", marginBottom: 24 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#0f172a" }}>
                    {viewTarget.chapter_ids?.length || 0} Total Chapters Configured
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>
                    Edit this course to view or modify the exact chapter selections.
                  </p>
                </div>
              </div>

              {viewTarget.upload_syllabus && (
              <div>
                <h4 style={{ margin: "0 0 12px 0", fontSize: 12, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Course Syllabus</h4>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <a href={viewTarget.upload_syllabus.startsWith("http") ? viewTarget.upload_syllabus : `${API_BASE_URL.replace("/api", "")}${viewTarget.upload_syllabus}`} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 8, background: "#fef3c7", color: "#d97706", border: "1px solid #fde68a", fontSize: 13, fontWeight: 700, padding: "8px 16px", borderRadius: 8, textDecoration: "none", transition: "all 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "#fde68a"} onMouseLeave={e => e.currentTarget.style.background = "#fef3c7"}>
                    <Icon name="file-text" size={16} /> View Syllabus PDF
                  </a>
                </div>
              </div>
              )}

            </div>

            {/* Footer */}
            <div style={{ padding: "16px 28px", borderTop: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", justifyContent: "flex-end" }}>
              <button 
                onClick={() => {
                  const target = viewTarget;
                  setViewTarget(null);
                  openModal("edit", target);
                }} 
                style={{ background: "#0ea5e9", color: "#fff", border: "none", padding: "10px 24px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
              >
                <Icon name="edit" size={14} /> Open Editor
              </button>
            </div>

          </div>
        </div>
      )}
      </>
      )}

      {/* ══════════════════════════════════════════════
          80% SCREEN MODAL FOR COURSE CREATION / EDITING
      ══════════════════════════════════════════════ */}
      {modalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 10001, background: "#fff", display: "flex", flexDirection: "column", animation: "fadeIn 0.2s ease" }}>
          <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            
            {/* Modal Header */}
            <div style={{ padding: "20px 28px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#0f172a" }}>
                  {modalMode === "create" ? "✨ Create New Course" : "✏️ Edit Course"}
                </h2>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>Configure course details and map subjects/chapters.</p>
              </div>
              <button onClick={() => { if (isInlineModal) { if (onCloseInline) onCloseInline(); } else { closeModal(); } }} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: 8 }}>
                <Icon name="x" size={20} />
              </button>
            </div>

                        {/* Wizard Header Progress */}
            <div style={{ padding: "0 28px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", gap: 24, flexShrink: 0 }}>
               <button type="button" onClick={() => setWizardStep(1)} style={wizardTabStyle(wizardStep === 1)}>
                 <div style={wizardBadgeStyle(wizardStep === 1)}>1</div> Basic Info & SEO
               </button>
               <button type="button" onClick={() => setWizardStep(2)} style={wizardTabStyle(wizardStep === 2)}>
                 <div style={wizardBadgeStyle(wizardStep === 2)}>2</div> Media & Pricing
               </button>
               <button type="button" onClick={() => setWizardStep(3)} style={wizardTabStyle(wizardStep === 3)}>
                 <div style={wizardBadgeStyle(wizardStep === 3)}>3</div> Curriculum Mapping
               </button>
               <button type="button" onClick={() => setWizardStep(4)} style={wizardTabStyle(wizardStep === 4)}>
                 <div style={wizardBadgeStyle(wizardStep === 4)}>4</div> Teachers
               </button>
            </div>

            {/* Modal Body */}
            <div className="custom-scroll" style={{ flex: 1, padding: "28px 36px", overflowY: "auto", background: "#fff" }}>
               
               {/* ── STEP 1: Basic Info & SEO ── */}
               {wizardStep === 1 && (
                  <div style={{ width: "100%", animation: "slideUp 0.2s ease-out" }}>
                    <h3 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginBottom: 24 }}>Course Basic Info</h3>
                    
                    <div style={{ marginBottom: 24 }}>
                      <FloatingField label="Course Title *" value={formTitle} onChange={(v: string) => { setFormTitle(v); setFormError(""); }} placeholder="e.g. The Complete Guide 2026" autoFocus />
                    </div>
    
                    <div style={{ marginBottom: 24 }}>
                      <FloatingField label="Description (optional)" value={formDesc} onChange={setFormDesc} placeholder="Comprehensive course overview..." isTextArea />
                    </div>

                    <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
                      <div style={{ flex: 1 }}>
                        <FloatingField label="Course Status" value={formStatus} onChange={setFormStatus} isSelect options={[
                          {value: "DRAFT", label: "Draft - Hidden from students"},
                          {value: "PUBLISHED", label: "Published - Live to everyone"},
                          {value: "ARCHIVED", label: "Archived - Not for sale"}
                        ]} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <FloatingField label="Skill Level" value={formSkillLevel} onChange={setFormSkillLevel} isSelect options={[
                          {value: "", label: "(None)"}, {value: "Beginner", label: "Beginner"}, {value: "Intermediate", label: "Intermediate"}, {value: "Advanced", label: "Advanced"}
                        ]} />
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
                      <div style={{ flex: 1 }}>
                        <div></div>
                      </div>
                      <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
                         <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: formIsFeatured? "#0369a1" : "#475569", cursor: "pointer", background: formIsFeatured? "#f0f9ff" : "#f8fafc", padding: "12px 16px", borderRadius: 8, width: "100%", border: `1.5px solid ${formIsFeatured? "#bae6fd":"#e2e8f0"}`, transition: "all 0.2s" }}>
                           <input type="checkbox" checked={formIsFeatured} onChange={e => setFormIsFeatured(e.target.checked)} style={{ accentColor: "#0ea5e9", width: 16, height: 16 }} />
                           🔥 Mark as Featured Course
                         </label>
                      </div>
                    </div>

                    {/* is_new badge toggle */}
                    <div style={{ marginBottom: 24 }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13, fontWeight: 700, color: formIsNew ? "#6d28d9" : "#475569", cursor: "pointer", background: formIsNew ? "#f5f3ff" : "#f8fafc", padding: "14px 18px", borderRadius: 10, border: `1.5px solid ${formIsNew ? "#c4b5fd" : "#e2e8f0"}`, transition: "all 0.2s" }}>
                        <input type="checkbox" checked={formIsNew} onChange={e => setFormIsNew(e.target.checked)} style={{ accentColor: "#7c3aed", width: 18, height: 18, flexShrink: 0 }} />
                        <div>
                          <div style={{ fontWeight: 800 }}>✨ Show "NEW" Badge on Course Card</div>
                          <div style={{ fontSize: 12, fontWeight: 500, color: formIsNew ? "#7c3aed" : "#94a3b8", marginTop: 2 }}>When enabled, a purple "NEW" badge will appear on this course card in the public catalog.</div>
                        </div>
                      </label>
                    </div>

                    <h3 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginTop: 40, marginBottom: 24, paddingTop: 32, borderTop: "1px solid #e2e8f0" }}>Target Audience</h3>
                    <div style={{ marginBottom: 24 }}>
                      <FloatingField label="Target Audience" value={formTargetAudience} onChange={setFormTargetAudience} placeholder="Who is this course intended for?" isTextArea />
                    </div>
                    <div style={{ marginBottom: 24 }}>
                       <ImageDropzoneField label="Course Syllabus (PDF)" value={formUploadSyllabus} onChange={setFormUploadSyllabus} placeholder="Upload PDF or Paste URL..." />
                    </div>
                    <div style={{ marginBottom: 24 }}>
                      <FloatingField label="Course Prerequisites" value={formPrerequisites} onChange={setFormPrerequisites} placeholder="What should students know before starting?" isTextArea />
                    </div>
                    <div style={{ marginBottom: 24 }}>
                      <FloatingField label="What you will learn (1 per line)" value={formLearn} onChange={setFormLearn} placeholder="- Become proficient in...
- Build multiple projects...
- Master advanced concepts..." isTextArea />
                    </div>

                    <h3 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginTop: 40, marginBottom: 24, paddingTop: 32, borderTop: "1px solid #e2e8f0" }}>Search Engine Optimization</h3>
                    <div style={{ marginBottom: 24 }}>
                      <FloatingField label="SEO Title" value={formSeoTitle} onChange={setFormSeoTitle} placeholder="Optimized Title for Google Search..." />
                    </div>
                    <div style={{ marginBottom: 24 }}>
                      <FloatingField label="SEO Description" value={formSeoDesc} onChange={setFormSeoDesc} placeholder="Meta description to attract students in search results..." isTextArea />
                    </div>
                    <div>
                      <FloatingField label="SEO Keywords (comma separated)" value={formSeoKeywords} onChange={setFormSeoKeywords} placeholder="e.g. math, science, beginner tutorial" />
                    </div>
                  </div>
               )}

               {/* ── STEP 2: Media & Pricing ── */}
               {wizardStep === 2 && (
                  <div style={{ width: "100%", animation: "slideUp 0.2s ease-out" }}>
                    <h3 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginBottom: 24 }}>Media Assets</h3>
                    
                    <div style={{ marginBottom: 24 }}>
                       <ImageDropzoneField label="Course Thumbnail" value={formThumbnail} onChange={setFormThumbnail} placeholder="https://..." />
                    </div>
                    
                    <div style={{ marginBottom: 24 }}>
                      <FloatingField label="Promo Video URL" value={formPromo} onChange={setFormPromo} placeholder="YouTube or Vimeo standard link" />
                    </div>

                    <h3 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginTop: 40, marginBottom: 24, paddingTop: 32, borderTop: "1px solid #e2e8f0" }}>Timeline & Access Rules</h3>
                    <div style={{ marginBottom: 24 }}>
                       <FloatingField label="Duration" type="text" value={formDurationMonths} onChange={setFormDurationMonths} placeholder="e.g. 6 Months, or Lifetime" />
                    </div>

                    <h3 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginTop: 40, marginBottom: 24, paddingTop: 32, borderTop: "1px solid #e2e8f0" }}>Pricing Options</h3>
                    <div style={{ border: "1.5px solid #e2e8f0", padding: 24, borderRadius: 12, marginBottom: 24, background: formIsFree ? "#f0fdf4" : "#fff", borderColor: formIsFree ? "#bbf7d0" : "#e2e8f0", transition: "all 0.2s" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: formIsFree ? 0 : 20 }}>
                        <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "#0f172a" }}>Pricing Structure</h4>
                        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: formIsFree ? "#16a34a" : "#475569", cursor: "pointer" }}>
                          <input type="checkbox" checked={formIsFree} onChange={e => setFormIsFree(e.target.checked)} style={{ accentColor: "#22c55e", width: 18, height: 18 }} />
                          This is a FREE course
                        </label>
                      </div>
                      {!formIsFree && (
                        <>
                        <div style={{ display: "flex", gap: 16, marginBottom: 16, animation: "slideUp 0.15s ease-out" }}>
                          <div style={{ width: 120, display: "flex", alignItems: "center", fontWeight: 700, color: "#475569", fontSize: 13 }}>
                            INR (₹) Pricing
                          </div>
                          <div style={{ flex: 1 }}>
                            <FloatingField label={`Base Price (INR)`} type="number" min="0" value={formPrice} onChange={(v: any) => setFormPrice(v ? Number(v) : "")} placeholder="0.00" />
                          </div>
                          <div style={{ flex: 1 }}>
                            <FloatingField label={`Discount Price (INR)`} type="number" min="0" value={formDiscount} onChange={(v: any) => setFormDiscount(v ? Number(v) : "")} placeholder="Optional" />
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 16, animation: "slideUp 0.15s ease-out" }}>
                          <div style={{ width: 120, display: "flex", alignItems: "center", fontWeight: 700, color: "#475569", fontSize: 13 }}>
                            USD ($) Pricing
                          </div>
                          <div style={{ flex: 1 }}>
                            <FloatingField label={`Base Price (USD)`} type="number" min="0" value={formPriceUsd} onChange={(v: any) => setFormPriceUsd(v ? Number(v) : "")} placeholder="0.00" />
                          </div>
                          <div style={{ flex: 1 }}>
                            <FloatingField label={`Discount Price (USD)`} type="number" min="0" value={formDiscountUsd} onChange={(v: any) => setFormDiscountUsd(v ? Number(v) : "")} placeholder="Optional" />
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 16, animation: "slideUp 0.15s ease-out", marginTop: 16 }}>
                          <div style={{ width: 120, display: "flex", alignItems: "center", fontWeight: 700, color: "#475569", fontSize: 13 }}>
                            Initial Booking
                          </div>
                          <div style={{ flex: 1 }}>
                            <FloatingField label={`Minimum Initial Payment (INR)`} type="number" min="0" value={formMinPayValue} onChange={(v: any) => setFormMinPayValue(v ? Number(v) : "")} placeholder="Optional booking amount" />
                          </div>
                          <div style={{ flex: 1, display: "flex", alignItems: "center", background: "#f8fafc", padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                            <span style={{ fontSize: 11, color: "#64748b", fontWeight: 500, lineHeight: 1.4 }}>If set, this exact amount will be populated as the mandatory initial payment for installments.</span>
                          </div>
                        </div>
                        </>
                      )}
                    </div>

                    <h3 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginTop: 40, marginBottom: 24, paddingTop: 32, borderTop: "1px solid #e2e8f0" }}>Home Page Visibility</h3>
                    <div style={{ border: "1.5px solid", padding: 24, borderRadius: 12, marginBottom: 24, display: "flex", flexDirection: "column", gap: 20, background: formShowOnHomepage ? "#fcf6f5" : "#fff", borderColor: formShowOnHomepage ? "#fecdd3" : "#e2e8f0", transition: "all 0.2s" }}>
                       <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                         <div style={{ width: 44, height: 44, borderRadius: 22, background: formShowOnHomepage ? "#f43f5e" : "#f1f5f9", color: formShowOnHomepage ? "#fff" : "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s" }}>
                            <Icon name="monitor" size={24} />
                         </div>
                         <div style={{ flex: 1 }}>
                            <h4 style={{ margin: "0 0 4px 0", fontSize: 16, fontWeight: 800, color: "#0f172a" }}>Show on Home Page</h4>
                            <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>If enabled, this course will be explicitly featured on the public home page.</p>
                         </div>
                         <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700, color: formShowOnHomepage ? "#e11d48" : "#475569", cursor: "pointer", background: formShowOnHomepage?"#ffe4e6":"#f8fafc", padding: "10px 16px", borderRadius: 8 }}>
                            <input type="checkbox" checked={formShowOnHomepage} onChange={e => setFormShowOnHomepage(e.target.checked)} style={{ width: 18, height: 18, accentColor: "#f43f5e" }} />
                            Active on Home
                         </label>
                       </div>
                    </div>

                    <h3 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginTop: 40, marginBottom: 24, paddingTop: 32, borderTop: "1px solid #e2e8f0" }}>Completion Goals</h3>
                    <div style={{ border: "1.5px solid", padding: 24, borderRadius: 12, marginBottom: 24, display: "flex", flexDirection: "column", gap: 20, background: formHasCertificate ? "#f0f9ff" : "#fff", borderColor: formHasCertificate ? "#bae6fd" : "#e2e8f0", transition: "all 0.2s" }}>
                       <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                         <div style={{ width: 44, height: 44, borderRadius: 22, background: formHasCertificate ? "#0ea5e9" : "#f1f5f9", color: formHasCertificate ? "#fff" : "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s" }}>
                            <Icon name="award" size={24} />
                         </div>
                         <div style={{ flex: 1 }}>
                            <h4 style={{ margin: "0 0 4px 0", fontSize: 16, fontWeight: 800, color: "#0f172a" }}>Course Certificate</h4>
                            <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>Issue an official certificate of completion automatically to students who successfully finish all course materials.</p>
                         </div>
                         <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700, color: formHasCertificate ? "#0284c7" : "#475569", cursor: "pointer", background: formHasCertificate?"#e0f2fe":"#f8fafc", padding: "10px 16px", borderRadius: 8 }}>
                            <input type="checkbox" checked={formHasCertificate} onChange={e => setFormHasCertificate(e.target.checked)} style={{ width: 18, height: 18, accentColor: "#0ea5e9" }} />
                            Enable Awards
                         </label>
                       </div>
                       
                       {formHasCertificate && (
                         <div style={{ animation: "slideUp 0.15s ease-out", borderTop: "1px solid #bae6fd", paddingTop: 20, marginTop: 4 }}>
                           <ImageDropzoneField label="Sample Certificate Template" value={formCertificateImageUrl} onChange={setFormCertificateImageUrl} placeholder="Upload a sample certificate image..." />
                         </div>
                       )}
                    </div>
                  </div>
               )}

               {/* ── STEP 3: Curriculum Mapping ── */}
               {wizardStep === 3 && (
                  <div style={{ display: "flex", gap: 30, height: "100%", width: "100%", animation: "slideUp 0.2s ease-out" }}>
                    
                    {/* Left: Available Subjects (25%) */}
                    <div style={{ width: "25%", minWidth: 260, display: "flex", flexDirection: "column", gap: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                         <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0f172a" }}>Available Subjects</h3>
                      </div>
                      <div className="custom-scroll" style={{ flex: 1, overflowY: "auto", paddingRight: 8, paddingBottom: 24 }}>
                        {Object.entries(groupedSubjects).map(([group, subs]) => (
                          <div key={group} style={{ marginBottom: 24 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                               <div style={{ fontSize: 12, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "1.5px" }}>{group}</div>
                               <div style={{ height: 1, flex: 1, background: "#e2e8f0" }}></div>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                              {subs.map(s => {
                                const isSelected = formSubjectIds.includes(s.id);
                                return (
                                  <div key={s.id} onClick={() => toggleSubject(s.id)} style={{ padding: "16px 20px", borderRadius: 14, border: `2.5px solid ${isSelected ? "#0ea5e9" : "#e2e8f0"}`, background: isSelected ? "#f0f9ff" : "#fff", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", transition: "all 0.2s", boxShadow: isSelected ? "0 8px 16px rgba(14,165,233,0.12)" : "0 2px 4px rgba(0,0,0,0.02)", transform: isSelected ? "translateY(-2px)" : "none" }}>
                                     <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                                        <div style={{ width: 32, height: 32, borderRadius: 10, background: isSelected ? "#0ea5e9" : "#f1f5f9", color: isSelected ? "#fff" : "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>
                                          <Icon name={isSelected ? "check" : "folder"} size={16} />
                                        </div>
                                        <span style={{ fontSize: 15, fontWeight: 700, color: isSelected ? "#0f172a" : "#475569" }}>{s.name}</span>
                                     </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Middle: Map Chapters Content (25%) */}
                    <div style={{ width: "25%", minWidth: 260, display: "flex", flexDirection: "column", gap: 16 }}>
                       <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0f172a" }}>Map Chapters Content</h3>
                       {formSubjectIds.length === 0 ? (
                          <div style={{ flex: 1, border: "2px dashed #cbd5e1", borderRadius: 20, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#f8fafc", textAlign: "center", padding: 30 }}>
                             <div style={{ color: "#0ea5e9", marginBottom: 16, opacity: 0.2, filter: "drop-shadow(0 10px 10px rgba(14,165,233,0.2))" }}><Icon name="layers" size={64} /></div>
                             <h4 style={{ margin: "0 0 8px 0", fontSize: 18, fontWeight: 800, color: "#0f172a" }}>No Subjects</h4>
                             <p style={{ color: "#64748b", fontSize: 13, margin: 0, maxWidth: 280, lineHeight: 1.5 }}>Select a subject on the left to reveal related chapters.</p>
                          </div>
                       ) : (
                          <div className="custom-scroll" style={{ display: "flex", flexDirection: "column", gap: 20, overflowY: "auto", paddingRight: 8, paddingBottom: 24 }}>
                             {formSubjectIds.map(subId => {
                                const sub = subjects.find(s => s.id === subId);
                                const chapters = subjectChapters[subId];
                                const loading = fetchingChaptersFor[subId];
                                
                                return (
                                   <div key={subId} style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 16, overflow: "hidden", animation: "slideUp 0.3s ease-out", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
                                      <div style={{ background: "#f8fafc", padding: "16px 20px", borderBottom: "1.5px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                         <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                            <div style={{ width: 24, height: 24, borderRadius: 8, background: "#0ea5e9", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="book" size={12} /></div>
                                            <span style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>{sub?.name}</span>
                                         </div>
                                         {!loading && chapters && chapters.length > 0 && (
                                            <div style={{ display: "flex", gap: 6 }}>
                                               <button onClick={() => selectAllChaptersForSubject(subId)} type="button" style={{ fontSize: 11, cursor: "pointer", border: "none", background: "#e0f2fe", padding: "4px 10px", borderRadius: 6, color: "#0284c7", fontWeight: 700, transition: "background 0.2s" }}>All</button>
                                               <button onClick={() => deselectAllChaptersForSubject(subId)} type="button" style={{ fontSize: 11, cursor: "pointer", border: "none", background: "#fee2e2", padding: "4px 10px", borderRadius: 6, color: "#ef4444", fontWeight: 700, transition: "background 0.2s" }}>Clr</button>
                                            </div>
                                         )}
                                      </div>
                                      <div style={{ padding: 16 }}>
                                         {loading ? (
                                            <div className="skeleton sk-p" style={{ width: "60%" }}></div>
                                         ) : !chapters || chapters.filter(c => c.is_active).length === 0 ? (
                                            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fef2f2", padding: "12px 16px", borderRadius: 10, color: "#b91c1c" }}>
                                              <Icon name="alert-circle" size={16} />
                                              <p style={{ fontSize: 12, fontWeight: 600, margin: 0 }}>No chapters found.</p>
                                            </div>
                                         ) : (
                                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                               {chapters.filter(c => c.is_active).map(c => {
                                                  const isChecked = formChapterIds.includes(c.id);
                                                  const isActive = activeChapterId === c.id;
                                                  return (
                                                     <div key={c.id} onClick={() => selectActiveChapter(c.id)} style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", background: isActive ? "#e0f2fe" : isChecked ? "#f0fdf4" : "#f8fafc", padding: "12px 16px", borderRadius: 12, border: `2px solid ${isActive ? "#38bdf8" : isChecked ? "#22c55e" : "#f1f5f9"}`, transition: "all 0.2s", userSelect: "none" }}>
                                                        <div onClick={(e) => { e.stopPropagation(); toggleChapter(c.id); }} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, borderRadius: 6, border: `2px solid ${isChecked ? "#22c55e" : "#cbd5e1"}`, background: isChecked ? "#22c55e" : "#fff", color: "#fff", transition: "all 0.2s", flexShrink: 0, cursor: "pointer" }}>
                                                           {isChecked && <Icon name="check" size={12} />}
                                                        </div>
                                                        <span style={{ fontSize: 13.5, fontWeight: isChecked || isActive ? 700 : 600, color: isActive ? "#0369a1" : isChecked ? "#15803d" : "#475569", flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.title}</span>
                                                     </div>
                                                  );
                                               })}
                                            </div>
                                         )}
                                      </div>
                                   </div>
                                );
                             })}
                          </div>
                       )}
                    </div>

                    {/* Right: Chapter Material Details (50%) */}
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
                       <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0f172a" }}>Chapter Details</h3>
                       </div>
                       {!activeChapterId ? (
                          <div style={{ flex: 1, border: "2px dashed #cbd5e1", borderRadius: 20, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#f8fafc", textAlign: "center", padding: 40 }}>
                             <div style={{ color: "#0ea5e9", marginBottom: 20, opacity: 0.2, filter: "drop-shadow(0 10px 10px rgba(14,165,233,0.2))" }}><Icon name="file-text" size={72} /></div>
                             <h4 style={{ margin: "0 0 10px 0", fontSize: 20, fontWeight: 800, color: "#0f172a" }}>No Chapter Selected</h4>
                             <p style={{ color: "#64748b", fontSize: 14, margin: 0, maxWidth: 340, lineHeight: 1.6 }}>Click on any chapter from the middle column to reveal its uploaded materials here.</p>
                          </div>
                       ) : (
                          <div className="custom-scroll" style={{ display: "flex", flexDirection: "column", gap: 16, overflowY: "auto", paddingRight: 8, paddingBottom: 24 }}>
                             {fetchingMaterialsFor[activeChapterId] ? (
                                <>
                                  <div className="skeleton sk-p" style={{ height: 60, borderRadius: 12 }}></div>
                                  <div className="skeleton sk-p" style={{ height: 60, borderRadius: 12 }}></div>
                                  <div className="skeleton sk-p" style={{ height: 60, borderRadius: 12 }}></div>
                                </>
                             ) : !chapterMaterials[activeChapterId] || chapterMaterials[activeChapterId].length === 0 ? (
                                <div style={{ display: "flex", alignItems: "center", gap: 12, background: "#fef2f2", padding: "16px 20px", borderRadius: 10, color: "#b91c1c" }}>
                                  <Icon name="alert-circle" size={20} />
                                  <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>This chapter has no uploaded materials yet.</p>
                                </div>
                             ) : (
                                chapterMaterials[activeChapterId].map(mat => {
                                   const isVideo = mat.file_type === 'video' || mat.file_type === 'youtube';
                                   const targetUrl = mat.youtube_url || mat.file_url || "#";
                                   return (
                                   <div key={mat.id} style={{ display: "flex", alignItems: "center", gap: 16, background: "#fff", border: "1.5px solid #e2e8f0", padding: "16px 20px", borderRadius: 12, boxShadow: "0 2px 4px rgba(0,0,0,0.02)", animation: "slideUp 0.15s ease-out" }}>
                                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: 12, background: isVideo ? "#fee2e2" : "#f1f5f9", color: isVideo ? "#ef4444" : "#64748b", flexShrink: 0 }}>
                                         <Icon name={isVideo ? 'video' : mat.file_type === 'pdf' ? 'file-text' : 'file'} size={22} />
                                      </div>
                                      <div style={{ flex: 1 }}>
                                         <h4 style={{ margin: "0 0 6px 0", fontSize: 15, fontWeight: 800, color: "#0f172a" }}>{mat.title}</h4>
                                         <span style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", background: "#f1f5f9", padding: "4px 8px", borderRadius: 6, letterSpacing: "0.5px" }}>{mat.file_type || "document"}</span>
                                      </div>
                                      <button onClick={() => setPreviewMaterial(mat)} type="button" style={{ border: "1.5px solid #e2e8f0", background: "#f8fafc", color: "#0ea5e9", fontWeight: 700, fontSize: 12, display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, transition: "background 0.2s", cursor: "pointer" }} onMouseEnter={e=>e.currentTarget.style.background="#f0f9ff"} onMouseLeave={e=>e.currentTarget.style.background="#f8fafc"}>
                                         <Icon name="play-circle" size={12} /> Play / View
                                      </button>
                                   </div>
                                )})
                             )}
                          </div>
                       )}

                             {/* Live Class Section */}
                             <div style={{ borderTop: "1.5px solid #e2e8f0", paddingTop: 20, marginTop: 8 }}>
                               <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                                 <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                   <div style={{ width: 32, height: 32, borderRadius: 10, background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                     <Icon name="video" size={16} />
                                   </div>
                                   <span style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>Live Classes</span>
                                 </div>
                                 <button type="button" onClick={() => setAddingLiveClass(v => !v)} style={{ fontSize: 12, fontWeight: 700, background: addingLiveClass ? "#fee2e2" : "#f0f9ff", color: addingLiveClass ? "#ef4444" : "#0ea5e9", border: `1.5px solid ${addingLiveClass ? "#fecaca" : "#bae6fd"}`, padding: "6px 14px", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                                   <Icon name={addingLiveClass ? "x" : "plus"} size={12} />
                                   {addingLiveClass ? "Cancel" : "Add Live Class"}
                                 </button>
                               </div>

                               {addingLiveClass && (
                                 <div style={{ background: "#f0f9ff", border: "1.5px solid #bae6fd", borderRadius: 12, padding: "16px 20px", marginBottom: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                                   <div>
                                     <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", marginBottom: 6 }}>Title</label>
                                     <input type="text" value={liveClassForm.title} onChange={e => setLiveClassForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Chapter 1 Live Session" style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1.5px solid #bae6fd", fontSize: 14, outline: "none", boxSizing: "border-box", background: "#fff" }} />
                                   </div>
                                   <div>
                                     <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", marginBottom: 6 }}>Meeting URL</label>
                                     <input type="url" value={liveClassForm.meeting_url} onChange={e => setLiveClassForm(p => ({ ...p, meeting_url: e.target.value }))} placeholder="https://meet.google.com/... or Zoom link" style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1.5px solid #bae6fd", fontSize: 14, outline: "none", boxSizing: "border-box", background: "#fff" }} />
                                   </div>
                                   <div>
                                     <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", marginBottom: 6 }}>Scheduled Date & Time</label>
                                     <input type="datetime-local" value={liveClassForm.scheduled_at} onChange={e => setLiveClassForm(p => ({ ...p, scheduled_at: e.target.value }))} style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1.5px solid #bae6fd", fontSize: 14, outline: "none", boxSizing: "border-box", background: "#fff" }} />
                                   </div>
                                   <button type="button" disabled={savingLiveClass || !liveClassForm.title.trim() || !liveClassForm.meeting_url.trim()} onClick={async () => {
                                     if (!activeChapterId) return;
                                     setSavingLiveClass(true);
                                     try {
                                       const res = await apiFetch(`${API}/chapters/${activeChapterId}/live-classes`, {
                                         method: "POST",
                                         headers: { "Content-Type": "application/json" },
                                         body: JSON.stringify({ title: liveClassForm.title.trim(), meeting_url: liveClassForm.meeting_url.trim(), scheduled_at: liveClassForm.scheduled_at || null }),
                                       });
                                       if (res.ok) {
                                         const newLc = await res.json();
                                         setChapterLiveClasses(p => ({ ...p, [activeChapterId]: [...(p[activeChapterId] || []), newLc] }));
                                         setLiveClassForm({ title: "", meeting_url: "", scheduled_at: "" });
                                         setAddingLiveClass(false);
                                         showToast("Live class added!", "success");
                                       } else { showToast("Failed to add live class", "error"); }
                                     } catch { showToast("Network error", "error"); }
                                     finally { setSavingLiveClass(false); }
                                   }} style={{ background: savingLiveClass ? "#94a3b8" : "#0ea5e9", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: savingLiveClass ? "not-allowed" : "pointer", alignSelf: "flex-end" }}>
                                     {savingLiveClass ? "Adding..." : "Add Live Class"}
                                   </button>
                                 </div>
                               )}

                               {fetchingLiveClassesFor[activeChapterId!] ? (
                                 <div className="skeleton sk-p" style={{ height: 50, borderRadius: 10 }}></div>
                               ) : !chapterLiveClasses[activeChapterId!] || chapterLiveClasses[activeChapterId!].length === 0 ? (
                                 <div style={{ fontSize: 13, color: "#94a3b8", fontStyle: "italic", padding: "8px 0" }}>No live classes scheduled yet.</div>
                               ) : (
                                 chapterLiveClasses[activeChapterId!].map(lc => (
                                   <div key={lc.id} style={{ display: "flex", alignItems: "center", gap: 14, background: "#f0fdf4", border: "1.5px solid #bbf7d0", padding: "14px 18px", borderRadius: 12, marginBottom: 10, animation: "slideUp 0.15s ease-out" }}>
                                     <div style={{ flex: 1 }}>
                                       <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>{lc.title}</div>
                                       {lc.scheduled_at && (
                                         <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, marginBottom: 4 }}>
                                           {new Date(lc.scheduled_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                                         </div>
                                       )}
                                       <a href={lc.meeting_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#0ea5e9", fontWeight: 700, textDecoration: "none", wordBreak: "break-all" }}>{lc.meeting_url}</a>
                                     </div>
                                     <button type="button" onClick={async () => {
                                       if (!window.confirm("Delete this live class?")) return;
                                       const res = await apiFetch(`${API}/live-classes/${lc.id}`, { method: "DELETE" });
                                       if (res.ok && activeChapterId) {
                                         setChapterLiveClasses(p => ({ ...p, [activeChapterId]: p[activeChapterId].filter(x => x.id !== lc.id) }));
                                         showToast("Deleted", "success");
                                       }
                                     }} style={{ background: "#fee2e2", color: "#ef4444", border: "none", width: 32, height: 32, borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                       <Icon name="trash" size={14} />
                                     </button>
                                   </div>
                                 ))
                               )}
                             </div>

                    </div>
                  </div>
               )}
            
               {/* ── STEP 4: Teachers ── */}
               {wizardStep === 4 && (
                 <div style={{ width: "100%", animation: "slideUp 0.2s ease-out" }}>
                   <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                     <div>
                       <h3 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", margin: 0 }}>Assign Teachers</h3>
                       <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>Select the instructors for this course.</p>
                     </div>
                     <button type="button" onClick={() => setShowAddInstructorModal(true)} style={{ background: "#f0f9ff", color: "#0ea5e9", border: "1.5px solid #bae6fd", padding: "8px 16px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                       <Icon name="plus" size={14} /> Add New Teacher
                     </button>
                   </div>

                   {/* Visibility Toggle */}
                   <div style={{ marginBottom: 24, padding: "16px 20px", background: formShowInstructorPublicly ? "#f0fdf4" : "#f8fafc", border: `1.5px solid ${formShowInstructorPublicly ? "#bbf7d0" : "#e2e8f0"}`, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "space-between", transition: "all 0.2s" }}>
                     <div>
                       <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>Public Visibility</div>
                       <div style={{ fontSize: 13, color: "#64748b" }}>Show these instructors on the public course page</div>
                     </div>
                     <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700, color: formShowInstructorPublicly ? "#15803d" : "#475569", cursor: "pointer" }}>
                        <input type="checkbox" checked={formShowInstructorPublicly} onChange={e => setFormShowInstructorPublicly(e.target.checked)} style={{ width: 18, height: 18, accentColor: "#22c55e" }} />
                        {formShowInstructorPublicly ? "Visible" : "Hidden"}
                     </label>
                   </div>

                   {allInstructors.length === 0 ? (
                     <div style={{ padding: 40, textAlign: "center", background: "#f8fafc", border: "2px dashed #e2e8f0", borderRadius: 16 }}>
                       <div style={{ color: "#94a3b8", marginBottom: 12 }}><Icon name="users" size={48} /></div>
                       <h4 style={{ margin: "0 0 8px 0", fontSize: 16, fontWeight: 700, color: "#0f172a" }}>No Teachers Found</h4>
                       <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>Click the button above to create your first instructor profile.</p>
                     </div>
                   ) : (
                     <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
                       {allInstructors.map(inst => {
                         const isSelected = formInstructorIds.includes(inst.id);
                         return (
                           <div
                             key={inst.id}
                             onClick={() => {
                               setFormInstructorIds(prev => prev.includes(inst.id) ? prev.filter(id => id !== inst.id) : [...prev, inst.id]);
                             }}
                             style={{
                               padding: 20, borderRadius: 16, border: `2px solid ${isSelected ? "#0ea5e9" : "#e2e8f0"}`,
                               background: isSelected ? "#f0f9ff" : "#fff", cursor: "pointer", position: "relative",
                               transition: "all 0.2s", boxShadow: isSelected ? "0 8px 16px rgba(14,165,233,0.1)" : "none",
                               transform: isSelected ? "translateY(-2px)" : "none"
                             }}
                           >
                             {isSelected && (
                               <div style={{ position: "absolute", top: 12, right: 12, width: 24, height: 24, borderRadius: 12, background: "#0ea5e9", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                 <Icon name="check" size={12} />
                               </div>
                             )}
                             <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
                               {inst.avatar_url ? (
                                 <img src={inst.avatar_url.startsWith("http") ? inst.avatar_url : `${API_BASE_URL.replace("/api", "")}${inst.avatar_url}`} alt={inst.name} style={{ width: 56, height: 56, borderRadius: 28, objectFit: "cover", border: `3px solid ${isSelected ? "#0ea5e9" : "#e2e8f0"}`, flexShrink: 0 }} />
                               ) : (
                                 <div style={{ width: 56, height: 56, borderRadius: 28, background: isSelected ? "#0ea5e9" : "#f1f5f9", color: isSelected ? "#fff" : "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, flexShrink: 0, transition: "all 0.2s" }}>
                                   {inst.name.charAt(0).toUpperCase()}
                                 </div>
                               )}
                               <div style={{ flex: 1, minWidth: 0 }}>
                                 <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", marginBottom: 2 }}>{inst.name}</div>
                                 {inst.email && <div style={{ fontSize: 12, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{inst.email}</div>}
                               </div>
                             </div>
                             {inst.bio && (
                               <p style={{ margin: 0, fontSize: 13, color: "#475569", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{inst.bio}</p>
                             )}
                           </div>
                         );
                       })}
                     </div>
                   )}

                   {formInstructorIds.length > 0 && (
                     <div style={{ marginTop: 24, padding: "14px 20px", background: "#f0fdf4", border: "1.5px solid #bbf7d0", borderRadius: 12, display: "flex", alignItems: "center", gap: 12 }}>
                       <Icon name="check" size={16} />
                       <span style={{ fontSize: 14, fontWeight: 700, color: "#15803d" }}>{formInstructorIds.length} teacher{formInstructorIds.length !== 1 ? "s" : ""} assigned to this course</span>
                     </div>
                   )}
                 </div>
               )}

            </div>
            
            {/* Modal Footer */}

            <div style={{ padding: "20px 28px", borderTop: "1px solid #e2e8f0", background: "#fff", display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 14 }}>
              {formError && <span style={{ color: "#ef4444", fontSize: 13, fontWeight: 600 }}>⚠ {formError}</span>}
              <button type="button" onClick={() => { if (isInlineModal) { if (onCloseInline) onCloseInline(); } else { closeModal(); } }} style={{ background: "none", border: "1px solid #e2e8f0", color: "#64748b", padding: "10px 24px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
              <button type="button" onClick={handleSave} disabled={saving} style={{ background: saving ? "#94a3b8" : "#0ea5e9", color: "#fff", border: "none", padding: "10px 32px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", boxShadow: saving ? "none" : "0 2px 10px rgba(14,165,233,0.3)" }}>
                {saving ? "Saving..." : "Save Course Content"}
              </button>
            </div>
            
          </div>
        </div>
      )}

      
      
      {/* ── Add New Teacher Inline Modal ── */}
      {showAddInstructorModal && (
        <div onClick={e => { if (e.target === e.currentTarget) setShowAddInstructorModal(false); }} style={{ position: "fixed", inset: 0, zIndex: 100001, background: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 24, width: "100%", maxWidth: 680, boxShadow: "0 24px 80px rgba(0,0,0,0.18)", overflow: "hidden", animation: "slideUp 0.25s ease-out", display: "flex", flexDirection: "column", maxHeight: "90vh" }}>
            <div style={{ padding: "26px 32px 22px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fafbfc", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg,#0ea5e9,#3b82f6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", flexShrink: 0 }}>
                  <Icon name="users" size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#0f172a" }}>Add New Teacher</h3>
                  <p style={{ margin: "3px 0 0", fontSize: 13, color: "#64748b" }}>Create an instructor profile</p>
                </div>
              </div>
              <button onClick={() => { setShowAddInstructorModal(false); setNewInstructor({ name: "", email: "", phone: "", bio: "", avatar_url: "", is_active: true, qualification: "", experience_years: "", designation: "", specialization: "", social_linkedin: "", social_twitter: "", social_website: "", intro_video_url: "", achievements: "" }); }} style={{ background: "#fff", border: "1px solid #e2e8f0", width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", cursor: "pointer", flexShrink: 0 }}>
                <Icon name="x" size={16} />
              </button>
            </div>
            <div style={{ padding: "24px 32px", display: "flex", flexDirection: "column", gap: 20, overflowY: "auto" }}>
              <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#0f172a", textTransform: "uppercase", letterSpacing: 0.5, paddingBottom: 8, borderBottom: "1px solid #e2e8f0" }}>Basic Information</h4>
              <FloatingField
                label="Full Name *" value={newInstructor.name} onChange={(v: string) => setNewInstructor(p => ({ ...p, name: v }))} placeholder="Enter teacher's full name" autoFocus
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                <FloatingField
                  label="Email Address" type="email" value={newInstructor.email} onChange={(v: string) => setNewInstructor(p => ({ ...p, email: v }))} placeholder="e.g. instructor@example.com"
                />
                <FloatingField
                  label="Phone Number" value={newInstructor.phone} onChange={(v: string) => setNewInstructor(p => ({ ...p, phone: v }))} placeholder="e.g. +1 234 567 890"
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                <FloatingField label="Designation / Title (e.g. Senior Instructor)" value={newInstructor.designation} onChange={(v: string) => setNewInstructor(p => ({ ...p, designation: v }))} placeholder="e.g. Professor" />
                <FloatingField label="Years of Experience (e.g. 5+ Years)" value={newInstructor.experience_years} onChange={(v: string) => setNewInstructor(p => ({ ...p, experience_years: v }))} placeholder="e.g. 10+ Years" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                <FloatingField label="Qualifications (e.g. Ph.D.)" value={newInstructor.qualification} onChange={(v: string) => setNewInstructor(p => ({ ...p, qualification: v }))} placeholder="e.g. M.Sc. in Physics" />
                <FloatingField label="Specializations (e.g. Math, Python)" value={newInstructor.specialization} onChange={(v: string) => setNewInstructor(p => ({ ...p, specialization: v }))} placeholder="e.g. Algebra, Calculus" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <ImageDropzoneField
                    label="Avatar (optional)" value={newInstructor.avatar_url} onChange={(v: string) => setNewInstructor(p => ({ ...p, avatar_url: v }))} placeholder="Upload image..."
                  />
                </div>
                <FloatingField
                  label="Short Bio (optional)" value={newInstructor.bio} onChange={(v: string) => setNewInstructor(p => ({ ...p, bio: v }))} isTextArea placeholder="Brief description of the instructor..."
                />
              </div>
              <FloatingField label="Achievements / Awards (optional)" value={newInstructor.achievements} onChange={(v: string) => setNewInstructor(p => ({ ...p, achievements: v }))} isTextArea placeholder="List major awards or recognitions..." />

              <h4 style={{ margin: "10px 0 0", fontSize: 14, fontWeight: 700, color: "#0f172a", textTransform: "uppercase", letterSpacing: 0.5, paddingBottom: 8, borderBottom: "1px solid #e2e8f0" }}>Social & Links</h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                <FloatingField label="LinkedIn Profile URL" value={newInstructor.social_linkedin} onChange={(v: string) => setNewInstructor(p => ({ ...p, social_linkedin: v }))} placeholder="https://linkedin.com/in/..." />
                <FloatingField label="Twitter Profile URL" value={newInstructor.social_twitter} onChange={(v: string) => setNewInstructor(p => ({ ...p, social_twitter: v }))} placeholder="https://twitter.com/..." />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                <FloatingField label="Personal Website / Portfolio URL" value={newInstructor.social_website} onChange={(v: string) => setNewInstructor(p => ({ ...p, social_website: v }))} placeholder="https://..." />
                <FloatingField label="Introductory Video URL (YouTube/Vimeo)" value={newInstructor.intro_video_url} onChange={(v: string) => setNewInstructor(p => ({ ...p, intro_video_url: v }))} placeholder="https://youtube.com/watch?v=..." />
              </div>

              {/* Active Status toggle */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderRadius: 12, border: "1.5px solid #e2e8f0", background: "#f8fafc" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>Active Status</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Inactive teachers won't appear in batch assignment</div>
                </div>
                <label style={{ position: "relative", display: "inline-block", width: 46, height: 26, cursor: "pointer", flexShrink: 0 }}>
                  <input
                    type="checkbox"
                    checked={newInstructor.is_active}
                    onChange={e => setNewInstructor(p => ({ ...p, is_active: e.target.checked }))}
                    style={{ opacity: 0, width: 0, height: 0, position: "absolute" }}
                  />
                  <span style={{ position: "absolute", inset: 0, background: newInstructor.is_active ? "#0ea5e9" : "#cbd5e1", borderRadius: 13, transition: "background 0.25s" }} />
                  <span style={{ position: "absolute", top: 3, left: newInstructor.is_active ? 23 : 3, width: 20, height: 20, background: "#fff", borderRadius: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.25)", transition: "left 0.25s" }} />
                </label>
              </div>
            </div>
            <div style={{ padding: "18px 32px 26px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "flex-end", gap: 12, background: "#fafbfc", flexShrink: 0 }}>
              <button onClick={() => { setShowAddInstructorModal(false); setNewInstructor({ name: "", email: "", phone: "", bio: "", avatar_url: "", is_active: true, qualification: "", experience_years: "", designation: "", specialization: "", social_linkedin: "", social_twitter: "", social_website: "", intro_video_url: "", achievements: "" }); }} style={{ padding: "11px 24px", borderRadius: 10, border: "1.5px solid #e2e8f0", background: "#fff", color: "#475569", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Cancel</button>
              <button
                disabled={addingInstructor || !newInstructor.name.trim()}
                onClick={async () => {
                  if (!newInstructor.name.trim()) return;
                  setAddingInstructor(true);
                  try {
                    const res = await apiFetch(`${API}/instructors`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(newInstructor)
                    });
                    if (res.ok) {
                      const created = await res.json();
                      setAllInstructors(prev => [...prev, created]);
                      setFormInstructorIds(prev => [...prev, created.id]);
                      setShowAddInstructorModal(false);
                      setNewInstructor({ name: "", email: "", phone: "", bio: "", avatar_url: "", is_active: true, qualification: "", experience_years: "", designation: "", specialization: "", social_linkedin: "", social_twitter: "", social_website: "", intro_video_url: "", achievements: "" });
                      showToast(`Teacher "${created.name}" added!`);
                    } else {
                      showToast("Failed to create teacher", "error");
                    }
                  } catch { showToast("Network error", "error"); }
                  finally { setAddingInstructor(false); }
                }}
                style={{ padding: "11px 32px", borderRadius: 10, border: "none", background: addingInstructor ? "#7dd3fc" : "linear-gradient(135deg,#0ea5e9,#3b82f6)", color: "#fff", fontWeight: 700, fontSize: 14, cursor: addingInstructor ? "not-allowed" : "pointer", boxShadow: addingInstructor ? "none" : "0 4px 14px rgba(14,165,233,0.35)", transition: "all 0.2s" }}
              >
                {addingInstructor ? "Adding..." : "Add Teacher"}
              </button>
            </div>
          </div>
        </div>
      )}

      {previewMaterial && (
        <MediaPreviewModal material={previewMaterial} onClose={() => setPreviewMaterial(null)} />
      )}

      {/* Basic Keyframes for modal animation */}
      <style dangerouslySetInnerHTML={{__html:`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .custom-scroll::-webkit-scrollbar { width: 6px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}} />
    </div>
  );
}

// ── Shared styles ───────────────────────────────────────
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 800, color: "#64748b",
  marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px",
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "12px 16px", borderRadius: 10,
  border: "1.5px solid #e2e8f0", fontSize: 14, outline: "none",
  boxSizing: "border-box", background: "#f8fafc", color: "#0f172a",
  transition: "border 0.2s, background 0.2s",
};

const thStyle: React.CSSProperties = {
  padding: "16px 20px", textAlign: "left", fontWeight: 700,
  color: "#475569", textTransform: "uppercase", fontSize: 11,
  letterSpacing: "0.5px",
};

const emptyCellStyle: React.CSSProperties = {
  padding: 60, textAlign: "center", background: "#fff",
};

const actionBtnStyle = (bg: string, color: string, border: string): React.CSSProperties => ({
  border: `1px solid ${border}`, background: bg, color, width: 34, height: 34,
  borderRadius: 8, cursor: "pointer", display: "inline-flex",
  alignItems: "center", justifyContent: "center", transition: "all 0.2s",
});
