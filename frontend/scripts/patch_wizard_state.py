import re

with open(r'c:\Users\sahim\Desktop\IINM_PROJECT\iinm\frontend\src\app\admin\components\CourseManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. State changes
state_old = """  const [formPrereq, setFormPrereq] = useState("");
  const [formLearn, setFormLearn] = useState("");"""

state_new = """  const [formPrereq, setFormPrereq] = useState("");
  const [formLearn, setFormLearn] = useState("");
  const [formTargetAudience, setFormTargetAudience] = useState("");
  const [formHasCertificate, setFormHasCertificate] = useState(false);
  const [formSeoTitle, setFormSeoTitle] = useState("");
  const [formSeoDesc, setFormSeoDesc] = useState("");
  const [formSeoKeywords, setFormSeoKeywords] = useState("");
  const [wizardStep, setWizardStep] = useState(1);"""
content = content.replace(state_old, state_new)

# 2. openModal changes
open_old = """  const openModal = (mode: "create" | "edit", course?: Course) => {
    setFormError("");
    setModalMode(mode);
    setFormTitle("");"""

open_new = """  const openModal = (mode: "create" | "edit", course?: Course) => {
    setFormError("");
    setModalMode(mode);
    setWizardStep(1);
    setFormTitle("");"""
content = content.replace(open_old, open_new)


open_edit_old = """      setFormSkillLevel(course.skill_level || "");
      setFormPrereq(course.prerequisites || "");
      setFormLearn(course.what_you_will_learn || "");"""

open_edit_new = """      setFormSkillLevel(course.skill_level || "");
      setFormPrereq(course.prerequisites || "");
      setFormLearn(course.what_you_will_learn || "");
      setFormTargetAudience(course.target_audience || "");
      setFormHasCertificate(course.has_certificate || false);
      setFormSeoTitle(course.seo_title || "");
      setFormSeoDesc(course.seo_description || "");
      setFormSeoKeywords(course.seo_keywords || "");"""
content = content.replace(open_edit_old, open_edit_new)


open_create_old = """      setFormSkillLevel("");
      setFormPrereq("");
      setFormLearn("");"""

open_create_new = """      setFormSkillLevel("");
      setFormPrereq("");
      setFormLearn("");
      setFormTargetAudience("");
      setFormHasCertificate(false);
      setFormSeoTitle("");
      setFormSeoDesc("");
      setFormSeoKeywords("");"""
content = content.replace(open_create_old, open_create_new)

# 3. Handle Save Payload
payload_old = """        skill_level: formSkillLevel || null,
        prerequisites: formPrereq || null,
        what_you_will_learn: formLearn || null,
      };"""

payload_new = """        skill_level: formSkillLevel || null,
        prerequisites: formPrereq || null,
        what_you_will_learn: formLearn || null,
        target_audience: formTargetAudience || null,
        has_certificate: formHasCertificate,
        seo_title: formSeoTitle || null,
        seo_description: formSeoDesc || null,
        seo_keywords: formSeoKeywords || null,
      };"""
content = content.replace(payload_old, payload_new)

# 4. Helper UI functions
helper_code = """function wizardTabStyle(active: boolean): React.CSSProperties {
  return {
    padding: "16px 20px", display: "flex", alignItems: "center", gap: 10,
    background: "none", border: "none", borderBottom: active ? "3px solid #0ea5e9" : "3px solid transparent",
    fontSize: 14, fontWeight: active ? 800 : 600, color: active ? "#0ea5e9" : "#64748b",
    cursor: "pointer", transition: "all 0.2s"
  };
}
function wizardBadgeStyle(active: boolean): React.CSSProperties {
  return {
    width: 24, height: 24, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
    background: active ? "#0ea5e9" : "#e2e8f0", color: active ? "#fff" : "#94a3b8", fontSize: 12, fontWeight: 800
  };
}

export default function CourseManager() {"""
content = content.replace("export default function CourseManager() {", helper_code)

with open(r'c:\Users\sahim\Desktop\IINM_PROJECT\iinm\frontend\src\app\admin\components\CourseManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Wizard State Patch injected successfully.")
