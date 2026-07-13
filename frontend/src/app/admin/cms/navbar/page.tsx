"use client";
import React, { useEffect, useState } from "react";
import { AdminProvider } from "../../components/ProtectedAdmin";
import { useToast } from "../../components/ToastProvider";
import { apiFetch } from "@/lib/apiFetch";
import { API_BASE_URL } from "@/lib/config";
import { Icon } from "../../icons";

interface NavbarItem {
  id: number;
  parent_id: number | null;
  title: string;
  link: string | null;
  badge: string | null;
  description: string | null;
  item_type: "main" | "dropdown" | "sidebar_item" | "content_item" | "footer_cta";
  order_position: number;
  icon: string | null;
  meta_data: string | null;
  sub_items: NavbarItem[];
}

function NavbarCmsForm() {
  const { showToast } = useToast();
  const [navbarItems, setNavbarItems] = useState<NavbarItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<NavbarItem | null>(null);
  
  // Form fields
  const [parentId, setParentId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [badge, setBadge] = useState("");
  const [description, setDescription] = useState("");
  const [itemType, setItemType] = useState<"main" | "dropdown" | "sidebar_item" | "content_item" | "footer_cta">("main");
  const [orderPosition, setOrderPosition] = useState(0);
  const [icon, setIcon] = useState("");
  const [metaData, setMetaData] = useState("");

  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({});

  const fetchNavbar = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/settings/navbar`);
      if (res.ok) {
        const data = await res.json();
        setNavbarItems(data);
      } else {
        showToast("Failed to load navigation structure", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("Network error fetching navbar", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNavbar();
  }, []);

  const toggleExpand = (id: number) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const openAddModal = (pId: number | null = null, defaultType: typeof itemType = "main") => {
    setEditingItem(null);
    setParentId(pId);
    setTitle("");
    setLink("");
    setBadge("");
    setDescription("");
    setItemType(defaultType);
    setOrderPosition(0);
    setIcon("");
    setMetaData("");
    setIsModalOpen(true);
  };

  const openEditModal = (item: NavbarItem) => {
    setEditingItem(item);
    setParentId(item.parent_id);
    setTitle(item.title);
    setLink(item.link || "");
    setBadge(item.badge || "");
    setDescription(item.description || "");
    setItemType(item.item_type);
    setOrderPosition(item.order_position);
    setIcon(item.icon || "");
    setMetaData(item.meta_data || "");
    setIsModalOpen(true);
  };

  const saveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast("Menu title is required", "error");
      return;
    }

    const payload = {
      parent_id: parentId,
      title: title.trim(),
      link: link.trim() || null,
      badge: badge.trim() || null,
      description: description.trim() || null,
      item_type: itemType,
      order_position: Number(orderPosition),
      icon: icon.trim() || null,
      meta_data: metaData.trim() || null,
    };

    const token = typeof window !== "undefined" ? localStorage.getItem("iinm_device_token") : null;
    const url = editingItem 
      ? `${API_BASE_URL}/settings/navbar/${editingItem.id}` 
      : `${API_BASE_URL}/settings/navbar`;
    const method = editingItem ? "PUT" : "POST";

    try {
      const res = await apiFetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-Device-Token": token || "",
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast(editingItem ? "Menu item updated" : "Menu item added", "success");
        setIsModalOpen(false);
        fetchNavbar();
      } else {
        const err = await res.json();
        showToast(err.detail || "Failed to save item", "error");
      }
    } catch {
      showToast("Network error saving item", "error");
    }
  };

  const deleteItem = async (id: number) => {
    if (!confirm("Are you sure you want to delete this menu item? Deleting parent elements will recursively delete all child dropdown links!")) return;
    const token = typeof window !== "undefined" ? localStorage.getItem("iinm_device_token") : null;
    try {
      const res = await apiFetch(`${API_BASE_URL}/settings/navbar/${id}`, {
        method: "DELETE",
        headers: {
          "X-Device-Token": token || "",
        },
      });

      if (res.ok) {
        showToast("Menu item deleted successfully", "success");
        fetchNavbar();
      } else {
        showToast("Failed to delete item", "error");
      }
    } catch {
      showToast("Network error deleting item", "error");
    }
  };

  // All items that can be parents: dropdowns can have any child, sidebar_items can have content_item children
  const potentialParents: NavbarItem[] = [];
  const collectParents = (items: NavbarItem[]) => {
    items.forEach(item => {
      if (item.item_type === "dropdown" || item.item_type === "sidebar_item") {
        potentialParents.push(item);
      }
      if (item.sub_items?.length) collectParents(item.sub_items);
    });
  };
  collectParents(navbarItems);

  return (
    <div className="admin-page-container" style={{ padding: "24px", width: "100%" }}>
      <style>{`
        .navbar-cms-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        .navbar-cms-header h2 {
          font-size: 24px;
          font-weight: 800;
          color: #0a1628;
          margin: 0;
        }
        .nav-tree-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 16px;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
        }
        .tree-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border-radius: 6px;
          background: #f8fafc;
          border: 1px solid #f1f5f9;
          margin-bottom: 8px;
          transition: all 0.2s;
        }
        .tree-row:hover {
          border-color: #cbd5e1;
          box-shadow: 0 2px 4px rgba(0,0,0,0.02);
        }
        .tree-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .tree-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .expand-btn {
          width: 24px;
          height: 24px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #64748b;
          background: #e2e8f0;
          border: none;
          transition: all 0.15s;
        }
        .expand-btn:hover {
          background: #cbd5e1;
          color: #0f172a;
        }
        .type-badge {
          font-size: 10px;
          font-weight: 800;
          padding: 2px 8px;
          border-radius: 30px;
          text-transform: uppercase;
        }
        .badge-main { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
        .badge-dropdown { background: rgba(16, 185, 129, 0.1); color: #10b981; }
        .badge-sidebar { background: rgba(100, 116, 139, 0.1); color: #64748b; }
        .badge-content { background: rgba(230, 57, 70, 0.1); color: #e63946; }
        .badge-footer { background: rgba(124, 58, 237, 0.1); color: #7c3aed; }
        
        .sub-tree-container {
          padding-left: 36px;
          margin-top: 4px;
          margin-bottom: 12px;
          border-left: 2px dashed #e2e8f0;
        }
        .sub-group-title {
          font-size: 11px;
          font-weight: 800;
          color: #64748b;
          text-transform: uppercase;
          margin: 12px 0 6px 0;
          letter-spacing: 0.5px;
        }
        .sub-item-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          background: #ffffff;
          border: 1px solid #f1f5f9;
          border-radius: 6px;
          margin-bottom: 6px;
          font-size: 13px;
        }
        
        /* Modal setup */
        .cms-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(10, 22, 40, 0.4);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
        }
        .cms-modal {
          background: #ffffff;
          border-radius: 8px;
          box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);
          width: 100%;
          max-width: 520px;
          overflow: hidden;
        }
        .cms-modal-header {
          padding: 16px 20px;
          background: #0a1628;
          color: #ffffff;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .cms-modal-body {
          padding: 20px;
          max-height: 70vh;
          overflow-y: auto;
        }
        .form-group {
          margin-bottom: 16px;
        }
        .form-label {
          display: block;
          font-size: 12.5px;
          font-weight: 700;
          color: #475569;
          margin-bottom: 6px;
        }
        .form-input, .form-select, .form-textarea {
          width: 100%;
          padding: 8px 12px;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          font-size: 13.5px;
          outline: none;
          transition: border-color 0.15s;
          box-sizing: border-box;
        }
        .form-input:focus, .form-select:focus, .form-textarea:focus {
          border-color: #e63946;
        }
        .cms-btn-primary {
          background: #e63946;
          color: #ffffff;
          border: none;
          padding: 8px 18px;
          font-weight: 700;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13.5px;
          transition: background 0.15s;
        }
        .cms-btn-primary:hover { background: #cb2d39; }
        .cms-btn-secondary {
          background: #f1f5f9;
          color: #475569;
          border: 1px solid #cbd5e1;
          padding: 8px 18px;
          font-weight: 700;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13.5px;
          transition: background 0.15s;
        }
        .cms-btn-secondary:hover { background: #e2e8f0; }
        
        .skeleton-block {
          background: #e2e8f0;
          animation: pulse 1.5s infinite;
          border-radius: 4px;
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 0.3; }
        }
      `}</style>

      <div className="navbar-cms-header">
        <h2>Navigation Menu CMS</h2>
        <button className="cms-btn-primary" onClick={() => openAddModal(null, "main")}>
          <Icon name="plus" size={14} /> Add Top Menu
        </button>
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div className="skeleton-block" style={{ height: "64px", width: "100%" }}></div>
          <div className="skeleton-block" style={{ height: "64px", width: "100%" }}></div>
          <div className="skeleton-block" style={{ height: "64px", width: "100%" }}></div>
        </div>
      ) : (
        <div className="nav-tree-card">
          {navbarItems.map((item) => {
            const hasSub = item.item_type === "dropdown";
            const isOpen = !!expandedItems[item.id];
            
            const sidebars = item.sub_items.filter(s => s.item_type === "sidebar_item");
            const footers = item.sub_items.filter(s => s.item_type === "footer_cta");

            return (
              <div key={item.id} style={{ marginBottom: "12px" }}>
                <div className="tree-row">
                  <div className="tree-left">
                    {hasSub && (
                      <button className="expand-btn" onClick={() => toggleExpand(item.id)}>
                        <Icon name={isOpen ? "chevron-up" : "chevron-down"} size={12} />
                      </button>
                    )}
                    <span style={{ fontWeight: 800, color: "#0a1628", fontSize: "14.5px" }}>
                      {item.title}
                    </span>
                    <span style={{ color: "#64748b", fontSize: "12px" }}>
                      {item.link ? `(${item.link})` : ""}
                    </span>
                    <span className={`type-badge badge-${item.item_type}`}>
                      {item.item_type}
                    </span>
                    {item.badge && (
                      <span style={{ background: "#fef2f2", color: "#e63946", border: "1px solid #fecaca", fontSize: "9px", padding: "1px 6px", borderRadius: "4px", fontWeight: 800 }}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                  
                  <div className="tree-actions">
                    {hasSub && (
                      <button 
                        onClick={() => openAddModal(item.id, "sidebar_item")} 
                        className="cms-btn-secondary" 
                        style={{ padding: "4px 10px", fontSize: "11px", display: "flex", alignItems: "center", gap: "4px" }}
                      >
                        <Icon name="plus" size={10} /> Add Sidebar Section
                      </button>
                    )}
                    <button 
                      onClick={() => openEditModal(item)} 
                      style={{ border: "none", background: "none", color: "#475569", cursor: "pointer", padding: "4px" }}
                    >
                      <Icon name="edit" size={15} />
                    </button>
                    <button 
                      onClick={() => deleteItem(item.id)} 
                      style={{ border: "none", background: "none", color: "#ef4444", cursor: "pointer", padding: "4px" }}
                    >
                      <Icon name="trash" size={15} />
                    </button>
                  </div>
                </div>

                {hasSub && isOpen && (
                  <div className="sub-tree-container">
                    
                    {/* Sidebar Sections — each with nested content items */}
                    {sidebars.length === 0 ? (
                      <div style={{ fontSize: "11.5px", color: "#94a3b8", padding: "4px" }}>No sidebar sections yet. Add a sidebar section first, then add content links inside it.</div>
                    ) : (
                      sidebars.map(sidebar => {
                        const sidebarOpen = !!expandedItems[sidebar.id];
                        const sidebarContents = sidebar.sub_items?.filter((s: NavbarItem) => s.item_type === "content_item") || [];
                        return (
                          <div key={sidebar.id} style={{ marginBottom: "8px" }}>
                            <div className="sub-item-card" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                {sidebarContents.length > 0 && (
                                  <button className="expand-btn" style={{ width: "20px", height: "20px" }} onClick={() => toggleExpand(sidebar.id)}>
                                    <Icon name={sidebarOpen ? "chevron-up" : "chevron-down"} size={10} />
                                  </button>
                                )}
                                <span style={{ fontSize: "14px" }}>{sidebar.icon || "•"}</span>
                                <span style={{ fontWeight: 700 }}>{sidebar.title}</span>
                                <span className="type-badge badge-sidebar">Sidebar Section</span>
                              </div>
                              <div style={{ display: "flex", gap: "6px" }}>
                                <button 
                                  onClick={() => openAddModal(sidebar.id, "content_item")} 
                                  className="cms-btn-secondary" 
                                  style={{ padding: "2px 8px", fontSize: "10px" }}
                                >
                                  + Add Link
                                </button>
                                <button onClick={() => openEditModal(sidebar)} style={{ border: "none", background: "none", color: "#64748b", cursor: "pointer" }}>
                                  <Icon name="edit" size={13} />
                                </button>
                                <button onClick={() => deleteItem(sidebar.id)} style={{ border: "none", background: "none", color: "#ef4444", cursor: "pointer" }}>
                                  <Icon name="trash" size={13} />
                                </button>
                              </div>
                            </div>

                            {/* Nested Content Items inside this sidebar */}
                            {sidebarOpen && (
                              <div style={{ paddingLeft: "28px", marginTop: "4px", borderLeft: "2px dashed #cbd5e1", marginLeft: "12px" }}>
                                {sidebarContents.length === 0 ? (
                                  <div style={{ fontSize: "11px", color: "#94a3b8", padding: "4px" }}>No content links in this section.</div>
                                ) : (
                                  sidebarContents.map((sub: NavbarItem) => (
                                    <div key={sub.id} className="sub-item-card" style={{ borderLeft: "3px solid #e63946", marginBottom: "4px" }}>
                                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                          <span style={{ fontWeight: 800, color: "#0a1628", fontSize: "13px" }}>{sub.title}</span>
                                          {sub.badge && <span className="type-badge badge-content">{sub.badge}</span>}
                                          <span style={{ color: "#94a3b8", fontSize: "11px" }}>{sub.link}</span>
                                        </div>
                                        <span style={{ fontSize: "11.5px", color: "#64748b" }}>{sub.description}</span>
                                      </div>
                                      <div style={{ display: "flex", gap: "6px" }}>
                                        <button onClick={() => openEditModal(sub)} style={{ border: "none", background: "none", color: "#64748b", cursor: "pointer" }}>
                                          <Icon name="edit" size={13} />
                                        </button>
                                        <button onClick={() => deleteItem(sub.id)} style={{ border: "none", background: "none", color: "#ef4444", cursor: "pointer" }}>
                                          <Icon name="trash" size={13} />
                                        </button>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}

                    {/* Footer CTA */}
                    {footers.length > 0 && (
                      <div style={{ marginTop: "12px" }}>
                        <div className="sub-group-title">Bottom Promotional Banner</div>
                        {footers.map(sub => (
                          <div key={sub.id} className="sub-item-card" style={{ background: "rgba(124, 58, 237, 0.03)", border: "1px solid rgba(124, 58, 237, 0.1)" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span style={{ fontWeight: 700, color: "#7c3aed" }}>{sub.title}</span>
                                <span className="type-badge badge-footer">Footer CTA</span>
                              </div>
                              <span style={{ fontSize: "11.5px", color: "#64748b" }}>{sub.meta_data || "Default crimson gradient"}</span>
                            </div>
                            <div style={{ display: "flex", gap: "6px" }}>
                              <button onClick={() => openEditModal(sub)} style={{ border: "none", background: "none", color: "#64748b", cursor: "pointer" }}>
                                <Icon name="edit" size={13} />
                              </button>
                              <button onClick={() => deleteItem(sub.id)} style={{ border: "none", background: "none", color: "#ef4444", cursor: "pointer" }}>
                                <Icon name="trash" size={13} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Edit/Add Item Modal */}
      {isModalOpen && (
        <div className="cms-modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="cms-modal" onClick={e => e.stopPropagation()}>
            <div className="cms-modal-header">
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800 }}>
                {editingItem ? `Edit Menu: ${editingItem.title}` : "Add New Menu Item"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: "none", border: "none", color: "#ffffff", cursor: "pointer" }}>
                <Icon name="x" size={16} />
              </button>
            </div>
            
            <form onSubmit={saveItem}>
              <div className="cms-modal-body">
                
                {/* 1. Type of Item */}
                <div className="form-group">
                  <label className="form-label">Item Segment Layout</label>
                  <select 
                    className="form-select" 
                    value={itemType} 
                    onChange={e => setItemType(e.target.value as any)}
                  >
                    <option value="main">Top Level Standard Link</option>
                    <option value="dropdown">Top Level Mega Dropdown Container</option>
                    <option value="sidebar_item">Dropdown Left Sidebar Category</option>
                    <option value="content_item">Dropdown Right Columns Detailed Link</option>
                    <option value="footer_cta">Dropdown Bottom Promo CTA Banner</option>
                  </select>
                </div>

                {/* 2. Parent Container selection if item is inside dropdown */}
                {itemType !== "main" && itemType !== "dropdown" && (
                  <div className="form-group">
                    <label className="form-label">Parent Container</label>
                    <select 
                      className="form-select" 
                      value={parentId || ""} 
                      onChange={e => setParentId(Number(e.target.value) || null)}
                    >
                      <option value="">-- Select Dropdown Parent --</option>
                      {potentialParents.map(p => (
                        <option key={p.id} value={p.id}>{p.title}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* 3. Title */}
                <div className="form-group">
                  <label className="form-label">Menu Item Label / Title</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={title} 
                    onChange={e => setTitle(e.target.value)} 
                    placeholder="e.g. Courses, Full Stack AI Engineering, Learn AI"
                  />
                </div>

                {/* 4. Link URL */}
                {itemType !== "dropdown" && itemType !== "sidebar_item" && (
                  <div className="form-group">
                    <label className="form-label">Link Location Path</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={link} 
                      onChange={e => setLink(e.target.value)} 
                      placeholder="e.g. /courses, /about-us"
                    />
                  </div>
                )}

                {/* 5. Custom Icon (for sidebar elements) */}
                {itemType === "sidebar_item" && (
                  <div className="form-group">
                    <label className="form-label">Unicode Emoji Icon</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={icon} 
                      onChange={e => setIcon(e.target.value)} 
                      placeholder="e.g. 🧠, 💼, 🏛️"
                    />
                  </div>
                )}

                {/* 6. Custom Badge (for content_items) */}
                {itemType === "content_item" && (
                  <div className="form-group">
                    <label className="form-label">Special Tag Badge (Uppercase)</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={badge} 
                      onChange={e => setBadge(e.target.value)} 
                      placeholder="e.g. FLAGSHIP, POPULAR, NEW, ALUMNI"
                    />
                  </div>
                )}

                {/* 7. Detailed Description (for content_items) */}
                {itemType === "content_item" && (
                  <div className="form-group">
                    <label className="form-label">Link Subtitle Description</label>
                    <textarea 
                      className="form-textarea" 
                      rows={2}
                      value={description} 
                      onChange={e => setDescription(e.target.value)} 
                      placeholder="Enter a brief, premium subtitle for this course link."
                    />
                  </div>
                )}

                {/* 8. Metadata gradient styles (for footers) */}
                {itemType === "footer_cta" && (
                  <div className="form-group">
                    <label className="form-label">Background CSS Gradient</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={metaData} 
                      onChange={e => setMetaData(e.target.value)} 
                      placeholder="linear-gradient(135deg, #e63946 0%, #cb2d39 100%)"
                    />
                  </div>
                )}

                {/* 9. Sorting Priority Position */}
                <div className="form-group">
                  <label className="form-label">Order Priority (Lower numbers show first)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={orderPosition} 
                    onChange={e => setOrderPosition(Number(e.target.value) || 0)} 
                  />
                </div>

              </div>
              <div className="cms-modal-footer" style={{ padding: "16px 20px", background: "#f8fafc", display: "flex", justifyContent: "flex-end", gap: "10px", borderTop: "1px solid #e2e8f0" }}>
                <button type="button" className="cms-btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="cms-btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function NavbarCmsPage() {
  return (
    <AdminProvider>
      <NavbarCmsForm />
    </AdminProvider>
  );
}
