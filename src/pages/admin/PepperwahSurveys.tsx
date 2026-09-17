import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Pencil, Trash2, Copy, Plus, X, ExternalLink, RefreshCw, ClipboardList, CheckCircle, MousePointer } from "lucide-react";

const SUPABASE_URL = "https://gyafunimpnzctpfbqkgm.supabase.co";
const WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/receive-pepperwahl`;
const POSTBACK_URL = `${SUPABASE_URL}/functions/v1/pepperwahl-postback?uid={uid}&survey_id={survey_id}&txn_id={txn_id}&status={status}`;

interface PepperwahSurvey {
  id: string;
  survey_id: string;
  survey_name: string;
  survey_link: string;
  description: string | null;
  payout_usd: number;
  country: string | null;
  min_age: number;
  max_age: number;
  loi_minutes: number | null;
  survey_type: string | null;
  notes: string | null;
  expiry_date: string | null;
  questions: Question[];
  status: string;
  received_at: string;
  updated_at: string;
}

interface Question {
  question: string;
  options: string[];
  qualify_if: string[];
}

interface Completion {
  id: string;
  survey_id: string;
  user_id: string | null;
  username: string | null;
  uid_passed: string | null;
  status: string;
  txn_id: string | null;
  clicked_at: string;
  completed_at: string | null;
}

interface PostbackLog {
  id: string;
  survey_id: string | null;
  uid: string | null;
  txn_id: string | null;
  status_raw: string | null;
  normalized: string | null;
  user_id: string | null;
  username: string | null;
  ip_address: string | null;
  raw_params: Record<string, any> | null;
  error: string | null;
  created_at: string;
}

const emptyQuestion = (): Question => ({ question: "", options: [""], qualify_if: [] });

export default function PepperwahSurveys() {
  const [surveys, setSurveys] = useState<PepperwahSurvey[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [postbackLogs, setPostbackLogs] = useState<PostbackLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<PepperwahSurvey | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editExpiry, setEditExpiry] = useState("");
  const [editCountry, setEditCountry] = useState("");
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    const [{ data: s }, { data: c }, { data: p }] = await Promise.all([
      supabase.from("pepperwahl_surveys").select("*").order("received_at", { ascending: false }),
      supabase.from("pepperwahl_completions").select("*").order("clicked_at", { ascending: false }).limit(200),
      supabase.from("pepperwahl_postback_logs").select("*").order("created_at", { ascending: false }).limit(200),
    ]);
    setSurveys((s || []).map(parseSurvey));
    setCompletions(c || []);
    setPostbackLogs(p || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const parseSurvey = (raw: any): PepperwahSurvey => ({
    ...raw,
    questions: Array.isArray(raw.questions) ? raw.questions : [],
  });

  // Toggle active/inactive
  const toggleStatus = async (survey: PepperwahSurvey) => {
    const newStatus = survey.status === "active" ? "inactive" : "active";
    const { error } = await supabase
      .from("pepperwahl_surveys")
      .update({ status: newStatus })
      .eq("id", survey.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: newStatus === "active" ? "Survey activated" : "Survey deactivated" });
    load();
  };

  // Delete survey
  const del = async (id: string) => {
    const { error } = await supabase.from("pepperwahl_surveys").delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Deleted" });
    load();
  };

  // Open edit dialog
  const openEdit = (survey: PepperwahSurvey) => {
    setEditing(survey);
    setQuestions(survey.questions.map(q => ({
      question: q.question,
      options: q.options.length ? [...q.options] : [""],
      qualify_if: [...q.qualify_if],
    })));
    setEditName(survey.survey_name);
    setEditDesc(survey.description || "");
    setEditExpiry(survey.expiry_date || "");
    setEditCountry(survey.country || "");
  };

  // Save edits
  const saveEdit = async () => {
    if (!editing) return;
    const { error } = await supabase
      .from("pepperwahl_surveys")
      .update({
        survey_name: editName,
        description: editDesc || null,
        expiry_date: editExpiry || null,
        country: editCountry || null,
        questions,
      })
      .eq("id", editing.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Saved!" });
    setEditing(null);
    load();
  };

  // Question editors
  const addQuestion = () => setQuestions(q => [...q, emptyQuestion()]);
  const removeQuestion = (i: number) => setQuestions(q => q.filter((_, idx) => idx !== i));
  const updateQuestion = (i: number, field: keyof Question, value: any) =>
    setQuestions(q => q.map((item, idx) => idx === i ? { ...item, [field]: value } : item));

  const addOption = (qi: number) =>
    setQuestions(q => q.map((item, idx) => idx === qi ? { ...item, options: [...item.options, ""] } : item));
  const removeOption = (qi: number, oi: number) =>
    setQuestions(q => q.map((item, idx) => idx === qi
      ? { ...item, options: item.options.filter((_, o) => o !== oi), qualify_if: item.qualify_if.filter(v => v !== item.options[oi]) }
      : item
    ));
  const updateOption = (qi: number, oi: number, val: string) =>
    setQuestions(q => q.map((item, idx) => idx === qi
      ? { ...item, options: item.options.map((o, j) => j === oi ? val : o) }
      : item
    ));
  const toggleQualify = (qi: number, option: string) =>
    setQuestions(q => q.map((item, idx) => idx === qi
      ? { ...item, qualify_if: item.qualify_if.includes(option) ? item.qualify_if.filter(v => v !== option) : [...item.qualify_if, option] }
      : item
    ));

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copied!` });
  };

  const getSurveyPublicUrl = (surveyId: string) =>
    `${window.location.origin}/survey/pepperwahl/${surveyId}`;

  const filtered = surveys.filter(s =>
    s.survey_name.toLowerCase().includes(search.toLowerCase()) ||
    s.survey_id.toLowerCase().includes(search.toLowerCase()) ||
    (s.country || "").toLowerCase().includes(search.toLowerCase())
  );

  // Stats
  const totalClicks = completions.filter(c => c.status === "clicked" || c.status === "completed").length;
  const totalCompleted = completions.filter(c => c.status === "completed").length;
  const activeSurveys = surveys.filter(s => s.status === "active").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Pepperwahl Surveys</h1>
          <p className="text-sm text-muted-foreground">Manage surveys received from Pepperwahl</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Surveys", value: surveys.length, icon: ClipboardList },
          { label: "Active", value: activeSurveys, icon: CheckCircle },
          { label: "Total Clicks", value: totalClicks, icon: MousePointer },
          { label: "Completions", value: totalCompleted, icon: CheckCircle },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center gap-3">
              <Icon className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-xl font-bold">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="surveys">
        <TabsList>
          <TabsTrigger value="surveys">Surveys</TabsTrigger>
          <TabsTrigger value="completions">Clicks & Completions</TabsTrigger>
          <TabsTrigger value="postback-logs">Postback Logs</TabsTrigger>
          <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
        </TabsList>

        {/* ── Surveys tab ── */}
        <TabsContent value="surveys" className="space-y-4 mt-4">
          <Input
            placeholder="Search by name, ID, country…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="max-w-sm"
          />

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Survey ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>LOI</TableHead>
                    <TableHead>Questions</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                        Loading…
                      </TableCell>
                    </TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                        No surveys received yet. Share the webhook URL with Pepperwahl.
                      </TableCell>
                    </TableRow>
                  ) : filtered.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-xs">{s.survey_id}</TableCell>
                      <TableCell className="font-medium max-w-[180px] truncate">{s.survey_name}</TableCell>
                      <TableCell>{s.country || "All"}</TableCell>
                      <TableCell className="text-xs">{s.min_age}–{s.max_age}</TableCell>
                      <TableCell className="text-xs">{s.loi_minutes ? `${s.loi_minutes}m` : "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{s.questions.length} Q</Badge>
                      </TableCell>
                      <TableCell className="text-xs">{s.expiry_date || "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={s.status === "active"}
                            onCheckedChange={() => toggleStatus(s)}
                          />
                          <Badge variant={s.status === "active" ? "default" : "secondary"}>
                            {s.status}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm" variant="outline"
                            onClick={() => copy(getSurveyPublicUrl(s.survey_id), "Survey link")}
                            title="Copy public survey link"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm" variant="outline"
                            onClick={() => window.open(getSurveyPublicUrl(s.survey_id), "_blank")}
                            title="Open pre-screening page"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm" variant="outline"
                            onClick={() => openEdit(s)}
                            title="Edit survey"
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm" variant="outline"
                            onClick={() => del(s.id)}
                            title="Delete survey"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Completions tab ── */}
        <TabsContent value="completions" className="space-y-4 mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Survey ID</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>UID Passed</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>TXN ID</TableHead>
                    <TableHead>Clicked At</TableHead>
                    <TableHead>Completed At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                        No activity yet
                      </TableCell>
                    </TableRow>
                  ) : completions.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-xs">{c.survey_id}</TableCell>
                      <TableCell>{c.username || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{c.uid_passed || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={
                          c.status === "completed" ? "default" :
                          c.status === "disqualified" ? "destructive" : "secondary"
                        }>
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{c.txn_id || "—"}</TableCell>
                      <TableCell className="text-xs">{new Date(c.clicked_at).toLocaleString()}</TableCell>
                      <TableCell className="text-xs">
                        {c.completed_at ? new Date(c.completed_at).toLocaleString() : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Postback Logs tab ── */}
        <TabsContent value="postback-logs" className="space-y-4 mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Survey ID</TableHead>
                    <TableHead>UID</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>TXN ID</TableHead>
                    <TableHead>Status (raw)</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {postbackLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                        No postbacks received yet
                      </TableCell>
                    </TableRow>
                  ) : postbackLogs.map(log => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{log.survey_id || "—"}</TableCell>
                      <TableCell className="font-mono text-xs max-w-[120px] truncate">{log.uid || "—"}</TableCell>
                      <TableCell>{log.username || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{log.txn_id || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{log.status_raw || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={
                          log.normalized === "success"   ? "default"     :
                          log.normalized === "duplicate" ? "secondary"   :
                          log.normalized === "ignored"   ? "secondary"   :
                          log.normalized === "not_found" ? "outline"     : "destructive"
                        }>
                          {log.normalized || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{log.ip_address || "—"}</TableCell>
                      <TableCell className="text-xs text-destructive max-w-[160px] truncate">
                        {log.error || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Endpoints tab ── */}
        <TabsContent value="endpoints" className="space-y-4 mt-4">
          <Card>
            <CardContent className="p-5 space-y-5">
              <div>
                <p className="text-sm font-semibold mb-1">Webhook URL (share with Pepperwahl to receive surveys)</p>
                <p className="text-xs text-muted-foreground mb-2">
                  Pepperwahl POSTs survey data here. Accepts single JSON object or array.
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-muted rounded px-3 py-2 break-all">{WEBHOOK_URL}</code>
                  <Button size="sm" variant="outline" onClick={() => copy(WEBHOOK_URL, "Webhook URL")}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold mb-1">Postback URL (share with Pepperwahl for completions)</p>
                <p className="text-xs text-muted-foreground mb-2">
                  Pepperwahl fires this when a user completes a survey. Placeholders are replaced by Pepperwahl automatically.
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-muted rounded px-3 py-2 break-all">{POSTBACK_URL}</code>
                  <Button size="sm" variant="outline" onClick={() => copy(POSTBACK_URL, "Postback URL")}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t border-border">
                <p><span className="font-medium">{"{uid}"}</span> — the user identifier passed in the survey link</p>
                <p><span className="font-medium">{"{survey_id}"}</span> — Pepperwahl's survey ID</p>
                <p><span className="font-medium">{"{txn_id}"}</span> — unique transaction ID (for deduplication)</p>
                <p><span className="font-medium">{"{status}"}</span> — completion status (1 = success)</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Edit dialog ── */}
      <Dialog open={!!editing} onOpenChange={v => { if (!v) setEditing(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Survey — {editing?.survey_id}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Basic fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Survey Name</label>
                <Input value={editName} onChange={e => setEditName(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Country</label>
                <Input value={editCountry} onChange={e => setEditCountry(e.target.value)} placeholder="e.g. US" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Expiry Date</label>
                <Input type="date" value={editExpiry} onChange={e => setEditExpiry(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Description</label>
              <Textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={2} />
            </div>

            {/* Pre-screening questions */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Pre-screening Questions</p>
                <Button size="sm" variant="outline" onClick={addQuestion}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Question
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Users must answer every question with one of the "Qualifying" answers to proceed. Fail any one → disqualified.
              </p>

              {questions.length === 0 && (
                <p className="text-xs text-muted-foreground italic">No questions. Users go directly to the survey.</p>
              )}

              {questions.map((q, qi) => (
                <Card key={qi} className="border border-border">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start gap-2">
                      <div className="flex-1">
                        <label className="text-xs text-muted-foreground">Question {qi + 1}</label>
                        <Input
                          value={q.question}
                          onChange={e => updateQuestion(qi, "question", e.target.value)}
                          placeholder="Enter question text…"
                        />
                      </div>
                      <Button
                        size="sm" variant="ghost"
                        className="mt-5 text-destructive hover:text-destructive"
                        onClick={() => removeQuestion(qi)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-muted-foreground">Options (check = qualifies user)</label>
                        <Button size="sm" variant="ghost" className="text-xs h-6 px-2" onClick={() => addOption(qi)}>
                          <Plus className="h-3 w-3 mr-1" /> Option
                        </Button>
                      </div>
                      {q.options.map((opt, oi) => (
                        <div key={oi} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-primary"
                            checked={q.qualify_if.includes(opt)}
                            onChange={() => toggleQualify(qi, opt)}
                            title="Check to mark this answer as qualifying"
                          />
                          <Input
                            value={opt}
                            onChange={e => updateOption(qi, oi, e.target.value)}
                            placeholder={`Option ${oi + 1}`}
                            className="flex-1 h-8 text-sm"
                          />
                          <Button
                            size="sm" variant="ghost"
                            className="text-muted-foreground hover:text-destructive h-8 w-8 p-0"
                            onClick={() => removeOption(qi, oi)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                      {q.qualify_if.length > 0 && (
                        <p className="text-xs text-green-600 dark:text-green-400">
                          Qualifying: {q.qualify_if.join(", ")}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={saveEdit}>Save Changes</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
