import { NextResponse } from "next/server";

import { createKeepaliveSession } from "@/lib/keepalive/runtime";
import { KeepaliveService } from "@/lib/keepalive/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    input?: string;
    notifyTo?: string | null;
  };

  if (!body.input?.trim()) {
    return NextResponse.json(
      { error: "Command text is required." },
      { status: 400 }
    );
  }

  const session = await createKeepaliveSession();

  try {
    const service = new KeepaliveService(session.source);
    const result = await service.handleCommand(body.input, {
      notifyTo: body.notifyTo ?? null,
    });

    return NextResponse.json(result);
  } finally {
    await session.close();
  }
}
