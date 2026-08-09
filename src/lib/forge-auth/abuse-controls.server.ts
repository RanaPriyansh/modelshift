import "server-only";

import { createHmac, randomBytes } from "node:crypto";

const WINDOW_MS = 15 * 60 * 1_000;
const MAX_CREDENTIAL_ATTEMPTS = 5;
const MAX_CREDENTIAL_BUCKETS = 10_000;
const MAX_EMAIL_LENGTH = 254;

export interface CloudAuthAttemptLimiter {
  consume(email: string): boolean;
}

/**
 * A short-lived backstop for credential attempts. It deliberately stores only
 * a process-keyed HMAC-SHA-256 bucket, never a raw address. This is not the
 * primary abuse control: release requires provider-side CAPTCHA and limits.
 */
export function createCloudAuthAttemptLimiter(
  now: () => number = Date.now,
  windowMs = WINDOW_MS,
  maxAttempts = MAX_CREDENTIAL_ATTEMPTS,
  maxBuckets = MAX_CREDENTIAL_BUCKETS,
): CloudAuthAttemptLimiter {
  if (!Number.isFinite(windowMs) || windowMs <= 0) {
    throw new TypeError("windowMs must be a positive finite number");
  }
  if (!Number.isInteger(maxAttempts) || maxAttempts <= 0) {
    throw new TypeError("maxAttempts must be a positive integer");
  }
  if (!Number.isInteger(maxBuckets) || maxBuckets <= 0) {
    throw new TypeError("maxBuckets must be a positive integer");
  }

  const buckets = new Map<string, { count: number; resetAt: number }>();
  const bucketKey = randomBytes(32);
  let nextPruneAt = Number.POSITIVE_INFINITY;

  function pruneExpired(currentTime: number): void {
    if (currentTime < nextPruneAt) return;

    let nextExpiry = Number.POSITIVE_INFINITY;
    for (const [bucket, entry] of buckets) {
      if (entry.resetAt <= currentTime) {
        buckets.delete(bucket);
      } else {
        nextExpiry = Math.min(nextExpiry, entry.resetAt);
      }
    }
    nextPruneAt = nextExpiry;
  }

  return {
    consume(email: string): boolean {
      const normalized = email.trim().toLowerCase();
      if (normalized.length === 0 || normalized.length > MAX_EMAIL_LENGTH) {
        return false;
      }

      const currentTime = now();
      if (!Number.isFinite(currentTime)) return false;
      pruneExpired(currentTime);

      const bucket = createHmac("sha256", bucketKey)
        .update(normalized)
        .digest("hex");
      const existing = buckets.get(bucket);
      if (!existing) {
        if (buckets.size >= maxBuckets) return false;
        const resetAt = currentTime + windowMs;
        buckets.set(bucket, { count: 1, resetAt });
        nextPruneAt = Math.min(nextPruneAt, resetAt);
        return true;
      }
      if (existing.count >= maxAttempts) return false;
      existing.count += 1;
      return true;
    },
  };
}

const credentialAttemptLimiter = createCloudAuthAttemptLimiter();

export function allowCloudCredentialAttempt(email: string): boolean {
  return credentialAttemptLimiter.consume(email);
}
