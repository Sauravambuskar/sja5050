// @ts-nocheck
/// <reference types="https://deno.land/x/deno/cli/types/v1.d.ts" />

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify admin
    const {
      data: { user: adminUser },
    } = await supabaseAdmin.auth.getUser(token);

    if (!adminUser) throw new Error("Authentication failed.");

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", adminUser.id)
      .single();

    if (profileError || profile.role !== "admin") {
      return new Response(JSON.stringify({ error: "Permission denied." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { userId, email, password } = await req.json();

    if (!userId) {
      return new Response(JSON.stringify({ error: "Missing required field: userId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!email && !password) {
      return new Response(JSON.stringify({ error: "Provide at least one field to update (email or password)." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const updatePayload: any = {};
    if (email) {
      updatePayload.email = email;
      // Admin-driven email changes should take effect immediately
      updatePayload.email_confirm = true;
    }
    if (password) updatePayload.password = password;

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, updatePayload);
    if (updateError) throw updateError;

    await supabaseAdmin.from("admin_audit_log").insert({
      admin_id: adminUser.id,
      admin_email: adminUser.email,
      action: "updated_user_auth",
      target_user_id: userId,
      details: { email_changed: !!email, password_changed: !!password },
    });

    return new Response(JSON.stringify({ message: "User login updated successfully." }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
