/**
 * This module is deliberately framework-free. Release/evaluation tooling runs
 * under plain `tsx`, while Next-only consumers retain their `server-only`
 * boundary in config.ts.
 *
 * Cloud account authority is structural until CAPTCHA and durable distributed
 * abuse controls exist. Environment-shaped values are not authorization and
 * cannot turn on cloud identities, cloud profiles, or evidence syncing.
 */
export type ForgeCloudAuthority = {
  readonly cloudAccountsEnabled: false;
  readonly cloudAuthConfigured: false;
  readonly deviceProfiles: "device_only";
  readonly learnerEvidenceSync: "disabled";
};

const STRUCTURALLY_DISABLED_AUTHORITY: ForgeCloudAuthority = {
  cloudAccountsEnabled: false,
  cloudAuthConfigured: false,
  deviceProfiles: "device_only",
  learnerEvidenceSync: "disabled",
};

export function readForgeCloudAuthority(_environment: Readonly<Record<string, string | undefined>> = process.env): ForgeCloudAuthority {
  void _environment;
  return STRUCTURALLY_DISABLED_AUTHORITY;
}

export function isForgeCloudAuthAuthorityEnabled(environment: Readonly<Record<string, string | undefined>> = process.env): false {
  void environment;
  return false;
}
