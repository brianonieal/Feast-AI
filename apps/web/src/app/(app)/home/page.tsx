// @version 0.5.0 - Echo: Home / The Table page
// Matches mockup Row 1 Col 1 — vertical feed layout
// Static seed data — will be replaced by API calls in later version
import { DailyNourishment } from "@/components/home/DailyNourishment";
import { CommunityPulse } from "@/components/home/CommunityPulse";
import { FeedCard } from "@/components/home/FeedCard";

// Seed data — never fabricated as real. Clearly labeled as placeholders.
const SEED_FEED = [
  {
    id: "1",
    initials: "BN",
    name: "Brian N.",
    timestamp: "2h ago",
    body: "Last night's dinner in Brooklyn was one for the books. The conversation about community resilience really resonated with everyone at the table.",
  },
  {
    id: "2",
    initials: "MJ",
    name: "Monica J.",
    timestamp: "5h ago",
    body: "Grateful for the mutual aid circle this week. Sometimes showing up is the hardest part, but it's always worth it.",
  },
  {
    id: "3",
    initials: "KT",
    name: "Kenji T.",
    timestamp: "1d ago",
    body: "Hosting my first dinner next month — any facilitators in the DC area want to co-host? Thinking 12 seats, potluck style.",
  },
];

export default function HomePage() {
  return (
    <div className="py-6 space-y-6">
      {/* Section header */}
      <div>
        <p className="font-sans text-[10px] font-medium tracking-[0.09em] uppercase text-mustard mb-1">
          The Table
        </p>
        <h1 className="font-display italic font-light text-2xl text-navy leading-tight">
          What are you hungry for?
        </h1>
      </div>

      {/* 1. Daily Nourishment */}
      <DailyNourishment
        heading="Journey Joy?"
        subtext="What moment this week reminded you why you show up?"
      />

      {/* 2. Community pulse strip */}
      <CommunityPulse
        memberCount="247"
        dinnerCount="12"
        attendanceRate="89%"
      />

      {/* 3. Feed */}
      <section className="space-y-3">
        <p className="font-sans text-[10px] font-medium tracking-[0.09em] uppercase text-ink-light">
          Community Feed
        </p>
        {SEED_FEED.map((post) => (
          <FeedCard
            key={post.id}
            initials={post.initials}
            name={post.name}
            timestamp={post.timestamp}
            body={post.body}
          />
        ))}
      </section>
    </div>
  );
}
