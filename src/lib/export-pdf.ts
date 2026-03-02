import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { AttackScenario } from "@/types";

// ─── Color palette ─────────────────────────────────────────────────────────────

const C = {
  // ── Dark header bar only ─────────────────────────────────────────────────────
  navy:           [10,  20,  40]  as [number, number, number],
  navyLight:      [16,  30,  58]  as [number, number, number],
  cyan:           [6,   182, 212] as [number, number, number],
  cyanDark:       [0,   130, 160] as [number, number, number],
  headerText:     [255, 255, 255] as [number, number, number],
  headerMuted:    [148, 168, 198] as [number, number, number],

  // ── Content (light theme) ────────────────────────────────────────────────────
  white:          [255, 255, 255] as [number, number, number],
  bodyText:       [20,  20,  20]  as [number, number, number],
  headingText:    [30,  30,  30]  as [number, number, number],
  labelText:      [100, 110, 125] as [number, number, number], // uppercase section labels
  mutedText:      [130, 140, 155] as [number, number, number],
  border:         [215, 220, 228] as [number, number, number],
  tableHead:      [232, 236, 241] as [number, number, number],
  rowAlt:         [248, 249, 251] as [number, number, number],

  // ── Severity — text (for light backgrounds) ───────────────────────────────────
  criticalText:   [185, 28,  28]  as [number, number, number], // red-700
  highText:       [154, 52,  18]  as [number, number, number], // orange-800
  mediumText:     [133, 77,  14]  as [number, number, number], // amber-800
  lowText:        [21,  128, 61]  as [number, number, number], // green-700

  // ── Severity — badges on DARK scenario header bar (solid bg, white text) ──────
  criticalBadge:  [220, 38,  38]  as [number, number, number], // red-600
  highBadge:      [234, 88,  12]  as [number, number, number], // orange-600
  mediumBadge:    [202, 138, 4]   as [number, number, number], // yellow-600
  lowBadge:       [22,  163, 74]  as [number, number, number], // green-600

  // ── Attack chain (light orange tint) ─────────────────────────────────────────
  chainBg:        [255, 247, 237] as [number, number, number], // orange-50
  chainNum:       [154, 52,  18]  as [number, number, number], // orange-800
  chainBorder:    [253, 186, 116] as [number, number, number], // orange-300

  // ── Impact box (light amber tint) ────────────────────────────────────────────
  impactBg:       [255, 251, 235] as [number, number, number], // amber-50
  impactText:     [120, 53,  15]  as [number, number, number], // amber-900
  impactBorder:   [252, 211, 77]  as [number, number, number], // amber-300

  // ── Defense playbook (light green tint) ──────────────────────────────────────
  playbookBg:     [240, 253, 244] as [number, number, number], // green-50
  playbookNum:    [21,  128, 61]  as [number, number, number], // green-700
  playbookBorder: [134, 239, 172] as [number, number, number], // green-300

  // ── Footer ────────────────────────────────────────────────────────────────────
  footerBg:       [242, 244, 248] as [number, number, number],
  footerText:     [120, 130, 145] as [number, number, number],
};

// ─── Severity helpers ──────────────────────────────────────────────────────────

/** Severity text color for light backgrounds (tables, inline text). */
function sevText(sev: string): [number, number, number] {
  switch (sev) {
    case "Critical": return C.criticalText;
    case "High":     return C.highText;
    case "Medium":   return C.mediumText;
    default:         return C.lowText;
  }
}

/** Severity badge background for the dark scenario header bar. */
function sevBadgeBg(sev: string): [number, number, number] {
  switch (sev) {
    case "Critical": return C.criticalBadge;
    case "High":     return C.highBadge;
    case "Medium":   return C.mediumBadge;
    default:         return C.lowBadge;
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function wrapText(doc: jsPDF, text: string, maxWidth: number, fontSize = 9): string[] {
  doc.setFontSize(fontSize);
  return doc.splitTextToSize(text, maxWidth);
}

/** Draw a thin horizontal rule. */
function rule(doc: jsPDF, y: number, marginL: number, contentW: number) {
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.25);
  doc.line(marginL, y, marginL + contentW, y);
}

/** Add page footers after all pages are created. */
function addFooters(doc: jsPDF, companyName: string) {
  const total = doc.getNumberOfPages();
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= total; i++) {
    doc.setPage(i);

    doc.setFillColor(...C.footerBg);
    doc.rect(0, ph - 10, pw, 10, "F");

    // top border of footer
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.3);
    doc.line(0, ph - 10, pw, ph - 10);

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.footerText);
    doc.text("CONFIDENTIAL — FOR INTERNAL USE ONLY", 14, ph - 3.5);
    doc.text(`${companyName} Red Team Report`, pw / 2, ph - 3.5, { align: "center" });
    doc.text(`Page ${i} of ${total}`, pw - 14, ph - 3.5, { align: "right" });
  }
}

/** Shorthand: reference to lastAutoTable finalY. */
function finalY(doc: jsPDF): number {
  return (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
}

/** Add a new blank page and reset curY. */
function newPage(doc: jsPDF): number {
  doc.addPage();
  return 16;
}

// ─── Main export ───────────────────────────────────────────────────────────────

export function exportPDF(scenarios: AttackScenario[], companyName = "FinVault Security") {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pw = doc.internal.pageSize.getWidth();  // 210
  const ph = doc.internal.pageSize.getHeight(); // 297
  const marginL = 14;
  const marginR = 14;
  const contentW = pw - marginL - marginR;      // 182

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const approvedScenarios = scenarios.filter((s) => s.status === "approved");

  // ── Cover header (dark navy — the only dark section) ─────────────────────────

  doc.setFillColor(...C.navy);
  doc.rect(0, 0, pw, 56, "F");

  // Cyan accent stripe
  doc.setFillColor(...C.cyan);
  doc.rect(0, 56, pw, 1.5, "F");

  // Shield icon box
  doc.setFillColor(...C.cyanDark);
  doc.roundedRect(marginL, 10, 12, 12, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...C.headerText);
  doc.text("S", marginL + 4.2, 19.5);

  // Report title
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.headerText);
  doc.text("Red Team Assessment Report", marginL + 17, 20);

  // Subtitle
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...C.headerMuted);
  doc.text(`${companyName}  ·  Threat Scenario Analysis`, marginL + 17, 27.5);

  // Meta line
  doc.setFontSize(8);
  doc.setTextColor(...C.headerMuted);
  doc.text(`Generated: ${dateStr}`, marginL, 43);
  doc.text(
    `Scenarios: ${scenarios.length}  ·  Approved for Testing: ${approvedScenarios.length}`,
    pw - marginR, 43, { align: "right" }
  );

  // CONFIDENTIAL badge (on dark header)
  doc.setFillColor(...C.criticalBadge);
  doc.roundedRect(pw - marginR - 38, 47, 38, 6, 1, 1, "F");
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.headerText);
  doc.text("CONFIDENTIAL", pw - marginR - 19, 51.5, { align: "center" });
  doc.setFont("helvetica", "normal");

  let curY = 66;

  // ── Executive Summary ─────────────────────────────────────────────────────────

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.headingText);
  doc.text("Executive Summary", marginL, curY);
  curY += 6;

  const sevCounts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
  for (const s of scenarios) {
    if (s.severity in sevCounts) sevCounts[s.severity as keyof typeof sevCounts]++;
  }

  autoTable(doc, {
    startY: curY,
    head: [["Severity", "Count", "Recommended Action"]],
    body: [
      ["Critical", sevCounts.Critical, sevCounts.Critical > 0 ? "Immediate Action Required" : "—"],
      ["High",     sevCounts.High,     sevCounts.High > 0     ? "Remediate Within 30 Days"  : "—"],
      ["Medium",   sevCounts.Medium,   sevCounts.Medium > 0   ? "Remediate Within 90 Days"  : "—"],
      ["Low",      sevCounts.Low,      sevCounts.Low > 0      ? "Track and Monitor"          : "—"],
    ],
    styles: {
      fillColor: C.white,
      textColor: C.bodyText,
      lineColor: C.border,
      lineWidth: 0.3,
      fontSize: 9,
      cellPadding: 3.2,
      font: "helvetica",
    },
    headStyles: {
      fillColor: C.tableHead,
      textColor: C.headingText,
      fontStyle: "bold",
      fontSize: 8,
    },
    alternateRowStyles: { fillColor: C.rowAlt },
    columnStyles: {
      0: { cellWidth: 32 },
      1: { cellWidth: 20, halign: "center" },
      2: { cellWidth: contentW - 52 },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 0) {
        data.cell.styles.textColor = sevText(String(data.cell.raw));
        data.cell.styles.fontStyle = "bold";
      }
      if (data.section === "body" && data.column.index === 1) {
        data.cell.styles.fontStyle = "bold";
      }
    },
    margin: { left: marginL, right: marginR },
  });

  curY = finalY(doc) + 12;

  // ── Attack Scenarios heading ──────────────────────────────────────────────────

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.headingText);
  doc.text("Attack Scenarios", marginL, curY);
  curY += 7;

  // ── Per-scenario sections ─────────────────────────────────────────────────────

  for (let idx = 0; idx < scenarios.length; idx++) {
    const s = scenarios[idx];

    if (curY > ph - 65) curY = newPage(doc);

    // ── Scenario header bar (dark, like a card header) ──────────────────────────

    const barH = 13;
    doc.setFillColor(...C.navyLight);
    doc.rect(marginL, curY - 3, contentW, barH, "F");

    // Index number
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.headerMuted);
    doc.text(String(idx + 1).padStart(2, "0"), marginL + 2.5, curY + 5.5);

    // Title — truncate if needed
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.headerText);
    const maxTitleW = contentW - 50;
    const titleLines = doc.splitTextToSize(s.title, maxTitleW);
    doc.text(titleLines[0], marginL + 11, curY + 5.5);

    // Severity badge on dark bar — white text on solid severity color
    const badgeLabel = s.severity.toUpperCase();
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    const badgeW = doc.getTextWidth(badgeLabel) + 8;
    doc.setFillColor(...sevBadgeBg(s.severity));
    doc.roundedRect(marginL + contentW - badgeW, curY - 0.5, badgeW, 6, 1, 1, "F");
    doc.setTextColor(...C.headerText);
    doc.text(badgeLabel, marginL + contentW - badgeW / 2, curY + 4.2, { align: "center" });

    curY += barH;

    // ── Sub-header: MITRE + approval tag (light background) ────────────────────

    doc.setFillColor(...C.rowAlt);
    doc.rect(marginL, curY - 0.5, contentW, 7, "F");

    if (s.status === "approved") {
      doc.setFillColor(...C.cyanDark);
      doc.roundedRect(marginL + 1, curY, 36, 5.2, 0.8, 0.8, "F");
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...C.white);
      doc.text("APPROVED FOR TESTING", marginL + 19, curY + 3.8, { align: "center" });
    }

    const mitreX = s.status === "approved" ? marginL + 40 : marginL + 2;
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.mutedText);
    doc.text(`MITRE ${s.mitreId}  ·  ${s.mitreTactic}`, mitreX, curY + 4);

    curY += 9;

    // ── Attack Vector ─────────────────────────────────────────────────────────

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.labelText);
    doc.text("ATTACK VECTOR", marginL, curY);
    curY += 4.5;

    doc.setFont("courier", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...C.cyanDark);
    const vectorLines = wrapText(doc, s.attackVector, contentW, 8.5);
    doc.text(vectorLines, marginL, curY);
    curY += vectorLines.length * 4.5 + 5;

    // ── Attack Description ────────────────────────────────────────────────────

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...C.labelText);
    doc.text("ATTACK DESCRIPTION", marginL, curY);
    curY += 4.5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...C.bodyText);
    const descLines = wrapText(doc, s.description, contentW, 9);
    doc.text(descLines, marginL, curY);
    curY += descLines.length * 5 + 5;

    // ── Attack Chain ──────────────────────────────────────────────────────────

    if (s.attackChain && s.attackChain.length > 0) {
      if (curY > ph - 55) curY = newPage(doc);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(...C.labelText);
      doc.text("ATTACK CHAIN", marginL, curY);
      curY += 4;

      autoTable(doc, {
        startY: curY,
        body: s.attackChain.map((step, i) => [String(i + 1).padStart(2, "0"), step]),
        styles: {
          fillColor: C.chainBg,
          textColor: C.bodyText,
          lineColor: C.chainBorder,
          lineWidth: 0.25,
          fontSize: 8.5,
          cellPadding: 2.8,
          font: "helvetica",
        },
        columnStyles: {
          0: { cellWidth: 10, textColor: C.chainNum, fontStyle: "bold", halign: "center" },
          1: { cellWidth: contentW - 10 },
        },
        margin: { left: marginL, right: marginR },
      });

      curY = finalY(doc) + 5;
    }

    // ── Estimated Impact ──────────────────────────────────────────────────────

    if (curY > ph - 38) curY = newPage(doc);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...C.labelText);
    doc.text("ESTIMATED IMPACT", marginL, curY);
    curY += 4;

    const impactLines = wrapText(doc, s.estimatedImpact, contentW - 6, 9);
    const impactH = impactLines.length * 5 + 6;

    doc.setFillColor(...C.impactBg);
    doc.setDrawColor(...C.impactBorder);
    doc.setLineWidth(0.4);
    doc.rect(marginL, curY, contentW, impactH, "FD");

    // left accent bar
    doc.setFillColor(...C.impactBorder);
    doc.rect(marginL, curY, 2.5, impactH, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...C.impactText);
    doc.text(impactLines, marginL + 5, curY + 4.5);
    curY += impactH + 5;

    // ── Defense Playbook ──────────────────────────────────────────────────────

    if (curY > ph - 55) curY = newPage(doc);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...C.labelText);
    doc.text("DEFENSE PLAYBOOK", marginL, curY);
    curY += 4;

    autoTable(doc, {
      startY: curY,
      body: s.defensePlaybook.map((step, i) => [String(i + 1), step]),
      styles: {
        fillColor: C.playbookBg,
        textColor: C.bodyText,
        lineColor: C.playbookBorder,
        lineWidth: 0.25,
        fontSize: 8.5,
        cellPadding: 2.8,
        font: "helvetica",
      },
      columnStyles: {
        0: { cellWidth: 8, textColor: C.playbookNum, fontStyle: "bold", halign: "center" },
        1: { cellWidth: contentW - 8 },
      },
      margin: { left: marginL, right: marginR },
    });

    curY = finalY(doc) + 10;

    // Divider between scenarios
    if (idx < scenarios.length - 1) {
      if (curY > ph - 20) {
        curY = newPage(doc);
      } else {
        rule(doc, curY - 4, marginL, contentW);
      }
    }
  }

  // ── Test Queue Summary ────────────────────────────────────────────────────────

  if (approvedScenarios.length > 0) {
    if (curY > ph - 60) curY = newPage(doc);

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.headingText);
    doc.text("Test Queue Summary", marginL, curY);
    curY += 7;

    autoTable(doc, {
      startY: curY,
      head: [["#", "Scenario", "Severity", "MITRE ID"]],
      body: approvedScenarios.map((s, i) => [String(i + 1), s.title, s.severity, s.mitreId]),
      styles: {
        fillColor: C.white,
        textColor: C.bodyText,
        lineColor: C.border,
        lineWidth: 0.3,
        fontSize: 9,
        cellPadding: 3,
        font: "helvetica",
      },
      headStyles: {
        fillColor: C.navyLight,
        textColor: C.headerText,
        fontStyle: "bold",
        fontSize: 8,
      },
      alternateRowStyles: { fillColor: C.rowAlt },
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        1: { cellWidth: contentW - 60 },
        2: { cellWidth: 25, halign: "center" },
        3: { cellWidth: 25, halign: "center" },
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 2) {
          data.cell.styles.textColor = sevText(String(data.cell.raw));
          data.cell.styles.fontStyle = "bold";
        }
      },
      margin: { left: marginL, right: marginR },
    });
  }

  // ── Footers & save ────────────────────────────────────────────────────────────

  addFooters(doc, companyName);

  const filename = `redteam-report-${now.toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
