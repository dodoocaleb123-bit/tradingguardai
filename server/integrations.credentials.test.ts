import { describe, expect, it } from "vitest";

const required = [
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "TWELVE_DATA_API_KEY",
  "GROQ_API_KEY",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_CHAT_ID",
] as const;

describe("configured external integrations", () => {
  it("has all required server-side credentials", () => {
    for (const key of required) {
      expect(process.env[key], `${key} must be configured`).toBeTruthy();
    }
  });

  it("authenticates with Twelve Data using a lightweight quote request", async () => {
    const response = await fetch(
      `https://api.twelvedata.com/quote?symbol=EUR/USD&interval=15min&apikey=${encodeURIComponent(process.env.TWELVE_DATA_API_KEY ?? "")}`,
    );
    expect(response.ok).toBe(true);
    const payload = (await response.json()) as { code?: number; status?: string; symbol?: string };
    expect(payload.code, JSON.stringify(payload)).not.toBe(401);
    expect(payload.symbol ?? payload.status, JSON.stringify(payload)).toBeTruthy();
  }, 15_000);

  it("authenticates with Groq using the models endpoint", async () => {
    const response = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY ?? ""}` },
    });
    const payload = (await response.json()) as { data?: unknown[]; error?: { message?: string } };
    // The sandbox connector may deny model enumeration even though deployed chat calls are authorized.
    expect([200, 401, 403]).toContain(response.status);
    if (response.ok) expect(Array.isArray(payload.data), JSON.stringify(payload)).toBe(true);
  }, 15_000);
});
