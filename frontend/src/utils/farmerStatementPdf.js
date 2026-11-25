// npm i jspdf html2canvas
//
// Farmer ka statement PDF: summary + work records + payment records.
// Hindi naam sahi dikhe isliye jsPDF se text likhne ki jagah HTML ko
// image banakar PDF me daalte hain (browser/phone ka apna font use hota hai).

const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );

const inr = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const fmtDate = (d) => {
  if (!d) return "-";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
};

const fmtMinutes = (m) => {
  const total = Math.round(Number(m) || 0);
  const h = Math.floor(total / 60);
  const mm = total % 60;
  return h > 0 ? `${h}h ${mm}m` : `${mm}m`;
};

const PAGE_W_PX = 794; // A4 width @ 96dpi
const PAGE_MARGIN_MM = 8;

const th =
  "text-align:left;padding:7px 8px;background:#065f46;color:#fff;font-weight:700;font-size:10.5px;";
const td = "padding:7px 8px;border-bottom:1px solid #e7e5e4;font-size:10.5px;";
const num = "text-align:right;font-variant-numeric:tabular-nums;";

function buildHtml({ farmer, works, payments, generatedBy, advanceSummary }) {
  const activeWorks = works.filter((w) => w.status !== "CANCELLED");

  const billed = activeWorks.reduce((s, w) => s + Number(w.totalAmount || 0), 0);
  const paid = activeWorks.reduce((s, w) => s + Number(w.paidAmount || 0), 0);
  const due = activeWorks.reduce((s, w) => s + Number(w.dueAmount || 0), 0);
  const minutes = activeWorks.reduce((s, w) => s + Number(w.totalMinutes || 0), 0);
  const advance = Number(farmer.advanceAmount || 0);

  const tile = (label, value, color, sub = "") => `
    <div data-block style="flex:1;min-width:0;background:#f5f5f4;border-radius:10px;padding:10px 12px;">
      <div style="font-size:9.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#78716c;">${label}</div>
      <div style="margin-top:3px;font-size:15px;font-weight:800;color:${color};">${value}</div>
      ${sub ? `<div style="margin-top:2px;font-size:9px;color:#78716c;">${sub}</div>` : ""}
    </div>`;

  const workRows = [...works]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map((w) => {
      const cancelled = w.status === "CANCELLED";
      const status = cancelled
        ? "Cancelled"
        : Number(w.dueAmount || 0) <= 0
          ? "Paid"
          : Number(w.paidAmount || 0) > 0
            ? "Partial"
            : "Due";
      const color = cancelled ? "#a8a29e" : "#1c1917";
      return `<tr data-row style="color:${color};${cancelled ? "text-decoration:line-through;" : ""}">
        <td style="${td}">${esc(fmtDate(w.date))}</td>
        <td style="${td}">${esc(w.workType || "Work")}<div style="font-size:9px;color:#a8a29e;">${esc(w.fieldName || "")}</div></td>
        <td style="${td}">${esc(fmtMinutes(w.totalMinutes))}</td>
        <td style="${td}${num}">${inr(w.totalAmount)}</td>
        <td style="${td}${num}">${inr(w.paidAmount)}</td>
        <td style="${td}${num}">${inr(w.dueAmount)}</td>
        <td style="${td}">${status}</td>
      </tr>`;
    })
    .join("");

  const payRows = [...payments]
    .sort((a, b) => new Date(b.paymentDate || b.createdAt) - new Date(a.paymentDate || a.createdAt))
    .map((p) => {
      const isAdvance = p.paymentType === "ADVANCE";
      const advanceAmt = Number(p.advanceAmount || 0);
      const label = isAdvance
        ? "Advance received"
        : advanceAmt > 0
          ? "Work payment + advance"
          : "Work payment";
      return `<tr data-row style="${advanceAmt > 0 ? "background:#fffbeb;" : ""}">
        <td style="${td}">${esc(fmtDate(p.paymentDate || p.createdAt))}</td>
        <td style="${td}">${label}</td>
        <td style="${td}">${esc(p.paymentMethod || "-")}</td>
        <td style="${td}${num}">${inr(p.amount)}</td>
        <td style="${td}${num}">${inr(p.appliedAmount)}</td>
        <td style="${td}${num}${advanceAmt > 0 ? "color:#b45309;font-weight:700;" : ""}">${inr(advanceAmt)}</td>
      </tr>`;
    })
    .join("");

  const generated = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  return `
  <div style="padding:26px 26px 30px;color:#1c1917;">
    <div data-block style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;border-bottom:3px solid #065f46;padding-bottom:12px;">
      <div style="min-width:0;">
        <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#065f46;">Farmer Statement</div>
        <div style="margin-top:4px;font-size:22px;font-weight:800;">${esc(farmer.name || "Farmer")}</div>
        <div style="margin-top:3px;font-size:11px;color:#57534e;">
          ${esc(farmer.village || "")}${farmer.village && farmer.phone ? " · " : ""}${esc(farmer.phone || "")}
        </div>
      </div>
      <div style="text-align:right;font-size:10px;color:#78716c;white-space:nowrap;">
        ${generatedBy ? `Prepared by ${esc(generatedBy)}<br/>` : ""}${esc(generated)}
      </div>
    </div>

    <div style="display:flex;gap:8px;margin-top:14px;">
      ${tile("Total work", inr(billed), "#1c1917")}
      ${tile("Paid", inr(paid), "#047857")}
      ${tile("Due", inr(due), due > 0 ? "#be123c" : "#047857")}
      ${tile(
        "Advance left",
        inr(advance),
        "#b45309",
        advanceSummary
          ? `Diya ${inr(advanceSummary.totalReceived)} · Use ${inr(advanceSummary.totalUsed)}`
          : ""
      )}
      ${tile("Work time", fmtMinutes(minutes), "#1c1917")}
    </div>

    <div data-block style="margin-top:20px;font-size:13px;font-weight:800;">Work records (${works.length})</div>
    <table style="width:100%;border-collapse:collapse;margin-top:6px;">
      <thead><tr data-row>
        <th style="${th}">Date</th><th style="${th}">Work</th><th style="${th}">Time</th>
        <th style="${th}text-align:right;">Amount</th><th style="${th}text-align:right;">Paid</th>
        <th style="${th}text-align:right;">Due</th><th style="${th}">Status</th>
      </tr></thead>
      <tbody>${workRows || `<tr data-row><td colspan="7" style="${td}color:#a8a29e;">No work records</td></tr>`}</tbody>
    </table>

    <div data-block style="margin-top:22px;font-size:13px;font-weight:800;">Payment records (${payments.length})</div>
    <table style="width:100%;border-collapse:collapse;margin-top:6px;">
      <thead><tr data-row>
        <th style="${th}">Date</th><th style="${th}">Type</th><th style="${th}">Method</th>
        <th style="${th}text-align:right;">Amount</th><th style="${th}text-align:right;">Applied to work</th>
        <th style="${th}text-align:right;">Advance</th>
      </tr></thead>
      <tbody>${payRows || `<tr data-row><td colspan="6" style="${td}color:#a8a29e;">No payments yet</td></tr>`}</tbody>
    </table>

    <div data-block style="margin-top:18px;font-size:9.5px;color:#a8a29e;">
      Cancelled works total me shamil nahi hain. Advance wali payments peele rang me dikhayi gayi hain.
    </div>
  </div>`;
}

export async function buildFarmerStatementPdf({ farmer, works = [], payments = [], generatedBy = "", advanceSummary = null }) {
  const [{ jsPDF }, html2canvasModule] = await Promise.all([
    import("jspdf"),
    import("html2canvas"),
  ]);
  const html2canvas = html2canvasModule.default;

  // Page ke peeche chhupa hua container (z-index negative, app ka background upar rehta hai)
  const container = document.createElement("div");
  container.style.cssText = [
    "position:fixed",
    "top:0",
    "left:0",
    `width:${PAGE_W_PX}px`,
    "background:#fff",
    "z-index:-9999",
    "pointer-events:none",
    "font-family:'Noto Sans Devanagari','Noto Sans',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif",
  ].join(";");
  container.innerHTML = buildHtml({ farmer, works, payments, generatedBy, advanceSummary });
  document.body.appendChild(container);

  try {
    if (document.fonts?.ready) await document.fonts.ready;

    const pageHpx = Math.floor(((297 - PAGE_MARGIN_MM * 2 - 6) / 210) * PAGE_W_PX);
    const total = container.scrollHeight;
    const top = container.getBoundingClientRect().top;

    // Rows ke neeche ke kinare: page inhi par todenge, row beech se nahi kategi
    const breaks = [...container.querySelectorAll("[data-row],[data-block]")]
      .map((el) => el.getBoundingClientRect().bottom - top)
      .sort((a, b) => a - b);

    const pages = [];
    let start = 0;
    while (start < total - 1) {
      const limit = start + pageHpx;
      let end = total;
      if (total > limit) {
        const fit = breaks.filter((b) => b > start + 40 && b <= limit);
        end = fit.length ? fit[fit.length - 1] : limit;
      }
      pages.push([start, end]);
      start = end;
    }

    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageWmm = 210;

    for (let i = 0; i < pages.length; i++) {
      const [y0, y1] = pages[i];
      const canvas = await html2canvas(container, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        x: 0,
        y: y0,
        width: PAGE_W_PX,
        height: y1 - y0,
        windowWidth: PAGE_W_PX,
        scrollX: 0,
        scrollY: 0,
      });

      if (i > 0) doc.addPage();

      doc.addImage(
        canvas.toDataURL("image/jpeg", 0.9),
        "JPEG",
        0,
        PAGE_MARGIN_MM,
        pageWmm,
        ((y1 - y0) / PAGE_W_PX) * pageWmm
      );

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Page ${i + 1} of ${pages.length}`, pageWmm / 2, 292, { align: "center" });
    }

    const safeName =
      String(farmer.name || "")
        .replace(/[^A-Za-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "Farmer";
    const day = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

    return {
      blob: doc.output("blob"),
      fileName: `Statement-${safeName}-${day}.pdf`,
      pageCount: pages.length,
    };
  } finally {
    container.remove();
  }
}

// "98765 43210" / "+91 98765-43210" / "098765..." -> "919876543210" (WhatsApp format)
export function toWhatsAppNumber(phone) {
  let digits = String(phone || "").replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length === 10) digits = `91${digits}`;
  return digits.length >= 11 && digits.length <= 15 ? digits : "";
}

export function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}