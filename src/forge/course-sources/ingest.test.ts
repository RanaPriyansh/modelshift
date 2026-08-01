import { describe, expect, it, vi } from "vitest";

import { sha256Digest } from "../events";
import {
  COURSE_SOURCE_ICS_SUBSET,
  COURSE_SOURCE_INGESTION_LIMITS,
  ingestCourseSource,
} from ".";

const SCOPE = {
  ownerUserId: "11111111-1111-4111-8111-111111111111",
  tenantId: "22222222-2222-4222-8222-222222222222",
  termId: "term.2026-autumn",
  courseId: "course.cs102",
} as const;

const COVERAGE = {
  status: "partial" as const,
  window: {
    startsAt: "2026-08-01T00:00:00.000Z",
    endsAt: "2026-12-31T23:59:59.000Z",
  },
  inspectedScopes: ["course_commitments" as const, "deadlines" as const],
  unknownOrOmittedScopes: ["assessment_policies" as const],
};

const CALENDAR = [
  "BEGIN:VCALENDAR",
  "VERSION:2.0",
  "PRODID:-//FORGE//private-raw-marker//EN",
  "BEGIN:VEVENT",
  "UID:systems-lab@calendar.invalid",
  "SUMMARY:Systems la",
  " b",
  "DTSTART;TZID=Asia/Kolkata:20260901T093000",
  "DTEND;TZID=Asia/Kolkata:20260901T110000",
  "DESCRIPTION:private-description-marker",
  "END:VEVENT",
  "BEGIN:VTODO",
  "UID:assignment-one@calendar.invalid",
  "SUMMARY:Assignment one",
  "DUE;TZID=Asia/Kolkata:20260913T123000",
  "END:VTODO",
  "END:VCALENDAR",
].join("\r\n");

function base() {
  return {
    schemaVersion: "course-source-ingestion.v1" as const,
    scope: SCOPE,
    revisionId: "course-source-revision.calendar-v1",
    sourceLabel: "Exported course calendar",
    observedAt: "2026-08-01T09:00:00.000Z",
    freshnessReviewDueAt: "2026-09-01T09:00:00.000Z",
    coverage: COVERAGE,
    createdAt: "2026-08-01T09:05:00.000Z",
  };
}

function icsRequest(calendarText = CALENDAR) {
  return {
    ...base(),
    inputKind: "ics" as const,
    calendarText,
    mappings: [
      {
        kind: "course_commitment" as const,
        uid: "systems-lab@calendar.invalid",
        candidateId: "course-source-candidate.systems-lab",
        claimKey: "course-claim.systems-lab",
        commitmentClass: "lab" as const,
      },
      {
        kind: "deadline" as const,
        uid: "assignment-one@calendar.invalid",
        candidateId: "course-source-candidate.assignment-one",
        claimKey: "course-claim.assignment-one-deadline",
        dueProperty: "DUE" as const,
        consequenceClass: "consequential" as const,
      },
    ],
  };
}

function oneEvent(
  lines: readonly string[],
  mapping: Record<string, unknown> = {
    kind: "course_commitment",
    uid: "event@calendar.invalid",
    candidateId: "course-source-candidate.event",
    claimKey: "course-claim.event",
    commitmentClass: "other",
  },
) {
  return {
    ...base(),
    inputKind: "ics" as const,
    calendarText: ["BEGIN:VCALENDAR", ...lines, "END:VCALENDAR"].join("\r\n"),
    mappings: [mapping],
  };
}

describe("ADR-012 transient course-source ingestion", () => {
  it("turns an explicit one-shot RFC 5545 subset mapping into review-only facts", async () => {
    const result = await ingestCourseSource(icsRequest());

    expect(result.status).toBe("review_required");
    expect(result.authority).toEqual({
      identityScopeAuthority: "caller_asserted_fixture_only",
      tenantIsolationAuthority: "not_established",
      rightsEnforcementAuthority: "not_established",
      sourceAuthenticity: "not_established",
      institutionalCompleteness: "not_established",
      parserAuthority: COURSE_SOURCE_ICS_SUBSET,
      learnerReviewRequired: true,
      durableStorageAuthority: "not_established",
      persistenceAllowed: false,
      eventEmissionAllowed: false,
      externalSideEffectsAllowed: false,
      recommendationAllowed: false,
      executionAllowed: false,
    });
    expect(result.sourceRevision).toMatchObject({
      inputKind: "ics",
      sourceDigest: await sha256Digest(CALENDAR),
      privacy: {
        visibility: "private_to_owner",
        retentionClass: "derived_fields_only",
        originalBytesRetained: false,
        redistributionAllowed: false,
      },
    });
    expect(result.candidates).toEqual([
      expect.objectContaining({
        candidateId: "course-source-candidate.assignment-one",
        locator: {
          kind: "ics_component",
          uid: "assignment-one@calendar.invalid",
          propertyName: "DUE",
        },
        fact: {
          kind: "deadline",
          title: "Assignment one",
          dueAt: "2026-09-13T07:00:00.000Z",
          timeZone: "Asia/Kolkata",
          consequenceClass: "consequential",
        },
      }),
      expect.objectContaining({
        candidateId: "course-source-candidate.systems-lab",
        locator: {
          kind: "ics_component",
          uid: "systems-lab@calendar.invalid",
          propertyName: "DTSTART",
        },
        fact: {
          kind: "course_commitment",
          title: "Systems lab",
          startsAt: "2026-09-01T04:00:00.000Z",
          endsAt: "2026-09-01T05:30:00.000Z",
          timeZone: "Asia/Kolkata",
          commitmentClass: "lab",
        },
      }),
    ]);
    expect(result.ingestionDigest).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.candidates[0]?.fact)).toBe(true);
  });

  it("retains no original calendar text, descriptions, product identifiers, or source bytes", async () => {
    const result = await ingestCourseSource(icsRequest());
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain("calendarText");
    expect(serialized).not.toContain("private-raw-marker");
    expect(serialized).not.toContain("private-description-marker");
    expect(serialized).not.toContain("PRODID");
    expect(serialized).not.toContain("DESCRIPTION");
    expect(result.sourceRevision?.privacy.originalBytesRetained).toBe(false);
  });

  it("produces the same immutable projection and digest for the same semantic request", async () => {
    const first = await ingestCourseSource(icsRequest());
    const second = await ingestCourseSource(structuredClone(icsRequest()));

    expect(second).toEqual(first);
    expect(second.ingestionDigest).toBe(first.ingestionDigest);
  });

  it("accepts structured manual fields without notes, files, URLs, providers, or execution authority", async () => {
    const result = await ingestCourseSource({
      ...base(),
      revisionId: "course-source-revision.manual-v1",
      sourceLabel: "Learner-entered syllabus fields",
      inputKind: "manual",
      entries: [{
        candidateId: "course-source-candidate.manual-assignment",
        claimKey: "course-claim.manual-assignment-deadline",
        fieldKey: "assignment_one_deadline",
        fact: {
          kind: "deadline",
          title: "Assignment one",
          dueAt: "2026-09-12T12:30:00+05:30",
          timeZone: "Asia/Kolkata",
          consequenceClass: "consequential",
        },
      }],
    });

    expect(result.status).toBe("review_required");
    expect(result.authority.parserAuthority).toBe("structured_manual_non_authorizing");
    expect(result.authority.recommendationAllowed).toBe(false);
    expect(result.authority.executionAllowed).toBe(false);
    expect(result.candidates[0]).toMatchObject({
      extractedBy: "learner_manual",
      locator: { kind: "manual_field", fieldKey: "assignment_one_deadline" },
    });
    expect(JSON.stringify(result)).not.toContain("entries");
  });

  it("uses the first occurrence of a repeated local clock time and rejects a clock-change gap", async () => {
    const repeated = await ingestCourseSource(oneEvent([
      "BEGIN:VEVENT",
      "UID:event@calendar.invalid",
      "SUMMARY:Repeated hour seminar",
      "DTSTART;TZID=America/New_York:20261101T013000",
      "DTEND;TZID=America/New_York:20261101T023000",
      "END:VEVENT",
    ]));
    expect(repeated.status).toBe("review_required");
    expect(repeated.candidates[0]?.fact).toMatchObject({
      startsAt: "2026-11-01T05:30:00.000Z",
      endsAt: "2026-11-01T07:30:00.000Z",
    });

    const gap = await ingestCourseSource(oneEvent([
      "BEGIN:VEVENT",
      "UID:event@calendar.invalid",
      "SUMMARY:Missing clock hour",
      "DTSTART;TZID=America/New_York:20260308T023000",
      "DTEND;TZID=America/New_York:20260308T033000",
      "END:VEVENT",
    ]));
    expect(gap.status).toBe("invalid");
    expect(gap.issues).toContainEqual(expect.objectContaining({ code: "ics.local_time_invalid" }));
    expect(gap.sourceRevision).toBeNull();
    expect(gap.candidates).toEqual([]);
  });

  it.each([
    {
      label: "floating time",
      line: "DTSTART:20260901T093000",
      code: "ics.floating_time_unsupported",
    },
    {
      label: "all-day value",
      line: "DTSTART;VALUE=DATE:20260901",
      code: "ics.date_value_unsupported",
    },
  ])("rejects $label instead of inventing a learner-specific instant", async ({ line, code }) => {
    const result = await ingestCourseSource(oneEvent([
      "BEGIN:VEVENT",
      "UID:event@calendar.invalid",
      "SUMMARY:Ambiguous seminar",
      line,
      "DTEND;TZID=Asia/Kolkata:20260901T110000",
      "END:VEVENT",
    ]));

    expect(result.status).toBe("invalid");
    expect(result.issues).toContainEqual(expect.objectContaining({ code }));
    expect(result.sourceRevision).toBeNull();
  });

  it("rejects recurrence instead of projecting only the first occurrence", async () => {
    const result = await ingestCourseSource(oneEvent([
      "BEGIN:VEVENT",
      "UID:event@calendar.invalid",
      "SUMMARY:Weekly seminar",
      "DTSTART:20260901T040000Z",
      "DTEND:20260901T053000Z",
      "RRULE:FREQ=WEEKLY;COUNT=12",
      "END:VEVENT",
    ]));

    expect(result.status).toBe("invalid");
    expect(result.issues).toContainEqual(expect.objectContaining({ code: "ics.recurrence_unsupported" }));
    expect(result.candidates).toEqual([]);
  });

  it("rejects cancelled and incomplete mapped components", async () => {
    const cancelled = await ingestCourseSource(oneEvent([
      "BEGIN:VEVENT",
      "UID:event@calendar.invalid",
      "SUMMARY:Cancelled seminar",
      "DTSTART:20260901T040000Z",
      "DTEND:20260901T053000Z",
      "STATUS:CANCELLED",
      "END:VEVENT",
    ]));
    expect(cancelled.status).toBe("invalid");
    expect(cancelled.issues).toContainEqual(expect.objectContaining({ code: "ics.cancelled_unsupported" }));

    const incomplete = await ingestCourseSource(oneEvent([
      "BEGIN:VEVENT",
      "UID:event@calendar.invalid",
      "SUMMARY:Incomplete seminar",
      "DTSTART:20260901T040000Z",
      "END:VEVENT",
    ]));
    expect(incomplete.status).toBe("invalid");
    expect(incomplete.issues).toContainEqual(expect.objectContaining({ code: "ics.required_property_missing" }));
  });

  it("requires the declared component kind and exact due property", async () => {
    const result = await ingestCourseSource(oneEvent([
      "BEGIN:VEVENT",
      "UID:event@calendar.invalid",
      "SUMMARY:Assignment deadline",
      "DTSTART:20260901T040000Z",
      "DTEND:20260901T053000Z",
      "END:VEVENT",
    ], {
      kind: "deadline",
      uid: "event@calendar.invalid",
      candidateId: "course-source-candidate.event",
      claimKey: "course-claim.event",
      dueProperty: "DUE",
      consequenceClass: "unknown",
    }));

    expect(result.status).toBe("invalid");
    expect(result.issues).toContainEqual(expect.objectContaining({ code: "ics.component_kind_mismatch" }));
  });

  it("rejects multiple calendar roots and nested course components", async () => {
    const multipleRoots = await ingestCourseSource(icsRequest(`${CALENDAR}\r\n${CALENDAR}`));
    expect(multipleRoots.status).toBe("invalid");
    expect(multipleRoots.issues).toContainEqual(expect.objectContaining({ code: "ics.structure_invalid" }));

    const nested = await ingestCourseSource(oneEvent([
      "BEGIN:VEVENT",
      "UID:event@calendar.invalid",
      "SUMMARY:Outer seminar",
      "DTSTART:20260901T040000Z",
      "DTEND:20260901T053000Z",
      "BEGIN:VTODO",
      "UID:nested@calendar.invalid",
      "SUMMARY:Nested deadline",
      "DUE:20260901T060000Z",
      "END:VTODO",
      "END:VEVENT",
    ]));
    expect(nested.status).toBe("invalid");
    expect(nested.issues).toContainEqual(expect.objectContaining({ code: "ics.structure_invalid" }));
  });

  it("fails closed on duplicate mappings, duplicate component UIDs, and undeclared coverage", async () => {
    const duplicateMapping = icsRequest();
    duplicateMapping.mappings[1] = {
      ...duplicateMapping.mappings[1],
      uid: duplicateMapping.mappings[0].uid,
    };
    const mapped = await ingestCourseSource(duplicateMapping);
    expect(mapped.status).toBe("invalid");
    expect(mapped.issues).toContainEqual(expect.objectContaining({ code: "mapping.duplicate_uid" }));

    const duplicateUid = await ingestCourseSource({
      ...icsRequest(),
      calendarText: CALENDAR.replace(
        "assignment-one@calendar.invalid",
        "systems-lab@calendar.invalid",
      ),
    });
    expect(duplicateUid.status).toBe("invalid");
    expect(duplicateUid.issues).toContainEqual(expect.objectContaining({ code: "ics.duplicate_uid" }));

    const undeclared = await ingestCourseSource({
      ...icsRequest(),
      coverage: {
        ...COVERAGE,
        inspectedScopes: ["deadlines"],
        unknownOrOmittedScopes: ["course_commitments", "assessment_policies"],
      },
    });
    expect(undeclared.status).toBe("invalid");
    expect(undeclared.issues).toContainEqual(expect.objectContaining({ code: "coverage.scope_undeclared" }));
  });

  it("bounds bytes, lines, unfolded lines, components, and control characters before derivation", async () => {
    const tooLarge = await ingestCourseSource(icsRequest("x".repeat(COURSE_SOURCE_INGESTION_LIMITS.maximumInputBytes + 1)));
    const snapshotTooLarge = await ingestCourseSource(icsRequest("x".repeat(4_194_304)));
    expect(tooLarge.status).toBe("invalid");
    expect(tooLarge.issues).toContainEqual(expect.objectContaining({ code: "schema.invalid" }));
    expect(snapshotTooLarge.status).toBe("invalid");
    expect(snapshotTooLarge.issues).toContainEqual(expect.objectContaining({ code: "schema.invalid" }));

    const tooManyBytes = await ingestCourseSource(icsRequest("é".repeat(200_000)));
    expect(tooManyBytes.issues).toContainEqual(expect.objectContaining({ code: "input.too_large" }));

    const tooManyLines = await ingestCourseSource(icsRequest(
      Array.from(
        { length: COURSE_SOURCE_INGESTION_LIMITS.maximumPhysicalLines + 1 },
        (_, index) => `X-LINE-${index}:1`,
      ).join("\r\n"),
    ));
    expect(tooManyLines.issues).toContainEqual(expect.objectContaining({ code: "ics.line_limit" }));

    const longLine = await ingestCourseSource(icsRequest([
      "BEGIN:VCALENDAR",
      `PRODID:${"x".repeat(COURSE_SOURCE_INGESTION_LIMITS.maximumUnfoldedLineBytes + 1)}`,
      "END:VCALENDAR",
    ].join("\r\n")));
    expect(longLine.issues).toContainEqual(expect.objectContaining({ code: "ics.line_too_long" }));

    const controlled = await ingestCourseSource(icsRequest(CALENDAR.replace("VERSION:2.0", "VERSION:\u0000")));
    expect(controlled.issues).toContainEqual(expect.objectContaining({ code: "input.control_character" }));

    const tooManyProperties = await ingestCourseSource(oneEvent([
      "BEGIN:VEVENT",
      "UID:event@calendar.invalid",
      "SUMMARY:Property-heavy seminar",
      "DTSTART:20260901T040000Z",
      "DTEND:20260901T053000Z",
      ...Array.from(
        { length: COURSE_SOURCE_INGESTION_LIMITS.maximumPropertiesPerMappedComponent },
        (_, index) => `X-FORGE-${index}:1`,
      ),
      "END:VEVENT",
    ]));
    expect(tooManyProperties.issues).toContainEqual(expect.objectContaining({ code: "ics.property_limit" }));

    const tooManyComponents = await ingestCourseSource(icsRequest([
      "BEGIN:VCALENDAR",
      ...Array.from(
        { length: COURSE_SOURCE_INGESTION_LIMITS.maximumComponents + 1 },
        () => ["BEGIN:VALARM", "END:VALARM"],
      ).flat(),
      "END:VCALENDAR",
    ].join("\r\n")));
    expect(tooManyComponents.issues).toContainEqual(expect.objectContaining({ code: "ics.component_limit" }));

    const tooManyCandidates = await ingestCourseSource({
      ...icsRequest(),
      mappings: Array.from(
        { length: COURSE_SOURCE_INGESTION_LIMITS.maximumCandidates + 1 },
        (_, index) => ({
          kind: "deadline",
          uid: `assignment-${index}@calendar.invalid`,
          candidateId: `course-source-candidate.limit-${index}`,
          claimKey: `course-claim.limit-${index}`,
          dueProperty: "DUE",
          consequenceClass: "unknown",
        }),
      ),
    });
    expect(tooManyCandidates.issues).toContainEqual(expect.objectContaining({ code: "schema.invalid" }));
  });

  it("accepts LF as an explicit warning while keeping the source digest bound to the exact input", async () => {
    const lfCalendar = CALENDAR.replaceAll("\r\n", "\n");
    const result = await ingestCourseSource(icsRequest(lfCalendar));

    expect(result.status).toBe("review_required");
    expect(result.issues).toContainEqual(expect.objectContaining({
      severity: "warning",
      code: "ics.noncanonical_line_endings",
    }));
    expect(result.sourceRevision?.sourceDigest).toBe(await sha256Digest(lfCalendar));
    expect(result.sourceRevision?.sourceDigest).not.toBe(await sha256Digest(CALENDAR));
  });

  it("rejects undeclared raw fields and does not invoke hostile accessors", async () => {
    const rawField = await ingestCourseSource({ ...icsRequest(), url: "https://university.example/calendar.ics" });
    expect(rawField.status).toBe("invalid");
    expect(rawField.issues).toContainEqual(expect.objectContaining({ code: "schema.invalid" }));

    let invoked = false;
    const hostile = { ...icsRequest() } as Record<string, unknown>;
    Object.defineProperty(hostile, "scope", {
      enumerable: true,
      get() {
        invoked = true;
        throw new Error("must not execute");
      },
    });
    const result = await ingestCourseSource(hostile);
    expect(result.status).toBe("invalid");
    expect(invoked).toBe(false);

    const tooDeep: Record<string, unknown> = { ...icsRequest() };
    let cursor = tooDeep;
    for (let depth = 0; depth < 14; depth += 1) {
      const child: Record<string, unknown> = {};
      cursor.unexpected = child;
      cursor = child;
    }
    const deepResult = await ingestCourseSource(tooDeep);
    expect(deepResult.status).toBe("invalid");
    expect(deepResult.issues).toContainEqual(expect.objectContaining({ code: "schema.invalid" }));

    const tooManyNodes = {
      ...icsRequest(),
      unexpected: Array.from({ length: 9 }, () => Array.from({ length: 512 }, () => null)),
    };
    const nodeResult = await ingestCourseSource(tooManyNodes);
    expect(nodeResult.status).toBe("invalid");
    expect(nodeResult.issues).toContainEqual(expect.objectContaining({ code: "schema.invalid" }));
  });

  it("rejects a transparent proxy before reflection while preserving ordinary input", async () => {
    const accepted = await ingestCourseSource(icsRequest());
    let getCalls = 0;
    let getOwnPropertyDescriptorCalls = 0;
    let getPrototypeOfCalls = 0;
    let ownKeysCalls = 0;
    const proxyRequest = new Proxy(icsRequest(), {
      get() {
        getCalls += 1;
        throw new Error("proxy property reads must not run");
      },
      getOwnPropertyDescriptor() {
        getOwnPropertyDescriptorCalls += 1;
        throw new Error("proxy descriptor reflection must not run");
      },
      getPrototypeOf() {
        getPrototypeOfCalls += 1;
        throw new Error("proxy prototype reflection must not run");
      },
      ownKeys() {
        ownKeysCalls += 1;
        throw new Error("proxy key reflection must not run");
      },
    });

    const rejected = await ingestCourseSource(proxyRequest);

    expect(accepted.status).toBe("review_required");
    expect(rejected.status).toBe("invalid");
    expect(rejected.issues.map((entry) => entry.code)).toEqual(["schema.invalid"]);
    expect(getCalls).toBe(0);
    expect(getOwnPropertyDescriptorCalls).toBe(0);
    expect(getPrototypeOfCalls).toBe(0);
    expect(ownKeysCalls).toBe(0);
  });

  it("rejects repeated object references instead of accepting a non-JSON graph", async () => {
    const repeated = { marker: true };
    const result = await ingestCourseSource({
      ...icsRequest(),
      extraOne: repeated,
      extraTwo: repeated,
    });

    expect(result.status).toBe("invalid");
    expect(result.issues.map((entry) => entry.code)).toEqual(["schema.invalid"]);
  });

  it("performs no fetch, storage, event, recommendation, or execution side effect", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const result = await ingestCourseSource(icsRequest());

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.authority.eventEmissionAllowed).toBe(false);
    expect(result.authority.persistenceAllowed).toBe(false);
    expect(result.authority.externalSideEffectsAllowed).toBe(false);
    expect(result.authority.recommendationAllowed).toBe(false);
    expect(result.authority.executionAllowed).toBe(false);
    fetchSpy.mockRestore();
  });
});
