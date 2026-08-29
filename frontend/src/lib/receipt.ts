export interface ReceiptContact {
  phone1?: string | null;
  phone2?: string | null;
  email1?: string | null;
  email2?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  pin_code?: string | null;
  country?: string | null;
  terms_text?: string | null;
  terms_url?: string | null;
}

export interface ReceiptSite {
  name?: string | null;
  logo_url?: string | null;
  dark_logo_url?: string | null;
  favicon_url?: string | null;
  founder_name?: string | null;
  founder_designation?: string | null;
  founder_signature_url?: string | null;
  contact?: ReceiptContact;
}

export interface ReceiptStudent {
  name: string;
  email: string;
  phone?: string | null;
  city?: string | null;
  state?: string | null;
  address?: string | null;
}

export interface ReceiptCourse {
  title: string;
}

export interface ReceiptBatch {
  name?: string | null;
  mode?: string | null;
  start_date?: string | null;
}

export interface ReceiptData {
  invoice_uuid: string;
  invoice_no?: string;
  status?: string;
  message?: string;
  student_id?: number;
  purchase_id?: number;
  transaction_id?: number | string | null;
  payment_date?: string | null;
  batch_name?: string | null;
  batch_status?: string | null;
  class_start_date?: string | null;
  booking_amount: number;
  course_fee?: number | null;
  total_fee?: number | null;
  due_amount?: number | null;
  course_title: string;
  student_name: string;
  student_email: string;
  student_phone?: string | null;
  student_address?: string | null;
  site_name?: string | null;
  logo_url?: string | null;
  favicon_url?: string | null;
  founder_name?: string | null;
  founder_designation?: string | null;
  founder_signature_url?: string | null;
  contact?: ReceiptContact;
  site?: ReceiptSite;
  student?: ReceiptStudent;
  course?: ReceiptCourse;
  batch?: ReceiptBatch;
  currency?: string;
}

function formatCurrency(amount: number | null | undefined, currency: string = "INR") {
  const n = typeof amount === "number" ? amount : 0;
  if (currency === "INR" || currency === "₹") {
    return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
  }
  return `${currency} ${n.toLocaleString()}`;
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return "TBD";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}

export function buildContactAddress(contact?: ReceiptContact): string {
  if (!contact) return "";
  const parts = [
    contact.address_line1,
    contact.address_line2,
    [contact.city, contact.state, contact.pin_code].filter(Boolean).join(", "),
    contact.country,
  ].filter(Boolean);
  return parts.join(", ");
}

function buildContactAddressFromData(data: ReceiptData): string {
  const c = data.contact || data.site?.contact;
  return buildContactAddress(c);
}

function cleanUploadUrl(url?: string | null): string {
  if (!url) return "";
  // Fix legacy double-dot extensions (e.g. "..png" -> ".png")
  return url.replace(/\.\.(png|jpg|jpeg|webp|gif|svg|ico|avif|pdf|mp4)$/i, ".$1");
}

export function renderReceiptHtml(
  data: ReceiptData,
  opts: { mode: "pdf" | "screen" } = { mode: "pdf" }
) {
  const logoUrl = cleanUploadUrl(data.logo_url || data.site?.logo_url || data.site?.dark_logo_url || data.favicon_url || data.site?.favicon_url);
  const siteName = data.site_name || data.site?.name || "Institute of Innovation and New Media";
  const founderName = data.founder_name || data.site?.founder_name || "Authorized Signatory";
  const founderDesignation = data.founder_designation || data.site?.founder_designation || "Director / Center Head";
  const founderSig = cleanUploadUrl(data.founder_signature_url || data.site?.founder_signature_url);
  const contact = data.contact || data.site?.contact;
  const billingPhone = contact?.phone1 || contact?.phone2 || "";
  const billingEmail = contact?.email1 || contact?.email2 || "";
  const instituteAddress = buildContactAddressFromData(data);
  const studentName = data.student_name || data.student?.name || "";
  const studentEmail = data.student_email || data.student?.email || "";
  const studentPhone = data.student_phone || data.student?.phone || "";
  const studentAddress = data.student_address || data.student?.address || "";
  const courseTitle = data.course_title || data.course?.title || "";
  const batchName = data.batch_name || data.batch?.name || "";
  const batchStatus = data.batch_status || "";
  const startDate = formatDate(data.class_start_date || data.batch?.start_date);
  const paymentDate = data.payment_date ? formatDate(data.payment_date) : formatDate(new Date().toISOString());
  const invoiceNo = data.invoice_no || (data.invoice_uuid ? `REC-${data.invoice_uuid.slice(0, 8).toUpperCase()}` : "REC-OFFICIAL");
  const invoiceUuid = data.invoice_uuid || "";
  const transactionId = data.transaction_id ? String(data.transaction_id) : data.invoice_uuid || "";
  const currency = data.currency || "INR";
  const bookingAmount = formatCurrency(data.booking_amount, currency);
  const courseFee = formatCurrency(data.course_fee, currency);
  const dueAmount = formatCurrency(data.due_amount, currency);
  const termsUrl = contact?.terms_url || "";
  const termsText = contact?.terms_text || "";

  const addressLines = [studentAddress].filter(Boolean).join(", ");
  const cityState = [data.student?.city, data.student?.state].filter(Boolean).join(", ");
  const fullStudentAddress = [addressLines, cityState].filter(Boolean).join(" - ");

  const widthStyle = opts.mode === "pdf" ? "width: 794px;" : "width: 100%; max-width: 794px;";

  return `
    <div class="receipt-document" style="font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; background: #ffffff; ${widthStyle} margin: 0 auto; padding: 36px 40px; box-sizing: border-box; border: 1px solid #0f172a; position: relative;">
      
      <!-- WATERMARK -->
      <div style="position: absolute; top: 52%; left: 50%; transform: translate(-50%, -50%) rotate(-35deg); font-family: 'Segoe UI', Arial, sans-serif; font-size: 110px; color: rgba(15, 23, 42, 0.03); font-weight: 900; z-index: 0; pointer-events: none; letter-spacing: 12px; text-transform: uppercase;">PAID</div>

      <div style="position: relative; z-index: 1;">
        
        <!-- HEADER SECTION (LEFT: LOGO + CONTACT, RIGHT: RECEIPT META) -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; border-bottom: 2px solid #0f172a; padding-bottom: 18px;">
          <div style="flex: 1; min-width: 0;">
            ${logoUrl ? `
              <div style="margin-bottom: 8px;">
                <img src="${logoUrl}" style="max-height: 54px; max-width: 240px; object-fit: contain; display: block;" alt="${siteName}" referrerpolicy="no-referrer" onerror="this.parentElement.style.display='none'" />
              </div>
            ` : `
              <div style="font-size: 18px; font-weight: 800; color: #0f172a; letter-spacing: -0.3px; margin-bottom: 6px;">${siteName}</div>
            `}
            ${instituteAddress ? `<div style="font-size: 11px; color: #475569; line-height: 1.4; margin-top: 4px;">${instituteAddress}</div>` : ""}
          </div>
          <div style="text-align: right; flex-shrink: 0;">
            <div style="border: 2px solid #0f172a; padding: 8px 14px; background: #f8fafc; text-align: right;">
              <div style="font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #0f172a;">PAYMENT RECEIPT</div>
              <div style="font-family: 'Consolas', 'Courier New', monospace; font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 4px;">NO: ${invoiceNo}</div>
              <div style="font-family: 'Consolas', 'Courier New', monospace; font-size: 11px; color: #475569; margin-top: 2px;">DATE: ${paymentDate}</div>
            </div>
          </div>
        </div>

        <!-- DETAILS GRID -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; border-bottom: 1px solid #0f172a; margin-top: 14px; padding-bottom: 14px; gap: 24px;">
          
          <!-- STUDENT INFO -->
          <div>
            <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #475569; margin-bottom: 6px; border-bottom: 1px solid #cbd5e1; padding-bottom: 2px;">STUDENT / BILLED TO</div>
            <div style="font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 2px;">${studentName}</div>
            <div style="font-family: 'Consolas', 'Courier New', monospace; font-size: 12px; color: #334155; line-height: 1.5;">
              <div>EMAIL: ${studentEmail || "N/A"}</div>
              <div>PHONE: ${studentPhone || "N/A"}</div>
              ${fullStudentAddress ? `<div style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #475569; margin-top: 2px;">ADDRESS: ${fullStudentAddress}</div>` : ""}
            </div>
          </div>

          <!-- COURSE INFO -->
          <div>
            <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #475569; margin-bottom: 6px; border-bottom: 1px solid #cbd5e1; padding-bottom: 2px;">ACADEMIC &amp; BATCH DETAILS</div>
            <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 2px;">${courseTitle}</div>
            <div style="font-family: 'Consolas', 'Courier New', monospace; font-size: 12px; color: #334155; line-height: 1.5;">
              <div>BATCH: ${batchName || "Standard Batch"}</div>
              <div>ADMISSION STATUS: ${batchStatus === "waitlisted" ? "WAITLISTED" : "CONFIRMED"}</div>
              <div>CLASS START DATE: ${startDate}</div>
            </div>
          </div>
        </div>

        <!-- SUMMARY METRICS TABLE -->
        <div style="margin: 16px 0;">
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #0f172a; font-family: 'Segoe UI', Arial, sans-serif;">
            <thead>
              <tr style="background: #0f172a; color: #ffffff;">
                <th style="padding: 8px 12px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; width: 40px;">#</th>
                <th style="padding: 8px 12px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">DESCRIPTION</th>
                <th style="padding: 8px 12px; text-align: center; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; width: 140px;">TOTAL COURSE FEE</th>
                <th style="padding: 8px 12px; text-align: right; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; width: 140px;">AMOUNT PAID</th>
              </tr>
            </thead>
            <tbody>
              <tr style="border-bottom: 1px solid #cbd5e1;">
                <td style="padding: 12px; font-family: 'Consolas', 'Courier New', monospace; font-size: 12px; vertical-align: top;">01</td>
                <td style="padding: 12px; vertical-align: top;">
                  <div style="font-size: 13px; font-weight: 700; color: #0f172a;">Slot Booking &amp; Registration Fee</div>
                  <div style="font-size: 11px; color: #475569; margin-top: 2px;">Course: ${courseTitle} (${batchName ? `Batch: ${batchName}` : "Direct Booking"})</div>
                </td>
                <td style="padding: 12px; text-align: center; font-family: 'Consolas', 'Courier New', monospace; font-size: 13px; font-weight: 600; color: #0f172a; vertical-align: top;">
                  ${courseFee}
                </td>
                <td style="padding: 12px; text-align: right; font-family: 'Consolas', 'Courier New', monospace; font-size: 14px; font-weight: 700; color: #0f172a; vertical-align: top;">
                  ${bookingAmount}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr style="border-top: 2px solid #0f172a; background: #ecfdf5;">
                <td colspan="3" style="padding: 10px 12px; text-align: right; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #065f46;">BOOKING AMOUNT PAID:</td>
                <td style="padding: 10px 12px; text-align: right; font-family: 'Consolas', 'Courier New', monospace; font-size: 16px; font-weight: 800; color: #047857;">${bookingAmount}</td>
              </tr>
              <tr style="background: #fffbeb; border-top: 1px solid #fcd34d;">
                <td colspan="3" style="padding: 10px 12px; text-align: right; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #92400e;">
                  <span style="display: inline-block; background: #d97706; color: #ffffff; font-size: 9px; font-weight: 800; padding: 1px 6px; margin-right: 6px; border-radius: 2px;">!</span>ADMISSION FEE:
                </td>
                <td style="padding: 10px 12px; text-align: right; font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; font-weight: 700; color: #92400e; font-style: italic;">Need Before Starting the Class</td>
              </tr>
              <tr style="background: #fef2f2; border-top: 1px solid #fca5a5;">
                <td colspan="3" style="padding: 10px 12px; text-align: right; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #991b1b;">TOTAL OUTSTANDING:</td>
                <td style="padding: 10px 12px; text-align: right; font-family: 'Consolas', 'Courier New', monospace; font-size: 15px; font-weight: 800; color: #dc2626;">${dueAmount}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- PAYMENT & TRANSACTION METADATA -->
        <div style="border: 1px solid #cbd5e1; padding: 10px 14px; background: #f8fafc; margin-bottom: 16px; font-family: 'Consolas', 'Courier New', monospace; font-size: 11px; color: #334155; line-height: 1.6;">
          <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
            <div><strong>PAYMENT METHOD:</strong> ONLINE (RAZORPAY)</div>
            <div><strong>PAYMENT STATUS:</strong> SUCCESS / PAID</div>
          </div>
          <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin-top: 2px;">
            <div><strong>TRANSACTION ID:</strong> ${transactionId}</div>
            <div><strong>INVOICE REF:</strong> ${invoiceUuid}</div>
          </div>
        </div>

        <!-- HIGHLIGHTED NOTICE & TERMS SECTION -->
        <div style="border: 1.5px solid #d97706; background: #fffbeb; padding: 12px 14px; margin-bottom: 20px; font-size: 11px; color: #78350f; line-height: 1.55;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
            <span style="background: #d97706; color: #ffffff; font-size: 9.5px; font-weight: 800; padding: 2px 7px; text-transform: uppercase; letter-spacing: 0.8px;">IMPORTANT NOTICE</span>
            <span style="font-weight: 700; color: #92400e; font-size: 11.5px;">Admission &amp; Fee Policy</span>
          </div>
          <div style="color: #92400e;">
            This is a computer-generated official receipt for slot booking. <strong>Admission Fee must be paid before class commencement date (${startDate}).</strong> Admission confirmation and batch access credentials are strictly subject to clearance of the total outstanding balance before class start.
          </div>
          ${(termsUrl || termsText) ? `
            <div style="margin-top: 6px; padding-top: 6px; border-top: 1px dashed #fcd34d; color: #78350f;">
              <strong>Terms &amp; Conditions:</strong> Please read and comply with the institute terms and refund policies. ${termsUrl ? `<a href="${termsUrl}" style="color: #92400e; font-weight: 800; text-decoration: underline;" target="_blank">Read Terms &amp; Conditions</a>` : ""}
            </div>` : ""}
          <div style="margin-top: 6px; font-size: 10.5px; color: #78350f;">
            For any billing queries or assistance, contact: <strong>${billingEmail || "support"}</strong> ${billingPhone ? ` | Phone: <strong>${billingPhone}</strong>` : ""}
          </div>
        </div>

        <!-- SIGNATURE & VERIFICATION SECTION -->
        <div style="display: flex; justify-content: space-between; align-items: flex-end; padding-top: 10px; border-top: 1px solid #0f172a;">
          <div style="font-size: 10px; color: #64748b; line-height: 1.4; max-width: 60%;">
            <div style="font-family: 'Consolas', 'Courier New', monospace; font-size: 10px; color: #0f172a; font-weight: 700;">DIGITALLY VERIFIED RECEIPT</div>
            <div>Document generated from ${siteName}.</div>
            <div style="font-family: 'Consolas', 'Courier New', monospace; font-size: 9.5px; color: #64748b; margin-top: 2px;">SECURE HASH: ${invoiceUuid.replace(/-/g, "").toUpperCase()}</div>
          </div>
          <div style="text-align: center; min-width: 170px;">
            ${founderSig ? `<img src="${founderSig}" style="height: 38px; max-width: 150px; object-fit: contain; margin-bottom: 2px; display: block; margin-left: auto; margin-right: auto;" alt="Signature" referrerpolicy="no-referrer" onerror="this.style.display='none'" />` : `<div style="height: 38px;"></div>`}
            <div style="border-top: 1.5px solid #0f172a; padding-top: 4px;">
              <div style="font-size: 11.5px; font-weight: 700; color: #0f172a;">${founderName}</div>
              <div style="font-size: 10px; color: #475569;">${founderDesignation}</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  `;
}

async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  if (!url) return null;
  try {
    // For cross-origin URLs, use the backend proxy to avoid CORS issues
    let fetchUrl = url;
    if (url.startsWith("http://") || url.startsWith("https://")) {
      try {
        const parsed = new URL(url);
        if (parsed.hostname !== window.location.hostname) {
          // Use the backend proxy for cross-origin images
          const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
          fetchUrl = `${baseUrl}/api/public/slot-booking/proxy-image?url=${encodeURIComponent(url)}`;
        }
      } catch {
        // URL parsing failed, use original
      }
    }
    const res = await fetch(fetchUrl, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function downloadReceiptPdf(data: ReceiptData) {
  const html2pdf = (await import("html2pdf.js")).default;

  // Pre-fetch logo and signature images as data URLs to avoid CORS issues
  const logoUrl = cleanUploadUrl(data.logo_url || data.site?.logo_url || data.site?.dark_logo_url || data.favicon_url || data.site?.favicon_url);
  const sigUrl = cleanUploadUrl(data.founder_signature_url || data.site?.founder_signature_url);

  const [logoDataUrl, sigDataUrl] = await Promise.all([
    logoUrl ? fetchImageAsDataUrl(logoUrl) : Promise.resolve(null),
    sigUrl ? fetchImageAsDataUrl(sigUrl) : Promise.resolve(null),
  ]);

  const pdfData: ReceiptData = {
    ...data,
    logo_url: logoDataUrl || logoUrl,
    founder_signature_url: sigDataUrl || sigUrl,
    site: data.site ? {
      ...data.site,
      logo_url: logoDataUrl || data.site.logo_url,
      founder_signature_url: sigDataUrl || data.site.founder_signature_url,
    } : data.site,
  };

  const htmlString = renderReceiptHtml(pdfData, { mode: "pdf" });

  const div = document.createElement("div");
  div.innerHTML = htmlString;
  div.style.position = "fixed";
  div.style.left = "-9999px";
  div.style.top = "-9999px";
  div.style.width = "794px";
  div.style.background = "#ffffff";
  document.body.appendChild(div);

  const receipt = div.firstElementChild as HTMLElement | null;
  if (!receipt) {
    if (div.parentNode) div.parentNode.removeChild(div);
    throw new Error("Receipt element could not be rendered.");
  }

  try {
    await html2pdf().set({
      margin: [20, 20, 20, 20],
      filename: `slot-booking-${data.invoice_uuid.slice(0, 8)}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, allowTaint: false, backgroundColor: "#ffffff", width: 794, windowWidth: 794 },
      jsPDF: { unit: "pt", format: "a4", orientation: "portrait" },
    }).from(receipt).save();
  } finally {
    if (div.parentNode) div.parentNode.removeChild(div);
  }
}

export function getReceiptPublicUrl(invoiceUuid: string): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/receipt/${invoiceUuid}`;
}
