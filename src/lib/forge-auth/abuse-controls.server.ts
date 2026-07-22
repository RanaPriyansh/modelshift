import "server-only";

import { createHash } from "node:crypto";

const WINDOW_MS = 15 * 60 * 1_000;
const MAX_CREDENTIAL_ATTEMPTS = 5;

export interface CloudAuthAttemptLimiter {
  consume(email: string): boolean;
}

/**
 * A short-lived backstop for credential attempts. It deliberately stores only
 * a SHA-256 bucket, never a raw address. This is not the primary abuse
 * control: release is gated on provider-side CAPTCHA/rate limits as well.
 */
export function createCloudAuthAttemptLimiter(
  now: () => number = Date.now,
  windowMs = WINDOW_MS,
  maxAttempts = MAX_CREDENTIAL_ATTEMPTS,
): CloudAuthAttemptLimiter {
  const buckets = new Map<string, { count: number; resetAt: number }>();

  return {
    consume(email: string): boolean {
      const normalized = email.trim().toLowerCase();
      const bucket = createHash("sha256").update(normalized).digest("hex");
      const currentTime = now();
      const existing = buckets.get(bucket);
      if (!existing || existing.resetAt <= currentTime) {
        buckets.set(bucket, { count: 1, resetAt: currentTime + windowMs });
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
