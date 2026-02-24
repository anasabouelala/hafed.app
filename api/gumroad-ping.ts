import { createClient } from '@supabase/supabase-js';

export const config = {
    runtime: 'edge', // Vercel Edge Serverless Function
};

const GUMROAD_PRODUCT_ID = 'IJjDnzYW65CqpATlMGYf1w==';

export default async function handler(req: Request) {
    // Gumroad sends Ping as an application/x-www-form-urlencoded POST request
    if (req.method !== 'POST') {
        return new Response('Only POST supported', { status: 405 });
    }

    try {
        const textBody = await req.text();
        const params = new URLSearchParams(textBody);

        const email = params.get('email');
        const license_key = params.get('license_key') || null;
        const product_id = params.get('product_id');

        // Make sure this ping is for our product
        if (product_id !== GUMROAD_PRODUCT_ID) {
            return new Response('Ignoring ping for different product', { status: 200 });
        }

        if (!email) {
            return new Response('No email provided by Gumroad Ping', { status: 400 });
        }

        // Initialize Supabase with the SERVICE ROLE key to bypass RLS and authenticate as Admin
        // You MUST add SUPABASE_SERVICE_ROLE_KEY to your Vercel Environment Variables!
        const supabaseAdminUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

        if (!supabaseServiceKey) {
            console.error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable in Vercel");
            return new Response('Server Configuration Error', { status: 500 });
        }

        const supabaseAdmin = createClient(supabaseAdminUrl, supabaseServiceKey);

        // Calculate expiry — set to 30 days from NOW (or could be 100 years for lifetime access)
        const premiumExpiresAt = new Date();
        premiumExpiresAt.setDate(premiumExpiresAt.getDate() + 30);

        const userEmail = email.toLowerCase().trim();

        // 1. Check if profile already exists
        const { data: existingProfiles } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('email', userEmail);

        if (existingProfiles && existingProfiles.length > 0) {
            // 2. User exists, update them
            const { error: updateError } = await supabaseAdmin
                .from('profiles')
                .update({
                    is_premium: true,
                    license_key: license_key ? license_key.trim() : null,
                    premium_expires_at: premiumExpiresAt.toISOString(),
                })
                .eq('email', userEmail);

            if (updateError) {
                console.error('Error updating profile in Supabase:', updateError);
                return new Response('Internal error updating database', { status: 500 });
            }

            console.log(`Successfully upgraded existing user: ${userEmail} via Gumroad Ping`);
            return new Response('Success - Existing User upgraded to Premium', { status: 200 });

        } else {
            // 3. User does NOT exist yet (bought before registering). Create a shadow profile!
            // This row has NO auth_user_id yet. The frontend will link it up when they register or login.
            const { error: insertError } = await supabaseAdmin
                .from('profiles')
                .insert({
                    email: userEmail,
                    is_premium: true,
                    license_key: license_key ? license_key.trim() : null,
                    premium_expires_at: premiumExpiresAt.toISOString(),
                    full_name: 'Premium User',
                    level: 1,
                    xp: 0,
                    streak: 0
                });

            if (insertError) {
                console.error('Error creating shadow profile:', insertError);
                return new Response('Internal error creating database row', { status: 500 });
            }

            console.log(`Created new SHADOW premium profile for: ${userEmail}`);
            return new Response('Success - Shadow Profile Created', { status: 200 });
        }

    } catch (err: any) {
        console.error('gumroad-ping edge API error:', err);
        return new Response(`Error: ${err.message ?? 'Unknown'}`, { status: 500 });
    }
}
