import React from 'react';
import { Crosshair, Sparkles, Package } from 'lucide-react';
import { motion } from 'framer-motion';

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
    case 'exotic': return 'bg-gradient-to-br from-[#ceae33]/30 via-[#ceae33]/10 to-[#ceae33]/5';
    case 'legendary': return 'bg-gradient-to-br from-[#522f65]/40 via-[#522f65]/15 to-[#522f65]/5';
    case 'rare': return 'bg-gradient-to-br from-[#5076a3]/30 via-[#5076a3]/10 to-transparent';
    default: return 'bg-gradient-to-br from-white/[0.06] via-white/[0.02] to-transparent';
  }
}

function getRarityBorder(rarity: string, isEquipped: boolean): string {
  if (isEquipped) return 'border-white/5';
  switch (rarity) {
    case 'exotic': return 'border-[#ceae33]/30 hover:border-[#ceae33]/60';
    case 'legendary': return 'border-[#522f65]/40 hover:border-[#522f65]/70';
    case 'rare': return 'border-[#5076a3]/30 hover:border-[#5076a3]/60';
    default: return 'border-white/[0.08] hover:border-white/20';
  }
}

export function ItemCard({ item, isEquipped, onClick }: ItemCardProps) {
  const isExotic = item.rarity === 'exotic';
  const rarityColor = isExotic ? '#ceae33' : item.rarity === 'legendary' ? '#522f65' : item.rarity === 'rare' ? '#5076a3' : '#333';
  const imgSrc = item.icon || '';

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
      </div>
      <div className="px-1.5 py-1.5 bg-[#0a0e18]/90 rounded-b-lg">
        <h4 className="text-[8px] font-bold truncate tracking-wider uppercase" style={{ color: isExotic ? '#E5C76B' : 'white' }}>
          {item.name}
        </h4>
        <p className="text-[7px] text-gray-500 mt-0.5 uppercase tracking-widest truncate">{item.type}</p>
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
  const isExotic = item?.rarity === 'exotic';
  const rarityColor = isExotic ? '#CEAE33' : '#522F65';
  
  return (
    <div className="group relative bg-gradient-to-r from-white/[0.03] to-transparent backdrop-blur-sm border border-white/[0.08] p-4 flex items-center space-x-5 transition-all duration-500 hover:border-white/25 destiny-clip-sm">
      <div className={`w-16 h-16 border border-white/10 flex-shrink-0 relative flex items-center justify-center rounded-lg overflow-hidden shadow-inner ${
        item ? getRarityBg(item.rarity) : 'bg-black'
      }`}>
        {item ? (
          <>
            {item.icon ? (
              <img src={item.icon} alt={item.name} className="w-full h-full object-cover z-10" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            ) : (
              <Package className="w-6 h-6 text-gray-600 z-10" />
            )}
            <div className="absolute top-0 left-0 w-full h-1 z-20" style={{ backgroundColor: rarityColor }} />
          </>
        ) : (
          <slotInfo.icon className="w-6 h-6 text-white/10" strokeWidth={1} />
        )}
      </div>
      
      <div className="flex-grow min-w-0">
        <div className="text-[8px] text-gray-500 uppercase tracking-[0.3em] mb-1.5 font-bold">
          {slotInfo.label}
        </div>
        {item ? (
          <>
            <div className="text-[11px] font-bold truncate tracking-wider drop-shadow-md" style={{ color: isExotic ? '#E5C76B' : 'white' }}>
              {item.name}
            </div>
            <div className="text-[10px] text-gray-400 font-mono mt-1.5 flex items-center">
               <Sparkles className="w-3.5 h-3.5 mr-1.5 text-[#E5C76B] opacity-70" /> {item.power}
            </div>
          </>
        ) : (
          <div className="text-[11px] text-gray-700 font-light tracking-widest uppercase">Leer</div>
        )}
      </div>
      
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
  );
}
