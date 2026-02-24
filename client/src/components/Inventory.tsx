import React from 'react';
import { Crosshair } from 'lucide-react';
import { motion } from 'framer-motion';

export interface Item {
  id: string;
  name: string;
  type: string;
  slot: string;
  rarity: 'common' | 'rare' | 'legendary' | 'exotic';
  power: number;
  icon: string;
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
  
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={!isEquipped ? { y: -4 } : {}}
      onClick={onClick} 
      className={`group cursor-pointer relative bg-[#141417] border border-white/10 overflow-hidden transition-all duration-300 ${
        isEquipped 
          ? 'opacity-40 grayscale-[50%]' 
          : 'hover:border-white/30 hover:shadow-[0_8px_30px_rgba(0,0,0,0.6)]'
      }`}
    >
      <div className="h-0.5 w-full transition-all duration-300 group-hover:h-1" style={{ backgroundColor: rarityColor }} />
      <div className="aspect-square relative overflow-hidden bg-black/50">
        <img 
          src={item.icon} 
          alt={item.name} 
          className={`w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110 ${
            isEquipped ? '' : 'filter brightness-90 group-hover:brightness-110'
          }`} 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#141417] via-transparent to-transparent opacity-80" />
        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] font-medium text-white border border-white/10">
          {item.power}
        </div>
      </div>
      <div className="p-3 relative z-10 bg-gradient-to-b from-[#141417]/80 to-[#0A0A0C]">
        <h4 className="text-xs font-display font-medium truncate tracking-wide" style={{ color: isExotic ? rarityColor : 'white' }}>
          {item.name}
        </h4>
        <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider">{item.type}</p>
      </div>
      
      {isEquipped && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
          <span className="bg-black/80 text-white text-[10px] uppercase tracking-widest px-2 py-1 rounded border border-white/10">
            Equipped
          </span>
        </div>
      )}
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
  const rarityColor = isExotic ? '#E5C76B' : '#7D5C96';
  
  return (
    <div className="group relative bg-[#141417] border border-white/10 p-3 flex items-center space-x-4 transition-all duration-300 hover:border-white/30 hover:bg-white/[0.02]">
      <div className="w-14 h-14 bg-black/50 border border-white/10 flex-shrink-0 relative overflow-hidden flex items-center justify-center rounded-sm">
        {item ? (
          <>
            <img src={item.icon} alt={item.name} className="w-full h-full object-cover z-10" />
            <div className="absolute top-0 left-0 w-full h-1 z-20" style={{ backgroundColor: rarityColor }} />
          </>
        ) : (
          <slotInfo.icon className="w-6 h-6 text-white/20" strokeWidth={1} />
        )}
      </div>
      
      <div className="flex-grow min-w-0">
        <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-0.5 font-display font-medium">
          {slotInfo.label}
        </div>
        {item ? (
          <div className="text-sm font-display font-medium truncate tracking-wide" style={{ color: isExotic ? rarityColor : 'white' }}>
            {item.name}
          </div>
        ) : (
          <div className="text-xs text-gray-600 font-light italic">Empty</div>
        )}
      </div>
      
      {item && (
        <button 
          onClick={onUnequip} 
          className="p-2 text-gray-500 hover:text-white hover:bg-white/10 rounded opacity-0 group-hover:opacity-100 transition-all duration-200"
          title="Unequip"
        >
          <Crosshair className="w-4 h-4 rotate-45" />
        </button>
      )}
    </div>
  );
}
