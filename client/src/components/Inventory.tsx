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

export function ItemCard({ item, isEquipped, onClick }: ItemCardProps) {
  const isExotic = item.rarity === 'exotic';
  const rarityColor = isExotic ? '#E5C76B' : '#7D5C96'; 
  
  const isWeaponOrArmor = ['kinetic', 'energy', 'power', 'helmet', 'arms', 'chest', 'legs', 'class'].includes(item.slot);
  const imgSrc = (isWeaponOrArmor && item.screenshot) ? item.screenshot : (item.icon || item.screenshot || '');

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={!isEquipped ? { y: -3, scale: 1.02 } : {}}
      onClick={onClick} 
      className={`group cursor-pointer relative bg-gradient-to-b from-white/[0.03] to-transparent border overflow-hidden transition-all duration-500 destiny-clip-sm ${
        isEquipped 
          ? 'opacity-30 grayscale-[70%] border-white/5' 
          : isExotic
            ? 'border-[#E5C76B]/20 hover:border-[#E5C76B]/50 rarity-exotic-glow hover:shadow-[0_10px_40px_rgba(229,199,107,0.15)]'
            : 'border-white/[0.08] hover:border-white/30 hover:shadow-[0_10px_40px_rgba(0,0,0,0.8)]'
      }`}
    >
      <div className="h-[2px] w-full" style={{ backgroundColor: rarityColor }} />
      <div className="aspect-square relative overflow-hidden bg-black/80">
        {imgSrc ? (
          <img 
            src={imgSrc} 
            alt={item.name}
            loading="lazy"
            className={`w-full h-full object-contain transition-transform duration-1000 ease-out group-hover:scale-110 ${
              isEquipped ? '' : 'filter brightness-90 group-hover:brightness-110'
            }`}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement?.querySelector('.img-fallback')?.classList.remove('hidden'); }}
          />
        ) : null}
        <div className={`img-fallback w-full h-full flex items-center justify-center absolute inset-0 ${imgSrc ? 'hidden' : ''}`}>
          <Package className="w-8 h-8 text-gray-700" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0e18] via-transparent to-transparent opacity-60" />
      </div>
      <div className="px-2.5 py-2 relative z-10">
        <h4 className="text-[9px] font-bold truncate tracking-wider uppercase" style={{ color: isExotic ? '#E5C76B' : 'white' }}>
          {item.name}
        </h4>
        <p className="text-[8px] text-gray-500 mt-0.5 uppercase tracking-widest font-medium opacity-70">{item.type}</p>
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
      <div className="w-16 h-16 bg-black border border-white/10 flex-shrink-0 relative flex items-center justify-center destiny-clip-sm overflow-hidden shadow-inner">
        {item ? (
          <>
            <img src={item.icon} alt={item.name} className="w-full h-full object-cover z-10 filter brightness-110" />
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
