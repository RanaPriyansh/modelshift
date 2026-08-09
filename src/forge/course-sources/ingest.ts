import { z } from "zod";

import { boundedJsonSnapshot } from "../bounded-json-snapshot";
import { deepFreeze } from "../deep-freeze";
import { canonicalJson, sha256Digest } from "../events";
import {
  courseSourceCoverageDeclarationSchema,
  courseSourceFactSchema,
  courseSourceScopeSchema,
  parseCourseSourceCandidate,
  parseCourseSourceRevision,
  type CourseSourceCandidateV1,
  type CourseSourceCoverageDeclarationV1,
  type CourseSourceFactV1,
  type CourseSourceRevisionV1,
  type CourseSourceScopeV1,
} from "./contracts";

z.config({ jitless: true });

export const COURSE_SOURCE_INGESTION_SCHEMA_VERSION = "course-source-ingestion.v1" as const;
export const COURSE_SOURCE_INGESTION_RESULT_SCHEMA_VERSION = "course-source-ingestion-result.v1" as const;
export const COURSE_SOURCE_ICS_SUBSET = "rfc5545-one-shot-review-subset.v1" as const;

export const COURSE_SOURCE_INGESTION_LIMITS = deepFreeze({
  maximumInputBytes: 256 * 1024,
  maximumPhysicalLines: 8_192,
  maximumUnfoldedLineBytes: 1_024,
  maximumComponents: 256,
  maximumPropertiesPerMappedComponent: 128,
  maximumCandidates: 128,
});

const MAXIMUM_SERIALIZED_JSON_BYTES = 512 * 1_024;

type ProxyDetector = (value: object) => boolean;

/**
 * Node callers use the intrinsic Proxy detector. Browser callers receive
 * serialized plain data and must not import a Node-only module into the client
 * graph.
 */
function nodeProxyDetector(): ProxyDetector | undefined {
  if (
    typeof process === "undefined"
    || typeof process.getBuiltinModule !== "function"
  ) {
    return undefined;
  }
  try {
    const detector = process.getBuiltinModule("node:util").types.isProxy;
    return typeof detector === "function" ? detector : undefined;
  } catch {
    return undefined;
  }
}

const NODE_PROXY_DETECTOR = nodeProxyDetector();

const timestampSchema = z.string().datetime({ offset: true });
const revisionIdSchema = z.string().trim().max(180).regex(/^course-source-revision\.[a-z0-9]+(?:[._-][a-z0-9]+)*$/);
const candidateIdSchema = z.string().trim().max(180).regex(/^course-source-candidate\.[a-z0-9]+(?:[._-][a-z0-9]+)*$/);
const claimKeySchema = z.string().trim().max(180).regex(/^course-claim\.[a-z0-9]+(?:[._-][a-z0-9]+)*$/);
const boundedCodeSchema = z.string().trim().max(160).regex(/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/);
const uidSchema = z.string().trim().min(1).max(320);

const commonRequestShape = {
  schemaVersion: z.literal(COURSE_SOURCE_INGESTION_SCHEMA_VERSION),
  scope: courseSourceScopeSchema,
  revisionId: revisionIdSchema,
  sourceLabel: z.string().trim().min(1).max(240),
  observedAt: timestampSchema,
  freshnessReviewDueAt: timestampSchema.nullable(),
  coverage: courseSourceCoverageDeclarationSchema,
  createdAt: timestampSchema,
} as const;

const manualEntrySchema = z.strictObject({
  candidateId: candidateIdSchema,
  claimKey: claimKeySchema,
  fieldKey: boundedCodeSchema,
  fact: courseSourceFactSchema,
});

const commitmentMappingSchema = z.strictObject({
  kind: z.literal("course_commitment"),
  uid: uidSchema,
  candidateId: candidateIdSchema,
  claimKey: claimKeySchema,
  commitmentClass: z.enum(["class", "lab", "seminar", "office_hours", "other"]),
});

const deadlineMappingSchema = z.strictObject({
  kind: z.literal("deadline"),
  uid: uidSchema,
  candidateId: candidateIdSchema,
  claimKey: claimKeySchema,
  dueProperty: z.enum(["DTSTART", "DTEND", "DUE"]),
  consequenceClass: z.enum(["routine", "consequential", "unknown"]),
});

const manualRequestSchema = z.strictObject({
  ...commonRequestShape,
  inputKind: z.literal("manual"),
  entries: z.array(manualEntrySchema).min(1).max(COURSE_SOURCE_INGESTION_LIMITS.maximumCandidates),
});

const icsRequestSchema = z.strictObject({
  ...commonRequestShape,
  inputKind: z.literal("ics"),
  calendarText: z.string().min(1).max(COURSE_SOURCE_INGESTION_LIMITS.maximumInputBytes),
  mappings: z.array(
    z.discriminatedUnion("kind", [commitmentMappingSchema, deadlineMappingSchema]),
  ).min(1).max(COURSE_SOURCE_INGESTION_LIMITS.maximumCandidates),
});

const ingestionRequestSchema = z.discriminatedUnion("inputKind", [manualRequestSchema, icsRequestSchema]);
type ParsedIngestionRequest = z.infer<typeof ingestionRequestSchema>;
type IcsMapping = z.infer<typeof commitmentMappingSchema> | z.infer<typeof deadlineMappingSchema>;

const INGESTION_SNAPSHOT_OPTIONS = {
  maximumStringLength: COURSE_SOURCE_INGESTION_LIMITS.maximumInputBytes,
  maximumSerializedJsonBytes: MAXIMUM_SERIALIZED_JSON_BYTES,
  rejectRepeatedReferences: true,
  ...(NODE_PROXY_DETECTOR
    ? { rejectObject: NODE_PROXY_DETECTOR }
    : {}),
} as const;

export type CourseSourceIngestionIssueCode =
  | "schema.invalid"
  | "input.too_large"
  | "input.control_character"
  | "ingestion.digest_unavailable"
  | "revision.invalid"
  | "candidate.invalid"
  | "coverage.scope_undeclared"
  | "mapping.duplicate_candidate"
  | "mapping.duplicate_claim"
  | "mapping.duplicate_uid"
  | "ics.noncanonical_line_endings"
  | "ics.line_limit"
  | "ics.line_too_long"
  | "ics.structure_invalid"
  | "ics.component_limit"
  | "ics.property_limit"
  | "ics.property_invalid"
  | "ics.duplicate_property"
  | "ics.duplicate_uid"
  | "ics.uid_missing"
  | "ics.summary_missing"
  | "ics.mapping_missing"
  | "ics.component_kind_mismatch"
  | "ics.recurrence_unsupported"
  | "ics.cancelled_unsupported"
  | "ics.date_value_unsupported"
  | "ics.floating_time_unsupported"
  | "ics.time_zone_invalid"
  | "ics.local_time_invalid"
  | "ics.required_property_missing"
  | "ics.date_order_invalid"
  | "ics.component_unmapped";

export interface CourseSourceIngestionIssue {
  readonly severity: "error" | "warning";
  readonly code: CourseSourceIngestionIssueCode;
  readonly path: string;
  readonly message: string;
}

export interface CourseSourceIngestionResultV1 {
  readonly schemaVersion: typeof COURSE_SOURCE_INGESTION_RESULT_SCHEMA_VERSION;
  readonly status: "invalid" | "review_required";
  readonly scope: CourseSourceScopeV1 | null;
  readonly sourceRevision: Readonly<CourseSourceRevisionV1> | null;
  readonly candidates: readonly Readonly<CourseSourceCandidateV1>[];
  readonly issues: readonly CourseSourceIngestionIssue[];
  readonly ingestionDigest: string | null;
  readonly authority: {
    readonly identityScopeAuthority: "caller_asserted_fixture_only";
    readonly tenantIsolationAuthority: "not_established";
    readonly rightsEnforcementAuthority: "not_established";
    readonly sourceAuthenticity: "not_established";
    readonly institutionalCompleteness: "not_established";
    readonly parserAuthority: "structured_manual_non_authorizing" | typeof COURSE_SOURCE_ICS_SUBSET | "not_available";
    readonly learnerReviewRequired: true;
    readonly durableStorageAuthority: "not_established";
    readonly persistenceAllowed: false;
    readonly eventEmissionAllowed: false;
    readonly externalSideEffectsAllowed: false;
    readonly recommendationAllowed: false;
    readonly executionAllowed: false;
  };
}

interface ParsedProperty {
  readonly name: string;
  readonly parameters: Readonly<Record<string, string>>;
  readonly value: string;
}

interface ParsedComponent {
  readonly kind: "VEVENT" | "VTODO";
  readonly index: number;
  readonly properties: ReadonlyMap<string, ParsedProperty>;
}

interface ParsedDateTime {
  readonly instant: string;
  readonly timeZone: string;
}

const CONTROL_CHARACTER = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
const DATE_TIME_UTC = /^(20\d{2})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/;
const DATE_TIME_LOCAL = /^(20\d{2})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/;
const PROPERTY_NAME = /^[A-Z0-9-]+$/;
const RECURRING_PROPERTIES = ["RRULE", "RDATE", "EXDATE", "RECURRENCE-ID"] as const;

const BASE_AUTHORITY = deepFreeze({
  identityScopeAuthority: "caller_asserted_fixture_only" as const,
  tenantIsolationAuthority: "not_established" as const,
  rightsEnforcementAuthority: "not_established" as const,
  sourceAuthenticity: "not_established" as const,
  institutionalCompleteness: "not_established" as const,
  learnerReviewRequired: true as const,
  durableStorageAuthority: "not_established" as const,
  persistenceAllowed: false as const,
  eventEmissionAllowed: false as const,
  externalSideEffectsAllowed: false as const,
  recommendationAllowed: false as const,
  executionAllowed: false as const,
});

function issue(
  issues: CourseSourceIngestionIssue[],
  severity: CourseSourceIngestionIssue["severity"],
  code: CourseSourceIngestionIssueCode,
  path: string,
  message: string,
): void {
  issues.push({ severity, code, path, message });
}

function orderedIssues(issues: readonly CourseSourceIngestionIssue[]): CourseSourceIngestionIssue[] {
  return [...issues].sort((left, right) => {
    const severity = left.severity.localeCompare(right.severity);
    if (severity !== 0) return severity;
    const code = left.code.localeCompare(right.code);
    return code !== 0 ? code : left.path.localeCompare(right.path);
  });
}

function invalidResult(
  issues: readonly CourseSourceIngestionIssue[],
  scope: CourseSourceScopeV1 | null = null,
): Readonly<CourseSourceIngestionResultV1> {
  return deepFreeze({
    schemaVersion: COURSE_SOURCE_INGESTION_RESULT_SCHEMA_VERSION,
    status: "invalid",
    scope,
    sourceRevision: null,
    candidates: [],
    issues: orderedIssues(issues),
    ingestionDigest: null,
    authority: { ...BASE_AUTHORITY, parserAuthority: "not_available" as const },
  });
}

function structuralRequest(
  value: unknown,
): { readonly request: ParsedIngestionRequest | null; readonly issues: readonly CourseSourceIngestionIssue[] } {
  try {
    const result = ingestionRequestSchema.safeParse(
      boundedJsonSnapshot(value, INGESTION_SNAPSHOT_OPTIONS),
    );
    if (result.success) return { request: result.data, issues: [] };
    return {
      request: null,
      issues: result.error.issues.map((entry) => ({
        severity: "error" as const,
        code: "schema.invalid" as const,
        path: entry.path.join(".") || "request",
        message: entry.message,
      })),
    };
  } catch {
    return {
      request: null,
      issues: [{
        severity: "error",
        code: "schema.invalid",
        path: "request",
        message: "The ingestion request must contain only bounded, accessor-free JSON data.",
      }],
    };
  }
}

function splitOutsideQuotes(value: string, separator: string): string[] {
  const parts: string[] = [];
  let quoted = false;
  let current = "";
  for (const character of value) {
    if (character === "\"") quoted = !quoted;
    if (character === separator && !quoted) {
      parts.push(current);
      current = "";
    } else {
      current += character;
    }
  }
  parts.push(current);
  return parts;
}

function contentLine(value: string): ParsedProperty | null {
  let quoted = false;
  let separator = -1;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character === "\"") quoted = !quoted;
    if (character === ":" && !quoted) {
      separator = index;
      break;
    }
  }
  if (quoted || separator <= 0) return null;

  const definition = splitOutsideQuotes(value.slice(0, separator), ";");
  const name = definition.shift()?.toUpperCase() ?? "";
  if (!PROPERTY_NAME.test(name)) return null;
  const parameters: Record<string, string> = {};
  for (const part of definition) {
    const equals = part.indexOf("=");
    if (equals <= 0) return null;
    const key = part.slice(0, equals).toUpperCase();
    let parameterValue = part.slice(equals + 1);
    if (!PROPERTY_NAME.test(key) || key in parameters || parameterValue.length === 0) return null;
    if (parameterValue.startsWith("\"") || parameterValue.endsWith("\"")) {
      if (!(parameterValue.startsWith("\"") && parameterValue.endsWith("\"")) || parameterValue.length < 2) return null;
      parameterValue = parameterValue.slice(1, -1);
    }
    parameters[key] = parameterValue;
  }
  return { name, parameters, value: value.slice(separator + 1) };
}

function unfoldedLines(calendarText: string, issues: CourseSourceIngestionIssue[]): readonly string[] | null {
  const byteLength = new TextEncoder().encode(calendarText).byteLength;
  if (byteLength > COURSE_SOURCE_INGESTION_LIMITS.maximumInputBytes) {
    issue(issues, "error", "input.too_large", "calendarText", "Calendar text exceeds the 256 KiB transient parsing limit.");
    return null;
  }
  if (CONTROL_CHARACTER.test(calendarText)) {
    issue(issues, "error", "input.control_character", "calendarText", "Calendar text contains a disallowed control character.");
    return null;
  }
  if (/\r(?!\n)/.test(calendarText)) {
    issue(issues, "error", "ics.structure_invalid", "calendarText", "Calendar text contains a bare carriage return.");
    return null;
  }
  if (!calendarText.includes("\r\n") && calendarText.includes("\n")) {
    issue(issues, "warning", "ics.noncanonical_line_endings", "calendarText", "LF line endings were accepted for this bounded import; RFC 5545 uses CRLF.");
  }

  const physicalLines = calendarText.replaceAll("\r\n", "\n").split("\n");
  if (physicalLines.at(-1) === "") physicalLines.pop();
  if (physicalLines.length > COURSE_SOURCE_INGESTION_LIMITS.maximumPhysicalLines) {
    issue(issues, "error", "ics.line_limit", "calendarText", "Calendar text contains too many physical lines.");
    return null;
  }

  const output: string[] = [];
  physicalLines.forEach((line, index) => {
    if (/^[ \t]/.test(line)) {
      if (output.length === 0) {
        issue(issues, "error", "ics.structure_invalid", `calendarText.lines.${index}`, "A folded line has no preceding content line.");
        return;
      }
      output[output.length - 1] += line.slice(1);
    } else {
      output.push(line);
    }
  });
  output.forEach((line, index) => {
    if (new TextEncoder().encode(line).byteLength > COURSE_SOURCE_INGESTION_LIMITS.maximumUnfoldedLineBytes) {
      issue(issues, "error", "ics.line_too_long", `calendarText.lines.${index}`, "An unfolded content line exceeds the 1 KiB limit.");
    }
  });
  return issues.some((entry) => entry.severity === "error") ? null : output;
}

function parseCalendar(
  calendarText: string,
  issues: CourseSourceIngestionIssue[],
): readonly ParsedComponent[] | null {
  const lines = unfoldedLines(calendarText, issues);
  if (!lines) return null;
  const stack: string[] = [];
  const components: ParsedComponent[] = [];
  let active: { kind: "VEVENT" | "VTODO"; index: number; properties: Map<string, ParsedProperty>; propertyCount: number } | null = null;
  let componentCount = 0;
  let rootCount = 0;

  lines.forEach((line, lineIndex) => {
    const property = contentLine(line);
    if (!property) {
      issue(issues, "error", "ics.property_invalid", `calendarText.lines.${lineIndex}`, "The content line is outside the supported RFC 5545 syntax.");
      return;
    }
    if (property.name === "BEGIN") {
      const kind = property.value.toUpperCase();
      if (
        !PROPERTY_NAME.test(kind)
        || (stack.length === 0 && kind !== "VCALENDAR")
        || (kind === "VCALENDAR" && (stack.length !== 0 || rootCount > 0))
        || (active !== null && (kind === "VEVENT" || kind === "VTODO"))
      ) {
        issue(issues, "error", "ics.structure_invalid", `calendarText.lines.${lineIndex}`, "Calendar components are not correctly nested.");
        return;
      }
      if (kind === "VCALENDAR") rootCount += 1;
      componentCount += kind === "VCALENDAR" ? 0 : 1;
      if (componentCount > COURSE_SOURCE_INGESTION_LIMITS.maximumComponents) {
        issue(issues, "error", "ics.component_limit", "calendarText", "Calendar text contains too many components.");
        return;
      }
      if (stack.length === 1 && (kind === "VEVENT" || kind === "VTODO")) {
        active = { kind, index: components.length, properties: new Map(), propertyCount: 0 };
      }
      stack.push(kind);
      return;
    }
    if (property.name === "END") {
      const kind = property.value.toUpperCase();
      if (stack.at(-1) !== kind) {
        issue(issues, "error", "ics.structure_invalid", `calendarText.lines.${lineIndex}`, "Calendar component endings do not match their beginnings.");
        return;
      }
      if (active && stack.length === 2 && kind === active.kind) {
        components.push({ kind: active.kind, index: active.index, properties: active.properties });
        active = null;
      }
      stack.pop();
      return;
    }
    if (stack.length === 0) {
      issue(issues, "error", "ics.structure_invalid", `calendarText.lines.${lineIndex}`, "A property appears outside VCALENDAR.");
      return;
    }
    if (active && stack.length === 2) {
      active.propertyCount += 1;
      if (active.propertyCount > COURSE_SOURCE_INGESTION_LIMITS.maximumPropertiesPerMappedComponent) {
        issue(issues, "error", "ics.property_limit", `calendarText.components.${active.index}`, "A course component contains too many properties.");
        return;
      }
      const relevant = [
        "UID", "SUMMARY", "DTSTART", "DTEND", "DUE", "RRULE", "RDATE", "EXDATE", "RECURRENCE-ID", "STATUS",
      ].includes(property.name);
      if (relevant && active.properties.has(property.name)) {
        issue(issues, "error", "ics.duplicate_property", `calendarText.components.${active.index}.${property.name}`, "A supported property occurs more than once.");
        return;
      }
      if (relevant) active.properties.set(property.name, property);
    }
  });

  if (stack.length !== 0 || lines.length < 2 || lines[0]?.toUpperCase() !== "BEGIN:VCALENDAR" || lines.at(-1)?.toUpperCase() !== "END:VCALENDAR") {
    issue(issues, "error", "ics.structure_invalid", "calendarText", "Calendar text must contain one closed VCALENDAR object.");
  }
  return issues.some((entry) => entry.severity === "error") ? null : components;
}

function unescapeText(value: string): string | null {
  let output = "";
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index]!;
    if (character !== "\\") {
      output += character;
      continue;
    }
    const escaped = value[index + 1];
    if (escaped === undefined) return null;
    if (escaped === "n" || escaped === "N") output += "\n";
    else if (escaped === "," || escaped === ";" || escaped === "\\") output += escaped;
    else return null;
    index += 1;
  }
  return output.trim().replace(/\s+/g, " ");
}

function utcMillis(parts: readonly number[]): number | null {
  const [year, month, day, hour, minute, second] = parts;
  const value = new Date(0);
  value.setUTCFullYear(year!, month! - 1, day!);
  value.setUTCHours(hour!, minute!, second!, 0);
  return value.getUTCFullYear() === year
    && value.getUTCMonth() === month! - 1
    && value.getUTCDate() === day
    && value.getUTCHours() === hour
    && value.getUTCMinutes() === minute
    && value.getUTCSeconds() === second
    ? value.getTime()
    : null;
}

function zonedParts(timeZone: string, instant: number): readonly number[] | null {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    const parts = formatter.formatToParts(new Date(instant));
    const value = (kind: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === kind)?.value);
    const output = [value("year"), value("month"), value("day"), value("hour"), value("minute"), value("second")];
    return output.every(Number.isInteger) ? output : null;
  } catch {
    return null;
  }
}

function localInstant(parts: readonly number[], timeZone: string): string | null {
  const naive = utcMillis(parts);
  if (naive === null || zonedParts(timeZone, naive) === null) return null;
  const offsets = new Set<number>();
  for (let delta = -48; delta <= 48; delta += 6) {
    const sample = naive + delta * 60 * 60 * 1_000;
    const displayed = zonedParts(timeZone, sample);
    const displayedAsUtc = displayed ? utcMillis(displayed) : null;
    if (displayedAsUtc !== null) offsets.add(displayedAsUtc - sample);
  }
  const candidates = [...offsets]
    .map((offset) => naive - offset)
    .filter((instant) => {
      const displayed = zonedParts(timeZone, instant);
      return displayed !== null && displayed.every((part, index) => part === parts[index]);
    })
    .sort((left, right) => left - right);
  return candidates.length > 0 ? new Date(candidates[0]!).toISOString() : null;
}

function dateTimeProperty(
  property: ParsedProperty,
  path: string,
  issues: CourseSourceIngestionIssue[],
): ParsedDateTime | null {
  const parameterKeys = Object.keys(property.parameters);
  if (parameterKeys.some((key) => key !== "VALUE" && key !== "TZID")) {
    issue(issues, "error", "ics.date_value_unsupported", path, "Only VALUE and TZID date parameters are supported.");
    return null;
  }
  const valueType = property.parameters.VALUE?.toUpperCase() ?? "DATE-TIME";
  if (valueType !== "DATE-TIME") {
    issue(issues, "error", "ics.date_value_unsupported", path, "All-day DATE values require learner clarification and are not imported.");
    return null;
  }

  const utc = DATE_TIME_UTC.exec(property.value);
  if (utc) {
    if (property.parameters.TZID) {
      issue(issues, "error", "ics.date_value_unsupported", path, "A UTC date-time cannot also declare TZID.");
      return null;
    }
    const instant = utcMillis(utc.slice(1).map(Number));
    if (instant === null) {
      issue(issues, "error", "ics.local_time_invalid", path, "The calendar date-time is not a real date.");
      return null;
    }
    return { instant: new Date(instant).toISOString(), timeZone: "UTC" };
  }

  const local = DATE_TIME_LOCAL.exec(property.value);
  if (!local) {
    issue(issues, "error", "ics.date_value_unsupported", path, "Only RFC 5545 UTC or local date-times with TZID are supported.");
    return null;
  }
  const timeZone = property.parameters.TZID;
  if (!timeZone) {
    issue(issues, "error", "ics.floating_time_unsupported", path, "Floating calendar times require learner clarification and are not imported.");
    return null;
  }
  if (timeZone.length > 120 || zonedParts(timeZone, Date.UTC(2026, 0, 1)) === null) {
    issue(issues, "error", "ics.time_zone_invalid", path, "TZID is not supported by this runtime.");
    return null;
  }
  const instant = localInstant(local.slice(1).map(Number), timeZone);
  if (!instant) {
    issue(issues, "error", "ics.local_time_invalid", path, "The local date-time is invalid or falls in an unsupported clock-change gap.");
    return null;
  }
  return { instant, timeZone };
}

function validateMappings(
  mappings: readonly IcsMapping[],
  issues: CourseSourceIngestionIssue[],
): void {
  const candidateIds = new Set<string>();
  const claimKeys = new Set<string>();
  const uids = new Set<string>();
  mappings.forEach((mapping, index) => {
    if (candidateIds.has(mapping.candidateId)) {
      issue(issues, "error", "mapping.duplicate_candidate", `mappings.${index}.candidateId`, "Candidate identifiers must be unique.");
    }
    if (claimKeys.has(mapping.claimKey)) {
      issue(issues, "error", "mapping.duplicate_claim", `mappings.${index}.claimKey`, "Each bounded import mapping must name a distinct claim.");
    }
    if (uids.has(mapping.uid)) {
      issue(issues, "error", "mapping.duplicate_uid", `mappings.${index}.uid`, "This subset maps each calendar component at most once.");
    }
    candidateIds.add(mapping.candidateId);
    claimKeys.add(mapping.claimKey);
    uids.add(mapping.uid);
  });
}

function declaredScopeForFact(fact: CourseSourceFactV1["kind"]): "course_commitments" | "deadlines" | "assessment_policies" {
  if (fact === "course_commitment") return "course_commitments";
  if (fact === "deadline") return "deadlines";
  return "assessment_policies";
}

function validateCoverage(
  coverage: CourseSourceCoverageDeclarationV1,
  facts: readonly CourseSourceFactV1[],
  issues: CourseSourceIngestionIssue[],
): void {
  const inspected = new Set(coverage.inspectedScopes);
  facts.forEach((fact, index) => {
    const required = declaredScopeForFact(fact.kind);
    if (!inspected.has(required)) {
      issue(issues, "error", "coverage.scope_undeclared", `candidates.${index}.fact.kind`, "A derived fact must be inside a caller-declared inspected scope.");
    }
  });
}

function revisionFrom(
  request: ParsedIngestionRequest,
  sourceDigest: string,
): Readonly<CourseSourceRevisionV1> | null {
  try {
    return parseCourseSourceRevision({
      schemaVersion: "course-source-revision.v1",
      revisionId: request.revisionId,
      scope: request.scope,
      inputKind: request.inputKind,
      sourceLabel: request.sourceLabel,
      sourceDigest,
      observedAt: request.observedAt,
      freshnessReviewDueAt: request.freshnessReviewDueAt,
      coverage: request.coverage,
      privacy: {
        visibility: "private_to_owner",
        retentionClass: "derived_fields_only",
        originalBytesRetained: false,
        redistributionAllowed: false,
      },
    });
  } catch {
    return null;
  }
}

function manualCandidates(
  request: z.infer<typeof manualRequestSchema>,
  issues: CourseSourceIngestionIssue[],
): readonly Readonly<CourseSourceCandidateV1>[] {
  const candidateIds = new Set<string>();
  const claimKeys = new Set<string>();
  const candidates: Readonly<CourseSourceCandidateV1>[] = [];
  request.entries.forEach((entry, index) => {
    if (candidateIds.has(entry.candidateId)) {
      issue(issues, "error", "mapping.duplicate_candidate", `entries.${index}.candidateId`, "Candidate identifiers must be unique.");
    }
    if (claimKeys.has(entry.claimKey)) {
      issue(issues, "error", "mapping.duplicate_claim", `entries.${index}.claimKey`, "Each structured entry must name a distinct claim.");
    }
    candidateIds.add(entry.candidateId);
    claimKeys.add(entry.claimKey);
    try {
      candidates.push(parseCourseSourceCandidate({
        schemaVersion: "course-source-candidate.v1",
        candidateId: entry.candidateId,
        scope: request.scope,
        sourceRevisionId: request.revisionId,
        claimKey: entry.claimKey,
        locator: { kind: "manual_field", fieldKey: entry.fieldKey },
        extractedBy: "learner_manual",
        fact: entry.fact,
        createdAt: request.createdAt,
      }));
    } catch {
      issue(issues, "error", "candidate.invalid", `entries.${index}`, "The structured entry cannot become a bounded course-source candidate.");
    }
  });
  return candidates.sort((left, right) => left.candidateId.localeCompare(right.candidateId));
}

function componentIdentity(
  component: ParsedComponent,
  issues: CourseSourceIngestionIssue[],
): { readonly uid: string; readonly summary: string } | null {
  const uidProperty = component.properties.get("UID");
  const summaryProperty = component.properties.get("SUMMARY");
  const path = `calendarText.components.${component.index}`;
  if (!uidProperty) {
    issue(issues, "error", "ics.uid_missing", `${path}.UID`, "A mappable component must declare UID.");
    return null;
  }
  if (!summaryProperty) {
    issue(issues, "error", "ics.summary_missing", `${path}.SUMMARY`, "A mappable component must declare SUMMARY.");
    return null;
  }
  if (Object.keys(uidProperty.parameters).length > 0 || Object.keys(summaryProperty.parameters).length > 0) {
    issue(issues, "error", "ics.property_invalid", path, "UID and SUMMARY parameters are outside this bounded subset.");
    return null;
  }
  const uid = unescapeText(uidProperty.value);
  const summary = unescapeText(summaryProperty.value);
  if (!uid || uid.length > 320 || !summary || summary.length > 600) {
    issue(issues, "error", "ics.property_invalid", path, "UID or SUMMARY is empty, too long, or uses unsupported escaping.");
    return null;
  }
  return { uid, summary };
}

function icsCandidates(
  request: z.infer<typeof icsRequestSchema>,
  components: readonly ParsedComponent[],
  issues: CourseSourceIngestionIssue[],
): readonly Readonly<CourseSourceCandidateV1>[] {
  validateMappings(request.mappings, issues);
  const mappedUids = new Set(request.mappings.map((mapping) => mapping.uid));
  const byUid = new Map<string, { readonly component: ParsedComponent; readonly summary: string }>();

  components.forEach((component) => {
    const identity = componentIdentity(component, issues);
    if (!identity) return;
    if (byUid.has(identity.uid)) {
      issue(issues, "error", "ics.duplicate_uid", `calendarText.components.${component.index}.UID`, "Calendar component UIDs must be unique in this subset.");
      return;
    }
    byUid.set(identity.uid, { component, summary: identity.summary });
    if (!mappedUids.has(identity.uid)) {
      issue(issues, "warning", "ics.component_unmapped", `calendarText.components.${component.index}`, "An unmapped calendar component was ignored.");
    }
  });

  const candidates: Readonly<CourseSourceCandidateV1>[] = [];
  request.mappings.forEach((mapping, index) => {
    const found = byUid.get(mapping.uid);
    const path = `mappings.${index}`;
    if (!found) {
      issue(issues, "error", "ics.mapping_missing", `${path}.uid`, "The mapped UID was not found in this calendar copy.");
      return;
    }
    const { component, summary } = found;
    if (RECURRING_PROPERTIES.some((name) => component.properties.has(name))) {
      issue(issues, "error", "ics.recurrence_unsupported", path, "Recurring or exception components require a later expansion-and-review boundary.");
      return;
    }
    if (component.properties.get("STATUS")?.value.toUpperCase() === "CANCELLED") {
      issue(issues, "error", "ics.cancelled_unsupported", path, "Cancelled components are not imported as current course facts.");
      return;
    }

    let fact: CourseSourceFactV1 | null = null;
    let propertyName: "DTSTART" | "DTEND" | "DUE" = "DTSTART";
    if (mapping.kind === "course_commitment") {
      if (component.kind !== "VEVENT") {
        issue(issues, "error", "ics.component_kind_mismatch", path, "Course commitments must map to VEVENT.");
        return;
      }
      const startProperty = component.properties.get("DTSTART");
      const endProperty = component.properties.get("DTEND");
      if (!startProperty || !endProperty) {
        issue(issues, "error", "ics.required_property_missing", path, "A commitment requires both DTSTART and DTEND.");
        return;
      }
      const startsAt = dateTimeProperty(startProperty, `${path}.DTSTART`, issues);
      const endsAt = dateTimeProperty(endProperty, `${path}.DTEND`, issues);
      if (!startsAt || !endsAt) return;
      if (Date.parse(endsAt.instant) <= Date.parse(startsAt.instant)) {
        issue(issues, "error", "ics.date_order_invalid", path, "A commitment must end after it starts.");
        return;
      }
      if (startsAt.timeZone !== endsAt.timeZone) {
        issue(issues, "error", "ics.date_value_unsupported", path, "A commitment must use one explicit time-zone representation.");
        return;
      }
      fact = {
        kind: "course_commitment",
        title: summary,
        startsAt: startsAt.instant,
        endsAt: endsAt.instant,
        timeZone: startsAt.timeZone,
        commitmentClass: mapping.commitmentClass,
      };
    } else {
      propertyName = mapping.dueProperty;
      if (
        (propertyName === "DUE" && component.kind !== "VTODO")
        || (propertyName !== "DUE" && component.kind !== "VEVENT")
      ) {
        issue(issues, "error", "ics.component_kind_mismatch", path, "DUE maps to VTODO; DTSTART or DTEND maps to VEVENT.");
        return;
      }
      const dueProperty = component.properties.get(propertyName);
      if (!dueProperty) {
        issue(issues, "error", "ics.required_property_missing", `${path}.${propertyName}`, "The mapped deadline property is missing.");
        return;
      }
      const dueAt = dateTimeProperty(dueProperty, `${path}.${propertyName}`, issues);
      if (!dueAt) return;
      fact = {
        kind: "deadline",
        title: summary,
        dueAt: dueAt.instant,
        timeZone: dueAt.timeZone,
        consequenceClass: mapping.consequenceClass,
      };
    }

    try {
      candidates.push(parseCourseSourceCandidate({
        schemaVersion: "course-source-candidate.v1",
        candidateId: mapping.candidateId,
        scope: request.scope,
        sourceRevisionId: request.revisionId,
        claimKey: mapping.claimKey,
        locator: { kind: "ics_component", uid: mapping.uid, propertyName },
        extractedBy: "deterministic_ics_parser",
        fact,
        createdAt: request.createdAt,
      }));
    } catch {
      issue(issues, "error", "candidate.invalid", path, "The mapped calendar component cannot become a bounded course-source candidate.");
    }
  });
  return candidates.sort((left, right) => left.candidateId.localeCompare(right.candidateId));
}

/**
 * Transient, deterministic ingestion into review-only course-source metadata.
 * It performs no I/O and never retains the original calendar text.
 */
export async function ingestCourseSource(value: unknown): Promise<Readonly<CourseSourceIngestionResultV1>> {
  const structural = structuralRequest(value);
  if (!structural.request) return invalidResult(structural.issues);
  const request = structural.request;
  const issues: CourseSourceIngestionIssue[] = [];

  let sourceDigest: string;
  try {
    sourceDigest = request.inputKind === "ics"
      ? await sha256Digest(request.calendarText)
      : await sha256Digest(canonicalJson({
          entries: [...request.entries].sort((left, right) => left.candidateId.localeCompare(right.candidateId)),
        }));
  } catch {
    issue(issues, "error", "ingestion.digest_unavailable", "request", "SHA-256 is unavailable; no source revision was created.");
    return invalidResult(issues, request.scope);
  }

  const revision = revisionFrom(request, sourceDigest);
  if (!revision) {
    issue(issues, "error", "revision.invalid", "request", "The source metadata cannot become a bounded course-source revision.");
    return invalidResult(issues, request.scope);
  }

  let candidates: readonly Readonly<CourseSourceCandidateV1>[];
  if (request.inputKind === "manual") {
    candidates = manualCandidates(request, issues);
  } else {
    const components = parseCalendar(request.calendarText, issues);
    candidates = components ? icsCandidates(request, components, issues) : [];
  }
  validateCoverage(revision.coverage, candidates.map((candidate) => candidate.fact), issues);
  if (issues.some((entry) => entry.severity === "error")) return invalidResult(issues, request.scope);

  const authority = {
    ...BASE_AUTHORITY,
    parserAuthority: request.inputKind === "ics"
      ? COURSE_SOURCE_ICS_SUBSET
      : "structured_manual_non_authorizing" as const,
  };
  const ordered = orderedIssues(issues);
  let ingestionDigest: string;
  try {
    ingestionDigest = await sha256Digest(canonicalJson({
      schemaVersion: COURSE_SOURCE_INGESTION_RESULT_SCHEMA_VERSION,
      status: "review_required",
      scope: request.scope,
      sourceRevision: revision,
      candidates,
      issues: ordered,
      authority,
    }));
  } catch {
    issue(issues, "error", "ingestion.digest_unavailable", "result", "SHA-256 is unavailable; no ingestion result was created.");
    return invalidResult(issues, request.scope);
  }
  return deepFreeze({
    schemaVersion: COURSE_SOURCE_INGESTION_RESULT_SCHEMA_VERSION,
    status: "review_required",
    scope: request.scope,
    sourceRevision: revision,
    candidates,
    issues: ordered,
    ingestionDigest,
    authority,
  });
}
