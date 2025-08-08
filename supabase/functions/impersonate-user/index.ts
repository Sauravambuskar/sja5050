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
    // Create a Supabase client with the admin's auth token
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Check if the caller is an admin
    const { data: { user: adminUser } } = await supabaseClient.auth.getUser();
    if (!adminUser) throw new Error("Authentication failed.");
    const { data: profile, error: profileError } = await supabaseClient.from('profiles').select('role').eq('id', adminUser.id).single();
    if (profileError || profile.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Permission denied. Must be an admin.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { userId } = await req.json();
    if (!userId) throw new Error("User ID to impersonate is required.");

    // Create a service role client to perform admin actions
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the target user's email
    const { data: { user: targetUser }, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (userError || !targetUser) throw new Error(`Could not find user: ${userError?.message || 'Not found'}`);

    // Generate a magic link for the user. The response contains the session data.
    const { data, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: targetUser.email!,
    });

    if (linkError) throw new Error(`Failed to generate link: ${linkError.message}`);

    // Return the session data to the client
    return new Response(JSON.stringify({ user: data.user, session: data.properties }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})