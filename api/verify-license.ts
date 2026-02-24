import { createClient } from '@supabase/supabase-js';

export const config = {
    runtime: 'edge', // Let Vercel run it at the edge
};

const GUMROAD_PRODUCT_ID = 'IJjDnzYW65CqpATlMGYf1w==';

export default async function handler(req: Request) {
    if (req.method === 'OPTIONS') {
        return new Response('ok', {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
        });
    }

    try {
        const body = await req.json();
        const { license_key } = body;

        if (!license_key) {
            return new Response(JSON.stringify({ error: 'license_key is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 1. Verify with Gumroad 
        const gumroadRes = await fetch('https://api.gumroad.com/v2/licenses/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                product_id: GUMROAD_PRODUCT_ID,
                license_key: license_key.trim(),
                increment_uses_count: 'false',
            }),
        });

        const gumroad = await gumroadRes.json();

        if (!gumroad.success) {
            return new Response(JSON.stringify({ error: 'Invalid or expired license key', gumroad }), {
                status: 402,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const sale = gumroad.purchase;
        if (sale?.refunded || sale?.disputed || sale?.chargebacked) {
            return new Response(JSON.stringify({ error: 'License has been refunded or disputed' }), {
                status: 402,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const premiumExpiresAt = new Date();
        premiumExpiresAt.setDate(premiumExpiresAt.getDate() + 30);

        // 2. Auth the user
        // We expect the client JWT in Authorization header
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Missing authorization' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const supabase = createClient(
            process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
            process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '',
            { global: { headers: { Authorization: authHeader } } }
        );

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return new Response(JSON.stringify({ error: 'Not authenticated' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 3. Update the user's profile
        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                license_key: license_key.trim(),
                is_premium: true,
                premium_expires_at: premiumExpiresAt.toISOString(),
            })
            .eq('auth_user_id', user.id);

        if (updateError) {
            console.error('Update profile error:', updateError);
            throw updateError;
        }

        return new Response(JSON.stringify({
            success: true,
            premium_expires_at: premiumExpiresAt.toISOString(),
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (err: any) {
        console.error('verify-license error:', err);
        return new Response(JSON.stringify({ error: err.message ?? 'Internal error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
