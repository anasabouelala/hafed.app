import React, { Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// ─────────────────────────────────────────────────────────────────────────────
// Global safety net for background promise rejections we don't own.
// Supabase / GoTrue (assets/supabase-*.js) auto-refreshes the auth token and
// coordinates tabs via the Web Locks API on its own timers — work that no app
// code awaits. A network blip or a stale/cleared token (e.g. after our manual
// localStorage signout cleanup) makes those reject with nothing to catch them,
// surfacing to users as "Unhandled Promise Rejection ... assets/supabase-*.js".
// They are non-fatal: auth recovers on the next tick or user action.
//
// Detection is twofold so we don't depend on one brittle string:
//   1. Stack ORIGIN — anything thrown from the Supabase/GoTrue bundle (prod:
//      assets/supabase-*.js; dev: @supabase/* / gotrue-js / auth-js). This alone
//      catches the reported error regardless of wording.
//   2. Message/name patterns — GoTrue error classes, network "failed to fetch",
//      Web Locks phrasings ("Acquiring an exclusive Navigator LockManager lock…")
//      and token-refresh failures, for cases where the stack is stripped.
// Anything we don't recognise is left untouched so genuine bugs still surface.
// ─────────────────────────────────────────────────────────────────────────────
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason as { name?: string; message?: string; stack?: string } | undefined;
  const name = String(reason?.name ?? '');
  const message = String(reason?.message ?? (typeof reason === 'string' ? reason : ''));
  const stack = String(reason?.stack ?? '');
  const hay = `${name} ${message} ${stack}`.toLowerCase();

  const isBenignAuthNoise =
    // 1. thrown from the Supabase / GoTrue bundle (by stack origin)
    /supabase|gotrue|auth-js/.test(hay) ||
    // 2a. GoTrue error classes
    /auth(retryablefetch|api|sessionmissing|unknown|weakpassword)error/.test(hay) ||
    // 2b. network failures during background fetch / refresh
    /failed to fetch|networkerror|network request failed|load failed|err_network|fetch.*abort|abort(ed|error)/.test(hay) ||
    // 2c. Web Locks API (cross-tab auth coordination) — tolerate word order/phrasing
    /lockmanager|navigator ?\.?locks?|acquir\w*\b[\s\S]*lock|lock[\s\S]*(acquir|timeout|failed)/.test(hay) ||
    // 2d. token refresh
    /refresh.*token|token.*refresh/.test(hay);

  if (isBenignAuthNoise) {
    console.warn('[hafed] Suppressed benign background rejection:', name || message || reason);
    event.preventDefault(); // keep it from surfacing as an Unhandled Promise Rejection
  }
});

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("hafed.app Critical Error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '40px',
          color: 'white',
          backgroundColor: '#0f172a',
          minHeight: '100vh',
          direction: 'ltr',
          fontFamily: 'sans-serif',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <h1 style={{ color: '#ef4444' }}>Runtime Error</h1>
          <p>The application could not start correctly.</p>
          <pre style={{
            color: '#fca5a5',
            backgroundColor: '#1e293b',
            padding: '20px',
            borderRadius: '12px',
            fontSize: '12px',
            marginTop: '20px'
          }}>
            {this.state.error?.message}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '30px',
              padding: '12px 24px',
              backgroundColor: '#06b6d4',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Restart Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
} else {
  console.error("Failed to find root container");
}