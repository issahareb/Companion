import { useState, useRef, useEffect, useCallback } from 'react';
import { Loader2, ArrowUpRight, ChevronDown } from 'lucide-react';
import { Link } from 'wouter';
import ghostImg from '@assets/IMG_0547_1772026484289.gif';
import { useI18n, LANGUAGES } from '@/lib/i18n';
import { LegalFooter } from '@/pages/Legal';

interface TurnstileConfig {
  enabled: boolean;
  siteKey: string;
}

function useTurnstile() {
  const [config, setConfig] = useState<TurnstileConfig>({ enabled: false, siteKey: '' });
  const [token, setToken] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    fetch('/api/config/turnstile')
      .then(r => r.json())
      .then((data: TurnstileConfig) => setConfig(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!config.enabled || !config.siteKey) return;

    const scriptId = 'turnstile-script';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad';
      script.async = true;
      (window as any).onTurnstileLoad = () => setLoaded(true);
      document.head.appendChild(script);
    } else if ((window as any).turnstile) {
      setLoaded(true);
    }
  }, [config]);

  useEffect(() => {
    if (!loaded || !config.siteKey || !widgetRef.current) return;
    if (widgetIdRef.current) return;

    const turnstile = (window as any).turnstile;
    if (!turnstile) return;

    widgetIdRef.current = turnstile.render(widgetRef.current, {
      sitekey: config.siteKey,
      theme: 'dark',
      callback: (t: string) => setToken(t),
      'expired-callback': () => setToken(null),
      'error-callback': () => setToken(null),
    });
  }, [loaded, config.siteKey]);

  const reset = useCallback(() => {
    setToken(null);
    if (widgetIdRef.current && (window as any).turnstile) {
      (window as any).turnstile.reset(widgetIdRef.current);
    }
  }, []);

  return { config, token, widgetRef, reset, isVerified: !config.enabled || !!token };
}

interface LoginProps {
  onLogin: (turnstileToken?: string | null) => void;
  isAuthenticating: boolean;
  error: string | null;
}

export default function Login({ onLogin, isAuthenticating, error }: LoginProps) {
  const { t, language, setLanguage } = useI18n();
  const { config, token, widgetRef, isVerified } = useTurnstile();
  return (
    <div className="gg-entry">
      <header className="gg-entry-header">
        <a href="/" className="gg-entry-wordmark" aria-label="GuardianGrid home">GUARDIAN<span>GRID</span></a>
        <div className="gg-entry-language">
          <select aria-label="Choose language" value={language}
            onChange={event => setLanguage(event.target.value as typeof language)}
            data-testid="button-language-selector">
            {LANGUAGES.map(lang => <option key={lang.id} value={lang.id}>{lang.label}</option>)}
          </select>
          <ChevronDown size={12} aria-hidden="true" />
        </div>
      </header>
      <main className="gg-entry-main">
        <div className="gg-entry-copy">
          <p className="gg-entry-kicker">DESTINY 2 COMPANION</p>
          <h1>GuardianGrid<span className="gg-entry-edition">(Adept)</span></h1>
          <p className="gg-entry-description">{t('login.subtitle')}</p>
          {error && <div className="gg-entry-error" role="alert"><strong>{t('login.error')}</strong><p>{error}</p></div>}
          {config.enabled && <div ref={widgetRef} className="gg-entry-verification" data-testid="turnstile-widget" />}
          <button onClick={() => onLogin(token)} disabled={isAuthenticating || !isVerified}
            className="gg-entry-login" data-testid="button-login">
            <span>{t(isAuthenticating ? 'login.connecting' : 'login.button')}</span>
            {isAuthenticating ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <ArrowUpRight size={20} aria-hidden="true" />}
          </button>
          <Link href="/demo" className="gg-entry-demo">{t('login.demo')}<span aria-hidden="true">↗</span></Link>
        </div>
        <div className="gg-entry-art" aria-hidden="true">
          <picture>
            <source srcSet="/guardian-ghost-animated.webp" type="image/webp" />
            <img src={ghostImg} alt="" width={400} height={400} decoding="async" data-testid="img-ghost-logo" />
          </picture>
          <span className="gg-entry-art-label">YOUR GHOST. READY.</span>
        </div>
      </main>
      <footer className="gg-entry-footer">
        <p>{t('login.disclaimer')}</p>
        <LegalFooter />
      </footer>
    </div>
  );
}
