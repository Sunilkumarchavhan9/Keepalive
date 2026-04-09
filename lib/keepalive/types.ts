export type LoopStatus = "open" | "sent" | "closed" | "cancelled";

export interface FollowUpLoop {
  id: string;
  status: LoopStatus;
  originalCommand: string;
  createdAt: string;
  dueAt: string;
  targetQuery: string;
  targetName: string;
  targetChatId: string | null;
  notifyTo: string | null;
  lastInboundAt: string | null;
  lastOutboundAt: string | null;
  reminderText: string;
  draftText: string | null;
  closedAt: string | null;
  closedReason: string | null;
}

export interface KeepaliveState {
  loops: FollowUpLoop[];
}

export type ParsedCommand =
  | {
      type: "schedule-follow-up";
      contact: string;
      when: string;
      originalText: string;
    }
  | {
      type: "reply-status";
      contact: string;
      originalText: string;
    }
  | {
      type: "neglect-report";
      timeframe: "week" | "default";
      originalText: string;
    }
  | {
      type: "promise-summary";
      contact: string;
      originalText: string;
    }
  | {
      type: "draft-check-in";
      contact: string;
      warmth: "warm" | "gentle" | "short" | "default";
      originalText: string;
    }
  | {
      type: "unknown";
      originalText: string;
    };

export interface RuntimeInfo {
  mode: "photon" | "mock";
  platform: NodeJS.Platform;
  canWatchMessages: boolean;
  canSendMessages: boolean;
  reason: string | null;
}

export interface CommandResult {
  ok: boolean;
  reply: string;
  parsed: ParsedCommand;
  runtime: RuntimeInfo;
  loop?: FollowUpLoop;
}

export interface ReminderSweepResult {
  sent: FollowUpLoop[];
}
