import { useState, useEffect } from 'react';
import { RefreshCw, WifiOff } from 'lucide-react';
import { motion } from 'framer-motion';

export function BungieAutoRetry({ onRetry, intervalSeconds = 30 }: { onRetry: () => void; intervalSeconds?: number }) {
  const [countdown, setCountdown] = useState(intervalSeconds);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          onRetry();
          return intervalSeconds;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [onRetry, intervalSeconds]);

  return (
    <div className="flex items-center gap-3 mt-2">
      <button
        onClick={() => { setCountdown(intervalSeconds); onRetry(); }}
        className="flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-widest bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-all destiny-clip-sm"
        data-testid="button-bungie-retry"
      >
        <RefreshCw className="w-3.5 h-3.5" /> Retry Now
      </button>
      <span className="text-[10px] text-gray-500" data-testid="text-retry-countdown">
        Auto-retry in {countdown}s
      </span>
    </div>
  );
}

export function OfflineBanner() {
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-center gap-2"
      data-testid="banner-offline"
    >
      <WifiOff className="w-3.5 h-3.5 text-amber-400" />
      <span className="text-[11px] text-amber-300">You are offline — showing cached data</span>
    </motion.div>
  );
}
