import { NextResponse } from "next/server";

import { createKeepaliveSession } from "@/lib/keepalive/runtime";
import { KeepaliveService } from "@/lib/keepalive/service";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: {
    params: Promise<{
      loopId: string;
    }>;
  }
) {
  const body = (await request.json()) as {
    action?: "snooze" | "edit" | "cancel";
    when?: string | null;
  };
  const { loopId } = await context.params;

  if (!body.action) {
    return NextResponse.json(
      { error: "Loop action is required." },
      { status: 400 }
    );
  }

  const session = await createKeepaliveSession();

  try {
    const service = new KeepaliveService(session.source);
    const result = await service.updateLoop(loopId, {
      action: body.action,
      when: body.when ?? null,
    });

    return NextResponse.json(result, {
      status: result.status,
    });
  } finally {
    await session.close();
  }
}
