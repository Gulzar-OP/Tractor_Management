// npm i jspdf jspdf-autotable

const numFmt = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

// jsPDF ke default font me "₹" nahi hota, isliye "Rs." use kiya hai
const rs = (n) => `Rs. ${numFmt.format(n || 0)}`;

const fmtMinutes = (m) => {
  const total = Math.round(m || 0);
  const h = Math.floor(total / 60);
  const mm = total % 60;
  return h === 0 ? `${mm} min` : `${h}h ${mm}m`;
};

const fmtTime = (t) =>
  t
    ? new Date(t).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Kolkata",
      })
    : "-";

const fmtDay = (key) =>
  new Date(`${key}T00:00:00+05:30`).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });

const fmtShort = (key) =>
  new Date(`${key}T00:00:00+05:30`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });

const statusText = {
  paid: "Paid",
  partial: "Partial",
  due: "Due",
  advanced: "Advance",
};

const GREEN = [22, 163, 74];
const SLATE = [51, 65, 85];

export async function exportReportPdf(data) {
  // Bundle chhota rakhne ke liye PDF library tabhi load hoti hai jab button dabta hai
  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = autoTableModule.default;

  const { from, to, summary, days } = data;

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 36;

  /* ---------- title ---------- */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...SLATE);
  doc.text("Date Wise Report", margin, 44);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Period: ${fmtShort(from)} to ${fmtShort(to)}`, margin, 62);
  doc.text(
    `Generated: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`,
    pageW - margin,
    62,
    { align: "right" }
  );

  /* ---------- summary ---------- */
  autoTable(doc, {
    startY: 76,
    margin: { left: margin, right: margin },
    head: [["Works", "Total Time", "Earning", "Received", "Due", "Expense", "Net"]],
    body: [
      [
        String(summary.totalWorks),
        fmtMinutes(summary.totalMinutes),
        rs(summary.totalAmount),
        rs(summary.totalPaid),
        rs(summary.totalDue),
        rs(summary.totalExpense),
        rs(summary.net),
      ],
    ],
    theme: "grid",
    headStyles: { fillColor: GREEN, textColor: 255, halign: "center" },
    bodyStyles: { halign: "center", fontStyle: "bold", fontSize: 10 },
    styles: { fontSize: 9, cellPadding: 6 },
  });

  let y = doc.lastAutoTable.finalY + 22;

  /* ---------- day wise ---------- */
  if (!days.length) {
    doc.setFontSize(11);
    doc.setTextColor(...SLATE);
    doc.text("No work or expense found in this period.", margin, y);
  }

  for (const day of days) {
    // heading ke liye jagah na ho to naya page
    if (y > pageH - 110) {
      doc.addPage();
      y = 44;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...GREEN);
    doc.text(fmtDay(day.date), margin, y);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    const t = day.totals;
    doc.text(
      `${t.works} work(s)  |  Earning ${rs(t.amount)}  |  Received ${rs(t.paid)}  |  Due ${rs(
        t.due
      )}  |  Expense ${rs(t.expense)}`,
      margin,
      y + 14
    );

    y += 22;

    if (day.works.length) {
      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [["Farmer", "Village", "Work", "Field", "Time", "Duration", "Amount", "Paid", "Due", "Status"]],
        body: day.works.map((w) => [
          w.farmer?.name || "-",
          w.farmer?.village || "-",
          w.workType || "-",
          w.fieldName || "-",
          `${fmtTime(w.startTime)} - ${fmtTime(w.endTime)}`,
          fmtMinutes(w.totalMinutes),
          rs(w.totalAmount),
          rs(w.paidAmount),
          rs(w.dueAmount),
          statusText[w.paymentStatus] || "-",
        ]),
        theme: "striped",
        headStyles: { fillColor: SLATE, textColor: 255 },
        styles: { fontSize: 8, cellPadding: 4, overflow: "linebreak" },
        columnStyles: {
          6: { halign: "right" },
          7: { halign: "right" },
          8: { halign: "right" },
        },
      });
      y = doc.lastAutoTable.finalY + 10;
    }

    if (day.expenses.length) {
      if (y > pageH - 90) {
        doc.addPage();
        y = 44;
      }
      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [["Expense", "Notes", "Amount"]],
        body: day.expenses.map((e) => [e.type || "-", e.notes || "-", rs(e.amount)]),
        theme: "striped",
        headStyles: { fillColor: [217, 119, 6], textColor: 255 },
        styles: { fontSize: 8, cellPadding: 4 },
        columnStyles: { 2: { halign: "right" } },
      });
      y = doc.lastAutoTable.finalY + 10;
    }

    y += 12;
  }

  /* ---------- footer: page numbers ---------- */
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Page ${i} of ${pages}`, pageW - margin, pageH - 18, { align: "right" });
  }

  doc.save(`report_${from}_to_${to}.pdf`);
}