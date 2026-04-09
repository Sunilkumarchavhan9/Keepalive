import { NextResponse } from "next/server";

import { createKeepaliveSession } from "@/lib/keepalive/runtime";
import { KeepaliveStore } from "@/lib/keepalive/store";

export const runtime = "nodejs";

export async function GET() {
  const session = await createKeepaliveSession();
  const store = new KeepaliveStore();

  try {
    const loops = await store.listActiveLoops();

    return NextResponse.json({
      runtime: session.source.runtime,
      loops: loops.map((loop) => ({
        id: loop.id,
        targetName: loop.targetName,
        originalCommand: loop.originalCommand,
        dueAt: loop.dueAt,
        status: loop.status,
        draftText: loop.draftText,
        draftSource: loop.draftSource ?? "heuristic",
        promiseSnapshot: loop.promiseSnapshot,
      })),
    });
  } finally {
    await session.close();
  }
}
