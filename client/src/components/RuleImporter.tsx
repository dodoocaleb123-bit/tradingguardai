import { useRef, useState } from "react";
import { FileText, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export function RuleImporter({ onComplete }: { onComplete?: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [sourceName, setSourceName] = useState("");
  const textMutation = trpc.rules.ingest.useMutation({ onSuccess: () => { toast.success("Strategy rules appended"); setText(""); setSourceName(""); onComplete?.(); }, onError: e => toast.error(e.message) });
  const fileMutation = trpc.rules.ingestFile.useMutation({ onSuccess: data => { toast.success(`Imported ${data.characters.toLocaleString()} characters`); onComplete?.(); }, onError: e => toast.error(e.message) });
  const busy = textMutation.isPending || fileMutation.isPending;
  const submitText = () => { if (text.trim()) textMutation.mutate({ content: text.trim(), source: "text", fileName: sourceName || undefined }); };
  const submitFile = async (file: File) => { const base64 = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(",")[1] ?? ""); reader.onerror = reject; reader.readAsDataURL(file); }); fileMutation.mutate({ fileName: file.name, mimeType: file.type || "application/octet-stream", base64 }); };
  return <div className="space-y-5">
    <div className="rounded-2xl border border-dashed border-cyan-400/30 bg-cyan-400/[0.04] p-6 text-center transition hover:border-cyan-300/60">
      <Upload className="mx-auto mb-3 h-8 w-8 text-cyan-300" />
      <p className="font-medium text-slate-100">Import a strategy document</p>
      <p className="mt-1 text-sm text-slate-400">PDF, DOCX, or TXT · rules are appended, never replaced</p>
      <Input ref={fileRef} type="file" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" className="mx-auto mt-4 max-w-sm cursor-pointer bg-slate-950/60" disabled={busy} onChange={e => { const file = e.target.files?.[0]; if (file) void submitFile(file); }} />
    </div>
    <div className="space-y-2">
      <Label className="text-slate-300">Paste rules or add a rule block</Label>
      <Textarea value={text} onChange={e => setText(e.target.value)} placeholder="Example: Only take trades when risk/reward is at least 1:2 and the 1-hour trend agrees with the 15-minute setup..." className="min-h-36 border-slate-700 bg-slate-950/70 text-slate-100 placeholder:text-slate-600" disabled={busy} />
      <Input value={sourceName} onChange={e => setSourceName(e.target.value)} placeholder="Optional source name" className="border-slate-700 bg-slate-950/70 text-slate-100 placeholder:text-slate-600" disabled={busy} />
      <Button onClick={submitText} disabled={busy || text.trim().length < 3} className="w-full bg-cyan-400 text-slate-950 hover:bg-cyan-300">{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}Append rules</Button>
    </div>
  </div>;
}
