import {
  COPY,
  HAPP_ANDROID_URL,
  HAPP_IPHONE_URL,
  WHATSAPP_CHANNEL_URL,
  type Language,
} from '../utils/i18n';

interface ManageViewProps {
  language: Language;
  aimEnabled: boolean;
  aimHeight: number;
  onAddSubscription: () => void;
  onCopyKey: () => void;
  onLogout: () => void;
  onOpenAdmin: () => void;
}

export function ManageView({
  language,
  aimEnabled,
  aimHeight,
  onAddSubscription,
  onCopyKey,
  onLogout,
  onOpenAdmin,
}: ManageViewProps) {
  const t = COPY[language];

  return (
    <section aria-label={t.tabs.manage} className="view" id="manageView">
      <div className="glass manage-top">
        <div className="aim-title">{t.manage.title}</div>
        <div className="manage-summary">
          <div className="manage-stat">
            <span>{t.manage.aimStatus}</span>
            <strong id="manageAimStatus">
              {aimEnabled ? t.manage.enabled : t.manage.disabled}
            </strong>
          </div>
          <div className="manage-stat">
            <span>{t.manage.aimHeight}</span>
            <strong id="manageAimValue">{aimHeight}%</strong>
          </div>
        </div>
      </div>

      <div className="happ-card glass">
        <div className="happ-card-head">
          <span className="happ-logo" aria-hidden="true">
            H
          </span>
          <div className="happ-card-copy">
            <span className="happ-kicker">{t.manage.happKicker}</span>
            <strong>{t.manage.happReadyTitle}</strong>
          </div>
          <span className="happ-live">{t.manage.happReadyBadge}</span>
        </div>
        <p>{t.manage.happDesc}</p>
        <div className="happ-card-actions">
          <button
            className="happ-btn primary"
            id="manageAddHapp"
            type="button"
            onClick={onAddSubscription}
          >
            {t.manage.addHapp}
          </button>
        </div>
      </div>

      <div className="manage-group-label">{t.manage.appsGroup}</div>
      <div className="manage-link-list glass">
        <a
          className="manage-link"
          href={HAPP_ANDROID_URL}
          rel="noopener noreferrer"
          target="_blank"
        >
          <span className="manage-link-icon">
            <svg className="android-mark" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M17.523 15.341c-.551 0-.999-.449-.999-1s.448-.999.999-.999 1 .448 1 .999-.449 1-1 1m-11.046 0c-.551 0-.999-.449-.999-1s.448-.999.999-.999 1 .448 1 .999-.449 1-1 1m11.405-6.02 1.997-3.459a.416.416 0 0 0-.152-.568.416.416 0 0 0-.568.152l-2.022 3.503C15.59 8.244 13.853 7.851 12 7.851s-3.59.393-5.137 1.099L4.841 5.447a.416.416 0 0 0-.568-.152.416.416 0 0 0-.152.568l1.997 3.459C2.689 11.187.343 14.659 0 18.761h24c-.344-4.102-2.689-7.574-6.118-9.44" />
            </svg>
          </span>
          <span className="manage-link-copy">
            <strong>{t.manage.happAndroid}</strong>
            <small>{t.manage.happAndroidSub}</small>
          </span>
          <span className="manage-chevron" aria-hidden="true">
            ›
          </span>
        </a>

        <a
          className="manage-link"
          href={HAPP_IPHONE_URL}
          rel="noopener noreferrer"
          target="_blank"
        >
          <span className="manage-link-icon">
            <svg className="apple-mark" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.56-1.702" />
            </svg>
          </span>
          <span className="manage-link-copy">
            <strong>{t.manage.happIphone}</strong>
            <small>{t.manage.happIphoneSub}</small>
          </span>
          <span className="manage-chevron" aria-hidden="true">
            ›
          </span>
        </a>

        <a
          className="manage-link"
          href={WHATSAPP_CHANNEL_URL}
          rel="noopener noreferrer"
          target="_blank"
        >
          <span className="manage-link-icon">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M20.5 11.8a8.5 8.5 0 0 1-12.6 7.4L3 20l.9-4.7A8.5 8.5 0 1 1 20.5 11.8Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
              <path
                d="M8.2 7.9c.2-.4.4-.4.7-.4h.5c.2 0 .4.1.5.4l.8 1.8c.1.2.1.4-.1.6l-.6.7c-.2.2-.2.4 0 .7.5.9 1.3 1.7 2.2 2.2.3.2.5.2.7 0l.8-.9c.2-.2.4-.2.6-.1l1.7.8c.3.1.4.3.4.5 0 .3-.2 1.2-.8 1.7-.5.5-1.2.7-2 .6-1.1-.1-2.5-.8-3.8-2-1.5-1.3-2.5-3-2.7-4.1-.2-.9.1-1.8.6-2.5.3-.3.6-.5.8-.5Z"
                fill="currentColor"
              />
            </svg>
          </span>
          <span className="manage-link-copy">
            <strong>{t.manage.waChannel}</strong>
            <small>{t.manage.waChannelSub}</small>
          </span>
          <span className="manage-chevron" aria-hidden="true">
            ›
          </span>
        </a>
      </div>

      <div className="manage-group-label">{t.manage.accountGroup}</div>
      <div className="manage-link-list glass">
        <button
          className="manage-link"
          id="copyKeyBtn"
          type="button"
          onClick={onCopyKey}
        >
          <span className="manage-link-icon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect height="12" rx="2" width="12" x="8" y="8" />
              <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h1" />
            </svg>
          </span>
          <span className="manage-link-copy">
            <strong>{t.manage.copyKey}</strong>
            <small>{t.manage.copyKeySub}</small>
          </span>
          <span className="manage-chevron" aria-hidden="true">
            ›
          </span>
        </button>

        <button
          className="manage-link"
          id="logoutBtn"
          type="button"
          onClick={onLogout}
        >
          <span className="manage-link-icon logout-icon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5M14 8l4 4-4 4m4-4H9" />
            </svg>
          </span>
          <span className="manage-link-copy">
            <strong>{t.manage.logout}</strong>
            <small>{t.manage.logoutSub}</small>
          </span>
          <span className="manage-chevron" aria-hidden="true">
            ›
          </span>
        </button>
      </div>

      <div className="secure">
        ◈ <span>{t.manage.secureFooter}</span> • {t.manage.planLabel} • V1.3.0 • © DENZZ CLIENT •{' '}
        <button type="button" className="secure-admin-link" onClick={onOpenAdmin}>
          ADMIN
        </button>
      </div>
    </section>
  );
}
