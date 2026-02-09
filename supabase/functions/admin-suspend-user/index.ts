// @ts-nocheck
/// <reference types="https://deno.land/x/deno/cli/types/v1.d.ts" />

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const FUNCTION_NAME = "admin-suspend-user";

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

    const {
      data: { user: adminUser },
    } = await supabaseAdmin.auth.getUser(token);

    if (!adminUser) throw new Error("Authentication failed.");

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", adminUser.id)
      .single();

    if (profileError || profile?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Permission denied." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { userId, suspend } = await req.json();
    if (!userId || typeof suspend !== "boolean") {
      return new Response(
        JSON.stringify({ error: "Missing required fields: userId, suspend (boolean)" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (userId === adminUser.id) {
      return new Response(JSON.stringify({ error: "Admins cannot suspend their own account." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Supabase expects ban_duration as a duration string (e.g. "24h") or "none".
    // Use a very long duration for suspension.
    const ban_duration = suspend ? "876000h" : "none";

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      ban_duration,
    });

    if (updateError) throw updateError;

    await supabaseAdmin.from("admin_audit_log").insert({
      admin_id: adminUser.id,
      admin_email: adminUser.email,
      action: suspend ? "suspended_user" : "unsuspended_user",
      target_user_id: userId,
      details: { reason: "Action from User Management page." },
    });

    const message = suspend ? "User suspended successfully" : "User unsuspended successfully";
    return new Response(JSON.stringify({ message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`[${FUNCTION_NAME}] error`, { message: error?.message });
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});