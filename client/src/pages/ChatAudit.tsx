import { useState } from "react";
import { AlertTriangle, CheckCircle2, ShieldCheck } from "lucide-react";
import { AIChatBox, type Message } from "@/components/AIChatBox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

export default function ChatAudit() {
  const [messages, setMessages] = useState<Message[]>([]);
  const audit = trpc.audit.create.useMutation({ onSuccess: result => setMessages(prev => [...prev, { role: "assistant", content: `**${result.verdict}**\n\nConfidence level: **${result.confidence ?? 0}%**\n\nAdjustments: ${result.adjustments ?? "None"}\n\n${result.rationale ?? "The review was grounded in your strategy rules and live market data."}` }]), onError: error => setMessages(prev => [...prev, { role: "assistant", content: `**AUDIT ERROR**\n\n${error.message}` }]) });
  return <div className="mx-auto max-w-6xl space-y-6 py-4">
    <div><Badge className="border border-violet-300/20 bg-violet-300/10 text-violet-200">LIVE AUDIT / 02</Badge><h1 className="mt-3 text-3xl font-semibold text-white">Trade idea, meet your guardrails.</h1><p className="mt-2 max-w-2xl text-slate-400">Paste a raw signal with as many fields as you have. The platform fetches live candles, retrieves your rules, and returns a decisive review.</p></div>
    <div className="grid gap-6 lg:grid-cols-[1fr_.34fr]">
      <AIChatBox messages={messages} onSendMessage={content => { setMessages(prev => [...prev, { role: "user", content }]); audit.mutate({ rawText: content }); }} isLoading={audit.isPending} height="min(620px, calc(100vh - 240px))" placeholder="Paste a trade signal… e.g. Asset: EUR/USD, Direction: BUY, Entry: …" emptyStateMessage="Send a trade idea to start the audit" suggestedPrompts={["Asset: EUR/USD\nTimeframe: 15MIN\nDirection: BUY\nEntry: 1.15805\nStop Loss: 1.1577\nTake Profit: 1.1588", "Asset: BTC/USD\nDirection: SELL\nEntry: 63190\nStop Loss: 63403\nTake Profit: 62764"]} />
      <div className="space-y-4"><Card className="border-slate-800 bg-slate-900/70"><CardHeader><CardTitle className="flex items-center gap-2 text-sm text-slate-100"><ShieldCheck className="h-4 w-4 text-cyan-300" />Audit protocol</CardTitle></CardHeader><CardContent className="space-y-4 text-sm text-slate-400"><div className="flex gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /><span>Live candles for the selected asset and timeframe.</span></div><div className="flex gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /><span>Your imported strategy rules as the decision anchor.</span></div><div className="flex gap-3"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" /><span>Approval is analysis, not a guarantee of profit.</span></div></CardContent></Card><div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5"><p className="text-xs uppercase tracking-[0.2em] text-slate-500">Required verdicts</p><div className="mt-4 space-y-2 text-sm"><p className="rounded-lg bg-emerald-400/10 px-3 py-2 text-emerald-300">TRADE APPROVED</p><p className="rounded-lg bg-rose-400/10 px-3 py-2 text-rose-300">TRADE DENIED</p></div></div></div>
    </div>
  </div>;
}
