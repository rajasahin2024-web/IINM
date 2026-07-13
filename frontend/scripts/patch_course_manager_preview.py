import re

with open("src/app/admin/components/CourseManager.tsx", "r", encoding="utf-8") as f:
    text = f.read()

# 1. Add Helper functions at the top, right after imports
helpers = """
function getYouTubeId(url: string): string | null {
  const regExp = /(?:youtube\\.com\\/(?:[^/]+\\/.+\\/|(?:v|e(?:mbed)?)\\/|.*[?&]v=)|youtu\\.be\\/)([^"&?/\\s]{11})/;
  const match = url.match(regExp);
  return match ? match[1] : null;
}

const TYPE_CONFIG: Record<string, { bg: string; color: string; label: string }> = {
  video:    { bg: "#ede9fe", color: "#7c3aed", label: "VIDEO" },
  youtube:  { bg: "#fee2e2", color: "#dc2626", label: "YT" },
  pdf:      { bg: "#fef3c7", color: "#d97706", label: "PDF" },
  image:    { bg: "#d1fae5", color: "#059669", label: "IMG" },
  document: { bg: "#dbeafe", color: "#2563eb", label: "DOC" },
};

function getTypeConfig(type: string) {
  return TYPE_CONFIG[type] || { bg: "#f1f5f9", color: "#64748b", label: type.toUpperCase() };
}

function MediaPreviewModal({ material, onClose }: { material: Material; onClose: () => void }) {
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const ytId = material.youtube_url ? getYouTubeId(material.youtube_url) : null;
  const tc = getTypeConfig(material.file_type || "document");

  const renderPlayer = () => {
    if (material.file_type === "youtube" && ytId) {
      return (
        <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, width: "100%" }}>
          <iframe src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none", borderRadius: 10 }} />
        </div>
      );
    }
    if (material.file_type === "video" && material.file_url) {
      return <video src={material.file_url} controls autoPlay controlsList="nodownload" style={{ width: "100%", maxHeight: "70vh", borderRadius: 10, background: "#000", display: "block" }} />;
    }
    if (material.file_type === "pdf" && material.file_url) {
      return <iframe src={material.file_url} style={{ width: "100%", height: "70vh", border: "none", borderRadius: 10 }} title={material.title} />;
    }
    if (material.file_type === "image" && material.file_url) {
      return <img src={material.file_url} alt={material.title} style={{ maxWidth: "100%", maxHeight: "70vh", borderRadius: 10, display: "block", margin: "0 auto", objectFit: "contain" }} />;
    }
    return (
      <div style={{ textAlign: "center", padding: "60px 20px", color: "#94a3b8" }}>
        <p style={{ margin: 0, fontSize: 14 }}>No preview available.</p>
        {material.file_url && (
          <a href={material.file_url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: 14, padding: "8px 20px", background: "#6366f1", color: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>Open File ↗</a>
        )}
      </div>
    );
  };

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }} style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(10,15,30,0.85)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ background: "#0f172a", borderRadius: 18, width: "100%", maxWidth: 900, boxShadow: "0 40px 100px rgba(0,0,0,0.6)", overflow: "hidden", animation: "slideUp 0.3s ease-out" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", background: "#1e293b", borderBottom: "1px solid #334155" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ background: tc.bg, color: tc.color, fontSize: 10, fontWeight: 800, padding: "3px 9px", borderRadius: 6 }}>{tc.label}</span>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#f1f5f9", maxWidth: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{material.title}</h3>
          </div>
          <button onClick={onClose} style={{ background: "#334155", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8" }}>
            <Icon name="x" size={16} />
          </button>
        </div>
        <div style={{ padding: "20px", background: "#0f172a" }}>{renderPlayer()}</div>
      </div>
    </div>
  );
}

"""
if "function getYouTubeId" not in text:
    text = text.replace('const API = `${API_BASE_URL}`;', 'const API = `${API_BASE_URL}`;\n' + helpers)


# 2. Add state `previewMaterial` inside `export default function CourseManager`
if "const [previewMaterial" not in text:
    text = text.replace('const [activeChapterId, setActiveChapterId] = useState<number | null>(null);',
                        'const [activeChapterId, setActiveChapterId] = useState<number | null>(null);\n  const [previewMaterial, setPreviewMaterial] = useState<Material | null>(null);')


# 3. Replace the `<a>` element with a `<button>` that triggers the preview
old_button_code = """<a href={targetUrl} target="_blank" rel="noreferrer" style={{ textDecoration: "none", fontWeight: 700, fontSize: 12, display: "flex", alignItems: "center", gap: 6, background: "#f8fafc", color: "#0ea5e9", border: "1.5px solid #e2e8f0", padding: "8px 14px", borderRadius: 8, transition: "background 0.2s" }} onMouseEnter={e=>e.currentTarget.style.background="#f0f9ff"} onMouseLeave={e=>e.currentTarget.style.background="#f8fafc"}>
                                         <Icon name="external-link" size={12} /> Play / View
                                      </a>"""

new_button_code = """<button onClick={() => setPreviewMaterial(mat)} type="button" style={{ border: "1.5px solid #e2e8f0", background: "#f8fafc", color: "#0ea5e9", fontWeight: 700, fontSize: 12, display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, transition: "background 0.2s", cursor: "pointer" }} onMouseEnter={e=>e.currentTarget.style.background="#f0f9ff"} onMouseLeave={e=>e.currentTarget.style.background="#f8fafc"}>
                                         <Icon name="play-circle" size={12} /> Play / View
                                      </button>"""

if old_button_code in text:
    text = text.replace(old_button_code, new_button_code)
else:
    print("Warning: link button code not found exactly")


# 4. Insert `<MediaPreviewModal />` just before `<style dangerouslySetInnerHTML...`
modal_render = """
      {previewMaterial && (
        <MediaPreviewModal material={previewMaterial} onClose={() => setPreviewMaterial(null)} />
      )}
"""
if "MediaPreviewModal material=" not in text:
    text = text.replace('{/* Basic Keyframes for modal animation */}', modal_render + '\n      {/* Basic Keyframes for modal animation */}')

with open("src/app/admin/components/CourseManager.tsx", "w", encoding="utf-8") as f:
    f.write(text)

print("CourseManager updated successfully.")
