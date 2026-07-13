import re

filepath = r"c:\Users\sahim\Desktop\IINM_PROJECT\iinm\frontend\src\app\admin\teachers\page.tsx"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update Teacher Interface
interface_replacement = """interface Teacher {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  is_active: boolean;
  qualification?: string | null;
  experience_years?: string | null;
  designation?: string | null;
  specialization?: string | null;
  social_linkedin?: string | null;
  social_twitter?: string | null;
  social_website?: string | null;
  intro_video_url?: string | null;
  achievements?: string | null;
  created_at: string;
}"""
content = re.sub(r'interface Teacher \{.*?\s*created_at:\s*string;\s*\}', interface_replacement, content, flags=re.DOTALL)

# 2. defaultForm
default_form_new = 'const defaultForm = { name: "", email: "", phone: "", bio: "", avatar_url: "", is_active: true, qualification: "", experience_years: "", designation: "", specialization: "", social_linkedin: "", social_twitter: "", social_website: "", intro_video_url: "", achievements: "" };'
content = re.sub(r'const defaultForm = \{[^}]*\};', default_form_new, content)

# 3. openEdit
open_edit_old = r'setFormData\(\{ name: t\.name \?\? "", email: t\.email \?\? "", phone: t\.phone \?\? "", bio: t\.bio \?\? "", avatar_url: t\.avatar_url \?\? "", is_active: t\.is_active !== false \}\);'
open_edit_new = """setFormData({ 
      name: t.name ?? "", email: t.email ?? "", phone: t.phone ?? "", bio: t.bio ?? "", avatar_url: t.avatar_url ?? "", is_active: t.is_active !== false,
      qualification: t.qualification ?? "", experience_years: t.experience_years ?? "", designation: t.designation ?? "", specialization: t.specialization ?? "",
      social_linkedin: t.social_linkedin ?? "", social_twitter: t.social_twitter ?? "", social_website: t.social_website ?? "", intro_video_url: t.intro_video_url ?? "", achievements: t.achievements ?? ""
    });"""
content = re.sub(open_edit_old, open_edit_new, content)

# 4. handleSubmit
submit_old = r'avatar_url:\s*formData\.avatar_url\.trim\(\)\s*\|\|\s*null,'
submit_new = """avatar_url: formData.avatar_url.trim() || null,
            qualification: formData.qualification.trim() || null,
            experience_years: formData.experience_years.trim() || null,
            designation: formData.designation.trim() || null,
            specialization: formData.specialization.trim() || null,
            social_linkedin: formData.social_linkedin.trim() || null,
            social_twitter: formData.social_twitter.trim() || null,
            social_website: formData.social_website.trim() || null,
            intro_video_url: formData.intro_video_url.trim() || null,
            achievements: formData.achievements.trim() || null,"""
content = re.sub(submit_old, submit_new, content)

# 5. Form UI
form_ui_old = """                {/* Row 1 — Full Name (full width) */}
                <FloatingInput
                  label="Full Name"
                  value={formData.name}
                  onChange={v => setFormData({ ...formData, name: v })}
                  required
                  autoFocus
                />

                {/* Row 2 — Email + Phone */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                  <FloatingInput
                    label="Email Address"
                    type="email"
                    value={formData.email}
                    onChange={v => setFormData({ ...formData, email: v })}
                  />
                  <FloatingInput
                    label="Phone Number"
                    value={formData.phone}
                    onChange={v => setFormData({ ...formData, phone: v })}
                  />
                </div>

                {/* Row 3 — Avatar URL + Bio */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                  <ImageDropzoneField
                    label="Avatar Image (optional)"
                    value={formData.avatar_url}
                    onChange={v => setFormData({ ...formData, avatar_url: v })}
                    placeholder="Drag & drop or paste URL..."
                  />
                  <FloatingInput
                    label="Short Bio (optional)"
                    value={formData.bio}
                    onChange={v => setFormData({ ...formData, bio: v })}
                    isTextArea
                  />
                </div>

                {/* Row 4 — Active Status toggle */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderRadius: 12, border: "1.5px solid #e2e8f0", background: "#f8fafc" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>Active Status</div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Inactive teachers won't appear in batch assignment</div>
                  </div>
                  <label style={{ position: "relative", display: "inline-block", width: 46, height: 26, cursor: "pointer", flexShrink: 0 }}>
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                      style={{ opacity: 0, width: 0, height: 0, position: "absolute" }}
                    />
                    <span style={{ position: "absolute", inset: 0, background: formData.is_active ? "#0ea5e9" : "#cbd5e1", borderRadius: 13, transition: "background 0.25s" }} />
                    <span style={{ position: "absolute", top: 3, left: formData.is_active ? 23 : 3, width: 20, height: 20, background: "#fff", borderRadius: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.25)", transition: "left 0.25s" }} />
                  </label>
                </div>"""

form_ui_new = """                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#0f172a", textTransform: "uppercase", letterSpacing: 0.5, paddingBottom: 8, borderBottom: "1px solid #e2e8f0" }}>Basic Information</h4>
                <FloatingInput label="Full Name *" value={formData.name} onChange={v => setFormData({ ...formData, name: v })} required autoFocus />
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                  <FloatingInput label="Email Address" type="email" value={formData.email} onChange={v => setFormData({ ...formData, email: v })} />
                  <FloatingInput label="Phone Number" value={formData.phone} onChange={v => setFormData({ ...formData, phone: v })} />
                </div>
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                  <FloatingInput label="Designation / Title (e.g. Senior Instructor)" value={formData.designation} onChange={v => setFormData({ ...formData, designation: v })} />
                  <FloatingInput label="Years of Experience (e.g. 5+ Years)" value={formData.experience_years} onChange={v => setFormData({ ...formData, experience_years: v })} />
                </div>
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                  <FloatingInput label="Qualifications (e.g. Ph.D. in Computer Science)" value={formData.qualification} onChange={v => setFormData({ ...formData, qualification: v })} />
                  <FloatingInput label="Specializations (e.g. Math, Python)" value={formData.specialization} onChange={v => setFormData({ ...formData, specialization: v })} />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                  <ImageDropzoneField label="Avatar Image (optional)" value={formData.avatar_url} onChange={v => setFormData({ ...formData, avatar_url: v })} placeholder="Drag & drop or paste URL..." />
                  <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                     <FloatingInput label="Short Bio (optional)" value={formData.bio} onChange={v => setFormData({ ...formData, bio: v })} isTextArea />
                  </div>
                </div>

                <FloatingInput label="Achievements / Awards (optional)" value={formData.achievements} onChange={v => setFormData({ ...formData, achievements: v })} isTextArea />

                <h4 style={{ margin: "10px 0 0", fontSize: 14, fontWeight: 700, color: "#0f172a", textTransform: "uppercase", letterSpacing: 0.5, paddingBottom: 8, borderBottom: "1px solid #e2e8f0" }}>Social & Links</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                  <FloatingInput label="LinkedIn Profile URL" value={formData.social_linkedin} onChange={v => setFormData({ ...formData, social_linkedin: v })} />
                  <FloatingInput label="Twitter Profile URL" value={formData.social_twitter} onChange={v => setFormData({ ...formData, social_twitter: v })} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                  <FloatingInput label="Personal Website / Portfolio URL" value={formData.social_website} onChange={v => setFormData({ ...formData, social_website: v })} />
                  <FloatingInput label="Introductory Video URL (YouTube/Vimeo)" value={formData.intro_video_url} onChange={v => setFormData({ ...formData, intro_video_url: v })} />
                </div>

                {/* Active Status toggle */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderRadius: 12, border: "1.5px solid #e2e8f0", background: "#f8fafc", marginTop: 10 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>Active Status</div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Inactive teachers won't appear in batch assignment</div>
                  </div>
                  <label style={{ position: "relative", display: "inline-block", width: 46, height: 26, cursor: "pointer", flexShrink: 0 }}>
                    <input type="checkbox" checked={formData.is_active} onChange={e => setFormData({ ...formData, is_active: e.target.checked })} style={{ opacity: 0, width: 0, height: 0, position: "absolute" }} />
                    <span style={{ position: "absolute", inset: 0, background: formData.is_active ? "#0ea5e9" : "#cbd5e1", borderRadius: 13, transition: "background 0.25s" }} />
                    <span style={{ position: "absolute", top: 3, left: formData.is_active ? 23 : 3, width: 20, height: 20, background: "#fff", borderRadius: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.25)", transition: "left 0.25s" }} />
                  </label>
                </div>"""
content = content.replace(form_ui_old, form_ui_new)

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated teachers/page.tsx")
