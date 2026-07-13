"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "../../components/ToastProvider";
import { API_BASE_URL } from "@/lib/config";
import { apiFetch } from "@/lib/apiFetch";

const BACKEND_BASE = API_BASE_URL.replace("/api", "");

/* ─── Floating Label Input ─── */
function FloatInput({ id, label, value, onChange, type = "text", as: As = "input", rows = 3 }: any) {
  const [focused, setFocused] = useState(false);
  const filled = focused || (value && value.length > 0);
  const base: React.CSSProperties = {
    width: "100%", padding: "22px 14px 8px",
    border: `1.5px solid ${focused ? "#6366f1" : "#e2e8f0"}`,
    borderRadius: 10, fontSize: 14, outline: "none",
    background: "#fff", transition: "border 0.2s",
    fontFamily: "inherit", resize: As === "textarea" ? "vertical" : undefined,
    minHeight: As === "textarea" ? 90 : undefined,
  };
  return (
    <div style={{ position: "relative", flex: 1 }}>
      {React.createElement(As, {
        id, value, type, rows,
        onChange: (e: any) => onChange(e.target.value),
        onFocus: () => setFocused(true),
        onBlur: () => setFocused(false),
        style: base,
      })}
      <label htmlFor={id} style={{
        position: "absolute", left: 14,
        top: filled ? 6 : "50%",
        transform: As === "textarea" ? (filled ? "none" : "translateY(60%)") : (filled ? "none" : "translateY(-50%)"),
        fontSize: filled ? 10 : 14, color: filled ? "#6366f1" : "#94a3b8",
        pointerEvents: "none", transition: "all 0.18s", fontWeight: filled ? 700 : 400,
        letterSpacing: filled ? 0.3 : 0,
      }}>{label}</label>
    </div>
  );
}

const EMPTY = { name: "", designation: "", bio: "", video_url: "", order_index: 0, is_active: true };

export default function LeadershipManager() {
  const { showToast } = useToast();
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<any>({ ...EMPTY });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/leadership`);
      const data = await res.json();
      setMembers(Array.isArray(data) ? data : []);
    } catch { showToast("Failed to load data", "error"); }
    finally { setLoading(false); }
  }, [showToast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openNew = () => {
    setEditId(null);
    setForm({ ...EMPTY });
    setImageFile(null);
    setImagePreview("");
    setModalOpen(true);
  };

  const openEdit = (m: any) => {
    setEditId(m.id);
    setForm({
      name: m.name || "", designation: m.designation || "",
      bio: m.bio || "", video_url: m.video_url || "",
      order_index: m.order_index || 0, is_active: m.is_active ?? true,
    });
    setImageFile(null);
    setImagePreview(m.image_url ? (m.image_url.startsWith("http") ? m.image_url : `${BACKEND_BASE}${m.image_url}`) : "");
    setModalOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const save = async () => {
    if (!form.name.trim()) { showToast("Name is required", "error"); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("name", form.name);
      fd.append("designation", form.designation || "");
      fd.append("bio", form.bio || "");
      fd.append("video_url", form.video_url || "");
      fd.append("order_index", String(form.order_index || 0));
      fd.append("is_active", String(form.is_active));
      if (imageFile) fd.append("image", imageFile);

      const url = editId ? `${API_BASE_URL}/leadership/${editId}` : `${API_BASE_URL}/leadership`;
      const method = editId ? "PUT" : "POST";
      const res = await apiFetch(url, { method, body: fd });
      if (!res.ok) throw new Error();
      showToast(editId ? "Member updated!" : "Member added!", "success");
      setModalOpen(false);
      fetchAll();
    } catch { showToast("Error saving member", "error"); }
    finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await apiFetch(`${API_BASE_URL}/leadership/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      showToast("Deleted!", "success");
      fetchAll();
    } catch { showToast("Delete failed", "error"); }
    finally { setDeleteTarget(null); }
  };

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif", padding: "32px 28px" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", margin: "0 0 4px", letterSpacing: "-0.5px" }}>
            Leadership Team
          </h1>
          <p style={{ color: "#64748b", margin: 0, fontSize: 13 }}>
            {members.length} member{members.length !== 1 ? "s" : ""} • Shown on homepage
          </p>
        </div>
        <button onClick={openNew} style={{
          background: "linear-gradient(135deg,#6366f1,#0ea5e9)", color: "#fff",
          padding: "10px 22px", borderRadius: 10, border: "none",
          fontWeight: 700, fontSize: 14, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 8,
          boxShadow: "0 4px 14px rgba(99,102,241,0.3)",
        }}>
          + Add Member
        </button>
      </div>

      {/* Card Grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>Loading…</div>
      ) : members.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>👥</div>
          <p style={{ margin: 0, fontWeight: 600 }}>No members yet. Add your first leader!</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
          {members.map(m => {
            const imgSrc = m.image_url
              ? (m.image_url.startsWith("http") ? m.image_url : `${BACKEND_BASE}${m.image_url}`)
              : null;
            return (
              <div key={m.id} style={{
                background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0",
                overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                transition: "box-shadow 0.2s",
              }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 8px 30px rgba(0,0,0,0.12)")}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.06)")}
              >
                <div style={{ height: 180, background: "#f1f5f9", position: "relative", overflow: "hidden" }}>
                  {imgSrc ? (
                    <img src={imgSrc} alt={m.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{
                      width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
                      background: "linear-gradient(135deg,#6366f1,#0ea5e9)", fontSize: 48, color: "#fff",
                    }}>
                      {m.name?.[0]?.toUpperCase() || "L"}
                    </div>
                  )}
                  <div style={{
                    position: "absolute", top: 10, right: 10,
                    background: m.is_active ? "#22c55e" : "#94a3b8",
                    color: "#fff", fontSize: 10, fontWeight: 700,
                    padding: "3px 8px", borderRadius: 20, letterSpacing: 0.5,
                  }}>
                    {m.is_active ? "ACTIVE" : "HIDDEN"}
                  </div>
                </div>
                <div style={{ padding: "16px 18px" }}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: "#0f172a", marginBottom: 2 }}>{m.name}</div>
                  {m.designation && (
                    <div style={{ fontSize: 12, color: "#6366f1", fontWeight: 700, marginBottom: 8 }}>{m.designation}</div>
                  )}
                  {m.bio && (
                    <p style={{
                      fontSize: 12, color: "#64748b", margin: "0 0 12px", lineHeight: 1.5,
                      overflow: "hidden", display: "-webkit-box",
                      WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any,
                    }}>{m.bio}</p>
                  )}
                  {m.video_url && (
                    <div style={{ fontSize: 11, color: "#0ea5e9", fontWeight: 600, marginBottom: 10 }}>
                      🎬 Video linked
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => openEdit(m)} style={{
                      flex: 1, padding: "8px", borderRadius: 8, border: "1.5px solid #e2e8f0",
                      background: "#fff", color: "#475569", fontWeight: 600, fontSize: 12, cursor: "pointer",
                    }}>Edit</button>
                    <button onClick={() => setDeleteTarget(m)} style={{
                      padding: "8px 14px", borderRadius: 8, border: "none",
                      background: "#fef2f2", color: "#ef4444", fontWeight: 600, fontSize: 12, cursor: "pointer",
                    }}>Delete</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD/EDIT MODAL */}
      {modalOpen && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)",
          zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
        }}>
          <div style={{
            background: "#fff", borderRadius: 20, width: "100%", maxWidth: 600,
            maxHeight: "92vh", overflowY: "auto", boxShadow: "0 40px 100px rgba(0,0,0,0.3)",
          }}>
            <div style={{ padding: "24px 28px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", margin: "0 0 4px" }}>
                  {editId ? "Edit Member" : "Add Member"}
                </h2>
                <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
                  {editId ? "Update leadership team member details." : "Add a new member to the leadership team."}
                </p>
              </div>
              <button onClick={() => setModalOpen(false)} style={{
                background: "#f1f5f9", border: "none", width: 36, height: 36,
                borderRadius: 8, cursor: "pointer", fontSize: 18, color: "#64748b",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>✕</button>
            </div>

            <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Image Upload */}
              <div style={{
                border: "2px dashed #e2e8f0", borderRadius: 12, padding: 20,
                display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
                cursor: "pointer", background: "#f8fafc",
              }} onClick={() => fileRef.current?.click()}>
                {imagePreview ? (
                  <img src={imagePreview} alt="preview"
                    style={{ width: 100, height: 100, objectFit: "cover", borderRadius: 50 }} />
                ) : (
                  <div style={{
                    width: 80, height: 80, borderRadius: 50, background: "#e2e8f0",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32,
                  }}>👤</div>
                )}
                <span style={{ fontSize: 13, color: "#6366f1", fontWeight: 600 }}>
                  {imagePreview ? "Change Photo" : "Upload Photo"}
                </span>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
                  onChange={handleImageChange} />
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <FloatInput id="lt-name" label="Full Name *" value={form.name}
                  onChange={(v: string) => setForm((f: any) => ({ ...f, name: v }))} />
                <FloatInput id="lt-desig" label="Designation / Role" value={form.designation}
                  onChange={(v: string) => setForm((f: any) => ({ ...f, designation: v }))} />
              </div>

              <FloatInput id="lt-bio" label="Short Bio" value={form.bio} as="textarea" rows={3}
                onChange={(v: string) => setForm((f: any) => ({ ...f, bio: v }))} />

              <FloatInput id="lt-video" label="Intro Video URL (YouTube / Vimeo)" value={form.video_url}
                onChange={(v: string) => setForm((f: any) => ({ ...f, video_url: v }))} />

              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <FloatInput id="lt-order" label="Display Order" type="number" value={String(form.order_index)}
                  onChange={(v: string) => setForm((f: any) => ({ ...f, order_index: parseInt(v) || 0 }))} />
                <label style={{
                  display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
                  fontSize: 14, fontWeight: 600, color: "#0f172a", whiteSpace: "nowrap",
                }}>
                  <div style={{
                    width: 44, height: 24, borderRadius: 12,
                    background: form.is_active ? "#22c55e" : "#cbd5e1",
                    position: "relative", transition: "background 0.2s",
                  }} onClick={() => setForm((f: any) => ({ ...f, is_active: !f.is_active }))}>
                    <div style={{
                      position: "absolute", top: 3, left: form.is_active ? 22 : 3,
                      width: 18, height: 18, borderRadius: 9, background: "#fff",
                      transition: "left 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
                    }} />
                  </div>
                  Active
                </label>
              </div>
            </div>

            <div style={{ padding: "0 28px 24px", display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={() => setModalOpen(false)} style={{
                padding: "10px 22px", borderRadius: 9, border: "1.5px solid #e2e8f0",
                background: "#fff", color: "#475569", fontWeight: 600, fontSize: 14, cursor: "pointer",
              }}>Cancel</button>
              <button onClick={save} disabled={saving} style={{
                padding: "10px 28px", borderRadius: 9, border: "none",
                background: saving ? "#a5b4fc" : "linear-gradient(135deg,#6366f1,#0ea5e9)",
                color: "#fff", fontWeight: 700, fontSize: 14,
                cursor: saving ? "not-allowed" : "pointer",
                boxShadow: saving ? "none" : "0 4px 14px rgba(99,102,241,0.35)",
              }}>
                {saving ? "Saving…" : editId ? "Update Member" : "Add Member"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM */}
      {deleteTarget && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)",
          zIndex: 1001, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            background: "#fff", borderRadius: 16, padding: "28px 32px", maxWidth: 400, width: "100%",
            boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
          }}>
            <h3 style={{ margin: "0 0 8px", color: "#0f172a", fontSize: 17, fontWeight: 800 }}>Delete Member?</h3>
            <p style={{ margin: "0 0 20px", color: "#64748b", fontSize: 14 }}>
              This will permanently delete <strong>{deleteTarget.name}</strong>. This action cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setDeleteTarget(null)} style={{
                padding: "9px 20px", borderRadius: 8, border: "1.5px solid #e2e8f0",
                background: "#fff", color: "#475569", fontWeight: 600, fontSize: 14, cursor: "pointer",
              }}>Cancel</button>
              <button onClick={confirmDelete} style={{
                padding: "9px 20px", borderRadius: 8, border: "none",
                background: "#ef4444", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer",
              }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
