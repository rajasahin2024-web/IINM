"use client";
import React from "react";
import { AdminProvider } from "../../../components/ProtectedAdmin";
import { useRouter } from "next/navigation";

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

  .exam-root {
    font-family: 'Inter', system-ui, sans-serif;
    background: #f3f4f6;
    min-height: 100vh;
    padding: 40px 32px;
    box-sizing: border-box;
    color: #111827;
  }
  .exam-root *, .exam-root *::before, .exam-root *::after { box-sizing: border-box; }

  /* ── Hero header ── */
  .exam-hero {
    background: #ffffff;
    border-radius: 16px;
    padding: 32px 40px;
    margin-bottom: 36px;
    position: relative;
    border: 1px solid #e2e8f0;
    box-shadow: 0 4px 20px rgba(0,0,0,0.03);
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 24px;
  }
  .exam-hero-left {
    flex: 1;
    min-width: 300px;
  }
  .exam-hero-badge {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 4px 10px; border-radius: 4px;
    background: #f1f5f9; color: #64748b;
    font-size: 0.72rem; font-weight: 700; letter-spacing: 0.5px;
    text-transform: uppercase; margin-bottom: 12px;
  }
  .exam-hero-title {
    font-size: 1.75rem; font-weight: 800; color: #0f172a;
    margin: 0 0 8px; letter-spacing: -0.5px;
  }
  .exam-hero-sub {
    font-size: 0.92rem; color: #64748b;
    max-width: 520px; line-height: 1.6;
  }
  .exam-hero-stats {
    display: flex; gap: 16px; flex-wrap: wrap;
  }
  .exam-stat {
    display: flex; flex-direction: column; gap: 2px;
    background: #ffffff; border: 1px solid #e2e8f0;
    border-radius: 12px; padding: 14px 20px;
    min-width: 140px; justify-content: center;
  }
  .exam-stat-lbl {
    font-size: 0.65rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700;
  }
  .exam-stat-val {
    font-size: 1.4rem; font-weight: 800; color: #0f172a; margin-top: 4px; line-height: 1;
  }

  /* ── Section heading ── */
  .exam-section-hd {
    font-size: 1rem; font-weight: 700; color: #374151;
    margin: 0 0 16px;
    display: flex; align-items: center; gap: 8px;
  }
  .exam-section-divider {
    flex: 1; height: 1px; background: #e5e7eb;
  }

  /* ── Cards grid ── */
  .exam-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;
    margin-bottom: 36px;
  }

  /* ── Card ── */
  .exam-card {
    background: #fff;
    border-radius: 16px;
    border: 1.5px solid #e5e7eb;
    padding: 28px;
    cursor: pointer;
    transition: all 0.22s ease;
    position: relative;
    overflow: hidden;
    box-shadow: 0 1px 4px rgba(0,0,0,.05);
  }
  .exam-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    background: var(--card-accent, #2563eb);
    transform: scaleX(0);
    transition: transform 0.22s ease;
    transform-origin: left;
  }
  .exam-card:hover {
    transform: translateY(-4px);
    border-color: var(--card-accent, #2563eb);
    box-shadow: 0 12px 36px rgba(0,0,0,.10);
  }
  .exam-card:hover::before { transform: scaleX(1); }

  .exam-card-icon {
    width: 50px; height: 50px;
    border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 18px;
    font-size: 1.5rem;
  }
  .exam-card-title {
    font-size: 1rem; font-weight: 700; color: #111827;
    margin: 0 0 8px;
  }
  .exam-card-desc {
    font-size: .83rem; color: #6b7280; line-height: 1.6;
    margin: 0 0 20px;
  }
  .exam-card-footer {
    display: flex; align-items: center; justify-content: space-between;
  }
  .exam-card-label {
    font-size: .75rem; font-weight: 600;
    padding: 4px 12px; border-radius: 20px;
  }
  .exam-card-arrow {
    width: 32px; height: 32px; border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    background: #f3f4f6; color: #9ca3af;
    transition: all .18s;
  }
  .exam-card:hover .exam-card-arrow {
    background: var(--card-accent, #2563eb);
    color: #fff;
  }

  /* ── Coming soon badge ── */
  .exam-soon {
    font-size: .7rem; font-weight: 700; letter-spacing: .06em;
    text-transform: uppercase;
    padding: 3px 10px; border-radius: 20px;
    background: #fef3c7; color: #d97706;
  }

  @media(max-width: 640px) {
    .exam-root { padding: 20px 16px; }
    .exam-hero { padding: 28px 24px; }
    .exam-hero-title { font-size: 1.5rem; }
  }
`;

interface ExamCardProps {
  icon: string;
  title: string;
  description: string;
  accent: string;
  iconBg: string;
  labelText: string;
  labelColor: string;
  comingSoon?: boolean;
  onClick?: () => void;
}

function ExamCard({ icon, title, description, accent, iconBg, labelText, labelColor, comingSoon, onClick }: ExamCardProps) {
  return (
    <div
      className="exam-card"
      style={{ "--card-accent": accent } as React.CSSProperties}
      onClick={comingSoon ? undefined : onClick}
    >
      <div className="exam-card-icon" style={{ background: iconBg }}>
        {icon}
      </div>
      <h3 className="exam-card-title">{title}</h3>
      <p className="exam-card-desc">{description}</p>
      <div className="exam-card-footer">
        <span className="exam-card-label" style={{ background: labelColor + "18", color: labelColor }}>
          {labelText}
        </span>
        {comingSoon ? (
          <span className="exam-soon">Coming Soon</span>
        ) : (
          <div className="exam-card-arrow">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}

function TestManagementLanding({ onNavigate }: { onNavigate: (href: string) => void }) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />

      <div className="exam-root">
        {/* ── Hero ── */}
        <div className="exam-hero">
          <div className="exam-hero-left">
            <div className="exam-hero-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              Admin Module
            </div>
            <h1 className="exam-hero-title">Manage Tests</h1>
            <p className="exam-hero-sub">
              Compose, schedule, and assign interactive assessments. Create adaptive quizzes or structured exams built directly from your Question Bank repository.
            </p>
          </div>
          <div className="exam-hero-stats">
            <div className="exam-stat">
              <span className="exam-stat-lbl">Active Quizzes</span>
              <span className="exam-stat-val">0</span>
            </div>
            <div className="exam-stat">
              <span className="exam-stat-lbl">Upcoming Exams</span>
              <span className="exam-stat-val">0</span>
            </div>
          </div>
        </div>

        {/* ── Management Cards ── */}
        <div className="exam-section-hd">
          <span>Manage</span>
          <div className="exam-section-divider" />
        </div>

        <div className="exam-grid">
          <ExamCard
            icon="📝"
            title="Quizzes"
            description="Create interactive quizzes linked to specific subjects or chapters. Track progress, limit attempts, and fetch questions dynamically."
            accent="#2563eb"
            iconBg="#eff6ff"
            labelText="Assessment"
            labelColor="#2563eb"
            onClick={() => onNavigate("/admin/masters/curriculum/exams/quizzes")}
          />
          <ExamCard
            icon="🎓"
            title="Exams"
            description="Build rigorous exams with proctoring options, passing criteria, specific schedules, and heavy point weighting."
            accent="#dc2626"
            iconBg="#fef2f2"
            labelText="Examination"
            labelColor="#dc2626"
            onClick={() => onNavigate("/admin/masters/curriculum/exams/exams")}
          />
          <ExamCard
            icon="🛠️"
            title="Quiz Types"
            description="Manage configurations for quizzes — allow mock tests, practice rounds, or graded assignments with differing properties."
            accent="#d97706"
            iconBg="#fffbeb"
            labelText="Configuration"
            labelColor="#d97706"
            onClick={() => onNavigate("/admin/masters/curriculum/exams/quiz-types")}
          />
          <ExamCard
            icon="📑"
            title="Exam Types"
            description="Define rules for major exams — end-of-course evaluations, placement exams, or standardized testing modes."
            accent="#059669"
            iconBg="#ecfdf5"
            labelText="Configuration"
            labelColor="#059669"
            onClick={() => onNavigate("/admin/masters/curriculum/exams/exam-types")}
          />
        </div>
      </div>
    </>
  );
}

function InnerPage() {
  const router = useRouter();
  return <TestManagementLanding onNavigate={(href) => router.push(href)} />;
}

export default function TestManagementPage() {
  return (
    <AdminProvider>
      <InnerPage />
    </AdminProvider>
  );
}
