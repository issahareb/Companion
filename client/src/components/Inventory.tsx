import React from 'react';
import { Crosshair, Sparkles, Package, ChevronDown, ChevronUp } from 'lucide-react';
import { TierStars } from './dashboard/TierStars';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface ItemStatValue {
  statHash: number;
  name: string;
  value: number;
}

export interface ItemPerk {
  perkHash: number;
  name: string;
  icon: string;
  isActive: boolean;
}

export interface ItemMod {
  plugHash: number;
  name: string;
  icon: string;
  description?: string;
}

export interface ItemSocketInfo {
  socketIndex: number;
  plugHash: number;
  name: string;
  icon: string;
  description: string;
  category?: string;
}

export interface Item {
  id: string;
  itemHash: number;
  name: string;
  type: string;
  slot: string;
  screenshot: string;
  rarity: 'legendary' | 'exotic' | string;
  power: number;
  icon: string;
  stats?: ItemStatValue[];
  perks?: ItemPerk[];
  mods?: ItemMod[];
  sockets?: ItemSocketInfo[];
}

export interface SlotInfo {
  id: string;
  label: string;
  icon: React.ElementType;
}

interface ItemCardProps {
  item: Item;
  isEquipped: boolean;
  onClick: () => void;
}

function getRarityBg(rarity: string): string {
  switch (rarity) {
    case 'exotic': return 'bg-gradient-to-br from-[var(--color-exotic)]/30 via-[var(--color-exotic)]/10 to-[var(--color-exotic)]/5';
    case 'legendary': return 'bg-gradient-to-br from-[var(--color-legendary)]/40 via-[var(--color-legendary)]/15 to-[var(--color-legendary)]/5';
    case 'rare': return 'bg-gradient-to-br from-[var(--color-rare)]/30 via-[var(--color-rare)]/10 to-transparent';
    default: return 'bg-gradient-to-br from-white/[0.06] via-white/[0.02] to-transparent';
  }
}

function getRarityBorder(rarity: string, isEquipped: boolean): string {
  if (isEquipped) return 'border-white/5';
  switch (rarity) {
    case 'exotic': return 'border-[var(--color-exotic)]/30 hover:border-[var(--color-exotic)]/60';
    case 'legendary': return 'border-[var(--color-legendary)]/40 hover:border-[var(--color-legendary)]/70';
    case 'rare': return 'border-[var(--color-rare)]/30 hover:border-[var(--color-rare)]/60';
    default: return 'border-white/[0.08] hover:border-white/20';
  }
}

export function ItemCard({ item, isEquipped, onClick }: ItemCardProps) {
  const isExotic = item.rarity === 'exotic';
  const rarityColor = isExotic ? 'var(--color-exotic)' : item.rarity === 'legendary' ? 'var(--color-legendary)' : item.rarity === 'rare' ? 'var(--color-rare)' : '#333';
  const imgSrc = item.icon || item.screenshot || '';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={!isEquipped ? { y: -2, scale: 1.03 } : {}}
      onClick={onClick} 
      className={`group cursor-pointer relative border overflow-hidden rounded-lg transition-all duration-300 ${
        isEquipped ? 'opacity-30 grayscale-[70%]' : ''
      } ${getRarityBorder(item.rarity, isEquipped)}`}
    >
      <div className={`aspect-square relative overflow-hidden rounded-t-lg ${getRarityBg(item.rarity)}`}>
        <div className="absolute top-0 left-0 right-0 h-[2px] z-10" style={{ backgroundColor: rarityColor }} />
        {imgSrc ? (
          <img 
            src={imgSrc} 
            alt={item.name}
            loading="lazy"
            className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${
              isEquipped ? '' : 'brightness-95 group-hover:brightness-110'
            }`}
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
        <h4 className="text-[11px] font-bold truncate tracking-destiny" style={{ color: isExotic ? 'var(--color-gold-accent)' : 'white' }}>
          {item.name}
        </h4>
        <p className="text-[11px] text-gray-500 mt-0.5 truncate">{item.type}</p>
      </div>
    </motion.div>
  );
}

interface EquippedSlotProps {
  slotInfo: SlotInfo;
  item?: Item;
  onUnequip: () => void;
}

export function EquippedSlot({ slotInfo, item, onUnequip }: EquippedSlotProps) {
  const [expanded, setExpanded] = useState(false);
  const isExotic = item?.rarity === 'exotic';
  const rarityColor = isExotic ? 'var(--color-exotic)' : 'var(--color-legendary)';
  const isSubclass = item?.slot === 'subclass';
  const hasDetails = item && ((item.perks && item.perks.length > 0) || (item.mods && item.mods.length > 0) || (item.sockets && item.sockets.length > 0));

  return (
    <div className="group relative bg-gradient-to-r from-white/[0.03] to-transparent glass-subtle border border-white/[0.08] transition-all duration-500 hover:border-white/25 destiny-clip-sm">
      <div className="p-4 flex items-center space-x-5">
        <div className={`w-16 h-16 border border-white/10 flex-shrink-0 relative flex items-center justify-center rounded-lg overflow-hidden shadow-inner ${
          item ? getRarityBg(item.rarity) : 'bg-black'
        }`}>
          {item ? (
            <>
              {(item.icon || item.screenshot) ? (
                <img src={item.icon || item.screenshot} alt={item.name} className="w-full h-full object-cover z-10" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              ) : (
                <Package className="w-6 h-6 text-gray-600 z-10" />
              )}
              <div className="absolute top-0 left-0 w-full h-1 z-20" style={{ backgroundColor: isSubclass ? '#a855f7' : rarityColor }} />
              <div className="absolute bottom-0.5 left-0.5 z-20">
                <TierStars rarity={item.rarity} size="xs" />
              </div>
            </>
          ) : (
            <slotInfo.icon className="w-6 h-6 text-white/10" strokeWidth={1} />
          )}
        </div>

        <div className="flex-grow min-w-0">
          <div className="text-[11px] text-gray-500 uppercase tracking-destiny-widest mb-1.5 font-bold">
            {slotInfo.label}
          </div>
          {item ? (
            <>
              <div className="text-[11px] font-bold truncate tracking-destiny drop-shadow-md" style={{ color: isSubclass ? '#a855f7' : isExotic ? 'var(--color-gold-accent)' : 'white' }}>
                {item.name}
              </div>
              {!isSubclass && item.power > 0 && (
                <div className="text-[11px] text-gray-400 font-mono mt-1.5 flex items-center">
                  <Sparkles className="w-3.5 h-3.5 mr-1.5 text-[var(--color-gold-accent)] opacity-70" /> {item.power}
                </div>
              )}
              {isSubclass && item.sockets && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {item.sockets.filter(s => s.category === 'aspect').map(s => (
                    <span key={s.socketIndex} className="text-[11px] px-1.5 py-0.5 bg-purple-500/10 border border-purple-500/20 rounded text-purple-300 truncate max-w-[80px]">{s.name}</span>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="text-[11px] text-gray-700 font-light tracking-destiny uppercase">Leer</div>
          )}
        </div>

        <div className="flex items-center gap-1">
          {hasDetails && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-2 text-gray-600 hover:text-white transition-all"
              data-testid={`button-expand-slot-${slotInfo.id}`}
            >
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
          {item && (
            <button
              onClick={onUnequip}
              className="p-2.5 text-gray-600 hover:text-white hover:bg-red-500/10 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300"
              title="Ablegen"
            >
              <Crosshair className="w-4 h-4 rotate-45" />
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {expanded && item && hasDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-white/[0.06]"
          >
            <div className="px-4 py-3 space-y-2.5">
              {isSubclass && item.sockets && item.sockets.length > 0 && (
                <div className="space-y-1.5">
                  {[
                    { cats: ['super'], label: 'Super' },
                    { cats: ['classAbility', 'movement', 'melee', 'grenade'], label: 'Fähigkeiten' },
                    { cats: ['aspect'], label: 'Aspekte' },
                    { cats: ['fragment'], label: 'Fragmente' },
                  ].map(({ cats, label }) => {
                    const catSockets = item.sockets!.filter(s => s.category && cats.includes(s.category));
                    if (catSockets.length === 0) return null;
                    const isWrap = cats.includes('fragment') || cats.length > 1;
                    return (
                      <div key={label}>
                        <p className="text-[11px] text-gray-500 uppercase tracking-destiny mb-1">{label}</p>
                        <div className={isWrap ? 'flex flex-wrap gap-1' : 'space-y-1'}>
                          {catSockets.map(s => (
                            <div key={s.socketIndex} className="flex items-center gap-1.5">
                              {s.icon && <img src={s.icon} alt={s.name} className="w-5 h-5 rounded-sm ring-1 ring-white/10" />}
                              <span className="text-[11px] text-white/80 truncate">{s.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {!isSubclass && item.perks && item.perks.length > 0 && (
                <div>
                  <p className="text-[11px] text-gray-500 uppercase tracking-destiny mb-1">Perks</p>
                  <div className="flex flex-wrap gap-1">
                    {item.perks.map(p => (
                      <div key={p.perkHash} className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${p.isActive ? 'bg-indigo-500/10 border border-indigo-500/15' : 'bg-white/[0.03] border border-white/[0.06] opacity-50'}`} data-testid={`perk-${p.perkHash}`}>
                        {p.icon && <img src={p.icon} alt={p.name} className="w-3.5 h-3.5 rounded-sm" />}
                        <span className={`text-[11px] ${p.isActive ? 'text-indigo-300' : 'text-gray-500'}`}>{p.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!isSubclass && item.mods && item.mods.length > 0 && (
                <div>
                  <p className="text-[11px] text-gray-500 uppercase tracking-destiny mb-1">Mods</p>
                  <div className="flex flex-wrap gap-1">
                    {item.mods.map(m => (
                      <div key={m.plugHash} className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/15 rounded" data-testid={`mod-${m.plugHash}`}>
                        {m.icon && <img src={m.icon} alt={m.name} className="w-3.5 h-3.5 rounded-sm" />}
                        <span className="text-[11px] text-amber-300">{m.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
