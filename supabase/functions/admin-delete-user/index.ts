// @ts-nocheck
/// <reference types="https://deno.land/x/deno/cli/types/v1.d.ts" />

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const FUNCTION_NAME = "admin-delete-user";

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

    const { userId } = await req.json();
    if (!userId) {
      return new Response(JSON.stringify({ error: "Missing required field: userId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (userId === adminUser.id) {
      return new Response(JSON.stringify({ error: "Admins cannot delete their own account." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Gather related records for cleanup ---
    const [{ data: kycDocs }, { data: additionalDocs }] = await Promise.all([
      supabaseAdmin.from("kyc_documents").select("file_path").eq("user_id", userId),
      supabaseAdmin
        .from("user_additional_documents")
        .select("file_path")
        .eq("user_id", userId),
    ]);

    const { data: invRows } = await supabaseAdmin
      .from("user_investments")
      .select("id")
      .eq("user_id", userId);

    const investmentIds = (invRows ?? []).map((r) => r.id);

    const { data: ticketRows } = await supabaseAdmin
      .from("support_tickets")
      .select("id")
      .eq("user_id", userId);

    const ticketIds = (ticketRows ?? []).map((r) => r.id);

    const { data: investmentRequestRows } = await supabaseAdmin
      .from("investment_requests")
      .select("screenshot_path")
      .eq("user_id", userId);

    const depositProofPaths = (investmentRequestRows ?? [])
      .map((r) => r.screenshot_path)
      .filter(Boolean);

    // --- Delete from storage (best effort) ---
    try {
      const kycPaths = (kycDocs ?? []).map((d) => d.file_path).filter(Boolean);
      if (kycPaths.length) {
        const { error } = await supabaseAdmin.storage.from("kyc_documents").remove(kycPaths);
        if (error) console.warn(`[${FUNCTION_NAME}] storage remove kyc_documents failed`, { error: error.message });
      }

      const addPaths = (additionalDocs ?? []).map((d) => d.file_path).filter(Boolean);
      if (addPaths.length) {
        const { error } = await supabaseAdmin.storage.from("additional_documents").remove(addPaths);
        if (error) console.warn(`[${FUNCTION_NAME}] storage remove additional_documents failed`, { error: error.message });
      }

      if (depositProofPaths.length) {
        const { error } = await supabaseAdmin.storage.from("deposit_proofs").remove(depositProofPaths);
        if (error) console.warn(`[${FUNCTION_NAME}] storage remove deposit_proofs failed`, { error: error.message });
      }

      // Remove avatar files in user folder (if any)
      const { data: avatarList, error: avatarListError } = await supabaseAdmin.storage
        .from("avatars")
        .list(userId, { limit: 100 });
      if (!avatarListError && avatarList?.length) {
        const avatarPaths = avatarList.map((f) => `${userId}/${f.name}`);
        const { error } = await supabaseAdmin.storage.from("avatars").remove(avatarPaths);
        if (error) console.warn(`[${FUNCTION_NAME}] storage remove avatars failed`, { error: error.message });
      }
    } catch (err) {
      console.warn(`[${FUNCTION_NAME}] storage cleanup warning`, { message: err?.message });
    }

    // --- Delete related rows (service role bypasses RLS) ---
    // Order matters where foreign keys may exist.
    if (ticketIds.length) {
      const { error: msgErr1 } = await supabaseAdmin
        .from("support_messages")
        .delete()
        .in("ticket_id", ticketIds);
      if (msgErr1) throw new Error(`support_messages delete failed: ${msgErr1.message}`);
    }

    const { error: msgErr2 } = await supabaseAdmin
      .from("support_messages")
      .delete()
      .eq("sender_id", userId);
    if (msgErr2) throw new Error(`support_messages (sender) delete failed: ${msgErr2.message}`);

    const { error: supportErr } = await supabaseAdmin
      .from("support_tickets")
      .delete()
      .eq("user_id", userId);
    if (supportErr) throw new Error(`support_tickets delete failed: ${supportErr.message}`);

    if (investmentIds.length) {
      const { error: payoutErr } = await supabaseAdmin
        .from("payout_log")
        .delete()
        .in("investment_id", investmentIds);
      if (payoutErr) throw new Error(`payout_log delete failed: ${payoutErr.message}`);

      const { error: cancelInvErr } = await supabaseAdmin
        .from("investment_cancellation_requests")
        .delete()
        .in("investment_id", investmentIds);
      if (cancelInvErr) throw new Error(`investment_cancellation_requests (by investment) delete failed: ${cancelInvErr.message}`);

      const { error: payoutCommInvErr } = await supabaseAdmin
        .from("commission_payouts")
        .delete()
        .in("source_investment_id", investmentIds);
      if (payoutCommInvErr) throw new Error(`commission_payouts (by investment) delete failed: ${payoutCommInvErr.message}`);
    }

    const { error: cancelErr } = await supabaseAdmin
      .from("investment_cancellation_requests")
      .delete()
      .eq("user_id", userId);
    if (cancelErr) throw new Error(`investment_cancellation_requests delete failed: ${cancelErr.message}`);

    const { error: payoutCommUserErr } = await supabaseAdmin
      .from("commission_payouts")
      .delete()
      .or(`recipient_user_id.eq.${userId},source_user_id.eq.${userId}`);
    if (payoutCommUserErr) throw new Error(`commission_payouts (by user) delete failed: ${payoutCommUserErr.message}`);

    const { error: agreementsErr } = await supabaseAdmin
      .from("investment_agreements")
      .delete()
      .eq("user_id", userId);
    if (agreementsErr) throw new Error(`investment_agreements delete failed: ${agreementsErr.message}`);

    const { error: invReqErr } = await supabaseAdmin
      .from("investment_requests")
      .delete()
      .eq("user_id", userId);
    if (invReqErr) throw new Error(`investment_requests delete failed: ${invReqErr.message}`);

    const { error: withdrawErr } = await supabaseAdmin
      .from("withdrawal_requests")
      .delete()
      .eq("user_id", userId);
    if (withdrawErr) throw new Error(`withdrawal_requests delete failed: ${withdrawErr.message}`);

    const { error: notesErr } = await supabaseAdmin
      .from("user_notes")
      .delete()
      .eq("user_id", userId);
    if (notesErr) throw new Error(`user_notes delete failed: ${notesErr.message}`);

    const { error: notifErr } = await supabaseAdmin
      .from("notifications")
      .delete()
      .eq("user_id", userId);
    if (notifErr) throw new Error(`notifications delete failed: ${notifErr.message}`);

    const { error: addDocsErr } = await supabaseAdmin
      .from("user_additional_documents")
      .delete()
      .eq("user_id", userId);
    if (addDocsErr) throw new Error(`user_additional_documents delete failed: ${addDocsErr.message}`);

    const { error: kycErr } = await supabaseAdmin
      .from("kyc_documents")
      .delete()
      .eq("user_id", userId);
    if (kycErr) throw new Error(`kyc_documents delete failed: ${kycErr.message}`);

    const { error: nomineesErr } = await supabaseAdmin
      .from("nominees")
      .delete()
      .eq("user_id", userId);
    if (nomineesErr) throw new Error(`nominees delete failed: ${nomineesErr.message}`);

    const { error: txErr } = await supabaseAdmin
      .from("transactions")
      .delete()
      .eq("user_id", userId);
    if (txErr) throw new Error(`transactions delete failed: ${txErr.message}`);

    const { error: investmentsErr } = await supabaseAdmin
      .from("user_investments")
      .delete()
      .eq("user_id", userId);
    if (investmentsErr) throw new Error(`user_investments delete failed: ${investmentsErr.message}`);

    const { error: walletErr } = await supabaseAdmin
      .from("wallets")
      .delete()
      .eq("user_id", userId);
    if (walletErr) throw new Error(`wallets delete failed: ${walletErr.message}`);

    const { error: profileDelErr } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", userId);
    if (profileDelErr) throw new Error(`profiles delete failed: ${profileDelErr.message}`);

    // Finally delete auth user
    const { error: authDelErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authDelErr) throw authDelErr;

    await supabaseAdmin.from("admin_audit_log").insert({
      admin_id: adminUser.id,
      admin_email: adminUser.email,
      action: "deleted_user",
      target_user_id: userId,
      details: { reason: "Action from User Management page." },
    });

    return new Response(JSON.stringify({ message: "User deleted successfully" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`[${FUNCTION_NAME}] error`, { message: error?.message });
    return new Response(JSON.stringify({ error: error?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
