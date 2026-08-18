import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ supabaseSelect: vi.fn(), supabaseUpdate: vi.fn(), supabaseInsert: vi.fn() }));
const { supabaseSelect, supabaseUpdate, supabaseInsert } = mocks;
vi.mock("./supabase", () => mocks);

import { trackOpenSignals } from "./trading";

describe("trackOpenSignals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("GROQ_API_KEY", "groq-test");
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "telegram-test");
    vi.stubEnv("TELEGRAM_CHAT_ID", "chat-test");
    supabaseSelect.mockImplementation((table: string) => {
      if (table === "trade_signals") return Promise.resolve([{ id: "signal-1", asset: "EUR/USD", timeframe: "15min", direction: "BUY", stop_loss: 1.1, take_profit: 1.2 }]);
      if (table === "strategy_rules") return Promise.resolve([{ rule_text: "Only trade with trend" }]);
      return Promise.resolve([]);
    });
    supabaseUpdate.mockResolvedValue([]);
    supabaseInsert.mockResolvedValue([]);
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ values: [{ high: "1.15", low: "1.09", close: "1.1" }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ lesson: "Stop was too close to volatility.", guardrail: "Require volatility-adjusted stops." }) } }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 })));
  });

  it("closes a stopped BUY as LOSS and saves a forensic lesson", async () => {
    const result = await trackOpenSignals();
    expect(result).toEqual({ tracked: 1, closed: 1 });
    expect(supabaseUpdate).toHaveBeenCalledWith("trade_signals", "id=eq.signal-1", expect.objectContaining({ status: "CLOSED", outcome: "LOSS" }));
    expect(supabaseInsert).toHaveBeenCalledWith("lessons_learned", expect.objectContaining({ asset_pair: "EURUSD", lesson_learned: expect.stringContaining("volatility-adjusted stops") }));
  });
});
