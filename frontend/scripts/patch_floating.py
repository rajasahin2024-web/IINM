import re

with open(r'c:\Users\sahim\Desktop\IINM_PROJECT\iinm\frontend\src\app\admin\components\CourseManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add FloatingField function
floating_code = """function FloatingField({ label, type = "text", value, onChange, placeholder, isTextArea = false, isSelect = false, options = [], min, autoFocus = false }: any) {
  const [focused, setFocused] = React.useState(false);
  const hasValue = value !== undefined && value !== null && value !== "";
  
  const containerStyle: React.CSSProperties = { position: "relative", width: "100%" };
  const floatActive = focused || hasValue;
  
  const labelStyle: React.CSSProperties = {
    position: "absolute", left: "14px", 
    top: floatActive ? "-9px" : (isTextArea ? "14px" : "50%"),
    transform: floatActive ? "none" : (isTextArea ? "none" : "translateY(-50%)"),
    fontSize: floatActive ? "11.5px" : "14px", 
    fontWeight: floatActive ? 700 : 500,
    color: focused ? "#0ea5e9" : floatActive ? "#64748b" : "#94a3b8",
    background: floatActive ? "#fff" : "transparent", 
    padding: floatActive ? "0 6px" : "0", 
    transition: "all 0.2s cubic-bezier(.4,0,.2,1)",
    pointerEvents: "none", zIndex: 5
  };

  const fieldStyle: React.CSSProperties = {
    width: "100%", padding: "14px 16px", borderRadius: "8px",
    border: `1.5px solid ${focused ? "#0ea5e9" : "#e2e8f0"}`,
    outline: "none", fontSize: "14px", color: "#0f172a", background: "#fff",
    transition: "border-color 0.2s, box-shadow 0.2s", boxSizing: "border-box",
    resize: isTextArea ? "vertical" : "none", fontFamily: "inherit",
    appearance: isSelect ? "none" : undefined,
    minHeight: isTextArea ? "100px" : "auto",
    boxShadow: focused ? "0 0 0 3px rgba(14, 165, 233, 0.15)" : "none"
  };

  const commonProps = {
    value, onChange: (e: any) => onChange(e.target.value),
    onFocus: () => setFocused(true), onBlur: () => setFocused(false),
    style: fieldStyle, placeholder: floatActive ? placeholder : "",
    autoFocus, required: false
  };

  return (
    <div style={containerStyle}>
      <label style={labelStyle}>{label}</label>
      {isTextArea ? (
         <textarea {...commonProps}></textarea>
      ) : isSelect ? (
         <div style={{ position: "relative" }}>
           <select {...commonProps}>
             {options.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
           </select>
           <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#94a3b8" }}>
             <Icon name="chevron-down" size={14} />
           </span>
         </div>
      ) : (
         <input type={type} min={min} {...commonProps} />
      )}
    </div>
  );
}

function ProfessionalDatePicker({"""

content = content.replace("function ProfessionalDatePicker({", floating_code)

# 2. Update ProfessionalDatePicker styles (borderRadius 8, border 1.5px solid #e2e8f0)
dp_old = 'borderRadius: 10, padding: "8px 12px"'
dp_new = 'borderRadius: 8, padding: "12px 14px"'
content = content.replace(dp_old, dp_new)
content = content.replace('border: "1px solid #cbd5e1"', 'border: "1.5px solid #e2e8f0"')

# 3. Update ImageDropzoneField styles (borderRadius 8)
content = content.replace('borderRadius: 12,\n          padding: "16px"', 'borderRadius: 8,\n          padding: "16px"')

# 4. Replace regular fields
# Course Title & Description
title_desc_old = """                <div style={{ marginBottom: 20 }}>
                  <label style={labelStyle}>Course Title *</label>
                  <input type="text" value={formTitle} onChange={e => { setFormTitle(e.target.value); setFormError(""); }} placeholder="e.g. Master Class 2026" style={inputStyle} autoFocus />
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={labelStyle}>Description <span style={{ color: "#94a3b8", fontWeight: 500, textTransform: "none" }}>(optional)</span></label>
                  <textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Overview of the course..." rows={2} style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} />
                </div>"""

title_desc_new = """                <div style={{ marginBottom: 20 }}>
                  <FloatingField label="Course Title *" value={formTitle} onChange={(v: string) => { setFormTitle(v); setFormError(""); }} placeholder="e.g. Master Class 2026" autoFocus />
                </div>

                <div style={{ marginBottom: 20 }}>
                  <FloatingField label="Description (optional)" value={formDesc} onChange={setFormDesc} placeholder="Overview of the course..." isTextArea />
                </div>"""
content = content.replace(title_desc_old, title_desc_new)

# Status & Skill Level
status_skill_old = """                {/* ── Status & Level ── */}
                <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Status</label>
                    <select value={formStatus} onChange={e => setFormStatus(e.target.value)} style={{ ...inputStyle, padding: "11px 16px" }}>
                      <option value="DRAFT">Draft</option>
                      <option value="PUBLISHED">Published</option>
                      <option value="ARCHIVED">Archived</option>
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Skill Level</label>
                    <select value={formSkillLevel} onChange={e => setFormSkillLevel(e.target.value)} style={{ ...inputStyle, padding: "11px 16px" }}>
                      <option value="">(None)</option>
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                    </select>
                  </div>
                </div>"""

status_skill_new = """                {/* ── Status & Level ── */}
                <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
                  <div style={{ flex: 1 }}>
                    <FloatingField label="Status" value={formStatus} onChange={setFormStatus} isSelect options={[
                      {value: "DRAFT", label: "Draft"},
                      {value: "PUBLISHED", label: "Published"},
                      {value: "ARCHIVED", label: "Archived"}
                    ]} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <FloatingField label="Skill Level" value={formSkillLevel} onChange={setFormSkillLevel} isSelect options={[
                      {value: "", label: "(None)"},
                      {value: "Beginner", label: "Beginner"},
                      {value: "Intermediate", label: "Intermediate"},
                      {value: "Advanced", label: "Advanced"}
                    ]} />
                  </div>
                </div>"""
content = content.replace(status_skill_old, status_skill_new)


# Validity Days
val_old = """                  <div>
                    <label style={{...labelStyle, fontSize: 10, marginBottom: 4}}>Validity (Days) <span style={{ textTransform: "none", color: "#94a3b8" }}>(leave blank for lifetime)</span></label>
                    <input type="number" min="1" value={formValidityDays} onChange={e => setFormValidityDays(e.target.value ? Number(e.target.value) : "")} placeholder="e.g. 365" style={{ ...inputStyle, background: "#fff", padding: "8px 12px", fontSize: 13 }} />
                  </div>"""

val_new = """                  <div>
                    <FloatingField label="Validity (Days) [blank for lifetime]" type="number" min="1" value={formValidityDays} onChange={(v: any) => setFormValidityDays(v ? Number(v) : "")} placeholder="e.g. 365" />
                  </div>"""
content = content.replace(val_old, val_new)

# Pricing
price_old = """                    <div style={{ display: "flex", gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <label style={{...labelStyle, fontSize: 10, marginBottom: 4}}>Base Price</label>
                        <input type="number" min="0" value={formPrice} onChange={e => setFormPrice(e.target.value ? Number(e.target.value) : "")} placeholder="0.00" style={{ ...inputStyle, padding: "8px 12px", fontSize: 13 }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{...labelStyle, fontSize: 10, marginBottom: 4}}>Discount Price</label>
                        <input type="number" min="0" value={formDiscount} onChange={e => setFormDiscount(e.target.value ? Number(e.target.value) : "")} placeholder="Optional" style={{ ...inputStyle, padding: "8px 12px", fontSize: 13 }} />
                      </div>
                    </div>"""
                    
price_new = """                    <div style={{ display: "flex", gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <FloatingField label="Base Price" type="number" min="0" value={formPrice} onChange={(v: any) => setFormPrice(v ? Number(v) : "")} placeholder="0.00" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <FloatingField label="Discount Price" type="number" min="0" value={formDiscount} onChange={(v: any) => setFormDiscount(v ? Number(v) : "")} placeholder="Optional" />
                      </div>
                    </div>"""
content = content.replace(price_old, price_new)

# Metas
meta_old = """                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Instructor Name</label>
                    <input type="text" value={formInstructor} onChange={e => setFormInstructor(e.target.value)} placeholder="e.g. John Doe" style={{ ...inputStyle, padding: "10px 14px", fontSize: 13 }} />
                  </div>

                  <ImageDropzoneField label="Thumbnail URL" value={formThumbnail} onChange={setFormThumbnail} placeholder="https://..." />
                  <ImageDropzoneField label="Full Course Banner URL" value={formBannerUrl} onChange={setFormBannerUrl} placeholder="https://..." />
                  
                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Promo Video URL</label>
                    <input type="text" value={formPromo} onChange={e => setFormPromo(e.target.value)} placeholder="YouTube/Vimeo link" style={{ ...inputStyle, padding: "10px 14px", fontSize: 13 }} />
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>What you will learn (Bullet points)</label>
                    <textarea value={formLearn} onChange={e => setFormLearn(e.target.value)} placeholder="One point per line..." rows={3} style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit", fontSize: 13 }} />
                  </div>"""

meta_new = """                  <div style={{ marginBottom: 16 }}>
                    <FloatingField label="Instructor Name" value={formInstructor} onChange={setFormInstructor} placeholder="e.g. John Doe" />
                  </div>

                  <ImageDropzoneField label="Thumbnail URL" value={formThumbnail} onChange={setFormThumbnail} placeholder="https://..." />
                  <ImageDropzoneField label="Full Course Banner URL" value={formBannerUrl} onChange={setFormBannerUrl} placeholder="https://..." />
                  
                  <div style={{ marginBottom: 16 }}>
                    <FloatingField label="Promo Video URL" value={formPromo} onChange={setFormPromo} placeholder="YouTube or Vimeo link" />
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <FloatingField label="What you will learn (Bullet points)" value={formLearn} onChange={setFormLearn} placeholder="One point per line..." isTextArea />
                  </div>"""
content = content.replace(meta_old, meta_new)

with open(r'c:\Users\sahim\Desktop\IINM_PROJECT\iinm\frontend\src\app\admin\components\CourseManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Floating input fields patch applied!")
