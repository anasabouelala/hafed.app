
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gamepad2 } from 'lucide-react';
import { MainMenu } from './components/screens/MainMenu';
import { GameScreen } from './components/screens/GameScreen';
import { DiagnosticScreen } from './components/screens/DiagnosticScreen';
import { DashboardScreen } from './components/screens/DashboardScreen';
import { PaywallModal } from './components/ui/PaywallModal';
import { TrialBanner } from './components/ui/TrialBanner';
import { ReferralBanner } from './components/ui/ReferralBanner';
import { LicenseActivation } from './components/ui/LicenseActivation';
import { GameState, GameMode, UserProfile } from './types';
import { authService } from './services/authService';
import { trialService } from './services/trialService';
import { PremiumWelcomeModal } from './components/ui/PremiumWelcomeModal';
import { SupportWidget } from './components/ui/SupportWidget';

// ─── Gumroad product checkout ─────────────────────────────────────────────────
const GUMROAD_URL = 'https://hafedapp.gumroad.com/l/mfkxjl?wanted=true';

// ─── URL ↔ AppState mapping ────────────────────────────────────────────────────
const STATE_TO_PATH: Partial<Record<GameState, string>> = {
  [GameState.MENU]: '/',
  [GameState.DASHBOARD]: '/stats',
  [GameState.PLAYING]: '/play',
  [GameState.DIAGNOSTIC]: '/diagnostic',
};
const PATH_TO_STATE: Record<string, GameState> = {
  '/': GameState.MENU,
  '/app': GameState.MENU, // logged-in root also maps to MENU (USER_HOME step shown by MainMenu)
  '/stats': GameState.DASHBOARD,
  '/play': GameState.PLAYING,
  '/diagnostic': GameState.DIAGNOSTIC,
  '/activate': GameState.MENU,
};

function navigate(path: string, replace = false) {
  if (window.location.pathname === path) return;
  if (replace) window.history.replaceState({ path }, '', path);
  else window.history.pushState({ path }, '', path);
}

const App: React.FC = () => {
  // Determine initial state from current URL
  const initialState = PATH_TO_STATE[window.location.pathname] ?? GameState.MENU;
  const [appState, setAppState] = useState<GameState>(initialState);
  const appStateRef = React.useRef(appState); // current appState for stale-closure-free reads
  React.useEffect(() => { appStateRef.current = appState; }, [appState]);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Game Selection State
  const [selectedSurah, setSelectedSurah] = useState<string>('');
  const [verseRange, setVerseRange] = useState<{ start: number; end?: number }>({ start: 1 });
  const [selectedGameMode, setSelectedGameMode] = useState<GameMode>('CLASSIC');
  const [gameConfig, setGameConfig] = useState<any>({});

  // Deep-link props for Menu
  const [menuInitialState, setMenuInitialState] = useState<{
    step: 'SELECT_MODE';
    surah: string;
    range: { start: number; end?: number };
  } | undefined>(undefined);

  const [loadingStatus, setLoadingStatus] = useState('Initializing...');

  // ─── Trial / Paywall State ────────────────────────────────────────────────
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallReason, setPaywallReason] = useState<'game' | 'analysis' | 'trial'>('game');
  const [showPremiumWelcome, setShowPremiumWelcome] = useState(false);

  const isPremium = user?.isAdmin === true;
  const isPlayingOrDiagnostic = appState === GameState.PLAYING || appState === GameState.DIAGNOSTIC;
  // Time-based free trial (2 days). The clock is a device-local first-seen timestamp — a
  // fresh 2 days for everyone (new or existing). Premium users are exempt.
  const trialEnded = !isPremium && trialService.isEnded();
  const trialDaysLeft = trialService.daysLeft();
  // Permanent header once the trial ends (everywhere except active gameplay); during the
  // active trial it's a gentle "days left" nudge shown off the main menu.
  const showTrialBanner = !!user && !isPremium && !isPlayingOrDiagnostic && (trialEnded || appState !== GameState.MENU);
  const showReferralBanner = !!user && isPremium && !isPlayingOrDiagnostic;

  // Start the trial clock for guests on first load.
  useEffect(() => { trialService.ensureStarted(); }, []);

  // When the trial has ended, surface the closable popup once per session (the permanent
  // header stays regardless). Wait for auth to resolve so premium users never see it.
  useEffect(() => {
    if (!authLoading && trialEnded && !sessionStorage.getItem('hafed_trial_popup_seen')) {
      setPaywallReason('trial');
      setShowPaywall(true);
      try { sessionStorage.setItem('hafed_trial_popup_seen', '1'); } catch { /* ignore */ }
    }
  }, [authLoading, trialEnded]);

  // ─── License Activation ──────────────────────────────────────────────────
  const [licenseKey, setLicenseKey] = useState('');
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [activationIntent, setActivationIntent] = useState(() => {
    return window.location.pathname === '/activate' || new URLSearchParams(window.location.search).has('license_key');
  });

  // ─── URL sync: update URL whenever appState changes ─────────────────────
  useEffect(() => {
    // Preserve `/activate` in the url bar if that's where we landed
    if (appState === GameState.MENU && window.location.pathname === '/activate') {
      return;
    }
    const path = STATE_TO_PATH[appState] ?? '/';
    navigate(path);
  }, [appState]);

  // ─── Back/Forward button support ─────────────────────────────────────────
  useEffect(() => {
    const onPopState = (e: PopStateEvent) => {
      const path = e.state?.path ?? window.location.pathname;
      const state = PATH_TO_STATE[path] ?? GameState.MENU;
      setAppState(state);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // ─── Detect ?license_key= from Gumroad redirect ──────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const key = params.get('license_key');
    if (key) {
      setLicenseKey(key);
      // Clean query string but keep the pathname
      params.delete('license_key');
      const newSearch = params.toString();
      window.history.replaceState({}, '', window.location.pathname + (newSearch ? `?${newSearch}` : ''));
    }
  }, []);

  // Show activation modal once user is loaded
  useEffect(() => {
    if (activationIntent && user) {
      if (!isPremium) {
        setShowLicenseModal(true);
      }
      setActivationIntent(false);
    }
  }, [activationIntent, user, isPremium]);

  // Show premium welcome modal once 
  useEffect(() => {
    if (user && isPremium) {
      const hasSeenWelcome = localStorage.getItem('hafed_premium_welcomed');
      if (!hasSeenWelcome) {
        setShowPremiumWelcome(true);
      }
    }
  }, [user, isPremium]);

  const handleCloseWelcome = () => {
    localStorage.setItem('hafed_premium_welcomed', 'true');
    setShowPremiumWelcome(false);
  };

  // ─── Auth Initialisation ─────────────────────────────────────────────────
  useEffect(() => {
    let unmounted = false;
    const initAuth = async () => {
      try {
        setLoadingStatus('Checking Supabase connection...');
        const timeoutPromise = new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error('Auth check timed out')), 8000)
        );
        setLoadingStatus('Fetching user session...');
        const currentUser = await Promise.race([
          authService.getCurrentUser(),
          timeoutPromise,
        ]) as UserProfile | null;

        if (!unmounted) {
          setLoadingStatus('User found, setting state...');
          setUser(currentUser);

          // Auto-direct to dashboard if logged in and currently on the landing/menu state
          if (currentUser && appStateRef.current === GameState.MENU) {
            setAppState(GameState.DASHBOARD);
          }
        }
      } catch (error) {
        console.error('Auth check failed or timed out', error);
      } finally {
        if (!unmounted) {
          setLoadingStatus('Finalizing...');
          setAuthLoading(false);
        }
      }
    };
    initAuth();

    const { data } = authService.onAuthStateChange((u) => {
      if (!unmounted) {
        setUser(u);
        // Also auto-direct to dashboard upon login (current state, not stale closure)
        if (u && appStateRef.current === GameState.MENU) {
          setAppState(GameState.DASHBOARD);
        }
      }
    });

    return () => {
      unmounted = true;
      data?.subscription.unsubscribe();
    };
  }, []);

  // ─── Auto-Refresh on Window Focus ──────────────────────────────────────────
  useEffect(() => {
    const onFocus = async () => {
      // Re-fetch user on window focus to catch seamless Gumroad upgrades instantly
      if (document.visibilityState === 'visible' && user && !isPremium) {
        try {
          const freshUser = await authService.getCurrentUser();
          if (freshUser && freshUser.isAdmin) {
            // Upgraded!
            setUser(freshUser);
            setShowPaywall(false);
            setShowLicenseModal(false);
          }
        } catch (e) {
          console.error("Failed to refresh user on focus:", e);
        }
      }
    };

    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('focus', onFocus);

    // Also poll every 10 seconds just in case they don't switch tabs (e.g. split screen)
    let pollInterval: any;
    if (user && !isPremium) {
      pollInterval = setInterval(onFocus, 10000);
    }

    return () => {
      document.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('focus', onFocus);
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [user, isPremium]);

  // ─── Gated Handlers ──────────────────────────────────────────────────────
  const handleStartGame = useCallback((
    surah: string,
    startVerse: number = 1,
    endVerse?: number,
    mode: GameMode = 'CLASSIC',
    config?: any,
  ) => {
    if (!isPremium && trialService.isEnded()) {
      setPaywallReason('trial');
      setShowPaywall(true);
      return;
    }
    setSelectedSurah(surah);
    setVerseRange({ start: startVerse, end: endVerse });
    setSelectedGameMode(mode);
    setGameConfig(config || {});
    setAppState(GameState.PLAYING);
  }, [isPremium]);

  const handleStartDiagnostic = useCallback((surah: string, startVerse: number = 1, endVerse?: number) => {
    if (!isPremium && trialService.isEnded()) {
      setPaywallReason('trial');
      setShowPaywall(true);
      return;
    }
    setSelectedSurah(surah);
    setVerseRange({ start: startVerse, end: endVerse });
    setAppState(GameState.DIAGNOSTIC);
  }, [isPremium]);

  const handleDiagnosticComplete = useCallback((surah: string, startVerse: number, endVerse?: number) => {
    setMenuInitialState({ step: 'SELECT_MODE', surah, range: { start: startVerse, end: endVerse } });
    setAppState(GameState.MENU);
  }, []);

  const handleOpenDashboard = useCallback(() => { setAppState(GameState.DASHBOARD); }, []);

  const handleLogout = () => {
    // 1. Instantly unmount the dashboard to give user feedback
    setUser(null);
    setAppState(GameState.MENU);

    // 2. Clear credentials safely from local storage manually & call server signout
    authService.signOut();

    // 3. Clear the URL to avoid license key bugs on reload
    if (window.location.search.includes('license_key')) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // 4. Force a hard reload so the browser has a completely fresh memory state
    window.location.href = '/';
  };

  const handleExit = useCallback(() => {
    setAppState(GameState.MENU);
    setMenuInitialState(undefined);
    setSelectedSurah('');
    setGameConfig({});
  }, []);

  // ─── Loading Screen ───────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white overflow-hidden relative" dir="ltr">
        {/* soft animated background glow */}
        <motion.div
          aria-hidden
          className="absolute w-[480px] h-[480px] rounded-full bg-cyan-500/10 blur-3xl"
          animate={{ scale: [1, 1.25, 1], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />

        <div className="relative flex items-center justify-center mb-8">
          {/* rotating orbital ring */}
          <motion.div
            className="absolute w-28 h-28 rounded-full border-2 border-transparent border-t-cyan-400 border-r-blue-500"
            animate={{ rotate: 360 }}
            transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}
          />
          {/* counter-rotating inner ring */}
          <motion.div
            className="absolute w-20 h-20 rounded-full border-2 border-transparent border-b-indigo-400/70"
            animate={{ rotate: -360 }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
          />
          {/* breathing logo core */}
          <motion.div
            className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-400 to-blue-600 flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.5)]"
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Gamepad2 size={30} className="text-white" />
          </motion.div>
        </div>

        <motion.p
          className="font-extrabold text-lg tracking-tight"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          hafed<span className="text-cyan-400">.app</span>
        </motion.p>

        {/* bouncing dots */}
        <div className="flex items-center gap-1.5 mt-3">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="w-2 h-2 rounded-full bg-cyan-400"
              animate={{ y: [0, -6, 0], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut', delay: i * 0.15 }}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.p
            key={loadingStatus}
            className="text-xs text-slate-500 mt-4 h-4"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
          >
            {loadingStatus}
          </motion.p>
        </AnimatePresence>
      </div>
    );
  }

  const userGumroadUrl = user && user.email
    ? `${GUMROAD_URL}&email=${encodeURIComponent(user.email)}`
    : GUMROAD_URL;

  return (
    <div className={`antialiased font-sans text-white
      ${showTrialBanner ? 'pt-[80px] sm:pt-[60px]' : ''}
      ${showReferralBanner ? 'pt-[52px]' : ''}
    `}>

      {/* ─── Referral Banner (premium users) ─── */}
      {showReferralBanner && <ReferralBanner gumroadUrl={userGumroadUrl} />}

      {/* ─── Trial Banner (free users) ──────── */}
      {showTrialBanner && (
        <TrialBanner daysLeft={trialDaysLeft} ended={trialEnded} gumroadUrl={userGumroadUrl} />
      )}

      {/* ─── Paywall Modal ───────────────────── */}
      <PaywallModal
        open={showPaywall}
        onClose={() => setShowPaywall(false)}
        reason={paywallReason}
        gumroadUrl={userGumroadUrl}
      />

      {/* ─── License Activation Modal ─────────── */}
      {showLicenseModal && (
        <LicenseActivation
          initialKey={licenseKey}
          onSuccess={async () => {
            const updated = await authService.getCurrentUser();
            setUser(updated);
            setShowLicenseModal(false);
            setLicenseKey('');
            setAppState(GameState.DASHBOARD);
            setMenuInitialState(undefined);
          }}
          onClose={() => setShowLicenseModal(false)}
        />
      )}
      {/* ─── Animated screen transitions ─────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={appState}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          {appState === GameState.MENU && (
            <MainMenu
              user={user}
              startInAuth={activationIntent}
              onStartGame={handleStartGame}
              onStartDiagnostic={handleStartDiagnostic}
              onOpenDashboard={handleOpenDashboard}
              initialState={menuInitialState}
              onLogout={handleLogout}
            />
          )}
          {appState === GameState.DASHBOARD && (
            <DashboardScreen onBack={() => setAppState(GameState.MENU)} isPremium={isPremium} onLogout={handleLogout} userEmail={user?.email} userName={user?.name} />
          )}

          {appState === GameState.DIAGNOSTIC && (
            <DiagnosticScreen
              targetSurah={selectedSurah}
              startVerse={verseRange.start}
              endVerse={verseRange.end}
              onDiagnosticComplete={handleDiagnosticComplete}
              onBack={handleExit}
            />
          )}

          {appState === GameState.PLAYING && (
            <GameScreen
              surahName={selectedSurah}
              initialVerse={verseRange.start}
              endVerse={verseRange.end}
              gameMode={selectedGameMode}
              config={gameConfig}
              onExit={handleExit}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Premium Welcome Popup */}
      <PremiumWelcomeModal
        isOpen={showPremiumWelcome}
        onClose={handleCloseWelcome}
      />

      {/* Global Support Widget */}
      <SupportWidget />
    </div>
  );
};

export default App;
