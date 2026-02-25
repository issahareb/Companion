import { ChevronRight, LogOut } from 'lucide-react';
import { DestinyProfile } from '@/hooks/use-bungie-auth';
import { useI18n } from '@/lib/i18n';

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
      className={`w-full flex items-center space-x-3 px-4 py-3 transition-all duration-300 ${
        active 
          ? 'bg-white/10 text-white border-l-2 border-white' 
          : 'text-gray-400 hover:bg-white/5 hover:text-white border-l-2 border-transparent'
      }`}
    >
      <Icon className="w-5 h-5" strokeWidth={1.5} />
      <span className="text-sm font-display tracking-[0.15em] font-medium">{label}</span>
      {active && <ChevronRight className="w-4 h-4 ml-auto opacity-50" />}
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
    <div className="mt-auto p-4 border-t border-white/10">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="w-10 h-10 rounded bg-white/10 overflow-hidden shrink-0 border border-white/20">
            {profile.emblemPath ? (
              <img src={`https://www.bungie.net${profile.emblemPath}`} alt="Emblem" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/50 text-xs">D2</div>
            )}
          </div>
          <div className="truncate">
            <p className="text-xs text-white font-medium truncate">{profile.displayName}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">{t('nav.online')}</p>
          </div>
        </div>
        <button 
          onClick={onLogout}
          className="p-2 text-gray-500 hover:text-white transition-colors ml-2 shrink-0 bg-white/5 rounded hover:bg-white/10"
          title={t('nav.logout')}
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
