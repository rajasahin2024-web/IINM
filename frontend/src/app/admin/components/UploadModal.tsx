import React, { useState, useRef } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { API_BASE_URL } from "@/lib/config";
import { useToast } from "./ToastProvider";

interface UploadModalProps {
  onClose: () => void;
  onSuccess: (material?: any) => void;
  existingTags: string[];
}

function formatBytes(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type UploadMode = "file" | "youtube";

export default function UploadModal({ onClose, onSuccess, existingTags }: UploadModalProps) {
  const { showToast } = useToast();
  const [mode, setMode] = useState<UploadMode>("file");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedThumbnail, setSelectedThumbnail] = useState<File | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  
  // Tagging State
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [titleFocused, setTitleFocused] = useState(false);
  const [descFocused, setDescFocused] = useState(false);
  const [youtubeFocused, setYoutubeFocused] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);

  const handleAddTag = (tagText: string) => {
    const t = tagText.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
    }
    setTagInput("");
    setShowSuggestions(false);
  };

  const removeTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  const filteredSuggestions = existingTags
    .filter(t => t.includes(tagInput.toLowerCase().trim()) && !tags.includes(t))
    .slice(0, 5);

  const getYouTubeId = (url: string) => {
    const regExp = /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/;
    const match = url.match(regExp);
    return match ? match[1] : null;
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = "Title is required";
    
    if (mode === "file") {
      if (!selectedFile) errs.file = "Please select a file to upload";
    } else {
      if (!youtubeUrl.trim()) errs.youtube_url = "YouTube URL is required";
      else if (!getYouTubeId(youtubeUrl)) errs.youtube_url = "Invalid YouTube URL";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    // Add any pending tag input before submitting
    let finalTags = [...tags];
    const pendingTag = tagInput.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (pendingTag && !finalTags.includes(pendingTag)) {
      finalTags.push(pendingTag);
    }

    const fd = new FormData();
    fd.append("title", title.trim());
    if (description.trim()) fd.append("description", description.trim());
    if (finalTags.length > 0) fd.append("tags", finalTags.join(","));

    if (mode === "file") {
      if (selectedFile) {
        fd.append("file", selectedFile);
        if (detectedType === "video" && selectedThumbnail) {
          fd.append("thumbnail", selectedThumbnail);
        }
      }
    } else {
      fd.append("youtube_url", youtubeUrl.trim());
      fd.append("file_type", "youtube");
      if (selectedThumbnail) {
        fd.append("thumbnail", selectedThumbnail);
      }
    }

    setLoading(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/materials`, {
        method: "POST",
        body: fd,
      });
      if (res.ok) {
        const material = await res.json();
        showToast("Upload successful!");
        onSuccess(material);
        onClose();
      } else {
        const data = await res.json();
        showToast(data.detail || "Upload failed", "error");
        setErrors({ submit: data.detail || "Upload failed" });
      }
    } catch {
      showToast("Network error. Please try again.", "error");
      setErrors({ submit: "Network error. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) { setSelectedFile(file); setErrors(prev => ({ ...prev, file: "" })); }
  };

  const detectFileType = (file: File | null) => {
    if (!file) return null;
    if (file.type.startsWith("video/")) return "video";
    if (file.type === "application/pdf") return "pdf";
    if (file.type.startsWith("image/")) return "image";
    return "document";
  };

  const detectedType = detectFileType(selectedFile);

  // ── Styles ────────────────────────────────────────
  const inputWrap: React.CSSProperties = { position: "relative", marginBottom: 24 };
  const floatLabel = (focused: boolean, hasValue: boolean): React.CSSProperties => ({
    position: "absolute", left: 16, top: focused || hasValue ? -9 : 14,
    fontSize: focused || hasValue ? 11 : 14, fontWeight: focused || hasValue ? 600 : 400,
    color: focused ? "#6366f1" : hasValue ? "#64748b" : "#94a3b8",
    background: "#fff", padding: "0 4px", transition: "all 0.18s cubic-bezier(.4,0,.2,1)",
    pointerEvents: "none", zIndex: 1, letterSpacing: focused || hasValue ? "0.3px" : "0",
  });
  const inputStyle = (focused: boolean, hasError: boolean): React.CSSProperties => ({
    width: "100%", padding: "13px 16px", borderRadius: 10,
    border: `1.5px solid ${hasError ? "#ef4444" : focused ? "#6366f1" : "#e2e8f0"}`,
    outline: "none", fontSize: 14, color: "#0f172a", background: "#fff",
    transition: "border-color 0.18s", boxSizing: "border-box",
    boxShadow: focused ? `0 0 0 3px ${hasError ? "#fee2e2" : "#eef2ff"}` : "none",
  });

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000, background: "#fff",
      display: "flex", flexDirection: "column",
      animation: "fadeIn 0.2s ease",
    }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        .mode-tab { padding: 8px 18px; border-radius: 8px; font-size: 13px; font-weight: 600; border: none; cursor: pointer; transition: all 0.18s; }
        .mode-tab.active { background: #6366f1; color: #fff; box-shadow: 0 2px 8px rgba(99,102,241,0.35); }
        .mode-tab.inactive { background: #f1f5f9; color: #64748b; }
        .mode-tab.inactive:hover { background: #e2e8f0; }
        .cm-submit-btn:hover { opacity: 0.92; transform: translateY(-1px); }
        .cm-submit-btn:active { transform: translateY(0); }
        .tag-remove:hover { color: #ef4444 !important; }
        .sugg-item { padding: 8px 12px; cursor: pointer; font-size: 13px; color: #334155; display: flex; align-items: center; gap: 8px; }
        .sugg-item:hover { background: #f8fafc; color: #6366f1; }
      `}</style>
      <div style={{
        width: "100%", height: "100%", display: "flex", flexDirection: "column",
        background: "#fff", overflow: "hidden"
      }}>
        <div style={{
          padding: "20px 28px", borderBottom: "1px solid #e2e8f0",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          background: "#f8fafc", flexShrink: 0,
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0f172a" }}>Upload Library Material</h2>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#94a3b8" }}>Add content to your global library</p>
          </div>
          <button onClick={onClose} style={{
            background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: 8,
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        <div style={{ padding: "16px 28px 16px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", gap: 12, flexShrink: 0 }}>
          <button type="button" className={`mode-tab ${mode === "file" ? "active" : "inactive"}`} onClick={() => { setMode("file"); setErrors({}); }}>File Upload</button>
          <button type="button" className={`mode-tab ${mode === "youtube" ? "active" : "inactive"}`} onClick={() => { setMode("youtube"); setErrors({}); }}>YouTube Link</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
          
          {/* Scrollable Form Body */}
          <div className="custom-scroll" style={{ flex: 1, padding: "28px 36px", overflowY: "auto", background: "#fff" }}>
          
          <div style={inputWrap}>
            <label style={floatLabel(titleFocused, !!title)}>Material Title</label>
            <input
              style={inputStyle(titleFocused, !!errors.title)} value={title}
              onChange={e => { setTitle(e.target.value); setErrors(p => ({ ...p, title: "" })); }}
              onFocus={() => setTitleFocused(true)} onBlur={() => setTitleFocused(false)}
            />
            {errors.title && <p style={{ margin: "4px 0 0", fontSize: 11.5, color: "#ef4444" }}>{errors.title}</p>}
          </div>

          <div style={inputWrap}>
            <label style={floatLabel(descFocused, !!description)}>Description (optional)</label>
            <textarea
              style={{ ...inputStyle(descFocused, false), resize: "vertical", minHeight: 70, lineHeight: 1.5 }}
              value={description} onChange={e => setDescription(e.target.value)}
              onFocus={() => setDescFocused(true)} onBlur={() => setDescFocused(false)}
            />
          </div>

          {/* Tagging System */}
          <div style={{ marginBottom: 28, position: "relative" }}>
            <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Tags</p>
            <div style={{
              display: "flex", flexWrap: "wrap", gap: 6, padding: "8px",
              border: "1.5px solid #e2e8f0", borderRadius: 10, minHeight: 46,
              background: "#fff", boxSizing: "border-box", alignItems: "center",
              boxShadow: showSuggestions ? "0 0 0 3px #eef2ff" : "none",
              borderColor: showSuggestions ? "#6366f1" : "#e2e8f0", transition: "all 0.18s"
            }}>
              {tags.map((tag, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 4, background: "#eef2ff",
                  color: "#4f46e5", padding: "2px 8px", borderRadius: 6, fontSize: 13, fontWeight: 500,
                  border: "1px solid #c7d2fe"
                }}>
                  #{tag}
                  <button type="button" className="tag-remove" onClick={() => removeTag(i)} style={{
                    background: "none", border: "none", padding: 2, color: "#818cf8",
                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </button>
                </div>
              ))}
              <input
                ref={tagInputRef}
                value={tagInput}
                onChange={e => {
                  setTagInput(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    handleAddTag(tagInput);
                  } else if (e.key === "Backspace" && !tagInput && tags.length > 0) {
                    removeTag(tags.length - 1);
                  }
                }}
                placeholder={tags.length === 0 ? "Type and press Enter (e.g. math, grade-10)" : ""}
                style={{ flex: 1, minWidth: 120, border: "none", outline: "none", fontSize: 13, color: "#0f172a", background: "transparent" }}
              />
            </div>
            
            {/* Tag Suggestions Dropdown */}
            {showSuggestions && tagInput.trim() && filteredSuggestions.length > 0 && (
              <div style={{
                position: "absolute", top: "100%", left: 0, right: 0,
                background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10,
                boxShadow: "0 10px 25px rgba(0,0,0,0.1)", zIndex: 10, overflow: "hidden", marginTop: 4
              }}>
                {filteredSuggestions.map(sugg => (
                  <div key={sugg} className="sugg-item" onClick={() => handleAddTag(sugg)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></svg>
                    {sugg}
                  </div>
                ))}
              </div>
            )}
            <p style={{ margin: "6px 0 0", fontSize: 11, color: "#94a3b8" }}>Press Enter or comma to create a tag. Use hyphens instead of spaces.</p>
          </div>

          {mode === "file" ? (
            <>
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? "#6366f1" : errors.file ? "#ef4444" : "#c7d2fe"}`, borderRadius: 14, padding: "28px 20px", textAlign: "center", cursor: "pointer",
                background: dragOver ? "#eef2ff" : "#fafbff", transition: "all 0.2s", marginBottom: 20,
              }}
            >
              <input ref={fileInputRef} type="file" style={{ display: "none" }} accept="video/*,.pdf,image/*,.doc,.docx" onChange={e => { const f = e.target.files?.[0] || null; setSelectedFile(f); setErrors(p => ({ ...p, file: "" })); }} />
              {selectedFile ? (
                <div>
                  <div style={{ width: 48, height: 48, borderRadius: 12, margin: "0 auto 10px", background: "#eef2ff", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2"><polyline points="20,6 9,17 4,12" /></svg></div>
                  <p style={{ margin: "0 0 2px", fontSize: 13.5, fontWeight: 700, color: "#0f172a" }}>{selectedFile.name}</p>
                  <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>{detectedType?.toUpperCase()} • {formatBytes(selectedFile.size)}</p>
                  <p style={{ margin: "8px 0 0", fontSize: 11.5, color: "#94a3b8" }}>Click to change</p>
                </div>
              ) : (
                <div>
                  <div style={{ width: 52, height: 52, borderRadius: 14, margin: "0 auto 12px", background: "#eef2ff", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.8"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17,8 12,3 7,8" /><line x1="12" y1="3" x2="12" y2="15" /></svg></div>
                  <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 600, color: "#1e293b" }}>Drag & drop your file here</p>
                  <p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>or click to browse — Video, PDF, Image, Document</p>
                </div>
              )}
            </div>
          {errors.file && <p style={{ margin: "-12px 0 14px", fontSize: 11.5, color: "#ef4444" }}>{errors.file}</p>}


            </>
          ) : (
            <div style={inputWrap}>
              <label style={floatLabel(youtubeFocused, !!youtubeUrl)}>YouTube URL</label>
              <input
                style={inputStyle(youtubeFocused, !!errors.youtube_url)} value={youtubeUrl}
                onChange={e => { setYoutubeUrl(e.target.value); setErrors(p => ({ ...p, youtube_url: "" })); }}
                onFocus={() => setYoutubeFocused(true)} onBlur={() => setYoutubeFocused(false)}
                placeholder="https://www.youtube.com/watch?v=..."
              />
              {errors.youtube_url && <p style={{ margin: "4px 0 0", fontSize: 11.5, color: "#ef4444" }}>{errors.youtube_url}</p>}
            </div>
          )}

          {(detectedType === "video" || mode === "youtube") && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600, color: "#475569" }}>Custom Thumbnail <span style={{ color: "#94a3b8", fontWeight: 400 }}>(optional)</span></p>
              <div onClick={() => thumbInputRef.current?.click()} style={{ border: "1px dashed #cbd5e1", borderRadius: 12, padding: "16px", textAlign: "center", cursor: "pointer", background: "#f8fafc", transition: "all 0.2s" }}>
                <input ref={thumbInputRef} type="file" style={{ display: "none" }} accept="image/*" onChange={e => setSelectedThumbnail(e.target.files?.[0] || null)} />
                {selectedThumbnail ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                     <div style={{ width: 40, height: 40, borderRadius: 8, overflow: "hidden", background: "#e2e8f0" }}><img src={URL.createObjectURL(selectedThumbnail)} alt="Thumb" style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div>
                     <div style={{ textAlign: "left" }}><p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{selectedThumbnail.name}</p><p style={{ margin: 0, fontSize: 11, color: "#64748b" }}>Click to change</p></div>
                  </div>
                ) : (
                  <div><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" style={{ marginBottom: 6 }}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21,15 16,10 5,21" /></svg><p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>Upload custom thumbnail</p></div>
                )}
              </div>
            </div>
          )}

          {errors.submit && (
            <div style={{ padding: "10px 14px", borderRadius: 10, background: "#fef2f2", border: "1px solid #fecaca", marginBottom: 18 }}>
              <p style={{ margin: 0, fontSize: 12.5, color: "#dc2626" }}>{errors.submit}</p>
            </div>
          )}

          </div>

          <div style={{ padding: "16px 28px", borderTop: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", justifyContent: "flex-end", gap: 10, flexShrink: 0 }}>
            <button type="button" onClick={onClose} style={{ padding: "11px 22px", borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff", fontSize: 13, fontWeight: 600, color: "#64748b", cursor: "pointer" }}>Cancel</button>
            <button type="submit" className="cm-submit-btn" disabled={loading} style={{ padding: "11px 28px", borderRadius: 10, border: "none", background: loading ? "#a5b4fc" : "#0ea5e9", fontSize: 13, fontWeight: 700, color: "#fff", cursor: loading ? "not-allowed" : "pointer", transition: "all 0.18s", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 2px 8px rgba(14,165,233,0.3)" }}>
              {loading ? ( <><span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite", display: "inline-block" }} />Uploading...</> ) : ( <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17,8 12,3 7,8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>Upload to Library</> )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
