import { useState, useRef, useEffect } from 'react';
import { Loader2, ExternalLink, AlertTriangle, Globe, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import ghostImg from '@assets/IMG_0547_1772026484289.gif';
import bgImg from '@assets/IMG_0553_1772027873435.jpeg';
import { useI18n, LANGUAGES } from '@/lib/i18n';

interface LoginProps {
  onLogin: () => void;
  isAuthenticating: boolean;
  error: string | null;
}

export default function Login({ onLogin, isAuthenticating, error }: LoginProps) {
  const { t, language, setLanguage } = useI18n();
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

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
    <div className="min-h-screen text-gray-200 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <img src={bgImg} alt="" className="absolute inset-0 w-full h-full object-cover z-0" />
      <div className="absolute inset-0 bg-black/50 z-0" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#080b14] via-transparent to-[#080b14]/80 z-0" />

      <div className="absolute top-4 right-4 z-20" ref={langRef}>
        <button
          onClick={() => setLangOpen(!langOpen)}
          className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 hover:border-white/30 backdrop-blur-md text-white/80 hover:text-white transition-all text-xs tracking-wider"
          data-testid="button-language-selector"
        >
          <Globe className="w-3.5 h-3.5" />
          <span>{currentLang.flag} {currentLang.label}</span>
          <ChevronDown className={`w-3 h-3 transition-transform ${langOpen ? 'rotate-180' : ''}`} />
        </button>
        {langOpen && (
          <div className="absolute right-0 mt-1 bg-[#0c1020]/95 border border-white/10 backdrop-blur-xl shadow-2xl overflow-hidden">
            {LANGUAGES.map(lang => (
              <button
                key={lang.id}
                onClick={() => { setLanguage(lang.id); setLangOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs tracking-wider transition-colors ${
                  language === lang.id
                    ? 'bg-white/10 text-white'
                    : 'text-white/60 hover:bg-white/5 hover:text-white'
                }`}
                data-testid={`button-lang-${lang.id}`}
              >
                <span>{lang.flag}</span>
                <span>{lang.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      
      <div className="max-w-md w-full space-y-12 text-center z-10">
        <div className="space-y-8 relative">
          <div className="w-40 h-40 mx-auto relative flex items-center justify-center">
            <div className="absolute inset-0 border border-white/20 rotate-45 animate-[spin_15s_linear_infinite]" />
            <div className="absolute inset-2 border border-white/10 -rotate-12 animate-[spin_20s_linear_infinite_reverse]" />
            <div className="absolute inset-4 border border-indigo-500/20 rotate-180 animate-[spin_10s_linear_infinite]" />
            
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1, ease: "easeOut" }}
            >
              <img
                src={ghostImg}
                alt="Destiny Ghost"
                className="w-28 h-28 object-contain drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]"
                data-testid="img-ghost-logo"
              />
            </motion.div>
          </div>
          
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            <h1 className="text-3xl tracking-[0.3em] text-white uppercase text-shadow-glow font-display">GuardianGrid <span className="text-[#E5C76B]">(Adept)</span></h1>
            <p className="text-[10px] text-[#E5C76B] font-mono tracking-[0.3em] mt-4 uppercase opacity-70">{t('login.subtitle')}</p>
          </motion.div>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-red-950/40 border border-red-500/20 text-red-400 p-5 flex items-start space-x-4 text-left backdrop-blur-md destiny-clip-sm"
          >
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" />
            <div className="text-xs tracking-widest leading-relaxed uppercase">
              <strong className="text-red-300 block mb-1">{t('login.error')}</strong>
              {error}
            </div>
          </motion.div>
        )}

        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="relative group"
        >
          <div className="absolute -inset-6 bg-gradient-to-r from-purple-600 via-fuchsia-500 via-pink-500 to-purple-600 rounded-2xl blur-2xl opacity-[0.25] group-hover:opacity-[0.45] transition duration-1000 animate-pulse-glow" />
          <div className="absolute -inset-3 bg-gradient-to-r from-pink-500 via-purple-500 to-fuchsia-500 rounded-xl blur-lg opacity-[0.20] group-hover:opacity-[0.40] transition duration-1000 animate-pulse-glow" style={{ animationDelay: '0.5s' }} />
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 rounded-lg blur-md opacity-[0.18] group-hover:opacity-[0.35] transition duration-1000" />
          <button 
            onClick={onLogin}
            disabled={isAuthenticating}
            className="relative w-full bg-[#0c1020]/60 border border-white/10 hover:border-white/40 p-6 flex items-center justify-center transition-all duration-500 backdrop-blur-xl destiny-clip group-hover:-translate-y-1"
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
                <ExternalLink className="w-4 h-4 opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </span>
            )}
          </button>
        </motion.div>
        
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ delay: 1, duration: 1 }}
          className="text-[9px] uppercase tracking-[0.3em] text-gray-500"
        >
          {t('login.disclaimer')}
        </motion.p>
      </div>
    </div>
  );
}
