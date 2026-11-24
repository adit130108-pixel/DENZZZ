import type { CSSProperties } from 'react';
import {
  AIM_SCALE_LEVELS,
  getAimTargetZone,
  getBanRisk,
  MARKER_STYLES,
  type MarkerStyle,
} from '../utils/dashboardLogic';
import { COPY, type Language } from '../utils/i18n';

interface CombatViewProps {
  language: Language;
  markerEnabled: boolean;
  onToggleMarker: () => void;
  markerStyle: MarkerStyle;
  onSelectMarkerStyle: (style: MarkerStyle) => void;
  aimEnabled: boolean;
  onToggleAim: () => void;
  aimHeight: number;
  onChangeAimHeight: (value: number) => void;
}

export function CombatView({
  language,
  markerEnabled,
  onToggleMarker,
  markerStyle,
  onSelectMarkerStyle,
  aimEnabled,
  onToggleAim,
  aimHeight,
  onChangeAimHeight,
}: CombatViewProps) {
  const t = COPY[language];
  const targetZone = getAimTargetZone(aimHeight);
  const banRisk = getBanRisk(aimEnabled, aimHeight);

  return (
    <section aria-label={t.tabs.combat} className="view" id="combatView">
      <article aria-label="Marker preferences" className="marker-card glass">
        <div className="marker-head">
          <div className="marker-copy">
            <div className="marker-title">
              <span className="marker-number">01</span>
              <strong className="marker-name">{t.marker.title}</strong>
              <small className="marker-new">{t.marker.newBadge}</small>
            </div>
            <p>{t.marker.desc}</p>
          </div>
          <button
            aria-checked={markerEnabled}
            aria-label="Enable Marker"
            className="marker-switch"
            id="markerToggle"
            role="switch"
            type="button"
            onClick={onToggleMarker}
          >
            <span />
          </button>
        </div>

        <div className="marker-style-label">{t.marker.styleLabel}</div>
        <div aria-label="Choose marker style" className="marker-style-grid" role="group">
          {MARKER_STYLES.map((styleName) => {
            const isSelected = markerStyle === styleName;
            return (
              <button
                key={styleName}
                aria-pressed={isSelected}
                aria-disabled={!markerEnabled}
                className={`marker-style-btn${isSelected ? ' selected' : ''}${
                  !markerEnabled ? ' is-locked' : ''
                }`}
                disabled={!markerEnabled}
                type="button"
                onClick={() => onSelectMarkerStyle(styleName)}
              >
                {styleName}
              </button>
            );
          })}
        </div>

        <p
          className={`marker-note ${markerEnabled ? 'is-enabled' : 'is-disabled'}`}
          id="markerStatus"
        >
          {markerEnabled ? t.marker.enabledNote(markerStyle) : t.marker.disabledNote}
        </p>
      </article>

      <div className="aim-card glass">
        <div className="aim-head">
          <div>
            <div className="aim-title">
              <span>02</span>
              <span>{t.aim.title}</span>
              <small>{t.aim.newBadge}</small>
            </div>
            <p className="aim-description">{t.aim.desc}</p>
          </div>
          <input
            aria-label="Enable Aimpoint"
            checked={aimEnabled}
            className="aim-switch"
            id="aimToggle"
            type="checkbox"
            onChange={onToggleAim}
          />
        </div>

        <div className="aim-setting">
          <div className="aim-setting-top">
            <div className="aim-label">{t.aim.label}</div>
            <div className="aim-value">
              <span id="aimTargetName">{targetZone.labelKey}</span>
              <strong id="aimValue">{aimHeight}%</strong>
            </div>
          </div>

          <div className="aim-diagram">
            <div className="aim-figure">
              <div aria-hidden="true" className="aim-person">
                <div className="head" />
                <div className="neck" />
                <div className="body" />
                <div
                  className="target"
                  id="aimMarker"
                  style={{
                    top: `${targetZone.markerTopPercent}%`,
                    opacity: aimEnabled ? 1 : 0.3,
                  }}
                />
              </div>
            </div>

            <div className="aim-scale" id="aimScale">
              {AIM_SCALE_LEVELS.map((level) => {
                const isActive =
                  aimEnabled && targetZone.labelKey === level.labelKey;
                return (
                  <button
                    key={level.labelKey}
                    type="button"
                    aria-pressed={isActive}
                    disabled={!aimEnabled}
                    className={`aim-scale-row${isActive ? ' active' : ''}`}
                    onClick={() => onChangeAimHeight(level.percent)}
                  >
                    <span>{level.labelKey}</span>
                    <b>{level.percent}%</b>
                  </button>
                );
              })}
            </div>
          </div>

          <input
            aria-label="Aim height percentage"
            className="aim-range"
            disabled={!aimEnabled}
            id="aimRange"
            max={100}
            min={0}
            type="range"
            value={aimHeight}
            style={{ '--fill': `${aimHeight}%` } as CSSProperties}
            onChange={(e) => onChangeAimHeight(Number(e.target.value))}
          />

          <div
            aria-live="polite"
            className="aim-risk"
            data-level={banRisk.level}
            id="aimRisk"
            role="status"
          >
            <div className="aim-risk-top">
              <span>{t.aim.banRisk}</span>
              <strong id="aimRiskLabel">{t.aim.riskLabels[banRisk.level]}</strong>
            </div>
            <div aria-hidden="true" className="aim-risk-track">
              <i id="aimRiskFill" style={{ width: `${banRisk.fillPercent}%` }} />
            </div>
            <p className="aim-risk-hint" id="aimRiskHint">
              {t.aim.riskHint(banRisk.level, aimHeight, targetZone.labelKey)}
            </p>
          </div>

          <p className="aim-footnote" id="aimStatus">
            {aimEnabled
              ? t.aim.footnoteOn(targetZone.labelKey, aimHeight)
              : t.aim.footnoteOff}
          </p>
        </div>
      </div>
    </section>
  );
}
