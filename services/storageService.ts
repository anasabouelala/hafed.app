
import { supabase } from './supabaseClient';
import { authService } from './authService';
import { GlobalStats, SurahStats } from '../types';

// Placeholder for storage service - implementation for Dashboard

const STORAGE_KEY_GLOBAL = 'hafed_global_stats';
const STORAGE_KEY_SURAHS = 'hafed_surah_stats';

// --- Cloud Sync ---

export const syncFromCloud = async () => {
    // This would typically sync local storage with Supabase
    // For now we just rely on direct fetching in authService for the dashboard
    console.log('[Storage] Syncing from cloud...');
    return true;
};

export const saveProgress = async (data: any) => {
    // Save locally or push to cloud
    console.log('[Storage] Saving progress:', data);
};

export const saveDiagnosticResult = async (surahName: string, score: number, startVerse: number, endVerse?: number) => {
    try {
        // Optimistic update locally first
        updateLocalSurahStats(surahName, score);

        const { data, error } = await supabase.from('user_surah_progress').upsert({
            surah_name: surahName,
            mastery_level: score,
            last_played: new Date().toISOString(),
            // user_id is filled in automatically by the set_progress_user_id() trigger
            // from the caller's profile (see supabase/migrations).
        }, { onConflict: 'user_id,surah_name' });

        if (error) {
            console.warn('[Storage] Diagnostic save warning (Supabase):', error.message);
        } else {
            console.log('[Storage] Diagnostic result saved to cloud');
        }
    } catch (e) {
        console.error('[Storage] Failed to save diagnostic:', e);
    }
};

// --- Local Storage Helpers for Dashboard ---

export const getGlobalStats = (): GlobalStats => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY_GLOBAL);
        if (stored) return JSON.parse(stored);
    } catch (e) {
        console.error('Failed to load global stats', e);
    }
    return {
        totalXp: 0,
        level: 1,
        totalGamesPlayed: 0,
        streakDays: 0,
        lastLoginDate: new Date().toISOString(),
        achievements: [],
        goals: []
    };
};

export const saveGlobalStats = (stats: GlobalStats) => {
    localStorage.setItem(STORAGE_KEY_GLOBAL, JSON.stringify(stats));
};

export const getSurahStats = (): Record<string, SurahStats> => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY_SURAHS);
        if (stored) return JSON.parse(stored);
    } catch (e) {
        console.error('Failed to load surah stats', e);
    }
    return {};
};

export const saveSurahStats = (stats: Record<string, SurahStats>) => {
    localStorage.setItem(STORAGE_KEY_SURAHS, JSON.stringify(stats));
};

// Helper: Update specific surah locally
const updateLocalSurahStats = (surahName: string, mastery: number) => {
    const all = getSurahStats();
    const existing: SurahStats = all[surahName] || {
        surahName,
        masteryLevel: 0,
        stars: 0,
        highScore: 0,
        lastPlayed: 0,
        gamesPlayed: 0,
        versesMastered: 0
    };

    // Update logic
    if (mastery > existing.masteryLevel) {
        existing.masteryLevel = mastery;
    }
    existing.lastPlayed = Date.now();
    existing.gamesPlayed = (existing.gamesPlayed || 0) + 1;

    if (existing.masteryLevel >= 90) existing.stars = 3;
    else if (existing.masteryLevel >= 70) existing.stars = 2;
    else if (existing.masteryLevel >= 50) existing.stars = 1;

    all[surahName] = existing;
    saveSurahStats(all);

    // Also update global XP
    const global = getGlobalStats();
    global.totalXp = (global.totalXp || 0) + 10; // modest XP gain
    global.totalGamesPlayed = (global.totalGamesPlayed || 0) + 1;
    saveGlobalStats(global);
};


// --- Goal Management ---

export const addGoal = (surahName: string, targetDate?: string) => {
    const global = getGlobalStats();
    if (!global.goals) global.goals = [];

    global.goals.push({
        id: Date.now().toString(),
        surahName,
        targetDate,
        isCompleted: false,
        createdAt: Date.now()
    });
    saveGlobalStats(global);
};

export const removeGoal = (id: string) => {
    const global = getGlobalStats();
    if (global.goals) {
        global.goals = global.goals.filter(g => g.id !== id);
        saveGlobalStats(global);
    }
    saveGlobalStats(global);
};

export const saveGameSession = async (surahName: string, score: number, accuracy: number, isVictory: boolean, versesPlayed: number[]) => {
    try {
        console.log('[Storage] Saving game session:', { surahName, score, accuracy, isVictory });

        // 1. Update Local Stats (Optimistic)
        const surahStats = getSurahStats();
        const surah = surahStats[surahName] || {
            surahName,
            masteryLevel: 0,
            stars: 0,
            highScore: 0,
            lastPlayed: 0,
            gamesPlayed: 0,
            versesMastered: 0,
            masteredVersesList: []
        };

        // Update High Score
        if (score > surah.highScore) {
            surah.highScore = score;
        }

        // Update Mastery (Approximation based on accuracy)
        // Ideally we'd map specific verses, but for now we use accuracy as a proxy for the session's impact
        const sessionImpact = (accuracy / 100) * (versesPlayed.length); // How many effective verses we mastered this session

        // Simple mastery update logic (can be made more complex)
        // If accuracy is high, we assume these verses are "mastered" or improved
        if (isVictory || accuracy > 80) {
            let currentMastered = new Set(surah.masteredVersesList || []);
            versesPlayed.forEach(v => currentMastered.add(v));
            surah.masteredVersesList = Array.from(currentMastered).sort((a, b) => a - b);
            surah.versesMastered = surah.masteredVersesList.length;

            // Recalculate mastery % based on total verses? 
            // Since we don't know total verses count easily without API, we might cap it or use a relative metric
            // For now, let's just accept the session accuracy as the new mastery level if it's better
            if (accuracy > surah.masteryLevel) {
                surah.masteryLevel = accuracy;
            }
        }

        surah.gamesPlayed += 1;
        surah.lastPlayed = Date.now();

        // Recalculate Stars
        if (surah.masteryLevel >= 95) surah.stars = 3;
        else if (surah.masteryLevel >= 75) surah.stars = 2;
        else if (surah.masteryLevel >= 50) surah.stars = 1;

        surahStats[surahName] = surah;
        saveSurahStats(surahStats);

        // 2. Update Global Stats
        const global = getGlobalStats();
        global.totalXp += (score / 10); // 10% of score is XP
        global.totalGamesPlayed += 1;
        // Streak logic would go here (checking last login/play date)
        saveGlobalStats(global);

        // 2b. Mirror the XP gain to the logged-in user's cloud profile (guests stay
        // local-only). Fire-and-forget so it never blocks the GameOver screen.
        authService.addXp(score / 10).catch(() => { });

        // 3. Sync to Supabase
        const { error } = await supabase.from('user_surah_progress').upsert({
            surah_name: surahName,
            high_score: surah.highScore,
            mastery_level: surah.masteryLevel,
            last_played: new Date().toISOString()
            // user_id auto-filled by the set_progress_user_id() trigger.
        }, { onConflict: 'user_id,surah_name' });

        if (error) console.warn('[Storage] Failed to sync game session to cloud', error);

    } catch (e) {
        console.error('[Storage] Error saving game session:', e);
    }
};
