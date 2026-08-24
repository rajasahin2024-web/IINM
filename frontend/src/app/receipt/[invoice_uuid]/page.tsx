"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";
import { ReceiptData, downloadReceiptPdf, renderReceiptHtml, getReceiptPublicUrl } from "@/lib/receipt";
import "./receipt.css";

const PrintIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
);

const DownloadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
);

const ShareIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
);

export default function ReceiptPage() {
  const params = useParams();
  const invoice_uuid = Array.isArray(params.invoice_uuid) ? params.invoice_uuid[0] : params.invoice_uuid;
  const [data, setData] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!invoice_uuid) return;
    setLoading(true);
    setError("");
    apiFetch(`/api/public/slot-booking/receipt/${invoice_uuid}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Receipt not found");
        const json = await res.json();
        setData(json);
      })
      .catch((err: any) => setError(err.message || "Could not load receipt"))
      .finally(() => setLoading(false));
  }, [invoice_uuid]);

  const handleDownload = () => {
    if (data) downloadReceiptPdf(data);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    if (!invoice_uuid) return;
    const url = getReceiptPublicUrl(invoice_uuid);
    try {
      await navigator.clipboard.writeText(url);
      alert("Receipt link copied to clipboard");
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <div className="receipt-page">
        <div className="receipt-page-loader">
          <div className="receipt-page-spinner" />
          <p>Loading receipt…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="receipt-page">
        <div className="receipt-page-error">
          <h2>Receipt not found</h2>
          <p>{error || "The receipt you’re looking for does not exist."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="receipt-page">
      <div className="receipt-page-toolbar no-print">
        <div className="receipt-toolbar-title">
          <span>Official Payment Receipt</span>
          <code>{data.invoice_uuid?.slice(0, 12).toUpperCase()}</code>
        </div>
        <div className="receipt-page-actions">
          <button className="receipt-page-btn primary" onClick={handleDownload} title="Download pure PDF">
            <DownloadIcon /> Download PDF
          </button>
          <button className="receipt-page-btn" onClick={handlePrint} title="Print receipt (A4)">
            <PrintIcon /> Print
          </button>
          <button className="receipt-page-btn" onClick={handleShare} title="Copy link to receipt">
            <ShareIcon /> Copy Link
          </button>
        </div>
      </div>

      <div className="receipt-document-container">
        <div
          className="receipt-paper-wrap"
          dangerouslySetInnerHTML={{ __html: renderReceiptHtml(data, { mode: "screen" }) }}
        />
      </div>
    </div>
  );
}
