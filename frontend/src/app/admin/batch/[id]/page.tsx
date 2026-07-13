"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Icon } from "../../icons";
import { useToast } from "../../components/ToastProvider";
import { apiFetch } from "@/lib/apiFetch";
import { API_BASE_URL } from "@/lib/config";
import { AdminProvider } from "../../components/ProtectedAdmin";
import UploadModal from "../../components/UploadModal";

/* ─── Floating Input (same as register page) ─── */
const FLOAT_CSS = `
  .bti-wrap { margin-bottom: 16px; }
  .bti-field {
    position: relative;
    border: 1.5px solid #e2e8f0;
    border-radius: 10px;
    background: #f8fafc;
    transition: all 0.2s;
  }
  .bti-focused { border-color: #38bdf8; background: #fff; box-shadow: 0 0 0 3px rgba(56,189,248,0.1); }
  .bti-label {
    position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
    font-size: 14px; color: #94a3b8; pointer-events: none; transition: all 0.2s;
  }
  .bti-label.bti-up { top: 6px; transform: translateY(0); font-size: 10px; font-weight: 700; color: #38bdf8; text-transform: uppercase; letter-spacing: 0.5px; }
  .bti-inp {
    width: 100%; border: none; background: transparent; outline: none;
    padding: 22px 14px 8px; font-size: 14px; color: #0f172a; font-family: inherit; font-weight: 500;
    box-sizing: border-box;
  }
  .bti-sel {
    width: 100%; border: none; background: transparent; outline: none;
    padding: 22px 32px 8px 14px; font-size: 14px; color: #0f172a; font-family: inherit;
    font-weight: 500; box-sizing: border-box; cursor: pointer; appearance: none;
  }
  .bti-req { color: #ef4444; margin-left: 3px; }

  /* ── Examination-style modal classes (cm-*) ── */
  .cm-field-wrap { width: 100%; }
  .cm-field {
    position: relative; border: 1.5px solid #e2e8f0; border-radius: 10px;
    background: #f8fafc; transition: border-color 0.2s;
  }
  .cm-field.focused { border-color: #38bdf8; background: #fff; box-shadow: 0 0 0 3px rgba(56,189,248,0.12); }
  .cm-label {
    position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
    font-size: 14px; color: #94a3b8; pointer-events: none;
    transition: all 0.18s; background: transparent; padding: 0 3px;
  }
  .cm-label.up { top: 0; transform: translateY(-50%); font-size: 11px; font-weight: 600; color: #38bdf8; background: #fff; }
  .cm-inp {
    display: block; width: 100%; padding: 20px 14px 8px; border: none; outline: none;
    font-size: 14px; color: #0f172a; background: transparent; border-radius: 10px;
    -webkit-appearance: none; cursor: pointer; font-family: inherit;
  }
  @keyframes popIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
  .pop-in { animation: popIn 0.18s ease-out; }
  @keyframes bSlideUp {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  @keyframes bFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

function FloatingInput({
  label, value, onChange, required = false, type = "text", autoFocus = false
}: {
  label: string; value: string; onChange: (v: string) => void;
  required?: boolean; type?: string; autoFocus?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const lifted = focused || value.length > 0 || type === "date";
  return (
    <div className="bti-wrap">
      <div className={`bti-field${focused ? " bti-focused" : ""}`}>
        <label className={`bti-label${lifted ? " bti-up" : ""}`}>
          {label}{required && <span className="bti-req">*</span>}
        </label>
        <input
          type={type}
          className="bti-inp"
          value={value}
          required={required}
          autoFocus={autoFocus}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </div>
    </div>
  );
}

function RegFloatSelect({ label, value, onChange, options, required = false }: {
  label: string; value: string; onChange: (v: string) => void;
  options: string[]; required?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="bti-wrap">
      <div className={`bti-field${focused ? " bti-focused" : ""}`} style={{ position: "relative" }}>
        <label className="bti-label bti-up">
          {label}{required && <span className="bti-req">*</span>}
        </label>
        <select
          className="bti-sel"
          value={value}
          required={required}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        >
          <option value="">Select…</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <div style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#94a3b8", fontSize: 10 }}>▼</div>
      </div>
    </div>
  );
}

/** Examination-style select — uses cm-* classes to match examination page */
function CmFloatingSelect({ label, value, onChange, required = false, children }: any) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="cm-field-wrap">
      <div className={`cm-field${focused ? " focused" : ""}`}>
        <label className="cm-label up">{label}{required && <span style={{ color: "#ef4444", marginLeft: 3 }}>*</span>}</label>
        <select className="cm-inp" value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        >
          {children}
        </select>
        <div style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#94a3b8" }}>
          <Icon name="chevron-down" size={16} />
        </div>
      </div>
    </div>
  );
}

/** Browse Library Modal — same as CurriculumManager */
function LibraryBrowserModal({ onClose, onSelect, currentMaterialIds }: { onClose: () => void; onSelect: (m: any) => void; currentMaterialIds: number[] }) {
  const [materials, setMaterials] = useState<any[]>([]);
  const [search, setSearch]       = useState("");
  const [filterType, setFilterType] = useState("all");
  const [tagFilter, setTagFilter]   = useState("");
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch(`${API_BASE_URL}/materials`);
        if (res.ok) {
          const data = await res.json();
          data.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          setMaterials(data);
        }
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, []);

  const existingTags = Array.from(new Set(materials.flatMap(m => m.tags ? m.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : []))).sort() as string[];

  const TYPE_CFG: Record<string, { bg: string; color: string; label: string }> = {
    video:    { bg: "#fce7f3", color: "#be185d", label: "VIDEO" },
    youtube:  { bg: "#fce7f3", color: "#be185d", label: "YT" },
    pdf:      { bg: "#fee2e2", color: "#dc2626", label: "PDF" },
    image:    { bg: "#e0f2fe", color: "#0284c7", label: "IMAGE" },
    document: { bg: "#f3f4f6", color: "#6b7280", label: "DOC" },
  };
  const tc = (type: string) => TYPE_CFG[type] || { bg: "#f3f4f6", color: "#6b7280", label: type.toUpperCase() };

  const getYtThumb = (url: string) => {
    const m = url?.match(/(?:youtube\.com\/.*[?&]v=|youtu\.be\/)([^"&?/\s]{11})/);
    return m ? `https://img.youtube.com/vi/${m[1]}/mqdefault.jpg` : null;
  };

  const filtered = materials.filter(m => {
    if (currentMaterialIds.includes(m.id)) return false;
    if (search && !m.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterType !== "all" && m.file_type !== filterType) return false;
    if (tagFilter) {
      const tgs = m.tags ? m.tags.split(",").map((t: string) => t.trim()) : [];
      if (!tgs.includes(tagFilter)) return false;
    }
    return true;
  });

  const FILTERS = [
    { key: "all", label: "All Items" }, { key: "video", label: "Videos" },
    { key: "youtube", label: "YouTube" }, { key: "pdf", label: "PDFs" },
    { key: "document", label: "Documents" }, { key: "image", label: "Images" },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 4000, background: "rgba(15,23,42,0.65)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(6px)" }}>
      <div style={{ background: "#f8fafc", borderRadius: 20, width: "95%", maxWidth: 1000, height: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 32px 80px rgba(0,0,0,0.3)" }}>
        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", borderRadius: "20px 20px 0 0" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, color: "#0f172a" }}>Browse Library</h2>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>Select a material to attach it to this chapter.</p>
          </div>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 18, border: "none", background: "#f1f5f9", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
            <Icon name="x" size={18} />
          </button>
        </div>

        {/* Filters */}
        <div style={{ padding: "16px 24px", borderBottom: "1px solid #e2e8f0", background: "#fff" }}>
          <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by title..." style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: "1px solid #cbd5e1", fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 12, background: "#f8fafc" }} />
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 10 }}>
            {FILTERS.map(f => (
              <button key={f.key} onClick={() => setFilterType(f.key)} style={{ padding: "6px 14px", borderRadius: 20, border: filterType === f.key ? "1px solid #6366f1" : "1px solid #e2e8f0", background: filterType === f.key ? "#eef2ff" : "#fff", color: filterType === f.key ? "#4f46e5" : "#64748b", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>{f.label}</button>
            ))}
          </div>
          {existingTags.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginRight: 4 }}>TAGS:</span>
              <button onClick={() => setTagFilter("")} style={{ background: tagFilter === "" ? "#1e293b" : "#f1f5f9", color: tagFilter === "" ? "#fff" : "#64748b", border: "none", padding: "4px 12px", borderRadius: 14, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>All Tags</button>
              {existingTags.map(tag => (
                <button key={tag} onClick={() => setTagFilter(tagFilter === tag ? "" : tag)} style={{ background: tagFilter === tag ? "#6366f1" : "#fff", color: tagFilter === tag ? "#fff" : "#4f46e5", border: `1px solid ${tagFilter === tag ? "#6366f1" : "#c7d2fe"}`, padding: "3px 12px", borderRadius: 14, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>#{tag}</button>
              ))}
            </div>
          )}
        </div>

        {/* Grid */}
        <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>Loading...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, color: "#94a3b8", background: "#fff", borderRadius: 16, border: "1px dashed #cbd5e1" }}>No available materials match your filters.</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
              {filtered.map(m => {
                const cfg = tc(m.file_type);
                const thumb = m.thumbnail_url || (m.file_type === "youtube" ? getYtThumb(m.youtube_url || "") : null);
                const tagsList = m.tags ? m.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [];
                return (
                  <div key={m.id} style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
                    <div style={{ height: 80, background: cfg.bg, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                      {thumb ? <img src={thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 11, fontWeight: 800, color: cfg.color, letterSpacing: "1px" }}>{cfg.label}</span>}
                      {thumb && <span style={{ position: "absolute", top: 6, right: 6, background: cfg.bg, color: cfg.color, fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 4 }}>{cfg.label}</span>}
                    </div>
                    <div style={{ padding: 12, flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                      <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#0f172a", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: 1.4 } as any}>{m.title}</h3>
                      {tagsList.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: "auto", paddingTop: 8 }}>
                          {tagsList.slice(0, 3).map((t: string) => <span key={t} style={{ background: "#f1f5f9", color: "#475569", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 12, border: "1px solid #e2e8f0" }}>#{t}</span>)}
                        </div>
                      )}
                    </div>
                    <div style={{ padding: 10 }}>
                      <button onClick={() => onSelect(m)} style={{ width: "100%", background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0", padding: 8, borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Add to Chapter</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Examination-style input — uses cm-* classes */
function CmFloatingInput({ label, type = "text", value, onChange, ...rest }: any) {
  const [focused, setFocused] = useState(false);
  const alwaysUp = ["datetime-local", "date", "time", "number"].includes(type);
  const lifted = alwaysUp || focused || (value !== undefined && value !== "");
  return (
    <div className="cm-field-wrap">
      <div className={`cm-field${focused ? " focused" : ""}`}>
        <label className={`cm-label${lifted ? " up" : ""}`}>{label}</label>
        <input className="cm-inp" type={type} value={value} onChange={onChange}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} {...rest} />
      </div>
    </div>
  );
}

function CurriculumSection({ batch, course, onRefresh }: { batch: any, course: any, onRefresh: () => void }) {
  const { showToast } = useToast();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [expandedSubjectId, setExpandedSubjectId] = useState<number | null>(null);
  const [chaptersCache, setChaptersCache] = useState<Record<number, any[]>>({});
  
  const [selectedChapter, setSelectedChapter] = useState<any | null>(null);
  
  // Chapter View state
  const [activeTab, setActiveTab] = useState<"materials" | "exams" | "live">("materials");
  const [materials, setMaterials] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [allExams, setAllExams] = useState<any[]>([]); // For assignment dropdown

  // Upload Material Modal
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [existingTags, setExistingTags] = useState<string[]>([]);

  // Browse Library Modal
  const [browseLibraryOpen, setBrowseLibraryOpen] = useState(false);

  // Preview Material
  const [previewMaterial, setPreviewMaterial] = useState<any | null>(null);

  // Assign Exam Modal
  const [assignExamOpen, setAssignExamOpen] = useState(false);
  const [assignForm, setAssignForm] = useState({ exam_id: "", start: "", end: "", pass_marks: "", duration: "", notes: "", unlock_condition_type: "", unlock_condition_value: "" });
  const [assignToAllBatches, setAssignToAllBatches] = useState(false);

  useEffect(() => {
    if (course?.id) {
      apiFetch(`${API_BASE_URL}/courses/${course.id}`).then(res => res.json()).then(data => {
         setSubjects(data.subjects || []);
      });
      // Pre-fetch all exams
      apiFetch(`${API_BASE_URL}/exams`).then(res => res.json()).then(data => {
         setAllExams(data);
      });
    }
  }, [course?.id]);

  const toggleSubject = async (subjectId: number) => {
    if (expandedSubjectId === subjectId) {
      setExpandedSubjectId(null);
      return;
    }
    setExpandedSubjectId(subjectId);
    if (!chaptersCache[subjectId]) {
      try {
        const res = await apiFetch(`${API_BASE_URL}/subjects/${subjectId}/chapters`);
        if (res.ok) {
           const data = await res.json();
           setChaptersCache(prev => ({ ...prev, [subjectId]: data }));
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  const openChapter = async (ch: any) => {
    setSelectedChapter(ch);
    setActiveTab("materials");
    fetchChapterData(ch.id);
  };

  const fetchChapterData = async (chId: number) => {
    try {
       const matRes = await apiFetch(`${API_BASE_URL}/chapters/${chId}/materials`);
       if(matRes.ok) setMaterials(await matRes.json());

       // Fetch exams assigned to this batch
       const examRes = await apiFetch(`${API_BASE_URL}/exams/assignments/batch/${batch.id}`);
       if(examRes.ok) {
           const assigns = await examRes.json();
           // Filter assignments locked to this chapter
           setExams(assigns.filter((a: any) => a.unlock_condition_type === 'chapter' && a.unlock_condition_value === chId));
       }
    } catch (e) {
       console.error("Error fetching chapter data");
    }
  };

  const handleUploadSuccess = async (material: any) => {
    if (material?.id && selectedChapter?.id) {
      try {
        await apiFetch(`${API_BASE_URL}/chapters/${selectedChapter.id}/materials`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ material_id: material.id })
        });
        showToast("Material uploaded and linked to chapter!", "success");
      } catch {
        showToast("Uploaded but failed to link to chapter", "error");
      }
    }
    fetchChapterData(selectedChapter.id);
  };

  const handleLibrarySelect = async (material: any) => {
    try {
      const res = await apiFetch(`${API_BASE_URL}/chapters/${selectedChapter.id}/materials/${material.id}`, {
        method: "POST",
      });
      if (res.ok) {
        showToast("Material linked to chapter!", "success");
        setBrowseLibraryOpen(false);
        fetchChapterData(selectedChapter.id);
      } else {
        showToast("Failed to link material", "error");
      }
    } catch {
      showToast("Network error", "error");
    }
  };

  const handleAssignExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignForm.exam_id) return showToast("Select an exam", "error");

    if (assignToAllBatches) {
       if(!confirm("Are you sure you want to assign this exam to ALL batches belonging to this course?")) return;
    }

    try {
       // get target batches
       let targetBatchIds = [batch.id];
       if (assignToAllBatches) {
           const cbRes = await apiFetch(`${API_BASE_URL}/courses/${course.id}/batches`);
           if (cbRes.ok) {
               const bList = await cbRes.json();
               targetBatchIds = bList.map((b:any) => b.id);
           }
       }

       let count = 0;
       for (const bid of targetBatchIds) {
           const res = await apiFetch(`${API_BASE_URL}/exams/assignments`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                 batch_id: bid,
                 exam_id: parseInt(assignForm.exam_id),
                 scheduled_start: assignForm.start || null,
                 scheduled_end: assignForm.end || null,
                 pass_marks: assignForm.pass_marks ? parseFloat(assignForm.pass_marks) : null,
                 duration_mins: assignForm.duration ? parseInt(assignForm.duration) : null,
                 notes: assignForm.notes || null,
                 status: "scheduled",
                 unlock_condition_type: assignForm.unlock_condition_type || "chapter",
                 unlock_condition_value: assignForm.unlock_condition_type === "material"
                   ? (assignForm.unlock_condition_value ? parseInt(assignForm.unlock_condition_value) : null)
                   : selectedChapter.id
              })
           });
           if (res.ok) count++;
       }

       showToast(`Exam assigned to ${count} batch(es)!`, "success");
       setAssignExamOpen(false);
       fetchChapterData(selectedChapter.id);

    } catch (e) {
       showToast("Error assigning exam", "error");
    }
  };

  const currentDrip = batch?.content_drip?.find((d: any) => d.chapter_id === selectedChapter?.id);
  const dripDate = currentDrip ? currentDrip.unlock_date : "";

  const updateDripDate = async (newDate: string) => {
    let newDrips = [...(batch?.content_drip || [])];
    const idx = newDrips.findIndex(d => d.chapter_id === selectedChapter.id);
    if (newDate) {
      if (idx >= 0) newDrips[idx].unlock_date = newDate;
      else newDrips.push({ chapter_id: selectedChapter.id, unlock_date: newDate });
    } else {
      if (idx >= 0) newDrips.splice(idx, 1);
    }
    
    try {
      const res = await apiFetch(`${API_BASE_URL}/batches/${batch.id}/content-drip`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ drips: newDrips })
      });
      if (res.ok) {
         showToast("Chapter unlock schedule updated!", "success");
         onRefresh();
      } else {
         showToast("Failed to update schedule", "error");
      }
    } catch(e) {
      showToast("Network error", "error");
    }
  };

  if (selectedChapter) {
     return (
       <div style={{ background: "#fff", borderRadius: 20, padding: 24, boxShadow: "0 4px 20px rgba(0,0,0,0.03)", border: "1px solid #e2e8f0" }}>
          <button onClick={() => setSelectedChapter(null)} style={{ background: "none", border: "none", color: "#64748b", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
             <Icon name="arrow-left" size={14} /> Back to Curriculum
          </button>
          
          <h3 style={{ margin: "0 0 16px 0", fontSize: 20, fontWeight: 800 }}>{selectedChapter.title}</h3>
          
          {/* DRIP SCHEDULING */}
          <div style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 12, background: "#f0fdfa", padding: "12px 16px", borderRadius: 10, border: "1px solid #ccfbf1" }}>
             <Icon name="calendar" size={18} color="#0d9488" />
             <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#115e59" }}>Scheduled Unlock (Drip Content)</div>
                <div style={{ fontSize: 11, color: "#0f766e", marginTop: 2 }}>Set a date when this chapter becomes visible to students in this batch. Leave blank to unlock immediately.</div>
             </div>
             <input 
               type="date" 
               value={dripDate} 
               onChange={(e) => updateDripDate(e.target.value)} 
               style={{ marginLeft: "auto", padding: "8px 12px", borderRadius: 8, border: "1px solid #99f6e4", outline: "none", fontFamily: "inherit", background: "#fff", color: "#115e59", fontWeight: 600, fontSize: 13 }}
             />
          </div>
          
          <div style={{ display: "flex", gap: 8, borderBottom: "1px solid #f1f5f9", marginBottom: 20 }}>
             {["materials", "exams", "live"].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  style={{
                     padding: "10px 16px", background: "none", border: "none", borderBottom: activeTab === tab ? "2px solid #0ea5e9" : "2px solid transparent",
                     color: activeTab === tab ? "#0ea5e9" : "#64748b", fontWeight: 700, textTransform: "capitalize", cursor: "pointer"
                  }}
                >
                  {tab}
                </button>
             ))}
          </div>

          {activeTab === "materials" && (
             <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                   <h4 style={{ margin: 0 }}>Materials</h4>
                   <div style={{ display: "flex", gap: 8 }}>
                     <button onClick={() => setBrowseLibraryOpen(true)} style={{ display: "flex", alignItems: "center", gap: 6, background: "#eef2ff", color: "#4f46e5", border: "1px solid #c7d2fe", padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                       <Icon name="search" size={13} /> Browse Library
                     </button>
                     <button onClick={() => setUploadModalOpen(true)} style={{ background: "#0f172a", color: "#fff", padding: "6px 14px", borderRadius: 8, border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>+ Add Material</button>
                   </div>
                </div>
                {materials.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>
                    <div style={{ fontSize: 36, marginBottom: 10 }}>📂</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>No materials in this chapter yet.</div>
                    <div style={{ fontSize: 12, marginTop: 4 }}>Click "+ Add Material" to add content.</div>
                  </div>
                ) : (
                   <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
                     {materials.map((m: any, idx: number) => {
                       const isVideo = m.file_type === "video" || m.file_type === "youtube";
                       const isPdf = m.file_type === "pdf";
                       const typeColor = isVideo ? { bg: "#fce7f3", color: "#be185d", badge: "#fdf2f8" } : isPdf ? { bg: "#fee2e2", color: "#dc2626", badge: "#fef2f2" } : { bg: "#e0f2fe", color: "#0284c7", badge: "#f0f9ff" };
                       return (
                         <div key={m.id} style={{ padding: "14px 16px", background: "#fff", borderBottom: idx < materials.length - 1 ? "1px solid #f1f5f9" : "none", display: "flex", alignItems: "center", gap: 14 }}>
                           <div style={{ width: 40, height: 40, borderRadius: 10, background: typeColor.bg, display: "flex", alignItems: "center", justifyContent: "center", color: typeColor.color, flexShrink: 0 }}>
                             <Icon name={isVideo ? "video" : "file-text"} size={18} />
                           </div>
                           <div style={{ flex: 1, minWidth: 0 }}>
                             <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.title}</div>
                             <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
                               <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", background: typeColor.badge, color: typeColor.color, padding: "1px 7px", borderRadius: 4 }}>{m.file_type}</span>
                               {m.description && <span style={{ fontSize: 11, color: "#94a3b8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 200 }}>{m.description}</span>}
                             </div>
                           </div>
                           <button
                             onClick={() => setPreviewMaterial(m)}
                             style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, border: "none", background: isVideo ? "linear-gradient(135deg, #f472b6, #be185d)" : "linear-gradient(135deg, #60a5fa, #2563eb)", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer", flexShrink: 0, boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }}
                           >
                             <Icon name={isVideo ? "play" : "eye"} size={14} />
                             {isVideo ? "Play" : "Preview"}
                           </button>
                         </div>
                       );
                     })}
                   </div>
                )}
             </div>
          )}

          {activeTab === "exams" && (
             <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                   <h4 style={{ margin: 0 }}>Assigned Exams</h4>
                   <button onClick={() => { setAssignForm({ exam_id: "", start: "", end: "", pass_marks: "", duration: "", notes: "", unlock_condition_type: "", unlock_condition_value: "" }); setAssignToAllBatches(false); setAssignExamOpen(true); }} style={{ background: "linear-gradient(135deg, #0ea5e9, #6366f1)", color: "#fff", padding: "8px 16px", borderRadius: 8, border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>+ Assign Exam</button>
                </div>
                {exams.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>
                    <div style={{ fontSize: 36, marginBottom: 10 }}>📝</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>No exams assigned to this chapter yet.</div>
                    <div style={{ fontSize: 12, marginTop: 4 }}>Click "+ Assign Exam" to get started.</div>
                  </div>
                ) : (
                  <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                          <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 700, color: "#475569", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px" }}>Exam</th>
                          <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 700, color: "#475569", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px" }}>Status</th>
                          <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 700, color: "#475569", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px" }}>Schedule</th>
                          <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 700, color: "#475569", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px" }}>Unlock</th>
                        </tr>
                      </thead>
                      <tbody>
                        {exams.map((a: any, idx: number) => (
                          <tr key={a.id} style={{ borderBottom: idx < exams.length - 1 ? "1px solid #f1f5f9" : "none", background: "#fff" }}>
                            <td style={{ padding: "14px 16px" }}>
                              <div style={{ fontWeight: 700, color: "#0f172a" }}>{a.exam_title || `Exam #${a.exam_id}`}</div>
                              {a.pass_marks && <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>Pass: {a.pass_marks}%</div>}
                            </td>
                            <td style={{ padding: "14px 16px" }}>
                              <span style={{
                                display: "inline-flex", alignItems: "center", gap: 4,
                                padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                                background: a.status === "active" ? "#f0fdf4" : a.status === "completed" ? "#f3f4f6" : a.status === "cancelled" ? "#fef2f2" : "#eff6ff",
                                color: a.status === "active" ? "#16a34a" : a.status === "completed" ? "#6b7280" : a.status === "cancelled" ? "#dc2626" : "#2563eb"
                              }}>
                                {a.status === "active" ? "🟢" : a.status === "completed" ? "✅" : a.status === "cancelled" ? "❌" : "🗓"} {a.status}
                              </span>
                            </td>
                            <td style={{ padding: "14px 16px", color: "#64748b", fontSize: 12 }}>
                              {a.scheduled_start
                                ? new Date(a.scheduled_start).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
                                : <span style={{ color: "#cbd5e1" }}>—</span>}
                            </td>
                            <td style={{ padding: "14px 16px" }}>
                              {a.unlock_condition_type
                                ? <span style={{ fontSize: 11, color: "#d97706", background: "#fef3c7", padding: "2px 8px", borderRadius: 4, fontWeight: 700 }}>🔒 {a.unlock_condition_type}</span>
                                : <span style={{ fontSize: 11, color: "#94a3b8" }}>Always Unlocked</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
             </div>
          )}
          {/* ── Material Preview Modal ── */}
          {previewMaterial && (() => {
            const m = previewMaterial;
            const isYoutube = m.file_type === "youtube";
            const isVideo   = m.file_type === "video";
            const isPdf     = m.file_type === "pdf";

            const getYtId = (url: string) => {
              const match = url?.match(/(?:youtube\.com\/.*[?&]v=|youtu\.be\/)([^"&?/\s]{11})/);
              return match ? match[1] : null;
            };
            const ytId = isYoutube ? getYtId(m.youtube_url || m.file_url || "") : null;

            return (
              <div style={{ position: "fixed", inset: 0, zIndex: 4000, background: "rgba(2,6,23,0.85)", backdropFilter: "blur(8px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                {/* Header bar */}
                <div style={{ width: "100%", maxWidth: 900, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 0 14px 0" }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#f1f5f9" }}>{m.title}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", marginTop: 2 }}>{m.file_type}</div>
                  </div>
                  <button onClick={() => setPreviewMaterial(null)} style={{ background: "rgba(255,255,255,0.1)", border: "none", width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#f1f5f9", cursor: "pointer" }}>
                    <Icon name="x" size={18} />
                  </button>
                </div>

                {/* Content area */}
                <div style={{ width: "100%", maxWidth: 900, background: "#000", borderRadius: 16, overflow: "hidden", boxShadow: "0 32px 80px rgba(0,0,0,0.6)" }}>
                  {isYoutube && ytId ? (
                    <div style={{ position: "relative", paddingBottom: "56.25%", height: 0 }}>
                      <iframe
                        src={`https://www.youtube.com/embed/${ytId}?autoplay=1`}
                        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : isVideo && m.file_url ? (
                    <video controls autoPlay style={{ width: "100%", maxHeight: "70vh", display: "block" }}>
                      <source src={m.file_url} />
                      Your browser does not support the video tag.
                    </video>
                  ) : isPdf && m.file_url ? (
                    <iframe src={m.file_url} style={{ width: "100%", height: "70vh", border: "none" }} />
                  ) : (
                    <div style={{ padding: 48, textAlign: "center", color: "#94a3b8" }}>
                      <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: "#f1f5f9", marginBottom: 8 }}>{m.title}</div>
                      {m.file_url && (
                        <a href={m.file_url} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", background: "linear-gradient(135deg, #0ea5e9, #6366f1)", color: "#fff", borderRadius: 10, fontWeight: 700, fontSize: 13, textDecoration: "none" }}>
                          <Icon name="external-link" size={14} /> Open File
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Browse Library Modal */}
          {browseLibraryOpen && (
            <LibraryBrowserModal
              onClose={() => setBrowseLibraryOpen(false)}
              onSelect={handleLibrarySelect}
              currentMaterialIds={materials.map((m: any) => m.id)}
            />
          )}

          {/* Upload Modal — same as Masters > Curriculum > Media */}
          {uploadModalOpen && (
             <UploadModal
               existingTags={existingTags}
               onClose={() => setUploadModalOpen(false)}
               onSuccess={handleUploadSuccess}
             />
          )}

          {/* Assign Exam Modal */}
          {assignExamOpen && (
             <div style={{ position: "fixed", inset: 0, zIndex: 3000, background: "rgba(15,23,42,0.45)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div className="pop-in" style={{ width: "90vw", maxWidth: 700, maxHeight: "90vh", display: "flex", flexDirection: "column", background: "#fff", borderRadius: 20, overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,0.18)" }}>
                   {/* Header */}
                   <div style={{ padding: "20px 28px", borderBottom: "1px solid #f1f5f9", background: "#fafbfc", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                     <div>
                       <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0f172a" }}>Assign Exam to Batch</h2>
                       <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>Schedule an exam for this chapter: <strong>{selectedChapter.title}</strong></p>
                     </div>
                     <button type="button" onClick={() => setAssignExamOpen(false)} style={{ background: "#f1f5f9", border: "none", width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", cursor: "pointer" }}>
                       <Icon name="x" size={16} />
                     </button>
                   </div>
                   
                   {/* Body */}
                   <form onSubmit={handleAssignExam} style={{ padding: "24px 32px", display: "flex", flexDirection: "column", gap: 18, overflowY: "auto", flex: 1 }}>
                      <CmFloatingSelect label="Select Exam *" value={assignForm.exam_id} onChange={(v: string) => setAssignForm({...assignForm, exam_id: v})} required>
                         <option value="" disabled hidden></option>
                         {allExams.map(ex => (
                             <option key={ex.id} value={ex.id}>{ex.title} ({ex.code})</option>
                         ))}
                      </CmFloatingSelect>
                      
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                         <CmFloatingInput label="Start Date & Time" type="datetime-local" value={assignForm.start} onChange={(e: any) => setAssignForm({...assignForm, start: e.target.value})} />
                         <CmFloatingInput label="End Date & Time" type="datetime-local" value={assignForm.end} onChange={(e: any) => setAssignForm({...assignForm, end: e.target.value})} />
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                         <CmFloatingInput label="Pass Marks (override)" type="number" value={assignForm.pass_marks} onChange={(e: any) => setAssignForm({...assignForm, pass_marks: e.target.value})} />
                         <CmFloatingInput label="Duration (minutes)" type="number" value={assignForm.duration} onChange={(e: any) => setAssignForm({...assignForm, duration: e.target.value})} />
                      </div>

                      <div className="cm-field-wrap">
                        <div className="cm-field" style={{ padding: "20px 14px 10px" }}>
                          <label className="cm-label up">Notes (optional)</label>
                          <textarea value={assignForm.notes} onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })}
                            style={{ border: "none", outline: "none", background: "transparent", width: "100%", fontSize: 14, color: "#0f172a", resize: "none", minHeight: 60, fontFamily: "inherit" }} />
                        </div>
                      </div>

                      <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                        <div style={{ marginBottom: 12, fontSize: 13, fontWeight: 700, color: "#475569" }}>Unlock Condition (Optional)</div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                          <CmFloatingSelect label="Condition Type" value={assignForm.unlock_condition_type} onChange={(v: string) => setAssignForm({ ...assignForm, unlock_condition_type: v, unlock_condition_value: "" })}>
                            <option value="">None (Always Unlocked)</option>
                            <option value="chapter">Must Complete Chapter</option>
                            <option value="material">Must Complete Material (Video/PDF)</option>
                          </CmFloatingSelect>
                          {assignForm.unlock_condition_type === "chapter" && (
                            <div style={{ display: "flex", alignItems: "center", padding: "0 14px", background: "#fff", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 13, color: "#64748b" }}>
                              🔒 Locked to: <strong style={{ marginLeft: 6, color: "#0f172a" }}>{selectedChapter.title}</strong>
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ padding: "16px", background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                         <div>
                            <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>Assign to ALL Batches</div>
                            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Also assign this to all other batches in {course?.title}.</div>
                         </div>
                         <label style={{ position: "relative", cursor: "pointer" }}>
                            <input type="checkbox" style={{ opacity: 0, width: 0, height: 0 }} checked={assignToAllBatches} onChange={e => setAssignToAllBatches(e.target.checked)} />
                            <div style={{ width: 44, height: 24, background: assignToAllBatches ? "#38bdf8" : "#cbd5e1", borderRadius: 12, position: "relative", transition: "0.2s" }}>
                               <div style={{ width: 18, height: 18, background: "#fff", borderRadius: "50%", position: "absolute", top: 3, left: assignToAllBatches ? 23 : 3, transition: "0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}></div>
                            </div>
                         </label>
                      </div>
                   </form>

                   {/* Footer */}
                   <div style={{ padding: "16px 28px", borderTop: "1px solid #f1f5f9", background: "#fafbfc", display: "flex", gap: 12 }}>
                      <button type="button" onClick={() => setAssignExamOpen(false)} style={{ flex: 1, padding: "12px", border: "1.5px solid #e2e8f0", background: "#fff", borderRadius: 10, fontWeight: 700, fontSize: 14, color: "#475569", cursor: "pointer" }}>Cancel</button>
                      <button form="assignExamForm" type="button" onClick={handleAssignExam as any} style={{ flex: 2, padding: "12px", border: "none", background: "linear-gradient(135deg, #0ea5e9, #6366f1)", borderRadius: 10, fontWeight: 700, fontSize: 14, color: "#fff", cursor: "pointer", boxShadow: "0 4px 12px rgba(99,102,241,0.25)" }}>Assign Exam</button>
                   </div>
                </div>
             </div>
          )}
       </div>
     );
  }

  return (
    <div style={{ background: "#fff", borderRadius: 20, padding: 24, boxShadow: "0 4px 20px rgba(0,0,0,0.03)", border: "1px solid #e2e8f0" }}>
       <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
          <div>
             <h3 style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", margin: "0 0 8px 0", display: "flex", alignItems: "center", gap: 8 }}><Icon name="book" size={18} color="#f59e0b"/> Curriculum Manager</h3>
             <span style={{ fontSize: 13, color: "#64748b" }}>Browse and manage materials & exams for this course.</span>
          </div>
       </div>

       {subjects.length === 0 ? <p style={{ color: "#94a3b8" }}>No subjects found in this course.</p> : (
         <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {subjects.map((sub) => (
               <div key={sub.id} style={{ border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
                  <button
                    onClick={() => toggleSubject(sub.id)}
                    style={{ width: "100%", padding: "16px 20px", background: expandedSubjectId === sub.id ? "#f8fafc" : "#fff", border: "none", textAlign: "left", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                  >
                     <span style={{ fontWeight: 800, fontSize: 14, color: "#0f172a" }}>{sub.name}</span>
                     <Icon name={expandedSubjectId === sub.id ? "chevron-up" : "chevron-down"} size={16} />
                  </button>
                  
                  {expandedSubjectId === sub.id && (
                     <div style={{ padding: "12px 20px", background: "#fff", borderTop: "1px solid #f1f5f9" }}>
                        {(chaptersCache[sub.id] || []).length === 0 ? (
                           <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>No chapters found.</p>
                        ) : (
                           <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                              {chaptersCache[sub.id].map(ch => (
                                 <button key={ch.id} onClick={() => openChapter(ch)} style={{ width: "100%", padding: "12px 16px", background: "#f8fafc", border: "1px solid #f1f5f9", borderRadius: 8, textAlign: "left", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>{ch.title}</span>
                                    <Icon name="arrow-right" size={14} />
                                 </button>
                              ))}
                           </div>
                        )}
                     </div>
                  )}
               </div>
            ))}
         </div>
       )}
    </div>
  );
}

function BatchDetailsDashboard() {
  const params = useParams();
  const router = useRouter();
  const batchId = params?.id;
  const { showToast } = useToast();

  const [batch, setBatch] = useState<any>(null);
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [addEmail, setAddEmail] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // ── Register Student Modal state ──
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const REG_EMPTY = {
    first_name: "", last_name: "", email: "", phone: "", alternative_phone: "", is_active: true,
    date_of_birth: "", gender: "", city: "", state: "", pin_code: "",
    highest_qualification: "", current_occupation: "",
    tenth_board: "", tenth_year: "", tenth_percentage: "",
    twelfth_board: "", twelfth_year: "", twelfth_percentage: "", twelfth_stream: "",
    graduation_degree: "", graduation_university: "", graduation_year: "", graduation_cgpa: "",
    aadhaar_number: "", pan_number: "",
    job_title: "", company_name: "", work_experience: "", linkedin_url: "",
    source: "", preferred_language: "", referral_code: "",
    emergency_contact_name: "", emergency_contact_phone: "",
  };
  const [regForm, setRegForm] = useState({ ...REG_EMPTY });
  const [regSaving, setRegSaving] = useState(false);

  const openRegisterModal = () => { setRegForm({ ...REG_EMPTY }); setIsRegisterOpen(true); };

  const handleRegisterStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regForm.first_name.trim() || !regForm.email.trim()) {
      showToast("First name and email are required", "error"); return;
    }
    setRegSaving(true);
    try {
      const s = (v: string) => v.trim() || null;
      const res = await apiFetch(`${API_BASE_URL}/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: regForm.first_name.trim(), last_name: s(regForm.last_name),
          email: regForm.email.trim(), phone: s(regForm.phone), alternative_phone: s(regForm.alternative_phone),
          is_active: regForm.is_active,
          date_of_birth: regForm.date_of_birth || null, gender: s(regForm.gender),
          city: s(regForm.city), state: s(regForm.state), pin_code: s(regForm.pin_code),
          highest_qualification: s(regForm.highest_qualification), current_occupation: s(regForm.current_occupation),
          tenth_board: s(regForm.tenth_board), tenth_year: s(regForm.tenth_year), tenth_percentage: s(regForm.tenth_percentage),
          twelfth_board: s(regForm.twelfth_board), twelfth_year: s(regForm.twelfth_year), twelfth_percentage: s(regForm.twelfth_percentage), twelfth_stream: s(regForm.twelfth_stream),
          graduation_degree: s(regForm.graduation_degree), graduation_university: s(regForm.graduation_university), graduation_year: s(regForm.graduation_year), graduation_cgpa: s(regForm.graduation_cgpa),
          aadhaar_number: s(regForm.aadhaar_number), pan_number: s(regForm.pan_number),
          job_title: s(regForm.job_title), company_name: s(regForm.company_name), work_experience: s(regForm.work_experience), linkedin_url: s(regForm.linkedin_url),
          source: s(regForm.source), preferred_language: s(regForm.preferred_language), referral_code: s(regForm.referral_code),
          emergency_contact_name: s(regForm.emergency_contact_name), emergency_contact_phone: s(regForm.emergency_contact_phone),
        }),
      });
      let data: any = null;
      try { data = await res.json(); } catch { /* no body */ }
      if (!res.ok) { showToast(data?.detail || "Failed to register student", "error"); return; }
      showToast("Student registered successfully!", "success");
      setIsRegisterOpen(false);
    } catch (err: any) {
      showToast(err.message || "An error occurred", "error");
    } finally { setRegSaving(false); }
  };

  const fetchBatch = async () => {
    try {
      const res = await apiFetch(`${API_BASE_URL}/batches/${batchId}`);
      if (!res.ok) {
        console.warn("API not available, using mock data");
        // Fallback for UI
        setBatch({
          id: batchId,
          name: "Sample UI Batch",
          mode: "Online",
          status: "Ongoing",
          max_capacity: 50,
          start_date: "2026-05-01",
          meeting_url: "https://zoom.us/j/123456789",
          routines: [{ day_of_week: "Monday", start_time: "10:00", end_time: "12:00" }],
          enrollments: []
        });
        setLoading(false);
        return;
      }
      const data = await res.json();
      setBatch(data);
      if (data.course_id) {
        const courseRes = await apiFetch(`${API_BASE_URL}/courses/${data.course_id}`);
        if (courseRes.ok) setCourse(await courseRes.json());
      }
    } catch {
      console.error("Fetch block error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBatch(); }, [batchId]);

  const handleAddStudent = async () => {
    if (!addEmail.trim()) return;
    setIsAdding(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/batches/${batchId}/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: addEmail.trim() }),
      });

      let data: any = null;
      try { data = await res.json(); } catch { /* no body */ }

      if (!res.ok) {
        const msg = data?.detail || "Failed to add student";
        showToast(msg, "error");
        return;
      }

      showToast("Student successfully added to batch", "success");
      setAddEmail("");
      fetchBatch();
    } catch (err: any) {
      showToast(err.message || "Network error — please try again", "error");
    } finally {
      setIsAdding(false);
    }
  };

  const handleKickStudent = async (studentId: number) => {
    if(!confirm("Are you sure you want to remove this student?")) return;
    try {
      const res = await apiFetch(`${API_BASE_URL}/batches/${batchId}/unenroll/${studentId}`, { method: "POST" });
      if (!res.ok) throw new Error();
      showToast("Student removed", "success");
      fetchBatch();
    } catch {
      showToast("Error removing student", "error");
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>Loading Dashboard...</div>;

  return (
    <div style={{ padding: "40px", width: "100%", margin: "0 auto", fontFamily: "Inter, sans-serif", background: "#f8fafc", minHeight: "100vh" }}>
      
      {/* HEADER */}

      {/* ── Breadcrumb / Back bar ── */}
      <div style={{ marginBottom: 20 }}>
        <button
          onClick={() => router.push("/admin/batch")}
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "#fff", border: "1.5px solid #cbd5e1",
            padding: "9px 18px", borderRadius: 10, cursor: "pointer",
            fontSize: 13, fontWeight: 700, color: "#334155",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            transition: "all 0.18s",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = "#0ea5e9";
            e.currentTarget.style.color = "#fff";
            e.currentTarget.style.borderColor = "#0ea5e9";
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(14,165,233,0.28)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "#fff";
            e.currentTarget.style.color = "#334155";
            e.currentTarget.style.borderColor = "#cbd5e1";
            e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.06)";
          }}
        >
          <Icon name="arrow-left" size={15} />
          Back to Batches
        </button>
      </div>

      {/* ── Title row ── */}
      <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 28, flexWrap: "wrap" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#0ea5e9", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="layers" size={12} />
            {course?.title || "Unknown Course"} &nbsp;›&nbsp; Batch Dashboard
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: "-0.5px" }}>{batch?.name}</h1>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{
            background: batch?.status === "Ongoing" ? "#dcfce7" : batch?.status === "Upcoming" ? "#dbeafe" : "#f1f5f9",
            color: batch?.status === "Ongoing" ? "#15803d" : batch?.status === "Upcoming" ? "#1d4ed8" : "#475569",
            padding: "8px 18px", borderRadius: 20, fontSize: 13, fontWeight: 700,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <div style={{
              width: 7, height: 7, borderRadius: "50%",
              background: batch?.status === "Ongoing" ? "#22c55e" : batch?.status === "Upcoming" ? "#3b82f6" : "#94a3b8",
            }} />
            {batch?.status?.toUpperCase() || "UNKNOWN"}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "350px 1fr", gap: 24, alignItems: "start" }}>
        
        {/* LEFT COLUMN (Sidebar Widgets) */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          
          {/* DIV 2: BATCH & CLASS DETAILS */}
          <div style={{ background: "#fff", borderRadius: 20, padding: 24, boxShadow: "0 4px 20px rgba(0,0,0,0.03)", border: "1px solid #e2e8f0" }}>
             <h3 style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", margin: "0 0 20px 0", display: "flex", alignItems: "center", gap: 8 }}><Icon name="info" size={18} color="#0ea5e9"/> Batch Logistics</h3>
             
             <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 16, borderBottom: "1px solid #f1f5f9" }}>
                   <span style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>Mode</span>
                   <span style={{ fontSize: 13, color: "#0f172a", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}><Icon name={batch?.mode === "Online" ? "globe" : "users"} size={14} /> {batch?.mode}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 16, borderBottom: "1px solid #f1f5f9" }}>
                   <span style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>Start Date</span>
                   <span style={{ fontSize: 13, color: "#0f172a", fontWeight: 700 }}>{batch?.start_date ? new Date(batch.start_date).toLocaleDateString() : "TBD"}</span>
                </div>
                
                {batch?.routines?.length > 0 && (
                  <div style={{ paddingBottom: 16, borderBottom: "1px solid #f1f5f9" }}>
                     <span style={{ fontSize: 13, color: "#64748b", fontWeight: 600, display: "block", marginBottom: 12 }}>Schedule</span>
                     <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                       {batch.routines.map((r:any, i:number) => (
                         <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, background: "#f8fafc", padding: "8px 12px", borderRadius: 8 }}>
                            <strong style={{ color: "#0f172a" }}>{r.day_of_week}</strong>
                            <span style={{ color: "#475569", fontWeight: 600 }}>{r.start_time} - {r.end_time}</span>
                         </div>
                       ))}
                     </div>
                  </div>
                )}
                
                {batch?.meeting_url && (
                  <div>
                    <span style={{ fontSize: 13, color: "#64748b", fontWeight: 600, display: "block", marginBottom: 8 }}>Meeting Link</span>
                    <div style={{ display: "flex", gap: 8 }}>
                       <input type="text" readOnly value={batch.meeting_url} style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", fontSize: 13, color: "#475569", outline: "none" }} />
                       <button onClick={() => { navigator.clipboard.writeText(batch.meeting_url); showToast("Copied!", "success"); }} style={{ background: "#e0f2fe", color: "#0284c7", border: "none", borderRadius: 8, padding: "0 12px", cursor: "pointer", fontWeight: 700 }}>Copy</button>
                    </div>
                  </div>
                )}
             </div>
          </div>

          {/* DIV 1: ENROLLMENT (ADD STUDENT) */}
          <div style={{ background: "#fff", borderRadius: 20, padding: 24, boxShadow: "0 4px 20px rgba(0,0,0,0.03)", border: "1px solid #e2e8f0" }}>
             <h3 style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", margin: "0 0 20px 0", display: "flex", alignItems: "center", gap: 8 }}><Icon name="user-plus" size={18} color="#8b5cf6"/> Add Student</h3>
             
             {/* Capacity Tracker */}
             <div style={{ marginBottom: 20 }}>
               <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
                 <span style={{ color: "#64748b" }}>Capacity filled</span>
                 <span style={{ color: "#0f172a" }}>{batch?.enrollments?.length || 0} / {batch?.max_capacity || 50}</span>
               </div>
               <div style={{ width: "100%", height: 8, background: "#f1f5f9", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", background: "#8b5cf6", width: `${((batch?.enrollments?.length || 0) / (batch?.max_capacity || 50)) * 100}%`, borderRadius: 4, transition: "width 0.5s ease" }}></div>
               </div>
             </div>

             <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                   <label style={{ fontSize: 12, fontWeight: 700, color: "#64748b", display: "block", marginBottom: 6 }}>Direct add</label>
                   <div style={{ display: "flex", gap: 8 }}>
                     <input type="email" placeholder="student@email.com" value={addEmail} onChange={e => setAddEmail(e.target.value)} onKeyDown={(e) => { if(e.key === "Enter") handleAddStudent(); }} style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, outline: "none", transition: "border 0.2s" }} onFocus={e => e.currentTarget.style.borderColor="#8b5cf6"} onBlur={e => e.currentTarget.style.borderColor="#cbd5e1"} />
                     <button onClick={handleAddStudent} disabled={isAdding} style={{ background: isAdding ? "#c4b5fd" : "#8b5cf6", color: "#fff", border: "none", borderRadius: 8, padding: "0 16px", fontWeight: 700, cursor: isAdding ? "wait" : "pointer", display: "flex", alignItems: "center" }}><Icon name="plus" size={16} /></button>
                   </div>
                   <div style={{ marginTop: 8, fontSize: 11, color: "#64748b", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                       <span>Only registered emails allowed.</span>
                       <button
                         type="button"
                         onClick={openRegisterModal}
                         style={{ background: "none", border: "none", color: "#8b5cf6", fontWeight: 700, fontSize: 11, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, padding: 0 }}
                       >
                         <Icon name="user-plus" size={11} /> Register Student
                       </button>
                    </div>
                </div>
                <div style={{ textAlign: "center", padding: "16px 0", borderBottom: "1px dashed #e2e8f0" }}>
                   <span style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8" }}>OR</span>
                </div>
                <button style={{ width: "100%", background: "#f8fafc", color: "#475569", border: "1px solid #cbd5e1", padding: "12px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}>
                  <Icon name="search" size={14} /> Browse Existing Users
                </button>
             </div>
          </div>



        </div>

        {/* RIGHT COLUMN (Main Data) */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          
          <CurriculumSection batch={batch} course={course} onRefresh={fetchBatch} />

          {/* OPTION A: ENROLLED STUDENTS ROSTER table */}
          <div style={{ background: "#fff", borderRadius: 20, boxShadow: "0 4px 20px rgba(0,0,0,0.03)", border: "1px solid #e2e8f0", overflow: "hidden", flex: 1, display: "flex", flexDirection: "column" }}>
             <div style={{ padding: "24px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", margin: 0, display: "flex", alignItems: "center", gap: 8 }}><Icon name="users" size={18} color="#10b981"/> Enrolled Students</h3>
                <span style={{ background: "#d1fae5", color: "#065f46", fontSize: 12, fontWeight: 800, padding: "4px 12px", borderRadius: 12 }}>{batch?.enrollments?.length || 0} TOTAL</span>
             </div>

             <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                   <thead>
                      <tr style={{ background: "#f8fafc", color: "#64748b", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                         <th style={{ padding: "16px 24px", borderBottom: "1px solid #e2e8f0" }}>Student Name</th>
                         <th style={{ padding: "16px 24px", borderBottom: "1px solid #e2e8f0" }}>Join Date</th>
                         <th style={{ padding: "16px 24px", borderBottom: "1px solid #e2e8f0" }}>Attendance</th>
                         <th style={{ padding: "16px 24px", borderBottom: "1px solid #e2e8f0", textAlign: "right" }}>Actions</th>
                      </tr>
                   </thead>
                   <tbody>
                      {(batch?.enrollments || []).length === 0 ? (
                        <tr>
                          <td colSpan={4} style={{ padding: 40, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
                            No students enrolled in this batch yet.
                          </td>
                        </tr>
                      ) : (
                        (batch?.enrollments || []).map((enr: any) => (
                           <tr key={enr.id} style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.2s" }} onMouseOver={e => e.currentTarget.style.background="#f8fafc"} onMouseOut={e => e.currentTarget.style.background="transparent"}>
                              <td style={{ padding: "16px 24px" }}>
                                 <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#0ea5e9", color: "#fff", display: "flex", alignItems: "center", justifyItems: "center", fontWeight: 800, fontSize: 12, lineHeight: "32px", textAlign: "center", justifyContent: "center" }}>
                                       {(enr.student?.first_name?.[0] || "?").toUpperCase()}
                                    </div>
                                    <div>
                                       <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{enr.student?.first_name} {enr.student?.last_name || ""}</div>
                                       <div style={{ fontSize: 12, color: "#64748b" }}>{enr.student?.email}</div>
                                    </div>
                                 </div>
                              </td>
                              <td style={{ padding: "16px 24px", fontSize: 13, color: "#475569", fontWeight: 500 }}>
                                {new Date(enr.join_date).toLocaleDateString()}
                              </td>
                              <td style={{ padding: "16px 24px" }}>
                                 <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                   <div style={{ width: 60, height: 6, background: "#f1f5f9", borderRadius: 3, overflow: "hidden" }}>
                                      <div style={{ height: "100%", background: "#10b981", width: `100%`, borderRadius: 3 }}></div>
                                   </div>
                                   <span style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>100%</span>
                                 </div>
                              </td>
                              <td style={{ padding: "16px 24px", textAlign: "right" }}>
                                 <button onClick={() => handleKickStudent(enr.student.id)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: 8, borderRadius: 8, transition: "background 0.2s" }} title="Remove Student" onMouseOver={e => e.currentTarget.style.background="#fee2e2"} onMouseOut={e => e.currentTarget.style.background="none"}>
                                    <Icon name="user-x" size={16} />
                                 </button>
                              </td>
                           </tr>
                        ))
                      )}
                   </tbody>
                </table>
             </div>
          </div>

        </div>
      </div>

      {/* ═══════════════ Register Student Modal ═══════════════ */}
      {isRegisterOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)", animation: "bFadeIn 0.2s" }}>
          <div style={{ width: "80%", maxWidth: 1200, background: "#fff", borderRadius: 20, boxShadow: "0 24px 48px rgba(0,0,0,0.18)", overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "92vh", animation: "bSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)" }}>

            {/* Header */}
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: "#e0f2fe", color: "#0284c7", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name="user-plus" size={20} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0f172a" }}>Register Student</h2>
                  <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>Add a new student profile</p>
                </div>
              </div>
              <button type="button" onClick={() => setIsRegisterOpen(false)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: 8 }}>
                <Icon name="x" size={20} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: "24px", overflowY: "auto", background: "#fff" }}>
              <form id="reg-student-form" onSubmit={handleRegisterStudent}>

                {/* Basic Info */}
                <div style={{ fontSize: 11, fontWeight: 700, color: "#0ea5e9", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid #e0f2fe" }}>👤 Basic Information</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                  <FloatingInput label="First Name" value={regForm.first_name} onChange={v => setRegForm({ ...regForm, first_name: v })} required autoFocus />
                  <FloatingInput label="Last Name" value={regForm.last_name} onChange={v => setRegForm({ ...regForm, last_name: v })} />
                </div>
                <FloatingInput type="email" label="Email Address" value={regForm.email} onChange={v => setRegForm({ ...regForm, email: v })} required />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                  <FloatingInput label="Phone Number" value={regForm.phone} onChange={v => setRegForm({ ...regForm, phone: v })} />
                  <FloatingInput label="Alternative Phone" value={regForm.alternative_phone} onChange={v => setRegForm({ ...regForm, alternative_phone: v })} />
                </div>

                {/* Personal */}
                <div style={{ fontSize: 11, fontWeight: 700, color: "#8b5cf6", textTransform: "uppercase", letterSpacing: "1px", margin: "8px 0 12px", paddingBottom: 8, borderBottom: "1px solid #ede9fe" }}>📋 Personal Information</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                  <FloatingInput type="date" label="Date of Birth" value={regForm.date_of_birth} onChange={v => setRegForm({ ...regForm, date_of_birth: v })} />
                  <RegFloatSelect label="Gender" value={regForm.gender} onChange={v => setRegForm({ ...regForm, gender: v })} options={["Male","Female","Other"]} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0 16px" }}>
                  <FloatingInput label="PIN Code" value={regForm.pin_code} onChange={v => setRegForm({ ...regForm, pin_code: v })} />
                  <FloatingInput label="City" value={regForm.city} onChange={v => setRegForm({ ...regForm, city: v })} />
                  <FloatingInput label="State" value={regForm.state} onChange={v => setRegForm({ ...regForm, state: v })} />
                </div>

                {/* Education */}
                <div style={{ fontSize: 11, fontWeight: 700, color: "#059669", textTransform: "uppercase", letterSpacing: "1px", margin: "8px 0 12px", paddingBottom: 8, borderBottom: "1px solid #d1fae5" }}>🎓 Educational Qualification</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                  <RegFloatSelect label="Highest Qualification" value={regForm.highest_qualification} onChange={v => setRegForm({ ...regForm, highest_qualification: v })} options={["10th","12th","Diploma","Graduation","Post-Graduation","PhD"]} />
                  <RegFloatSelect label="Current Occupation" value={regForm.current_occupation} onChange={v => setRegForm({ ...regForm, current_occupation: v })} options={["Student","Working Professional","Freelancer","Business","Other"]} />
                </div>
                <div style={{ background: "#f8fafc", borderRadius: 10, padding: "14px 16px", marginBottom: 12, border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 8 }}>10th Details</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0 12px" }}>
                    <FloatingInput label="Board" value={regForm.tenth_board} onChange={v => setRegForm({ ...regForm, tenth_board: v })} />
                    <FloatingInput label="Passing Year" value={regForm.tenth_year} onChange={v => setRegForm({ ...regForm, tenth_year: v })} />
                    <FloatingInput label="Percentage / Grade" value={regForm.tenth_percentage} onChange={v => setRegForm({ ...regForm, tenth_percentage: v })} />
                  </div>
                </div>
                <div style={{ background: "#f8fafc", borderRadius: 10, padding: "14px 16px", marginBottom: 12, border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 8 }}>12th Details</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "0 12px" }}>
                    <FloatingInput label="Board" value={regForm.twelfth_board} onChange={v => setRegForm({ ...regForm, twelfth_board: v })} />
                    <FloatingInput label="Passing Year" value={regForm.twelfth_year} onChange={v => setRegForm({ ...regForm, twelfth_year: v })} />
                    <FloatingInput label="Percentage / Grade" value={regForm.twelfth_percentage} onChange={v => setRegForm({ ...regForm, twelfth_percentage: v })} />
                    <RegFloatSelect label="Stream" value={regForm.twelfth_stream} onChange={v => setRegForm({ ...regForm, twelfth_stream: v })} options={["Science","Commerce","Arts","Other"]} />
                  </div>
                </div>
                <div style={{ background: "#f8fafc", borderRadius: 10, padding: "14px 16px", marginBottom: 12, border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 8 }}>Graduation Details</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "0 12px" }}>
                    <FloatingInput label="Degree" value={regForm.graduation_degree} onChange={v => setRegForm({ ...regForm, graduation_degree: v })} />
                    <FloatingInput label="University" value={regForm.graduation_university} onChange={v => setRegForm({ ...regForm, graduation_university: v })} />
                    <FloatingInput label="Year" value={regForm.graduation_year} onChange={v => setRegForm({ ...regForm, graduation_year: v })} />
                    <FloatingInput label="CGPA / %" value={regForm.graduation_cgpa} onChange={v => setRegForm({ ...regForm, graduation_cgpa: v })} />
                  </div>
                </div>

                {/* Identity */}
                <div style={{ fontSize: 11, fontWeight: 700, color: "#dc2626", textTransform: "uppercase", letterSpacing: "1px", margin: "8px 0 12px", paddingBottom: 8, borderBottom: "1px solid #fee2e2" }}>🪪 Identity &amp; Documents</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                  <FloatingInput label="Aadhaar Number" value={regForm.aadhaar_number} onChange={v => setRegForm({ ...regForm, aadhaar_number: v })} />
                  <FloatingInput label="PAN Number" value={regForm.pan_number} onChange={v => setRegForm({ ...regForm, pan_number: v })} />
                </div>

                {/* Professional */}
                <div style={{ fontSize: 11, fontWeight: 700, color: "#d97706", textTransform: "uppercase", letterSpacing: "1px", margin: "8px 0 12px", paddingBottom: 8, borderBottom: "1px solid #fef3c7" }}>💼 Professional Info</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                  <FloatingInput label="Job Title / Designation" value={regForm.job_title} onChange={v => setRegForm({ ...regForm, job_title: v })} />
                  <FloatingInput label="Company / College Name" value={regForm.company_name} onChange={v => setRegForm({ ...regForm, company_name: v })} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                  <RegFloatSelect label="Work Experience" value={regForm.work_experience} onChange={v => setRegForm({ ...regForm, work_experience: v })} options={["Fresher","1-3 years","3-5 years","5+ years"]} />
                  <FloatingInput label="LinkedIn Profile URL" value={regForm.linkedin_url} onChange={v => setRegForm({ ...regForm, linkedin_url: v })} />
                </div>

                {/* LMS */}
                <div style={{ fontSize: 11, fontWeight: 700, color: "#0284c7", textTransform: "uppercase", letterSpacing: "1px", margin: "8px 0 12px", paddingBottom: 8, borderBottom: "1px solid #e0f2fe" }}>💡 LMS Information</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0 16px" }}>
                  <RegFloatSelect label="Source" value={regForm.source} onChange={v => setRegForm({ ...regForm, source: v })} options={["Google","Referral","Social Media","Advertisement","Word of Mouth","Other"]} />
                  <RegFloatSelect label="Preferred Language" value={regForm.preferred_language} onChange={v => setRegForm({ ...regForm, preferred_language: v })} options={["Bengali","Hindi","English"]} />
                  <FloatingInput label="Referral Code" value={regForm.referral_code} onChange={v => setRegForm({ ...regForm, referral_code: v })} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                  <FloatingInput label="Emergency Contact Name" value={regForm.emergency_contact_name} onChange={v => setRegForm({ ...regForm, emergency_contact_name: v })} />
                  <FloatingInput label="Emergency Contact Phone" value={regForm.emergency_contact_phone} onChange={v => setRegForm({ ...regForm, emergency_contact_phone: v })} />
                </div>

                {/* Active Toggle */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", background: "#f0fdf4", borderRadius: 12, border: "1px solid #bbf7d0", marginTop: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>Active Account</div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Can login and access enrolled batches.</div>
                  </div>
                  <label style={{ display: "inline-flex", cursor: "pointer", position: "relative" }}>
                    <input type="checkbox" checked={regForm.is_active} onChange={e => setRegForm({ ...regForm, is_active: e.target.checked })} style={{ opacity: 0, position: "absolute", width: 0, height: 0 }} />
                    <div style={{ width: 44, height: 24, background: regForm.is_active ? "#10b981" : "#cbd5e1", borderRadius: 12, position: "relative", transition: "0.2s" }}>
                      <div style={{ width: 20, height: 20, background: "#fff", borderRadius: "50%", position: "absolute", top: 2, left: regForm.is_active ? 22 : 2, transition: "0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }} />
                    </div>
                  </label>
                </div>
              </form>
            </div>

            {/* Footer */}
            <div style={{ padding: "18px 24px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "flex-end", gap: 12, background: "#fafbfc" }}>
              <button type="button" onClick={() => setIsRegisterOpen(false)} style={{ padding: "10px 20px", borderRadius: 8, border: "1.5px solid #e2e8f0", background: "#fff", color: "#475569", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Cancel</button>
              <button type="submit" form="reg-student-form" disabled={regSaving} style={{ padding: "10px 24px", borderRadius: 8, border: "none", background: regSaving ? "#bae6fd" : "#0ea5e9", color: "#fff", fontWeight: 700, fontSize: 13, cursor: regSaving ? "wait" : "pointer", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 12px rgba(14,165,233,0.3)" }}>
                {regSaving ? "Saving..." : "Register Student"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: FLOAT_CSS }} />
      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); }
          70% { box-shadow: 0 0 0 6px rgba(34, 197, 94, 0); }
          100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
        }
      `}</style>
    </div>
  );
}

export default function BatchDetailPage() {
  return (
    <AdminProvider>
      <BatchDetailsDashboard />
    </AdminProvider>
  );
}
