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
    // This uses the SERVICE_ROLE_KEY and should only be used for this initial setup.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { email, password } = await req.json()
    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email and password are required.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Check if user already exists
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers({ email })
    if (listError) throw listError

    let userId: string;
    let message: string;

    if (users && users.length > 0) {
      // User exists, update their password
      const existingUser = users[0];
      userId = existingUser.id;
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, { password })
      if (updateError) throw updateError
      message = `Admin user ${email} already existed and password has been updated.`;
    } else {
      // User does not exist, create them
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: 'Admin' },
      })
      if (createError) throw createError
      if (!newUser || !newUser.user) throw new Error("User creation failed unexpectedly.")
      userId = newUser.user.id;
      message = `Admin user ${email} created successfully.`;
    }

    // Ensure the profile has the admin role
    const { data: profile, error: profileSelectError } = await supabaseAdmin.from('profiles').select('id').eq('id', userId).single()
    if (profileSelectError && profileSelectError.code !== 'PGRST116') throw profileSelectError;

    if (profile) {
        const { error: profileUpdateError } = await supabaseAdmin.from('profiles').update({ role: 'admin' }).eq('id', userId)
        if (profileUpdateError) throw profileUpdateError
    } else {
        const { error: profileInsertError } = await supabaseAdmin.from('profiles').upsert({ id: userId, role: 'admin', full_name: 'Admin' }, { onConflict: 'id' })
        if (profileInsertError) throw profileInsertError
    }
    
    message += ' Role set to admin.'

    return new Response(JSON.stringify({ message, userId }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})