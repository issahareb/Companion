import { Star } from 'lucide-react';

const TIER_MAP: Record<string, number> = {
  exotic: 5,
  legendary: 4,
  rare: 3,
  uncommon: 2,
  common: 1,
};

export function TierStars({ rarity, size = 'sm' }: { rarity: string; size?: 'xs' | 'sm' }) {
  const count = TIER_MAP[rarity] || 1;
  const starSize = size === 'xs' ? 'w-[6px] h-[6px]' : 'w-[8px] h-[8px]';
  const pad = size === 'xs' ? 'px-[2px] py-[1px]' : 'px-[3px] py-[2px]';

  return (
    <div className={`flex flex-col items-center gap-0 ${pad} rounded-sm`} title={`Tier ${count}`} style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}>
      {Array.from({ length: count }).map((_, i) => (
        <Star
          key={i}
          className={starSize}
          fill="var(--color-gold-accent)"
          stroke="#000"
          strokeWidth={1}
          style={{
            filter: 'drop-shadow(0 0 2px var(--color-gold-accent))',
            marginTop: i > 0 ? '-2px' : '0',
          }}
        />
      ))}
    </div>
  );
}
