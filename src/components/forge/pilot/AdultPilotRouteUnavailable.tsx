import { ForgeKicker, ForgeStatus } from "../ForgePrimitives";

import styles from "./AdultPilotExperience.module.css";

/** A truthful public default: no fixture content is rendered in this branch. */
export function AdultPilotRouteUnavailable() {
  return (
    <section className={`${styles.surface} ${styles.unavailable}`} data-testid="pilot-route-unavailable" aria-labelledby="pilot-unavailable-title">
      <ForgeKicker>Adult pilot route</ForgeKicker>
      <ForgeStatus tone="quiet">Review fixture unavailable</ForgeStatus>
      <h1 id="pilot-unavailable-title">This route is not available in this deployment.</h1>
      <p>
        FORGE has not enabled an adult-pilot route here. A URL, browser preference, age assertion, cookie, or account detail cannot make it available.
      </p>
      <ul>
        <li>No reviewed fixture, route, resource, project, or proof activity is loaded.</li>
        <li>No account, provider, model, storage, or evidence service is contacted.</li>
        <li>Only a separately configured server-side review fixture can render this inspection surface.</li>
      </ul>
    </section>
  );
}
