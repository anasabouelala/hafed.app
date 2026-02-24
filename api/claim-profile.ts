import { createClient } from '@supabase/supabase-js';

export const config = {
    runtime: 'edge',
};

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
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Missing authorization' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const supabaseAdminUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

        if (!supabaseServiceKey) {
            console.error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable in Vercel");
            return new Response(JSON.stringify({ error: 'Server Configuration Error' }), { status: 500 });
        }

        // 1. Initialize admin client to bypass RLS
        const supabaseAdmin = createClient(supabaseAdminUrl, supabaseServiceKey);

        // 2. Initialize normal client just to verify their JWT token
        const supabaseClient = createClient(
            supabaseAdminUrl,
            process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '',
            { global: { headers: { Authorization: authHeader } } }
        );

        const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
        if (authError || !user || !user.email) {
            return new Response(JSON.stringify({ error: 'Not authenticated or missing email' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const userEmail = user.email.toLowerCase().trim();

        // 3. Find if they have a shadow profile (auth_user_id is null)
        const { data: shadowProfile } = await supabaseAdmin
            .from('profiles')
            .select('id, auth_user_id')
            .eq('email', userEmail)
            .is('auth_user_id', null)
            .maybeSingle();

        if (shadowProfile) {
            // 4. Claim the shadow profile! Update using the Admin client to bypass RLS.
            const { error: linkError } = await supabaseAdmin
                .from('profiles')
                .update({ auth_user_id: user.id })
                .eq('id', shadowProfile.id);

            if (linkError) {
                console.error('Failed to claim shadow profile:', linkError);
                return new Response(JSON.stringify({ error: 'Failed to claim shadow profile' }), { status: 500 });
            }

            return new Response(JSON.stringify({ success: true, claimed: true }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Nothing to claim
        return new Response(JSON.stringify({ success: true, claimed: false }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (err: any) {
        console.error('claim-profile API error:', err);
        return new Response(JSON.stringify({ error: err.message ?? 'Unknown' }), { status: 500 });
    }
}
