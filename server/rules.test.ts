import { describe, expect, it, vi } from "vitest";

const supabaseInsert = vi.hoisted(() => vi.fn().mockResolvedValue([]));
vi.mock("./supabase", () => ({ supabaseInsert, supabaseSelect: vi.fn().mockResolvedValue([]), supabaseUpdate: vi.fn() }));

import { saveRule } from "./trading";

describe("strategy rule append payload", () => {
  it("omits unsupported file_name and keeps append fields", async () => {
    await saveRule("application/pdf", "Only trade with trend", "rules.pdf");
    expect(supabaseInsert).toHaveBeenCalledWith("strategy_rules", expect.objectContaining({ content: "Only trade with trend", created_at: expect.any(String) }));
    expect(supabaseInsert.mock.calls[0]?.[1]).not.toHaveProperty("file_name");
    expect(supabaseInsert.mock.calls[0]?.[1]).not.toHaveProperty("rule_text");
    expect(supabaseInsert.mock.calls[0]?.[1]).not.toHaveProperty("source");
  });
});
