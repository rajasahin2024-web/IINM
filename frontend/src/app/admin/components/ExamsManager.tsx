"use client";
import React, { useState, useEffect, useRef } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { API_BASE_URL } from "@/lib/config";
import { Icon } from "../icons";
import { useToast } from "./ToastProvider";

const GLOBAL_CSS = `
  :root {
    --ex-accent:       #10b981;
    --ex-accent-dk:    #059669;
    --ex-purple:       #4c1d95;
    --ex-txt:          #111827;
    --ex-txt-light:    #6b7280;
    --ex-border:       #e5e7eb;
    --ex-bg:           #f3f4f6;
    --ex-white:        #ffffff;
    --ex-sh:           0 1px 3px rgba(0,0,0,.08);
  }

  @keyframes exToastSlideIn {
    from { opacity: 0; transform: translateY(-20px) scale(0.95); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .ex-root {
    font-family: 'Inter', system-ui, sans-serif;
    color: var(--ex-txt);
    padding: 32px;
  }
  .ex-root *, .ex-root *::before, .ex-root *::after { box-sizing: border-box; }

  /* Top Bar */
  .ex-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
  .ex-title { font-size: 1.5rem; font-weight: 700; margin: 0; color: var(--ex-txt); }
  .ex-btn-new { background: var(--ex-accent); color: #fff; border: none; padding: 10px 20px; border-radius: 4px; font-weight: 600; font-size: 0.85rem; cursor: pointer; text-transform: uppercase; letter-spacing: 0.5px; transition: background 0.2s; }
  .ex-btn-new:hover { background: var(--ex-accent-dk); }

  /* Table Card */
  .ex-card { background: var(--ex-white); box-shadow: var(--ex-sh); border: 1px solid var(--ex-border); padding: 24px; }
  .ex-table { width: 100%; border-collapse: collapse; text-align: left; }
  .ex-th { font-size: 0.75rem; font-weight: 700; color: #4b5563; padding: 14px 12px; text-transform: uppercase; border-bottom: 1px solid var(--ex-border); letter-spacing: 0.5px; }
  .ex-td { font-size: 0.875rem; color: var(--ex-txt); padding: 14px 12px; border-bottom: 1px solid var(--ex-border); }
  .ex-filter-row td { padding: 8px 12px; border-bottom: 1px solid var(--ex-border); }
  .ex-filter-inp { width: 100%; padding: 8px 10px; border: 1px solid var(--ex-border); border-radius: 4px; font-size: 0.8rem; outline: none; }
  .ex-filter-inp:focus { border-color: var(--ex-accent); }

  /* Badges */
  .ex-code-pill { background: #0ea5e9; color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; }
  .ex-status-pub { background: #d1fae5; color: #059669; padding: 4px 10px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; }
  .ex-status-draft { background: #fee2e2; color: #dc2626; padding: 4px 10px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; }
  .ex-btn-action { display: inline-flex; align-items: center; justify-content: space-between; gap: 6px; padding: 6px 12px; border: 1px solid var(--ex-border); background: #fff; border-radius: 4px; font-size: 0.8rem; cursor: pointer; }

  /* Modal Wizard */
  .wx-overlay { position: fixed; inset: 0; background: #f3f4f6; z-index: 99999; display: flex; flex-direction: column; }
  .wx-header { display: flex; align-items: center; justify-content: space-between; background: #fff; padding: 16px 32px; border-bottom: 1px solid var(--ex-border); box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
  .wx-header-left h2 { margin: 0; font-size: 1.25rem; font-weight: 800; color: var(--ex-txt); }
  .wx-header-left p { margin: 4px 0 0; font-size: 0.8rem; color: var(--ex-txt-light); }
  .wx-close { background: none; border: none; cursor: pointer; color: var(--ex-txt-light); display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50%; border: 1px solid var(--ex-border); }
  .wx-close:hover { background: #f9fafb; color: var(--ex-txt); }

  /* Stepper */
  .wx-stepper { display: flex; gap: 16px; }
  .wx-step { display: flex; align-items: center; gap: 8px; padding: 8px 16px; border: 1px solid var(--ex-border); border-radius: 4px; background: #fff; font-size: 0.85rem; font-weight: 600; color: var(--ex-txt-light); opacity: 0.6; cursor: not-allowed; transition: all 0.2s; }
  .wx-step.active { opacity: 1; border-color: var(--ex-purple); color: var(--ex-purple); background: #fbfbfe; }
  .wx-step.completed { opacity: 1; border-color: var(--ex-accent); color: var(--ex-accent); cursor: pointer; }
  .wx-step-num { width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: #e5e7eb; color: #fff; font-size: 0.7rem; }
  .wx-step.active .wx-step-num { background: var(--ex-purple); }
  .wx-step.completed .wx-step-num { background: var(--ex-accent); }

  /* Form Content */
  .wx-body { flex: 1; overflow-y: auto; padding: 32px; display: flex; justify-content: center; }
  .wx-form-card { background: #fff; width: 100%; padding: 32px; border-radius: 8px; border: 1px solid var(--ex-border); box-shadow: 0 4px 12px rgba(0,0,0,0.03); display: flex; flex-direction: column; gap: 24px; }
  
  /* Field Elements with Floating Label */
  .wx-field { position: relative; margin-top: 12px; }
  .wx-field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; padding-top: 12px; }
  .wx-inp { width: 100%; padding: 14px 16px; border: 1.5px solid var(--ex-border); border-radius: 6px; font-size: 0.95rem; outline: none; transition: all 0.2s; background: #fff; color: var(--ex-txt); font-family: inherit; }
  .wx-inp:focus { border-color: var(--ex-purple); box-shadow: 0 0 0 3px rgba(76,29,149,0.1); }
  .wx-lbl { position: absolute; left: 12px; top: 14px; font-size: 0.9rem; font-weight: 600; color: #6b7280; pointer-events: none; transition: all 0.2s; background: #fff; padding: 0 4px; border-radius: 4px; margin: 0; }
  .wx-lbl span { color: #ef4444; margin-left: 2px; }
  .wx-inp:focus ~ .wx-lbl,
  .wx-inp:not(:placeholder-shown) ~ .wx-lbl,
  .wx-inp.has-val ~ .wx-lbl {
    top: -10px; left: 10px; font-size: 0.75rem; font-weight: 700; color: var(--ex-purple);
  }
  .wx-error { font-size: 0.75rem; color: #ef4444; margin-top: 4px; display: block; font-weight: 600; }
  
  /* Toggles */
  .wx-toggle-wrap { display: flex; justify-content: space-between; align-items: flex-start; }
  .wx-toggle-lbl { font-size: 0.9rem; font-weight: 700; color: #111827; }
  .wx-toggle-sub { font-size: 0.8rem; color: #6b7280; margin-top: 2px; }
  .wx-switch { position: relative; display: inline-block; width: 44px; height: 24px; }
  .wx-switch input { opacity: 0; width: 0; height: 0; }
  .wx-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #d1d5db; transition: .2s; border-radius: 24px; }
  .wx-slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .2s; border-radius: 50%; box-shadow: 0 1px 2px rgba(0,0,0,0.2); }
  .wx-switch input:checked + .wx-slider { background-color: var(--ex-purple); }
  .wx-switch input:checked + .wx-slider:before { transform: translateX(20px); }

  /* Editor placeholder */
  .wx-editor { border: 1px solid var(--ex-border); border-radius: 4px; overflow: hidden; }
  .wx-editor-tb { background: #f9fafb; padding: 10px 14px; border-bottom: 1px solid var(--ex-border); display: flex; gap: 12px; align-items: center; }
  .wx-editor-btn { background: none; border: none; font-weight: 700; font-family: serif; font-size: 1rem; color: #4b5563; cursor: pointer; }
  .wx-editor-textarea { width: 100%; min-height: 200px; border: none; outline: none; padding: 16px; font-size: 0.9rem; font-family: inherit; resize: vertical; }

  /* Save row */
  .wx-save-row { display: flex; justify-content: flex-end; padding-top: 16px; margin-top: 16px; border-top: 1px solid var(--ex-border); }
  .wx-btn-save { background: var(--ex-accent); color: #fff; padding: 12px 24px; border: none; border-radius: 4px; font-weight: 600; font-size: 0.9rem; cursor: pointer; transition: background 0.2s; }
  .wx-btn-save:hover { background: var(--ex-accent-dk); }
  .wx-btn-save:disabled { background: #9ca3af; cursor: not-allowed; }

  .wx-error { font-size: 0.75rem; color: #ef4444; margin-top: 4px; }

  /* Settings specific */
  .wx-st-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 8px; }
  .wx-st-col { display: flex; flex-direction: column; gap: 8px; }
  .wx-st-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; }
  .wx-st-lbl { font-size: 0.85rem; font-weight: 700; color: #111827; display: flex; align-items: center; gap: 6px; }
  .wx-st-icon { color: var(--ex-accent); font-size: 0.85rem; cursor: help; }
  .wx-seg-grp { display: inline-flex; border-radius: 4px; overflow: hidden; border: 1px solid var(--ex-border); }
  .wx-seg-btn { padding: 6px 14px; font-size: 0.8rem; font-weight: 600; cursor: pointer; background: #fff; color: #4b5563; border: none; outline: none; transition: all 0.2s; }
  .wx-seg-btn:not(:last-child) { border-right: 1px solid var(--ex-border); }
  .wx-seg-btn.active { background: #311e64; color: #fff; }
`;

interface FormState {
  title: string;
  categoryId: string;
  subCategoryId: string;
  examTypeId: string;
  isPaid: boolean;
  usePoints: boolean;
  pointsRequired: string;
  description: string;
  isPublic: boolean;
  status: string;
}

export default function ExamsManager() {
  const [modalOpen, setModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubCategories] = useState<any[]>([]);
  const [examTypes, setExamTypes] = useState<any[]>([
    { id: '1', name: 'Online Test' },
    { id: '2', name: 'Offline Written' },
    { id: '3', name: 'Mackerel/Kannangadathala' },
  ]);

  const [form, setForm] = useState<FormState>({
    title: "",
    categoryId: "",
    subCategoryId: "",
    examTypeId: "",
    isPaid: false,
    usePoints: false,
    pointsRequired: "",
    description: "",
    isPublic: true,
    status: "Published",
  });

  const [settings, setSettings] = useState({
    durationMode: 'Auto',
    marksMode: 'Auto',
    negativeMarking: false,
    passPercentage: '60',
    sectionCutoff: false,
    shuffleQuestions: false,
    restrictAttempts: false,
    numberOfAttempts: '',
    disableSectionNav: false,
    disableFinishBtn: false,
    enableQuestionList: false,
    hideSolutions: false,
    showLeaderboard: false
  });

  const [showErrors, setShowErrors] = useState(false);

  // --- Questions Import Logic ---
  // Real API থেকে category/subcategory অনুযায়ী প্রশ্ন লোড হবে
  const [questionBank, setQuestionBank] = useState<any[]>([]);
  const [questionBankLoading, setQuestionBankLoading] = useState(false);

  const [manageQTab, setManageQTab] = useState<'view' | 'add'>('view');
  const [qFilters, setQFilters] = useState({ code: '', types: [] as string[], section: '', skill: '', topic: '', tag: '', difficulties: [] as string[] });
  const [appliedFilters, setAppliedFilters] = useState({ code: '', types: [] as string[], section: '', skill: '', topic: '', tag: '', difficulties: [] as string[] });
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedImportIds, setSelectedImportIds] = useState<string[]>([]);
  const [examQuestions, setExamQuestions] = useState<any[]>([]);
  const [examSchedules, setExamSchedules] = useState<any[]>([]);

  const [examsList, setExamsList] = useState<any[]>([]);
  const [examsLoading, setExamsLoading] = useState(true);
  const [editingExamDbId, setEditingExamDbId] = useState<number | null>(null); // tracks DB id of exam in wizard

  const fetchExams = async () => {
    try {
      setExamsLoading(true);
      const res = await apiFetch(`${API_BASE_URL}/exams`);
      if (res.ok) setExamsList(await res.json());
    } catch { console.error('Failed to load exams'); }
    finally { setExamsLoading(false); }
  };

  useEffect(() => { fetchExams(); }, []);

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [newScheduleData, setNewScheduleData] = useState({ type: 'Fixed', startDate: '', startTime: '', endDate: '', endTime: '', gracePeriod: '5' });
  const [editScheduleIndex, setEditScheduleIndex] = useState<number | null>(null);
  const [activeScheduleDropdown, setActiveScheduleDropdown] = useState<number | null>(null);
  const [deleteScheduleConfirm, setDeleteScheduleConfirm] = useState<{index: number, code: string} | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<{isBulk: boolean, id: string | null, title: string | null} | null>(null);
  const { showToast } = useToast();
  const [editingExam, setEditingExam] = useState<any | null>(null);
  const [listFilters, setListFilters] = useState({ code: '', title: '', category: '', type: '', visibility: '', status: '' });

  const toggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if(e.target.checked) setSelectedIds(new Set(examsList.map(item => item.id)));
    else setSelectedIds(new Set());
  }

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if(next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  }

  const bulkDelete = () => {
    if(selectedIds.size === 0) return;
    setDeleteConfirm({isBulk: true, id: null, title: `${selectedIds.size} Exams Selected`});
  }

  const handleDelete = (exam: any) => {
    setDeleteConfirm({isBulk: false, id: exam.id, title: exam.title});
    setActiveDropdown(null);
  }

  const confirmDelete = async () => {
    if(!deleteConfirm) return;
    try {
      if(deleteConfirm.isBulk) {
        for (const id of selectedIds) {
          await apiFetch(`${API_BASE_URL}/exams/${id}`, { method: 'DELETE' });
        }
        setSelectedIds(new Set());
      } else if (deleteConfirm.id) {
        await apiFetch(`${API_BASE_URL}/exams/${deleteConfirm.id}`, { method: 'DELETE' });
        const next = new Set(selectedIds);
        next.delete(String(deleteConfirm.id));
        setSelectedIds(next);
      }
      await fetchExams();
      showToast('Deleted successfully!');
    } catch { showToast('Failed to delete.', 'error'); }
    setDeleteConfirm(null);
  }

  const handleEdit = (exam: any) => {
    setEditingExam(exam);
    // Restore Details
    setForm({
      title: exam.title || '',
      categoryId: exam.category_id ? String(exam.category_id) : (exam.categoryId || ''),
      subCategoryId: exam.subcategory_id ? String(exam.subcategory_id) : (exam.subCategoryId || ''),
      examTypeId: exam.exam_type ? (examTypes.find((t: any) => t.name === exam.exam_type)?.id || '') : (exam.examTypeId || ''),
      isPaid: exam.is_paid !== undefined ? exam.is_paid : (exam.isPaid || false),
      usePoints: exam.usePoints || false,
      pointsRequired: exam.pointsRequired || '',
      description: exam.description || '',
      isPublic: exam.is_public !== undefined ? exam.is_public : (exam.visibility === 'Public'),
      status: exam.status || 'Published',
    });
    // Restore Settings
    if(exam.settings) setSettings(exam.settings);
    // Restore Questions
    setExamQuestions(exam.questions || []);
    // Restore Schedules
    setExamSchedules(exam.schedules || []);
    setCurrentStep(1);
    setModalOpen(true);
    setActiveDropdown(null);
  }

  const handleSchedules = (exam: any) => {
    setEditingExam(exam);
    setExamSchedules(exam.schedules || []);
    setCurrentStep(4);
    setModalOpen(true);
    setActiveDropdown(null);
  }

  const handleTypeFilterToggle = (type: string) => {
    if (qFilters.types.includes(type)) {
      setQFilters({ ...qFilters, types: qFilters.types.filter(t => t !== type) });
    } else {
      setQFilters({ ...qFilters, types: [...qFilters.types, type] });
    }
  };

  const handleDifficultyFilterToggle = (diff: string) => {
    if (qFilters.difficulties.includes(diff)) {
      setQFilters({ ...qFilters, difficulties: qFilters.difficulties.filter(d => d !== diff) });
    } else {
      setQFilters({ ...qFilters, difficulties: [...qFilters.difficulties, diff] });
    }
  };

  const handleSearch = () => {
    setAppliedFilters(qFilters);
    setHasSearched(true);
  };
  
  const handleReset = () => {
    const empty = { code: '', types: [] as string[], section: '', skill: '', topic: '', tag: '', difficulties: [] as string[] };
    setQFilters(empty);
    setAppliedFilters(empty);
    setHasSearched(false);
  };

  const handleImportSelectToggle = (id: string) => {
    if (selectedImportIds.includes(id)) {
      setSelectedImportIds(selectedImportIds.filter(x => x !== id));
    } else {
      setSelectedImportIds([...selectedImportIds, id]);
    }
  };

  const handleAddSelectedQuestions = async () => {
    const toAdd = questionBank.filter(q => selectedImportIds.includes(String(q.id)));
    const newQuestions = toAdd.filter(q => !examQuestions.find((eq: any) => eq.id === q.id));

    // If we already have a DB exam id (editing or just created), save to DB
    const dbId = editingExamDbId || (editingExam?.id && !isNaN(Number(editingExam?.id)) ? Number(editingExam.id) : null);
    if (dbId && newQuestions.length > 0) {
      try {
        await apiFetch(`${API_BASE_URL}/exams/${dbId}/questions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question_ids: newQuestions.map((q: any) => q.id), marks: 1.0, negative_marks: 0.0 }),
        });
      } catch { showToast('Failed to save questions to DB', 'error'); }
    }

    setExamQuestions([...examQuestions, ...newQuestions]);
    setSelectedImportIds([]);
    setManageQTab('view');
  };

  // category বা subcategory বদলালে API থেকে প্রশ্ন অটো-লোড হবে
  useEffect(() => {
    const fetchQuestions = async () => {
      // category select না করলে bank empty রাখো
      if (!form.categoryId) {
        setQuestionBank([]);
        return;
      }
      setQuestionBankLoading(true);
      try {
        let url = `${API_BASE_URL}/questions?limit=200`;
        if (form.categoryId) url += `&category_id=${form.categoryId}`;
        if (form.subCategoryId) url += `&subcategory_id=${form.subCategoryId}`;
        const res = await apiFetch(url);
        if (!res.ok) throw new Error("Failed to fetch exams");
        const data = await res.json();
        // API response: { total, items: [...] }
        const items = data.items || data || [];
        setQuestionBank(items.map((q: any) => ({
          id: q.id,
          code: q.code,
          type: q.question_type_name || q.question_type_code || 'Unknown',
          preview: q.question_html?.replace(/<[^>]+>/g, '').substring(0, 120) || q.code,
          marks: q.default_marks || 0,
          tags: q.tags ? q.tags.split(',').map((t: string) => t.trim()) : [],
          difficulty: q.difficulty_level || 'Medium',
          categoryId: q.category_id,
          subCategoryId: q.subcategory_id,
          raw: q,
        })));
      } catch (e) {
        console.error('Failed to load question bank', e);
      } finally {
        setQuestionBankLoading(false);
      }
    };
    // Only fetch when modal is open and we're on step 3 or preparing
    if (modalOpen) fetchQuestions();
  }, [form.categoryId, form.subCategoryId, modalOpen]);

  const availableTags = Array.from(new Set(questionBank.flatMap(q => q.tags || [])));

  const filteredBank = questionBank.filter(q => {
    const matchType = appliedFilters.types.length === 0 ? true : appliedFilters.types.includes(q.type);
    const matchCode = appliedFilters.code ? q.code.toLowerCase().includes(appliedFilters.code.toLowerCase()) : true;
    const matchTag = appliedFilters.tag ? (q.tags && q.tags.includes(appliedFilters.tag)) : true;
    const matchDiff = appliedFilters.difficulties.length === 0 ? true : appliedFilters.difficulties.includes(q.difficulty);
    return matchType && matchCode && matchTag && matchDiff;
  });
  // ------------------------------

  // Inline add state
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  
  const [showAddSubCat, setShowAddSubCat] = useState(false);
  const [newSubCatName, setNewSubCatName] = useState("");
  
  const [showAddExamType, setShowAddExamType] = useState(false);
  const [newExamTypeName, setNewExamTypeName] = useState("");

  const editorRef = useRef<HTMLDivElement>(null);
  
  const execCmd = (cmd: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value);
    if (editorRef.current) {
        setForm({ ...form, description: editorRef.current.innerHTML });
    }
  };

  const handleInsertImage = () => {
    const url = prompt("Enter Image URL:");
    if (url) execCmd("insertImage", url);
  };

  useEffect(() => {
    // Fetch categories and subcategories
    const fetchCats = async () => {
      try {
        const cRes = await apiFetch(API_BASE_URL + "/categories");
        if (cRes.ok) setCategories(await cRes.json());
        const sRes = await apiFetch(API_BASE_URL + "/subcategories");
        if (sRes.ok) setSubCategories(await sRes.json());
      } catch (e) {
        console.error("Failed to load catalog data");
      }
    };
    fetchCats();
  }, []);

  const isValidDetails = () => {
    let valid = form.title.trim() !== "" && form.categoryId !== "" && form.subCategoryId !== "" && form.examTypeId !== "";
    if (form.isPaid && form.usePoints) {
      if (form.pointsRequired.trim() === "") valid = false;
    }
    return valid;
  };

  const attemptNextStep = (step: number) => {
    if (step > 1 && !isValidDetails()) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    setCurrentStep(step);
  };

  const STEPS = [
    { id: 1, label: "Details" },
    { id: 2, label: "Settings" },
    { id: 3, label: "Questions" },
    { id: 4, label: "Schedules" }
  ];

  const filteredSubCats = subcategories.filter(s => s.category_id && s.category_id.toString() === form.categoryId);

  const handleCreateCategory = () => {
    if (!newCatName.trim()) return;
    const item = { id: Date.now().toString(), name: newCatName.trim() };
    setCategories([...categories, item]);
    setForm({...form, categoryId: item.id, subCategoryId: ""});
    setNewCatName("");
    setShowAddCategory(false);
  };

  const handleCreateSubCat = () => {
    if (!newSubCatName.trim() || !form.categoryId) return;
    const item = { id: Date.now().toString(), category_id: form.categoryId, name: newSubCatName.trim() };
    setSubCategories([...subcategories, item]);
    setForm({...form, subCategoryId: item.id});
    setNewSubCatName("");
    setShowAddSubCat(false);
  };

  const handleCreateExamType = () => {
    if (!newExamTypeName.trim()) return;
    const item = { id: Date.now().toString(), name: newExamTypeName.trim() };
    setExamTypes([...examTypes, item]);
    setForm({...form, examTypeId: item.id});
    setNewExamTypeName("");
    setShowAddExamType(false);
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      <div className="ex-root">
        <div className="ex-top">
          <h1 className="ex-title">Exams</h1>
          <div style={{display: 'flex', gap: 12}}>
            {selectedIds.size > 0 && (
              <button 
                onClick={bulkDelete}
                style={{background: '#fee2e2', color: '#dc2626', border: 'none', padding: '10px 20px', borderRadius: 4, fontStyle: 'normal', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6}}
              >
                Delete Selected ({selectedIds.size})
              </button>
            )}
            <button className="ex-btn-new" onClick={() => setModalOpen(true)}>New Exam</button>
          </div>
        </div>

        <div className="ex-card">
          <div style={{ display: 'flex', gap: 12, paddingBottom: 24, borderBottom: '1px solid var(--ex-border)', marginBottom: 24, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1 1 180px' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', display: 'flex', alignItems: 'center' }}>
                <Icon name="search" size={14} />
              </span>
              <input className="wx-inp" placeholder="Search code..." value={listFilters.code} onChange={e => setListFilters({...listFilters, code: e.target.value})} style={{ width: '100%', padding: '10px 12px 10px 36px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: '0.85rem' }} />
            </div>

            <div style={{ position: 'relative', flex: '1 1 200px' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', display: 'flex', alignItems: 'center' }}>
                <Icon name="search" size={14} />
              </span>
              <input className="wx-inp" placeholder="Search title..." value={listFilters.title} onChange={e => setListFilters({...listFilters, title: e.target.value})} style={{ width: '100%', padding: '10px 12px 10px 36px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: '0.85rem' }} />
            </div>
            
            <div style={{ position: 'relative', flex: '1 1 160px' }}>
              <select className="wx-inp" value={listFilters.category} onChange={e => setListFilters({...listFilters, category: e.target.value})} style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: '0.85rem', appearance: 'auto', background: '#fff', color: '#4b5563' }}>
                <option value="">All Categories</option>
                {Array.from(new Set([
                  ...categories.map((c: any) => c.name),
                  ...examsList.map((ex: any) => ex.category).filter(Boolean)
                ])).filter(Boolean).map((name: any) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>

            <div style={{ position: 'relative', flex: '1 1 160px' }}>
              <select className="wx-inp" value={listFilters.type} onChange={e => setListFilters({...listFilters, type: e.target.value})} style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: '0.85rem', appearance: 'auto', background: '#fff', color: '#4b5563' }}>
                <option value="">All Types</option>
                {Array.from(new Set([
                  ...examTypes.map((t: any) => t.name),
                  ...examsList.map((ex: any) => ex.type).filter(Boolean)
                ])).filter(Boolean).map((name: any) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
            
            <div style={{ position: 'relative', flex: '1 1 140px' }}>
              <select className="wx-inp" value={listFilters.visibility} onChange={e => setListFilters({...listFilters, visibility: e.target.value})} style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: '0.85rem', appearance: 'auto', background: '#fff', color: '#4b5563' }}>
                <option value="">Visibility</option>
                <option value="Public">Public</option>
                <option value="Private">Private</option>
              </select>
            </div>

            <div style={{ position: 'relative', flex: '1 1 140px' }}>
              <select className="wx-inp" value={listFilters.status} onChange={e => setListFilters({...listFilters, status: e.target.value})} style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: '0.85rem', appearance: 'auto', background: '#fff', color: '#4b5563' }}>
                <option value="">All Statuses</option>
                <option value="Published">Published</option>
                <option value="Draft">Draft</option>
              </select>
            </div>
          </div>

          {/* Active filter badges */}
          {Object.values(listFilters).some(v => v !== '') && (
            <div style={{display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center'}}>
              <span style={{fontSize: '0.8rem', color: '#6b7280', fontWeight: 600}}>Active Filters:</span>
              {listFilters.code && <span style={{background: '#e0f2fe', color: '#0369a1', padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6}}>Code: {listFilters.code} <button onClick={() => setListFilters({...listFilters, code: ''})} style={{background: 'none', border: 'none', cursor: 'pointer', color: '#0369a1', fontSize: '0.8rem', padding: 0}}>×</button></span>}
              {listFilters.title && <span style={{background: '#e0f2fe', color: '#0369a1', padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6}}>Title: {listFilters.title} <button onClick={() => setListFilters({...listFilters, title: ''})} style={{background: 'none', border: 'none', cursor: 'pointer', color: '#0369a1', fontSize: '0.8rem', padding: 0}}>×</button></span>}
              {listFilters.category && <span style={{background: '#fef3c7', color: '#92400e', padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6}}>Category: {listFilters.category} <button onClick={() => setListFilters({...listFilters, category: ''})} style={{background: 'none', border: 'none', cursor: 'pointer', color: '#92400e', fontSize: '0.8rem', padding: 0}}>×</button></span>}
              {listFilters.type && <span style={{background: '#f3e8ff', color: '#6b21a8', padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6}}>Type: {listFilters.type} <button onClick={() => setListFilters({...listFilters, type: ''})} style={{background: 'none', border: 'none', cursor: 'pointer', color: '#6b21a8', fontSize: '0.8rem', padding: 0}}>×</button></span>}
              {listFilters.visibility && <span style={{background: '#dcfce7', color: '#166534', padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6}}>{listFilters.visibility} <button onClick={() => setListFilters({...listFilters, visibility: ''})} style={{background: 'none', border: 'none', cursor: 'pointer', color: '#166534', fontSize: '0.8rem', padding: 0}}>×</button></span>}
              {listFilters.status && <span style={{background: '#fee2e2', color: '#991b1b', padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6}}>{listFilters.status} <button onClick={() => setListFilters({...listFilters, status: ''})} style={{background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b', fontSize: '0.8rem', padding: 0}}>×</button></span>}
              <button onClick={() => setListFilters({ code: '', title: '', category: '', type: '', visibility: '', status: '' })} style={{background: '#f3f4f6', border: 'none', color: '#374151', padding: '4px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer'}}>Clear All</button>
            </div>
          )}
          <table className="ex-table">
            <thead>
              <tr>
                <th className="ex-th" style={{ width: 40 }}>
                  <input type="checkbox" checked={examsList.length > 0 && selectedIds.size === examsList.length} onChange={toggleSelectAll} style={{cursor: 'pointer'}} />
                </th>
                <th className="ex-th">CODE</th>
                <th className="ex-th">TITLE</th>
                <th className="ex-th">CATEGORY</th>
                <th className="ex-th">TYPE</th>
                <th className="ex-th">VISIBILITY</th>
                <th className="ex-th">STATUS</th>
                <th className="ex-th" style={{minWidth: 120}}>ACTIONS</th>
              </tr>

            </thead>
            <tbody>
              {(() => {
                const filtered = examsList.filter(exam => {
                  const resolvedCat = categories.find(c => c.id == exam.categoryId)?.name || exam.category || '';
                  const resolvedType = examTypes.find(t => t.id == exam.examTypeId)?.name || exam.type || '';
                  if (listFilters.code && !exam.code?.toLowerCase().includes(listFilters.code.toLowerCase())) return false;
                  if (listFilters.title && !exam.title?.toLowerCase().includes(listFilters.title.toLowerCase())) return false;
                  if (listFilters.category && !resolvedCat.toLowerCase().includes(listFilters.category.toLowerCase())) return false;
                  if (listFilters.type && !resolvedType.toLowerCase().includes(listFilters.type.toLowerCase())) return false;
                  if (listFilters.visibility && exam.visibility !== listFilters.visibility) return false;
                  if (listFilters.status && exam.status !== listFilters.status) return false;
                  return true;
                });
                if (filtered.length === 0) return (
                  <tr><td colSpan={8} style={{padding: '32px', textAlign: 'center', color: '#9ca3af', fontSize: '0.9rem'}}>No exams found matching your filters.</td></tr>
                );
                return filtered.map((exam, idx) => (
                <tr key={idx}>
                  <td className="ex-td">
                    <input type="checkbox" checked={selectedIds.has(exam.id)} onChange={() => toggleSelect(exam.id)} style={{cursor: 'pointer'}} />
                  </td>
                  <td className="ex-td">
                    <span 
                      className="ex-code-pill" 
                      style={{ cursor: "pointer", transition: "transform 0.1s" }}
                      title="Click to copy full code"
                      onClick={() => {
                        navigator.clipboard.writeText(exam.code);
                        showToast(`Copied ${exam.code}`);
                      }}
                      onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.95)"}
                      onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
                      onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                    >
                      {exam.code.substring(0, 15)}{exam.code.length > 15 ? '...' : ''}
                      <span style={{marginLeft: 4, opacity: 0.8, display: "inline-flex"}}><Icon name="copy" size={12} /></span>
                    </span>
                  </td>
                  <td className="ex-td" style={{fontWeight: 600}}>{exam.title || 'Untitled Exam'}</td>
                  <td className="ex-td">
                    <div style={{fontWeight: 600}}>
                      {categories.find(c => c.id == exam.category_id)?.name || exam.category_name || exam.category || '—'}
                    </div>
                    {(exam.subcategory_id || exam.subCategoryId || exam.subCategory || exam.subcategory_name) && (
                      <div style={{fontSize: '0.75rem', color: '#6b7280', marginTop: 2}}>
                        {subcategories.find(s => s.id == exam.subcategory_id)?.name || exam.subcategory_name || exam.subCategory}
                      </div>
                    )}
                  </td>
                  <td className="ex-td">
                    {((exam.exam_type || exam.type || 'Standard').substring(0, 15))}
                    {(exam.exam_type || exam.type || 'Standard').length > 15 ? '...' : ''}
                  </td>
                  <td className="ex-td">{exam.is_public ? 'Public' : (exam.visibility || 'Private')}</td>
                  <td className="ex-td"><span className={(exam.status || '').toLowerCase() === 'published' ? 'ex-status-pub' : 'ex-status-draft'}>{exam.status || 'Draft'}</span></td>
                  <td className="ex-td">
                    <div style={{position: 'relative'}}>
                      <button className="ex-btn-action" onClick={() => setActiveDropdown(activeDropdown === exam.id ? null : exam.id)}>Actions <Icon name="chevron-down" size={14}/></button>
                      {activeDropdown === exam.id && (
                        <div style={{position: 'absolute', top: '100%', right: 0, marginTop: 4, background: '#fff', border: '1px solid var(--ex-border)', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 99, minWidth: 150, padding: '4px 0'}}>
                          <button style={{width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '10px 16px', fontSize: '0.85rem', cursor: 'pointer', color: '#374151', textDecoration: 'none'}}>Analytics</button>
                          <button onClick={() => handleSchedules(exam)} style={{width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '10px 16px', fontSize: '0.85rem', cursor: 'pointer', color: '#111827', fontWeight: 500}}>Schedules</button>
                          <button onClick={() => handleEdit(exam)} style={{width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '10px 16px', fontSize: '0.85rem', cursor: 'pointer', color: '#374151'}}>Edit</button>
                          <div style={{borderTop: '1px solid var(--ex-border)', margin: '4px 0'}}></div>
                          <button onClick={() => handleDelete(exam)} style={{width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '10px 16px', fontSize: '0.85rem', cursor: 'pointer', color: '#ef4444'}}>Delete</button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="wx-overlay">
          <div className="wx-header">
            <div className="wx-header-left">
              <h2>{editingExam ? 'Edit Exam' : 'Exam Details'}</h2>
              <p>{editingExam ? `Editing: ${editingExam.title}` : 'New Exam'}</p>
            </div>
            
            <div className="wx-stepper">
              {STEPS.map(st => {
                const isCompleted = st.id === 1 ? isValidDetails() : currentStep > st.id;
                const isActive = currentStep === st.id;
                const cls = isActive ? "active" : (isCompleted ? "completed" : "");
                
                return (
                  <div key={st.id} className={`wx-step ${cls}`} onClick={() => {
                    if (isActive) return;
                    if (st.id === 1) attemptNextStep(1);
                    if (st.id > 1 && isValidDetails()) attemptNextStep(st.id);
                  }}>
                    <div className="wx-step-num">{st.id}</div>
                    {st.label}
                  </div>
                )
              })}
            </div>

            <button className="wx-close" onClick={() => { setModalOpen(false); setEditingExam(null); setCurrentStep(1); }}>
              <Icon name="x" size={16} />
            </button>
          </div>

          <div className="wx-body">
            {currentStep === 1 && (
              <div className="wx-form-card">
                
                <div className="wx-field">
                  <input className="wx-inp" placeholder=" " value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
                  <label className="wx-lbl">Title <span>*</span></label>
                  {showErrors && form.title.trim() === "" && <span className="wx-error">Title is required</span>}
                </div>

                <div className="wx-field-row">
                  <div className="wx-field">
                    <div style={{position: 'absolute', right: 0, top: -20, zIndex: 10}}>
                      <button type="button" onClick={() => setShowAddCategory(!showAddCategory)} style={{background: 'none', border: 'none', color: 'var(--ex-purple)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', padding: 0}}>
                        {showAddCategory ? "Cancel" : "+ Add Category"}
                      </button>
                    </div>
                    {showAddCategory ? (
                      <div style={{display: 'flex', gap: 8, marginTop: 4}}>
                        <input className="wx-inp" placeholder="New Category Name" value={newCatName} onChange={e => setNewCatName(e.target.value)} autoFocus />
                        <button type="button" className="ex-btn-new" style={{padding: '0 16px'}} onClick={handleCreateCategory}>Save</button>
                      </div>
                    ) : (
                      <>
                        <select className={"wx-inp" + (form.categoryId ? " has-val" : "")} value={form.categoryId} onChange={e => setForm({...form, categoryId: e.target.value, subCategoryId: ""})}>
                          <option value="" disabled hidden></option>
                          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <label className="wx-lbl">Category <span>*</span></label>
                        {showErrors && form.categoryId === "" && <span className="wx-error">Category is required</span>}
                      </>
                    )}
                  </div>
                  <div className="wx-field">
                    <div style={{position: 'absolute', right: 0, top: -20, zIndex: 10}}>
                      <button type="button" onClick={() => setShowAddSubCat(!showAddSubCat)} style={{background: 'none', border: 'none', color: 'var(--ex-purple)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', padding: 0}}>
                        {showAddSubCat ? "Cancel" : "+ Add Sub Category"}
                      </button>
                    </div>
                    {showAddSubCat ? (
                      <div style={{display: 'flex', gap: 8, marginTop: 4}}>
                        <input className="wx-inp" placeholder={form.categoryId === "" ? "Please select Category first" : "New Sub Category"} disabled={form.categoryId === ""} value={newSubCatName} onChange={e => setNewSubCatName(e.target.value)} autoFocus />
                        <button type="button" className="ex-btn-new" style={{padding: '0 16px'}} onClick={handleCreateSubCat} disabled={form.categoryId === ""}>Save</button>
                      </div>
                    ) : (
                      <>
                        <select className={"wx-inp" + (form.subCategoryId ? " has-val" : "")} value={form.subCategoryId} onChange={e => setForm({...form, subCategoryId: e.target.value})} disabled={!form.categoryId}>
                          <option value="" disabled hidden></option>
                          {filteredSubCats.map(sc => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
                        </select>
                        <label className="wx-lbl">Sub Category <span>*</span></label>
                        {showErrors && form.subCategoryId === "" && <span className="wx-error">Sub Category is required</span>}
                      </>
                    )}
                  </div>
                </div>

                <div className="wx-field">
                  <div style={{position: 'absolute', right: 0, top: -20, zIndex: 10}}>
                    <button type="button" onClick={() => setShowAddExamType(!showAddExamType)} style={{background: 'none', border: 'none', color: 'var(--ex-purple)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', padding: 0}}>
                       {showAddExamType ? "Cancel" : "+ Add Exam Type"}
                    </button>
                  </div>
                  {showAddExamType ? (
                    <div style={{display: 'flex', gap: 8, marginTop: 4}}>
                      <input className="wx-inp" placeholder="New Exam Type" value={newExamTypeName} onChange={e => setNewExamTypeName(e.target.value)} autoFocus />
                      <button type="button" className="ex-btn-new" style={{padding: '0 16px'}} onClick={handleCreateExamType}>Save</button>
                    </div>
                  ) : (
                    <>
                      <select className={"wx-inp" + (form.examTypeId ? " has-val" : "")} value={form.examTypeId} onChange={e => setForm({...form, examTypeId: e.target.value})}>
                        <option value="" disabled hidden></option>
                        {examTypes.map(et => <option key={et.id} value={et.id}>{et.name}</option>)}
                      </select>
                      <label className="wx-lbl">Exam Type <span>*</span></label>
                      {showErrors && form.examTypeId === "" && <span className="wx-error">Exam Type is required</span>}
                    </>
                  )}
                </div>

                <div className="wx-toggle-wrap">
                  <div>
                    <div className="wx-toggle-lbl">{form.isPaid ? 'Paid' : 'Free'}</div>
                    <div className="wx-toggle-sub">
                      Paid (Accessible to only paid users). Free (Anyone can access).
                    </div>
                  </div>
                  <label className="wx-switch">
                    <input type="checkbox" checked={form.isPaid} onChange={e => {
                      const isPaid = e.target.checked;
                      setForm({...form, isPaid, usePoints: isPaid ? form.usePoints : false, pointsRequired: isPaid ? form.pointsRequired : ""});
                    }} />
                    <span className="wx-slider"></span>
                  </label>
                </div>

                {form.isPaid && (
                  <>
                    <div className="wx-toggle-wrap">
                      <div>
                        <div className="wx-toggle-lbl">Can access with Points ({form.usePoints ? 'Yes' : 'No'})</div>
                        <div className="wx-toggle-sub">
                          Yes (User should redeem with points to access exam). No (Anyone can access).
                        </div>
                      </div>
                      <label className="wx-switch">
                        <input type="checkbox" checked={form.usePoints} onChange={e => {
                           const useP = e.target.checked;
                           setForm({...form, usePoints: useP, pointsRequired: !useP ? "" : form.pointsRequired});
                        }} />
                        <span className="wx-slider"></span>
                      </label>
                    </div>

                    {form.usePoints && (
                      <div className="wx-field" style={{marginTop: '-8px'}}>
                        <input className="wx-inp" type="number" placeholder=" " value={form.pointsRequired} onChange={e => setForm({...form, pointsRequired: e.target.value})} />
                        <label className="wx-lbl">Points Required to Redeem <span>*</span></label>
                        {showErrors && form.pointsRequired.trim() === "" && <span className="wx-error">Points Required is mandatory</span>}
                      </div>
                    )}
                  </>
                )}

                <div className="wx-field" style={{marginBottom: 16}}>
                  <label className="wx-lbl">Description</label>
                  <div style={{border: '1px solid var(--ex-border)', borderRadius: 8, overflow: 'hidden', background: '#fff'}}>
                    <div style={{background: '#f8f9fa', padding: '6px 12px', borderBottom: '1px solid var(--ex-border)', display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center'}}>
                      <button type="button" onClick={() => execCmd('bold')} style={{background:'none', border:'none', cursor:'pointer', fontWeight:'bold', fontSize:'14px', width:28, height:28, borderRadius:4}}>B</button>
                      <button type="button" onClick={() => execCmd('italic')} style={{background:'none', border:'none', cursor:'pointer', fontStyle:'italic', fontFamily:'serif', fontSize:'14px', width:28, height:28, borderRadius:4}}>I</button>
                      <button type="button" onClick={() => execCmd('strikeThrough')} style={{background:'none', border:'none', cursor:'pointer', textDecoration:'line-through', fontSize:'14px', width:28, height:28, borderRadius:4}}>S</button>
                      <button type="button" onClick={() => execCmd('underline')} style={{background:'none', border:'none', cursor:'pointer', textDecoration:'underline', fontSize:'14px', width:28, height:28, borderRadius:4}}>U</button>
                      <div style={{width:1, height:18, background:'var(--ex-border)', margin:'0 4px'}} />
                      <button type="button" onClick={() => execCmd('subscript')} style={{background:'none', border:'none', cursor:'pointer', fontSize:'13px', width:28, height:28, borderRadius:4}}>x<sub style={{fontSize:9}}>2</sub></button>
                      <button type="button" onClick={() => execCmd('superscript')} style={{background:'none', border:'none', cursor:'pointer', fontSize:'13px', width:28, height:28, borderRadius:4}}>x<sup style={{fontSize:9}}>2</sup></button>
                      <div style={{width:1, height:18, background:'var(--ex-border)', margin:'0 4px'}} />
                      <button type="button" onClick={() => execCmd('insertOrderedList')} style={{background:'none', border:'none', cursor:'pointer', fontSize:'14px', width:28, height:28, borderRadius:4, display:'flex', alignItems:'center', justifyContent:'center'}}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="10" y1="6" x2="21" y2="6"></line><line x1="10" y1="12" x2="21" y2="12"></line><line x1="10" y1="18" x2="21" y2="18"></line><path d="M4 6h1v4"></path><path d="M4 10h2"></path><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"></path></svg>
                      </button>
                      <button type="button" onClick={() => execCmd('insertUnorderedList')} style={{background:'none', border:'none', cursor:'pointer', fontSize:'14px', width:28, height:28, borderRadius:4, display:'flex', alignItems:'center', justifyContent:'center'}}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                      </button>
                      <div style={{width:1, height:18, background:'var(--ex-border)', margin:'0 4px'}} />
                      <button type="button" title="Insert Image" onClick={handleInsertImage} style={{background:'none', border:'none', cursor:'pointer', fontSize:'14px', width:28, height:28, borderRadius:4, display:'flex', alignItems:'center', justifyContent:'center'}}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                      </button>
                      <button type="button" title="Math Equation" style={{background:'none', border:'none', cursor:'pointer', fontSize:'15px', fontWeight:600, width:28, height:28, borderRadius:4, fontFamily:'serif', display:'flex', alignItems:'center', justifyContent:'center'}}>
                        Σ
                      </button>
                      <div style={{width:1, height:18, background:'var(--ex-border)', margin:'0 4px'}} />
                      <button type="button" title="Clear Formatting" onClick={() => execCmd('removeFormat')} style={{background:'none', border:'none', cursor:'pointer', fontSize:'14px', width:28, height:28, borderRadius:4, display:'flex', alignItems:'center', justifyContent:'center'}}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      </button>
                    </div>
                    <div 
                      ref={editorRef}
                      contentEditable 
                      suppressContentEditableWarning
                      onBlur={(e) => setForm({...form, description: e.currentTarget.innerHTML})}
                      style={{width: '100%', minHeight: 160, padding: 14, outline: 'none', fontSize: '0.9rem', lineHeight: 1.6}} 
                    />
                  </div>
                </div>

                <div className="wx-toggle-wrap">
                  <div>
                    <div className="wx-toggle-lbl">Visibility - {form.isPublic ? 'Public' : 'Private'}</div>
                    <div className="wx-toggle-sub">
                      Private (Only scheduled user groups can access). Public (Anyone can access).
                    </div>
                  </div>
                  <label className="wx-switch">
                    <input type="checkbox" checked={form.isPublic} onChange={e => setForm({...form, isPublic: e.target.checked})} />
                    <span className="wx-slider"></span>
                  </label>
                </div>

                <div className="wx-toggle-wrap">
                  <div>
                    <div className="wx-toggle-lbl">Status - {form.status}</div>
                    <div className="wx-toggle-sub">
                      Draft (Exam is saved but not visible/active). Published (Exam is live and active).
                    </div>
                  </div>
                  <label className="wx-switch">
                    <input type="checkbox" checked={form.status === 'Published'} onChange={e => setForm({...form, status: e.target.checked ? 'Published' : 'Draft'})} />
                    <span className="wx-slider"></span>
                  </label>
                </div>
              </div>
            )}
            
            {currentStep === 2 && (
              <div className="wx-form-card" style={{padding: '32px 40px'}}>
                <div className="wx-st-grid">
                  <div className="wx-st-col">
                    <div className="wx-st-row">
                      <div className="wx-st-lbl">Duration Mode <span className="wx-st-icon">ⓘ</span></div>
                      <div className="wx-seg-grp">
                        <button className={"wx-seg-btn" + (settings.durationMode === 'Auto' ? ' active' : '')} onClick={() => setSettings({...settings, durationMode: 'Auto'})}>Auto</button>
                        <button className={"wx-seg-btn" + (settings.durationMode === 'Manual' ? ' active' : '')} onClick={() => setSettings({...settings, durationMode: 'Manual'})}>Manual</button>
                      </div>
                    </div>
                    <div className="wx-st-row">
                      <div className="wx-st-lbl">Marks/Points Mode <span className="wx-st-icon">ⓘ</span></div>
                      <div className="wx-seg-grp">
                        <button className={"wx-seg-btn" + (settings.marksMode === 'Auto' ? ' active' : '')} onClick={() => setSettings({...settings, marksMode: 'Auto'})}>Auto</button>
                        <button className={"wx-seg-btn" + (settings.marksMode === 'Manual' ? ' active' : '')} onClick={() => setSettings({...settings, marksMode: 'Manual'})}>Manual</button>
                      </div>
                    </div>
                    <div className="wx-st-row">
                      <div className="wx-st-lbl">Negative Marking <span className="wx-st-icon">ⓘ</span></div>
                      <div className="wx-seg-grp">
                        <button className={"wx-seg-btn" + (settings.negativeMarking ? ' active' : '')} onClick={() => setSettings({...settings, negativeMarking: true})}>Yes</button>
                        <button className={"wx-seg-btn" + (!settings.negativeMarking ? ' active' : '')} onClick={() => setSettings({...settings, negativeMarking: false})}>No</button>
                      </div>
                    </div>
                    
                    <div className="wx-field">
                      <input className="wx-inp" type="number" placeholder=" " value={settings.passPercentage} onChange={e => setSettings({...settings, passPercentage: e.target.value})} />
                      <label className="wx-lbl">Overall Pass Percentage <span>*</span></label>
                      {showErrors && settings.passPercentage === "" && <span className="wx-error">Pass percentage is required</span>}
                    </div>

                    <div className="wx-st-row" style={{marginTop: 8}}>
                      <div className="wx-st-lbl">Enable Section Cutoff/Percentage <span className="wx-st-icon">ⓘ</span></div>
                      <div className="wx-seg-grp">
                        <button className={"wx-seg-btn" + (settings.sectionCutoff ? ' active' : '')} onClick={() => setSettings({...settings, sectionCutoff: true})}>Yes</button>
                        <button className={"wx-seg-btn" + (!settings.sectionCutoff ? ' active' : '')} onClick={() => setSettings({...settings, sectionCutoff: false})}>No</button>
                      </div>
                    </div>
                  </div>

                  <div className="wx-st-col" style={{borderLeft: '1px solid var(--ex-border)', paddingLeft: 40}}>
                    <div className="wx-st-row">
                      <div className="wx-st-lbl">Shuffle Questions <span className="wx-st-icon">ⓘ</span></div>
                      <div className="wx-seg-grp">
                        <button className={"wx-seg-btn" + (settings.shuffleQuestions ? ' active' : '')} onClick={() => setSettings({...settings, shuffleQuestions: true})}>Yes</button>
                        <button className={"wx-seg-btn" + (!settings.shuffleQuestions ? ' active' : '')} onClick={() => setSettings({...settings, shuffleQuestions: false})}>No</button>
                      </div>
                    </div>
                    
                    <div className="wx-st-row">
                      <div className="wx-st-lbl">Restrict Attempts <span className="wx-st-icon">ⓘ</span></div>
                      <div className="wx-seg-grp">
                        <button className={"wx-seg-btn" + (settings.restrictAttempts ? ' active' : '')} onClick={() => setSettings({...settings, restrictAttempts: true, numberOfAttempts: ''})}>Yes</button>
                        <button className={"wx-seg-btn" + (!settings.restrictAttempts ? ' active' : '')} onClick={() => setSettings({...settings, restrictAttempts: false})}>No</button>
                      </div>
                    </div>

                    {settings.restrictAttempts && (
                      <div className="wx-field" style={{marginTop: -4, marginBottom: 8}}>
                        <input className="wx-inp" type="number" placeholder=" " value={settings.numberOfAttempts} onChange={e => setSettings({...settings, numberOfAttempts: e.target.value})} />
                        <label className="wx-lbl">Number of Attempts <span>*</span></label>
                        {showErrors && settings.numberOfAttempts === "" && <span className="wx-error">Number of attempts is required</span>}
                      </div>
                    )}

                    <div className="wx-st-row">
                      <div className="wx-st-lbl">Disable Section Navigation <span className="wx-st-icon">ⓘ</span></div>
                      <div className="wx-seg-grp">
                        <button className={"wx-seg-btn" + (settings.disableSectionNav ? ' active' : '')} onClick={() => setSettings({...settings, disableSectionNav: true})}>Yes</button>
                        <button className={"wx-seg-btn" + (!settings.disableSectionNav ? ' active' : '')} onClick={() => setSettings({...settings, disableSectionNav: false})}>No</button>
                      </div>
                    </div>
                    
                    <div className="wx-st-row">
                      <div className="wx-st-lbl">Disable Finish Button <span className="wx-st-icon">ⓘ</span></div>
                      <div className="wx-seg-grp">
                        <button className={"wx-seg-btn" + (settings.disableFinishBtn ? ' active' : '')} onClick={() => setSettings({...settings, disableFinishBtn: true})}>Yes</button>
                        <button className={"wx-seg-btn" + (!settings.disableFinishBtn ? ' active' : '')} onClick={() => setSettings({...settings, disableFinishBtn: false})}>No</button>
                      </div>
                    </div>

                    <div className="wx-st-row">
                      <div className="wx-st-lbl">Enable Question List View <span className="wx-st-icon">ⓘ</span></div>
                      <div className="wx-seg-grp">
                        <button className={"wx-seg-btn" + (settings.enableQuestionList ? ' active' : '')} onClick={() => setSettings({...settings, enableQuestionList: true})}>Yes</button>
                        <button className={"wx-seg-btn" + (!settings.enableQuestionList ? ' active' : '')} onClick={() => setSettings({...settings, enableQuestionList: false})}>No</button>
                      </div>
                    </div>

                    <div className="wx-st-row">
                      <div className="wx-st-lbl">Hide Solutions <span className="wx-st-icon">ⓘ</span></div>
                      <div className="wx-seg-grp">
                        <button className={"wx-seg-btn" + (settings.hideSolutions ? ' active' : '')} onClick={() => setSettings({...settings, hideSolutions: true})}>Yes</button>
                        <button className={"wx-seg-btn" + (!settings.hideSolutions ? ' active' : '')} onClick={() => setSettings({...settings, hideSolutions: false})}>No</button>
                      </div>
                    </div>

                    <div className="wx-st-row">
                      <div className="wx-st-lbl">Show Leaderboard <span className="wx-st-icon">ⓘ</span></div>
                      <div className="wx-seg-grp">
                        <button className={"wx-seg-btn" + (settings.showLeaderboard ? ' active' : '')} onClick={() => setSettings({...settings, showLeaderboard: true})}>Yes</button>
                        <button className={"wx-seg-btn" + (!settings.showLeaderboard ? ' active' : '')} onClick={() => setSettings({...settings, showLeaderboard: false})}>No</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="wx-form-card" style={{padding: 0, overflow: 'visible', border: 'none', background: 'transparent', boxShadow: 'none'}}>
                <div style={{display: 'grid', gridTemplateColumns: '4fr 8fr', gap: 24}}>
                  
                  {/* Filters Sidebar */}
                  <div style={{borderRight: '1px solid var(--ex-border)', paddingRight: 24}}>
                    <h3 style={{display: 'flex', alignItems: 'center', gap: 8, marginTop: 0, fontSize: '0.95rem'}}>
                      <Icon name="filter" size={16} /> Filters
                    </h3>
                    
                    <div className="wx-field" style={{marginTop: 20}}>
                      <input className="wx-inp" placeholder=" " value={qFilters.code} onChange={e => setQFilters({...qFilters, code: e.target.value})} />
                      <label className="wx-lbl">Code</label>
                    </div>

                    <div style={{marginTop: 20}}>
                      <label style={{fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: 6}}>Type</label>
                      <div style={{display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.85rem'}}>
                        {['Multiple Choice Single Answer', 'Multiple Choice Multiple Answers', 'True/False', 'Short Answer', 'Match the Following', 'Ordering/Sequence', 'Fill in the Blanks', 'Subjective', 'Multiple Choice'].map(type => (
                          <label key={type} style={{display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: '#4b5563'}}>
                            <input type="checkbox" checked={qFilters.types.includes(type)} onChange={() => handleTypeFilterToggle(type)} />
                            {type}
                          </label>
                        ))}
                      </div>
                    </div>



                    <div className="wx-field" style={{marginTop: 20}}>
                      <input className="wx-inp" placeholder=" " value={qFilters.skill} onChange={e => setQFilters({...qFilters, skill: e.target.value})} />
                      <label className="wx-lbl">Skill</label>
                    </div>

                    <div className="wx-field" style={{marginTop: 20}}>
                      <input className="wx-inp" placeholder=" " value={qFilters.topic} onChange={e => setQFilters({...qFilters, topic: e.target.value})} />
                      <label className="wx-lbl">Topic</label>
                    </div>

                    <div className="wx-field" style={{marginTop: 20}}>
                      <select className="wx-inp" style={{appearance: 'auto', paddingTop: qFilters.tag ? '18px' : '10px', paddingBottom: qFilters.tag ? '4px' : '10px'}} value={qFilters.tag} onChange={e => setQFilters({...qFilters, tag: e.target.value})}>
                        <option value="" disabled hidden></option>
                        {availableTags.map(tag => (
                          <option key={tag} value={tag}>{tag}</option>
                        ))}
                      </select>
                      <label className="wx-lbl" style={qFilters.tag ? {top: '6px', fontSize: '0.65rem', color: 'var(--ex-accent)'} : {}}>By Tag</label>
                    </div>

                    <div style={{marginTop: 20}}>
                      <label style={{fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: 6}}>Difficulty Level</label>
                      <div style={{display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.85rem'}}>
                        {['Very Easy', 'Easy', 'Medium', 'High', 'Very High'].map(diff => (
                          <label key={diff} style={{display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: '#4b5563'}}>
                            <input type="checkbox" checked={qFilters.difficulties.includes(diff)} onChange={() => handleDifficultyFilterToggle(diff)} />
                            {diff}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div style={{display: 'flex', gap: 8, marginTop: 32}}>
                      <button onClick={handleReset} style={{flex: 1, padding: '10px 0', background: '#311e64', color: '#fff', border: 'none', borderRadius: 4, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', transition: '0.2s'}}>RESET</button>
                      <button onClick={handleSearch} style={{flex: 1, padding: '10px 0', background: 'var(--ex-accent)', color: '#fff', border: 'none', borderRadius: 4, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', transition: '0.2s'}}>SEARCH</button>
                    </div>
                  </div>

                  {/* Main Content Area */}
                  <div>
                    <div style={{background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '16px 20px', borderRadius: 6, marginBottom: 20}}>
                      <h3 style={{margin: '0 0 12px 0', fontSize: '1rem'}}>Currently Viewing Questions</h3>
                      <div style={{display: 'flex', gap: 16, fontSize: '0.9rem', fontWeight: 600}}>
                        <button onClick={() => setManageQTab('view')} style={{background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: manageQTab === 'view' ? 'var(--ex-accent)' : '#6b7280'}}>View Questions ({examQuestions.length})</button>
                        <div style={{width: 1, background: '#a7f3d0'}} />
                        <button onClick={() => setManageQTab('add')} style={{background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: manageQTab === 'add' ? 'var(--ex-accent)' : '#6b7280'}}>Add Questions ({filteredBank.length})</button>
                      </div>
                    </div>

                    <div style={{background: '#f8f9fa', padding: 24, borderRadius: 6, border: '1px solid var(--ex-border)', minHeight: 400}}>
                      <p style={{fontSize: '0.85rem', color: '#6b7280', marginTop: 0, marginBottom: 20}}>
                        {manageQTab === 'view' ? `${examQuestions.length} attached items.` : questionBankLoading ? 'Loading...' : `${filteredBank.length} questions from this category.`}
                      </p>

                      {/* Single action mode only. Bulk select removed. */}

                      {/* Loading state */}
                      {manageQTab === 'add' && questionBankLoading && (
                        <div style={{textAlign: 'center', padding: 60, color: '#6b7280'}}>
                          <div style={{width: 32, height: 32, border: '3px solid #e5e7eb', borderTopColor: '#10b981', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px'}}></div>
                          <p style={{fontSize: '0.9rem', margin: 0}}>Loading questions...</p>
                        </div>
                      )}

                      {/* No category selected warning */}
                      {manageQTab === 'add' && !questionBankLoading && !form.categoryId && (
                        <div style={{textAlign: 'center', padding: 48, color: '#9ca3af'}}>
                          <div style={{fontSize: '2.5rem', marginBottom: 12}}>📂</div>
                          <p style={{fontWeight: 600, color: '#374151', margin: '0 0 6px'}}>No Category Selected</p>
                          <p style={{fontSize: '0.85rem', margin: 0}}>Please go back to Step 1 and select a Category &amp; Sub-Category to load the relevant question bank.</p>
                        </div>
                      )}

                      <div style={{display: 'flex', flexDirection: 'column', gap: 16}}>
                        {!questionBankLoading && (manageQTab === 'view' ? examQuestions : filteredBank).length === 0 && form.categoryId && (
                          <div style={{textAlign: 'center', padding: 40, color: '#9ca3af'}}>
                            {manageQTab === 'view' ? 'No questions attached yet.' : 'No questions found for this category. Create questions first in the Questions Manager.'}
                          </div>
                        )}

                        {(manageQTab === 'view' ? examQuestions : filteredBank).map(q => {
                          const isAttached = manageQTab === 'add' && examQuestions.find(eq => eq.id === q.id);
                          return (
                            <div key={q.id} style={{background: '#fff', border: '1px solid var(--ex-border)', borderRadius: 6, padding: 20, boxShadow: '0 2px 4px rgba(0,0,0,0.02)'}}>
                              <span className="ex-code-pill" style={{background: '#a7f3d0', color: '#065f46', marginBottom: 12}}>{q.code || 'CHAP 1'}</span>
                              <p style={{fontSize: '0.9rem', fontWeight: 500, lineHeight: 1.5, margin: '0 0 12px 0'}}>{q.preview}</p>
                              
                              <button style={{background: 'none', border: 'none', color: 'var(--ex-accent)', padding: 0, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', marginBottom: 16}}>View Options</button>
                              
                              <div style={{display: 'grid', gap: 8, fontSize: '0.85rem', color: '#4b5563', marginBottom: 16}}>
                                <div><strong style={{color: '#111827'}}>Question Type:</strong> {q.type}</div>
                                <div><strong style={{color: '#111827'}}>Difficulty Level:</strong> {q.difficulty || 'N/A'}</div>
                                <div><strong style={{color: '#111827'}}>Marks/Points:</strong> {q.marks} XP</div>
                                <div><strong style={{color: '#111827'}}>Attachment:</strong> No Attachment</div>
                              </div>

                              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f9fafb', padding: '10px 16px', margin: '16px -20px -20px -20px', borderTop: '1px solid var(--ex-border)', borderBottomLeftRadius: 6, borderBottomRightRadius: 6}}>
                                <span style={{fontSize: '0.75rem', background: '#e5e7eb', padding: '4px 8px', borderRadius: 4, fontFamily: 'monospace'}}>{q.id}</span>
                                
                                {manageQTab === 'view' ? (
                                  <button onClick={() => setExamQuestions(examQuestions.filter(x => x.id !== q.id))} style={{background: '#ef4444', color: '#fff', border: 'none', padding: '6px 16px', borderRadius: 4, fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer'}}>REMOVE</button>
                                ) : (
                                  isAttached ? (
                                    <button onClick={() => setExamQuestions(examQuestions.filter(x => x.id !== q.id))} style={{background: '#374151', color: '#fff', border: 'none', padding: '6px 16px', borderRadius: 4, fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer'}}>DESELECT</button>
                                  ) : (
                                    <button 
                                      onClick={() => setExamQuestions([...examQuestions, q])} 
                                      style={{background: 'var(--ex-accent)', color: '#fff', border: 'none', padding: '6px 16px', borderRadius: 4, fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer'}}
                                    >
                                      SELECT TO ADD
                                    </button>
                                  )
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
            )}

            {currentStep === 4 && (
              <div className="wx-form-card" style={{padding: 40}}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16, borderBottom: '1px solid var(--ex-border)', marginBottom: 24 }}>
                  <div>
                    <h2 style={{marginTop: 0, marginBottom: 8}}>Schedules</h2>
                    <p style={{margin: 0, fontSize: '0.85rem', color: 'var(--ex-txt-light)'}}>Set the timeline for when this exam is accessible.</p>
                  </div>
                  <button style={{background: 'var(--ex-accent)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 4, fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer'}} onClick={() => {
                    setEditScheduleIndex(null);
                    setNewScheduleData({ type: 'Fixed', startDate: '', startTime: '', endDate: '', endTime: '', gracePeriod: '5' });
                    setShowScheduleModal(true);
                  }}>NEW SCHEDULE</button>
                </div>

                <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                  <div style={{ position: 'relative', flex: 1, maxWidth: 300 }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', display: 'flex', alignItems: 'center' }}>
                      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    </span>
                    <input className="wx-inp" placeholder="Search code..." style={{ width: '100%', padding: '10px 12px 10px 36px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: '0.85rem', boxSizing: 'border-box' }} />
                  </div>
                  
                  <div style={{ position: 'relative', width: 180 }}>
                    <select className="wx-inp" style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: '0.85rem', appearance: 'auto', background: '#fff', boxSizing: 'border-box', color: '#4b5563' }}>
                      <option value="">All Types</option>
                      <option value="Fixed">Fixed</option>
                      <option value="Flexible">Flexible</option>
                    </select>
                  </div>

                  <div style={{ position: 'relative', width: 180 }}>
                    <select className="wx-inp" style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: '0.85rem', appearance: 'auto', background: '#fff', boxSizing: 'border-box', color: '#4b5563' }}>
                      <option value="">All Status</option>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div style={{border: '1px solid var(--ex-border)', borderRadius: 6}}>
                  <table style={{width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem'}}>
                    <thead style={{background: '#f9fafb', color: '#4b5563', fontWeight: 700}}>
                      <tr>
                        <th style={{padding: '12px 16px', borderBottom: '1px solid var(--ex-border)'}}>CODE</th>
                        <th style={{padding: '12px 16px', borderBottom: '1px solid var(--ex-border)'}}>TYPE</th>
                        <th style={{padding: '12px 16px', borderBottom: '1px solid var(--ex-border)'}}>STARTS AT</th>
                        <th style={{padding: '12px 16px', borderBottom: '1px solid var(--ex-border)'}}>ENDS AT</th>
                        <th style={{padding: '12px 16px', borderBottom: '1px solid var(--ex-border)'}}>STATUS</th>
                        <th style={{padding: '12px 16px', borderBottom: '1px solid var(--ex-border)'}}>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {examSchedules.length === 0 ? (
                         <tr>
                           <td colSpan={6} style={{padding: '24px', textAlign: 'center', color: '#6b7280'}}>No schedules found. Click 'NEW SCHEDULE' to add one.</td>
                         </tr>
                      ) : examSchedules.map((sch, i) => (
                         <tr key={i} style={{borderBottom: '1px solid var(--ex-border)', background: '#fff'}}>
                           <td style={{padding: '12px 16px'}}><span style={{background: '#3b82f6', color: '#fff', padding: '4px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600}}>📄 {sch.code}</span></td>
                           <td style={{padding: '12px 16px'}}>{sch.type}</td>
                           <td style={{padding: '12px 16px'}}>{sch.startDate}</td>
                           <td style={{padding: '12px 16px'}}>{sch.endDate}</td>
                           <td style={{padding: '12px 16px'}}><span style={{background: '#a7f3d0', color: '#065f46', padding: '4px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600}}>Active</span></td>
                           <td style={{padding: '12px 16px'}}>
                             <div style={{position: 'relative'}}>
                               <button onClick={() => setActiveScheduleDropdown(activeScheduleDropdown === i ? null : i)} style={{background: '#fff', border: '1px solid #d1d5db', padding: '4px 8px', borderRadius: 4, cursor: 'pointer', fontSize: '0.8rem'}}>Actions ⌄</button>
                               {activeScheduleDropdown === i && (
                                 <div style={{position: 'absolute', top: '100%', right: 0, marginTop: 4, background: '#fff', border: '1px solid var(--ex-border)', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 99, minWidth: 120, padding: '4px 0'}}>
                                   <button onClick={() => {
                                      setEditScheduleIndex(i);
                                      const startParts = (sch.startDate || '').split(' ');
                                      const sDate = startParts[0] || '';
                                      const sTime = startParts[1] || '';
                                      const endParts = (sch.endDate || '—').replace('—', '').trim().split(' ');
                                      const eDate = endParts[0] || '';
                                      const eTime = endParts[1] || '';
                                      
                                      setNewScheduleData({
                                        type: sch.type || 'Fixed',
                                        startDate: sDate,
                                        startTime: sTime,
                                        endDate: eDate,
                                        endTime: eTime,
                                        gracePeriod: sch.gracePeriod || '5'
                                      });
                                      setShowScheduleModal(true);
                                      setActiveScheduleDropdown(null);
                                   }} style={{width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '10px 16px', fontSize: '0.85rem', cursor: 'pointer', color: '#374151'}}>Edit</button>
                                   <div style={{borderTop: '1px solid var(--ex-border)', margin: '4px 0'}}></div>
                                   <button onClick={() => {
                                      setDeleteScheduleConfirm({index: i, code: sch.code});
                                      setActiveScheduleDropdown(null);
                                   }} style={{width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '10px 16px', fontSize: '0.85rem', cursor: 'pointer', color: '#ef4444'}}>Delete</button>
                                 </div>
                               )}
                             </div>
                           </td>
                         </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{background: '#f9fafb', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--ex-border)', fontSize: '0.85rem', color: '#6b7280'}}>
                    <div>ROWS PER PAGE: <select style={{background: '#9ca3af', color: '#fff', border: 'none', padding: '2px 8px', borderRadius: 4, marginLeft: 8}}><option>10</option></select></div>
                    <div>PAGE <span style={{background: '#9ca3af', color: '#fff', padding: '2px 8px', borderRadius: 4, margin: '0 8px'}}>1</span> OF 1</div>
                  </div>
                </div>
              </div>
            )}

          </div>
          
          <div style={{ background: '#fff', padding: '20px 32px', borderTop: '1px solid var(--ex-border)', display: 'flex', justifyContent: 'flex-end', gap: 12, boxShadow: '0 -4px 12px rgba(0,0,0,0.02)' }}>
            {currentStep > 1 && (
              <button className="wx-btn-save" style={{background: 'var(--ex-bg)', color: 'var(--ex-txt)'}} onClick={() => attemptNextStep(currentStep - 1)}>BACK</button>
            )}
            {currentStep === 1 && <button className="wx-btn-save" onClick={() => attemptNextStep(2)}>SAVE & PROCEED</button>}
            {currentStep === 2 && <button className="wx-btn-save" onClick={() => attemptNextStep(3)}>UPDATE / PROCEED</button>}
            {currentStep === 3 && <button className="wx-btn-save" onClick={() => attemptNextStep(4)}>SAVE & PROCEED</button>}
            {currentStep === 4 && (
               <button className="wx-btn-save" onClick={async () => {
                  if(form.status === 'Published' && examQuestions.length === 0) {
                    showToast('Please add at least one question before publishing!', 'error');
                    return;
                  }

                  const catId = form.categoryId ? Number(form.categoryId) : null;
                  const subCatId = form.subCategoryId ? Number(form.subCategoryId) : null;

                  const payload = {
                    title: form.title,
                    description: form.description || null,
                    category_id: catId,
                    subcategory_id: subCatId,
                    exam_type: examTypes.find((t: any) => t.id == form.examTypeId)?.name || null,
                    is_paid: form.isPaid,
                    is_public: form.isPublic,
                    status: form.status,
                    pass_percentage: parseFloat(settings.passPercentage) || 60,
                    negative_marking: settings.negativeMarking,
                    shuffle_questions: settings.shuffleQuestions,
                    restrict_attempts: settings.restrictAttempts,
                    number_of_attempts: settings.restrictAttempts ? (parseInt(settings.numberOfAttempts) || null) : null,
                    show_leaderboard: settings.showLeaderboard,
                    hide_solutions: settings.hideSolutions,
                    duration_mode: settings.durationMode,
                    marks_mode: settings.marksMode,
                  };

                  try {
                    let savedId: number;
                    if (editingExam && editingExam.id && !isNaN(Number(editingExam.id))) {
                      // UPDATE
                      const res = await apiFetch(`${API_BASE_URL}/exams/${editingExam.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload),
                      });
                      if (!res.ok) throw new Error((await res.json()).detail || 'Update failed');
                      savedId = editingExam.id;
                      showToast(`Exam updated as ${form.status}!`);
                    } else {
                      // CREATE
                      const res = await apiFetch(`${API_BASE_URL}/exams`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload),
                      });
                      if (!res.ok) throw new Error((await res.json()).detail || 'Create failed');
                      const created = await res.json();
                      savedId = created.id;
                      setEditingExamDbId(savedId);
                      showToast(`Exam created as ${form.status}!`);
                    }

                    // Save questions to DB if any
                    if (examQuestions.length > 0) {
                      await apiFetch(`${API_BASE_URL}/exams/${savedId}/questions`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ question_ids: examQuestions.map((q: any) => q.id), marks: 1.0, negative_marks: 0.0 }),
                      });
                    }

                    await fetchExams();
                    setModalOpen(false);
                    setEditingExam(null);
                    setEditingExamDbId(null);
                    setCurrentStep(1);
                    setForm({ title: '', categoryId: '', subCategoryId: '', examTypeId: '', isPaid: false, usePoints: false, pointsRequired: '', description: '', isPublic: true, status: 'Published' });
                    setExamQuestions([]);
                    setExamSchedules([]);

                  } catch (err: any) {
                    showToast(err.message || 'Failed to save exam', 'error');
                  }
               }}>{ editingExam ? 'UPDATE EXAM' : form.status === 'Draft' ? 'SAVE AS DRAFT' : 'PUBLISH EXAM'}</button>
            )}
          </div>
        </div>
      )}

      {/* NEW SCHEDULE MODAL - POLISHED */}
      {showScheduleModal && (() => {
        const todayStr = new Date().toISOString().split('T')[0];
        const minEndDate = newScheduleData.startDate || todayStr;
        return (
        <div style={{position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)', zIndex: 1000000, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <div style={{background: '#fff', width: 560, borderRadius: 16, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden', animation: 'exToastSlideIn 0.25s ease-out'}}>
            {/* Header */}
            <div style={{background: 'linear-gradient(135deg, #4c1d95 0%, #3730a3 100%)', padding: '20px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <div>
                <h3 style={{margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#fff'}}>{editScheduleIndex !== null ? 'Edit Schedule' : 'New Schedule'}</h3>
                <p style={{margin: '4px 0 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)'}}>Set start/end times and access rules</p>
              </div>
              <button onClick={() => setShowScheduleModal(false)} style={{background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '1rem', fontWeight: 700}}>✕</button>
            </div>

            <div style={{padding: '28px 28px 0'}}>
              {/* Type selector as cards */}
              <div style={{marginBottom: 24}}>
                <label style={{fontSize: '0.8rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 10}}>Schedule Type <span style={{color: '#ef4444'}}>*</span></label>
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12}}>
                  {(['Fixed', 'Flexible'] as const).map(t => (
                    <label key={t} style={{display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', border: `2px solid ${newScheduleData.type === t ? '#4c1d95' : '#e5e7eb'}`, borderRadius: 10, cursor: 'pointer', background: newScheduleData.type === t ? '#faf5ff' : '#fff', transition: 'all 0.15s'}}>
                      <input type="radio" checked={newScheduleData.type === t} onChange={() => setNewScheduleData({...newScheduleData, type: t})} style={{width: 16, height: 16, accentColor: '#4c1d95'}} />
                      <div>
                        <div style={{fontWeight: 700, fontSize: '0.9rem', color: newScheduleData.type === t ? '#4c1d95' : '#374151'}}>{t}</div>
                        <div style={{fontSize: '0.75rem', color: '#6b7280', marginTop: 2}}>{t === 'Fixed' ? 'Strict start & end dates' : 'Open-ended, flexible access'}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Date & Time */}
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16}}>
                <div>
                  <label style={{fontSize: '0.8rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 8}}>Start Date <span style={{color: '#ef4444'}}>*</span></label>
                  <input type="date" style={{padding: '10px 14px', border: '1.5px solid #e5e7eb', borderRadius: 8, width: '100%', boxSizing: 'border-box', fontSize: '0.9rem', outline: 'none', fontFamily: 'inherit'}} min={todayStr} value={newScheduleData.startDate} onChange={e => setNewScheduleData({...newScheduleData, startDate: e.target.value, endDate: ''})} />
                </div>
                <div>
                  <label style={{fontSize: '0.8rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 8}}>Start Time</label>
                  <input type="time" style={{padding: '10px 14px', border: '1.5px solid #e5e7eb', borderRadius: 8, width: '100%', boxSizing: 'border-box', fontSize: '0.9rem', outline: 'none', fontFamily: 'inherit'}} value={newScheduleData.startTime} onChange={e => setNewScheduleData({...newScheduleData, startTime: e.target.value})} />
                </div>
              </div>

              {newScheduleData.type === 'Fixed' && (
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16}}>
                  <div>
                    <label style={{fontSize: '0.8rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 8}}>End Date <span style={{color: '#ef4444'}}>*</span></label>
                    <input type="date" style={{padding: '10px 14px', border: '1.5px solid #e5e7eb', borderRadius: 8, width: '100%', boxSizing: 'border-box', fontSize: '0.9rem', outline: 'none', fontFamily: 'inherit'}} min={minEndDate} value={newScheduleData.endDate} onChange={e => setNewScheduleData({...newScheduleData, endDate: e.target.value})} />
                  </div>
                  <div>
                    <label style={{fontSize: '0.8rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 8}}>End Time <span style={{color: '#ef4444'}}>*</span></label>
                    <input type="time" style={{padding: '10px 14px', border: '1.5px solid #e5e7eb', borderRadius: 8, width: '100%', boxSizing: 'border-box', fontSize: '0.9rem', outline: 'none', fontFamily: 'inherit'}} value={newScheduleData.endTime} onChange={e => setNewScheduleData({...newScheduleData, endTime: e.target.value})} />
                  </div>
                </div>
              )}

              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16}}>
                <div>
                  <label style={{fontSize: '0.8rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 8}}>Grace Period (mins)</label>
                  <input type="number" min={0} style={{padding: '10px 14px', border: '1.5px solid #e5e7eb', borderRadius: 8, width: '100%', boxSizing: 'border-box', fontSize: '0.9rem', outline: 'none', fontFamily: 'inherit'}} value={newScheduleData.gracePeriod} onChange={e => setNewScheduleData({...newScheduleData, gracePeriod: e.target.value})} />
                </div>
                <div>
                  <label style={{fontSize: '0.8rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 8}}>User Group</label>
                  <select style={{padding: '10px 14px', border: '1.5px solid #e5e7eb', borderRadius: 8, width: '100%', boxSizing: 'border-box', fontSize: '0.9rem', outline: 'none', fontFamily: 'inherit', appearance: 'auto', background: '#fff', color: '#374151'}}>
                    <option>All Users</option>
                    <option>Group A</option>
                    <option>Group B</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{padding: '20px 28px', display: 'flex', gap: 12, background: '#f9fafb', borderTop: '1px solid #f1f5f9', marginTop: 8}}>
              <button onClick={() => setShowScheduleModal(false)} style={{flex: 1, padding: '12px 0', border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', borderRadius: 8, fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer'}}>Cancel</button>
              <button style={{flex: 2, padding: '12px 0', border: 'none', background: 'linear-gradient(135deg, #4c1d95, #3730a3)', color: '#fff', borderRadius: 8, fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(76,29,149,0.4)'}} onClick={() => {
                if(!newScheduleData.startDate) { showToast('Please select a Start Date', 'error'); return; }
                if(newScheduleData.type === 'Fixed' && !newScheduleData.endDate) { showToast('Please select an End Date', 'error'); return; }
                
                if (editScheduleIndex !== null) {
                  const updatedSchedules = [...examSchedules];
                  updatedSchedules[editScheduleIndex] = {
                    ...updatedSchedules[editScheduleIndex],
                    type: newScheduleData.type,
                    startDate: newScheduleData.startDate + (newScheduleData.startTime ? ' ' + newScheduleData.startTime : ''),
                    endDate: newScheduleData.endDate ? newScheduleData.endDate + (newScheduleData.endTime ? ' ' + newScheduleData.endTime : '') : '—',
                    gracePeriod: newScheduleData.gracePeriod
                  };
                  setExamSchedules(updatedSchedules);
                  showToast('Schedule updated successfully!');
                } else {
                  setExamSchedules([...examSchedules, {
                    code: 'SCH_' + Math.random().toString(36).substr(2, 6).toUpperCase(),
                    type: newScheduleData.type,
                    startDate: newScheduleData.startDate + (newScheduleData.startTime ? ' ' + newScheduleData.startTime : ''),
                    endDate: newScheduleData.endDate ? newScheduleData.endDate + (newScheduleData.endTime ? ' ' + newScheduleData.endTime : '') : '—',
                    gracePeriod: newScheduleData.gracePeriod
                  }]);
                  showToast('Schedule added successfully!');
                }
                setShowScheduleModal(false);
                setNewScheduleData({ type: 'Fixed', startDate: '', startTime: '', endDate: '', endTime: '', gracePeriod: '5' });
                setEditScheduleIndex(null);
              }}>{editScheduleIndex !== null ? 'Update Schedule' : 'Create Schedule'}</button>
            </div>
          </div>
        </div>
        );
      })()}

      {/* CUSTOM DELETE CONFIRMATION MODAL */}
      {deleteConfirm && (
        <div style={{position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999}}>
          <div style={{background: '#fff', padding: 32, borderRadius: 12, width: 400, textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'}}>
            <div style={{width: 56, height: 56, background: '#fee2e2', color: '#ef4444', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'}}>
              <Icon name="trash" size={24} />
            </div>
            <h3 style={{margin: '0 0 12px 0', fontSize: '1.25rem', color: '#111827', fontWeight: 700}}>
              {deleteConfirm.isBulk ? 'Delete Exams?' : 'Delete Exam?'}
            </h3>
            {deleteConfirm.title && (
              <span style={{background: '#e0f2fe', border: '1px solid #bae6fd', color: '#0369a1', padding: '4px 12px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600, display: 'inline-block', marginBottom: 16}}>
                {deleteConfirm.title}
              </span>
            )}
            <p style={{fontSize: '0.9rem', color: '#4b5563', lineHeight: 1.5, margin: '0 0 24px 0'}}>
              This action is <strong>permanent</strong> and cannot be undone.<br/>
              Are you sure you want to delete {deleteConfirm.isBulk ? 'these resources' : 'this resource'}?
              <br/><br/>
              This will also delete all linked questions and schedules!
            </p>
            
            <div style={{display: 'flex', gap: 12}}>
              <button 
                onClick={() => setDeleteConfirm(null)}
                style={{flex: 1, padding: '10px 0', border: '1px solid #d1d5db', background: '#fff', color: '#374151', borderRadius: 6, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'}}
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                style={{flex: 1, padding: '10px 0', border: 'none', background: '#ef4444', color: '#fff', borderRadius: 6, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'}}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SCHEDULE DELETE CONFIRMATION MODAL */}
      {deleteScheduleConfirm && (
        <div style={{position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999}}>
          <div style={{background: '#fff', padding: 32, borderRadius: 12, width: 400, textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'}}>
            <div style={{width: 56, height: 56, background: '#fee2e2', color: '#ef4444', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'}}>
              <Icon name="trash" size={24} />
            </div>
            <h3 style={{margin: '0 0 12px 0', fontSize: '1.25rem', color: '#111827', fontWeight: 700}}>
              Delete Schedule?
            </h3>
            <span style={{background: '#e0f2fe', border: '1px solid #bae6fd', color: '#0369a1', padding: '4px 12px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600, display: 'inline-block', marginBottom: 16}}>
              {deleteScheduleConfirm.code}
            </span>
            <p style={{fontSize: '0.9rem', color: '#4b5563', lineHeight: 1.5, margin: '0 0 24px 0'}}>
              This action is <strong>permanent</strong> and cannot be undone.<br/>
              Are you sure you want to delete this schedule?
            </p>
            
            <div style={{display: 'flex', gap: 12}}>
              <button 
                onClick={() => setDeleteScheduleConfirm(null)}
                style={{flex: 1, padding: '10px 0', border: '1px solid #d1d5db', background: '#fff', color: '#374151', borderRadius: 6, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'}}
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  const updated = [...examSchedules];
                  updated.splice(deleteScheduleConfirm.index, 1);
                  setExamSchedules(updated);
                  showToast('Schedule deleted successfully!');
                  setDeleteScheduleConfirm(null);
                }}
                style={{flex: 1, padding: '10px 0', border: 'none', background: '#ef4444', color: '#fff', borderRadius: 6, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'}}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}



    </>
  );
}
