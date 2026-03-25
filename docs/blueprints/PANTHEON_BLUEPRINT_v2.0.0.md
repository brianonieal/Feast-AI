# FEAST-AI v2.0.0 PANTHEON BLUEPRINT
# Codename: Pantheon
# Architect: Claude Sonnet 4.6 (chat)
# Executor: Claude Opus 4.6 (Claude Code)
# Date: March 2026
# Scope: Voice interface + autonomous agents + Impact tab + white-label + governance

---

## OPUS BOOT INSTRUCTIONS

Read in this order before writing a single line of code:
1. docs/blueprints/CONTRACT.md
2. docs/CHANGELOG.md (last 10 entries)
3. docs/blueprints/TECH_STACK.md
4. docs/blueprints/COUNCIL_AGENTS.md
5. This file (PANTHEON_BLUEPRINT_v2.0.0.md) in full

Then run the health check:
  pnpm typecheck
  pnpm lint
  npx prisma validate

All three must pass before writing any code.
Current version: 2.0.0
Sacred Rule: Do not build anything from v2.1.0 or later.

---

## SECTION 1: SCOPE

v2.0.0 Pantheon is the full vision release.
Six major features ship in this version.

### What gets built:
1. Voice interface -- mic inside Description + Reflection fields (mobile + web)
2. Autonomous SMS -- semi-autonomous @SAGE with confidence thresholds
3. Confidence threshold system -- >0.8 auto-draft, <0.5 escalate
4. Mobile Impact tab -- 5th tab in Expo app (personal journey + community metrics)
5. Web /impact page -- member-facing (not admin-only)
6. White-label capability -- partner org branding config
7. Governance tools -- Founding Table voting + proposals

### What does NOT change:
- No new Council agents (all 6 already active)
- No design system changes (v2.1.0 is the design overhaul)
- No Instagram/Meta OAuth (deferred)

---

## SECTION 2: PRISMA SCHEMA ADDITIONS

```prisma
// @version 2.0.0 - Pantheon

// Confidence log -- tracks @SAGE confidence on every SMS classification
model ConfidenceLog {
  id            String   @id @default(cuid())
  inboundMessageId String? @map("inbound_message_id")
  intent        String
  confidence    Float
  action        String   // 'auto_draft', 'sent_to_review', 'escalated'
  escalatedTo   String?  @map("escalated_to")  // userId of human reviewer
  resolvedAt    DateTime? @map("resolved_at")
  createdAt     DateTime @default(now()) @map("created_at")

  @@index([action, createdAt])
  @@map("confidence_logs")
}

// White-label org config
model WhiteLabelOrg {
  id            String   @id @default(cuid())
  slug          String   @unique   // e.g. 'brooklyn-feast'
  name          String
  primaryColor  String   @default("#C97B1A") @map("primary_color")
  logoUrl       String?  @map("logo_url")
  domain        String?             // custom domain if any
  isActive      Boolean  @default(true) @map("is_active")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  @@map("white_label_orgs")
}

// Governance proposals (Founding Table)
model GovernanceProposal {
  id            String   @id @default(cuid())
  authorId      String   @map("author_id")
  author        User     @relation(fields: [authorId], references: [id])
  title         String
  body          String
  category      String   @default("general")
  // categories: 'general', 'policy', 'financial', 'membership'
  status        String   @default("open")
  // statuses: 'open', 'voting', 'passed', 'rejected', 'withdrawn'
  votesFor      Int      @default(0) @map("votes_for")
  votesAgainst  Int      @default(0) @map("votes_against")
  quorum        Int      @default(3) // min votes needed
  closesAt      DateTime @map("closes_at")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")
  votes         GovernanceVote[]

  @@map("governance_proposals")
}

model GovernanceVote {
  id           String   @id @default(cuid())
  proposalId   String   @map("proposal_id")
  proposal     GovernanceProposal @relation(fields: [proposalId], references: [id])
  userId       String   @map("user_id")
  user         User     @relation(fields: [userId], references: [id])
  vote         String   // 'for', 'against', 'abstain'
  comment      String?
  createdAt    DateTime @default(now()) @map("created_at")

  @@unique([proposalId, userId])   // one vote per user per proposal
  @@map("governance_votes")
}
```

Add reverse relations to User:
```prisma
governanceProposals  GovernanceProposal[]
governanceVotes      GovernanceVote[]
```

After adding:
  npx prisma migrate dev --name add_pantheon_models
  npx prisma validate
  pnpm typecheck

---

## SECTION 3: CONFIDENCE THRESHOLD SYSTEM

Create apps/api/src/lib/confidenceGate.ts:

```typescript
// @version 2.0.0 - Pantheon
// Confidence threshold gate for autonomous agent actions
// Controls when @SAGE acts autonomously vs escalates to human

import { db } from './db';
import { sendPushNotification } from '../services/notifications';

export const CONFIDENCE_THRESHOLDS = {
  AUTO_DRAFT:  0.80,   // >= 0.80: auto-draft, send push to confirm
  REVIEW:      0.50,   // 0.50-0.79: send to approval queue
  ESCALATE:    0.50,   // < 0.50: escalate to human reviewer
} as const;

export type ConfidenceAction = 'auto_draft' | 'sent_to_review' | 'escalated';

export function getConfidenceAction(confidence: number): ConfidenceAction {
  if (confidence >= CONFIDENCE_THRESHOLDS.AUTO_DRAFT) return 'auto_draft';
  if (confidence >= CONFIDENCE_THRESHOLDS.REVIEW) return 'sent_to_review';
  return 'escalated';
}

export async function logConfidenceDecision(params: {
  inboundMessageId?: string;
  intent: string;
  confidence: number;
  action: ConfidenceAction;
  escalatedTo?: string;
}): Promise<void> {
  await db.confidenceLog.create({
    data: {
      inboundMessageId: params.inboundMessageId,
      intent: params.intent,
      confidence: params.confidence,
      action: params.action,
      escalatedTo: params.escalatedTo,
    },
  });
}

// Send "one tap confirm" push notification for semi-autonomous actions
export async function sendAutoDraftConfirmation(params: {
  userId: string;
  eventId: string;
  eventName: string;
  confidence: number;
}): Promise<void> {
  await sendPushNotification({
    userId: params.userId,
    type: 'event_reminder',  // reuse existing type for now
    title: '@SAGE drafted your event ✨',
    body: `"${params.eventName}" is ready. Tap to review and publish.`,
    data: {
      screen: 'EventConfirm',
      eventId: params.eventId,
      confidence: params.confidence,
      action: 'confirm_auto_draft',
    },
  });
}
```

---

## SECTION 4: UPDATE @SAGE SMS PIPELINE

Update apps/api/src/app/api/webhooks/twilio/route.ts.
Apply the confidence gate to the existing @SAGE classification.

```typescript
// @version 2.0.0 - Pantheon
// After @SAGE classifies intent, apply confidence gate:

import {
  getConfidenceAction,
  logConfidenceDecision,
  sendAutoDraftConfirmation,
  CONFIDENCE_THRESHOLDS,
} from '@/lib/confidenceGate';

// After classification:
const action = getConfidenceAction(classification.confidence);

await logConfidenceDecision({
  intent: classification.intent,
  confidence: classification.confidence,
  action,
});

if (action === 'auto_draft' && classification.intent === 'CREATE_EVENT') {
  // High confidence -- auto-draft the event
  await inngest.send({
    name: 'event/auto-draft',
    data: {
      userId: user.id,
      message: body,
      confidence: classification.confidence,
    },
  });

  // Semi-autonomous: send push to confirm, but don't block
  await sendAutoDraftConfirmation({
    userId: user.id,
    eventId: 'pending',  // will be filled by pipeline
    eventName: 'your dinner',
    confidence: classification.confidence,
  });

  return twimlResponse('Got it! I\'ve drafted your event. Check your phone to review and publish with one tap. 🍽');

} else if (action === 'escalated') {
  // Low confidence -- ask for clarification
  return twimlResponse(
    'I want to make sure I understand. Could you tell me a bit more about what you\'re planning? ' +
    'For example: "Host a dinner next Saturday in Brooklyn for 10 people."'
  );

} else {
  // Medium confidence -- existing flow (goes to approval queue)
  // existing pipeline continues unchanged
}
```

Create apps/api/src/inngest/functions/event-auto-draft.ts:

```typescript
// @version 2.0.0 - Pantheon
// Auto-draft pipeline for high-confidence SMS events
// Triggered when @SAGE confidence >= 0.8

import { inngest } from '../client';
import { db } from '../../lib/db';
import { trackedCall } from '../../lib/costTracker';
import { sendPushNotification } from '../../services/notifications';
import { saveFailedJob } from '../../services/deadLetter';

export const eventAutoDraftFunction = inngest.createFunction(
  {
    id: 'event-auto-draft',
    name: 'Event Auto-Draft — @SAGE Autonomous',
    retries: 2,
    onFailure: async (ctx: any) => {
      await saveFailedJob({
        functionId: 'event-auto-draft',
        eventName: 'event/auto-draft',
        payload: ctx.event?.data ?? {},
        error: ctx.error?.message ?? 'Unknown',
        attempts: ctx.attempt ?? 1,
      });
    },
  },
  { event: 'event/auto-draft' },
  async ({ event, step }) => {
    const { userId, message, confidence } = event.data as {
      userId: string;
      message: string;
      confidence: number;
    };

    // Step 1: Parse event details from message using Claude
    const parsed = await step.run('parse-event-details', async () => {
      const response = await trackedCall({
        agent: '@SAGE',
        model: 'claude-sonnet-4-6',
        action: 'parse_event_from_sms',
        system: `Extract event details from this SMS message.
Return ONLY valid JSON:
{
  "name": "string",
  "city": "string",
  "date": "ISO date string or null",
  "maxSeats": number,
  "description": "string"
}
If a field is unclear, use a sensible default.
date: default to next Saturday if not specified.
maxSeats: default to 10 if not specified.`,
        messages: [{ role: 'user', content: message }],
        maxTokens: 256,
      });

      const text = response.content[0].type === 'text'
        ? response.content[0].text : '{}';
      try {
        const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        return JSON.parse(clean);
      } catch {
        return { name: 'Feast Dinner', city: 'TBD', maxSeats: 10, description: message };
      }
    });

    // Step 2: Create draft event
    const event_record = await step.run('create-draft-event', async () => {
      const user = await db.user.findUnique({ where: { id: userId } });
      if (!user) throw new Error(`User ${userId} not found`);

      const eventDate = parsed.date
        ? new Date(parsed.date)
        : getNextSaturday();

      return db.feastEvent.create({
        data: {
          hostId: userId,
          name: parsed.name ?? 'Feast Dinner',
          description: parsed.description,
          city: parsed.city ?? 'TBD',
          capacity: parsed.maxSeats ?? 10,
          date: eventDate,
          status: 'DRAFT',
          communityTier: 'commons',
          confirmedSeats: 0,
        },
      });
    });

    // Step 3: Send confirmation push with event ID
    await step.run('send-confirmation-push', async () => {
      await sendPushNotification({
        userId,
        type: 'event_reminder',
        title: '🍽 Your event is drafted!',
        body: `"${event_record.name}" is ready to review. One tap to publish.`,
        data: {
          screen: 'EventConfirm',
          eventId: event_record.id,
          confidence,
          action: 'confirm_auto_draft',
        },
      });
    });

    return {
      eventId: event_record.id,
      eventName: event_record.name,
      confidence,
      status: 'draft',
    };
  }
);

function getNextSaturday(): Date {
  const d = new Date();
  const day = d.getDay();
  const daysUntilSaturday = (6 - day + 7) % 7 || 7;
  d.setDate(d.getDate() + daysUntilSaturday);
  d.setHours(19, 0, 0, 0);
  return d;
}
```

---

## SECTION 5: VOICE INTERFACE

### 5.1 Mobile voice hook

Install in apps/mobile:
  npx expo install expo-av

Create apps/mobile/src/hooks/useVoiceInput.ts:

```typescript
// @version 2.0.0 - Pantheon
// Voice input hook using Deepgram real-time transcription
// Used in Description and Reflection fields

import { useState, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export interface VoiceInputState {
  isRecording: boolean;
  transcript: string;
  isProcessing: boolean;
  error: string | null;
}

export function useVoiceInput(onTranscript: (text: string) => void) {
  const [state, setState] = useState<VoiceInputState>({
    isRecording: false,
    transcript: '',
    isProcessing: false,
    error: null,
  });

  const recordingRef = useRef<Audio.Recording | null>(null);

  const startRecording = useCallback(async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recordingRef.current = recording;
      setState(s => ({ ...s, isRecording: true, error: null }));
    } catch (err) {
      setState(s => ({
        ...s,
        error: 'Microphone access denied',
        isRecording: false,
      }));
    }
  }, []);

  const stopRecording = useCallback(async () => {
    if (!recordingRef.current) return;

    setState(s => ({ ...s, isRecording: false, isProcessing: true }));

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) throw new Error('No recording URI');

      // Send to Deepgram via API route
      const formData = new FormData();
      formData.append('audio', {
        uri,
        type: 'audio/m4a',
        name: 'recording.m4a',
      } as any);

      const res = await fetch(`${API_URL}/api/voice/transcribe`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      const text = data.transcript ?? '';

      setState(s => ({ ...s, transcript: text, isProcessing: false }));
      onTranscript(text);
    } catch (err) {
      setState(s => ({
        ...s,
        isProcessing: false,
        error: 'Transcription failed. Please try again.',
      }));
    }
  }, [onTranscript]);

  const clearTranscript = useCallback(() => {
    setState(s => ({ ...s, transcript: '' }));
  }, []);

  return { ...state, startRecording, stopRecording, clearTranscript };
}
```

### 5.2 Voice-enabled TextArea component (mobile)

Create apps/mobile/src/components/VoiceTextArea.tsx:

```typescript
// @version 2.0.0 - Pantheon
// Text area with inline mic button -- voice-assisted text input
// Matches UX spec: mic inside field, editable transcript, teal border when active

import React, { useState } from 'react';
import {
  View, TextInput, TouchableOpacity, Text,
  StyleSheet, Animated, ActivityIndicator
} from 'react-native';
import { useVoiceInput } from '../hooks/useVoiceInput';

interface VoiceTextAreaProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  label?: string;
  minHeight?: number;
}

const COLORS = {
  navy:    '#2D1B69',
  mustard: '#C97B1A',
  teal:    '#1D9E75',
  border:  '#E5DDD0',
  cream:   '#F7F2EA',
  inkLt:   '#9490B0',
};

export function VoiceTextArea({
  value, onChangeText, placeholder, label, minHeight = 100
}: VoiceTextAreaProps) {
  const [isFocused, setIsFocused] = useState(false);

  const { isRecording, isProcessing, error, startRecording, stopRecording } =
    useVoiceInput((transcript) => {
      // Append transcript to existing text
      const separator = value.trim() ? ' ' : '';
      onChangeText(value + separator + transcript);
    });

  const borderColor = isRecording
    ? COLORS.teal
    : isFocused
    ? COLORS.mustard
    : COLORS.border;

  return (
    <View style={styles.container}>
      {label && (
        <Text style={styles.label}>{label}</Text>
      )}
      <View style={[styles.fieldWrapper, { borderColor }]}>
        {isRecording && (
          <View style={styles.recordingPill}>
            <View style={styles.redDot} />
            <Text style={styles.recordingText}>Recording...</Text>
          </View>
        )}
        <TextInput
          style={[styles.input, { minHeight }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.inkLt}
          multiline
          textAlignVertical="top"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        <TouchableOpacity
          style={[
            styles.micButton,
            isRecording && styles.micButtonActive,
          ]}
          onPress={isRecording ? stopRecording : startRecording}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color={COLORS.teal} />
          ) : (
            <Text style={[
              styles.micIcon,
              isRecording && { color: '#E05535' }
            ]}>
              {isRecording ? '■' : '🎙'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
      {isRecording && (
        <Text style={styles.hint}>Tap ■ to stop · text is editable</Text>
      )}
      {error && (
        <Text style={styles.error}>{error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: {
    fontSize: 10, fontFamily: 'monospace',
    color: '#C97B1A', letterSpacing: 1,
    textTransform: 'uppercase', marginBottom: 6,
  },
  fieldWrapper: {
    borderWidth: 1.5, borderRadius: 10,
    backgroundColor: '#FDF9F2',
    overflow: 'hidden',
  },
  recordingPill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1D9E75',
    paddingHorizontal: 10, paddingVertical: 4,
    margin: 8, borderRadius: 12, alignSelf: 'flex-start',
  },
  redDot: {
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: '#E05535', marginRight: 6,
  },
  recordingText: { color: 'white', fontSize: 11 },
  input: {
    padding: 12, paddingRight: 44,
    fontSize: 14, color: '#1A1429',
    lineHeight: 22,
  },
  micButton: {
    position: 'absolute', bottom: 8, right: 8,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#FDF0DC',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#C97B1A',
  },
  micButtonActive: {
    backgroundColor: '#FCEEE9',
    borderColor: '#E05535',
  },
  micIcon: { fontSize: 14, color: '#C97B1A' },
  hint: {
    fontSize: 10, color: '#1D9E75',
    marginTop: 4, marginLeft: 2,
  },
  error: {
    fontSize: 10, color: '#E05535',
    marginTop: 4, marginLeft: 2,
  },
});
```

### 5.3 Voice transcription API route

Create apps/api/src/app/api/voice/transcribe/route.ts:

```typescript
// @version 2.0.0 - Pantheon
// Receives audio from mobile, transcribes via Deepgram

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { applyRateLimit } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  const limited = await applyRateLimit(req, 'ai');
  if (limited) return limited;

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
  if (!DEEPGRAM_API_KEY) {
    // Stub when key not configured
    return NextResponse.json({
      transcript: '',
      stub: true,
    });
  }

  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;
    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file', code: 'NO_AUDIO' },
        { status: 400 }
      );
    }

    const audioBuffer = await audioFile.arrayBuffer();

    const dgRes = await fetch(
      'https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true',
      {
        method: 'POST',
        headers: {
          Authorization: `Token ${DEEPGRAM_API_KEY}`,
          'Content-Type': audioFile.type || 'audio/m4a',
        },
        body: audioBuffer,
      }
    );

    if (!dgRes.ok) {
      throw new Error(`Deepgram error: ${dgRes.status}`);
    }

    const data = await dgRes.json();
    const transcript =
      data?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? '';

    return NextResponse.json({ transcript });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error('[Voice] Transcription failed:', error);
    return NextResponse.json(
      { error: 'Transcription failed', code: 'TRANSCRIPTION_ERROR' },
      { status: 500 }
    );
  }
}
```

### 5.4 Web voice component

Create apps/web/src/components/ui/VoiceTextArea.tsx:

```typescript
// @version 2.0.0 - Pantheon
// Web version of voice-assisted textarea
// Uses Web Speech API (built into Chrome/Safari) as primary
// Falls back to Deepgram via /api/voice/transcribe if Web Speech unavailable

'use client';

import { useState, useRef, useCallback } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';

interface VoiceTextAreaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  rows?: number;
  className?: string;
}

export function VoiceTextArea({
  value, onChange, placeholder, label, rows = 4, className = ''
}: VoiceTextAreaProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    setError(null);

    // Try Web Speech API first (Chrome/Safari)
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      let finalTranscript = '';

      recognition.onresult = (event: any) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        // Show live interim results appended to existing value
        const separator = value.trim() ? ' ' : '';
        onChange(value + separator + finalTranscript + interim);
      };

      recognition.onerror = () => {
        setError('Speech recognition failed. Please try again.');
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsRecording(true);
      return;
    }

    // Fallback: MediaRecorder → Deepgram
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        setIsProcessing(true);
        try {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
          const formData = new FormData();
          formData.append('audio', blob, 'recording.webm');

          const res = await fetch('/api/voice/transcribe', {
            method: 'POST', body: formData,
          });
          const data = await res.json();
          if (data.transcript) {
            const separator = value.trim() ? ' ' : '';
            onChange(value + separator + data.transcript);
          }
        } catch {
          setError('Transcription failed. Please try again.');
        } finally {
          setIsProcessing(false);
          stream.getTracks().forEach(t => t.stop());
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      setError('Microphone access denied.');
    }
  }, [value, onChange]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label className="text-[10px] font-mono uppercase tracking-widest text-mustard">
          {label}
        </label>
      )}
      <div className={`relative rounded-lg border-[1.5px] bg-card transition-colors
        ${isRecording ? 'border-teal' : 'border-border focus-within:border-mustard'}`}>
        {isRecording && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-teal rounded-t-lg">
            <span className="w-2 h-2 rounded-full bg-coral animate-pulse" />
            <span className="text-white text-[11px]">Recording — text updates live</span>
          </div>
        )}
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className="w-full resize-none bg-transparent p-3 pr-10 text-sm text-ink
                     placeholder-ink-light focus:outline-none rounded-lg leading-relaxed"
        />
        <button
          type="button"
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing}
          className={`absolute bottom-2.5 right-2.5 w-7 h-7 rounded-full
            flex items-center justify-center transition-colors
            ${isRecording
              ? 'bg-coral-soft border border-coral text-coral'
              : 'bg-mustard-soft border border-mustard text-mustard'
            } disabled:opacity-50`}
          title={isRecording ? 'Stop recording' : 'Start voice input'}
        >
          {isProcessing
            ? <Loader2 size={13} className="animate-spin" />
            : isRecording
            ? <MicOff size={13} />
            : <Mic size={13} />
          }
        </button>
      </div>
      {isRecording && (
        <p className="text-[10px] text-teal">
          Tap the mic to stop · all text is editable
        </p>
      )}
      {error && (
        <p className="text-[10px] text-coral">{error}</p>
      )}
    </div>
  );
}
```

Wire VoiceTextArea into:
- apps/web/src/app/(app)/events/page.tsx -- event description field
- Any reflection submission form

---

## SECTION 6: MOBILE IMPACT TAB

Add 5th tab to apps/mobile/src/app/(tabs)/ layout.

Create apps/mobile/src/app/(tabs)/impact.tsx:

```typescript
// @version 2.0.0 - Pantheon
// Impact tab -- personal journey + community metrics

import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator
} from 'react-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

const COLORS = {
  navy: '#2D1B69', mustard: '#C97B1A', teal: '#1D9E75',
  cream: '#F7F2EA', card: '#FDF9F2', border: '#E5DDD0',
  ink: '#1A1429', inkMid: '#4A4468', inkLt: '#9490B0',
};

export default function ImpactScreen() {
  const [metrics, setMetrics] = useState<any>(null);
  const [reflections, setReflections] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'personal' | 'community'>('personal');

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/api/analytics/impact`).then(r => r.json()),
      fetch(`${API_URL}/api/analytics/reflections/me`).then(r => r.json()),
    ]).then(([impact, refs]) => {
      setMetrics(impact.report ?? impact);
      setReflections(refs);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={COLORS.teal} />
        <Text style={styles.loadingText}>Loading your impact...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Section toggle */}
      <View style={styles.toggle}>
        {(['personal', 'community'] as const).map(section => (
          <TouchableOpacity
            key={section}
            style={[styles.toggleBtn, activeSection === section && styles.toggleActive]}
            onPress={() => setActiveSection(section)}
          >
            <Text style={[
              styles.toggleText,
              activeSection === section && styles.toggleTextActive
            ]}>
              {section.charAt(0).toUpperCase() + section.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeSection === 'personal' ? (
        <PersonalSection reflections={reflections} />
      ) : (
        <CommunitySection metrics={metrics} />
      )}
    </ScrollView>
  );
}

function PersonalSection({ reflections }: any) {
  if (!reflections) return null;
  return (
    <View style={styles.section}>
      {/* Stats */}
      <View style={styles.statRow}>
        <StatCard label="Reflections" value={reflections.totalCount ?? 0} color={COLORS.teal} />
        <StatCard label="Streak" value={`${reflections.streak ?? 0} dinners`} color={COLORS.mustard} />
      </View>

      {/* Timeline */}
      <Text style={styles.sectionLabel}>YOUR JOURNEY</Text>
      {reflections.reflections?.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Your journey starts at the table</Text>
          <Text style={styles.emptyBody}>Attend a dinner and share a reflection to begin.</Text>
        </View>
      ) : (
        reflections.reflections?.map((r: any) => (
          <View key={r.id} style={styles.reflectionCard}>
            <View style={styles.reflectionAccent} />
            <View style={styles.reflectionContent}>
              <Text style={styles.reflectionEvent}>{r.eventName}</Text>
              <Text style={styles.reflectionMeta}>{r.eventCity}</Text>
              <Text style={styles.reflectionText}>{r.text}</Text>
            </View>
          </View>
        ))
      )}
    </View>
  );
}

function CommunitySection({ metrics }: any) {
  if (!metrics) return null;
  const campaign = metrics.campaignDinners ?? 0;
  const goal = 100;
  const pct = Math.min(1, campaign / goal);

  return (
    <View style={styles.section}>
      {/* Health score */}
      <View style={styles.healthCard}>
        <Text style={styles.healthScore}>{metrics.healthScore ?? 0}</Text>
        <Text style={styles.healthLabel}>Community Health Score</Text>
        <Text style={styles.healthSub}>
          {(metrics.healthScore ?? 0) >= 80 ? 'Thriving'
           : (metrics.healthScore ?? 0) >= 50 ? 'Growing' : 'Emerging'}
        </Text>
      </View>

      {/* Stats grid */}
      <View style={styles.statRow}>
        <StatCard label="Dinners" value={metrics.dinnersHosted ?? 0} color={COLORS.teal} />
        <StatCard label="Connected" value={metrics.peopleConnected ?? 0} color={COLORS.navy} />
      </View>
      <View style={styles.statRow}>
        <StatCard label="Cities" value={metrics.citiesReached ?? 0} color={COLORS.mustard} />
        <StatCard label="Reflections" value={metrics.reflectionsShared ?? 0} color={COLORS.teal} />
      </View>

      {/* Campaign progress */}
      <Text style={styles.sectionLabel}>100 DINNERS CAMPAIGN</Text>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${pct * 100}%` as any }]} />
      </View>
      <Text style={styles.progressLabel}>{campaign} / 100 dinners</Text>
    </View>
  );
}

function StatCard({ label, value, color }: any) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.cream },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: COLORS.inkLt, fontSize: 13 },
  toggle: {
    flexDirection: 'row', margin: 16, marginBottom: 8,
    backgroundColor: COLORS.card, borderRadius: 24,
    padding: 3, borderWidth: 1, borderColor: COLORS.border,
  },
  toggleBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 20, alignItems: 'center',
  },
  toggleActive: { backgroundColor: COLORS.mustard },
  toggleText: { fontSize: 13, color: COLORS.inkLt, fontWeight: '500' },
  toggleTextActive: { color: 'white' },
  section: { padding: 16 },
  sectionLabel: {
    fontSize: 9, fontFamily: 'monospace', letterSpacing: 1.5,
    textTransform: 'uppercase', color: COLORS.mustard,
    marginTop: 20, marginBottom: 10,
  },
  statRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  statCard: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: 12,
    padding: 14, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center',
  },
  statValue: { fontSize: 24, fontWeight: '600', marginBottom: 4 },
  statLabel: { fontSize: 11, color: COLORS.inkLt },
  healthCard: {
    backgroundColor: COLORS.navy, borderRadius: 16,
    padding: 24, alignItems: 'center', marginBottom: 16,
  },
  healthScore: {
    fontSize: 64, fontWeight: '300', color: 'white', lineHeight: 72,
  },
  healthLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 4 },
  healthSub: { color: COLORS.teal, fontSize: 14, fontWeight: '600', marginTop: 6 },
  progressBar: {
    height: 20, backgroundColor: COLORS.surface ?? COLORS.border,
    borderRadius: 10, overflow: 'hidden', marginBottom: 6,
  },
  progressFill: { height: '100%', backgroundColor: COLORS.teal, borderRadius: 10 },
  progressLabel: { fontSize: 12, color: COLORS.inkLt, textAlign: 'center' },
  reflectionCard: {
    flexDirection: 'row', backgroundColor: COLORS.card,
    borderRadius: 10, marginBottom: 10,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },
  reflectionAccent: { width: 3, backgroundColor: COLORS.teal },
  reflectionContent: { flex: 1, padding: 12 },
  reflectionEvent: { fontSize: 13, fontWeight: '600', color: COLORS.navy },
  reflectionMeta: { fontSize: 11, color: COLORS.inkLt, marginBottom: 6 },
  reflectionText: { fontSize: 13, color: COLORS.ink, lineHeight: 20 },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: {
    fontSize: 17, fontStyle: 'italic', color: COLORS.navy,
    textAlign: 'center', marginBottom: 8,
  },
  emptyBody: { fontSize: 13, color: COLORS.inkLt, textAlign: 'center' },
});
```

Update the mobile tab layout to include Impact as the 5th tab.

---

## SECTION 7: WEB /IMPACT PAGE (member-facing)

Create apps/web/src/app/(app)/impact/page.tsx.

This is the member-facing version of impact -- not admin-only.
Any authenticated member can view it.

Content: same data as /admin/impact but without the PDF export
and without admin-only stats. Focus on community story.

Add "Impact" link to the web TopBar or member navigation.

---

## SECTION 8: GOVERNANCE TOOLS

Create apps/api/src/app/api/governance/proposals/route.ts:
  GET -- list open proposals (founding_table only)
  POST -- create proposal (founding_table only)

Create apps/api/src/app/api/governance/proposals/[id]/vote/route.ts:
  POST -- cast vote (founding_table only)
  Body: { vote: 'for' | 'against' | 'abstain', comment?: string }
  Validates: one vote per user per proposal
  Updates: proposal votesFor/votesAgainst counts

Create apps/web/src/app/(admin)/admin/governance/page.tsx:
  Founding_table only
  Proposal list with status badges
  Vote buttons on open proposals
  Quorum progress bar
  "New Proposal" form

Add "Governance" to AdminSidebar under SYSTEM section.

---

## SECTION 9: WHITE-LABEL

Create apps/api/src/app/api/admin/white-label/route.ts:
  GET -- get org config for current domain
  POST -- create/update org config (founding_table only)

The WhiteLabelOrg model stores primaryColor and logoUrl.
For v2.0.0 this is basic -- just the config storage.
Full white-label theming is v2.2.0 scope.

---

## SECTION 10: EXECUTION ORDER

```
STEP 1: Schema + migration
  - Add ConfidenceLog, WhiteLabelOrg, GovernanceProposal, GovernanceVote
  - npx prisma migrate dev --name add_pantheon_models
  - npx prisma validate + pnpm typecheck
  - Report: migration output

STEP 2: Confidence gate
  - Create apps/api/src/lib/confidenceGate.ts
  - pnpm typecheck
  - Report: exports

STEP 3: Autonomous SMS pipeline
  - Update Twilio webhook with confidence gate
  - Create event-auto-draft.ts Inngest function (total: 10)
  - pnpm typecheck + pnpm lint
  - Report: confidence thresholds + function ID

STEP 4: Voice transcription API route
  - Create /api/voice/transcribe/route.ts
  - pnpm typecheck
  - Report: route created, Deepgram stub behavior

STEP 5: Web VoiceTextArea component
  - Create apps/web/src/components/ui/VoiceTextArea.tsx
  - Wire into event description field
  - pnpm typecheck + next build (web)
  - Report: component created, where wired

STEP 6: Mobile voice hook + component
  - Install expo-av in apps/mobile
  - Create useVoiceInput.ts hook
  - Create VoiceTextArea.tsx mobile component
  - pnpm typecheck (mobile)
  - Report: hook + component created

STEP 7: Mobile Impact tab
  - Create apps/mobile/src/app/(tabs)/impact.tsx
  - Update tab layout to include Impact (5th tab)
  - pnpm typecheck (mobile)
  - Report: tab added, section toggle implemented

STEP 8: Web /impact member page
  - Create apps/web/src/app/(app)/impact/page.tsx
  - pnpm typecheck + next build (web)
  - Report: page count

STEP 9: Governance tools
  - Create governance API routes (proposals + voting)
  - Create /admin/governance/page.tsx
  - Update AdminSidebar (Governance under SYSTEM)
  - pnpm typecheck + next build
  - Report: routes + page created

STEP 10: White-label config
  - Create /api/admin/white-label/route.ts
  - pnpm typecheck
  - Report: route created

STEP 11: Full verification
  - pnpm typecheck: 4/4 packages, 0 errors
  - pnpm lint: 4/4 packages, 0 warnings
  - npx prisma validate
  - pnpm --filter api build: report route count
  - pnpm --filter web build: report page count
  - npx prisma db push
  - Report full output

STEP 12: CHANGELOG + CONTRACT + tag + push
  - Write CHANGELOG v2.0.0 entry
  - Update CONTRACT.md:
      CURRENT_VERSION=2.0.0
      CURRENT_CODENAME=Pantheon
      NEXT_VERSION=2.1.0
      NEXT_CODENAME=Reformation
  - git commit -m "feat: v2.0.0 Pantheon — voice + autonomous + Impact tab + governance"
  - git tag v2.0.0
  - git push origin main --tags
  - Report commit hash + tag
```

---

## SECTION 11: v2.0.0 DEFINITION OF DONE

- [ ] pnpm typecheck: 4/4 packages, 0 errors
- [ ] pnpm lint: 4/4 packages, 0 warnings
- [ ] npx prisma validate: passes
- [ ] next build (API + Web): 0 errors
- [ ] ConfidenceLog model in DB
- [ ] GovernanceProposal + GovernanceVote models in DB
- [ ] WhiteLabelOrg model in DB
- [ ] Confidence gate: >0.8 auto-draft, <0.5 escalate
- [ ] event-auto-draft Inngest function (10 total)
- [ ] Push notification sent on auto-draft
- [ ] POST /api/voice/transcribe returns transcript
- [ ] Web VoiceTextArea with inline mic + live text
- [ ] Mobile useVoiceInput hook works with expo-av
- [ ] Mobile VoiceTextArea component
- [ ] Mobile Impact tab (5th tab, personal + community sections)
- [ ] Web /impact member-facing page
- [ ] Governance proposals API (create + list + vote)
- [ ] /admin/governance page
- [ ] White-label config API
- [ ] CHANGELOG.md updated
- [ ] CONTRACT.md: 2.0.0 Pantheon / 2.1.0 Reformation
- [ ] Git tagged v2.0.0 + pushed

---

END OF PANTHEON BLUEPRINT v2.0.0
