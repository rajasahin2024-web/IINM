"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { BASE_URL, API_BASE_URL } from "@/lib/config";
import { apiFetch } from "@/lib/apiFetch";
import Image from "next/image";
import "./course-details.css";
import "../../home.css";
import PublicNavbar from "../../../components/PublicNavbar";
import PublicFooter from "../../../components/PublicFooter";

const Icons = {
  Video: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/></svg>,
  FileText: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>,
  ImageIcon: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>,
  CheckCircle: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  Clock: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 16 14"/></svg>,
  Award: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>,
  Globe: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/></svg>,
  PlaySolid: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M8 5v14l11-7z"/></svg>,
  ChevronDown: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>,
  ChevronUp: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>,
  Users: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  User: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Star: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
  Edit: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>,
  Download: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>,
  Sparkles: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3Z"/></svg>,
  Lock: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  PhoneCall: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.79 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
};

interface HeroStat { value: string; label: string; }
interface HeroContent {
  badges?: string[];
  stats?: HeroStat[];
  cta_primary?: string;
  cta_secondary?: string;
}

interface Material { id: number; title: string; file_type: string; }
interface LiveClassItem { id: number; title: string; }
interface SubjectRef { id: number; name: string; }
interface Chapter { id: number; title: string; subject?: SubjectRef | null; materials: Material[]; live_classes?: LiveClassItem[]; }
interface Instructor {
  id: number; name: string; bio?: string | null; email?: string | null; avatar_url?: string | null;
  qualification?: string | null; experience_years?: string | null; designation?: string | null;
  specialization?: string | null; teaching_hours?: string | null; rating?: string | null;
  social_linkedin?: string | null; social_twitter?: string | null;
  social_website?: string | null; intro_video_url?: string | null; achievements?: string | null;
}
interface CourseDetails {
  id: number; slug: string; title: string; description: string | null; thumbnail_url: string | null;
  promo_video_url: string | null; price: number | null; discount_price: number | null;
  price_usd: number | null; discount_price_usd: number | null; is_free: boolean; currency: string;
  skill_level: string | null; instructor_name: string | null; show_instructor_publicly: boolean;
  has_certificate: boolean; validity_days: number | null; prerequisites: string | null;
  what_you_will_learn: string | null; target_audience: string | null;
  upload_syllabus: string | null; chapters: Chapter[]; instructors: Instructor[];
  extended?: any;
}
interface ProjectCard {
  title: string;
  category: string;
  description: string;
  image_url: string;
  tags: string[];
}
interface CertificateItem { image_url: string; alt: string; }
interface CertificateContent {
  eyebrow: string;
  title: string;
  title_blue: string;
  items: CertificateItem[];
}

const DEFAULT_CERTIFICATES: CertificateContent = {
  eyebrow: "— Certifications —",
  title: "Industry-Recognized GenAI",
  title_blue: "Certifications",
  items: [
    { image_url: "/certificate-appreciation.png", alt: "Certificate of Appreciation" },
    { image_url: "/certificate-partnership.png", alt: "Certificate of Partnership" }
  ]
};

function HeroGridSpotlight() {
  const spotlightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hero = spotlightRef.current?.parentElement;
    const spot = spotlightRef.current;
    if (!hero || !spot) return;

    const handleMouse = (e: MouseEvent) => {
      const rect = hero.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      spot.style.setProperty("--mouse-x", `${x}px`);
      spot.style.setProperty("--mouse-y", `${y}px`);
      spot.style.opacity = "1";
    };
    const handleLeave = () => {
      spot.style.opacity = "0";
    };

    hero.addEventListener("mousemove", handleMouse);
    hero.addEventListener("mouseleave", handleLeave);
    return () => {
      hero.removeEventListener("mousemove", handleMouse);
      hero.removeEventListener("mouseleave", handleLeave);
    };
  }, []);

  return (
    <>
      <div className="cd-hero-grid-bg" />
      <div ref={spotlightRef} className="cd-hero-grid-spotlight" />
    </>
  );
}

function CodeSpotlightBackground() {
  const spotlightRef = useRef<HTMLDivElement>(null);

  const fullCodeText = `import { Agent, Tool, Task, MultiAgentSwarm } from "@langchain/core";
import { VectorStore, RAGPipeline, Embeddings } from "rag-engine";
import { ChatOpenAI } from "@langchain/openai";

async function executeAgenticWorkflow(prompt: string) {
  const llm = new ChatOpenAI({ modelName: "gpt-4o", temperature: 0.2 });
  const embeddings = new OpenAIEmbeddings();
  const vectorDb = await VectorStore.connect("pgvector://localhost:5432");
  
  const searchTool = new Tool({
    name: "VectorSearch",
    description: "Semantic search across multi-modal document chunks",
    func: async (query) => await vectorDb.similaritySearch(query, 5)
  });

  const engineerAgent = new Agent({ role: "Lead Architect", llm, tools: [searchTool] });
  const swarm = new MultiAgentSwarm({ agents: [engineerAgent], consensus: "hierarchical" });
  const result = await swarm.execute(prompt);
  return result;
}

export const curriculumPipeline = {
  version: "2.0.0",
  modules: ["Prompt Engineering", "RAG Systems", "Agentic AI", "LLMOps"],
  status: "active"
};`.repeat(4);

  useEffect(() => {
    const sec = spotlightRef.current?.parentElement;
    const spot = spotlightRef.current;
    if (!sec || !spot) return;

    const handleMouse = (e: MouseEvent) => {
      const rect = sec.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      spot.style.setProperty("--mouse-x", `${x}px`);
      spot.style.setProperty("--mouse-y", `${y}px`);
      spot.style.opacity = "1";
    };
    const handleLeave = () => {
      spot.style.opacity = "0";
    };

    sec.addEventListener("mousemove", handleMouse);
    sec.addEventListener("mouseleave", handleLeave);
    return () => {
      sec.removeEventListener("mousemove", handleMouse);
      sec.removeEventListener("mouseleave", handleLeave);
    };
  }, []);

  return (
    <>
      <div className="cd-curr-code-bg">
        <pre>{fullCodeText}</pre>
      </div>
      <div ref={spotlightRef} className="cd-curr-code-spotlight">
        <pre>{fullCodeText}</pre>
      </div>
    </>
  );
}

const CODE_SNIPPETS: Record<string, string> = {
  "agent.py": `from crewai import Agent, Task, Crew
from langchain_openai import ChatOpenAI
from tools import search_tool, code_executor

# 1. Initialize Autonomous AI Engineer
ai_developer = Agent(
    role="Senior Agentic AI Engineer",
    goal="Design, code & deploy multi-agent LLM systems",
    backstory="Expert in RAG, AutoGen, CrewAI & LangGraph",
    tools=[search_tool, code_executor],
    verbose=True
)

# 2. Assign Production Capstone Task
task = Task(
    description="Build autonomous enterprise AI pipeline",
    agent=ai_developer
)

crew = Crew(agents=[ai_developer], tasks=[task])
result = crew.kickoff()
print("Pipeline Output:", result)`,

  "tools.py": `from langchain_community.tools import DuckDuckGoSearchRun
from langchain_core.tools import tool

@tool("web_search")
def search_tool(query: str) -> str:
    """Performs web search for real-time AI context."""
    search = DuckDuckGoSearchRun()
    return search.run(query)

@tool("code_executor")
def code_executor(code: str) -> str:
    """Executes code in sandboxed Docker environment."""
    return f"Execution success: {code[:30]}..."`,

  "orchestrator.py": `from langgraph.graph import StateGraph, END
from typing import TypedDict

class AgentState(TypedDict):
    messages: list
    next_step: str

workflow = StateGraph(AgentState)
workflow.add_node("planner", plan_architecture)
workflow.add_node("coder", generate_code)
workflow.add_node("tester", run_tests)

workflow.set_entry_point("planner")
workflow.add_edge("planner", "coder")
workflow.add_edge("coder", "tester")
workflow.add_edge("tester", END)

app = workflow.compile()
print("Multi-Agent Graph Orchestration Ready!")`
};

function CodeIdeWindow() {
  const [activeTab, setActiveTab] = useState<string>("agent.py");
  const [typedCharCount, setTypedCharCount] = useState<number>(0);
  const [isTyping, setIsTyping] = useState<boolean>(true);

  const currentSnippet = CODE_SNIPPETS[activeTab] || "";

  const handleTabChange = (tabKey: string) => {
    setActiveTab(tabKey);
    setTypedCharCount(0);
    setIsTyping(true);
  };

  useEffect(() => {
    setTypedCharCount(0);
    setIsTyping(true);
  }, [activeTab]);

  useEffect(() => {
    if (!isTyping) return;

    if (typedCharCount < currentSnippet.length) {
      const timer = setTimeout(() => {
        setTypedCharCount(prev => prev + 1);
      }, 22);
      return () => clearTimeout(timer);
    } else {
      const pauseTimer = setTimeout(() => {
        const tabs = Object.keys(CODE_SNIPPETS);
        const currentIndex = tabs.indexOf(activeTab);
        const nextIndex = (currentIndex + 1) % tabs.length;
        setActiveTab(tabs[nextIndex]);
      }, 3500);
      return () => clearTimeout(pauseTimer);
    }
  }, [typedCharCount, isTyping, currentSnippet, activeTab]);

  const visibleCode = currentSnippet.slice(0, typedCharCount);
  const lines = visibleCode.split("\n");

  const renderLine = (line: string) => {
    if (line.trim().startsWith("#")) {
      return <span className="code-comment">{line}</span>;
    }

    const keywords = ["from", "import", "def", "class", "return", "True", "False", "and", "or", "not", "in", "is", "as", "with"];
    const classes = ["Agent", "Task", "Crew", "ChatOpenAI", "DuckDuckGoSearchRun", "StateGraph", "END", "TypedDict"];

    const parts = line.split(/(\b\w+\b|".*?"|'.*?'|#.*)/g);

    return parts.map((part, idx) => {
      if (!part) return null;
      if (part.startsWith("#")) return <span key={idx} className="code-comment">{part}</span>;
      if ((part.startsWith('"') && part.endsWith('"')) || (part.startsWith("'") && part.endsWith("'"))) {
        return <span key={idx} className="code-str">{part}</span>;
      }
      if (keywords.includes(part)) {
        return <span key={idx} className="code-kw">{part}</span>;
      }
      if (classes.includes(part)) {
        return <span key={idx} className="code-class">{part}</span>;
      }
      if (part.startsWith("@") || ["role", "goal", "backstory", "tools", "verbose", "description", "agent", "agents", "tasks", "messages", "next_step"].includes(part)) {
        return <span key={idx} className="code-var">{part}</span>;
      }
      if (["kickoff", "print", "run", "add_node", "add_edge", "compile", "set_entry_point"].includes(part)) {
        return <span key={idx} className="code-func">{part}</span>;
      }
      return <span key={idx}>{part}</span>;
    });
  };

  return (
    <div className="cd-ide-window">
      <div className="cd-ide-topbar">
        <div className="cd-ide-dots">
          <div className="cd-ide-dot cd-ide-dot-red" />
          <div className="cd-ide-dot cd-ide-dot-yellow" />
          <div className="cd-ide-dot cd-ide-dot-green" />
        </div>
        <div className="cd-ide-tabs">
          {Object.keys(CODE_SNIPPETS).map(tab => (
            <div
              key={tab}
              className={`cd-ide-tab ${activeTab === tab ? "active" : ""}`}
              onClick={() => handleTabChange(tab)}
            >
              <span className="cd-ide-tab-icon">🐍</span>
              <span>{tab}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="cd-ide-body">
        <div className="cd-ide-lines">
          {lines.map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        <div className="cd-ide-code-container">
          {lines.map((line, i) => (
            <div key={i}>
              {renderLine(line)}
              {i === lines.length - 1 && <span className="cd-ide-cursor" />}
            </div>
          ))}
        </div>
      </div>

      <div className="cd-ide-statusbar">
        <div className="cd-ide-statusbar-left">
          <span className="cd-ide-status-live">Connected</span>
          <span>Python 3.11 · CrewAI + LangGraph</span>
        </div>
        <span>UTF-8 · LF · {lines.length} lines</span>
      </div>
    </div>
  );
}

const DEFAULT_HERO_STATS: HeroStat[] = [
  { value: "21.5 LPA", label: "Avg Salary for Professionals" },
  { value: "118%", label: "Avg Career & Revenue Growth" },
  { value: "1:1 Mentorship", label: "For Professionals & Founders" }
];

const DEFAULT_BADGES = [
  "Live Cohorts & 1:1 Mentorship",
  "76% Enterprise AI Adoption",
  "Agentic AI & Capstone Projects",
  "Industry Certificate Included"
];

const DEFAULT_COMPARE_ROWS = [
  { feature: "Live Class", iinm: true, others: false, others_note: "(Mostly recorded)" },
  { feature: "24×7 WhatsApp Doubt Clearing Portal", iinm: true, others: false },
  { feature: "AI Doubt Clearing Mentor", iinm: true, others: false },
  { feature: "IINM Cloud [Free Domain + Hosting] 6 Months", iinm: true, others: false },
  { feature: "Certifications", iinm: true, others: "limited", others_note: "Limited" },
  { feature: "Freelancing Opportunities", iinm: true, others: false },
  { feature: "Lifetime Course Access", iinm: true, others: false, others_note: "(Limited access)" },
  { feature: "New Tool Learning & Upgrades", iinm: true, others: false },
];

export default function CourseDetailsPage() {
  const { slug } = useParams();
  const [course, setCourse] = useState<CourseDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [openChapters, setOpenChapters] = useState<Record<number, boolean>>({});
  const [selectedModuleIdx, setSelectedModuleIdx] = useState<number>(0);
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([]);
  const [openFaqs, setOpenFaqs] = useState<Record<number, boolean>>({});
  const [activeFaqCategory, setActiveFaqCategory] = useState<string>("General Questions");

  // Lead Modal & Video Modal States
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [videoModalUrl, setVideoModalUrl] = useState<string | null>(null);
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [submittingLead, setSubmittingLead] = useState(false);

  // Admin Inline Drawer Editor State
  const [editSection, setActiveEditSection] = useState<string | null>(null);
  const [editorText, setEditorText] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Hero Full-Screen Editor State
  const [heroEditorOpen, setHeroEditorOpen] = useState(false);
  const [heroForm, setHeroForm] = useState<HeroContent>({ badges: [], stats: [], cta_primary: "", cta_secondary: "" });

  // Market Stats Full-Screen Editor State
  const [marketEditorOpen, setMarketEditorOpen] = useState(false);
  const [marketForm, setMarketForm] = useState({
    quote: "",
    quote_author: "",
    stat_main: "",
    stat_label: "",
    cards: [] as Array<{ title: string; value: string; desc: string }>
  });

  // Who Is For Full-Screen Editor State
  const [whoEditorOpen, setWhoEditorOpen] = useState(false);
  const [whoForm, setWhoForm] = useState({
    headline: "",
    subtitle: "",
    description: "",
    personas: [] as Array<{ experience: string; title: string; desc: string }>
  });

  // Outcomes / How This Course Will Help Full-Screen Editor State
  const [outcomesEditorOpen, setOutcomesEditorOpen] = useState(false);
  const [outcomesForm, setOutcomesForm] = useState({
    eyebrow: "",
    title: "",
    cards: [] as Array<{ title: string; desc: string }>,
    cta_text: "",
    cta_button: ""
  });

  // Capstone Projects Full-Screen Editor State
  const [projectsEditorOpen, setProjectsEditorOpen] = useState(false);
  const [projectsForm, setProjectsForm] = useState<ProjectCard[]>([]);
  const [imageUploading, setImageUploading] = useState<number | null>(null);
  const [mentorStart, setMentorStart] = useState(0);

  // Comparison Matrix Full-Screen Editor State
  const [compareEditorOpen, setCompareEditorOpen] = useState(false);
  const [compareForm, setCompareForm] = useState<Array<{ feature: string; iinm: boolean | string; others: boolean | string; others_note?: string }>>([]);

  // Certificates Full-Screen Editor State
  const [certificatesEditorOpen, setCertificatesEditorOpen] = useState(false);
  const [certificatesForm, setCertificatesForm] = useState<CertificateContent>(DEFAULT_CERTIFICATES);

  // FAQ Full-Screen Editor State
  const [faqEditorOpen, setFaqEditorOpen] = useState(false);
  const [faqForm, setFaqForm] = useState<Record<string, Array<{ question: string; answer: string }>>>({});
  const [faqNewCategory, setFaqNewCategory] = useState("");
  const [faqPreviewCategory, setFaqPreviewCategory] = useState("General Questions");

  // About Alumni Logos for Hiring Partners Marquee
  const [alumniLogos, setAlumniLogos] = useState<Array<{ id: string; image_url: string }>>([]);

  useEffect(() => {
    const bUrl = BASE_URL;
    setBaseUrl(bUrl);

    // Check admin session
    if (typeof window !== "undefined") {
      const loggedIn = localStorage.getItem("iinm_is_logged_in") === "true";
      const expiry = localStorage.getItem("iinm_login_expiry");
      const valid = loggedIn && expiry ? Date.now() < Number(expiry) : false;
      setIsAdmin(valid);
    }

    // Fetch about alumni logos for hiring partners marquee
    apiFetch(`${API_BASE_URL}/about/extended`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.alumni_logos) setAlumniLogos(data.alumni_logos); })
      .catch(() => {});

    if (!slug) return;
    fetch(`${bUrl}/api/public/courses/${slug}/extended`)
      .then(r => { if (!r.ok) throw new Error("Course not found"); return r.json(); })
      .then(data => {
        setCourse(data);
        if (data.chapters && data.chapters.length > 0) {
          setOpenChapters({ [data.chapters[0].id]: true });
        }
        setLoading(false);
      })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [slug]);

  useEffect(() => {
    if (!course) return;
    const raw = course.extended?.faqs || [];
    let cats: string[] = [];
    if (Array.isArray(raw)) {
      cats = Array.from(new Set<string>(raw.map((f: any) => (f.category as string) || "General Questions")));
    } else if (typeof raw === "object" && raw !== null) {
      cats = Object.keys(raw);
    }
    if (cats.length > 0 && !cats.includes(activeFaqCategory)) {
      setActiveFaqCategory(cats[0]);
    }
  }, [course, activeFaqCategory]);

  const showToast = (msg: string) => {
    const tId = Date.now();
    setToasts(p => [...p, { id: tId, msg }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== tId)), 3500);
  };

  const handleImageUpload = async (idx: number, file: File) => {
    if (!file) return;
    setImageUploading(idx);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await apiFetch("/api/settings/site/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      const updated = [...projectsForm];
      updated[idx] = { ...updated[idx], image_url: data.url };
      setProjectsForm(updated);
      showToast("Image uploaded to R2");
    } catch (err: any) {
      showToast("Upload error: " + err.message);
    } finally {
      setImageUploading(null);
    }
  };

  const handleCertificateImageUpload = async (idx: number, file: File) => {
    if (!file) return;
    setImageUploading(idx);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await apiFetch("/api/settings/site/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      const updated = { ...certificatesForm };
      updated.items = [...updated.items];
      updated.items[idx] = { ...updated.items[idx], image_url: data.url };
      setCertificatesForm(updated);
      showToast("Certificate uploaded to R2");
    } catch (err: any) {
      showToast("Upload error: " + err.message);
    } finally {
      setImageUploading(null);
    }
  };

  const toggleChapter = (id: number) => setOpenChapters(p => ({ ...p, [id]: !p[id] }));
  const toggleFaq = (idx: number) => setOpenFaqs(p => ({ ...p, [idx]: !p[idx] }));

  // Handle Lead / Brochure Submit
  const handleBrochureSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadName || !leadEmail) {
      showToast("Please enter name and email");
      return;
    }
    setSubmittingLead(true);
    try {
      const res = await apiFetch("/api/public/courses/brochure-lead", {
        method: "POST",
        body: JSON.stringify({
          course_id: course?.id,
          name: leadName,
          email: leadEmail,
          phone: leadPhone,
          source: "brochure_download"
        })
      });
      const data = await res.json();
      setSubmittingLead(false);
      setLeadModalOpen(false);
      showToast("Brochure request received! Downloading syllabus PDF...");

      const pdfUrl = data.syllabus_url || course?.upload_syllabus;
      if (pdfUrl) {
        const fullUrl = pdfUrl.startsWith("http") ? pdfUrl : `${baseUrl}${pdfUrl}`;
        window.open(fullUrl, "_blank");
      }
    } catch (err: any) {
      setSubmittingLead(false);
      showToast("Failed to submit request: " + err.message);
    }
  };

  // FAQ Full-Screen Editor Open / Save
  const openFaqEditor = () => {
    if (!course) return;
    const raw = course.extended?.faqs || [];
    const parsed: Record<string, Array<{ question: string; answer: string }>> = {};
    if (Array.isArray(raw)) {
      raw.forEach((q: any) => {
        const cat = (q.category as string) || "General Questions";
        if (!parsed[cat]) parsed[cat] = [];
        parsed[cat].push({ question: q.question || "", answer: q.answer || "" });
      });
    } else if (typeof raw === "object" && raw !== null) {
      Object.keys(raw).forEach(cat => {
        parsed[cat] = (raw[cat] || []).map((q: any) => ({ question: q.question || "", answer: q.answer || "" }));
      });
    }
    if (Object.keys(parsed).length === 0) parsed["General Questions"] = [];
    setFaqForm(parsed);
    const cats = Object.keys(parsed);
    setFaqPreviewCategory(cats[0] || "General Questions");
    setFaqEditorOpen(true);
  };

  const saveFaqEditor = async () => {
    if (!course) return;
    setSavingEdit(true);
    try {
      const res = await apiFetch(`/api/courses/${course.id}/extended`, {
        method: "PUT",
        body: JSON.stringify({ faqs_json: JSON.stringify(faqForm) })
      });
      if (!res.ok) throw new Error("Failed to save FAQs");
      setCourse(prev => {
        if (!prev) return prev;
        return { ...prev, extended: { ...prev.extended, faqs: faqForm } };
      });
      setFaqEditorOpen(false);
      showToast("FAQs updated!");
    } catch (err: any) {
      showToast("Save error: " + err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  // Handle Admin Drawer Open
  const openSectionEditor = (sectionKey: string) => {
    if (!course?.extended) return;
    const keyMap: Record<string, string> = {
      hero: "hero_badges",
      market: "market_impact",
      who: "who_is_for",
      outcomes: "career_outcomes",
      compare: "comparison_matrix",
      reviews: "video_testimonials",
      faqs: "faqs"
    };
    const jsonField = keyMap[sectionKey] || sectionKey;
    const currentVal = course.extended[jsonField] || {};
    setEditorText(JSON.stringify(currentVal, null, 2));
    setActiveEditSection(sectionKey);
  };

  // Handle Admin Drawer Save
  const handleSaveSectionEdit = async () => {
    if (!course || !editSection) return;
    setSavingEdit(true);
    try {
      let parsed;
      try {
        parsed = JSON.parse(editorText);
      } catch (e) {
        showToast("Invalid JSON syntax! Please check formatting.");
        setSavingEdit(false);
        return;
      }

      const keyMap: Record<string, string> = {
        hero: "hero_badges_json",
        market: "market_impact_json",
        who: "who_is_for_json",
        outcomes: "career_outcomes_json",
        compare: "comparison_matrix_json",
        reviews: "video_testimonials_json",
        faqs: "faqs_json"
      };

      const payloadField = keyMap[editSection];
      const res = await apiFetch(`/api/courses/${course.id}/extended`, {
        method: "PUT",
        body: JSON.stringify({
          [payloadField]: JSON.stringify(parsed)
        })
      });

      if (!res.ok) throw new Error("Failed to update section");

      // Update state locally
      const extKeyMap: Record<string, string> = {
        hero: "hero_badges",
        market: "market_impact",
        who: "who_is_for",
        outcomes: "career_outcomes",
        projects: "projects",
        compare: "comparison_matrix",
        reviews: "video_testimonials",
        faqs: "faqs"
      };
      setCourse(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          extended: {
            ...prev.extended,
            [extKeyMap[editSection]]: parsed
          }
        };
      });

      setSavingEdit(false);
      setActiveEditSection(null);
      showToast("Section updated successfully!");
    } catch (err: any) {
      setSavingEdit(false);
      showToast("Save error: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="cd-root">
        <PublicNavbar />
        <div style={{ padding: "80px 24px", maxWidth: 1280, margin: "0 auto" }}>
          <div className="cd-skeleton" style={{ height: 48, width: "60%", marginBottom: 20 }} />
          <div className="cd-skeleton" style={{ height: 200, width: "100%", marginBottom: 30 }} />
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="cd-root" style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <div style={{ textAlign: "center" }}>
          <h2 style={{ color: "#fff", marginBottom: 12 }}>Course Not Found</h2>
          <Link href="/courses" style={{ color: "#38bdf8", textDecoration: "none", fontWeight: 700 }}>← Back to Courses</Link>
        </div>
      </div>
    );
  }

  const isUsd = course.currency === "USD";
  const currencySymbol = isUsd ? "$" : "₹";
  const basePrice = isUsd ? (course.price_usd ?? course.price) : course.price;
  const discPrice = isUsd ? (course.discount_price_usd ?? course.discount_price) : course.discount_price;
  const hasDiscount = discPrice != null && discPrice < (basePrice ?? 0);
  const displayPrice = hasDiscount ? discPrice : basePrice;

  const ext = course.extended || {};

  // Parse hero content — backward compatible: array = old format, object = new format
  const heroRaw = ext.hero_badges || {};
  const heroContent: HeroContent = Array.isArray(heroRaw)
    ? { badges: heroRaw, stats: DEFAULT_HERO_STATS, cta_primary: "Apply Now & Enroll", cta_secondary: "Download Brochure / Syllabus" }
    : {
        badges: heroRaw.badges || DEFAULT_BADGES,
        stats: heroRaw.stats || DEFAULT_HERO_STATS,
        cta_primary: heroRaw.cta_primary || "Apply Now & Enroll",
        cta_secondary: heroRaw.cta_secondary || "Download Brochure / Syllabus"
      };
  const heroBadges = heroContent.badges || DEFAULT_BADGES;
  const heroStats = heroContent.stats || DEFAULT_HERO_STATS;

  const hiringCompanies = ext.hiring_companies || [];
  const marketImpact = ext.market_impact || {};
  const whoIsFor = ext.who_is_for || [];
  const outcomes = ext.career_outcomes || {};
  const projects = ext.projects || [];
  const compareRows = (ext.comparison_matrix && ext.comparison_matrix.length > 0) ? ext.comparison_matrix : DEFAULT_COMPARE_ROWS;
  const certContent: CertificateContent = (ext.certificates && ext.certificates.items && ext.certificates.items.length > 0) ? ext.certificates : DEFAULT_CERTIFICATES;
  const reviews = ext.video_testimonials || [];
  const faqsRaw = ext.faqs || [];
  let faqs: any[] = [];
  let faqCategories: string[] = [];
  if (Array.isArray(faqsRaw)) {
    faqs = faqsRaw;
    faqCategories = Array.from(new Set<string>(faqs.map((f: any) => (f.category as string) || "General Questions")));
  } else if (typeof faqsRaw === "object" && faqsRaw !== null) {
    faqCategories = Object.keys(faqsRaw);
    faqs = faqCategories.flatMap(cat => (faqsRaw[cat] || []).map((q: any) => ({ ...q, category: cat })));
  }
  const filteredFaqs: { faq: any; i: number }[] = faqs
    .map((f: any, i: number) => ({ faq: f, i }))
    .filter(({ faq }: { faq: any }) => (faq.category || "General Questions") === activeFaqCategory);

  return (
    <div className="cd-root">
      {/* ── ADMIN FLOATING BAR ── */}
      {isAdmin && (
        <div className="cd-admin-bar">
          <div className="cd-admin-badge">
            <Icons.Sparkles /> <span>Admin Mode Active — Course ID #{course.id} ({course.slug})</span>
          </div>
          <span style={{ opacity: 0.8 }}>Click &quot;Edit Section&quot; on any section to customize content directly</span>
        </div>
      )}

      <PublicNavbar />

      {/* ── HERO BANNER SECTION ── */}
      <div className="cd-section-wrapper">
        {isAdmin && (
          <button onClick={() => {
            setHeroForm({
              badges: [...heroBadges],
              stats: heroStats.map(s => ({ ...s })),
              cta_primary: heroContent.cta_primary || "Apply Now & Enroll",
              cta_secondary: heroContent.cta_secondary || "Download Brochure / Syllabus"
            });
            setHeroEditorOpen(true);
          }} className="cd-admin-edit-btn">
            <Icons.Edit /> Edit Hero Section
          </button>
        )}
        <section className="cd-hero">
          <HeroGridSpotlight />
          <div className="cd-container cd-hero-layout">
            <div>
              <div className="cd-breadcrumbs">
                <Link href="/">Home</Link><span>›</span>
                <Link href="/courses">Courses</Link><span>›</span>
                <span>{course.title}</span>
              </div>

              <div className="cd-badge-pills">
                {heroBadges.map((b: string, i: number) => (
                  <span key={i} className={`cd-badge-pill ${i === 0 ? "hot" : ""}`}>
                    <Icons.Sparkles /> {b}
                  </span>
                ))}
              </div>

              <h1 className="cd-hero-title">
                {course.title}
              </h1>

              <p className="cd-hero-subtitle">
                {course.description ? course.description.replace(/<[^>]+>/g, "") : "Master Generative AI, LLMs, RAG, and Multi-Agent Frameworks with hands-on capstone builds."}
              </p>

              <div className="cd-hero-cta-group">
                <button onClick={() => setLeadModalOpen(true)} className="cd-btn-primary">
                  {heroContent.cta_primary || "Apply Now & Enroll"}
                </button>
                <button onClick={() => setLeadModalOpen(true)} className="cd-btn-secondary">
                  <Icons.Download /> {heroContent.cta_secondary || "Download Brochure / Syllabus"}
                </button>
              </div>

              <div className="cd-hero-stats-row">
                {heroStats.map((stat, i) => (
                  <div key={i} className="cd-hero-stat-item">
                    <span className="cd-hero-stat-val">{stat.value}</span>
                    <span className="cd-hero-stat-lbl">{stat.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Hero Right Video Preview Card */}
            <div className="cd-hero-card">
              <div className="cd-hero-card-video" onClick={() => setVideoModalUrl(course.promo_video_url || "https://www.youtube.com/embed/dQw4w9WgXcQ")}>
                {course.thumbnail_url ? (
                  <img src={course.thumbnail_url.startsWith("http") ? course.thumbnail_url : `${baseUrl}${course.thumbnail_url}`} alt={course.title} />
                ) : (
                  <div style={{ width: "100%", height: "100%", background: "#0f1f38" }} />
                )}
                <div className="cd-video-play-overlay">
                  <div className="cd-play-icon-circle"><Icons.PlaySolid /></div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Watch Course Trailer</span>
                </div>
              </div>

              <div className="cd-hero-card-body">
                <div className="cd-card-price-row">
                  {course.is_free ? (
                    <span className="cd-card-price-main">Free</span>
                  ) : displayPrice != null ? (
                    <>
                      <span className="cd-card-price-main">{currencySymbol}{Number(displayPrice).toLocaleString()}</span>
                      {hasDiscount && <span className="cd-card-price-orig">{currencySymbol}{Number(basePrice).toLocaleString()}</span>}
                      {hasDiscount && <span className="cd-card-price-discount">SAVE DISCOUNT</span>}
                    </>
                  ) : (
                    <span className="cd-card-price-main">Inquire Price</span>
                  )}
                </div>

                <ul className="cd-card-benefits">
                  <li><Icons.CheckCircle /> Live Interactive Classes & Recordings</li>
                  <li><Icons.CheckCircle /> Capstone Projects for `#projects_sec`</li>
                  <li><Icons.CheckCircle /> {course.validity_days ? `${course.validity_days} Days Access` : "Lifetime Dashboard Access"}</li>
                  {course.has_certificate && <li><Icons.Award /> Industry Recognized AI Certificate</li>}
                </ul>

                <button onClick={() => setLeadModalOpen(true)} className="cd-btn-primary" style={{ width: "100%", justifyContent: "center" }}>
                  Enroll Now
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ── HIRING PARTNERS LOGO MARQUEE ── */}
      <section className="cd-partners-sec">
        <div className="cd-partners-title">Top Companies Hiring Our AI Graduates</div>
        <div className="cd-partners-marquee">
          <div className="cd-partners-track">
            {alumniLogos.length > 0
              ? [...alumniLogos, ...alumniLogos].map((logo, idx) => {
                  const imgSrc = logo.image_url.startsWith("http") ? logo.image_url : `${API_BASE_URL.replace("/api", "")}${logo.image_url}`;
                  return (
                    <div key={`${logo.id}-${idx}`} className="cd-partner-logo-cell">
                      <Image
                        src={imgSrc}
                        alt="Hiring partner logo"
                        width={120}
                        height={44}
                        unoptimized
                        className="cd-partner-logo-img"
                      />
                    </div>
                  );
                })
              : [...hiringCompanies, ...hiringCompanies].map((c: any, idx: number) => (
                  <div key={idx} className="cd-partner-pill">
                    <Icons.Sparkles /> <span>{c.name}</span>
                  </div>
                ))
            }
          </div>
        </div>
      </section>

      {/* ── MARKET IMPACT & INDUSTRY DEMAND ── */}
      <div className="cd-section-wrapper">
        {isAdmin && (
          <button onClick={() => {
            const mi = course?.extended?.market_impact || {};
            setMarketForm({
              quote: mi.quote || "",
              quote_author: mi.quote_author || "",
              stat_main: mi.stat_main || "76%",
              stat_label: mi.stat_label || "",
              cards: (mi.cards || []).map((c: any) => ({ title: c.title || "", value: c.value || "", desc: c.desc || "" }))
            });
            setMarketEditorOpen(true);
          }} className="cd-admin-edit-btn">
            <Icons.Edit /> Edit Market Stats
          </button>
        )}
        <section className="cd-market-sec">
          <div className="cd-container">
            <div className="cd-sec-header">
              <span className="cd-sec-eyebrow">Industry Demand</span>
              <h2 className="cd-sec-title">Why Agentic AI Skills Are In Massive Demand</h2>
              <p className="cd-sec-desc">Companies are pivoting from plain chat models to autonomous AI agents that write code, analyze data, and execute complex workflows.</p>
            </div>

            <div className="cd-market-layout">
              {/* Left Column: Quote Banner + 2 Subcards */}
              <div className="cd-market-left-col">
                <div className="cd-market-quote-banner">
                  <span className="cd-quote-watermark cd-quote-wm-left">&ldquo;</span>
                  <p className="cd-market-quote-text">
                    <strong>Generative AI</strong> is expected to transform <strong>38 million</strong> organized-sector jobs in India by <strong>2030</strong> , primarily by redesigning tasks and <strong>boosting productivity</strong>.
                  </p>
                  <span className="cd-quote-watermark cd-quote-wm-right">&rdquo;</span>
                  <div className="cd-market-author-row">
                    <span className="cd-author-dash">-</span>
                    <span className="cd-author-badge">K</span>
                    <span className="cd-author-name">{marketImpact.quote_author || "KEN RESEARCH"}</span>
                  </div>
                </div>

                <div className="cd-market-subcards">
                  <div className="cd-market-subcard">
                    <div className="cd-subcard-icon">
                      <Icons.User />
                    </div>
                    <p className="cd-subcard-text">
                      The demand for <strong>professionals</strong> who can work at the intersection of <strong>data, engineering, and AI</strong> is growing faster than ever.
                    </p>
                  </div>

                  <div className="cd-market-subcard">
                    <div className="cd-subcard-icon">
                      <Icons.Sparkles />
                    </div>
                    <p className="cd-subcard-text">
                      According to <strong>NASSCOM</strong>, India alone is expected to have over <strong>1.5 million data and AI</strong> job openings by <strong>2026</strong>.
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column: Featured Blue Stat Card */}
              <div className="cd-market-featured-card">
                <div className="cd-featured-top">
                  <div className="cd-concentric-circles">
                    <div className="cd-circle-ring cd-ring-6"></div>
                    <div className="cd-circle-ring cd-ring-5"></div>
                    <div className="cd-circle-ring cd-ring-4"></div>
                    <div className="cd-circle-ring cd-ring-3"></div>
                    <div className="cd-circle-ring cd-ring-2"></div>
                    <div className="cd-circle-ring cd-ring-1"></div>
                    <div className="cd-center-white-badge">76%</div>
                  </div>
                  <p className="cd-featured-caption">
                    76% of business leaders are willing to pay higher compensation for professionals with AI skills.
                  </p>
                </div>
                <div className="cd-featured-bottom">
                  <div className="cd-featured-giant-stat">{marketImpact.stat_main || "76%"}</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ── WHO IS THIS PROGRAM FOR (REDESIGNED) ── */}
      <div className="cd-section-wrapper">
        {isAdmin && (
          <button onClick={() => {
            const whoData = course?.extended?.who_is_for || [];
            setWhoForm({
              headline: "Think in an Agentic Way",
              subtitle: "LangChain, CrewAI, AutoGen, and Multi-Agent Systems",
              description: "In addition to understanding the core fundamentals of LLMs and Generative AI, we believe that the project-based, hands-on teaching method of this course will help you become a highly skilled Autonomous AI Developer.",
              personas: (Array.isArray(whoData) ? whoData : []).map((p: any) => ({
                experience: p.experience || "",
                title: p.title || "",
                desc: p.desc || ""
              }))
            });
            setWhoEditorOpen(true);
          }} className="cd-admin-edit-btn">
            <Icons.Edit /> Edit Target Audience
          </button>
        )}
        <section className="cd-who-sec">
          <div className="cd-who-container">
            {/* Left Column: Course Message & Personas */}
            <div className="cd-who-info">
              <div className="cd-who-logo-glow">
                <Icons.Sparkles />
              </div>
              <span className="cd-who-eyebrow">AI Agentic Software Development Course (Live & Self-Paced)</span>
              <h2 className="cd-who-headline">
                Think in an <span className="cd-who-gradient-text">Agentic Way</span>
              </h2>
              <div className="cd-who-subtitle">LangChain, CrewAI, AutoGen, and Multi-Agent Systems</div>
              <p className="cd-who-desc">
                In addition to understanding the core fundamentals of LLMs and Generative AI, we believe that the project-based, hands-on teaching method of this course will help you become a highly skilled Autonomous AI Developer.
              </p>

              <div className="cd-who-cta-row">
                <button className="cd-who-cta-btn" onClick={() => setLeadModalOpen(true)}>
                  <Icons.Sparkles /> Enroll & Apply Now
                </button>
                <button className="cd-who-video-btn" onClick={() => setVideoModalUrl(course?.promo_video_url || "https://www.youtube.com/embed/dQw4w9WgXcQ")}>
                  <Icons.Video /> Watch Course Overview
                </button>
              </div>

              <div className="cd-who-personas-title">Designed Specifically For:</div>
              <div className="cd-who-personas-grid">
                <div className="cd-who-persona-card">
                  <span className="cd-who-persona-tag">1+ Yrs Experience</span>
                  <p className="cd-who-persona-name">Software & Full-Stack Engineers</p>
                </div>
                <div className="cd-who-persona-card">
                  <span className="cd-who-persona-tag">3+ Yrs Experience</span>
                  <p className="cd-who-persona-name">Tech Leads & Solution Architects</p>
                </div>
                <div className="cd-who-persona-card">
                  <span className="cd-who-persona-tag">Foundational Coding</span>
                  <p className="cd-who-persona-name">Freshers & AI Graduates</p>
                </div>
                <div className="cd-who-persona-card">
                  <span className="cd-who-persona-tag">Business Transformation</span>
                  <p className="cd-who-persona-name">Founders & Business Owners</p>
                </div>
              </div>
            </div>

            {/* Right Column: Animated Code IDE */}
            <CodeIdeWindow />
          </div>
        </section>
      </div>

      {/* ── CAREER OUTCOMES & ALUMNI STATS ── */}
      <div className="cd-section-wrapper">
        {isAdmin && (
          <button onClick={() => {
            const oData = (course?.extended?.career_outcomes || {}) as any;
            setOutcomesForm({
              eyebrow: oData.eyebrow || "WHY AI",
              title: oData.title || "How this Course will Help",
              cards: Array.isArray(oData.cards) ? oData.cards.map((c: any) => ({
                title: c.title || "",
                desc: c.desc || ""
              })) : [
                { title: "Students", desc: "Fast-track your tech career with hands-on GenAI & Agentic framework experience, build production capstones, and get top placement referrals." },
                { title: "Business Owners", desc: "Automate company workflows, deploy proprietary AI agents, reduce operational overhead, and scale business output exponentially." },
                { title: "Working Professionals", desc: "Upskill into high-demand AI Engineer and Architect roles, lead GenAI initiatives in your organization, and command 100%+ salary hikes." }
              ],
              cta_text: oData.cta_text || "Get in touch with our career expert to know more",
              cta_button: oData.cta_button || "Get Instant Callback"
            });
            setOutcomesEditorOpen(true);
          }} className="cd-admin-edit-btn">
            <Icons.Edit /> Edit Placement Stories
          </button>
        )}
        <section className="cd-outcomes-sec">
          <div className="cd-container">
            <div className="cd-help-header">
              <span className="cd-help-eyebrow">{outcomes.eyebrow || "WHY AI"}</span>
              <h2 className="cd-help-title">{outcomes.title || "How this Course will Help"}</h2>
            </div>

            <div className="cd-help-grid">
              {(() => {
                const cards = Array.isArray(outcomes.cards) && outcomes.cards.length > 0
                  ? outcomes.cards
                  : [
                      { title: "Students", desc: "Fast-track your tech career with hands-on GenAI & Agentic framework experience, build production capstones, and get top placement referrals." },
                      { title: "Business Owners", desc: "Automate company workflows, deploy proprietary AI agents, reduce operational overhead, and scale business output exponentially." },
                      { title: "Working Professionals", desc: "Upskill into high-demand AI Engineer and Architect roles, lead GenAI initiatives in your organization, and command 100%+ salary hikes." }
                    ];
                const graphics = [
                  <svg key="g0" width="100%" height="100%" viewBox="0 0 300 120" preserveAspectRatio="none" fill="none">
                    <defs>
                      <linearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity="0.2" />
                        <stop offset="50%" stopColor="#818cf8" stopOpacity="0.9" />
                        <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.3" />
                      </linearGradient>
                    </defs>
                    <line x1="0" y1="30" x2="300" y2="30" stroke="rgba(79, 70, 229, 0.15)" strokeDasharray="4 4" />
                    <line x1="0" y1="60" x2="300" y2="60" stroke="rgba(79, 70, 229, 0.15)" strokeDasharray="4 4" />
                    <line x1="0" y1="90" x2="300" y2="90" stroke="rgba(79, 70, 229, 0.15)" strokeDasharray="4 4" />
                    <path d="M 10 90 Q 75 20, 150 70 T 290 30" stroke="url(#waveGrad)" strokeWidth="3" fill="none" />
                    <circle cx="45" cy="65" r="4" fill="#818cf8" />
                    <circle cx="45" cy="65" r="8" fill="#818cf8" opacity="0.3" />
                    <circle cx="150" cy="70" r="4" fill="#38bdf8" />
                    <circle cx="150" cy="70" r="8" fill="#38bdf8" opacity="0.3" />
                    <circle cx="230" cy="45" r="4" fill="#818cf8" />
                    <circle cx="230" cy="45" r="8" fill="#818cf8" opacity="0.3" />
                  </svg>,
                  <div key="g1" className="cd-help-orbit-container">
                    <div className="cd-help-orbit-ring-outer" />
                    <div className="cd-help-orbit-ring-inner" />
                    <div className="cd-help-orbit-center">100+ Workflows<br />Automated</div>
                    <div className="cd-help-orbit-badge b1">AI</div>
                    <div className="cd-help-orbit-badge b2">G</div>
                    <div className="cd-help-orbit-badge b3">a</div>
                    <div className="cd-help-orbit-badge b4">✨</div>
                  </div>,
                  <div key="g2" className="cd-help-flow-container">
                    <div className="cd-help-flow-node">INTEGRATE</div>
                    <div className="cd-help-flow-line"><div className="cd-help-flow-pulse" /></div>
                    <div className="cd-help-flow-node">EVALUATE</div>
                  </div>
                ];
                return cards.map((card: any, i: number) => (
                  <div key={i} className="cd-help-card">
                    <div className="cd-help-card-content">
                      <h3 className="cd-help-card-title">{card.title || "Card Title"}</h3>
                      <p className="cd-help-card-desc">{card.desc || "Card description..."}</p>
                    </div>
                    <div className="cd-help-graphic-box">
                      {graphics[i % 3]}
                    </div>
                  </div>
                ));
              })()}
            </div>

            {/* Bottom Callback CTA Bar */}
            <div className="cd-help-cta-bar">
              <span className="cd-help-cta-text">
                {outcomes.cta_text || "Get in touch with our career expert to know more"}
              </span>
              <button onClick={() => setLeadModalOpen(true)} className="cd-help-cta-btn">
                {outcomes.cta_button || "Get Instant Callback"} <Icons.PhoneCall />
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* ── STRUCTURED CURRICULUM ROADMAP ── */}
      <section className="cd-curriculum-sec">
        <div className="cd-container">
          <div className="cd-sec-header">
            <span className="cd-sec-eyebrow">CURRICULUM</span>
            <h2 className="cd-sec-title">The Structured <span style={{ color: "#2563eb" }}>Course Curriculum</span> You'll Follow</h2>
          </div>

          <div className="cd-curriculum-box">
            {course.chapters.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>
                Modules being updated. Contact admin for detailed syllabus.
              </div>
            ) : (
              <div className="cd-curr-layout">
                {/* Left Sidebar */}
                <div className="cd-curr-sidebar">
                  {course.chapters.map((ch, idx) => {
                    const isSelected = selectedModuleIdx === idx;
                    return (
                      <button
                        key={ch.id}
                        className={`cd-curr-tab ${isSelected ? "active" : ""}`}
                        onClick={() => setSelectedModuleIdx(idx)}
                      >
                        <div className="cd-curr-tab-num">Module {idx + 1}</div>
                        <div className="cd-curr-tab-title">{ch.title}</div>
                      </button>
                    );
                  })}
                </div>

                {/* Right Detail Card */}
                {(() => {
                  const activeCh = course.chapters[selectedModuleIdx] || course.chapters[0];
                  if (!activeCh) return null;
                  const liveCount = (activeCh.live_classes || []).length;
                  const topicCount = activeCh.materials.length;
                  return (
                    <div className="cd-curr-detail">
                      <div className="cd-curr-detail-header">
                        <div className="cd-curr-detail-title-group">
                          <h3 className="cd-curr-detail-title">
                            Module {selectedModuleIdx + 1} - {activeCh.title}
                          </h3>
                        </div>
                        <div className="cd-curr-detail-meta">
                          {topicCount > 0 && <span>{topicCount} Topics</span>}
                          {liveCount > 0 && <span>· {liveCount} Live {liveCount === 1 ? 'Class' : 'Classes'}</span>}
                        </div>
                      </div>

                      {activeCh.subject && (
                        <div className="cd-curr-detail-subtag">
                          {activeCh.subject.name}
                        </div>
                      )}

                      <div className="cd-curr-topics-section">
                        <div className="cd-curr-topics-heading">TOPICS COVERED:</div>
                        
                        <div className="cd-curr-topics-grid">
                          {/* Topics / Materials */}
                          {activeCh.materials.map(mat => (
                            <div key={`mat-${mat.id}`} className="cd-curr-topic-card">
                              <div className="cd-curr-topic-header">
                                <span className="cd-curr-topic-indicator" />
                                <span className="cd-curr-topic-name">{mat.title}</span>
                              </div>
                            </div>
                          ))}

                          {/* Live Classes */}
                          {(activeCh.live_classes || []).map(lc => (
                            <div key={`lc-${lc.id}`} className="cd-curr-topic-card live-class-card">
                              <div className="cd-curr-topic-header">
                                <span className="cd-curr-live-badge">Live Class</span>
                                <span className="cd-curr-topic-name">{lc.title}</span>
                              </div>
                            </div>
                          ))}

                          {activeCh.materials.length === 0 && (!activeCh.live_classes || activeCh.live_classes.length === 0) && (
                            <div style={{ color: "#64748b", fontSize: 13, padding: 12 }}>
                              Detailed topics inside this module.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            <div style={{ textAlign: "center", marginTop: 32 }}>
              <button onClick={() => setLeadModalOpen(true)} className="cd-btn-secondary">
                <Icons.Download /> Download Syllabus
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── REAL-WORLD CAPSTONE PROJECTS (#projects_sec) ── */}
      <div className="cd-section-wrapper" id="projects_sec">
        {isAdmin && (
          <button onClick={() => {
            const projs = (course?.extended?.projects || []) as ProjectCard[];
            setProjectsForm(projs.map((p: ProjectCard) => ({
              title: p.title || "",
              category: p.category || "",
              description: p.description || "",
              image_url: p.image_url || "",
              tags: Array.isArray(p.tags) ? p.tags : []
            })));
            setProjectsEditorOpen(true);
          }} className="cd-admin-edit-btn">
            <Icons.Edit /> Edit Capstone Projects (#projects_sec)
          </button>
        )}
        <section className="cd-projects-sec">
          <div className="cd-container">
            <div className="cd-sec-header">
              <span className="cd-sec-eyebrow">Hands-On Portfolio</span>
              <h2 className="cd-sec-title">Production Capstone Projects (#projects_sec)</h2>
              <p className="cd-sec-desc">Build real-world multi-agent AI systems, RAG engines, and voice bots to showcase in your portfolio.</p>
            </div>

            <div className="cd-projects-grid">
              {projects.map((proj: any, idx: number) => (
                <div key={idx} className="cd-project-card">
                  <div className="cd-project-img-wrapper">
                    <img src={proj.image_url} alt={proj.title} />
                    <span className="cd-project-cat-badge">{proj.category}</span>
                  </div>
                  <div className="cd-project-body">
                    <h3 className="cd-project-title">{proj.title}</h3>
                    <p className="cd-project-desc">{proj.description}</p>
                    <div className="cd-project-tags">
                      {(proj.tags || []).map((t: string, i: number) => (
                        <span key={i} className="cd-tag-chip">{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* ── MENTORS & INSTRUCTORS ── */}
      {course.show_instructor_publicly && course.instructors?.length > 0 && (
        <section className="cd-mentors-sec">
          <div className="cd-container">
            <div className="cd-sec-header">
              <span className="cd-sec-eyebrow">INSTRUCTOR & MENTORS</span>
              <h2 className="cd-sec-title">Learn from <span style={{ color: "#3b82f6" }}>Senior GenAI</span> Experts</h2>
            </div>

            <div className="cd-mentors-carousel">
              <button
                className="cd-mentor-arrow"
                onClick={() => setMentorStart(s => Math.max(0, s - 1))}
                disabled={mentorStart === 0}
                aria-label="Previous mentors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
              </button>

              <div className="cd-mentors-track">
                <div className="cd-mentors-grid">
                  {course.instructors.slice(mentorStart, mentorStart + 4).map(inst => (
                    <div key={inst.id} className="cd-mentor-card">
                      <div className="cd-mentor-img-wrap">
                        <span className="cd-mentor-exp">{inst.experience_years ? `${inst.experience_years.replace(/(years? exp)?$/i, "").trim()}+ years exp` : "5+ years exp"}</span>
                        <div className="cd-mentor-img-bg">
                          {inst.avatar_url ? (
                            <img src={inst.avatar_url.startsWith("http") ? inst.avatar_url : `${baseUrl}${inst.avatar_url}`} alt={inst.name} className="cd-mentor-img" />
                          ) : (
                            <div className="cd-mentor-img" style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: 42, fontWeight: 800, color: "#3b82f6" }}>
                              {inst.name.charAt(0)}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="cd-mentor-body">
                        <div className="cd-mentor-name-row">
                          <h3 className="cd-mentor-name">{inst.name}</h3>
                          {inst.social_linkedin && (
                            <a href={inst.social_linkedin} target="_blank" rel="noopener noreferrer" className="cd-mentor-linkedin" aria-label="LinkedIn">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                            </a>
                          )}
                        </div>
                        <div className="cd-mentor-designation">{inst.designation}</div>
                        {inst.specialization && (
                          <div className="cd-mentor-badges">
                            {inst.specialization.split(",").map(s => s.trim()).filter(Boolean).map((s, idx) => (
                              <span key={idx} className="cd-mentor-badge">{s}</span>
                            ))}
                          </div>
                        )}
                        <div className="cd-mentor-meta">
                          {inst.teaching_hours && (
                            <span className="cd-mentor-meta-item">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 5 }}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                              {inst.teaching_hours} hrs taught
                            </span>
                          )}
                          {inst.rating && (
                            <span className="cd-mentor-meta-item">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: 5, color: "#f59e0b" }}><path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.78 1.4 8.16-7.334-3.857-7.334 3.857 1.4-8.16-5.934-5.78 8.2-1.192z"/></svg>
                              {inst.rating}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                className="cd-mentor-arrow"
                onClick={() => setMentorStart(s => Math.min(Math.max(0, (course.instructors?.length || 0) - 4), s + 1))}
                disabled={(mentorStart + 4) >= (course.instructors?.length || 0)}
                aria-label="Next mentors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── WHY CHOOSE US (COMPARISON MATRIX) ── */}
      <div className="cd-section-wrapper">
        {isAdmin && (
          <button onClick={() => {
            const rows = (ext.comparison_matrix && ext.comparison_matrix.length > 0) ? ext.comparison_matrix : DEFAULT_COMPARE_ROWS;
            setCompareForm(rows.map((r: any) => ({
              feature: r.feature || "",
              iinm: r.iinm ?? true,
              others: r.others ?? false,
              others_note: r.others_note || ""
            })));
            setCompareEditorOpen(true);
          }} className="cd-admin-edit-btn">
            <Icons.Edit /> Edit Comparison Table
          </button>
        )}
        <section className="cd-compare-sec">
          <div className="cd-container">
            <div className="cd-compare-grid">
              {/* Left Column: Heading & Maze Graphic */}
              <div className="cd-compare-left">
                <span className="cd-compare-eyebrow">— Why Choose IINM —</span>
                <h2 className="cd-compare-title">
                  Where Others Stop, <br />
                  <span className="cd-compare-title-blue">IINM Takes You Further</span>
                </h2>

                <div className="cd-maze-wrapper">
                  <div className="cd-maze-tag top">
                    <span>STUCK &amp; CONFUSED</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>
                  </div>
                  
                  <div className="cd-maze-card">
                    <svg viewBox="0 0 240 220" className="cd-maze-svg">
                      {/* Faint background track */}
                      <path
                        d="M 200 20 C 150 20 150 70 110 70 C 70 70 70 110 110 110 C 150 110 150 150 100 150 C 70 150 40 150 40 190"
                        stroke="#e2e8f0"
                        strokeWidth="4"
                        strokeLinecap="round"
                        fill="none"
                      />
                      {/* Animated flowing comet-trail path */}
                      <path
                        className="cd-journey-flow"
                        d="M 200 20 C 150 20 150 70 110 70 C 70 70 70 110 110 110 C 150 110 150 150 100 150 C 70 150 40 150 40 190"
                        stroke="#2563eb"
                        strokeWidth="4"
                        strokeLinecap="round"
                        fill="none"
                        pathLength={100}
                      />
                      {/* Start Dot (Grey - Stuck) */}
                      <circle cx="200" cy="20" r="6" fill="#94a3b8" />
                      {/* Pulsing ring around end node */}
                      <circle cx="40" cy="190" r="7" fill="none" stroke="#2563eb" strokeWidth="2" className="cd-journey-pulse-ring" />
                      {/* End Dot (Blue - Placed) */}
                      <circle cx="40" cy="190" r="7" fill="#2563eb" className="cd-journey-end-dot" />
                      {/* Traveling glow dot */}
                      <circle r="5" fill="#60a5fa" className="cd-journey-traveler">
                        <animateMotion
                          dur="3.5s"
                          repeatCount="indefinite"
                          path="M 200 20 C 150 20 150 70 110 70 C 70 70 70 110 110 110 C 150 110 150 150 100 150 C 70 150 40 150 40 190"
                        />
                      </circle>
                    </svg>
                  </div>

                  <div className="cd-maze-tag bottom">
                    PLACED AT TOP PRODUCT BASED COMPANY
                  </div>
                </div>
              </div>

              {/* Right Column: Comparison Table Card */}
              <div className="cd-compare-right">
                <div className="cd-compare-card">
                  <div className="cd-compare-header">
                    <div className="cd-col-feature">Features</div>
                    <div className="cd-col-iinm">IINM Academy</div>
                    <div className="cd-col-others">Others</div>
                  </div>

                  <div className="cd-compare-body">
                    {compareRows.map((row: any, i: number) => {
                      const isOthersWarning = row.others === "limited" || row.others_note === "Limited" || (typeof row.others === "string" && row.others.toLowerCase().includes("limited"));
                      return (
                        <div key={i} className="cd-compare-row">
                          <div className="cd-col-feature">{row.feature}</div>
                          <div className="cd-col-iinm">
                            <span className="cd-check-icon">
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            </span>
                          </div>
                          <div className="cd-col-others">
                            {isOthersWarning ? (
                              <span className="cd-warning-pill">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                                <span>Limited</span>
                              </span>
                            ) : row.others === true ? (
                              <span className="cd-check-icon">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                              </span>
                            ) : (
                              <div className="cd-cross-wrap">
                                <span className="cd-cross-icon">
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                </span>
                                {row.others_note && <span className="cd-cross-note">{row.others_note}</span>}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ── CERTIFICATES SECTION ── */}
      <div className="cd-section-wrapper">
        {isAdmin && (
          <button onClick={() => {
            setCertificatesForm(certContent);
            setCertificatesEditorOpen(true);
          }} className="cd-admin-edit-btn">
            <Icons.Edit /> Edit Certificates
          </button>
        )}
        <section className="cd-certificates-sec" id="certificates_sec">
          <HeroGridSpotlight />
          <div className="cd-container">
            <div className="cd-certificates-header">
              <span className="cd-certificates-eyebrow">{certContent.eyebrow}</span>
              <h2 className="cd-certificates-title">
                {certContent.title} <span className="cd-certificates-title-italic">{certContent.title_blue}</span>
              </h2>
            </div>
            <div className="cd-certificates-grid">
              {certContent.items.map((cert, i) => (
                <div key={i} className="cd-certificate-card">
                  <img src={cert.image_url} alt={cert.alt} loading="lazy" />
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* ── CTA ENROLLMENT BANNER ── */}
      <section className="cd-cta-sec">
        <div className="cd-container">
          <div className="cd-cta-card">
            <div className="cd-cta-left">
              <h2 className="cd-cta-title">
                Don&apos;t wait to start <br /> your <em>growth journey</em>.
              </h2>
              <p className="cd-cta-subtitle">
                Thousands of professionals have switched to their dream data roles with IINM. <strong>Your transformation could be next.</strong>
              </p>
              <button onClick={() => setLeadModalOpen(true)} className="cd-cta-btn">
                <span>Book Your Admission Slot</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
              </button>
              <span className="cd-cta-note">Join the next batch before seats fill up!</span>
            </div>
            <div className="cd-cta-right">
              <div className="cd-cta-list">
                {[
                  "1:1 Mentorship with Experts",
                  "Live Interactive Sessions",
                  "Build industry-grade projects",
                  "End-to-End placement support"
                ].map((item, i) => (
                  <div key={i} className="cd-cta-list-item">
                    <span className="cd-cta-check">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </span>
                    <span className="cd-cta-item-text">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ACCORDION ── */}
      <div className="cd-section-wrapper">
        {isAdmin && (
          <button onClick={openFaqEditor} className="cd-admin-edit-btn">
            <Icons.Edit /> Edit FAQs
          </button>
        )}
        <section className="cd-faq-sec" id="faq_sec">
          <div className="cd-container">
            <div className="cd-faq-header">
              <h2 className="cd-faq-title">Frequently Asked Questions</h2>
            </div>

            <div className="cd-faq-layout">
              <div className="cd-faq-tabs">
                {faqCategories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveFaqCategory(cat)}
                    className={`cd-faq-tab ${activeFaqCategory === cat ? 'active' : ''}`}>
                    {cat}
                  </button>
                ))}
              </div>

              <div className="cd-faq-card">
                <h3 className="cd-faq-card-title">{activeFaqCategory}</h3>
                <div className="cd-faq-list">
                  {filteredFaqs.length === 0 ? (
                    <p className="cd-faq-empty">No questions in this category yet.</p>
                  ) : (
                    filteredFaqs.map(({ faq, i }) => {
                      const isOpen = !!openFaqs[i];
                      return (
                        <div key={i} className={`cd-faq-item ${isOpen ? 'open' : ''}`}>
                          <div className="cd-faq-q" onClick={() => toggleFaq(i)}>
                            <span>{faq.question}</span>
                            {isOpen ? <Icons.ChevronUp /> : <Icons.ChevronDown />}
                          </div>
                          {isOpen && <div className="cd-faq-a">{faq.answer}</div>}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <PublicFooter />

      {/* ── LEAD CAPTURE / BROCHURE MODAL ── */}
      {leadModalOpen && (
        <div className="cd-modal-backdrop" onClick={() => setLeadModalOpen(false)}>
          <div className="cd-modal-content" onClick={e => e.stopPropagation()}>
            <button className="cd-modal-close" onClick={() => setLeadModalOpen(false)}>×</button>
            <h3 style={{ fontSize: 22, fontWeight: 900, color: "#fff", marginBottom: 8 }}>
              Download Course Brochure & Syllabus
            </h3>
            <p style={{ fontSize: 14, color: "#94a3b8", marginBottom: 24 }}>
              Enter your contact details to download the complete curriculum PDF for <strong>{course.title}</strong>.
            </p>

            <form onSubmit={handleBrochureSubmit}>
              <div className="cd-form-group">
                <label className="cd-form-label">Full Name *</label>
                <input type="text" className="cd-form-input" required placeholder="e.g. Rahul Sharma" value={leadName} onChange={e => setLeadName(e.target.value)} />
              </div>
              <div className="cd-form-group">
                <label className="cd-form-label">Email Address *</label>
                <input type="email" className="cd-form-input" required placeholder="rahul@example.com" value={leadEmail} onChange={e => setLeadEmail(e.target.value)} />
              </div>
              <div className="cd-form-group">
                <label className="cd-form-label">Phone / WhatsApp Number</label>
                <input type="tel" className="cd-form-input" placeholder="+91 9876543210" value={leadPhone} onChange={e => setLeadPhone(e.target.value)} />
              </div>

              <button type="submit" className="cd-btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: 8 }} disabled={submittingLead}>
                {submittingLead ? "Submitting..." : "Get Syllabus PDF Instantly"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── VIDEO PLAYER PREVIEW MODAL ── */}
      {videoModalUrl && (
        <div className="cd-modal-backdrop" onClick={() => setVideoModalUrl(null)}>
          <div className="cd-modal-content" style={{ maxWidth: 800, padding: 0, overflow: "hidden" }} onClick={e => e.stopPropagation()}>
            <button className="cd-modal-close" style={{ zIndex: 10, color: "#fff", background: "rgba(0,0,0,0.6)", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setVideoModalUrl(null)}>×</button>
            <div style={{ position: "relative", aspectRatio: "16/9" }}>
              <iframe src={videoModalUrl} title="Course Video Preview" style={{ width: "100%", height: "100%", border: "none" }} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
            </div>
          </div>
        </div>
      )}

      {/* ── HERO FULL-SCREEN EDITOR MODAL ── */}
      {heroEditorOpen && (
        <div className="cd-hero-editor-overlay">
          <div className="cd-hero-editor-header">
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 600, color: "#fef08a", margin: 0 }}>Edit Hero Section</h2>
              <p style={{ fontSize: 13, color: "#94a3b8", margin: "4px 0 0" }}>Customize badges, stats, and CTA button text</p>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => setHeroEditorOpen(false)} className="cd-btn-secondary" style={{ padding: "10px 20px" }}>Cancel</button>
              <button onClick={async () => {
                setSavingEdit(true);
                try {
                  const payload = JSON.stringify({
                    badges: heroForm.badges?.filter(b => b.trim()),
                    stats: heroForm.stats?.filter(s => s.value.trim() || s.label.trim()),
                    cta_primary: heroForm.cta_primary,
                    cta_secondary: heroForm.cta_secondary
                  });
                  const res = await apiFetch(`/api/courses/${course.id}/extended`, {
                    method: "PUT",
                    body: JSON.stringify({ hero_badges_json: payload })
                  });
                  if (!res.ok) throw new Error("Failed to save");
                  setCourse(prev => {
                    if (!prev) return prev;
                    return { ...prev, extended: { ...prev.extended, hero_badges: JSON.parse(payload) } };
                  });
                  setSavingEdit(false);
                  setHeroEditorOpen(false);
                  showToast("Hero section updated!");
                } catch (err: any) {
                  setSavingEdit(false);
                  showToast("Save error: " + err.message);
                }
              }} className="cd-btn-primary" style={{ padding: "10px 28px" }} disabled={savingEdit}>
                {savingEdit ? "Saving..." : "Save Hero Content"}
              </button>
            </div>
          </div>

          <div className="cd-hero-editor-body">
            <div className="cd-hero-editor-form">
              {/* Badges */}
              <div className="cd-hero-editor-group">
                <h3 className="cd-hero-editor-group-title">Badge Pills</h3>
                {heroForm.badges?.map((badge, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <input
                      className="cd-form-input"
                      value={badge}
                      onChange={e => {
                        const updated = [...(heroForm.badges || [])];
                        updated[i] = e.target.value;
                        setHeroForm(p => ({ ...p, badges: updated }));
                      }}
                      placeholder={`Badge ${i + 1}`}
                    />
                    <button onClick={() => {
                      const updated = (heroForm.badges || []).filter((_, j) => j !== i);
                      setHeroForm(p => ({ ...p, badges: updated }));
                    }} className="cd-hero-editor-remove">×</button>
                  </div>
                ))}
                <button onClick={() => setHeroForm(p => ({ ...p, badges: [...(p.badges || []), ""] }))} className="cd-hero-editor-add">+ Add Badge</button>
              </div>

              {/* Stats */}
              <div className="cd-hero-editor-group">
                <h3 className="cd-hero-editor-group-title">Hero Stats</h3>
                {heroForm.stats?.map((stat, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <input
                      className="cd-form-input"
                      style={{ width: "40%" }}
                      value={stat.value}
                      onChange={e => {
                        const updated = [...(heroForm.stats || [])];
                        updated[i] = { ...updated[i], value: e.target.value };
                        setHeroForm(p => ({ ...p, stats: updated }));
                      }}
                      placeholder="Value (e.g. 21.5 LPA)"
                    />
                    <input
                      className="cd-form-input"
                      style={{ flex: 1 }}
                      value={stat.label}
                      onChange={e => {
                        const updated = [...(heroForm.stats || [])];
                        updated[i] = { ...updated[i], label: e.target.value };
                        setHeroForm(p => ({ ...p, stats: updated }));
                      }}
                      placeholder="Label"
                    />
                    <button onClick={() => {
                      const updated = (heroForm.stats || []).filter((_, j) => j !== i);
                      setHeroForm(p => ({ ...p, stats: updated }));
                    }} className="cd-hero-editor-remove">×</button>
                  </div>
                ))}
                <button onClick={() => setHeroForm(p => ({ ...p, stats: [...(p.stats || []), { value: "", label: "" }] }))} className="cd-hero-editor-add">+ Add Stat</button>
              </div>

              {/* CTA Buttons */}
              <div className="cd-hero-editor-group">
                <h3 className="cd-hero-editor-group-title">CTA Button Text</h3>
                <div className="cd-form-group">
                  <label className="cd-form-label">Primary Button</label>
                  <input
                    className="cd-form-input"
                    value={heroForm.cta_primary || ""}
                    onChange={e => setHeroForm(p => ({ ...p, cta_primary: e.target.value }))}
                    placeholder="Apply Now & Enroll"
                  />
                </div>
                <div className="cd-form-group">
                  <label className="cd-form-label">Secondary Button</label>
                  <input
                    className="cd-form-input"
                    value={heroForm.cta_secondary || ""}
                    onChange={e => setHeroForm(p => ({ ...p, cta_secondary: e.target.value }))}
                    placeholder="Download Brochure / Syllabus"
                  />
                </div>
              </div>
            </div>

            {/* Live Preview */}
            <div className="cd-hero-editor-preview">
              <div className="cd-hero-editor-preview-inner">
                <div className="cd-badge-pills" style={{ marginBottom: 16 }}>
                  {(heroForm.badges || []).filter(b => b.trim()).map((b, i) => (
                    <span key={i} className={`cd-badge-pill ${i === 0 ? "hot" : ""}`} style={{ fontSize: 11, padding: "4px 10px" }}>
                      {b}
                    </span>
                  ))}
                </div>
                <h3 style={{ fontSize: 24, fontWeight: 500, color: "#fff", margin: "0 0 10px", letterSpacing: "-0.03em" }}>
                  {course.title}
                </h3>
                <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.5, margin: "0 0 18px" }}>
                  {course.description ? course.description.replace(/<[^>]+>/g, "").slice(0, 120) + "..." : "Course description..."}
                </p>
                <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
                  <span className="cd-btn-primary" style={{ fontSize: 12, padding: "8px 18px", pointerEvents: "none" }}>
                    {heroForm.cta_primary || "Apply Now & Enroll"}
                  </span>
                  <span className="cd-btn-secondary" style={{ fontSize: 12, padding: "8px 18px", pointerEvents: "none" }}>
                    {heroForm.cta_secondary || "Download Brochure"}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                  {(heroForm.stats || []).filter(s => s.value.trim()).map((s, i) => (
                    <div key={i}>
                      <div style={{ fontSize: 18, fontWeight: 600, color: "#38bdf8" }}>{s.value}</div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ADMIN INLINE EDITOR DRAWER MODAL ── */}
      {editSection && (
        <div className="cd-modal-backdrop" onClick={() => setActiveEditSection(null)}>
          <div className="cd-modal-content" style={{ maxWidth: 700 }} onClick={e => e.stopPropagation()}>
            <button className="cd-modal-close" onClick={() => setActiveEditSection(null)}>×</button>
            <h3 style={{ fontSize: 20, fontWeight: 900, color: "#fef08a", marginBottom: 6 }}>
              Edit Section Data: {editSection.toUpperCase()}
            </h3>
            <p style={{ fontSize: 13, color: "#94a3b8", marginBottom: 16 }}>
              Modify the JSON payload below to customize text, stats, titles, or items for this course.
            </p>

            <div className="cd-form-group">
              <label className="cd-form-label">Section JSON Content</label>
              <textarea
                className="cd-form-input"
                style={{ height: 320, fontFamily: "monospace", fontSize: 13, lineHeight: 1.5, resize: "vertical" }}
                value={editorText}
                onChange={e => setEditorText(e.target.value)}
              />
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button onClick={() => setActiveEditSection(null)} className="cd-btn-secondary" style={{ padding: "10px 20px" }}>
                Cancel
              </button>
              <button onClick={handleSaveSectionEdit} className="cd-btn-primary" style={{ padding: "10px 24px" }} disabled={savingEdit}>
                {savingEdit ? "Saving..." : "Save Section Content"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MARKET STATS FULL-SCREEN EDITOR MODAL ── */}
      {marketEditorOpen && (
        <div className="cd-hero-editor-overlay">
          <div className="cd-hero-editor-header">
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 600, color: "#fef08a", margin: 0 }}>Edit Market Stats Section</h2>
              <p style={{ fontSize: 13, color: "#94a3b8", margin: "4px 0 0" }}>Update the quote, subcards, and featured stat card — no technical knowledge needed.</p>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => setMarketEditorOpen(false)} className="cd-btn-secondary" style={{ padding: "10px 20px" }}>Cancel</button>
              <button onClick={async () => {
                setSavingEdit(true);
                try {
                  const payload = JSON.stringify({
                    quote: marketForm.quote,
                    quote_author: marketForm.quote_author,
                    stat_main: marketForm.stat_main,
                    stat_label: marketForm.stat_label,
                    cards: marketForm.cards.filter(c => c.title.trim() || c.desc.trim())
                  });
                  const res = await apiFetch(`/api/courses/${course.id}/extended`, {
                    method: "PUT",
                    body: JSON.stringify({ market_impact_json: payload })
                  });
                  if (!res.ok) throw new Error("Failed to save");
                  setCourse(prev => {
                    if (!prev) return prev;
                    return { ...prev, extended: { ...prev.extended, market_impact: JSON.parse(payload) } };
                  });
                  setSavingEdit(false);
                  setMarketEditorOpen(false);
                  showToast("Market Stats section updated!");
                } catch (err: any) {
                  setSavingEdit(false);
                  showToast("Save error: " + err.message);
                }
              }} className="cd-btn-primary" style={{ padding: "10px 28px" }} disabled={savingEdit}>
                {savingEdit ? "Saving..." : "Save Market Stats"}
              </button>
            </div>
          </div>

          <div className="cd-hero-editor-body">
            <div className="cd-hero-editor-form">
              {/* Quote Banner */}
              <div className="cd-hero-editor-group">
                <h3 className="cd-hero-editor-group-title">Quote Banner (Top Left Card)</h3>
                <div className="cd-form-group">
                  <label className="cd-form-label">Quote Text</label>
                  <textarea
                    className="cd-form-input"
                    style={{ height: 100, resize: "vertical" }}
                    value={marketForm.quote}
                    onChange={e => setMarketForm(p => ({ ...p, quote: e.target.value }))}
                    placeholder="e.g. Generative AI is expected to transform 38 million organized-sector jobs in India by 2030..."
                  />
                  <p style={{ fontSize: 11, color: "#64748b", margin: "4px 0 0" }}>Tip: To bold specific words in the quote, the page automatically highlights key phrases.</p>
                </div>
                <div className="cd-form-group">
                  <label className="cd-form-label">Quote Source / Author</label>
                  <input
                    className="cd-form-input"
                    value={marketForm.quote_author}
                    onChange={e => setMarketForm(p => ({ ...p, quote_author: e.target.value }))}
                    placeholder="e.g. KEN RESEARCH"
                  />
                </div>
              </div>

              {/* Subcards */}
              <div className="cd-hero-editor-group">
                <h3 className="cd-hero-editor-group-title">Subcards (Bottom Left Cards)</h3>
                {marketForm.cards.map((card, i) => (
                  <div key={i} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: i < marketForm.cards.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#cbd5e1" }}>Card {i + 1}</span>
                      <button onClick={() => {
                        const updated = marketForm.cards.filter((_, j) => j !== i);
                        setMarketForm(p => ({ ...p, cards: updated }));
                      }} className="cd-hero-editor-remove">Remove</button>
                    </div>
                    <div className="cd-form-group">
                      <label className="cd-form-label">Card Title</label>
                      <input
                        className="cd-form-input"
                        value={card.title}
                        onChange={e => {
                          const updated = [...marketForm.cards];
                          updated[i] = { ...updated[i], title: e.target.value };
                          setMarketForm(p => ({ ...p, cards: updated }));
                        }}
                        placeholder="e.g. Professionals Demand"
                      />
                    </div>
                    <div className="cd-form-group">
                      <label className="cd-form-label">Card Value (Optional)</label>
                      <input
                        className="cd-form-input"
                        value={card.value}
                        onChange={e => {
                          const updated = [...marketForm.cards];
                          updated[i] = { ...updated[i], value: e.target.value };
                          setMarketForm(p => ({ ...p, cards: updated }));
                        }}
                        placeholder="e.g. Data & AI"
                      />
                    </div>
                    <div className="cd-form-group">
                      <label className="cd-form-label">Card Description</label>
                      <textarea
                        className="cd-form-input"
                        style={{ height: 70, resize: "vertical" }}
                        value={card.desc}
                        onChange={e => {
                          const updated = [...marketForm.cards];
                          updated[i] = { ...updated[i], desc: e.target.value };
                          setMarketForm(p => ({ ...p, cards: updated }));
                        }}
                        placeholder="e.g. The demand for professionals who can work at the intersection of data, engineering, and AI..."
                      />
                    </div>
                  </div>
                ))}
                <button onClick={() => setMarketForm(p => ({ ...p, cards: [...p.cards, { title: "", value: "", desc: "" }] }))} className="cd-hero-editor-add">+ Add Subcard</button>
              </div>

              {/* Featured Stat Card */}
              <div className="cd-hero-editor-group">
                <h3 className="cd-hero-editor-group-title">Featured Blue Stat Card (Right Side)</h3>
                <div className="cd-form-group">
                  <label className="cd-form-label">Big Stat Number</label>
                  <input
                    className="cd-form-input"
                    value={marketForm.stat_main}
                    onChange={e => setMarketForm(p => ({ ...p, stat_main: e.target.value }))}
                    placeholder="e.g. 76%"
                  />
                  <p style={{ fontSize: 11, color: "#64748b", margin: "4px 0 0" }}>This number appears in the center circle and as the giant text at the bottom of the blue card.</p>
                </div>
                <div className="cd-form-group">
                  <label className="cd-form-label">Stat Description (Caption under circles)</label>
                  <textarea
                    className="cd-form-input"
                    style={{ height: 70, resize: "vertical" }}
                    value={marketForm.stat_label}
                    onChange={e => setMarketForm(p => ({ ...p, stat_label: e.target.value }))}
                    placeholder="e.g. 76% of business leaders are willing to pay higher compensation for professionals with AI skills."
                  />
                </div>
              </div>
            </div>

            {/* Live Preview */}
            <div className="cd-hero-editor-preview">
              <div className="cd-hero-editor-preview-inner" style={{ maxWidth: 520, padding: 0, border: "none", background: "transparent" }}>
                {/* Quote Banner Preview */}
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 16, padding: "32px 28px", marginBottom: 16, textAlign: "center", position: "relative", overflow: "hidden" }}>
                  <span style={{ position: "absolute", top: -8, left: 12, fontSize: 90, fontFamily: "Georgia, serif", color: "rgba(15,23,42,0.03)", lineHeight: 1 }}>&ldquo;</span>
                  <p style={{ fontSize: 18, lineHeight: 1.5, color: "#475569", margin: "0 0 20px", position: "relative", zIndex: 2, fontFamily: "var(--font-inter, 'Inter', sans-serif)" }}>
                    {marketForm.quote || <span style={{ color: "#cbd5e1" }}>Quote text will appear here...</span>}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, position: "relative", zIndex: 2 }}>
                    <span style={{ color: "#94a3b8", fontSize: 14 }}>-</span>
                    <span style={{ width: 22, height: 22, borderRadius: "50%", background: "#0f172a", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800 }}>
                      {(marketForm.quote_author || "K")[0]}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#475569", letterSpacing: 1.5, textTransform: "uppercase" }}>
                      {marketForm.quote_author || "SOURCE"}
                    </span>
                  </div>
                </div>

                {/* Subcards Preview */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                  {marketForm.cards.filter(c => c.title.trim() || c.desc.trim()).map((card, i) => (
                    <div key={i} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 14, padding: "20px 18px" }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10, color: "#2563eb", fontSize: 12 }}>
                        {i === 0 ? "👤" : "✨"}
                      </div>
                      <p style={{ fontSize: 12, lineHeight: 1.5, color: "#475569", margin: 0 }}>
                        {card.desc || <span style={{ color: "#cbd5e1" }}>Card description...</span>}
                      </p>
                    </div>
                  ))}
                  {marketForm.cards.filter(c => c.title.trim() || c.desc.trim()).length === 0 && (
                    <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: 20, color: "#64748b", fontSize: 13 }}>No subcards added yet</div>
                  )}
                </div>

                {/* Featured Blue Card Preview */}
                <div style={{ background: "linear-gradient(180deg, #1d60ea 0%, #153bb5 100%)", borderRadius: 16, padding: "32px 24px", textAlign: "center", color: "#fff" }}>
                  <div style={{ position: "relative", width: 120, height: 120, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                    {[120, 100, 80, 60].map((s, i) => (
                      <div key={i} style={{ position: "absolute", width: s, height: s, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.18)", left: "50%", top: "50%", transform: "translate(-50%,-50%)" }} />
                    ))}
                    <div style={{ position: "absolute", width: 40, height: 40, borderRadius: "50%", background: "#fff", color: "#153bb5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, zIndex: 2 }}>
                      {marketForm.stat_main || "76%"}
                    </div>
                  </div>
                  <p style={{ fontSize: 12, lineHeight: 1.5, color: "rgba(255,255,255,0.9)", margin: "0 0 16px", maxWidth: 240, marginLeft: "auto", marginRight: "auto" }}>
                    {marketForm.stat_label || <span style={{ opacity: 0.5 }}>Stat caption will appear here...</span>}
                  </p>
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.25)", paddingTop: 16, textAlign: "left" }}>
                    <div style={{ fontSize: 48, fontWeight: 800, color: "#fff", lineHeight: 1, letterSpacing: "-0.03em" }}>
                      {marketForm.stat_main || "76%"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── WHO IS FOR FULL-SCREEN EDITOR MODAL ── */}
      {whoEditorOpen && (
        <div className="cd-hero-editor-overlay">
          <div className="cd-hero-editor-header">
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 600, color: "#fef08a", margin: 0 }}>Edit Target Audience Section</h2>
              <p style={{ fontSize: 13, color: "#94a3b8", margin: "4px 0 0" }}>Update headline, subtitle, description, and persona cards — no technical knowledge needed.</p>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => setWhoEditorOpen(false)} className="cd-btn-secondary" style={{ padding: "10px 20px" }}>Cancel</button>
              <button onClick={async () => {
                setSavingEdit(true);
                try {
                  const payload = JSON.stringify(
                    whoForm.personas
                      .filter(p => p.title.trim() || p.desc.trim())
                      .map(p => ({
                        title: p.title,
                        experience: p.experience,
                        desc: p.desc,
                        icon: "Code"
                      }))
                  );
                  const res = await apiFetch(`/api/courses/${course.id}/extended`, {
                    method: "PUT",
                    body: JSON.stringify({ who_is_for_json: payload })
                  });
                  if (!res.ok) throw new Error("Failed to save");
                  setCourse(prev => {
                    if (!prev) return prev;
                    return { ...prev, extended: { ...prev.extended, who_is_for: JSON.parse(payload) } };
                  });
                  setSavingEdit(false);
                  setWhoEditorOpen(false);
                  showToast("Target Audience updated!");
                } catch (err: any) {
                  setSavingEdit(false);
                  showToast("Save error: " + err.message);
                }
              }} className="cd-btn-primary" style={{ padding: "10px 28px" }} disabled={savingEdit}>
                {savingEdit ? "Saving..." : "Save Target Audience"}
              </button>
            </div>
          </div>

          <div className="cd-hero-editor-body">
            <div className="cd-hero-editor-form">
              {/* Section Text */}
              <div className="cd-hero-editor-group">
                <h3 className="cd-hero-editor-group-title">Section Text</h3>
                <div className="cd-form-group">
                  <label className="cd-form-label">Headline</label>
                  <input
                    className="cd-form-input"
                    value={whoForm.headline}
                    onChange={e => setWhoForm(p => ({ ...p, headline: e.target.value }))}
                    placeholder="e.g. Think in an Agentic Way"
                  />
                </div>
                <div className="cd-form-group">
                  <label className="cd-form-label">Subtitle</label>
                  <input
                    className="cd-form-input"
                    value={whoForm.subtitle}
                    onChange={e => setWhoForm(p => ({ ...p, subtitle: e.target.value }))}
                    placeholder="e.g. LangChain, CrewAI, AutoGen, and Multi-Agent Systems"
                  />
                </div>
                <div className="cd-form-group">
                  <label className="cd-form-label">Description</label>
                  <textarea
                    className="cd-form-input"
                    style={{ height: 90, resize: "vertical" }}
                    value={whoForm.description}
                    onChange={e => setWhoForm(p => ({ ...p, description: e.target.value }))}
                    placeholder="Course description paragraph..."
                  />
                </div>
              </div>

              {/* Persona Cards */}
              <div className="cd-hero-editor-group">
                <h3 className="cd-hero-editor-group-title">Target Audience Cards</h3>
                {whoForm.personas.map((persona, i) => (
                  <div key={i} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: i < whoForm.personas.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#cbd5e1" }}>Persona {i + 1}</span>
                      <button onClick={() => {
                        const updated = whoForm.personas.filter((_, j) => j !== i);
                        setWhoForm(p => ({ ...p, personas: updated }));
                      }} className="cd-hero-editor-remove">Remove</button>
                    </div>
                    <div className="cd-form-group">
                      <label className="cd-form-label">Experience Tag</label>
                      <input
                        className="cd-form-input"
                        value={persona.experience}
                        onChange={e => {
                          const updated = [...whoForm.personas];
                          updated[i] = { ...updated[i], experience: e.target.value };
                          setWhoForm(p => ({ ...p, personas: updated }));
                        }}
                        placeholder="e.g. 1+ Years Exp"
                      />
                    </div>
                    <div className="cd-form-group">
                      <label className="cd-form-label">Persona Title</label>
                      <input
                        className="cd-form-input"
                        value={persona.title}
                        onChange={e => {
                          const updated = [...whoForm.personas];
                          updated[i] = { ...updated[i], title: e.target.value };
                          setWhoForm(p => ({ ...p, personas: updated }));
                        }}
                        placeholder="e.g. Software & Full-Stack Engineers"
                      />
                    </div>
                    <div className="cd-form-group">
                      <label className="cd-form-label">Description</label>
                      <textarea
                        className="cd-form-input"
                        style={{ height: 70, resize: "vertical" }}
                        value={persona.desc}
                        onChange={e => {
                          const updated = [...whoForm.personas];
                          updated[i] = { ...updated[i], desc: e.target.value };
                          setWhoForm(p => ({ ...p, personas: updated }));
                        }}
                        placeholder="e.g. Looking to master LLMs, RAG, CrewAI, AutoGen..."
                      />
                    </div>
                  </div>
                ))}
                <button onClick={() => setWhoForm(p => ({ ...p, personas: [...p.personas, { experience: "", title: "", desc: "" }] }))} className="cd-hero-editor-add">+ Add Persona Card</button>
              </div>
            </div>

            {/* Live Preview */}
            <div className="cd-hero-editor-preview">
              <div className="cd-hero-editor-preview-inner" style={{ maxWidth: 480, padding: 0, border: "none", background: "transparent" }}>
                <div style={{ marginBottom: 24 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "#6f8bb5", letterSpacing: 2, textTransform: "uppercase", fontFamily: "Georgia, serif", fontStyle: "italic" }}>
                    AI Agentic Software Development Course
                  </span>
                  <h2 style={{ fontSize: 36, fontWeight: 800, color: "#fff", margin: "8px 0 12px", letterSpacing: "-0.03em" }}>
                    {whoForm.headline || <span style={{ color: "#475569" }}>Headline...</span>}
                  </h2>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#6f8bb5", marginBottom: 14 }}>
                    {whoForm.subtitle || <span style={{ color: "#475569" }}>Subtitle...</span>}
                  </div>
                  <p style={{ fontSize: 14, lineHeight: 1.65, color: "#94a3b8", margin: 0 }}>
                    {whoForm.description || <span style={{ color: "#475569" }}>Description text will appear here...</span>}
                  </p>
                </div>

                <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: "#64748b", marginBottom: 14 }}>Designed Specifically For:</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {whoForm.personas.filter(p => p.title.trim() || p.desc.trim()).map((p, i) => (
                    <div key={i} style={{ background: "rgba(15, 23, 42, 0.7)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "14px 16px" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#e63946", display: "block", marginBottom: 4 }}>
                        {p.experience || "Experience"}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#f8fafc" }}>
                        {p.title || "Persona title"}
                      </span>
                    </div>
                  ))}
                  {whoForm.personas.filter(p => p.title.trim() || p.desc.trim()).length === 0 && (
                    <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: 20, color: "#64748b", fontSize: 13 }}>No persona cards added yet</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── OUTCOMES / HOW THIS COURSE WILL HELP FULL-SCREEN EDITOR MODAL ── */}
      {outcomesEditorOpen && (
        <div className="cd-hero-editor-overlay">
          <div className="cd-hero-editor-header">
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 600, color: "#fef08a", margin: 0 }}>Edit Placement Stories Section</h2>
              <p style={{ fontSize: 13, color: "#94a3b8", margin: "4px 0 0" }}>Update section header, card content, and CTA bar — no technical knowledge needed.</p>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => setOutcomesEditorOpen(false)} className="cd-btn-secondary" style={{ padding: "10px 20px" }}>Cancel</button>
              <button onClick={async () => {
                setSavingEdit(true);
                try {
                  const payload = JSON.stringify({
                    eyebrow: outcomesForm.eyebrow,
                    title: outcomesForm.title,
                    cards: outcomesForm.cards.filter(c => c.title.trim() || c.desc.trim()),
                    cta_text: outcomesForm.cta_text,
                    cta_button: outcomesForm.cta_button
                  });
                  const res = await apiFetch(`/api/courses/${course.id}/extended`, {
                    method: "PUT",
                    body: JSON.stringify({ career_outcomes_json: payload })
                  });
                  if (!res.ok) throw new Error("Failed to save");
                  setCourse(prev => {
                    if (!prev) return prev;
                    return { ...prev, extended: { ...prev.extended, career_outcomes: JSON.parse(payload) } };
                  });
                  setSavingEdit(false);
                  setOutcomesEditorOpen(false);
                  showToast("Placement Stories updated!");
                } catch (err: any) {
                  setSavingEdit(false);
                  showToast("Save error: " + err.message);
                }
              }} className="cd-btn-primary" style={{ padding: "10px 28px" }} disabled={savingEdit}>
                {savingEdit ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>

          <div className="cd-hero-editor-body">
            <div className="cd-hero-editor-form">
              {/* Section Header */}
              <div className="cd-hero-editor-group">
                <h3 className="cd-hero-editor-group-title">Section Header</h3>
                <div className="cd-form-group">
                  <label className="cd-form-label">Eyebrow Text</label>
                  <input
                    className="cd-form-input"
                    value={outcomesForm.eyebrow}
                    onChange={e => setOutcomesForm(p => ({ ...p, eyebrow: e.target.value }))}
                    placeholder="e.g. WHY AI"
                  />
                </div>
                <div className="cd-form-group">
                  <label className="cd-form-label">Section Title</label>
                  <input
                    className="cd-form-input"
                    value={outcomesForm.title}
                    onChange={e => setOutcomesForm(p => ({ ...p, title: e.target.value }))}
                    placeholder="e.g. How this Course will Help"
                  />
                </div>
              </div>

              {/* Cards */}
              <div className="cd-hero-editor-group">
                <h3 className="cd-hero-editor-group-title">Content Cards</h3>
                {outcomesForm.cards.map((card, i) => (
                  <div key={i} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: i < outcomesForm.cards.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#cbd5e1" }}>Card {i + 1}</span>
                      <button onClick={() => {
                        const updated = outcomesForm.cards.filter((_, j) => j !== i);
                        setOutcomesForm(p => ({ ...p, cards: updated }));
                      }} className="cd-hero-editor-remove">Remove</button>
                    </div>
                    <div className="cd-form-group">
                      <label className="cd-form-label">Card Title</label>
                      <input
                        className="cd-form-input"
                        value={card.title}
                        onChange={e => {
                          const updated = [...outcomesForm.cards];
                          updated[i] = { ...updated[i], title: e.target.value };
                          setOutcomesForm(p => ({ ...p, cards: updated }));
                        }}
                        placeholder="e.g. Students"
                      />
                    </div>
                    <div className="cd-form-group">
                      <label className="cd-form-label">Card Description</label>
                      <textarea
                        className="cd-form-input"
                        style={{ height: 80, resize: "vertical" }}
                        value={card.desc}
                        onChange={e => {
                          const updated = [...outcomesForm.cards];
                          updated[i] = { ...updated[i], desc: e.target.value };
                          setOutcomesForm(p => ({ ...p, cards: updated }));
                        }}
                        placeholder="e.g. Fast-track your tech career with hands-on GenAI..."
                      />
                    </div>
                  </div>
                ))}
                <button onClick={() => setOutcomesForm(p => ({ ...p, cards: [...p.cards, { title: "", desc: "" }] }))} className="cd-hero-editor-add">+ Add Card</button>
              </div>

              {/* CTA Bar */}
              <div className="cd-hero-editor-group">
                <h3 className="cd-hero-editor-group-title">Bottom CTA Bar</h3>
                <div className="cd-form-group">
                  <label className="cd-form-label">CTA Text</label>
                  <input
                    className="cd-form-input"
                    value={outcomesForm.cta_text}
                    onChange={e => setOutcomesForm(p => ({ ...p, cta_text: e.target.value }))}
                    placeholder="e.g. Get in touch with our career expert to know more"
                  />
                </div>
                <div className="cd-form-group">
                  <label className="cd-form-label">CTA Button Label</label>
                  <input
                    className="cd-form-input"
                    value={outcomesForm.cta_button}
                    onChange={e => setOutcomesForm(p => ({ ...p, cta_button: e.target.value }))}
                    placeholder="e.g. Get Instant Callback"
                  />
                </div>
              </div>
            </div>

            {/* Live Preview */}
            <div className="cd-hero-editor-preview">
              <div className="cd-hero-editor-preview-inner" style={{ maxWidth: 480, padding: 0, border: "none", background: "transparent" }}>
                <div style={{ textAlign: "center", marginBottom: 28 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 3, color: "#4f46e5", textTransform: "uppercase" }}>
                    {outcomesForm.eyebrow || <span style={{ color: "#94a3b8" }}>EYEBROW</span>}
                  </span>
                  <h2 style={{ fontSize: 34, fontWeight: 800, color: "#0f172a", margin: "8px 0 0", letterSpacing: "-0.02em" }}>
                    {outcomesForm.title || <span style={{ color: "#94a3b8" }}>Section Title...</span>}
                  </h2>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
                  {outcomesForm.cards.filter(c => c.title.trim() || c.desc.trim()).map((c, i) => (
                    <div key={i} style={{ background: "#fff", border: "1px solid rgba(15,23,42,0.08)", borderRadius: 16, padding: "16px 18px", boxShadow: "0 4px 12px rgba(15,23,42,0.04)" }}>
                      <h3 style={{ fontSize: 17, fontWeight: 800, color: "#0f172a", margin: "0 0 6px" }}>
                        {c.title || "Card title"}
                      </h3>
                      <p style={{ fontSize: 13, lineHeight: 1.6, color: "#475569", margin: 0 }}>
                        {c.desc || "Card description..."}
                      </p>
                    </div>
                  ))}
                  {outcomesForm.cards.filter(c => c.title.trim() || c.desc.trim()).length === 0 && (
                    <div style={{ textAlign: "center", padding: 20, color: "#94a3b8", fontSize: 13 }}>No cards added yet</div>
                  )}
                </div>

                <div style={{ marginTop: 20, background: "#0f172a", borderRadius: 14, padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9" }}>
                    {outcomesForm.cta_text || "CTA text..."}
                  </span>
                  <span style={{ background: "#fff", color: "#0f172a", borderRadius: 10, padding: "8px 18px", fontSize: 13, fontWeight: 700 }}>
                    {outcomesForm.cta_button || "Button..."}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CAPSTONE PROJECTS FULL-SCREEN EDITOR MODAL ── */}
      {projectsEditorOpen && (
        <div className="cd-hero-editor-overlay">
          <div className="cd-hero-editor-header">
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 600, color: "#fef08a", margin: 0 }}>Edit Capstone Projects</h2>
              <p style={{ fontSize: 13, color: "#94a3b8", margin: "4px 0 0" }}>Update the project cards — title, category, image, description, and tags.</p>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => setProjectsEditorOpen(false)} className="cd-btn-secondary" style={{ padding: "10px 20px" }}>Cancel</button>
              <button onClick={async () => {
                setSavingEdit(true);
                try {
                  const payload = JSON.stringify(projectsForm);
                  const res = await apiFetch(`/api/courses/${course.id}/extended`, {
                    method: "PUT",
                    body: JSON.stringify({ projects_json: payload })
                  });
                  if (!res.ok) throw new Error("Failed to save");
                  setCourse(prev => {
                    if (!prev) return prev;
                    return { ...prev, extended: { ...prev.extended, projects: JSON.parse(payload) } };
                  });
                  setSavingEdit(false);
                  setProjectsEditorOpen(false);
                  showToast("Capstone Projects updated!");
                } catch (err: any) {
                  setSavingEdit(false);
                  showToast("Save error: " + err.message);
                }
              }} className="cd-btn-primary" style={{ padding: "10px 28px" }} disabled={savingEdit}>
                {savingEdit ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>

          <div className="cd-hero-editor-body">
            <div className="cd-hero-editor-form" style={{ maxWidth: 720 }}>
              {projectsForm.map((proj, i) => (
                <div key={i} className="cd-hero-editor-group">
                  <h3 className="cd-hero-editor-group-title">Project {i + 1}</h3>
                  <div className="cd-form-group">
                    <label className="cd-form-label">Image URL</label>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input
                        className="cd-form-input"
                        style={{ flex: 1 }}
                        value={proj.image_url}
                        onChange={e => {
                          const updated = [...projectsForm];
                          updated[i] = { ...updated[i], image_url: e.target.value };
                          setProjectsForm(updated);
                        }}
                        placeholder="https://..."
                      />
                      <label style={{ flexShrink: 0, margin: 0 }}>
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: "none" }}
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(i, file);
                            e.target.value = "";
                          }}
                          disabled={imageUploading === i}
                        />
                        <span
                          className="cd-btn-secondary"
                          style={{ padding: "10px 16px", cursor: imageUploading === i ? "not-allowed" : "pointer", opacity: imageUploading === i ? 0.7 : 1 }}
                        >
                          {imageUploading === i ? "Uploading..." : "Upload"}
                        </span>
                      </label>
                    </div>
                  </div>
                  <div className="cd-form-group">
                    <label className="cd-form-label">Category Badge</label>
                    <input
                      className="cd-form-input"
                      value={proj.category}
                      onChange={e => {
                        const updated = [...projectsForm];
                        updated[i] = { ...updated[i], category: e.target.value };
                        setProjectsForm(updated);
                      }}
                      placeholder="e.g. Generative AI"
                    />
                  </div>
                  <div className="cd-form-group">
                    <label className="cd-form-label">Title</label>
                    <input
                      className="cd-form-input"
                      value={proj.title}
                      onChange={e => {
                        const updated = [...projectsForm];
                        updated[i] = { ...updated[i], title: e.target.value };
                        setProjectsForm(updated);
                      }}
                      placeholder="e.g. AI Resume Screener"
                    />
                  </div>
                  <div className="cd-form-group">
                    <label className="cd-form-label">Description</label>
                    <textarea
                      className="cd-form-input"
                      style={{ height: 80, resize: "vertical" }}
                      value={proj.description}
                      onChange={e => {
                        const updated = [...projectsForm];
                        updated[i] = { ...updated[i], description: e.target.value };
                        setProjectsForm(updated);
                      }}
                      placeholder="Short project summary..."
                    />
                  </div>
                  <div className="cd-form-group">
                    <label className="cd-form-label">Tags (comma-separated)</label>
                    <input
                      className="cd-form-input"
                      value={proj.tags.join(", ")}
                      onChange={e => {
                        const updated = [...projectsForm];
                        updated[i] = { ...updated[i], tags: e.target.value.split(",").map(t => t.trim()).filter(Boolean) };
                        setProjectsForm(updated);
                      }}
                      placeholder="LangChain, RAG, FastAPI"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Live Preview */}
            <div className="cd-hero-editor-preview">
              <div className="cd-hero-editor-preview-inner" style={{ maxWidth: 720, width: "100%" }}>
                <div className="cd-projects-grid">
                  {projectsForm.map((proj, i) => (
                    <div key={i} className="cd-project-card">
                      <div className="cd-project-img-wrapper">
                        <img src={proj.image_url || "/placeholder.svg"} alt={proj.title} />
                        <span className="cd-project-cat-badge">{proj.category || "Category"}</span>
                      </div>
                      <div className="cd-project-body">
                        <h3 className="cd-project-title">{proj.title || "Title"}</h3>
                        <p className="cd-project-desc">{proj.description || "Description..."}</p>
                        <div className="cd-project-tags">
                          {proj.tags.map((t, j) => <span key={j} className="cd-tag-chip">{t}</span>)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── COMPARISON MATRIX FULL-SCREEN EDITOR MODAL ── */}
      {compareEditorOpen && (
        <div className="cd-hero-editor-overlay">
          <div className="cd-hero-editor-header">
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 600, color: "#fef08a", margin: 0 }}>Edit Comparison Table</h2>
              <p style={{ fontSize: 13, color: "#94a3b8", margin: "4px 0 0" }}>Add, remove, and reorder comparison rows. Toggle IINM / Others status for each feature.</p>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => setCompareEditorOpen(false)} className="cd-btn-secondary" style={{ padding: "10px 20px" }}>Cancel</button>
              <button onClick={async () => {
                setSavingEdit(true);
                try {
                  const payload = JSON.stringify(compareForm);
                  const res = await apiFetch(`/api/courses/${course.id}/extended`, {
                    method: "PUT",
                    body: JSON.stringify({ comparison_matrix_json: payload })
                  });
                  if (!res.ok) throw new Error("Failed to save");
                  setCourse(prev => {
                    if (!prev) return prev;
                    return { ...prev, extended: { ...prev.extended, comparison_matrix: JSON.parse(payload) } };
                  });
                  setSavingEdit(false);
                  setCompareEditorOpen(false);
                  showToast("Comparison Table updated!");
                } catch (err: any) {
                  setSavingEdit(false);
                  showToast("Save error: " + err.message);
                }
              }} className="cd-btn-primary" style={{ padding: "10px 28px" }} disabled={savingEdit}>
                {savingEdit ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>

          <div className="cd-hero-editor-body">
            {/* Form Panel */}
            <div className="cd-hero-editor-form" style={{ maxWidth: 720 }}>
              {/* Add Row Button */}
              <div style={{ marginBottom: 24, display: "flex", gap: 12 }}>
                <button
                  onClick={() => setCompareForm([...compareForm, { feature: "", iinm: true, others: false, others_note: "" }])}
                  className="cd-btn-primary"
                  style={{ padding: "10px 20px", fontSize: 13 }}
                >
                  + Add Row
                </button>
              </div>

              {compareForm.map((row, i) => (
                <div key={i} className="cd-hero-editor-group">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <h3 className="cd-hero-editor-group-title">Row {i + 1}</h3>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => {
                          if (i === 0) return;
                          const updated = [...compareForm];
                          [updated[i - 1], updated[i]] = [updated[i], updated[i - 1]];
                          setCompareForm(updated);
                        }}
                        disabled={i === 0}
                        className="cd-btn-secondary"
                        style={{ padding: "6px 12px", fontSize: 12, opacity: i === 0 ? 0.4 : 1, cursor: i === 0 ? "not-allowed" : "pointer" }}
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => {
                          if (i === compareForm.length - 1) return;
                          const updated = [...compareForm];
                          [updated[i], updated[i + 1]] = [updated[i + 1], updated[i]];
                          setCompareForm(updated);
                        }}
                        disabled={i === compareForm.length - 1}
                        className="cd-btn-secondary"
                        style={{ padding: "6px 12px", fontSize: 12, opacity: i === compareForm.length - 1 ? 0.4 : 1, cursor: i === compareForm.length - 1 ? "not-allowed" : "pointer" }}
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => setCompareForm(compareForm.filter((_, idx) => idx !== i))}
                        className="cd-btn-secondary"
                        style={{ padding: "6px 12px", fontSize: 12, color: "#ef4444", borderColor: "rgba(239,68,68,0.4)" }}
                      >
                        ✕ Delete
                      </button>
                    </div>
                  </div>

                  <div className="cd-form-group">
                    <label className="cd-form-label">Feature Name</label>
                    <input
                      className="cd-form-input"
                      value={row.feature}
                      onChange={e => {
                        const updated = [...compareForm];
                        updated[i] = { ...updated[i], feature: e.target.value };
                        setCompareForm(updated);
                      }}
                      placeholder="e.g. Live Class"
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div className="cd-form-group">
                      <label className="cd-form-label">IINM Academy</label>
                      <select
                        className="cd-form-input"
                        value={String(row.iinm)}
                        onChange={e => {
                          const val = e.target.value;
                          const updated = [...compareForm];
                          updated[i] = { ...updated[i], iinm: val === "true" ? true : val === "false" ? false : val };
                          setCompareForm(updated);
                        }}
                      >
                        <option value="true">✓ Yes (Checkmark)</option>
                        <option value="false">✗ No (Cross)</option>
                      </select>
                    </div>

                    <div className="cd-form-group">
                      <label className="cd-form-label">Others</label>
                      <select
                        className="cd-form-input"
                        value={String(row.others)}
                        onChange={e => {
                          const val = e.target.value;
                          const updated = [...compareForm];
                          updated[i] = { ...updated[i], others: val === "true" ? true : val === "false" ? false : "limited" };
                          setCompareForm(updated);
                        }}
                      >
                        <option value="false">✗ No (Cross)</option>
                        <option value="true">✓ Yes (Checkmark)</option>
                        <option value="limited">⚠️ Limited (Warning)</option>
                      </select>
                    </div>
                  </div>

                  {row.others !== true && (
                    <div className="cd-form-group">
                      <label className="cd-form-label">Others Note (optional, shown beside cross)</label>
                      <input
                        className="cd-form-input"
                        value={row.others_note || ""}
                        onChange={e => {
                          const updated = [...compareForm];
                          updated[i] = { ...updated[i], others_note: e.target.value };
                          setCompareForm(updated);
                        }}
                        placeholder="e.g. (Mostly recorded)"
                      />
                    </div>
                  )}
                </div>
              ))}

              {compareForm.length === 0 && (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>
                  No rows. Click "Add Row" to create one.
                </div>
              )}
            </div>

            {/* Live Preview */}
            <div className="cd-hero-editor-preview" style={{ background: "#ffffff" }}>
              <div className="cd-hero-editor-preview-inner" style={{ maxWidth: 600, width: "100%", background: "#ffffff", border: "1px dashed #cbd5e1" }}>
                <div className="cd-compare-card">
                  <div className="cd-compare-header">
                    <div className="cd-col-feature">Features</div>
                    <div className="cd-col-iinm">IINM Academy</div>
                    <div className="cd-col-others">Others</div>
                  </div>
                  <div className="cd-compare-body">
                    {compareForm.map((row, i) => {
                      const isOthersWarning = row.others === "limited" || (typeof row.others === "string" && row.others.toLowerCase().includes("limited"));
                      return (
                        <div key={i} className="cd-compare-row">
                          <div className="cd-col-feature">{row.feature || "Feature"}</div>
                          <div className="cd-col-iinm">
                            {row.iinm === true || row.iinm === "true" ? (
                              <span className="cd-check-icon">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                              </span>
                            ) : (
                              <span className="cd-cross-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                              </span>
                            )}
                          </div>
                          <div className="cd-col-others">
                            {isOthersWarning ? (
                              <span className="cd-warning-pill">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                                <span>Limited</span>
                              </span>
                            ) : row.others === true || row.others === "true" ? (
                              <span className="cd-check-icon">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                              </span>
                            ) : (
                              <div className="cd-cross-wrap">
                                <span className="cd-cross-icon">
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                </span>
                                {row.others_note && <span className="cd-cross-note">{row.others_note}</span>}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CERTIFICATES FULL-SCREEN EDITOR MODAL ── */}
      {certificatesEditorOpen && (
        <div className="cd-hero-editor-overlay">
          <div className="cd-hero-editor-header">
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 600, color: "#fef08a", margin: 0 }}>Edit Certificates</h2>
              <p style={{ fontSize: 13, color: "#94a3b8", margin: "4px 0 0" }}>Update section title and upload certificate images to R2.</p>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => setCertificatesEditorOpen(false)} className="cd-btn-secondary" style={{ padding: "10px 20px" }}>Cancel</button>
              <button onClick={async () => {
                setSavingEdit(true);
                try {
                  const payload = JSON.stringify(certificatesForm);
                  const res = await apiFetch(`/api/courses/${course.id}/extended`, {
                    method: "PUT",
                    body: JSON.stringify({ certificates_json: payload })
                  });
                  if (!res.ok) throw new Error("Failed to save");
                  setCourse(prev => {
                    if (!prev) return prev;
                    return { ...prev, extended: { ...prev.extended, certificates: JSON.parse(payload) } };
                  });
                  setSavingEdit(false);
                  setCertificatesEditorOpen(false);
                  showToast("Certificates updated!");
                } catch (err: any) {
                  setSavingEdit(false);
                  showToast("Save error: " + err.message);
                }
              }} className="cd-btn-primary" style={{ padding: "10px 28px" }} disabled={savingEdit}>
                {savingEdit ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>

          <div className="cd-hero-editor-body">
            {/* Form Panel */}
            <div className="cd-hero-editor-form" style={{ maxWidth: 720 }}>
              <div className="cd-hero-editor-group">
                <h3 className="cd-hero-editor-group-title">Section Text</h3>
                <div className="cd-form-group">
                  <label className="cd-form-label">Eyebrow</label>
                  <input
                    className="cd-form-input"
                    value={certificatesForm.eyebrow}
                    onChange={e => setCertificatesForm({ ...certificatesForm, eyebrow: e.target.value })}
                    placeholder="— Certifications —"
                  />
                </div>
                <div className="cd-form-group">
                  <label className="cd-form-label">Title (plain part)</label>
                  <input
                    className="cd-form-input"
                    value={certificatesForm.title}
                    onChange={e => setCertificatesForm({ ...certificatesForm, title: e.target.value })}
                    placeholder="Industry-Recognized GenAI"
                  />
                </div>
                <div className="cd-form-group">
                  <label className="cd-form-label">Title (italic blue part)</label>
                  <input
                    className="cd-form-input"
                    value={certificatesForm.title_blue}
                    onChange={e => setCertificatesForm({ ...certificatesForm, title_blue: e.target.value })}
                    placeholder="Certifications"
                  />
                </div>
              </div>

              <div className="cd-hero-editor-group">
                <h3 className="cd-hero-editor-group-title">Certificate Images</h3>
                {certificatesForm.items.map((cert, i) => (
                  <div key={i} className="cd-form-group" style={{ marginBottom: 20 }}>
                    <label className="cd-form-label">Certificate {i + 1}</label>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input
                        className="cd-form-input"
                        style={{ flex: 1 }}
                        value={cert.image_url}
                        onChange={e => {
                          const updated = { ...certificatesForm };
                          updated.items = [...updated.items];
                          updated.items[i] = { ...updated.items[i], image_url: e.target.value };
                          setCertificatesForm(updated);
                        }}
                        placeholder="https://..."
                      />
                      <label style={{ flexShrink: 0, margin: 0 }}>
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: "none" }}
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) handleCertificateImageUpload(i, file);
                            e.target.value = "";
                          }}
                          disabled={imageUploading === i}
                        />
                        <span
                          className="cd-btn-secondary"
                          style={{ padding: "10px 16px", cursor: imageUploading === i ? "not-allowed" : "pointer", opacity: imageUploading === i ? 0.7 : 1 }}
                        >
                          {imageUploading === i ? "Uploading..." : "Upload"}
                        </span>
                      </label>
                    </div>
                    <input
                      className="cd-form-input"
                      style={{ marginTop: 10 }}
                      value={cert.alt}
                      onChange={e => {
                        const updated = { ...certificatesForm };
                        updated.items = [...updated.items];
                        updated.items[i] = { ...updated.items[i], alt: e.target.value };
                        setCertificatesForm(updated);
                      }}
                      placeholder="Alt text"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Live Preview */}
            <div className="cd-hero-editor-preview" style={{ background: "#0a0f24" }}>
              <div className="cd-hero-editor-preview-inner" style={{ maxWidth: 720, width: "100%", background: "#0a0f24", border: "1px dashed rgba(255,255,255,0.15)" }}>
                <div className="cd-certificates-header">
                  <span className="cd-certificates-eyebrow">{certificatesForm.eyebrow}</span>
                  <h2 className="cd-certificates-title">
                    {certificatesForm.title} <span className="cd-certificates-title-italic">{certificatesForm.title_blue}</span>
                  </h2>
                </div>
                <div className="cd-certificates-grid">
                  {certificatesForm.items.map((cert, i) => (
                    <div key={i} className="cd-certificate-card">
                      <img src={cert.image_url || "/placeholder.svg"} alt={cert.alt} style={{ maxHeight: 220 }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── FAQ FULL-SCREEN EDITOR MODAL ── */}
      {faqEditorOpen && (
        <div className="cd-hero-editor-overlay">
          <div className="cd-hero-editor-header">
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 600, color: "#fef08a", margin: 0 }}>Edit FAQs</h2>
              <p style={{ fontSize: 13, color: "#94a3b8", margin: "4px 0 0" }}>Manage per-course FAQ categories and questions.</p>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => setFaqEditorOpen(false)} className="cd-btn-secondary" style={{ padding: "10px 20px" }}>Cancel</button>
              <button onClick={saveFaqEditor} className="cd-btn-primary" style={{ padding: "10px 28px" }} disabled={savingEdit}>
                {savingEdit ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>

          <div className="cd-hero-editor-body">
            <div className="cd-hero-editor-form" style={{ maxWidth: 720 }}>
              <div className="cd-hero-editor-group">
                <h3 className="cd-hero-editor-group-title">Add Category</h3>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    className="cd-form-input"
                    value={faqNewCategory}
                    onChange={e => setFaqNewCategory(e.target.value)}
                    placeholder="e.g. Program & Curriculum"
                  />
                  <button onClick={() => {
                    const cat = faqNewCategory.trim();
                    if (cat && !faqForm[cat]) {
                      setFaqForm(p => ({ ...p, [cat]: [] }));
                      setFaqNewCategory("");
                    }
                  }} className="cd-btn-secondary" style={{ padding: "10px 20px" }}>Add</button>
                </div>
              </div>

              {Object.keys(faqForm).map(cat => (
                <div key={cat} className="cd-hero-editor-group">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <h3 className="cd-hero-editor-group-title">{cat}</h3>
                    <button onClick={() => {
                      const { [cat]: _, ...rest } = faqForm;
                      setFaqForm(rest);
                    }} className="cd-hero-editor-remove">×</button>
                  </div>
                  {faqForm[cat].map((q, idx) => (
                    <div key={idx} style={{ marginBottom: 16, padding: 14, background: "rgba(15,23,42,0.5)", borderRadius: 8 }}>
                      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                        <input
                          className="cd-form-input"
                          style={{ flex: 1 }}
                          value={q.question}
                          onChange={e => setFaqForm(p => {
                            const updated = { ...p, [cat]: [...p[cat]] };
                            updated[cat][idx] = { ...updated[cat][idx], question: e.target.value };
                            return updated;
                          })}
                          placeholder="Question"
                        />
                        <button onClick={() => setFaqForm(p => ({ ...p, [cat]: p[cat].filter((_, j) => j !== idx) }))} className="cd-hero-editor-remove">×</button>
                      </div>
                      <textarea
                        className="cd-form-input"
                        value={q.answer}
                        onChange={e => setFaqForm(p => {
                          const updated = { ...p, [cat]: [...p[cat]] };
                          updated[cat][idx] = { ...updated[cat][idx], answer: e.target.value };
                          return updated;
                        })}
                        placeholder="Answer"
                        rows={3}
                      />
                    </div>
                  ))}
                  <button onClick={() => setFaqForm(p => ({ ...p, [cat]: [...p[cat], { question: "", answer: "" }] }))} className="cd-hero-editor-add">+ Add Question</button>
                </div>
              ))}
            </div>

            <div className="cd-hero-editor-preview" style={{ background: "#ffffff" }}>
              <div className="cd-faq-card" style={{ width: "100%", maxWidth: 600 }}>
                <h3 className="cd-faq-card-title">{faqPreviewCategory}</h3>
                <div className="cd-faq-list">
                  {(faqForm[faqPreviewCategory] || []).map((q, i) => (
                    <div key={i} className="cd-faq-item">
                      <div className="cd-faq-q">
                        <span>{q.question || "Untitled question"}</span>
                        <Icons.ChevronDown />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast notifications */}
      <div className="cd-toast-container">
        {toasts.map(t => <div key={t.id} className="cd-toast">{t.msg}</div>)}
      </div>
    </div>
  );
}

