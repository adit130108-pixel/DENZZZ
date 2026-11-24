import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import {
  DEFAULT_ADMIN_EMAIL,
  DEFAULT_FIREBASE_RTDB_URL,
  DEFAULT_OFFLINE_MESSAGE,
  isAuthorizedAdminEmail,
  normalizeSiteStatus,
  parseAllowedAdminEmails,
  sanitizeStatusMessage,
  validateFirebaseRtdbUrl,
  type FirebaseSyncState,
  type SiteStatusPayload,
} from '../src/utils/siteStatusLogic.ts';

interface FirebaseAppletConfig {
  projectId?: string;
}

const currentDir = path.dirname(fileURLToPath(import.meta.url));

function resolveFirebaseProjectId(): string {
  const envProjectId =
    process.env.FIREBASE_PROJECT_ID?.trim() ||
    process.env.VITE_FIREBASE_PROJECT_ID?.trim();
  if (envProjectId) {
    return envProjectId;
  }

  const candidatePaths = [
    path.resolve(process.cwd(), 'firebase-applet-config.json'),
    path.resolve(currentDir, '../firebase-applet-config.json'),
  ];

  for (const configPath of candidatePaths) {
    if (fs.existsSync(configPath)) {
      const parsed = JSON.parse(
        fs.readFileSync(configPath, 'utf8'),
      ) as FirebaseAppletConfig;
      if (parsed.projectId && parsed.projectId !== 'remixed-project-id') {
        return parsed.projectId;
      }
    }
  }

  throw new Error(
    'Firebase project is not provisioned in firebase-applet-config.json or FIREBASE_PROJECT_ID.',
  );
}

const firebaseProjectId = resolveFirebaseProjectId();
const adminApp = getApps().length
  ? getApp()
  : initializeApp({ projectId: firebaseProjectId });
const adminAuth = getAuth(adminApp);

const rawFirebaseUrl = process.env.FIREBASE_DB_URL || DEFAULT_FIREBASE_RTDB_URL;
export const FIREBASE_BASE_URL =
  validateFirebaseRtdbUrl(rawFirebaseUrl) || DEFAULT_FIREBASE_RTDB_URL;

let currentSiteStatus: SiteStatusPayload = {
  online: true,
  message: DEFAULT_OFFLINE_MESSAGE,
  updatedAt: '1970-01-01T00:00:00.000Z',
  updatedBy: 'system',
};
let firebaseSyncState: FirebaseSyncState = 'pending';
let lastFirebaseFetchAt = 0;

export function getAllowedAdminEmails(): string[] {
  return parseAllowedAdminEmails(process.env.ADMIN_EMAIL, DEFAULT_ADMIN_EMAIL);
}

export function getFirebaseSecret(): string {
  return process.env.FIREBASE_DB_SECRET?.trim() || '';
}

function buildFirebaseEndpoint(userIdToken?: string): string {
  const secret = getFirebaseSecret();
  const base = `${FIREBASE_BASE_URL}/siteStatus.json`;
  const authParam = secret || userIdToken || '';
  return authParam ? `${base}?auth=${encodeURIComponent(authParam)}` : base;
}

export type AdminAuthResult =
  | {
      ok: true;
      adminEmail: string;
      idToken: string;
    }
  | {
      ok: false;
      status: 401 | 403;
      error: string;
    };

export async function verifyAdminAuthorizationHeader(
  authHeader: string | undefined,
): Promise<AdminAuthResult> {
  const header = authHeader || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  const idToken = match?.[1]?.trim() || '';
  if (!idToken) {
    return {
      ok: false,
      status: 401,
      error: 'Silakan masuk menggunakan akun Google terlebih dahulu.',
    };
  }

  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    const allowed = getAllowedAdminEmails();
    if (!isAuthorizedAdminEmail(decoded.email, allowed, decoded.email_verified === true)) {
      return {
        ok: false,
        status: 403,
        error: 'Akun Google ini tidak memiliki izin admin.',
      };
    }
    return {
      ok: true,
      adminEmail: decoded.email || DEFAULT_ADMIN_EMAIL,
      idToken,
    };
  } catch {
    return {
      ok: false,
      status: 401,
      error: 'Sesi Google tidak valid atau kedaluwarsa. Silakan login ulang.',
    };
  }
}

export async function pullFromFirebase(
  force = false,
  userIdToken?: string,
): Promise<FirebaseSyncState> {
  const now = Date.now();
  if (!force && now - lastFirebaseFetchAt < 3000 && firebaseSyncState !== 'pending') {
    return firebaseSyncState;
  }
  lastFirebaseFetchAt = now;

  try {
    const response = await fetch(buildFirebaseEndpoint(userIdToken), {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    });
    if (response.status === 401 || response.status === 403) {
      firebaseSyncState = 'permission_denied';
      return firebaseSyncState;
    }
    if (!response.ok) {
      firebaseSyncState = 'error';
      return firebaseSyncState;
    }
    const data: unknown = await response.json();
    if (data && typeof data === 'object') {
      currentSiteStatus = normalizeSiteStatus(data, currentSiteStatus);
    }
    firebaseSyncState = 'synced';
    return firebaseSyncState;
  } catch {
    firebaseSyncState = 'error';
    return firebaseSyncState;
  }
}

export async function pushToFirebase(
  payload: SiteStatusPayload,
  userIdToken?: string,
): Promise<FirebaseSyncState> {
  try {
    const response = await fetch(buildFirebaseEndpoint(userIdToken), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(3500),
    });
    if (response.status === 401 || response.status === 403) {
      firebaseSyncState = 'permission_denied';
      return firebaseSyncState;
    }
    if (!response.ok) {
      firebaseSyncState = 'error';
      return firebaseSyncState;
    }
    firebaseSyncState = 'synced';
    return firebaseSyncState;
  } catch {
    firebaseSyncState = 'error';
    return firebaseSyncState;
  }
}

export async function handlePublicSiteStatus() {
  await pullFromFirebase(false);
  return {
    online: currentSiteStatus.online,
    message: currentSiteStatus.message,
    updatedAt: currentSiteStatus.updatedAt,
    updatedBy: currentSiteStatus.updatedBy,
    firebaseSyncState,
  };
}

export async function handleGetAdminStatus(authHeader: string | undefined) {
  const authResult = await verifyAdminAuthorizationHeader(authHeader);
  if (!authResult.ok) {
    return { statusCode: authResult.status, body: { error: authResult.error } };
  }
  await pullFromFirebase(true, authResult.idToken);
  return {
    statusCode: 200,
    body: {
      status: currentSiteStatus,
      firebaseSyncState,
      firebaseUrl: FIREBASE_BASE_URL,
      hasDbSecret: Boolean(getFirebaseSecret()),
      adminEmail: authResult.adminEmail,
    },
  };
}

export async function handleUpdateAdminSiteStatus(
  authHeader: string | undefined,
  rawBody: unknown,
) {
  const authResult = await verifyAdminAuthorizationHeader(authHeader);
  if (!authResult.ok) {
    return { statusCode: authResult.status, body: { error: authResult.error } };
  }

  const body = (rawBody && typeof rawBody === 'object' ? rawBody : {}) as {
    online?: unknown;
    message?: unknown;
  };
  if (typeof body.online !== 'boolean') {
    return {
      statusCode: 400,
      body: { error: 'Field "online" harus berupa boolean.' },
    };
  }

  const nextMessage =
    typeof body.message === 'string'
      ? sanitizeStatusMessage(body.message)
      : currentSiteStatus.message;

  const nextStatus: SiteStatusPayload = {
    online: body.online,
    message: nextMessage || DEFAULT_OFFLINE_MESSAGE,
    updatedAt: new Date().toISOString(),
    updatedBy: authResult.adminEmail,
  };
  currentSiteStatus = nextStatus;
  lastFirebaseFetchAt = Date.now();

  const syncState = await pushToFirebase(nextStatus, authResult.idToken);
  return {
    statusCode: 200,
    body: {
      status: currentSiteStatus,
      firebaseSyncState: syncState,
      firebaseUrl: FIREBASE_BASE_URL,
      hasDbSecret: Boolean(getFirebaseSecret()),
      adminEmail: authResult.adminEmail,
    },
  };
}

export async function handleSyncAdminFirebase(
  authHeader: string | undefined,
  rawBody: unknown,
) {
  const authResult = await verifyAdminAuthorizationHeader(authHeader);
  if (!authResult.ok) {
    return { statusCode: authResult.status, body: { error: authResult.error } };
  }

  const mode = (rawBody && typeof rawBody === 'object' ? rawBody : undefined) as
    | { mode?: unknown }
    | undefined;
  const syncState =
    mode?.mode === 'pull'
      ? await pullFromFirebase(true, authResult.idToken)
      : await pushToFirebase(currentSiteStatus, authResult.idToken);

  return {
    statusCode: 200,
    body: {
      status: currentSiteStatus,
      firebaseSyncState: syncState,
      firebaseUrl: FIREBASE_BASE_URL,
      hasDbSecret: Boolean(getFirebaseSecret()),
    },
  };
}
