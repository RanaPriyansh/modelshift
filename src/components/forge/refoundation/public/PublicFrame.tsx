import type { ReactNode } from "react";

import styles from "./PublicExperience.module.css";
import { PublicShell } from "./PublicShell";

type PublicSection =
  | "home"
  | "paths"
  | "projects"
  | "how"
  | "trust"
  | "explore"
  | "modelshift"
  | "pricing";

export function PublicFrame({
  children,
  active,
  overlayHeader = false,
}: {
  children: ReactNode;
  active: PublicSection;
  overlayHeader?: boolean;
}) {
  return (
    <PublicShell active={active} overlayHeader={overlayHeader} rootClassName={styles.publicRoot}>
      {children}
    </PublicShell>
  );
}
