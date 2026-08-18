import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { auditSignal, extractDocumentText, fetchMarketData, loadRules, parseTradeSignal, saveRule, ASSETS } from "./trading";
import { supabaseInsert, supabaseSelect } from "./supabase";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  rules: router({
    list: protectedProcedure.query(async () => supabaseSelect("strategy_rules", "select=*&order=created_at.desc")),
    ingest: protectedProcedure.input(z.object({ content: z.string().min(3), source: z.string().default("text"), fileName: z.string().optional() })).mutation(async ({ input, ctx }) => {
      const rows = await saveRule(input.source, input.content, input.fileName);
      return { success: true, rows, preview: input.content.slice(0, 180), owner: ctx.user.openId };
    }),
    ingestFile: protectedProcedure.input(z.object({ fileName: z.string(), mimeType: z.string(), base64: z.string() })).mutation(async ({ input }) => {
      const content = await extractDocumentText(input.fileName, input.mimeType, Buffer.from(input.base64, "base64"));
      if (!content.trim()) throw new Error("No readable text was found in the document");
      const rows = await saveRule(input.mimeType, content, input.fileName);
      return { success: true, rows, characters: content.length };
    }),
  }),
  audit: router({
    create: protectedProcedure.input(z.object({ rawText: z.string().min(5) })).mutation(async ({ input, ctx }) => {
      const signal = parseTradeSignal(input.rawText);
      const market = await fetchMarketData(signal.asset, signal.timeframe ?? "15min");
      const rules = await loadRules();
      const review = await auditSignal(signal, market, rules);
      const row = { owner_open_id: ctx.user.openId, raw_signal: input.rawText, asset: signal.asset, timeframe: signal.timeframe ?? null, direction: signal.direction, entry: signal.entry ?? null, stop_loss: signal.stopLoss ?? null, take_profit: signal.takeProfit ?? null, verdict: review.verdict === "TRADE APPROVED" ? "TRADE APPROVED" : "TRADE DENIED", confidence: Number(review.confidence ?? 0), adjustments: review.adjustments ?? "None", rationale: review.rationale ?? "", created_at: new Date().toISOString() };
      await supabaseInsert("audited_trades", row);
      return { ...review, verdict: row.verdict, signal };
    }),
    list: protectedProcedure.query(async () => supabaseSelect("audited_trades", "select=*&order=created_at.desc&limit=50")),
  }),
  history: router({
    all: protectedProcedure.query(async () => {
      const [audits, signals] = await Promise.all([
        supabaseSelect("audited_trades", "select=*&order=created_at.desc&limit=50"),
        supabaseSelect("trade_signals", "select=*&order=created_at.desc&limit=50"),
      ]);
      return { audits, signals };
    }),
  }),
  scanner: router({
    status: protectedProcedure.query(() => ({ assets: ASSETS, interval: "5 minutes", timeframes: ["15min", "1h"], mode: "autonomous" })),
  }),
});

export type AppRouter = typeof appRouter;
