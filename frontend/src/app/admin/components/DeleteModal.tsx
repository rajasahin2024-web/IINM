import React, { useState } from "react";
import DOMPurify from 'dompurify';
interface DeleteModalProps {
  title?: string;
  description?: string;
  itemName?: string;
  confirmText?: string;
  confirmColor?: string;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
}

export default function DeleteModal({
  title = "Delete Item?",
  description = "This action is permanent and cannot be undone.",
  itemName,
  confirmText = "Delete",
  confirmColor = "#dc2626",
  onConfirm,
  onCancel,
}: DeleteModalProps) {
  const [deleting, setDeleting] = useState(false);

  const doDelete = async () => {
    setDeleting(true);
    try {
      await onConfirm();
    } finally {
      // we only stop deleting if component is still mounted, but usually parent unmounts it
      setDeleting(false);
    }
  };

  return (
    <div
      onClick={e => {
        if (e.target === e.currentTarget && !deleting) onCancel();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        zIndex: 5000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backdropFilter: "blur(2px)",
      }}
    >
      <style>{`
        @keyframes ql-slide-up { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .dm-modal {
          background: #fff; border-radius: 16px; padding: 32px 28px;
          max-width: 400px; width: calc(100% - 32px);
          box-shadow: 0 20px 60px rgba(0,0,0,0.2);
          animation: ql-slide-up 0.2s ease;
          text-align: center;
        }
        .dm-modal-icon {
          width: 56px; height: 56px; border-radius: 50%; background: #fef2f2;
          display: flex; alignItems: center; justifyContent: center;
          margin: 0 auto 18px; color: #dc2626;
        }
        .dm-modal h3 { font-size: 1.1rem; font-weight: 700; color: #111827; margin: 0 0 8px; }
        .dm-modal p  { font-size: 0.875rem; color: #6b7280; margin: 0 0 24px; line-height: 1.6; }
        .dm-modal-code {
          display: inline-block; padding: 2px 10px; border-radius: 5px;
          background: #eff6ff; color: #2563eb; font-size: 0.78rem; font-weight: 700;
          font-family: monospace; margin: 0 0 20px;
        }
        .dm-modal-actions { display: flex; gap: 10px; justifyContent: center; }
        .dm-modal-cancel {
          padding: 10px 24px; border-radius: 8px; border: 1.5px solid #e5e7eb;
          background: #fff; color: #374151; font-size: 0.875rem; font-weight: 600;
          cursor: pointer; transition: all 0.15s; font-family: inherit; flex: 1;
        }
        .dm-modal-cancel:hover { background: #f3f4f6; }
        .dm-modal-delete {
          padding: 10px 24px; border-radius: 8px; border: none;
          background: var(--confirm-color, #dc2626); color: #fff; font-size: 0.875rem; font-weight: 700;
          cursor: pointer; transition: opacity 0.15s; font-family: inherit; flex: 1;
        }
        .dm-modal-delete:hover { opacity: 0.9; }
        .dm-modal-delete:disabled { opacity: 0.55; cursor: not-allowed; }
      `}</style>
      
      <div className="dm-modal" style={{ "--confirm-color": confirmColor } as React.CSSProperties}>
        <div className="dm-modal-icon" style={{ color: confirmColor, background: confirmColor + "15" }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        </div>
        
        <h3>{title}</h3>
        {itemName && <div className="dm-modal-code">{itemName}</div>}
        
        <p dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(description) }}></p>
        
        <div className="dm-modal-actions">
          <button className="dm-modal-cancel" onClick={onCancel} disabled={deleting}>
            Cancel
          </button>
          <button className="dm-modal-delete" onClick={doDelete} disabled={deleting}>
            {deleting ? "Processing…" : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
