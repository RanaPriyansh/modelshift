import Link from "next/link";
import { PUBLIC_WORLD_CATALOG } from "@/src/forge/worlds";
import { ProductShell } from "./ProductShell";
import { ArrowIcon } from "./SprintIcons";

export function ForgeLabs() {
  return (
    <ProductShell active="labs">
      <main className="forge-labs" id="forge-sprint-main" tabIndex={-1}>
        <header className="forge-page-heading">
          <span className="forge-sprint-kicker">Optional practice · Authored learning paths</span>
          <h1>Use a Lab when the project exposes a gap.</h1>
          <p>
            Labs are the careful learning layer behind Forge: short, bounded paths for
            practicing a difficult idea before returning to the thing you are building.
          </p>
        </header>
        <section className="forge-lab-grid" aria-label="Available Forge Labs">
          {PUBLIC_WORLD_CATALOG.map((world, index) => (
            <article key={world.id}>
              <span>LAB 0{index + 1} · {world.evidenceTier} evidence</span>
              <h2>{world.title}</h2>
              <p>{world.summary}</p>
              <Link href={world.route}>Open Lab <ArrowIcon /></Link>
            </article>
          ))}
        </section>
        <aside className="forge-labs-note">
          <strong>Projects stay primary.</strong>
          <p>Forge will not interrupt your build with a mandatory course or mode shift. Use a Lab when it earns its place.</p>
          <Link href="/build">Return to Build</Link>
        </aside>
      </main>
    </ProductShell>
  );
}
