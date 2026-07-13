import re

with open("src/app/admin/components/CourseManager.tsx", "r", encoding="utf-8") as f:
    text = f.read()

# We need to replace the curriculum mapping section
start_marker = "{/* ── STEP 3: Curriculum Mapping ── */}"
end_marker = "{/* Modal Footer */}"

if start_marker in text and end_marker in text:
    before = text.split(start_marker)[0]
    after = text.split(end_marker)[1]
    
    new_step_3 = """{/* ── STEP 3: Curriculum Mapping ── */}
               {wizardStep === 3 && (
                  <div style={{ display: "flex", gap: 30, height: "100%", width: "100%", animation: "slideUp 0.2s ease-out" }}>
                    
                    {/* Left: Available Subjects (25%) */}
                    <div style={{ width: "25%", minWidth: 260, display: "flex", flexDirection: "column", gap: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                         <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0f172a" }}>Available Subjects</h3>
                      </div>
                      <div className="custom-scroll" style={{ flex: 1, overflowY: "auto", paddingRight: 8, paddingBottom: 24 }}>
                        {Object.entries(groupedSubjects).map(([group, subs]) => (
                          <div key={group} style={{ marginBottom: 24 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                               <div style={{ fontSize: 12, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "1.5px" }}>{group}</div>
                               <div style={{ height: 1, flex: 1, background: "#e2e8f0" }}></div>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                              {subs.map(s => {
                                const isSelected = formSubjectIds.includes(s.id);
                                return (
                                  <div key={s.id} onClick={() => toggleSubject(s.id)} style={{ padding: "16px 20px", borderRadius: 14, border: `2.5px solid ${isSelected ? "#0ea5e9" : "#e2e8f0"}`, background: isSelected ? "#f0f9ff" : "#fff", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", transition: "all 0.2s", boxShadow: isSelected ? "0 8px 16px rgba(14,165,233,0.12)" : "0 2px 4px rgba(0,0,0,0.02)", transform: isSelected ? "translateY(-2px)" : "none" }}>
                                     <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                                        <div style={{ width: 32, height: 32, borderRadius: 10, background: isSelected ? "#0ea5e9" : "#f1f5f9", color: isSelected ? "#fff" : "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>
                                          <Icon name={isSelected ? "check" : "folder"} size={16} />
                                        </div>
                                        <span style={{ fontSize: 15, fontWeight: 700, color: isSelected ? "#0f172a" : "#475569" }}>{s.name}</span>
                                     </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Middle: Map Chapters Content (25%) */}
                    <div style={{ width: "25%", minWidth: 260, display: "flex", flexDirection: "column", gap: 16 }}>
                       <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0f172a" }}>Map Chapters Content</h3>
                       {formSubjectIds.length === 0 ? (
                          <div style={{ flex: 1, border: "2px dashed #cbd5e1", borderRadius: 20, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#f8fafc", textAlign: "center", padding: 30 }}>
                             <div style={{ color: "#0ea5e9", marginBottom: 16, opacity: 0.2, filter: "drop-shadow(0 10px 10px rgba(14,165,233,0.2))" }}><Icon name="layers" size={64} /></div>
                             <h4 style={{ margin: "0 0 8px 0", fontSize: 18, fontWeight: 800, color: "#0f172a" }}>No Subjects</h4>
                             <p style={{ color: "#64748b", fontSize: 13, margin: 0, maxWidth: 280, lineHeight: 1.5 }}>Select a subject on the left to reveal related chapters.</p>
                          </div>
                       ) : (
                          <div className="custom-scroll" style={{ display: "flex", flexDirection: "column", gap: 20, overflowY: "auto", paddingRight: 8, paddingBottom: 24 }}>
                             {formSubjectIds.map(subId => {
                                const sub = subjects.find(s => s.id === subId);
                                const chapters = subjectChapters[subId];
                                const loading = fetchingChaptersFor[subId];
                                
                                return (
                                   <div key={subId} style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 16, overflow: "hidden", animation: "slideUp 0.3s ease-out", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
                                      <div style={{ background: "#f8fafc", padding: "16px 20px", borderBottom: "1.5px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                         <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                            <div style={{ width: 24, height: 24, borderRadius: 8, background: "#0ea5e9", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="book" size={12} /></div>
                                            <span style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>{sub?.name}</span>
                                         </div>
                                         {!loading && chapters && chapters.length > 0 && (
                                            <div style={{ display: "flex", gap: 6 }}>
                                               <button onClick={() => selectAllChaptersForSubject(subId)} type="button" style={{ fontSize: 11, cursor: "pointer", border: "none", background: "#e0f2fe", padding: "4px 10px", borderRadius: 6, color: "#0284c7", fontWeight: 700, transition: "background 0.2s" }}>All</button>
                                               <button onClick={() => deselectAllChaptersForSubject(subId)} type="button" style={{ fontSize: 11, cursor: "pointer", border: "none", background: "#fee2e2", padding: "4px 10px", borderRadius: 6, color: "#ef4444", fontWeight: 700, transition: "background 0.2s" }}>Clr</button>
                                            </div>
                                         )}
                                      </div>
                                      <div style={{ padding: 16 }}>
                                         {loading ? (
                                            <div className="skeleton sk-p" style={{ width: "60%" }}></div>
                                         ) : !chapters || chapters.filter(c => c.is_active).length === 0 ? (
                                            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fef2f2", padding: "12px 16px", borderRadius: 10, color: "#b91c1c" }}>
                                              <Icon name="alert-circle" size={16} />
                                              <p style={{ fontSize: 12, fontWeight: 600, margin: 0 }}>No chapters found.</p>
                                            </div>
                                         ) : (
                                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                               {chapters.filter(c => c.is_active).map(c => {
                                                  const isChecked = formChapterIds.includes(c.id);
                                                  const isActive = activeChapterId === c.id;
                                                  return (
                                                     <label key={c.id} onClick={(e) => { e.preventDefault(); toggleChapter(c.id); selectActiveChapter(c.id); }} style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", background: isActive ? "#e0f2fe" : isChecked ? "#f0fdf4" : "#f8fafc", padding: "12px 16px", borderRadius: 12, border: `2px solid ${isActive ? "#38bdf8" : isChecked ? "#22c55e" : "#f1f5f9"}`, transition: "all 0.2s" }}>
                                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, borderRadius: 6, border: `2px solid ${isChecked ? "#22c55e" : "#cbd5e1"}`, background: isChecked ? "#22c55e" : "#fff", color: "#fff", transition: "all 0.2s", flexShrink: 0 }}>
                                                           {isChecked && <Icon name="check" size={12} />}
                                                        </div>
                                                        <span style={{ fontSize: 13.5, fontWeight: isChecked || isActive ? 700 : 600, color: isActive ? "#0369a1" : isChecked ? "#15803d" : "#475569", flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.title}</span>
                                                     </label>
                                                  );
                                               })}
                                            </div>
                                         )}
                                      </div>
                                   </div>
                                );
                             })}
                          </div>
                       )}
                    </div>

                    {/* Right: Chapter Material Details (50%) */}
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
                       <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0f172a" }}>Chapter Details</h3>
                       </div>
                       {!activeChapterId ? (
                          <div style={{ flex: 1, border: "2px dashed #cbd5e1", borderRadius: 20, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#f8fafc", textAlign: "center", padding: 40 }}>
                             <div style={{ color: "#0ea5e9", marginBottom: 20, opacity: 0.2, filter: "drop-shadow(0 10px 10px rgba(14,165,233,0.2))" }}><Icon name="file-text" size={72} /></div>
                             <h4 style={{ margin: "0 0 10px 0", fontSize: 20, fontWeight: 800, color: "#0f172a" }}>No Chapter Selected</h4>
                             <p style={{ color: "#64748b", fontSize: 14, margin: 0, maxWidth: 340, lineHeight: 1.6 }}>Click on any chapter from the middle column to reveal its uploaded materials here.</p>
                          </div>
                       ) : (
                          <div className="custom-scroll" style={{ display: "flex", flexDirection: "column", gap: 16, overflowY: "auto", paddingRight: 8, paddingBottom: 24 }}>
                             {fetchingMaterialsFor[activeChapterId] ? (
                                <>
                                  <div className="skeleton sk-p" style={{ height: 60, borderRadius: 12 }}></div>
                                  <div className="skeleton sk-p" style={{ height: 60, borderRadius: 12 }}></div>
                                  <div className="skeleton sk-p" style={{ height: 60, borderRadius: 12 }}></div>
                                </>
                             ) : !chapterMaterials[activeChapterId] || chapterMaterials[activeChapterId].length === 0 ? (
                                <div style={{ display: "flex", alignItems: "center", gap: 12, background: "#fef2f2", padding: "16px 20px", borderRadius: 10, color: "#b91c1c" }}>
                                  <Icon name="alert-circle" size={20} />
                                  <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>This chapter has no uploaded materials yet.</p>
                                </div>
                             ) : (
                                chapterMaterials[activeChapterId].map(mat => (
                                   <div key={mat.id} style={{ display: "flex", alignItems: "center", gap: 16, background: "#fff", border: "1.5px solid #e2e8f0", padding: "16px 20px", borderRadius: 12, boxShadow: "0 2px 4px rgba(0,0,0,0.02)", animation: "slideUp 0.15s ease-out" }}>
                                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: 12, background: "#f8fafc", color: "#64748b", flexShrink: 0 }}>
                                         <Icon name={mat.type === 'video' ? 'video' : mat.type === 'pdf' ? 'file-text' : 'file'} size={22} />
                                      </div>
                                      <div style={{ flex: 1 }}>
                                         <h4 style={{ margin: "0 0 6px 0", fontSize: 15, fontWeight: 800, color: "#0f172a" }}>{mat.title}</h4>
                                         <span style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", background: "#f1f5f9", padding: "4px 8px", borderRadius: 6, letterSpacing: "0.5px" }}>{mat.type}</span>
                                      </div>
                                   </div>
                                ))
                             )}
                          </div>
                       )}
                    </div>
                  </div>
               )}
            </div>
            
            {/* Modal Footer */}\n"""
    
    with open("src/app/admin/components/CourseManager.tsx", "w", encoding="utf-8") as f:
        f.write(before + new_step_3 + after)
        print("Success")
else:
    print("Markers not found.")
