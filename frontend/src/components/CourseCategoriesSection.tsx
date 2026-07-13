"use client";
import React, { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/apiFetch";
import { BASE_URL } from "@/lib/config";

interface HomeCourseCategory {
  id: number;
  title: string;
  icon_url: string; // Emoji e.g. "🧠" or an image URL e.g. "/uploads/..."
  tools_text: string; // Comma-separated list e.g. "Python, PyTorch"
  tool_icons: string[]; // List of tool icon URLs e.g. ["/uploads/...", ...]
  link_url: string;
  bg_image_url?: string; // Custom abstract background image Url
  order_position: number;
  is_active: boolean;
}

function isAdminLoggedIn(): boolean {
  if (typeof window === "undefined") return false;
  const loggedIn = localStorage.getItem("iinm_is_logged_in") === "true";
  const expiry = localStorage.getItem("iinm_login_expiry");
  return loggedIn && !!expiry && Date.now() < Number(expiry);
}

// PREMIUM SHIMMERING SKELETON LOADER COMPONENT
const SkeletonLoader = () => (
  <div className="categories-grid">
    {[1, 2, 3].map((n) => (
      <div key={n} className="skeleton-card">
        <div className="skeleton-header">
          <div className="skeleton-icon shimmer" />
          <div className="skeleton-lines">
            <div className="skeleton-line shimmer width-80" />
            <div className="skeleton-line shimmer width-40" />
          </div>
        </div>
        <div className="skeleton-body">
          <div className="skeleton-line shimmer width-100" />
          <div className="skeleton-line shimmer width-60" />
        </div>
        <div className="skeleton-footer">
          <div className="skeleton-line shimmer width-30" />
          <div className="skeleton-icons">
            <div className="skeleton-circle shimmer" />
            <div className="skeleton-circle shimmer" />
          </div>
        </div>
        <style>{`
          .skeleton-card {
            background: #ffffff;
            border: 1px solid #f1f5f9;
            border-radius: 16px;
            padding: 28px;
            display: flex;
            flex-direction: column;
            gap: 20px;
            height: 220px;
            box-sizing: border-box;
            box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.02);
          }
          .skeleton-header {
            display: flex;
            align-items: center;
            gap: 16px;
          }
          .skeleton-icon {
            width: 48px;
            height: 48px;
            border-radius: 12px;
            background: #f1f5f9;
            flex-shrink: 0;
          }
          .skeleton-lines {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .skeleton-body {
            display: flex;
            flex-direction: column;
            gap: 8px;
            flex: 1;
          }
          .skeleton-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .skeleton-icons {
            display: flex;
            gap: -8px;
          }
          .skeleton-circle {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: #f1f5f9;
            border: 2px solid #ffffff;
          }
          .skeleton-line {
            height: 12px;
            background: #f1f5f9;
            border-radius: 4px;
          }
          .width-100 { width: 100%; }
          .width-80 { width: 80%; }
          .width-60 { width: 60%; }
          .width-40 { width: 40%; height: 8px; }
          .width-30 { width: 30%; }
          .shimmer {
            background: linear-gradient(
              90deg,
              #f1f5f9 25%,
              #f8fafc 50%,
              #f1f5f9 75%
            );
            background-size: 200% 100%;
            animation: loading-shimmer 1.5s infinite;
          }
          @keyframes loading-shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>
      </div>
    ))}
  </div>
);


export default function CourseCategoriesSection() {
  const [categories, setCategories] = useState<HomeCourseCategory[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Modal Editing State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<Partial<HomeCourseCategory> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [uploadingField, setUploadingIdx] = useState<"main-icon" | "tool-icon" | "bg-image" | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const endpoint = isAdminLoggedIn()
        ? "/api/settings/home-categories/all"
        : "/api/settings/home-categories";
      const res = await apiFetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (err) {
      console.error("Failed to fetch course categories", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
    setIsAdmin(isAdminLoggedIn());

    const handleStorage = () => setIsAdmin(isAdminLoggedIn());
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [fetchCategories]);

  // Handle edit trigger
  const handleEditClick = (e: React.MouseEvent, cat: HomeCourseCategory) => {
    e.preventDefault();
    e.stopPropagation();
    setEditCategory(JSON.parse(JSON.stringify(cat)));
    setIsModalOpen(true);
    setErrorMessage("");
  };

  // Handle creating new category
  const handleAddNewClick = () => {
    setEditCategory({
      title: "",
      icon_url: "🧠",
      tools_text: "",
      tool_icons: [],
      link_url: "/courses",
      bg_image_url: "",
      order_position: categories.length + 1,
      is_active: true,
    });
    setIsModalOpen(true);
    setErrorMessage("");
  };

  // Upload main icon or tool icon
  const triggerFileUpload = (field: "main-icon" | "tool-icon" | "bg-image") => {
    setUploadingIdx(field);
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 0);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingField || !editCategory) return;

    try {
      const fd = new FormData();
      fd.append("file", file);
      
      const res = await apiFetch("/api/settings/site/upload", {
        method: "POST",
        body: fd,
      });

      if (res.ok) {
        const result = await res.json();
        if (uploadingField === "main-icon") {
          setEditCategory({
            ...editCategory,
            icon_url: result.url,
          });
        } else if (uploadingField === "tool-icon") {
          const currentIcons = editCategory.tool_icons || [];
          setEditCategory({
            ...editCategory,
            tool_icons: [...currentIcons, result.url],
          });
        } else if (uploadingField === "bg-image") {
          setEditCategory({
            ...editCategory,
            bg_image_url: result.url,
          });
        }
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMessage(err.detail || "Upload failed");
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("File upload encountered a network error");
    } finally {
      setUploadingIdx(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Delete a tool icon from the array
  const handleDeleteToolIcon = (idxToDelete: number) => {
    if (!editCategory) return;
    const icons = editCategory.tool_icons || [];
    setEditCategory({
      ...editCategory,
      tool_icons: icons.filter((_, idx) => idx !== idxToDelete),
    });
  };

  // Save changes to database
  const handleSaveCategory = async () => {
    if (!editCategory || !editCategory.title) {
      setErrorMessage("Title is required");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    try {
      const isNew = !editCategory.id;
      const endpoint = isNew
        ? "/api/settings/home-categories"
        : `/api/settings/home-categories/${editCategory.id}`;
      const method = isNew ? "POST" : "PUT";

      const res = await apiFetch(endpoint, {
        method,
        body: JSON.stringify(editCategory),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setEditCategory(null);
        fetchCategories();
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMessage(err.detail || "Failed to save category card");
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("Network error saving category card");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete category entirely
  const handleDeleteCategory = async () => {
    if (!editCategory || !editCategory.id) return;
    if (!confirm("Are you sure you want to delete this category card?")) return;

    setIsSaving(true);
    setErrorMessage("");

    try {
      const res = await apiFetch(`/api/settings/home-categories/${editCategory.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setIsModalOpen(false);
        setEditCategory(null);
        fetchCategories();
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMessage(err.detail || "Failed to delete category");
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("Network error deleting category");
    } finally {
      setIsSaving(false);
    }
  };

  const getPremiumCardStyles = (idx: number) => {
    const gradientStyles = [
      {
        background: "linear-gradient(135deg, rgba(230, 57, 70, 0.04) 0%, rgba(255, 255, 255, 0.98) 100%)",
        borderColor: "rgba(230, 57, 70, 0.12)",
        glowColor: "rgba(230, 57, 70, 0.04)"
      },
      {
        background: "linear-gradient(135deg, rgba(14, 165, 233, 0.04) 0%, rgba(255, 255, 255, 0.98) 100%)",
        borderColor: "rgba(14, 165, 233, 0.12)",
        glowColor: "rgba(14, 165, 233, 0.04)"
      },
      {
        background: "linear-gradient(135deg, rgba(139, 92, 246, 0.04) 0%, rgba(255, 255, 255, 0.98) 100%)",
        borderColor: "rgba(139, 92, 246, 0.12)",
        glowColor: "rgba(139, 92, 246, 0.04)"
      },
      {
        background: "linear-gradient(135deg, rgba(16, 185, 129, 0.04) 0%, rgba(255, 255, 255, 0.98) 100%)",
        borderColor: "rgba(16, 185, 129, 0.12)",
        glowColor: "rgba(16, 185, 129, 0.04)"
      },
      {
        background: "linear-gradient(135deg, rgba(245, 158, 11, 0.04) 0%, rgba(255, 255, 255, 0.98) 100%)",
        borderColor: "rgba(245, 158, 11, 0.12)",
        glowColor: "rgba(245, 158, 11, 0.04)"
      }
    ];
    return gradientStyles[idx % gradientStyles.length];
  };

  return (
    <section className="course-categories-section">
      {/* Hidden file input for uploads */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: "none" }}
        accept="image/*"
        onChange={handleFileChange}
      />

      <div className="categories-inner">
        {/* Section Header */}
        <div className="section-header-wrap">
          <div className="badge-logo-color">
            <span>Specialized Streams</span>
          </div>
          <h2>Professional Academic Categories</h2>
          <p>
            Choose your advanced learning trajectory and build institutional competency inside state-of-the-art physical lab spaces.
          </p>
          
          {isAdmin && (
            <button onClick={handleAddNewClick} className="btn-add-category">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Academic Category
            </button>
          )}
        </div>

        {/* LOADING SKELETON OR CATEGORIES GRID */}
        {loading && categories.length === 0 ? (
          <SkeletonLoader />
        ) : (
          <div className="categories-grid">
            {categories.map((cat, idx) => {
              const isEmoji = cat.icon_url && cat.icon_url.length <= 4;
              const cardStyle = getPremiumCardStyles(idx);

              return (
                <div key={cat.id || idx} className={`category-card-wrapper ${!cat.is_active ? "inactive-card" : ""}`}>
                  <Link href={cat.link_url || "/courses"} className="category-card-link">
                    <div 
                      className="category-card"
                      style={{
                        background: cardStyle.background,
                        borderColor: cardStyle.borderColor,
                        ['--card-hover-border' as any]: cardStyle.borderColor.replace('0.12', '0.28'),
                        ['--card-hover-glow' as any]: cardStyle.glowColor,
                      }}
                    >
                      {/* Abstract Background Overlay */}
                      {cat.bg_image_url && (
                        <div 
                          className="card-abstract-bg" 
                          style={{ backgroundImage: `url(${cat.bg_image_url})` }} 
                        />
                      )}

                      {/* Top Row: Icon Badge & Admin Controls */}
                      <div className="category-card-top" style={{ position: "relative", zIndex: 1 }}>
                        <div className="category-main-icon-wrap">
                          {isEmoji ? (
                            <span className="category-emoji-icon">{cat.icon_url}</span>
                          ) : (
                            <img src={cat.icon_url} alt={cat.title} className="category-img-icon" />
                          )}
                        </div>

                        {isAdmin && (
                          <button
                            onClick={(e) => handleEditClick(e, cat)}
                            className="admin-card-edit-btn"
                            title="Edit Category"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                            </svg>
                            Edit
                          </button>
                        )}
                      </div>

                      {/* Middle: Content */}
                      <div className="category-card-body" style={{ position: "relative", zIndex: 1 }}>
                        <h3>{cat.title}</h3>
                        {cat.tools_text && (
                          <p className="tools-text-desc">{cat.tools_text}</p>
                        )}
                      </div>

                      {/* Bottom Row: Call-to-action & Peeking icons fanned beautifully */}
                      <div className="category-card-footer" style={{ position: "relative", zIndex: 1 }}>
                        <span className="explore-link-btn">
                          Explore Courses
                          <svg className="arrow-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="5" y1="12" x2="19" y2="12" />
                            <polyline points="12 5 19 12 12 19" />
                          </svg>
                        </span>

                        {/* HIGH-END OVERLAPPING FANNING ICON DECK */}
                        {cat.tool_icons && cat.tool_icons.length > 0 && (
                          <div className="corner-icon-deck">
                            {cat.tool_icons.slice(0, 3).map((iconUrl, iconIdx) => (
                              <div
                                key={iconIdx}
                                className={`deck-tool-icon deck-icon-${iconIdx + 1}`}
                                style={{
                                  backgroundImage: `url(${iconUrl})`,
                                }}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FULL SCREEN MODAL DIALOG FOR EDITING */}
      {isModalOpen && editCategory && (
        <div className="fullscreen-modal-backdrop">
          <div className="fullscreen-modal-container">
            {/* Modal Header */}
            <div className="modal-header">
              <h2>{editCategory.id ? "Edit Academic Category Card" : "Create New Academic Category"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="modal-close-btn">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="modal-body-scrollable">
              {errorMessage && <div className="modal-error-banner">{errorMessage}</div>}

              <div className="modal-form-grid">
                {/* Left Column: Core Settings */}
                <div className="modal-form-column">
                  <div className="form-group">
                    <label>Category Title *</label>
                    <input
                      type="text"
                      value={editCategory.title || ""}
                      onChange={(e) => setEditCategory({ ...editCategory, title: e.target.value })}
                      placeholder="e.g. Advanced AI & Machine Learning"
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label>Target Page Link URL</label>
                    <input
                      type="text"
                      value={editCategory.link_url || ""}
                      onChange={(e) => setEditCategory({ ...editCategory, link_url: e.target.value })}
                      placeholder="e.g. /courses/ai-machine-learning"
                      className="form-input"
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>Sort Order Position</label>
                      <input
                        type="number"
                        value={editCategory.order_position ?? 0}
                        onChange={(e) => setEditCategory({ ...editCategory, order_position: parseInt(e.target.value) || 0 })}
                        className="form-input"
                      />
                    </div>

                    <div className="form-group" style={{ flex: 1, display: "flex", alignItems: "flex-end", paddingBottom: 12 }}>
                      <label className="toggle-label-wrap">
                        <input
                          type="checkbox"
                          checked={editCategory.is_active ?? true}
                          onChange={(e) => setEditCategory({ ...editCategory, is_active: e.target.checked })}
                          className="toggle-checkbox"
                        />
                        <span className="toggle-label-text">Is Active / Visible</span>
                      </label>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Covered Tools Text</label>
                    <textarea
                      value={editCategory.tools_text || ""}
                      onChange={(e) => setEditCategory({ ...editCategory, tools_text: e.target.value })}
                      placeholder="e.g. Python, TensorFlow, PyTorch, Scikit-learn (comma separated)"
                      rows={3}
                      className="form-textarea"
                    />
                  </div>
                </div>

                {/* Right Column: Main Icon & Tool Icons Uploads */}
                <div className="modal-form-column">
                  {/* Category Main Icon Upload */}
                  <div className="form-group">
                    <label>Category Main Icon (Emoji or Uploaded Image)</label>
                    <div className="main-icon-edit-panel">
                      <div className="main-icon-preview">
                        {editCategory.icon_url && editCategory.icon_url.length <= 4 ? (
                          <span style={{ fontSize: 32 }}>{editCategory.icon_url}</span>
                        ) : editCategory.icon_url ? (
                          <img src={editCategory.icon_url} alt="Main Icon" style={{ width: 48, height: 48, objectFit: "contain" }} />
                        ) : (
                          <span style={{ fontSize: 12, color: "#475569" }}>No Icon</span>
                        )}
                      </div>
                      <div className="main-icon-controls">
                        <input
                          type="text"
                          value={editCategory.icon_url && editCategory.icon_url.length <= 4 ? editCategory.icon_url : ""}
                          onChange={(e) => setEditCategory({ ...editCategory, icon_url: e.target.value })}
                          placeholder="Type an emoji (e.g. 🧠)"
                          className="form-input"
                          style={{ maxWidth: 180, marginBottom: 8 }}
                        />
                        <button
                          type="button"
                          onClick={() => triggerFileUpload("main-icon")}
                          className="btn-upload-file"
                          disabled={uploadingField !== null}
                        >
                          {uploadingField === "main-icon" ? "Uploading..." : "Or Upload Custom SVG/Image"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Tool Icons Peeking Corner Panel */}
                  <div className="form-group">
                    <label>Corner Tool Icons (Up to 3 show beautifully in corner animation)</label>
                    <div className="tool-icons-edit-panel">
                      <div className="tool-icons-list">
                        {(editCategory.tool_icons || []).map((iconUrl, idx) => (
                          <div key={idx} className="tool-icon-edit-item">
                            <img src={iconUrl} alt="Tool Icon" />
                            <button
                              type="button"
                              onClick={() => handleDeleteToolIcon(idx)}
                              className="btn-delete-tool-icon"
                              title="Remove icon"
                            >
                              ×
                            </button>
                          </div>
                        ))}

                        <button
                          type="button"
                          onClick={() => triggerFileUpload("tool-icon")}
                          className="btn-add-tool-icon"
                          disabled={uploadingField !== null}
                          title="Upload tool icon"
                        >
                          {uploadingField === "tool-icon" ? "..." : "+"}
                        </button>
                      </div>
                      <p className="field-hint">
                        Tip: Upload transparent SVG or PNG icons for beautiful blending and floating effects!
                      </p>
                    </div>
                  </div>

                  {/* Card Background Abstract Upload */}
                  <div className="form-group" style={{ marginTop: 20 }}>
                    <label>Card Abstract Background (Subtle Overlay Pattern)</label>
                    <div className="main-icon-edit-panel">
                      <div className="main-icon-preview">
                        {editCategory.bg_image_url ? (
                          <img src={editCategory.bg_image_url} alt="Background Abstract" style={{ width: 48, height: 48, objectFit: "cover", opacity: 0.5 }} />
                        ) : (
                          <span style={{ fontSize: 12, color: "#475569" }}>None</span>
                        )}
                      </div>
                      <div className="main-icon-controls">
                        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                          <input
                            type="text"
                            value={editCategory.bg_image_url || ""}
                            onChange={(e) => setEditCategory({ ...editCategory, bg_image_url: e.target.value })}
                            placeholder="Enter image URL or select below"
                            className="form-input"
                          />
                          {editCategory.bg_image_url && (
                            <button
                              type="button"
                              onClick={() => setEditCategory({ ...editCategory, bg_image_url: "" })}
                              className="admin-card-edit-btn"
                              style={{ whiteSpace: "nowrap", padding: "0 12px" }}
                            >
                              Clear
                            </button>
                          )}
                        </div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                          <button
                            type="button"
                            onClick={() => triggerFileUpload("bg-image")}
                            className="btn-upload-file"
                            disabled={uploadingField !== null}
                            style={{ fontSize: 11, padding: "6px 10px" }}
                          >
                            {uploadingField === "bg-image" ? "Uploading..." : "Upload Custom Abstract Image"}
                          </button>
                        </div>
                        {/* Quick Presets for Beautiful Light Gradients & Vector Mesh Abstracts */}
                        <div className="abstract-presets">
                          <span className="preset-label">Institutional Presets:</span>
                          <div className="presets-list" style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                            {[
                              { name: "Mesh Grid", url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=20" },
                              { name: "Subtle Waves", url: "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=600&q=20" },
                              { name: "Digital Tech", url: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=600&q=20" }
                            ].map((preset) => (
                              <button
                                key={preset.name}
                                type="button"
                                onClick={() => setEditCategory({ ...editCategory, bg_image_url: preset.url })}
                                className="preset-btn"
                                style={{
                                  background: "rgba(255,255,255,0.06)",
                                  border: "1px solid rgba(255,255,255,0.12)",
                                  borderRadius: 4,
                                  color: "#cbd5e1",
                                  fontSize: 10,
                                  fontWeight: 600,
                                  padding: "3px 8px",
                                  cursor: "pointer",
                                  transition: "all 0.15s ease"
                                }}
                              >
                                {preset.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div className="modal-footer">
              {editCategory.id && (
                <button
                  type="button"
                  onClick={handleDeleteCategory}
                  disabled={isSaving}
                  className="btn-modal-delete"
                >
                  Delete Card
                </button>
              )}

              <div style={{ marginLeft: "auto", display: "flex", gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSaving}
                  className="btn-modal-cancel"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveCategory}
                  disabled={isSaving}
                  className="btn-modal-save"
                >
                  {isSaving ? "Saving..." : "Save Category Card"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STYLES FOR PREMIUM LIGHT/ABSTRACT AND CORNER ANIMATIONS */}
      <style>{`
        /* Section styling */
        .course-categories-section {
          background: #f8fafc; /* Pristine modern gray-white background */
          padding: 96px 48px;
          position: relative;
          overflow: hidden;
          border-bottom: 1px solid #edf2f7;
        }

        /* Subtle professional layout grids */
        .course-categories-section::before {
          content: "";
          position: absolute;
          inset: 0;
          background-image: radial-gradient(#e2e8f0 1.2px, transparent 1.2px);
          background-size: 24px 24px;
          opacity: 0.35;
          pointer-events: none;
        }

        .categories-inner {
          max-width: 1400px;
          margin: 0 auto;
          position: relative;
          z-index: 2;
        }

        /* Section Header Layout */
        .section-header-wrap {
          text-align: center;
          max-width: 720px;
          margin: 0 auto 56px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .badge-logo-color {
          display: inline-flex;
          align-items: center;
          padding: 6px 14px;
          background: rgba(230, 57, 70, 0.08);
          border: 1px solid rgba(230, 57, 70, 0.15);
          border-radius: 100px;
          color: #e63946;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1px;
          text-transform: uppercase;
          margin-bottom: 18px;
        }

        .section-header-wrap h2 {
          font-size: 34px;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.8px;
          margin: 0 0 16px;
          line-height: 1.2;
        }

        .section-header-wrap p {
          font-size: 15.5px;
          line-height: 1.6;
          color: #475569;
          margin: 0;
        }

        .btn-add-category {
          margin-top: 24px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #0f172a;
          color: #ffffff;
          border: none;
          border-radius: 8px;
          padding: 10px 18px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.1);
        }

        .btn-add-category:hover {
          background: #e63946;
          transform: translateY(-1.5px);
          box-shadow: 0 6px 16px rgba(230, 57, 70, 0.25);
        }

        /* Grid Layout */
        .categories-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(370px, 1fr));
          gap: 30px;
        }

        @media (max-width: 420px) {
          .categories-grid {
            grid-template-columns: 1fr !important;
          }
        }

        /* Card Wrapper and Structure */
        .category-card-wrapper {
          position: relative;
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          height: 100%;
        }

        .category-card-wrapper:hover {
          transform: translateY(-4px);
        }

        .inactive-card {
          opacity: 0.6;
          filter: grayscale(0.5);
        }

        .category-card-link {
          text-decoration: none;
          display: block;
          height: 100%;
        }

        .category-card {
          background: #ffffff;
          border: 1px solid #f1f5f9;
          border-radius: 16px;
          padding: 30px 28px 24px;
          height: 100%;
          display: flex;
          flex-direction: column;
          position: relative;
          box-shadow: 0 10px 30px -10px rgba(15, 23, 42, 0.03);
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          box-sizing: border-box;
          overflow: hidden;
        }

        .category-card-wrapper:hover .category-card {
          border-color: var(--card-hover-border, rgba(230, 57, 70, 0.12));
          box-shadow: 0 20px 40px -12px rgba(15, 23, 42, 0.07), 0 0 25px var(--card-hover-glow, rgba(230, 57, 70, 0.02));
        }

        .card-abstract-bg {
          position: absolute;
          inset: 0;
          background-size: cover;
          background-position: center;
          opacity: 0.05;
          mix-blend-mode: multiply;
          pointer-events: none;
          transition: opacity 0.4s ease, transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
          z-index: 0;
        }

        .category-card-wrapper:hover .card-abstract-bg {
          opacity: 0.09;
          transform: scale(1.06);
        }

        /* Top Row: Icon and Admin Controls */
        .category-card-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
        }

        /* Category Main Icon Badge */
        .category-main-icon-wrap {
          width: 48px;
          height: 48px;
          border-radius: 10px;
          background: #f8fafc;
          border: 1px solid #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all 0.3s ease;
        }

        .category-card-wrapper:hover .category-main-icon-wrap {
          background: rgba(230, 57, 70, 0.04);
          border-color: rgba(230, 57, 70, 0.15);
        }

        .category-emoji-icon {
          font-size: 24px;
          line-height: 1;
        }

        .category-img-icon {
          width: 26px;
          height: 26px;
          object-fit: contain;
        }

        /* Body Details */
        .category-card-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 24px;
        }

        .category-card-body h3 {
          font-size: 19px;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
          letter-spacing: -0.4px;
          line-height: 1.35;
        }

        .tools-text-desc {
          font-size: 13.5px;
          line-height: 1.5;
          color: #64748b;
          margin: 0;
          font-weight: 500;
        }

        /* Footer Row */
        .category-card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 16px;
          border-top: 1px solid #f8fafc;
        }

        .explore-link-btn {
          font-size: 13px;
          font-weight: 700;
          color: #0f172a;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: color 0.2s ease;
        }

        .category-card-wrapper:hover .explore-link-btn {
          color: #e63946;
        }

        .arrow-icon {
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .category-card-wrapper:hover .arrow-icon {
          transform: translateX(4px);
        }

        /* ── HIGH-END OVERLAPPING FANNING ICON DECK ── */
        .corner-icon-deck {
          display: flex;
          align-items: center;
          position: relative;
          height: 26px;
          width: 52px;
          margin-right: 4px;
        }

        .deck-tool-icon {
          position: absolute;
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background-color: #ffffff;
          background-size: 65%;
          background-position: center;
          background-repeat: no-repeat;
          border: 1px solid #e2e8f0;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.05);
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        /* Stacked default positions - cascading leftwards overlapping */
        .deck-icon-1 {
          right: 0px;
          z-index: 3;
        }

        .deck-icon-2 {
          right: 11px;
          z-index: 2;
        }

        .deck-icon-3 {
          right: 22px;
          z-index: 1;
        }

        /* Hover slide-out expansion revealing tool icons neatly */
        .category-card-wrapper:hover .deck-icon-1 {
          transform: translateX(0px);
          box-shadow: 0 4px 10px rgba(15, 23, 42, 0.08);
        }

        .category-card-wrapper:hover .deck-icon-2 {
          transform: translateX(-15px);
          box-shadow: 0 4px 10px rgba(15, 23, 42, 0.08);
        }

        .category-card-wrapper:hover .deck-icon-3 {
          transform: translateX(-30px);
          box-shadow: 0 4px 10px rgba(15, 23, 42, 0.08);
        }

        /* Admin Trigger Button */
        .admin-card-edit-btn {
          background: #f1f5f9;
          color: #475569;
          border: none;
          border-radius: 6px;
          padding: 4px 8px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          transition: all 0.2s ease;
          border: 1px solid #e2e8f0;
        }

        .admin-card-edit-btn:hover {
          background: #e63946;
          color: #ffffff;
          border-color: #e63946;
        }

        /* ── PREMIUM FULL SCREEN MODAL DIALOG ── */
        .fullscreen-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(1, 8, 27, 0.85);
          backdrop-filter: blur(12px);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          box-sizing: border-box;
          animation: modalFadeIn 0.3s ease forwards;
        }

        @keyframes modalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .fullscreen-modal-container {
          background: #0a1628;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          width: 100%;
          max-width: 960px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.6);
          color: #f8fafc;
          box-sizing: border-box;
          animation: modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes modalSlideUp {
          from { transform: translateY(30px) scale(0.98); }
          to { transform: translateY(0) scale(1); }
        }

        .modal-header {
          padding: 24px 32px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .modal-header h2 {
          font-size: 22px;
          font-weight: 800;
          margin: 0;
          color: #ffffff;
          letter-spacing: -0.5px;
        }

        .modal-close-btn {
          background: transparent;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          transition: color 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
        }

        .modal-close-btn:hover {
          color: #ffffff;
        }

        .modal-body-scrollable {
          padding: 32px;
          overflow-y: auto;
          flex: 1;
        }

        .modal-error-banner {
          background: rgba(230, 57, 70, 0.15);
          border: 1px solid #e63946;
          border-radius: 8px;
          color: #ff8a95;
          padding: 12px 16px;
          font-size: 13.5px;
          font-weight: 600;
          margin-bottom: 24px;
        }

        /* Grid inside modal */
        .modal-form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 32px;
        }

        @media (max-width: 800px) {
          .modal-form-grid {
            grid-template-columns: 1fr !important;
            gap: 24px !important;
          }
        }

        .modal-form-column {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-row {
          display: flex;
          gap: 16px;
        }

        .form-group label {
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #94a3b8;
        }

        .form-input {
          background: #01081b;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 8px;
          color: #ffffff;
          padding: 10px 14px;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s ease;
          width: 100%;
          box-sizing: border-box;
        }

        .form-input:focus {
          border-color: #e63946;
        }

        .form-textarea {
          background: #01081b;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 8px;
          color: #ffffff;
          padding: 10px 14px;
          font-size: 14px;
          outline: none;
          resize: vertical;
          font-family: inherit;
          transition: border-color 0.2s ease;
          width: 100%;
          box-sizing: border-box;
        }

        .form-textarea:focus {
          border-color: #e63946;
        }

        /* Toggle checkbox styles */
        .toggle-label-wrap {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          user-select: none;
        }

        .toggle-checkbox {
          width: 18px;
          height: 18px;
          accent-color: #e63946;
          cursor: pointer;
        }

        .toggle-label-text {
          font-size: 14px;
          font-weight: 600;
          color: #ffffff;
        }

        /* Main Icon Editing Styles */
        .main-icon-edit-panel {
          display: flex;
          gap: 16px;
          align-items: center;
          background: #01081b;
          border: 1px dashed rgba(255, 255, 255, 0.15);
          border-radius: 12px;
          padding: 16px;
        }

        .main-icon-preview {
          width: 64px;
          height: 64px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .main-icon-controls {
          display: flex;
          flex-direction: column;
          flex: 1;
        }

        .btn-upload-file {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #ffffff;
          border-radius: 6px;
          padding: 8px 12px;
          font-size: 12.5px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .btn-upload-file:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        /* Tool Icons Editing Panel */
        .tool-icons-edit-panel {
          background: #01081b;
          border: 1px dashed rgba(255, 255, 255, 0.15);
          border-radius: 12px;
          padding: 20px;
        }

        .tool-icons-list {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          align-items: center;
        }

        .tool-icon-edit-item {
          width: 44px;
          height: 44px;
          background: #ffffff;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.1);
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 6px;
          box-sizing: border-box;
        }

        .tool-icon-edit-item img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }

        .btn-delete-tool-icon {
          position: absolute;
          top: -4px;
          right: -4px;
          width: 16px;
          height: 16px;
          background: #e63946;
          color: #ffffff;
          border: none;
          border-radius: 50%;
          font-size: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-weight: bold;
        }

        .btn-delete-tool-icon:hover {
          background: #ff5260;
        }

        .btn-add-tool-icon {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.05);
          border: 1px dashed rgba(255, 255, 255, 0.2);
          color: #94a3b8;
          font-size: 20px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .btn-add-tool-icon:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: #ffffff;
          color: #ffffff;
        }

        .field-hint {
          font-size: 11px;
          color: #64748b;
          margin: 10px 0 0;
          line-height: 1.4;
        }

        .abstract-presets {
          margin-top: 14px;
        }

        .preset-label {
          font-size: 10.5px;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          display: block;
          margin-bottom: 6px;
        }

        .preset-btn:hover {
          background: rgba(255, 255, 255, 0.15) !important;
          border-color: #e63946 !important;
          color: #ffffff !important;
        }

        /* Footer of Modal */
        .modal-footer {
          padding: 24px 32px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          align-items: center;
          box-sizing: border-box;
        }

        .btn-modal-delete {
          background: transparent;
          border: 1px solid #e63946;
          color: #e63946;
          border-radius: 8px;
          padding: 10px 18px;
          font-size: 13.5px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-modal-delete:hover {
          background: rgba(230, 57, 70, 0.1);
        }

        .btn-modal-cancel {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #94a3b8;
          border-radius: 8px;
          padding: 10px 18px;
          font-size: 13.5px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-modal-cancel:hover {
          color: #ffffff;
          border-color: rgba(255, 255, 255, 0.4);
        }

        .btn-modal-save {
          background: #e63946;
          border: none;
          color: #ffffff;
          border-radius: 8px;
          padding: 10px 22px;
          font-size: 13.5px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 15px rgba(230, 57, 70, 0.2);
        }

        .btn-modal-save:hover {
          background: #ff5260;
          transform: translateY(-1px);
        }
      `}</style>
    </section>
  );
}
