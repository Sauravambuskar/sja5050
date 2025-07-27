// @ts-nocheck
/// <reference types="https://deno.land/x/deno/cli/types/v1.d.ts" />

import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify admin
    const { data: { user: adminUser } } = await supabaseAdmin.auth.getUser(req.headers.get('Authorization')?.replace('Bearer ', ''))
    if (!adminUser) throw new Error("Authentication failed.")
    const { data: profile, error: profileError } = await supabaseAdmin.from('profiles').select('role').eq('id', adminUser.id).single()
    if (profileError || profile.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Permission denied.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Get data from request
    const { userId, amount, description } = await req.json()
    if (!userId || typeof amount !== 'number' || !description || description.trim() === '') {
      return new Response(JSON.stringify({ error: 'Missing required fields: userId, amount (number), description' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    if (amount === 0) {
      return new Response(JSON.stringify({ error: 'Adjustment amount cannot be zero.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Can't adjust own wallet
    if (userId === adminUser.id) {
        return new Response(JSON.stringify({ error: 'Admins cannot adjust their own wallet.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Use pg_try_advisory_xact_lock to prevent race conditions on the wallet
    const { error: lockError } = await supabaseAdmin.rpc('pg_try_advisory_xact_lock', { p_key: userId })
    if (lockError) throw new Error(`Could not acquire lock on wallet: ${lockError.message}`)

    // Update wallet balance
    const { data: wallet, error: walletError } = await supabaseAdmin
      .from('wallets')
      .select('balance')
      .eq('user_id', userId)
      .single()

    if (walletError) throw new Error(`Could not fetch wallet: ${walletError.message}`)

    const newBalance = wallet.balance + amount;
    if (newBalance < 0) {
        return new Response(JSON.stringify({ error: 'Adjustment would result in a negative balance.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { error: updateError } = await supabaseAdmin
      .from('wallets')
      .update({ balance: newBalance })
      .eq('user_id', userId)

    if (updateError) throw new Error(`Could not update wallet: ${updateError.message}`)

    // Log the transaction
    const transactionType = amount > 0 ? 'Adjustment (Credit)' : 'Adjustment (Debit)';
    const { error: transactionError } = await supabaseAdmin
      .from('transactions')
      .insert({
        user_id: userId,
        type: transactionType,
        amount: Math.abs(amount),
        status: 'Completed',
        description: `Admin: ${description}`
      })

    if (transactionError) throw new Error(`Could not log transaction: ${transactionError.message}`)
    
    // Send notification
    const notificationTitle = amount > 0 ? 'Wallet Credited' : 'Wallet Debited';
    const notificationDescription = `An administrator has adjusted your wallet balance by ₹${amount.toLocaleString()}. Reason: ${description}`;
    await supabaseAdmin.from('notifications').insert({
        user_id: userId,
        title: notificationTitle,
        description: notificationDescription,
        type: 'info',
        link_to: '/wallet'
    })

    return new Response(JSON.stringify({ message: 'Wallet adjusted successfully', newBalance }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})