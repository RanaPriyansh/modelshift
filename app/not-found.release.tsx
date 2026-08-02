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

const actionStyle: CSSProperties = {
  display: "inline-flex",
  minHeight: 48,
  alignItems: "center",
  justifyContent: "center",
  padding: "10px 18px",
  border: "1px solid #123eae",
  background: "#123eae",
  color: "#fff",
  fontWeight: 800,
  textDecoration: "none",
};

const textActionStyle: CSSProperties = {
  ...actionStyle,
  borderColor: "#173c29",
  background: "transparent",
  color: "#173c29",
};

export default function NotFound() {
  return (
    <main id="not-found-main" tabIndex={-1} style={pageStyle}>
      <section style={panelStyle} aria-labelledby="not-found-title">
        <p style={{ margin: "0 0 14px", color: "#173c29", fontSize: "0.78rem", fontWeight: 850, letterSpacing: "0.12em" }}>
          FORGE
        </p>
        <h1 id="not-found-title" style={{ maxWidth: "10ch", margin: 0, color: "#173c29", fontSize: "clamp(2.75rem, 8vw, 5.2rem)", letterSpacing: "-0.065em", lineHeight: 0.9 }}>
          This page is not here.
        </h1>
        <p style={{ maxWidth: "37rem", margin: "24px 0 0", color: "#52645a", fontSize: "1.08rem", lineHeight: 1.6 }}>
          Return to your Semester Desk or read how FORGE helps you rebuild from today.
        </p>
        <nav aria-label="Recovery navigation" style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 30 }}>
          <Link href="/app" style={actionStyle}>Open your Semester Desk</Link>
          <Link href="/how-forge-works" style={textActionStyle}>How FORGE works</Link>
          <Link href="/" style={textActionStyle}>FORGE home</Link>
        </nav>
      </section>
    </main>
  );
}
