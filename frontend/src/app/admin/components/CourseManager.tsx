"use client";
import { apiFetch } from "@/lib/apiFetch";
import React, { useEffect, useState, useCallback } from "react";
import { useToast } from "./ToastProvider";
import DeleteModal from "./DeleteModal";
import { Icon } from "../icons";
import { API_BASE_URL } from "@/lib/config";
import AICourseAgent from "./AICourseAgent";
import UploadModal from "./UploadModal";

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



interface Category {
  id: number;
  name: string;
}

interface SubCategory {
  id: number;
  name: string;
  category_id: number;
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
  description?: string | null;
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
  const [showPreview, setShowPreview] = React.useState(false);

  const isPdf = value && value.toLowerCase().endsWith(".pdf");
  const fullUrl = value && value.startsWith("http") ? value : value ? `${API_BASE_URL.replace('/api', '')}${value}` : "";

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
             isPdf ? (
               <div style={{ width: 36, height: 36, borderRadius: 6, background: "#fef3c7", color: "#d97706", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                 <Icon name="file-text" size={20} />
               </div>
             ) : (
               <img src={fullUrl} alt="Preview" style={{ width: 36, height: 36, borderRadius: 6, objectFit: "cover" }} />
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

           {isPdf && (
             <button
               type="button"
               onClick={() => setShowPreview(v => !v)}
               style={{
                 background: showPreview ? "#fef3c7" : "#fff",
                 color: "#d97706",
                 border: "1px solid #fde68a",
                 padding: "6px 12px",
                 borderRadius: 8,
                 fontSize: 12,
                 fontWeight: 700,
                 cursor: "pointer",
                 whiteSpace: "nowrap",
                 display: "flex",
                 alignItems: "center",
                 gap: 4,
               }}
             >
               <Icon name="eye" size={14} /> {showPreview ? "Hide" : "Preview"}
             </button>
           )}

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

      {showPreview && isPdf && fullUrl && (
        <div
          onClick={() => setShowPreview(false)}
          style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.85)",
            zIndex: 100000,
            display: "flex",
            flexDirection: "column",
            animation: "fadeIn 0.15s ease-out",
          }}
        >
          {/* Toolbar */}
          <div
            onClick={e => e.stopPropagation()}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 24px",
              background: "#1e293b",
              color: "#fff",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Icon name="file-text" size={20} />
              <span style={{ fontSize: 14, fontWeight: 700 }}>Syllabus PDF Preview</span>
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <a
                href={fullUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: 12, fontWeight: 700, color: "#38bdf8",
                  textDecoration: "none", display: "flex", alignItems: "center", gap: 6,
                  background: "rgba(56,189,248,0.1)", padding: "6px 14px", borderRadius: 6,
                  border: "1px solid rgba(56,189,248,0.3)",
                }}
              >
                <Icon name="external-link" size={14} /> Open in new tab
              </a>
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                style={{
                  background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)",
                  color: "#fca5a5", cursor: "pointer", fontSize: 13, fontWeight: 700,
                  padding: "6px 14px", borderRadius: 6, display: "flex", alignItems: "center", gap: 6,
                }}
              >
                <Icon name="x" size={16} /> Close
              </button>
            </div>
          </div>
          {/* PDF iframe fills remaining space */}
          <div style={{ flex: 1, overflow: "hidden" }} onClick={e => e.stopPropagation()}>
            <iframe
              src={fullUrl}
              title="Syllabus PDF Preview"
              style={{ width: "100%", height: "100%", border: "none", display: "block" }}
            />
          </div>
        </div>
      )}
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

function SectionPanel({ title, icon, accent = "#0ea5e9", children, marginBottom = 20 }: {
  title: string; icon?: string; accent?: string; children: React.ReactNode; marginBottom?: number;
}) {
  return (
    <div style={{
      marginBottom,
      border: "1px solid #e2e8f0",
      borderRadius: 8,
      overflow: "hidden",
      background: "#fff",
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 16px",
        background: "#f8fafc",
        borderBottom: "1px solid #e2e8f0",
        borderLeft: `3px solid ${accent}`,
      }}>
        {icon && <span style={{ fontSize: 14 }}>{icon}</span>}
        <span style={{ fontSize: 13, fontWeight: 800, color: "#334155", letterSpacing: "0.2px" }}>{title}</span>
      </div>
      <div style={{ padding: "20px 20px 4px" }}>
        {children}
      </div>
    </div>
  );
}

function FieldRow({ children, gap = 16 }: { children: React.ReactNode; gap?: number }) {
  return (
    <div style={{ display: "flex", gap, marginBottom: 16 }}>
      {children}
    </div>
  );
}

function wizardTabStyle(active: boolean): React.CSSProperties {
  return {
    padding: "10px 18px", display: "flex", alignItems: "center", gap: 8,
    background: "none", border: "none",
    borderBottom: active ? "2px solid #0ea5e9" : "2px solid transparent",
    fontSize: 13, fontWeight: active ? 800 : 600,
    color: active ? "#0f172a" : "#64748b",
    cursor: "pointer", transition: "all 0.15s",
    position: "relative",
    marginBottom: -1,
  };
}
function wizardBadgeStyle(active: boolean): React.CSSProperties {
  return {
    width: 20, height: 20, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
    background: active ? "#0ea5e9" : "#e2e8f0", color: active ? "#fff" : "#94a3b8", fontSize: 11, fontWeight: 800,
    boxShadow: active ? "0 1px 4px rgba(14,165,233,0.3)" : "none",
    transition: "all 0.15s",
  };
}

export default function CourseManager({ isInlineModal = false, onCloseInline, onCourseSaved }: any = {}) {
  const { showToast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subcategories, setSubcategories] = useState<SubCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
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
  const [aiAgentOpen, setAiAgentOpen] = useState(false);

  // ── Bulk select & delete state ──
  const [bulkSubjectIds, setBulkSubjectIds] = useState<Set<number>>(new Set());
  const [bulkChapterIds, setBulkChapterIds] = useState<Set<number>>(new Set());
  const [bulkDeleteMode, setBulkDeleteMode] = useState(false);
  const [deletingBulk, setDeletingBulk] = useState(false);

  // ── Inline edit state ──
  const [editingSubjectId, setEditingSubjectId] = useState<number | null>(null);
  const [editingSubjectName, setEditingSubjectName] = useState("");
  const [editingChapterId, setEditingChapterId] = useState<number | null>(null);
  const [editingChapterTitle, setEditingChapterTitle] = useState("");
  const [editingMaterialId, setEditingMaterialId] = useState<number | null>(null);
  const [editingMaterialData, setEditingMaterialData] = useState({ title: "", description: "", youtube_url: "" });
  const [editingLiveClassId, setEditingLiveClassId] = useState<number | null>(null);
  const [editingLiveClassData, setEditingLiveClassData] = useState({ title: "", meeting_url: "", scheduled_at: "" });

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

  // ── Inline add state ──
  const [addingSubject, setAddingSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectCatId, setNewSubjectCatId] = useState<number | "new" | "">("");
  const [newSubjectSubcatId, setNewSubjectSubcatId] = useState<number | "new" | "">("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newSubcategoryName, setNewSubcategoryName] = useState("");
  const [savingSubject, setSavingSubject] = useState(false);

  const [addingChapter, setAddingChapter] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [newChapterSubId, setNewChapterSubId] = useState<number | "">("");
  const [savingChapter, setSavingChapter] = useState(false);

  const [addingMaterial, setAddingMaterial] = useState(false);
  const [newMaterialForm, setNewMaterialForm] = useState({ title: "", description: "", youtube_url: "" });
  const [savingMaterial, setSavingMaterial] = useState(false);
  const [materialMode, setMaterialMode] = useState<"youtube" | "upload" | "library">("youtube");
  const [librarySearch, setLibrarySearch] = useState("");
  const [libraryResults, setLibraryResults] = useState<Material[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [linkingMaterialId, setLinkingMaterialId] = useState<number | null>(null);

  const fetchLiveClasses = (chapterId: number) => {
    if (chapterLiveClasses[chapterId] !== undefined || fetchingLiveClassesFor[chapterId]) return;
    setFetchingLiveClassesFor(p => ({ ...p, [chapterId]: true }));
    apiFetch(`${API}/chapters/${chapterId}/live-classes`)
      .then(res => res.json())
      .then(data => setChapterLiveClasses(p => ({ ...p, [chapterId]: data })))
      .catch(e => console.error(e))
      .finally(() => setFetchingLiveClassesFor(p => ({ ...p, [chapterId]: false })));
  };

  const handleAddSubject = async () => {
    if (!newSubjectName.trim()) return;
    setSavingSubject(true);
    try {
      let catId: number | null = newSubjectCatId === "new" || newSubjectCatId === "" ? null : newSubjectCatId;
      if (newSubjectCatId === "new") {
        const res = await apiFetch(`${API}/categories`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newCategoryName.trim() }),
        });
        if (!res.ok) { showToast("Failed to create category", "error"); return; }
        const created = await res.json();
        setCategories(p => [...p, created]);
        catId = created.id;
      }
      if (catId === null) { showToast("Select or create a category", "error"); return; }

      let subcatId: number | null = newSubjectSubcatId === "new" || newSubjectSubcatId === "" ? null : newSubjectSubcatId;
      if (newSubjectSubcatId === "new") {
        const res = await apiFetch(`${API}/subcategories`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newSubcategoryName.trim(), category_id: catId }),
        });
        if (!res.ok) { showToast("Failed to create subcategory", "error"); return; }
        const created = await res.json();
        setSubcategories(p => [...p, created]);
        subcatId = created.id;
      }
      if (subcatId === null) { showToast("Select or create a subcategory", "error"); return; }

      const res = await apiFetch(`${API}/subcategories/${subcatId}/subjects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newSubjectName.trim(), subcategory_id: subcatId }),
      });
      if (res.ok) {
        const created = await res.json();
        setSubjects(p => [...p, created]);
        setFormSubjectIds(p => p.includes(created.id) ? p : [...p, created.id]);
        setNewSubjectName("");
        setNewSubjectCatId("");
        setNewSubjectSubcatId("");
        setNewCategoryName("");
        setNewSubcategoryName("");
        setAddingSubject(false);
        showToast(`Subject "${created.name}" added!`, "success");
      } else { showToast("Failed to add subject", "error"); }
    } catch { showToast("Network error", "error"); }
    finally { setSavingSubject(false); }
  };

  const handleAddChapter = async () => {
    if (!newChapterTitle.trim() || !newChapterSubId) return;
    setSavingChapter(true);
    try {
      const res = await apiFetch(`${API}/subjects/${newChapterSubId}/chapters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newChapterTitle.trim(), subject_id: newChapterSubId }),
      });
      if (res.ok) {
        const created = await res.json();
        setSubjectChapters(p => ({ ...p, [newChapterSubId]: [...(p[newChapterSubId] || []), created] }));
        setFormChapterIds(p => p.includes(created.id) ? p : [...p, created.id]);
        setNewChapterTitle("");
        setNewChapterSubId("");
        setAddingChapter(false);
        showToast(`Chapter "${created.title}" added!`, "success");
      } else { showToast("Failed to add chapter", "error"); }
    } catch { showToast("Network error", "error"); }
    finally { setSavingChapter(false); }
  };

  const handleAddMaterial = async () => {
    if (!activeChapterId || !newMaterialForm.title.trim()) return;
    setSavingMaterial(true);
    try {
      const res = await apiFetch(`${API}/chapters/${activeChapterId}/create-material`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newMaterialForm.title.trim(),
          description: newMaterialForm.description.trim() || null,
          youtube_url: newMaterialForm.youtube_url.trim() || null,
        }),
      });
      if (res.ok) {
        const mres = await apiFetch(`${API}/chapters/${activeChapterId}/materials`);
        if (mres.ok) {
          const mats = await mres.json();
          setChapterMaterials(p => ({ ...p, [activeChapterId]: mats }));
        }
        setNewMaterialForm({ title: "", description: "", youtube_url: "" });
        setAddingMaterial(false);
        showToast("Material added!", "success");
      } else { showToast("Failed to add material", "error"); }
    } catch { showToast("Network error", "error"); }
    finally { setSavingMaterial(false); }
  };

  const handleLinkMaterial = async (materialId: number) => {
    if (!activeChapterId) return;
    setLinkingMaterialId(materialId);
    try {
      const res = await apiFetch(`${API}/chapters/${activeChapterId}/materials/${materialId}`, { method: "POST" });
      if (res.ok) {
        const mres = await apiFetch(`${API}/chapters/${activeChapterId}/materials`);
        if (mres.ok) {
          const mats = await mres.json();
          setChapterMaterials(p => ({ ...p, [activeChapterId]: mats }));
        }
        showToast("Material linked to chapter!", "success");
      } else { showToast("Failed to link material", "error"); }
    } catch { showToast("Network error", "error"); }
    finally { setLinkingMaterialId(null); }
  };

  useEffect(() => {
    if (!addingMaterial || materialMode !== "library") return;
    setLibraryLoading(true);
    const t = setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        if (librarySearch.trim()) params.append("search", librarySearch.trim());
        const res = await apiFetch(`${API}/materials?${params}`);
        if (res.ok) setLibraryResults(await res.json());
      } catch { /* silent */ }
      finally { setLibraryLoading(false); }
    }, 350);
    return () => clearTimeout(t);
  }, [librarySearch, addingMaterial, materialMode]);

  const selectActiveChapter = (chapterId: number) => {
    // Toggle off if already active
    if (activeChapterId === chapterId) {
      setActiveChapterId(null);
      return;
    }
    setActiveChapterId(chapterId);
    fetchLiveClasses(chapterId);
    setAddingLiveClass(false);
    setAddingMaterial(false);
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
      const [catRes, scRes, subRes, courseRes, instRes] = await Promise.all([
        apiFetch(`${API}/categories`),
        apiFetch(`${API}/subcategories`),
        apiFetch(`${API}/subjects`),
        apiFetch(
          `${API}/courses?search=${encodeURIComponent(search)}${
            filterSubjectId !== "all" ? `&subject_id=${filterSubjectId}` : ""
          }`
        ),
        apiFetch(`${API}/instructors`),
      ]);
      if (catRes.ok) setCategories(await catRes.json());
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

  // ── AI Course Agent helpers ─────────────────────────
  const buildCourseContext = useCallback(() => {
    const parsedDuration = parseInt(String(formDurationMonths).replace(/\D/g, ""), 10);
    return {
      title: formTitle,
      description: formDesc,
      status: formStatus,
      skill_level: formSkillLevel,
      prerequisites: formPrerequisites,
      what_you_will_learn: formLearn,
      target_audience: formTargetAudience,
      seo_title: formSeoTitle,
      seo_description: formSeoDesc,
      seo_keywords: formSeoKeywords,
      thumbnail_url: formThumbnail,
      promo_video_url: formPromo,
      upload_syllabus: formUploadSyllabus,
      price: formPrice === "" ? null : Number(formPrice),
      discount_price: formDiscount === "" ? null : Number(formDiscount),
      price_usd: formPriceUsd === "" ? null : Number(formPriceUsd),
      discount_price_usd: formDiscountUsd === "" ? null : Number(formDiscountUsd),
      is_free: formIsFree,
      validity_days: isNaN(parsedDuration) ? null : parsedDuration * 30,
      has_certificate: formHasCertificate,
      is_featured: formIsFeatured,
      show_on_homepage: formShowOnHomepage,
      is_new: formIsNew,
      subject_ids: formSubjectIds,
      chapter_ids: formChapterIds,
      instructor_ids: formInstructorIds,
      available_subcategories: subcategories.map(sc => ({ id: sc.id, name: sc.name })),
      available_subjects: subjects.map(s => ({ id: s.id, name: s.name })),
      available_instructors: allInstructors.map(i => ({ id: i.id, name: i.name })),
    };
  }, [formTitle, formDesc, formStatus, formSkillLevel, formPrerequisites, formLearn,
      formTargetAudience, formSeoTitle, formSeoDesc, formSeoKeywords, formThumbnail,
      formPromo, formUploadSyllabus, formPrice, formDiscount, formPriceUsd, formDiscountUsd,
      formIsFree, formDurationMonths, formHasCertificate, formIsFeatured, formShowOnHomepage,
      formIsNew, formSubjectIds, formChapterIds, formInstructorIds, subcategories, subjects, allInstructors]);

  const handleApplyAiChanges = useCallback((changes: Record<string, any>) => {
    if (changes.title !== undefined) setFormTitle(String(changes.title));
    if (changes.description !== undefined) setFormDesc(String(changes.description));
    if (changes.status !== undefined) setFormStatus(String(changes.status));
    if (changes.skill_level !== undefined) setFormSkillLevel(String(changes.skill_level));
    if (changes.prerequisites !== undefined) setFormPrerequisites(String(changes.prerequisites));
    if (changes.what_you_will_learn !== undefined) setFormLearn(String(changes.what_you_will_learn));
    if (changes.target_audience !== undefined) setFormTargetAudience(String(changes.target_audience));
    if (changes.seo_title !== undefined) setFormSeoTitle(String(changes.seo_title));
    if (changes.seo_description !== undefined) setFormSeoDesc(String(changes.seo_description));
    if (changes.seo_keywords !== undefined) setFormSeoKeywords(String(changes.seo_keywords));
    if (changes.thumbnail_url !== undefined) setFormThumbnail(String(changes.thumbnail_url));
    if (changes.promo_video_url !== undefined) setFormPromo(String(changes.promo_video_url));
    if (changes.upload_syllabus !== undefined) setFormUploadSyllabus(String(changes.upload_syllabus));
    if (changes.price !== undefined) setFormPrice(changes.price === null ? "" : Number(changes.price));
    if (changes.discount_price !== undefined) setFormDiscount(changes.discount_price === null ? "" : Number(changes.discount_price));
    if (changes.price_usd !== undefined) setFormPriceUsd(changes.price_usd === null ? "" : Number(changes.price_usd));
    if (changes.discount_price_usd !== undefined) setFormDiscountUsd(changes.discount_price_usd === null ? "" : Number(changes.discount_price_usd));
    if (changes.is_free !== undefined) setFormIsFree(Boolean(changes.is_free));
    if (changes.validity_days !== undefined) {
      const days = Number(changes.validity_days);
      setFormDurationMonths(isNaN(days) ? "" : String(Math.floor(days / 30)));
    }
    if (changes.has_certificate !== undefined) setFormHasCertificate(Boolean(changes.has_certificate));
    if (changes.is_featured !== undefined) setFormIsFeatured(Boolean(changes.is_featured));
    if (changes.show_on_homepage !== undefined) setFormShowOnHomepage(Boolean(changes.show_on_homepage));
    if (changes.is_new !== undefined) setFormIsNew(Boolean(changes.is_new));
    if (changes.subject_ids !== undefined && Array.isArray(changes.subject_ids)) setFormSubjectIds(changes.subject_ids);
    if (changes.chapter_ids !== undefined && Array.isArray(changes.chapter_ids)) setFormChapterIds(changes.chapter_ids);
    if (changes.instructor_ids !== undefined && Array.isArray(changes.instructor_ids)) setFormInstructorIds(changes.instructor_ids);
    showToast("AI changes applied to form!");
  }, [showToast]);

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
    setAiAgentOpen(false);
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

  // ── Bulk subject handlers ──
  const toggleBulkSubject = (id: number) => {
    setBulkSubjectIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleAllBulkSubjects = () => {
    if (bulkSubjectIds.size === subjects.length) {
      setBulkSubjectIds(new Set());
    } else {
      setBulkSubjectIds(new Set(subjects.map(s => s.id)));
    }
  };
  const handleBulkDeleteSubjects = async () => {
    if (bulkSubjectIds.size === 0) return;
    const count = bulkSubjectIds.size;
    if (!window.confirm(`Force-delete ${count} subject${count !== 1 ? "s" : ""}? This will delete ALL related chapters, materials, and live classes.`)) return;
    setDeletingBulk(true);
    try {
      for (const id of bulkSubjectIds) {
        const res = await apiFetch(`${API}/subjects/${id}/force`, { method: "DELETE" });
        if (!res.ok) { showToast(`Failed to delete subject ID ${id}`, "error"); }
      }
      showToast(`${count} subject${count !== 1 ? "s" : ""} force-deleted`);
      setBulkSubjectIds(new Set());
      setBulkDeleteMode(false);
      fetchAll();
    } catch { showToast("Network error", "error"); }
    finally { setDeletingBulk(false); }
  };

  // ── Bulk chapter handlers ──
  const toggleBulkChapter = (id: number) => {
    setBulkChapterIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const handleBulkDeleteChapters = async () => {
    if (bulkChapterIds.size === 0) return;
    const count = bulkChapterIds.size;
    if (!window.confirm(`Force-delete ${count} chapter${count !== 1 ? "s" : ""}? This will delete ALL related materials and live classes.`)) return;
    setDeletingBulk(true);
    try {
      for (const id of bulkChapterIds) {
        const res = await apiFetch(`${API}/chapters/${id}/force`, { method: "DELETE" });
        if (!res.ok) { showToast(`Failed to delete chapter ID ${id}`, "error"); }
      }
      showToast(`${count} chapter${count !== 1 ? "s" : ""} force-deleted`);
      setBulkChapterIds(new Set());
      setBulkDeleteMode(false);
      // Clear caches
      setSubjectChapters({});
      setChapterMaterials({});
      setChapterLiveClasses({});
      setActiveChapterId(null);
      fetchAll();
    } catch { showToast("Network error", "error"); }
    finally { setDeletingBulk(false); }
  };

  // ── Single delete handlers ──
  const handleDeleteSubject = async (id: number, name: string) => {
    if (!window.confirm(`Force-delete subject "${name}"? This will delete ALL related chapters, materials, and live classes.`)) return;
    try {
      const res = await apiFetch(`${API}/subjects/${id}/force`, { method: "DELETE" });
      if (res.ok) { showToast(`Subject "${name}" deleted`); fetchAll(); }
      else { showToast("Failed to delete subject", "error"); }
    } catch { showToast("Network error", "error"); }
  };
  const handleDeleteChapter = async (id: number, title: string) => {
    if (!window.confirm(`Force-delete chapter "${title}"? This will delete ALL related materials and live classes.`)) return;
    try {
      const res = await apiFetch(`${API}/chapters/${id}/force`, { method: "DELETE" });
      if (res.ok) {
        showToast(`Chapter "${title}" deleted`);
        setSubjectChapters({});
        setChapterMaterials({});
        setChapterLiveClasses({});
        setActiveChapterId(null);
        fetchAll();
      } else { showToast("Failed to delete chapter", "error"); }
    } catch { showToast("Network error", "error"); }
  };
  const handleDeleteMaterial = async (chapterId: number, materialId: number, title: string) => {
    if (!window.confirm(`Remove material "${title}" from this chapter?`)) return;
    try {
      const res = await apiFetch(`${API}/chapters/${chapterId}/materials/${materialId}`, { method: "DELETE" });
      if (res.ok) {
        setChapterMaterials(prev => ({ ...prev, [chapterId]: (prev[chapterId] || []).filter(m => m.id !== materialId) }));
        showToast("Material removed");
      } else { showToast("Failed to remove material", "error"); }
    } catch { showToast("Network error", "error"); }
  };

  // ── Inline edit handlers ──
  const saveSubjectEdit = async (id: number) => {
    if (!editingSubjectName.trim()) { setEditingSubjectId(null); return; }
    try {
      const res = await apiFetch(`${API}/subjects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingSubjectName.trim() }),
      });
      if (res.ok) { showToast("Subject updated"); fetchAll(); }
      else { showToast("Failed to update subject", "error"); }
    } catch { showToast("Network error", "error"); }
    finally { setEditingSubjectId(null); }
  };
  const saveChapterEdit = async (id: number) => {
    if (!editingChapterTitle.trim()) { setEditingChapterId(null); return; }
    try {
      const res = await apiFetch(`${API}/chapters/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editingChapterTitle.trim() }),
      });
      if (res.ok) {
        showToast("Chapter updated");
        setSubjectChapters({});
        fetchAll();
      } else { showToast("Failed to update chapter", "error"); }
    } catch { showToast("Network error", "error"); }
    finally { setEditingChapterId(null); }
  };
  const saveMaterialEdit = async (id: number) => {
    try {
      const res = await apiFetch(`${API}/materials/${id}/json`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editingMaterialData.title.trim(),
          description: editingMaterialData.description || null,
          youtube_url: editingMaterialData.youtube_url || null,
        }),
      });
      if (res.ok && activeChapterId) {
        showToast("Material updated");
        setEditingMaterialId(null);
        // Refresh materials for this chapter
        setChapterMaterials(prev => ({ ...prev, [activeChapterId]: undefined as unknown as Material[] }));
        setFetchingMaterialsFor(p => ({ ...p, [activeChapterId]: true }));
        apiFetch(`${API}/chapters/${activeChapterId}/materials`)
          .then(r => r.json())
          .then(data => setChapterMaterials(prev => ({ ...prev, [activeChapterId]: data })))
          .finally(() => setFetchingMaterialsFor(p => ({ ...p, [activeChapterId]: false })));
      } else { showToast("Failed to update material", "error"); }
    } catch { showToast("Network error", "error"); }
  };
  const saveLiveClassEdit = async (id: number) => {
    try {
      const res = await apiFetch(`${API}/live-classes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editingLiveClassData.title.trim(),
          meeting_url: editingLiveClassData.meeting_url.trim(),
          scheduled_at: editingLiveClassData.scheduled_at || null,
        }),
      });
      if (res.ok && activeChapterId) {
        showToast("Live class updated");
        setEditingLiveClassId(null);
        setChapterLiveClasses(prev => ({ ...prev, [activeChapterId]: undefined as unknown as LiveClass[] }));
        fetchLiveClasses(activeChapterId);
      } else { showToast("Failed to update live class", "error"); }
    } catch { showToast("Network error", "error"); }
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
          <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 0 60px rgba(0,0,0,0.08)" }}>
            {/* Decorative top gradient strip */}
            <div style={{ height: 4, background: "linear-gradient(90deg, #0ea5e9, #6366f1, #8b5cf6)", flexShrink: 0 }} />
            
            {/* Modal Header — compact Windows-style title bar */}
            <div style={{ padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", borderBottom: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: modalMode === "create" ? "linear-gradient(135deg,#0ea5e9,#3b82f6)" : "linear-gradient(135deg,#8b5cf6,#6366f1)",
                  color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0,
                }}>
                  {modalMode === "create" ? "✨" : "✏️"}
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0f172a", lineHeight: 1.2 }}>
                    {modalMode === "create" ? "Create New Course" : "Edit Course"}
                  </h2>
                  <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b" }}>Configure details, map curriculum & teachers</p>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button
                  onClick={() => setAiAgentOpen(v => !v)}
                  style={{
                    background: aiAgentOpen ? "#1e293b" : "#f8fafc",
                    color: aiAgentOpen ? "#fff" : "#475569",
                    border: "1px solid",
                    borderColor: aiAgentOpen ? "#1e293b" : "#e2e8f0",
                    padding: "7px 14px",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    transition: "all 0.2s",
                  }}
                >
                  <span style={{ fontSize: 14 }}>🤖</span>
                  {aiAgentOpen ? "AI Agent ON" : "AI Agent"}
                  <span style={{
                    width: 6, height: 6, borderRadius: 6,
                    background: aiAgentOpen ? "#22c55e" : "#cbd5e1",
                    boxShadow: aiAgentOpen ? "0 0 5px #22c55e" : "none",
                  }} />
                </button>
                <button onClick={() => { if (isInlineModal) { if (onCloseInline) onCloseInline(); } else { closeModal(); } }} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, width: 34, height: 34, color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name="x" size={16} />
                </button>
              </div>
            </div>

                        {/* Wizard Header Progress */}
            <div style={{ padding: "0 24px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", gap: 16, flexShrink: 0 }}>
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
            <div className="custom-scroll" style={{ flex: 1, minHeight: 0, padding: "24px 32px", overflow: "hidden", display: "flex", flexDirection: "column", background: "#fff", boxSizing: "border-box" }}>
               
               {/* ── STEP 1: Basic Info & SEO ── */}
               {wizardStep === 1 && (
                  <div style={{ width: "100%", flex: 1, minHeight: 0, overflowY: "auto", animation: "slideUp 0.2s ease-out" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
                      {/* Left Column */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        <SectionPanel title="General" icon="📝" accent="#0ea5e9" marginBottom={0}>
                          <FieldRow>
                            <FloatingField label="Course Title *" value={formTitle} onChange={(v: string) => { setFormTitle(v); setFormError(""); }} placeholder="e.g. The Complete Guide 2026" autoFocus />
                          </FieldRow>
                          <FieldRow>
                            <FloatingField label="Description (optional)" value={formDesc} onChange={setFormDesc} placeholder="Comprehensive course overview..." isTextArea />
                          </FieldRow>
                          <FieldRow>
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
                          </FieldRow>
                        </SectionPanel>

                        <SectionPanel title="Audience & Syllabus" icon="🎯" accent="#059669" marginBottom={0}>
                          <FieldRow>
                            <FloatingField label="Target Audience" value={formTargetAudience} onChange={setFormTargetAudience} placeholder="Who is this course intended for?" isTextArea />
                          </FieldRow>
                          <FieldRow>
                            <ImageDropzoneField label="Course Syllabus (PDF)" value={formUploadSyllabus} onChange={setFormUploadSyllabus} placeholder="Upload PDF or Paste URL..." />
                          </FieldRow>
                          <FieldRow>
                            <FloatingField label="Course Prerequisites" value={formPrerequisites} onChange={setFormPrerequisites} placeholder="What should students know before starting?" isTextArea />
                          </FieldRow>
                          <FieldRow>
                            <FloatingField label="What you will learn (1 per line)" value={formLearn} onChange={setFormLearn} placeholder="- Become proficient in...&#10;- Build multiple projects...&#10;- Master advanced concepts..." isTextArea />
                          </FieldRow>
                        </SectionPanel>
                      </div>

                      {/* Right Column */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        <SectionPanel title="Display Options" icon="🏷️" accent="#8b5cf6" marginBottom={0}>
                          <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 700, color: formIsFeatured ? "#0369a1" : "#475569", cursor: "pointer", background: formIsFeatured ? "#f0f9ff" : "#f8fafc", padding: "10px 14px", borderRadius: 6, flex: 1, border: `1.5px solid ${formIsFeatured ? "#bae6fd" : "#e2e8f0"}`, transition: "all 0.2s" }}>
                              <input type="checkbox" checked={formIsFeatured} onChange={e => setFormIsFeatured(e.target.checked)} style={{ accentColor: "#0ea5e9", width: 15, height: 15 }} />
                              🔥 Featured Course
                            </label>
                            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 700, color: formIsNew ? "#6d28d9" : "#475569", cursor: "pointer", background: formIsNew ? "#f5f3ff" : "#f8fafc", padding: "10px 14px", borderRadius: 6, flex: 1, border: `1.5px solid ${formIsNew ? "#c4b5fd" : "#e2e8f0"}`, transition: "all 0.2s" }}>
                              <input type="checkbox" checked={formIsNew} onChange={e => setFormIsNew(e.target.checked)} style={{ accentColor: "#7c3aed", width: 15, height: 15 }} />
                              ✨ Show "NEW" Badge
                            </label>
                          </div>
                          {formIsNew && (
                            <div style={{ fontSize: 11, color: "#7c3aed", fontWeight: 500, marginBottom: 16, paddingLeft: 4 }}>
                              A purple "NEW" badge will appear on this course card in the public catalog.
                            </div>
                          )}
                        </SectionPanel>

                        <SectionPanel title="Search Engine Optimization" icon="🔍" accent="#f59e0b" marginBottom={0}>
                          <FieldRow>
                            <FloatingField label="SEO Title" value={formSeoTitle} onChange={setFormSeoTitle} placeholder="Optimized Title for Google Search..." />
                          </FieldRow>
                          <FieldRow>
                            <FloatingField label="SEO Description" value={formSeoDesc} onChange={setFormSeoDesc} placeholder="Meta description to attract students in search results..." isTextArea />
                          </FieldRow>
                          <FieldRow>
                            <FloatingField label="SEO Keywords (comma separated)" value={formSeoKeywords} onChange={setFormSeoKeywords} placeholder="e.g. math, science, beginner tutorial" />
                          </FieldRow>
                        </SectionPanel>
                      </div>
                    </div>
                  </div>
               )}

               {/* ── STEP 2: Media & Pricing ── */}
               {wizardStep === 2 && (
                  <div style={{ width: "100%", flex: 1, minHeight: 0, overflowY: "auto", animation: "slideUp 0.2s ease-out" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
                      {/* Left Column */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        <SectionPanel title="Media Assets" icon="🖼️" accent="#0ea5e9" marginBottom={0}>
                          <FieldRow>
                            <ImageDropzoneField label="Course Thumbnail" value={formThumbnail} onChange={setFormThumbnail} placeholder="https://..." />
                          </FieldRow>
                          <FieldRow>
                            <FloatingField label="Promo Video URL" value={formPromo} onChange={setFormPromo} placeholder="YouTube or Vimeo standard link" />
                          </FieldRow>
                        </SectionPanel>

                        <SectionPanel title="Pricing" icon="💳" accent="#059669" marginBottom={0}>
                          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
                            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 700, color: formIsFree ? "#16a34a" : "#475569", cursor: "pointer", background: formIsFree ? "#f0fdf4" : "#f8fafc", padding: "8px 14px", borderRadius: 6, border: `1.5px solid ${formIsFree ? "#bbf7d0" : "#e2e8f0"}` }}>
                              <input type="checkbox" checked={formIsFree} onChange={e => setFormIsFree(e.target.checked)} style={{ accentColor: "#22c55e", width: 16, height: 16 }} />
                              This is a FREE course
                            </label>
                          </div>
                          {!formIsFree && (
                            <div style={{ animation: "slideUp 0.15s ease-out" }}>
                              <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8, paddingLeft: 2 }}>INR (₹)</div>
                              <FieldRow>
                                <div style={{ flex: 1 }}>
                                  <FloatingField label="Base Price (INR)" type="number" min="0" value={formPrice} onChange={(v: any) => setFormPrice(v ? Number(v) : "")} placeholder="0.00" />
                                </div>
                                <div style={{ flex: 1 }}>
                                  <FloatingField label="Discount Price (INR)" type="number" min="0" value={formDiscount} onChange={(v: any) => setFormDiscount(v ? Number(v) : "")} placeholder="Optional" />
                                </div>
                              </FieldRow>
                              <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8, paddingLeft: 2 }}>USD ($)</div>
                              <FieldRow>
                                <div style={{ flex: 1 }}>
                                  <FloatingField label="Base Price (USD)" type="number" min="0" value={formPriceUsd} onChange={(v: any) => setFormPriceUsd(v ? Number(v) : "")} placeholder="0.00" />
                                </div>
                                <div style={{ flex: 1 }}>
                                  <FloatingField label="Discount Price (USD)" type="number" min="0" value={formDiscountUsd} onChange={(v: any) => setFormDiscountUsd(v ? Number(v) : "")} placeholder="Optional" />
                                </div>
                              </FieldRow>
                              <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8, paddingLeft: 2 }}>Initial Booking</div>
                              <FieldRow>
                                <div style={{ flex: 1 }}>
                                  <FloatingField label="Min. Initial Payment (INR)" type="number" min="0" value={formMinPayValue} onChange={(v: any) => setFormMinPayValue(v ? Number(v) : "")} placeholder="Optional" />
                                </div>
                                <div style={{ flex: 1, display: "flex", alignItems: "center", background: "#f8fafc", padding: "10px 14px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 11, color: "#64748b", fontWeight: 500, lineHeight: 1.4 }}>
                                  Mandatory initial payment for installments.
                                </div>
                              </FieldRow>
                            </div>
                          )}
                        </SectionPanel>
                      </div>

                      {/* Right Column */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        <SectionPanel title="Timeline & Access" icon="⏱️" accent="#6366f1" marginBottom={0}>
                          <FieldRow>
                            <FloatingField label="Duration" type="text" value={formDurationMonths} onChange={setFormDurationMonths} placeholder="e.g. 6 Months, or Lifetime" />
                          </FieldRow>
                        </SectionPanel>

                        <SectionPanel title="Home Page Visibility" icon="🏠" accent="#f43f5e" marginBottom={0}>
                          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 8, background: formShowOnHomepage ? "#f43f5e" : "#f1f5f9", color: formShowOnHomepage ? "#fff" : "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s" }}>
                              <Icon name="monitor" size={18} />
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>Show on Home Page</div>
                              <div style={{ fontSize: 12, color: "#64748b" }}>Feature this course on the public home page.</div>
                            </div>
                            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: formShowOnHomepage ? "#e11d48" : "#475569", cursor: "pointer", background: formShowOnHomepage ? "#ffe4e6" : "#f8fafc", padding: "8px 14px", borderRadius: 6, border: `1.5px solid ${formShowOnHomepage ? "#fecdd3" : "#e2e8f0"}` }}>
                              <input type="checkbox" checked={formShowOnHomepage} onChange={e => setFormShowOnHomepage(e.target.checked)} style={{ width: 16, height: 16, accentColor: "#f43f5e" }} />
                              Active
                            </label>
                          </div>
                        </SectionPanel>

                        <SectionPanel title="Completion Certificate" icon="🏅" accent="#0ea5e9" marginBottom={0}>
                          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 8, background: formHasCertificate ? "#0ea5e9" : "#f1f5f9", color: formHasCertificate ? "#fff" : "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s" }}>
                              <Icon name="award" size={18} />
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>Course Certificate</div>
                              <div style={{ fontSize: 12, color: "#64748b" }}>Issue a certificate to students who complete all materials.</div>
                            </div>
                            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: formHasCertificate ? "#0284c7" : "#475569", cursor: "pointer", background: formHasCertificate ? "#e0f2fe" : "#f8fafc", padding: "8px 14px", borderRadius: 6, border: `1.5px solid ${formHasCertificate ? "#bae6fd" : "#e2e8f0"}` }}>
                              <input type="checkbox" checked={formHasCertificate} onChange={e => setFormHasCertificate(e.target.checked)} style={{ width: 16, height: 16, accentColor: "#0ea5e9" }} />
                              Enable
                            </label>
                          </div>
                          {formHasCertificate && (
                            <div style={{ animation: "slideUp 0.15s ease-out", borderTop: "1px solid #bae6fd", paddingTop: 16, marginBottom: 16 }}>
                              <ImageDropzoneField label="Sample Certificate Template" value={formCertificateImageUrl} onChange={setFormCertificateImageUrl} placeholder="Upload a sample certificate image..." />
                            </div>
                          )}
                        </SectionPanel>
                      </div>
                    </div>
                  </div>
               )}

               {/* ── STEP 3: Curriculum Mapping ── */}
               {wizardStep === 3 && (
                  <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, height: 0, width: "100%", overflow: "hidden", animation: "slideUp 0.2s ease-out" }}>
                    
                    {/* Bulk Delete Toolbar */}
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, padding: "8px 14px", background: bulkDeleteMode ? "#fef2f2" : "#f8fafc", border: `1px solid ${bulkDeleteMode ? "#fecaca" : "#e2e8f0"}`, borderRadius: 8 }}>
                      <button type="button" onClick={() => { setBulkDeleteMode(v => !v); setBulkSubjectIds(new Set()); setBulkChapterIds(new Set()); }} style={{ fontSize: 12, fontWeight: 700, background: bulkDeleteMode ? "#ef4444" : "#fff", color: bulkDeleteMode ? "#fff" : "#ef4444", border: `1px solid ${bulkDeleteMode ? "#ef4444" : "#fecaca"}`, padding: "6px 14px", borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                        <Icon name="trash" size={13} /> {bulkDeleteMode ? "Exit Bulk Delete" : "Bulk Delete Mode"}
                      </button>
                      {bulkDeleteMode && (
                        <>
                          <span style={{ fontSize: 12, fontWeight: 600, color: "#b91c1c" }}>
                            {bulkSubjectIds.size > 0 && `${bulkSubjectIds.size} subject${bulkSubjectIds.size !== 1 ? "s" : ""} selected`}
                            {bulkSubjectIds.size > 0 && bulkChapterIds.size > 0 && " · "}
                            {bulkChapterIds.size > 0 && `${bulkChapterIds.size} chapter${bulkChapterIds.size !== 1 ? "s" : ""} selected`}
                            {bulkSubjectIds.size === 0 && bulkChapterIds.size === 0 && "Select items below to delete"}
                          </span>
                          <div style={{ flex: 1 }} />
                          {bulkSubjectIds.size > 0 && (
                            <button type="button" disabled={deletingBulk} onClick={handleBulkDeleteSubjects} style={{ fontSize: 12, fontWeight: 700, background: deletingBulk ? "#94a3b8" : "#ef4444", color: "#fff", border: "none", padding: "6px 14px", borderRadius: 6, cursor: deletingBulk ? "not-allowed" : "pointer" }}>
                              {deletingBulk ? "Deleting..." : `Delete ${bulkSubjectIds.size} Subject${bulkSubjectIds.size !== 1 ? "s" : ""}`}
                            </button>
                          )}
                          {bulkChapterIds.size > 0 && (
                            <button type="button" disabled={deletingBulk} onClick={handleBulkDeleteChapters} style={{ fontSize: 12, fontWeight: 700, background: deletingBulk ? "#94a3b8" : "#ef4444", color: "#fff", border: "none", padding: "6px 14px", borderRadius: 6, cursor: deletingBulk ? "not-allowed" : "pointer" }}>
                              {deletingBulk ? "Deleting..." : `Delete ${bulkChapterIds.size} Chapter${bulkChapterIds.size !== 1 ? "s" : ""}`}
                            </button>
                          )}
                        </>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: 20, flex: 1, minHeight: 0, height: "auto", overflow: "hidden" }}>
                    
                    {/* Left: Available Subjects (25%) */}
                    <div style={{ width: "25%", minWidth: 240, display: "flex", flexDirection: "column", gap: 12, minHeight: 0, height: "100%", overflow: "hidden" }}>
                      <div style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "8px 14px", background: "#f8fafc",
                        border: "1px solid #e2e8f0", borderLeft: "3px solid #0ea5e9",
                        borderRadius: 6,
                      }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: "#334155" }}>Available Subjects</span>
                        {bulkDeleteMode && subjects.length > 0 && (
                          <label style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: "#ef4444", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                            <input type="checkbox" checked={bulkSubjectIds.size === subjects.length} onChange={toggleAllBulkSubjects} style={{ accentColor: "#ef4444", width: 14, height: 14 }} />
                            All
                          </label>
                        )}
                        <button type="button" title="Add Subject" onClick={() => { setAddingSubject(v => !v); setNewSubjectName(""); setNewSubjectCatId(""); setNewSubjectSubcatId(""); setNewCategoryName(""); setNewSubcategoryName(""); }} style={{ marginLeft: bulkDeleteMode && subjects.length > 0 ? 0 : "auto", width: 24, height: 24, borderRadius: 6, background: addingSubject ? "#fee2e2" : "#0ea5e9", color: addingSubject ? "#ef4444" : "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Icon name={addingSubject ? "x" : "plus"} size={13} />
                        </button>
                      </div>
                      {addingSubject && (
                        <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10, flexShrink: 0 }}>
                          <select value={newSubjectCatId} onChange={e => { const v = e.target.value; setNewSubjectCatId(v === "new" ? "new" : v ? Number(v) : ""); setNewSubjectSubcatId(""); }} style={{ padding: "7px 10px", borderRadius: 6, border: "1px solid #bae6fd", fontSize: 12, fontWeight: 600, color: "#334155", background: "#fff", outline: "none" }}>
                            <option value="">Select Category *</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            <option value="new">+ Create New Category</option>
                          </select>
                          {newSubjectCatId === "new" && (
                            <input type="text" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="New category name *" style={{ padding: "7px 10px", borderRadius: 6, border: "1px solid #bae6fd", fontSize: 12, fontWeight: 600, color: "#334155", outline: "none" }} />
                          )}
                          <select value={newSubjectSubcatId} onChange={e => { const v = e.target.value; setNewSubjectSubcatId(v === "new" ? "new" : v ? Number(v) : ""); }} disabled={newSubjectCatId === ""} style={{ padding: "7px 10px", borderRadius: 6, border: "1px solid #bae6fd", fontSize: 12, fontWeight: 600, color: newSubjectCatId === "" ? "#94a3b8" : "#334155", background: newSubjectCatId === "" ? "#f8fafc" : "#fff", outline: "none", cursor: newSubjectCatId === "" ? "not-allowed" : "pointer" }}>
                            <option value="">Select Subcategory *</option>
                            {typeof newSubjectCatId === "number" && subcategories.filter(sc => sc.category_id === newSubjectCatId).map(sc => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
                            {newSubjectCatId !== "" && <option value="new">+ Create New Subcategory</option>}
                          </select>
                          {newSubjectSubcatId === "new" && (
                            <input type="text" value={newSubcategoryName} onChange={e => setNewSubcategoryName(e.target.value)} placeholder="New subcategory name *" style={{ padding: "7px 10px", borderRadius: 6, border: "1px solid #bae6fd", fontSize: 12, fontWeight: 600, color: "#334155", outline: "none" }} />
                          )}
                          <input type="text" value={newSubjectName} onChange={e => setNewSubjectName(e.target.value)} placeholder="Subject name *" onKeyDown={e => { if (e.key === "Enter") handleAddSubject(); }} style={{ padding: "7px 10px", borderRadius: 6, border: "1px solid #bae6fd", fontSize: 12, fontWeight: 600, color: "#334155", outline: "none" }} />
                          <button type="button" disabled={savingSubject || !newSubjectName.trim() || newSubjectCatId === "" || (newSubjectCatId === "new" && !newCategoryName.trim()) || newSubjectSubcatId === "" || (newSubjectSubcatId === "new" && !newSubcategoryName.trim())} onClick={handleAddSubject} style={{ padding: "7px 12px", borderRadius: 6, border: "none", background: savingSubject || !newSubjectName.trim() || newSubjectCatId === "" || (newSubjectCatId === "new" && !newCategoryName.trim()) || newSubjectSubcatId === "" || (newSubjectSubcatId === "new" && !newSubcategoryName.trim()) ? "#94a3b8" : "#0ea5e9", color: "#fff", fontSize: 12, fontWeight: 700, cursor: savingSubject ? "not-allowed" : "pointer" }}>
                            {savingSubject ? "Adding..." : "Add Subject"}
                          </button>
                        </div>
                      )}
                      <div className="custom-scroll" style={{ flex: 1, minHeight: 0, overflowY: "auto", paddingRight: 6, paddingBottom: 20, overscrollBehavior: "contain" }}>
                        {Object.entries(groupedSubjects).map(([group, subs]) => (
                          <div key={group} style={{ marginBottom: 20 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                               <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "1px" }}>{group}</div>
                               <div style={{ height: 1, flex: 1, background: "#e2e8f0" }}></div>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                              {subs.map(s => {
                                const isSelected = formSubjectIds.includes(s.id);
                                const isBulkChecked = bulkSubjectIds.has(s.id);
                                const isEditing = editingSubjectId === s.id;
                                return (
                                  <div key={s.id} onClick={() => bulkDeleteMode ? toggleBulkSubject(s.id) : toggleSubject(s.id)} style={{ padding: "12px 16px", borderRadius: 8, border: `2px solid ${bulkDeleteMode && isBulkChecked ? "#ef4444" : isSelected ? "#0ea5e9" : "#e2e8f0"}`, background: bulkDeleteMode && isBulkChecked ? "#fef2f2" : isSelected ? "#f0f9ff" : "#fff", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", transition: "all 0.15s", boxShadow: isSelected ? "0 4px 8px rgba(14,165,233,0.1)" : "none", transform: isSelected ? "translateY(-1px)" : "none" }}>
                                     <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
                                        {bulkDeleteMode ? (
                                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 18, height: 18, borderRadius: 5, border: `2px solid ${isBulkChecked ? "#ef4444" : "#cbd5e1"}`, background: isBulkChecked ? "#ef4444" : "#fff", color: "#fff", flexShrink: 0 }}>
                                            {isBulkChecked && <Icon name="check" size={11} />}
                                          </div>
                                        ) : (
                                          <div style={{ width: 28, height: 28, borderRadius: 6, background: isSelected ? "#0ea5e9" : "#f1f5f9", color: isSelected ? "#fff" : "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s", flexShrink: 0 }}>
                                            <Icon name={isSelected ? "check" : "folder"} size={14} />
                                          </div>
                                        )}
                                        {isEditing ? (
                                          <input autoFocus type="text" value={editingSubjectName} onChange={e => setEditingSubjectName(e.target.value)} onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === "Enter") saveSubjectEdit(s.id); if (e.key === "Escape") setEditingSubjectId(null); }} onBlur={() => saveSubjectEdit(s.id)} style={{ fontSize: 13, fontWeight: 700, padding: "4px 8px", border: "1px solid #0ea5e9", borderRadius: 4, outline: "none", flex: 1, minWidth: 0 }} />
                                        ) : (
                                          <span style={{ fontSize: 13, fontWeight: 700, color: isSelected ? "#0f172a" : "#475569", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.name}</span>
                                        )}
                                     </div>
                                     {!bulkDeleteMode && !isEditing && (
                                       <div style={{ display: "flex", gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                                         <button type="button" onClick={() => { setEditingSubjectId(s.id); setEditingSubjectName(s.name); }} title="Edit" style={{ border: "none", background: "transparent", color: "#94a3b8", cursor: "pointer", padding: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                           <Icon name="edit" size={12} />
                                         </button>
                                         <button type="button" onClick={() => handleDeleteSubject(s.id, s.name)} title="Force delete" style={{ border: "none", background: "transparent", color: "#ef4444", cursor: "pointer", padding: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                           <Icon name="trash" size={12} />
                                         </button>
                                       </div>
                                     )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Middle: Map Chapters Content (25%) */}
                    <div className="custom-scroll" style={{ width: "25%", minWidth: 240, display: "flex", flexDirection: "column", gap: 12, minHeight: 0, flex: "0 0 25%", height: "100%", overflowY: "auto", overflowX: "hidden", paddingRight: 6, overscrollBehavior: "contain" }}>
                       <div style={{
                         display: "flex", alignItems: "center", gap: 8,
                         padding: "8px 14px", background: "#f8fafc",
                         border: "1px solid #e2e8f0", borderLeft: "3px solid #6366f1",
                         borderRadius: 6,
                       }}>
                         <span style={{ fontSize: 13, fontWeight: 800, color: "#334155" }}>Map Chapters</span>
                         <button type="button" title="Add Chapter" onClick={() => { setAddingChapter(v => !v); setNewChapterTitle(""); setNewChapterSubId(""); }} style={{ marginLeft: "auto", width: 24, height: 24, borderRadius: 6, background: addingChapter ? "#fee2e2" : "#6366f1", color: addingChapter ? "#ef4444" : "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                           <Icon name={addingChapter ? "x" : "plus"} size={13} />
                         </button>
                       </div>
                       {addingChapter && (
                         <div style={{ background: "#eef2ff", border: "1px solid #c7d2fe", borderRadius: 8, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10, flexShrink: 0 }}>
                           <select value={newChapterSubId} onChange={e => setNewChapterSubId(e.target.value ? Number(e.target.value) : "")} style={{ padding: "7px 10px", borderRadius: 6, border: "1px solid #c7d2fe", fontSize: 12, fontWeight: 600, color: "#334155", background: "#fff", outline: "none" }}>
                             <option value="">Select Subject *</option>
                             {formSubjectIds.map(id => { const s = subjects.find(x => x.id === id); return s ? <option key={id} value={id}>{s.name}</option> : null; })}
                           </select>
                           <input type="text" value={newChapterTitle} onChange={e => setNewChapterTitle(e.target.value)} placeholder="Chapter title *" onKeyDown={e => { if (e.key === "Enter") handleAddChapter(); }} style={{ padding: "7px 10px", borderRadius: 6, border: "1px solid #c7d2fe", fontSize: 12, fontWeight: 600, color: "#334155", outline: "none" }} />
                           <button type="button" disabled={savingChapter || !newChapterTitle.trim() || !newChapterSubId} onClick={handleAddChapter} style={{ padding: "7px 12px", borderRadius: 6, border: "none", background: savingChapter || !newChapterTitle.trim() || !newChapterSubId ? "#94a3b8" : "#6366f1", color: "#fff", fontSize: 12, fontWeight: 700, cursor: savingChapter ? "not-allowed" : "pointer" }}>
                             {savingChapter ? "Adding..." : "Add Chapter"}
                           </button>
                         </div>
                       )}
                       {formSubjectIds.length === 0 ? (
                          <div style={{ flex: 1, border: "2px dashed #cbd5e1", borderRadius: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#f8fafc", textAlign: "center", padding: 24 }}>
                             <div style={{ color: "#0ea5e9", marginBottom: 12, opacity: 0.2 }}><Icon name="layers" size={48} /></div>
                             <h4 style={{ margin: "0 0 6px 0", fontSize: 15, fontWeight: 800, color: "#0f172a" }}>No Subjects</h4>
                             <p style={{ color: "#64748b", fontSize: 12, margin: 0, maxWidth: 240, lineHeight: 1.5 }}>Select a subject on the left to reveal related chapters.</p>
                          </div>
                       ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: 20 }}>
                             {formSubjectIds.map(subId => {
                                const sub = subjects.find(s => s.id === subId);
                                const chapters = subjectChapters[subId];
                                const loading = fetchingChaptersFor[subId];
                                
                                return (
                                   <div key={subId} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden", animation: "slideUp 0.3s ease-out" }}>
                                      <div style={{ background: "#f8fafc", padding: "10px 14px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                         <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            <div style={{ width: 22, height: 22, borderRadius: 6, background: "#0ea5e9", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="book" size={11} /></div>
                                            <span style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>{sub?.name}</span>
                                         </div>
                                         {!bulkDeleteMode && !loading && chapters && chapters.length > 0 && (
                                            <div style={{ display: "flex", gap: 6 }}>
                                               <button onClick={() => selectAllChaptersForSubject(subId)} type="button" style={{ fontSize: 11, cursor: "pointer", border: "none", background: "#e0f2fe", padding: "4px 10px", borderRadius: 6, color: "#0284c7", fontWeight: 700, transition: "background 0.2s" }}>All</button>
                                               <button onClick={() => deselectAllChaptersForSubject(subId)} type="button" style={{ fontSize: 11, cursor: "pointer", border: "none", background: "#fee2e2", padding: "4px 10px", borderRadius: 6, color: "#ef4444", fontWeight: 700, transition: "background 0.2s" }}>Clr</button>
                                            </div>
                                         )}
                                      </div>
                                      <div style={{ padding: 12 }}>
                                         {loading ? (
                                            <div className="skeleton sk-p" style={{ width: "60%" }}></div>
                                         ) : !chapters || chapters.filter(c => c.is_active).length === 0 ? (
                                            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fef2f2", padding: "10px 12px", borderRadius: 6, color: "#b91c1c" }}>
                                              <Icon name="alert-circle" size={14} />
                                              <p style={{ fontSize: 12, fontWeight: 600, margin: 0 }}>No chapters found.</p>
                                            </div>
                                         ) : (
                                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                               {chapters.filter(c => c.is_active).map(c => {
                                                  const isChecked = formChapterIds.includes(c.id);
                                                  const isActive = activeChapterId === c.id;
                                                  const isBulkChecked = bulkChapterIds.has(c.id);
                                                  const isEditing = editingChapterId === c.id;
                                                  return (
                                                     <div key={c.id} onClick={() => bulkDeleteMode ? toggleBulkChapter(c.id) : selectActiveChapter(c.id)} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", background: bulkDeleteMode && isBulkChecked ? "#fef2f2" : isActive ? "#e0f2fe" : isChecked ? "#f0fdf4" : "#f8fafc", padding: "10px 12px", borderRadius: 6, border: `1.5px solid ${bulkDeleteMode && isBulkChecked ? "#ef4444" : isActive ? "#38bdf8" : isChecked ? "#22c55e" : "#f1f5f9"}`, transition: "all 0.15s", userSelect: "none" }}>
                                                        {bulkDeleteMode ? (
                                                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 18, height: 18, borderRadius: 5, border: `2px solid ${isBulkChecked ? "#ef4444" : "#cbd5e1"}`, background: isBulkChecked ? "#ef4444" : "#fff", color: "#fff", flexShrink: 0 }}>
                                                            {isBulkChecked && <Icon name="check" size={11} />}
                                                          </div>
                                                        ) : (
                                                        <div onClick={(e) => { e.stopPropagation(); toggleChapter(c.id); }} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 18, height: 18, borderRadius: 5, border: `2px solid ${isChecked ? "#22c55e" : "#cbd5e1"}`, background: isChecked ? "#22c55e" : "#fff", color: "#fff", transition: "all 0.15s", flexShrink: 0, cursor: "pointer" }}>
                                                           {isChecked && <Icon name="check" size={11} />}
                                                        </div>
                                                        )}
                                                        {isEditing ? (
                                                          <input autoFocus type="text" value={editingChapterTitle} onChange={e => setEditingChapterTitle(e.target.value)} onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === "Enter") saveChapterEdit(c.id); if (e.key === "Escape") setEditingChapterId(null); }} onBlur={() => saveChapterEdit(c.id)} style={{ fontSize: 13, fontWeight: 700, padding: "4px 8px", border: "1px solid #6366f1", borderRadius: 4, outline: "none", flex: 1, minWidth: 0 }} />
                                                        ) : (
                                                          <span style={{ fontSize: 13, fontWeight: isChecked || isActive ? 700 : 600, color: isActive ? "#0369a1" : isChecked ? "#15803d" : "#475569", flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.title}</span>
                                                        )}
                                                        {!bulkDeleteMode && !isEditing && (
                                                          <div style={{ display: "flex", gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                                                            <button type="button" onClick={() => { setEditingChapterId(c.id); setEditingChapterTitle(c.title); }} title="Edit" style={{ border: "none", background: "transparent", color: "#94a3b8", cursor: "pointer", padding: 2, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                              <Icon name="edit" size={11} />
                                                            </button>
                                                            <button type="button" onClick={() => handleDeleteChapter(c.id, c.title)} title="Force delete" style={{ border: "none", background: "transparent", color: "#ef4444", cursor: "pointer", padding: 2, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                              <Icon name="trash" size={11} />
                                                            </button>
                                                          </div>
                                                        )}
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
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12, minHeight: 0, height: "100%", overflow: "hidden" }}>
                       <div style={{
                         display: "flex", alignItems: "center", gap: 8,
                         padding: "8px 14px", background: "#f8fafc",
                         border: "1px solid #e2e8f0", borderLeft: "3px solid #059669",
                         borderRadius: 6,
                       }}>
                         <span style={{ fontSize: 13, fontWeight: 800, color: "#334155" }}>Chapter Details</span>
                         <button type="button" title={activeChapterId ? "Add Material" : "Select a chapter first"} disabled={!activeChapterId} onClick={() => { setAddingMaterial(v => !v); setNewMaterialForm({ title: "", description: "", youtube_url: "" }); }} style={{ marginLeft: "auto", width: 24, height: 24, borderRadius: 6, background: addingMaterial ? "#fee2e2" : "#059669", color: addingMaterial ? "#ef4444" : "#fff", border: "none", cursor: activeChapterId ? "pointer" : "not-allowed", opacity: activeChapterId ? 1 : 0.4, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                           <Icon name={addingMaterial ? "x" : "plus"} size={13} />
                         </button>
                       </div>
                       {addingMaterial && activeChapterId && (
                         <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10, flexShrink: 0 }}>
                           <div style={{ display: "flex", gap: 6 }}>
                             {([["youtube", "YouTube Link"], ["upload", "File Upload (R2)"], ["library", "From Library"]] as const).map(([m, label]) => (
                               <button key={m} type="button" onClick={() => setMaterialMode(m)} style={{ flex: 1, padding: "6px 6px", borderRadius: 6, border: "1px solid", borderColor: materialMode === m ? "#059669" : "#bbf7d0", background: materialMode === m ? "#059669" : "#fff", color: materialMode === m ? "#fff" : "#059669", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                                 {label}
                               </button>
                             ))}
                           </div>

                           {materialMode === "youtube" && (
                             <>
                               <input type="text" value={newMaterialForm.title} onChange={e => setNewMaterialForm(p => ({ ...p, title: e.target.value }))} placeholder="Material title *" style={{ padding: "7px 10px", borderRadius: 6, border: "1px solid #bbf7d0", fontSize: 12, fontWeight: 600, color: "#334155", outline: "none" }} />
                               <textarea value={newMaterialForm.description} onChange={e => setNewMaterialForm(p => ({ ...p, description: e.target.value }))} placeholder="Description (optional)" rows={2} style={{ padding: "7px 10px", borderRadius: 6, border: "1px solid #bbf7d0", fontSize: 12, fontWeight: 600, color: "#334155", outline: "none", resize: "vertical", fontFamily: "inherit" }} />
                               <input type="text" value={newMaterialForm.youtube_url} onChange={e => setNewMaterialForm(p => ({ ...p, youtube_url: e.target.value }))} placeholder="YouTube URL *" onKeyDown={e => { if (e.key === "Enter") handleAddMaterial(); }} style={{ padding: "7px 10px", borderRadius: 6, border: "1px solid #bbf7d0", fontSize: 12, fontWeight: 600, color: "#334155", outline: "none" }} />
                               <button type="button" disabled={savingMaterial || !newMaterialForm.title.trim()} onClick={handleAddMaterial} style={{ padding: "7px 12px", borderRadius: 6, border: "none", background: savingMaterial || !newMaterialForm.title.trim() ? "#94a3b8" : "#059669", color: "#fff", fontSize: 12, fontWeight: 700, cursor: savingMaterial ? "not-allowed" : "pointer" }}>
                                 {savingMaterial ? "Adding..." : "Add Material"}
                               </button>
                             </>
                           )}

                           {materialMode === "upload" && (
                             <button type="button" onClick={() => setUploadModalOpen(true)} style={{ padding: "10px 12px", borderRadius: 8, border: "1.5px dashed #059669", background: "#fff", color: "#059669", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                               <Icon name="play-circle" size={15} /> Upload Video / PDF / Image to R2
                             </button>
                           )}

                           {materialMode === "library" && (
                             <>
                               <div style={{ position: "relative" }}>
                                 <input type="text" value={librarySearch} onChange={e => setLibrarySearch(e.target.value)} placeholder="Search course materials..." style={{ width: "100%", padding: "7px 10px 7px 30px", borderRadius: 6, border: "1px solid #bbf7d0", fontSize: 12, fontWeight: 600, color: "#334155", outline: "none", boxSizing: "border-box" }} />
                                 <span style={{ position: "absolute", left: 9, top: 8, color: "#94a3b8" }}><Icon name="search" size={14} /></span>
                               </div>
                               <div className="custom-scroll" style={{ maxHeight: 220, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
                                 {libraryLoading ? (
                                   <p style={{ fontSize: 12, color: "#64748b", margin: "6px 2px" }}>Searching...</p>
                                 ) : libraryResults.filter(m => !(chapterMaterials[activeChapterId] || []).some(cm => cm.id === m.id)).length === 0 ? (
                                   <p style={{ fontSize: 12, color: "#64748b", margin: "6px 2px" }}>No materials found.</p>
                                 ) : libraryResults.filter(m => !(chapterMaterials[activeChapterId] || []).some(cm => cm.id === m.id)).slice(0, 15).map(m => {
                                   const tc = getTypeConfig(m.file_type || "document");
                                   return (
                                     <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 6, border: "1px solid #bbf7d0", background: "#fff" }}>
                                       <span style={{ background: tc.bg, color: tc.color, fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 4, flexShrink: 0 }}>{tc.label}</span>
                                       <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: "#334155", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={m.title}>{m.title}</span>
                                       <button type="button" disabled={linkingMaterialId === m.id} onClick={() => handleLinkMaterial(m.id)} style={{ padding: "4px 10px", borderRadius: 5, border: "none", background: linkingMaterialId === m.id ? "#94a3b8" : "#059669", color: "#fff", fontSize: 11, fontWeight: 700, cursor: linkingMaterialId === m.id ? "not-allowed" : "pointer", flexShrink: 0 }}>
                                         {linkingMaterialId === m.id ? "..." : "Add"}
                                       </button>
                                     </div>
                                   );
                                 })}
                               </div>
                             </>
                           )}
                         </div>
                       )}
                       {!activeChapterId ? (
                          <div style={{ flex: 1, border: "2px dashed #cbd5e1", borderRadius: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#f8fafc", textAlign: "center", padding: 32 }}>
                             <div style={{ color: "#0ea5e9", marginBottom: 16, opacity: 0.2 }}><Icon name="file-text" size={56} /></div>
                             <h4 style={{ margin: "0 0 8px 0", fontSize: 16, fontWeight: 800, color: "#0f172a" }}>No Chapter Selected</h4>
                             <p style={{ color: "#64748b", fontSize: 13, margin: 0, maxWidth: 300, lineHeight: 1.5 }}>Click on any chapter from the middle column to reveal its uploaded materials here.</p>
                          </div>
                       ) : (
                          <div className="custom-scroll" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 12, overflowY: "auto", paddingRight: 6, paddingBottom: 20 }}>
                             {fetchingMaterialsFor[activeChapterId] ? (
                                <>
                                  <div className="skeleton sk-p" style={{ height: 50, borderRadius: 8 }}></div>
                                  <div className="skeleton sk-p" style={{ height: 50, borderRadius: 8 }}></div>
                                  <div className="skeleton sk-p" style={{ height: 50, borderRadius: 8 }}></div>
                                </>
                             ) : !chapterMaterials[activeChapterId] || chapterMaterials[activeChapterId].length === 0 ? (
                                <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#fef2f2", padding: "12px 16px", borderRadius: 8, color: "#b91c1c" }}>
                                  <Icon name="alert-circle" size={18} />
                                  <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>This chapter has no uploaded materials yet.</p>
                                </div>
                             ) : (
                                chapterMaterials[activeChapterId].map(mat => {
                                   const isVideo = mat.file_type === 'video' || mat.file_type === 'youtube';
                                   const isEditing = editingMaterialId === mat.id;
                                   return (
                                   <div key={mat.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, background: "#fff", border: "1px solid #e2e8f0", padding: "12px 16px", borderRadius: 8, animation: "slideUp 0.15s ease-out" }}>
                                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 8, background: isVideo ? "#fee2e2" : "#f1f5f9", color: isVideo ? "#ef4444" : "#64748b", flexShrink: 0 }}>
                                         <Icon name={isVideo ? 'video' : mat.file_type === 'pdf' ? 'file-text' : 'file'} size={18} />
                                      </div>
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                         {isEditing ? (
                                           <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                             <input autoFocus type="text" value={editingMaterialData.title} onChange={e => setEditingMaterialData(p => ({ ...p, title: e.target.value }))} placeholder="Title" style={{ fontSize: 13, fontWeight: 700, padding: "6px 10px", border: "1px solid #059669", borderRadius: 4, outline: "none" }} />
                                             <input type="text" value={editingMaterialData.description} onChange={e => setEditingMaterialData(p => ({ ...p, description: e.target.value }))} placeholder="Description" style={{ fontSize: 12, padding: "6px 10px", border: "1px solid #e2e8f0", borderRadius: 4, outline: "none" }} />
                                             <input type="text" value={editingMaterialData.youtube_url} onChange={e => setEditingMaterialData(p => ({ ...p, youtube_url: e.target.value }))} placeholder="YouTube URL" style={{ fontSize: 12, padding: "6px 10px", border: "1px solid #e2e8f0", borderRadius: 4, outline: "none" }} />
                                             <div style={{ display: "flex", gap: 6 }}>
                                               <button type="button" onClick={() => saveMaterialEdit(mat.id)} style={{ background: "#059669", color: "#fff", border: "none", padding: "4px 12px", borderRadius: 4, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Save</button>
                                               <button type="button" onClick={() => setEditingMaterialId(null)} style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0", padding: "4px 12px", borderRadius: 4, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
                                             </div>
                                           </div>
                                         ) : (
                                           <>
                                             <h4 style={{ margin: "0 0 4px 0", fontSize: 13, fontWeight: 800, color: "#0f172a" }}>{mat.title}</h4>
                                             {mat.description && <p style={{ margin: "0 0 4px 0", fontSize: 11, color: "#64748b" }}>{mat.description}</p>}
                                             <span style={{ fontSize: 10, fontWeight: 800, color: "#64748b", textTransform: "uppercase", background: "#f1f5f9", padding: "3px 8px", borderRadius: 4, letterSpacing: "0.5px" }}>{mat.file_type || "document"}</span>
                                           </>
                                         )}
                                      </div>
                                      {!isEditing && (
                                        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                                          <button onClick={() => setPreviewMaterial(mat)} type="button" style={{ border: "1px solid #e2e8f0", background: "#f8fafc", color: "#0ea5e9", fontWeight: 700, fontSize: 12, display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 6, transition: "background 0.2s", cursor: "pointer" }} onMouseEnter={e=>e.currentTarget.style.background="#f0f9ff"} onMouseLeave={e=>e.currentTarget.style.background="#f8fafc"}>
                                            <Icon name="play-circle" size={12} /> View
                                          </button>
                                          <button type="button" onClick={() => { setEditingMaterialId(mat.id); setEditingMaterialData({ title: mat.title, description: mat.description || "", youtube_url: mat.youtube_url || "" }); }} title="Edit" style={{ border: "1px solid #e2e8f0", background: "#f8fafc", color: "#475569", fontWeight: 700, fontSize: 12, display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 6, cursor: "pointer" }}>
                                            <Icon name="edit" size={12} />
                                          </button>
                                          <button type="button" onClick={() => handleDeleteMaterial(activeChapterId, mat.id, mat.title)} title="Remove from chapter" style={{ border: "1px solid #fecaca", background: "#fef2f2", color: "#ef4444", fontWeight: 700, fontSize: 12, display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 6, cursor: "pointer" }}>
                                            <Icon name="trash" size={12} />
                                          </button>
                                        </div>
                                      )}
                                   </div>
                                )})
                             )}
                          </div>
                       )}

                             {/* Live Class Section */}
                             <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 16, marginTop: 4, flexShrink: 0, maxHeight: 300, overflowY: "auto" }} className="custom-scroll">
                               <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                                 <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                   <div style={{ width: 28, height: 28, borderRadius: 6, background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                     <Icon name="video" size={14} />
                                   </div>
                                   <span style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>Live Classes</span>
                                 </div>
                                 <button type="button" onClick={() => setAddingLiveClass(v => !v)} style={{ fontSize: 12, fontWeight: 700, background: addingLiveClass ? "#fee2e2" : "#f0f9ff", color: addingLiveClass ? "#ef4444" : "#0ea5e9", border: `1px solid ${addingLiveClass ? "#fecaca" : "#bae6fd"}`, padding: "6px 12px", borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                                   <Icon name={addingLiveClass ? "x" : "plus"} size={12} />
                                   {addingLiveClass ? "Cancel" : "Add Live Class"}
                                 </button>
                               </div>

                               {addingLiveClass && (
                                 <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, padding: "14px 16px", marginBottom: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                                   <div>
                                     <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", marginBottom: 4 }}>Title</label>
                                     <input type="text" value={liveClassForm.title} onChange={e => setLiveClassForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Chapter 1 Live Session" style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #bae6fd", fontSize: 13, outline: "none", boxSizing: "border-box", background: "#fff" }} />
                                   </div>
                                   <div>
                                     <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", marginBottom: 4 }}>Meeting URL</label>
                                     <input type="url" value={liveClassForm.meeting_url} onChange={e => setLiveClassForm(p => ({ ...p, meeting_url: e.target.value }))} placeholder="https://meet.google.com/... or Zoom link" style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #bae6fd", fontSize: 13, outline: "none", boxSizing: "border-box", background: "#fff" }} />
                                   </div>
                                   <div>
                                     <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", marginBottom: 4 }}>Scheduled Date & Time</label>
                                     <input type="datetime-local" value={liveClassForm.scheduled_at} onChange={e => setLiveClassForm(p => ({ ...p, scheduled_at: e.target.value }))} style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #bae6fd", fontSize: 13, outline: "none", boxSizing: "border-box", background: "#fff" }} />
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
                                   }} style={{ background: savingLiveClass ? "#94a3b8" : "#0ea5e9", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: savingLiveClass ? "not-allowed" : "pointer", alignSelf: "flex-end" }}>
                                     {savingLiveClass ? "Adding..." : "Add Live Class"}
                                   </button>
                                 </div>
                               )}

                               {fetchingLiveClassesFor[activeChapterId!] ? (
                                 <div className="skeleton sk-p" style={{ height: 40, borderRadius: 8 }}></div>
                               ) : !chapterLiveClasses[activeChapterId!] || chapterLiveClasses[activeChapterId!].length === 0 ? (
                                 <div style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic", padding: "6px 0" }}>No live classes scheduled yet.</div>
                               ) : (
                                 chapterLiveClasses[activeChapterId!].map(lc => {
                                   const isEditingLc = editingLiveClassId === lc.id;
                                   return (
                                   <div key={lc.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "12px 14px", borderRadius: 8, marginBottom: 8, animation: "slideUp 0.15s ease-out" }}>
                                     <div style={{ flex: 1, minWidth: 0 }}>
                                       {isEditingLc ? (
                                         <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                           <input autoFocus type="text" value={editingLiveClassData.title} onChange={e => setEditingLiveClassData(p => ({ ...p, title: e.target.value }))} placeholder="Title" style={{ fontSize: 13, fontWeight: 700, padding: "6px 10px", border: "1px solid #22c55e", borderRadius: 4, outline: "none" }} />
                                           <input type="url" value={editingLiveClassData.meeting_url} onChange={e => setEditingLiveClassData(p => ({ ...p, meeting_url: e.target.value }))} placeholder="Meeting URL" style={{ fontSize: 12, padding: "6px 10px", border: "1px solid #e2e8f0", borderRadius: 4, outline: "none" }} />
                                           <input type="datetime-local" value={editingLiveClassData.scheduled_at} onChange={e => setEditingLiveClassData(p => ({ ...p, scheduled_at: e.target.value }))} style={{ fontSize: 12, padding: "6px 10px", border: "1px solid #e2e8f0", borderRadius: 4, outline: "none" }} />
                                           <div style={{ display: "flex", gap: 6 }}>
                                             <button type="button" onClick={() => saveLiveClassEdit(lc.id)} style={{ background: "#22c55e", color: "#fff", border: "none", padding: "4px 12px", borderRadius: 4, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Save</button>
                                             <button type="button" onClick={() => setEditingLiveClassId(null)} style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0", padding: "4px 12px", borderRadius: 4, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
                                           </div>
                                         </div>
                                       ) : (
                                         <>
                                           <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", marginBottom: 3 }}>{lc.title}</div>
                                           {lc.scheduled_at && (
                                             <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, marginBottom: 3 }}>
                                               {new Date(lc.scheduled_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                                             </div>
                                           )}
                                           <a href={lc.meeting_url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#0ea5e9", fontWeight: 700, textDecoration: "none", wordBreak: "break-all" }}>{lc.meeting_url}</a>
                                         </>
                                       )}
                                     </div>
                                     {!isEditingLc && (
                                       <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                                         <button type="button" onClick={() => { setEditingLiveClassId(lc.id); setEditingLiveClassData({ title: lc.title, meeting_url: lc.meeting_url, scheduled_at: lc.scheduled_at ? new Date(lc.scheduled_at).toISOString().slice(0, 16) : "" }); }} title="Edit" style={{ background: "#fff", color: "#475569", border: "1px solid #bbf7d0", width: 28, height: 28, borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                           <Icon name="edit" size={12} />
                                         </button>
                                         <button type="button" onClick={async () => {
                                           if (!window.confirm("Delete this live class?")) return;
                                           const res = await apiFetch(`${API}/live-classes/${lc.id}`, { method: "DELETE" });
                                           if (res.ok && activeChapterId) {
                                             setChapterLiveClasses(p => ({ ...p, [activeChapterId]: p[activeChapterId].filter(x => x.id !== lc.id) }));
                                             showToast("Deleted", "success");
                                           }
                                         }} style={{ background: "#fee2e2", color: "#ef4444", border: "none", width: 28, height: 28, borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                           <Icon name="trash" size={13} />
                                         </button>
                                       </div>
                                     )}
                                   </div>
                                  );
                                 })
                               )}
                             </div>

                    </div>
                    </div>
                  </div>
               )}
            
               {/* ── STEP 4: Teachers ── */}
               {wizardStep === 4 && (
                 <div style={{ width: "100%", flex: 1, minHeight: 0, overflowY: "auto", animation: "slideUp 0.2s ease-out" }}>
                   <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                     <div style={{
                       display: "flex", alignItems: "center", gap: 8,
                       padding: "8px 14px", background: "#f8fafc",
                       border: "1px solid #e2e8f0", borderLeft: "3px solid #0ea5e9",
                       borderRadius: 6, flex: 1,
                     }}>
                       <span style={{ fontSize: 13, fontWeight: 800, color: "#334155" }}>Assign Teachers</span>
                       <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500, marginLeft: 4 }}>— Select instructors for this course</span>
                     </div>
                     <button type="button" onClick={() => setShowAddInstructorModal(true)} style={{ background: "#f0f9ff", color: "#0ea5e9", border: "1px solid #bae6fd", padding: "8px 14px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, marginLeft: 12, whiteSpace: "nowrap" }}>
                       <Icon name="plus" size={14} /> Add New Teacher
                     </button>
                   </div>

                   <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
                     {/* Left Column */}
                     <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                       <SectionPanel title="Public Visibility" icon="👁️" accent="#059669" marginBottom={0}>
                         <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                           <div>
                             <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>Show on public page</div>
                             <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Display assigned teachers publicly</div>
                           </div>
                           <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 700, color: formShowInstructorPublicly ? "#15803d" : "#475569", cursor: "pointer", background: formShowInstructorPublicly ? "#f0fdf4" : "#f8fafc", padding: "8px 14px", borderRadius: 6, border: `1.5px solid ${formShowInstructorPublicly ? "#bbf7d0" : "#e2e8f0"}` }}>
                              <input type="checkbox" checked={formShowInstructorPublicly} onChange={e => setFormShowInstructorPublicly(e.target.checked)} style={{ width: 16, height: 16, accentColor: "#22c55e" }} />
                              {formShowInstructorPublicly ? "Visible" : "Hidden"}
                           </label>
                         </div>
                       </SectionPanel>

                       {formInstructorIds.length > 0 && (
                         <div style={{ padding: "10px 16px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 6, display: "flex", alignItems: "center", gap: 10 }}>
                           <Icon name="check" size={14} />
                           <span style={{ fontSize: 12, fontWeight: 700, color: "#15803d" }}>{formInstructorIds.length} teacher{formInstructorIds.length !== 1 ? "s" : ""} assigned</span>
                         </div>
                       )}
                     </div>

                     {/* Right Column */}
                     <div>
                       <SectionPanel title="Instructors" icon="👥" accent="#0ea5e9" marginBottom={0}>
                         {allInstructors.length === 0 ? (
                           <div style={{ padding: 24, textAlign: "center", background: "#f8fafc", border: "2px dashed #e2e8f0", borderRadius: 8, marginBottom: 16 }}>
                             <div style={{ color: "#94a3b8", marginBottom: 8 }}><Icon name="users" size={36} /></div>
                             <h4 style={{ margin: "0 0 4px 0", fontSize: 13, fontWeight: 700, color: "#0f172a" }}>No Teachers Found</h4>
                             <p style={{ margin: 0, fontSize: 11, color: "#64748b" }}>Click "Add New Teacher" to create one.</p>
                           </div>
                         ) : (
                           <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                             {allInstructors.map(inst => {
                               const isSelected = formInstructorIds.includes(inst.id);
                               return (
                                 <div
                                   key={inst.id}
                                   onClick={() => {
                                     setFormInstructorIds(prev => prev.includes(inst.id) ? prev.filter(id => id !== inst.id) : [...prev, inst.id]);
                                   }}
                                   style={{
                                     padding: 12, borderRadius: 8, border: `2px solid ${isSelected ? "#0ea5e9" : "#e2e8f0"}`,
                                     background: isSelected ? "#f0f9ff" : "#fff", cursor: "pointer", position: "relative",
                                     transition: "all 0.15s", boxShadow: isSelected ? "0 4px 8px rgba(14,165,233,0.08)" : "none",
                                     transform: isSelected ? "translateY(-1px)" : "none"
                                   }}
                                 >
                                   {isSelected && (
                                     <div style={{ position: "absolute", top: 8, right: 8, width: 18, height: 18, borderRadius: 9, background: "#0ea5e9", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                       <Icon name="check" size={10} />
                                     </div>
                                   )}
                                   <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                                     {inst.avatar_url ? (
                                       <img src={inst.avatar_url.startsWith("http") ? inst.avatar_url : `${API_BASE_URL.replace("/api", "")}${inst.avatar_url}`} alt={inst.name} style={{ width: 36, height: 36, borderRadius: 18, objectFit: "cover", border: `2px solid ${isSelected ? "#0ea5e9" : "#e2e8f0"}`, flexShrink: 0 }} />
                                     ) : (
                                       <div style={{ width: 36, height: 36, borderRadius: 18, background: isSelected ? "#0ea5e9" : "#f1f5f9", color: isSelected ? "#fff" : "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, flexShrink: 0, transition: "all 0.15s" }}>
                                         {inst.name.charAt(0).toUpperCase()}
                                       </div>
                                     )}
                                     <div style={{ flex: 1, minWidth: 0 }}>
                                       <div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a", marginBottom: 1 }}>{inst.name}</div>
                                       {inst.email && <div style={{ fontSize: 10, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{inst.email}</div>}
                                     </div>
                                   </div>
                                   {inst.bio && (
                                     <p style={{ margin: 0, fontSize: 11, color: "#475569", lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{inst.bio}</p>
                                   )}
                                 </div>
                               );
                             })}
                           </div>
                         )}
                       </SectionPanel>
                     </div>
                   </div>
                 </div>
               )}

            </div>
            
            {/* Modal Footer */}
            <div style={{ padding: "14px 24px", borderTop: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12 }}>
              {formError && <span style={{ color: "#ef4444", fontSize: 12, fontWeight: 600 }}>⚠ {formError}</span>}
              <button type="button" onClick={() => { if (isInlineModal) { if (onCloseInline) onCloseInline(); } else { closeModal(); } }} style={{ background: "#fff", border: "1px solid #e2e8f0", color: "#64748b", padding: "8px 20px", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
              <button type="button" onClick={handleSave} disabled={saving} style={{ background: saving ? "#94a3b8" : "#0ea5e9", color: "#fff", border: "none", padding: "8px 28px", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", boxShadow: saving ? "none" : "0 2px 8px rgba(14,165,233,0.25)" }}>
                {saving ? "Saving..." : "Save Course"}
              </button>
            </div>
            
          </div>

          {/* AI Course Agent floating widget */}
          {aiAgentOpen && (
            <AICourseAgent
              courseContext={buildCourseContext()}
              onApplyChanges={handleApplyAiChanges}
              onCatalogCreated={() => fetchAll()}
              contextKey={`ai-course-agent-${editingId ?? "new"}`}
            />
          )}
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

      {uploadModalOpen && activeChapterId && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100000 }}>
          <UploadModal
            existingTags={[]}
            onClose={() => setUploadModalOpen(false)}
            onSuccess={(material) => {
              if (material?.id) handleLinkMaterial(material.id);
              setUploadModalOpen(false);
            }}
          />
        </div>
      )}

      {/* Basic Keyframes for modal animation */}
      <style dangerouslySetInnerHTML={{__html:`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
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
