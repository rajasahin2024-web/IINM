"use client";
import { apiFetch } from "@/lib/apiFetch";
import { BASE_URL } from "@/lib/config";
import React, { useState, useEffect } from "react";
import { useToast } from "./ToastProvider";
import { Icon } from "../icons";

interface FomoTheme {
  is_active: boolean;
  position: string;
  bg_color: string;
  text_color: string;
  gradient_style: string;
  use_gradient: boolean;
  border_radius: string;
  animation_type: string;
  display_duration: number;
  interval_duration: number;
}

interface FomoEvent {
  id: string;
  student_name: string;
  image_url: string;
  action: string; // "purchased" | "certified" | "joined"
  course_name: string;
  location: string;
  time_text: string;
}

interface FomoSettingsData {
  theme: FomoTheme;
  events: FomoEvent[];
}

const GRADIENT_PRESETS = [
  {
    name: "Midnight Tech (Navy)",
    bg: "#0a1628",
    text: "#ffffff",
    gradient: "linear-gradient(135deg, #0a1628 0%, #1a2942 100%)",
    use_gradient: true,
  },
  {
    name: "Cyber Neon Green",
    bg: "#020f08",
    text: "#00ff66",
    gradient: "linear-gradient(135deg, #020f08 0%, #062113 100%)",
    use_gradient: true,
  },
  {
    name: "Crimson Fire",
    bg: "#e63946",
    text: "#ffffff",
    gradient: "linear-gradient(135deg, #e63946 0%, #a21a24 100%)",
    use_gradient: true,
  },
  {
    name: "Royal Gold",
    bg: "#111111",
    text: "#f59e0b",
    gradient: "linear-gradient(135deg, #111111 0%, #2a2515 100%)",
    use_gradient: true,
  },
  {
    name: "Subtle Glass Light",
    bg: "#ffffff",
    text: "#0f172a",
    gradient: "linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)",
    use_gradient: true,
  },
];

// Rich Premium Inline Style Constants matching the LMS theme
const s: any = {
  container: {
    padding: "24px",
    width: "100%",
    maxWidth: "100%",
    margin: 0,
    fontFamily: "'Inter', -apple-system, sans-serif",
    boxSizing: "border-box" as const,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap" as const,
    gap: "16px",
    marginBottom: "28px",
    borderBottom: "1px solid #f1f5f9",
    paddingBottom: "20px",
  },
  title: {
    fontSize: "22px",
    fontWeight: 800,
    color: "#0f172a",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    margin: 0,
  },
  subtitle: {
    fontSize: "13px",
    color: "#64748b",
    marginTop: "4px",
    margin: "4px 0 0 0",
  },
  tabsContainer: {
    display: "flex",
    background: "#f1f5f9",
    padding: "4px",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    gap: "4px",
  },
  tabBtn: (active: boolean) => ({
    padding: "8px 16px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: 600,
    border: "none",
    cursor: "pointer",
    background: active ? "#ffffff" : "transparent",
    color: active ? "#0f172a" : "#64748b",
    boxShadow: active ? "0 2px 4px rgba(0,0,0,0.06)" : "none",
    transition: "all 0.2s ease",
  }),
  layoutGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(12, 1fr)",
    gap: "28px",
  },
  mainCol: {
    gridColumn: "span 8",
    display: "flex",
    flexDirection: "column" as const,
    gap: "24px",
  },
  sideCol: {
    gridColumn: "span 4",
  },
  card: {
    background: "#ffffff",
    borderRadius: "16px",
    padding: "24px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 4px 10px rgba(0,0,0,0.03)",
    boxSizing: "border-box" as const,
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid #f1f5f9",
    paddingBottom: "16px",
    marginBottom: "20px",
  },
  cardTitle: {
    fontSize: "15px",
    fontWeight: 700,
    color: "#0f172a",
    margin: 0,
  },
  toggleLabel: {
    display: "flex",
    alignItems: "center",
    cursor: "pointer",
    gap: "10px",
  },
  toggleSwitch: (checked: boolean) => ({
    width: "44px",
    height: "24px",
    background: checked ? "#10b981" : "#cbd5e1",
    borderRadius: "100px",
    position: "relative" as const,
    transition: "background-color 0.2s ease",
  }),
  togglePin: (checked: boolean) => ({
    width: "18px",
    height: "18px",
    background: "#ffffff",
    borderRadius: "50%",
    position: "absolute" as const,
    top: "3px",
    left: checked ? "23px" : "3px",
    transition: "left 0.2s ease",
    boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
  }),
  grid2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "20px",
    marginBottom: "20px",
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "6px",
  },
  label: {
    fontSize: "11px",
    fontWeight: 700,
    textTransform: "uppercase" as const,
    color: "#475569",
    letterSpacing: "0.5px",
    margin: 0,
  },
  input: {
    width: "100%",
    padding: "11px 14px",
    borderRadius: "10px",
    border: "1.5px solid #cbd5e1",
    fontSize: "13.5px",
    color: "#0f172a",
    outline: "none",
    background: "#ffffff",
    boxSizing: "border-box" as const,
    transition: "all 0.2s ease",
  },
  select: {
    width: "100%",
    padding: "11px 14px",
    borderRadius: "10px",
    border: "1.5px solid #cbd5e1",
    fontSize: "13.5px",
    color: "#0f172a",
    outline: "none",
    background: "#ffffff",
    boxSizing: "border-box" as const,
    cursor: "pointer",
  },
  btnGroup: {
    display: "flex",
    gap: "12px",
  },
  toggleBtn: (active: boolean) => ({
    flex: 1,
    padding: "11px 14px",
    borderRadius: "10px",
    fontSize: "13px",
    fontWeight: 600,
    border: active ? "1.5px solid #0284c7" : "1.5px solid #cbd5e1",
    background: active ? "#f0f9ff" : "#ffffff",
    color: active ? "#0369a1" : "#475569",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    transition: "all 0.2s ease",
  }),
  sliderHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "6px",
  },
  sliderVal: {
    fontSize: "13px",
    fontWeight: 700,
    color: "#0284c7",
  },
  sliderInput: {
    width: "100%",
    height: "6px",
    borderRadius: "100px",
    background: "#e2e8f0",
    outline: "none",
    cursor: "pointer",
    accentColor: "#0284c7",
  },
  infoText: {
    fontSize: "11px",
    color: "#94a3b8",
    marginTop: "4px",
    lineHeight: "1.4",
  },
  presetGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
    gap: "16px",
    marginTop: "12px",
  },
  presetCard: {
    border: "1.5px solid #e2e8f0",
    borderRadius: "12px",
    padding: "10px",
    background: "#ffffff",
    cursor: "pointer",
    textAlign: "left" as const,
    transition: "all 0.2s ease",
    outline: "none",
  },
  presetHeader: (gradient: string) => ({
    background: gradient,
    height: "50px",
    borderRadius: "8px",
    width: "100%",
    marginBottom: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid rgba(0,0,0,0.04)",
  }),
  colorGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "16px",
    marginTop: "20px",
    paddingTop: "20px",
    borderTop: "1px solid #f1f5f9",
  },
  colorField: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  colorPicker: {
    width: "36px",
    height: "36px",
    padding: 0,
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    cursor: "pointer",
    overflow: "hidden",
  },
  btnSave: {
    background: "#10b981",
    color: "#ffffff",
    border: "none",
    borderRadius: "12px",
    padding: "14px 28px",
    fontSize: "13.5px",
    fontWeight: 700,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    boxShadow: "0 4px 12px rgba(16, 185, 129, 0.15)",
    transition: "all 0.2s ease",
    alignSelf: "flex-end",
  },
  actionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
  },
  btnAddNew: {
    background: "#0284c7",
    color: "#ffffff",
    border: "none",
    borderRadius: "10px",
    padding: "9px 15px",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    boxShadow: "0 2px 6px rgba(2, 132, 199, 0.15)",
    transition: "all 0.2s ease",
  },
  emptyBox: {
    border: "2px dashed #cbd5e1",
    borderRadius: "16px",
    padding: "48px",
    textAlign: "center" as const,
  },
  emptyIcon: {
    width: "48px",
    height: "48px",
    background: "#f1f5f9",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 12px auto",
  },
  eventListGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
  },
  eventCard: {
    border: "1px solid #cbd5e1",
    borderRadius: "14px",
    padding: "14px",
    background: "#f8fafc",
    display: "flex",
    gap: "12px",
    boxSizing: "border-box" as const,
  },
  avatar: {
    width: "44px",
    height: "44px",
    borderRadius: "50%",
    objectFit: "cover" as const,
    border: "1px solid #cbd5e1",
    background: "#ffffff",
  },
  eventDetail: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column" as const,
    justifyContent: "space-between",
  },
  eventHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "8px",
  },
  studentName: {
    fontSize: "13px",
    fontWeight: 700,
    color: "#0f172a",
    margin: 0,
    whiteSpace: "nowrap" as const,
    overflow: "hidden" as const,
    textOverflow: "ellipsis" as const,
  },
  locationBadge: {
    fontSize: "9px",
    fontWeight: 700,
    color: "#64748b",
    background: "#e2e8f0",
    padding: "2px 6px",
    borderRadius: "4px",
    textTransform: "uppercase" as const,
  },
  eventBodyText: {
    fontSize: "12.5px",
    color: "#475569",
    margin: "6px 0 10px 0",
    lineHeight: "1.3",
  },
  eventFooterRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderTop: "1px solid #e2e8f0",
    paddingTop: "10px",
    marginTop: "4px",
  },
  timeText: {
    fontSize: "10px",
    color: "#94a3b8",
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  actionBtns: {
    display: "flex",
    gap: "6px",
  },
  roundBtn: (red: boolean) => ({
    width: "26px",
    height: "26px",
    borderRadius: "6px",
    border: "1px solid #e2e8f0",
    background: "#ffffff",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: red ? "#ef4444" : "#64748b",
    transition: "all 0.15s ease",
  }),
  stickyCol: {
    position: "sticky" as const,
    top: "84px",
    display: "flex",
    flexDirection: "column" as const,
    gap: "24px",
  },
  mockWindow: {
    border: "1px solid #cbd5e1",
    borderRadius: "12px",
    background: "#f1f5f9",
    height: "230px",
    padding: "24px",
    display: "flex",
    flexDirection: "column" as const,
    justifyContent: "flex-end",
    position: "relative" as const,
    overflow: "hidden" as const,
    boxShadow: "inset 0 2px 4px rgba(0,0,0,0.03)",
  },
  mockBadge: {
    position: "absolute" as const,
    top: "12px",
    left: "12px",
    background: "rgba(255, 255, 255, 0.9)",
    border: "1px solid #e2e8f0",
    borderRadius: "6px",
    padding: "3px 8px",
    fontSize: "8.5px",
    fontWeight: 700,
    color: "#64748b",
    textTransform: "uppercase" as const,
    letterSpacing: "0.3px",
  },
  mockNotification: (theme: FomoTheme) => {
    const isDarkTheme = theme.bg_color !== "#ffffff";
    const borderGlow = isDarkTheme 
      ? `1.5px solid ${theme.text_color === "#00ff66" ? "#00ff66" : "rgba(255, 255, 255, 0.15)"}`
      : `1.5px solid #cbd5e1`;
    return {
      background: theme.use_gradient ? theme.gradient_style : theme.bg_color,
      color: theme.text_color,
      borderRadius: theme.border_radius === "round" ? "12px" : "4px",
      alignSelf: theme.position === "bottom-left" ? ("flex-start" as const) : ("flex-end" as const),
      border: borderGlow,
      boxShadow: "0 10px 25px rgba(0, 0, 0, 0.15), 0 4px 12px rgba(0, 0, 0, 0.08)",
      padding: "10px 12px",
      maxWidth: "250px",
      width: "100%",
      display: "flex",
      alignItems: "center",
      gap: "10px",
      boxSizing: "border-box" as const,
      backdropFilter: "blur(14px)",
      WebkitBackdropFilter: "blur(14px)",
      transition: "all 0.3s ease",
    };
  },
  avatarPreview: {
    width: "30px",
    height: "30px",
    borderRadius: "50%",
    border: "1px solid rgba(255,255,255,0.2)",
    objectFit: "cover" as const,
    flexShrink: 0,
    background: "rgba(255,255,255,0.1)",
  },
  mockContent: {
    flex: 1,
    minWidth: 0,
  },
  mockNameRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "4px",
  },
  mockName: {
    fontSize: "11px",
    fontWeight: 700,
    margin: 0,
    overflow: "hidden" as const,
    textOverflow: "ellipsis" as const,
    whiteSpace: "nowrap" as const,
  },
  mockLoc: {
    fontSize: "8.5px",
    fontWeight: 600,
    opacity: 0.8,
  },
  mockBody: {
    fontSize: "10px",
    margin: "4px 0 6px 0",
    lineHeight: "1.3",
    opacity: 0.95,
  },
  mockTime: {
    fontSize: "8px",
    opacity: 0.75,
    display: "flex",
    alignItems: "center",
    gap: "3px",
    margin: 0,
  },
  sideInfo: {
    background: "#f8fafc",
    borderRadius: "12px",
    padding: "16px",
    border: "1px solid #e2e8f0",
  },
  sideInfoTitle: {
    fontSize: "11px",
    fontWeight: 700,
    textTransform: "uppercase" as const,
    color: "#64748b",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    margin: "0 0 8px 0",
  },
  sideInfoText: {
    fontSize: "12px",
    color: "#64748b",
    lineHeight: "1.5",
    margin: 0,
  },
  // Modal layout
  modalOverlay: {
    position: "fixed" as const,
    inset: 0,
    background: "rgba(15, 23, 42, 0.5)",
    backdropFilter: "blur(4px)",
    zIndex: 9999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "16px",
  },
  modalBox: {
    background: "#ffffff",
    borderRadius: "16px",
    width: "100%",
    maxWidth: "480px",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    overflow: "hidden",
  },
  modalHeader: {
    padding: "16px 20px",
    borderBottom: "1px solid #f1f5f9",
    background: "#f8fafc",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: "14px",
    fontWeight: 700,
    color: "#0f172a",
    margin: 0,
  },
  closeBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#94a3b8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "4px",
  },
  modalBody: {
    padding: "20px",
    display: "flex",
    flexDirection: "column" as const,
    gap: "16px",
  },
  modalFooter: {
    padding: "16px 20px",
    borderTop: "1px solid #f1f5f9",
    background: "#f8fafc",
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
  },
  btnCancel: {
    background: "#ffffff",
    border: "1px solid #cbd5e1",
    color: "#475569",
    borderRadius: "8px",
    padding: "8px 16px",
    fontSize: "12.5px",
    fontWeight: 600,
    cursor: "pointer",
  },
  btnSubmit: {
    background: "#0284c7",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    padding: "8px 18px",
    fontSize: "12.5px",
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: "0 2px 4px rgba(2, 132, 199, 0.1)",
  },
  rowGap: {
    display: "flex",
    gap: "16px",
  },
};

export default function FomoSettingsForm() {
  const { showToast } = useToast();
  const toast = {
    success: (msg: string) => showToast(msg, "success"),
    error: (msg: string) => showToast(msg, "error"),
  };

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"settings" | "events">("settings");

  const [theme, setTheme] = useState<FomoTheme>({
    is_active: true,
    position: "bottom-left",
    bg_color: "#0a1628",
    text_color: "#ffffff",
    gradient_style: "linear-gradient(135deg, #0a1628 0%, #1a2942 100%)",
    use_gradient: true,
    border_radius: "round",
    animation_type: "slide-fade",
    display_duration: 6,
    interval_duration: 12,
  });

  const [events, setEvents] = useState<FomoEvent[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<FomoEvent | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Form states for new/edit event
  const [formName, setFormName] = useState("");
  const [formAction, setFormAction] = useState("purchased");
  const [formCourse, setFormCourse] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formTime, setFormTime] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");

  // Input Focus States for Styles
  const [focusedField, setFocusedField] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await apiFetch(`${BASE_URL}/api/settings/fomo?t=${Date.now()}`, {
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        const data: FomoSettingsData = await res.json();
        setTheme(data.theme);
        setEvents(data.events || []);
      }
    } catch (err) {
      console.error("Failed to fetch fomo settings", err);
      toast.error("Failed to load FOMO settings.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: FomoSettingsData = {
        theme,
        events,
      };
      const res = await apiFetch(`${BASE_URL}/api/settings/fomo`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast.success("FOMO settings saved successfully!");
      } else {
        const errData = await res.json();
        toast.error(errData.detail || "Failed to save settings.");
      }
    } catch (err) {
      console.error("Error saving settings:", err);
      toast.error("Network error while saving settings.");
    } finally {
      setSaving(false);
    }
  };

  const handlePresetSelect = (preset: typeof GRADIENT_PRESETS[0]) => {
    setTheme((prev) => ({
      ...prev,
      bg_color: preset.bg,
      text_color: preset.text,
      gradient_style: preset.gradient,
      use_gradient: preset.use_gradient,
    }));
    toast.success(`Theme preset set!`);
  };

  const handleOpenAddModal = () => {
    setEditingEvent(null);
    setFormName("");
    setFormAction("purchased");
    setFormCourse("");
    setFormLocation("");
    setFormTime("Just now");
    setFormImageUrl("/female-teacher.png");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (event: FomoEvent) => {
    setEditingEvent(event);
    setFormName(event.student_name);
    setFormAction(event.action);
    setFormCourse(event.course_name);
    setFormLocation(event.location);
    setFormTime(event.time_text);
    setFormImageUrl(event.image_url || "/female-teacher.png");
    setIsModalOpen(true);
  };

  const handleDeleteEvent = (id: string) => {
    if (confirm("Are you sure you want to delete this event?")) {
      const updated = events.filter((e) => e.id !== id);
      setEvents(updated);
      saveEventsList(updated);
    }
  };

  const saveEventsList = async (updatedEvents: FomoEvent[]) => {
    try {
      const payload: FomoSettingsData = {
        theme,
        events: updatedEvents,
      };
      const res = await apiFetch(`${BASE_URL}/api/settings/fomo`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast.success("Events updated successfully!");
      }
    } catch (err) {
      console.error("Error auto-saving events:", err);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await apiFetch(`${BASE_URL}/api/settings/site/upload`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setFormImageUrl(data.url);
        toast.success("Student picture uploaded!");
      } else {
        toast.error("Failed to upload image.");
      }
    } catch (err) {
      console.error("Error uploading image:", err);
      toast.error("Error uploading image.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formCourse || !formLocation) {
      toast.error("Please fill in all required fields.");
      return;
    }

    let updatedList: FomoEvent[] = [];

    if (editingEvent) {
      updatedList = events.map((ev) =>
        ev.id === editingEvent.id
          ? {
              ...ev,
              student_name: formName,
              action: formAction,
              course_name: formCourse,
              location: formLocation,
              time_text: formTime,
              image_url: formImageUrl,
            }
          : ev
      );
      toast.success("Event updated!");
    } else {
      const newEvent: FomoEvent = {
        id: Date.now().toString(),
        student_name: formName,
        action: formAction,
        course_name: formCourse,
        location: formLocation,
        time_text: formTime,
        image_url: formImageUrl || "/female-teacher.png",
      };
      updatedList = [newEvent, ...events];
      toast.success("New event added!");
    }

    setEvents(updatedList);
    saveEventsList(updatedList);
    setIsModalOpen(false);
  };

  if (loading) {
    return (
      <div style={{ padding: "48px", textAlign: "center" }}>
        <div style={{ fontSize: "15px", fontWeight: 600, color: "#64748b" }}>
          Loading FOMO System Settings...
        </div>
      </div>
    );
  }

  const previewEvent: FomoEvent = events[0] || {
    id: "preview",
    student_name: "Rahul Das",
    image_url: "/female-teacher.png",
    action: "purchased",
    course_name: "Generative AI Masterclass",
    location: "Kolkata, WB",
    time_text: "2 minutes ago",
  };

  return (
    <div style={s.container}>
      {/* ── Title Banner ── */}
      <div style={s.header}>
        <div>
          <h1 style={s.title}>
            <Icon name="bell" size={22} color="#e63946" />
            FOMO Notification Settings
          </h1>
          <p style={s.subtitle}>
            Display live academic and purchase alert popups in the bottom corners of your public site.
          </p>
        </div>

        {/* ── Tabs Toggle ── */}
        <div style={s.tabsContainer}>
          <button
            type="button"
            onClick={() => setActiveTab("settings")}
            style={s.tabBtn(activeTab === "settings")}
          >
            Theme & Timing
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("events")}
            style={s.tabBtn(activeTab === "events")}
          >
            Student Events ({events.length})
          </button>
        </div>
      </div>

      <div style={s.layoutGrid}>
        {/* ── Left Settings Form or Event List ── */}
        <div style={s.mainCol}>
          {activeTab === "settings" ? (
            <form onSubmit={handleSaveSettings} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              {/* Card 1: Configuration */}
              <div style={s.card}>
                <div style={s.cardHeader}>
                  <h3 style={s.cardTitle}>Global Theme Configuration</h3>
                  <label style={s.toggleLabel}>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "#475569" }}>
                      {theme.is_active ? "System Enabled" : "System Disabled"}
                    </span>
                    <div
                      onClick={() => setTheme({ ...theme, is_active: !theme.is_active })}
                      style={s.toggleSwitch(theme.is_active)}
                    >
                      <div style={s.togglePin(theme.is_active)} />
                    </div>
                  </label>
                </div>

                <div style={s.grid2}>
                  {/* Position */}
                  <div style={s.fieldGroup}>
                    <label style={s.label}>Screen Corner Position</label>
                    <select
                      value={theme.position}
                      onChange={(e) => setTheme({ ...theme, position: e.target.value })}
                      style={s.select}
                    >
                      <option value="bottom-left">Bottom Left Corner</option>
                      <option value="bottom-right">Bottom Right Corner</option>
                    </select>
                  </div>

                  {/* Animation Type */}
                  <div style={s.fieldGroup}>
                    <label style={s.label}>Popup Animation Style</label>
                    <select
                      value={theme.animation_type}
                      onChange={(e) => setTheme({ ...theme, animation_type: e.target.value })}
                      style={s.select}
                    >
                      <option value="slide-fade">Slide & Fade-in (Bottom Up)</option>
                      <option value="fade">Pure Fade-in</option>
                      <option value="zoom">Scale Zoom-in</option>
                      <option value="bounce">Bouncy Slide-in</option>
                    </select>
                  </div>
                </div>

                <div style={s.grid2}>
                  {/* Border Radius */}
                  <div style={s.fieldGroup}>
                    <label style={s.label}>Border Shape</label>
                    <div style={s.btnGroup}>
                      <button
                        type="button"
                        onClick={() => setTheme({ ...theme, border_radius: "round" })}
                        style={s.toggleBtn(theme.border_radius === "round")}
                      >
                        Capsule Round
                      </button>
                      <button
                        type="button"
                        onClick={() => setTheme({ ...theme, border_radius: "square" })}
                        style={s.toggleBtn(theme.border_radius === "square")}
                      >
                        Square Card
                      </button>
                    </div>
                  </div>

                  {/* Toggle Gradient */}
                  <div style={s.fieldGroup}>
                    <label style={s.label}>Background Styling</label>
                    <div style={s.btnGroup}>
                      <button
                        type="button"
                        onClick={() => setTheme({ ...theme, use_gradient: false })}
                        style={s.toggleBtn(!theme.use_gradient)}
                      >
                        Solid Background
                      </button>
                      <button
                        type="button"
                        onClick={() => setTheme({ ...theme, use_gradient: true })}
                        style={s.toggleBtn(theme.use_gradient)}
                      >
                        Gradient Background
                      </button>
                    </div>
                  </div>
                </div>

                {/* Duration settings */}
                <div style={{ ...s.grid2, borderTop: "1px solid #f1f5f9", paddingTop: "20px", marginTop: "10px" }}>
                  <div style={s.fieldGroup}>
                    <div style={s.sliderHeader}>
                      <label style={s.label}>Display Duration</label>
                      <span style={s.sliderVal}>{theme.display_duration} seconds</span>
                    </div>
                    <input
                      type="range"
                      min="3"
                      max="15"
                      value={theme.display_duration}
                      onChange={(e) => setTheme({ ...theme, display_duration: parseInt(e.target.value) })}
                      style={s.sliderInput}
                    />
                    <span style={s.infoText}>How long each popup stays active on screen before sliding out.</span>
                  </div>

                  <div style={s.fieldGroup}>
                    <div style={s.sliderHeader}>
                      <label style={s.label}>Interval Timer</label>
                      <span style={s.sliderVal}>{theme.interval_duration} seconds</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="45"
                      value={theme.interval_duration}
                      onChange={(e) => setTheme({ ...theme, interval_duration: parseInt(e.target.value) })}
                      style={s.sliderInput}
                    />
                    <span style={s.infoText}>Minimum waiting time before triggered random displays start the next alert.</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Preset Colors */}
              <div style={s.card}>
                <h3 style={s.cardTitle}>Select Visual Theme Preset</h3>
                <p style={{ ...s.subtitle, marginBottom: "16px" }}>
                  Instantly load designer setups specifically suited for dark tech or brand profiles.
                </p>
                
                <div style={s.presetGrid}>
                  {GRADIENT_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => handlePresetSelect(preset)}
                      style={s.presetCard}
                    >
                      <div style={s.presetHeader(preset.gradient)}>
                        <span style={{ color: preset.text, fontSize: "10.5px", fontWeight: 800 }}>
                          Alert Sample
                        </span>
                      </div>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: "#334155" }}>
                        {preset.name}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Custom Color Editor */}
                <div style={s.colorGrid}>
                  <div style={s.fieldGroup}>
                    <label style={s.label}>Solid Background</label>
                    <div style={s.colorField}>
                      <input
                        type="color"
                        value={theme.bg_color}
                        onChange={(e) => setTheme({ ...theme, bg_color: e.target.value })}
                        style={s.colorPicker}
                      />
                      <input
                        type="text"
                        value={theme.bg_color}
                        onChange={(e) => setTheme({ ...theme, bg_color: e.target.value })}
                        style={{ ...s.input, padding: "8px 12px" }}
                      />
                    </div>
                  </div>

                  <div style={s.fieldGroup}>
                    <label style={s.label}>Text & Icon Color</label>
                    <div style={s.colorField}>
                      <input
                        type="color"
                        value={theme.text_color}
                        onChange={(e) => setTheme({ ...theme, text_color: e.target.value })}
                        style={s.colorPicker}
                      />
                      <input
                        type="text"
                        value={theme.text_color}
                        onChange={(e) => setTheme({ ...theme, text_color: e.target.value })}
                        style={{ ...s.input, padding: "8px 12px" }}
                      />
                    </div>
                  </div>

                  <div style={s.fieldGroup}>
                    <label style={s.label}>Custom Gradient CSS</label>
                    <input
                      type="text"
                      disabled={!theme.use_gradient}
                      value={theme.gradient_style}
                      onChange={(e) => setTheme({ ...theme, gradient_style: e.target.value })}
                      style={{
                        ...s.input,
                        background: theme.use_gradient ? "#ffffff" : "#f1f5f9",
                        color: theme.use_gradient ? "#0f172a" : "#94a3b8",
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <button
                type="submit"
                disabled={saving}
                style={s.btnSave}
              >
                <Icon name="save" size={15} />
                {saving ? "Saving Changes..." : "Save Config Settings"}
              </button>
            </form>
          ) : (
            /* Events CRUD list */
            <div style={s.card}>
              <div style={s.actionHeader}>
                <div>
                  <h3 style={s.cardTitle}>FOMO Student Alert List</h3>
                  <p style={s.subtitle}>
                    Manage the notifications that will pop up randomly on your homepage.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenAddModal}
                  style={s.btnAddNew}
                >
                  <Icon name="plus" size={13} />
                  Add Student Alert
                </button>
              </div>

              {/* Events list */}
              {events.length === 0 ? (
                <div style={s.emptyBox}>
                  <div style={s.emptyIcon}>
                    <Icon name="bell" size={20} color="#94a3b8" />
                  </div>
                  <h4 style={{ fontSize: "14px", fontWeight: 700, color: "#334155", margin: "0 0 4px 0" }}>
                    No Events Created Yet
                  </h4>
                  <p style={{ ...s.subtitle, margin: "0 0 16px 0" }}>
                    Create alerts manually so visitors can see updates when courses are purchased or completed.
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenAddModal}
                    style={{ ...s.btnAddNew, background: "#ffffff", color: "#0284c7", border: "1.5px solid #0284c7", boxShadow: "none" }}
                  >
                    Create First Alert
                  </button>
                </div>
              ) : (
                <div style={s.eventListGrid}>
                  {events.map((ev) => (
                    <div key={ev.id} style={s.eventCard}>
                      <img
                        src={ev.image_url && ev.image_url.startsWith("/uploads/") ? `${BASE_URL}${ev.image_url}` : (ev.image_url || "/female-teacher.png")}
                        alt={ev.student_name}
                        style={s.avatar}
                      />
                      <div style={s.eventDetail}>
                        <div style={s.eventHeaderRow}>
                          <h4 style={s.studentName}>{ev.student_name}</h4>
                          <span style={s.locationBadge}>{ev.location}</span>
                        </div>
                        <p style={s.eventBodyText}>
                          <span style={{ fontWeight: 700, color: "#0284c7", textTransform: "capitalize" }}>
                            {ev.action}{" "}
                          </span>
                          <span>{ev.course_name}</span>
                        </p>
                        <div style={s.eventFooterRow}>
                          <span style={s.timeText}>
                            <Icon name="clock" size={10} /> {ev.time_text}
                          </span>
                          <div style={s.actionBtns}>
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(ev)}
                              style={s.roundBtn(false)}
                              title="Edit Alert"
                            >
                              <Icon name="edit" size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteEvent(ev.id)}
                              style={s.roundBtn(true)}
                              title="Delete Alert"
                            >
                              <Icon name="trash" size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Right Side Real-time Preview ── */}
        <div style={s.sideCol}>
          <div style={s.stickyCol}>
            <div style={s.card}>
              <h3 style={{ ...s.cardTitle, marginBottom: "4px" }}>Real-time Visual Preview</h3>
              <p style={{ ...s.subtitle, marginBottom: "20px" }}>
                Shows exact scaling, gradients, and border curvatures matching current settings.
              </p>

              {/* Simulated Desktop Preview box */}
              <div style={s.mockWindow}>
                <div style={s.mockBadge}>Simulated Homepage</div>

                {/* Simulated notification card */}
                <div style={s.mockNotification(theme)}>
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <img
                      src={previewEvent.image_url && previewEvent.image_url.startsWith("/uploads/") ? `${BASE_URL}${previewEvent.image_url}` : (previewEvent.image_url || "/female-teacher.png")}
                      alt={previewEvent.student_name}
                      style={s.avatarPreview}
                    />
                    <span
                      style={{
                        position: "absolute",
                        bottom: "-2px",
                        right: "-2px",
                        background: previewEvent.action === "certified" ? "#f59e0b" : "#10b981",
                        border: `1px solid ${theme.bg_color === "#ffffff" ? "#ffffff" : "#0a1628"}`,
                        borderRadius: "50%",
                        width: "12px",
                        height: "12px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "7px",
                        color: "#ffffff",
                        fontWeight: "bold"
                      }}
                    >
                      {previewEvent.action === "certified" ? "✓" : "⚡"}
                    </span>
                  </div>
                  <div style={s.mockContent}>
                    <div style={s.mockNameRow}>
                      <span style={{ display: "flex", alignItems: "center", gap: "4px", minWidth: 0, flex: 1 }}>
                        <span style={{
                          width: "5px",
                          height: "5px",
                          background: "#10b981",
                          borderRadius: "50%",
                          display: "inline-block",
                          flexShrink: 0,
                        }} />
                        <p style={{ ...s.mockName, color: theme.text_color }}>
                          {previewEvent.student_name}
                        </p>
                      </span>
                      <span style={{ 
                        ...s.mockLoc, 
                        color: theme.text_color, 
                        fontSize: "8px", 
                        textTransform: "uppercase", 
                        fontWeight: "bold", 
                        background: theme.bg_color === "#ffffff" ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.15)", 
                        padding: "2px 5px", 
                        borderRadius: "3px",
                        marginLeft: "6px"
                      }}>
                        {previewEvent.location}
                      </span>
                    </div>
                    <p style={{ ...s.mockBody, color: theme.text_color }}>
                      <span style={{ fontWeight: 800, textDecoration: "underline", textTransform: "capitalize" }}>
                        {previewEvent.action}
                      </span>{" "}
                      {previewEvent.course_name}
                    </p>
                    <p style={{ ...s.mockTime, color: theme.text_color }}>
                      <Icon name="clock" size={8} /> {previewEvent.time_text}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div style={s.sideInfo}>
              <span style={s.sideInfoTitle}>
                <Icon name="info" size={11} />
                Timing Cycle Info
              </span>
              <p style={s.sideInfoText}>
                An alert displays for <b>{theme.display_duration} seconds</b>, fades out, and then the system waits
                for an automated interval of <b>{theme.interval_duration} seconds</b> (plus a randomized micro-delay)
                before showing the next student event.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Event CRUD Modal ── */}
      {isModalOpen && (
        <div style={s.modalOverlay}>
          <div style={s.modalBox}>
            {/* Header */}
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>
                {editingEvent ? "Edit Student Alert" : "Add New Student Alert"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={s.closeBtn}
              >
                <Icon name="x" size={16} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveEvent}>
              <div style={s.modalBody}>
                {/* Student Name */}
                <div style={s.fieldGroup}>
                  <label style={s.label}>Student Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Das"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    style={s.input}
                  />
                </div>

                <div style={s.rowGap}>
                  {/* Action Type */}
                  <div style={{ ...s.fieldGroup, flex: 1 }}>
                    <label style={s.label}>Action *</label>
                    <select
                      value={formAction}
                      onChange={(e) => setFormAction(e.target.value)}
                      style={s.select}
                    >
                      <option value="purchased">Purchased</option>
                      <option value="certified">Certified</option>
                      <option value="joined">Joined</option>
                    </select>
                  </div>

                  {/* Location */}
                  <div style={{ ...s.fieldGroup, flex: 1 }}>
                    <label style={s.label}>Location *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Kolkata, WB"
                      value={formLocation}
                      onChange={(e) => setFormLocation(e.target.value)}
                      style={s.input}
                    />
                  </div>
                </div>

                {/* Course Name */}
                <div style={s.fieldGroup}>
                  <label style={s.label}>Course Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Generative AI Masterclass"
                    value={formCourse}
                    onChange={(e) => setFormCourse(e.target.value)}
                    style={s.input}
                  />
                </div>

                <div style={s.rowGap}>
                  {/* Time Display */}
                  <div style={{ ...s.fieldGroup, flex: 1 }}>
                    <label style={s.label}>Time Display Text *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 2 minutes ago"
                      value={formTime}
                      onChange={(e) => setFormTime(e.target.value)}
                      style={s.input}
                    />
                  </div>

                  {/* Picture Upload */}
                  <div style={{ ...s.fieldGroup, flex: 1 }}>
                    <label style={s.label}>Student Picture</label>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" }}>
                      <img
                        src={formImageUrl && formImageUrl.startsWith("/uploads/") ? `${BASE_URL}${formImageUrl}` : (formImageUrl || "/female-teacher.png")}
                        alt="Student placeholder"
                        style={{ ...s.avatar, width: "36px", height: "36px" }}
                      />
                      <label
                        style={{
                          cursor: "pointer",
                          border: "1px solid #cbd5e1",
                          borderRadius: "8px",
                          padding: "6px 12px",
                          fontSize: "11px",
                          fontWeight: 600,
                          color: "#475569",
                          background: "#ffffff",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <Icon name="image" size={11} />
                        {uploadingImage ? "Uploading..." : "Upload Pic"}
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: "none" }}
                          onChange={handleImageUpload}
                          disabled={uploadingImage}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div style={s.modalFooter}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={s.btnCancel}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={s.btnSubmit}
                >
                  {editingEvent ? "Save Changes" : "Create Alert"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

