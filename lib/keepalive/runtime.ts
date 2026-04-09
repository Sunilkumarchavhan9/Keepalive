import type {
  ChatSummary,
  IMessageSDK,
  ListChatsOptions,
  Message,
  MessageFilter,
  MessageQueryResult,
} from "@photon-ai/imessage-kit";

import { getMockMessages, listMockChats } from "@/lib/keepalive/mock-data";
import type { RuntimeInfo } from "@/lib/keepalive/types";

export interface KeepaliveDataSource {
  runtime: RuntimeInfo;
  listChats(options?: ListChatsOptions): Promise<ChatSummary[]>;
  getMessages(filter?: MessageFilter): Promise<MessageQueryResult>;
  sendText(to: string, text: string): Promise<void>;
}

export interface KeepaliveSession {
  source: KeepaliveDataSource;
  close(): Promise<void>;
}

export async function createKeepaliveSession(): Promise<KeepaliveSession> {
  if (process.env.KEEPALIVE_USE_MOCK_DATA === "true") {
    return {
      source: new MockKeepaliveDataSource("Forced mock mode via env."),
      close: async () => undefined,
    };
  }

  const photon = await import("@photon-ai/imessage-kit");

  if (!photon.isMacOS()) {
    return {
      source: new MockKeepaliveDataSource(
        "Photon can only access Messages on macOS. Mock data is active on this machine."
      ),
      close: async () => undefined,
    };
  }

  const sdk = new photon.IMessageSDK({
    debug: process.env.KEEPALIVE_DEBUG === "true",
    watcher: {
      unreadOnly: false,
      excludeOwnMessages: false,
    },
  });

  return {
    source: new PhotonKeepaliveDataSource(sdk),
    close: async () => {
      await sdk.close();
    },
  };
}

export async function createPhotonWatchSource(): Promise<{
  sdk: IMessageSDK;
  source: KeepaliveDataSource;
}> {
  const photon = await import("@photon-ai/imessage-kit");

  if (!photon.isMacOS()) {
    throw new Error("Photon watch mode requires macOS.");
  }

  const sdk = new photon.IMessageSDK({
    debug: process.env.KEEPALIVE_DEBUG === "true",
    watcher: {
      unreadOnly: false,
      excludeOwnMessages: false,
    },
  });

  return {
    sdk,
    source: new PhotonKeepaliveDataSource(sdk),
  };
}

export function isControlMessage(message: Message, controlChat: string): boolean {
  return (
    message.chatId === controlChat ||
    message.sender === controlChat ||
    (message.senderName ?? "").toLowerCase() === controlChat.toLowerCase()
  );
}

class PhotonKeepaliveDataSource implements KeepaliveDataSource {
  runtime: RuntimeInfo = {
    mode: "photon",
    platform: process.platform,
    canWatchMessages: true,
    canSendMessages: true,
    reason: null,
  };

  constructor(private readonly sdk: IMessageSDK) {}

  async listChats(options?: ListChatsOptions): Promise<ChatSummary[]> {
    return this.sdk.listChats(options);
  }

  async getMessages(filter?: MessageFilter): Promise<MessageQueryResult> {
    return this.sdk.getMessages(filter);
  }

  async sendText(to: string, text: string): Promise<void> {
    await this.sdk.send(to, text);
  }
}

class MockKeepaliveDataSource implements KeepaliveDataSource {
  runtime: RuntimeInfo;

  constructor(reason: string) {
    this.runtime = {
      mode: "mock",
      platform: process.platform,
      canWatchMessages: false,
      canSendMessages: false,
      reason,
    };
  }

  async listChats(options?: ListChatsOptions): Promise<ChatSummary[]> {
    const chats = listMockChats(options?.search);
    return chats.slice(0, options?.limit ?? chats.length);
  }

  async getMessages(filter?: MessageFilter): Promise<MessageQueryResult> {
    return getMockMessages(filter);
  }

  async sendText(): Promise<void> {
    return;
  }
}
