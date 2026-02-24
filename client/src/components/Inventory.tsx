import React from 'react';
import { Crosshair, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export interface Item {
  id: string;
  name: string;
  type: string;
  slot: string;
  rarity: 'legendary' | 'exotic';
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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={!isEquipped ? { y: -5, scale: 1.02 } : {}}
      onClick={onClick} 
      className={`group cursor-pointer relative bg-[#0A0A0C]/80 border border-white/10 overflow-hidden transition-all duration-500 destiny-clip-sm ${
        isEquipped 
          ? 'opacity-30 grayscale-[70%]' 
          : 'hover:border-white/40 hover:shadow-[0_10px_40px_rgba(0,0,0,0.8)]'
      }`}
    >
      <div className="h-1 w-full" style={{ backgroundColor: rarityColor }} />
      <div className="aspect-square relative overflow-hidden bg-black">
        <img 
          src={item.icon} 
          alt={item.name} 
          className={`w-full h-full object-cover transition-transform duration-1000 ease-out group-hover:scale-115 ${
            isEquipped ? '' : 'filter brightness-90 group-hover:brightness-110'
          }`} 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0C] via-transparent to-transparent opacity-90" />
      </div>
      <div className="p-4 relative z-10 bg-[#0A0A0C]">
        <h4 className="text-[10px] font-bold truncate tracking-wider uppercase" style={{ color: isExotic ? '#E5C76B' : 'white' }}>
          {item.name}
        </h4>
        <p className="text-[9px] text-gray-500 mt-1 uppercase tracking-widest font-medium opacity-70">{item.type}</p>
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
    <div className="group relative bg-[#0A0A0C]/80 backdrop-blur-sm border border-white/10 p-4 flex items-center space-x-5 transition-all duration-500 hover:border-white/30 destiny-clip-sm">
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
