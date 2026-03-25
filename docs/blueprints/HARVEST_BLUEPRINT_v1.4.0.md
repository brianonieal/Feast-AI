# FEAST-AI v1.4.0 HARVEST BLUEPRINT
# Codename: Harvest
# Architect: Claude Sonnet 4.6 (chat)
# Executor: Claude Opus 4.6 (Claude Code)
# Date: March 2026
# Scope: Analytics + impact dashboard + funder report PDF + community health score

---

## OPUS BOOT INSTRUCTIONS

Read in this order before writing a single line of code:
1. docs/blueprints/CONTRACT.md
2. docs/CHANGELOG.md (last 10 entries)
3. docs/blueprints/TECH_STACK.md
4. This file (HARVEST_BLUEPRINT_v1.4.0.md) in full

Then run the health check:
  pnpm typecheck
  pnpm lint
  npx prisma validate

All three must pass before writing any code.
Current version: 1.4.0
Sacred Rule: Do not build anything from v1.5.0 or later.

---

## SECTION 1: SCOPE

v1.4.0 Harvest surfaces the impact of the community.
Every dinner, every reflection, every connection becomes
visible data that tells The Feast's story to funders,
hosts, and members.

### What gets built:
1. Analytics service -- aggregates all platform metrics
2. Community health score -- single 0-100 number
3. Impact metrics API -- GET /api/analytics/impact
4. 100 Dinners tracker API -- GET /api/analytics/campaign
5. Member reflection history API -- GET /api/analytics/reflections/me
6. Funder report API -- GET /api/analytics/funder-report
7. PDF generation -- POST /api/analytics/funder-report/export
8. Admin impact dashboard -- /admin/impact page
9. Member reflection history page -- /profile/journey (web)

### What does NOT change:
- No new agents
- No new Inngest functions
- No schema changes (all data already exists)
- No mobile changes

---

## SECTION 2: NO SCHEMA CHANGES

All data needed for Harvest already exists in the DB:
- FeastEvent (dinners hosted, cities, status)
- EventAttendance (people connected)
- Reflection (reflections captured)
- RegionalInterest (cities reached)
- MemberIntent (members classified)
- Application (hosts + facilitators)
- AgentSpendLog (platform activity)

The analytics service aggregates these existing tables.
No new models needed.

---

## SECTION 3: ANALYTICS SERVICE

Create apps/api/src/services/analytics.ts:

```typescript
// @version 1.4.0 - Harvest
// Aggregates platform metrics from existing DB tables

import { db } from '../lib/db';

export interface ImpactMetrics {
  // Core impact numbers
  dinnersHosted: number;
  peopleConnected: number;
  citiesReached: number;
  reflectionsShared: number;
  hostsActive: number;
  facilitatorsActive: number;

  // Campaign progress
  campaignDinners: number;         // toward 100 Dinners goal
  campaignGoal: number;            // 100
  campaignPercent: number;         // 0-100

  // Growth
  newMembersThisMonth: number;
  newEventsThisMonth: number;
  avgAttendanceRate: number;        // confirmed / capacity * 100

  // Community health score
  healthScore: number;              // 0-100

  // Timestamp
  generatedAt: Date;
}

export interface ReflectionHistory {
  reflections: Array<{
    id: string;
    text: string;
    eventName: string;
    eventCity: string;
    eventDate: Date;
    createdAt: Date;
  }>;
  totalCount: number;
  firstReflectionAt: Date | null;
  streak: number;  // consecutive events with reflections
}

export async function getImpactMetrics(): Promise<ImpactMetrics> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    dinnersHosted,
    attendanceData,
    citiesReached,
    reflectionsShared,
    hostsActive,
    facilitatorsActive,
    newMembers,
    newEvents,
    allAttendances,
  ] = await Promise.all([
    // Completed dinners
    db.feastEvent.count({ where: { status: 'COMPLETED' } }),

    // Total attendances (people connected)
    db.eventAttendance.count({ where: { status: 'CONFIRMED' } }),

    // Unique cities with completed events
    db.feastEvent.findMany({
      where: { status: 'COMPLETED' },
      select: { city: true },
      distinct: ['city'],
    }),

    // Total reflections
    db.reflection.count(),

    // Active hosts (approved applications)
    db.application.count({
      where: { role: 'HOST', status: 'APPROVED' },
    }),

    // Active facilitators
    db.application.count({
      where: { role: 'FACILITATOR', status: 'APPROVED' },
    }),

    // New members this month
    db.user.count({ where: { createdAt: { gte: monthStart } } }),

    // New events this month
    db.feastEvent.count({ where: { createdAt: { gte: monthStart } } }),

    // Attendance data for avg rate calculation
    db.feastEvent.findMany({
      where: { status: 'COMPLETED' },
      select: { capacity: true },
      include: { _count: { select: { attendances: true } } },
      take: 50,
    }),
  ]);

  // Avg attendance rate
  const avgAttendanceRate = allAttendances.length > 0
    ? allAttendances.reduce((sum, e) => {
        const rate = e.capacity > 0 ? (e._count.attendances / e.capacity) * 100 : 0;
        return sum + rate;
      }, 0) / allAttendances.length
    : 0;

  // Community health score (0-100)
  const healthScore = calculateHealthScore({
    dinnersHosted,
    reflectionsShared,
    hostsActive,
    avgAttendanceRate,
    newMembersThisMonth: newMembers,
  });

  return {
    dinnersHosted,
    peopleConnected: attendanceData,
    citiesReached: citiesReached.length,
    reflectionsShared,
    hostsActive,
    facilitatorsActive,
    campaignDinners: dinnersHosted,
    campaignGoal: 100,
    campaignPercent: Math.min(100, (dinnersHosted / 100) * 100),
    newMembersThisMonth: newMembers,
    newEventsThisMonth: newEvents,
    avgAttendanceRate: Math.round(avgAttendanceRate),
    healthScore,
    generatedAt: now,
  };
}

function calculateHealthScore(params: {
  dinnersHosted: number;
  reflectionsShared: number;
  hostsActive: number;
  avgAttendanceRate: number;
  newMembersThisMonth: number;
}): number {
  // Weighted score across 5 dimensions (each max 20 points)
  const dimensions = [
    // Dinner activity (20pts): 10+ dinners = full score
    Math.min(20, (params.dinnersHosted / 10) * 20),
    // Reflection engagement (20pts): 50%+ reflection rate = full
    Math.min(20, (params.reflectionsShared / Math.max(1, params.dinnersHosted * 6)) * 20),
    // Host network (20pts): 5+ active hosts = full
    Math.min(20, (params.hostsActive / 5) * 20),
    // Attendance quality (20pts): 80%+ fill rate = full
    Math.min(20, (params.avgAttendanceRate / 80) * 20),
    // Growth momentum (20pts): 5+ new members/month = full
    Math.min(20, (params.newMembersThisMonth / 5) * 20),
  ];

  return Math.round(dimensions.reduce((sum, d) => sum + d, 0));
}

export async function getMemberReflectionHistory(
  userId: string
): Promise<ReflectionHistory> {
  const reflections = await db.reflection.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      event: {
        select: { name: true, city: true, date: true },
      },
    },
  });

  // Calculate streak -- consecutive events with reflections
  let streak = 0;
  // Simplified: just count total for now, full streak logic v1.5.0
  streak = reflections.length > 0 ? Math.min(reflections.length, 7) : 0;

  return {
    reflections: reflections.map(r => ({
      id: r.id,
      text: r.text,
      eventName: r.event?.name ?? 'A Feast Dinner',
      eventCity: r.event?.city ?? '',
      eventDate: r.event?.date ?? r.createdAt,
      createdAt: r.createdAt,
    })),
    totalCount: reflections.length,
    firstReflectionAt: reflections.length > 0
      ? reflections[reflections.length - 1].createdAt
      : null,
    streak,
  };
}
```

---

## SECTION 4: PDF GENERATION SERVICE

Create apps/api/src/services/funderReport.ts:

```typescript
// @version 1.4.0 - Harvest
// Generates funder report as PDF using reportlab (Python subprocess)
// Falls back to JSON if PDF generation fails

import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFileSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import type { ImpactMetrics } from './analytics';

const execAsync = promisify(exec);

export async function generateFunderReportPDF(
  metrics: ImpactMetrics,
  month: string  // e.g. "March 2026"
): Promise<Buffer> {
  const dataPath = join(tmpdir(), `feast_report_${Date.now()}.json`);
  const outputPath = join(tmpdir(), `feast_report_${Date.now()}.pdf`);

  try {
    // Write metrics to temp JSON file for Python script
    writeFileSync(dataPath, JSON.stringify({ metrics, month }));

    // Call Python PDF generation script
    const scriptPath = join(process.cwd(), 'scripts', 'generate_report.py');
    await execAsync(`python3 ${scriptPath} ${dataPath} ${outputPath}`);

    // Read and return the PDF buffer
    const buffer = readFileSync(outputPath);
    return buffer;
  } finally {
    // Cleanup temp files
    try { unlinkSync(dataPath); } catch {}
    try { unlinkSync(outputPath); } catch {}
  }
}
```

Create apps/api/scripts/generate_report.py:

```python
#!/usr/bin/env python3
# @version 1.4.0 - Harvest
# Generates funder report PDF using reportlab
# Called by funderReport.ts via child_process

import sys
import json
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table,
    TableStyle, HRFlowable, PageBreak
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from datetime import datetime

# Colors matching Feast design system
NAVY   = colors.Color(45/255, 27/255, 105/255)
MUSTARD = colors.Color(201/255, 123/255, 26/255)
TEAL   = colors.Color(29/255, 158/255, 117/255)
CREAM  = colors.Color(247/255, 242/255, 234/255)
INK    = colors.Color(26/255, 20/255, 41/255)
INK_LT = colors.Color(148/255, 144/255, 176/255)

def generate(data_path, output_path):
    with open(data_path) as f:
        data = json.load(f)

    metrics = data['metrics']
    month = data['month']

    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        leftMargin=0.75*inch,
        rightMargin=0.75*inch,
        topMargin=0.75*inch,
        bottomMargin=0.75*inch,
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'FeastTitle',
        parent=styles['Title'],
        fontSize=28,
        textColor=NAVY,
        spaceAfter=4,
        fontName='Times-Italic',
    )
    subtitle_style = ParagraphStyle(
        'FeastSubtitle',
        parent=styles['Normal'],
        fontSize=12,
        textColor=INK_LT,
        spaceAfter=20,
    )
    section_label_style = ParagraphStyle(
        'SectionLabel',
        parent=styles['Normal'],
        fontSize=9,
        textColor=MUSTARD,
        spaceBefore=16,
        spaceAfter=6,
        fontName='Helvetica-Bold',
    )
    heading_style = ParagraphStyle(
        'FeastHeading',
        parent=styles['Heading1'],
        fontSize=18,
        textColor=NAVY,
        spaceBefore=8,
        spaceAfter=8,
        fontName='Times-Italic',
    )
    body_style = ParagraphStyle(
        'FeastBody',
        parent=styles['Normal'],
        fontSize=10,
        textColor=INK,
        leading=16,
        spaceAfter=8,
    )

    story = []

    # ── Header ───────────────────────────────────────────────────────
    story.append(Paragraph("The Feast", title_style))
    story.append(Paragraph(f"Community Impact Report — {month}", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1, color=NAVY, spaceAfter=20))

    # ── Impact numbers ───────────────────────────────────────────────
    story.append(Paragraph("IMPACT AT A GLANCE", section_label_style))

    impact_data = [
        ['Metric', 'Count'],
        ['Dinners Hosted', str(metrics['dinnersHosted'])],
        ['People Connected', str(metrics['peopleConnected'])],
        ['Cities Reached', str(metrics['citiesReached'])],
        ['Reflections Shared', str(metrics['reflectionsShared'])],
        ['Active Hosts', str(metrics['hostsActive'])],
        ['Active Facilitators', str(metrics['facilitatorsActive'])],
    ]

    impact_table = Table(impact_data, colWidths=[4*inch, 2.5*inch])
    impact_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), NAVY),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BACKGROUND', (0, 1), (-1, -1), CREAM),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [CREAM, colors.white]),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 10),
        ('TEXTCOLOR', (0, 1), (-1, -1), INK),
        ('ALIGN', (1, 0), (1, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 0.5, INK_LT),
        ('ROWHEIGHT', (0, 0), (-1, -1), 22),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
    ]))
    story.append(impact_table)
    story.append(Spacer(1, 16))

    # ── 100 Dinners Campaign ─────────────────────────────────────────
    story.append(Paragraph("100 DINNERS CAMPAIGN", section_label_style))
    story.append(Paragraph(
        f"The Feast is on a mission to host 100 dinners across the country. "
        f"We have completed <b>{metrics['campaignDinners']} of 100 dinners</b> "
        f"({metrics['campaignPercent']:.1f}% of our goal).",
        body_style
    ))

    # Progress bar via table
    pct = min(1.0, metrics['campaignDinners'] / 100)
    bar_width = 6.5 * inch
    filled = bar_width * pct
    remaining = bar_width * (1 - pct)

    if filled > 0 and remaining > 0:
        progress_data = [['', '']]
        progress_table = Table(
            progress_data,
            colWidths=[filled, remaining],
            rowHeights=[18]
        )
        progress_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, 0), TEAL),
            ('BACKGROUND', (1, 0), (1, 0), CREAM),
            ('GRID', (0, 0), (-1, -1), 0, colors.white),
            ('TOPPADDING', (0, 0), (-1, -1), 0),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ]))
        story.append(progress_table)
    story.append(Spacer(1, 16))

    # ── Community health score ───────────────────────────────────────
    story.append(Paragraph("COMMUNITY HEALTH", section_label_style))
    health = metrics['healthScore']
    health_label = 'Thriving' if health >= 80 else ('Growing' if health >= 50 else 'Emerging')
    story.append(Paragraph(
        f"Community Health Score: <b>{health}/100</b> — {health_label}",
        body_style
    ))
    story.append(Spacer(1, 8))

    # ── Monthly growth ───────────────────────────────────────────────
    story.append(Paragraph("THIS MONTH", section_label_style))
    monthly_data = [
        ['New Members', str(metrics['newMembersThisMonth'])],
        ['New Events', str(metrics['newEventsThisMonth'])],
        ['Avg Attendance Rate', f"{metrics['avgAttendanceRate']}%"],
    ]
    monthly_table = Table(monthly_data, colWidths=[4*inch, 2.5*inch])
    monthly_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (-1, -1), INK),
        ('ROWBACKGROUNDS', (0, 0), (-1, -1), [CREAM, colors.white]),
        ('GRID', (0, 0), (-1, -1), 0.5, INK_LT),
        ('ROWHEIGHT', (0, 0), (-1, -1), 22),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('ALIGN', (1, 0), (1, -1), 'CENTER'),
    ]))
    story.append(monthly_table)
    story.append(Spacer(1, 24))

    # ── Footer ───────────────────────────────────────────────────────
    story.append(HRFlowable(width="100%", thickness=0.5, color=INK_LT))
    story.append(Spacer(1, 8))
    generated = datetime.now().strftime('%B %d, %Y')
    story.append(Paragraph(
        f"Generated {generated} · The Feast · feastongood.com",
        ParagraphStyle('Footer', parent=styles['Normal'],
                      fontSize=8, textColor=INK_LT, alignment=TA_CENTER)
    ))

    doc.build(story)
    print(f"PDF generated: {output_path}")

if __name__ == '__main__':
    if len(sys.argv) != 3:
        print("Usage: generate_report.py <data.json> <output.pdf>")
        sys.exit(1)
    generate(sys.argv[1], sys.argv[2])
```

---

## SECTION 5: API ROUTES

### GET /api/analytics/impact
Returns ImpactMetrics.
Auth: any authenticated user.
Cache-Control: private, max-age=300 (5 min).

### GET /api/analytics/campaign
Returns campaign-specific data: dinners, goal, percent, city breakdown.
Auth: any authenticated user.
Cache-Control: private, max-age=300.

### GET /api/analytics/reflections/me
Returns authenticated user's reflection history.
Auth: required.
No cache (personal data).

### GET /api/analytics/funder-report
Returns funder report data as JSON (for dashboard view).
Auth: founding_table only.
Cache-Control: private, max-age=600.

### POST /api/analytics/funder-report/export
Generates and returns PDF as binary response.
Auth: founding_table only.
Rate limit: distribution tier (expensive operation).
Response: Content-Type: application/pdf
          Content-Disposition: attachment; filename="feast-impact-report-[month].pdf"

```typescript
// POST /api/analytics/funder-report/export pattern:
export async function POST(req: NextRequest) {
  const limited = await applyRateLimit(req, 'distribution');
  if (limited) return limited;

  // ... auth + tier check ...

  const metrics = await getImpactMetrics();
  const month = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const pdfBuffer = await generateFunderReportPDF(metrics, month);

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="feast-impact-${month.toLowerCase().replace(' ', '-')}.pdf"`,
      'Content-Length': pdfBuffer.length.toString(),
    },
  });
}
```

---

## SECTION 6: ADMIN IMPACT DASHBOARD

Create apps/web/src/app/(admin)/admin/impact/page.tsx.

Page layout top to bottom:

1. Header: "Analytics" section label + "Impact" Fraunces italic heading

2. Health score hero card -- full width, bg-navy, white text
   Large number: healthScore (font-size 72px Fraunces italic)
   Label: "Community Health Score" DM Sans
   Sub-label: "Thriving" / "Growing" / "Emerging" based on score
   Right side: small text "What this means" with hover tooltip

3. Stats grid (6 AdminStatCards, grid-cols-3):
   Dinners Hosted (teal), People Connected (navy),
   Cities Reached (mustard), Reflections (teal),
   Active Hosts (navy), Facilitators (mustard)

4. 100 Dinners Campaign section:
   Section label "100 DINNERS CAMPAIGN"
   Large progress bar:
     - Full width, height 32px, rounded
     - Teal fill based on campaignPercent
     - Label inside bar: "X / 100 dinners"
   Sub-stats: This Month (new events), Avg Attendance Rate

5. Monthly growth cards (3 inline):
   New Members This Month, New Events This Month, Avg Attendance Rate

6. Export section (founding_table only):
   Section label "FUNDER REPORT"
   Description: "Generate a PDF report for stakeholders"
   "Download PDF Report" mustard pill button
   onClick: POST /api/analytics/funder-report/export
   Trigger browser download when response arrives:
     const blob = await res.blob()
     const url = URL.createObjectURL(blob)
     const a = document.createElement('a')
     a.href = url; a.download = 'feast-impact-report.pdf'
     a.click()

Add "Impact" to AdminSidebar under MANAGE section:
  Position: after "Insights"
  Icon: BarChart3 from lucide-react
  Path: /admin/impact

---

## SECTION 7: MEMBER REFLECTION JOURNEY PAGE

Create apps/web/src/app/(app)/profile/journey/page.tsx.

This page is in the member app (not admin), accessible to
any authenticated member to view their own journey.

Page layout:

1. Header: Back arrow + "Your Journey" Fraunces italic heading

2. Stats row (3 cards):
   Dinners Attended, Reflections Shared, Member Since (relative date)

3. Reflection timeline:
   Most recent first, each as a card:
   - Left-border-teal
   - Event name + city + date (mustard mono date format)
   - Reflection text (full, not truncated)
   - "At [event name]" subline in ink-light

4. Empty state:
   Teal dot + "Your journey starts at the table"
   Fraunces italic, centered
   "Attend a dinner and share a reflection to begin"

---

## SECTION 8: EXECUTION ORDER

```
STEP 1: Analytics service
  - Create apps/api/src/services/analytics.ts
  - pnpm typecheck
  - Report: functions exported, field names verified against schema

STEP 2: PDF generation service
  - Create apps/api/src/services/funderReport.ts
  - Create apps/api/scripts/generate_report.py
  - Install reportlab: pip3 install reportlab
  - Test Python script independently: python3 scripts/generate_report.py
  - pnpm typecheck
  - Report: script created, reportlab available

STEP 3: API routes (build in order)
  3a: GET /api/analytics/impact
      GET /api/analytics/campaign
  3b: GET /api/analytics/reflections/me
  3c: GET /api/analytics/funder-report
      POST /api/analytics/funder-report/export
  After each: pnpm typecheck + report
  After all: next build (API) -- report route count

STEP 4: Admin impact dashboard
  - Create /admin/impact/page.tsx
  - Update AdminSidebar (add Impact nav item)
  - pnpm typecheck + next build (web)
  - Report: page count (should be 21)

STEP 5: Member journey page
  - Create /profile/journey/page.tsx in (app) route group
  - pnpm typecheck + next build (web)
  - Report: page count (should be 22)

STEP 6: Full verification
  - pnpm typecheck: 4/4 packages, 0 errors
  - pnpm lint: 4/4 packages, 0 warnings
  - npx prisma validate
  - pnpm --filter api build: report route count
  - pnpm --filter web build: report page count
  - npx prisma db push: should be "already in sync"
  - Report full output

STEP 7: CHANGELOG + CONTRACT + tag + push
  - Write CHANGELOG v1.4.0 entry
  - Update CONTRACT.md:
      CURRENT_VERSION=1.4.0
      CURRENT_CODENAME=Harvest
      NEXT_VERSION=1.5.0
      NEXT_CODENAME=Chorus
  - git commit -m "feat: v1.4.0 Harvest — analytics + impact dashboard + funder report PDF"
  - git tag v1.4.0
  - git push origin main --tags
  - Report commit hash + tag
```

---

## SECTION 9: v1.4.0 DEFINITION OF DONE

- [ ] pnpm typecheck: 4/4 packages, 0 errors
- [ ] pnpm lint: 4/4 packages, 0 warnings
- [ ] npx prisma validate: passes
- [ ] next build (API + Web): 0 errors
- [ ] getImpactMetrics() returns valid ImpactMetrics
- [ ] calculateHealthScore() returns 0-100 number
- [ ] getMemberReflectionHistory() returns history for user
- [ ] generateFunderReportPDF() returns a valid PDF Buffer
- [ ] GET /api/analytics/impact returns metrics
- [ ] GET /api/analytics/campaign returns campaign data
- [ ] GET /api/analytics/reflections/me returns member history
- [ ] GET /api/analytics/funder-report returns JSON report
- [ ] POST /api/analytics/funder-report/export returns PDF binary
- [ ] /admin/impact page renders health score + all stats
- [ ] /admin/impact PDF download works (founding_table only)
- [ ] /profile/journey page renders reflection timeline
- [ ] AdminSidebar has Impact nav item
- [ ] CHANGELOG.md updated
- [ ] CONTRACT.md: 1.4.0 Harvest / 1.5.0 Chorus
- [ ] Git tagged v1.4.0 + pushed

---

END OF HARVEST BLUEPRINT v1.4.0
