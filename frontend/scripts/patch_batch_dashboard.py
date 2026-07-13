import os

file_path = "src/app/admin/batch/[id]/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# We need to replace the OPTION B: BATCH PROGRESS & SYLLABUS TRACKER
# with the new Curriculum & Materials Manager.

old_option_b = """          {/* OPTION B: BATCH PROGRESS & SYLLABUS TRACKER */}
          <div style={{ background: "#fff", borderRadius: 20, padding: 24, boxShadow: "0 4px 20px rgba(0,0,0,0.03)", border: "1px solid #e2e8f0" }}>
             <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
                <div>
                   <h3 style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", margin: "0 0 8px 0", display: "flex", alignItems: "center", gap: 8 }}><Icon name="trending-up" size={18} color="#f59e0b"/> Syllabus Progress</h3>
                   <span style={{ fontSize: 13, color: "#64748b" }}>Track the curriculum completion for this batch.</span>
                </div>
                <div style={{ textAlign: "right" }}>
                   <span style={{ fontSize: 32, fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>42%</span>
                   <span style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#f59e0b", letterSpacing: 0.5 }}>COMPLETED</span>
                </div>
             </div>

             <div style={{ width: "100%", height: 12, background: "#f1f5f9", borderRadius: 6, overflow: "hidden", marginBottom: 24 }}>
                <div style={{ height: "100%", background: "#f59e0b", width: "42%", borderRadius: 6 }}></div>
             </div>

             <div style={{ background: "#fffbeb", border: "1px solid #fef3c7", borderRadius: 12, padding: 16, display: "flex", alignItems: "flex-start", gap: 16 }}>
                <div style={{ background: "#f59e0b", color: "#fff", width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
                   <Icon name="book" size={20} />
                </div>
                <div>
                   <span style={{ fontSize: 11, fontWeight: 800, color: "#d97706", textTransform: "uppercase", letterSpacing: 0.5 }}>Current Topic</span>
                   <h4 style={{ margin: "4px 0 8px 0", fontSize: 15, fontWeight: 700, color: "#92400e" }}>Module 3: Advanced State Management</h4>
                   <button style={{ background: "#fff", border: "1px solid #fcd34d", borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 700, color: "#b45309", cursor: "pointer" }}>Mark Completed</button>
                </div>
             </div>
          </div>"""

# Replace it with <CurriculumSection batch={batch} course={course} />
new_content = content.replace(old_option_b, "          <CurriculumSection batch={batch} course={course} />")

if new_content == content:
    print("Warning: Could not find OPTION B to replace.")
else:
    # Add CurriculumSection component definition before BatchDetailsDashboard
    components_code = """
function CurriculumSection({ batch, course }: { batch: any, course: any }) {
  const { showToast } = useToast();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [expandedSubjectId, setExpandedSubjectId] = useState<number | null>(null);
  const [chaptersCache, setChaptersCache] = useState<Record<number, any[]>>({});
  
  const [selectedChapter, setSelectedChapter] = useState<any | null>(null);
  
  // Chapter View state
  const [activeTab, setActiveTab] = useState<"materials" | "exams" | "live">("materials");
  const [materials, setMaterials] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [allExams, setAllExams] = useState<any[]>([]); // For assignment dropdown

  // Upload Material Modal
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState({ title: "", description: "", type: "pdf", url: "", tags: "" });

  // Assign Exam Modal
  const [assignExamOpen, setAssignExamOpen] = useState(false);
  const [assignForm, setAssignForm] = useState({ exam_id: "", start: "", end: "", pass_marks: "", duration: "", notes: "" });
  const [assignToAllBatches, setAssignToAllBatches] = useState(false);

  useEffect(() => {
    if (course?.id) {
      apiFetch(`${API_BASE_URL}/courses/${course.id}`).then(res => res.json()).then(data => {
         setSubjects(data.subjects || []);
      });
      // Pre-fetch all exams
      apiFetch(`${API_BASE_URL}/exams`).then(res => res.json()).then(data => {
         setAllExams(data);
      });
    }
  }, [course?.id]);

  const toggleSubject = async (subjectId: number) => {
    if (expandedSubjectId === subjectId) {
      setExpandedSubjectId(null);
      return;
    }
    setExpandedSubjectId(subjectId);
    if (!chaptersCache[subjectId]) {
      try {
        const res = await apiFetch(`${API_BASE_URL}/subjects/${subjectId}/chapters`);
        if (res.ok) {
           const data = await res.json();
           setChaptersCache(prev => ({ ...prev, [subjectId]: data }));
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  const openChapter = async (ch: any) => {
    setSelectedChapter(ch);
    setActiveTab("materials");
    fetchChapterData(ch.id);
  };

  const fetchChapterData = async (chId: number) => {
    try {
       const matRes = await apiFetch(`${API_BASE_URL}/chapters/${chId}/materials`);
       if(matRes.ok) setMaterials(await matRes.json());

       // Fetch exams assigned to this batch
       const examRes = await apiFetch(`${API_BASE_URL}/exams/assignments/batch/${batch.id}`);
       if(examRes.ok) {
           const assigns = await examRes.json();
           // Filter assignments locked to this chapter
           setExams(assigns.filter((a: any) => a.unlock_condition_type === 'chapter' && a.unlock_condition_value === chId));
       }
    } catch (e) {
       console.error("Error fetching chapter data");
    }
  };

  const handleUploadMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.title.trim()) return showToast("Title is required", "error");
    try {
      const res = await apiFetch(`${API_BASE_URL}/materials`, {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({
            title: uploadForm.title,
            description: uploadForm.description,
            file_type: uploadForm.type,
            file_url: uploadForm.url,
            youtube_url: uploadForm.type === "youtube" ? uploadForm.url : null,
            tags: uploadForm.tags,
         })
      });
      if(res.ok) {
         const mat = await res.json();
         await apiFetch(`${API_BASE_URL}/chapters/${selectedChapter.id}/materials`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ material_id: mat.id })
         });
         showToast("Material uploaded and linked!", "success");
         setUploadModalOpen(false);
         fetchChapterData(selectedChapter.id);
      } else {
         showToast("Upload failed", "error");
      }
    } catch(e) { showToast("Error", "error"); }
  };

  const handleAssignExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignForm.exam_id) return showToast("Select an exam", "error");

    if (assignToAllBatches) {
       if(!confirm("Are you sure you want to assign this exam to ALL batches belonging to this course?")) return;
    }

    try {
       // get target batches
       let targetBatchIds = [batch.id];
       if (assignToAllBatches) {
           const cbRes = await apiFetch(`${API_BASE_URL}/batches/course/${course.id}`);
           if (cbRes.ok) {
               const bList = await cbRes.json();
               targetBatchIds = bList.map((b:any) => b.id);
           }
       }

       let count = 0;
       for (const bid of targetBatchIds) {
           const res = await apiFetch(`${API_BASE_URL}/exams/assignments`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                 batch_id: bid,
                 exam_id: parseInt(assignForm.exam_id),
                 scheduled_start: assignForm.start || null,
                 scheduled_end: assignForm.end || null,
                 pass_marks: assignForm.pass_marks ? parseFloat(assignForm.pass_marks) : null,
                 duration_mins: assignForm.duration ? parseInt(assignForm.duration) : null,
                 notes: assignForm.notes || null,
                 status: "scheduled",
                 unlock_condition_type: "chapter",
                 unlock_condition_value: selectedChapter.id
              })
           });
           if (res.ok) count++;
       }

       showToast(`Exam assigned to ${count} batch(es)!`, "success");
       setAssignExamOpen(false);
       fetchChapterData(selectedChapter.id);

    } catch (e) {
       showToast("Error assigning exam", "error");
    }
  };

  if (selectedChapter) {
     return (
       <div style={{ background: "#fff", borderRadius: 20, padding: 24, boxShadow: "0 4px 20px rgba(0,0,0,0.03)", border: "1px solid #e2e8f0" }}>
          <button onClick={() => setSelectedChapter(null)} style={{ background: "none", border: "none", color: "#64748b", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
             <Icon name="arrow-left" size={14} /> Back to Curriculum
          </button>
          
          <h3 style={{ margin: "0 0 16px 0", fontSize: 20, fontWeight: 800 }}>{selectedChapter.title}</h3>
          
          <div style={{ display: "flex", gap: 8, borderBottom: "1px solid #f1f5f9", marginBottom: 20 }}>
             {["materials", "exams", "live"].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  style={{
                     padding: "10px 16px", background: "none", border: "none", borderBottom: activeTab === tab ? "2px solid #0ea5e9" : "2px solid transparent",
                     color: activeTab === tab ? "#0ea5e9" : "#64748b", fontWeight: 700, textTransform: "capitalize", cursor: "pointer"
                  }}
                >
                  {tab}
                </button>
             ))}
          </div>

          {activeTab === "materials" && (
             <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                   <h4 style={{ margin: 0 }}>Materials</h4>
                   <button onClick={() => setUploadModalOpen(true)} style={{ background: "#0f172a", color: "#fff", padding: "6px 14px", borderRadius: 8, border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>+ Upload Material</button>
                </div>
                {materials.length === 0 ? <p style={{ color: "#94a3b8" }}>No materials in this chapter yet.</p> : (
                   <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {materials.map(m => (
                         <div key={m.id} style={{ padding: 12, background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 8, background: "#e0f2fe", display: "flex", alignItems: "center", justifyContent: "center", color: "#0284c7" }}>
                               <Icon name={m.file_type === 'video' || m.file_type === 'youtube' ? 'video' : 'file-text'} size={16} />
                            </div>
                            <div>
                               <div style={{ fontWeight: 700, fontSize: 13 }}>{m.title}</div>
                               <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase" }}>{m.file_type}</div>
                            </div>
                         </div>
                      ))}
                   </div>
                )}
             </div>
          )}

          {activeTab === "exams" && (
             <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                   <h4 style={{ margin: 0 }}>Assigned Exams</h4>
                   <button onClick={() => setAssignExamOpen(true)} style={{ background: "#0f172a", color: "#fff", padding: "6px 14px", borderRadius: 8, border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>+ Assign Exam</button>
                </div>
                {exams.length === 0 ? <p style={{ color: "#94a3b8" }}>No exams assigned to this chapter.</p> : (
                   <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {exams.map(a => (
                         <div key={a.id} style={{ padding: 12, background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 8, background: "#fce7f3", display: "flex", alignItems: "center", justifyContent: "center", color: "#be185d" }}>
                               <Icon name="file-text" size={16} />
                            </div>
                            <div>
                               <div style={{ fontWeight: 700, fontSize: 13 }}>Exam ID: {a.exam_id}</div>
                               <div style={{ fontSize: 11, color: "#64748b" }}>Status: {a.status}</div>
                            </div>
                         </div>
                      ))}
                   </div>
                )}
             </div>
          )}

          {/* Upload Modal */}
          {uploadModalOpen && (
             <div style={{ position: "fixed", inset: 0, zIndex: 3000, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 400, background: "#fff", padding: 24, borderRadius: 16 }}>
                   <h3 style={{ marginTop: 0 }}>Upload Material</h3>
                   <form onSubmit={handleUploadMaterial} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <FloatingInput label="Title" value={uploadForm.title} onChange={v => setUploadForm({...uploadForm, title: v})} required />
                      <FloatingInput label="Description" value={uploadForm.description} onChange={v => setUploadForm({...uploadForm, description: v})} />
                      <select style={{ padding: 12, borderRadius: 8, border: "1.5px solid #e2e8f0" }} value={uploadForm.type} onChange={e => setUploadForm({...uploadForm, type: e.target.value})}>
                         <option value="pdf">PDF Document</option>
                         <option value="video">Direct Video</option>
                         <option value="youtube">YouTube Link</option>
                      </select>
                      <FloatingInput label="File URL / Video ID" value={uploadForm.url} onChange={v => setUploadForm({...uploadForm, url: v})} required />
                      
                      <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                         <button type="button" onClick={() => setUploadModalOpen(false)} style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer" }}>Cancel</button>
                         <button type="submit" style={{ flex: 1, padding: 10, borderRadius: 8, border: "none", background: "#0ea5e9", color: "#fff", fontWeight: 700, cursor: "pointer" }}>Upload</button>
                      </div>
                   </form>
                </div>
             </div>
          )}

          {/* Assign Exam Modal */}
          {assignExamOpen && (
             <div style={{ position: "fixed", inset: 0, zIndex: 3000, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 450, background: "#fff", padding: 24, borderRadius: 16 }}>
                   <h3 style={{ marginTop: 0 }}>Assign Exam to Batch</h3>
                   <p style={{ fontSize: 12, color: "#64748b", marginTop: -10 }}>This exam will be locked until the student finishes {selectedChapter.title}.</p>
                   <form onSubmit={handleAssignExam} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <select style={{ padding: 12, borderRadius: 8, border: "1.5px solid #e2e8f0" }} value={assignForm.exam_id} onChange={e => setAssignForm({...assignForm, exam_id: e.target.value})} required>
                         <option value="">-- Select Exam --</option>
                         {allExams.map(ex => (
                             <option key={ex.id} value={ex.id}>{ex.title} ({ex.code})</option>
                         ))}
                      </select>
                      
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                         <div>
                            <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>Start Time</label>
                            <input type="datetime-local" style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #e2e8f0" }} value={assignForm.start} onChange={e => setAssignForm({...assignForm, start: e.target.value})} />
                         </div>
                         <div>
                            <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>End Time</label>
                            <input type="datetime-local" style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #e2e8f0" }} value={assignForm.end} onChange={e => setAssignForm({...assignForm, end: e.target.value})} />
                         </div>
                      </div>

                      <div style={{ padding: 12, background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                         <div>
                            <div style={{ fontWeight: 700, fontSize: 13 }}>Assign to ALL Batches</div>
                            <div style={{ fontSize: 11, color: "#64748b" }}>Also assign this to all other batches in {course?.title}.</div>
                         </div>
                         <label style={{ position: "relative", cursor: "pointer" }}>
                            <input type="checkbox" style={{ opacity: 0, width: 0, height: 0 }} checked={assignToAllBatches} onChange={e => setAssignToAllBatches(e.target.checked)} />
                            <div style={{ width: 40, height: 20, background: assignToAllBatches ? "#10b981" : "#cbd5e1", borderRadius: 10, position: "relative", transition: "0.2s" }}>
                               <div style={{ width: 16, height: 16, background: "#fff", borderRadius: "50%", position: "absolute", top: 2, left: assignToAllBatches ? 22 : 2, transition: "0.2s" }}></div>
                            </div>
                         </label>
                      </div>

                      <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                         <button type="button" onClick={() => setAssignExamOpen(false)} style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer" }}>Cancel</button>
                         <button type="submit" style={{ flex: 1, padding: 10, borderRadius: 8, border: "none", background: "#0ea5e9", color: "#fff", fontWeight: 700, cursor: "pointer" }}>Assign Exam</button>
                      </div>
                   </form>
                </div>
             </div>
          )}
       </div>
     );
  }

  return (
    <div style={{ background: "#fff", borderRadius: 20, padding: 24, boxShadow: "0 4px 20px rgba(0,0,0,0.03)", border: "1px solid #e2e8f0" }}>
       <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
          <div>
             <h3 style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", margin: "0 0 8px 0", display: "flex", alignItems: "center", gap: 8 }}><Icon name="book" size={18} color="#f59e0b"/> Curriculum Manager</h3>
             <span style={{ fontSize: 13, color: "#64748b" }}>Browse and manage materials & exams for this course.</span>
          </div>
       </div>

       {subjects.length === 0 ? <p style={{ color: "#94a3b8" }}>No subjects found in this course.</p> : (
         <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {subjects.map((sub) => (
               <div key={sub.id} style={{ border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
                  <button
                    onClick={() => toggleSubject(sub.id)}
                    style={{ width: "100%", padding: "16px 20px", background: expandedSubjectId === sub.id ? "#f8fafc" : "#fff", border: "none", textAlign: "left", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                  >
                     <span style={{ fontWeight: 800, fontSize: 14, color: "#0f172a" }}>{sub.name}</span>
                     <Icon name={expandedSubjectId === sub.id ? "chevron-up" : "chevron-down"} size={16} />
                  </button>
                  
                  {expandedSubjectId === sub.id && (
                     <div style={{ padding: "12px 20px", background: "#fff", borderTop: "1px solid #f1f5f9" }}>
                        {(chaptersCache[sub.id] || []).length === 0 ? (
                           <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>No chapters found.</p>
                        ) : (
                           <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                              {chaptersCache[sub.id].map(ch => (
                                 <button key={ch.id} onClick={() => openChapter(ch)} style={{ width: "100%", padding: "12px 16px", background: "#f8fafc", border: "1px solid #f1f5f9", borderRadius: 8, textAlign: "left", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>{ch.title}</span>
                                    <Icon name="arrow-right" size={14} />
                                 </button>
                              ))}
                           </div>
                        )}
                     </div>
                  )}
               </div>
            ))}
         </div>
       )}
    </div>
  );
}
"""

    # add components_code right after the imports
    imports_idx = new_content.find("function BatchDetailsDashboard() {")
    if imports_idx != -1:
        new_content = new_content[:imports_idx] + components_code + "\n" + new_content[imports_idx:]
    else:
        print("Could not find function BatchDetailsDashboard() {")
        
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(new_content)
    print("Successfully patched BatchDetailsDashboard.")
