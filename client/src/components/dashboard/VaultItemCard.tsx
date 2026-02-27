import { useState, useEffect, useMemo, useRef } from 'react';
import { Sparkles, ArrowRightLeft, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { InventoryItem, CharacterData } from '@/hooks/use-profile-state';
import { useI18n } from '@/lib/i18n';
import { rateWeaponRoll } from '@/lib/roll-ratings';
import { RollRatingBadge } from './EquippedSlotRow';

const spring = { type: 'spring' as const, damping: 25, stiffness: 300 };

export function VaultItemCard({ item, characters, onTransferToChar, onEquipOnChar, onAddToLoadout, isInLoadout }: {
  item: InventoryItem;
  characters: CharacterData[];
  onTransferToChar: (charId: string) => void;
  onEquipOnChar: (charId: string) => void;
  onAddToLoadout: () => void;
  isInLoadout: boolean;
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const { t } = useI18n();
  const isExotic = item.rarity === 'exotic';
  const rarityColor = isExotic ? '#E5C76B' : '#7D5C96';
  const isWeapon = ['kinetic', 'energy', 'power'].includes(item.slot);
  const cardRef = useRef<HTMLDivElement>(null);

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

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    cardRef.current.style.transform = `perspective(600px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg) scale(1.02)`;
  };

  const handleMouseLeave = () => {
    if (!cardRef.current) return;
    cardRef.current.style.transform = 'perspective(600px) rotateY(0deg) rotateX(0deg) scale(1)';
  };

  return (
    <div
      ref={cardRef}
      className={`group relative bg-gradient-to-b from-white/[0.03] to-transparent border transition-all duration-500 destiny-clip-sm card-3d ${
        isInLoadout
          ? 'opacity-30 grayscale-[70%] border-white/5'
          : isExotic
            ? 'border-[#E5C76B]/20 hover:border-[#E5C76B]/40 rarity-exotic-glow'
            : 'border-white/[0.08] hover:border-white/25'
      }`}
      style={{ overflow: showDropdown ? 'visible' : 'hidden' }}
      data-dropdown-id={item.id}
      onMouseMove={!isInLoadout ? handleMouseMove : undefined}
      onMouseLeave={handleMouseLeave}
    >
      <div className="h-[2px] w-full" style={{ backgroundColor: rarityColor }} />
      <div className="aspect-[4/3] relative overflow-hidden bg-black/80 cursor-pointer press-scale" onClick={() => setShowDropdown(!showDropdown)}>
        <img src={item.screenshot || item.icon} alt={item.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 brightness-90 group-hover:brightness-110" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0e18] via-transparent to-transparent opacity-90" />
        {showDropdown && <div className="absolute inset-0 bg-indigo-500/[0.06]" />}
      </div>
      <div className="px-2.5 py-2 relative z-10">
        <h4 className="text-[9px] font-bold truncate tracking-wider uppercase" style={{ color: isExotic ? '#E5C76B' : 'white' }}>{item.name}</h4>
        <div className="flex items-center justify-between mt-0.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <p className="text-[8px] text-gray-500 uppercase tracking-widest truncate">{item.type}</p>
            {rollResult && <RollRatingBadge result={rollResult} />}
          </div>
          {item.power > 0 && (
            <p className="text-[8px] text-gray-400 flex items-center gap-0.5 shrink-0">
              <Sparkles className="w-2 h-2 text-[#E5C76B]" /> {item.power}
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
            className="absolute left-0 right-0 bottom-0 z-30 bg-[#0c1020]/95 backdrop-blur-md border-t border-indigo-500/20 shadow-xl shadow-black/60"
          >
            <div className="py-1">
              <motion.button
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05, duration: 0.2 }}
                onClick={() => { onAddToLoadout(); setShowDropdown(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[9px] uppercase tracking-widest text-[#E5C76B] hover:bg-yellow-500/10 transition-all press-scale"
                data-testid={`dropdown-loadout-${item.id}`}>
                <Sparkles className="w-3 h-3" /> {t('action.toLoadout')}
              </motion.button>
              <div className="h-px bg-white/[0.04] mx-2" />
              {characters.map((c, i) => (
                <motion.div
                  key={c.characterId}
                  className="flex items-center"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.08 + i * 0.04, duration: 0.2 }}
                >
                  <button onClick={() => { onTransferToChar(c.characterId); setShowDropdown(false); }}
                    className="flex-1 flex items-center gap-2 px-3 py-2 text-[9px] uppercase tracking-widest text-gray-400 hover:text-white hover:bg-white/[0.06] transition-all press-scale"
                    data-testid={`dropdown-transfer-${item.id}-${c.characterId}`}>
                    <ArrowRightLeft className="w-3 h-3" /> {c.className}
                  </button>
                  <button onClick={() => { onEquipOnChar(c.characterId); setShowDropdown(false); }}
                    className="px-3 py-2 text-[9px] uppercase tracking-widest text-indigo-400 hover:text-white hover:bg-indigo-500/15 transition-all press-scale" title={t('action.equip')}
                    data-testid={`dropdown-equip-${item.id}-${c.characterId}`}>
                    <Shield className="w-3 h-3" />
                  </button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
