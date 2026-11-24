import type { CSSProperties } from 'react';
import { COPY, type Language } from '../utils/i18n';

export type DashboardTab = 'homePage' | 'combatView' | 'utilityView' | 'manageView';

interface BottomTabsProps {
  activeTab: DashboardTab;
  onSelectTab: (tab: DashboardTab) => void;
  language: Language;
}

const TAB_ORDER: DashboardTab[] = ['homePage', 'combatView', 'utilityView', 'manageView'];

export function BottomTabs({ activeTab, onSelectTab, language }: BottomTabsProps) {
  const t = COPY[language];
  const activeIndex = Math.max(0, TAB_ORDER.indexOf(activeTab));

  return (
    <nav
      aria-label="Dashboard navigation"
      className="rextron-tabs glass"
      role="tablist"
      style={{ '--i': activeIndex } as CSSProperties}
    >
      <i className="tab-glow" aria-hidden="true" />

      <button
        aria-selected={activeTab === 'homePage'}
        className={`rextron-tab${activeTab === 'homePage' ? ' active' : ''}`}
        role="tab"
        type="button"
        onClick={() => onSelectTab('homePage')}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z" />
        </svg>
        <span>{t.tabs.home}</span>
      </button>

      <button
        aria-selected={activeTab === 'combatView'}
        className={`rextron-tab${activeTab === 'combatView' ? ' active' : ''}`}
        role="tab"
        type="button"
        onClick={() => onSelectTab('combatView')}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
        </svg>
        <span>{t.tabs.combat}</span>
      </button>

      <button
        aria-selected={activeTab === 'utilityView'}
        className={`rextron-tab${activeTab === 'utilityView' ? ' active' : ''}`}
        role="tab"
        type="button"
        onClick={() => onSelectTab('utilityView')}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M13 2 4 14h7l-1 8 9-12h-7z" />
        </svg>
        <span>{t.tabs.utility}</span>
      </button>

      <button
        aria-selected={activeTab === 'manageView'}
        className={`rextron-tab${activeTab === 'manageView' ? ' active' : ''}`}
        role="tab"
        type="button"
        onClick={() => onSelectTab('manageView')}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
          <circle cx="16" cy="7" r="2" />
          <circle cx="8" cy="17" r="2" />
        </svg>
        <span>{t.tabs.manage}</span>
      </button>
    </nav>
  );
}
