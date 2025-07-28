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
    if (userId === adminUser.id) {
        return new Response(JSON.stringify({ error: 'Admins cannot adjust their own wallet.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Call the secure RPC function
    const { data: message, error: rpcError } = await supabaseAdmin.rpc('admin_adjust_wallet_balance', {
      p_user_id: userId,
      p_amount: amount,
      p_description: description
    })

    if (rpcError) throw rpcError

    return new Response(JSON.stringify({ message }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})