
// Time-based free trial: every user (new or existing) gets a fresh TRIAL_DAYS of full
// access starting at their first visit after launch, after which the app prompts them to
// subscribe (a closable popup + a permanent header). The clock is a device-local
// "first seen" timestamp — simple, and it gives everyone a fresh window rather than
// instantly expiring accounts that were created long ago.
const TRIAL_DAYS = 2;
const DAY_MS = 24 * 60 * 60 * 1000;
const START_KEY = 'hafed_trial_start';

function startMs(): number {
    try {
        const raw = localStorage.getItem(START_KEY);
        if (raw) {
            const n = parseInt(raw, 10);
            if (!Number.isNaN(n)) return n;
        }
        const now = Date.now();
        localStorage.setItem(START_KEY, String(now));
        return now;
    } catch {
        return Date.now();
    }
}

export const trialService = {
    TRIAL_DAYS,

    /** Seed the trial start now (first app load) so the clock begins immediately. */
    ensureStarted(): void {
        try { startMs(); } catch { /* ignore */ }
    },

    /** Milliseconds left in the trial (0 once it has ended). */
    msLeft(): number {
        return Math.max(0, startMs() + TRIAL_DAYS * DAY_MS - Date.now());
    },

    /** Whole days left, rounded up — shows the final 24 hours as "1 يوم". */
    daysLeft(): number {
        return Math.ceil(this.msLeft() / DAY_MS);
    },

    isActive(): boolean {
        return this.msLeft() > 0;
    },

    isEnded(): boolean {
        return this.msLeft() <= 0;
    },
};
