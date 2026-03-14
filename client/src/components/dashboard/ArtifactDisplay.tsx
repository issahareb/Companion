import { Sparkles } from 'lucide-react';
import type { ArtifactInfo } from '@/hooks/use-profile-state';
import { useI18n } from '@/lib/i18n';

export function ArtifactDisplay({ artifact }: { artifact: ArtifactInfo }) {
  const { t } = useI18n();
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 p-3 bg-black/40 border border-white/[0.06]">
        {artifact.icon && <img src={artifact.icon} alt={artifact.name} className="w-12 h-12 shrink-0 ring-1 ring-amber-500/20 rounded-sm" />}
        <div className="flex-1">
          <p className="text-[11px] font-bold tracking-wider uppercase text-amber-300">{artifact.name}</p>
          <div className="flex items-center gap-3 mt-0.5">
            {artifact.powerBonus > 0 && (
              <span className="text-[11px] text-yellow-500/80 flex items-center gap-0.5 font-medium">
                <Sparkles className="w-2.5 h-2.5" /> +{artifact.powerBonus} {t('artifact.powerBonus')}
              </span>
            )}
            <span className="text-[11px] text-gray-500">{t('artifact.points')}: {artifact.pointsUsed}/{artifact.pointsAvailable}</span>
          </div>
        </div>
      </div>

      {artifact.tiers.map((tier, tierIdx) => {
        const activeItems = tier.items.filter(i => i.isActive);
        if (activeItems.length === 0) return null;
        return (
          <div key={tierIdx} className="space-y-1">
            <p className="text-[11px] text-gray-500 uppercase tracking-destiny-wide font-medium px-1">{t('artifact.tier')} {tierIdx + 1}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
              {activeItems.map((item) => (
                <div key={item.itemHash} className="flex items-center gap-2 p-2 bg-amber-500/[0.04] border border-amber-500/10">
                  {item.icon && <img src={item.icon} alt={item.name} className="w-7 h-7 rounded-sm ring-1 ring-amber-500/20 shrink-0" />}
                  <p className="text-[11px] text-amber-200/80 font-medium truncate">{item.name}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
