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

    // 1. Verify the caller is an admin
    const { data: { user: adminUser } } = await supabaseAdmin.auth.getUser(req.headers.get('Authorization')?.replace('Bearer ', ''))
    if (!adminUser) throw new Error("Authentication failed.")
    const { data: profile, error: profileError } = await supabaseAdmin.from('profiles').select('role').eq('id', adminUser.id).single()
    if (profileError || profile.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Permission denied.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 2. Get the target user ID from the request
    const { userId } = await req.json()
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Missing required field: userId' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    if (userId === adminUser.id) {
        return new Response(JSON.stringify({ error: 'Admins cannot impersonate themselves.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 3. Generate a magic link for the target user
    const { data, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: (await supabaseAdmin.auth.admin.getUserById(userId)).data.user.email,
    })
    if (linkError) throw linkError

    // 4. Log the action
    await supabaseAdmin.from('admin_audit_log').insert({
        admin_id: adminUser.id,
        admin_email: adminUser.email,
        action: 'impersonated_user',
        target_user_id: userId,
        details: { reason: 'Admin login as user' }
    })

    // 5. Return the session details from the magic link
    const params = new URLSearchParams(data.properties.action_link.split('#')[1]);
    const session = {
        access_token: params.get('access_token'),
        refresh_token: params.get('refresh_token'),
    }

    return new Response(JSON.stringify(session), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})