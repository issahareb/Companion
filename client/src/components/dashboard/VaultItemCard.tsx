import { useState, useMemo, useRef } from 'react';
import { Sparkles, Package, Loader2 } from 'lucide-react';
import type { InventoryItem, CharacterData } from '@/hooks/use-profile-state';
import { rateWeaponRoll } from '@/lib/roll-ratings';
import { RollRatingBadge } from './EquippedSlotRow';
import { TierStars } from './TierStars';
import { ItemDetailModal } from './ItemDetailModal';

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

export function VaultItemCard({ item, characters, onTransferToChar, onEquipOnChar, onAddToLoadout, isInLoadout, isPending }: {
  item: InventoryItem;
  characters: CharacterData[];
  onTransferToChar: (charId: string) => void;
  onEquipOnChar: (charId: string) => void;
  onAddToLoadout: () => void;
  isInLoadout: boolean;
  isPending?: boolean;
}) {
  const [showDetail, setShowDetail] = useState(false);
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

  return (
    <>
      <div
        ref={cardRef}
        className={`group relative border transition-all duration-300 rounded-lg item-card-hover overflow-hidden cursor-pointer ${
          isInLoadout ? 'opacity-30 grayscale-[70%]' : ''
        } ${getRarityBorder(item.rarity, isInLoadout)}`}
        data-testid={`vault-item-${item.id}`}
        onClick={() => !isPending && setShowDetail(true)}
      >
        <div
          role="button"
          aria-label={`${item.name}, ${item.rarity} ${item.type}, ${item.power} Power`}
          className={`aspect-square relative overflow-hidden rounded-t-lg ${getRarityBg(item.rarity)}`}
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
      </div>

      {showDetail && (
        <ItemDetailModal
          item={item}
          characters={characters}
          onClose={() => setShowDetail(false)}
          onTransferToChar={onTransferToChar}
          onEquipOnChar={onEquipOnChar}
          onAddToLoadout={onAddToLoadout}
          isInLoadout={isInLoadout}
        />
      )}
    </>
  );
}
