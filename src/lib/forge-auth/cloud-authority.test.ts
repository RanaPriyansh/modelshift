import { describe, expect, it } from "vitest";

import { isForgeCloudAuthAuthorityEnabled, readForgeCloudAuthority } from "./cloud-authority";

describe("FORGE structural cloud authority", () => {
  it("keeps complete-looking retired cloud environment values disabled", () => {
    const environment = {
      FORGE_CLOUD_ACCOUNTS_ENABLED: "true",
      FORGE_SUPABASE_URL: "https://forge-test.supabase.co",
      FORGE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_key_1234567890",
    };
    expect(readForgeCloudAuthority(environment)).toEqual({
      cloudAccountsEnabled: false,
      cloudAuthConfigured: false,
      deviceProfiles: "device_only",
      learnerEvidenceSync: "disabled",
    });
    expect(isForgeCloudAuthAuthorityEnabled(environment)).toBe(false);
  });
});
