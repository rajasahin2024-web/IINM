import re

filepath = r"c:\Users\sahim\Desktop\IINM_PROJECT\iinm\frontend\src\app\admin\components\CourseManager.tsx"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update newInstructor initial state
old_state = r'const \[newInstructor, setNewInstructor\] = useState\(\{ name: "", email: "", phone: "", bio: "", avatar_url: "", is_active: true \}\);'
new_state = 'const [newInstructor, setNewInstructor] = useState({ name: "", email: "", phone: "", bio: "", avatar_url: "", is_active: true, qualification: "", experience_years: "", designation: "", specialization: "", social_linkedin: "", social_twitter: "", social_website: "", intro_video_url: "", achievements: "" });'
content = re.sub(old_state, new_state, content)

# 2. Update setNewInstructor reset calls
old_reset = r'setNewInstructor\(\{ name: "", email: "", phone: "", bio: "", avatar_url: "", is_active: true \}\);'
new_reset = 'setNewInstructor({ name: "", email: "", phone: "", bio: "", avatar_url: "", is_active: true, qualification: "", experience_years: "", designation: "", specialization: "", social_linkedin: "", social_twitter: "", social_website: "", intro_video_url: "", achievements: "" });'
content = re.sub(old_reset, new_reset, content)

# 3. Form UI Replacement
old_form_ui = """              <FloatingField
                label="Full Name *" value={newInstructor.name} onChange={(v: string) => setNewInstructor(p => ({ ...p, name: v }))} placeholder="Enter teacher's full name" autoFocus
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                <FloatingField
                  label="Email Address" type="email" value={newInstructor.email} onChange={(v: string) => setNewInstructor(p => ({ ...p, email: v }))} placeholder="e.g. instructor@example.com"
                />
                <FloatingField
                  label="Phone Number" value={newInstructor.phone} onChange={(v: string) => setNewInstructor(p => ({ ...p, phone: v }))} placeholder="e.g. +1 234 567 890"
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <ImageDropzoneField
                    label="Avatar (optional)" value={newInstructor.avatar_url} onChange={(v: string) => setNewInstructor(p => ({ ...p, avatar_url: v }))} placeholder="Upload image..."
                  />
                </div>
                <FloatingField
                  label="Short Bio (optional)" value={newInstructor.bio} onChange={(v: string) => setNewInstructor(p => ({ ...p, bio: v }))} isTextArea placeholder="Brief description of the instructor..."
                />
              </div>"""

new_form_ui = """              <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#0f172a", textTransform: "uppercase", letterSpacing: 0.5, paddingBottom: 8, borderBottom: "1px solid #e2e8f0" }}>Basic Information</h4>
              <FloatingField
                label="Full Name *" value={newInstructor.name} onChange={(v: string) => setNewInstructor(p => ({ ...p, name: v }))} placeholder="Enter teacher's full name" autoFocus
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                <FloatingField
                  label="Email Address" type="email" value={newInstructor.email} onChange={(v: string) => setNewInstructor(p => ({ ...p, email: v }))} placeholder="e.g. instructor@example.com"
                />
                <FloatingField
                  label="Phone Number" value={newInstructor.phone} onChange={(v: string) => setNewInstructor(p => ({ ...p, phone: v }))} placeholder="e.g. +1 234 567 890"
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                <FloatingField label="Designation / Title (e.g. Senior Instructor)" value={newInstructor.designation} onChange={(v: string) => setNewInstructor(p => ({ ...p, designation: v }))} placeholder="e.g. Professor" />
                <FloatingField label="Years of Experience (e.g. 5+ Years)" value={newInstructor.experience_years} onChange={(v: string) => setNewInstructor(p => ({ ...p, experience_years: v }))} placeholder="e.g. 10+ Years" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                <FloatingField label="Qualifications (e.g. Ph.D.)" value={newInstructor.qualification} onChange={(v: string) => setNewInstructor(p => ({ ...p, qualification: v }))} placeholder="e.g. M.Sc. in Physics" />
                <FloatingField label="Specializations (e.g. Math, Python)" value={newInstructor.specialization} onChange={(v: string) => setNewInstructor(p => ({ ...p, specialization: v }))} placeholder="e.g. Algebra, Calculus" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <ImageDropzoneField
                    label="Avatar (optional)" value={newInstructor.avatar_url} onChange={(v: string) => setNewInstructor(p => ({ ...p, avatar_url: v }))} placeholder="Upload image..."
                  />
                </div>
                <FloatingField
                  label="Short Bio (optional)" value={newInstructor.bio} onChange={(v: string) => setNewInstructor(p => ({ ...p, bio: v }))} isTextArea placeholder="Brief description of the instructor..."
                />
              </div>
              <FloatingField label="Achievements / Awards (optional)" value={newInstructor.achievements} onChange={(v: string) => setNewInstructor(p => ({ ...p, achievements: v }))} isTextArea placeholder="List major awards or recognitions..." />

              <h4 style={{ margin: "10px 0 0", fontSize: 14, fontWeight: 700, color: "#0f172a", textTransform: "uppercase", letterSpacing: 0.5, paddingBottom: 8, borderBottom: "1px solid #e2e8f0" }}>Social & Links</h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                <FloatingField label="LinkedIn Profile URL" value={newInstructor.social_linkedin} onChange={(v: string) => setNewInstructor(p => ({ ...p, social_linkedin: v }))} placeholder="https://linkedin.com/in/..." />
                <FloatingField label="Twitter Profile URL" value={newInstructor.social_twitter} onChange={(v: string) => setNewInstructor(p => ({ ...p, social_twitter: v }))} placeholder="https://twitter.com/..." />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                <FloatingField label="Personal Website / Portfolio URL" value={newInstructor.social_website} onChange={(v: string) => setNewInstructor(p => ({ ...p, social_website: v }))} placeholder="https://..." />
                <FloatingField label="Introductory Video URL (YouTube/Vimeo)" value={newInstructor.intro_video_url} onChange={(v: string) => setNewInstructor(p => ({ ...p, intro_video_url: v }))} placeholder="https://youtube.com/watch?v=..." />
              </div>"""

content = content.replace(old_form_ui, new_form_ui)

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)
print("Successfully patched CourseManager.tsx")
