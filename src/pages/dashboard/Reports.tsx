import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart2 } from "lucide-react";

interface ReportRow {
  date: string;
  survey_name: string;
  clicks: number;
  completions: number;
}

const Reports = () => {
  const { profile } = useAuth();
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) { setLoading(false); return; }
    fetchReport();
  }, [profile?.id]);

  const fetchReport = async () => {
    setLoading(true);

    // Fetch all completions for this user with survey name joined
    const { data, error } = await supabase
      .from("pepperwahl_completions")
      .select("id, status, uid_passed, clicked_at, survey_id")
      .eq("user_id", profile!.id)
      .order("clicked_at", { ascending: false });

    if (error) { console.error(error); setLoading(false); return; }

    // Fetch survey names
    const { data: surveys } = await supabase
      .from("pepperwahl_surveys")
      .select("survey_id, survey_name");

    const surveyMap: Record<string, string> = {};
    (surveys || []).forEach((s: any) => { surveyMap[s.survey_id] = s.survey_name; });

    // Group by date + survey_id
    const grouped: Record<string, { date: string; survey_name: string; clicks: number; completions: number }> = {};

    (data || []).forEach((row: any) => {
      const date = new Date(row.clicked_at).toLocaleDateString("en-GB", {
        day: "2-digit", month: "short", year: "numeric",
      });
      const key = `${date}__${row.survey_id}`;
      if (!grouped[key]) {
        grouped[key] = {
          date,
          survey_name: surveyMap[row.survey_id] || row.survey_id,
          clicks: 0,
          completions: 0,
        };
      }
      grouped[key].clicks += 1;
      if (row.status === "completed") grouped[key].completions += 1;
    });

    setRows(Object.values(grouped));
    setLoading(false);
  };

  const totalClicks = rows.reduce((s, r) => s + r.clicks, 0);
  const totalCompletions = rows.reduce((s, r) => s + r.completions, 0);

  return (
    <div className="max-w-[1000px] mx-auto pb-12 db-sans animate-fade-in">
      <div className="db-topbar py-6">
        <h1>Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your survey activity — clicks and completions by date.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <BarChart2 className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Total Clicks</p>
              <p className="text-2xl font-bold">{totalClicks}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <BarChart2 className="h-5 w-5 text-green-500 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Total Completions</p>
              <p className="text-2xl font-bold">{totalCompletions}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Survey Name</TableHead>
                <TableHead className="text-center">Clicks</TableHead>
                <TableHead className="text-center">Completions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                    No activity yet. Start a survey from the Opportunities tab.
                  </TableCell>
                </TableRow>
              ) : rows.map((row, i) => (
                <TableRow key={i}>
                  <TableCell className="text-sm">{row.date}</TableCell>
                  <TableCell className="font-medium">{row.survey_name}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{row.clicks}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={row.completions > 0 ? "default" : "outline"}>
                      {row.completions}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
