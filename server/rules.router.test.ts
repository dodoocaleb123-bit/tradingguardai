import { describe, expect, it, vi } from "vitest";

const saveRule = vi.hoisted(() => vi.fn().mockResolvedValue([{ id: "rule-1" }]));
const extractDocumentText = vi.hoisted(() => vi.fn().mockResolvedValue("Only trade with trend"));
vi.mock("./trading", () => ({ saveRule, extractDocumentText, fetchMarketData: vi.fn(), loadRules: vi.fn(), parseTradeSignal: vi.fn(), auditSignal: vi.fn(), ASSETS: ["EUR/USD", "XAU/USD", "GBP/USD", "BTC/USD"] }));

import { appRouter } from "./routers";

describe("rules router", () => {
  const ctx = {
    user: { id: 1, openId: "owner", name: "Owner", email: "owner@example.com", loginMethod: "test", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} },
    res: {},
  } as any;

  it("appends pasted rules through the persistence helper", async () => {
    const result = await appRouter.createCaller(ctx).rules.ingest({ content: "Only trade with trend", source: "text" });
    expect(result.success).toBe(true);
    expect(saveRule).toHaveBeenCalledWith("text", "Only trade with trend", undefined);
  });

  it("extracts and appends uploaded document rules", async () => {
    const result = await appRouter.createCaller(ctx).rules.ingestFile({ fileName: "rules.pdf", mimeType: "application/pdf", base64: Buffer.from("pdf").toString("base64") });
    expect(result).toMatchObject({ success: true, characters: 21 });
    expect(saveRule).toHaveBeenCalledWith("application/pdf", "Only trade with trend", "rules.pdf");
  });
});
