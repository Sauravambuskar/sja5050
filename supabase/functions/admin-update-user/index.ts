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

    const { data: { user: adminUser } } = await supabaseAdmin.auth.getUser(req.headers.get('Authorization')?.replace('Bearer ', ''))
    if (!adminUser) throw new Error("Authentication failed.")

    const { data: profile, error: profileError } = await supabaseAdmin.from('profiles').select('role').eq('id', adminUser.id).single()
    if (profileError || profile.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Permission denied.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { userId, fullName, role } = await req.json()
    if (!userId || !fullName || !role) {
      return new Response(JSON.stringify({ error: 'Missing required fields: userId, fullName, role' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    if (role !== 'user' && role !== 'admin') {
        return new Response(JSON.stringify({ error: 'Invalid role specified.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    await supabaseAdmin.auth.admin.updateUserById(userId, { user_metadata: { full_name: fullName } })
    await supabaseAdmin.from('profiles').update({ full_name: fullName, role: role }).eq('id', userId)

    // Log the action
    await supabaseAdmin.from('admin_audit_log').insert({
        admin_id: adminUser.id,
        admin_email: adminUser.email,
        action: 'updated_user_role_and_name',
        target_user_id: userId,
        details: { fullName, role }
    })

    return new Response(JSON.stringify({ message: 'User updated successfully' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})