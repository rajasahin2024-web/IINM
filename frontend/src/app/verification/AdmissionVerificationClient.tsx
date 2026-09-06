"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Search,
  CheckCircle,
  X,
  Printer,
  Share2,
  Copy,
  Check,
  User,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import PublicNavbar from "@/components/PublicNavbar";
import PublicFooter from "@/components/PublicFooter";
import { API_BASE_URL, resolveAssetUrl } from "@/lib/config";
import "./verification.css";

interface BatchInfo {
  batch_id?: number;
  batch_name?: string;
  mode?: string;
  status?: string;
  enrollment_status?: string;
  start_date?: string | null;
  end_date?: string | null;
  routines?: string[];
}

interface CourseAdmitted {
  purchase_id?: number | null;
  invoice_uuid?: string | null;
  course_id: number;
  title: string;
  slug?: string;
  thumbnail_url?: string | null;
  duration?: string | null;
  admission_date: string;
  admission_status: string;
  payment_status: string;
  is_current: boolean;
  batch?: BatchInfo | null;
}

interface StudentRecord {
  id: number;
  registration_no: string;
  first_name: string;
  last_name?: string | null;
  full_name: string;
  masked_email?: string | null;
  masked_phone?: string | null;
  profile_photo_url?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  city?: string | null;
  state?: string | null;
  highest_qualification?: string | null;
  current_occupation?: string | null;
  student_category?: string | null;
  admission_date?: string | null;
  is_active: boolean;
}

interface VerificationData {
  status: "VERIFIED" | "NOT_FOUND";
  verification_code: string;
  verified_at: string;
  student: StudentRecord;
  courses_count: number;
  courses: CourseAdmitted[];
  institutional_credentials: {
    institute_name: string;
    governance: string;
    certifications: string[];
    verification_authority: string;
    official_portal: string;
  };
}

export default function AdmissionVerificationClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [queryInput, setQueryInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [record, setRecord] = useState<VerificationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleSearch = useCallback(async (searchTerm: string) => {
    const q = searchTerm.trim();
    if (!q) {
      setError("Please enter a Registration Number, Mobile Number, or Email Address.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `${API_BASE_URL}/public/verification/admission?query=${encodeURIComponent(q)}`
      );

      if (res.status === 404) {
        const errData = await res.json().catch(() => ({}));
        setRecord(null);
        setError(
          errData.detail ||
            "No admission record found matching the specified identifier. Please verify the registration number or mobile number."
        );
        return;
      }

      if (!res.ok) {
        throw new Error("Unable to connect to the verification database.");
      }

      const data: VerificationData = await res.json();
      setRecord(data);
      setError(null);

      // Update URL query parameter cleanly without full reload
      const newUrl = `/verification?reg=${encodeURIComponent(data.student.registration_no)}`;
      window.history.replaceState(null, "", newUrl);
    } catch (err: any) {
      setRecord(null);
      setError(err.message || "An error occurred while verifying the admission record.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const regParam =
      searchParams.get("reg") ||
      searchParams.get("q") ||
      searchParams.get("id") ||
      searchParams.get("query");

    if (regParam) {
      setQueryInput(regParam);
      handleSearch(regParam);
    }
  }, [searchParams, handleSearch]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(queryInput);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleShareLink = async () => {
    const currentUrl = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Admission Verification - ${record?.student.full_name}`,
          text: `Official admission verification record for ${record?.student.full_name} (${record?.student.registration_no}) at IINM.`,
          url: currentUrl,
        });
        return;
      } catch {
        // User cancelled or unsupported
      }
    }

    navigator.clipboard.writeText(currentUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  const currentVerificationUrl =
    typeof window !== "undefined"
      ? window.location.href
      : `https://iinmedu.com/verification?reg=${record?.student.registration_no || ""}`;

  const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
    currentVerificationUrl
  )}`;

  return (
    <div className="adm-verify-page">
      <PublicNavbar />

      {/* ── Page Header matching Notice / Standard Pages ── */}
      <header className="adm-page-header">
        <div className="adm-container">
          <div className="adm-breadcrumbs">
            <Link href="/">Home</Link>
            <span>/</span>
            <Link href="/verification">Verification</Link>
            <span>/</span>
            <span style={{ color: "#0a1628" }}>Admission Verification</span>
          </div>

          <h1 className="adm-page-title">Admission Verification</h1>
          <p className="adm-page-sub">
            Verify candidate enrollment, admission dates, enrolled academic programs, and active batch allocations from the central registry of the Indian Institute of New Media.
          </p>
        </div>
      </header>

      {/* ── Main Content Area ── */}
      <main className="adm-main-body">
        <div className="adm-container">
          {/* ── Search Form Panel ── */}
          <section className="adm-search-panel">
            <h2 className="adm-search-title">Verify Candidate Admission</h2>
            <p className="adm-search-desc">
              Enter the unique Student Registration Number, registered mobile number, or email address.
            </p>

            <form onSubmit={onSubmit} className="adm-search-form">
              <div className="adm-input-wrapper">
                <Search size={18} className="adm-input-icon" />
                <input
                  type="text"
                  className="adm-search-field"
                  placeholder="e.g. IINM-2026-0001, 8170952490, or candidate email"
                  value={queryInput}
                  onChange={(e) => setQueryInput(e.target.value)}
                  autoComplete="off"
                />
                {queryInput && (
                  <button
                    type="button"
                    className="adm-clear-btn"
                    onClick={() => setQueryInput("")}
                    title="Clear"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              <button
                type="submit"
                className="adm-submit-btn"
                disabled={loading || !queryInput.trim()}
              >
                {loading ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    <span>Verifying…</span>
                  </>
                ) : (
                  <span>Verify Record</span>
                )}
              </button>
            </form>

            <div className="adm-input-hint">
              <span>Standard Format:</span>
              <code>IINM-YYYY-NNNN</code>
              <span>or registered 10-digit mobile number.</span>
            </div>
          </section>

          {/* ── Error Display Banner ── */}
          {error && (
            <div className="adm-alert-error">
              <AlertCircle size={20} className="adm-alert-icon" />
              <div>
                <div className="adm-alert-title">Record Not Found</div>
                <p className="adm-alert-text">{error}</p>
              </div>
            </div>
          )}

          {/* ── VERIFIED ADMISSION RECORD (Clean Institutional Document Layout) ── */}
          {record && (
            <div>
              <article className="adm-record-card" id="printable-record">
                {/* Header Strip */}
                <div className="adm-record-header">
                  <div className="adm-record-heading-group">
                    <h3>Indian Institute of New Media</h3>
                    <p>Official Student Admission & Academic Enrollment Record</p>
                  </div>

                  <div className="adm-verified-badge">
                    <CheckCircle size={14} />
                    <span>VERIFIED RECORD</span>
                  </div>
                </div>

                {/* Metadata Strip */}
                <div className="adm-meta-bar">
                  <div className="adm-meta-item">
                    Verification Code:{" "}
                    <strong>{record.verification_code}</strong>
                    <button
                      onClick={() => handleCopyCode(record.verification_code)}
                      className="adm-copy-btn"
                      title="Copy Code"
                    >
                      {copiedCode ? <Check size={13} /> : <Copy size={13} />}
                    </button>
                  </div>

                  <div className="adm-meta-item">
                    Verified On:{" "}
                    <strong>
                      {new Date(record.verified_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </strong>
                  </div>
                </div>

                {/* ── Candidate Information Row ── */}
                <div className="adm-candidate-section">
                  {/* Photo Frame */}
                  <div className="adm-photo-container">
                    {record.student.profile_photo_url ? (
                      <img
                        src={resolveAssetUrl(record.student.profile_photo_url)}
                        alt={record.student.full_name}
                        className="adm-photo-img"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          const parent = e.currentTarget.parentElement;
                          if (parent) {
                            const fallback = parent.querySelector(".adm-photo-placeholder");
                            if (fallback) (fallback as HTMLElement).style.display = "flex";
                          }
                        }}
                      />
                    ) : null}

                    <div
                      className="adm-photo-placeholder"
                      style={{
                        display: record.student.profile_photo_url ? "none" : "flex",
                      }}
                    >
                      <User size={32} />
                      <span>Student Photo</span>
                    </div>
                  </div>

                  {/* Information Table */}
                  <div className="adm-candidate-info">
                    <h4 className="adm-candidate-name">{record.student.full_name}</h4>

                    <div className="adm-info-table">
                      <div className="adm-table-cell">
                        <div className="adm-label">Registration No.</div>
                        <div className="adm-val" style={{ color: "#0a1628" }}>
                          {record.student.registration_no}
                        </div>
                      </div>

                      <div className="adm-table-cell">
                        <div className="adm-label">Admission Date</div>
                        <div className="adm-val">
                          {record.student.admission_date || "Confirmed"}
                        </div>
                      </div>

                      <div className="adm-table-cell">
                        <div className="adm-label">Enrollment Status</div>
                        <div className="adm-val" style={{ color: record.student.is_active ? "#15803d" : "#64748b" }}>
                          {record.student.is_active ? "Active Student" : "Inactive Record"}
                        </div>
                      </div>

                      <div className="adm-table-cell">
                        <div className="adm-label">Registered Phone</div>
                        <div className="adm-val">
                          {record.student.masked_phone || "Protected"}
                        </div>
                      </div>

                      <div className="adm-table-cell">
                        <div className="adm-label">Registered Email</div>
                        <div className="adm-val">
                          {record.student.masked_email || "Protected"}
                        </div>
                      </div>

                      <div className="adm-table-cell">
                        <div className="adm-label">Location / State</div>
                        <div className="adm-val">
                          {[record.student.city, record.student.state]
                            .filter(Boolean)
                            .join(", ") || "Recorded"}
                        </div>
                      </div>

                      {record.student.highest_qualification && (
                        <div className="adm-table-cell">
                          <div className="adm-label">Highest Qualification</div>
                          <div className="adm-val">
                            {record.student.highest_qualification}
                          </div>
                        </div>
                      )}

                      {(record.student.student_category || record.student.current_occupation) && (
                        <div className="adm-table-cell">
                          <div className="adm-label">Category / Occupation</div>
                          <div className="adm-val">
                            {record.student.student_category || record.student.current_occupation}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── Enrolled Academic Programs & Batches (Multi-Course Support) ── */}
                <div className="adm-programs-section">
                  <h4 className="adm-section-heading">
                    Enrolled Academic Programs & Batch Allocations
                  </h4>

                  {record.courses.length === 0 ? (
                    <div style={{ padding: "16px", color: "#64748b", fontSize: "13px" }}>
                      Admission confirmed. Cohort allocation is currently being updated.
                    </div>
                  ) : (
                    <div className="adm-programs-list">
                      {record.courses.map((course, idx) => {
                        const batch = course.batch;
                        const batchStatus = (batch?.status || "Ongoing").toLowerCase();

                        return (
                          <div key={course.course_id || idx} className="adm-program-item">
                            {/* Course Title & Date */}
                            <div className="adm-program-header">
                              <div>
                                <h5 className="adm-program-title">{course.title}</h5>
                                <p className="adm-program-date">
                                  Enrolled: {course.admission_date}
                                  {course.duration ? ` • Duration: ${course.duration}` : ""}
                                </p>
                              </div>

                              <div className="adm-program-badges">
                                <span className="adm-badge-enrolled">
                                  {course.admission_status}
                                </span>
                              </div>
                            </div>

                            {/* Batch Row */}
                            <div className="adm-batch-row">
                              <div className="adm-batch-cell">
                                <div className="adm-label">Allocated Batch</div>
                                <div className="adm-val">
                                  {batch?.batch_name || "General Admission Batch"}
                                  {batch?.mode ? ` (${batch.mode})` : ""}
                                </div>
                              </div>

                              <div className="adm-batch-cell">
                                <div className="adm-label">Batch Status</div>
                                <div>
                                  {batchStatus === "completed" ? (
                                    <span className="adm-status-tag adm-status-completed">
                                      Completed
                                    </span>
                                  ) : batchStatus === "upcoming" ? (
                                    <span className="adm-status-tag adm-status-upcoming">
                                      Upcoming
                                    </span>
                                  ) : (
                                    <span className="adm-status-tag adm-status-ongoing">
                                      Ongoing Batch
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="adm-batch-cell">
                                <div className="adm-label">Schedule & Timeline</div>
                                <div className="adm-val" style={{ fontSize: "12px", color: "#475569" }}>
                                  {batch?.start_date && (
                                    <span>
                                      Commenced:{" "}
                                      {new Date(batch.start_date).toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                      })}
                                    </span>
                                  )}
                                  {batch?.routines && batch.routines.length > 0 && (
                                    <div>{batch.routines.join(", ")}</div>
                                  )}
                                  {!batch?.start_date && (!batch?.routines || batch.routines.length === 0) && (
                                    <span>Standard Session Schedule</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* ── Document Footer with Small QR Code & Official Statement ── */}
                <div className="adm-record-footer">
                  <div className="adm-qr-container">
                    <img
                      src={qrCodeImageUrl}
                      alt="Verification QR"
                      className="adm-qr-frame"
                    />
                    <div className="adm-qr-info">
                      <h5>Electronic Document Verification</h5>
                      <p>
                        Scan QR code using any smartphone camera to view this live authenticated record online.
                      </p>
                    </div>
                  </div>

                  <div className="adm-stamp-box">
                    <div className="adm-stamp-title">Academic Records Office</div>
                    <div className="adm-stamp-desc">Indian Institute of New Media</div>
                  </div>
                </div>
              </article>

              {/* ── Action Buttons ── */}
              <div className="adm-actions-container">
                <button type="button" onClick={handlePrint} className="adm-action-primary">
                  <Printer size={15} />
                  <span>Print Official Record</span>
                </button>

                <button type="button" onClick={handleShareLink} className="adm-action-secondary">
                  <Share2 size={15} />
                  <span>{copiedLink ? "Link Copied" : "Share Link"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRecord(null);
                    setQueryInput("");
                    window.history.replaceState(null, "", "/verification");
                  }}
                  className="adm-action-secondary"
                >
                  <RefreshCw size={14} />
                  <span>Verify Another Record</span>
                </button>
              </div>
            </div>
          )}

          {/* ── Institutional Verification Information ── */}
          <div className="adm-info-note">
            <h4 className="adm-note-title">About the Academic Verification Portal</h4>
            <p className="adm-note-text">
              The Indian Institute of New Media maintains centralized digital student records. This portal is provided for candidate identification, employer background screening, and academic verification. If you require formal attestation or have discrepancies with an admission record, please write to our academic administration at <strong>verification@iinmedu.com</strong>.
            </p>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
