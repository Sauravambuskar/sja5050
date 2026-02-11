// @ts-nocheck
/// <reference types="https://deno.land/x/deno/cli/types/v1.d.ts" />

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const FUNCTION_NAME = "admin-bulk-create-users";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type IncomingRow = {
  email?: string;
  full_name?: string;
  phone?: string | null;
  dob?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  bank_name?: string | null;
  bank_account_holder_name?: string | null;
  bank_account_number?: string | null;
  bank_ifsc_code?: string | null;
  nominee_name?: string | null;
  nominee_relationship?: string | null;
  nominee_dob?: string | null;
};

function normalizeEmail(v: any) {
  const s = String(v ?? "").trim();
  return s ? s.toLowerCase() : "";
}

function normalizeText(v: any) {
  const s = String(v ?? "").trim();
  return s || null;
}

function normalizeDateYYYYMMDD(v: any) {
  const s = String(v ?? "").trim();
  if (!s) return null;
  // accept YYYY-MM-DD only (simple + predictable)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return s;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

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

    if (profileError || profile?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Permission denied." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Parse request
    const body = await req.json();
    const rows: IncomingRow[] = Array.isArray(body?.rows) ? body.rows : [];
    const mode = body?.mode === "invite" ? "invite" : "instant";
    const sendWelcomeEmail = body?.sendWelcomeEmail === true;

    if (!rows.length) {
      return new Response(JSON.stringify({ error: "No rows provided." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (rows.length > 500) {
      return new Response(JSON.stringify({ error: "Too many rows. Maximum 500 users per upload." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use anon client with admin JWT so security-definer RPC sees auth.uid()
    const supabaseAuthed = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const results: any[] = [];

    // We'll process sequentially to keep it simple and reduce rate-limit issues.
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i] ?? {};
      const rowNumber = i + 2; // excel row: header is row 1

      const email = normalizeEmail(r.email);
      const full_name = String(r.full_name ?? "").trim();

      // Validate minimal fields
      if (!email || !isValidEmail(email)) {
        results.push({ rowNumber, email: email || null, status: "failed", error: "Invalid or missing email" });
        continue;
      }
      if (!full_name || full_name.length < 2) {
        results.push({ rowNumber, email, status: "failed", error: "Missing full_name" });
        continue;
      }

      const profileData = {
        full_name,
        phone: normalizeText(r.phone),
        dob: normalizeDateYYYYMMDD(r.dob),
        address: normalizeText(r.address),
        city: normalizeText(r.city),
        state: normalizeText(r.state),
        pincode: normalizeText(r.pincode),
        bank_name: normalizeText(r.bank_name),
        bank_account_holder_name: normalizeText(r.bank_account_holder_name),
        bank_account_number: normalizeText(r.bank_account_number),
        bank_ifsc_code: normalizeText(r.bank_ifsc_code),
        nominee_name: normalizeText(r.nominee_name),
        nominee_relationship: normalizeText(r.nominee_relationship),
        nominee_dob: normalizeDateYYYYMMDD(r.nominee_dob),
      };

      try {
        let newUserId: string;
        let generatedPassword: string | null = null;

        if (mode === "invite") {
          const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
            data: { full_name },
          });
          if (inviteError) throw inviteError;
          newUserId = inviteData.user.id;
        } else {
          // Create a safe generated password (min 12 chars)
          generatedPassword = crypto.randomUUID().replace(/-/g, "").slice(0, 12) + "!";
          const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password: generatedPassword,
            email_confirm: true,
            user_metadata: { full_name },
          });
          if (createError) throw createError;
          newUserId = createData.user.id;
        }

        // Update profile via secure RPC (audit logs etc.)
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

        // nominee optional
        if (profileData.nominee_name && profileData.nominee_relationship) {
          const { error: nomineeError } = await supabaseAdmin.from("nominees").insert({
            user_id: newUserId,
            full_name: profileData.nominee_name,
            relationship: profileData.nominee_relationship,
            dob: profileData.nominee_dob ?? null,
          });
          if (nomineeError) throw nomineeError;
        }

        if (sendWelcomeEmail) {
          // best-effort
          try {
            await supabaseAdmin.functions.invoke("send-transactional-email", {
              body: {
                to: email,
                subject: "Welcome!",
                html:
                  mode === "invite"
                    ? `<p>Hi ${full_name},</p><p>An administrator has created an account for you. Please check your inbox for a separate invitation email to set your password and log in.</p>`
                    : `<p>Hi ${full_name},</p><p>An administrator has created an account for you.</p>`,
              },
            });
          } catch (e) {
            console.warn(`[${FUNCTION_NAME}] welcome email failed`, { email, message: String(e?.message || e) });
          }
        }

        // audit log
        await supabaseAdmin.from("admin_audit_log").insert({
          admin_id: adminUser.id,
          admin_email: adminUser.email,
          action: "bulk_created_user",
          target_user_id: newUserId,
          details: {
            email,
            full_name,
            mode,
          },
        });

        results.push({
          rowNumber,
          email,
          status: "created",
          userId: newUserId,
          password: generatedPassword,
          message: mode === "invite" ? "Invited" : "Created",
        });
      } catch (err) {
        const msg = String(err?.message || "Unknown error");
        let status = "failed";
        if (msg.toLowerCase().includes("already been registered") || msg.toLowerCase().includes("already exists")) {
          status = "skipped";
        }

        results.push({ rowNumber, email, status, error: msg });
      }
    }

    const summary = results.reduce(
      (acc, r) => {
        if (r.status === "created") acc.created++;
        else if (r.status === "skipped") acc.skipped++;
        else acc.failed++;
        return acc;
      },
      { created: 0, skipped: 0, failed: 0 }
    );

    return new Response(JSON.stringify({ summary, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = String(error?.message || "Unknown error");
    console.error(`[${FUNCTION_NAME}] error`, { message: msg });

    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
