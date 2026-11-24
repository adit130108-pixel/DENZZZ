import { useState } from 'react';
import { COPY, type Language } from '../utils/i18n';
import type { SiteStatusPayload } from '../utils/siteStatusLogic';

interface SiteOfflineScreenProps {
  language: Language;
  status: SiteStatusPayload;
  onRefresh: () => Promise<void>;
  onOpenAdmin: () => void;
}

export function SiteOfflineScreen({
  language,
  status,
  onRefresh,
  onOpenAdmin,
}: SiteOfflineScreenProps) {
  const [checking, setChecking] = useState(false);
  const t = COPY[language];

  async function handleRefresh() {
    setChecking(true);
    try {
      await onRefresh();
    } finally {
      setChecking(false);
    }
  }

  const formattedTime = (() => {
    try {
      return new Date(status.updatedAt).toLocaleString(
        language === 'id' ? 'id-ID' : 'en-US',
        {
          dateStyle: 'medium',
          timeStyle: 'short',
        },
      );
    } catch {
      return status.updatedAt;
    }
  })();

  return (
    <section className="offline-view" aria-label={t.offlineScreen.title}>
      <div className="glass offline-card">
        <div className="offline-emblem-wrap">
          <div className="offline-ring" aria-hidden="true" />
          <img
            src="/logo.svg"
            alt="DENZZ CLIENT"
            width={64}
            height={64}
            className="offline-emblem"
          />
        </div>

        <span className="offline-badge">
          <i aria-hidden="true" />
          {t.offlineScreen.badge}
        </span>

        <h1 className="offline-title">{t.offlineScreen.title}</h1>
        <p className="offline-message">
          {status.message || t.offlineScreen.subtitle}
        </p>

        <div className="offline-meta">
          <span>{t.offlineScreen.updatedLabel}</span>
          <strong>{formattedTime}</strong>
        </div>

        <button
          type="button"
          className="pill-btn primary offline-refresh"
          onClick={handleRefresh}
          disabled={checking}
        >
          {checking ? t.offlineScreen.checking : t.offlineScreen.refresh}
        </button>

        <button
          type="button"
          className="offline-admin-link"
          onClick={onOpenAdmin}
        >
          {t.offlineScreen.adminLink}
        </button>
      </div>
    </section>
  );
}
