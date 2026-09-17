import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ClipboardList, CheckCircle, XCircle, Loader2, ExternalLink } from "lucide-react";

interface Question {
  question: string;
  options: string[];
  qualify_if: string[];
}

interface Survey {
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
  questions: Question[];
  status: string;
  expiry_date: string | null;
}

type PageState = "loading" | "not_found" | "inactive" | "expired" | "intro" | "questions" | "disqualified" | "redirecting";

export default function PepperwahSurveyPage() {
  const { surveyId } = useParams<{ surveyId: string }>();
  const { profile } = useAuth();

  const [state, setState] = useState<PageState>("loading");
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (!surveyId) { setState("not_found"); return; }
    loadSurvey();
  }, [surveyId]);

  const loadSurvey = async () => {
    const { data, error } = await supabase
      .from("pepperwahl_surveys")
      .select("*")
      .eq("survey_id", surveyId!)
      .maybeSingle();

    if (error || !data) { setState("not_found"); return; }

    const s: Survey = {
      ...data,
      questions: Array.isArray(data.questions) ? data.questions : [],
    };

    if (s.status !== "active") { setState("inactive"); setSurvey(s); return; }
    if (s.expiry_date && new Date(s.expiry_date) < new Date()) { setState("expired"); setSurvey(s); return; }

    setSurvey(s);
    // Go straight to questions (or redirect if none)
    setState(s.questions.length === 0 ? "redirecting" : "questions");
  };

  // When state becomes "redirecting", record click and send user to Pepperwahl
  useEffect(() => {
    if (state === "redirecting" && survey) {
      handleRedirect();
    }
  }, [state, survey]);

  const handleRedirect = async () => {
    if (!survey) return;

    const uid = profile?.id || profile?.username || "anonymous";

    // Insert click record first and get back the generated click_id (UUID)
    const { data: clickRecord } = await supabase
      .from("pepperwahl_completions")
      .insert({
        survey_id: survey.survey_id,
        user_id: profile?.id || null,
        username: profile?.username || null,
        uid_passed: uid,
        status: "clicked",
        ip_address: null,
        user_agent: navigator.userAgent,
      })
      .select("id")
      .single();

    const clickId = clickRecord?.id || crypto.randomUUID();
    const username = profile?.username || "anonymous";

    // Replace {{user_id}} with our click_id and append username as a separate param
    let finalUrl = survey.survey_link
      .replace(/\{\{user_id\}\}/g, clickId)
      .replace(/\{user_id\}/g, clickId);

    // Append username so Pepperwahl can echo it back in the postback
    const urlObj = new URL(finalUrl);
    urlObj.searchParams.set("username", username);
    finalUrl = urlObj.toString();

    setTimeout(() => {
      window.location.href = finalUrl;
    }, 1200);
  };

  const handleStart = () => {
    setCurrentQ(0);
    setSelected(null);
    setState("questions");
  };

  const handleAnswer = async (option: string) => {
    setSelected(option);
  };

  const handleNext = async () => {
    if (!survey || selected === null) return;

    const q = survey.questions[currentQ];
    const newAnswers = [...answers, selected];
    setAnswers(newAnswers);

    // Check if this answer qualifies
    const qualifies = q.qualify_if.length === 0 || q.qualify_if.includes(selected);

    if (!qualifies) {
      // Record disqualification
      const uid = profile?.id || profile?.username || "anonymous";
      await supabase.from("pepperwahl_completions").insert({
        survey_id: survey.survey_id,
        user_id: profile?.id || null,
        username: profile?.username || null,
        uid_passed: uid,
        status: "disqualified",
        user_agent: navigator.userAgent,
      });
      setState("disqualified");
      return;
    }

    // Move to next question or redirect
    if (currentQ + 1 < survey.questions.length) {
      setCurrentQ(currentQ + 1);
      setSelected(null);
    } else {
      // All questions passed
      setState("redirecting");
    }
  };

  // ── Loading ──
  if (state === "loading") {
    return (
      <FullPage>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm mt-3">Loading survey…</p>
      </FullPage>
    );
  }

  // ── Not found ──
  if (state === "not_found") {
    return (
      <FullPage>
        <XCircle className="h-12 w-12 text-destructive mb-3" />
        <h2 className="text-lg font-bold">Survey Not Found</h2>
        <p className="text-sm text-muted-foreground mt-1 text-center max-w-xs">
          This survey link is invalid or has been removed.
        </p>
      </FullPage>
    );
  }

  // ── Inactive ──
  if (state === "inactive") {
    return (
      <FullPage>
        <XCircle className="h-12 w-12 text-muted-foreground mb-3" />
        <h2 className="text-lg font-bold">Survey Unavailable</h2>
        <p className="text-sm text-muted-foreground mt-1 text-center max-w-xs">
          This survey is currently inactive. Please check back later.
        </p>
      </FullPage>
    );
  }

  // ── Expired ──
  if (state === "expired") {
    return (
      <FullPage>
        <XCircle className="h-12 w-12 text-muted-foreground mb-3" />
        <h2 className="text-lg font-bold">Survey Expired</h2>
        <p className="text-sm text-muted-foreground mt-1 text-center max-w-xs">
          This survey has expired and is no longer accepting responses.
        </p>
      </FullPage>
    );
  }

  // ── Disqualified ──
  if (state === "disqualified") {
    return (
      <FullPage>
        <div className="bg-destructive/10 rounded-full p-4 mb-4">
          <XCircle className="h-10 w-10 text-destructive" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Sorry, you don't qualify</h2>
        <p className="text-sm text-muted-foreground mt-2 text-center max-w-sm">
          Based on your answers, you don't meet the criteria for this survey. Thank you for your time!
        </p>
        <p className="text-xs text-muted-foreground mt-4">You may close this page.</p>
      </FullPage>
    );
  }

  // ── Redirecting ──
  if (state === "redirecting") {
    return (
      <FullPage>
        <div className="bg-primary/10 rounded-full p-4 mb-4">
          <CheckCircle className="h-10 w-10 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground">You qualify!</h2>
        <p className="text-sm text-muted-foreground mt-2 text-center max-w-sm">
          Taking you to the survey now…
        </p>
        <div className="mt-4 flex items-center gap-2 text-primary">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Redirecting…</span>
        </div>
      </FullPage>
    );
  }

  if (!survey) return null;

  // ── Intro ──
  if (state === "intro") {
    return (
      <FullPage>
        <SurveyCard>
          <div className="flex items-center gap-3 mb-5">
            <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <ClipboardList className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Survey</p>
              <h2 className="text-lg font-bold leading-tight">{survey.survey_name}</h2>
            </div>
          </div>

          {survey.description && (
            <p className="text-sm text-muted-foreground mb-5">{survey.description}</p>
          )}

          <div className="grid grid-cols-2 gap-3 mb-6">
            {survey.loi_minutes && (
              <InfoPill label="Duration" value={`~${survey.loi_minutes} min`} />
            )}
            {survey.country && (
              <InfoPill label="Country" value={survey.country} />
            )}
            {(survey.min_age || survey.max_age) && (
              <InfoPill label="Age" value={`${survey.min_age}–${survey.max_age}`} />
            )}
            {survey.survey_type && (
              <InfoPill label="Type" value={survey.survey_type} />
            )}
          </div>

          {survey.questions.length > 0 && (
            <p className="text-xs text-muted-foreground mb-5 text-center">
              Answer {survey.questions.length} short question{survey.questions.length > 1 ? "s" : ""} to check your eligibility.
            </p>
          )}

          <Button className="w-full" size="lg" onClick={handleStart}>
            {survey.questions.length > 0 ? "Check Eligibility" : "Start Survey"}
            <ExternalLink className="h-4 w-4 ml-2" />
          </Button>
        </SurveyCard>
      </FullPage>
    );
  }

  // ── Questions ──
  if (state === "questions" && survey.questions.length > 0) {
    const q = survey.questions[currentQ];
    const progress = ((currentQ) / survey.questions.length) * 100;

    return (
      <FullPage>
        <SurveyCard>
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Eligibility Check
            </p>
            <p className="text-xs text-muted-foreground">
              {currentQ + 1} / {survey.questions.length}
            </p>
          </div>

          {/* Progress bar */}
          <Progress value={progress} className="h-1.5 mb-6" />

          {/* Question */}
          <h3 className="text-base font-semibold text-foreground mb-5 leading-snug">
            {q.question}
          </h3>

          {/* Options */}
          <div className="space-y-2.5 mb-6">
            {q.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleAnswer(opt)}
                className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-150
                  ${selected === opt
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-foreground hover:border-primary/50 hover:bg-accent"
                  }`}
              >
                {opt}
              </button>
            ))}
          </div>

          {/* Next button */}
          <Button
            className="w-full"
            disabled={selected === null}
            onClick={handleNext}
          >
            {currentQ + 1 < survey.questions.length ? "Next Question" : "Submit"}
          </Button>
        </SurveyCard>
      </FullPage>
    );
  }

  return null;
}

// ── Layout helpers ──

function FullPage({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md flex flex-col items-center">
        {children}
      </div>
    </div>
  );
}

function SurveyCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full bg-card border border-border rounded-2xl shadow-lg p-6">
      {children}
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted rounded-lg px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
