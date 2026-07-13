import re

with open(r'c:\Users\sahim\Desktop\IINM_PROJECT\iinm\frontend\src\app\admin\components\CourseManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Identify where Modal Header ends and Modal Footer begins
start_idx = content.find('{/* Modal Body (2 columns) */}')
end_idx = content.find('{/* Modal Footer */}')

if start_idx == -1 or end_idx == -1:
    print("Could not find Modal Body markers!")
    exit(1)

new_body = """            {/* Wizard Header Progress */}
            <div style={{ padding: "0 28px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", gap: 24, flexShrink: 0 }}>
               <button type="button" onClick={() => setWizardStep(1)} style={wizardTabStyle(wizardStep === 1)}>
                 <div style={wizardBadgeStyle(wizardStep === 1)}>1</div> Basic Info & SEO
               </button>
               <button type="button" onClick={() => setWizardStep(2)} style={wizardTabStyle(wizardStep === 2)}>
                 <div style={wizardBadgeStyle(wizardStep === 2)}>2</div> Media & Pricing
               </button>
               <button type="button" onClick={() => setWizardStep(3)} style={wizardTabStyle(wizardStep === 3)}>
                 <div style={wizardBadgeStyle(wizardStep === 3)}>3</div> Curriculum Mapping
               </button>
            </div>

            {/* Modal Body */}
            <div className="custom-scroll" style={{ flex: 1, padding: "28px 36px", overflowY: "auto", background: "#fff" }}>
               
               {/* ── STEP 1: Basic Info & SEO ── */}
               {wizardStep === 1 && (
                  <div style={{ maxWidth: 800, margin: "0 auto", animation: "slideUp 0.2s ease-out" }}>
                    <h3 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginBottom: 24 }}>Course Basic Info</h3>
                    
                    <div style={{ marginBottom: 24 }}>
                      <FloatingField label="Course Title *" value={formTitle} onChange={(v: string) => { setFormTitle(v); setFormError(""); }} placeholder="e.g. The Complete Guide 2026" autoFocus />
                    </div>
    
                    <div style={{ marginBottom: 24 }}>
                      <FloatingField label="Description (optional)" value={formDesc} onChange={setFormDesc} placeholder="Comprehensive course overview..." isTextArea />
                    </div>

                    <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
                      <div style={{ flex: 1 }}>
                        <FloatingField label="Course Status" value={formStatus} onChange={setFormStatus} isSelect options={[
                          {value: "DRAFT", label: "Draft - Hidden from students"},
                          {value: "PUBLISHED", label: "Published - Live to everyone"},
                          {value: "ARCHIVED", label: "Archived - Not for sale"}
                        ]} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <FloatingField label="Skill Level" value={formSkillLevel} onChange={setFormSkillLevel} isSelect options={[
                          {value: "", label: "(None)"}, {value: "Beginner", label: "Beginner"}, {value: "Intermediate", label: "Intermediate"}, {value: "Advanced", label: "Advanced"}
                        ]} />
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
                      <div style={{ flex: 1 }}>
                        <FloatingField label="Instructor Name" value={formInstructor} onChange={setFormInstructor} placeholder="e.g. John Doe" />
                      </div>
                      <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
                         <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: formIsFeatured? "#0369a1" : "#475569", cursor: "pointer", background: formIsFeatured? "#f0f9ff" : "#f8fafc", padding: "12px 16px", borderRadius: 8, width: "100%", border: `1.5px solid ${formIsFeatured? "#bae6fd":"#e2e8f0"}`, transition: "all 0.2s" }}>
                           <input type="checkbox" checked={formIsFeatured} onChange={e => setFormIsFeatured(e.target.checked)} style={{ accentColor: "#0ea5e9", width: 16, height: 16 }} />
                           🔥 Mark as Featured Course
                         </label>
                      </div>
                    </div>

                    <h3 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginTop: 40, marginBottom: 24, paddingTop: 32, borderTop: "1px solid #e2e8f0" }}>Target Audience</h3>
                    <div style={{ marginBottom: 24 }}>
                      <FloatingField label="Target Audience" value={formTargetAudience} onChange={setFormTargetAudience} placeholder="Who is this course intended for?" isTextArea />
                    </div>
                    <div style={{ marginBottom: 24 }}>
                      <FloatingField label="Course Prerequisites" value={formPrereq} onChange={setFormPrereq} placeholder="What should students know before starting?" isTextArea />
                    </div>
                    <div style={{ marginBottom: 24 }}>
                      <FloatingField label="What you will learn (1 per line)" value={formLearn} onChange={setFormLearn} placeholder="- Become proficient in...\n- Build multiple projects...\n- Master advanced concepts..." isTextArea />
                    </div>

                    <h3 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginTop: 40, marginBottom: 24, paddingTop: 32, borderTop: "1px solid #e2e8f0" }}>Search Engine Optimization</h3>
                    <div style={{ marginBottom: 24 }}>
                      <FloatingField label="SEO Title" value={formSeoTitle} onChange={setFormSeoTitle} placeholder="Optimized Title for Google Search..." />
                    </div>
                    <div style={{ marginBottom: 24 }}>
                      <FloatingField label="SEO Description" value={formSeoDesc} onChange={setFormSeoDesc} placeholder="Meta description to attract students in search results..." isTextArea />
                    </div>
                    <div>
                      <FloatingField label="SEO Keywords (comma separated)" value={formSeoKeywords} onChange={setFormSeoKeywords} placeholder="e.g. math, science, beginner tutorial" />
                    </div>
                  </div>
               )}

               {/* ── STEP 2: Media & Pricing ── */}
               {wizardStep === 2 && (
                  <div style={{ maxWidth: 800, margin: "0 auto", animation: "slideUp 0.2s ease-out" }}>
                    <h3 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginBottom: 24 }}>Media Assets</h3>
                    
                    <div style={{ marginBottom: 24 }}>
                       <ImageDropzoneField label="Course Thumbnail" value={formThumbnail} onChange={setFormThumbnail} placeholder="https://..." />
                    </div>
                    <div style={{ marginBottom: 24 }}>
                       <ImageDropzoneField label="Full Course Banner (Optional)" value={formBannerUrl} onChange={setFormBannerUrl} placeholder="https://..." />
                    </div>
                    
                    <div style={{ marginBottom: 24 }}>
                      <FloatingField label="Promo Video URL" value={formPromo} onChange={setFormPromo} placeholder="YouTube or Vimeo standard link" />
                    </div>

                    <h3 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginTop: 40, marginBottom: 24, paddingTop: 32, borderTop: "1px solid #e2e8f0" }}>Timeline & Access Rules</h3>
                    <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
                      <ProfessionalDatePicker label="Start Date" value={formStartDate} onChange={setFormStartDate} />
                      <ProfessionalDatePicker label="End Date" value={formEndDate} min={formStartDate} onChange={setFormEndDate} />
                    </div>
                    <div style={{ marginBottom: 24 }}>
                       <FloatingField label="Validity (Days) [blank for lifetime]" type="number" min="1" value={formValidityDays} onChange={(v: any) => setFormValidityDays(v ? Number(v) : "")} placeholder="e.g. 365" />
                    </div>

                    <h3 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginTop: 40, marginBottom: 24, paddingTop: 32, borderTop: "1px solid #e2e8f0" }}>Pricing Options</h3>
                    <div style={{ border: "1.5px solid #e2e8f0", padding: 24, borderRadius: 12, marginBottom: 24, background: formIsFree ? "#f0fdf4" : "#fff", borderColor: formIsFree ? "#bbf7d0" : "#e2e8f0", transition: "all 0.2s" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: formIsFree ? 0 : 20 }}>
                        <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "#0f172a" }}>Pricing Structure</h4>
                        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: formIsFree ? "#16a34a" : "#475569", cursor: "pointer" }}>
                          <input type="checkbox" checked={formIsFree} onChange={e => setFormIsFree(e.target.checked)} style={{ accentColor: "#22c55e", width: 18, height: 18 }} />
                          This is a FREE course
                        </label>
                      </div>
                      {!formIsFree && (
                        <div style={{ display: "flex", gap: 16, animation: "slideUp 0.15s ease-out" }}>
                          <div style={{ flex: 1 }}>
                            <FloatingField label="Base Price ($)" type="number" min="0" value={formPrice} onChange={(v: any) => setFormPrice(v ? Number(v) : "")} placeholder="0.00" />
                          </div>
                          <div style={{ flex: 1 }}>
                            <FloatingField label="Discount Price ($)" type="number" min="0" value={formDiscount} onChange={(v: any) => setFormDiscount(v ? Number(v) : "")} placeholder="Optional" />
                          </div>
                        </div>
                      )}
                    </div>

                    <h3 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginTop: 40, marginBottom: 24, paddingTop: 32, borderTop: "1px solid #e2e8f0" }}>Completion Goals</h3>
                    <div style={{ border: "1.5px solid", padding: 24, borderRadius: 12, marginBottom: 24, display: "flex", alignItems: "center", gap: 20, background: formHasCertificate ? "#f0f9ff" : "#fff", borderColor: formHasCertificate ? "#bae6fd" : "#e2e8f0", transition: "all 0.2s" }}>
                       <div style={{ width: 44, height: 44, borderRadius: 22, background: formHasCertificate ? "#0ea5e9" : "#f1f5f9", color: formHasCertificate ? "#fff" : "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s" }}>
                          <Icon name="award" size={24} />
                       </div>
                       <div style={{ flex: 1 }}>
                          <h4 style={{ margin: "0 0 4px 0", fontSize: 16, fontWeight: 800, color: "#0f172a" }}>Course Certificate</h4>
                          <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>Issue an official certificate of completion automatically to students who successfully finish all course materials.</p>
                       </div>
                       <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700, color: formHasCertificate ? "#0284c7" : "#475569", cursor: "pointer", background: formHasCertificate?"#e0f2fe":"#f8fafc", padding: "10px 16px", borderRadius: 8 }}>
                          <input type="checkbox" checked={formHasCertificate} onChange={e => setFormHasCertificate(e.target.checked)} style={{ width: 18, height: 18, accentColor: "#0ea5e9" }} />
                          Enable Awards
                       </label>
                    </div>
                  </div>
               )}

               {/* ── STEP 3: Curriculum Mapping ── */}
               {wizardStep === 3 && (
                  <div style={{ display: "flex", gap: 40, height: "100%", width: "100%", maxWidth: 1200, margin: "0 auto", animation: "slideUp 0.2s ease-out" }}>
                    
                    {/* Left: Interactive Subject Cards */}
                    <div style={{ width: "35%", minWidth: 300, display: "flex", flexDirection: "column", gap: 16 }}>
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

                    {/* Right: Chapter Content Map */}
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
                       <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0f172a" }}>Map Chapters Content</h3>
                       {formSubjectIds.length === 0 ? (
                          <div style={{ flex: 1, border: "2px dashed #cbd5e1", borderRadius: 20, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#f8fafc", textAlign: "center", padding: 40 }}>
                             <div style={{ color: "#0ea5e9", marginBottom: 24, opacity: 0.2, filter: "drop-shadow(0 10px 10px rgba(14,165,233,0.2))" }}><Icon name="layers" size={96} /></div>
                             <h4 style={{ margin: "0 0 12px 0", fontSize: 22, fontWeight: 800, color: "#0f172a" }}>No Subjects Mapped</h4>
                             <p style={{ color: "#64748b", fontSize: 15, margin: 0, maxWidth: 360, lineHeight: 1.6 }}>Please select one or more subjects from the interactive cards on the left to reveal and map specific chapters to this course.</p>
                          </div>
                       ) : (
                          <div className="custom-scroll" style={{ display: "flex", flexDirection: "column", gap: 20, overflowY: "auto", paddingRight: 8, paddingBottom: 24 }}>
                             {formSubjectIds.map(subId => {
                                const sub = subjects.find(s => s.id === subId);
                                const chapters = subjectChapters[subId];
                                const loading = fetchingChaptersFor[subId];
                                
                                return (
                                   <div key={subId} style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 16, overflow: "hidden", animation: "slideUp 0.3s ease-out", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
                                      <div style={{ background: "#f8fafc", padding: "16px 24px", borderBottom: "1.5px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                         <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                            <div style={{ width: 28, height: 28, borderRadius: 8, background: "#0ea5e9", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="book" size={14} /></div>
                                            <span style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>{sub?.name}</span>
                                         </div>
                                         {!loading && chapters && chapters.length > 0 && (
                                            <div style={{ display: "flex", gap: 10 }}>
                                               <button onClick={() => selectAllChaptersForSubject(subId)} type="button" style={{ fontSize: 12, cursor: "pointer", border: "none", background: "#e0f2fe", padding: "6px 14px", borderRadius: 8, color: "#0284c7", fontWeight: 700, transition: "background 0.2s" }} onMouseEnter={e=>e.currentTarget.style.background="#bae6fd"} onMouseLeave={e=>e.currentTarget.style.background="#e0f2fe"}>Select All</button>
                                               <button onClick={() => deselectAllChaptersForSubject(subId)} type="button" style={{ fontSize: 12, cursor: "pointer", border: "none", background: "#fee2e2", padding: "6px 14px", borderRadius: 8, color: "#ef4444", fontWeight: 700, transition: "background 0.2s" }} onMouseEnter={e=>e.currentTarget.style.background="#fecaca"} onMouseLeave={e=>e.currentTarget.style.background="#fee2e2"}>Clear</button>
                                            </div>
                                         )}
                                      </div>
                                      <div style={{ padding: 24 }}>
                                         {loading ? (
                                            <div className="skeleton sk-p" style={{ width: "60%" }}></div>
                                         ) : !chapters || chapters.filter(c => c.is_active).length === 0 ? (
                                            <div style={{ display: "flex", alignItems: "center", gap: 12, background: "#fef2f2", padding: "16px 20px", borderRadius: 10, color: "#b91c1c" }}>
                                              <Icon name="alert-circle" size={20} />
                                              <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>No LIVE chapters found for this subject.</p>
                                            </div>
                                         ) : (
                                            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                               {chapters.filter(c => c.is_active).map(c => {
                                                  const isChecked = formChapterIds.includes(c.id);
                                                  return (
                                                     <label key={c.id} style={{ display: "flex", alignItems: "center", gap: 16, cursor: "pointer", background: isChecked ? "#f0fdf4" : "#f8fafc", padding: "14px 20px", borderRadius: 12, border: `2px solid ${isChecked ? "#22c55e" : "#f1f5f9"}`, transition: "all 0.2s", boxShadow: isChecked ? "0 2px 8px rgba(34,197,94,0.15)" : "none" }}>
                                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: 6, border: `2px solid ${isChecked ? "#22c55e" : "#cbd5e1"}`, background: isChecked ? "#22c55e" : "#fff", color: "#fff", transition: "all 0.2s" }}>
                                                           {isChecked && <Icon name="check" size={12} />}
                                                        </div>
                                                        <span style={{ fontSize: 14.5, fontWeight: isChecked ? 700 : 600, color: isChecked ? "#15803d" : "#475569" }}>{c.title}</span>
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
                  </div>
               )}
            </div>
"""

content = content[:start_idx] + new_body + content[end_idx:]

with open(r'c:\Users\sahim\Desktop\IINM_PROJECT\iinm\frontend\src\app\admin\components\CourseManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Wizard UI patching entirely successful!")
