"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  changeStudentPassword,
  getStudentProfile,
  StudentApiError,
  updateStudentProfile,
  type StudentFullProfile,
  type StudentProfilePatch,
} from "@/lib/studentApi";
import SIcon from "../icons";

type FormState = Record<string, string>;

const FIELDS: { section: string; icon: string; fields: { key: keyof StudentProfilePatch & string; label: string; type?: string; span?: boolean }[] }[] = [
  {
    section: "Personal details",
    icon: "person",
    fields: [
      { key: "first_name", label: "First name" },
      { key: "last_name", label: "Last name" },
      { key: "date_of_birth", label: "Date of birth", type: "date" },
      { key: "gender", label: "Gender" },
    ],
  },
  {
    section: "Contact",
    icon: "phone",
    fields: [
      { key: "phone", label: "Phone", type: "tel" },
      { key: "alternative_phone", label: "Alternate phone", type: "tel" },
      { key: "city", label: "City" },
      { key: "state", label: "State" },
      { key: "pin_code", label: "PIN code" },
      { key: "address", label: "Address", span: true },
    ],
  },
  {
    section: "Education & work",
    icon: "school",
    fields: [
      { key: "highest_qualification", label: "Highest qualification" },
      { key: "current_occupation", label: "Current occupation" },
      { key: "student_category", label: "Student category" },
      { key: "job_title", label: "Job title" },
      { key: "company_name", label: "Company" },
      { key: "work_experience", label: "Work experience" },
      { key: "linkedin_url", label: "LinkedIn URL", type: "url" },
      { key: "preferred_language", label: "Preferred language" },
    ],
  },
  {
    section: "Emergency contact",
    icon: "alert",
    fields: [
      { key: "emergency_contact_name", label: "Contact name" },
      { key: "emergency_contact_phone", label: "Contact phone", type: "tel" },
    ],
  },
];

export default function StudentProfilePage() {
  const router = useRouter();
  const [full, setFull] = useState<StudentFullProfile | null>(null);
  const [form, setForm] = useState<FormState>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");

  const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" });
  const [pwdMsg, setPwdMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pwdBusy, setPwdBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getStudentProfile()
      .then((p) => {
        if (cancelled) return;
        setFull(p);
        const f: FormState = {};
        for (const s of FIELDS) {
          for (const fld of s.fields) {
            const v = p[fld.key as keyof StudentFullProfile];
            f[fld.key] = typeof v === "string" ? v : "";
          }
        }
        setForm(f);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof StudentApiError && err.status === 401) router.replace("/signin");
        else setError("Could not load your profile. Please retry.");
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  const save = async () => {
    setFormError("");
    setSaved(false);
    if (!form.first_name?.trim()) {
      setFormError("First name is required.");
      return;
    }
    setSaving(true);
    try {
      const patch: StudentProfilePatch = {};
      for (const s of FIELDS) {
        for (const fld of s.fields) {
          (patch as Record<string, string | null>)[fld.key] = form[fld.key]?.trim() || null;
        }
      }
      const updated = await updateStudentProfile(patch);
      setFull(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setFormError(e instanceof StudentApiError ? e.message : "Could not save. Please retry.");
    } finally {
      setSaving(false);
    }
  };

  const changePwd = async () => {
    setPwdMsg(null);
    if (pwd.next.length < 8) {
      setPwdMsg({ ok: false, text: "New password must be at least 8 characters." });
      return;
    }
    if (pwd.next !== pwd.confirm) {
      setPwdMsg({ ok: false, text: "New passwords do not match." });
      return;
    }
    setPwdBusy(true);
    try {
      await changeStudentPassword(pwd.current, pwd.next);
      setPwdMsg({ ok: true, text: "Password updated successfully." });
      setPwd({ current: "", next: "", confirm: "" });
    } catch (e) {
      setPwdMsg({ ok: false, text: e instanceof StudentApiError ? e.message : "Could not change password." });
    } finally {
      setPwdBusy(false);
    }
  };

  if (error) {
    return (
      <div className="stu-empty" role="alert">
        <SIcon name="cloud-off" size={40} />
        <p className="stu-empty-title">Couldn&apos;t load profile</p>
        <p className="stu-empty-sub">{error}</p>
        <button className="stu-btn-primary" onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  if (!full) {
    return (
      <div aria-busy="true">
        <div className="stu-skel stu-skel-line" style={{ width: "30%", height: 22 }} />
        <div className="stu-skel" style={{ height: 200, marginBottom: 14 }} />
        <div className="stu-skel" style={{ height: 160 }} />
      </div>
    );
  }

  const initials = (full.first_name?.[0] || "S").toUpperCase();

  return (
    <>
      <div className="stu-page-head">
        <h1 className="stu-page-title">My profile</h1>
        <p className="stu-page-sub">Your personal and contact details on record.</p>
      </div>

      {/* Identity header */}
      <div className="stu-profile-hero">
        <span className="stu-avatar stu-avatar-lg" aria-hidden="true">{initials}</span>
        <div className="stu-profile-hero-meta">
          <span className="stu-profile-hero-name">
            {full.first_name} {full.last_name ?? ""}
          </span>
          <span className="stu-profile-hero-sub">{full.email}</span>
          {full.phone && <span className="stu-profile-hero-sub">{full.phone}</span>}
        </div>
      </div>

      {formError && (
        <div className="stu-alert" role="alert">
          <SIcon name="alert" size={18} />
          {formError}
        </div>
      )}
      {saved && (
        <div className="stu-alert stu-alert-ok" role="status">
          <SIcon name="check-circle" size={18} />
          Profile saved.
        </div>
      )}

      {FIELDS.map((sec) => (
        <section className="stu-section" key={sec.section} aria-labelledby={`pf-${sec.icon}`}>
          <div className="stu-section-head">
            <h2 className="stu-section-title" id={`pf-${sec.icon}`}>
              <SIcon name={sec.icon} size={19} />
              {sec.section}
            </h2>
          </div>
          <div className="stu-section-body">
            <div className="stu-form-grid">
              {sec.fields.map((fld) => (
                <label className={`stu-field ${fld.span ? "stu-field-span" : ""}`} key={fld.key}>
                  <span className="stu-field-label">{fld.label}</span>
                  {fld.key === "address" ? (
                    <textarea
                      className="stu-input"
                      rows={3}
                      value={form[fld.key] ?? ""}
                      onChange={(e) => setForm({ ...form, [fld.key]: e.target.value })}
                    />
                  ) : (
                    <input
                      className="stu-input"
                      type={fld.type ?? "text"}
                      value={form[fld.key] ?? ""}
                      onChange={(e) => setForm({ ...form, [fld.key]: e.target.value })}
                    />
                  )}
                </label>
              ))}
            </div>
          </div>
        </section>
      ))}

      <div className="stu-savebar">
        <button type="button" className="stu-cta" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>

      {/* Change password */}
      <section className="stu-section" aria-labelledby="pf-pwd">
        <div className="stu-section-head">
          <h2 className="stu-section-title" id="pf-pwd">
            <SIcon name="lock" size={19} />
            Change password
          </h2>
        </div>
        <div className="stu-section-body">
          {pwdMsg && (
            <div className={`stu-alert ${pwdMsg.ok ? "stu-alert-ok" : ""}`} role={pwdMsg.ok ? "status" : "alert"}>
              <SIcon name={pwdMsg.ok ? "check-circle" : "alert"} size={18} />
              {pwdMsg.text}
            </div>
          )}
          <div className="stu-form-grid">
            <label className="stu-field">
              <span className="stu-field-label">Current password</span>
              <input
                className="stu-input"
                type="password"
                autoComplete="current-password"
                value={pwd.current}
                onChange={(e) => setPwd({ ...pwd, current: e.target.value })}
              />
            </label>
            <label className="stu-field">
              <span className="stu-field-label">New password</span>
              <input
                className="stu-input"
                type="password"
                autoComplete="new-password"
                value={pwd.next}
                onChange={(e) => setPwd({ ...pwd, next: e.target.value })}
              />
            </label>
            <label className="stu-field">
              <span className="stu-field-label">Confirm new password</span>
              <input
                className="stu-input"
                type="password"
                autoComplete="new-password"
                value={pwd.confirm}
                onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })}
              />
            </label>
          </div>
          <div className="stu-savebar">
            <button
              type="button"
              className="stu-cta"
              onClick={changePwd}
              disabled={pwdBusy || !pwd.current || !pwd.next}
            >
              {pwdBusy ? "Updating…" : "Update password"}
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
