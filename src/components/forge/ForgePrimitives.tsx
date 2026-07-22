import type { ReactNode } from "react";

type ForgeTone = "learner" | "ai" | "evidence" | "human" | "quiet";

function classes(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function ForgeKicker({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={classes("forge-kicker", className)}>{children}</p>;
}

export function ForgeStatus({
  children,
  tone = "evidence",
}: {
  children: ReactNode;
  tone?: ForgeTone;
}) {
  return (
    <span className="forge-status" data-tone={tone}>
      <i aria-hidden="true" />
      <span>{children}</span>
    </span>
  );
}

export function ForgeTrustLine({ className }: { className?: string }) {
  return (
    <p className={className} aria-label="Learner acts • AI assists • Evidence decides">
      Learner acts <i aria-hidden="true" /> AI assists <i aria-hidden="true" /> Evidence decides
    </p>
  );
}

export function ForgeSectionHeading({
  description,
  id,
  label,
  title,
}: {
  description: ReactNode;
  id: string;
  label: ReactNode;
  title: ReactNode;
}) {
  return (
    <header className="forge-section-heading">
      <div>
        <span>{label}</span>
        <h2 id={id}>{title}</h2>
      </div>
      <p>{description}</p>
    </header>
  );
}
