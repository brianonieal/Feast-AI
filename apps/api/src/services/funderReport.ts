// @version 1.4.0 - Harvest
// Generates funder report PDF using pdf-lib (pure TypeScript, Vercel-compatible)
// No Python, no child_process, no filesystem writes — all in-memory

import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import type { ImpactMetrics } from "./analytics";

// ── Design tokens (0-1 scale for pdf-lib) ────────────────────────

const NAVY = rgb(45 / 255, 27 / 255, 105 / 255);
const MUSTARD = rgb(201 / 255, 123 / 255, 26 / 255);
const TEAL = rgb(29 / 255, 158 / 255, 117 / 255);
const CREAM = rgb(247 / 255, 242 / 255, 234 / 255);
const INK = rgb(26 / 255, 20 / 255, 41 / 255);
const INK_LT = rgb(148 / 255, 144 / 255, 176 / 255);
const WHITE = rgb(1, 1, 1);

/**
 * Generate a funder report PDF entirely in-memory.
 * Returns a Buffer suitable for HTTP binary response.
 */
export async function generateFunderReportPDF(
  metrics: ImpactMetrics,
  month: string
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]); // US Letter
  const { width, height } = page.getSize();

  // Embed fonts
  const timesItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const margin = 54; // 0.75 inch
  const contentWidth = width - margin * 2;
  let y = height - margin;

  // ── Helper functions ─────────────────────────────────────────

  const drawText = (
    text: string,
    x: number,
    yPos: number,
    opts: {
      font: typeof helvetica;
      size: number;
      color: typeof NAVY;
    }
  ) => {
    page.drawText(text, {
      x,
      y: yPos,
      font: opts.font,
      size: opts.size,
      color: opts.color,
    });
  };

  const drawLine = (yPos: number, color: typeof NAVY, thickness = 1) => {
    page.drawLine({
      start: { x: margin, y: yPos },
      end: { x: width - margin, y: yPos },
      thickness,
      color,
    });
  };

  const drawRow = (
    label: string,
    value: string,
    yPos: number,
    bgColor?: typeof CREAM
  ) => {
    if (bgColor) {
      page.drawRectangle({
        x: margin,
        y: yPos - 4,
        width: contentWidth,
        height: 22,
        color: bgColor,
      });
    }
    drawText(label, margin + 12, yPos + 4, {
      font: helvetica,
      size: 10,
      color: INK,
    });
    drawText(value, width - margin - 80, yPos + 4, {
      font: helveticaBold,
      size: 10,
      color: INK,
    });
  };

  // ── 1. Title header ──────────────────────────────────────────

  drawText("The Feast", margin, y, {
    font: timesItalic,
    size: 28,
    color: NAVY,
  });
  y -= 20;

  drawText(`Community Impact Report — ${month}`, margin, y, {
    font: helvetica,
    size: 12,
    color: INK_LT,
  });
  y -= 20;

  // ── 2. Divider ───────────────────────────────────────────────

  drawLine(y, NAVY, 1.5);
  y -= 28;

  // ── 3. Impact at a Glance ────────────────────────────────────

  drawText("IMPACT AT A GLANCE", margin, y, {
    font: helveticaBold,
    size: 9,
    color: MUSTARD,
  });
  y -= 20;

  // Header row
  page.drawRectangle({
    x: margin,
    y: y - 4,
    width: contentWidth,
    height: 22,
    color: NAVY,
  });
  drawText("Metric", margin + 12, y + 4, {
    font: helveticaBold,
    size: 10,
    color: WHITE,
  });
  drawText("Count", width - margin - 80, y + 4, {
    font: helveticaBold,
    size: 10,
    color: WHITE,
  });
  y -= 24;

  // Data rows
  const impactRows: [string, string][] = [
    ["Dinners Hosted", String(metrics.dinnersHosted)],
    ["People Connected", String(metrics.peopleConnected)],
    ["Cities Reached", String(metrics.citiesReached)],
    ["Reflections Shared", String(metrics.reflectionsShared)],
    ["Active Hosts", String(metrics.hostsActive)],
    ["Active Facilitators", String(metrics.facilitatorsActive)],
  ];

  impactRows.forEach(([label, value], i) => {
    drawRow(label, value, y, i % 2 === 0 ? CREAM : undefined);
    y -= 24;
  });

  y -= 12;

  // ── 4. 100 Dinners Campaign ──────────────────────────────────

  drawText("100 DINNERS CAMPAIGN", margin, y, {
    font: helveticaBold,
    size: 9,
    color: MUSTARD,
  });
  y -= 16;

  drawText(
    `The Feast is on a mission to host 100 dinners across the country.`,
    margin,
    y,
    { font: helvetica, size: 10, color: INK }
  );
  y -= 14;

  drawText(
    `Completed: ${metrics.campaignDinners} of 100 dinners (${metrics.campaignPercent.toFixed(1)}% of goal).`,
    margin,
    y,
    { font: helveticaBold, size: 10, color: INK }
  );
  y -= 20;

  // Progress bar
  const barHeight = 16;
  const pct = Math.min(1.0, metrics.campaignDinners / 100);
  const filledWidth = contentWidth * pct;

  // Background bar (cream)
  page.drawRectangle({
    x: margin,
    y: y - barHeight + 4,
    width: contentWidth,
    height: barHeight,
    color: CREAM,
  });

  // Filled bar (teal)
  if (filledWidth > 0) {
    page.drawRectangle({
      x: margin,
      y: y - barHeight + 4,
      width: filledWidth,
      height: barHeight,
      color: TEAL,
    });
  }

  // Bar label
  drawText(`${metrics.campaignDinners}/100`, margin + 8, y - barHeight + 8, {
    font: helveticaBold,
    size: 8,
    color: filledWidth > 60 ? WHITE : INK,
  });

  y -= barHeight + 20;

  // ── 5. Community Health Score ─────────────────────────────────

  drawText("COMMUNITY HEALTH", margin, y, {
    font: helveticaBold,
    size: 9,
    color: MUSTARD,
  });
  y -= 22;

  const healthLabel =
    metrics.healthScore >= 80
      ? "Thriving"
      : metrics.healthScore >= 50
        ? "Growing"
        : "Emerging";

  drawText(String(metrics.healthScore), margin, y, {
    font: timesItalic,
    size: 48,
    color: NAVY,
  });
  drawText(`/ 100  —  ${healthLabel}`, margin + 60, y + 14, {
    font: helvetica,
    size: 14,
    color: INK_LT,
  });

  y -= 40;

  // ── 6. This Month ────────────────────────────────────────────

  drawText("THIS MONTH", margin, y, {
    font: helveticaBold,
    size: 9,
    color: MUSTARD,
  });
  y -= 20;

  const monthlyRows: [string, string][] = [
    ["New Members", String(metrics.newMembersThisMonth)],
    ["New Events", String(metrics.newEventsThisMonth)],
    ["Avg Attendance Rate", `${metrics.avgAttendanceRate}%`],
  ];

  monthlyRows.forEach(([label, value], i) => {
    drawRow(label, value, y, i % 2 === 0 ? CREAM : undefined);
    y -= 24;
  });

  y -= 20;

  // ── 7. Footer ────────────────────────────────────────────────

  drawLine(y, INK_LT, 0.5);
  y -= 16;

  const generated = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const footerText = `Generated ${generated}  ·  The Feast  ·  feastongood.com`;
  const footerWidth = helvetica.widthOfTextAtSize(footerText, 8);
  drawText(footerText, (width - footerWidth) / 2, y, {
    font: helvetica,
    size: 8,
    color: INK_LT,
  });

  // ── Save and return ──────────────────────────────────────────

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
