"""Patch: Add Live Class section to Chapter Details panel in CourseManager.tsx"""

with open("src/app/admin/components/CourseManager.tsx", "r", encoding="utf-8") as f:
    text = f.read()

# 1. Add LiveClass interface after Material interface
live_class_interface = """
interface LiveClass {
  id: number;
  chapter_id: number;
  title: string;
  meeting_url: string;
  scheduled_at: string | null;
  created_at: string;
}
"""
text = text.replace(
    "interface Chapter {",
    live_class_interface + "\ninterface Chapter {"
)

# 2. Add live class state after chapterMaterials states
new_states = """
  const [chapterLiveClasses, setChapterLiveClasses] = useState<Record<number, LiveClass[]>>({});
  const [fetchingLiveClassesFor, setFetchingLiveClassesFor] = useState<Record<number, boolean>>({});
  const [liveClassForm, setLiveClassForm] = useState({ title: "", meeting_url: "", scheduled_at: "" });
  const [addingLiveClass, setAddingLiveClass] = useState(false);
  const [savingLiveClass, setSavingLiveClass] = useState(false);

  const fetchLiveClasses = (chapterId: number) => {
    if (chapterLiveClasses[chapterId] !== undefined || fetchingLiveClassesFor[chapterId]) return;
    setFetchingLiveClassesFor(p => ({ ...p, [chapterId]: true }));
    fetch(`${API}/chapters/${chapterId}/live-classes`)
      .then(res => res.json())
      .then(data => setChapterLiveClasses(p => ({ ...p, [chapterId]: data })))
      .catch(e => console.error(e))
      .finally(() => setFetchingLiveClassesFor(p => ({ ...p, [chapterId]: false })));
  };
"""
text = text.replace(
    "  const selectActiveChapter = (chapterId: number) => {",
    new_states + "\n  const selectActiveChapter = (chapterId: number) => {"
)

# 3. Also fetch live classes when chapter activated
text = text.replace(
    "  const selectActiveChapter = (chapterId: number) => {\n    setActiveChapterId(chapterId);",
    "  const selectActiveChapter = (chapterId: number) => {\n    setActiveChapterId(chapterId);\n    fetchLiveClasses(chapterId);\n    setAddingLiveClass(false);\n    setLiveClassForm({ title: \"\", meeting_url: \"\", scheduled_at: \"\" });"
)

# 4. Add Live Class section UI after materials in Chapter Details panel
live_class_ui = """
                             {/* Live Class Section */}
                             <div style={{ borderTop: "1.5px solid #e2e8f0", paddingTop: 20, marginTop: 8 }}>
                               <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                                 <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                   <div style={{ width: 32, height: 32, borderRadius: 10, background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                     <Icon name="video" size={16} />
                                   </div>
                                   <span style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>Live Classes</span>
                                 </div>
                                 <button type="button" onClick={() => setAddingLiveClass(v => !v)} style={{ fontSize: 12, fontWeight: 700, background: addingLiveClass ? "#fee2e2" : "#f0f9ff", color: addingLiveClass ? "#ef4444" : "#0ea5e9", border: `1.5px solid ${addingLiveClass ? "#fecaca" : "#bae6fd"}`, padding: "6px 14px", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                                   <Icon name={addingLiveClass ? "x" : "plus"} size={12} />
                                   {addingLiveClass ? "Cancel" : "Add Live Class"}
                                 </button>
                               </div>

                               {addingLiveClass && (
                                 <div style={{ background: "#f0f9ff", border: "1.5px solid #bae6fd", borderRadius: 12, padding: "16px 20px", marginBottom: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                                   <div>
                                     <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", marginBottom: 6 }}>Title</label>
                                     <input type="text" value={liveClassForm.title} onChange={e => setLiveClassForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Chapter 1 Live Session" style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1.5px solid #bae6fd", fontSize: 14, outline: "none", boxSizing: "border-box", background: "#fff" }} />
                                   </div>
                                   <div>
                                     <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", marginBottom: 6 }}>Meeting URL</label>
                                     <input type="url" value={liveClassForm.meeting_url} onChange={e => setLiveClassForm(p => ({ ...p, meeting_url: e.target.value }))} placeholder="https://meet.google.com/... or Zoom link" style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1.5px solid #bae6fd", fontSize: 14, outline: "none", boxSizing: "border-box", background: "#fff" }} />
                                   </div>
                                   <div>
                                     <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", marginBottom: 6 }}>Scheduled Date & Time</label>
                                     <input type="datetime-local" value={liveClassForm.scheduled_at} onChange={e => setLiveClassForm(p => ({ ...p, scheduled_at: e.target.value }))} style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1.5px solid #bae6fd", fontSize: 14, outline: "none", boxSizing: "border-box", background: "#fff" }} />
                                   </div>
                                   <button type="button" disabled={savingLiveClass || !liveClassForm.title.trim() || !liveClassForm.meeting_url.trim()} onClick={async () => {
                                     if (!activeChapterId) return;
                                     setSavingLiveClass(true);
                                     try {
                                       const res = await apiFetch(`${API}/chapters/${activeChapterId}/live-classes`, {
                                         method: "POST",
                                         headers: { "Content-Type": "application/json" },
                                         body: JSON.stringify({ title: liveClassForm.title.trim(), meeting_url: liveClassForm.meeting_url.trim(), scheduled_at: liveClassForm.scheduled_at || null }),
                                       });
                                       if (res.ok) {
                                         const newLc = await res.json();
                                         setChapterLiveClasses(p => ({ ...p, [activeChapterId]: [...(p[activeChapterId] || []), newLc] }));
                                         setLiveClassForm({ title: "", meeting_url: "", scheduled_at: "" });
                                         setAddingLiveClass(false);
                                         toast.success("Live class added!");
                                       } else { toast.error("Failed to add live class"); }
                                     } catch { toast.error("Network error"); }
                                     finally { setSavingLiveClass(false); }
                                   }} style={{ background: savingLiveClass ? "#94a3b8" : "#0ea5e9", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: savingLiveClass ? "not-allowed" : "pointer", alignSelf: "flex-end" }}>
                                     {savingLiveClass ? "Adding..." : "Add Live Class"}
                                   </button>
                                 </div>
                               )}

                               {fetchingLiveClassesFor[activeChapterId!] ? (
                                 <div className="skeleton sk-p" style={{ height: 50, borderRadius: 10 }}></div>
                               ) : !chapterLiveClasses[activeChapterId!] || chapterLiveClasses[activeChapterId!].length === 0 ? (
                                 <div style={{ fontSize: 13, color: "#94a3b8", fontStyle: "italic", padding: "8px 0" }}>No live classes scheduled yet.</div>
                               ) : (
                                 chapterLiveClasses[activeChapterId!].map(lc => (
                                   <div key={lc.id} style={{ display: "flex", alignItems: "center", gap: 14, background: "#f0fdf4", border: "1.5px solid #bbf7d0", padding: "14px 18px", borderRadius: 12, marginBottom: 10, animation: "slideUp 0.15s ease-out" }}>
                                     <div style={{ flex: 1 }}>
                                       <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>{lc.title}</div>
                                       {lc.scheduled_at && (
                                         <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, marginBottom: 4 }}>
                                           {new Date(lc.scheduled_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                                         </div>
                                       )}
                                       <a href={lc.meeting_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#0ea5e9", fontWeight: 700, textDecoration: "none", wordBreak: "break-all" }}>{lc.meeting_url}</a>
                                     </div>
                                     <button type="button" onClick={async () => {
                                       if (!window.confirm("Delete this live class?")) return;
                                       const res = await apiFetch(`${API}/live-classes/${lc.id}`, { method: "DELETE" });
                                       if (res.ok && activeChapterId) {
                                         setChapterLiveClasses(p => ({ ...p, [activeChapterId]: p[activeChapterId].filter(x => x.id !== lc.id) }));
                                         toast.success("Deleted");
                                       }
                                     }} style={{ background: "#fee2e2", color: "#ef4444", border: "none", width: 32, height: 32, borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                       <Icon name="trash" size={14} />
                                     </button>
                                   </div>
                                 ))
                               )}
                             </div>
"""

# Place the Live Class section just before the closing of the chapter details panel
text = text.replace(
    "                          </div>\n                       )}\n                    </div>\n                  </div>\n               )}",
    "                          </div>\n                       )}\n" + live_class_ui + "\n                    </div>\n                  </div>\n               )}",
    
)

with open("src/app/admin/components/CourseManager.tsx", "w", encoding="utf-8") as f:
    f.write(text)

print("CourseManager patched with Live Class section.")
