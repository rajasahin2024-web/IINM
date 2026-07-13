import re

with open(r'c:\Users\sahim\Desktop\IINM_PROJECT\iinm\frontend\src\app\admin\components\CourseManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace Table headers
old_thead = """            <tr>
              <th style={thStyle}>#</th>
              <th style={thStyle}>Course Info</th>
              <th style={thStyle}>Subjects Included</th>
              <th style={thStyle}>Chapters</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Actions</th>
            </tr>"""

new_thead = """            <tr>
              <th style={thStyle}>#</th>
              <th style={thStyle}>Course Info</th>
              <th style={thStyle}>Curriculum</th>
              <th style={thStyle}>Status & Timeline</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Actions</th>
            </tr>"""

content = content.replace(old_thead, new_thead)

# Replace table body logic
old_tbody_cols = """                  <td style={{ padding: "16px 20px" }}>
                    <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 14, marginBottom: 4 }}>{c.title}</div>
                    <div style={{ color: "#64748b", fontSize: 12, maxWidth: 280, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {c.description || <span style={{ fontStyle: "italic", opacity: 0.7 }}>No description</span>}
                    </div>
                  </td>
                  <td style={{ padding: "16px 20px", maxWidth: 240 }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {c.subjects.map(sub => (
                         <span key={sub.id} style={{ background: "#f0f9ff", color: "#0284c7", border: "1px solid #bae6fd", fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 6, whiteSpace: "nowrap" }}>
                           {sub.name}
                         </span>
                      ))}
                      {c.subjects.length === 0 && <span style={{ color: "#94a3b8", fontSize: 12, fontStyle: "italic" }}>No Subjects</span>}
                    </div>
                  </td>
                  <td style={{ padding: "16px 20px" }}>
                    <span style={{ fontWeight: 700, color: "#475569", background: "#f1f5f9", padding: "4px 10px", borderRadius: 20, fontSize: 11 }}>
                      {c.chapter_ids?.length || 0} selected
                    </span>
                  </td>"""

new_tbody_cols = """                  <td style={{ padding: "16px 20px" }}>
                    <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                      {c.thumbnail_url ? (
                        <img src={c.thumbnail_url.startsWith("http") ? c.thumbnail_url : `${API_BASE_URL.replace("/api", "")}${c.thumbnail_url}`} alt="" style={{ width: 64, height: 48, objectFit: "cover", borderRadius: 8, boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }} />
                      ) : (
                        <div style={{ width: 64, height: 48, background: "#f1f5f9", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", border: "1px solid #e2e8f0" }}><Icon name="monitor" size={20}/></div>
                      )}
                      <div>
                        <div style={{ fontWeight: 800, color: "#0f172a", fontSize: 14.5, marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
                          {c.title}
                          {c.is_featured && <span title="Featured Course" style={{ color: "#eab308", fontSize: 13 }}>★</span>}
                        </div>
                        <div style={{ display: "flex", gap: 8, fontSize: 12, fontWeight: 600 }}>
                          <span style={{ color: c.is_free ? "#16a34a" : "#0284c7", background: c.is_free ? "#dcfce7" : "#e0f2fe", padding: "2px 6px", borderRadius: 4 }}>
                            {c.is_free ? "FREE" : c.price ? `$${c.price}` : "No Price Setup"}
                          </span>
                          <span style={{ color: "#64748b", display: "flex", alignItems: "center" }}>{c.skill_level || "Any Level"}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "16px 20px", maxWidth: 220 }}>
                    <div style={{ marginBottom: 8 }}>
                       <span style={{ fontWeight: 800, color: "#475569", background: "#f1f5f9", padding: "4px 8px", borderRadius: 6, fontSize: 10, border: "1px solid #e2e8f0" }}>
                         {c.chapter_ids?.length || 0} Chapters Mapped
                       </span>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", maxHeight: 40, overflowY: "auto" }}>
                      {c.subjects.map(sub => (
                         <span key={sub.id} style={{ background: "#f0f9ff", color: "#0284c7", border: "1px solid #bae6fd", fontSize: 10, fontWeight: 700, padding: "3px 6px", borderRadius: 4, whiteSpace: "nowrap" }}>
                           {sub.name}
                         </span>
                      ))}
                      {c.subjects.length === 0 && <span style={{ color: "#94a3b8", fontSize: 11, fontStyle: "italic" }}>No Subjects</span>}
                    </div>
                  </td>
                  <td style={{ padding: "16px 20px" }}>
                    <div style={{ marginBottom: 8 }}>
                       <span style={{ 
                           fontSize: 10, fontWeight: 800, padding: "4px 8px", borderRadius: 6, textTransform: "uppercase", letterSpacing: "0.5px",
                           background: c.status === "PUBLISHED" ? "#dcfce7" : c.status === "ARCHIVED" ? "#f1f5f9" : "#ffedd5",
                           color: c.status === "PUBLISHED" ? "#16a34a" : c.status === "ARCHIVED" ? "#64748b" : "#ea580c"
                       }}>
                         • {c.status || "DRAFT"}
                       </span>
                    </div>
                    <div style={{ fontSize: 12, color: "#475569", display: "flex", flexDirection: "column", gap: 4, fontWeight: 500 }}>
                       <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <Icon name="calendar" size={12} />
                          {c.start_date ? new Date(c.start_date).toLocaleDateString() : "Anytime"}
                       </div>
                       <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#64748b" }}>
                          <Icon name="award" size={12} />
                          {c.validity_days ? `${c.validity_days} Days Valid` : "Lifetime Access"}
                       </div>
                    </div>
                  </td>"""

content = content.replace(old_tbody_cols, new_tbody_cols)

with open(r'c:\Users\sahim\Desktop\IINM_PROJECT\iinm\frontend\src\app\admin\components\CourseManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Listing patch applied successfully.")
