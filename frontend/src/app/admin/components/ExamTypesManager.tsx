"use client";
import React, { useState, useEffect, useRef } from "react";
import { API_BASE_URL } from "@/lib/config";
import { useToast } from "./ToastProvider";

const GLOBAL_CSS = `
  :root {
    --et-accent:       #0ea5e9;
    --et-accent-dk:    #0284c7;
    --et-success:      #10b981;
    --et-success-bg:   #d1fae5;
    --et-danger:       #ef4444;
    --et-danger-bg:    #fee2e2;
    --et-purple:       #4c1d95;
    --et-txt:          #1f2937;
    --et-txt2:         #6b7280;
    --et-border:       #e5e7eb;
    --et-bg:           #f3f4f6;
    --et-white:        #ffffff;
    --et-sh:           0 1px 3px rgba(0,0,0,.08),0 1px 2px rgba(0,0,0,.06);
    --et-sh-lg:        0 20px 60px rgba(0,0,0,.22);
  }

  .et-root {
    font-family: 'Inter', system-ui, sans-serif;
    background: var(--et-bg);
    color: var(--et-txt);
    min-height: 100vh;
    padding: 32px;
    box-sizing: border-box;
  }
  .et-root *, .et-root *::before, .et-root *::after { box-sizing: border-box; }

  /* Header */
  .et-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:28px; flex-wrap:wrap; gap:16px; }
  .et-title  { font-size:1.6rem; font-weight:700; letter-spacing:-.4px; color:var(--et-txt); margin:0; }
  
  .et-btn-primary {
    display:inline-flex; align-items:center; gap:7px;
    padding:10px 20px; border-radius:4px;
    background:#10b981; color:#fff;
    font-size:.875rem; font-weight:600; border:none; cursor:pointer;
    transition:background .2s;
    text-transform: uppercase;
  }
  .et-btn-primary:hover { background:#059669; }

  .et-btn-danger {
    display:inline-flex; align-items:center; gap:7px;
    padding:10px 20px; border-radius:4px;
    background:var(--et-danger); color:#fff;
    font-size:.875rem; font-weight:600; border:none; cursor:pointer;
    transition:background .2s;
  }
  .et-btn-danger:hover { background:#dc2626; }

  /* Card / Table */
  .et-card  { background:var(--et-white); box-shadow:var(--et-sh); border:1px solid var(--et-border); padding: 24px; }
  .et-table { width:100%; border-collapse:collapse; text-align:left; }
  
  .et-table-th { font-size:0.8rem; font-weight:700; color:#4b5563; padding:16px 12px; text-transform:uppercase; border-bottom:1px solid var(--et-border); }
  .et-table-td { font-size:0.875rem; color:var(--et-txt); padding:16px 12px; border-bottom:1px solid var(--et-border); vertical-align:middle; }

  .et-table tbody tr:hover { background:#f9fafb; }

  .et-filter-row td { padding: 8px 12px; border-bottom: 1px solid var(--et-border); }
  .et-filter-input { width: 100%; padding: 8px 12px; border: 1px solid var(--et-border); border-radius: 4px; font-size: 0.85rem; outline: none; }
  .et-filter-input:focus { border-color: var(--et-accent); }

  /* Code badge */
  .et-code-wrap { display: flex; align-items: center; gap: 8px; }
  .et-code {
    display:inline-flex; align-items:center; gap:5px;
    padding:5px 10px; border-radius:4px;
    background:#0ea5e9; color:#fff;
    font-size:0.75rem; font-weight:600;
  }
  .et-copy-btn {
    background: transparent; border: none; cursor: pointer; color: #9ca3af; display: flex; align-items: center; justify-content: center; padding: 4px; border-radius: 4px; transition: all 0.2s;
  }
  .et-copy-btn:hover { background: #f3f4f6; color: #4b5563; }

  /* Status badge */
  .et-badge-on { display:inline-block; padding:4px 12px; border-radius:4px; font-size:.75rem; font-weight:600; background:var(--et-success-bg); color:var(--et-success); }
  .et-badge-off { display:inline-block; padding:4px 12px; border-radius:4px; font-size:.75rem; font-weight:600; background:#f3f4f6; color:#9ca3af; }

  /* Actions Dropdown */
  .et-actions-btn { display:inline-flex; align-items:center; justify-content:space-between; gap:8px; padding:6px 12px; border:1px solid var(--et-border); border-radius:4px; background:#fff; font-size:0.8rem; cursor:pointer; }
  .et-actions-btn:hover { background:#f9fafb; }
  
  /* Checkbox */
  .et-checkbox { width: 16px; height: 16px; cursor: pointer; accent-color: var(--et-accent); }

  /* Modal */
  .et-overlay {
    position:fixed; inset:0;
    background:rgba(0,0,0,.4);
    z-index:9999; display:flex; align-items:center; justify-content:center;
  }
  .et-modal {
    background:var(--et-white);
    width:90%; max-width:600px;
    box-shadow:var(--et-sh-lg);
    display: flex; flex-direction: column;
    max-height: 90vh;
  }
  .et-modal-inner { overflow-y: auto; padding: 24px; display: flex; flex-direction: column; gap: 20px; }
  
  .et-modal-hd { display:flex; align-items:center; justify-content:space-between; padding:16px 24px; background: #f9fafb; border-bottom: 1px solid var(--et-border); }
  .et-modal-ht { font-size:1.1rem; font-weight:600; color:var(--et-txt); margin:0; }
  .et-modal-x  { border:1px solid #d1d5db; background:#fff; cursor:pointer; color:#6b7280; width: 32px; height: 32px; border-radius:50%; display:flex; align-items: center; justify-content: center; }
  .et-modal-x:hover { background:#f3f4f6; }

  /* Floating Fields */
  .et-fw { position: relative; margin-bottom: 24px; }
  .et-field { position: relative; border: 1.5px solid var(--et-border); border-radius: 8px; background: var(--et-white); transition: border-color .2s; }
  .et-field.focus { border-color: var(--et-purple); box-shadow: 0 0 0 3px rgba(76,29,149,0.1); }
  
  .et-lbl { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); font-size: .875rem; color: var(--et-txt2); pointer-events: none; transition: all .15s ease; background: transparent; padding: 0 4px; line-height: 1; }
  .et-lbl.up { top: 0; font-size: .75rem; font-weight: 600; color: var(--et-purple); background: var(--et-white); }
  
  .et-lbl-ta { position: absolute; left: 14px; top: 16px; transform: none; font-size: .875rem; color: var(--et-txt2); pointer-events: none; transition: all .15s ease; background: transparent; padding: 0 4px; line-height: 1; }
  .et-lbl-ta.up { top: 0; transform: translateY(-50%); font-size: .75rem; font-weight: 600; color: var(--et-purple); background: var(--et-white); }
  
  .et-inp { display: block; width: 100%; padding: 16px 14px 8px; border: none; outline: none; font-size: .95rem; color: var(--et-txt); background: transparent; font-family: inherit; }
  .et-ta { display: block; width: 100%; padding: 20px 14px 10px; border: none; outline: none; font-size: .95rem; color: var(--et-txt); background: transparent; font-family: inherit; resize: vertical; min-height: 100px; }

  .et-color-wrap { display: flex; align-items: center; border: 1.5px solid var(--et-border); border-radius: 8px; overflow: hidden; height: 48px; }
  .et-color-block { width: 48px; height: 100%; border-right: 1.5px solid var(--et-border); }
  .et-color-input { flex: 1; border: none; padding: 0 14px; outline: none; height: 100%; font-size: .95rem; }
  .et-color-input:focus { background: #f9fafb; }
  .et-color-lbl { font-size: .75rem; font-weight: 600; color: var(--et-txt2); margin-bottom: 6px; display: block; }

  /* Delete Confirm Modal */
  .et-confirm { background: #fff; width: 90%; max-width: 440px; border-radius: 12px; padding: 32px 24px; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.15); animation: et-in .2s ease; }
  .et-confirm-icon-wrap { width: 56px; height: 56px; border-radius: 50%; background: #fef2f2; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; color: #dc2626; }
  .et-confirm-ht { font-size: 1.25rem; font-weight: 700; color: #111827; margin: 0 0 8px; }
  .et-confirm-pill { display: inline-block; padding: 4px 10px; background: #eff6ff; color: #3b82f6; font-size: 0.75rem; font-weight: 600; border-radius: 4px; margin-bottom: 16px; }
  .et-confirm-tx { font-size: 0.875rem; color: #4b5563; line-height: 1.6; margin-bottom: 24px; }
  .et-confirm-tx strong { color: #111827; font-weight: 600; }
  .et-confirm-row { display: flex; gap: 12px; justify-content: center; }
  .et-confirm-btn-cancel { flex: 1; padding: 10px 0; border: 1px solid #d1d5db; background: #fff; border-radius: 6px; font-weight: 600; font-size: 0.9rem; cursor: pointer; color: #374151; transition: background 0.2s; }
  .et-confirm-btn-cancel:hover { background: #f3f4f6; }
  .et-confirm-btn-del { flex: 1; padding: 10px 0; border: none; background: #dc2626; border-radius: 6px; font-weight: 600; font-size: 0.9rem; cursor: pointer; color: #fff; transition: background 0.2s; }
  .et-confirm-btn-del:hover { background: #b91c1c; }

  @keyframes et-in { from { transform: translateY(-10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

  .et-toggle-row { display: flex; align-items: center; justify-content: space-between; }
  .et-toggle-lbl { font-size: 0.95rem; font-weight: 600; }
  .et-toggle-sub { font-size: 0.8rem; color: #6b7280; margin-top: 4px; }
  
  .et-toggle { position:relative; display:inline-flex; align-items:center; cursor:pointer; }
  .et-toggle input { position:absolute; opacity:0; width:0; height:0; }
  .et-track { width:46px; height:24px; border-radius:12px; background:#d1d5db; transition:background .22s; display:flex; align-items:center; padding:2px; }
  .et-track.on { background:var(--et-purple); }
  .et-thumb { width:20px; height:20px; border-radius:50%; background:#fff; box-shadow:0 1px 3px rgba(0,0,0,.25); transition:transform .22s; }
  .et-thumb.on { transform:translateX(22px); }

  .et-modal-ft { padding-top: 10px; }
  .et-btn-purple { background: var(--et-purple); color: #fff; padding: 12px 24px; border: none; border-radius: 4px; font-weight: 500; cursor: pointer; }
  .et-btn-purple:hover { background: #3b0764; }

  .et-dropdown-menu { position: absolute; right: 0; top: 100%; margin-top: 4px; background: #fff; border: 1px solid var(--et-border); box-shadow: 0 4px 12px rgba(0,0,0,0.1); border-radius: 4px; z-index: 10; min-width: 120px; display: flex; flex-direction: column; overflow: hidden; }
  .et-dropdown-item { padding: 8px 16px; font-size: 0.875rem; color: var(--et-txt); background: transparent; border: none; text-align: left; cursor: pointer; }
  .et-dropdown-item:hover { background: #f3f4f6; }
  .et-dropdown-item.danger { color: var(--et-danger); }

  .et-toolbar { display: flex; gap: 12px; }

  /* Toast */
  .et-toast {
    position:fixed; bottom:28px; right:28px; z-index:99999;
    padding:13px 20px; border-radius:4px;
    font-size:.875rem; font-weight:600;
    box-shadow:0 10px 25px rgba(0,0,0,.15);
    display:flex; align-items:center; gap:10px;
    background: #1f2937; color: #fff;
  }
`;

function FloatingInput({ id, label, value, onChange }: { id: string, label: string, value: string, onChange: (v: string) => void }) {
  const [focused, setFocused] = useState(false);
  const lifted = focused || value.length > 0;
  return (
    <div className="et-fw">
      <div className={`et-field ${focused ? "focus" : ""}`}>
        <label htmlFor={id} className={`et-lbl ${lifted ? "up" : ""}`}>{label}</label>
        <input id={id} className="et-inp" value={value} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onChange={(e) => onChange(e.target.value)} autoComplete="off" />
      </div>
    </div>
  );
}

function FloatingTextarea({ id, label, value, onChange }: { id: string, label: string, value: string, onChange: (v: string) => void }) {
  const [focused, setFocused] = useState(false);
  const lifted = focused || value.length > 0;
  return (
    <div className="et-fw">
      <div className={`et-field ${focused ? "focus" : ""}`} style={{ position: "relative" }}>
        <label htmlFor={id} className={`et-lbl-ta ${lifted ? "up" : ""}`}>{label}</label>
        <textarea id={id} className="et-ta" value={value} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onChange={(e) => onChange(e.target.value)} />
      </div>
    </div>
  );
}

function generateCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let res = 'etp_';
  for(let i=0; i<11; i++) res += chars.charAt(Math.floor(Math.random() * chars.length));
  return res;
}

interface ExamType {
  id: string;
  code: string;
  name: string;
  color: string;
  imageUrl: string;
  description: string;
  isActive: boolean;
}

const mockData: ExamType[] = [
  { id: '1', code: 'etp_aBDbMjvPpBO', name: 'KARONA eeeeee', color: '#ff0000', imageUrl: '', description: '', isActive: true },
  { id: '2', code: 'etp_zw3nXNRNoSF', name: 'elite', color: '#00ff00', imageUrl: '', description: '', isActive: true },
  { id: '3', code: 'etp_iPhJW8xQymU', name: '55', color: '#0000ff', imageUrl: '', description: '', isActive: true },
  { id: '4', code: 'etp_kxYmRJQa2un', name: 'SSS', color: '#ff00ff', imageUrl: '', description: '', isActive: true },
  { id: '5', code: 'etp_OtuUZBkImTB', name: 'Mackerel/ Kannangadathala', color: '#ffff00', imageUrl: '', description: '', isActive: true },
  { id: '6', code: 'etp_89a7pQ1kujJ', name: 'iit jee', color: '#00ffff', imageUrl: '', description: '', isActive: true },
  { id: '7', code: 'etp_F7eitPNsb90', name: 'Love', color: '#f0f0f0', imageUrl: '', description: '', isActive: true },
  { id: '8', code: 'etp_2WChYMiBNVg', name: 'Short', color: '#333333', imageUrl: '', description: '', isActive: true },
  { id: '9', code: 'etp_gN79boYYJjV', name: 'Online Test', color: '#777777', imageUrl: '', description: '', isActive: true },
  { id: '10', code: 'etp_TifMy1vdvmo', name: 'Class Test', color: '#aaa', imageUrl: '', description: '', isActive: true },
];

const emptyForm = { name: '', color: '#ff0000', imageUrl: '', description: '', isActive: true };

export default function ExamTypesManager() {
  const [items, setItems] = useState<ExamType[]>(mockData);
  const [searchCode, setSearchCode] = useState("");
  const [searchName, setSearchName] = useState("");
  const [searchStatus, setSearchStatus] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);

  const { showToast } = useToast();

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'single' | 'bulk', id?: string, code?: string } | null>(null);



  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    showToast(`Copied ${code} to clipboard`);
  };

  const filteredItems = items.filter(it => 
    it.code.toLowerCase().includes(searchCode.toLowerCase()) &&
    it.name.toLowerCase().includes(searchName.toLowerCase()) &&
    (searchStatus === "" ? true : searchStatus === "active" ? it.isActive : !it.isActive)
  );

  const toggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedIds(new Set(filteredItems.map(i => i.id)));
    else setSelectedIds(new Set());
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const confirmDeleteAction = () => {
    if (!deleteConfirm) return;
    if (deleteConfirm.type === 'bulk') {
      setItems(items.filter(it => !selectedIds.has(it.id)));
      setSelectedIds(new Set());
      showToast("Items deleted successfully");
    } else if (deleteConfirm.type === 'single' && deleteConfirm.id) {
      setItems(items.filter(it => it.id !== deleteConfirm.id));
      showToast("Item deleted");
    }
    setDeleteConfirm(null);
  };

  const bulkDelete = () => {
    if(selectedIds.size === 0) return;
    setDeleteConfirm({ type: 'bulk' });
  };

  const openAdd = () => {
    setEditId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (it: ExamType) => {
    setEditId(it.id);
    setForm({ name: it.name, color: it.color, imageUrl: it.imageUrl, description: it.description, isActive: it.isActive });
    setModalOpen(true);
    setOpenDropdown(null);
  };

  const handleDelete = (id: string, code: string) => {
    setDeleteConfirm({ type: 'single', id, code });
    setOpenDropdown(null);
  };

  const save = () => {
    if(!form.name.trim()) return;
    if(editId) {
      setItems(items.map(it => it.id === editId ? { ...it, ...form } : it));
      showToast("Updated successfully");
    } else {
      setItems([{...form, id: Math.random().toString(), code: generateCode()}, ...items]);
      showToast("Created successfully");
    }
    setModalOpen(false);
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      <div className="et-root">
        <div className="et-header">
          <h1 className="et-title">Exam Types</h1>
          <div className="et-toolbar">
            {selectedIds.size > 0 && (
              <button className="et-btn-danger" onClick={bulkDelete}>
                Delete Selected ({selectedIds.size})
              </button>
            )}
            <button className="et-btn-primary" onClick={openAdd}>
              New Exam Type
            </button>
          </div>
        </div>

        <div className="et-card">
          <div style={{ display: 'flex', gap: 12, padding: '20px 24px', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: 300 }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', display: 'flex', alignItems: 'center' }}>
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              </span>
              <input placeholder="Search code..." value={searchCode} onChange={e=>setSearchCode(e.target.value)} style={{ width: '100%', padding: '10px 12px 10px 36px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: '0.85rem', boxSizing: 'border-box', outline: 'none' }} />
            </div>

            <div style={{ position: 'relative', flex: 1, maxWidth: 300 }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', display: 'flex', alignItems: 'center' }}>
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7"></path></svg>
              </span>
              <input placeholder="Search name..." value={searchName} onChange={e=>setSearchName(e.target.value)} style={{ width: '100%', padding: '10px 12px 10px 36px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: '0.85rem', boxSizing: 'border-box', outline: 'none' }} />
            </div>

            <div style={{ position: 'relative', width: 180 }}>
              <select value={searchStatus} onChange={e=>setSearchStatus(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: '0.85rem', appearance: 'auto', background: '#fff', boxSizing: 'border-box', color: '#4b5563', outline: 'none' }}>
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <table className="et-table">
            <thead>
              <tr>
                <th className="et-table-th" style={{ width: 40 }}>
                  <input type="checkbox" className="et-checkbox" 
                    checked={filteredItems.length > 0 && selectedIds.size === filteredItems.length}
                    onChange={toggleSelectAll} 
                  />
                </th>
                <th className="et-table-th">CODE</th>
                <th className="et-table-th">NAME</th>
                <th className="et-table-th">STATUS</th>
                <th className="et-table-th" style={{ width: 120 }}>ACTIONS</th>
              </tr>

            </thead>
            <tbody>
              {filteredItems.map(it => (
                <tr key={it.id}>
                  <td className="et-table-td">
                    <input type="checkbox" className="et-checkbox" checked={selectedIds.has(it.id)} onChange={() => toggleSelect(it.id)} />
                  </td>
                  <td className="et-table-td">
                    <div className="et-code-wrap">
                      <span className="et-code">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                        {it.code}
                      </span>
                      <button className="et-copy-btn" onClick={() => copyCode(it.code)} title="Copy Code">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                      </button>
                    </div>
                  </td>
                  <td className="et-table-td" style={{fontWeight:500}}>{it.name}</td>
                  <td className="et-table-td">
                    <span className={it.isActive ? "et-badge-on" : "et-badge-off"}>
                      {it.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="et-table-td">
                    <div style={{ position: 'relative' }}>
                      <button className="et-actions-btn" onClick={() => setOpenDropdown(openDropdown === it.id ? null : it.id)}>
                        Actions
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                      </button>
                      {openDropdown === it.id && (
                        <div className="et-dropdown-menu">
                          <button className="et-dropdown-item" onClick={() => openEdit(it)}>Edit</button>
                          <button className="et-dropdown-item danger" onClick={() => handleDelete(it.id, it.code)}>Delete</button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                    No exam types found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="et-overlay" onMouseDown={(e) => { if(e.target===e.currentTarget) setModalOpen(false); }}>
          <div className="et-modal" style={{ maxWidth: '700px' }}>
            <div className="et-modal-hd">
              <h2 className="et-modal-ht">{editId ? 'Edit Exam Type' : 'New Exam Type'}</h2>
              <button className="et-modal-x" onClick={() => setModalOpen(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="et-modal-inner">
              <FloatingInput id="etp-name" label="Exam Type Name" value={form.name} onChange={v => setForm({...form, name: v})} />
              
              <div style={{ marginBottom: 24 }}>
                <span className="et-color-lbl">Color</span>
                <div className="et-color-wrap">
                  <div className="et-color-block" style={{ backgroundColor: form.color }}></div>
                  <input className="et-color-input" value={form.color} onChange={e=>setForm({...form, color: e.target.value})} />
                </div>
              </div>

              <FloatingInput id="etp-image" label="Image URL" value={form.imageUrl} onChange={v => setForm({...form, imageUrl: v})} />

              <FloatingTextarea id="etp-desc" label="Description" value={form.description} onChange={v => setForm({...form, description: v})} />

              <div className="et-toggle-row">
                <div>
                  <div className="et-toggle-lbl">Active</div>
                  <div className="et-toggle-sub">Active (Shown Everywhere). In-active (Hidden Everywhere).</div>
                </div>
                <label className="et-toggle">
                  <input type="checkbox" checked={form.isActive} onChange={() => setForm({...form, isActive: !form.isActive})} />
                  <span className={`et-track${form.isActive ? ' on' : ''}`}>
                    <span className={`et-thumb${form.isActive ? ' on' : ''}`} />
                  </span>
                </label>
              </div>

              <div className="et-modal-ft">
                <button className="et-btn-purple" onClick={save}>{editId ? 'Save Changes' : 'Create'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="et-overlay" style={{ zIndex: 100000 }}>
          <div className="et-confirm">
            <div className="et-confirm-icon-wrap">
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line>
              </svg>
            </div>
            <h3 className="et-confirm-ht">Delete Exam Type{deleteConfirm.type === 'bulk' ? 's' : ''}?</h3>
            {deleteConfirm.code && (
               <span className="et-confirm-pill">{deleteConfirm.code}</span>
            )}
            <p className="et-confirm-tx">
              This action is <strong>permanent</strong> and cannot be undone.<br/>
              Are you sure you want to delete {deleteConfirm.type === 'bulk' ? 'these resources' : 'this resource'}?
            </p>
            <div className="et-confirm-row">
              <button className="et-confirm-btn-cancel" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="et-confirm-btn-del" onClick={confirmDeleteAction}>Delete</button>
            </div>
          </div>
        </div>
      )}


    </>
  );
}
