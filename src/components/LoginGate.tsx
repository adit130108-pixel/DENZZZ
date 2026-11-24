import { useState, type FormEvent } from 'react';
import { COPY, type Language } from '../utils/i18n';

interface LoginGateProps {
  language: Language;
  onUnlock: (key: string) => void;
}

export function LoginGate({ language, onUnlock }: LoginGateProps) {
  const [inputKey, setInputKey] = useState('');
  const [error, setError] = useState('');
  const t = COPY[language];

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = inputKey.trim().toUpperCase();
    if (!trimmed || trimmed.length < 4) {
      setError(t.login.invalidKey);
      return;
    }
    setError('');
    onUnlock(trimmed);
  }

  return (
    <div className="login-gate">
      <div className="glass login-card">
        <img
          src="/logo.svg"
          alt="DENZZ CLIENT"
          width={64}
          height={64}
          className="ghost-float"
        />
        <span className="login-eyebrow">{t.login.eyebrow}</span>
        <h1 className="login-title">{t.login.title}</h1>
        <p className="login-sub">{t.login.subtitle}</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="accessKeyInput" className="sr-only">
            Access Key
          </label>
          <input
            id="accessKeyInput"
            type="text"
            className="login-input"
            placeholder={t.login.placeholder}
            value={inputKey}
            onChange={(e) => {
              setInputKey(e.target.value);
              if (error) setError('');
            }}
            autoComplete="off"
          />
          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="pill-btn primary login-submit">
            {t.login.submit}
          </button>
        </form>

        <button
          type="button"
          className="login-demo"
          onClick={() => onUnlock('DENZZMODZ')}
        >
          {t.login.useDemo}
        </button>
      </div>
    </div>
  );
}
