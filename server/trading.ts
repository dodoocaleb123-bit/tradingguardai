import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import { supabaseInsert, supabaseSelect } from "./supabase";

export const ASSETS = ["EUR/USD", "XAU/USD", "GBP/USD", "BTC/USD"] as const;
export const TIMEFRAMES = ["15min", "1h"] as const;

export type ParsedSignal = {
  asset: string;
  timeframe?: string;
  direction: "BUY" | "SELL";
  entry?: number;
  stopLoss?: number;
  takeProfit?: number;
  riskReward?: string;
};

export async function extractDocumentText(fileName: string, mimeType: string, bytes: Buffer) {
  const lower = fileName.toLowerCase();
  if (mimeType.includes("text") || lower.endsWith(".txt")) return bytes.toString("utf8");
  if (mimeType.includes("word") || lower.endsWith(".docx")) {
    const result = await mammoth.extractRawText({ buffer: bytes });
    return result.value;
  }
  if (mimeType.includes("pdf") || lower.endsWith(".pdf")) {
    const parser = new PDFParse({ data: bytes });
    const result = await parser.getText();
    await parser.destroy();
    return result.text;
  }
  throw new Error("Only PDF, DOCX, and plain text files are supported");
}

export function parseTradeSignal(input: string): ParsedSignal {
  const normalized = input.replace(/[•*_]/g, " ").replace(/\s+/g, " ").trim();
  const find = (patterns: RegExp[]) => {
    for (const pattern of patterns) {
      const match = normalized.match(pattern);
      if (match?.[1]) return match[1].trim();
    }
    return undefined;
  };
  const asset = find([/(?:asset|symbol)\s*:\s*([A-Z]{3}\s*\/\s*[A-Z]{3}|XAUUSD|BTCUSD)/i, /\b(EUR\/USD|GBP\/USD|XAU\/USD|BTC\/USD|XAUUSD|BTCUSD)\b/i]);
  const direction = find([/direction\s*:\s*(BUY|SELL)/i, /\b(BUY|SELL)\b/i])?.toUpperCase() as "BUY" | "SELL" | undefined;
  if (!asset || !direction) throw new Error("Include an asset and BUY or SELL direction");
  const numberAfter = (label: string) => {
    const value = find([new RegExp(`(?:${label})\\s*[:=]\\s*([0-9]+(?:\\.[0-9]+)?)`, "i")]);
    return value ? Number(value) : undefined;
  };
  return {
    asset: asset.replace(/\s/g, "").replace("XAUUSD", "XAU/USD").replace("BTCUSD", "BTC/USD"),
    timeframe: find([/timeframe\s*:\s*([\w]+)/i]),
    direction,
    entry: numberAfter("entry"),
    stopLoss: numberAfter("stop\\s*loss|sl"),
    takeProfit: numberAfter("take\\s*profit|tp"),
    riskReward: find([/risk\s*\/?\s*reward\s*:\s*([0-9]+\s*:\s*[0-9]+)/i]),
  };
}

export async function fetchMarketData(asset: string, interval: string) {
  const symbol = asset.replace("/", "");
  const response = await fetch(`https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}&interval=${interval}&outputsize=30&apikey=${encodeURIComponent(process.env.TWELVE_DATA_API_KEY ?? "")}`);
  const payload = await response.json() as { values?: Array<Record<string, string>>; message?: string };
  if (!response.ok || !payload.values) throw new Error(payload.message ?? "Market data unavailable");
  return payload.values;
}

async function groqCompletion(messages: Array<{ role: string; content: string }>) {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY ?? ""}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "llama-3.1-8b-instant", temperature: 0.1, messages, response_format: { type: "json_object" } }),
  });
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } };
  if (!response.ok) throw new Error(payload.error?.message ?? "Groq request failed");
  return JSON.parse(payload.choices?.[0]?.message?.content ?? "{}");
}

export async function auditSignal(signal: ParsedSignal, market: Array<Record<string, string>>, rules: string) {
  return groqCompletion([
    { role: "system", content: "You are TradingGuardAI. Audit trade ideas against the supplied rules and market candles. Return JSON with verdict exactly TRADE APPROVED or TRADE DENIED, confidence number 0-100, adjustments string, rationale string. Never promise profits." },
    { role: "user", content: JSON.stringify({ signal, market, rules }) },
  ]);
}

export async function generateSetup(asset: string, timeframe: string, market: Array<Record<string, string>>, rules: string) {
  return groqCompletion([
    { role: "system", content: "You are a disciplined market scanner. Return JSON only. If no valid setup exists, return {\"setup\":false}. Otherwise return setup true plus direction BUY or SELL, entry, stopLoss, takeProfit, riskReward, confidence, rationale. Use only the supplied candles and strategy rules; do not invent current prices." },
    { role: "user", content: JSON.stringify({ asset, timeframe, market, rules }) },
  ]);
}

export async function sendTelegram(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) throw new Error("Telegram is not configured");
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: chatId, text }) });
  if (!response.ok) throw new Error(`Telegram ${response.status}`);
}

export async function loadRules() {
  const rows = await supabaseSelect<Array<{ rule_text?: string; content?: string; text?: string }>>("strategy_rules", "select=*&order=created_at.desc");
  return rows.map(row => row.rule_text ?? row.content ?? row.text ?? "").filter(Boolean).join("\n\n");
}

export async function saveRule(source: string, content: string, fileName?: string) {
  return supabaseInsert("strategy_rules", { source, content, rule_text: content, file_name: fileName ?? null, created_at: new Date().toISOString() });
}

export async function saveLesson(assetPair: string, lesson: string, embedding?: number[]) {
  const row: Record<string, unknown> = { asset_pair: assetPair, lesson_learned: lesson, created_at: new Date().toISOString() };
  // The existing table exposes a vector column, but its default/nullability is owned by Supabase.
  // Omit it unless a real embedding is supplied so the app remains compatible with that schema.
  if (embedding?.length) row.embedding = embedding;
  return supabaseInsert("lessons_learned", row);
}

export async function scanMarketCycle() {
  const rules = await loadRules();
  if (!rules.trim()) return { scanned: 0, signals: 0, skipped: "No strategy rules have been ingested" };
  let scanned = 0;
  let signals = 0;
  for (const asset of ASSETS) {
    for (const timeframe of TIMEFRAMES) {
      scanned += 1;
      try {
        const market = await fetchMarketData(asset, timeframe);
        const setup = await generateSetup(asset, timeframe, market, rules);
        if (!setup.setup) continue;
        const row = { asset, timeframe, direction: setup.direction, entry: Number(setup.entry), stop_loss: Number(setup.stopLoss), take_profit: Number(setup.takeProfit), risk_reward: String(setup.riskReward ?? "1:2"), confidence: Number(setup.confidence ?? 0), rationale: setup.rationale ?? "", status: "OPEN", outcome: null, created_at: new Date().toISOString() };
        await supabaseInsert("trade_signals", row);
        await sendTelegram(["TRADINGUARD AI SIGNAL", `Asset: ${asset}`, `Timeframe: ${timeframe.toUpperCase()}`, `Direction: ${row.direction}`, `Entry: ${row.entry}`, `Stop Loss: ${row.stop_loss}`, `Take Profit: ${row.take_profit}`, `Risk/Reward: ${row.risk_reward}`, `Confidence level: ${row.confidence}%`].join("\\n"));
        signals += 1;
      } catch (error) {
        console.error(`[Scanner] ${asset} ${timeframe} failed`, error);
      }
    }
  }
  return { scanned, signals };
}
