"use client";

import { startTransition, useEffect, useState } from "react";

import { StatusPill } from "@/app/components/marketing-primitives";

const starterCommands = [
  "remind me to follow up with Danny on Friday if no reply",
  "did I reply to Kartik",
  "who have I been ignoring this week",
  "what did I promise Bridget",
  "draft a warm check in for Uncle Raj",
  "forwarded recruiter message: Hey, just checking whether you can send over the deck before Friday.",
] as const;

const quickLoopActions = [
  {
    label: "Tomorrow 9am",
    action: "snooze",
    when: "tomorrow 9am",
  },
  {
    label: "+2 days",
    action: "snooze",
    when: "in 2 days",
  },
] as const;

type RuntimePayload = {
  mode: "photon" | "mock";
  platform: string;
  canWatchMessages: boolean;
  canSendMessages: boolean;
  reason: string | null;
};

type StatusPayload = {
  runtime: RuntimePayload;
  loops: Array<{
    id: string;
    targetName: string;
    originalCommand: string;
    dueAt: string;
    status: string;
    draftText: string | null;
    draftSource: "openai" | "heuristic";
    promiseSnapshot: string | null;
  }>;
};

type CommandPayload = {
  reply: string;
  ok: boolean;
  parsed: {
    type: string;
  };
  runtime: RuntimePayload;
  details?: Array<{
    label: string;
    value: string;
  }>;
  loop?: {
    id: string;
    targetName: string;
    dueAt: string;
    status: string;
    draftText: string | null;
    draftSource: "openai" | "heuristic";
  };
  intelligence?: {
    provider: "openai" | "heuristic";
    model: string | null;
  };
};

type LoopActionResponse = {
  ok: boolean;
  reply: string;
  loop: StatusPayload["loops"][number] | null;
};

type HistoryEntry = {
  id: string;
  command: string;
  ok: boolean;
  parsedType: string;
  createdAt: string;
};

export function KeepaliveConsole() {
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [command, setCommand] = useState<string>(starterCommands[0]);
  const [response, setResponse] = useState<CommandPayload | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("Console ready.");
  const [loopActionId, setLoopActionId] = useState<string | null>(null);
  const [loopEdits, setLoopEdits] = useState<Record<string, string>>({});

  useEffect(() => {
    void loadStatus();
  }, []);

  async function loadStatus() {
    const res = await fetch("/api/keepalive/status", { cache: "no-store" });
    const payload = (await res.json()) as StatusPayload;
    setStatus(payload);
    setLoopEdits((current) => {
      const next = { ...current };

      for (const loop of payload.loops) {
        next[loop.id] ||= "";
      }

      return next;
    });
  }

  async function runCommand() {
    setPending(true);
    setNotice("Running command...");

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
      setHistory((current) => [
        {
          id: crypto.randomUUID(),
          command,
          ok: payload.ok,
          parsedType: payload.parsed.type,
          createdAt: new Date().toISOString(),
        },
        ...current,
      ].slice(0, 6));
      setNotice(payload.ok ? "Command completed." : "Command returned a warning.");
      await loadStatus();
    } finally {
      startTransition(() => {
        setPending(false);
      });
    }
  }

  async function updateLoop(
    loopId: string,
    body: {
      action: "snooze" | "edit" | "cancel";
      when?: string;
    }
  ) {
    setLoopActionId(loopId);
    setNotice("Updating loop...");

    try {
      const res = await fetch(`/api/keepalive/loops/${loopId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const payload = (await res.json()) as LoopActionResponse;
      setNotice(payload.reply);
      await loadStatus();
    } finally {
      startTransition(() => {
        setLoopActionId(null);
      });
    }
  }

  return (
    <section aria-labelledby="operator-console-title" className="grid min-w-0 gap-4">
      <div className="min-w-0 border border-[#d8d7d1] bg-white p-4 text-[#0f2b4a] xl:p-5">
        <div className="flex flex-col gap-4 border-b border-[#eceae4] pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#808796]">
              Operator console
            </p>
            <h3 id="operator-console-title" className="mt-2 text-xl font-semibold xl:text-2xl">
              Run the real command pipeline.
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-[#5b6f86]">
              This hits the actual Keepalive routes. On macOS with Photon it can
              use Messages data. Here it falls back to seeded threads so the
              logic stays testable.
            </p>
          </div>

          {status ? (
            <div className="border border-[#eceae4] bg-[#f8f7f4] px-4 py-3 text-sm text-[#586f86]">
              <p>runtime: {status.runtime.mode}</p>
              <p>platform: {status.runtime.platform}</p>
            </div>
          ) : null}
        </div>

        <div
          role="status"
          aria-live="polite"
          className="mt-4 border border-[#eceae4] bg-[#f8f7f4] px-4 py-3 text-sm text-[#586f86]"
        >
          {notice}
        </div>

        <div className="panel-scroll mt-4 overflow-x-auto pb-2">
          <div className="flex min-w-max gap-2">
            {starterCommands.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCommand(item)}
                className="focus-ring border border-[#e4e1db] bg-[#f8f7f4] px-4 py-2 text-sm text-[#33485d] transition-colors hover:bg-[#efede8]"
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid min-w-0 gap-4">
          <form
            className="min-w-0 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void runCommand();
            }}
          >
            <label
              htmlFor="keepalive-command"
              className="block text-sm font-medium text-[#3a536c]"
            >
              Command
            </label>
            <textarea
              id="keepalive-command"
              value={command}
              onChange={(event) => setCommand(event.target.value)}
              className="focus-ring min-h-36 w-full border border-[#dcd8d2] bg-[#f8f7f4] px-4 py-4 font-mono text-sm leading-7 text-[#153252]"
            />
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={pending}
                className="focus-ring border border-[#232323] bg-[#232323] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#111111] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pending ? "Running..." : "Run command"}
              </button>
              {response?.intelligence ? (
                <StatusPill className="border-[#eceae4] bg-[#f3f2ef] text-[#34495f]">
                  {response.intelligence.provider === "openai"
                    ? `OpenAI ${response.intelligence.model ?? ""}`.trim()
                    : "Local mode"}
                </StatusPill>
              ) : null}
            </div>

            {response ? (
              <div className="min-w-0 border border-[#eceae4] bg-[#f8f7f4] p-4">
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#808796]">
                  Agent reply
                </p>
                <pre className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#32495f]">
                  {response.reply}
                </pre>
              </div>
            ) : null}
          </form>

          <div className="grid min-w-0 gap-4 xl:grid-cols-2">
            <div className="min-w-0 border border-[#eceae4] bg-[#f8f7f4] p-4">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#808796]">
                Parsed result
              </p>
              {response ? (
                <div className="panel-scroll mt-3 max-h-[340px] space-y-3 overflow-auto pr-1">
                  <div className="border border-[#e6e2dc] bg-white p-4">
                    <p className="text-sm font-semibold text-[#0f2b4a]">
                      {humanizeType(response.parsed.type)}
                    </p>
                    <p className="mt-2 text-xs uppercase tracking-[0.16em] text-[#87909d]">
                      runtime {response.runtime.mode}
                    </p>
                  </div>

                  {response.details?.map((detail) => (
                    <div
                      key={`${detail.label}-${detail.value}`}
                      className="border border-[#e6e2dc] bg-white p-4"
                    >
                      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#7a8796]">
                        {detail.label}
                      </p>
                      <p className="mt-2 text-sm leading-7 text-[#4b6279]">
                        {detail.value}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm leading-7 text-[#61768d]">
                  Run a command to inspect how Keepalive parsed it.
                </p>
              )}
            </div>

            <div className="min-w-0 border border-[#eceae4] bg-[#f8f7f4] p-4">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#808796]">
                Recent commands
              </p>
              <div className="panel-scroll mt-3 max-h-[240px] space-y-2 overflow-auto pr-1">
                {history.length ? (
                  history.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setCommand(item.command)}
                      className="focus-ring flex w-full items-start justify-between gap-3 border border-[#e6e2dc] bg-white p-3 text-left hover:bg-[#f5f3ef]"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[#17314c]">
                          {item.command}
                        </p>
                        <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[#88919d]">
                          {humanizeType(item.parsedType)}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-[#95a0ac]">
                        {new Date(item.createdAt).toLocaleTimeString()}
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="text-sm leading-7 text-[#61768d]">
                    No history yet.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="min-w-0 space-y-4">
        <div className="min-w-0 border border-[#d8d7d1] bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#808796]">
              Active loops
            </p>
            <StatusPill className="border-[#eceae4] bg-[#f3f2ef] text-[#34495f]">
              {status?.loops.length ?? 0} active
            </StatusPill>
          </div>

          <div className="panel-scroll mt-4 max-h-[520px] space-y-3 overflow-auto pr-1">
            {status?.loops.length ? (
              status.loops.map((loop) => {
                const busy = loopActionId === loop.id;

                return (
                  <div
                    key={loop.id}
                    className="border border-[#e6e2dc] bg-[#f8f7f4] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[#153252]">
                          {loop.targetName}
                        </p>
                        <p className="mt-1 text-xs text-[#7a8a9a]">
                          {humanizeLoopStatus(loop.status)} · due{" "}
                          {formatDateTime(loop.dueAt)}
                        </p>
                      </div>
                      <StatusPill className="border-[#eceae4] bg-white text-[#4a6178]">
                        {loop.draftSource === "openai" ? "AI draft" : "Heuristic"}
                      </StatusPill>
                    </div>

                    <p className="mt-3 text-sm leading-6 text-[#546a81]">
                      {loop.originalCommand}
                    </p>

                    {loop.promiseSnapshot ? (
                      <p className="mt-3 border border-[#e6e2dc] bg-white px-3 py-3 text-sm leading-6 text-[#4a6178]">
                        Promise: {loop.promiseSnapshot}
                      </p>
                    ) : null}

                    {loop.draftText ? (
                      <p className="mt-3 border border-[#e6e2dc] bg-white px-3 py-3 text-sm leading-6 text-[#4a6178]">
                        Draft: {loop.draftText}
                      </p>
                    ) : null}

                    <div className="mt-3 flex flex-wrap gap-2">
                      {quickLoopActions.map((action) => (
                        <button
                          key={`${loop.id}-${action.when}`}
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            void updateLoop(loop.id, {
                              action: action.action,
                              when: action.when,
                            })
                          }
                          className="focus-ring border border-[#ddd9d3] bg-white px-3 py-2 text-xs font-semibold text-[#3f556b] hover:bg-[#efede8] disabled:opacity-60"
                        >
                          {busy ? "Working..." : action.label}
                        </button>
                      ))}
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void updateLoop(loop.id, {
                            action: "cancel",
                          })
                        }
                        className="focus-ring border border-[#ead1d1] bg-[#fff5f5] px-3 py-2 text-xs font-semibold text-[#9b4f4f] hover:bg-[#ffeaea] disabled:opacity-60"
                      >
                        {busy ? "Working..." : "Cancel"}
                      </button>
                    </div>

                    <div className="mt-3 flex gap-2">
                      <input
                        value={loopEdits[loop.id] ?? ""}
                        onChange={(event) =>
                          setLoopEdits((current) => ({
                            ...current,
                            [loop.id]: event.target.value,
                          }))
                        }
                        placeholder="Friday 10am"
                        className="focus-ring min-w-0 flex-1 border border-[#ddd9d3] bg-white px-3 py-2 text-sm text-[#153252]"
                      />
                      <button
                        type="button"
                        disabled={busy || !(loopEdits[loop.id] ?? "").trim()}
                        onClick={() =>
                          void updateLoop(loop.id, {
                            action: "edit",
                            when: loopEdits[loop.id],
                          })
                        }
                        className="focus-ring border border-[#232323] bg-[#232323] px-4 py-2 text-sm font-semibold text-white hover:bg-[#111111] disabled:opacity-60"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm leading-7 text-[#61768d]">
                No active loops yet.
              </p>
            )}
          </div>

          {status?.runtime.reason ? (
            <p className="mt-4 text-sm leading-7 text-[#61768d]">
              {status.runtime.reason}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString();
}

function humanizeType(type: string): string {
  return type
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function humanizeLoopStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}
