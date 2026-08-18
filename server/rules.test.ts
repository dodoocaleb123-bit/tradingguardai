import { describe, expect, it, vi } from "vitest";

const supabaseInsert = vi.hoisted(() => vi.fn().mockResolvedValue([]));
vi.mock("./supabase", () => ({ supabaseInsert, supabaseSelect: vi.fn().mockResolvedValue([]), supabaseUpdate: vi.fn() }));

import { saveRule } from "./trading";

describe("strategy rule append payload", () => {
  it("omits unsupported file_name and keeps append fields", async () => {
    await saveRule("application/pdf", "Only trade with trend", "rules.pdf");
    expect(supabaseInsert).toHaveBeenCalledWith("strategy_rules", expect.objectContaining({ source: "application/pdf", content: "Only trade with trend", rule_text: "Only trade with trend" }));
    expect(supabaseInsert.mock.calls[0]?.[1]).not.toHaveProperty("file_name");
  });
});
