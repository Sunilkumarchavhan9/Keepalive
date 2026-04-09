import type { ComponentPropsWithoutRef, ReactNode } from "react";

type ClassValue = string | false | null | undefined;

function cx(...values: ClassValue[]) {
  return values.filter(Boolean).join(" ");
}

export function SectionEyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="font-mono text-xs uppercase tracking-[0.32em] text-[#2b74d9]">
      {children}
    </p>
  );
}

export function GlassPanel({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cx(
        "rounded-[10px] border border-[#12395f]/14 bg-[rgba(9,32,59,0.72)] backdrop-blur-md",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function StatusPill({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cx(
        "rounded-[6px] border border-[#12395f]/14 bg-[rgba(255,255,255,0.72)] px-3 py-1.5 text-sm text-[#153252]",
        className
      )}
    >
      {children}
    </span>
  );
}

export function ActionLink({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<"a">) {
  return (
    <a
      className={cx(
        "focus-ring inline-flex items-center justify-center rounded-[8px] px-5 py-3 text-sm font-semibold transition-[transform,background-color,border-color,color,box-shadow] duration-200 hover:-translate-y-0.5 touch-manipulation",
        className
      )}
      {...props}
    >
      {children}
    </a>
  );
}

export function FeatureCard({
  title,
  body,
  kicker,
  footer,
}: {
  title: string;
  body: string;
  kicker: string;
  footer?: ReactNode;
}) {
  return (
    <GlassPanel className="surface-shadow border-[#d8d7d1] bg-white p-6 text-[#0f2b4a]">
      <p className="text-xs uppercase tracking-[0.28em] text-[#8bbcff]">
        {kicker}
      </p>
      <h3 className="mt-4 text-2xl font-semibold text-[#0f2b4a]">{title}</h3>
      <p className="mt-3 max-w-sm text-base leading-7 text-[#5b6f86]">{body}</p>
      {footer ? <div className="mt-5">{footer}</div> : null}
    </GlassPanel>
  );
}

export function ChatBubble({
  speaker,
  text,
  tone = "neutral",
}: {
  speaker: string;
  text: string;
  tone?: "neutral" | "agent";
}) {
  const palette =
    tone === "agent"
      ? "bg-[#d8eeff] text-[#0f2b4a] ring-[#d8eeff]/70"
      : "bg-white/94 text-[#0f1728] ring-white/70";

  return (
    <div className="flex flex-col gap-2 min-w-0">
      <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#7f8896]">
        {speaker}
      </span>
      <div
        className={cx(
          "max-w-[28rem] rounded-[14px] px-5 py-4 text-[15px] leading-7 shadow-[0_20px_45px_rgba(0,0,0,0.18)] ring-1 break-words",
          palette
        )}
      >
        {text}
      </div>
    </div>
  );
}
