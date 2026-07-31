import {
  expect,
  test,
  type BrowserContext,
  type Page,
} from "@playwright/test";

const RESEARCH_READINESS_ROUTE =
  "/internal/university-research-readiness";
const RESEARCH_READINESS_FIXTURE_TOKEN =
  "forge-university-research-readiness.v1";
const researchReadinessFixtureEnabled =
  process.env.FORGE_UNIVERSITY_RESEARCH_READINESS_FIXTURE
    === RESEARCH_READINESS_FIXTURE_TOKEN;
const EFFECT_EVIDENCE_KEY = "__forgeResearchReadinessEffectEvidence";

type BrowserEffectEvent = Readonly<{
  kind:
    | "beacon"
    | "cache"
    | "cookie"
    | "fetch"
    | "indexeddb"
    | "service-worker"
    | "storage"
    | "websocket"
    | "xhr";
  operation: string;
  target?: string;
  method?: string;
}>;

type BrowserEffectEvidence = Readonly<{
  events: readonly BrowserEffectEvent[];
  hooks: readonly string[];
}>;

type ObservedRequest = Readonly<{
  method: string;
  resourceType: string;
  url: string;
}>;

test.skip(
  !researchReadinessFixtureEnabled,
  "Run this development-only spec with the exact research-readiness fixture token.",
);

function captureConsoleFailures(page: Page): string[] {
  const failures: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") failures.push(message.text());
  });
  page.on("pageerror", (error) => failures.push(error.message));
  return failures;
}

async function installBrowserEffectInstrumentation(context: BrowserContext) {
  await context.addInitScript((evidenceKey) => {
    type MutableEvidence = {
      events: BrowserEffectEvent[];
      hooks: string[];
    };
    type MethodDetails = Readonly<{
      method?: string;
      target?: string;
    }>;

    const evidence: MutableEvidence = { events: [], hooks: [] };
    Object.defineProperty(globalThis, evidenceKey, {
      configurable: false,
      enumerable: false,
      value: evidence,
      writable: false,
    });

    const record = (
      kind: BrowserEffectEvent["kind"],
      operation: string,
      details: MethodDetails = {},
    ) => {
      evidence.events.push({ kind, operation, ...details });
    };
    const mark = (hook: string) => {
      evidence.hooks.push(hook);
    };
    const absoluteUrl = (value: unknown): string => {
      try {
        if (value instanceof URL) return value.href;
        if (value instanceof Request) return value.url;
        return new URL(String(value), location.href).href;
      } catch {
        return String(value);
      }
    };
    const wrapMethod = (
      owner: object,
      method: string,
      hook: string,
      before: (
        receiver: unknown,
        args: readonly unknown[],
      ) => void,
    ) => {
      const descriptor = Object.getOwnPropertyDescriptor(owner, method);
      if (!descriptor || typeof descriptor.value !== "function") return;
      const original = descriptor.value as (...args: unknown[]) => unknown;
      Object.defineProperty(owner, method, {
        ...descriptor,
        value(this: unknown, ...args: unknown[]) {
          before(this, args);
          return Reflect.apply(original, this, args);
        },
      });
      mark(hook);
    };

    const cookieDescriptor = Object.getOwnPropertyDescriptor(
      Document.prototype,
      "cookie",
    );
    if (
      cookieDescriptor
      && typeof cookieDescriptor.get === "function"
      && typeof cookieDescriptor.set === "function"
    ) {
      const nativeCookieSetter = cookieDescriptor.set;
      Object.defineProperty(Document.prototype, "cookie", {
        ...cookieDescriptor,
        set(value: string) {
          record("cookie", "set", {
            target: String(value).split("=", 1)[0] ?? "",
          });
          Reflect.apply(nativeCookieSetter, this, [value]);
        },
      });
      mark("cookie.set");
    }
    const cookieStoreConstructor = (
      globalThis as typeof globalThis & {
        CookieStore?: { prototype: object };
      }
    ).CookieStore;
    if (cookieStoreConstructor) {
      for (const operation of ["set", "delete"] as const) {
        wrapMethod(
          cookieStoreConstructor.prototype,
          operation,
          `cookie-store.${operation}`,
          (_receiver, args) => {
            const first = args[0];
            const target = typeof first === "string"
              ? first
              : first !== null && typeof first === "object" && "name" in first
                ? String(first.name)
                : "";
            record("cookie", operation, { target });
          },
        );
      }
    }

    const rawLocalStorage = globalThis.localStorage;
    const rawSessionStorage = globalThis.sessionStorage;
    const storageArea = (receiver: unknown): "local" | "session" | "unknown" => (
      receiver === rawLocalStorage
        ? "local"
        : receiver === rawSessionStorage
          ? "session"
          : "unknown"
    );
    wrapMethod(
      Storage.prototype,
      "setItem",
      "storage.setItem",
      (receiver, args) => {
        record("storage", "setItem", {
          target: `${storageArea(receiver)}:${String(args[0] ?? "")}`,
        });
      },
    );
    wrapMethod(
      Storage.prototype,
      "removeItem",
      "storage.removeItem",
      (receiver, args) => {
        record("storage", "removeItem", {
          target: `${storageArea(receiver)}:${String(args[0] ?? "")}`,
        });
      },
    );
    wrapMethod(
      Storage.prototype,
      "clear",
      "storage.clear",
      (receiver) => {
        record("storage", "clear", { target: storageArea(receiver) });
      },
    );
    const installNamedStorageInstrumentation = (
      property: "localStorage" | "sessionStorage",
      rawStorage: Storage,
      area: "local" | "session",
    ) => {
      let owner: object | null = globalThis;
      let descriptor: PropertyDescriptor | undefined;
      while (owner && !descriptor) {
        descriptor = Object.getOwnPropertyDescriptor(owner, property);
        if (!descriptor) owner = Object.getPrototypeOf(owner) as object | null;
      }
      if (
        !owner
        || !descriptor
        || typeof descriptor.get !== "function"
        || descriptor.configurable !== true
      ) return;

      const proxy = new Proxy(rawStorage, {
        defineProperty(target, key, definition) {
          record("storage", "defineProperty", {
            target: `${area}:${String(key)}`,
          });
          return Reflect.defineProperty(target, key, definition);
        },
        deleteProperty(target, key) {
          record("storage", "deleteProperty", {
            target: `${area}:${String(key)}`,
          });
          return Reflect.deleteProperty(target, key);
        },
        get(target, key) {
          const value = Reflect.get(target, key, target);
          return typeof value === "function" ? value.bind(target) : value;
        },
        set(target, key, value) {
          record("storage", "setProperty", {
            target: `${area}:${String(key)}`,
          });
          return Reflect.set(target, key, value, target);
        },
      });
      Object.defineProperty(owner, property, {
        ...descriptor,
        get: () => proxy,
      });
      mark(`storage.named.${area}`);
    };
    installNamedStorageInstrumentation(
      "localStorage",
      rawLocalStorage,
      "local",
    );
    installNamedStorageInstrumentation(
      "sessionStorage",
      rawSessionStorage,
      "session",
    );

    wrapMethod(
      IDBFactory.prototype,
      "open",
      "indexeddb.open",
      (_receiver, args) => record("indexeddb", "open", {
        target: String(args[0] ?? ""),
      }),
    );
    wrapMethod(
      IDBFactory.prototype,
      "deleteDatabase",
      "indexeddb.deleteDatabase",
      (_receiver, args) => record("indexeddb", "deleteDatabase", {
        target: String(args[0] ?? ""),
      }),
    );
    wrapMethod(
      IDBDatabase.prototype,
      "createObjectStore",
      "indexeddb.createObjectStore",
      (_receiver, args) => record("indexeddb", "createObjectStore", {
        target: String(args[0] ?? ""),
      }),
    );
    wrapMethod(
      IDBDatabase.prototype,
      "deleteObjectStore",
      "indexeddb.deleteObjectStore",
      (_receiver, args) => record("indexeddb", "deleteObjectStore", {
        target: String(args[0] ?? ""),
      }),
    );
    for (const operation of ["add", "put", "delete", "clear"] as const) {
      wrapMethod(
        IDBObjectStore.prototype,
        operation,
        `indexeddb.${operation}`,
        (receiver) => record("indexeddb", operation, {
          target: receiver instanceof IDBObjectStore ? receiver.name : "",
        }),
      );
    }
    for (const operation of ["update", "delete"] as const) {
      wrapMethod(
        IDBCursor.prototype,
        operation,
        `indexeddb.cursor.${operation}`,
        (receiver) => record("indexeddb", `cursor.${operation}`, {
          target: receiver instanceof IDBCursor
            ? String(receiver.source.name)
            : "",
        }),
      );
    }

    wrapMethod(
      CacheStorage.prototype,
      "open",
      "cache.open",
      (_receiver, args) => record("cache", "open", {
        target: String(args[0] ?? ""),
      }),
    );
    wrapMethod(
      CacheStorage.prototype,
      "delete",
      "cache.deleteStorage",
      (_receiver, args) => record("cache", "deleteStorage", {
        target: String(args[0] ?? ""),
      }),
    );
    for (const operation of ["add", "addAll", "put", "delete"] as const) {
      wrapMethod(
        Cache.prototype,
        operation,
        `cache.${operation}`,
        (_receiver, args) => record("cache", operation, {
          target: absoluteUrl(
            operation === "addAll"
              ? (Array.isArray(args[0]) ? args[0][0] : "")
              : args[0],
          ),
        }),
      );
    }

    wrapMethod(
      ServiceWorkerContainer.prototype,
      "register",
      "service-worker.register",
      (_receiver, args) => record("service-worker", "register", {
        target: absoluteUrl(args[0]),
      }),
    );
    wrapMethod(
      ServiceWorkerRegistration.prototype,
      "unregister",
      "service-worker.unregister",
      (receiver) => record("service-worker", "unregister", {
        target: receiver instanceof ServiceWorkerRegistration
          ? receiver.scope
          : "",
      }),
    );

    wrapMethod(
      globalThis,
      "fetch",
      "fetch",
      (_receiver, args) => {
        const request = args[0] instanceof Request ? args[0] : null;
        const init = (
          args[1] !== null && typeof args[1] === "object"
            ? args[1]
            : {}
        ) as RequestInit;
        record("fetch", "request", {
          method: String(init.method ?? request?.method ?? "GET").toUpperCase(),
          target: absoluteUrl(args[0]),
        });
      },
    );

    const xhrRequests = new WeakMap<
      XMLHttpRequest,
      Readonly<{ method: string; target: string }>
    >();
    wrapMethod(
      XMLHttpRequest.prototype,
      "open",
      "xhr.open",
      (receiver, args) => {
        if (receiver instanceof XMLHttpRequest) {
          xhrRequests.set(receiver, {
            method: String(args[0] ?? "GET").toUpperCase(),
            target: absoluteUrl(args[1]),
          });
        }
      },
    );
    wrapMethod(
      XMLHttpRequest.prototype,
      "send",
      "xhr.send",
      (receiver) => {
        const request = receiver instanceof XMLHttpRequest
          ? xhrRequests.get(receiver)
          : undefined;
        record("xhr", "send", {
          method: request?.method ?? "GET",
          target: request?.target ?? "",
        });
      },
    );

    wrapMethod(
      Navigator.prototype,
      "sendBeacon",
      "beacon",
      (_receiver, args) => record("beacon", "send", {
        method: "POST",
        target: absoluteUrl(args[0]),
      }),
    );

    const webSocketDescriptor = Object.getOwnPropertyDescriptor(
      globalThis,
      "WebSocket",
    );
    if (
      webSocketDescriptor
      && typeof webSocketDescriptor.value === "function"
    ) {
      const NativeWebSocket = webSocketDescriptor.value as typeof WebSocket;
      const InstrumentedWebSocket = new Proxy(NativeWebSocket, {
        construct(target, args, newTarget) {
          record("websocket", "construct", {
            target: absoluteUrl(args[0]),
          });
          return Reflect.construct(target, args, newTarget);
        },
      });
      Object.defineProperty(globalThis, "WebSocket", {
        ...webSocketDescriptor,
        value: InstrumentedWebSocket,
      });
      mark("websocket.construct");
    }
    wrapMethod(
      WebSocket.prototype,
      "send",
      "websocket.send",
      (receiver) => record("websocket", "send", {
        target: receiver instanceof WebSocket ? receiver.url : "",
      }),
    );
    wrapMethod(
      WebSocket.prototype,
      "close",
      "websocket.close",
      (receiver) => record("websocket", "close", {
        target: receiver instanceof WebSocket ? receiver.url : "",
      }),
    );
  }, EFFECT_EVIDENCE_KEY);
}

async function browserEffectEvidence(
  page: Page,
): Promise<BrowserEffectEvidence> {
  return page.evaluate((evidenceKey) => {
    const evidence = (
      globalThis as typeof globalThis & Record<string, unknown>
    )[evidenceKey];
    if (
      evidence === null
      || typeof evidence !== "object"
      || !("events" in evidence)
      || !("hooks" in evidence)
    ) {
      throw new Error("Browser effect instrumentation was not installed.");
    }
    return {
      events: [...(evidence.events as BrowserEffectEvent[])],
      hooks: [...(evidence.hooks as string[])],
    };
  }, EFFECT_EVIDENCE_KEY);
}

function isExpectedNextDevelopmentRequest(
  request: ObservedRequest,
  pageOrigin: string,
): boolean {
  if (request.method !== "GET") return false;
  const url = new URL(request.url);
  if (url.origin !== pageOrigin) return false;

  if (
    request.resourceType === "document"
    && url.pathname === RESEARCH_READINESS_ROUTE
    && url.search === ""
  ) return true;

  if (
    url.pathname.startsWith("/_next/static/")
    && ["font", "image", "script", "stylesheet"].includes(
      request.resourceType,
    )
  ) return true;

  if (
    url.pathname === "/_next/image"
    && request.resourceType === "image"
  ) return true;

  if (
    url.pathname === "/favicon.ico"
    && ["image", "other"].includes(request.resourceType)
  ) return true;

  return (
    url.pathname === RESEARCH_READINESS_ROUTE
    && request.resourceType === "fetch"
    && [...url.searchParams.keys()].every((key) => key === "_rsc")
    && url.searchParams.has("_rsc")
  );
}

function isExpectedNextProgrammaticRequest(
  event: BrowserEffectEvent,
  pageOrigin: string,
): boolean {
  if (
    !["fetch", "xhr"].includes(event.kind)
    || event.method !== "GET"
    || !event.target
  ) return false;
  const url = new URL(event.target);
  if (url.origin !== pageOrigin) return false;
  return (
    url.pathname.startsWith("/_next/")
    || (
      url.pathname === RESEARCH_READINESS_ROUTE
      && [...url.searchParams.keys()].every((key) => key === "_rsc")
      && url.searchParams.has("_rsc")
    )
  );
}

function isExpectedHmrWebSocket(value: string, pageOrigin: string): boolean {
  const socket = new URL(value);
  const page = new URL(pageOrigin);
  return (
    ["ws:", "wss:"].includes(socket.protocol)
    && socket.host === page.host
    && socket.pathname === "/_next/webpack-hmr"
  );
}

async function browserPersistenceSnapshot(
  page: Page,
  context: BrowserContext,
) {
  const browserState = await page.evaluate(async () => ({
    local: JSON.stringify({ ...localStorage }),
    session: JSON.stringify({ ...sessionStorage }),
    documentCookie: document.cookie,
    indexedDatabases: typeof indexedDB.databases === "function"
      ? (await indexedDB.databases()).map((database) => ({
          name: database.name ?? null,
          version: database.version ?? null,
        })).sort((left, right) => String(left.name).localeCompare(
          String(right.name),
        ))
      : [],
    cacheNames: "caches" in globalThis ? (await caches.keys()).sort() : [],
    serviceWorkerScopes: "serviceWorker" in navigator
      ? (await navigator.serviceWorker.getRegistrations())
          .map((registration) => registration.scope)
          .sort()
      : [],
  }));
  const cookies = (await context.cookies()).map((cookie) => ({
    domain: cookie.domain,
    expires: cookie.expires,
    httpOnly: cookie.httpOnly,
    name: cookie.name,
    path: cookie.path,
    sameSite: cookie.sameSite,
    secure: cookie.secure,
    value: cookie.value,
  })).sort((left, right) => left.name.localeCompare(right.name));
  return { ...browserState, cookies };
}

test("moves through all five readiness states with native keyboard controls", async ({
  page,
}) => {
  const consoleFailures = captureConsoleFailures(page);
  await page.goto("/internal/university-research-readiness");

  const skipLink = page.getByRole("link", { name: "Skip to main content" });
  for (let index = 0; index < 3 && !(await skipLink.evaluate(
    (element) => element === document.activeElement,
  )); index += 1) {
    await page.keyboard.press("Tab");
  }
  await expect(skipLink).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#forge-main")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("radio", {
    name: "Invalid protocol",
  })).toBeFocused();

  await expect(page.getByRole("heading", {
    level: 1,
    name: "Rehearsal is not permission.",
  })).toBeVisible();
  await expect(page.getByRole("navigation", {
    name: "Mobile navigation",
  })).toHaveCount(0);
  await expect(page.getByRole("heading", {
    level: 2,
    name: "Repair the protocol before any rehearsal.",
  })).toBeVisible();

  await page.getByText("Missing approval", { exact: true }).click();
  await expect(page.getByRole("heading", {
    level: 2,
    name: "Approval is missing. Stop here.",
  })).toBeVisible();
  await page.getByText("Invalid protocol", { exact: true }).click();

  const first = page.getByRole("radio", { name: "Invalid protocol" });
  await first.focus();
  await expect(first).toBeFocused();

  const nextStates = [
    "The comparator must answer the same question.",
    "Approval is missing. Stop here.",
    "Every required role needs a fixture placeholder.",
    "The synthetic preflight plan is internally coherent.",
  ];
  for (const heading of nextStates) {
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("heading", {
      level: 2,
      name: heading,
    })).toBeVisible();
  }

  await expect(page.getByRole("radio", {
    name: "Synthetic plan coherent",
  })).toBeChecked();
  await expect(page.getByRole("region", {
    name: "Research readiness gates",
  })).toContainText("Fixture references bound");
  await expect(page.getByRole("region", {
    name: "Research readiness gates",
  })).toContainText("Fixture roles represented");
  await expect(page.getByRole("navigation", {
    name: "Primary navigation",
  }).locator('[aria-current="page"]')).toHaveCount(0);
  const workspace = page.locator("main article");
  await expect(workspace.getByRole("link")).toHaveCount(0);
  await expect(workspace.getByRole("button")).toHaveCount(0);
  expect(consoleFailures).toEqual([]);
});

test("keeps rehearsal selection local and exposes no action surface", async ({
  context,
  page,
}) => {
  await installBrowserEffectInstrumentation(context);
  const requests: ObservedRequest[] = [];
  const responseHeaderChecks: Array<Promise<void>> = [];
  const setCookieResponses: string[] = [];
  const observedWebSockets: string[] = [];
  context.on("request", (request) => requests.push({
    method: request.method(),
    resourceType: request.resourceType(),
    url: request.url(),
  }));
  context.on("response", (response) => {
    responseHeaderChecks.push((async () => {
      const headers = await response.headersArray();
      if (headers.some((header) => header.name.toLowerCase() === "set-cookie")) {
        setCookieResponses.push(response.url());
      }
    })());
  });
  page.on("websocket", (socket) => observedWebSockets.push(socket.url()));

  await page.goto(RESEARCH_READINESS_ROUTE);
  const workspace = page.locator("main article");
  const storageBefore = await browserPersistenceSnapshot(page, context);
  const requestCountAfterLoad = requests.length;

  await page.getByText("Synthetic plan coherent", { exact: true }).click();
  await expect(page.getByText(
    "Future adult-only target: 5-10; current fixture: no people",
  )).toBeVisible();
  await expect(page.getByText(
    "Information and task declarations align; schedule is locked",
  )).toBeVisible();
  await expect(workspace.getByRole("link")).toHaveCount(0);
  await expect(workspace.getByRole("button")).toHaveCount(0);
  await page.evaluate(() => new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  }));

  const storageAfter = await browserPersistenceSnapshot(page, context);
  const effectEvidence = await browserEffectEvidence(page);
  const cookieStoreSupported = await page.evaluate(
    () => "CookieStore" in globalThis,
  );
  const visibleCopy = await workspace.innerText();
  for (
    let checkedResponseCount = 0;
    checkedResponseCount < responseHeaderChecks.length;
  ) {
    const pending = responseHeaderChecks.slice(checkedResponseCount);
    checkedResponseCount = responseHeaderChecks.length;
    await Promise.all(pending);
  }
  const pageOrigin = new URL(page.url()).origin;
  const unexpectedInitialRequests = requests
    .slice(0, requestCountAfterLoad)
    .filter((request) => (
      !isExpectedNextDevelopmentRequest(request, pageOrigin)
    ));
  const unexpectedBrowserEffects = effectEvidence.events.filter((event) => {
    if (
      event.kind === "storage"
      && event.operation === "setItem"
      && event.target?.startsWith("session:__next_debug_channel:")
    ) return false;
    if (isExpectedNextProgrammaticRequest(event, pageOrigin)) return false;
    if (
      event.kind === "websocket"
      && event.target
      && isExpectedHmrWebSocket(event.target, pageOrigin)
    ) return false;
    return true;
  });

  expect(storageAfter).toEqual(storageBefore);
  expect(JSON.parse(storageBefore.local)).toEqual({});
  expect(Object.keys(JSON.parse(storageBefore.session)).every(
    (key) => key.startsWith("__next_debug_channel:"),
  )).toBe(true);
  expect(storageBefore.documentCookie).toBe("");
  expect(storageBefore.indexedDatabases).toEqual([]);
  expect(storageBefore.cacheNames).toEqual([]);
  expect(storageBefore.serviceWorkerScopes).toEqual([]);
  expect(storageBefore.cookies).toEqual([]);
  expect(effectEvidence.hooks).toEqual(expect.arrayContaining([
    "beacon",
    "cache.add",
    "cache.addAll",
    "cache.delete",
    "cache.deleteStorage",
    "cache.open",
    "cache.put",
    "cookie.set",
    "fetch",
    "indexeddb.add",
    "indexeddb.clear",
    "indexeddb.createObjectStore",
    "indexeddb.cursor.delete",
    "indexeddb.cursor.update",
    "indexeddb.delete",
    "indexeddb.deleteDatabase",
    "indexeddb.deleteObjectStore",
    "indexeddb.open",
    "indexeddb.put",
    "service-worker.register",
    "service-worker.unregister",
    "storage.clear",
    "storage.named.local",
    "storage.named.session",
    "storage.removeItem",
    "storage.setItem",
    "websocket.close",
    "websocket.construct",
    "websocket.send",
    "xhr.open",
    "xhr.send",
  ]));
  if (cookieStoreSupported) {
    expect(effectEvidence.hooks).toEqual(expect.arrayContaining([
      "cookie-store.delete",
      "cookie-store.set",
    ]));
  }
  expect(unexpectedBrowserEffects).toEqual([]);
  expect(unexpectedInitialRequests).toEqual([]);
  expect(requests.slice(requestCountAfterLoad)).toEqual([]);
  expect(setCookieResponses).toEqual([]);
  expect(observedWebSockets.length).toBeGreaterThanOrEqual(1);
  expect(observedWebSockets.every((socket) => (
    isExpectedHmrWebSocket(socket, pageOrigin)
  ))).toBe(true);
  expect(new Set(observedWebSockets).size).toBe(1);
  expect(visibleCopy).not.toContain("—");
  expect(visibleCopy).not.toContain("–");
});

test("has no horizontal overflow at exactly 320 CSS pixels", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/internal/university-research-readiness");
  await expect(page.getByRole("heading", {
    level: 1,
    name: "Rehearsal is not permission.",
  })).toBeVisible();

  const widths = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(widths).toEqual({ document: 320, body: 320, client: 320 });

  const controlBoxes = await page
    .locator('fieldset label')
    .evaluateAll((labels) => labels.map((label) => {
      const box = label.getBoundingClientRect();
      return {
        left: box.left,
        right: box.right,
        top: box.top,
        bottom: box.bottom,
        width: box.width,
        height: box.height,
      };
    }));
  expect(controlBoxes.every((box) => (
    box.left >= 0
    && box.right <= 320
    && box.width > 0
    && box.height >= 44
  ))).toBe(true);

  for (const scenario of ["Missing approval", "Synthetic plan coherent"]) {
    await page.getByText(scenario, { exact: true }).click();
    const gateLayout = await page.getByRole("region", {
      name: "Research readiness gates",
    }).locator("li").evaluateAll((items) => items.map((item) => {
      const box = item.getBoundingClientRect();
      return {
        contained: box.left >= 0 && box.right <= 320,
        contentFits: item.scrollWidth <= item.clientWidth,
        height: box.height,
      };
    }));
    expect(gateLayout.every((item) => (
      item.contained && item.contentFits && item.height >= 44
    ))).toBe(true);
  }
});

test("collapses scenario-control transitions under reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/internal/university-research-readiness");
  const mediaMatches = await page.evaluate(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const transitionDuration = await page
    .locator('input[value="invalid-protocol"] + span')
    .evaluate((element) => getComputedStyle(element).transitionDuration);

  expect(mediaMatches).toBe(true);
  expect(Number.parseFloat(transitionDuration)).toBeLessThanOrEqual(0.000_01);
});

test("keeps focused and selected controls visible in forced colors", async ({
  page,
}) => {
  await page.emulateMedia({ forcedColors: "active" });
  await page.goto("/internal/university-research-readiness");
  const ready = page.getByRole("radio", {
    name: "Synthetic plan coherent",
  });
  await ready.focus();
  await page.keyboard.press("Space");
  await expect(ready).toBeChecked();
  const mediaMatches = await page.evaluate(
    () => matchMedia("(forced-colors: active)").matches,
  );
  const selectedControlStyle = await page
    .locator('input[value="synthetic-plan-coherent"] + span')
    .evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        backgroundColor: style.backgroundColor,
        borderColor: style.borderColor,
        borderStyle: style.borderStyle,
        borderWidth: style.borderWidth,
        color: style.color,
        outlineColor: style.outlineColor,
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth,
      };
    });
  const unselectedControlStyle = await page
    .locator('input[value="invalid-protocol"] + span')
    .evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        backgroundColor: style.backgroundColor,
        borderColor: style.borderColor,
        borderWidth: style.borderWidth,
        color: style.color,
      };
    });

  expect(mediaMatches).toBe(true);
  expect(selectedControlStyle.borderStyle).toBe("solid");
  expect(selectedControlStyle.borderWidth).not.toBe("0px");
  expect(selectedControlStyle.outlineStyle).not.toBe("none");
  expect(selectedControlStyle.outlineWidth).not.toBe("0px");
  expect(selectedControlStyle.backgroundColor).not.toBe(
    unselectedControlStyle.backgroundColor,
  );
  expect(selectedControlStyle.color).not.toBe("");
  expect(selectedControlStyle.borderWidth).not.toBe(
    unselectedControlStyle.borderWidth,
  );
});
