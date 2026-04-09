import process from "node:process";

import type { Message } from "@photon-ai/imessage-kit";

import { createKeepaliveSession, createPhotonWatchSource, isControlMessage } from "@/lib/keepalive/runtime";
import { KeepaliveService } from "@/lib/keepalive/service";
import { KeepaliveStore } from "@/lib/keepalive/store";

const DOCTOR_FLAG = "--doctor";

async function main() {
  if (process.argv.includes(DOCTOR_FLAG)) {
    await doctor();
    return;
  }

  await watch();
}

async function doctor() {
  const session = await createKeepaliveSession();
  const store = new KeepaliveStore();

  try {
    const loops = await store.listOpenLoops();
    console.log("Keepalive doctor");
    console.log(`mode: ${session.source.runtime.mode}`);
    console.log(`platform: ${session.source.runtime.platform}`);
    console.log(`canWatchMessages: ${session.source.runtime.canWatchMessages}`);
    console.log(`canSendMessages: ${session.source.runtime.canSendMessages}`);
    if (session.source.runtime.reason) {
      console.log(`reason: ${session.source.runtime.reason}`);
    }
    console.log(`openLoops: ${loops.length}`);
    console.log(
      `controlChat: ${process.env.KEEPALIVE_CONTROL_CHAT ?? "(not configured)"}`
    );
    console.log(
      `notifyTo: ${process.env.KEEPALIVE_NOTIFY_TO ?? process.env.KEEPALIVE_CONTROL_CHAT ?? "(not configured)"}`
    );
  } finally {
    await session.close();
  }
}

async function watch() {
  const controlChat = process.env.KEEPALIVE_CONTROL_CHAT;

  if (!controlChat) {
    throw new Error(
      "KEEPALIVE_CONTROL_CHAT is required for watch mode. Set it to the chatId, phone number, or display name used to control the agent."
    );
  }

  const notifyTo = process.env.KEEPALIVE_NOTIFY_TO ?? controlChat;
  const acceptOwnCommands = process.env.KEEPALIVE_ACCEPT_OWN_COMMANDS === "true";
  const { sdk, source } = await createPhotonWatchSource();
  const service = new KeepaliveService(source);

  console.log("Keepalive watcher started.");
  console.log(`controlChat: ${controlChat}`);
  console.log(`notifyTo: ${notifyTo}`);

  const sweep = async () => {
    const result = await service.processDueLoops();
    if (result.sent.length) {
      console.log(`sent ${result.sent.length} reminder(s)`);
    }
  };

  await sweep();
  const interval = setInterval(() => {
    void sweep().catch((error) => {
      console.error("reminder sweep failed", error);
    });
  }, 60_000);

  const maybeHandleControlMessage = async (message: Message) => {
    const shouldParse =
      !message.isFromMe ||
      (acceptOwnCommands && !message.text?.startsWith("[Keepalive]"));

    if (!shouldParse || !message.text) {
      return;
    }

    if (!isControlMessage(message, controlChat)) {
      return;
    }

    const result = await service.handleCommand(message.text, {
      notifyTo,
    });

    await source.sendText(notifyTo, `[Keepalive] ${result.reply}`);
  };

  const maybeCloseLoop = async (message: Message) => {
    if (message.isFromMe) {
      return;
    }

    const closed = await service.closeLoopsForIncomingMessage(message);
    if (!closed.length) {
      return;
    }

    const names = closed.map((loop) => loop.targetName).join(", ");
    console.log(`closed ${closed.length} loop(s) for ${names}`);
    await source.sendText(
      notifyTo,
      `[Keepalive] ${names} replied. Closing the pending follow-up reminder.`
    );
  };

  await sdk.startWatching({
    onDirectMessage: async (message) => {
      await maybeHandleControlMessage(message);
      await maybeCloseLoop(message);
    },
    onGroupMessage: async (message) => {
      await maybeHandleControlMessage(message);
      await maybeCloseLoop(message);
    },
    onError: (error) => {
      console.error("watcher error", error);
    },
  });

  const shutdown = async () => {
    clearInterval(interval);
    sdk.stopWatching();
    await sdk.close();
    process.exit(0);
  };

  process.on("SIGINT", () => {
    void shutdown();
  });

  process.on("SIGTERM", () => {
    void shutdown();
  });
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
