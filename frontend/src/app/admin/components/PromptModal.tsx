import React, { useState, useEffect, useRef } from "react";

interface PromptModalProps {
  title: string;
  defaultValue?: string;
  inputLabel?: string;
  confirmText?: string;
  onConfirm: (value: string) => Promise<void> | void;
  onCancel: () => void;
}

export default function PromptModal({
  title,
  defaultValue = "",
  inputLabel = "Name",
  confirmText = "Save",
  onConfirm,
  onCancel,
}: PromptModalProps) {
  const [value, setValue] = useState(defaultValue);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    setLoading(true);
    try {
      await onConfirm(value.trim());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={e => {
        if (e.target === e.currentTarget && !loading) onCancel();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.45)",
        zIndex: 5000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backdropFilter: "blur(2px)",
      }}
    >
      <style>{`
        @keyframes pm-slide-up { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .pm-modal {
          background: #fff; border-radius: 16px; padding: 28px 24px;
          max-width: 400px; width: calc(100% - 32px);
          box-shadow: 0 20px 60px rgba(0,0,0,0.2);
          animation: pm-slide-up 0.2s ease;
        }
        .pm-modal h3 { font-size: 1.15rem; font-weight: 700; color: #0f172a; margin: 0 0 16px; text-align: center; }
        .pm-input-label { display: block; font-size: 0.8rem; font-weight: 600; color: #475569; margin-bottom: 6px; }
        .pm-input {
          width: 100%; padding: 11px 14px; border-radius: 8px; border: 1.5px solid #e2e8f0;
          font-size: 0.9rem; color: #0f172a; outline: none; transition: border-color 0.2s;
          box-sizing: border-box; margin-bottom: 24px; font-family: inherit;
        }
        .pm-input:focus { border-color: #38bdf8; box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.15); }
        .pm-actions { display: flex; gap: 10px; }
        .pm-btn-cancel {
          padding: 10px 16px; border-radius: 8px; border: 1.5px solid #e5e7eb;
          background: #fff; color: #475569; font-size: 0.875rem; font-weight: 600;
          cursor: pointer; transition: all 0.15s; font-family: inherit; flex: 1;
        }
        .pm-btn-cancel:hover { background: #f8fafc; color: #0f172a; }
        .pm-btn-save {
          padding: 10px 16px; border-radius: 8px; border: none;
          background: #38bdf8; color: #fff; font-size: 0.875rem; font-weight: 700;
          cursor: pointer; transition: background 0.15s; font-family: inherit; flex: 1;
        }
        .pm-btn-save:hover { background: #0ea5e9; }
        .pm-btn-save:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>
      
      <div className="pm-modal">
        <h3>{title}</h3>
        <form onSubmit={handleSubmit}>
          <label className="pm-input-label">{inputLabel}</label>
          <input
            ref={inputRef}
            className="pm-input"
            value={value}
            onChange={e => setValue(e.target.value)}
            disabled={loading}
          />
          <div className="pm-actions">
            <button type="button" className="pm-btn-cancel" onClick={onCancel} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="pm-btn-save" disabled={loading || !value.trim()}>
              {loading ? "Saving…" : confirmText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
