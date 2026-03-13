import { useState, useRef, useEffect, useCallback } from 'react';
import { Loader2, ExternalLink, AlertTriangle, Globe, ChevronDown, ShieldCheck } from 'lucide-react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import ghostImg from '@assets/IMG_0547_1772026484289.gif';
import bgImg from '@assets/IMG_0553_1772027873435.jpeg';
import logoImg from '@assets/IMG_0604_1772050774054.png';
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

const spring = { type: 'spring' as const, damping: 25, stiffness: 120 };
const appleEase = [0.16, 1, 0.3, 1] as const;

interface LoginProps {
  onLogin: () => void;
  isAuthenticating: boolean;
  error: string | null;
}

export default function Login({ onLogin, isAuthenticating, error }: LoginProps) {
  const { t, language, setLanguage } = useI18n();
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { config: turnstileConfig, token: turnstileToken, widgetRef: turnstileWidgetRef, isVerified } = useTurnstile();

  const { scrollYProgress } = useScroll({ target: containerRef });
  const bgY = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const bgScale = useTransform(scrollYProgress, [0, 1], [1.1, 1.3]);
  const bgYSmooth = useSpring(bgY, { damping: 30, stiffness: 100 });
  const bgScaleSmooth = useSpring(bgScale, { damping: 30, stiffness: 100 });

  const [overscrollBlur, setOverscrollBlur] = useState(0);
  const [overscrollScale, setOverscrollScale] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        let over = 0;
        if (scrollTop < 0) over = Math.abs(scrollTop);
        else if (scrollTop > maxScroll && maxScroll > 0) over = scrollTop - maxScroll;
        const pct = Math.min(over / 120, 1);
        setOverscrollBlur(pct * 16);
        setOverscrollScale(1 + pct * 0.08);
        ticking = false;
      });
    };
    let startY = 0;
    const onTouchStart = (e: TouchEvent) => { startY = e.touches[0].clientY; };
    const onTouchMove = (e: TouchEvent) => {
      const currentY = e.touches[0].clientY;
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const dy = currentY - startY;
      let over = 0;
      if (scrollTop <= 0 && dy > 0) over = Math.min(dy, 150);
      else if (scrollTop >= maxScroll && dy < 0) over = Math.min(Math.abs(dy), 150);
      const pct = Math.min(over / 120, 1);
      setOverscrollBlur(pct * 16);
      setOverscrollScale(1 + pct * 0.08);
    };
    const onTouchEnd = () => {
      setOverscrollBlur(0);
      setOverscrollScale(1);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const currentLang = LANGUAGES.find(l => l.id === language)!;

  return (
    <div ref={containerRef} className="min-h-screen text-gray-200 flex flex-col items-center justify-center p-6 relative pt-0" style={{ justifyContent: 'start', paddingTop: '10vh' }}>
      <div
        className="fixed inset-[-60px] z-0 transition-[filter,transform] duration-300 ease-out"
        style={{
          filter: overscrollBlur > 0 ? `blur(${overscrollBlur}px)` : 'none',
          transform: overscrollScale > 1 ? `scale(${overscrollScale})` : 'none',
        }}
      >
        <motion.img
          src={bgImg}
          alt=""
          className="w-full h-full object-cover"
          style={{ y: bgYSmooth, scale: bgScaleSmooth }}
          initial={{ scale: 1.15, opacity: 0 }}
          animate={{ scale: 1.1, opacity: 1 }}
          transition={{ duration: 1.8, ease: appleEase }}
        />
      </div>
      <motion.div
        className="fixed inset-[-60px] bg-black/50 z-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2 }}
      />
      <div className="fixed inset-[-60px] bg-gradient-to-t from-[#080b14] via-transparent to-[#080b14]/80 z-0" />

      <motion.div
        className="absolute top-4 right-4 z-20"
        ref={langRef}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 0.6, ease: appleEase }}
      >
        <button
          onClick={() => setLangOpen(!langOpen)}
          className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 hover:border-white/30 backdrop-blur-md text-white/80 hover:text-white transition-all text-xs tracking-wider press-scale"
          data-testid="button-language-selector"
        >
          <Globe className="w-3.5 h-3.5" />
          <span>{currentLang.flag} {currentLang.label}</span>
          <motion.div animate={{ rotate: langOpen ? 180 : 0 }} transition={{ duration: 0.3, ease: appleEase }}>
            <ChevronDown className="w-3 h-3" />
          </motion.div>
        </button>
        {langOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.25, ease: appleEase }}
            className="absolute right-0 mt-1 bg-[#0c1020]/95 border border-white/10 backdrop-blur-xl shadow-2xl overflow-hidden"
          >
            {LANGUAGES.map((lang, i) => (
              <motion.button
                key={lang.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05, duration: 0.2, ease: appleEase }}
                onClick={() => { setLanguage(lang.id); setLangOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs tracking-wider transition-colors press-scale ${
                  language === lang.id
                    ? 'bg-white/10 text-white'
                    : 'text-white/60 hover:bg-white/5 hover:text-white'
                }`}
                data-testid={`button-lang-${lang.id}`}
              >
                <span>{lang.flag}</span>
                <span>{lang.label}</span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </motion.div>
      
      <div className="max-w-md w-full text-center z-10 flex flex-col items-center flex-1">
        <div className="relative flex flex-col items-center">
          <motion.div
            className="w-36 h-36 mx-auto relative flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.6, rotate: -10 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 1.2, ease: appleEase }}
          >
            <motion.div
              className="absolute inset-0 border border-white/20 rotate-45"
              animate={{ rotate: [45, 405] }}
              transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
            />
            <motion.div
              className="absolute inset-2 border border-white/10 -rotate-12"
              animate={{ rotate: [-12, -372] }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            />
            <motion.div
              className="absolute inset-4 border border-indigo-500/20 rotate-180"
              animate={{ rotate: [180, 540] }}
              transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
            />
            
            <motion.div
              initial={{ scale: 0.5, opacity: 0, filter: 'blur(10px)' }}
              animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
              transition={{ delay: 0.3, duration: 1, ease: appleEase }}
              className="animate-float-gentle"
            >
              <img
                src={ghostImg}
                alt="Destiny Ghost"
                className="w-24 h-24 object-contain drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]"
                data-testid="img-ghost-logo"
              />
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ y: 40, opacity: 0, filter: 'blur(12px)' }}
            animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
            transition={{ delay: 0.5, duration: 1, ease: appleEase }}
            className="mt-1 w-full"
          >
            <img src={logoImg} alt="GuardianGrid (Adept)" className="w-full h-auto drop-shadow-[0_0_20px_rgba(255,255,255,0.15)] mix-blend-screen" data-testid="img-logo" />
          </motion.div>
        </div>

        <div className="flex-1" />

        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={spring}
            className="mb-6 w-full bg-red-950/40 border border-red-500/20 text-red-400 p-5 flex items-start space-x-4 text-left backdrop-blur-md destiny-clip-sm"
          >
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" />
            <div className="text-xs tracking-widest leading-relaxed uppercase">
              <strong className="text-red-300 block mb-1">{t('login.error')}</strong>
              {error}
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.9, ease: appleEase }}
          className="w-full"
        >
          <p className="text-[11px] text-[#E5C76B] font-mono tracking-[0.25em] uppercase leading-relaxed drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] [text-shadow:0_0_8px_rgba(0,0,0,0.8),0_1px_3px_rgba(0,0,0,0.9)]">{t('login.subtitle')}</p>
        </motion.div>

        {turnstileConfig.enabled && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.7, ease: appleEase }}
            className="mt-4 mb-2 w-full flex flex-col items-center"
          >
            <div ref={turnstileWidgetRef} data-testid="turnstile-widget" />
            {isVerified && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={spring}
                className="flex items-center gap-2 mt-2 text-emerald-400/80"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span className="text-[9px] uppercase tracking-[0.2em]">{t('login.verified')}</span>
              </motion.div>
            )}
          </motion.div>
        )}

        <motion.div 
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.9, ease: appleEase }}
          className="relative group mt-6 w-full"
        >
          <motion.div
            className="absolute -inset-6 bg-gradient-to-r from-purple-600 via-fuchsia-500 via-pink-500 to-purple-600 rounded-2xl blur-2xl"
            animate={{ opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute -inset-3 bg-gradient-to-r from-pink-500 via-purple-500 to-fuchsia-500 rounded-xl blur-lg"
            animate={{ opacity: [0.15, 0.35, 0.15] }}
            transition={{ duration: 3, delay: 0.5, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 rounded-lg blur-md opacity-[0.18] group-hover:opacity-[0.35] transition duration-1000" />
          <motion.button 
            onClick={onLogin}
            disabled={isAuthenticating || !isVerified}
            className={`relative w-full bg-[#0c1020]/60 border border-white/10 hover:border-white/40 p-6 flex items-center justify-center transition-all duration-500 backdrop-blur-xl destiny-clip ${!isVerified ? 'opacity-40 cursor-not-allowed' : ''}`}
            whileHover={{ y: -3, scale: 1.01 }}
            whileTap={{ scale: 0.97 }}
            transition={spring}
            data-testid="button-login"
          >
            {isAuthenticating ? (
              <span className="flex items-center space-x-4 text-[11px] tracking-[0.3em] text-[#E5C76B]">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{t('login.connecting')}</span>
              </span>
            ) : (
              <span className="flex items-center space-x-4 text-[11px] tracking-[0.3em] text-white font-bold">
                <span>{t('login.button')}</span>
                <motion.span
                  className="inline-block"
                  whileHover={{ x: 4 }}
                  transition={spring}
                >
                  <ExternalLink className="w-4 h-4 opacity-40 group-hover:opacity-100 transition-opacity" />
                </motion.span>
              </span>
            )}
          </motion.button>
        </motion.div>
        
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ delay: 1.3, duration: 1.2 }}
          className="text-[10px] tracking-[0.2em] text-white/40 mt-6"
        >
          {t('login.disclaimer')}
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="w-full z-10"
        >
          <LegalFooter />
        </motion.div>
      </div>
    </div>
  );
}
