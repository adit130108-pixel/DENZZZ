import { onAuthStateChanged, type User } from 'firebase/auth';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  auth,
  fetchSiteStatusFromFirestore,
  handleGoogleRedirectResult,
  signInAdminWithGoogle,
  signOutAdminGoogle,
  syncSiteStatusWithRtdbDirect,
  writeSiteStatusToFirestore,
} from '../firebase';
import { COPY, type Language } from '../utils/i18n';
import {
  DEFAULT_ADMIN_EMAIL,
  DEFAULT_FIREBASE_RTDB_URL,
  DEFAULT_OFFLINE_MESSAGE,
  isAuthorizedAdminEmail,
  isNewerOrAuthoritativeStatus,
  mapGoogleAuthErrorMessage,
  sanitizeStatusMessage,
  type FirebaseSyncState,
  type SiteStatusPayload,
} from '../utils/siteStatusLogic';

interface AdminViewProps {
  language: Language;
  siteStatus: SiteStatusPayload;
  onSiteStatusUpdated: (
    nextStatus: SiteStatusPayload,
    syncState: FirebaseSyncState,
  ) => void;
  onBackToSite: () => void;
  showToast: (msg: string) => void;
}

interface AdminStatusResponse {
  status: SiteStatusPayload;
  firebaseSyncState: FirebaseSyncState;
  firebaseUrl: string;
  hasDbSecret: boolean;
  adminEmail?: string;
  error?: string;
}

export function AdminView({
  language,
  siteStatus,
  onSiteStatusUpdated,
  onBackToSite,
  showToast,
}: AdminViewProps) {
  const t = COPY[language];
  const [user, setUser] = useState<User | null>(() => auth.currentUser);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [authorized, setAuthorized] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');
  const [signingIn, setSigningIn] = useState<boolean>(false);

  const [firebaseUrl, setFirebaseUrl] = useState(DEFAULT_FIREBASE_RTDB_URL);
  const [syncState, setSyncState] = useState<FirebaseSyncState>('pending');
  const [messageInput, setMessageInput] = useState(siteStatus.message);
  const [savingStatus, setSavingStatus] = useState(false);
  const [syncingFirebase, setSyncingFirebase] = useState(false);

  const verifyAdminSession = useCallback(
    async (firebaseUser: User) => {
      setAuthError('');
      let idToken = '';
      try {
        idToken = await firebaseUser.getIdToken();
      } catch (err) {
        setAuthorized(false);
        setAuthError(
          mapGoogleAuthErrorMessage(err, window.location.hostname, language),
        );
        return;
      }

      let apiHandled = false;
      let resolvedStatus = siteStatus;
      let resolvedSync: FirebaseSyncState = 'pending';
      let resolvedUrl = DEFAULT_FIREBASE_RTDB_URL;

      try {
        const res = await fetch('/api/admin/status', {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          apiHandled = true;
          const data = (await res.json()) as AdminStatusResponse;
          if (res.status === 401 || res.status === 403) {
            setAuthorized(false);
            setAuthError(data.error || t.admin.unauthorizedHint);
            return;
          }
          if (!res.ok) {
            setAuthorized(false);
            setAuthError(data.error || 'Gagal memverifikasi sesi admin.');
            return;
          }
          resolvedStatus = data.status;
          resolvedSync = data.firebaseSyncState;
          resolvedUrl = data.firebaseUrl || DEFAULT_FIREBASE_RTDB_URL;
        }
      } catch {
        // Backend /api unavailable (e.g., static upload to Netlify Drop / Vercel static)
      }

      if (!apiHandled) {
        if (
          !isAuthorizedAdminEmail(
            firebaseUser.email,
            [DEFAULT_ADMIN_EMAIL],
            firebaseUser.emailVerified,
          )
        ) {
          setAuthorized(false);
          setAuthError(t.admin.unauthorizedHint);
          return;
        }
        const directRtdb = await syncSiteStatusWithRtdbDirect(
          'pull',
          undefined,
          idToken,
        );
        resolvedSync = directRtdb.syncState;
        if (directRtdb.status && isNewerOrAuthoritativeStatus(directRtdb.status, resolvedStatus)) {
          resolvedStatus = directRtdb.status;
        }
      }

      try {
        const fsStatus = await fetchSiteStatusFromFirestore();
        if (fsStatus && isNewerOrAuthoritativeStatus(fsStatus, resolvedStatus)) {
          resolvedStatus = fsStatus;
        }
      } catch {
        // Keep current resolvedStatus if Firestore read fails
      }

      setAuthorized(true);
      setFirebaseUrl(resolvedUrl);
      setSyncState(resolvedSync);
      setMessageInput(resolvedStatus.message);
      onSiteStatusUpdated(resolvedStatus, resolvedSync);
    },
    [language, onSiteStatusUpdated, siteStatus, t.admin.unauthorizedHint],
  );

  useEffect(() => {
    void handleGoogleRedirectResult().catch((err) => {
      setAuthError(
        mapGoogleAuthErrorMessage(err, window.location.hostname, language),
      );
    });
  }, [language]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
      if (nextUser) {
        void verifyAdminSession(nextUser);
      } else {
        setAuthorized(false);
        setAuthError('');
      }
    });
    return () => unsubscribe();
  }, [verifyAdminSession]);

  async function handleGoogleLogin() {
    if (signingIn) return;
    setAuthError('');
    setSigningIn(true);
    try {
      const result = await signInAdminWithGoogle();
      if (result.redirected) {
        return;
      }
      if (result.user) {
        await verifyAdminSession(result.user);
        showToast(t.toasts.adminSignedIn);
      }
    } catch (err) {
      setAuthError(
        mapGoogleAuthErrorMessage(err, window.location.hostname, language),
      );
    } finally {
      setSigningIn(false);
    }
  }

  async function handleSignOut() {
    await signOutAdminGoogle();
    setAuthorized(false);
    setAuthError('');
    showToast(t.toasts.adminSignedOut);
  }

  async function handleToggleWebsite(online: boolean) {
    if (!user || !authorized || savingStatus) return;
    setSavingStatus(true);
    try {
      const idToken = await user.getIdToken();
      const sanitizedMsg =
        sanitizeStatusMessage(messageInput) || DEFAULT_OFFLINE_MESSAGE;
      let nextStatus: SiteStatusPayload = {
        online,
        message: sanitizedMsg,
        updatedAt: new Date().toISOString(),
        updatedBy: user.email || DEFAULT_ADMIN_EMAIL,
      };
      let nextSyncState: FirebaseSyncState = syncState;
      let apiHandled = false;

      try {
        const res = await fetch('/api/admin/site-status', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            online,
            message: sanitizedMsg,
          }),
        });
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          apiHandled = true;
          const data = (await res.json()) as AdminStatusResponse;
          if (res.status === 401 || res.status === 403) {
            setAuthorized(false);
            setAuthError(data.error || t.admin.unauthorizedHint);
            return;
          }
          if (res.ok) {
            nextStatus = data.status;
            nextSyncState = data.firebaseSyncState;
          }
        }
      } catch {
        // Fallback to direct Firebase writes below
      }

      if (!apiHandled) {
        const rtdbRes = await syncSiteStatusWithRtdbDirect(
          'push',
          nextStatus,
          idToken,
        );
        nextSyncState = rtdbRes.syncState;
      }

      let firestoreOk = false;
      try {
        await writeSiteStatusToFirestore(online, nextStatus.message);
        firestoreOk = true;
      } catch {
        // Structured Firestore error already logged by handleFirestoreError
      }

      if (!apiHandled && !firestoreOk && nextSyncState !== 'synced') {
        setAuthError(
          language === 'id'
            ? 'Gagal menyimpan status ke Firebase. Pastikan akun Anda memiliki izin admin.'
            : 'Failed to save status to Firebase. Ensure your account has admin access.',
        );
        return;
      }

      setSyncState(nextSyncState);
      setMessageInput(nextStatus.message);
      onSiteStatusUpdated(nextStatus, nextSyncState);
      showToast(online ? t.toasts.siteOnlineSet : t.toasts.siteOfflineSet);
    } finally {
      setSavingStatus(false);
    }
  }

  async function handleSaveMessage(event: FormEvent) {
    event.preventDefault();
    await handleToggleWebsite(siteStatus.online);
  }

  async function handleFirebaseSync(mode: 'push' | 'pull') {
    if (!user || !authorized || syncingFirebase) return;
    setSyncingFirebase(true);
    try {
      const idToken = await user.getIdToken();
      let apiHandled = false;

      try {
        const res = await fetch('/api/admin/sync-firebase', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ mode }),
        });
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json') && res.ok) {
          apiHandled = true;
          const data = (await res.json()) as AdminStatusResponse;
          setSyncState(data.firebaseSyncState);
          setMessageInput(data.status.message);
          onSiteStatusUpdated(data.status, data.firebaseSyncState);
          if (data.firebaseSyncState === 'synced') {
            showToast(t.toasts.firebaseSynced);
          }
        }
      } catch {
        // Fallback to direct RTDB sync
      }

      if (!apiHandled) {
        const direct = await syncSiteStatusWithRtdbDirect(
          mode,
          siteStatus,
          idToken,
        );
        setSyncState(direct.syncState);
        if (direct.status) {
          setMessageInput(direct.status.message);
          onSiteStatusUpdated(direct.status, direct.syncState);
        }
        if (direct.syncState === 'synced') {
          showToast(t.toasts.firebaseSynced);
        }
      }
    } finally {
      setSyncingFirebase(false);
    }
  }

  if (!authReady || !user || !authorized) {
    return (
      <section className="view admin-view" aria-label={t.admin.title}>
        <div className="admin-topbar-row">
          <button
            type="button"
            className="admin-back-btn"
            onClick={onBackToSite}
          >
            ← {t.admin.backToSite}
          </button>
        </div>

        <div className="glass login-card admin-auth-card">
          <img
            src="/logo.svg"
            alt="DENZZ CLIENT"
            width={56}
            height={56}
            className="ghost-float"
          />
          <span className="login-eyebrow">{t.admin.eyebrow}</span>
          <h1 className="login-title">{t.admin.loginTitle}</h1>
          <p className="login-sub">{t.admin.loginDesc}</p>

          {user && !authorized && (
            <div className="admin-google-account">
              <span>{t.admin.signedInAs}</span>
              <strong>{user.email}</strong>
            </div>
          )}

          {authError && (
            <p className="login-error" role="alert">
              {authError}
            </p>
          )}

          <button
            type="button"
            id="googleAdminSignInBtn"
            className="gsi-material-button"
            onClick={() => void handleGoogleLogin()}
            disabled={!authReady || signingIn}
          >
            <div className="gsi-material-button-state" />
            <div className="gsi-material-button-content-wrapper">
              <div className="gsi-material-button-icon" aria-hidden="true">
                <svg
                  version="1.1"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 48 48"
                  style={{ display: 'block' }}
                >
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  />
                  <path fill="none" d="M0 0h48v48H0z" />
                </svg>
              </div>
              <span className="gsi-material-button-contents">
                {signingIn ? t.admin.signingIn : t.admin.googleBtn}
              </span>
            </div>
          </button>

          {user && !authorized && (
            <button
              type="button"
              className="login-demo"
              onClick={() => void handleSignOut()}
            >
              {t.admin.switchAccount}
            </button>
          )}
        </div>
      </section>
    );
  }

  const syncLabel =
    syncState === 'synced'
      ? t.admin.syncSynced
      : syncState === 'permission_denied'
        ? t.admin.syncDenied
        : syncState === 'error'
          ? t.admin.syncError
          : t.admin.syncPending;

  return (
    <section className="view admin-view" aria-label={t.admin.title}>
      <div className="admin-topbar-row">
        <button
          type="button"
          className="admin-back-btn"
          onClick={onBackToSite}
        >
          ← {t.admin.backToSite}
        </button>
        <button
          type="button"
          className="admin-logout-btn"
          onClick={() => void handleSignOut()}
        >
          {t.admin.logoutAdmin}
        </button>
      </div>

      <div className="glass admin-account-bar">
        <div className="admin-account-avatar" aria-hidden="true">
          {(user.displayName || user.email || 'A').slice(0, 1).toUpperCase()}
        </div>
        <div className="admin-account-copy">
          <span>{t.admin.signedInAs}</span>
          <strong>{user.email}</strong>
        </div>
      </div>

      <div className="glass admin-card">
        <div className="admin-card-head">
          <div>
            <span className="happ-kicker">{t.admin.eyebrow}</span>
            <h1 className="admin-card-title">{t.admin.statusCardTitle}</h1>
          </div>
          <span
            className={`admin-status-pill ${siteStatus.online ? 'is-online' : 'is-offline'}`}
            id="adminLiveStatusBadge"
          >
            <i aria-hidden="true" />
            {siteStatus.online ? t.admin.onlineBadge : t.admin.offlineBadge}
          </span>
        </div>

        <p className="admin-card-desc">
          {siteStatus.online ? t.admin.onlineDesc : t.admin.offlineDesc}
        </p>

        <div className="admin-toggle-grid">
          <button
            type="button"
            id="adminSetOnlineBtn"
            className={`admin-mode-btn is-online-btn${siteStatus.online ? ' is-selected' : ''}`}
            disabled={savingStatus}
            onClick={() => void handleToggleWebsite(true)}
          >
            <span className="admin-mode-dot" aria-hidden="true" />
            <span>{t.admin.setOnlineBtn}</span>
          </button>

          <button
            type="button"
            id="adminSetOfflineBtn"
            className={`admin-mode-btn is-offline-btn${!siteStatus.online ? ' is-selected' : ''}`}
            disabled={savingStatus}
            onClick={() => void handleToggleWebsite(false)}
          >
            <span className="admin-mode-dot" aria-hidden="true" />
            <span>{t.admin.setOfflineBtn}</span>
          </button>
        </div>

        <form className="admin-message-form" onSubmit={handleSaveMessage}>
          <label htmlFor="offlineMessageInput" className="aim-label">
            {t.admin.messageLabel}
          </label>
          <textarea
            id="offlineMessageInput"
            className="admin-textarea"
            rows={2}
            maxLength={240}
            placeholder={t.admin.messagePlaceholder}
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
          />
          <button
            type="submit"
            className="happ-btn primary admin-save-msg-btn"
            disabled={savingStatus}
          >
            {t.admin.saveMessageBtn}
          </button>
        </form>
      </div>

      <div className="glass admin-card admin-firebase-card">
        <div className="admin-card-head">
          <div>
            <span className="happ-kicker">REALTIME DATABASE</span>
            <h2 className="admin-card-title">{t.admin.firebaseTitle}</h2>
          </div>
          <span className={`admin-sync-badge is-${syncState}`} id="firebaseSyncBadge">
            {syncLabel}
          </span>
        </div>

        <div className="admin-firebase-url">{firebaseUrl}/siteStatus.json</div>

        {syncState === 'permission_denied' && (
          <p className="admin-firebase-hint">{t.admin.deniedHint}</p>
        )}

        <div className="happ-card-actions">
          <button
            type="button"
            className="happ-btn primary"
            disabled={syncingFirebase}
            onClick={() => void handleFirebaseSync('push')}
          >
            {t.admin.pushBtn}
          </button>
          <button
            type="button"
            className="happ-btn"
            disabled={syncingFirebase}
            onClick={() => void handleFirebaseSync('pull')}
          >
            {t.admin.pullBtn}
          </button>
        </div>
      </div>
    </section>
  );
}
