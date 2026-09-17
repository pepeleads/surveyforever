import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Pepperwahl Postback Endpoint
 *
 * Pepperwahl calls this URL when a user completes a survey.
 * Expected params (GET or POST):
 *   uid        — the user identifier passed in the survey link
 *   survey_id  — Pepperwahl's survey ID (e.g. "SMC57")
 *   txn_id     — unique transaction ID for deduplication
 *   status     — completion status ("1", "complete", "success", etc.)
 *
 * URL to share with Pepperwahl:
 *   https://<project>.supabase.co/functions/v1/pepperwahl-postback?uid={uid}&survey_id={survey_id}&txn_id={txn_id}&status={status}
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
                   req.headers.get("cf-connecting-ip") || "unknown";

  // Helper: write a log entry and return a response
  const respond = async (
    normalized: string,
    message: string,
    httpStatus: number,
    logData: Record<string, any>
  ) => {
    try {
      await supabase.from("pepperwahl_postback_logs").insert({
        ...logData,
        normalized,
        ip_address: clientIp,
      });
    } catch (e) {
      console.error("[pepperwahl-postback] Failed to write log:", e);
    }
    return new Response(
      JSON.stringify({ status: normalized === "success" ? "ok" : normalized, message }),
      { status: httpStatus, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  };

  try {
    const url = new URL(req.url);
    const params: Record<string, string> = {};
    url.searchParams.forEach((v, k) => { params[k] = v; });

    if (req.method === "POST") {
      try {
        const contentType = req.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const body = await req.json();
          Object.assign(params, body);
        } else {
          const text = await req.text();
          new URLSearchParams(text).forEach((v, k) => { params[k] = v; });
        }
      } catch { /* ignore */ }
    }

    const uid       = params["uid"] || params["user_id"] || params["click_id"] || "";
    const surveyId  = params["survey_id"] || "";
    const txnId     = params["txn_id"] || params["transaction_id"] || "";
    const statusRaw = (params["status"] || "").toLowerCase().trim();
    const pepperUsername = params["username"] || null; // optional, if Pepperwahl sends it

    console.log(`[pepperwahl-postback] uid=${uid} survey_id=${surveyId} txn_id=${txnId} status=${statusRaw}`);

    const baseLog = { survey_id: surveyId || null, uid, txn_id: txnId || null, status_raw: statusRaw, raw_params: params, username: pepperUsername };

    // Validate required params
    if (!uid || !surveyId) {
      return await respond("failed", "uid and survey_id are required", 400, {
        ...baseLog, error: "Missing required params",
      });
    }

    // Determine if this is a real completion
    const successValues = ["1", "2", "success", "complete", "completed", "approved", "true", "yes", "ok", "done", "pass", "passed"];
    const isSuccess = successValues.includes(statusRaw) || statusRaw === "";

    if (!isSuccess) {
      return await respond("ignored", `Non-success status "${statusRaw}" — no action taken`, 200, baseLog);
    }

    // Verify the survey exists
    const { data: survey } = await supabase
      .from("pepperwahl_surveys")
      .select("id, survey_id, survey_name")
      .eq("survey_id", surveyId)
      .eq("status", "active")
      .maybeSingle();

    if (!survey) {
      return await respond("not_found", "Survey not found or inactive", 200, {
        ...baseLog, error: `Unknown survey: ${surveyId}`,
      });
    }

    // Deduplication check
    if (txnId) {
      const { data: existing } = await supabase
        .from("pepperwahl_completions")
        .select("id")
        .eq("txn_id", txnId)
        .maybeSingle();

      if (existing) {
        return await respond("duplicate", "Duplicate transaction, already recorded", 200, baseLog);
      }
    }

    // Resolve user — uid may be a click_id (UUID from pepperwahl_completions.id),
    // a profile UUID, or a username
    let userProfile: { id: string; user_id: string; username: string | null } | null = null;
    let clickRecordId: string | null = null;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (uuidRegex.test(uid)) {
      // First: try it as a pepperwahl_completions.id (click_id) — the preferred flow
      const { data: clickRow } = await supabase
        .from("pepperwahl_completions")
        .select("id, user_id, username")
        .eq("id", uid)
        .maybeSingle();

      if (clickRow) {
        clickRecordId = clickRow.id;
        // Load the associated profile if present
        if (clickRow.user_id) {
          const { data: prof } = await supabase
            .from("profiles")
            .select("id, user_id, username")
            .eq("id", clickRow.user_id)
            .maybeSingle();
          userProfile = prof;
        }
      }

      // Second: try as a profile UUID
      if (!clickRecordId) {
        const { data } = await supabase
          .from("profiles")
          .select("id, user_id, username")
          .or(`id.eq.${uid},user_id.eq.${uid}`)
          .maybeSingle();
        userProfile = data;
      }
    }

    // Third: try as username (from our system, or from Pepperwahl's username param)
    if (!userProfile && !clickRecordId) {
      const lookupUsername = pepperUsername || uid;
      const { data } = await supabase
        .from("profiles")
        .select("id, user_id, username")
        .eq("username", lookupUsername)
        .maybeSingle();
      userProfile = data;
    }

    // Update the specific click record (by click_id) or find the latest clicked record for user
    let updated = false;

    if (clickRecordId) {
      // Direct match via click_id — most accurate
      await supabase
        .from("pepperwahl_completions")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          txn_id: txnId || null,
          raw_postback: params,
          ip_address: clientIp,
          ...(userProfile?.username || pepperUsername
            ? { username: userProfile?.username || pepperUsername }
            : {}),
        })
        .eq("id", clickRecordId);
      updated = true;
      console.log(`[pepperwahl-postback] Updated click_id ${clickRecordId} to completed`);
    } else if (userProfile) {
      // Fallback: find latest clicked record for this user+survey
      const { data: clickRecord } = await supabase
        .from("pepperwahl_completions")
        .select("id")
        .eq("survey_id", surveyId)
        .eq("user_id", userProfile.id)
        .eq("status", "clicked")
        .order("clicked_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (clickRecord) {
        await supabase
          .from("pepperwahl_completions")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
            txn_id: txnId || null,
            raw_postback: params,
            ip_address: clientIp,
          })
          .eq("id", clickRecord.id);
        updated = true;
        console.log(`[pepperwahl-postback] Updated user click record ${clickRecord.id} to completed`);
      }
    }

    // No existing click record found — insert a fresh completion
    if (!updated) {
      await supabase.from("pepperwahl_completions").insert({
        survey_id: surveyId,
        user_id: userProfile?.id || null,
        username: userProfile?.username || pepperUsername || null,
        uid_passed: uid,
        status: "completed",
        txn_id: txnId || null,
        ip_address: clientIp,
        completed_at: new Date().toISOString(),
        raw_postback: params,
      });
      console.log(`[pepperwahl-postback] Inserted new completion for uid=${uid} survey=${surveyId}`);
    }

    return await respond("success", "Completion recorded", 200, {
      ...baseLog,
      user_id: userProfile?.id || null,
      username: userProfile?.username || null,
    });

  } catch (err) {
    console.error("[pepperwahl-postback] Unexpected error:", err);
    try {
      await supabase.from("pepperwahl_postback_logs").insert({
        normalized: "failed",
        error: String(err),
        ip_address: clientIp,
        raw_params: {},
      });
    } catch { /* ignore */ }
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
