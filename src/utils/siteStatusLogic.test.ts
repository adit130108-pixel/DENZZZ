import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_ADMIN_EMAIL,
  DEFAULT_FIREBASE_RTDB_URL,
  isAdminRoutePath,
  isAuthorizedAdminEmail,
  isNewerOrAuthoritativeStatus,
  mapGoogleAuthErrorMessage,
  normalizeSiteStatus,
  parseAllowedAdminEmails,
  validateFirebaseRtdbUrl,
} from './siteStatusLogic';

test('validateFirebaseRtdbUrl allows valid HTTPS Firebase RTDB hosts and rejects unsafe URLs', () => {
  assert.equal(
    validateFirebaseRtdbUrl(`${DEFAULT_FIREBASE_RTDB_URL}/`),
    DEFAULT_FIREBASE_RTDB_URL,
  );
  assert.equal(
    validateFirebaseRtdbUrl('https://my-app.firebaseio.com/siteStatus.json'),
    'https://my-app.firebaseio.com',
  );
  assert.equal(validateFirebaseRtdbUrl('http://127.0.0.1:9000'), null);
  assert.equal(validateFirebaseRtdbUrl('https://evil.example.com'), null);
  assert.equal(validateFirebaseRtdbUrl('javascript:alert(1)'), null);
});

test('normalizeSiteStatus sanitizes message and preserves defaults', () => {
  const res = normalizeSiteStatus({
    online: false,
    message: '  Maintenance\nberkala\t ',
    updatedBy: 'admin',
  });
  assert.equal(res.online, false);
  assert.equal(res.message, 'Maintenance berkala');
  assert.equal(res.updatedBy, 'admin');
  assert.ok(res.updatedAt.length > 0);

  const fallback = normalizeSiteStatus(null);
  assert.equal(fallback.online, true);
  assert.equal(fallback.message, '');
});

test('isAuthorizedAdminEmail enforces verified email and allowlist match', () => {
  const list = parseAllowedAdminEmails(undefined, DEFAULT_ADMIN_EMAIL);
  assert.equal(isAuthorizedAdminEmail('DEZZZZZZ2007@GMAIL.COM', list, true), true);
  assert.equal(isAuthorizedAdminEmail('dezzzzzz2007@gmail.com', list, false), false);
  assert.equal(isAuthorizedAdminEmail('other@gmail.com', list, true), false);
  assert.equal(isAuthorizedAdminEmail(null, list, true), false);
});

test('isAdminRoutePath detects /admin path and #admin hash cleanly', () => {
  assert.equal(isAdminRoutePath('/admin', ''), true);
  assert.equal(isAdminRoutePath('/admin/', ''), true);
  assert.equal(isAdminRoutePath('/', '#/admin'), true);
  assert.equal(isAdminRoutePath('/', '#admin'), true);
  assert.equal(isAdminRoutePath('/', ''), false);
});

test('isNewerOrAuthoritativeStatus prevents system cold-start fallback from overwriting real admin status', () => {
  const adminOffline = {
    online: false,
    message: 'Maintenance',
    updatedAt: '2026-11-24T10:00:00.000Z',
    updatedBy: 'dezzzzzz2007@gmail.com',
  };
  const coldStartSystem = {
    online: true,
    message: 'Default',
    updatedAt: '2026-11-24T12:00:00.000Z',
    updatedBy: 'system',
  };
  assert.equal(isNewerOrAuthoritativeStatus(coldStartSystem, adminOffline), false);
  assert.equal(isNewerOrAuthoritativeStatus(adminOffline, coldStartSystem), true);
  assert.equal(
    isNewerOrAuthoritativeStatus(
      { ...adminOffline, online: true, updatedAt: '2026-11-24T11:00:00.000Z' },
      adminOffline,
    ),
    true,
  );
});

test('mapGoogleAuthErrorMessage formats unauthorized-domain and popup errors clearly', () => {
  const domainErr = mapGoogleAuthErrorMessage(
    { code: 'auth/unauthorized-domain', message: 'Firebase: Error (auth/unauthorized-domain).' },
    'denzz.vercel.app',
    'id',
  );
  assert.match(domainErr, /denzz\.vercel\.app/);
  assert.match(domainErr, /Authorized domains/);

  const cancelErr = mapGoogleAuthErrorMessage(
    { code: 'auth/popup-closed-by-user' },
    'denzz.netlify.app',
    'en',
  );
  assert.equal(cancelErr, 'Google sign-in was cancelled.');
});

