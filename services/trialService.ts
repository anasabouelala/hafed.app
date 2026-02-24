
const TRIAL_KEY = 'hafed_trial';

const MAX_GAMES = 2;
const MAX_ANALYSIS = 1;

interface TrialData {
    gamesPlayed: number;
    analysisPlayed: number;
    dateKey: string; // YYYY-MM-DD — trial resets daily so new visitors always get a fresh taste
}

function todayKey(): string {
    return new Date().toISOString().split('T')[0];
}

function load(): TrialData {
    try {
        const raw = localStorage.getItem(TRIAL_KEY);
        if (!raw) return { gamesPlayed: 0, analysisPlayed: 0, dateKey: todayKey() };
        return JSON.parse(raw);
    } catch {
        return { gamesPlayed: 0, analysisPlayed: 0, dateKey: todayKey() };
    }
}

function save(data: TrialData) {
    localStorage.setItem(TRIAL_KEY, JSON.stringify(data));
}

export const trialService = {
    /** Returns remaining plays for both categories */
    getRemaining(): { games: number; analysis: number } {
        const d = load();
        return {
            games: Math.max(0, MAX_GAMES - d.gamesPlayed),
            analysis: Math.max(0, MAX_ANALYSIS - d.analysisPlayed),
        };
    },

    /** Can the user start a game? */
    canPlayGame(): boolean {
        return load().gamesPlayed < MAX_GAMES;
    },

    /** Can the user start a Quran analysis / diagnostic? */
    canPlayAnalysis(): boolean {
        return load().analysisPlayed < MAX_ANALYSIS;
    },

    /** Call this AFTER successfully starting a game */
    recordGame() {
        const d = load();
        d.gamesPlayed = Math.min(d.gamesPlayed + 1, MAX_GAMES);
        save(d);
    },

    /** Call this AFTER successfully starting an analysis */
    recordAnalysis() {
        const d = load();
        d.analysisPlayed = Math.min(d.analysisPlayed + 1, MAX_ANALYSIS);
        save(d);
    },

    /** True when both quotas are exhausted */
    isExhausted(): boolean {
        const d = load();
        return d.gamesPlayed >= MAX_GAMES && d.analysisPlayed >= MAX_ANALYSIS;
    },

    MAX_GAMES,
    MAX_ANALYSIS,
};
