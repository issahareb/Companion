import React from 'react';
import { useBungieAuth } from '@/hooks/use-bungie-auth';
import Login from './Login';
import Dashboard from './Dashboard';
import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Home() {
  const { 
    isAuthenticated, 
    isAuthenticating, 
    isFetchingProfile, 
    authError, 
    login 
  } = useBungieAuth();

  if (isAuthenticated && !isFetchingProfile) {
    return <Dashboard />;
  }

  return (
    <AnimatePresence mode="wait">
      {isFetchingProfile ? (
        <motion.div 
          key="loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="min-h-screen bg-[#0B0B0C] flex flex-col items-center justify-center relative"
        >
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1614729939124-032f0b56c9ce?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center opacity-5" />
          <Loader2 className="w-10 h-10 text-white/50 animate-spin mb-6 relative z-10" />
          <p className="text-white/50 font-display tracking-[0.2em] relative z-10 uppercase text-sm">
            Connecting to Bungie servers...
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
