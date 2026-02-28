import { ChevronRight, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import { DestinyProfile } from '@/hooks/use-bungie-auth';
import { useI18n } from '@/lib/i18n';

function bungieIcon(url: string | undefined): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `https://www.bungie.net${url}`;
}

interface NavButtonProps {
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
}

export function DesktopNavButton({ icon: Icon, label, active, onClick }: NavButtonProps) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center space-x-3 px-4 py-3 transition-all duration-300 relative overflow-hidden group sidebar-shine-hover ${
        active 
          ? 'text-white' 
          : 'text-gray-500 hover:text-white border-l-2 border-transparent'
      }`}
    >
      {active && (
        <motion.div
          layoutId="sidebar-active-bg"
          className="absolute inset-0 bg-gradient-to-r from-indigo-500/15 via-purple-500/10 to-transparent border-l-2 border-indigo-400"
          initial={false}
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        />
      )}
      {active && (
        <motion.div
          layoutId="sidebar-glow"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-24 h-12 bg-indigo-500/20 blur-xl rounded-full"
          initial={false}
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        />
      )}
      {!active && (
        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/0 to-transparent group-hover:from-white/[0.04] group-hover:via-white/[0.02] transition-all duration-500 border-l-2 border-transparent group-hover:border-white/20" />
      )}
      <div className="relative z-10 flex items-center space-x-3 w-full">
        <div className={`relative ${active ? 'text-indigo-400' : 'group-hover:text-indigo-300'} transition-colors duration-300`}>
          <Icon className="w-5 h-5" strokeWidth={1.5} />
          {active && (
            <motion.div
              className="absolute -inset-1.5 bg-indigo-400/15 rounded-md blur-sm"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            />
          )}
        </div>
        <span className="text-sm font-display tracking-[0.15em] font-medium">{label}</span>
        {active && (
          <motion.div
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 0.5, x: 0 }}
            className="ml-auto"
          >
            <ChevronRight className="w-4 h-4" />
          </motion.div>
        )}
      </div>
    </button>
  );
}

export function MobileNavButton({ icon: Icon, label, active, onClick }: NavButtonProps) {
  return (
    <button 
      onClick={onClick} 
      className={`flex flex-col items-center justify-center space-y-1.5 w-16 transition-colors duration-300 ${
        active ? 'text-white' : 'text-gray-500 hover:text-gray-300'
      }`}
    >
      <Icon className="w-5 h-5" strokeWidth={1.5} />
      <span className="text-[10px] font-display tracking-wider font-medium">{label}</span>
      {active && <div className="w-1 h-1 rounded-full bg-white absolute bottom-1" />}
    </button>
  );
}

interface UserProfileProps {
  profile: DestinyProfile | null;
  onLogout: () => void;
}

export function UserProfile({ profile, onLogout }: UserProfileProps) {
  const { t } = useI18n();
  if (!profile) return null;
  
  return (
    <div className="mt-auto p-4 border-t border-white/[0.06]">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="w-10 h-10 rounded bg-white/10 overflow-hidden shrink-0 border border-white/20 relative">
            {profile.emblemPath ? (
              <img src={bungieIcon(profile.emblemPath)} alt="Emblem" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/50 text-xs">D2</div>
            )}
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#0a0e18]" />
          </div>
          <div className="truncate">
            <p className="text-xs text-white font-medium truncate">{profile.displayName}</p>
            <p className="text-[10px] text-emerald-400/70 uppercase tracking-widest mt-0.5 flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse inline-block" />
              {t('nav.online')}
            </p>
          </div>
        </div>
        <button 
          onClick={onLogout}
          className="p-2 text-gray-600 hover:text-red-400 transition-all duration-300 ml-2 shrink-0 rounded hover:bg-red-500/10"
          title={t('nav.logout')}
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
