import { Star } from 'lucide-react';

const TIER_MAP: Record<string, number> = {
  exotic: 5,
  legendary: 4,
  rare: 3,
  uncommon: 2,
  common: 1,
};

const GOLD = '#E5C76B';

export function TierStars({ rarity, size = 'sm' }: { rarity: string; size?: 'xs' | 'sm' }) {
  const count = TIER_MAP[rarity] || 1;
  const starSize = size === 'xs' ? 'w-[7px] h-[7px]' : 'w-[9px] h-[9px]';

  return (
    <div className="flex items-center gap-[1px]" title={`Tier ${count}`}>
      {Array.from({ length: count }).map((_, i) => (
        <Star
          key={i}
          className={starSize}
          fill={GOLD}
          stroke="#000"
          strokeWidth={1}
          style={{ filter: `drop-shadow(0 0 2px ${GOLD})` }}
        />
      ))}
    </div>
  );
}
