"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { API_BASE_URL } from "@/lib/config";

interface R2Video {
  id: number;
  title: string;
  file_url: string | null;
  thumbnail_url: string | null;
  file_size: number | null;
  file_type: string;
}

interface R2VideoPickerProps {
  onClose: () => void;
  onSelect: (material: { file_url: string; title: string; thumbnail_url: string | null }) => void;
}

function formatBytes(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export default function R2VideoPicker({ onClose, onSelect }: R2VideoPickerProps) {
  const [search, setSearch] = useState("");
  const [videos, setVideos] = useState<R2Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<R2Video | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchVideos = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const url = `${API_BASE_URL}/materials?file_type=video${query ? `&search=${encodeURIComponent(query)}` : ""}`;
      const res = await apiFetch(url);
      if (res.ok) {
        const data = await res.json();
        setVideos(data);
      } else {
        setVideos([]);
      }
    } catch {
      setVideos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVideos("");
  }, [fetchVideos]);

  const handleSearch = (val: string) => {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchVideos(val), 300);
  };

  const handleConfirm = () => {
    if (!selected || !selected.file_url) return;
    onSelect({
      file_url: selected.file_url,
      title: selected.title,
      thumbnail_url: selected.thumbnail_url,
    });
    onClose();
  };

  const getThumbUrl = (v: R2Video) => {
    if (!v.thumbnail_url) return "";
    return v.thumbnail_url.startsWith("http") ? v.thumbnail_url : `${API_BASE_URL.replace("/api", "")}${v.thumbnail_url}`;
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,0.6)",
      display: "flex", alignItems: "center", justifyContent: "center",
      animation: "r2picker-fade 0.2s ease",
    }}>
      <style>{`
        @keyframes r2picker-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes r2picker-slide { from { opacity:0; transform:translateY(20px) scale(0.98); } to { opacity:1; transform:translateY(0) scale(1); } }
      `}</style>
      <div style={{
        width: "90%", maxWidth: 720, maxHeight: "80vh", background: "#fff",
        borderRadius: 12, display: "flex", flexDirection: "column",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        animation: "r2picker-slide 0.25s ease",
      }}>
        {/* Header */}
        <div style={{
          padding: "16px 20px", borderBottom: "1px solid #e2e8f0",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          background: "#f8fafc", borderRadius: "12px 12px 0 0",
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>R2 Video Library</h3>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#94a3b8" }}>Search and select an R2 video from your library</p>
          </div>
          <button onClick={onClose} style={{
            background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: 6,
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        {/* Search bar */}
        <div style={{ padding: "12px 20px", borderBottom: "1px solid #e2e8f0" }}>
          <div style={{ position: "relative" }}>
            <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input
              type="text"
              value={search}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Search by title..."
              autoFocus
              style={{
                width: "100%", padding: "10px 12px 10px 38px", borderRadius: 8,
                border: "1.5px solid #e2e8f0", fontSize: 14, color: "#0f172a",
                outline: "none", boxSizing: "border-box", transition: "border-color 0.2s",
              }}
              onFocus={e => e.currentTarget.style.borderColor = "#6366f1"}
              onBlur={e => e.currentTarget.style.borderColor = "#e2e8f0"}
            />
            {loading && (
              <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "#6366f1", fontWeight: 600 }}>Loading...</span>
            )}
          </div>
        </div>

        {/* Video grid */}
        <div style={{ flex: 1, overflowY: "auto", padding: 16, minHeight: 200 }}>
          {videos.length === 0 && !loading ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8", fontSize: 14 }}>
              No videos found. Upload videos from the Library page first.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
              {videos.map(v => {
                const thumb = getThumbUrl(v);
                const isSelected = selected?.id === v.id;
                return (
                  <div
                    key={v.id}
                    onClick={() => setSelected(v)}
                    style={{
                      borderRadius: 8,
                      overflow: "hidden",
                      border: `2px solid ${isSelected ? "#6366f1" : "#e2e8f0"}`,
                      cursor: "pointer",
                      transition: "border-color 0.15s, transform 0.15s",
                      transform: isSelected ? "translateY(-2px)" : "none",
                      boxShadow: isSelected ? "0 4px 12px rgba(99,102,241,0.2)" : "none",
                      background: "#f8fafc",
                    }}
                  >
                    {/* Thumbnail */}
                    <div style={{ position: "relative", aspectRatio: "16/9", background: "#0a1628", overflow: "hidden" }}>
                      {thumb ? (
                        <img src={thumb} alt={v.title} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.9 }} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><polygon points="10,8 16,12 10,16" fill="#475569" stroke="none" /></svg>
                        </div>
                      )}
                      {isSelected && (
                        <div style={{ position: "absolute", top: 6, right: 6, background: "#6366f1", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><polyline points="20 6 9 17 4 12" /></svg>
                        </div>
                      )}
                    </div>
                    {/* Info */}
                    <div style={{ padding: "8px 10px" }}>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v.title}</p>
                      <p style={{ margin: "2px 0 0", fontSize: 10, color: "#94a3b8" }}>{formatBytes(v.file_size)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: "12px 20px", borderTop: "1px solid #e2e8f0", background: "#f8fafc",
          borderRadius: "0 0 12px 12px", display: "flex", justifyContent: "flex-end", gap: 10,
        }}>
          <button onClick={onClose} style={{
            padding: "9px 18px", borderRadius: 8, border: "1.5px solid #e2e8f0", background: "#fff",
            color: "#64748b", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
          }}>Cancel</button>
          <button
            onClick={handleConfirm}
            disabled={!selected}
            style={{
              padding: "9px 22px", borderRadius: 8, border: "none",
              background: selected ? "#6366f1" : "#cbd5e1", color: "#fff",
              fontSize: 13, fontWeight: 600, cursor: selected ? "pointer" : "not-allowed",
              transition: "all 0.15s",
            }}>Select Video</button>
        </div>
      </div>
    </div>
  );
}
