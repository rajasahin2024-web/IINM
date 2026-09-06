"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { useToast } from "../../components/ToastProvider";
import { Icon } from "../../icons";
import { API_BASE_URL, BACKEND_BASE_URL } from "@/lib/config";
import { apiFetch } from "@/lib/apiFetch";

// Dynamically import RichEditor to avoid SSR issues with TinyMCE
const RichEditor = dynamic(() => import("@/components/RichEditor"), {
  ssr: false,
  loading: () => (
    <div style={{ height: 350, display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", borderRadius: 8, border: "1px dashed #cbd5e1", color: "#64748b" }}>
      Loading TinyMCE Editor...
    </div>
  ),
});

export interface NoticeItem {
  id: number;
  title: string;
  notice_no: string | null;
  notice_date: string | null;
  category: string;
  description: string | null;
  cover_image: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  is_active: boolean;
  is_pinned: boolean;
  created_at: string | null;
  updated_at: string | null;
}

const CATEGORIES = ["General", "Academic", "Admission", "Examinations", "Events", "Holiday"];

function getCategoryColor(cat: string) {
  switch (cat?.toLowerCase()) {
    case "academic":
      return { bg: "#f5f3ff", text: "#7c3aed", border: "#ddd6fe" };
    case "admission":
      return { bg: "#ecfdf5", text: "#059669", border: "#a7f3d0" };
    case "examinations":
    case "exam":
      return { bg: "#fef2f2", text: "#dc2626", border: "#fecaca" };
    case "events":
    case "event":
      return { bg: "#eff6ff", text: "#2563eb", border: "#bfdbfe" };
    case "holiday":
      return { bg: "#fffbeb", text: "#d97706", border: "#fde68a" };
    default:
      return { bg: "#f1f5f9", text: "#475569", border: "#e2e8f0" };
  }
}

export default function NoticeManager() {
  const { showToast } = useToast();
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal / Drawer state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState<NoticeItem | null>(null);
  const [saving, setSaving] = useState(false);

  // Form states
  const [title, setTitle] = useState("");
  const [noticeNo, setNoticeNo] = useState("");
  const [noticeDate, setNoticeDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState("General");
  const [customCategory, setCustomCategory] = useState("");
  const [descriptionHtml, setDescriptionHtml] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isPinned, setIsPinned] = useState(false);

  // File uploads
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string>("");
  const [removeCoverImage, setRemoveCoverImage] = useState(false);

  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [existingAttachmentName, setExistingAttachmentName] = useState<string>("");
  const [existingAttachmentUrl, setExistingAttachmentUrl] = useState<string>("");
  const [removeAttachment, setRemoveAttachment] = useState(false);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<NoticeItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  // Fetch notices from backend
  const fetchNotices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append("q", search.trim());
      if (categoryFilter !== "all") params.append("category", categoryFilter);
      if (statusFilter !== "all") params.append("status", statusFilter);

      const res = await apiFetch(`${API_BASE_URL}/notices?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load notices");
      const data = await res.json();
      setNotices(Array.isArray(data) ? data : []);
    } catch {
      showToast("Failed to load notices", "error");
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, statusFilter, showToast]);

  useEffect(() => {
    fetchNotices();
  }, [fetchNotices]);

  // Open Add modal
  const handleOpenAdd = () => {
    setEditingNotice(null);
    setTitle("");
    setNoticeNo("");
    setNoticeDate(new Date().toISOString().slice(0, 10));
    setCategory("General");
    setCustomCategory("");
    setDescriptionHtml("");
    setIsActive(true);
    setIsPinned(false);

    setCoverImageFile(null);
    setCoverImagePreview("");
    setRemoveCoverImage(false);

    setAttachmentFile(null);
    setExistingAttachmentName("");
    setExistingAttachmentUrl("");
    setRemoveAttachment(false);

    setModalOpen(true);
  };

  // Open Edit modal
  const handleOpenEdit = (n: NoticeItem) => {
    setEditingNotice(n);
    setTitle(n.title || "");
    setNoticeNo(n.notice_no || "");
    setNoticeDate(n.notice_date ? n.notice_date.slice(0, 10) : new Date().toISOString().slice(0, 10));

    if (CATEGORIES.includes(n.category)) {
      setCategory(n.category);
      setCustomCategory("");
    } else {
      setCategory("Custom");
      setCustomCategory(n.category || "");
    }

    setDescriptionHtml(n.description || "");
    setIsActive(n.is_active);
    setIsPinned(n.is_pinned);

    setCoverImageFile(null);
    setCoverImagePreview(n.cover_image ? (n.cover_image.startsWith("http") ? n.cover_image : `${BACKEND_BASE_URL}${n.cover_image}`) : "");
    setRemoveCoverImage(false);

    setAttachmentFile(null);
    setExistingAttachmentName(n.attachment_name || "");
    setExistingAttachmentUrl(n.attachment_url ? (n.attachment_url.startsWith("http") ? n.attachment_url : `${BACKEND_BASE_URL}${n.attachment_url}`) : "");
    setRemoveAttachment(false);

    setModalOpen(true);
  };

  // Toggle active / draft status
  const handleToggleActive = async (id: number) => {
    try {
      const res = await apiFetch(`${API_BASE_URL}/notices/${id}/toggle-active`, {
        method: "PATCH",
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setNotices((prev) =>
        prev.map((item) => (item.id === id ? { ...item, is_active: updated.is_active } : item))
      );
      showToast(updated.is_active ? "Notice published!" : "Notice set to draft.", "success");
    } catch {
      showToast("Failed to update status", "error");
    }
  };

  // Toggle pinned status
  const handleTogglePinned = async (id: number) => {
    try {
      const res = await apiFetch(`${API_BASE_URL}/notices/${id}/toggle-pinned`, {
        method: "PATCH",
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setNotices((prev) =>
        prev.map((item) => (item.id === id ? { ...item, is_pinned: updated.is_pinned } : item))
      );
      showToast(updated.is_pinned ? "Notice pinned to top!" : "Notice unpinned.", "success");
    } catch {
      showToast("Failed to toggle pin", "error");
    }
  };

  // Delete notice
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/notices/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      setNotices((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      showToast("Notice deleted successfully", "success");
      setDeleteTarget(null);
    } catch {
      showToast("Failed to delete notice", "error");
    } finally {
      setDeleting(false);
    }
  };

  // Copy shareable public link
  const handleCopyLink = (id: number) => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/notice?id=${id}`;
    navigator.clipboard.writeText(url);
    showToast("Shareable link copied to clipboard!", "success");
  };

  // Save / Update notice
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast("Please enter a notice title", "error");
      return;
    }

    const finalCategory = category === "Custom" ? customCategory.trim() || "General" : category;

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("title", title.trim());
      if (noticeNo.trim()) fd.append("notice_no", noticeNo.trim());
      fd.append("notice_date", noticeDate);
      fd.append("category", finalCategory);
      fd.append("description", descriptionHtml);
      fd.append("is_active", String(isActive));
      fd.append("is_pinned", String(isPinned));

      if (coverImageFile) {
        fd.append("cover_image", coverImageFile);
      }
      if (attachmentFile) {
        fd.append("attachment", attachmentFile);
      }

      let res;
      if (editingNotice) {
        fd.append("remove_cover_image", String(removeCoverImage));
        fd.append("remove_attachment", String(removeAttachment));

        res = await apiFetch(`${API_BASE_URL}/notices/${editingNotice.id}`, {
          method: "PUT",
          body: fd,
        });
      } else {
        res = await apiFetch(`${API_BASE_URL}/notices`, {
          method: "POST",
          body: fd,
        });
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to save notice");
      }

      const savedNotice: NoticeItem = await res.json();
      showToast(editingNotice ? "Notice updated successfully!" : "Notice created successfully!", "success");

      setModalOpen(false);
      fetchNotices();
    } catch (err: any) {
      showToast(err.message || "Failed to save notice", "error");
    } finally {
      setSaving(false);
    }
  };

  const totalCount = notices.length;
  const activeCount = notices.filter((n) => n.is_active).length;
  const pinnedCount = notices.filter((n) => n.is_pinned).length;

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "28px 36px" }}>
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#64748b", marginBottom: 6 }}>
            <span>Masters</span>
            <span>/</span>
            <span style={{ color: "#0f172a", fontWeight: 600 }}>Notices</span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ display: "inline-flex", background: "#fee2e2", color: "#e63946", borderRadius: 8, padding: 6 }}>
              <Icon name="bell" size={20} />
            </span>
            Notice Management
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "#64748b" }}>
            Publish official announcements, academic schedules, exam circulars, and notifications with rich content.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          style={{
            background: "linear-gradient(135deg, #e63946 0%, #d62828 100%)",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            padding: "11px 22px",
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            boxShadow: "0 4px 14px rgba(230, 57, 70, 0.28)",
            transition: "transform 0.15s ease, box-shadow 0.15s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-1px)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
        >
          <Icon name="plus" size={16} />
          Create New Notice
        </button>
      </div>

      {/* Metric Quick Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "16px 20px" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>Total Notices</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", marginTop: 4 }}>{totalCount}</div>
        </div>
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "16px 20px" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#059669", textTransform: "uppercase", letterSpacing: 0.5 }}>Active / Published</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#059669", marginTop: 4 }}>{activeCount}</div>
        </div>
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "16px 20px" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#e63946", textTransform: "uppercase", letterSpacing: 0.5 }}>Pinned / Urgent</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#e63946", marginTop: 4 }}>{pinnedCount}</div>
        </div>
      </div>

      {/* Filter / Search Toolbar */}
      <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 18px", marginBottom: 20, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        {/* Search */}
        <div style={{ flex: 1, minWidth: 240, position: "relative" }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}>
            <Icon name="search" size={16} />
          </span>
          <input
            type="text"
            placeholder="Search notices by title, ref no, or content..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "9px 12px 9px 38px",
              borderRadius: 8,
              border: "1.5px solid #e2e8f0",
              fontSize: 13.5,
              outline: "none",
              color: "#0f172a",
              background: "#f8fafc",
            }}
          />
        </div>

        {/* Category Filter */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>Category:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: "1.5px solid #e2e8f0",
              background: "#fff",
              fontSize: 13,
              fontWeight: 600,
              color: "#334155",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: "1.5px solid #e2e8f0",
              background: "#fff",
              fontSize: 13,
              fontWeight: 600,
              color: "#334155",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="draft">Draft Only</option>
            <option value="pinned">Pinned Only</option>
          </select>
        </div>
      </div>

      {/* Notice List Table / Cards */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "80px 20px", background: "#ffffff", borderRadius: 12, border: "1px solid #e2e8f0", color: "#64748b" }}>
          <div style={{ display: "inline-block", width: 24, height: 24, border: "3px solid #cbd5e1", borderTopColor: "#e63946", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <p style={{ marginTop: 12, fontWeight: 600 }}>Loading notices...</p>
        </div>
      ) : notices.length === 0 ? (
        <div style={{ textAlign: "center", padding: "64px 20px", background: "#ffffff", borderRadius: 12, border: "1px solid #e2e8f0", color: "#64748b" }}>
          <div style={{ fontSize: 42, marginBottom: 8 }}>📢</div>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: "#0f172a", margin: "0 0 6px" }}>No Notices Found</h3>
          <p style={{ margin: "0 0 16px", fontSize: 13.5, color: "#64748b" }}>
            {search || categoryFilter !== "all" || statusFilter !== "all" ? "Try adjusting your search filters." : "Create your first notice to publish on the website."}
          </p>
          <button
            onClick={handleOpenAdd}
            style={{
              background: "#e63946",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "9px 18px",
              fontSize: 13.5,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            + Add Notice
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {notices.map((n) => {
            const catColors = getCategoryColor(n.category);
            const dateStr = n.notice_date
              ? new Date(n.notice_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
              : "—";

            return (
              <div
                key={n.id}
                style={{
                  background: "#ffffff",
                  border: n.is_pinned ? "1.5px solid #fca5a5" : "1px solid #e2e8f0",
                  borderRadius: 12,
                  padding: "18px 22px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 20,
                  boxShadow: n.is_pinned ? "0 4px 16px rgba(230, 57, 70, 0.08)" : "0 2px 6px rgba(0,0,0,0.02)",
                  transition: "border-color 0.15s, box-shadow 0.15s",
                }}
              >
                {/* Left Side: Date, Tag, Title, Ref, Media */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 18, flex: 1 }}>
                  {/* Date badge */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 64,
                      height: 64,
                      background: n.is_pinned ? "#fee2e2" : "#f8fafc",
                      border: `1px solid ${n.is_pinned ? "#fca5a5" : "#e2e8f0"}`,
                      borderRadius: 10,
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 700, color: n.is_pinned ? "#e63946" : "#64748b", textTransform: "uppercase" }}>
                      {n.notice_date ? new Date(n.notice_date).toLocaleDateString("en-IN", { month: "short" }) : "—"}
                    </span>
                    <span style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", lineHeight: 1.1 }}>
                      {n.notice_date ? new Date(n.notice_date).getDate() : "—"}
                    </span>
                    <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600 }}>
                      {n.notice_date ? new Date(n.notice_date).getFullYear() : ""}
                    </span>
                  </div>

                  {/* Text details */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                      {/* Pinned pill */}
                      {n.is_pinned && (
                        <span
                          style={{
                            background: "#fee2e2",
                            color: "#e63946",
                            fontSize: 11,
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: 6,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          📌 URGENT / PINNED
                        </span>
                      )}

                      {/* Category Pill */}
                      <span
                        style={{
                          background: catColors.bg,
                          color: catColors.text,
                          border: `1px solid ${catColors.border}`,
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 6,
                        }}
                      >
                        {n.category}
                      </span>

                      {/* Notice No */}
                      {n.notice_no && (
                        <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600, background: "#f1f5f9", padding: "2px 6px", borderRadius: 4 }}>
                          Ref: {n.notice_no}
                        </span>
                      )}

                      {/* Status indicator */}
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: n.is_active ? "#10b981" : "#94a3b8",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: n.is_active ? "#10b981" : "#cbd5e1" }} />
                        {n.is_active ? "PUBLISHED" : "DRAFT"}
                      </span>
                    </div>

                    {/* Title */}
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 4, lineHeight: 1.4 }}>
                      {n.title}
                    </div>

                    {/* Media Attachments badges */}
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4, fontSize: 12, color: "#64748b" }}>
                      {n.cover_image && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#0284c7" }}>
                          <Icon name="image" size={13} /> Cover Image
                        </span>
                      )}
                      {n.attachment_url && (
                        <a
                          href={n.attachment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#e63946", textDecoration: "none", fontWeight: 600 }}
                        >
                          <Icon name="download" size={13} /> {n.attachment_name || "Attachment Document"}
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Side: Quick Action Buttons */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  {/* Pin Toggle Button */}
                  <button
                    onClick={() => handleTogglePinned(n.id)}
                    title={n.is_pinned ? "Unpin notice" : "Pin notice to top"}
                    style={{
                      background: n.is_pinned ? "#fee2e2" : "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: 8,
                      padding: "7px 10px",
                      cursor: "pointer",
                      color: n.is_pinned ? "#e63946" : "#64748b",
                      fontSize: 12,
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    📌 {n.is_pinned ? "Pinned" : "Pin"}
                  </button>

                  {/* Publish Toggle Button */}
                  <button
                    onClick={() => handleToggleActive(n.id)}
                    title={n.is_active ? "Switch to draft" : "Publish notice"}
                    style={{
                      background: n.is_active ? "#ecfdf5" : "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: 8,
                      padding: "7px 10px",
                      cursor: "pointer",
                      color: n.is_active ? "#059669" : "#64748b",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {n.is_active ? "Active" : "Draft"}
                  </button>

                  {/* Copy Public Link */}
                  <button
                    onClick={() => handleCopyLink(n.id)}
                    title="Copy direct public link (/notice?id=...)"
                    style={{
                      background: "#f1f5f9",
                      border: "1px solid #e2e8f0",
                      borderRadius: 8,
                      padding: "7px 10px",
                      cursor: "pointer",
                      color: "#334155",
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    <Icon name="copy" size={13} />
                    Copy Link
                  </button>

                  {/* Public Preview Button */}
                  <a
                    href={`/notice?id=${n.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="View public notice card & modal"
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: 8,
                      padding: "7px 10px",
                      cursor: "pointer",
                      color: "#334155",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 12,
                      fontWeight: 600,
                      textDecoration: "none",
                    }}
                  >
                    <Icon name="eye" size={13} />
                  </a>

                  {/* Edit Button */}
                  <button
                    onClick={() => handleOpenEdit(n)}
                    style={{
                      background: "#0a1628",
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      padding: "7px 14px",
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Icon name="edit" size={13} /> Edit
                  </button>

                  {/* Delete Button */}
                  <button
                    onClick={() => setDeleteTarget(n)}
                    style={{
                      background: "#fff1f2",
                      color: "#e11d48",
                      border: "1px solid #fecdd3",
                      borderRadius: 8,
                      padding: "7px 10px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                    }}
                    title="Delete notice"
                  >
                    <Icon name="trash" size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT NOTICE MODAL */}
      {modalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(10, 22, 40, 0.65)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !saving) setModalOpen(false);
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 16,
              width: "100%",
              maxWidth: 960,
              maxHeight: "94vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              overflow: "hidden",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "18px 24px",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "#f8fafc",
              }}
            >
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", margin: 0 }}>
                  {editingNotice ? "Edit Notice" : "Create New Notice"}
                </h2>
                <p style={{ margin: "2px 0 0", fontSize: 13, color: "#64748b" }}>
                  Compose institutional announcements using TinyMCE rich text, images, and attachments.
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                disabled={saving}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#64748b",
                  padding: 6,
                  borderRadius: 6,
                }}
              >
                <Icon name="x" size={20} />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", flex: 1, overflowY: "auto" }}>
              <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 20 }}>
                {/* Row 1: Title & Reference Number */}
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                      Notice Title <span style={{ color: "#e63946" }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Schedule of Term-End Examinations, December 2026"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: 8,
                        border: "1.5px solid #cbd5e1",
                        fontSize: 14,
                        color: "#0f172a",
                        outline: "none",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                      Notice / Ref No. (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. IINM/EXAM/2026/04"
                      value={noticeNo}
                      onChange={(e) => setNoticeNo(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: 8,
                        border: "1.5px solid #cbd5e1",
                        fontSize: 14,
                        color: "#0f172a",
                        outline: "none",
                      }}
                    />
                  </div>
                </div>

                {/* Row 2: Notice Date, Category, Toggles */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, alignItems: "start" }}>
                  {/* Date */}
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                      Notice Date <span style={{ color: "#e63946" }}>*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={noticeDate}
                      onChange={(e) => setNoticeDate(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        borderRadius: 8,
                        border: "1.5px solid #cbd5e1",
                        fontSize: 13.5,
                        color: "#0f172a",
                        outline: "none",
                      }}
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "9.5px 12px",
                        borderRadius: 8,
                        border: "1.5px solid #cbd5e1",
                        fontSize: 13.5,
                        color: "#0f172a",
                        outline: "none",
                        background: "#fff",
                      }}
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                      <option value="Custom">+ Custom Category</option>
                    </select>
                    {category === "Custom" && (
                      <input
                        type="text"
                        placeholder="Enter category name"
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value)}
                        style={{
                          width: "100%",
                          marginTop: 8,
                          padding: "8px 12px",
                          borderRadius: 8,
                          border: "1.5px solid #cbd5e1",
                          fontSize: 13,
                        }}
                      />
                    )}
                  </div>

                  {/* Toggles (Publish & Pin) */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#334155" }}>
                      <input
                        type="checkbox"
                        checked={isPinned}
                        onChange={(e) => setIsPinned(e.target.checked)}
                        style={{ width: 16, height: 16, accentColor: "#e63946", cursor: "pointer" }}
                      />
                      📌 Pin to Top (Urgent Notice)
                    </label>

                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#334155" }}>
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                        style={{ width: 16, height: 16, accentColor: "#10b981", cursor: "pointer" }}
                      />
                      <span style={{ color: isActive ? "#059669" : "#64748b" }}>
                        {isActive ? "✓ Published Immediately" : "Draft (Hidden from public)"}
                      </span>
                    </label>
                  </div>
                </div>

                {/* Row 3: Cover Image & Attachment uploads */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  {/* Cover Image */}
                  <div style={{ border: "1px dashed #cbd5e1", borderRadius: 10, padding: 14, background: "#f8fafc" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <label style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>
                        Cover Photo / Banner (Optional)
                      </label>
                      {(coverImagePreview || coverImageFile) && (
                        <button
                          type="button"
                          onClick={() => {
                            setCoverImageFile(null);
                            setCoverImagePreview("");
                            setRemoveCoverImage(true);
                            if (coverInputRef.current) coverInputRef.current.value = "";
                          }}
                          style={{ background: "transparent", border: "none", color: "#e11d48", fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <input
                      ref={coverInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setCoverImageFile(file);
                          setCoverImagePreview(URL.createObjectURL(file));
                          setRemoveCoverImage(false);
                        }
                      }}
                    />

                    {coverImagePreview ? (
                      <div style={{ position: "relative", height: 110, borderRadius: 8, overflow: "hidden", border: "1px solid #e2e8f0" }}>
                        <img src={coverImagePreview} alt="Cover preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        <button
                          type="button"
                          onClick={() => coverInputRef.current?.click()}
                          style={{
                            position: "absolute",
                            bottom: 6,
                            right: 6,
                            background: "rgba(10,22,40,0.8)",
                            color: "#fff",
                            border: "none",
                            borderRadius: 6,
                            padding: "4px 8px",
                            fontSize: 11,
                            cursor: "pointer",
                          }}
                        >
                          Change Photo
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => coverInputRef.current?.click()}
                        style={{
                          height: 80,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          color: "#64748b",
                          fontSize: 12.5,
                        }}
                      >
                        <Icon name="image" size={22} />
                        <span style={{ marginTop: 4 }}>Click to upload cover photo</span>
                      </div>
                    )}
                  </div>

                  {/* Attachment PDF / Document */}
                  <div style={{ border: "1px dashed #cbd5e1", borderRadius: 10, padding: 14, background: "#f8fafc" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <label style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>
                        Notice PDF / Document (Optional)
                      </label>
                      {(attachmentFile || existingAttachmentName) && (
                        <button
                          type="button"
                          onClick={() => {
                            setAttachmentFile(null);
                            setExistingAttachmentName("");
                            setExistingAttachmentUrl("");
                            setRemoveAttachment(true);
                            if (docInputRef.current) docInputRef.current.value = "";
                          }}
                          style={{ background: "transparent", border: "none", color: "#e11d48", fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <input
                      ref={docInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setAttachmentFile(file);
                          setRemoveAttachment(false);
                        }
                      }}
                    />

                    {attachmentFile || existingAttachmentName ? (
                      <div
                        style={{
                          height: 80,
                          background: "#ffffff",
                          border: "1px solid #e2e8f0",
                          borderRadius: 8,
                          padding: "10px 14px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10, overflow: "hidden" }}>
                          <span style={{ color: "#e63946" }}>
                            <Icon name="file-text" size={24} />
                          </span>
                          <div style={{ overflow: "hidden" }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                              {attachmentFile ? attachmentFile.name : existingAttachmentName}
                            </div>
                            <div style={{ fontSize: 11, color: "#64748b" }}>
                              {attachmentFile ? `${(attachmentFile.size / (1024 * 1024)).toFixed(2)} MB` : "Ready to download"}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => docInputRef.current?.click()}
                          style={{
                            background: "#f1f5f9",
                            border: "1px solid #cbd5e1",
                            borderRadius: 6,
                            padding: "4px 8px",
                            fontSize: 11,
                            cursor: "pointer",
                            fontWeight: 600,
                            flexShrink: 0,
                          }}
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => docInputRef.current?.click()}
                        style={{
                          height: 80,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          color: "#64748b",
                          fontSize: 12.5,
                        }}
                      >
                        <Icon name="download" size={22} />
                        <span style={{ marginTop: 4 }}>Click to attach PDF / Circular (.pdf, .doc)</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Row 4: TinyMCE Rich Editor */}
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                    Notice Full Description & Body (TinyMCE Rich Text Editor)
                  </label>
                  <p style={{ margin: "0 0 8px", fontSize: 12, color: "#64748b" }}>
                    Include instructions, detailed tables, schedules, links, headings, or embedded photos.
                  </p>
                  <RichEditor
                    value={descriptionHtml}
                    onChange={(val: string) => setDescriptionHtml(val)}
                    placeholder="Type official notice announcement details here..."
                    minHeight={360}
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div
                style={{
                  padding: "16px 28px",
                  borderTop: "1px solid #e2e8f0",
                  background: "#f8fafc",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 12,
                }}
              >
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setModalOpen(false)}
                  style={{
                    padding: "9px 20px",
                    borderRadius: 8,
                    border: "1.5px solid #cbd5e1",
                    background: "#fff",
                    color: "#475569",
                    fontWeight: 600,
                    fontSize: 13.5,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: "9px 26px",
                    borderRadius: 8,
                    border: "none",
                    background: "#e63946",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 13.5,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  {saving ? "Saving Notice..." : editingNotice ? "Update Notice" : "Publish Notice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(10, 22, 40, 0.6)",
            backdropFilter: "blur(3px)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 14,
              padding: 24,
              maxWidth: 440,
              width: "100%",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
            }}
          >
            <h3 style={{ fontSize: 17, fontWeight: 700, color: "#0f172a", margin: "0 0 8px" }}>
              Delete Notice?
            </h3>
            <p style={{ margin: "0 0 20px", fontSize: 13.5, color: "#64748b", lineHeight: 1.5 }}>
              Are you sure you want to delete notice <strong>"{deleteTarget.title}"</strong>? This will permanently remove it from the public notice board.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "1.5px solid #cbd5e1",
                  background: "#fff",
                  color: "#475569",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                disabled={deleting}
                onClick={handleDeleteConfirm}
                style={{
                  padding: "8px 18px",
                  borderRadius: 8,
                  border: "none",
                  background: "#dc2626",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                {deleting ? "Deleting..." : "Delete Notice"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
