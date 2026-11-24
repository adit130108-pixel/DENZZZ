import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  getAuth,
  getRedirectResult,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from 'firebase/auth';
import {
  Timestamp,
  doc,
  getDoc,
  getDocFromServer,
  getFirestore,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import {
  DEFAULT_FIREBASE_RTDB_URL,
  DEFAULT_OFFLINE_MESSAGE,
  normalizeSiteStatus,
  sanitizeStatusMessage,
  type FirebaseSyncState,
  type SiteStatusPayload,
} from './utils/siteStatusLogic';

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'siteStatus', 'current'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
void testConnection();

export async function handleGoogleRedirectResult(): Promise<User | null> {
  const result = await getRedirectResult(auth);
  return result?.user ?? null;
}

export async function signInAdminWithGoogle(): Promise<{
  user: User | null;
  idToken: string | null;
  redirected: boolean;
}> {
  try {
    const credential = await signInWithPopup(auth, googleProvider);
    const idToken = await credential.user.getIdToken(true);
    return { user: credential.user, idToken, redirected: false };
  } catch (err) {
    const code =
      err && typeof err === 'object' && 'code' in err && typeof err.code === 'string'
        ? err.code
        : '';
    if (code === 'auth/popup-blocked') {
      await signInWithRedirect(auth, googleProvider);
      return { user: null, idToken: null, redirected: true };
    }
    throw err;
  }
}

export async function signOutAdminGoogle(): Promise<void> {
  await signOut(auth);
}

function mapFirestoreSnapshotToStatus(data: {
  online?: unknown;
  message?: unknown;
  updatedAt?: unknown;
  updatedBy?: unknown;
}): SiteStatusPayload {
  const updatedAtIso =
    data.updatedAt instanceof Timestamp
      ? data.updatedAt.toDate().toISOString()
      : typeof data.updatedAt === 'string' && data.updatedAt
        ? data.updatedAt
        : new Date().toISOString();
  return {
    online: typeof data.online === 'boolean' ? data.online : true,
    message:
      typeof data.message === 'string'
        ? sanitizeStatusMessage(data.message)
        : DEFAULT_OFFLINE_MESSAGE,
    updatedAt: updatedAtIso,
    updatedBy: typeof data.updatedBy === 'string' ? data.updatedBy : 'admin',
  };
}

export async function fetchSiteStatusFromFirestore(): Promise<SiteStatusPayload | null> {
  const path = 'siteStatus/current';
  const ref = doc(db, 'siteStatus', 'current');
  try {
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) return null;
    return mapFirestoreSnapshotToStatus(snapshot.data());
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export function subscribeToFirestoreSiteStatus(
  onUpdate: (status: SiteStatusPayload) => void,
): () => void {
  const path = 'siteStatus/current';
  const ref = doc(db, 'siteStatus', 'current');
  return onSnapshot(
    ref,
    (snapshot) => {
      if (!snapshot.exists()) return;
      onUpdate(mapFirestoreSnapshotToStatus(snapshot.data()));
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    },
  );
}

export async function writeSiteStatusToFirestore(
  online: boolean,
  message: string,
): Promise<void> {
  const path = 'siteStatus/current';
  const ref = doc(db, 'siteStatus', 'current');
  const email = auth.currentUser?.email || '';
  try {
    await setDoc(ref, {
      online,
      message: sanitizeStatusMessage(message) || DEFAULT_OFFLINE_MESSAGE,
      updatedAt: serverTimestamp(),
      updatedBy: email,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function syncSiteStatusWithRtdbDirect(
  mode: 'pull' | 'push',
  payload?: SiteStatusPayload,
  idToken?: string,
): Promise<{ status?: SiteStatusPayload; syncState: FirebaseSyncState }> {
  const base = `${DEFAULT_FIREBASE_RTDB_URL}/siteStatus.json`;
  const endpoint = idToken ? `${base}?auth=${encodeURIComponent(idToken)}` : base;

  try {
    const response = await fetch(endpoint, {
      method: mode === 'push' ? 'PUT' : 'GET',
      headers: mode === 'push' ? { 'Content-Type': 'application/json' } : undefined,
      body: mode === 'push' && payload ? JSON.stringify(payload) : undefined,
      signal: AbortSignal.timeout(3500),
    });

    if (response.status === 401 || response.status === 403) {
      return { syncState: 'permission_denied' };
    }
    if (!response.ok) {
      return { syncState: 'error' };
    }
    if (mode === 'pull') {
      const raw: unknown = await response.json();
      if (raw && typeof raw === 'object') {
        return {
          status: normalizeSiteStatus(raw),
          syncState: 'synced',
        };
      }
    }
    return { status: payload, syncState: 'synced' };
  } catch {
    return { syncState: 'error' };
  }
}
