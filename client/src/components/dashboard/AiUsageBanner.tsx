import { useQuery } from '@tanstack/react-query';
import { Crown, Sparkles, AlertTriangle } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

interface PremiumStatus {
  isPremium: boolean;
  premiumSince: string | null;
  premiumUntil: string | null;
  aiUsage: {
    used: number;
    limit: number | null;
    remaining: number | null;
  };
}

export function usePremiumStatus() {
  return useQuery<PremiumStatus>({
    queryKey: ['/api/premium/status'],
    staleTime: 60 * 1000,
    retry: false,
  });
}

export function AiUsageBanner() {
  const { t } = useI18n();
  const { data: premium } = usePremiumStatus();

  if (!premium) return null;

  if (premium.isPremium) {
    return (
      <div className="mx-4 md:mx-8 mb-3 flex items-center gap-2 px-3 py-2 bg-yellow-500/[0.06] border border-yellow-500/20 rounded-lg" data-testid="premium-badge-banner">
        <Crown className="w-4 h-4 text-[var(--color-gold-accent)]" />
        <span className="text-[11px] font-display tracking-destiny-wide uppercase text-[var(--color-gold-accent)]">{t('premium.badge')}</span>
        <span className="text-[11px] text-gray-500 ml-auto">{t('premium.unlimited')}</span>
      </div>
    );
  }

  const { used, limit, remaining } = premium.aiUsage;
  const isLimited = remaining !== null && remaining <= 0;
  const percentage = limit ? Math.min(100, (used / limit) * 100) : 0;

  return (
    <div className={`mx-4 md:mx-8 mb-3 px-3 py-2.5 border rounded-lg ${
      isLimited ? 'bg-red-500/[0.06] border-red-500/20' : 'bg-white/[0.02] border-white/[0.06]'
    }`} data-testid="ai-usage-banner">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          {isLimited ? (
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
          ) : (
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          )}
          <span className="text-[11px] font-display tracking-destiny uppercase text-gray-400">{t('premium.aiUsage')}</span>
        </div>
        <span className="text-[11px] font-mono text-gray-500">{used}/{limit}</span>
      </div>
      <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isLimited ? 'bg-red-500' : percentage > 60 ? 'bg-amber-500' : 'bg-indigo-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {isLimited && (
        <div className="mt-2 flex items-center justify-between">
          <p className="text-[11px] text-red-400">{t('premium.aiLimit')}</p>
          <button
            className="text-[11px] font-display tracking-destiny uppercase px-2 py-1 bg-[var(--color-gold-accent)]/10 text-[var(--color-gold-accent)] border border-[var(--color-gold-accent)]/20 rounded hover:bg-[var(--color-gold-accent)]/20 transition-all"
            data-testid="button-upgrade-premium"
          >
            {t('premium.upgrade')}
          </button>
        </div>
      )}
    </div>
  );
}

export function PremiumSidebarBadge() {
  const { t } = useI18n();
  const { data: premium } = usePremiumStatus();

  if (!premium) return null;

  if (premium.isPremium) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 bg-yellow-500/10 rounded" data-testid="premium-sidebar-badge">
        <Crown className="w-3 h-3 text-[var(--color-gold-accent)]" />
        <span className="text-[11px] font-display tracking-destiny uppercase text-[var(--color-gold-accent)]">{t('premium.badge')}</span>
      </div>
    );
  }

  const { used, limit } = premium.aiUsage;
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 bg-white/[0.03] rounded" data-testid="free-sidebar-badge">
      <Sparkles className="w-3 h-3 text-gray-500" />
      <span className="text-[11px] text-gray-500 font-mono">{used}/{limit}</span>
    </div>
  );
}
