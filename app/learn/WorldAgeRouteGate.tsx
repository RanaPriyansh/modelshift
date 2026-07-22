import Link from "next/link";
import type { ReactNode } from "react";

import type { WorldAgeRouteAccess } from "@/src/lib/forge-auth/world-age-policy.server";

import { LocalGrownUpConfirmationClient } from "./WorldAgeRouteGateClient";

export function WorldAgeRouteGate({ worldPath, worldTitle, access }: {
  worldPath: string;
  worldTitle: string;
  access: Exclude<WorldAgeRouteAccess, { status: "allowed" }>;
}) {
  if (access.status === "guardian_confirmation_required") {
    return (
      <main className="forge-world-entry-gate" data-testid="world-guardian-route-gate">
        <span>Child + grown-up World</span>
        <h1>A grown-up needs to join this learning session.</h1>
        <p>
          This route will not render {worldTitle} until the session reaches a local grown-up confirmation. That confirmation is
          not verified age, identity, consent, or guardian authority.
        </p>
        <Link href={`${worldPath}?audience=child_with_grown_up&guardianManaged=true`}>
          Continue to local grown-up confirmation
        </Link>
        <Link href="/">Return to FORGE home</Link>
      </main>
    );
  }

  return (
    <main className="forge-world-entry-gate" data-testid="world-age-route-gate">
      <span>Session boundary</span>
      <h1>Choose this session&apos;s route before opening {worldTitle}.</h1>
      <p>
        FORGE does not infer age from a browser profile or URL omission. Choose a teen or adult route, or begin a child session
        that requires a local grown-up confirmation. None of these choices verifies age, consent, or guardian authority.
      </p>
      <Link href={`${worldPath}?audience=teen`}>Teen route</Link>
      <Link href={`${worldPath}?audience=adult`}>Adult route</Link>
      <Link href={`${worldPath}?audience=child_with_grown_up`}>Child + grown-up route</Link>
    </main>
  );
}

export function LocalGrownUpConfirmation({ children, worldTitle }: { children: ReactNode; worldTitle: string }) {
  return <GrownUpConfirmationBoundary worldTitle={worldTitle}>{children}</GrownUpConfirmationBoundary>;
}

function GrownUpConfirmationBoundary({ children, worldTitle }: { children: ReactNode; worldTitle: string }) {
  // This server-rendered boundary intentionally does not trust the query flag
  // as guardian authority. The client confirmation below is an additional UX
  // stop, while durable guardianship remains blocked on the D-05 decision.
  return <LocalGrownUpConfirmationClient worldTitle={worldTitle}>{children}</LocalGrownUpConfirmationClient>;
}
