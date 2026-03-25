// @version 1.4.0 - Harvest: funder report PDF export
// POST /api/analytics/funder-report/export — founding_table only
// Returns PDF binary as downloadable file
// Rate limit: distribution tier (expensive operation)

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { applyRateLimit } from "@/lib/rateLimit";
import { getImpactMetrics } from "@/services/analytics";
import { generateFunderReportPDF } from "@/services/funderReport";

export async function POST(req: NextRequest) {
  const limited = await applyRateLimit(req, "distribution");
  if (limited) return limited;

  const { userId, sessionClaims } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  // founding_table only
  const tier = (sessionClaims?.publicMetadata as { tier?: string })?.tier;
  if (tier !== "founding_table") {
    return NextResponse.json(
      { error: "Forbidden", code: "FORBIDDEN" },
      { status: 403 }
    );
  }

  const metrics = await getImpactMetrics();
  const month = new Date().toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const pdfBuffer = await generateFunderReportPDF(metrics, month);

  // URL-safe filename: 'March 2026' → 'march-2026'
  const safeMonth = month.toLowerCase().replace(/\s+/g, "-");

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="feast-impact-${safeMonth}.pdf"`,
      "Content-Length": pdfBuffer.length.toString(),
    },
  });
}
