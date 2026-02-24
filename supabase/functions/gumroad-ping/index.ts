import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GUMROAD_PRODUCT_ID = 'IJjDnzYW65CqpATlMGYf1w==';

serve(async (req) => {
    // Gumroad sends Ping as application/x-www-form-urlencoded
    if (req.method !== 'POST') {
        return new Response('Only POST supported', { status: 405 });
    }

    try {
        const textBody = await req.text();
        const params = new URLSearchParams(textBody);

        const email = params.get('email');
        const license_key = params.get('license_key');
        const product_id = params.get('product_id');

        // Make sure this ping is for our product
        if (product_id !== GUMROAD_PRODUCT_ID) {
            return new Response('Ignoring ping for different product', { status: 200 });
        }

        if (!email) {
            return new Response('No email provided by Gumroad Ping', { status: 400 });
        }

        // Initialize Supabase with the SERVICE ROLE key to bypass RLS and authenticate as Admin
        const supabaseAdminUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

        // IMPORTANT: Verify we have the service role key so we can update any user's row
        if (!supabaseServiceKey) {
            console.error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable");
            return new Response('Server Configuration Error', { status: 500 });
        }

        const supabaseAdmin = createClient(supabaseAdminUrl, supabaseServiceKey);

        // Calculate expiry — set to 30 days from NOW (or could be infinite/100 years if lifetime)
        const premiumExpiresAt = new Date();
        premiumExpiresAt.setDate(premiumExpiresAt.getDate() + 30);

        // Update the user's profile based strictly on the EMAIL sent by Gumroad
        const { data: updatedUsers, error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({
                is_premium: true,
                license_key: license_key ? license_key.trim() : null,
                premium_expires_at: premiumExpiresAt.toISOString(),
            })
            .eq('email', email.toLowerCase().trim())
            .select();

        if (updateError) {
            console.error('Error updating profile in Supabase:', updateError);
            return new Response('Internal error updating database', { status: 500 });
        }

        if (updatedUsers && updatedUsers.length > 0) {
            console.log(`Successfully upgraded user: ${email} to Premium via Gumroad Ping`);
            return new Response('Success - User upgraded to Premium', { status: 200 });
        } else {
            console.log(`Ping received for ${email}, but no account with that email exists yet in Supabase.`);
            return new Response('OK, but user email not found in DB', { status: 200 });
        }

    } catch (err: any) {
        console.error('gumroad-ping error:', err);
        return new Response(`Error: ${err.message ?? 'Unknown'}`, { status: 500 });
    }
});
