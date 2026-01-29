// @ts-nocheck
/// <reference types="https://deno.land/x/deno/cli/types/v1.d.ts" />

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const FUNCTION_NAME = "admin-update-profile";

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

    // Get data from request
    const { userId, profileData } = await req.json();
    if (!userId || !profileData) {
      return new Response(JSON.stringify({ error: "Missing required fields: userId, profileData" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1) Update auth metadata (full name)
    const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: { full_name: profileData.full_name },
    });
    if (authUpdateError) throw authUpdateError;

    // 2) Update the public profiles table via secure RPC.
    // IMPORTANT: call using the admin's JWT so auth.uid() is set (audit log + admin check).
    const supabaseAuthed = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { error: rpcError } = await supabaseAuthed.rpc("admin_update_user_profile", {
      p_user_id: userId,
      p_full_name: profileData.full_name,
      p_phone: profileData.phone ?? null,
      p_dob: profileData.dob ?? null,
      p_address: profileData.address ?? null,
      p_city: profileData.city ?? null,
      p_state: profileData.state ?? null,
      p_pincode: profileData.pincode ?? null,
      p_bank_account_holder_name: profileData.bank_account_holder_name ?? null,
      p_bank_account_number: profileData.bank_account_number ?? null,
      p_bank_ifsc_code: profileData.bank_ifsc_code ?? null,
      p_bank_name: profileData.bank_name ?? null,
    });

    if (rpcError) throw rpcError;

    return new Response(JSON.stringify({ message: "Profile updated successfully" }), {
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