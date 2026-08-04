// SoenensMedia Portaal — Edge Function: verstuurt een offerte/factuur-PDF als
// bijlage naar het klant-e-mailadres.
//
// Deploy: Supabase Dashboard → Edge Functions → nieuwe functie
// "send-document-email" → plak deze volledige inhoud → Deploy.
// Vereiste secret: BREVO_API_KEY (dezelfde als bij notify-status-change,
// kan hergebruikt worden — geen nieuwe key nodig als die al bestaat).
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

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await callerClient.auth.getUser();
    if (userErr || !user) {
      return json({ error: "Ongeldige sessie" }, 401);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "admin") {
      return json({ error: "Niet toegestaan" }, 403);
    }

    const { to, subject, pdfBase64, filename } = await req.json();
    if (!to || !pdfBase64 || !filename) {
      return json({ error: "to, pdfBase64 en filename zijn verplicht" }, 400);
    }

    const emailRes = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": brevoApiKey,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        sender: { name: "SoenensMedia", email: "info@soenensmedia.be" },
        to: [{ email: to }],
        subject: subject || "Document van SoenensMedia",
        htmlContent: `
          <p>Hallo,</p>
          <p>In bijlage vind je het document.</p>
          <p>— SoenensMedia</p>
        `,
        attachment: [{ content: pdfBase64, name: filename }],
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
