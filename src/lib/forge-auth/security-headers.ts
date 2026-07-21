export function createRequestNonce(): string {
  return crypto.randomUUID().replaceAll("-", "");
}

export function forgeContentSecurityPolicy(nonce: string, development: boolean): string {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ""}`,
    `connect-src 'self'${development ? " ws: wss:" : ""}`,
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    ...(development ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}
