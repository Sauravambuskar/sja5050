// @ts-nocheck
/// <reference types="https://deno.land/x/deno/cli/types/v1.d.ts" />

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const FUNCTION_NAME = "admin-create-user";

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

    // 1) Verify the caller is an admin
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

    if (profileError || profile.role !== "admin") {
      return new Response(JSON.stringify({ error: "Permission denied." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Get data from the request
    const body = await req.json();
    const { email, profileData } = body;
    const mode = body.mode === "invite" ? "invite" : "instant"; // default: instant
    const password = body.password;

    if (!email || !profileData || !profileData.full_name) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: email, profileData with full_name",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (mode === "instant" && (!password || String(password).length < 8)) {
      return new Response(
        JSON.stringify({
          error: "For instant creation, a password (min 8 characters) is required.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 3) Create the auth user
    let newUserId: string;

    if (mode === "invite") {
      // Invite = sends Supabase invite email, user sets password via email link
      const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        email,
        {
          data: { full_name: profileData.full_name },
        }
      );
      if (inviteError) throw inviteError;
      newUserId = inviteData.user.id;
    } else {
      // Instant = admin sets password, email is marked confirmed (no email verification needed)
      const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: profileData.full_name },
      });
      if (createError) throw createError;
      newUserId = createData.user.id;
    }

    // 4) The DB trigger `handle_new_user_setup` creates the basic profile + wallet.
    // Now update the profile with the comprehensive details provided by the admin.
    // IMPORTANT: call using the admin's JWT so auth.uid() is set (audit log + admin check).
    const supabaseAuthed = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { error: rpcError } = await supabaseAuthed.rpc("admin_update_user_profile", {
      p_user_id: newUserId,
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

    // 4b) If nominee details were provided, create nominee record.
    if (profileData.nominee_name && profileData.nominee_relationship) {
      const { error: nomineeError } = await supabaseAdmin.from("nominees").insert({
        user_id: newUserId,
        full_name: profileData.nominee_name,
        relationship: profileData.nominee_relationship,
        dob: profileData.nominee_dob ?? null,
      });

      if (nomineeError) throw nomineeError;
    }

    // 5) Optional: send a welcome email
    // - Invite flow already sends a Supabase invite email
    // - Instant flow does NOT need email verification; by default we don't email passwords
    if (mode === "invite") {
      await supabaseAdmin.functions.invoke("send-transactional-email", {
        body: {
          to: email,
          subject: "Welcome to SJA Foundation!",
          html: `<p>Hi ${profileData.full_name},</p><p>Welcome to SJA Foundation! An administrator has created an account for you.</p><p>Please check your inbox for a separate invitation email to set your password and log in.</p>`,
        },
      });
    }

    // 6) Log the action
    await supabaseAdmin.from("admin_audit_log").insert({
      admin_id: adminUser.id,
      admin_email: adminUser.email,
      action: "created_user",
      target_user_id: newUserId,
      details: {
        email,
        full_name: profileData.full_name,
        mode,
      },
    });

    return new Response(
      JSON.stringify({
        message:
          mode === "invite"
            ? "User created successfully and invitation sent."
            : "User created successfully.",
        userId: newUserId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error(`[${FUNCTION_NAME}] error`, { message: error?.message });
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});