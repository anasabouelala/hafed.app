
import { supabase } from './supabaseClient';
import { UserProfile } from '../types';

// ─── Hardcoded admins — always have full access ──────────────────────────────
// Add your email(s) here. These bypass the database is_admin flag entirely.
const ADMIN_EMAILS = new Set([
    'anasabouelala@gmail.com', // owner — full access forever
]);

export const authService = {
    async getCurrentUser(): Promise<UserProfile | null> {
        try {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !session?.user) return null;

            let { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('auth_user_id', session.user.id)
                .maybeSingle();

            // Link shadow profile from Gumroad webhook via secure Vercel API
            if (!profile && session.user.email) {
                try {
                    const res = await fetch('/api/claim-profile', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${session.access_token}`
                        }
                    });
                    const data = await res.json();

                    if (data?.claimed) {
                        // Shadow profile claimed! Fetch the fresh profile again safely
                        const { data: refreshedProfile } = await supabase
                            .from('profiles')
                            .select('*')
                            .eq('auth_user_id', session.user.id)
                            .maybeSingle();

                        if (refreshedProfile) {
                            profile = refreshedProfile;
                            error = null;
                        }
                    }
                } catch (apiErr) {
                    console.error('Failed to claim shadow profile API call', apiErr);
                }
            }

            if (error || !profile) {
                const email = session.user.email || '';
                return {
                    name: session.user.user_metadata.full_name || email.split('@')[0] || 'User',
                    email,
                    level: 1,
                    xp: 0,
                    streak: 0,
                    badges: [],
                    accuracy: 0,
                    totalGamesPlayed: 0,
                    isAdmin: ADMIN_EMAILS.has(email)
                };
            }

            // Fetch additional stats:
            // 1. Current Surah Progress (Most recently updated)
            const { data: recentProgress } = await supabase
                .from('user_surah_progress')
                .select('surah_name, mastery_level')
                .eq('user_id', profile.id)
                .order('updated_at', { ascending: false })
                .limit(1)
                .single();

            // 2. Total Games Played (Sum of games_played across all surahs)
            // Or count of rows if we track per-game. Here using aggregated per-surah.
            const { data: totalGames } = await supabase
                .from('user_surah_progress')
                .select('games_played');

            const gamesCount = totalGames?.reduce((acc, curr) => acc + (curr.games_played || 0), 0) || 0;

            // 3. Average Accuracy (Mastery Level)
            const { data: allProgress } = await supabase
                .from('user_surah_progress')
                .select('mastery_level');

            const avgAccuracy = allProgress && allProgress.length > 0
                ? allProgress.reduce((acc, curr) => acc + (curr.mastery_level || 0), 0) / allProgress.length
                : 0;

            const profileEmail = profile.email || session.user.email || '';
            const premiumActive = profile.is_premium === true &&
                (profile.premium_expires_at == null ||
                    new Date(profile.premium_expires_at) > new Date());
            return {
                name: profile.full_name || session.user.user_metadata.full_name || 'User',
                email: profileEmail,
                level: profile.level || 1,
                xp: profile.xp || 0,
                streak: profile.streak || 0,
                badges: profile.badges || [],
                accuracy: Math.round(avgAccuracy),
                totalGamesPlayed: gamesCount,
                isAdmin: ADMIN_EMAILS.has(profileEmail) || profile.is_admin === true || premiumActive,
                currentSurah: recentProgress ? {
                    name: recentProgress.surah_name,
                    progress: Math.round(recentProgress.mastery_level || 0)
                } : undefined
            };
        } catch (error: any) {
            if (error.name === 'AbortError' || error.message?.includes('aborted')) {
                console.log('Ignored abort error in getCurrentUser');
            } else {
                console.error('Failed to get current user:', error);
            }
            return null;
        }
    },

    async signIn(email: string, password: string) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        if (error) throw error;
        return data.user;
    },

    async signUp(email: string, password: string, name: string) {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: name
                }
            }
        });
        if (error) throw error;

        // Setup initial profile
        if (data.user) {
            const userEmail = email.toLowerCase().trim();
            try {
                // The /api/claim-profile expects the token.
                // We don't have the token reliably until user signs in.
                // So we'll just insert a normal profile.
                // If a shadow profile already exists, RLS will block inserting duplicate email unless handled.
                // BUT it is better to rely on getCurrentUser linking it instead!

                // First check if ANY profile exists for this email
                const { data: existingProfile } = await supabase
                    .from('profiles')
                    .select('id, auth_user_id')
                    .eq('email', userEmail)
                    .maybeSingle();

                if (existingProfile) {
                    // Profile exists. If auth_user_id is null, it's a shadow profile.
                    // We don't have the full session token yet, so `getCurrentUser` will trigger next and claim it securely.
                    console.log('Existing profile found, deferring to getCurrentUser for claiming');
                } else {
                    // No profile exists, safe to insert!
                    const { error: profileError } = await supabase
                        .from('profiles')
                        .insert([
                            {
                                auth_user_id: data.user.id,
                                email: userEmail,
                                full_name: name,
                                level: 1,
                                xp: 0,
                                streak: 0
                            }
                        ]);
                    if (profileError) console.error('Error creating profile:', profileError);
                }
            } catch (err) {
                console.error("Setup initial profile issue:", err);
            }
        }

        return data.user;
    },

    async signInWithGoogle() {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`
            }
        });
        if (error) throw error;
        return data;
    },

    async signOut() {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    },

    /** Verify a Gumroad license key and activate premium on the logged-in user */
    async activateLicense(licenseKey: string): Promise<{ success: boolean; premium_expires_at?: string; error?: string }> {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return { success: false, error: 'Not authenticated' };

            // Call Vercel API Route instead of Supabase Edge Function to avoid deployment/CORS issues
            const res = await fetch('/api/verify-license', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ license_key: licenseKey })
            });

            const data = await res.json();

            if (!res.ok) {
                return { success: false, error: data.error || 'Activation failed' };
            }

            return data as { success: boolean; premium_expires_at: string };
        } catch (err: any) {
            return { success: false, error: err.message || 'Network error' };
        }
    },

    onAuthStateChange(callback: (user: UserProfile | null) => void) {
        return supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session?.user) {
                try {
                    // Fetch full profile again
                    const user = await this.getCurrentUser();
                    callback(user);
                } catch (error: any) {
                    if (error.name === 'AbortError' || error.message?.includes('aborted')) {
                        console.log('Ignored abort error during auth state change');
                    } else {
                        console.error('Error fetching user on auth change:', error);
                    }
                    // We might not want to callback(null) here because the user IS logged in, 
                    // we just failed to fetch the profile.
                }
            } else {
                callback(null);
            }
        });
    }
};
