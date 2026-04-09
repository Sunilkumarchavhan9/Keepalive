"use client";

import { useState } from "react";

import { ChatBubble, SectionEyebrow, StatusPill } from "@/app/components/marketing-primitives";

const simulatorSteps = [
  {
    id: "capture",
    title: "Capture",
    status: "Loop opened",
    caption:
      "Keepalive reads the thread or forwarded message and decides whether a real loop is open.",
    transcript: [
      {
        speaker: "You",
        text: "forwarded recruiter message: Hey, just checking whether you can send over the deck before Friday.",
        tone: "neutral" as const,
      },
      {
        speaker: "Keepalive",
        text: "Ask: send over the deck. Timing: follow up before Friday if you have not replied.",
        tone: "agent" as const,
      },
    ],
    notes: ["Forward detected", "Ask extracted", "Draft prepared"],
  },
  {
    id: "watch",
    title: "Watch",
    status: "Reminder armed",
    caption:
      "The agent waits in the background instead of forcing you into another app.",
    transcript: [
      {
        speaker: "You",
        text: "remind me to follow up with Bridget at NVIDIA on Monday if no reply",
        tone: "neutral" as const,
      },
      {
        speaker: "Keepalive",
        text: "Locked. Last inbound was Thursday. Open promise: send the deck after cleaning up the metrics slide.",
        tone: "agent" as const,
      },
    ],
    notes: ["Silence monitored", "Reminder scheduled", "Thread context stored"],
  },
  {
    id: "adjust",
    title: "Adjust",
    status: "Snoozed cleanly",
    caption:
      "You can edit or snooze the reminder without rebuilding the loop by hand.",
    transcript: [
      {
        speaker: "Keepalive",
        text: "No reply yet. Draft ready: Hi Bridget, following up on the deck I promised...",
        tone: "agent" as const,
      },
      {
        speaker: "Operator",
        text: "Snooze to tomorrow 9am",
        tone: "neutral" as const,
      },
      {
        speaker: "Keepalive",
        text: "Snoozed Bridget at NVIDIA until tomorrow, 9:00 AM.",
        tone: "agent" as const,
      },
    ],
    notes: ["Reminder time changed", "Loop stays open", "Draft kept intact"],
  },
] as const;

export function ThreadSimulator() {
  const [activeStepId, setActiveStepId] = useState<
    (typeof simulatorSteps)[number]["id"]
  >(simulatorSteps[0].id);
  const activeStep =
    simulatorSteps.find((step) => step.id === activeStepId) ?? simulatorSteps[0];

  return (
    <div className="min-w-0 rounded-[20px] border border-[#e6e2dc] bg-[#f8f7f4] p-4">
      <div className="flex flex-col gap-3 border-b border-[#eceae4] pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionEyebrow>Flow</SectionEyebrow>
          <StatusPill className="border-[#dad9d3] bg-white text-[#233447]">
            {activeStep.status}
          </StatusPill>
        </div>
        <div>
          <h3 className="text-xl font-semibold text-[#0f2b4a]">
            {activeStep.title}
          </h3>
          <p className="mt-2 text-sm leading-7 text-[#5b6f86]">
            {activeStep.caption}
          </p>
        </div>
      </div>

      <div className="panel-scroll mt-4 overflow-x-auto pb-2">
        <div className="flex min-w-max gap-2">
          {simulatorSteps.map((step, index) => {
            const selected = step.id === activeStep.id;

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setActiveStepId(step.id)}
                className={`focus-ring min-w-[120px] rounded-none border px-4 py-3 text-left transition-colors ${
                  selected
                    ? "border-[#222222] bg-[#222222] text-white"
                    : "border-[#dad9d3] bg-white text-[#0f2b4a] hover:bg-[#f3f2ef]"
                }`}
              >
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] opacity-60">
                  0{index + 1}
                </p>
                <p className="mt-2 text-sm font-semibold">{step.title}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 space-y-4">
        <div className="space-y-4">
          {activeStep.transcript.map((message) => (
            <ChatBubble
              key={`${activeStep.id}-${message.speaker}-${message.text}`}
              speaker={message.speaker}
              text={message.text}
              tone={message.tone}
            />
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {activeStep.notes.map((note) => (
            <div
              key={`${activeStep.id}-${note}`}
              className="rounded-none border border-[#e1ddd8] bg-white px-3 py-2 text-xs font-medium text-[#53677e]"
            >
              {note}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
