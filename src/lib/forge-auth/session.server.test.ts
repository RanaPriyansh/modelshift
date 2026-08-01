import { beforeEach, describe, expect, it, vi } from "vitest";

const createForgeSupabaseServerClient = vi.hoisted(() => vi.fn());

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    cache: (reader: unknown) => reader,
  };
});

vi.mock("./supabase.server", () => ({
  createForgeSupabaseServerClient,
}));

import {
  readForgeCloudIdentity,
  readForgeCloudIdentitySubject,
} from "./session.server";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const USER_EMAIL = "adult@example.test";

type QueryResult<T> = Readonly<{
  data: T | null;
  error: Readonly<{ message: string }> | null;
}>;

type AdmissionCase = Readonly<{
  name: string;
  serverClientAvailable?: boolean;
  authResult?: QueryResult<Readonly<{
    user: Readonly<{ id: string; email?: string }> | null;
  }>>;
  learnerResult?: QueryResult<Readonly<{
    age_band: string;
    onboarding_status: string;
  }>>;
  accountResult?: QueryResult<Readonly<{
    account_status: string;
  }>>;
  expectedTables: readonly string[];
  admitted: boolean;
}>;

const ACTIVE_AUTH_RESULT = Object.freeze({
  data: Object.freeze({
    user: Object.freeze({
      id: USER_ID,
      email: USER_EMAIL,
    }),
  }),
  error: null,
});

const ACTIVE_LEARNER_RESULT = Object.freeze({
  data: Object.freeze({
    age_band: "adult",
    onboarding_status: "active",
  }),
  error: null,
});

const ACTIVE_ACCOUNT_RESULT = Object.freeze({
  data: Object.freeze({
    account_status: "active",
  }),
  error: null,
});

const ADMISSION_CASES: readonly AdmissionCase[] = [
  {
    name: "rejects when no server client exists",
    serverClientAvailable: false,
    expectedTables: [],
    admitted: false,
  },
  {
    name: "rejects when the auth session has no user",
    authResult: {
      data: { user: null },
      error: null,
    },
    expectedTables: [],
    admitted: false,
  },
  {
    name: "rejects an auth error",
    authResult: {
      data: { user: null },
      error: { message: "auth unavailable" },
    },
    expectedTables: [],
    admitted: false,
  },
  {
    name: "rejects a learner profile error",
    learnerResult: {
      data: null,
      error: { message: "learner profile unavailable" },
    },
    expectedTables: ["learner_profiles"],
    admitted: false,
  },
  {
    name: "rejects a non-adult learner",
    learnerResult: {
      data: {
        age_band: "teen",
        onboarding_status: "active",
      },
      error: null,
    },
    expectedTables: ["learner_profiles"],
    admitted: false,
  },
  {
    name: "rejects an inactive learner",
    learnerResult: {
      data: {
        age_band: "adult",
        onboarding_status: "paused",
      },
      error: null,
    },
    expectedTables: ["learner_profiles"],
    admitted: false,
  },
  {
    name: "rejects an account profile error",
    accountResult: {
      data: null,
      error: { message: "account profile unavailable" },
    },
    expectedTables: ["learner_profiles", "profiles"],
    admitted: false,
  },
  {
    name: "rejects an inactive account",
    accountResult: {
      data: {
        account_status: "suspended",
      },
      error: null,
    },
    expectedTables: ["learner_profiles", "profiles"],
    admitted: false,
  },
  {
    name: "admits one active adult account",
    expectedTables: ["learner_profiles", "profiles"],
    admitted: true,
  },
];

function createServerClientHarness(testCase: AdmissionCase) {
  const from = vi.fn((table: string) => {
    const result = table === "learner_profiles"
      ? testCase.learnerResult ?? ACTIVE_LEARNER_RESULT
      : testCase.accountResult ?? ACTIVE_ACCOUNT_RESULT;
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => result),
        })),
      })),
    };
  });

  if (testCase.serverClientAvailable === false) {
    return {
      client: null,
      from,
    };
  }

  return {
    client: {
      auth: {
        getUser: vi.fn(async () => (
          testCase.authResult ?? ACTIVE_AUTH_RESULT
        )),
      },
      schema: vi.fn(() => ({ from })),
    },
    from,
  };
}

async function runReader<T>(
  testCase: AdmissionCase,
  reader: () => Promise<T>,
) {
  const harness = createServerClientHarness(testCase);
  createForgeSupabaseServerClient.mockResolvedValueOnce(harness.client);

  return {
    result: await reader(),
    tables: harness.from.mock.calls.map(([table]) => table),
  };
}

beforeEach(() => {
  createForgeSupabaseServerClient.mockReset();
});

describe("active-adult cloud identity admission", () => {
  it.each(ADMISSION_CASES)("$name", async (testCase) => {
    const identityRun = await runReader(testCase, readForgeCloudIdentity);
    const subjectRun = await runReader(
      testCase,
      readForgeCloudIdentitySubject,
    );

    expect(identityRun.tables).toEqual(testCase.expectedTables);
    expect(subjectRun.tables).toEqual(testCase.expectedTables);
    expect(identityRun.result).toEqual(testCase.admitted
      ? {
          id: USER_ID,
          email: USER_EMAIL,
          accountKind: "cloud_identity",
        }
      : null);
    expect(subjectRun.result).toEqual(testCase.admitted
      ? {
          id: USER_ID,
          accountKind: "cloud_identity",
        }
      : null);
  });
});
