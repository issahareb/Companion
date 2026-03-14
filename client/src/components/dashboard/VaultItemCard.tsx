import { useState, useEffect, useMemo, useRef } from 'react';
import { Sparkles, ArrowRightLeft, Shield, Package, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { InventoryItem, CharacterData } from '@/hooks/use-profile-state';
import { useI18n } from '@/lib/i18n';
import { rateWeaponRoll } from '@/lib/roll-ratings';
import { RollRatingBadge } from './EquippedSlotRow';
import { TierStars } from './TierStars';

function getRarityBg(rarity: string): string {
  switch (rarity) {
    case 'exotic': return 'bg-gradient-to-br from-[var(--color-exotic)]/30 via-[var(--color-exotic)]/10 to-[var(--color-exotic)]/5';
    case 'legendary': return 'bg-gradient-to-br from-[var(--color-legendary)]/40 via-[var(--color-legendary)]/15 to-[var(--color-legendary)]/5';
    case 'rare': return 'bg-gradient-to-br from-[var(--color-rare)]/30 via-[var(--color-rare)]/10 to-transparent';
    default: return 'bg-gradient-to-br from-white/[0.06] via-white/[0.02] to-transparent';
  }
}

function getRarityBorder(rarity: string, isInLoadout: boolean): string {
  if (isInLoadout) return 'border-white/5';
  switch (rarity) {
    case 'exotic': return 'border-[var(--color-exotic)]/30 hover:border-[var(--color-exotic)]/60';
    case 'legendary': return 'border-[var(--color-legendary)]/40 hover:border-[var(--color-legendary)]/70';
    case 'rare': return 'border-[var(--color-rare)]/30 hover:border-[var(--color-rare)]/60';
    default: return 'border-white/[0.08] hover:border-white/20';
  }
}

import { springSnappy as spring } from './shared';

export function VaultItemCard({ item, characters, onTransferToChar, onEquipOnChar, onAddToLoadout, isInLoadout, isPending }: {
  item: InventoryItem;
  characters: CharacterData[];
  onTransferToChar: (charId: string) => void;
  onEquipOnChar: (charId: string) => void;
  onAddToLoadout: () => void;
  isInLoadout: boolean;
  isPending?: boolean;
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const { t } = useI18n();
  const isExotic = item.rarity === 'exotic';
  const rarityColor = isExotic ? 'var(--color-exotic)' : item.rarity === 'legendary' ? 'var(--color-legendary)' : item.rarity === 'rare' ? 'var(--color-rare)' : '#333';
  const isWeapon = ['kinetic', 'energy', 'power'].includes(item.slot);
  const cardRef = useRef<HTMLDivElement>(null);
  const imgSrc = item.icon || item.screenshot || '';

  const rollResult = useMemo(() => {
    if (!isWeapon) return null;
    const perkNames = [
      ...(item.perks || []).filter(p => p.isActive).map(p => p.name),
      ...(item.mods || []).map(m => m.name),
    ];
    if (perkNames.length === 0) return null;
    return rateWeaponRoll(item.type, perkNames);
  }, [item, isWeapon]);

  useEffect(() => {
    if (!showDropdown) return;
    const close = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(`[data-dropdown-id="${item.id}"]`)) setShowDropdown(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [showDropdown, item.id]);

  return (
    <div
      ref={cardRef}
      className={`group relative border transition-all duration-300 rounded-lg item-card-hover ${
        isInLoadout ? 'opacity-30 grayscale-[70%]' : ''
      } ${getRarityBorder(item.rarity, isInLoadout)}`}
      style={{ overflow: showDropdown ? 'visible' : 'hidden' }}
      data-dropdown-id={item.id}
    >
      <div
        role="button"
        aria-label={`${item.name}, ${item.rarity} ${item.type}, ${item.power} Power`}
        aria-expanded={showDropdown}
        className={`aspect-square relative overflow-hidden rounded-t-lg cursor-pointer ${getRarityBg(item.rarity)}`}
        onClick={() => !isPending && setShowDropdown(!showDropdown)}
      >
        {isPending && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 backdrop-blur-[2px]">
            <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
          </div>
        )}
        <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ backgroundColor: rarityColor }} />
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={item.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement?.querySelector('.img-fallback')?.classList.remove('hidden'); }}
          />
        ) : null}
        <div className={`img-fallback w-full h-full flex items-center justify-center absolute inset-0 ${imgSrc ? 'hidden' : ''}`}>
          <Package className="w-8 h-8 text-gray-600" />
        </div>
        <div className="absolute bottom-1 left-1 z-10">
          <TierStars rarity={item.rarity} />
        </div>
        {showDropdown && <div className="absolute inset-0 bg-indigo-500/[0.08] border-2 border-indigo-400/40 rounded-t-lg" />}
      </div>
      <div className="px-1.5 py-1.5 bg-[#0a0e18]/90 rounded-b-lg">
        <h4 className="text-[11px] font-bold truncate tracking-destiny" style={{ color: isExotic ? 'var(--color-gold-accent)' : 'white' }}>{item.name}</h4>
        <div className="flex items-center justify-between mt-0.5">
          <div className="flex items-center gap-1 min-w-0">
            <p className="text-[11px] text-gray-500 truncate">{item.type}</p>
            {rollResult && <RollRatingBadge result={rollResult} />}
          </div>
          {item.power > 0 && (
            <p className="text-[11px] text-gray-400 flex items-center gap-0.5 shrink-0">
              <Sparkles className="w-2.5 h-2.5 text-[var(--color-gold-accent)]" /> {item.power}
            </p>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-0 right-0 bottom-0 z-30 glass border-t border-indigo-500/20 shadow-xl shadow-black/60 rounded-b-lg"
          >
            <div className="py-1">
              <button
                onClick={() => { onAddToLoadout(); setShowDropdown(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[11px] uppercase tracking-destiny text-[var(--color-gold-accent)] hover:bg-yellow-500/10 transition-all press-scale"
                data-testid={`dropdown-loadout-${item.id}`}>
                <Sparkles className="w-3 h-3" /> {t('action.toLoadout')}
              </button>
              <div className="h-px bg-white/[0.04] mx-2" />
              {characters.map((c) => (
                <div key={c.characterId} className="flex items-center">
                  <button onClick={() => { onTransferToChar(c.characterId); setShowDropdown(false); }}
                    aria-label={`Transfer ${item.name} to ${c.className}`}
                    className="flex-1 flex items-center gap-2 px-3 py-2 text-[11px] tracking-destiny text-gray-400 hover:text-white hover:bg-white/[0.06] transition-all press-scale"
                    data-testid={`dropdown-transfer-${item.id}-${c.characterId}`}>
                    <ArrowRightLeft className="w-3 h-3" /> {c.className}
                  </button>
                  <button onClick={() => { onEquipOnChar(c.characterId); setShowDropdown(false); }}
                    aria-label={`Equip ${item.name} on ${c.className}`}
                    className="px-3 py-2 text-[11px] tracking-destiny text-indigo-400 hover:text-white hover:bg-indigo-500/15 transition-all press-scale" title={t('action.equip')}
                    data-testid={`dropdown-equip-${item.id}-${c.characterId}`}>
                    <Shield className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
