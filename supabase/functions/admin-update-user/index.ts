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

    // Verify that the user making the request is an admin
    const { data: { user: adminUser } } = await supabaseAdmin.auth.getUser(req.headers.get('Authorization')?.replace('Bearer ', ''))
    if (!adminUser) throw new Error("Authentication failed.")

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', adminUser.id)
      .single()

    if (profileError || profile.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Permission denied.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }

    // Get data from request
    const { userId, fullName, role } = await req.json()
    if (!userId || !fullName || !role) {
      return new Response(JSON.stringify({ error: 'Missing required fields: userId, fullName, role' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }
    if (role !== 'user' && role !== 'admin') {
        return new Response(JSON.stringify({ error: 'Invalid role specified.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }

    // Update user in auth.users
    const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { user_metadata: { full_name: fullName } }
    )
    if (authUpdateError) throw authUpdateError

    // Update user in public.profiles
    const { error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .update({ full_name: fullName, role: role })
      .eq('id', userId)
    if (profileUpdateError) throw profileUpdateError

    return new Response(JSON.stringify({ message: 'User updated successfully' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})