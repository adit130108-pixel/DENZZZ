import { useCallback, useEffect, useRef, useState } from 'react';
import { AdminView } from './components/AdminView';
import { BottomTabs, type DashboardTab } from './components/BottomTabs';
import { CombatView } from './components/CombatView';
import { HomeView } from './components/HomeView';
import { LoginGate } from './components/LoginGate';
import { ManageView } from './components/ManageView';
import { SiteOfflineScreen } from './components/SiteOfflineScreen';
import { TopBar } from './components/TopBar';
import { UtilityView } from './components/UtilityView';
import {
  subscribeToFirestoreSiteStatus,
  syncSiteStatusWithRtdbDirect,
} from './firebase';
import {
  clampAimHeight,
  type MarkerStyle,
  type ServerRegion,
} from './utils/dashboardLogic';
import { COPY, HAPP_LINK, type Language } from './utils/i18n';
import {
  DEFAULT_OFFLINE_MESSAGE,
  isAdminRoutePath,
  isNewerOrAuthoritativeStatus,
  normalizeSiteStatus,
  type FirebaseSyncState,
  type SiteStatusPayload,
} from './utils/siteStatusLogic';

const STORAGE_KEY = 'fixa_wire_vip_state_v1';

interface DashboardState {
  authenticated: boolean;
  accessKey: string;
  language: Language;
  server: ServerRegion;
  activeTab: DashboardTab;
  markerEnabled: boolean;
  markerStyle: MarkerStyle;
  aimEnabled: boolean;
  aimHeight: number;
  speedEnabled: boolean;
  speedTenths: number;
  fakeLag: boolean;
  fakeLagFiring: boolean;
  fakeLagScoping: boolean;
  revive: boolean;
  fastMedkit: boolean;
}

function getDefaultState(): DashboardState {
  return {
    authenticated: true,
    accessKey: 'DENZZMODZ',
    language: 'en',
    server: 'OTHER SERVER',
    activeTab: 'homePage',
    markerEnabled: false,
    markerStyle: 'PHANTOM',
    aimEnabled: true,
    aimHeight: 100,
    speedEnabled: false,
    speedTenths: 10,
    fakeLag: false,
    fakeLagFiring: false,
    fakeLagScoping: false,
    revive: false,
    fastMedkit: false,
  };
}

function loadSavedState(): DashboardState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultState();
    const parsed = JSON.parse(raw) as Partial<DashboardState>;
    const defaults = getDefaultState();
    return {
      ...defaults,
      ...parsed,
      accessKey:
        !parsed.accessKey || parsed.accessKey === 'FIXAONLY'
          ? defaults.accessKey
          : parsed.accessKey,
      aimHeight: clampAimHeight(parsed.aimHeight ?? defaults.aimHeight),
    };
  } catch {
    return getDefaultState();
  }
}

export default function App() {
  const [state, setState] = useState<DashboardState>(() => loadSavedState());
  const [keyVisible, setKeyVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastOpen, setToastOpen] = useState(false);
  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(() =>
    isAdminRoutePath(window.location.pathname, window.location.hash),
  );
  const [siteStatus, setSiteStatus] = useState<SiteStatusPayload>({
    online: true,
    message: DEFAULT_OFFLINE_MESSAGE,
    updatedAt: '1970-01-01T00:00:00.000Z',
    updatedBy: 'system',
  });
  const toastTimerRef = useRef<number | null>(null);

  const t = COPY[state.language];

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    setToastOpen(true);
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastOpen(false);
    }, 2600);
  }, []);

  const fetchSiteStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/site-status', { cache: 'no-store' });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data: unknown = await res.json();
        setSiteStatus((prev) => {
          const candidate = normalizeSiteStatus(data, prev);
          return isNewerOrAuthoritativeStatus(candidate, prev) ? candidate : prev;
        });
        return;
      }
    } catch {
      // Fall through to direct RTDB fallback when hosted statically without /api
    }

    const direct = await syncSiteStatusWithRtdbDirect('pull');
    if (direct.status) {
      const rtdbStatus = direct.status;
      setSiteStatus((prev) =>
        isNewerOrAuthoritativeStatus(rtdbStatus, prev) ? rtdbStatus : prev,
      );
    }
  }, []);

  const navigateAdmin = useCallback((openAdmin: boolean) => {
    const nextPath = openAdmin ? '/admin' : '/';
    if (window.location.pathname !== nextPath || window.location.hash) {
      window.history.pushState(null, '', nextPath);
    }
    setIsAdminRoute(openAdmin);
  }, []);

  useEffect(() => {
    const handleRouteChange = () => {
      setIsAdminRoute(
        isAdminRoutePath(window.location.pathname, window.location.hash),
      );
    };
    window.addEventListener('popstate', handleRouteChange);
    window.addEventListener('hashchange', handleRouteChange);
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      window.removeEventListener('hashchange', handleRouteChange);
    };
  }, []);

  useEffect(() => {
    void fetchSiteStatus();
    const interval = window.setInterval(() => {
      void fetchSiteStatus();
    }, 4000);
    let unsubscribeFirestore: (() => void) | undefined;
    try {
      unsubscribeFirestore = subscribeToFirestoreSiteStatus((nextStatus) => {
        setSiteStatus((prev) =>
          isNewerOrAuthoritativeStatus(nextStatus, prev) ? nextStatus : prev,
        );
      });
    } catch {
      // Fallback to server polling
    }
    return () => {
      window.clearInterval(interval);
      if (unsubscribeFirestore) unsubscribeFirestore();
    };
  }, [fetchSiteStatus]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota errors
    }
  }, [state]);

  useEffect(() => {
    document.documentElement.lang = state.language;
  }, [state.language]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const copyText = useCallback(async (text: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      }
    } catch {
      // Clipboard API may be blocked in non-HTTPS contexts
    }
  }, []);

  const handleCopyKey = useCallback(async () => {
    await copyText(state.accessKey);
    showToast(t.toasts.keyCopied(state.accessKey));
  }, [copyText, showToast, state.accessKey, t.toasts]);

  const handleAddSubscription = useCallback(async () => {
    await copyText(HAPP_LINK);
    showToast(t.toasts.happOpening);
    try {
      const anchor = document.createElement('a');
      anchor.href = HAPP_LINK;
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    } catch {
      // Ignore custom protocol rejection in desktop browsers
    }
  }, [copyText, showToast, t.toasts]);

  const handleSelectServer = useCallback(
    (server: ServerRegion) => {
      setState((prev) => ({ ...prev, server }));
      showToast(t.toasts.serverChanged(server));
    },
    [showToast, t.toasts],
  );

  const handleToggleLanguage = useCallback(() => {
    setState((prev) => {
      const nextLang: Language = prev.language === 'en' ? 'id' : 'en';
      showToast(COPY[nextLang].toasts.langChanged);
      return { ...prev, language: nextLang };
    });
  }, [showToast]);

  const handleLogout = useCallback(() => {
    setKeyVisible(false);
    setState((prev) => ({ ...prev, authenticated: false }));
    showToast(t.toasts.loggedOut);
  }, [showToast, t.toasts]);

  const handleUnlock = useCallback(
    (key: string) => {
      setState((prev) => ({
        ...prev,
        authenticated: true,
        accessKey: key,
        activeTab: 'homePage',
      }));
      showToast(t.toasts.unlocked);
    },
    [showToast, t.toasts],
  );

  return (
    <>
      <div className="bg" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>

      <main className="shell">
        <TopBar
          server={state.server}
          onSelectServer={handleSelectServer}
          language={state.language}
          onToggleLanguage={handleToggleLanguage}
          siteOnline={siteStatus.online}
        />

        {isAdminRoute ? (
          <AdminView
            language={state.language}
            siteStatus={siteStatus}
            onSiteStatusUpdated={(
              nextStatus: SiteStatusPayload,
              _syncState: FirebaseSyncState,
            ) => setSiteStatus(nextStatus)}
            onBackToSite={() => navigateAdmin(false)}
            showToast={showToast}
          />
        ) : !siteStatus.online ? (
          <SiteOfflineScreen
            language={state.language}
            status={siteStatus}
            onRefresh={fetchSiteStatus}
            onOpenAdmin={() => navigateAdmin(true)}
          />
        ) : !state.authenticated ? (
          <LoginGate language={state.language} onUnlock={handleUnlock} />
        ) : (
          <>
            <div className="stage">
              {state.activeTab === 'homePage' && (
                <HomeView
                  language={state.language}
                  accessKey={state.accessKey}
                  keyVisible={keyVisible}
                  onToggleKeyVisible={() => setKeyVisible((v) => !v)}
                  onCopyKey={handleCopyKey}
                  onAddSubscription={handleAddSubscription}
                  isPermanent
                  secondsRemaining={0}
                  createdDate="24/11/2026"
                  expiresDate={t.expiresPermanent}
                />
              )}

              {state.activeTab === 'combatView' && (
                <CombatView
                  language={state.language}
                  markerEnabled={state.markerEnabled}
                  onToggleMarker={() =>
                    setState((prev) => ({
                      ...prev,
                      markerEnabled: !prev.markerEnabled,
                    }))
                  }
                  markerStyle={state.markerStyle}
                  onSelectMarkerStyle={(markerStyle) => {
                    setState((prev) => ({ ...prev, markerStyle }));
                    showToast(t.toasts.markerStyle(markerStyle));
                  }}
                  aimEnabled={state.aimEnabled}
                  onToggleAim={() =>
                    setState((prev) => ({ ...prev, aimEnabled: !prev.aimEnabled }))
                  }
                  aimHeight={state.aimHeight}
                  onChangeAimHeight={(aimHeight) =>
                    setState((prev) => ({
                      ...prev,
                      aimHeight: clampAimHeight(aimHeight),
                    }))
                  }
                />
              )}

              {state.activeTab === 'utilityView' && (
                <UtilityView
                  language={state.language}
                  speedEnabled={state.speedEnabled}
                  onToggleSpeed={() =>
                    setState((prev) => ({
                      ...prev,
                      speedEnabled: !prev.speedEnabled,
                    }))
                  }
                  speedTenths={state.speedTenths}
                  onChangeSpeed={(speedTenths) =>
                    setState((prev) => ({ ...prev, speedTenths }))
                  }
                  fakeLag={state.fakeLag}
                  onToggleFakeLag={() =>
                    setState((prev) => ({
                      ...prev,
                      fakeLag: !prev.fakeLag,
                      ...(prev.fakeLag
                        ? { fakeLagFiring: false, fakeLagScoping: false }
                        : {}),
                    }))
                  }
                  fakeLagFiring={state.fakeLagFiring}
                  onToggleFakeLagFiring={() =>
                    setState((prev) => ({
                      ...prev,
                      fakeLagFiring: !prev.fakeLagFiring,
                    }))
                  }
                  fakeLagScoping={state.fakeLagScoping}
                  onToggleFakeLagScoping={() =>
                    setState((prev) => ({
                      ...prev,
                      fakeLagScoping: !prev.fakeLagScoping,
                    }))
                  }
                  revive={state.revive}
                  onToggleRevive={() =>
                    setState((prev) => ({ ...prev, revive: !prev.revive }))
                  }
                  fastMedkit={state.fastMedkit}
                  onToggleFastMedkit={() =>
                    setState((prev) => ({
                      ...prev,
                      fastMedkit: !prev.fastMedkit,
                    }))
                  }
                />
              )}

              {state.activeTab === 'manageView' && (
                <ManageView
                  language={state.language}
                  aimEnabled={state.aimEnabled}
                  aimHeight={state.aimHeight}
                  onAddSubscription={handleAddSubscription}
                  onCopyKey={handleCopyKey}
                  onLogout={handleLogout}
                  onOpenAdmin={() => navigateAdmin(true)}
                />
              )}
            </div>

            <BottomTabs
              activeTab={state.activeTab}
              onSelectTab={(activeTab) =>
                setState((prev) => ({ ...prev, activeTab }))
              }
              language={state.language}
            />
          </>
        )}
      </main>

      <div
        aria-live="polite"
        className={`toast${toastOpen ? ' show' : ''}`}
        id="toast"
        role="status"
      >
        {toastMessage}
      </div>
    </>
  );
}
