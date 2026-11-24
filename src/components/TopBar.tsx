import { useEffect, useRef, useState } from 'react';
import { SERVER_OPTIONS, type ServerRegion } from '../utils/dashboardLogic';
import { COPY, type Language } from '../utils/i18n';

interface TopBarProps {
  server: ServerRegion;
  onSelectServer: (server: ServerRegion) => void;
  language: Language;
  onToggleLanguage: () => void;
  siteOnline?: boolean;
}

export function TopBar({
  server,
  onSelectServer,
  language,
  onToggleLanguage,
  siteOnline = true,
}: TopBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const t = COPY[language];
  const statusText = siteOnline ? t.systemOnline : t.systemOffline;

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [menuOpen]);

  return (
    <header className="topbar">
      <div className="identity">
        <img
          className="brand-ghost"
          src="/logo.svg"
          alt="DENZZ CLIENT"
          width={30}
          height={30}
        />
        <div className="brand-copy">
          <b>DENZZ CLIENT</b>
          <span
            aria-label={statusText}
            className={`rx-server-brand${siteOnline ? '' : ' is-offline'}`}
          >
            {statusText}
          </span>
        </div>
      </div>

      <div className="righttop">
        <div className="rx-server" ref={menuRef}>
          <button
            type="button"
            className="rx-server-trigger"
            aria-haspopup="true"
            aria-expanded={menuOpen}
            aria-label={language === 'id' ? 'Pilih server' : 'Select server'}
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            <span aria-hidden="true" className="rx-server-icon">
              <svg viewBox="0 0 24 24">
                <rect height="6.5" rx="1.8" width="17" x="3.5" y="3.5" />
                <rect height="6.5" rx="1.8" width="17" x="3.5" y="14" />
              </svg>
            </span>
            <span className="rx-server-label">{t.server}</span>
            <span aria-hidden="true" className="rx-server-chevron" />
          </button>

          {menuOpen && (
            <div
              aria-label={language === 'id' ? 'Daftar server' : 'Server list'}
              className="rx-server-menu glass"
              role="group"
            >
              {SERVER_OPTIONS.map((opt) => {
                const isActive = opt.id === server;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    aria-pressed={isActive}
                    className={`rx-server-option${isActive ? ' is-active' : ''}`}
                    onClick={() => {
                      onSelectServer(opt.id);
                      setMenuOpen(false);
                    }}
                  >
                    <span>{opt.label}</span>
                    <span className="rx-server-dot" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <button
          aria-label="Change language"
          className="language"
          type="button"
          onClick={onToggleLanguage}
        >
          <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" />
          </svg>
          <span id="langLabel">{t.langBadge}</span>
        </button>

        <div
          aria-label={siteOnline ? 'Online' : 'Offline'}
          className="online"
          title={statusText}
        >
          <i className={`dot${siteOnline ? '' : ' is-offline'}`} aria-hidden="true" />
        </div>
      </div>
    </header>
  );
}
