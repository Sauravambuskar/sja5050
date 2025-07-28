// @ts-nocheck
/// <reference types="https://deno.land/x/deno/cli/types/v1.d.ts" />

import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Function to generate a random string
const generateRandomString = (length: number) => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
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

    const randomId = generateRandomString(6);
    const newAdminEmail = `admin-${randomId}@sja.com`;
    const newAdminPassword = `SJA_Admin_${generateRandomString(8)}!`;

    // Create the new user in auth.users
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: newAdminEmail,
      password: newAdminPassword,
      email_confirm: true, // Auto-confirm the email
      user_metadata: { full_name: `Admin ${randomId}` },
    });

    if (createError) {
      throw new Error(`Failed to create admin user in auth: ${createError.message}`);
    }
    if (!newUser || !newUser.user) {
      throw new Error("User creation did not return a user object.");
    }

    // Manually create the profile with the admin role
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: newUser.user.id,
        full_name: `Admin ${randomId}`,
        role: 'admin',
      });

    if (profileError) {
      // If profile creation fails, we must clean up the auth user
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      throw new Error(`Failed to create admin profile: ${profileError.message}`);
    }

    const responsePayload = {
      message: 'New admin account created successfully.',
      email: newAdminEmail,
      password: newAdminPassword,
    };

    return new Response(JSON.stringify(responsePayload), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in create-new-admin function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});