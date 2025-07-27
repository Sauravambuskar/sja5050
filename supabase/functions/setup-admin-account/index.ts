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

    const { email, password } = await req.json()
    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email and password are required.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Find user by listing all users and filtering.
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    if (listError) throw new Error(`Failed to list users: ${listError.message}`)

    const existingUser = users.find(u => u.email === email)

    if (existingUser) {
      console.log(`Found existing admin user (${existingUser.id}), deleting for a clean slate.`)
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(existingUser.id)
      if (deleteError) {
        console.error(`Failed to delete user, attempting to update instead. Error: ${deleteError.message}`)
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, { password })
        if (updateError) throw new Error(`Failed to update existing user: ${updateError.message}`)
      }
    }

    // Create the new user
    console.log(`Creating new admin user for ${email}.`)
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: 'Admin' },
    })

    if (createError) {
      throw new Error(`Failed to create admin user: ${createError.message}`)
    }
    if (!newUser || !newUser.user) {
      throw new Error("User creation did not return a user object.")
    }

    const message = `Admin user ${email} has been created/reset successfully.`
    return new Response(JSON.stringify({ message, userId: newUser.user.id }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error) {
    console.error('Error in admin setup function:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})