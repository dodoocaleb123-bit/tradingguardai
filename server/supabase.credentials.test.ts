import { describe, expect, it } from "vitest";

describe("Supabase credentials", () => {
  it("can read the strategy_rules REST table", async () => {
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/strategy_rules?select=id&limit=1`, {
      headers: {
        apikey: process.env.SUPABASE_ANON_KEY ?? "",
        Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY ?? ""}`,
      },
    });
    expect(response.ok).toBe(true);
  }, 15_000);
});
