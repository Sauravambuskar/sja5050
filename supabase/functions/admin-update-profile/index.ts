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
    const { userId, profileData } = await req.json()
    if (!userId || !profileData) {
      return new Response(JSON.stringify({ error: 'Missing required fields: userId, profileData' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 1. Update the protected auth.users table using the admin client
    const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { user_metadata: { full_name: profileData.full_name } }
    );
    if (authUpdateError) throw authUpdateError;

    // 2. Call the secure RPC function to update the public profiles table
    const { error: rpcError } = await supabaseAdmin.rpc('admin_update_user_profile', {
      p_user_id: userId,
      p_full_name: profileData.full_name,
      p_phone: profileData.phone,
      p_dob: profileData.dob,
      p_address: profileData.address,
      p_city: profileData.city,
      p_state: profileData.state,
      p_pincode: profileData.pincode,
      p_bank_account_holder_name: profileData.bank_account_holder_name,
      p_bank_account_number: profileData.bank_account_number,
      p_bank_ifsc_code: profileData.bank_ifsc_code,
      p_nominee_name: profileData.nominee_name,
      p_nominee_relationship: profileData.nominee_relationship,
      p_nominee_dob: profileData.nominee_dob,
    })

    if (rpcError) throw rpcError

    return new Response(JSON.stringify({ message: 'Profile updated successfully' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})