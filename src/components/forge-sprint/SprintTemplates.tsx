import Link from "next/link";
import { FORGE_SPRINT_TEMPLATES } from "@/src/lib/forge-sprint/model";
import { ProductShell } from "./ProductShell";
import { ArrowIcon } from "./SprintIcons";

export function SprintTemplates() {
  return (
    <ProductShell active="templates">
      <main className="forge-templates" id="forge-sprint-main">
        <header className="forge-page-heading">
          <span className="forge-sprint-kicker">Practical starting patterns</span>
          <h1>Borrow the structure.<br />Keep the judgment.</h1>
          <p>
            Each template supplies a sensible seven-day arc. The audience, finish line,
            evidence, and decisions still have to come from your project.
          </p>
        </header>
        <section className="forge-template-library" aria-label="Forge sprint templates">
          {FORGE_SPRINT_TEMPLATES.map((template, index) => (
            <article key={template.id}>
              <header>
                <span>0{index + 1}</span>
                <span>7 days · editable</span>
              </header>
              <h2>{template.name}</h2>
              <p>{template.shortDescription}</p>
              <dl>
                <div><dt>Example project</dt><dd>{template.exampleTitle}</dd></div>
                <div><dt>Useful finish line</dt><dd>{template.exampleFinishLine}</dd></div>
              </dl>
              <Link href={"/build/new?template=" + template.id}>
                Start from this pattern <ArrowIcon />
              </Link>
            </article>
          ))}
        </section>
        <section className="forge-template-principle">
          <span>What every pattern shares</span>
          <ol>
            <li><strong>One audience</strong><p>Specific enough to observe or ask.</p></li>
            <li><strong>One core outcome</strong><p>Small enough to work end to end.</p></li>
            <li><strong>Inspectable evidence</strong><p>A link, artifact, or result another person can examine.</p></li>
            <li><strong>Honest edges</strong><p>Clear limits, AI use, and open questions.</p></li>
          </ol>
        </section>
      </main>
    </ProductShell>
  );
}
