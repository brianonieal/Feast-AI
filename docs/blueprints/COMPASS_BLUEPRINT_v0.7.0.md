# FEAST-AI v0.7.0 COMPASS BLUEPRINT
# Codename: Compass
# Architect: Claude Sonnet 4.6 (chat)
# Executor: Claude Opus 4.6 (Claude Code)
# Date: March 2026
# Scope: Member onboarding + classification + CRM sync + welcome emails

---

## OPUS BOOT INSTRUCTIONS

Read in this order before writing a single line of code:
1. docs/blueprints/CONTRACT.md
2. docs/CHANGELOG.md (last 10 entries)
3. docs/blueprints/TECH_STACK.md
4. docs/blueprints/COUNCIL_AGENTS.md
5. This file (COMPASS_BLUEPRINT_v0.7.0.md) in full

Then run the health check:
  pnpm typecheck
  pnpm lint
  npx prisma validate

All three must pass before writing any code.
Current version: 0.7.0
Sacred Rule: Do not build anything from v0.8.0 or later.

---

## SECTION 1: SCOPE

v0.7.0 Compass builds exactly these things. Nothing more.

### What gets built:
1. Application model -- Prisma schema for host/facilitator applications
2. MemberIntent model -- tracks classification results per user
3. Resend email adapter -- transactional welcome emails
4. @SAGE extended -- "How Will You Feast?" classification flow
5. POST /api/applications -- wires the /apply frontend form to the backend
6. POST /api/onboarding/classify -- classifies a new member's intent
7. Inngest pipeline -- application-submitted pipeline (save → classify → email)
8. Welcome email templates -- one per classification path (4 paths)
9. HubSpot contact sync -- stubbed with clear TODO comments
10. Regional interest tracking -- city-based interest count in DB

### What does NOT get built in this version:
- @GUARDIAN cost monitoring (v0.8.0 Shield)
- Rate limit dashboard (v0.8.0)
- Admin web dashboard (v0.9.0 Lens)
- Any frontend changes (frontend sprint is complete)
- Real HubSpot contact creation (placeholder -- stubbed)
- Twilio SMS onboarding (placeholder -- stubbed)

---

## SECTION 2: PRISMA SCHEMA ADDITIONS

Add to apps/api/prisma/schema.prisma. Append only -- do not modify existing models.

```prisma
// @version 0.7.0 - Compass

model Application {
  id              String            @id @default(cuid())
  userId          String            @map("user_id")
  user            User              @relation(fields: [userId], references: [id])
  role            ApplicationRole
  name            String
  city            String
  isOrganizer     String?           @map("is_organizer")   // textarea response
  motivation      String?                                   // textarea response
  status          ApplicationStatus @default(PENDING)
  reviewedBy      String?           @map("reviewed_by")
  reviewedAt      DateTime?         @map("reviewed_at")
  notes           String?
  createdAt       DateTime          @default(now()) @map("created_at")
  updatedAt       DateTime          @updatedAt @map("updated_at")

  @@map("applications")
}

enum ApplicationRole {
  HOST
  FACILITATOR
}

enum ApplicationStatus {
  PENDING
  APPROVED
  REJECTED
  WAITLISTED
}

model MemberIntent {
  id              String      @id @default(cuid())
  userId          String?     @map("user_id")       // null for anonymous
  user            User?       @relation(fields: [userId], references: [id])
  email           String?                            // captured before signup
  name            String?
  city            String?
  intent          MemberIntentType
  confidence      Float       @default(0)
  rawInput        String?     @map("raw_input")     // original message/form data
  source          String      @default("web")       // web, sms, email
  hubspotContactId String?    @map("hubspot_contact_id")  // filled when synced
  emailSent       Boolean     @default(false) @map("email_sent")
  emailSentAt     DateTime?   @map("email_sent_at")
  createdAt       DateTime    @default(now()) @map("created_at")

  @@map("member_intents")
}

enum MemberIntentType {
  ATTEND
  HOST
  FACILITATE
  DIY
  NEWSLETTER   // "Not Sure" path -- deferred from v0.7.0 scope
}

model RegionalInterest {
  id        String   @id @default(cuid())
  city      String   @unique
  region    String?
  count     Int      @default(1)
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("regional_interest")
}
```

Add reverse relations to User model:
```prisma
// Add to existing User model:
applications    Application[]
memberIntents   MemberIntent[]
```

After adding:
1. npx prisma migrate dev --name add_compass_models
2. npx prisma validate
3. pnpm typecheck
All must pass before continuing.

---

## SECTION 3: SHARED TYPES

Add to packages/shared/src/types/onboarding.ts (NEW FILE):

```typescript
// @version 0.7.0 - Compass

export type MemberIntentType =
  | 'attend'
  | 'host'
  | 'facilitate'
  | 'diy'
  | 'newsletter';

export type ApplicationRole = 'host' | 'facilitator';
export type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'waitlisted';

export interface ClassificationResult {
  intent: MemberIntentType;
  confidence: number;        // 0-1
  reasoning?: string;        // @SAGE's explanation
  suggestedPath: OnboardingPath;
}

export interface OnboardingPath {
  intent: MemberIntentType;
  nextStep: string;          // human-readable next action
  emailTemplate: EmailTemplate;
  hubspotTags: string[];     // tags to apply in HubSpot
  hubspotPipeline?: string;  // pipeline to add contact to
}

export type EmailTemplate =
  | 'welcome_attend'
  | 'welcome_host'
  | 'welcome_facilitate'
  | 'welcome_diy'
  | 'welcome_newsletter';

// Maps intent to onboarding path
export const ONBOARDING_PATHS: Record<MemberIntentType, OnboardingPath> = {
  attend: {
    intent: 'attend',
    nextStep: 'Find a dinner near you',
    emailTemplate: 'welcome_attend',
    hubspotTags: ['feast-attendee', 'interest-attend'],
  },
  host: {
    intent: 'host',
    nextStep: 'Complete your host application',
    emailTemplate: 'welcome_host',
    hubspotTags: ['feast-host-applicant', 'interest-host'],
    hubspotPipeline: 'host-application',
  },
  facilitate: {
    intent: 'facilitate',
    nextStep: 'Complete your facilitator application',
    emailTemplate: 'welcome_facilitate',
    hubspotTags: ['feast-facilitator-applicant', 'interest-facilitate'],
    hubspotPipeline: 'facilitator-application',
  },
  diy: {
    intent: 'diy',
    nextStep: 'Join the DIY waitlist',
    emailTemplate: 'welcome_diy',
    hubspotTags: ['feast-diy', 'interest-diy'],
  },
  newsletter: {
    intent: 'newsletter',
    nextStep: 'Stay connected via newsletter',
    emailTemplate: 'welcome_newsletter',
    hubspotTags: ['feast-newsletter'],
  },
};

export interface ApplicationSubmission {
  role: ApplicationRole;
  name: string;
  city: string;
  isOrganizer?: string;
  motivation?: string;
  userId: string;
}
```

Export from packages/shared/src/types/index.ts barrel.

---

## SECTION 4: RESEND EMAIL ADAPTER

Install Resend:
```bash
pnpm --filter api add resend
```

Create apps/api/src/integrations/resend/adapter.ts:

```typescript
// @version 0.7.0 - Compass
// Resend transactional email adapter
// Docs: https://resend.com/docs

import { Resend } from 'resend';
import type { EmailTemplate } from '@feast-ai/shared/types/onboarding';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.FEAST_FROM_EMAIL ?? 'hello@feastongood.com';
const FROM_NAME = 'The Feast';

interface SendEmailParams {
  to: string;
  template: EmailTemplate;
  variables: {
    name: string;
    city?: string;
    [key: string]: string | undefined;
  };
}

// Welcome email content per template
const EMAIL_CONTENT: Record<EmailTemplate, { subject: string; html: (v: SendEmailParams['variables']) => string }> = {
  welcome_attend: {
    subject: 'Welcome to The Feast — find a dinner near you',
    html: (v) => `
      <h2>Welcome, ${v.name}.</h2>
      <p>We're glad you found your way to the table.</p>
      <p>The Feast brings together curious, open-hearted people for evenings of meaningful conversation and connection. Your next dinner is waiting.</p>
      <p><a href="https://feastongood.com/dinners">Find a dinner near ${v.city ?? 'you'} →</a></p>
      <p>With gratitude,<br/>The Feast</p>
    `,
  },
  welcome_host: {
    subject: 'Your host application — next steps',
    html: (v) => `
      <h2>Thank you, ${v.name}.</h2>
      <p>There's something powerful about opening your home and your table. We're honored you want to bring The Feast to your community.</p>
      <p>We've received your application and will be in touch once we see enough interest in your area. In the meantime, explore what it means to host a Feast dinner.</p>
      <p><a href="https://feastongood.com/host">Learn more about hosting →</a></p>
      <p>With gratitude,<br/>The Feast</p>
    `,
  },
  welcome_facilitate: {
    subject: 'Your facilitator application — next steps',
    html: (v) => `
      <h2>Thank you, ${v.name}.</h2>
      <p>Facilitators are the heartbeat of every Feast dinner. Your desire to hold space for others is a gift.</p>
      <p>We've received your application and will reach out about our next facilitator training cohort.</p>
      <p><a href="https://feastongood.com/facilitate">Learn more about facilitation →</a></p>
      <p>With gratitude,<br/>The Feast</p>
    `,
  },
  welcome_diy: {
    subject: "DIY Feast tools — you're on the list",
    html: (v) => `
      <h2>Hello, ${v.name}.</h2>
      <p>We love that you want to bring this experience to your community on your own terms.</p>
      <p>We're building DIY tools for gatherers like you — conversation guides, hosting tips, and everything you need to run a Feast-inspired dinner. You'll be the first to know when they're ready.</p>
      <p>With gratitude,<br/>The Feast</p>
    `,
  },
  welcome_newsletter: {
    subject: 'Welcome to The Feast community',
    html: (v) => `
      <h2>Hello, ${v.name}.</h2>
      <p>Thank you for connecting with The Feast. We'll keep you in the loop on upcoming dinners, community happenings, and new ways to get involved.</p>
      <p><a href="https://feastongood.com">Explore The Feast →</a></p>
      <p>With gratitude,<br/>The Feast</p>
    `,
  },
};

export async function sendWelcomeEmail(params: SendEmailParams): Promise<{ success: boolean; id?: string; error?: string }> {
  // Graceful stub when Resend key not configured
  if (!process.env.RESEND_API_KEY) {
    console.log(`[Resend stub] Would send ${params.template} to ${params.to}`);
    return { success: true, id: 'stub' };
  }

  const content = EMAIL_CONTENT[params.template];

  try {
    const result = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: params.to,
      subject: content.subject,
      html: content.html(params.variables),
    });

    return { success: true, id: result.data?.id };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`[Resend] Failed to send ${params.template} to ${params.to}:`, error);
    return { success: false, error };
  }
}
```

Add to .env.example:
```
# v0.7.0 Compass — Email
RESEND_API_KEY=re_...          # resend.com — free tier
```

---

## SECTION 5: @SAGE CLASSIFICATION EXTENSION

Extend the existing @SAGE agent to handle the "How Will You Feast?" classification.

Find the existing @SAGE implementation in apps/api/src/council/sage/.
Read the full file before modifying anything.

Add a new tool and classification method to the existing agent:

```typescript
// @version 0.7.0 - Compass
// ADD to existing @SAGE agent -- do not replace existing tools

// New tool definition to add to @SAGE's tools array:
{
  name: 'classify_onboarding_intent',
  description: 'Classify a new member\'s intent based on their message or form submission. Returns one of: attend, host, facilitate, diy, newsletter.',
  input_schema: {
    type: 'object',
    properties: {
      message: {
        type: 'string',
        description: 'The member\'s message, form response, or expressed interest',
      },
      city: {
        type: 'string',
        description: 'The member\'s city if provided',
      },
      context: {
        type: 'string',
        description: 'Additional context about how this person arrived (web form, SMS, referral)',
      },
    },
    required: ['message'],
  },
}

// Classification system prompt addition (append to existing @SAGE system prompt):
`
<onboarding_classification>
When classifying new member intent, map to exactly one of these paths:

ATTEND: Person wants to experience a Feast dinner as a guest.
  Signals: "attend", "come to", "experience", "find a dinner", "curious"

HOST: Person wants to host dinners in their home or space.
  Signals: "host", "open my home", "bring Feast to", "organize", "my community"
  Note: Check regional interest — if fewer than 10 people in their city,
  still classify as HOST but note low regional density.

FACILITATE: Person wants to guide conversations at dinners.
  Signals: "facilitate", "guide", "hold space", "conversation", "trained facilitator"

DIY: Person wants to run their own Feast-inspired gatherings independently.
  Signals: "my own", "independently", "school", "workplace", "my group", "DIY"

NEWSLETTER: Person is interested but unclear or just wants to stay connected.
  Signals: "not sure", "learn more", "stay connected", "tell me more"

Always return confidence between 0 and 1.
If confidence < 0.6, default to NEWSLETTER and explain why.
</onboarding_classification>
`
```

Create a standalone classification function at
apps/api/src/council/sage/classify.ts:

```typescript
// @version 0.7.0 - Compass
// Standalone classification -- can be called without full @SAGE conversation

import Anthropic from '@anthropic-ai/sdk';
import type { ClassificationResult, MemberIntentType } from '@feast-ai/shared/types/onboarding';
import { ONBOARDING_PATHS } from '@feast-ai/shared/types/onboarding';

const client = new Anthropic();

export async function classifyMemberIntent(params: {
  message: string;
  city?: string;
  context?: string;
}): Promise<ClassificationResult> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 256,
    system: `You classify new member intent for The Feast community platform.
Return ONLY valid JSON matching this schema:
{ "intent": "attend"|"host"|"facilitate"|"diy"|"newsletter", "confidence": 0-1, "reasoning": "string" }

Intent definitions:
- attend: wants to experience a dinner as guest
- host: wants to host dinners in their home or space
- facilitate: wants to guide conversations at dinners
- diy: wants to run their own independent gatherings
- newsletter: unclear or just wants to stay connected

If confidence < 0.6, use "newsletter".
Return ONLY the JSON object. No other text.`,
    messages: [
      {
        role: 'user',
        content: `Classify this member:
Message: "${params.message}"
City: ${params.city ?? 'not provided'}
Context: ${params.context ?? 'web form'}`,
      },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}';

  try {
    const parsed = JSON.parse(text.trim());
    const intent = parsed.intent as MemberIntentType;
    return {
      intent,
      confidence: parsed.confidence ?? 0.5,
      reasoning: parsed.reasoning,
      suggestedPath: ONBOARDING_PATHS[intent],
    };
  } catch {
    // Fallback to newsletter on parse failure
    return {
      intent: 'newsletter',
      confidence: 0.5,
      reasoning: 'Classification parse failed -- defaulting to newsletter',
      suggestedPath: ONBOARDING_PATHS['newsletter'],
    };
  }
}
```

---

## SECTION 6: ONBOARDING SERVICE

Create apps/api/src/services/onboarding.ts (NEW FILE):

```typescript
// @version 0.7.0 - Compass
// Orchestrates the full onboarding flow:
// classify → save intent → update regional interest → sync HubSpot → send email

import { db } from '../lib/db';
import { classifyMemberIntent } from '../council/sage/classify';
import { sendWelcomeEmail } from '../integrations/resend/adapter';
import type { ClassificationResult } from '@feast-ai/shared/types/onboarding';

interface OnboardingInput {
  userId?: string;
  email: string;
  name: string;
  city?: string;
  message: string;      // what they told us / form data combined
  source?: string;      // 'web', 'sms', 'apply_form'
}

interface OnboardingResult {
  classification: ClassificationResult;
  memberIntentId: string;
  emailSent: boolean;
  hubspotSynced: boolean;   // always false in v0.7.0 -- stubbed
}

export async function processOnboarding(input: OnboardingInput): Promise<OnboardingResult> {
  const { userId, email, name, city, message, source = 'web' } = input;

  // Step 1: Classify intent via @SAGE
  const classification = await classifyMemberIntent({
    message,
    city,
    context: source,
  });

  // Step 2: Save MemberIntent to DB
  const memberIntent = await db.memberIntent.create({
    data: {
      userId: userId ?? null,
      email,
      name,
      city: city ?? null,
      intent: classification.intent.toUpperCase() as any,
      confidence: classification.confidence,
      rawInput: message,
      source,
    },
  });

  // Step 3: Update regional interest count
  if (city) {
    await db.regionalInterest.upsert({
      where: { city: city.toLowerCase().trim() },
      update: { count: { increment: 1 } },
      create: { city: city.toLowerCase().trim(), count: 1 },
    });
  }

  // Step 4: HubSpot contact sync -- STUBBED for v0.7.0
  // TODO v0.8.0: Replace with real HubSpot contact creation
  // const hubspotContact = await hubspotAdapter.createContact({
  //   email, name, city,
  //   properties: {
  //     feast_role: classification.intent,
  //     feast_region: city,
  //     feast_interest_date: new Date().toISOString(),
  //   },
  //   tags: classification.suggestedPath.hubspotTags,
  //   pipeline: classification.suggestedPath.hubspotPipeline,
  // });
  console.log(`[HubSpot stub] Would create contact: ${email} with intent: ${classification.intent}`);
  const hubspotSynced = false;

  // Step 5: Send welcome email via Resend
  const emailResult = await sendWelcomeEmail({
    to: email,
    template: classification.suggestedPath.emailTemplate,
    variables: { name, city },
  });

  // Step 6: Update MemberIntent with email status
  await db.memberIntent.update({
    where: { id: memberIntent.id },
    data: {
      emailSent: emailResult.success,
      emailSentAt: emailResult.success ? new Date() : null,
    },
  });

  return {
    classification,
    memberIntentId: memberIntent.id,
    emailSent: emailResult.success,
    hubspotSynced,
  };
}
```

---

## SECTION 7: API ROUTES

### POST /api/applications

Create apps/api/src/app/api/applications/route.ts:

```typescript
// @version 0.7.0 - Compass
// Receives host/facilitator application from the /apply frontend form
// Saves to DB, triggers onboarding pipeline via Inngest

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { applyRateLimit } from '@/lib/rateLimit';
import { z } from 'zod';

const ApplicationSchema = z.object({
  role: z.enum(['host', 'facilitator']),
  name: z.string().min(2).max(100),
  city: z.string().min(2).max(100),
  isOrganizer: z.string().optional(),
  motivation: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const limited = await applyRateLimit(req, 'standard');
  if (limited) return limited;

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  const body = await req.json() as unknown;
  const parsed = ApplicationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Look up user in DB
  const user = await db.user.findUnique({ where: { clerkId: userId } });
  if (!user) {
    return NextResponse.json(
      { error: 'User not found', code: 'USER_NOT_FOUND' },
      { status: 404 }
    );
  }

  // Check for duplicate application
  const existing = await db.application.findFirst({
    where: { userId: user.id, role: parsed.data.role.toUpperCase() as any, status: 'PENDING' },
  });
  if (existing) {
    return NextResponse.json(
      { error: 'Application already pending', code: 'DUPLICATE_APPLICATION' },
      { status: 409 }
    );
  }

  // Save application
  const application = await db.application.create({
    data: {
      userId: user.id,
      role: parsed.data.role.toUpperCase() as any,
      name: parsed.data.name,
      city: parsed.data.city,
      isOrganizer: parsed.data.isOrganizer,
      motivation: parsed.data.motivation,
    },
  });

  // Trigger Inngest pipeline
  const { inngest } = await import('@/lib/inngest');
  await inngest.send({
    name: 'application/submitted',
    data: {
      applicationId: application.id,
      userId: user.id,
      email: user.email,
      role: parsed.data.role,
      name: parsed.data.name,
      city: parsed.data.city,
      motivation: parsed.data.motivation,
    },
  });

  return NextResponse.json({ success: true, applicationId: application.id }, { status: 201 });
}
```

### POST /api/onboarding/classify

Create apps/api/src/app/api/onboarding/classify/route.ts:

```typescript
// @version 0.7.0 - Compass
// Classifies a new member's intent -- called from web onboarding flow

import { NextRequest, NextResponse } from 'next/server';
import { applyRateLimit } from '@/lib/rateLimit';
import { processOnboarding } from '@/services/onboarding';
import { z } from 'zod';

const ClassifySchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  city: z.string().optional(),
  message: z.string().min(1).max(1000),
  source: z.enum(['web', 'sms', 'apply_form']).optional(),
});

export async function POST(req: NextRequest) {
  const limited = await applyRateLimit(req, 'standard');
  if (limited) return limited;

  const body = await req.json() as unknown;
  const parsed = ClassifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const result = await processOnboarding({
    email: parsed.data.email,
    name: parsed.data.name,
    city: parsed.data.city,
    message: parsed.data.message,
    source: parsed.data.source ?? 'web',
  });

  return NextResponse.json({
    success: true,
    intent: result.classification.intent,
    confidence: result.classification.confidence,
    nextStep: result.classification.suggestedPath.nextStep,
    emailSent: result.emailSent,
  });
}
```

---

## SECTION 8: INNGEST PIPELINE

Create apps/api/src/inngest/functions/application-submitted.ts:

```typescript
// @version 0.7.0 - Compass
// Triggered when a host/facilitator application is submitted
// Runs: classify → send welcome email → stub HubSpot sync

import { inngest } from '../client';
import { processOnboarding } from '../../services/onboarding';
import { db } from '../../lib/db';

export const applicationSubmittedPipeline = inngest.createFunction(
  {
    id: 'application-submitted-pipeline',
    name: 'Application Submitted — Classify + Email',
    retries: 3,
  },
  { event: 'application/submitted' },
  async ({ event, step }) => {
    const { applicationId, userId, email, role, name, city, motivation } = event.data;

    // Step 1: Run full onboarding flow
    const result = await step.run('process-onboarding', async () => {
      const message = `I want to become a ${role} for The Feast. ${motivation ?? ''}`.trim();
      return processOnboarding({
        userId,
        email,
        name,
        city,
        message,
        source: 'apply_form',
      });
    });

    // Step 2: Update application with classification result
    await step.run('update-application', async () => {
      return db.application.update({
        where: { id: applicationId },
        data: {
          notes: `Classified as: ${result.classification.intent} (confidence: ${result.classification.confidence.toFixed(2)})`,
        },
      });
    });

    return {
      applicationId,
      intent: result.classification.intent,
      confidence: result.classification.confidence,
      emailSent: result.emailSent,
      memberIntentId: result.memberIntentId,
    };
  }
);
```

Register in apps/api/src/inngest/index.ts and the serve route.
The serve route should now have 4 functions:
- eventCreatedPipeline
- contentSubmittedPipeline
- contentApprovedPipeline
- applicationSubmittedPipeline

---

## SECTION 9: FRONTEND WIRING

Update apps/web/src/components/apply/ApplicationForm.tsx.
Find the onClick stub (currently console.log) and replace with a real API call.

```typescript
// Replace the stub onClick in ApplicationForm.tsx:

const handleSubmit = async () => {
  if (!selectedRole || !name || !city) return;

  setIsSubmitting(true);
  try {
    const res = await fetch('/api/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: selectedRole,
        name,
        city,
        isOrganizer: organizer,
        motivation: draws,
      }),
    });

    const data = await res.json();

    if (res.ok) {
      setSubmitted(true);
    } else if (res.status === 409) {
      setError('You already have a pending application for this role.');
    } else {
      setError('Something went wrong. Please try again.');
      console.error('Application error:', data);
    }
  } catch {
    setError('Something went wrong. Please try again.');
  } finally {
    setIsSubmitting(false);
  }
};
```

Add these state variables to the form if not already present:
```typescript
const [isSubmitting, setIsSubmitting] = useState(false);
const [error, setError] = useState<string | null>(null);
```

Update the submit button to show loading state:
```tsx
<button
  onClick={handleSubmit}
  disabled={isSubmitting || submitted || !selectedRole || !name || !city}
  className="w-full bg-mustard text-white rounded-full py-3 font-medium
             disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
>
  {isSubmitting ? 'Submitting...' : 'Submit Application'}
</button>
```

Show error message above submit button if error is set:
```tsx
{error && (
  <p className="text-coral text-sm text-center mb-2">{error}</p>
)}
```

---

## SECTION 10: EXECUTION ORDER

Execute in this exact sequence. Stop and report after each step.

```
STEP 1: Schema + migration
  - Add Application, MemberIntent, RegionalInterest models
  - Add reverse relations to User model
  - Run: npx prisma migrate dev --name add_compass_models
  - Run: npx prisma validate
  - Run: pnpm typecheck
  - Report: migration output + typecheck result

STEP 2: Packages + shared types
  - Install resend in apps/api
  - Create packages/shared/src/types/onboarding.ts
  - Export from barrel
  - Run: pnpm typecheck (4/4 packages)
  - Report: installed packages + typecheck result

STEP 3: Resend adapter
  - Create apps/api/src/integrations/resend/adapter.ts
  - Run: pnpm typecheck
  - Report: file created, typecheck result

STEP 4: @SAGE classification
  - Read existing @SAGE agent files before modifying anything
  - Create apps/api/src/council/sage/classify.ts
  - Run: pnpm typecheck
  - Report: what existed, what was added, typecheck result

STEP 5: Onboarding service
  - Create apps/api/src/services/onboarding.ts
  - Run: pnpm typecheck
  - Report: file created, typecheck result

STEP 6: API routes
  - Create /api/applications/route.ts
  - Create /api/onboarding/classify/route.ts
  - Apply rate limiting to both (standard tier)
  - Run: pnpm typecheck + pnpm lint
  - Report: routes created, typecheck + lint result

STEP 7: Inngest function
  - Create application-submitted.ts
  - Register in inngest/index.ts and serve route (now 4 functions)
  - Apply ReturnType<typeof inngest.createFunction> annotation
  - Run: pnpm typecheck + pnpm lint
  - Report: function registered, function ID for dashboard

STEP 8: Frontend wiring
  - Update ApplicationForm.tsx onClick stub to real fetch call
  - Add isSubmitting, error state
  - Update submit button with loading/disabled states
  - Run: pnpm typecheck (apps/web)
  - Report: changes made, typecheck result

STEP 9: Full verification
  - pnpm typecheck: 4/4 packages, 0 errors
  - pnpm lint: 4/4 packages, 0 warnings
  - npx prisma validate
  - next build (API): all routes present
  - next build (Web): 13 static pages, 0 errors
  - Report full output of all checks

STEP 10: .env.example + CHANGELOG + tag
  - Add RESEND_API_KEY to .env.example under # v0.7.0 Compass
  - Write CHANGELOG v0.7.0 entry
  - Confirm CONTRACT.md: CURRENT_VERSION=0.7.0, NEXT_VERSION=0.8.0,
    NEXT_CODENAME=Shield
  - git commit + git tag v0.7.0
  - Report commit hash + tag
```

---

## SECTION 11: v0.7.0 DEFINITION OF DONE

- [ ] pnpm typecheck: 4/4 packages, 0 errors
- [ ] pnpm lint: 4/4 packages, 0 warnings
- [ ] npx prisma validate: passes
- [ ] next build (API + Web): 0 errors
- [ ] Application model in DB
- [ ] MemberIntent model in DB
- [ ] RegionalInterest model in DB
- [ ] classifyMemberIntent() returns valid ClassificationResult
- [ ] processOnboarding() runs full flow: classify → save → email
- [ ] sendWelcomeEmail() stubs gracefully when RESEND_API_KEY missing
- [ ] POST /api/applications saves to DB + triggers Inngest
- [ ] POST /api/onboarding/classify returns intent + nextStep
- [ ] application-submitted-pipeline registered in Inngest (4 functions total)
- [ ] ApplicationForm.tsx posts to real endpoint
- [ ] HubSpot sync stubbed with clear TODO comment
- [ ] RESEND_API_KEY in .env.example
- [ ] CHANGELOG.md updated
- [ ] Git tagged as v0.7.0

---

END OF COMPASS BLUEPRINT v0.7.0
