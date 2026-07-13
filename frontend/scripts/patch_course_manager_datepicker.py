import re

with open(r'c:\Users\sahim\Desktop\IINM_PROJECT\iinm\frontend\src\app\admin\components\CourseManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add ProfessionalDatePicker component below ImageDropzoneField
datepicker_code = """  );
}

function ProfessionalDatePicker({ label, value, min, onChange }: { label: string, value: string, min?: string, onChange: (v: string) => void }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <label style={{ display: "block", fontSize: 10, fontWeight: 800, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</label>
      <div style={{ position: "relative", display: "flex", alignItems: "center", background: "#fff", border: "1px solid #cbd5e1", borderRadius: 10, padding: "8px 12px", transition: "border 0.2s" }}>
        <div style={{ color: "#64748b", display: "flex", alignItems: "center", marginRight: 8 }}>
          <Icon name="calendar" size={16} />
        </div>
        <input 
          type="datetime-local" 
          value={value} 
          min={min}
          onChange={e => onChange(e.target.value)} 
          style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 13, color: value ? "#0f172a" : "#94a3b8", cursor: "pointer", position: "relative", zIndex: 2 }} 
        />
        <style dangerouslySetInnerHTML={{__html:`
          input[type="datetime-local"]::-webkit-calendar-picker-indicator {
            position: absolute; top: 0; left: 0; right: 0; bottom: 0;
            width: 100%; height: 100%; opacity: 0; cursor: pointer; z-index: 3;
          }
        `}} />
      </div>
    </div>
  );
}

export default function CourseManager() {"""

content = content.replace("  );\n}\n\nexport default function CourseManager() {", datepicker_code)

# 2. Update the Timeline section in CourseManager UI
ui_old = """                  <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{...labelStyle, fontSize: 10, marginBottom: 4}}>Start Date</label>
                      <input type="datetime-local" value={formStartDate} onChange={e => setFormStartDate(e.target.value)} style={{ ...inputStyle, background: "#fff", padding: "8px 12px", fontSize: 13 }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{...labelStyle, fontSize: 10, marginBottom: 4}}>End Date</label>
                      <input type="datetime-local" value={formEndDate} onChange={e => setFormEndDate(e.target.value)} style={{ ...inputStyle, background: "#fff", padding: "8px 12px", fontSize: 13 }} />
                    </div>
                  </div>"""

ui_new = """                  <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                    <ProfessionalDatePicker label="Start Date" value={formStartDate} onChange={setFormStartDate} />
                    <ProfessionalDatePicker label="End Date" value={formEndDate} min={formStartDate} onChange={setFormEndDate} />
                  </div>"""

content = content.replace(ui_old, ui_new)

with open(r'c:\Users\sahim\Desktop\IINM_PROJECT\iinm\frontend\src\app\admin\components\CourseManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("DatePicker Patch Applied!")
