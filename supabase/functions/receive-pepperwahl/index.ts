import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

// Supabase Edge Functions by default require a JWT in the Authorization header.
// We override this by setting VERIFY_JWT=false at deploy time (--no-verify-jwt flag).
// This function is intentionally public — no auth validation is performed.

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Parse body — accept single object or array
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const surveys: unknown[] = Array.isArray(body) ? body : [body];

    const results: { survey_id: string; action: string; error?: string }[] = [];

    for (const raw of surveys) {
      const s = raw as Record<string, unknown>;

      // Validate required fields
      if (!s.survey_id || typeof s.survey_id !== "string") {
        results.push({ survey_id: "(missing)", action: "skipped", error: "survey_id is required" });
        continue;
      }
      if (!s.survey_name || typeof s.survey_name !== "string") {
        results.push({ survey_id: s.survey_id, action: "skipped", error: "survey_name is required" });
        continue;
      }
      if (!s.survey_link || typeof s.survey_link !== "string") {
        results.push({ survey_id: s.survey_id, action: "skipped", error: "survey_link is required" });
        continue;
      }

      // Normalise questions: ensure qualify_if is always an array
      const rawQuestions = Array.isArray(s.questions) ? s.questions : [];
      const questions = rawQuestions.map((q: unknown) => {
        const qObj = q as Record<string, unknown>;
        return {
          question: qObj.question ?? "",
          options: Array.isArray(qObj.options) ? qObj.options : [],
          qualify_if: Array.isArray(qObj.qualify_if) ? qObj.qualify_if : [],
        };
      });

      // Upsert by survey_id — same survey_id received again updates the record
      const payload = {
        survey_id: s.survey_id,
        survey_name: s.survey_name,
        survey_link: s.survey_link,
        description: typeof s.description === "string" ? s.description : null,
        payout_usd: typeof s.payout_usd === "number" ? s.payout_usd : 0,
        country: typeof s.country === "string" ? s.country : null,
        min_age: typeof s.min_age === "number" ? s.min_age : 18,
        max_age: typeof s.max_age === "number" ? s.max_age : 65,
        loi_minutes: typeof s.loi_minutes === "number" ? s.loi_minutes : null,
        survey_type: typeof s.survey_type === "string" ? s.survey_type : null,
        notes: typeof s.notes === "string" ? s.notes : null,
        expiry_date: typeof s.expiry_date === "string" ? s.expiry_date : null,
        questions,
        // Keep existing status on update — admin controls activation
        received_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("pepperwahl_surveys")
        .upsert(payload, { onConflict: "survey_id", ignoreDuplicates: false });

      if (error) {
        console.error(`[receive-pepperwahl] Upsert error for ${s.survey_id}:`, error.message);
        results.push({ survey_id: s.survey_id, action: "error", error: error.message });
      } else {
        results.push({ survey_id: s.survey_id, action: "upserted" });
        console.log(`[receive-pepperwahl] Upserted survey: ${s.survey_id}`);
      }
    }

    const successCount = results.filter((r) => r.action === "upserted").length;
    const errorCount = results.filter((r) => r.action === "error").length;

    return new Response(
      JSON.stringify({
        success: true,
        status: "ok",
        received: surveys.length,
        upserted: successCount,
        errors: errorCount,
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("[receive-pepperwahl] Unexpected error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
