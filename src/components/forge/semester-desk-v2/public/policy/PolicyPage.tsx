import Link from "next/link";
import type { ReactNode } from "react";

import styles from "./PolicyPage.module.css";

export type PolicyPageKind = "privacy" | "terms" | "support";

type PageLead = Readonly<{
  label: string;
  title: string;
  lead: string;
}>;

const PAGE_LEADS: Readonly<Record<PolicyPageKind, PageLead>> = {
  privacy: {
    label: "PRIVACY",
    title: "Your study plan is not a profile.",
    lead: "FORGE helps you organise course work without turning your study week into a public record.",
  },
  terms: {
    label: "PRODUCT USE",
    title: "Use FORGE to support your work.",
    lead: "FORGE can help you see a difficult week clearly. You remain responsible for your course work and choices.",
  },
  support: {
    label: "SUPPORT",
    title: "Return to the next honest action.",
    lead: "Use these checks when access, local data, return dates, or a page does not work as expected.",
  },
};

function PolicySection({
  title,
  children,
}: Readonly<{
  title: string;
  children: ReactNode;
}>) {
  const id = title.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-").replaceAll(/(^-|-$)/g, "");

  return (
    <section className={styles.section} aria-labelledby={id}>
      <h2 id={id}>{title}</h2>
      {children}
    </section>
  );
}

function PolicyList({ children }: Readonly<{ children: ReactNode }>) {
  return <dl className={styles.list}>{children}</dl>;
}

function PrivacyPageContent() {
  return (
    <>
      <PolicySection title="What stays on this device">
        <PolicyList>
          <div>
            <dt>Device access</dt>
            <dd>
              FORGE can keep a random local profile ID and your Semester Desk in this browser. It does not ask for your name, school, or location.
            </dd>
          </div>
          <div>
            <dt>Semester Desk data</dt>
            <dd>
              FORGE can keep course facts, recovery choices, and completed learning actions in this browser. It does not save raw practice notes or independent answers to browser storage.
            </dd>
          </div>
        </PolicyList>
      </PolicySection>

      <PolicySection title="What FORGE does not do now">
        <PolicyList>
          <div>
            <dt>No online sign-in or sync</dt>
            <dd>
              The current product does not provide an online account, backup, or cross-device sync.
            </dd>
          </div>
          <div>
            <dt>No university connection</dt>
            <dd>
              FORGE is not connected to a university system. It cannot read a live course schedule or course records.
            </dd>
          </div>
          <div>
            <dt>No automatic sharing</dt>
            <dd>
              FORGE does not send your study evidence to teachers, classmates, or another person. You choose if you download a copy.
            </dd>
          </div>
        </PolicyList>
      </PolicySection>

      <PolicySection title="Your choices">
        <PolicyList>
          <div>
            <dt>Download or remove your desk</dt>
            <dd>
              Open <Link href="/app#settings">Local data</Link> to download the saved JSON or reset this local desk.
            </dd>
          </div>
          <div>
            <dt>Clear browser data carefully</dt>
            <dd>
              Clearing browser site data can remove FORGE data stored on this device. Download the saved JSON first if you may need it later.
            </dd>
          </div>
        </PolicyList>
      </PolicySection>

      <PolicySection title="Use a device you control">
        <p>
          A person who can use this browser can potentially see local FORGE data. Keep shared devices protected and remove local data before you leave a shared browser.
        </p>
      </PolicySection>
    </>
  );
}

function TermsPageContent() {
  return (
    <>
      <PolicySection title="What FORGE is for">
        <p>
          FORGE helps you understand course changes, state available capacity, choose a next action, and practise independently. It does not complete your degree for you.
        </p>
      </PolicySection>

      <PolicySection title="Your course work stays yours">
        <PolicyList>
          <div>
            <dt>Follow course rules</dt>
            <dd>
              Check your course policies before you use FORGE for an assignment, assessment, or group work.
            </dd>
          </div>
          <div>
            <dt>Do not misrepresent work</dt>
            <dd>
              Do not present work as your own when you did not do the learning or when your course rules do not allow the help you used.
            </dd>
          </div>
          <div>
            <dt>Make the final choice</dt>
            <dd>
              You decide what to study, what to change, and whether a plan fits your real week.
            </dd>
          </div>
        </PolicyList>
      </PolicySection>

      <PolicySection title="Product limits">
        <PolicyList>
          <div>
            <dt>Course facts can need review</dt>
            <dd>
              If FORGE shows that course information needs review, use your course site or instructor. FORGE cannot replace either one.
            </dd>
          </div>
          <div>
            <dt>Local data can be lost</dt>
            <dd>
              Browser storage can be unavailable or cleared. Read the <Link href="/privacy">Privacy page</Link> before you remove browser data.
            </dd>
          </div>
          <div>
            <dt>Features can be unavailable</dt>
            <dd>
              A page can be unavailable when browser storage is blocked or a feature is not active in the current product.
            </dd>
          </div>
        </PolicyList>
      </PolicySection>

      <PolicySection title="Questions about use">
        <p>
          Read <Link href="/support">Support</Link> for current self-service checks. FORGE does not provide a monitored contact channel on this site.
        </p>
      </PolicySection>
    </>
  );
}

function SupportPageContent() {
  return (
    <>
      <PolicySection title="Open FORGE again">
        <ol className={styles.steps}>
          <li>Use the same browser profile that you used before.</li>
          <li><Link href="/app">Open FORGE</Link> and check the first screen.</li>
          <li>If the browser reports unavailable storage, allow local storage before you expect FORGE to retain local data.</li>
        </ol>
      </PolicySection>

      <PolicySection title="Manage local data">
        <PolicyList>
          <div>
            <dt>Keep a copy first</dt>
            <dd>
              Open <Link href="/app#settings">Local data</Link> and select <span className={styles.quotedAction}>Download local JSON</span> before you clear browser data.
            </dd>
          </div>
          <div>
            <dt>Remove a local desk</dt>
            <dd>
              Open <Link href="/app#settings">Local data</Link> and select <span className={styles.quotedAction}>Reset this device</span>. Confirm the removal before you continue.
            </dd>
          </div>
        </PolicyList>
      </PolicySection>

      <PolicySection title="Return dates and reminders">
        <p>
          The current web app does not send web reminders or calendar events. If FORGE shows a return date, set your own reminder so you can return when planned.
        </p>
      </PolicySection>

      <PolicySection title="When a page does not work">
        <ol className={styles.steps}>
          <li>Refresh the page and open it again in the same browser profile.</li>
          <li>Check that the browser can use local storage.</li>
          <li>Do not clear browser data before you download any saved JSON that you need.</li>
          <li>If FORGE cannot read local data, download the unchanged JSON before you reset this device.</li>
        </ol>
      </PolicySection>

      <PolicySection title="Current contact limit">
        <p>
          FORGE does not provide a monitored email, chat, or ticket channel on this site. This page cannot receive course files, account details, or support requests.
        </p>
      </PolicySection>
    </>
  );
}

function PageContent({ kind }: Readonly<{ kind: PolicyPageKind }>) {
  if (kind === "privacy") return <PrivacyPageContent />;
  if (kind === "terms") return <TermsPageContent />;
  return <SupportPageContent />;
}

export function PolicyPage({ kind }: Readonly<{ kind: PolicyPageKind }>) {
  const page = PAGE_LEADS[kind];

  return (
    <div className={styles.page} data-policy-page={kind}>
      <a className={styles.skipLink} href="#policy-main">
        Skip to main content
      </a>

      <header className={styles.header}>
        <Link className={styles.wordmark} href="/" aria-label="FORGE home">
          FORGE
        </Link>
        <nav className={styles.navigation} aria-label="Public navigation">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/support">Support</Link>
          <Link className={styles.openLink} href="/app">Open FORGE</Link>
        </nav>
      </header>

      <main id="policy-main" className={styles.main} tabIndex={-1}>
        <section className={styles.hero} aria-labelledby="policy-title">
          <div className={styles.heroCopy}>
            <p className={styles.context}>{page.label}</p>
            <h1 id="policy-title">{page.title}</h1>
            <p className={styles.lead}>{page.lead}</p>
          </div>
          <div className={styles.terrain} aria-hidden="true">
            <span className={styles.sky} />
            <span className={styles.backRidge} />
            <span className={styles.frontRidge} />
            <span className={styles.path} />
            <span className={styles.marker} />
          </div>
        </section>

        <div className={styles.content}>
          <PageContent kind={kind} />
        </div>
      </main>

      <footer className={styles.footer}>
        <p>
          FORGE helps university students rebuild from today without hiding what changed.
        </p>
        <nav aria-label="Footer navigation">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/support">Support</Link>
        </nav>
        {kind === "terms" ? (
          <p className={styles.legalNote}>
            Draft product-use terms. Legal review is required before publication.
          </p>
        ) : null}
      </footer>
    </div>
  );
}
