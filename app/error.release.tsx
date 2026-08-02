"use client";

import Link from "next/link";
import type { CSSProperties } from "react";

const pageStyle: CSSProperties = {
  display: "grid",
  minHeight: "100dvh",
  placeItems: "center",
  padding: "clamp(24px, 6vw, 72px)",
  background: "#edf0e8",
  color: "#14241a",
  fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
};

const panelStyle: CSSProperties = {
  width: "min(680px, 100%)",
  borderTop: "3px solid #173c29",
  paddingTop: "clamp(28px, 5vw, 52px)",
};

const primaryActionStyle: CSSProperties = {
  display: "inline-flex",
  minHeight: 48,
  alignItems: "center",
  justifyContent: "center",
  padding: "10px 18px",
  border: "1px solid #123eae",
  background: "#123eae",
  color: "#fff",
  font: "inherit",
  fontWeight: 800,
  textDecoration: "none",
};

const secondaryActionStyle: CSSProperties = {
  ...primaryActionStyle,
  borderColor: "#173c29",
  background: "transparent",
  color: "#173c29",
};

export default function ForgeError({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  void error;

  return (
    <main id="error-main" tabIndex={-1} style={pageStyle}>
      <section role="alert" style={panelStyle} aria-labelledby="error-title">
        <p style={{ margin: "0 0 14px", color: "#173c29", fontSize: "0.78rem", fontWeight: 850, letterSpacing: "0.12em" }}>
          FORGE
        </p>
        <h1 id="error-title" style={{ maxWidth: "11ch", margin: 0, color: "#173c29", fontSize: "clamp(2.75rem, 8vw, 5.2rem)", letterSpacing: "-0.065em", lineHeight: 0.9 }}>
          We could not open this page.
        </h1>
        <p style={{ maxWidth: "37rem", margin: "24px 0 0", color: "#52645a", fontSize: "1.08rem", lineHeight: 1.6 }}>
          Try again. If this page does not open, return to your Semester Desk.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 30 }}>
          <button type="button" onClick={reset} style={primaryActionStyle}>Try again</button>
          <Link href="/app" style={secondaryActionStyle}>Open your Semester Desk</Link>
          <Link href="/support" style={secondaryActionStyle}>Support</Link>
        </div>
      </section>
    </main>
  );
}
