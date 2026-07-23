"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

function isWorldRoute(pathname: string): boolean {
  return pathname.startsWith("/learn/");
}

/**
 * Keeps a client-side transition into any learning World anchored at its
 * landmark, without taking over the first keyboard stop on a fresh document.
 */
export function WorldRouteFocus() {
  const pathname = usePathname();
  const previousPathname = useRef(pathname);

  useEffect(() => {
    const routeChanged = previousPathname.current !== pathname;
    previousPathname.current = pathname;
    if (!routeChanged || !isWorldRoute(pathname)) return;

    document.getElementById("world-content")?.focus({ preventScroll: true });
  }, [pathname]);

  return null;
}
