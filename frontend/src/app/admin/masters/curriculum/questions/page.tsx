"use client";
import React from "react";
import { AdminProvider } from "../../../components/ProtectedAdmin";
import { useRouter } from "next/navigation";

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

  .qb-root {
    font-family: 'Inter', system-ui, sans-serif;
    background: #f3f4f6;
    min-height: 100vh;
    padding: 40px 32px;
    box-sizing: border-box;
    color: #111827;
  }
  .qb-root *, .qb-root *::before, .qb-root *::after { box-sizing: border-box; }

  /* ── Hero header ── */
  .qb-hero {
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
  .qb-hero-left {
    flex: 1;
    min-width: 300px;
  }
  .qb-hero-badge {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 4px 10px; border-radius: 4px;
    background: #f1f5f9; color: #64748b;
    font-size: 0.72rem; font-weight: 700; letter-spacing: 0.5px;
    text-transform: uppercase; margin-bottom: 12px;
  }
  .qb-hero-title {
    font-size: 1.75rem; font-weight: 800; color: #0f172a;
    margin: 0 0 8px; letter-spacing: -0.5px;
  }
  .qb-hero-sub {
    font-size: 0.92rem; color: #64748b;
    max-width: 520px; line-height: 1.6;
  }
  .qb-hero-stats {
    display: flex; gap: 16px; flex-wrap: wrap;
  }
  .qb-stat {
    display: flex; flex-direction: column; gap: 2px;
    background: #ffffff; border: 1px solid #e2e8f0;
    border-radius: 12px; padding: 14px 20px;
    min-width: 140px; justify-content: center;
  }
  .qb-stat-lbl {
    font-size: 0.65rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700;
  }
  .qb-stat-val {
    font-size: 1.4rem; font-weight: 800; color: #0f172a; margin-top: 4px; line-height: 1;
  }

  /* ── Section heading ── */
  .qb-section-hd {
    font-size: 1rem; font-weight: 700; color: #374151;
    margin: 0 0 16px;
    display: flex; align-items: center; gap: 8px;
  }
  .qb-section-divider {
    flex: 1; height: 1px; background: #e5e7eb;
  }

  /* ── Cards grid ── */
  .qb-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;
    margin-bottom: 36px;
  }

  /* ── Card ── */
  .qb-card {
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
  .qb-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    background: var(--card-accent, #2563eb);
    transform: scaleX(0);
    transition: transform 0.22s ease;
    transform-origin: left;
  }
  .qb-card:hover {
    transform: translateY(-4px);
    border-color: var(--card-accent, #2563eb);
    box-shadow: 0 12px 36px rgba(0,0,0,.10);
  }
  .qb-card:hover::before { transform: scaleX(1); }

  .qb-card-icon {
    width: 50px; height: 50px;
    border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 18px;
    font-size: 1.5rem;
  }
  .qb-card-title {
    font-size: 1rem; font-weight: 700; color: #111827;
    margin: 0 0 8px;
  }
  .qb-card-desc {
    font-size: .83rem; color: #6b7280; line-height: 1.6;
    margin: 0 0 20px;
  }
  .qb-card-footer {
    display: flex; align-items: center; justify-content: space-between;
  }
  .qb-card-label {
    font-size: .75rem; font-weight: 600;
    padding: 4px 12px; border-radius: 20px;
  }
  .qb-card-arrow {
    width: 32px; height: 32px; border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    background: #f3f4f6; color: #9ca3af;
    transition: all .18s;
  }
  .qb-card:hover .qb-card-arrow {
    background: var(--card-accent, #2563eb);
    color: #fff;
  }

  /* ── Coming soon badge ── */
  .qb-soon {
    font-size: .7rem; font-weight: 700; letter-spacing: .06em;
    text-transform: uppercase;
    padding: 3px 10px; border-radius: 20px;
    background: #fef3c7; color: #d97706;
  }

  @media(max-width: 640px) {
    .qb-root { padding: 20px 16px; }
    .qb-hero { padding: 28px 24px; }
    .qb-hero-title { font-size: 1.5rem; }
  }
`;

interface QBCardProps {
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

function QBCard({ icon, title, description, accent, iconBg, labelText, labelColor, comingSoon, onClick }: QBCardProps) {
  return (
    <div
      className="qb-card"
      style={{ "--card-accent": accent } as React.CSSProperties}
      onClick={comingSoon ? undefined : onClick}
    >
      <div className="qb-card-icon" style={{ background: iconBg }}>
        {icon}
      </div>
      <h3 className="qb-card-title">{title}</h3>
      <p className="qb-card-desc">{description}</p>
      <div className="qb-card-footer">
        <span className="qb-card-label" style={{ background: labelColor + "18", color: labelColor }}>
          {labelText}
        </span>
        {comingSoon ? (
          <span className="qb-soon">Coming Soon</span>
        ) : (
          <div className="qb-card-arrow">
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

function QuestionBankLanding({ onNavigate }: { onNavigate: (href: string) => void }) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />

      <div className="qb-root">
        {/* ── Hero ── */}
        <div className="qb-hero">
          <div className="qb-hero-left">
            <div className="qb-hero-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              Admin Module
            </div>
            <h1 className="qb-hero-title">Question Bank Management</h1>
            <p className="qb-hero-sub">
              Build a powerful, structured repository of questions. Organize by type, topic, difficulty level and reuse across multiple assessments and exams.
            </p>
          </div>
          <div className="qb-hero-stats">
            <div className="qb-stat">
              <span className="qb-stat-lbl">Question Types</span>
              <span className="qb-stat-val">7</span>
            </div>
            <div className="qb-stat">
              <span className="qb-stat-lbl">Questions Added</span>
              <span className="qb-stat-val">0</span>
            </div>
            <div className="qb-stat">
              <span className="qb-stat-lbl">Assessments Linked</span>
              <span className="qb-stat-val">0</span>
            </div>
          </div>
        </div>

        {/* ── Management Cards ── */}
        <div className="qb-section-hd">
          <span>Manage</span>
          <div className="qb-section-divider" />
        </div>

        <div className="qb-grid">
          <QBCard
            icon="📋"
            title="Question Types"
            description="Define and manage the types of questions available in the bank — MCQ, True/False, Fill in the Blanks, and more. Enable or disable types as needed."
            accent="#2563eb"
            iconBg="#eff6ff"
            labelText="Configuration"
            labelColor="#2563eb"
            onClick={() => onNavigate("/admin/masters/curriculum/questions/question-types")}
          />
          <QBCard
            icon="❓"
            title="Questions"
            description="Add, edit, and organize individual questions. Assign question types, difficulty levels, topics, and tags for easy retrieval and reuse."
            accent="#7c3aed"
            iconBg="#f5f3ff"
            labelText="Content"
            labelColor="#7c3aed"
            onClick={() => onNavigate("/admin/masters/curriculum/questions/list")}
          />
          <QBCard
            icon="📄"
            title="Comprehensions"
            description="Create and manage long-form passages, scenarios, or case studies that multiple questions can be linked to."
            accent="#ec4899"
            iconBg="#fdf2f8"
            labelText="Content"
            labelColor="#ec4899"
            onClick={() => onNavigate("/admin/masters/curriculum/questions/comprehensions")}
          />
          <QBCard
            icon="🏷️"
            title="Topics & Tags"
            description="Create a taxonomy of topics and tags to categorize questions. Makes filtering and assembling question sets during exam creation faster and more accurate."
            accent="#059669"
            iconBg="#ecfdf5"
            labelText="Organization"
            labelColor="#059669"
            onClick={() => onNavigate("/admin/masters/curriculum/questions/topics")}
          />
          <QBCard
            icon="📊"
            title="Difficulty Levels"
            description="Configure difficulty tiers — Easy, Medium, Hard — to balance assessment difficulty and ensure appropriate challenge for different learner levels."
            accent="#d97706"
            iconBg="#fffbeb"
            labelText="Configuration"
            labelColor="#d97706"
            onClick={() => onNavigate("/admin/masters/curriculum/questions/difficulty")}
          />
        </div>

        {/* ── Quick Access ── */}
        <div className="qb-section-hd">
          <span>Quick Access</span>
          <div className="qb-section-divider" />
        </div>

        <div className="qb-grid">
          <QBCard
            icon="📝"
            title="Quizs"
            description="Link question bank entries to course quizs. Build adaptive tests or fixed question sets with ease."
            accent="#0891b2"
            iconBg="#ecfeff"
            labelText="Quiz"
            labelColor="#0891b2"
            comingSoon
          />
          <QBCard
            icon="🎓"
            title="Exams"
            description="Pull from the question bank when composing formal exams. Control question count, type distribution, and difficulty mix."
            accent="#dc2626"
            iconBg="#fef2f2"
            labelText="Examination"
            labelColor="#dc2626"
            comingSoon
          />
        </div>
      </div>
    </>
  );
}

function InnerPage() {
  const router = useRouter();
  return <QuestionBankLanding onNavigate={(href) => router.push(href)} />;
}

export default function QuestionBankPage() {
  return (
    <AdminProvider>
      <InnerPage />
    </AdminProvider>
  );
}
