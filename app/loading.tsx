export default function Loading() {
  return (
    <div className="forge-shell">
      <main className="forge-app-page" id="forge-main" tabIndex={-1}>
        <p className="forge-app-loading" role="status">Loading the requested FORGE surface…</p>
      </main>
    </div>
  );
}
