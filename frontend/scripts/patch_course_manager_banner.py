import re

with open(r'c:\Users\sahim\Desktop\IINM_PROJECT\iinm\frontend\src\app\admin\components\CourseManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Interface
content = content.replace("thumbnail_url?: string;", "thumbnail_url?: string;\n  banner_url?: string;")

# 2. State
content = content.replace('const [formThumbnail, setFormThumbnail] = useState("");', 'const [formThumbnail, setFormThumbnail] = useState("");\n  const [formBannerUrl, setFormBannerUrl] = useState("");')

# 3. openModal set
content = content.replace('setFormThumbnail(course.thumbnail_url || "");', 'setFormThumbnail(course.thumbnail_url || "");\n      setFormBannerUrl(course.banner_url || "");')

# 4. openModal reset
content = content.replace('setFormThumbnail("");', 'setFormThumbnail("");\n      setFormBannerUrl("");')

# 5. payload
content = content.replace('thumbnail_url: formThumbnail.trim() || null,', 'thumbnail_url: formThumbnail.trim() || null,\n        banner_url: formBannerUrl.trim() || null,')

# 6. Modal resizing (from 85% to 95%)
content = content.replace('width: "85%", maxWidth: 1200, height: "85vh"', 'width: "95%", maxWidth: 1600, height: "95vh"')

# 7. Left column width and scroll class
# old: <div style={{ width: "35%", minWidth: 320, padding: 28, borderRight: "1px solid #e2e8f0", overflowY: "auto", background: "#fff" }}>
# new: <div className="custom-scroll" style={{ width: "40%", minWidth: 400, padding: "28px 36px", borderRight: "1px solid #e2e8f0", overflowY: "auto", background: "#fff" }}>
content = re.sub(
    r'<div style=\{{\s*width: "35%",\s*minWidth: 320,\s*padding: 28,\s*borderRight: "1px solid #e2e8f0",\s*overflowY: "auto",\s*background: "#fff"\s*\}}>',
    '<div className="custom-scroll" style={{ width: "40%", minWidth: 400, padding: "28px 36px", borderRight: "1px solid #e2e8f0", overflowY: "auto", background: "#fff" }}>',
    content
)

# Right column overflow area custom scroll
content = content.replace('      <div style={{ flex: 1, overflowY: "auto", padding: 28 }}>', '      <div className="custom-scroll" style={{ flex: 1, overflowY: "auto", padding: 28 }}>')

# 8. Add Banner URL input to the UI
ui_old = """                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Thumbnail URL</label>
                    <input type="text" value={formThumbnail} onChange={e => setFormThumbnail(e.target.value)} placeholder="https://..." style={{ ...inputStyle, padding: "10px 14px", fontSize: 13 }} />
                  </div>"""

ui_new = """                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Thumbnail URL</label>
                    <input type="text" value={formThumbnail} onChange={e => setFormThumbnail(e.target.value)} placeholder="https://..." style={{ ...inputStyle, padding: "10px 14px", fontSize: 13 }} />
                  </div>
                  
                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Full Course Banner URL</label>
                    <input type="text" value={formBannerUrl} onChange={e => setFormBannerUrl(e.target.value)} placeholder="https://..." style={{ ...inputStyle, padding: "10px 14px", fontSize: 13 }} />
                  </div>"""
content = content.replace(ui_old, ui_new)


# 9. Style injection
style_old = """        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}} />"""

style_new = """        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .custom-scroll::-webkit-scrollbar { width: 6px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}} />"""
content = content.replace(style_old, style_new)


with open(r'c:\Users\sahim\Desktop\IINM_PROJECT\iinm\frontend\src\app\admin\components\CourseManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Patch applied")
