import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GUMROAD_PRODUCT_ID = 'IJjDnzYW65CqpATlMGYf1w==';
const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

    try {
        const { license_key } = await req.json();
        if (!license_key) {
            return new Response(JSON.stringify({ error: 'license_key is required' }), {
                status: 400, headers: { ...CORS, 'Content-Type': 'application/json' }
            });
        }

        // 1. Verify with Gumroad (no access token needed for license verification)
        const gumroadRes = await fetch('https://api.gumroad.com/v2/licenses/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                product_id: GUMROAD_PRODUCT_ID,
                license_key: license_key.trim(),
                increment_uses_count: 'false', // don't burn the use on every login
            }),
        });

        const gumroad = await gumroadRes.json();

        if (!gumroad.success) {
            return new Response(JSON.stringify({ error: 'Invalid or expired license key', gumroad }), {
                status: 402, headers: { ...CORS, 'Content-Type': 'application/json' }
            });
        }

        // Check it hasn't been refunded or disputed
        const sale = gumroad.purchase;
        if (sale?.refunded || sale?.disputed || sale?.chargebacked) {
            return new Response(JSON.stringify({ error: 'License has been refunded or disputed' }), {
                status: 402, headers: { ...CORS, 'Content-Type': 'application/json' }
            });
        }

        // 2. Calculate expiry — Gumroad doesn't give a subscription end date for one-time
        // purchases, so we set 30 days from NOW (refresh each time they activate)
        const premiumExpiresAt = new Date();
        premiumExpiresAt.setDate(premiumExpiresAt.getDate() + 30);

        // 3. Get the authenticated user from the JWT
        const authHeader = req.headers.get('Authorization') ?? '';
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_ANON_KEY')!,
            { global: { headers: { Authorization: authHeader } } }
        );
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return new Response(JSON.stringify({ error: 'Not authenticated' }), {
                status: 401, headers: { ...CORS, 'Content-Type': 'application/json' }
            });
        }

        // 4. Update the user's profile
        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                license_key: license_key.trim(),
                is_premium: true,
                premium_expires_at: premiumExpiresAt.toISOString(),
            })
            .eq('auth_user_id', user.id);

        if (updateError) throw updateError;

        return new Response(JSON.stringify({
            success: true,
            premium_expires_at: premiumExpiresAt.toISOString(),
        }), {
            status: 200, headers: { ...CORS, 'Content-Type': 'application/json' }
        });

    } catch (err: any) {
        console.error('verify-license error:', err);
        return new Response(JSON.stringify({ error: err.message ?? 'Internal error' }), {
            status: 500, headers: { ...CORS, 'Content-Type': 'application/json' }
        });
    }
});
