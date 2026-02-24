import React, { useEffect } from 'react';
import { useBungieAuth } from '@/hooks/use-bungie-auth';
import Login from './Login';
import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';

export default function Home() {
  const { 
    isAuthenticated, 
    isAuthenticating, 
    isFetchingProfile, 
    authError, 
    login 
  } = useBungieAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isAuthenticated && !isFetchingProfile && !isAuthenticating) {
      setLocation('/dashboard');
    }
  }, [isAuthenticated, isFetchingProfile, isAuthenticating, setLocation]);

  return (
    <AnimatePresence mode="wait">
      {(isFetchingProfile || isAuthenticating) ? (
        <motion.div 
          key="loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="min-h-screen bg-[#050507] flex flex-col items-center justify-center relative"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(40,40,60,0.4)_0%,_rgba(5,5,7,1)_100%)]" />
          <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-6 relative z-10" />
          <p className="text-white/50 font-display tracking-[0.3em] relative z-10 uppercase text-[10px]">
            INITIALISIERE ORBIT-VERBINDUNG...
          </p>
        </motion.div>
      ) : (
        <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <Login 
            onLogin={login} 
            isAuthenticating={isAuthenticating} 
            error={authError} 
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
