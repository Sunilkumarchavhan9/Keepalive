import { randomUUID } from "node:crypto";

import type { ChatSummary, Message } from "@photon-ai/imessage-kit";

import {
  analyzeForwardedMessageWithAI,
  draftCheckInWithAI,
  draftFollowUpWithAI,
  extractPromiseFromMessages,
  getKeepaliveAIModel,
} from "@/lib/keepalive/ai";
import {
  formatDistanceFromNow,
  formatShortDate,
  parseWhenExpression,
} from "@/lib/keepalive/time";
import type {
  CommandDetail,
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
  messages: readonly Message[];
  latest: Message | null;
  lastInbound: Message | null;
  lastOutbound: Message | null;
  promise: string | null;
  promiseLines: string[];
  intelligence: "openai" | "heuristic";
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
      case "forwarded-analysis":
        return this.forwardedAnalysis(parsed);
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

  async updateLoop(
    id: string,
    input: {
      action: "snooze" | "edit" | "cancel";
      when?: string | null;
      now?: Date;
    }
  ): Promise<{
    ok: boolean;
    status: number;
    reply: string;
    loop: FollowUpLoop | null;
  }> {
    const now = input.now ?? new Date();

    if (input.action === "cancel") {
      const cancelled = await this.store.cancelLoop(id, "cancelled in console");

      if (!cancelled) {
        return {
          ok: false,
          status: 404,
          reply: "That loop does not exist anymore.",
          loop: null,
        };
      }

      return {
        ok: true,
        status: 200,
        reply: `Cancelled the reminder for ${cancelled.targetName}.`,
        loop: cancelled,
      };
    }

    const expression = input.when?.trim();

    if (!expression) {
      return {
        ok: false,
        status: 400,
        reply: "Provide a new reminder time like tomorrow 9am or in 2 days.",
        loop: null,
      };
    }

    const nextDueAt = parseWhenExpression(expression, now);

    if (!nextDueAt) {
      return {
        ok: false,
        status: 400,
        reply: "I could not parse that time. Try tomorrow 9am, Friday, or in 2 days.",
        loop: null,
      };
    }

    const updated = await this.store.updateLoop(id, (loop) => ({
      ...loop,
      dueAt: nextDueAt.toISOString(),
      status: "open",
      closedAt: null,
      closedReason: null,
      reminderText: buildUpdatedReminderText(loop, nextDueAt),
    }));

    if (!updated) {
      return {
        ok: false,
        status: 404,
        reply: "That loop does not exist anymore.",
        loop: null,
      };
    }

    return {
      ok: true,
      status: 200,
      reply:
        input.action === "edit"
          ? `Updated ${updated.targetName} to ${formatShortDate(nextDueAt)}.`
          : `Snoozed ${updated.targetName} until ${formatShortDate(nextDueAt)}.`,
      loop: updated,
    };
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
    const context = await this.describeThread(chat, { useAIForPromise: true });
    const heuristicDraft = buildFollowUpDraft(
      chat?.displayName ?? parsed.contact,
      context
    );
    const aiDraft = await draftFollowUpWithAI({
      contactName: chat?.displayName ?? parsed.contact,
      promise: context.promise,
      messages: context.messages,
    });
    const draftText = aiDraft?.draft ?? heuristicDraft;

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
      draftSource: aiDraft?.provider ?? "heuristic",
      promiseSnapshot: context.promise,
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
      intelligence: {
        provider: aiDraft?.provider ?? context.intelligence,
        model: aiDraft?.model ?? getKeepaliveAIModel(),
      },
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
    const context = await this.describeThread(chat, { useAIForPromise: true });

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
      intelligence: {
        provider: context.intelligence,
        model: getKeepaliveAIModel(),
      },
    };
  }

  private async draftCheckIn(
    parsed: Extract<ParsedCommand, { type: "draft-check-in" }>
  ): Promise<CommandResult> {
    const chat = await this.resolveChat(parsed.contact);
    const context = await this.describeThread(chat);
    const heuristicDraft = buildCheckInDraft(
      chat?.displayName ?? parsed.contact,
      context,
      parsed.warmth
    );
    const aiDraft = await draftCheckInWithAI({
      contactName: chat?.displayName ?? parsed.contact,
      warmth: parsed.warmth,
      messages: context.messages,
    });
    const draft = aiDraft?.draft ?? heuristicDraft;

    return {
      ok: true,
      parsed,
      runtime: this.source.runtime,
      reply: draft,
      intelligence: {
        provider: aiDraft?.provider ?? "heuristic",
        model: aiDraft?.model ?? getKeepaliveAIModel(),
      },
    };
  }

  private async forwardedAnalysis(
    parsed: Extract<ParsedCommand, { type: "forwarded-analysis" }>
  ): Promise<CommandResult> {
    const aiAnalysis = await analyzeForwardedMessageWithAI({
      label: parsed.label,
      message: parsed.message,
    });
    const details = analyzeForwardedMessage(
      parsed.message,
      parsed.label,
      aiAnalysis
        ? {
            ask: aiAnalysis.ask,
            timing: aiAnalysis.timing,
            draft: aiAnalysis.draft,
          }
        : undefined
    );
    const detailLines = details.map((detail) => `${detail.label}: ${detail.value}`);

    return {
      ok: true,
      parsed,
      runtime: this.source.runtime,
      details,
      reply: detailLines.join("\n"),
      intelligence: {
        provider: aiAnalysis?.provider ?? "heuristic",
        model: aiAnalysis?.model ?? getKeepaliveAIModel(),
      },
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

  private async describeThread(
    chat: ChatSummary | null,
    options: {
      useAIForPromise?: boolean;
    } = {}
  ): Promise<ThreadContext> {
    if (!chat) {
      return {
        messages: [],
        latest: null,
        lastInbound: null,
        lastOutbound: null,
        promise: null,
        promiseLines: [],
        intelligence: "heuristic",
      };
    }

    const result = await this.source.getMessages({
      chatId: chat.chatId,
      limit: 20,
      excludeReactions: true,
    });

    const latest = result.messages[0] ?? null;
    const lastInbound = result.messages.find((message) => !message.isFromMe) ?? null;
    const lastOutbound = result.messages.find((message) => message.isFromMe) ?? null;
    const promiseMessages = result.messages.filter(
      (message) =>
        message.isFromMe && Boolean(message.text) && PROMISE_PATTERN.test(message.text!)
    );
    const aiPromise = options.useAIForPromise
      ? await extractPromiseFromMessages(chat.displayName ?? chat.chatId, result.messages)
      : null;
    const promise = aiPromise?.promise ?? promiseMessages[0]?.text ?? null;
    const promiseLines = promiseMessages.map(
      (message) => `${formatShortDate(message.date)}: ${message.text}`
    );

    if (promise && aiPromise?.promise && !promiseLines.length) {
      promiseLines.push(`Latest thread read: ${promise}`);
    }

    return {
      messages: result.messages,
      latest,
      lastInbound,
      lastOutbound,
      promise,
      promiseLines,
      intelligence: aiPromise ? "openai" : "heuristic",
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

function buildUpdatedReminderText(loop: FollowUpLoop, dueAt: Date): string {
  const parts = [
    `No reply yet from ${loop.targetName}.`,
    `Reminder time: ${formatShortDate(dueAt)}.`,
  ];

  if (loop.promiseSnapshot) {
    parts.push(`You said: "${truncate(loop.promiseSnapshot, 90)}"`);
  }

  if (loop.draftText) {
    parts.push(`Draft ready: ${loop.draftText}`);
  }

  return parts.join(" ");
}

export function parseCommand(input: string): ParsedCommand {
  const trimmed = input.trim();
  const forwarded = parseForwardedCommand(trimmed);

  if (forwarded) {
    return forwarded;
  }

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

function parseForwardedCommand(input: string): Extract<
  ParsedCommand,
  { type: "forwarded-analysis" }
> | null {
  let match = input.match(/^forwarded(?:\s+([^:]+))?:\s*(.+)$/i);

  if (match) {
    const [, label, message] = match;
    return {
      type: "forwarded-analysis",
      label: label?.trim() ?? null,
      message: message.trim(),
      originalText: input,
    };
  }

  match = input.match(/^forwarded\s+(.+)$/i);

  if (!match) {
    return null;
  }

  return {
    type: "forwarded-analysis",
    label: null,
    message: match[1].trim(),
    originalText: input,
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

  if (context.lastInbound?.text && !isGenericCheckInMessage(context.lastInbound.text)) {
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

function analyzeForwardedMessage(
  message: string,
  label: string | null,
  override?: {
    ask: string;
    timing: string;
    draft: string;
  }
): CommandDetail[] {
  const ask = override?.ask ?? extractAsk(message);
  const deadline = extractDeadline(message);
  const followUp =
    override?.timing ??
    (deadline
      ? `Follow up ${formatDeadline(deadline)} if you have not replied.`
      : "Follow up in 2 to 3 days if the loop stays open.");
  const draft = override?.draft ?? buildForwardedDraft(message, ask);

  const details: CommandDetail[] = [];

  if (label) {
    details.push({
      label: "Source",
      value: toTitleCase(label),
    });
  }

  details.push({
    label: "Ask",
    value: ask,
  });

  details.push({
    label: "Timing",
    value: followUp,
  });

  details.push({
    label: "Draft",
    value: draft,
  });

  return details;
}

function extractAsk(message: string): string {
  const normalized = stripForwardedLead(message.trim().replace(/\s+/g, " "));
  const sentenceParts = normalized
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  const candidate =
    sentenceParts.find((part) =>
      /\b(can you|could you|please|need you to|send|share|review|check|follow up|let me know)\b/i.test(
        part
      )
    ) ?? sentenceParts[0] ?? normalized;

  return truncate(normalizeAsk(candidate), 120);
}

function extractDeadline(message: string): string | null {
  const match = message.match(
    /\b(by\s+[A-Z]?[a-z]+(?:\s+\d{1,2})?|before\s+[A-Z]?[a-z]+(?:\s+\d{1,2})?|tomorrow|today|this week|next week|friday|monday|tuesday|wednesday|thursday|saturday|sunday)\b/i
  );

  return match ? match[0] : null;
}

function buildForwardedDraft(message: string, ask: string): string {
  const request = cleanForwardedRequest(ask === message ? message : ask);
  return `Hey, got it. I can take care of ${request}. I will circle back shortly with an update.`;
}

function toTitleCase(value: string): string {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDeadline(value: string): string {
  return /^(before|by)\b/i.test(value) ? value : `before ${value}`;
}

function cleanForwardedRequest(value: string): string {
  const cleaned = stripForwardedLead(value)
    .replace(/^hey,?\s*/i, "")
    .replace(/^you can\s+/i, "")
    .replace(/^can you\s+/i, "")
    .replace(/^could you\s+/i, "")
    .replace(/^please\s+/i, "")
    .replace(/[.?!]+$/g, "")
    .trim();

  const normalized = cleaned
    .replace(/^send\b/i, "sending")
    .replace(/^share\b/i, "sharing")
    .replace(/^review\b/i, "reviewing")
    .replace(/^check\b/i, "checking")
    .replace(/^follow up\b/i, "following up")
    .replace(/^let me know\b/i, "letting you know");

  return truncate(decapitalize(normalized || extractTopic(value)), 64);
}

function stripForwardedLead(value: string): string {
  return value
    .replace(/^hey,?\s*/i, "")
    .replace(/^hi,?\s*/i, "")
    .replace(/^just checking (whether|if)\s+/i, "")
    .replace(/^checking (whether|if)\s+/i, "")
    .trim();
}

function normalizeAsk(value: string): string {
  const cleaned = value
    .replace(/^send\b/i, "Send")
    .replace(/^share\b/i, "Share")
    .replace(/^review\b/i, "Review")
    .replace(/^check\b/i, "Check")
    .replace(/^follow up\b/i, "Follow up")
    .replace(/^let me know\b/i, "Let me know")
    .replace(/^you can\s+/i, "")
    .trim();

  return ensureSentence(cleaned);
}

function ensureSentence(value: string): string {
  const trimmed = value.replace(/[.?!]+$/g, "").trim();

  if (!trimmed) {
    return value;
  }

  return `${trimmed}.`;
}

function decapitalize(value: string): string {
  return value ? `${value.charAt(0).toLowerCase()}${value.slice(1)}` : value;
}

function isGenericCheckInMessage(value: string): boolean {
  return /\b(how are you|how you are doing|hope you are well|checking in|just checking)\b/i.test(
    value
  );
}
