"use client";
import React, { useEffect, useState } from "react";
import { AdminProvider } from "../../components/ProtectedAdmin";
import { useToast } from "../../components/ToastProvider";
import { apiFetch } from "@/lib/apiFetch";
import { API_BASE_URL } from "@/lib/config";
import { Icon } from "../../icons";

interface FooterMenuItem {
  id?: number;
  title: string;
  link: string;
  order_position: number;
}

interface FooterMenuGroup {
  id?: number;
  title: string;
  order_position: number;
  items: FooterMenuItem[];
}

interface FooterBottomLink {
  id?: number;
  title: string;
  link: string;
  order_position: number;
}

interface FooterMenuData {
  groups: FooterMenuGroup[];
  bottom_links: FooterBottomLink[];
}

function FooterMenuCmsForm() {
  const { showToast } = useToast();
  const [data, setData] = useState<FooterMenuData>({ groups: [], bottom_links: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"groups" | "bottom">("groups");

  const fetchFooterMenu = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/settings/footer-menu`);
      if (res.ok) {
        const d = await res.json();
        setData(d);
      } else {
        showToast("Failed to load footer menu", "error");
      }
    } catch {
      showToast("Network error fetching footer menu", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFooterMenu();
  }, []);

  const saveAll = async () => {
    setSaving(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/settings/footer-menu`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        showToast("Footer menu saved successfully", "success");
      } else {
        const err = await res.json();
        showToast(err.detail || "Failed to save", "error");
      }
    } catch {
      showToast("Network error saving footer menu", "error");
    } finally {
      setSaving(false);
    }
  };

  const addGroup = () => {
    setData(prev => ({
      ...prev,
      groups: [...prev.groups, { title: "New Group", order_position: prev.groups.length, items: [] }],
    }));
  };

  const updateGroup = (idx: number, field: "title", value: string) => {
    setData(prev => {
      const groups = [...prev.groups];
      groups[idx] = { ...groups[idx], [field]: value };
      return { ...prev, groups };
    });
  };

  const removeGroup = (idx: number) => {
    if (!confirm("Delete this group and all its links?")) return;
    setData(prev => ({
      ...prev,
      groups: prev.groups.filter((_, i) => i !== idx),
    }));
  };

  const moveGroup = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= data.groups.length) return;
    setData(prev => {
      const groups = [...prev.groups];
      [groups[idx], groups[newIdx]] = [groups[newIdx], groups[idx]];
      groups.forEach((g, i) => { g.order_position = i; });
      return { ...prev, groups };
    });
  };

  const addItem = (groupIdx: number) => {
    setData(prev => {
      const groups = [...prev.groups];
      const group = { ...groups[groupIdx] };
      group.items = [...group.items, { title: "New Link", link: "/", order_position: group.items.length }];
      groups[groupIdx] = group;
      return { ...prev, groups };
    });
  };

  const updateItem = (groupIdx: number, itemIdx: number, field: "title" | "link", value: string) => {
    setData(prev => {
      const groups = [...prev.groups];
      const group = { ...groups[groupIdx] };
      const items = [...group.items];
      items[itemIdx] = { ...items[itemIdx], [field]: value };
      group.items = items;
      groups[groupIdx] = group;
      return { ...prev, groups };
    });
  };

  const removeItem = (groupIdx: number, itemIdx: number) => {
    setData(prev => {
      const groups = [...prev.groups];
      const group = { ...groups[groupIdx] };
      group.items = group.items.filter((_, i) => i !== itemIdx);
      group.items.forEach((it, i) => { it.order_position = i; });
      groups[groupIdx] = group;
      return { ...prev, groups };
    });
  };

  const moveItem = (groupIdx: number, itemIdx: number, dir: -1 | 1) => {
    const newIdx = itemIdx + dir;
    const group = data.groups[groupIdx];
    if (newIdx < 0 || newIdx >= group.items.length) return;
    setData(prev => {
      const groups = [...prev.groups];
      const g = { ...groups[groupIdx] };
      const items = [...g.items];
      [items[itemIdx], items[newIdx]] = [items[newIdx], items[itemIdx]];
      items.forEach((it, i) => { it.order_position = i; });
      g.items = items;
      groups[groupIdx] = g;
      return { ...prev, groups };
    });
  };

  const addBottomLink = () => {
    setData(prev => ({
      ...prev,
      bottom_links: [...prev.bottom_links, { title: "New Link", link: "/", order_position: prev.bottom_links.length }],
    }));
  };

  const updateBottomLink = (idx: number, field: "title" | "link", value: string) => {
    setData(prev => {
      const links = [...prev.bottom_links];
      links[idx] = { ...links[idx], [field]: value };
      return { ...prev, bottom_links: links };
    });
  };

  const removeBottomLink = (idx: number) => {
    setData(prev => ({
      ...prev,
      bottom_links: prev.bottom_links.filter((_, i) => i !== idx),
    }));
  };

  const moveBottomLink = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= data.bottom_links.length) return;
    setData(prev => {
      const links = [...prev.bottom_links];
      [links[idx], links[newIdx]] = [links[newIdx], links[idx]];
      links.forEach((l, i) => { l.order_position = i; });
      return { ...prev, bottom_links: links };
    });
  };

  return (
    <div className="admin-page-container" style={{ padding: "24px", width: "100%" }}>
      <style>{`
        .footer-cms-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; flex-wrap:wrap; gap:12px; }
        .footer-cms-header h2 { font-size:24px; font-weight:800; color:#0a1628; margin:0; }
        .footer-tabs { display:flex; gap:4px; margin-bottom:24px; border-bottom:1px solid #e2e8f0; }
        .footer-tab { padding:10px 20px; font-size:13.5px; font-weight:700; color:#64748b; cursor:pointer; border-bottom:2px solid transparent; transition:all .15s; background:none; border:none; }
        .footer-tab:hover { color:#0a1628; }
        .footer-tab.active { color:#e63946; border-bottom-color:#e63946; }
        .group-card { background:#fff; border:1px solid #e2e8f0; border-radius:12px; margin-bottom:20px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.03); }
        .group-card-header { display:flex; align-items:center; justify-content:space-between; padding:16px 20px; background:#f8fafc; border-bottom:1px solid #f1f5f9; }
        .group-card-title { font-size:15px; font-weight:800; color:#0a1628; border:none; background:transparent; padding:0; width:100%; outline:none; }
        .group-card-title:focus { color:#e63946; }
        .group-card-body { padding:16px 20px; }
        .item-row { display:flex; align-items:center; gap:10px; padding:8px 12px; background:#fff; border:1px solid #f1f5f9; border-radius:8px; margin-bottom:8px; transition:border-color .15s; }
        .item-row:hover { border-color:#cbd5e1; }
        .item-input { flex:1; border:none; outline:none; font-size:13px; color:#0f172a; background:transparent; padding:4px 0; }
        .item-input::placeholder { color:#94a3b8; }
        .item-input--link { flex:1; color:#64748b; }
        .drag-dots { color:#cbd5e1; cursor:grab; display:flex; flex-direction:column; gap:2px; }
        .drag-dots span { width:3px; height:3px; background:#cbd5e1; border-radius:50%; }
        .btn-icon { width:28px; height:28px; border-radius:6px; display:flex; align-items:center; justify-content:center; border:none; cursor:pointer; background:transparent; color:#94a3b8; transition:all .15s; }
        .btn-icon:hover { background:#f1f5f9; color:#0f172a; }
        .btn-icon.danger:hover { background:#fef2f2; color:#ef4444; }
        .btn-add-item { display:flex; align-items:center; gap:6px; padding:8px 14px; border:1px dashed #cbd5e1; border-radius:8px; font-size:12.5px; font-weight:700; color:#64748b; cursor:pointer; background:transparent; transition:all .15s; width:100%; justify-content:center; }
        .btn-add-item:hover { border-color:#94a3b8; color:#0f172a; background:#f8fafc; }
        .btn-add-group { display:flex; align-items:center; gap:8px; padding:12px 20px; border:2px dashed #cbd5e1; border-radius:10px; font-size:13.5px; font-weight:700; color:#64748b; cursor:pointer; background:transparent; transition:all .15s; }
        .btn-add-group:hover { border-color:#94a3b8; color:#0f172a; background:#f8fafc; }
        .btn-save { display:flex; align-items:center; gap:8px; background:#e63946; color:#fff; border:none; padding:12px 24px; border-radius:10px; font-size:14px; font-weight:700; cursor:pointer; transition:all .15s; box-shadow:0 4px 12px rgba(230,57,70,0.25); }
        .btn-save:hover:not(:disabled) { background:#cb2d39; transform:translateY(-1px); }
        .btn-save:disabled { opacity:.6; cursor:not-allowed; }
        .bottom-link-row { display:flex; align-items:center; gap:10px; padding:10px 14px; background:#fff; border:1px solid #f1f5f9; border-radius:8px; margin-bottom:8px; }
        .skeleton-block { background:#e2e8f0; animation:pulse 1.5s infinite; border-radius:4px; }
        @keyframes pulse { 0%,100%{opacity:.6} 50%{opacity:.3} }
        .group-actions { display:flex; gap:4px; }
        .empty-state { text-align:center; padding:48px 24px; color:#94a3b8; }
        .preview-note { background:#f0f9ff; border:1px solid #bae6fd; border-radius:8px; padding:12px 16px; font-size:12.5px; color:#0369a1; margin-bottom:20px; display:flex; align-items:center; gap:8px; }
      `}</style>

      <div className="footer-cms-header">
        <h2><Icon name="layout" size={26} /> Footer Menu CMS</h2>
        <button className="btn-save" onClick={saveAll} disabled={saving || loading}>
          <Icon name={saving ? "loader" : "save"} size={16} />
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      <div className="preview-note">
        <Icon name="info" size={16} />
        Changes reflect instantly on the public footer. Keep the same number of groups to preserve layout.
      </div>

      <div className="footer-tabs">
        <button className={`footer-tab ${activeTab === "groups" ? "active" : ""}`} onClick={() => setActiveTab("groups")}>
          Link Groups ({data.groups.length})
        </button>
        <button className={`footer-tab ${activeTab === "bottom" ? "active" : ""}`} onClick={() => setActiveTab("bottom")}>
          Bottom Bar ({data.bottom_links.length})
        </button>
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div className="skeleton-block" style={{ height: "200px", width: "100%" }} />
          <div className="skeleton-block" style={{ height: "200px", width: "100%" }} />
        </div>
      ) : (
        <>
          {activeTab === "groups" && (
            <>
              {data.groups.map((group, gIdx) => (
                <div key={gIdx} className="group-card">
                  <div className="group-card-header">
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1 }}>
                      <div className="drag-dots"><span/><span/><span/></div>
                      <input
                        className="group-card-title"
                        value={group.title}
                        onChange={e => updateGroup(gIdx, "title", e.target.value)}
                        placeholder="Group Title"
                      />
                    </div>
                    <div className="group-actions">
                      <button className="btn-icon" onClick={() => moveGroup(gIdx, -1)} title="Move Up">
                        <Icon name="chevron-up" size={14} />
                      </button>
                      <button className="btn-icon" onClick={() => moveGroup(gIdx, 1)} title="Move Down">
                        <Icon name="chevron-down" size={14} />
                      </button>
                      <button className="btn-icon danger" onClick={() => removeGroup(gIdx)} title="Delete Group">
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="group-card-body">
                    {group.items.map((item, iIdx) => (
                      <div key={iIdx} className="item-row">
                        <div className="drag-dots"><span/><span/><span/></div>
                        <input
                          className="item-input"
                          value={item.title}
                          onChange={e => updateItem(gIdx, iIdx, "title", e.target.value)}
                          placeholder="Link Text"
                        />
                        <input
                          className="item-input item-input--link"
                          value={item.link}
                          onChange={e => updateItem(gIdx, iIdx, "link", e.target.value)}
                          placeholder="/path"
                        />
                        <button className="btn-icon" onClick={() => moveItem(gIdx, iIdx, -1)} title="Move Up">
                          <Icon name="chevron-up" size={12} />
                        </button>
                        <button className="btn-icon" onClick={() => moveItem(gIdx, iIdx, 1)} title="Move Down">
                          <Icon name="chevron-down" size={12} />
                        </button>
                        <button className="btn-icon danger" onClick={() => removeItem(gIdx, iIdx)} title="Delete">
                          <Icon name="x" size={12} />
                        </button>
                      </div>
                    ))}
                    <button className="btn-add-item" onClick={() => addItem(gIdx)}>
                      <Icon name="plus" size={12} /> Add Link
                    </button>
                  </div>
                </div>
              ))}
              <button className="btn-add-group" onClick={addGroup}>
                <Icon name="plus" size={16} /> Add New Group
              </button>
            </>
          )}

          {activeTab === "bottom" && (
            <div className="group-card">
              <div className="group-card-header">
                <span style={{ fontSize: "15px", fontWeight: 800, color: "#0a1628" }}>Bottom Bar Links</span>
                <span style={{ fontSize: "12px", color: "#64748b" }}>Shown in the copyright row</span>
              </div>
              <div className="group-card-body">
                {data.bottom_links.length === 0 && (
                  <div className="empty-state">No bottom links added yet.</div>
                )}
                {data.bottom_links.map((link, idx) => (
                  <div key={idx} className="bottom-link-row">
                    <div className="drag-dots"><span/><span/><span/></div>
                    <input
                      className="item-input"
                      value={link.title}
                      onChange={e => updateBottomLink(idx, "title", e.target.value)}
                      placeholder="Link Text"
                    />
                    <input
                      className="item-input item-input--link"
                      value={link.link}
                      onChange={e => updateBottomLink(idx, "link", e.target.value)}
                      placeholder="/path"
                    />
                    <button className="btn-icon" onClick={() => moveBottomLink(idx, -1)} title="Move Up">
                      <Icon name="chevron-up" size={12} />
                    </button>
                    <button className="btn-icon" onClick={() => moveBottomLink(idx, 1)} title="Move Down">
                      <Icon name="chevron-down" size={12} />
                    </button>
                    <button className="btn-icon danger" onClick={() => removeBottomLink(idx)} title="Delete">
                      <Icon name="x" size={12} />
                    </button>
                  </div>
                ))}
                <button className="btn-add-item" onClick={addBottomLink} style={{ marginTop: 8 }}>
                  <Icon name="plus" size={12} /> Add Bottom Link
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function FooterMenuCmsPage() {
  return (
    <AdminProvider>
      <FooterMenuCmsForm />
    </AdminProvider>
  );
}
