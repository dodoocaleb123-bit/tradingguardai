import { describe, expect, it, vi } from "vitest";
import { fetchMarketData, parseTradeSignal } from "./trading";

describe("parseTradeSignal", () => {
  it("parses a structured forex signal", () => {
    const result = parseTradeSignal("Asset: EUR/USD\nTimeframe: 15MIN\nDirection: SELL\nEntry: 1.15789\nStop Loss: 1.1582\nTake Profit: 1.1573\nRisk/Reward: 1:2");
    expect(result).toMatchObject({ asset: "EUR/USD", timeframe: "15MIN", direction: "SELL", entry: 1.15789, stopLoss: 1.1582, takeProfit: 1.1573, riskReward: "1:2" });
  });

  it("normalizes compact crypto symbols", () => {
    expect(parseTradeSignal("BTCUSD BUY Entry: 63190 Stop Loss: 63403 Take Profit: 62764")).toMatchObject({ asset: "BTC/USD", direction: "BUY" });
  });

  it("rejects incomplete ideas without asset or direction", () => {
    expect(() => parseTradeSignal("Entry: 1.2 Stop Loss: 1.1")).toThrow();
  });
});

describe("Twelve Data market symbols", () => {
  it("keeps slash-formatted symbols in the request", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ values: [{ close: "1.1" }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await fetchMarketData("EUR/USD", "15min");
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("symbol=EUR%2FUSD");
  });
});

describe("TradingGuardAI vocabulary", () => {
  it("keeps the required decision and outcome labels explicit", () => {
    const verdicts = ["TRADE APPROVED", "TRADE DENIED"] as const;
    const outcomes = ["WIN", "LOSS"] as const;
    expect(verdicts).toEqual(["TRADE APPROVED", "TRADE DENIED"]);
    expect(outcomes).toEqual(["WIN", "LOSS"]);
  });
});
