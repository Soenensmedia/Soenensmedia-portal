// SoenensMedia Portaal — Edge Function: stuurt een e-mail naar de admin
// wanneer een KLANT nieuwe feedback achterlaat op een project (niet
// wanneer de admin zelf reageert, anders mailt Leyton zichzelf telkens).
//
// Deploy: Supabase Dashboard → Edge Functions → nieuwe functie
// "notify-admin-feedback" → plak deze volledige inhoud → Deploy.
// Vereiste secret: BREVO_API_KEY (zelfde als de andere e-mailfuncties).
// SUPABASE_URL, SUPABASE_ANON_KEY en SUPABASE_SERVICE_ROLE_KEY worden door
// Supabase automatisch meegegeven, die hoef je niet zelf toe te voegen.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const brevoApiKey = Deno.env.get("BREVO_API_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Niet ingelogd" }, 401);
    }

    // Client met de JWT van de aanroeper, enkel om te achterhalen wie dit is.
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await callerClient.auth.getUser();
    if (userErr || !user) {
      return json({ error: "Ongeldige sessie" }, 401);
    }

    // Service-role client voor de eigenlijke lookups (bypass RLS).
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: callerProfile } = await admin
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .single();

    if (callerProfile?.role !== "client") {
      return json({ skipped: true, reason: "Niet van een klant" }, 200);
    }

    const { projectId, message } = await req.json();
    if (!projectId || !message) {
      return json({ error: "projectId of message ontbreekt" }, 400);
    }

    const { data: project, error: projectErr } = await admin
      .from("projects")
      .select("title, client_user_id")
      .eq("id", projectId)
      .single();
    if (projectErr || !project) {
      return json({ error: "Project niet gevonden" }, 404);
    }
    if (project.client_user_id !== user.id) {
      return json({ error: "Niet toegestaan" }, 403);
    }

    const { data: adminProfile } = await admin
      .from("profiles")
      .select("email")
      .eq("role", "admin")
      .limit(1)
      .maybeSingle();
    if (!adminProfile?.email) {
      return json({ error: "Kon admin-e-mail niet vinden" }, 404);
    }

    const senderName = callerProfile?.full_name || "Een klant";

    const emailRes = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": brevoApiKey,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        sender: { name: "SoenensMedia Portaal", email: "info@soenensmedia.be" },
        to: [{ email: adminProfile.email }],
        subject: `Nieuwe feedback op: ${project.title}`,
        htmlContent: `
          <p>Hallo,</p>
          <p><strong>${escapeHtml(senderName)}</strong> liet feedback achter op <strong>${escapeHtml(project.title)}</strong>:</p>
          <p style="background:#f4f4f4; padding:12px 16px; border-radius:6px;">${escapeHtml(message)}</p>
          <p>Log in op het portaal om te antwoorden.</p>
          <p>— SoenensMedia Portaal</p>
        `,
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      return json({ error: "Brevo-fout: " + errText }, 502);
    }

    return json({ sent: true }, 200);
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function escapeHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
