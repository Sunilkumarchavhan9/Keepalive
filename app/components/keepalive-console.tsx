"use client";

import { startTransition, useEffect, useState } from "react";

const starterCommands = [
  "remind me to follow up with Danny on Friday if no reply",
  "did I reply to Kartik",
  "who have I been ignoring this week",
  "what did I promise Bridget",
  "draft a warm check in for Uncle Raj",
] as const;

type StatusPayload = {
  runtime: {
    mode: "photon" | "mock";
    platform: string;
    canWatchMessages: boolean;
    canSendMessages: boolean;
    reason: string | null;
  };
  loops: Array<{
    id: string;
    targetName: string;
    dueAt: string;
    status: string;
  }>;
};

type CommandPayload = {
  reply: string;
  ok: boolean;
};

export function KeepaliveConsole() {
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [command, setCommand] = useState<string>(starterCommands[0]);
  const [response, setResponse] = useState<CommandPayload | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    void loadStatus();
  }, []);

  async function loadStatus() {
    const res = await fetch("/api/keepalive/status", { cache: "no-store" });
    const payload = (await res.json()) as StatusPayload;
    setStatus(payload);
  }

  async function runCommand() {
    setPending(true);

    try {
      const res = await fetch("/api/keepalive/command", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ input: command }),
      });

      const payload = (await res.json()) as CommandPayload;
      setResponse(payload);
      await loadStatus();
    } finally {
      startTransition(() => {
        setPending(false);
      });
    }
  }

  return (
    <div className="rounded-[2.2rem] border border-white/10 bg-[#06101d]/90 p-6 shadow-[0_25px_80px_rgba(0,0,0,0.22)] backdrop-blur-xl sm:p-7">
      <div className="flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.32em] text-[#8ff6b2]">
            Operator console
          </p>
          <h3 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">
            Hit the real command pipeline.
          </h3>
          <p className="mt-3 max-w-2xl text-base leading-7 text-white/68">
            This talks to the actual Keepalive API routes. On macOS with Photon
            configured it uses real Messages data. On this machine it falls back
            to seeded mock threads so the parser and loop logic still run.
          </p>
        </div>

        {status ? (
          <div className="rounded-[1.4rem] border border-white/10 bg-white/6 px-4 py-3 text-sm text-white/72">
            <p>runtime: {status.runtime.mode}</p>
            <p>platform: {status.runtime.platform}</p>
          </div>
        ) : null}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {starterCommands.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setCommand(item)}
            className="rounded-full border border-white/12 bg-white/6 px-4 py-2 text-left text-sm text-white/74 transition-colors hover:bg-white/10"
          >
            {item}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]">
        <div className="space-y-4">
          <textarea
            value={command}
            onChange={(event) => setCommand(event.target.value)}
            className="min-h-36 w-full rounded-[1.6rem] border border-white/10 bg-[#020612] px-5 py-4 font-mono text-sm leading-7 text-[#dbe9ff] outline-none"
          />
          <button
            type="button"
            onClick={() => {
              void runCommand();
            }}
            disabled={pending}
            className="rounded-full bg-[#daf3c0] px-5 py-3 text-sm font-semibold text-[#112014] transition-transform duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Running..." : "Run command"}
          </button>
          {response ? (
            <div className="rounded-[1.6rem] border border-white/10 bg-white/6 p-5">
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-white/42">
                Agent reply
              </p>
              <pre className="mt-3 whitespace-pre-wrap text-sm leading-7 text-white/82">
                {response.reply}
              </pre>
            </div>
          ) : null}
        </div>

        <div className="rounded-[1.8rem] border border-white/10 bg-[#020612] p-5">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-white/42">
            Current loops
          </p>
          <div className="mt-4 space-y-3">
            {status?.loops.length ? (
              status.loops.map((loop) => (
                <div
                  key={loop.id}
                  className="rounded-[1.2rem] border border-white/10 bg-white/6 p-4"
                >
                  <p className="text-base font-semibold text-white">
                    {loop.targetName}
                  </p>
                  <p className="mt-1 text-sm text-white/62">{loop.status}</p>
                  <p className="mt-2 font-mono text-xs uppercase tracking-[0.18em] text-[#8ff6b2]">
                    due {new Date(loop.dueAt).toLocaleString()}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm leading-7 text-white/62">
                No open loops yet. Run a follow-up command and it will land
                here.
              </p>
            )}
          </div>

          {status?.runtime.reason ? (
            <p className="mt-5 text-sm leading-7 text-white/54">
              {status.runtime.reason}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
