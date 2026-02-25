import { Loader2, ExternalLink, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import ghostImg from '@assets/IMG_0547_1772026484289.gif';

interface LoginProps {
  onLogin: () => void;
  isAuthenticating: boolean;
  error: string | null;
}

export default function Login({ onLogin, isAuthenticating, error }: LoginProps) {
  return (
    <div className="min-h-screen bg-app text-gray-200 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-app-overlay z-0" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,_rgba(59,45,120,0.15)_0%,_transparent_70%)] z-0" />
      <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-indigo-900/10 to-transparent blur-3xl z-0" />
      
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
            <h1 className="text-4xl font-light tracking-[0.4em] text-white uppercase text-shadow-glow">Forge</h1>
            <p className="text-[10px] text-[#E5C76B] font-mono tracking-[0.3em] mt-4 uppercase opacity-70">Schnittstelle_Initialisierung</p>
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
              <strong className="text-red-300 block mb-1">Authentifizierungs-Fehler</strong>
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
          <div className="absolute -inset-3 bg-gradient-to-r from-purple-600 via-pink-500 via-indigo-500 to-purple-600 rounded-lg blur-xl opacity-20 group-hover:opacity-50 transition duration-1000 animate-pulse-glow" />
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-lg blur opacity-15 group-hover:opacity-40 transition duration-1000" />
          <button 
            onClick={onLogin}
            disabled={isAuthenticating}
            className="relative w-full bg-[#0c1020]/60 border border-white/10 hover:border-white/40 p-6 flex items-center justify-center transition-all duration-500 backdrop-blur-xl destiny-clip group-hover:-translate-y-1"
            data-testid="button-login"
          >
            {isAuthenticating ? (
              <span className="flex items-center space-x-4 text-[11px] tracking-[0.3em] text-[#E5C76B]">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>VERBINDE...</span>
              </span>
            ) : (
              <span className="flex items-center space-x-4 text-[11px] tracking-[0.3em] text-white font-bold">
                <span>LOGIN VIA BUNGIE.NET</span>
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
          Nicht mit Bungie, Inc. verbunden
        </motion.p>
      </div>
    </div>
  );
}
