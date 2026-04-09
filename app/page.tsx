"use client";

import { useState } from "react";

import { KeepaliveConsole } from "@/app/components/keepalive-console";
import { ThreadSimulator } from "@/app/components/thread-simulator";
import { ActionLink, SectionEyebrow, StatusPill } from "@/app/components/marketing-primitives";

type DashboardView =
  | "dashboard"
  | "promise-monitor"
  | "follow-ups"
  | "relationship-health"
  | "drafts"
  | "forwarded-inbox";

const sidebarItems: Array<{
  id: DashboardView;
  label: string;
}> = [
  { id: "dashboard", label: "Dashboard" },
  { id: "promise-monitor", label: "Promise Monitor" },
  { id: "follow-ups", label: "Follow Ups" },
  { id: "relationship-health", label: "Relationship Health" },
  { id: "drafts", label: "Drafts" },
  { id: "forwarded-inbox", label: "Forwarded Inbox" },
];

const viewMeta: Record<
  DashboardView,
  {
    title: string;
    subtitle: string;
  }
> = {
  dashboard: {
    title: "Dashboard",
    subtitle:
      "An iMessage agent that remembers who matters, what you promised, and when to follow up.",
  },
  "promise-monitor": {
    title: "Promise Monitor",
    subtitle:
      "Track open promises, due dates, and the threads where your next message matters most.",
  },
  "follow-ups": {
    title: "Follow Ups",
    subtitle:
      "Run the real Keepalive pipeline and operate active loops from one place.",
  },
  "relationship-health": {
    title: "Relationship Health",
    subtitle:
      "See who is warm, drifting, or overdue before guilt quietly replaces momentum.",
  },
  drafts: {
    title: "Drafts",
    subtitle:
      "Review response quality, warm check-ins, and ready-to-send second messages.",
  },
  "forwarded-inbox": {
    title: "Forwarded Inbox",
    subtitle:
      "Turn forwarded asks into timing, context, and reply-ready drafts.",
  },
};

const summaryCards = [
  {
    title: "Open Loops",
    value: "31",
    change: "+12% from last week",
    tone: "dark" as const,
  },
  {
    title: "Replies Saved",
    value: "168",
    change: "+18% from last month",
    tone: "light" as const,
  },
  {
    title: "Promises Tracked",
    value: "1,457",
    change: "+29% from last month",
    tone: "light" as const,
  },
  {
    title: "Active People",
    value: "2,023",
    change: "+0.9% from last month",
    tone: "light" as const,
  },
] as const;

const chartBars = [
  { month: "Jan", height: "h-20", active: false },
  { month: "Feb", height: "h-16", active: false },
  { month: "Mar", height: "h-28", active: true },
  { month: "Apr", height: "h-18", active: false },
  { month: "May", height: "h-24", active: false },
  { month: "Jun", height: "h-12", active: false },
] as const;

const promiseRows = [
  {
    thread: "Bridget at NVIDIA",
    promise: "Send updated deck",
    due: "19 Sep",
    status: "Open",
  },
  {
    thread: "Danny",
    promise: "Workshop notes",
    due: "20 Sep",
    status: "Armed",
  },
  {
    thread: "Uncle Raj",
    promise: "Warm check in",
    due: "22 Sep",
    status: "Draft",
  },
] as const;

const healthRows = [
  {
    name: "Aarav",
    status: "Cooling",
    note: "11 days since last reply. You said you would send him the notes.",
  },
  {
    name: "Riya",
    status: "Needs reply",
    note: "8 days since she asked to meet this week.",
  },
  {
    name: "Kartik",
    status: "At risk",
    note: "Unread prompt still sitting after your promised intro doc follow-up.",
  },
] as const;

const draftRows = [
  {
    title: "Recruiter follow-up",
    copy:
      "Hi Bridget, following up on the deck I promised. Sharing it here in case it is still helpful for the team.",
    score: "Strong",
  },
  {
    title: "Warm family check-in",
    copy:
      "Hey Uncle Raj, just checking in from my side. Wanted to say hi and see how you have been doing.",
    score: "Warm",
  },
  {
    title: "Friend loop close",
    copy:
      "Hey Danny, circling back with the notes I said I would send. Sharing them here now.",
    score: "Clear",
  },
] as const;

const forwardedRows = [
  {
    source: "Recruiter",
    ask: "Send the deck before Friday.",
    timing: "Follow up before Friday if still silent.",
  },
  {
    source: "Founder",
    ask: "Share the revised metrics screenshot.",
    timing: "Bump tomorrow morning if not acknowledged.",
  },
  {
    source: "Friend",
    ask: "Confirm dinner plan for this week.",
    timing: "Reply today while context is fresh.",
  },
] as const;

const rightRailCards: Record<DashboardView, Array<{ title: string; body: string }>> = {
  dashboard: [
    {
      title: "Why Keepalive works",
      body: "The promise, the silence, and the follow-up all happen in the same thread.",
    },
    {
      title: "Best one-line pitch",
      body: "It remembers the second message.",
    },
    {
      title: "Immediate value",
      body: "Recruiters, founders, family, and every person you meant to circle back to.",
    },
  ],
  "promise-monitor": [
    {
      title: "Highest priority thread",
      body: "Bridget at NVIDIA is due first and already has a usable draft ready.",
    },
    {
      title: "Detection signal",
      body: "Keepalive watches for your outbound commitments and checks whether the thread ever closed cleanly.",
    },
  ],
  "follow-ups": [
    {
      title: "Console mode",
      body: "This view is the operational side of the product: run commands, inspect parser output, and manage live loops.",
    },
    {
      title: "Fallback behavior",
      body: "Without macOS Photon access, the same pipeline still runs against seeded threads for testing.",
    },
  ],
  "relationship-health": [
    {
      title: "What this measures",
      body: "Recency, open commitments, and unanswered asks together define relationship risk better than unread counts alone.",
    },
    {
      title: "Why it matters",
      body: "This is the emotional utility layer: not just productivity, but remembering people before drift becomes awkwardness.",
    },
  ],
  drafts: [
    {
      title: "Draft strategy",
      body: "Keepalive aims for short, warm, low-pressure drafts that are ready to send without editing.",
    },
    {
      title: "Better than reminders alone",
      body: "A reminder without a draft still creates work. A reminder with a usable message closes the loop faster.",
    },
  ],
  "forwarded-inbox": [
    {
      title: "Forwarded workflow",
      body: "Take a message that landed elsewhere, extract the ask, decide the timing, and prepare the reply in one pass.",
    },
    {
      title: "Why text-native wins",
      body: "You do not need another triage app. The inbox itself becomes the command surface.",
    },
  ],
};

const architecture = [
  { name: "Thread memory", method: "sdk.getMessages()" },
  { name: "Relationship scan", method: "sdk.listChats()" },
  { name: "Live watch", method: "sdk.startWatching()" },
  { name: "Smart nudge", method: "sdk.message() + Reminders" },
] as const;

const starterDashboardCommands = [
  "remind me to follow up with Danny on Friday if no reply",
  "did I reply to Kartik",
  "who have I been ignoring this week",
] as const;

export default function Home() {
  const [activeView, setActiveView] = useState<DashboardView>("dashboard");

  return (
    <main id="main-content" className="sky-stage relative h-screen overflow-hidden bg-[#e8edf5] text-[#0f2b4a]">
      <div className="sky-grid pointer-events-none absolute inset-0 -z-10 opacity-[0.12]" />
      <div className="cloud-layer cloud-one pointer-events-none absolute -z-10 opacity-[0.12]" />
      <div className="cloud-layer cloud-two pointer-events-none absolute -z-10 opacity-10" />

      <div className="relative z-10 mx-auto h-full max-w-[1680px] px-3 py-3 sm:px-4 sm:py-4">
        <div className="grid h-full gap-0 overflow-hidden rounded-[26px] border border-[#d8dbe1] bg-[#f4f3ef] shadow-[0_30px_80px_rgba(66,83,110,0.14)] lg:grid-cols-[220px_minmax(0,1fr)_360px]">
          <aside className="hidden border-r border-[#e1e3e8] bg-[#fbfaf7] px-5 py-6 lg:flex lg:min-h-0 lg:flex-col">
            <div>
              <p className="text-[2rem] font-semibold tracking-[-0.05em]">
                Keepalive
              </p>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.24em] text-[#8b929f]">
                Relationship dashboard
              </p>
            </div>

            <nav className="mt-8 space-y-2">
              {sidebarItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveView(item.id)}
                  className={`focus-ring flex w-full items-center gap-3 rounded-[14px] px-4 py-3 text-left text-sm font-medium transition-colors ${
                    activeView === item.id
                      ? "bg-[#eceae4] text-[#141f2b]"
                      : "text-[#536273] hover:bg-[#f0efeb]"
                  }`}
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-current/50" />
                  {item.label}
                </button>
              ))}
            </nav>

          </aside>

          <section className="flex min-h-0 min-w-0 flex-col border-r border-[#e1e3e8] bg-[#f4f3ef]">
            <header className="border-b border-[#e1e3e8] px-5 py-4 sm:px-6">
              <div>
                <h1 className="text-3xl font-semibold tracking-[-0.05em]">
                  {viewMeta[activeView].title}
                </h1>
                <p className="mt-1 max-w-3xl text-sm text-[#717a87]">
                  {viewMeta[activeView].subtitle}
                </p>
              </div>
            </header>

            <div className="panel-scroll min-h-0 flex-1 p-4 sm:p-5">
              {renderMainView(activeView)}
            </div>
          </section>

          <aside className="panel-scroll hidden min-h-0 min-w-0 bg-[#f4f3ef] p-3 lg:block xl:p-4">
            {renderRightRail(activeView)}
          </aside>
        </div>
      </div>
    </main>
  );
}

function renderMainView(activeView: DashboardView) {
  if (activeView === "dashboard") {
    return (
      <div className="grid gap-4">
        <div className="grid gap-3 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <div
              key={card.title}
              className={`rounded-[22px] border px-5 py-4 ${
                card.tone === "dark"
                  ? "border-[#222222] bg-[#232323] text-white"
                  : "border-[#e1e3e8] bg-white text-[#0f2b4a]"
              }`}
            >
              <p className={`text-sm ${card.tone === "dark" ? "text-white/68" : "text-[#8a919d]"}`}>
                {card.title}
              </p>
              <p className="mt-2 text-[1.9rem] font-semibold tracking-[-0.04em]">
                {card.value}
              </p>
              <p className={`mt-1 text-sm ${card.tone === "dark" ? "text-[#89d58e]" : "text-[#7fb486]"}`}>
                {card.change}
              </p>
            </div>
          ))}
        </div>

        <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <div className="grid gap-4">
            <div className="rounded-[24px] border border-[#e1e3e8] bg-white p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold">Loop volume</p>
                  <p className="mt-1 text-sm text-[#89919e]">
                    Follow-up obligations across your threads.
                  </p>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f4f3ef] text-[#4b6279]">
                  ↗
                </div>
              </div>

              <div className="mt-6 flex items-end justify-between gap-4">
                {chartBars.map((bar) => (
                  <div
                    key={bar.month}
                    className="flex flex-1 flex-col items-center gap-3"
                  >
                    <div
                      className={`w-full max-w-[44px] rounded-[16px] ${
                        bar.active ? `${bar.height} bg-[#969391]` : `${bar.height} bg-[#232323]`
                      }`}
                    />
                    <p className="text-sm text-[#808796]">{bar.month}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border border-[#e1e3e8] bg-white p-5">
              <SectionEyebrow>Flow preview</SectionEyebrow>
              <div className="mt-4">
                <ThreadSimulator />
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-[24px] border border-[#e1e3e8] bg-white p-5">
              <p className="text-lg font-semibold">Open promises</p>
              <div className="mt-4 space-y-3">
                {promiseRows.map((row) => (
                  <div
                    key={`${row.thread}-${row.promise}`}
                    className="rounded-[16px] border border-[#eceae4] bg-[#f8f7f4] px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[#102f4c]">
                          {row.thread}
                        </p>
                        <p className="mt-1 text-sm text-[#66798f]">
                          {row.promise}
                        </p>
                      </div>
                      <span className="rounded-full bg-[#232323] px-3 py-1 text-xs font-semibold text-white">
                        {row.status}
                      </span>
                    </div>
                    <p className="mt-3 text-xs uppercase tracking-[0.16em] text-[#98a0ab]">
                      due {row.due}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border border-[#e1e3e8] bg-white p-5">
              <SectionEyebrow>Quick commands</SectionEyebrow>
              <div className="mt-4 space-y-3">
                {starterDashboardCommands.map((item) => (
                  <div
                    key={item}
                    className="rounded-[16px] border border-[#eceae4] bg-[#f8f7f4] px-4 py-4 text-sm text-[#42586f]"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border border-[#e1e3e8] bg-white p-5">
              <SectionEyebrow>Photon grounding</SectionEyebrow>
              <div className="mt-4 grid gap-3">
                {architecture.map((item) => (
                  <div
                    key={item.name}
                    className="rounded-[16px] border border-[#eceae4] bg-[#f8f7f4] px-4 py-3"
                  >
                    <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#7c8794]">
                      {item.method}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[#153252]">
                      {item.name}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (activeView === "promise-monitor") {
    return (
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-[24px] border border-[#e1e3e8] bg-white p-5">
          <div className="flex items-center justify-between">
            <SectionEyebrow>Promises</SectionEyebrow>
            <StatusPill className="border-[#eceae4] bg-[#f3f2ef] text-[#34495f]">
              31 active
            </StatusPill>
          </div>
          <div className="mt-5 space-y-3">
            {promiseRows.concat(promiseRows).map((row, index) => (
              <div
                key={`${row.thread}-${index}`}
                className="rounded-[16px] border border-[#eceae4] bg-[#f8f7f4] px-4 py-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#102f4c]">
                      {row.thread}
                    </p>
                    <p className="mt-1 text-sm text-[#66798f]">
                      {row.promise}
                    </p>
                  </div>
                  <span className="rounded-full bg-[#232323] px-3 py-1 text-xs font-semibold text-white">
                    {row.status}
                  </span>
                </div>
                <p className="mt-3 text-xs uppercase tracking-[0.16em] text-[#98a0ab]">
                  due {row.due}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[24px] border border-[#e1e3e8] bg-white p-5">
          <SectionEyebrow>Detection</SectionEyebrow>
          <div className="mt-4 space-y-3">
            {[
              "Detect your own promises in outbound messages.",
              "Compare later inbound messages to close loops automatically.",
              "Escalate only when silence persists past the intended follow-up window.",
            ].map((item) => (
              <div
                key={item}
                className="rounded-[16px] border border-[#eceae4] bg-[#f8f7f4] px-4 py-4 text-sm leading-7 text-[#607489]"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (activeView === "follow-ups") {
    return <KeepaliveConsole />;
  }

  if (activeView === "relationship-health") {
    return (
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="rounded-[24px] border border-[#e1e3e8] bg-white p-5">
          <SectionEyebrow>Health map</SectionEyebrow>
          <div className="mt-5 space-y-3">
            {healthRows.map((row) => (
              <div
                key={row.name}
                className="rounded-[16px] border border-[#eceae4] bg-[#f8f7f4] px-4 py-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-[#102f4c]">{row.name}</p>
                  <StatusPill className="border-[#eceae4] bg-white text-[#4a6178]">
                    {row.status}
                  </StatusPill>
                </div>
                <p className="mt-3 text-sm leading-7 text-[#607489]">{row.note}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[24px] border border-[#e1e3e8] bg-white p-5">
          <SectionEyebrow>Signals</SectionEyebrow>
          <div className="mt-4 grid gap-3">
            {[
              { label: "Warm", value: "18" },
              { label: "Cooling", value: "9" },
              { label: "At risk", value: "4" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-[16px] border border-[#eceae4] bg-[#f8f7f4] px-4 py-4"
              >
                <p className="text-sm text-[#768493]">{item.label}</p>
                <p className="mt-2 text-2xl font-semibold text-[#102f4c]">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (activeView === "drafts") {
    return (
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="rounded-[24px] border border-[#e1e3e8] bg-white p-5">
          <SectionEyebrow>Ready drafts</SectionEyebrow>
          <div className="mt-5 space-y-3">
            {draftRows.map((draft) => (
              <div
                key={draft.title}
                className="rounded-[16px] border border-[#eceae4] bg-[#f8f7f4] px-4 py-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-[#102f4c]">{draft.title}</p>
                  <StatusPill className="border-[#eceae4] bg-white text-[#4a6178]">
                    {draft.score}
                  </StatusPill>
                </div>
                <p className="mt-3 text-sm leading-7 text-[#607489]">
                  {draft.copy}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[24px] border border-[#e1e3e8] bg-white p-5">
          <SectionEyebrow>Draft rules</SectionEyebrow>
          <div className="mt-4 space-y-3">
            {[
              "Short enough to send without rewriting.",
              "Warm enough to preserve relationship tone.",
              "Specific enough to close the actual loop.",
            ].map((rule) => (
              <div
                key={rule}
                className="rounded-[16px] border border-[#eceae4] bg-[#f8f7f4] px-4 py-4 text-sm leading-7 text-[#607489]"
              >
                {rule}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="rounded-[24px] border border-[#e1e3e8] bg-white p-5">
        <SectionEyebrow>Forwarded asks</SectionEyebrow>
        <div className="mt-5 space-y-3">
          {forwardedRows.map((row) => (
            <div
              key={`${row.source}-${row.ask}`}
              className="rounded-[16px] border border-[#eceae4] bg-[#f8f7f4] px-4 py-4"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-[#102f4c]">{row.source}</p>
                <StatusPill className="border-[#eceae4] bg-white text-[#4a6178]">
                  Ask extracted
                </StatusPill>
              </div>
              <p className="mt-3 text-sm text-[#42586f]">{row.ask}</p>
              <p className="mt-2 text-sm text-[#6a7d92]">{row.timing}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[24px] border border-[#e1e3e8] bg-white p-5">
        <SectionEyebrow>Flow</SectionEyebrow>
        <div className="mt-4">
          <ThreadSimulator />
        </div>
      </div>
    </div>
  );
}

function renderRightRail(activeView: DashboardView) {
  return (
    <div className="space-y-4">
      <div className="rounded-[24px] border border-[#d8d7d1] bg-white p-5">
        <SectionEyebrow>Current view</SectionEyebrow>
        <h2 className="mt-3 text-xl font-semibold text-[#102f4c]">
          {viewMeta[activeView].title}
        </h2>
        <p className="mt-2 text-sm leading-7 text-[#607489]">
          {viewMeta[activeView].subtitle}
        </p>
      </div>

      {rightRailCards[activeView].map((card) => (
        <div
          key={`${activeView}-${card.title}`}
          className="rounded-[24px] border border-[#d8d7d1] bg-white p-5"
        >
          <p className="text-sm font-semibold text-[#102f4c]">{card.title}</p>
          <p className="mt-3 text-sm leading-7 text-[#607489]">{card.body}</p>
        </div>
      ))}

      <div className="rounded-[24px] border border-[#d8d7d1] bg-white p-5">
        <SectionEyebrow>Default action</SectionEyebrow>
        <div className="mt-4 grid gap-3">
          <ActionLink
            href="https://github.com/photon-hq/imessage-kit"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-[12px] border border-[#e1e3e8] bg-[#f8f7f4] px-4 py-3 text-[#33485d] hover:bg-[#efede8]"
          >
            Open Photon SDK
          </ActionLink>
          <div className="rounded-[16px] border border-[#eceae4] bg-[#f8f7f4] px-4 py-4 text-sm leading-7 text-[#607489]">
            Default view is `Dashboard`. Click any item in the sidebar to swap the center workspace into that page only.
          </div>
        </div>
      </div>
    </div>
  );
}
