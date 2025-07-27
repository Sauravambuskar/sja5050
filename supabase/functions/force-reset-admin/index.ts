// @ts-nocheck
/// <reference types="https://deno.land/x/deno/cli/types/v1.d.ts" />

import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ADMIN_EMAIL = 'admin@sja.com'
const ADMIN_PASSWORD = 'Saurav$581'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Find user by listing all users and filtering. This is more reliable.
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    if (listError) throw new Error(`Failed to list users: ${listError.message}`)

    const existingUser = users.find(u => u.email === ADMIN_EMAIL)

    if (existingUser) {
      console.log(`Found existing admin user (${existingUser.id}), deleting for a clean slate.`)
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(existingUser.id)
      if (deleteError) {
        // If deletion fails, it's a critical issue, but we'll still try to proceed.
        console.error(`Failed to delete existing admin user. Error: ${deleteError.message}`)
      }
    }

    // Create the new user
    console.log(`Creating new admin user for ${ADMIN_EMAIL}.`)
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: 'Admin' },
    })

    if (createError) {
      throw new Error(`Failed to create admin user: ${createError.message}`)
    }
    if (!newUser || !newUser.user) {
      throw new Error("User creation did not return a user object.")
    }

    const message = `Admin user ${ADMIN_EMAIL} has been forcibly reset successfully.`
    return new Response(JSON.stringify({ message, userId: newUser.user.id }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error) {
    console.error('Error in force-reset-admin function:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})