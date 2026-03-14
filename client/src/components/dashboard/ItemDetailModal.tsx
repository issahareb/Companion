import { X, Sparkles, ArrowRightLeft, Shield, Package, Lock, Unlock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import type { InventoryItem, CharacterData } from '@/hooks/use-profile-state';
import { useI18n } from '@/lib/i18n';
import { rateWeaponRoll } from '@/lib/roll-ratings';
import { RollRatingBadge } from './EquippedSlotRow';
import { TierStars } from './TierStars';
import { useMemo } from 'react';

function bungieIcon(url: string | undefined): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `https://www.bungie.net${url}`;
}

function StatBar({ name, value, maxValue = 100 }: { name: string; value: number; maxValue?: number }) {
  const pct = Math.min((value / maxValue) * 100, 100);
  const isHigh = pct >= 70;
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-gray-400 w-20 truncate shrink-0">{name}</span>
      <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full stat-bar-fill ${isHigh ? 'bg-indigo-400' : 'bg-white/30'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-[11px] font-mono w-8 text-right shrink-0 ${isHigh ? 'text-indigo-400' : 'text-gray-500'}`}>{value}</span>
    </div>
  );
}

export function ItemDetailModal({
  item,
  characters,
  onClose,
  onTransferToChar,
  onEquipOnChar,
  onAddToLoadout,
  onSetLockState,
  isInLoadout,
}: {
  item: InventoryItem;
  characters: CharacterData[];
  onClose: () => void;
  onTransferToChar?: (charId: string) => void;
  onEquipOnChar?: (charId: string) => void;
  onAddToLoadout?: () => void;
  onSetLockState?: (locked: boolean) => void;
  isInLoadout?: boolean;
}) {
  const { t } = useI18n();
  const isExotic = item.rarity === 'exotic';
  const isWeapon = ['kinetic', 'energy', 'power'].includes(item.slot);
  const rarityColor = isExotic ? 'var(--color-exotic)' : item.rarity === 'legendary' ? 'var(--color-legendary)' : item.rarity === 'rare' ? 'var(--color-rare)' : '#555';

  const rollResult = useMemo(() => {
    if (!isWeapon) return null;
    const perkNames = [
      ...(item.perks || []).filter(p => p.isActive).map(p => p.name),
      ...(item.mods || []).map(m => m.name),
    ];
    if (perkNames.length === 0) return null;
    return rateWeaponRoll(item.type, perkNames);
  }, [item, isWeapon]);

  const activePerks = (item.perks || []).filter(p => p.isActive);
  const inactivePerks = (item.perks || []).filter(p => !p.isActive);
  const hasStats = item.stats && item.stats.length > 0;
  const hasPerks = activePerks.length > 0 || inactivePerks.length > 0;
  const hasMods = item.mods && item.mods.length > 0;
  const screenshotSrc = item.screenshot ? bungieIcon(item.screenshot) : '';

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center"
        onClick={onClose}
        data-testid="item-detail-overlay"
      >
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="w-full sm:max-w-md max-h-[90vh] sm:max-h-[85vh] bg-[#0c0f1a] border border-white/[0.08] sm:rounded-xl flex flex-col overflow-hidden relative"
          onClick={(e) => e.stopPropagation()}
          data-testid="item-detail-modal"
        >
          {screenshotSrc && (
            <div className="relative h-40 sm:h-48 overflow-hidden shrink-0">
              <img src={screenshotSrc} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0c0f1a] via-[#0c0f1a]/40 to-transparent" />
              <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ backgroundColor: rarityColor }} />
            </div>
          )}

          {!screenshotSrc && (
            <div className="relative h-24 shrink-0 flex items-center justify-center bg-white/[0.02]">
              <Package className="w-10 h-10 text-gray-600" />
              <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ backgroundColor: rarityColor }} />
            </div>
          )}

          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-2 text-gray-400 hover:text-white bg-black/40 backdrop-blur-sm rounded-lg transition-colors z-10"
            data-testid="button-close-detail"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex-1 overflow-y-auto scroll-container">
            <div className={`px-4 ${screenshotSrc ? '-mt-12 relative z-10' : 'pt-4'}`}>
              <div className="flex items-start gap-3">
                {item.icon && (
                  <div className="w-14 h-14 rounded-lg overflow-hidden border border-white/10 shrink-0 bg-black/40">
                    <img src={bungieIcon(item.icon)} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <TierStars rarity={item.rarity} />
                    {rollResult && <RollRatingBadge result={rollResult} />}
                  </div>
                  <h2 className="text-base font-bold text-white mt-1 leading-tight" style={{ color: isExotic ? 'var(--color-gold-accent)' : 'white' }} data-testid="text-item-name">
                    {item.name}
                  </h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-gray-400">{item.type}</span>
                    {item.power > 0 && (
                      <span className="text-[11px] text-gray-400 flex items-center gap-0.5">
                        <Sparkles className="w-2.5 h-2.5 text-[var(--color-gold-accent)]" /> {item.power}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {item.description && (
                <p className="text-[11px] text-gray-400 mt-3 leading-relaxed italic" data-testid="text-item-description">{item.description}</p>
              )}
            </div>

            {hasStats && (
              <div className="px-4 mt-4">
                <h3 className="text-[11px] uppercase tracking-destiny-wide text-gray-500 font-display mb-2" data-testid="section-stats">{t('item.stats') || 'STATS'}</h3>
                <div className="space-y-1.5">
                  {item.stats!.map(s => (
                    <StatBar key={s.statHash} name={s.name} value={s.value} />
                  ))}
                </div>
              </div>
            )}

            {hasPerks && (
              <div className="px-4 mt-4">
                <h3 className="text-[11px] uppercase tracking-destiny-wide text-gray-500 font-display mb-2" data-testid="section-perks">{t('item.perks') || 'PERKS'}</h3>
                <div className="space-y-1.5">
                  {activePerks.map(p => (
                    <div key={p.perkHash} className="flex items-center gap-2.5 p-1.5 rounded-md bg-white/[0.03] border border-white/[0.06]">
                      {p.icon && <img src={bungieIcon(p.icon)} alt="" className="w-7 h-7 rounded" />}
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] text-white font-medium truncate">{p.name}</p>
                        {p.description && <p className="text-[11px] text-gray-500 truncate">{p.description}</p>}
                      </div>
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" title="Active" />
                    </div>
                  ))}
                  {inactivePerks.length > 0 && (
                    <div className="space-y-1.5 opacity-40">
                      {inactivePerks.map(p => (
                        <div key={p.perkHash} className="flex items-center gap-2.5 p-1.5 rounded-md">
                          {p.icon && <img src={bungieIcon(p.icon)} alt="" className="w-7 h-7 rounded opacity-50" />}
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] text-gray-400 truncate">{p.name}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {hasMods && (
              <div className="px-4 mt-4">
                <h3 className="text-[11px] uppercase tracking-destiny-wide text-gray-500 font-display mb-2" data-testid="section-mods">{t('item.mods') || 'MODS'}</h3>
                <div className="space-y-1.5">
                  {item.mods!.map(m => (
                    <div key={m.plugHash} className="flex items-center gap-2.5 p-1.5 rounded-md bg-white/[0.03] border border-white/[0.06]">
                      {m.icon && <img src={bungieIcon(m.icon)} alt="" className="w-7 h-7 rounded" />}
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] text-white font-medium truncate">{m.name}</p>
                        {m.description && <p className="text-[11px] text-gray-500 truncate">{m.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="px-4 mt-5 pb-4 space-y-2">
              <h3 className="text-[11px] uppercase tracking-destiny-wide text-gray-500 font-display mb-2" data-testid="section-actions">{t('item.actions') || 'ACTIONS'}</h3>

              {onAddToLoadout && (
                <button
                  onClick={() => { onAddToLoadout(); onClose(); }}
                  disabled={isInLoadout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[var(--color-gold-accent)]/10 border border-[var(--color-gold-accent)]/20 text-[var(--color-gold-accent)] hover:bg-[var(--color-gold-accent)]/20 transition-all disabled:opacity-30 press-scale"
                  data-testid="detail-action-loadout"
                >
                  <Sparkles className="w-4 h-4" />
                  <span className="text-[11px] uppercase tracking-destiny font-medium">{t('action.toLoadout')}</span>
                </button>
              )}

              {onTransferToChar && characters.map(c => (
                <div key={c.characterId} className="flex items-center gap-1.5">
                  <button
                    onClick={() => { onTransferToChar(c.characterId); onClose(); }}
                    className="flex-1 flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-gray-300 hover:text-white hover:bg-white/[0.06] transition-all press-scale"
                    data-testid={`detail-transfer-${c.characterId}`}
                  >
                    <ArrowRightLeft className="w-4 h-4" />
                    <span className="text-[11px] tracking-destiny">{c.className}</span>
                  </button>
                  {onEquipOnChar && (
                    <button
                      onClick={() => { onEquipOnChar(c.characterId); onClose(); }}
                      className="px-3 py-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:text-white hover:bg-indigo-500/20 transition-all press-scale"
                      title={t('action.equip')}
                      data-testid={`detail-equip-${c.characterId}`}
                    >
                      <Shield className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
