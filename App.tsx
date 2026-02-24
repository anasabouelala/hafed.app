
import React, { useState, useEffect, useCallback } from 'react';
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
  const [paywallReason, setPaywallReason] = useState<'game' | 'analysis'>('game');

  const isPremium = user?.isAdmin === true;
  const isPlayingOrDiagnostic = appState === GameState.PLAYING || appState === GameState.DIAGNOSTIC;
  const showTrialBanner = !!user && !isPremium && !isPlayingOrDiagnostic;
  const showReferralBanner = !!user && isPremium && !isPlayingOrDiagnostic;

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



  // ─── Auth Initialisation ─────────────────────────────────────────────────
  useEffect(() => {
    let unmounted = false;
    const initAuth = async () => {
      try {
        setLoadingStatus('Checking Supabase connection...');
        const timeoutPromise = new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error('Auth check timed out')), 5000)
        );
        setLoadingStatus('Fetching user session...');
        const currentUser = await Promise.race([
          authService.getCurrentUser(),
          timeoutPromise,
        ]) as UserProfile | null;

        if (!unmounted) {
          setLoadingStatus('User found, setting state...');
          setUser(currentUser);

          // Auto-direct to dashboard if logged in and on the main / or /activate route
          const currentPath = window.location.pathname;
          if (currentUser && (currentPath === '/' || currentPath === '/app' || currentPath === '/activate')) {
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
        // Also auto-direct to dashboard upon login
        const currentPath = window.location.pathname;
        if (u && (currentPath === '/' || currentPath === '/app' || currentPath === '/activate')) {
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
    if (!isPremium && !trialService.canPlayGame()) {
      setPaywallReason('game');
      setShowPaywall(true);
      return;
    }
    setSelectedSurah(surah);
    setVerseRange({ start: startVerse, end: endVerse });
    setSelectedGameMode(mode);
    setGameConfig(config || {});
    setAppState(GameState.PLAYING);
    if (!isPremium) trialService.recordGame();
  }, [isPremium]);

  const handleStartDiagnostic = useCallback((surah: string, startVerse: number = 1, endVerse?: number) => {
    if (!isPremium && !trialService.canPlayAnalysis()) {
      setPaywallReason('analysis');
      setShowPaywall(true);
      return;
    }
    setSelectedSurah(surah);
    setVerseRange({ start: startVerse, end: endVerse });
    setAppState(GameState.DIAGNOSTIC);
    if (!isPremium) trialService.recordAnalysis();
  }, [isPremium]);

  const handleDiagnosticComplete = useCallback((surah: string, startVerse: number, endVerse?: number) => {
    setMenuInitialState({ step: 'SELECT_MODE', surah, range: { start: startVerse, end: endVerse } });
    setAppState(GameState.MENU);
  }, []);

  const handleOpenDashboard = useCallback(() => { setAppState(GameState.DASHBOARD); }, []);

  const handleExit = useCallback(() => {
    setAppState(GameState.MENU);
    setMenuInitialState(undefined);
    setSelectedSurah('');
    setGameConfig({});
  }, []);

  // ─── Loading Spinner ──────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white" dir="ltr">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-4" />
        <p className="font-mono text-sm">Loading...</p>
        <p className="text-xs text-slate-500 mt-2">{loadingStatus}</p>
      </div>
    );
  }

  const userGumroadUrl = user && user.email
    ? `${GUMROAD_URL}&email=${encodeURIComponent(user.email)}`
    : GUMROAD_URL;

  return (
    <div className={`antialiased font-sans text-white
      ${showTrialBanner ? 'pt-[112px] sm:pt-[74px]' : ''}
      ${showReferralBanner ? 'pt-[52px]' : ''}
    `}>

      {/* ─── Referral Banner (premium users) ─── */}
      {showReferralBanner && <ReferralBanner gumroadUrl={userGumroadUrl} />}

      {/* ─── Trial Banner (free users) ──────── */}
      {showTrialBanner && (
        <TrialBanner onUpgrade={() => { setPaywallReason('game'); setShowPaywall(true); }} gumroadUrl={userGumroadUrl} />
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

      {appState === GameState.MENU && (
        <MainMenu
          user={user}
          startInAuth={activationIntent}
          onStartGame={handleStartGame}
          onStartDiagnostic={handleStartDiagnostic}
          onOpenDashboard={handleOpenDashboard}
          initialState={menuInitialState}
        />
      )}

      {appState === GameState.DASHBOARD && (
        <DashboardScreen onBack={() => setAppState(GameState.MENU)} />
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
    </div>
  );
};

export default App;
