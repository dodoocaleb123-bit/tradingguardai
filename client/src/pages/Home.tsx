import { ArrowRight, Bot, CircleCheck, Radio, ShieldCheck, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RuleImporter } from "@/components/RuleImporter";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";

export default function Home() {
  const { data: status, isError: statusError } = trpc.scanner.status.useQuery();
  return <div className="mx-auto max-w-6xl space-y-8 py-4">
    <section className="grid gap-6 lg:grid-cols-[1.35fr_.65fr]">
      <div className="relative overflow-hidden rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-cyan-400/[0.12] via-slate-900 to-slate-950 p-7 md:p-10">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />
        <Badge className="border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">SETUP / 01</Badge>
        <h1 className="mt-5 max-w-2xl text-3xl font-semibold tracking-tight text-white md:text-5xl">Build your trading guardrails before the market moves.</h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-slate-300">Import the rules that define your edge. TradingGuardAI will use them as the source of truth for audits, scanning, and post-trade learning.</p>
        <div className="mt-7 flex flex-wrap gap-3 text-sm text-slate-300"><span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-cyan-300" />Rule-grounded decisions</span><span className="flex items-center gap-2"><Radio className="h-4 w-4 text-cyan-300" />5-minute market pulse</span></div>
      </div>
      <Card className="border-slate-800 bg-slate-900/70"><CardHeader><CardTitle className="flex items-center justify-between text-slate-100"><span>Scanner status</span><span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400" /></CardTitle></CardHeader><CardContent className="space-y-4"><div><p className="text-3xl font-semibold text-white">24/7</p><p className="text-sm text-slate-400">Autonomous monitoring</p>{statusError && <p className="mt-2 text-xs text-amber-300">Live scanner status is temporarily unavailable.</p>}</div><div className="grid grid-cols-2 gap-3">{(status?.assets ?? ["EUR/USD", "XAU/USD", "GBP/USD", "BTC/USD"]).map(asset => <div key={asset} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3"><p className="text-sm font-medium text-slate-200">{asset}</p><p className="mt-1 text-xs text-slate-500">15m · 1h</p></div>)}</div><Link href="/chat-audit" className="flex items-center gap-2 text-sm font-medium text-cyan-300 hover:text-cyan-200">Audit a trade idea <ArrowRight className="h-4 w-4" /></Link></CardContent></Card>
    </section>
    <section className="grid gap-6 lg:grid-cols-[.72fr_1.28fr]">
      <div className="space-y-5"><div><p className="text-sm font-medium uppercase tracking-[0.22em] text-cyan-300">Strategy memory</p><h2 className="mt-2 text-2xl font-semibold text-white">Start with your rules</h2><p className="mt-2 text-sm leading-6 text-slate-400">Your rules stay the anchor. Add more later from the Strategy Rules page as your playbook evolves.</p></div><div className="space-y-3">{[[Target,"Define the setup"],[Bot,"Audit every idea"],[CircleCheck,"Learn from outcomes"]].map(([Icon, label]) => <div key={String(label)} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4"><Icon className="h-5 w-5 text-cyan-300" /><span className="text-sm text-slate-200">{label as string}</span></div>)}</div></div>
      <Card className="border-slate-800 bg-slate-900/70"><CardHeader><CardTitle className="text-slate-100">Import strategy rules</CardTitle></CardHeader><CardContent><RuleImporter /></CardContent></Card>
    </section>
  </div>;
}
