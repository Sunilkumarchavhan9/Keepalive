import { randomUUID } from "node:crypto";

import type { ChatSummary, Message } from "@photon-ai/imessage-kit";

import {
  formatDistanceFromNow,
  formatShortDate,
  parseWhenExpression,
} from "@/lib/keepalive/time";
import type {
  CommandResult,
  FollowUpLoop,
  ParsedCommand,
  ReminderSweepResult,
} from "@/lib/keepalive/types";
import type { KeepaliveDataSource } from "@/lib/keepalive/runtime";
import { KeepaliveStore } from "@/lib/keepalive/store";

const PROMISE_PATTERN =
  /\b(i('| wi)?ll|let me|i can|happy to|i'm going to|i am going to|will send|will follow up|send you)\b/i;

interface ThreadContext {
  latest: Message | null;
  lastInbound: Message | null;
  lastOutbound: Message | null;
  promise: string | null;
  promiseLines: string[];
}

export class KeepaliveService {
  constructor(
    private readonly source: KeepaliveDataSource,
    private readonly store = new KeepaliveStore()
  ) {}

  async handleCommand(
    input: string,
    options: {
      notifyTo?: string | null;
      now?: Date;
    } = {}
  ): Promise<CommandResult> {
    const now = options.now ?? new Date();
    const parsed = parseCommand(input);

    switch (parsed.type) {
      case "schedule-follow-up":
        return this.scheduleFollowUp(parsed, options.notifyTo ?? null, now);
      case "reply-status":
        return this.replyStatus(parsed);
      case "neglect-report":
        return this.neglectReport(parsed, now);
      case "promise-summary":
        return this.promiseSummary(parsed);
      case "draft-check-in":
        return this.draftCheckIn(parsed);
      default:
        return {
          ok: false,
          parsed,
          runtime: this.source.runtime,
          reply:
            "I can handle follow-up reminders, reply checks, neglect reports, promise summaries, and warm check-ins. Try: remind me to follow up with Danny on Friday if no reply.",
        };
    }
  }

  async processDueLoops(now = new Date()): Promise<ReminderSweepResult> {
    const loops = await this.store.listOpenLoops();
    const dueLoops = loops.filter((loop) => new Date(loop.dueAt) <= now);
    const sent: FollowUpLoop[] = [];

    for (const loop of dueLoops) {
      const stillOpen = await this.isLoopStillOpen(loop);

      if (!stillOpen) {
        await this.store.closeLoop(loop.id, "reply detected before reminder");
        continue;
      }

      if (loop.notifyTo && this.source.runtime.canSendMessages) {
        await this.source.sendText(loop.notifyTo, loop.reminderText);
      }

      const updated = await this.store.updateLoop(loop.id, (current) => ({
        ...current,
        status: "sent",
      }));

      if (updated) {
        sent.push(updated);
      }
    }

    return { sent };
  }

  async closeLoopsForIncomingMessage(message: Message): Promise<FollowUpLoop[]> {
    const openLoops = await this.store.listOpenLoops();
    const matchingLoops = openLoops.filter(
      (loop) => loop.targetChatId && loop.targetChatId === message.chatId
    );
    const closed: FollowUpLoop[] = [];

    for (const loop of matchingLoops) {
      const updated = await this.store.closeLoop(loop.id, "reply received");
      if (updated) {
        closed.push(updated);
      }
    }

    return closed;
  }

  private async scheduleFollowUp(
    parsed: Extract<ParsedCommand, { type: "schedule-follow-up" }>,
    notifyTo: string | null,
    now: Date
  ): Promise<CommandResult> {
    const dueAt = parseWhenExpression(parsed.when, now);

    if (!dueAt) {
      return {
        ok: false,
        parsed,
        runtime: this.source.runtime,
        reply:
          "I could not parse the reminder time. Try a phrase like Friday, tomorrow, or in 3 days.",
      };
    }

    const chat = await this.resolveChat(parsed.contact);
    const context = await this.describeThread(chat);
    const draftText = buildFollowUpDraft(
      chat?.displayName ?? parsed.contact,
      context
    );

    const loop: FollowUpLoop = {
      id: randomUUID(),
      status: "open",
      originalCommand: parsed.originalText,
      createdAt: now.toISOString(),
      dueAt: dueAt.toISOString(),
      targetQuery: parsed.contact,
      targetName: chat?.displayName ?? parsed.contact,
      targetChatId: chat?.chatId ?? null,
      notifyTo,
      lastInboundAt: context.lastInbound?.date.toISOString() ?? null,
      lastOutboundAt: context.lastOutbound?.date.toISOString() ?? null,
      reminderText: buildReminderText(
        chat?.displayName ?? parsed.contact,
        dueAt,
        context,
        draftText
      ),
      draftText,
      closedAt: null,
      closedReason: null,
    };

    await this.store.saveLoop(loop);

    const parts = [
      `Locked. I will remind you ${formatShortDate(dueAt)}.`,
      context.lastInbound
        ? `Last inbound was ${formatDistanceFromNow(context.lastInbound.date, now)} ago.`
        : "I did not find a recent inbound message in that thread.",
      context.promise
        ? `Open promise: ${context.promise}.`
        : "I did not detect an explicit promise yet.",
      "Draft ready when you want it.",
    ];

    return {
      ok: true,
      parsed,
      runtime: this.source.runtime,
      loop,
      reply: parts.join(" "),
    };
  }

  private async replyStatus(
    parsed: Extract<ParsedCommand, { type: "reply-status" }>
  ): Promise<CommandResult> {
    const chat = await this.resolveChat(parsed.contact);

    if (!chat) {
      return {
        ok: false,
        parsed,
        runtime: this.source.runtime,
        reply: `I could not find a thread for ${parsed.contact}.`,
      };
    }

    const { messages } = await this.source.getMessages({
      chatId: chat.chatId,
      limit: 8,
      excludeReactions: true,
    });

    const latest = messages[0];

    if (!latest) {
      return {
        ok: false,
        parsed,
        runtime: this.source.runtime,
        reply: `I found ${chat.displayName ?? parsed.contact}, but there is no recent message history to inspect.`,
      };
    }

    const latestMyReply = messages.find((message) => message.isFromMe);

    if (latest.isFromMe) {
      return {
        ok: true,
        parsed,
        runtime: this.source.runtime,
        reply: `Yes. Your latest message in ${chat.displayName ?? parsed.contact} was sent ${formatShortDate(latest.date)}.`,
      };
    }

    return {
      ok: false,
      parsed,
      runtime: this.source.runtime,
      reply: latestMyReply
        ? `Not yet. ${chat.displayName ?? parsed.contact} last wrote ${formatShortDate(latest.date)}. Your last reply was ${formatShortDate(latestMyReply.date)}.`
        : `Not yet. ${chat.displayName ?? parsed.contact} last wrote ${formatShortDate(latest.date)} and I could not find a reply from you in the recent slice.`,
    };
  }

  private async neglectReport(
    parsed: Extract<ParsedCommand, { type: "neglect-report" }>,
    now: Date
  ): Promise<CommandResult> {
    const chats = await this.source.listChats({ limit: 20, sortBy: "recent" });
    const neglected: string[] = [];

    for (const chat of chats) {
      const summary = await this.describeThread(chat);
      const latest = summary.latest;

      if (!latest || latest.isFromMe) {
        continue;
      }

      const ageMs = now.getTime() - latest.date.getTime();
      const minAgeMs =
        parsed.timeframe === "week"
          ? 3 * 24 * 60 * 60 * 1000
          : 2 * 24 * 60 * 60 * 1000;

      if (ageMs < minAgeMs) {
        continue;
      }

      const reason = summary.promise
        ? `You said: ${summary.promise}`
        : latest.text
          ? `Last ask: ${truncate(latest.text, 56)}`
          : "Last message is still waiting on you";

      neglected.push(
        `${chat.displayName ?? chat.chatId} last text ${formatDistanceFromNow(latest.date, now)} ago. ${reason}.`
      );
    }

    return {
      ok: neglected.length > 0,
      parsed,
      runtime: this.source.runtime,
      reply:
        neglected.length > 0
          ? neglected.slice(0, 4).join("\n")
          : "No obvious neglect loops right now. The recent threads are either answered or too fresh to nudge.",
    };
  }

  private async promiseSummary(
    parsed: Extract<ParsedCommand, { type: "promise-summary" }>
  ): Promise<CommandResult> {
    const chat = await this.resolveChat(parsed.contact);
    const context = await this.describeThread(chat);

    if (!chat) {
      return {
        ok: false,
        parsed,
        runtime: this.source.runtime,
        reply: `I could not find a thread for ${parsed.contact}.`,
      };
    }

    if (!context.promiseLines.length) {
      return {
        ok: false,
        parsed,
        runtime: this.source.runtime,
        reply: `I found ${chat.displayName ?? parsed.contact}, but I did not detect a recent promise from you in the latest messages.`,
      };
    }

    return {
      ok: true,
      parsed,
      runtime: this.source.runtime,
      reply: context.promiseLines.slice(0, 3).join("\n"),
    };
  }

  private async draftCheckIn(
    parsed: Extract<ParsedCommand, { type: "draft-check-in" }>
  ): Promise<CommandResult> {
    const chat = await this.resolveChat(parsed.contact);
    const context = await this.describeThread(chat);
    const draft = buildCheckInDraft(
      chat?.displayName ?? parsed.contact,
      context,
      parsed.warmth
    );

    return {
      ok: true,
      parsed,
      runtime: this.source.runtime,
      reply: draft,
    };
  }

  private async resolveChat(query: string): Promise<ChatSummary | null> {
    const exact = await this.source.listChats({
      search: query,
      limit: 5,
      sortBy: "recent",
    });

    return exact[0] ?? null;
  }

  private async describeThread(chat: ChatSummary | null): Promise<ThreadContext> {
    if (!chat) {
      return {
        latest: null,
        lastInbound: null,
        lastOutbound: null,
        promise: null,
        promiseLines: [],
      };
    }

    const result = await this.source.getMessages({
      chatId: chat.chatId,
      limit: 20,
      excludeReactions: true,
    });

    const latest = result.messages[0] ?? null;
    const lastInbound =
      result.messages.find((message) => !message.isFromMe) ?? null;
    const lastOutbound =
      result.messages.find((message) => message.isFromMe) ?? null;
    const promiseMessages = result.messages.filter(
      (message) =>
        message.isFromMe && Boolean(message.text) && PROMISE_PATTERN.test(message.text!)
    );

    return {
      latest,
      lastInbound,
      lastOutbound,
      promise: promiseMessages[0]?.text ?? null,
      promiseLines: promiseMessages.map(
        (message) => `${formatShortDate(message.date)}: ${message.text}`
      ),
    };
  }

  private async isLoopStillOpen(loop: FollowUpLoop): Promise<boolean> {
    if (!loop.targetChatId) {
      return true;
    }

    const result = await this.source.getMessages({
      chatId: loop.targetChatId,
      limit: 10,
      excludeReactions: true,
    });

    const latestInbound = result.messages.find((message) => !message.isFromMe);

    if (!latestInbound || !loop.lastOutboundAt) {
      return true;
    }

    return latestInbound.date <= new Date(loop.lastOutboundAt);
  }
}

export function parseCommand(input: string): ParsedCommand {
  const trimmed = input.trim();

  let match = trimmed.match(
    /^remind me to follow up with (.+?) (on|in) (.+?)(?: if no reply)?$/i
  );

  if (match) {
    const [, contact, preposition, when] = match;
    return {
      type: "schedule-follow-up",
      contact: contact.trim(),
      when: preposition.toLowerCase() === "in" ? `in ${when.trim()}` : when.trim(),
      originalText: trimmed,
    };
  }

  match = trimmed.match(/^did i reply to (.+)$/i);

  if (match) {
    const [, contact] = match;
    return {
      type: "reply-status",
      contact: contact.trim(),
      originalText: trimmed,
    };
  }

  match = trimmed.match(
    /^who (?:have|am) i (?:been )?(?:ignoring|neglecting)( this week)?$/i
  );

  if (match) {
    return {
      type: "neglect-report",
      timeframe: match[1] ? "week" : "default",
      originalText: trimmed,
    };
  }

  match = trimmed.match(/^(?:what did i promise|what do i owe) (.+)$/i);

  if (match) {
    const [, contact] = match;
    return {
      type: "promise-summary",
      contact: contact.trim(),
      originalText: trimmed,
    };
  }

  match = trimmed.match(
    /^draft(?: a)? (?:(warm|gentle|short)\s+)?check in for (.+)$/i
  );

  if (match) {
    const [, warmthRaw, contact] = match;
    return {
      type: "draft-check-in",
      contact: contact.trim(),
      warmth:
        (warmthRaw?.toLowerCase() as
          | "warm"
          | "gentle"
          | "short"
          | undefined) ?? "default",
      originalText: trimmed,
    };
  }

  return {
    type: "unknown",
    originalText: trimmed,
  };
}

function buildReminderText(
  name: string,
  dueAt: Date,
  context: ThreadContext,
  draftText: string
): string {
  const parts = [
    `No reply yet from ${name}.`,
    `Reminder time: ${formatShortDate(dueAt)}.`,
  ];

  if (context.promise) {
    parts.push(`You said: "${truncate(context.promise, 90)}"`);
  }

  parts.push(`Draft ready: ${draftText}`);
  return parts.join(" ");
}

function buildFollowUpDraft(name: string, context: ThreadContext): string {
  if (context.lastInbound?.text) {
    return `Hi ${firstName(name)}, just following up on your note about ${extractTopic(
      context.lastInbound.text
    )}. Happy to keep this easy if now is not the right time.`;
  }

  if (context.promise) {
    return `Hi ${firstName(name)}, circling back on the thing I said I would send. Sharing it here in case it is still useful.`;
  }

  return `Hi ${firstName(name)}, just checking back in on this thread in case it slipped. Happy to resend anything useful.`;
}

function buildCheckInDraft(
  name: string,
  context: ThreadContext,
  warmth: "warm" | "gentle" | "short" | "default"
): string {
  const opener =
    warmth === "short"
      ? `Hey ${firstName(name)}`
      : `Hey ${firstName(name)}, hope you are doing well`;

  if (context.lastInbound?.text) {
    return `${opener}. I was thinking about your note on ${extractTopic(
      context.lastInbound.text
    )} and wanted to check in. No pressure to reply fast.`;
  }

  if (warmth === "gentle") {
    return `${opener}. Just a gentle check-in from my side. No rush at all, just wanted to say hi.`;
  }

  return `${opener}. Wanted to check in and see how you have been.`;
}

function extractTopic(text: string): string {
  const cleaned = text.replace(/[?!.]/g, "").trim();
  return truncate(cleaned, 42).toLowerCase();
}

function truncate(text: string, length: number): string {
  return text.length <= length ? text : `${text.slice(0, length - 1)}...`;
}

function firstName(name: string): string {
  return name.split(" ")[0] ?? name;
}
