import type { CSSProperties } from 'react';
import {
  formatSpeedMultiplier,
  getSpeedFillPercent,
  SPEED_PRESETS,
} from '../utils/dashboardLogic';
import { COPY, type Language } from '../utils/i18n';

interface UtilityViewProps {
  language: Language;
  speedEnabled: boolean;
  onToggleSpeed: () => void;
  speedTenths: number;
  onChangeSpeed: (tenths: number) => void;
  fakeLag: boolean;
  onToggleFakeLag: () => void;
  fakeLagFiring: boolean;
  onToggleFakeLagFiring: () => void;
  fakeLagScoping: boolean;
  onToggleFakeLagScoping: () => void;
  revive: boolean;
  onToggleRevive: () => void;
  fastMedkit: boolean;
  onToggleFastMedkit: () => void;
}

export function UtilityView({
  language,
  speedEnabled,
  onToggleSpeed,
  speedTenths,
  onChangeSpeed,
  fakeLag,
  onToggleFakeLag,
  fakeLagFiring,
  onToggleFakeLagFiring,
  fakeLagScoping,
  onToggleFakeLagScoping,
  revive,
  onToggleRevive,
  fastMedkit,
  onToggleFastMedkit,
}: UtilityViewProps) {
  const t = COPY[language];
  const speedLabel = formatSpeedMultiplier(speedTenths);
  const speedFill = getSpeedFillPercent(speedTenths);

  return (
    <section aria-label={t.tabs.utility} className="view" id="utilityView">
      <article aria-label="Speed boost preference" className="speed-card glass">
        <div className="speed-head">
          <div className="speed-copy">
            <div className="speed-title">
              <span className="speed-number">03</span>
              <strong>{t.speed.title}</strong>
              <small>{t.speed.newBadge}</small>
            </div>
            <p>{t.speed.desc}</p>
          </div>
          <button
            aria-checked={speedEnabled}
            aria-label="Enable Speed Boost"
            className="speed-switch"
            id="speedToggle"
            role="switch"
            type="button"
            onClick={onToggleSpeed}
          >
            <span />
          </button>
        </div>

        <div
          aria-disabled={!speedEnabled}
          className="speed-setting"
          id="speedSetting"
        >
          <div className="speed-setting-top">
            <span className="speed-label">{t.speed.label}</span>
            <strong className="speed-value" id="speedValue">
              {speedLabel}
            </strong>
          </div>

          <input
            aria-label="Speed multiplier"
            className="speed-range"
            disabled={!speedEnabled}
            id="speedRange"
            max={15}
            min={10}
            step={1}
            type="range"
            value={speedTenths}
            style={{ '--fill': `${speedFill}%` } as CSSProperties}
            onChange={(e) => onChangeSpeed(Number(e.target.value))}
          />

          <div
            aria-label="Choose speed multiplier"
            className="speed-presets"
            role="group"
          >
            {SPEED_PRESETS.map((preset) => {
              const isSelected = speedTenths === preset;
              return (
                <button
                  key={preset}
                  aria-pressed={isSelected}
                  className={`speed-preset${isSelected ? ' selected' : ''}`}
                  disabled={!speedEnabled}
                  type="button"
                  onClick={() => onChangeSpeed(preset)}
                >
                  {formatSpeedMultiplier(preset)}
                </button>
              );
            })}
          </div>

          <p className="speed-status" id="speedStatus">
            {speedEnabled ? t.speed.statusOn(speedLabel) : t.speed.statusOff}
          </p>
        </div>
      </article>

      <div aria-label="Additional feature preferences" className="extra-feature-list">
        <article className="extra-feature-card glass">
          <div className="extra-feature-head">
            <div className="extra-feature-copy">
              <div className="extra-feature-title">
                <span className="rex-feature-number">04</span>
                <strong className="rex-feature-name">{t.extra.fakeLagTitle}</strong>
              </div>
              <p>{t.extra.fakeLagDesc}</p>
            </div>
            <button
              aria-checked={fakeLag}
              aria-label="Toggle Fake Lag"
              className={`rex-switch ${fakeLag ? 'is-on' : 'is-off'}`}
              role="switch"
              type="button"
              onClick={onToggleFakeLag}
            >
              <span />
            </button>
          </div>

          <div className="extra-feature-options">
            <div className="extra-feature-option">
              <span>{t.extra.whenFiring}</span>
              <button
                aria-checked={fakeLagFiring}
                aria-disabled={!fakeLag}
                aria-label="Fake Lag when firing"
                className={`rex-switch rex-switch-small ${
                  fakeLagFiring ? 'is-on' : 'is-off'
                }`}
                disabled={!fakeLag}
                role="switch"
                type="button"
                onClick={onToggleFakeLagFiring}
              >
                <span />
              </button>
            </div>

            <div className="extra-feature-option">
              <span>{t.extra.whenScoping}</span>
              <button
                aria-checked={fakeLagScoping}
                aria-disabled={!fakeLag}
                aria-label="Fake Lag when scoping"
                className={`rex-switch rex-switch-small ${
                  fakeLagScoping ? 'is-on' : 'is-off'
                }`}
                disabled={!fakeLag}
                role="switch"
                type="button"
                onClick={onToggleFakeLagScoping}
              >
                <span />
              </button>
            </div>
          </div>
        </article>

        <article className="extra-feature-card glass">
          <div className="extra-feature-head">
            <div className="extra-feature-copy">
              <div className="extra-feature-title">
                <span className="rex-feature-number">05</span>
                <strong className="rex-feature-name">{t.extra.reviveTitle}</strong>
              </div>
              <p>{t.extra.reviveDesc}</p>
            </div>
            <button
              aria-checked={revive}
              aria-label="Toggle Revive"
              className={`rex-switch ${revive ? 'is-on' : 'is-off'}`}
              role="switch"
              type="button"
              onClick={onToggleRevive}
            >
              <span />
            </button>
          </div>
        </article>

        <article className="extra-feature-card glass">
          <div className="extra-feature-head">
            <div className="extra-feature-copy">
              <div className="extra-feature-title">
                <span className="rex-feature-number">06</span>
                <strong className="rex-feature-name">{t.extra.fastMedkitTitle}</strong>
                <small>{t.extra.fastMedkitNew}</small>
              </div>
              <p>{t.extra.fastMedkitDesc}</p>
            </div>
            <button
              aria-checked={fastMedkit}
              aria-label="Toggle Fast Medkit"
              className={`rex-switch ${fastMedkit ? 'is-on' : 'is-off'}`}
              role="switch"
              type="button"
              onClick={onToggleFastMedkit}
            >
              <span />
            </button>
          </div>
        </article>
      </div>
    </section>
  );
}
