import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabaseInsert, supabaseSelect } from "./supabase";
import { saveLesson } from "./trading";

describe("Supabase persistence helpers", () => {
  beforeEach(() => {
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_ANON_KEY", "anon-test-key");
  });

  it("reads a table with the expected REST headers", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([{ id: 1 }]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(supabaseSelect("strategy_rules")).resolves.toEqual([{ id: 1 }]);
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/rest/v1/strategy_rules?select=*"), expect.objectContaining({ headers: expect.objectContaining({ apikey: expect.any(String), Authorization: expect.stringMatching(/^Bearer /) }) }));
  });

  it("writes lessons using asset_pair and lesson_learned", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([{ id: 3 }]), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    await saveLesson("EURUSD", "Avoid buying near 4H resistance levels");
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({ asset_pair: "EURUSD", lesson_learned: "Avoid buying near 4H resistance levels" });
  });

  it("appends a rule row without using overwrite semantics", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([{ id: 2 }]), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(supabaseInsert("strategy_rules", { content: "Rule", rule_text: "Rule" })).resolves.toEqual([{ id: 2 }]);
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: "POST", headers: expect.objectContaining({ Prefer: "return=representation" }) });
  });
});
