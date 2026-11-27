// npm i jspdf html2canvas   (farmer statement wale PDF me pehle se hain)
//
// Admin ke liye: ek owner ka poora data padhne layayak PDF me.
// Hindi naam sahi dikhe isliye HTML ko image banakar PDF me daalte hain.

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

const fmtHours = (minutes) => {
  const total = Math.round(Number(minutes) || 0);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const PAGE_W_PX = 794; // A4 width @ 96dpi
const PAGE_MARGIN_MM = 8;

const th =
  "text-align:left;padding:6px 7px;background:#5b21b6;color:#fff;font-weight:700;font-size:10px;";
const td = "padding:6px 7px;border-bottom:1px solid #e7e5e4;font-size:10px;vertical-align:top;";
const right = "text-align:right;font-variant-numeric:tabular-nums;";

const tile = (label, value, color = "#1c1917") => `
  <div data-block style="flex:1;min-width:0;background:#f5f5f4;border-radius:10px;padding:9px 11px;">
    <div style="font-size:9px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#78716c;">${label}</div>
    <div style="margin-top:3px;font-size:14px;font-weight:800;color:${color};">${value}</div>
  </div>`;

const section = (title, count, headers, rows, emptyText) => `
  <div data-block style="margin-top:20px;font-size:13px;font-weight:800;">${esc(title)} (${count})</div>
  <table style="width:100%;border-collapse:collapse;margin-top:6px;table-layout:auto;">
    <thead><tr data-row>${headers
      .map(([label, isRight]) => `<th style="${th}${isRight ? "text-align:right;" : ""}">${label}</th>`)
      .join("")}</tr></thead>
    <tbody>${
      rows.length
        ? rows.join("")
        : `<tr data-row><td colspan="${headers.length}" style="${td}color:#a8a29e;">${emptyText}</td></tr>`
    }</tbody>
  </table>`;

function buildHtml({ owner, data, generatedBy }) {
  const farmers = data.farmers || [];
  const works = data.works || [];
  const payments = data.payments || [];
  const expenses = data.expenses || [];
  const drivers = data.drivers || [];

  const farmerName = new Map(farmers.map((f) => [String(f._id), f.name]));
  const driverName = new Map(drivers.map((d) => [String(d._id), d.name]));
  const nameOf = (id) => farmerName.get(String(id?._id || id)) || "-";

  const activeWorks = works.filter((w) => w.status !== "CANCELLED");
  const billed = activeWorks.reduce((s, w) => s + Number(w.totalAmount || 0), 0);
  const paid = activeWorks.reduce((s, w) => s + Number(w.paidAmount || 0), 0);
  const due = activeWorks.reduce((s, w) => s + Number(w.dueAmount || 0), 0);
  const advance = farmers.reduce((s, f) => s + Number(f.advanceAmount || 0), 0);
  const expenseTotal = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);

  const driverRows = drivers.map(
    (d) => `<tr data-row>
      <td style="${td}font-weight:600;">${esc(d.name)}</td>
      <td style="${td}">${esc(d.email)}</td>
      <td style="${td}">${esc(d.phone || "-")}</td>
      <td style="${td}">${d.isActive === false ? "Disabled" : "Active"}</td>
    </tr>`
  );

  const farmerRows = [...farmers]
    .sort((a, b) => String(a.name).localeCompare(String(b.name)))
    .map(
      (f) => `<tr data-row>
      <td style="${td}font-weight:600;">${esc(f.name)}${f.isArchived ? " (archived)" : ""}</td>
      <td style="${td}">${esc(f.phone || "-")}</td>
      <td style="${td}">${esc([f.village, f.district].filter(Boolean).join(", ") || "-")}</td>
      <td style="${td}${right}${Number(f.advanceAmount) > 0 ? "color:#b45309;font-weight:700;" : ""}">${inr(f.advanceAmount)}</td>
    </tr>`
    );

  const workRows = [...works]
    .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt))
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
      return `<tr data-row style="color:${color};">
        <td style="${td}">${fmtDate(w.date || w.createdAt)}</td>
        <td style="${td}font-weight:600;">${esc(nameOf(w.farmer))}</td>
        <td style="${td}">${esc(w.workType || "-")}</td>
        <td style="${td}${right}">${fmtHours(w.totalMinutes)}</td>
        <td style="${td}${right}">${inr(w.totalAmount)}</td>
        <td style="${td}${right}">${inr(w.paidAmount)}</td>
        <td style="${td}${right}${Number(w.dueAmount) > 0 && !cancelled ? "color:#be123c;font-weight:700;" : ""}">${inr(w.dueAmount)}</td>
        <td style="${td}">${status}</td>
      </tr>`;
    });

  const paymentRows = [...payments]
    .sort((a, b) => new Date(b.paymentDate || b.createdAt) - new Date(a.paymentDate || a.createdAt))
    .map((p) => {
      const adv = Number(p.advanceAmount || 0);
      const type = p.paymentType === "ADVANCE" ? "Advance" : adv > 0 ? "Work + advance" : "Work payment";
      return `<tr data-row style="${adv > 0 ? "background:#fffbeb;" : ""}">
        <td style="${td}">${fmtDate(p.paymentDate || p.createdAt)}</td>
        <td style="${td}font-weight:600;">${esc(nameOf(p.farmerID))}</td>
        <td style="${td}">${type}</td>
        <td style="${td}">${esc(p.paymentMethod || "-")}</td>
        <td style="${td}${right}">${inr(p.amount)}</td>
        <td style="${td}${right}${adv > 0 ? "color:#b45309;font-weight:700;" : ""}">${inr(adv)}</td>
        <td style="${td}">${esc(p.status || "-")}</td>
      </tr>`;
    });

  const expenseRows = [...expenses]
    .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt))
    .map(
      (e) => `<tr data-row>
      <td style="${td}">${fmtDate(e.date || e.createdAt)}</td>
      <td style="${td}font-weight:600;">${esc(e.type || "-")}</td>
      <td style="${td}${right}">${inr(e.amount)}</td>
      <td style="${td}">${esc(e.notes || "")}</td>
    </tr>`
    );

  const generated = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });

  return `
  <div style="padding:26px 28px;color:#1c1917;font-size:11px;line-height:1.4;">
    <div data-block style="display:flex;justify-content:space-between;gap:16px;border-bottom:3px solid #5b21b6;padding-bottom:12px;">
      <div>
        <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#5b21b6;">Owner Data Export</div>
        <div style="margin-top:4px;font-size:22px;font-weight:800;">${esc(owner.name || "Owner")}</div>
        <div style="margin-top:3px;font-size:11px;color:#57534e;">
          ${esc(owner.email || "")}${owner.phone ? " · " + esc(owner.phone) : ""}${owner.village ? " · " + esc(owner.village) : ""}
        </div>
        <div style="margin-top:3px;font-size:10px;color:#78716c;">
          Account: ${owner.isActive === false ? "Disabled" : "Active"} · Joined ${fmtDate(owner.createdAt)}
        </div>
      </div>
      <div style="text-align:right;font-size:10px;color:#78716c;white-space:nowrap;">
        ${generatedBy ? `Exported by ${esc(generatedBy)}<br/>` : ""}${esc(generated)}
      </div>
    </div>

    <div style="display:flex;gap:8px;margin-top:14px;">
      ${tile("Drivers", drivers.length)}
      ${tile("Farmers", farmers.length)}
      ${tile("Works", activeWorks.length)}
      ${tile("Payments", payments.length)}
    </div>
    <div style="display:flex;gap:8px;margin-top:8px;">
      ${tile("Total billed", inr(billed))}
      ${tile("Collected", inr(paid), "#047857")}
      ${tile("Due", inr(due), due > 0 ? "#be123c" : "#047857")}
      ${tile("Advance held", inr(advance), "#b45309")}
      ${tile("Expenses", inr(expenseTotal))}
    </div>

    ${section("Drivers", drivers.length, [["Name"], ["Email"], ["Phone"], ["Status"]], driverRows, "No drivers")}
    ${section("Farmers", farmers.length, [["Name"], ["Phone"], ["Village / District"], ["Advance", true]], farmerRows, "No farmers")}
    ${section(
      "Work records",
      works.length,
      [["Date"], ["Farmer"], ["Type"], ["Time", true], ["Billed", true], ["Paid", true], ["Due", true], ["Status"]],
      workRows,
      "No works"
    )}
    ${section(
      "Payment records",
      payments.length,
      [["Date"], ["Farmer"], ["Type"], ["Method"], ["Amount", true], ["Advance", true], ["Status"]],
      paymentRows,
      "No payments"
    )}
    ${section("Expenses", expenses.length, [["Date"], ["Type"], ["Amount", true], ["Notes"]], expenseRows, "No expenses")}

    <div data-block style="margin-top:18px;font-size:9.5px;color:#a8a29e;">
      Cancelled works totals me shamil nahi hain. Advance wali payments peele rang me hain.
      Poora technical backup (JSON) alag se download kar sakte ho.
    </div>
  </div>`;
}

export async function buildOwnerExportPdf({ owner, data, generatedBy = "" }) {
  const [{ jsPDF }, html2canvasModule] = await Promise.all([
    import("jspdf"),
    import("html2canvas"),
  ]);
  const html2canvas = html2canvasModule.default;

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
  container.innerHTML = buildHtml({ owner, data, generatedBy });
  document.body.appendChild(container);

  try {
    if (document.fonts?.ready) await document.fonts.ready;

    const pageHpx = Math.floor(((297 - PAGE_MARGIN_MM * 2 - 6) / 210) * PAGE_W_PX);
    const total = container.scrollHeight;
    const top = container.getBoundingClientRect().top;

    // Page inhi rows ke kinare par todenge, row beech se nahi kategi
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
      String(owner.name || "")
        .replace(/[^A-Za-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "Owner";
    const day = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

    return {
      blob: doc.output("blob"),
      fileName: `Owner-${safeName}-${day}.pdf`,
      pageCount: pages.length,
    };
  } finally {
    container.remove();
  }
}