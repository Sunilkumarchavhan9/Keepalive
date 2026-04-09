import { KeepaliveConsole } from "@/app/components/keepalive-console";

const commandCards = [
  {
    title: "Remind me if they go quiet",
    body: "Track loose ends like recruiter follow-ups, investor intros, or the friend you promised to check on.",
    example: "remind me to follow up with NVIDIA on Monday if no reply",
  },
  {
    title: "Tell me what I owe",
    body: "Turn a forwarded message or a half-remembered thread into the actual ask, next action, and timing.",
    example: "what did I promise Danny",
  },
  {
    title: "Spot neglected threads",
    body: "Surface the people you have been meaning to reply to before they quietly drift into guilt.",
    example: "who have I been ignoring this week",
  },
  {
    title: "Draft the second message",
    body: "Produce a warm, context-aware check-in instead of making you reopen the thread cold.",
    example: "draft a warm check in for my uncle",
  },
] as const;

const demoMoments = [
  {
    step: "01",
    moment: "Set the loop",
    lines: [
      {
        speaker: "You",
        text: "remind me to follow up with Bridget at NVIDIA on Monday if no reply",
      },
      {
        speaker: "Keepalive",
        text: "Locked. I will watch the thread and ping you Monday if it stays open. Want a draft ready too?",
      },
    ],
  },
  {
    step: "02",
    moment: "Read the thread",
    lines: [
      {
        speaker: "Keepalive",
        text: "Original ask: recruiter screen follow-up. Last inbound was Thursday. No response since your note.",
      },
      {
        speaker: "Keepalive",
        text: "Suggested move: short, warm bump with one concrete availability window.",
      },
    ],
  },
  {
    step: "03",
    moment: "Close the loop",
    lines: [
      {
        speaker: "Keepalive",
        text: "No reply yet. Draft ready: Hi Bridget, just following up on our earlier conversation...",
      },
      {
        speaker: "You",
        text: "send",
      },
    ],
  },
] as const;

const reasons = [
  {
    label: "Why this should exist",
    title: "The hardest part of communication is not the first message.",
    copy: "It is remembering the second one. Interviews, family check-ins, founder follow-ups, and friend promises all decay inside the same place: the thread.",
  },
  {
    label: "Why iMessage",
    title: "Relationships already live in threads, not dashboards.",
    copy: "Keepalive works because the context, the promise, and the follow-up all happen in the same conversational surface. No extra inbox, no CRM cosplay.",
  },
  {
    label: "Why this stands out",
    title: "Most agents track goals. This one tracks people.",
    copy: "That makes it more emotional, more useful, and much more native to the thing iMessage already does best: hold the shape of a relationship over time.",
  },
] as const;

const modes = [
  {
    name: "Founder mode",
    detail: "Never lose the thread with customers, investors, candidates, or warm intros.",
  },
  {
    name: "Relationships mode",
    detail: "Remember the note you promised your friend, the check-in for your uncle, or the family follow-up you keep deferring.",
  },
] as const;

const architecture = [
  {
    name: "Thread memory",
    method: "sdk.getMessages()",
    detail: "Pull the promise, the ask, the last response, and attachment context directly from the thread before drafting anything.",
  },
  {
    name: "Relationship scan",
    method: "sdk.listChats()",
    detail: "Rank active conversations by recency, unread state, and unresolved obligations to answer who you are neglecting.",
  },
  {
    name: "Live follow-through",
    method: "sdk.startWatching()",
    detail: "Watch for new replies, your own outbound promises, and forwarded messages so reminders stay grounded in what actually happened.",
  },
  {
    name: "Native nudges",
    method: "sdk.message() + Reminders",
    detail: "Reply in-thread when asked, schedule smart reminders when a loop is open, and stop nudging once the conversation resolves.",
  },
] as const;

const photonCode = `import { IMessageSDK, Reminders } from "@photon-ai/imessage-kit";

const sdk = new IMessageSDK({
  watcher: {
    unreadOnly: false,
    excludeOwnMessages: false,
  },
});

const reminders = new Reminders(sdk);

await sdk.startWatching({
  onDirectMessage: async (msg) => {
    await sdk
      .message(msg)
      .ifFromOthers()
      .matchText(/follow up|remind me|who am i neglecting/i)
      .replyText("Keepalive is on it. Reading the thread now.")
      .execute();
  },
});

const history = await sdk.getMessages({
  sender: "+15555550123",
  limit: 25,
  search: "deck OR follow up OR promised",
});

await reminders.at(
  "monday 9am",
  "+15555550123",
  "No reply yet. Draft ready if you want it."
);`;

function CommandCard({
  title,
  body,
  example,
}: {
  title: string;
  body: string;
  example: string;
}) {
  return (
    <article className="rounded-[2rem] border border-white/12 bg-white/6 p-6 shadow-[0_30px_80px_rgba(4,8,20,0.18)] backdrop-blur-md">
      <p className="text-xs uppercase tracking-[0.32em] text-lime-200/72">
        Conversation-native command
      </p>
      <h3 className="mt-4 text-2xl font-semibold text-white">{title}</h3>
      <p className="mt-3 max-w-sm text-base leading-7 text-white/68">{body}</p>
      <div className="mt-5 rounded-[1.4rem] border border-lime-300/18 bg-black/22 px-4 py-3 font-mono text-sm leading-6 text-lime-100">
        {example}
      </div>
    </article>
  );
}

function Bubble({
  speaker,
  text,
  tone = "neutral",
}: {
  speaker: string;
  text: string;
  tone?: "neutral" | "agent";
}) {
  const palette =
    tone === "agent"
      ? "bg-[#daf3c0] text-[#10200f] ring-[#daf3c0]/70"
      : "bg-white text-[#0f1728] ring-white/70";

  return (
    <div className="flex flex-col gap-2">
      <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/42">
        {speaker}
      </span>
      <div
        className={`max-w-[28rem] rounded-[1.6rem] px-5 py-4 text-[15px] leading-7 shadow-[0_20px_45px_rgba(0,0,0,0.18)] ring-1 ${palette}`}
      >
        {text}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-xs uppercase tracking-[0.36em] text-[#8ff6b2]">
      {children}
    </p>
  );
}

export default function Home() {
  return (
    <main className="relative isolate overflow-hidden bg-[radial-gradient(circle_at_top,#173356_0%,#09111f_38%,#050914_100%)] text-white">
      <div className="hero-grid pointer-events-none absolute inset-0 opacity-40" />
      <div className="orb orb-one" />
      <div className="orb orb-two" />

      <section className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 pb-20 pt-8 sm:px-10 lg:px-12">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/14 bg-white/10 text-xl font-semibold shadow-[0_12px_35px_rgba(0,0,0,0.18)]">
              K
            </div>
            <div>
              <p className="text-lg font-semibold tracking-tight">Keepalive</p>
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-white/48">
                iMessage-native agent
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 text-sm">
            <span className="rounded-full border border-white/12 bg-white/8 px-4 py-2 text-white/72">
              Personal utility
            </span>
            <span className="rounded-full border border-white/12 bg-white/8 px-4 py-2 text-white/72">
              No extra UI
            </span>
            <span className="rounded-full border border-white/12 bg-white/8 px-4 py-2 text-white/72">
              Built for Photon
            </span>
          </div>
        </header>

        <div className="grid flex-1 gap-14 py-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] lg:items-center">
          <div className="max-w-3xl">
            <SectionLabel>One sentence</SectionLabel>
            <h1 className="mt-5 max-w-4xl text-[clamp(3.2rem,8vw,6.8rem)] font-semibold leading-[0.95] tracking-[-0.06em] text-balance">
              An iMessage agent that remembers who matters, what you promised,
              and when to follow up.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-white/70 sm:text-xl">
              Keepalive makes sure you never accidentally drop a person, a
              promise, or a loop. You text it in plain language, and it reads
              the thread, drafts the second message, and nudges you only when
              the relationship actually needs it.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <a
                href="https://github.com/photon-hq/imessage-kit"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-full bg-[#daf3c0] px-6 py-3 text-sm font-semibold text-[#0f1d12] transition-transform duration-200 hover:-translate-y-0.5"
              >
                See the Photon SDK
              </a>
              <a
                href="#architecture"
                className="inline-flex items-center justify-center rounded-full border border-white/14 bg-white/8 px-6 py-3 text-sm font-semibold text-white/86 transition-colors duration-200 hover:bg-white/12"
              >
                How the agent works
              </a>
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-3">
              <div className="rounded-[1.7rem] border border-white/10 bg-black/18 p-5 backdrop-blur-sm">
                <p className="font-mono text-xs uppercase tracking-[0.24em] text-white/42">
                  Explain it fast
                </p>
                <p className="mt-3 text-lg leading-7 text-white/84">
                  It remembers the second message.
                </p>
              </div>
              <div className="rounded-[1.7rem] border border-white/10 bg-black/18 p-5 backdrop-blur-sm">
                <p className="font-mono text-xs uppercase tracking-[0.24em] text-white/42">
                  Feels native
                </p>
                <p className="mt-3 text-lg leading-7 text-white/84">
                  The value comes from thread memory, timing, and follow-through.
                </p>
              </div>
              <div className="rounded-[1.7rem] border border-white/10 bg-black/18 p-5 backdrop-blur-sm">
                <p className="font-mono text-xs uppercase tracking-[0.24em] text-white/42">
                  Actually useful
                </p>
                <p className="mt-3 text-lg leading-7 text-white/84">
                  Recruiting, founders, family, friends, warm intros.
                </p>
              </div>
            </div>
          </div>

          <aside className="relative">
            <div className="bubble-shell rounded-[2.3rem] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.14),rgba(255,255,255,0.04))] p-5 shadow-[0_32px_120px_rgba(2,8,26,0.5)] backdrop-blur-2xl sm:p-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <p className="text-lg font-semibold">Danny</p>
                  <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-white/42">
                    Thread summary
                  </p>
                </div>
                <div className="rounded-full border border-lime-300/18 bg-lime-300/12 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.28em] text-lime-100">
                  loop open
                </div>
              </div>

              <div className="mt-6 space-y-5">
                <Bubble
                  speaker="You"
                  text="remind me to follow up with Danny on Friday if he still has not sent the notes"
                />
                <Bubble
                  speaker="Keepalive"
                  text="Noted. Last inbound was 11 days ago. You said you would send notes after the workshop. I will check Friday and prep a warm nudge."
                  tone="agent"
                />
                <div className="rounded-[1.7rem] border border-white/12 bg-[#08101d] p-5 text-sm leading-7 text-white/68">
                  <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-white/42">
                    what it sees
                  </p>
                  <ul className="mt-3 space-y-2">
                    <li>Last reply: 11 days ago</li>
                    <li>Open promise: send workshop notes</li>
                    <li>Suggested action: short follow-up Friday morning</li>
                  </ul>
                </div>
                <Bubble
                  speaker="Keepalive"
                  text='Friday, 9:00 AM. No reply yet. Draft ready: "Hey Danny, circling back with the notes I promised..."'
                  tone="agent"
                />
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="relative mx-auto w-full max-w-7xl px-6 py-8 sm:px-10 lg:px-12">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {commandCards.map((card) => (
            <CommandCard key={card.title} {...card} />
          ))}
        </div>
      </section>

      <section className="relative mx-auto w-full max-w-7xl px-6 py-24 sm:px-10 lg:px-12">
        <div className="grid gap-7 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="max-w-xl">
            <SectionLabel>Demo flow</SectionLabel>
            <h2 className="mt-5 text-4xl font-semibold tracking-[-0.04em] text-balance sm:text-5xl">
              Built for the part everyone forgets: follow-through.
            </h2>
            <p className="mt-6 text-lg leading-8 text-white/70">
              The magic is not a giant assistant dashboard. It is a native
              conversation loop that sees the thread, understands the ask, and
              comes back only when the silence matters.
            </p>
          </div>

          <div className="space-y-5">
            {demoMoments.map((moment) => (
              <article
                key={moment.step}
                className="rounded-[2rem] border border-white/10 bg-white/6 p-6 backdrop-blur-md"
              >
                <div className="flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-[0.32em] text-[#8ff6b2]">
                      {moment.step}
                    </p>
                    <h3 className="mt-2 text-2xl font-semibold text-white">
                      {moment.moment}
                    </h3>
                  </div>
                </div>
                <div className="mt-5 space-y-4">
                  {moment.lines.map((line) => (
                    <Bubble
                      key={`${moment.step}-${line.speaker}-${line.text}`}
                      speaker={line.speaker}
                      text={line.text}
                      tone={line.speaker === "Keepalive" ? "agent" : "neutral"}
                    />
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative mx-auto w-full max-w-7xl px-6 py-24 sm:px-10 lg:px-12">
        <div className="grid gap-6 lg:grid-cols-3">
          {reasons.map((reason) => (
            <article
              key={reason.title}
              className="rounded-[2rem] border border-white/10 bg-black/22 p-7 backdrop-blur-md"
            >
              <SectionLabel>{reason.label}</SectionLabel>
              <h3 className="mt-5 text-3xl font-semibold tracking-[-0.04em] text-balance">
                {reason.title}
              </h3>
              <p className="mt-4 text-base leading-8 text-white/68">
                {reason.copy}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="relative mx-auto w-full max-w-7xl px-6 py-24 sm:px-10 lg:px-12">
        <div className="grid gap-8 rounded-[2.4rem] border border-white/10 bg-[linear-gradient(180deg,rgba(218,243,192,0.13),rgba(7,14,28,0.72))] p-8 shadow-[0_30px_120px_rgba(0,0,0,0.2)] lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1fr)] lg:p-10">
          <div>
            <SectionLabel>Modes</SectionLabel>
            <h2 className="mt-5 text-4xl font-semibold tracking-[-0.05em] text-balance sm:text-5xl">
              Utility with both edge and heart.
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-8 text-white/70">
              The strongest version of Keepalive is founder mode plus
              relationships mode together. One proves hard utility. The other
              proves the product can hold emotional context without turning
              sentimental or vague.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {modes.map((mode) => (
              <article
                key={mode.name}
                className="rounded-[1.9rem] border border-white/12 bg-[#0a1321] p-6"
              >
                <p className="font-mono text-xs uppercase tracking-[0.3em] text-[#8ff6b2]">
                  {mode.name}
                </p>
                <p className="mt-4 text-lg leading-8 text-white/76">
                  {mode.detail}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="architecture"
        className="relative mx-auto w-full max-w-7xl px-6 py-24 sm:px-10 lg:px-12"
      >
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <div>
            <SectionLabel>Photon grounding</SectionLabel>
            <h2 className="mt-5 text-4xl font-semibold tracking-[-0.05em] text-balance sm:text-5xl">
              This works because Photon already exposes the right primitives.
            </h2>
            <p className="mt-6 max-w-xl text-lg leading-8 text-white/70">
              `imessage-kit` is built for reading, sending, watching, and
              scheduling on macOS. Keepalive uses those primitives to stay
              thread-native instead of bolting a generic chatbot onto SMS.
            </p>
            <p className="mt-5 max-w-xl font-mono text-sm leading-7 text-white/48">
              Practical constraint: Photon&apos;s SDK is macOS-only and requires
              Full Disk Access to read chat history, which is exactly the right
              tradeoff for a real iMessage agent.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {architecture.map((item) => (
              <article
                key={item.name}
                className="rounded-[1.9rem] border border-white/10 bg-white/6 p-6 backdrop-blur-md"
              >
                <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#8ff6b2]">
                  {item.method}
                </p>
                <h3 className="mt-4 text-2xl font-semibold text-white">
                  {item.name}
                </h3>
                <p className="mt-3 text-base leading-7 text-white/68">
                  {item.detail}
                </p>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-10 overflow-hidden rounded-[2.2rem] border border-white/10 bg-[#020612] shadow-[0_35px_120px_rgba(0,0,0,0.28)]">
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
            <div>
              <p className="text-lg font-semibold">Photon blueprint</p>
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-white/42">
                Grounded in the upstream SDK
              </p>
            </div>
            <a
              href="https://github.com/photon-hq/imessage-kit"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-white/12 bg-white/6 px-4 py-2 text-sm text-white/72 transition-colors hover:bg-white/10"
            >
              Open repo
            </a>
          </div>
          <pre className="overflow-x-auto px-6 py-6 font-mono text-sm leading-7 text-[#dbe9ff]">
            <code>{photonCode}</code>
          </pre>
        </div>
      </section>

      <section className="relative mx-auto w-full max-w-7xl px-6 py-24 sm:px-10 lg:px-12">
        <KeepaliveConsole />
      </section>

      <section className="relative mx-auto w-full max-w-7xl px-6 pb-24 sm:px-10 lg:px-12">
        <div className="rounded-[2.2rem] border border-white/10 bg-white/6 px-8 py-10 text-center backdrop-blur-xl">
          <SectionLabel>Submission framing</SectionLabel>
          <p className="mx-auto mt-5 max-w-4xl text-[clamp(2rem,4vw,3.6rem)] font-semibold leading-[1.02] tracking-[-0.05em] text-balance">
            Keepalive turns iMessage from a place where relationships decay
            silently into a place where promises actually get kept.
          </p>
        </div>
      </section>
    </main>
  );
}
