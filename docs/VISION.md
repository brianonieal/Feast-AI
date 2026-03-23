# VISION.md
## Feast-AI: Product Vision

---

## What Is Feast-AI?

Feast-AI is an AI-native community operating system for The Feast, a global organization that hosts meaningful dinner gatherings. The platform automates the operational backbone of running a community dinner movement: event creation, marketing, content capture, member onboarding, and community health tracking.

The core insight: community organizers spend 80% of their time on logistics and 20% on the meaningful work. Feast-AI inverts that ratio by automating the logistics with agentic AI workflows.

---

## The Inspiration

From the founder's own words:

> "I've been getting curious about agentic AI, exploring hiring someone to build a system that taps into Circle if/when we get it set up. Instead of a VA, creating a workflow to be able to text a bot to create an event, gather reflections and share in certain sections, etc."

This is the north star: replace the virtual assistant with an AI system that a host can interact with via text message to run their entire dinner operation.

---

## User Personas

### 1. Attendee
- Discovers Feast through word of mouth or Instagram
- Wants to find a dinner near them
- Signs up, attends, shares reflections afterward
- May become a host or facilitator over time

### 2. Host
- Opens their home for Feast dinners
- Needs help with: event creation, marketing, post-dinner content capture
- Interacts with the system primarily via text/WhatsApp
- Wants to spend zero time on admin, maximum time on connection

### 3. Facilitator
- Guides conversation at dinners
- Trained by Feast in facilitation methodology
- Needs access to: conversation guides, community resources, upcoming events
- May facilitate at multiple hosts' dinners

### 4. Admin (Feast HQ)
- Manages the overall community across regions
- Needs: analytics dashboard, content calendar, member management
- Controls which regions are active, approves new hosts
- Tracks community health and growth metrics

### 5. DIY User (Future)
- Downloads Feast conversation tools to run their own gatherings
- Not an official host, but uses Feast methodology
- Lightweight onboarding, self-service

---

## How It Works (Three Core Workflows)

### Workflow 1: Event Lifecycle
```
Host texts: "I want to host a dinner March 28, 7pm, my place, 12 people, open to community"
    |
    v
@COORDINATOR parses intent, creates structured event
    |
    v
Event posted to Circle (correct tier)
    |
    v
@COMMUNICATOR generates image + copy
    |
    +--> Open event: Instagram + full mailing list + Circle public
    +--> Closed event: Circle tier + CRM regional subset
    |
    v
Reminders sent 3 days + 1 day before
    |
    v
Post-dinner: host sends photos + quotes + reflection
    |
    v
@COMMUNICATOR transforms into article + social + recap + newsletter
```

### Workflow 2: Member Onboarding
```
New user visits site or gets referred
    |
    v
"How Will You Feast?" intake flow
    |
    v
@SAGE conversational classification:
    - Attend -> find regional dinners, add to mailing list
    - Host -> application pipeline, check regional interest
    - Facilitator -> application pipeline, training info
    - DIY -> waitlist capture
    - Not sure -> newsletter, gentle nurture sequence
    |
    v
HubSpot contact created with correct tags + pipeline
    |
    v
Automated welcome email based on classification
```

### Workflow 3: Content Pipeline
```
Host sends raw materials:
    - Photos from dinner
    - Attendee quotes (text or photographed cards)
    - Recorded audio reflection
    |
    v
@COMMUNICATOR processes (vision for photos, Deepgram for audio):
    |
    +-- Website article (WordPress)
    +-- Instagram caption + hashtags
    +-- Circle community recap
    +-- Newsletter blurb (subject line + preview + body)
    |
    v
Admin reviews in dashboard -> approve -> auto-publish
```

---

## The PANTHEON Vision (v2.0.0)

The mobile app with five tabs:

1. **Home** - Personalized feed, upcoming events, community pulse
2. **Circle** - Community space, conversations, connections
3. **Events** - Browse, RSVP, host management
4. **Impact** - Personal growth metrics, community health, reflection history
5. **Profile** - Settings, preferences, host/facilitator status

This is the full member experience. The admin dashboard is a separate web interface.

---

## Existing Tools (Already In Use by The Feast)

| Tool | Purpose | Integration Priority |
|------|---------|---------------------|
| Circle.so | Community platform, events, spaces | HIGH (v0.2.0) |
| HubSpot | CRM, contact management, email sequences | HIGH (v0.2.0) |
| WordPress | Website, blog content | MEDIUM (v0.5.0) |
| Instagram | Content distribution | MEDIUM (v0.6.0) |
| Mailchimp/HubSpot Email | Mailing lists | MEDIUM (v0.6.0) |

---

## Success Metrics

- **Host time saved**: 80% reduction in admin tasks per dinner
- **Event creation**: Host texts details, event is live within 5 minutes
- **Content turnaround**: Post-dinner content published within 24 hours
- **Onboarding conversion**: 60%+ of interested users complete classification
- **Community growth**: Regional interest tracking enables strategic expansion

---

*This document is the "why." For the "how," see CONTRACT.md and the blueprints/ directory.*
