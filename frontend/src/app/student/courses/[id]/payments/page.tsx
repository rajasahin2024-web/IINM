"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  formatINR,
  getCoursePayments,
  StudentApiError,
  type CoursePayments,
} from "@/lib/studentApi";
import { resolveAssetUrl } from "@/lib/config";
import { useCourse } from "../context";
import SIcon from "../../../icons";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function installTone(status: string | null): string {
  switch ((status ?? "").toLowerCase()) {
    case "paid":
      return "green";
    case "partial":
      return "amber";
    case "overdue":
      return "red";
    default:
      return "gray";
  }
}

export default function CoursePaymentsPage() {
  const router = useRouter();
  const { courseId } = useCourse();
  const [data, setData] = useState<CoursePayments | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    getCoursePayments(courseId)
      .then((d) => !cancelled && setData(d))
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof StudentApiError && err.status === 401) router.replace("/signin");
        else setError("Could not load payments. Please retry.");
      });
    return () => {
      cancelled = true;
    };
  }, [courseId, router]);

  const p = data?.purchase ?? null;

  return (
    <>
      <div className="stu-page-head">
        <h1 className="stu-page-title">Payments &amp; Invoices</h1>
        <p className="stu-page-sub">Fee summary, installment schedule and payment history.</p>
      </div>

      {error ? (
        <div className="stu-empty" role="alert">
          <SIcon name="cloud-off" size={40} />
          <p className="stu-empty-title">Couldn&apos;t load payments</p>
          <p className="stu-empty-sub">{error}</p>
          <button className="stu-btn-primary" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      ) : data === null ? (
        <div aria-busy="true">
          <div className="stu-skel" style={{ height: 92, marginBottom: 14 }} />
          <div className="stu-skel" style={{ height: 160 }} />
        </div>
      ) : !p ? (
        <div className="stu-empty">
          <SIcon name="payments" size={40} />
          <p className="stu-empty-title">No purchase record</p>
          <p className="stu-empty-sub">
            No fee record is attached to this course on your account. Contact admissions if this
            looks wrong.
          </p>
        </div>
      ) : (
        <>
          {/* Fee summary */}
          <section className="stu-section" aria-labelledby="pay-sum-h">
            <div className="stu-section-head">
              <h2 className="stu-section-title" id="pay-sum-h">
                <SIcon name="payments" size={19} />
                Fee summary
              </h2>
              <div className="stu-doc-links">
                {p.invoiceUrl && (
                  <Link href={p.invoiceUrl} className="stu-btn-ghost stu-btn-sm">
                    <SIcon name="receipt" size={15} />
                    Invoice
                  </Link>
                )}
                {p.receiptUrl && (
                  <Link href={p.receiptUrl} className="stu-btn-ghost stu-btn-sm">
                    <SIcon name="download" size={15} />
                    Receipt
                  </Link>
                )}
              </div>
            </div>
            <div className="stu-section-body">
              <div className="stu-pay-grid stu-pay-grid-4">
                <div className="stu-pay-cell">
                  <span className="stu-pay-cell-label">Total fee</span>
                  <span className="stu-pay-cell-value">{formatINR(p.totalFee)}</span>
                </div>
                <div className="stu-pay-cell">
                  <span className="stu-pay-cell-label">Net fee</span>
                  <span className="stu-pay-cell-value">{formatINR(p.netFee)}</span>
                </div>
                <div className="stu-pay-cell">
                  <span className="stu-pay-cell-label">Paid</span>
                  <span className="stu-pay-cell-value green">{formatINR(p.paidAmount)}</span>
                </div>
                <div className="stu-pay-cell">
                  <span className="stu-pay-cell-label">Due</span>
                  <span className={`stu-pay-cell-value ${(p.dueAmount ?? 0) > 0.5 ? "red" : "green"}`}>
                    {formatINR(p.dueAmount)}
                  </span>
                </div>
              </div>
              <div className="stu-exam-meta" style={{ marginTop: 10 }}>
                {p.status && <span className={`stu-badge stu-badge-${p.status === "completed" ? "green" : "amber"}`}>{p.status}</span>}
                {p.isInstallment && (
                  <span>
                    {p.totalInstallments ?? "—"} installments
                    {p.installmentFrequency ? ` · ${p.installmentFrequency}` : ""}
                  </span>
                )}
                {(p.discount ?? 0) > 0 && <span>Discount {formatINR(p.discount)}</span>}
                {(p.refundedAmount ?? 0) > 0 && <span>Refunded {formatINR(p.refundedAmount)}</span>}
              </div>
            </div>
          </section>

          {/* Installment schedule */}
          {data.installments.length > 0 && (
            <section className="stu-section" aria-labelledby="pay-inst-h">
              <div className="stu-section-head">
                <h2 className="stu-section-title" id="pay-inst-h">
                  <SIcon name="repeat" size={19} />
                  Installment schedule
                </h2>
              </div>
              <div className="stu-section-body stu-table-wrap">
                <table className="stu-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Due date</th>
                      <th>Amount</th>
                      <th>Paid</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.installments.map((inst) => (
                      <tr key={inst.id}>
                        <td>{inst.installmentNo ?? inst.id}</td>
                        <td>{formatDate(inst.dueDate)}</td>
                        <td>{formatINR(inst.amount)}</td>
                        <td>{formatINR(inst.paidAmount)}</td>
                        <td>
                          <span className={`stu-badge stu-badge-${installTone(inst.status)}`}>
                            {inst.status ?? "pending"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Transactions */}
          <section className="stu-section" aria-labelledby="pay-txn-h">
            <div className="stu-section-head">
              <h2 className="stu-section-title" id="pay-txn-h">
                <SIcon name="receipt" size={19} />
                Payment history
              </h2>
            </div>
            <div className="stu-section-body">
              {data.transactions.length === 0 ? (
                <p className="stu-page-sub">No payments recorded yet.</p>
              ) : (
                data.transactions.map((t) => (
                  <div className="stu-txn" key={t.id}>
                    <div className="stu-txn-main">
                      <span className="stu-txn-amount">{formatINR(t.amount)}</span>
                      <span className="stu-txn-meta">
                        {formatDate(t.createdAt)}
                        {t.paymentMethod ? ` · ${t.paymentMethod}` : ""}
                        {t.referenceNo ? ` · Ref ${t.referenceNo}` : ""}
                      </span>
                      {t.notes && <span className="stu-txn-notes">{t.notes}</span>}
                    </div>
                    <div className="stu-txn-side">
                      {t.status && (
                        <span className={`stu-badge stu-badge-${installTone(t.status)}`}>{t.status}</span>
                      )}
                      {t.screenshotUrl && (
                        <a
                          href={resolveAssetUrl(t.screenshotUrl)}
                          target="_blank"
                          rel="noreferrer"
                          className="stu-btn-ghost stu-btn-sm"
                        >
                          Proof
                        </a>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </>
      )}
    </>
  );
}
