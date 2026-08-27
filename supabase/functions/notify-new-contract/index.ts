// SoenensMedia Portaal — Edge Function: stuurt een e-mail naar de gekoppelde
// klant wanneer de admin een retainer-contract of losse-opdracht-bevestiging
// naar hen verstuurt ter ondertekening.
//
// Deploy: Supabase Dashboard → Edge Functions → nieuwe functie
// "notify-new-contract" → plak deze volledige inhoud → Deploy.
// Vereiste secret: BREVO_API_KEY (zelfde als de andere e-mailfuncties,
// hoef je dus niet opnieuw in te stellen als die al bestaat).
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

    const { contractId } = await req.json();
    if (!contractId) {
      return json({ error: "contractId ontbreekt" }, 400);
    }

    const { data: contract, error: contractErr } = await admin
      .from("client_contracts")
      .select("kind, ref, pack_name, fields, client_id, project_id")
      .eq("id", contractId)
      .single();
    if (contractErr || !contract) {
      return json({ error: "Contract niet gevonden" }, 404);
    }

    // Zoek een gekoppeld project met een portaal-account voor deze klant —
    // bij voorkeur het project waaraan dit contract zelf gekoppeld is.
    let project = null;
    if (contract.project_id) {
      const { data } = await admin
        .from("projects")
        .select("title, client_user_id")
        .eq("id", contract.project_id)
        .single();
      if (data?.client_user_id) project = data;
    }
    if (!project) {
      const { data } = await admin
        .from("projects")
        .select("title, client_user_id")
        .eq("client_id", contract.client_id)
        .not("client_user_id", "is", null)
        .limit(1)
        .maybeSingle();
      project = data;
    }
    if (!project?.client_user_id) {
      return json({ skipped: true, reason: "Geen klant met portaal-account gekoppeld" }, 200);
    }

    const { data: clientUserData, error: clientErr } = await admin.auth.admin.getUserById(
      project.client_user_id,
    );
    const clientEmail = clientUserData?.user?.email;
    if (clientErr || !clientEmail) {
      return json({ error: "Kon klant-e-mail niet vinden" }, 404);
    }

    const title = contract.kind === "opdracht"
      ? (contract.fields?.projName || "Offerte & opdrachtbevestiging")
      : (contract.pack_name || "Retainer-contract");
    const kindLabel = contract.kind === "opdracht" ? "een offerte" : "een retainer-contract";

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
        subject: `Te ondertekenen: ${title}`,
        htmlContent: `
          <p>Hallo,</p>
          <p>Er staat ${escapeHtml(kindLabel)} voor je klaar om te ondertekenen:</p>
          <p style="font-size:18px;"><strong>${escapeHtml(title)}</strong>${contract.ref ? ` <span style="color:#888;">(${escapeHtml(contract.ref)})</span>` : ""}</p>
          <p>Log in op het portaal om het door te nemen en te ondertekenen.</p>
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
