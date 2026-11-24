import {
  formatCountdown,
  getSubscriptionRingOffset,
  TOTAL_PLAN_SECONDS,
} from '../utils/dashboardLogic';
import { COPY, type Language } from '../utils/i18n';

interface HomeViewProps {
  language: Language;
  accessKey: string;
  keyVisible: boolean;
  onToggleKeyVisible: () => void;
  onCopyKey: () => void;
  onAddSubscription: () => void;
  isPermanent?: boolean;
  secondsRemaining: number;
  createdDate: string;
  expiresDate: string;
}

export function HomeView({
  language,
  accessKey,
  keyVisible,
  onToggleKeyVisible,
  onCopyKey,
  onAddSubscription,
  isPermanent = true,
  secondsRemaining,
  createdDate,
  expiresDate,
}: HomeViewProps) {
  const t = COPY[language];
  const { hours, minutes, seconds } = formatCountdown(secondsRemaining);
  const dashOffset = getSubscriptionRingOffset(
    isPermanent,
    secondsRemaining,
    TOTAL_PLAN_SECONDS,
  );

  return (
    <section className="view" id="homePage" aria-label={t.tabs.home}>
      <div className="timer-wrap">
        <div className="timer-ring">
          <svg className="ring-svg" viewBox="0 0 100 100" aria-hidden="true">
            <circle className="ring-track" cx="50" cy="50" r="46" />
            <circle
              className="ring-prog"
              id="ringProg"
              cx="50"
              cy="50"
              r="46"
              pathLength={100}
              style={{ strokeDashoffset: dashOffset }}
            />
          </svg>
          <i className="ring-orbit" aria-hidden="true" />
          <img
            alt="DENZZ CLIENT"
            className="center-emblem ghost-float"
            src="/logo.svg"
            width={140}
            height={140}
          />
        </div>

        {isPermanent ? (
          <div className="digits is-permanent" aria-label={t.remaining}>
            <span className="permanent-badge" id="permanentStatus">
              {t.permanentLabel}
            </span>
          </div>
        ) : (
          <div className="digits" aria-label={t.remaining}>
            <span id="hours">{hours}</span>
            <small>H</small>
            <span id="minutes">{minutes}</span>
            <small>M</small>
            <span id="seconds">{seconds}</span>
            <small>S</small>
          </div>
        )}

        <div className="remaining">{t.remaining}</div>
      </div>

      <div className="glass info-panel">
        <div className="keybox">
          <button
            type="button"
            className="keytext"
            id="keyValue"
            title={language === 'id' ? 'Klik untuk menyalin key' : 'Click to copy key'}
            onClick={onCopyKey}
          >
            {keyVisible ? accessKey : t.keyHidden}
          </button>
          <button
            type="button"
            aria-label={
              keyVisible
                ? language === 'id'
                  ? 'Sembunyikan key'
                  : 'Hide key'
                : language === 'id'
                  ? 'Tampilkan key'
                  : 'Show key'
            }
            className="iconbtn"
            id="keyToggleBtn"
            title={keyVisible ? 'Hide key' : 'Show key'}
            onClick={onToggleKeyVisible}
          >
            {keyVisible ? (
              <svg
                aria-hidden="true"
                fill="none"
                height="19"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                width="19"
              >
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            ) : (
              <svg
                aria-hidden="true"
                fill="none"
                height="19"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                width="19"
              >
                <path d="M3 3l18 18" />
                <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5 0 8.5 4.5 9.5 7-.4 1-1.2 2.2-2.4 3.3" />
                <path d="M6.2 6.2C3.9 7.6 2.7 9.7 2.5 12c.6 1.5 4 7 9.5 7 1.2 0 2.3-.2 3.3-.7" />
              </svg>
            )}
          </button>
        </div>

        <div className="stats">
          <div className="stat">
            <span>{t.created}</span>
            <strong id="createdDate">{createdDate}</strong>
          </div>
          <div className="stat">
            <span>{t.expires}</span>
            <strong className="date" id="expiredDate">
              {expiresDate}
            </strong>
          </div>
        </div>
      </div>

      <div className="home-actions">
        <button
          className="add pill-btn primary happ-add"
          id="addSubscriptionBtn"
          type="button"
          onClick={onAddSubscription}
        >
          <span className="add-copy">
            <b>{t.addSubTitle}</b>
            <small>{t.addSubSub}</small>
          </span>
          <span className="happ-mark" aria-hidden="true">
            H
          </span>
        </button>
      </div>
    </section>
  );
}
