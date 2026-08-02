export default function Loading() {
  return (
    <main className="forge-loading" id="forge-loading-main" tabIndex={-1} aria-busy="true">
      <section className="forge-loading__panel" aria-labelledby="forge-loading-title">
        <p className="forge-loading__mark">FORGE</p>
        <h1 id="forge-loading-title">Opening your desk.</h1>
        <p role="status">Preparing the next view.</p>
      </section>
    </main>
  );
}
