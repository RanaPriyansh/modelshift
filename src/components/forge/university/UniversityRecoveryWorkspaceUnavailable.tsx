export function UniversityRecoveryWorkspaceUnavailable() {
  return (
    <section
      style={{
        width: "min(760px, calc(100% - 36px))",
        minHeight: "62svh",
        margin: "0 auto",
        display: "grid",
        alignContent: "center",
        gap: "12px",
      }}
      role="alert"
    >
      <p style={{ margin: 0, color: "var(--forge-cyan-deep)", fontWeight: 760 }}>
        Recovery fixture unavailable
      </p>
      <h1 style={{ margin: 0, fontSize: "clamp(38px, 7vw, 70px)", letterSpacing: "-0.05em" }}>
        University recovery is unavailable.
      </h1>
      <p style={{ maxWidth: "620px", margin: 0, color: "var(--forge-muted)", lineHeight: 1.6 }}>
        This route accepts only an exact server-owned development fixture. The switch creates no
        learner, course, institutional, persistence, or message authority.
      </p>
    </section>
  );
}
