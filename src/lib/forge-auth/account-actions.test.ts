import { afterEach, describe, expect, it, vi } from "vitest";

const redirect = vi.hoisted(() => vi.fn((location: string): never => {
  throw new Error(`redirect:${location}`);
}));
const revalidatePath = vi.hoisted(() => vi.fn());
const createForgeSupabaseServerClient = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/src/lib/forge-auth/supabase.server", () => ({ createForgeSupabaseServerClient }));

import { signIn, signUpAdult } from "../../../app/account/actions";

function credentials() {
  const formData = new FormData();
  formData.set("email", "adult@example.test");
  formData.set("password", "safely-long-password");
  return formData;
}

afterEach(() => {
  redirect.mockClear();
  revalidatePath.mockClear();
  createForgeSupabaseServerClient.mockReset();
});

describe("adult cloud account actions", () => {
  it("rejects direct self-service signup even when the caller supplies an adult checkbox", async () => {
    const formData = credentials();
    formData.set("adult-confirmation", "confirmed");

    await expect(signUpAdult(formData)).rejects.toThrow("redirect:/login?status=adult-enrollment-unavailable");
    expect(createForgeSupabaseServerClient).not.toHaveBeenCalled();
  });

  it("signs a non-adult or unprovisioned session straight back out after direct action invocation", async () => {
    const signOut = vi.fn().mockResolvedValue({ error: null });
    createForgeSupabaseServerClient.mockResolvedValue({
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({ data: { user: { id: "adult-candidate" } }, error: null }),
        signOut,
      },
      schema: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) }),
          }),
        }),
      }),
    });

    await expect(signIn(credentials())).rejects.toThrow("redirect:/login?status=adult-account-required");
    expect(signOut).toHaveBeenCalledOnce();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
