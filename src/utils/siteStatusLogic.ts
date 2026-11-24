export interface SiteStatusPayload {
  online: boolean;
  message: string;
  updatedAt: string;
  updatedBy: string;
}

export type FirebaseSyncState = 'synced' | 'permission_denied' | 'error' | 'pending';

export const DEFAULT_FIREBASE_RTDB_URL =
  'https://denzzmodz-default-rtdb.asia-southeast1.firebasedatabase.app';

export const DEFAULT_OFFLINE_MESSAGE =
  'Website sedang dalam pemeliharaan oleh admin. Silakan kembali beberapa saat lagi.';

const ALLOWED_FIREBASE_HOSTS = ['.firebasedatabase.app', '.firebaseio.com'];

export function validateFirebaseRtdbUrl(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== 'https:') return null;
    if (parsed.username || parsed.password) return null;
    const hostname = parsed.hostname.toLowerCase();
    const allowed = ALLOWED_FIREBASE_HOSTS.some(
      (suffix) => hostname.endsWith(suffix) && hostname.length > suffix.length,
    );
    if (!allowed) return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

export function sanitizeStatusMessage(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, 240);
}

export function normalizeSiteStatus(
  input: unknown,
  fallback?: Partial<SiteStatusPayload>,
): SiteStatusPayload {
  const obj =
    input && typeof input === 'object' ? (input as Record<string, unknown>) : {};
  const online =
    typeof obj.online === 'boolean'
      ? obj.online
      : typeof fallback?.online === 'boolean'
        ? fallback.online
        : true;
  const message =
    typeof obj.message === 'string'
      ? sanitizeStatusMessage(obj.message)
      : sanitizeStatusMessage(fallback?.message ?? '');
  const updatedAt =
    typeof obj.updatedAt === 'string' && obj.updatedAt.trim()
      ? obj.updatedAt.trim().slice(0, 64)
      : fallback?.updatedAt || new Date().toISOString();
  const updatedBy =
    typeof obj.updatedBy === 'string' && obj.updatedBy.trim()
      ? sanitizeStatusMessage(obj.updatedBy).slice(0, 40)
      : fallback?.updatedBy || 'system';

  return {
    online,
    message,
    updatedAt,
    updatedBy,
  };
}

export const DEFAULT_ADMIN_EMAIL = 'dezzzzzz2007@gmail.com';

export function parseAllowedAdminEmails(
  rawEnv: string | undefined,
  fallbackEmail: string = DEFAULT_ADMIN_EMAIL,
): string[] {
  const source = rawEnv && rawEnv.trim() ? rawEnv : fallbackEmail;
  return source
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.includes('@') && entry.length <= 128);
}

export function isAuthorizedAdminEmail(
  email: unknown,
  allowedEmails: string[],
  emailVerified: boolean = true,
): boolean {
  if (!emailVerified || typeof email !== 'string') return false;
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;
  return allowedEmails.includes(normalized);
}

export function isAdminRoutePath(pathname: string, hash: string): boolean {
  const cleanPath = pathname.replace(/\/+$/, '') || '/';
  if (cleanPath === '/admin') return true;
  const cleanHash = hash.replace(/^#/, '').replace(/\/+$/, '');
  return cleanHash === 'admin' || cleanHash === '/admin';
}

export function isNewerOrAuthoritativeStatus(
  candidate: SiteStatusPayload,
  current: SiteStatusPayload,
): boolean {
  const candidateIsSystem = !candidate.updatedBy || candidate.updatedBy === 'system';
  const currentIsSystem = !current.updatedBy || current.updatedBy === 'system';

  if (candidateIsSystem && !currentIsSystem) {
    return false;
  }
  if (!candidateIsSystem && currentIsSystem) {
    return true;
  }

  const candidateMs = Date.parse(candidate.updatedAt);
  const currentMs = Date.parse(current.updatedAt);
  if (Number.isFinite(candidateMs) && Number.isFinite(currentMs)) {
    return candidateMs >= currentMs;
  }
  return !candidateIsSystem;
}

export function mapGoogleAuthErrorMessage(
  error: unknown,
  hostname: string,
  language: 'en' | 'id',
): string {
  const code =
    error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
      ? error.code
      : '';
  const msg = error instanceof Error ? error.message : String(error || '');

  if (code === 'auth/popup-closed-by-user' || msg.includes('popup-closed-by-user')) {
    return language === 'id' ? 'Login Google dibatalkan.' : 'Google sign-in was cancelled.';
  }
  if (code === 'auth/unauthorized-domain' || msg.includes('unauthorized-domain')) {
    const host = hostname || 'domain ini';
    return language === 'id'
      ? `Domain "${host}" belum didaftarkan di Firebase Console → Authentication → Settings → Authorized domains.`
      : `Domain "${host}" is not yet added in Firebase Console → Authentication → Settings → Authorized domains.`;
  }
  if (code === 'auth/network-request-failed' || msg.includes('network-request-failed')) {
    return language === 'id'
      ? 'Koneksi jaringan ke Google Auth gagal. Periksa internet Anda dan coba lagi.'
      : 'Network error connecting to Google Auth. Check your connection and try again.';
  }
  if (code === 'auth/popup-blocked' || msg.includes('popup-blocked')) {
    return language === 'id'
      ? 'Popup diblokir browser. Mengalihkan ke halaman login Google...'
      : 'Browser blocked the popup. Redirecting to Google Sign-In...';
  }
  return msg || (language === 'id' ? 'Gagal masuk dengan Google.' : 'Google sign-in failed.');
}

