import re

with open(r'c:\Users\sahim\Desktop\IINM_PROJECT\iinm\frontend\src\app\admin\components\CourseManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add ImageDropzoneField function before CourseManager component
dropzone_code = """function ImageDropzoneField({
  label, value, onChange, placeholder
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string;
}) {
  const [uploading, setUploading] = React.useState(false);
  const [dragOver, setDragOver] = React.useState(false);

  const handleFile = async (file: File) => {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`${API_BASE_URL}/settings/site/upload`, {
        method: "POST",
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        onChange(data.url);
        toast.success("Image uploaded!");
      } else {
        toast.error("Upload failed");
      }
    } catch {
      toast.error("Network error. Could not upload image.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <label style={labelStyle}>{label}</label>
      <div 
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => {
           e.preventDefault(); setDragOver(false); 
           if(e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
        }}
        style={{
          border: dragOver ? "2px dashed #0ea5e9" : "1px solid #e2e8f0",
          background: dragOver ? "#f0f9ff" : "#f8fafc",
          borderRadius: 12,
          padding: "16px",
          transition: "all 0.2s"
        }}
      >
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
           {value && (value.startsWith("http") || value.startsWith("/")) && (
             <img src={value.startsWith("http") ? value : `${API_BASE_URL.replace('/api', '')}${value}`} alt="Preview" style={{ width: 36, height: 36, borderRadius: 6, objectFit: "cover" }} />
           )}
           <div style={{ flex: 1 }}>
             <input 
               type="text" 
               value={value} 
               onChange={e => onChange(e.target.value)} 
               placeholder={placeholder} 
               style={{ width: "100%", padding: "8px 0", border: "none", background: "transparent", outline: "none", fontSize: 13, color: "#0f172a" }} 
             />
           </div>
           
           <div style={{ position: "relative", overflow: "hidden" }}>
             <button type="button" disabled={uploading} style={{ background: "#e0f2fe", color: "#0284c7", border: "1px solid #bae6fd", padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
               {uploading ? "Uploading..." : "Upload File"}
             </button>
             <input type="file" accept="image/*" onChange={e => {
                if (e.target.files) handleFile(e.target.files[0]);
                e.target.value = ""; // reset
             }} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer" }} />
           </div>
        </div>
        <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 8, fontWeight: 600 }}>
          {uploading ? "Uploading, please wait..." : "Paste a URL or drag & drop an image here"}
        </div>
      </div>
    </div>
  );
}

export default function CourseManager() {"""

content = content.replace("export default function CourseManager() {", dropzone_code)

# 2. Replace the UI for Thumbnail and Banner with the new component
ui_old = """                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Thumbnail URL</label>
                    <input type="text" value={formThumbnail} onChange={e => setFormThumbnail(e.target.value)} placeholder="https://..." style={{ ...inputStyle, padding: "10px 14px", fontSize: 13 }} />
                  </div>
                  
                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Full Course Banner URL</label>
                    <input type="text" value={formBannerUrl} onChange={e => setFormBannerUrl(e.target.value)} placeholder="https://..." style={{ ...inputStyle, padding: "10px 14px", fontSize: 13 }} />
                  </div>"""

ui_new = """                  <ImageDropzoneField label="Thumbnail URL" value={formThumbnail} onChange={setFormThumbnail} placeholder="https://..." />
                  <ImageDropzoneField label="Full Course Banner URL" value={formBannerUrl} onChange={setFormBannerUrl} placeholder="https://..." />"""

content = content.replace(ui_old, ui_new)

with open(r'c:\Users\sahim\Desktop\IINM_PROJECT\iinm\frontend\src\app\admin\components\CourseManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Patch for Dropzone Upload successfully applied.")
