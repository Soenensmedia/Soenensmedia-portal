// SoenensMedia Portaal — Edge Function: stuurt een e-mail naar de gekoppelde
// klant wanneer de admin een nieuw idee of script naar hen doorstuurt
// (vanuit het Contentsysteem of vanuit Scripting) ter goedkeuring.
//
// Deploy: Supabase Dashboard → Edge Functions → nieuwe functie
// "notify-new-concept" → plak deze volledige inhoud → Deploy.
// Vereiste secret: BREVO_API_KEY (zelfde als de andere e-mailfuncties,
// hoef je dus niet opnieuw in te stellen als die al bestaat).
// SUPABASE_URL, SUPABASE_ANON_KEY en SUPABASE_SERVICE_ROLE_KEY worden door
// Supabase automatisch meegegeven, die hoef je niet zelf toe te voegen.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TYPE_LABELS: Record<string, string> = {
  idee: "idee",
  script: "script",
};

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

    // Service-role client voor de eigenlijke lookups (bypass RLS, want we
    // hebben de rol-check hierboven al zelf gedaan).
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "admin") {
      return json({ error: "Niet toegestaan" }, 403);
    }

    const { projectId, title, type } = await req.json();
    if (!projectId || !title) {
      return json({ error: "projectId of title ontbreekt" }, 400);
    }

    const { data: project, error: projectErr } = await admin
      .from("projects")
      .select("title, client_user_id")
      .eq("id", projectId)
      .single();
    if (projectErr || !project) {
      return json({ error: "Project niet gevonden" }, 404);
    }
    if (!project.client_user_id) {
      return json({ skipped: true, reason: "Geen klant gekoppeld" }, 200);
    }

    const { data: clientUserData, error: clientErr } = await admin.auth.admin.getUserById(
      project.client_user_id,
    );
    const clientEmail = clientUserData?.user?.email;
    if (clientErr || !clientEmail) {
      return json({ error: "Kon klant-e-mail niet vinden" }, 404);
    }

    const typeLabel = TYPE_LABELS[type] ?? "idee";

    const emailRes = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": brevoApiKey,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        sender: { name: "SoenensMedia", email: "info@soenensmedia.be" },
        to: [{ email: clientEmail }],
        subject: `Nieuw ${typeLabel} ter goedkeuring: ${project.title}`,
        htmlContent: `
          <p>Hallo,</p>
          <p>Er staat een nieuw ${escapeHtml(typeLabel)} voor je klaar op <strong>${escapeHtml(project.title)}</strong>:</p>
          <p style="font-size:18px;"><strong>${escapeHtml(title)}</strong></p>
          <p>Log in op het portaal om te bekijken en goed te keuren.</p>
          <p>— SoenensMedia</p>
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
