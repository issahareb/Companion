import React from 'react';
import { Shield, Loader2, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';

interface LoginProps {
  onLogin: () => void;
  isAuthenticating: boolean;
  error: string | null;
}

export default function Login({ onLogin, isAuthenticating, error }: LoginProps) {
  return (
    <div className="min-h-screen bg-[#0B0B0C] flex flex-col items-center justify-center relative overflow-hidden p-4">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1614729939124-032f0b56c9ce?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center opacity-10 mix-blend-screen" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0C] via-[#0B0B0C]/80 to-transparent" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-white/5 rounded-full blur-[100px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="z-10 w-full max-w-md bg-[#141417]/80 backdrop-blur-xl border border-white/10 p-8 shadow-2xl relative"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
        
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center border border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
            <Shield className="w-8 h-8 text-white/80" strokeWidth={1.5} />
          </div>
        </div>

        <div className="text-center mb-10">
          <h1 className="text-3xl font-display font-semibold tracking-[0.2em] text-white mb-2 text-shadow-glow">
            LOADOUT MANAGER
          </h1>
          <p className="text-sm text-gray-400 tracking-wider">
            Authenticate with Bungie.net to manage your gear.
          </p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-6 p-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm tracking-wide flex items-center gap-3 rounded-sm"
          >
            <div className="w-1 h-full bg-red-500 rounded-full" />
            {error}
          </motion.div>
        )}

        <button
          onClick={onLogin}
          disabled={isAuthenticating}
          className="w-full group relative flex items-center justify-center px-6 py-4 bg-white hover:bg-gray-200 text-black transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden font-display"
        >
          <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
          
          {isAuthenticating ? (
            <div className="flex items-center space-x-3">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="tracking-[0.15em] font-bold text-sm">AUTHENTICATING...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <span className="tracking-[0.2em] font-bold text-sm">LOGIN WITH BUNGIE</span>
              <ExternalLink className="w-4 h-4 opacity-70" />
            </div>
          )}
        </button>
        
        <div className="mt-8 text-center border-t border-white/5 pt-6">
           <p className="text-[10px] text-gray-600 uppercase tracking-widest">
             Not affiliated with Bungie, Inc.
           </p>
        </div>
      </motion.div>
    </div>
  );
}
