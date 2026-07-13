import re
import os

filepath = r"c:\Users\sahim\Desktop\IINM_PROJECT\iinm\frontend\src\app\admin\components\CourseManager.tsx"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add Instructor interface
if "interface Instructor {" not in content:
    content = content.replace("interface Course {", "interface Instructor {\n  id: number;\n  name: string;\n  email?: string;\n  phone?: string;\n  bio?: string;\n  avatar_url?: string;\n}\n\ninterface Course {")

# 2. Add State for Instructors
if "const [allInstructors" not in content:
    content = content.replace(
        'const [formIsNew, setFormIsNew] = useState(false);',
        'const [formIsNew, setFormIsNew] = useState(false);\n  const [allInstructors, setAllInstructors] = useState<Instructor[]>([]);\n  const [formInstructorIds, setFormInstructorIds] = useState<number[]>([]);\n  const [showAddInstructorModal, setShowAddInstructorModal] = useState(false);\n  const [newInstructor, setNewInstructor] = useState({ name: "", email: "", phone: "", bio: "", avatar_url: "" });\n  const [addingInstructor, setAddingInstructor] = useState(false);'
    )
    content = content.replace('const [formInstructor, setFormInstructor] = useState("");\n', '')

# 3. fetchAll - fetch instructors
if "const [instRes," not in content:
    content = content.replace(
        'const [scRes, subRes, courseRes] = await Promise.all([',
        'const [scRes, subRes, courseRes, instRes] = await Promise.all([\n'
    )
    content = content.replace(
        'apiFetch(`${API}/subcategories`),',
        'apiFetch(`${API}/subcategories`),\n        apiFetch(`${API}/instructors`),'
    )
    content = content.replace(
        'if (courseRes.ok) setCourses(await courseRes.json());',
        'if (courseRes.ok) setCourses(await courseRes.json());\n      if (instRes && instRes.ok) setAllInstructors(await instRes.json());'
    )

# 4. openModal - load formInstructorIds
if "apiFetch(`${API}/courses/${course.id}/instructors`)" not in content:
    content = re.sub(
        r'(setFormIsNew\(\(course as any\)\.is_new \?\? false\);)',
        r'\1\n      apiFetch(`${API}/courses/${course.id}/instructors`).then(r => r.json()).then(data => {\n        setFormInstructorIds((data || []).map((i: any) => i.id));\n      }).catch(e => console.error(e));',
        content
    )
    content = re.sub(r'setFormInstructor\(course\.instructor_name \|\| ""\);\s*', '', content)
    content = content.replace(
        'setFormIsNew(false);',
        'setFormIsNew(false);\n      setFormInstructorIds([]);'
    )
    content = re.sub(r'setFormInstructor\(""\);\s*', '', content)

# 5. handleSave - remove instructor_name from payload, add PUT request
content = re.sub(r'instructor_name:\s*formInstructor\.trim\(\)\s*\|\|\s*null,', '', content)

save_logic = """      if (res.ok) {
        const savedCourse = await res.json();
        try {
          await apiFetch(`${API}/courses/${modalMode === "create" ? savedCourse.id : editingId}/instructors`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ instructor_ids: formInstructorIds })
          });
        } catch (e) {
          console.error("Failed to save instructors", e);
        }
        
        showToast(`Course ${modalMode === "create" ? "created" : "updated"}!`);"""

if "instructor_ids: formInstructorIds" not in content:
    content = re.sub(
        r'if \(res\.ok\) \{\s*showToast\(`Course \$\{modalMode === "create" \? "created" : "updated"\}\!`\);',
        save_logic,
        content
    )
    # Fix the `if (isInlineModal)` case which uses await res.json() too
    content = re.sub(
        r'const newCourse = await res\.json\(\);\s*if \(onCourseSaved\) onCourseSaved\(newCourse\);',
        r'if (onCourseSaved) onCourseSaved(savedCourse);',
        content
    )

# 6. Add tab 4
if "Teachers" not in content[content.find('Wizard Header Progress'):]:
    content = content.replace(
        '<div style={wizardBadgeStyle(wizardStep === 3)}>3</div> Curriculum Mapping\n               </button>\n            </div>',
        '<div style={wizardBadgeStyle(wizardStep === 3)}>3</div> Curriculum Mapping\n               </button>\n               <button type="button" onClick={() => setWizardStep(4)} style={wizardTabStyle(wizardStep === 4)}>\n                 <div style={wizardBadgeStyle(wizardStep === 4)}>4</div> Teachers\n               </button>\n            </div>'
    )

# 7. Remove instructor field from step 1
content = re.sub(
        r'<FloatingField label="Instructor Name" value=\{formInstructor\} onChange=\{setFormInstructor\} placeholder="e\.g\. John Doe" />',
        r'<div></div>',
        content
    )

# 8. Add step 4 UI + inline modal
step_4_ui = """
               {/* ── STEP 4: Teachers ── */}
               {wizardStep === 4 && (
                 <div style={{ width: "100%", animation: "slideUp 0.2s ease-out" }}>
                   <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                     <div>
                       <h3 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", margin: 0 }}>Assign Teachers</h3>
                       <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>Select the instructors for this course.</p>
                     </div>
                     <button type="button" onClick={() => setShowAddInstructorModal(true)} style={{ background: "#f0f9ff", color: "#0ea5e9", border: "1.5px solid #bae6fd", padding: "8px 16px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                       <Icon name="plus" size={14} /> Add New Teacher
                     </button>
                   </div>

                   {allInstructors.length === 0 ? (
                     <div style={{ padding: 40, textAlign: "center", background: "#f8fafc", border: "2px dashed #e2e8f0", borderRadius: 16 }}>
                       <div style={{ color: "#94a3b8", marginBottom: 12 }}><Icon name="users" size={48} /></div>
                       <h4 style={{ margin: "0 0 8px 0", fontSize: 16, fontWeight: 700, color: "#0f172a" }}>No Teachers Found</h4>
                       <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>Click the button above to create your first instructor profile.</p>
                     </div>
                   ) : (
                     <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
                       {allInstructors.map(inst => {
                         const isSelected = formInstructorIds.includes(inst.id);
                         return (
                           <div
                             key={inst.id}
                             onClick={() => {
                               setFormInstructorIds(prev => prev.includes(inst.id) ? prev.filter(id => id !== inst.id) : [...prev, inst.id]);
                             }}
                             style={{
                               padding: 20, borderRadius: 16, border: `2px solid ${isSelected ? "#0ea5e9" : "#e2e8f0"}`,
                               background: isSelected ? "#f0f9ff" : "#fff", cursor: "pointer", position: "relative",
                               transition: "all 0.2s", boxShadow: isSelected ? "0 8px 16px rgba(14,165,233,0.1)" : "none",
                               transform: isSelected ? "translateY(-2px)" : "none"
                             }}
                           >
                             {isSelected && (
                               <div style={{ position: "absolute", top: 12, right: 12, width: 24, height: 24, borderRadius: 12, background: "#0ea5e9", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                 <Icon name="check" size={12} />
                               </div>
                             )}
                             <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
                               {inst.avatar_url ? (
                                 <img src={inst.avatar_url.startsWith("http") ? inst.avatar_url : `${API_BASE_URL.replace("/api", "")}${inst.avatar_url}`} alt={inst.name} style={{ width: 56, height: 56, borderRadius: 28, objectFit: "cover", border: `3px solid ${isSelected ? "#0ea5e9" : "#e2e8f0"}`, flexShrink: 0 }} />
                               ) : (
                                 <div style={{ width: 56, height: 56, borderRadius: 28, background: isSelected ? "#0ea5e9" : "#f1f5f9", color: isSelected ? "#fff" : "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, flexShrink: 0, transition: "all 0.2s" }}>
                                   {inst.name.charAt(0).toUpperCase()}
                                 </div>
                               )}
                               <div style={{ flex: 1, minWidth: 0 }}>
                                 <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", marginBottom: 2 }}>{inst.name}</div>
                                 {inst.email && <div style={{ fontSize: 12, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{inst.email}</div>}
                               </div>
                             </div>
                             {inst.bio && (
                               <p style={{ margin: 0, fontSize: 13, color: "#475569", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{inst.bio}</p>
                             )}
                           </div>
                         );
                       })}
                     </div>
                   )}

                   {formInstructorIds.length > 0 && (
                     <div style={{ marginTop: 24, padding: "14px 20px", background: "#f0fdf4", border: "1.5px solid #bbf7d0", borderRadius: 12, display: "flex", alignItems: "center", gap: 12 }}>
                       <Icon name="check" size={16} />
                       <span style={{ fontSize: 14, fontWeight: 700, color: "#15803d" }}>{formInstructorIds.length} teacher{formInstructorIds.length !== 1 ? "s" : ""} assigned to this course</span>
                     </div>
                   )}
                 </div>
               )}
"""
if "STEP 4: Teachers" not in content:
    content = content.replace('</div>\n            \n            {/* Modal Footer */}', step_4_ui + '\n            </div>\n            \n            {/* Modal Footer */}')

# 9. Add the Teacher Inline Modal
teacher_modal = """
      {/* ── Add New Teacher Inline Modal ── */}
      {showAddInstructorModal && (
        <div onClick={e => { if (e.target === e.currentTarget) setShowAddInstructorModal(false); }} style={{ position: "fixed", inset: 0, zIndex: 100001, background: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 520, boxShadow: "0 24px 60px rgba(0,0,0,0.2)", overflow: "hidden", animation: "slideUp 0.25s ease-out" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0f172a" }}>Add New Teacher</h3>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>Create an instructor profile</p>
              </div>
              <button onClick={() => { setShowAddInstructorModal(false); setNewInstructor({ name: "", email: "", phone: "", bio: "", avatar_url: "" }); }} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: 8 }}>
                <Icon name="x" size={20} />
              </button>
            </div>
            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ position: "relative" }}>
                <input
                  type="text" value={newInstructor.name}
                  onChange={e => setNewInstructor(p => ({ ...p, name: e.target.value }))}
                  placeholder="Full Name *"
                  style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
                />
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <input type="email" value={newInstructor.email} onChange={e => setNewInstructor(p => ({ ...p, email: e.target.value }))} placeholder="Email" style={{ flex: 1, padding: "12px 16px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
                <input type="tel" value={newInstructor.phone} onChange={e => setNewInstructor(p => ({ ...p, phone: e.target.value }))} placeholder="Phone" style={{ flex: 1, padding: "12px 16px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
              </div>
              <textarea value={newInstructor.bio} onChange={e => setNewInstructor(p => ({ ...p, bio: e.target.value }))} placeholder="Short bio / description" rows={3} style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 14, outline: "none", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }} />
              <input type="text" value={newInstructor.avatar_url} onChange={e => setNewInstructor(p => ({ ...p, avatar_url: e.target.value }))} placeholder="Avatar Image URL (optional)" style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
            </div>
            <div style={{ padding: "16px 24px", borderTop: "1px solid #e2e8f0", display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button onClick={() => { setShowAddInstructorModal(false); setNewInstructor({ name: "", email: "", phone: "", bio: "", avatar_url: "" }); }} style={{ background: "none", border: "1px solid #e2e8f0", color: "#64748b", padding: "10px 20px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
              <button
                disabled={addingInstructor || !newInstructor.name.trim()}
                onClick={async () => {
                  if (!newInstructor.name.trim()) return;
                  setAddingInstructor(true);
                  try {
                    const res = await apiFetch(`${API}/instructors`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(newInstructor)
                    });
                    if (res.ok) {
                      const created = await res.json();
                      setAllInstructors(prev => [...prev, created]);
                      setFormInstructorIds(prev => [...prev, created.id]);
                      setShowAddInstructorModal(false);
                      setNewInstructor({ name: "", email: "", phone: "", bio: "", avatar_url: "" });
                      showToast(`Teacher "${created.name}" added!`);
                    } else {
                      showToast("Failed to create teacher", "error");
                    }
                  } catch { showToast("Network error", "error"); }
                  finally { setAddingInstructor(false); }
                }}
                style={{ background: addingInstructor ? "#94a3b8" : "#0ea5e9", color: "#fff", border: "none", padding: "10px 24px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: addingInstructor ? "not-allowed" : "pointer", boxShadow: "0 2px 8px rgba(14,165,233,0.3)" }}
              >
                {addingInstructor ? "Adding..." : "Add Teacher"}
              </button>
            </div>
          </div>
        </div>
      )}
"""
if "Add New Teacher Inline Modal" not in content:
    content = content.replace('{previewMaterial && (\n        <MediaPreviewModal', teacher_modal + '\n      {previewMaterial && (\n        <MediaPreviewModal')


with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)

print("CourseManager.tsx patched successfully!")
