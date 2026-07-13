"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";
import { API_BASE_URL, BASE_URL } from "@/lib/config";
import { AdminProvider } from "../../components/ProtectedAdmin";

function resolveImageUrl(url?: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${BASE_URL}${url}`;
}

// --- Types ----------------------------------------------------
interface Author {
  id: number;
  name: string;
  bio: string | null;
  profile_image: string | null;
  social_links: string | null;
  is_active: boolean;
  post_count: number;
  created_at: string | null;
}

// --- Floating Input -------------------------------------------
function FloatingInput({ label, type = "text", value, onChange, required, isTextArea = false }: {
  label: string; type?: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  required?: boolean; isTextArea?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const hasValue = value !== undefined && value !== null && value !== "";

  const labelStyle: React.CSSProperties = {
    position: "absolute", left: "14px",
    top: focused || hasValue ? "-9px" : (isTextArea ? "14px" : "50%"),
    transform: focused || hasValue ? "none" : (isTextArea ? "none" : "translateY(-50%)"),
    fontSize: focused || hasValue ? "11px" : "14px",
    fontWeight: focused || hasValue ? 600 : 400,
    color: focused ? "#6366f1" : hasValue ? "#64748b" : "#94a3b8",
    background: focused || hasValue ? "#fff" : "transparent",
    padding: focused || hasValue ? "0 4px" : "0",
    transition: "all 0.2s cubic-bezier(.4,0,.2,1)",
    pointerEvents: "none", zIndex: 1,
    letterSpacing: focused || hasValue ? "0.3px" : "0",
  };

  const inputCss: React.CSSProperties = {
    width: "100%", padding: "14px 16px", borderRadius: "10px",
    border: `1.5px solid ${focused ? "#6366f1" : "#e2e8f0"}`,
    outline: "none", fontSize: "14px", color: "#0f172a", background: "#fff",
    transition: "border-color 0.2s, box-shadow 0.2s", boxSizing: "border-box" as const,
    boxShadow: focused ? "0 0 0 3px rgba(99,102,241,0.12)" : "none",
    resize: isTextArea ? "vertical" as const : undefined,
    fontFamily: "inherit", minHeight: isTextArea ? "90px" : "auto",
  };

  return (
    <div style={{ position: "relative", width: "100%", marginBottom: "4px" }}>
      {isTextArea ? (
        <textarea required={required} style={inputCss} value={value} onChange={onChange}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
      ) : (
        <input type={type} required={required} style={inputCss} value={value} onChange={onChange}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
      )}
      <label style={labelStyle}>{label}</label>
    </div>
  );
}

// --- Profile Image Picker -------------------------------------
function ProfileImagePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await apiFetch(`${API_BASE_URL}/settings/site/upload`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        onChange(data.url);
      } else {
        alert("Image upload failed.");
      }
    } catch {
      alert("Network error during upload.");
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  return (
    <div>
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !value && !uploading && fileRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? "#6366f1" : "#e2e8f0"}`,
          borderRadius: 12, padding: value ? 0 : "24px 16px",
          textAlign: "center", cursor: value || uploading ? "default" : "pointer",
          background: dragging ? "#ede9fe" : "#f8fafc",
          transition: "all 0.2s", overflow: "hidden", position: "relative"
        }}
      >
        {uploading ? (
          <div style={{ padding: "20px 0", color: "#6366f1", fontSize: 13, fontWeight: 600 }}>Uploading...</div>
        ) : value ? (
          <div style={{ position: "relative", width: "100%", paddingTop: "100%" }}>
            <img src={resolveImageUrl(value) ?? ""} alt="" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onChange(""); }}
              style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.55)", color: "#fff", border: "none", borderRadius: "50%", width: 26, height: 26, cursor: "pointer", fontSize: 14, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" }}
            >✕</button>
            <button
              type="button"
              onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}
              style={{ position: "absolute", bottom: 8, right: 8, background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", borderRadius: 8, padding: "5px 10px", cursor: "pointer", fontSize: 11, fontWeight: 600 }}
            >Change</button>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📸</div>
            <div style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>Drag & drop profile image</div>
            <div style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 4 }}>or click to browse</div>
          </>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ''; }} />
    </div>
  );
}

function AuthorsPage() {
  const router = useRouter();
  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  // Form State
  const [editAuthor, setEditAuthor] = useState<Author | null>(null);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [profileImg, setProfileImg] = useState("");
  const [socialLinks, setSocialLinks] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modals
  const [delConfirm, setDelConfirm] = useState<Author | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await apiFetch(`${API_BASE_URL}/blogs/authors`);
    if (res.ok) {
      setAuthors(await res.json());
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setEditAuthor(null);
    setName("");
    setBio("");
    setProfileImg("");
    setSocialLinks("");
    setIsActive(true);
  };

  const openEdit = (a: Author) => {
    setEditAuthor(a);
    setName(a.name);
    setBio(a.bio ?? "");
    setProfileImg(a.profile_image ?? "");
    setSocialLinks(a.social_links ?? "");
    setIsActive(a.is_active);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const saveAuthor = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const body = {
      name: name.trim(),
      bio: bio || null,
      profile_image: profileImg || null,
      social_links: socialLinks || null,
      is_active: isActive
    };
    const url = editAuthor ? `${API_BASE_URL}/blogs/authors/${editAuthor.id}` : `${API_BASE_URL}/blogs/authors`;
    const method = editAuthor ? "PUT" : "POST";
    
    await apiFetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setSaving(false);
    resetForm();
    load();
  };

  const doDelete = async () => {
    if (!delConfirm) return;
    await apiFetch(`${API_BASE_URL}/blogs/authors/${delConfirm.id}`, { method: "DELETE" });
    setDelConfirm(null);
    // If we're editing the one we just deleted, reset
    if (editAuthor?.id === delConfirm.id) resetForm();
    load();
  };

  // Pagination Logic
  const totalPages = Math.ceil(authors.length / itemsPerPage);
  const currentAuthors = authors.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <div style={{ padding: "28px 36px", minHeight: "100vh" }}>
      <style>{`
        .auth-row { transition: background 0.1s; }
        .auth-row:hover { background: #f8fafc !important; }
        .auth-action { border: none; cursor: pointer; border-radius: 6px; padding: 5px 12px; font-size: 12px; font-weight: 500; transition: opacity 0.15s; }
        .auth-action:hover { opacity: 0.8; }
        input:focus, textarea:focus { outline: none !important; border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.1) !important; }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <button onClick={() => router.push("/admin/blogs")} style={{ background: "none", border: "none", cursor: "pointer", color: "#6366f1", fontSize: 13, fontWeight: 600, padding: 0, marginBottom: 6 }}>← Back to Blogs</button>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", margin: 0 }}>Authors Manager</h1>
        <p style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>Manage blog authors and their profiles</p>
      </div>

      <div style={{ display: "flex", gap: "24px", alignItems: "flex-start", flexWrap: "wrap" }}>
        
        {/* Left Side: Form Card */}
        <div style={{ flex: "1 1 350px", maxWidth: "400px", background: "#fff", borderRadius: 16, padding: "24px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)", border: "1px solid #f1f5f9", position: "sticky", top: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
              {editAuthor ? "Edit Author" : "Add New Author"}
            </h3>
            {editAuthor && (
              <button onClick={resetForm} style={{ background: "none", border: "none", color: "#64748b", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Cancel Edit</button>
            )}
          </div>

          <div style={{ marginBottom: 16 }}>
            <FloatingInput label="Full Name *" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          
          <div style={{ marginBottom: 16 }}>
            <FloatingInput label="Bio" value={bio} onChange={e => setBio(e.target.value)} isTextArea />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Profile Image</label>
            <ProfileImagePicker value={profileImg} onChange={setProfileImg} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <FloatingInput label="Social Links (Optional)" value={socialLinks} onChange={e => setSocialLinks(e.target.value)} />
            <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 4, marginLeft: 4 }}>e.g. Twitter/LinkedIn URL</p>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#475569", marginBottom: 20, cursor: "pointer" }}>
            <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} /> Active Profile
          </label>

          <button 
            onClick={saveAuthor} 
            disabled={saving || !name.trim()} 
            style={{ width: "100%", background: "#6366f1", color: "#fff", border: "none", borderRadius: 8, padding: "12px", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: (!name.trim() || saving) ? 0.6 : 1, transition: "background 0.2s" }}
          >
            {saving ? "Saving..." : editAuthor ? "Update Author" : "Add Author"}
          </button>
        </div>

        {/* Right Side: List Card */}
        <div style={{ flex: "2 1 600px", background: "#fff", borderRadius: 16, boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)", border: "1px solid #f1f5f9", overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "50px 2fr 3fr 80px 140px", gap: 12, padding: "14px 20px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
            {["Avatar", "Name", "Bio", "Posts", "Actions"].map(h => (
              <span key={h} style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</span>
            ))}
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>Loading...</div>
          ) : authors.length === 0 ? (
            <div style={{ padding: 60, textAlign: "center" }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>👥</div>
              <div style={{ color: "#64748b", fontWeight: 500 }}>No authors yet.</div>
            </div>
          ) : (
            <div>
              {currentAuthors.map((a, i) => (
                <div key={a.id} className="auth-row" style={{ display: "grid", gridTemplateColumns: "50px 2fr 3fr 80px 140px", gap: 12, padding: "12px 20px", borderBottom: i < currentAuthors.length - 1 ? "1px solid #f1f5f9" : "none", alignItems: "center", background: "#fff" }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#e2e8f0", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#94a3b8", fontWeight: 700 }}>
                    {a.profile_image ? (
                      <img src={resolveImageUrl(a.profile_image) ?? ""} alt={a.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.currentTarget.style.display = "none"; }} />
                    ) : (
                      a.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: "#0f172a", fontSize: 13.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</div>
                    {!a.is_active && <span style={{ fontSize: 10, color: "#ef4444", fontWeight: 600 }}>Inactive</span>}
                  </div>
                  
                  <div style={{ fontSize: 12.5, color: "#64748b", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {a.bio || "—"}
                  </div>
                  
                  <div style={{ fontSize: 13, color: "#0f172a", fontWeight: 600 }}>
                    {a.post_count}
                  </div>
                  
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="auth-action" style={{ background: "#ede9fe", color: "#6d28d9" }} onClick={() => openEdit(a)}>Edit</button>
                    <button className="auth-action" style={{ background: "#fee2e2", color: "#991b1b" }} onClick={() => setDelConfirm(a)}>✕</button>
                  </div>
                </div>
              ))}
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderTop: "1px solid #f1f5f9", background: "#fafafa" }}>
                  <div style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>
                    Showing {(page - 1) * itemsPerPage + 1} to {Math.min(page * itemsPerPage, authors.length)} of {authors.length} authors
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button 
                      onClick={() => setPage(p => Math.max(1, p - 1))} 
                      disabled={page === 1}
                      style={{ padding: "6px 12px", border: "1px solid #e2e8f0", background: page === 1 ? "#f8fafc" : "#fff", color: page === 1 ? "#94a3b8" : "#0f172a", borderRadius: 6, cursor: page === 1 ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600 }}
                    >
                      Prev
                    </button>
                    <button 
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                      disabled={page === totalPages}
                      style={{ padding: "6px 12px", border: "1px solid #e2e8f0", background: page === totalPages ? "#f8fafc" : "#fff", color: page === totalPages ? "#94a3b8" : "#0f172a", borderRadius: 6, cursor: page === totalPages ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600 }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {delConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: "28px 24px", maxWidth: 380, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.18)" }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>⚠️</div>
            <h3 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 700 }}>Delete Author?</h3>
            <p style={{ fontSize: 13.5, color: "#64748b", margin: "0 0 24px" }}>
              Are you sure you want to delete the author "<strong>{delConfirm.name}</strong>"? This action cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setDelConfirm(null)} style={{ border: "1.5px solid #e2e8f0", background: "#fff", borderRadius: 8, padding: "9px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              <button onClick={doDelete} style={{ background: "#ef4444", color: "#fff", border: "none", borderRadius: 8, padding: "9px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BlogAuthorsPageWrapper() {
  return <AdminProvider><AuthorsPage /></AdminProvider>;
}
