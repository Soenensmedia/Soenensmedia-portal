// SoenensMedia Portaal — Edge Function: nodigt een nieuwe klant uit.
// Maakt (indien nodig) een portaal-account aan via Supabase's ingebouwde
// uitnodigingsmail, en koppelt dat account meteen aan het opgegeven project.
// Bestaat het account al, dan wordt er niets nieuws aangemaakt — enkel
// gekoppeld.
//
// Deploy: Supabase Dashboard → Edge Functions → nieuwe functie
// "invite-client" → plak deze volledige inhoud → Deploy.
// Geen extra secret nodig — SUPABASE_URL, SUPABASE_ANON_KEY en
// SUPABASE_SERVICE_ROLE_KEY worden automatisch meegegeven.
// Gebruikt Supabase's eigen "Invite user"-mailtemplate (Authentication →
// Email Templates), niet de Brevo-koppeling van de andere functies.

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

    // Service-role client: enkel deze kan accounts aanmaken/uitnodigen.
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: callerProfile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (callerProfile?.role !== "admin") {
      return json({ error: "Niet toegestaan" }, 403);
    }

    const { email, projectId } = await req.json();
    if (!email) {
      return json({ error: "E-mailadres ontbreekt" }, 400);
    }

    // Bestaat er al een profiel met dit e-mailadres? Dan enkel koppelen,
    // geen nieuwe uitnodiging versturen naar een bestaande klant.
    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    let clientUserId = existingProfile?.id ?? null;
    let invited = false;

    if (!clientUserId) {
      const origin = req.headers.get("origin") ?? undefined;
      const { data: invitedData, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo: origin,
      });
      if (inviteErr) {
        return json({ error: inviteErr.message }, 400);
      }
      clientUserId = invitedData?.user?.id ?? null;
      invited = true;
    }

    if (projectId && clientUserId) {
      const { error: linkErr } = await admin
        .from("projects")
        .update({ client_user_id: clientUserId })
        .eq("id", projectId);
      if (linkErr) {
        return json({ error: "Account in orde, maar koppelen aan project mislukte: " + linkErr.message }, 500);
      }
    }

    return json({ invited, linked: !!(projectId && clientUserId) }, 200);
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
