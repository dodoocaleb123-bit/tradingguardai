import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { scanMarketCycle } from "./trading";

export async function scheduledMarketScan(req: Request, res: Response) {
  const context = { url: req.originalUrl, timestamp: new Date().toISOString() };
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron) return res.status(403).json({ error: "cron-only" });
    const result = await scanMarketCycle();
    return res.json({ ok: true, ...result });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error), context });
  }
}
