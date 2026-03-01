import { Star } from 'lucide-react';

const TIER_MAP: Record<string, number> = {
  exotic: 5,
  legendary: 4,
  rare: 3,
  uncommon: 2,
  common: 1,
};

const TIER_COLOR: Record<string, string> = {
  exotic: '#ceae33',
  legendary: '#9d6fd0',
  rare: '#5076a3',
  uncommon: '#78a75e',
  common: '#c2c2c2',
};

export function TierStars({ rarity, size = 'sm' }: { rarity: string; size?: 'xs' | 'sm' }) {
  const count = TIER_MAP[rarity] || 1;
  const color = TIER_COLOR[rarity] || '#888';
  const starSize = size === 'xs' ? 'w-[5px] h-[5px]' : 'w-[6px] h-[6px]';
  const gap = size === 'xs' ? 'gap-[1px]' : 'gap-[1px]';

  return (
    <div className={`flex items-center ${gap}`} title={`Tier ${count}`}>
      {Array.from({ length: count }).map((_, i) => (
        <Star
          key={i}
          className={starSize}
          fill={color}
          stroke="none"
          style={{ filter: `drop-shadow(0 0 1px ${color}80)` }}
        />
      ))}
    </div>
  );
}
