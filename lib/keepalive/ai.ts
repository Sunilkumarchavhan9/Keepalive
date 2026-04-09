import OpenAI from "openai";
import type { Message } from "@photon-ai/imessage-kit";

const DEFAULT_MODEL = process.env.KEEPALIVE_OPENAI_MODEL ?? "gpt-5-mini";

type KeepaliveModelOutput = {
  provider: "openai";
  model: string;
};

type JsonValue = null | boolean | number | string | JsonValue[] | JsonObject;

type JsonObject = {
  [key: string]: JsonValue;
};

export interface PromiseExtraction extends KeepaliveModelOutput {
  promise: string | null;
}

export interface DraftSuggestion extends KeepaliveModelOutput {
  draft: string;
}

export interface ForwardedAnalysisSuggestion extends KeepaliveModelOutput {
  ask: string;
  timing: string;
  draft: string;
}

let client: OpenAI | null | undefined;

export function getKeepaliveAIModel(): string | null {
  return process.env.OPENAI_API_KEY ? DEFAULT_MODEL : null;
}

function getClient(): OpenAI | null {
  if (client !== undefined) {
    return client;
  }

  if (!process.env.OPENAI_API_KEY) {
    client = null;
    return client;
  }

  client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.KEEPALIVE_OPENAI_BASE_URL,
  });

  return client;
}

async function requestStructuredObject<T extends JsonObject>({
  name,
  instructions,
  input,
  schema,
}: {
  name: string;
  instructions: string;
  input: string;
  schema: JsonObject;
}): Promise<T | null> {
  const openai = getClient();

  if (!openai) {
    return null;
  }

  try {
    const response = await openai.responses.create({
      model: DEFAULT_MODEL,
      instructions,
      input,
      store: false,
      text: {
        format: {
          type: "json_schema",
          name,
          strict: true,
          schema,
        },
      },
    });

    const output = response.output_text.trim();

    if (!output) {
      return null;
    }

    return JSON.parse(output) as T;
  } catch {
    return null;
  }
}

export async function extractPromiseFromMessages(
  contactName: string,
  messages: readonly Message[]
): Promise<PromiseExtraction | null> {
  const transcript = formatTranscript(messages);

  if (!transcript) {
    return null;
  }

  const parsed = await requestStructuredObject<{
    promise: string | null;
  }>({
    name: "keepalive_thread_promise",
    instructions:
      "You read iMessage transcripts for a follow-up agent. Return the clearest open promise or concrete commitment made by the user. If there is no concrete promise from the user, return null. Keep the promise concise and faithful to the transcript.",
    input: `Contact: ${contactName}\nTranscript:\n${transcript}`,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        promise: {
          anyOf: [
            {
              type: "string",
              minLength: 1,
              maxLength: 180,
            },
            {
              type: "null",
            },
          ],
        },
      },
      required: ["promise"],
    },
  });

  if (!parsed) {
    return null;
  }

  return {
    provider: "openai",
    model: DEFAULT_MODEL,
    promise: parsed.promise,
  };
}

export async function draftFollowUpWithAI({
  contactName,
  promise,
  messages,
}: {
  contactName: string;
  promise: string | null;
  messages: readonly Message[];
}): Promise<DraftSuggestion | null> {
  const transcript = formatTranscript(messages);

  if (!transcript) {
    return null;
  }

  const parsed = await requestStructuredObject<{
    draft: string;
  }>({
    name: "keepalive_follow_up_draft",
    instructions:
      "You write concise iMessage drafts for a follow-up agent. Draft a warm, low-pressure follow-up in 1 or 2 short sentences. Do not use markdown, bullets, or sign-offs. Keep it ready to send as plain text.",
    input: `Contact: ${contactName}\nOpen promise: ${promise ?? "none"}\nTranscript:\n${transcript}`,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        draft: {
          type: "string",
          minLength: 8,
          maxLength: 240,
        },
      },
      required: ["draft"],
    },
  });

  if (!parsed) {
    return null;
  }

  return {
    provider: "openai",
    model: DEFAULT_MODEL,
    draft: parsed.draft.trim(),
  };
}

export async function draftCheckInWithAI({
  contactName,
  warmth,
  messages,
}: {
  contactName: string;
  warmth: "warm" | "gentle" | "short" | "default";
  messages: readonly Message[];
}): Promise<DraftSuggestion | null> {
  const transcript = formatTranscript(messages);

  if (!transcript) {
    return null;
  }

  const parsed = await requestStructuredObject<{
    draft: string;
  }>({
    name: "keepalive_check_in_draft",
    instructions:
      "You write short personal check-ins for iMessage. Match the requested warmth. Keep it natural, low-pressure, and ready to send as plain text. Use 1 or 2 short sentences.",
    input: `Contact: ${contactName}\nWarmth: ${warmth}\nTranscript:\n${transcript}`,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        draft: {
          type: "string",
          minLength: 8,
          maxLength: 240,
        },
      },
      required: ["draft"],
    },
  });

  if (!parsed) {
    return null;
  }

  return {
    provider: "openai",
    model: DEFAULT_MODEL,
    draft: parsed.draft.trim(),
  };
}

export async function analyzeForwardedMessageWithAI({
  label,
  message,
}: {
  label: string | null;
  message: string;
}): Promise<ForwardedAnalysisSuggestion | null> {
  const parsed = await requestStructuredObject<{
    ask: string;
    timing: string;
    draft: string;
  }>({
    name: "keepalive_forwarded_analysis",
    instructions:
      "You turn a forwarded message into an actionable iMessage response plan. Extract the core ask, recommend a concrete follow-up timing, and write a short ready-to-send reply. Keep everything concise and plain text.",
    input: `Source label: ${label ?? "none"}\nForwarded message:\n${message}`,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        ask: {
          type: "string",
          minLength: 4,
          maxLength: 180,
        },
        timing: {
          type: "string",
          minLength: 4,
          maxLength: 180,
        },
        draft: {
          type: "string",
          minLength: 8,
          maxLength: 240,
        },
      },
      required: ["ask", "timing", "draft"],
    },
  });

  if (!parsed) {
    return null;
  }

  return {
    provider: "openai",
    model: DEFAULT_MODEL,
    ask: parsed.ask.trim(),
    timing: parsed.timing.trim(),
    draft: parsed.draft.trim(),
  };
}

function formatTranscript(messages: readonly Message[]): string {
  return [...messages]
    .reverse()
    .slice(-12)
    .map((message) => {
      const speaker = message.isFromMe
        ? "You"
        : message.senderName ?? message.sender ?? "Contact";
      const text = (message.text ?? "").trim();

      if (!text) {
        return null;
      }

      return `${speaker}: ${text}`;
    })
    .filter(Boolean)
    .join("\n");
}
