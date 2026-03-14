import { Sparkles } from 'lucide-react';
import type { FilterState } from './shared';

export function FilterBar({ filters, onChange, slotFilters, rarityFilters }: { filters: FilterState; onChange: (f: FilterState) => void; slotFilters: { id: string; label: string }[]; rarityFilters: { id: string; label: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1 overflow-x-auto">
        {slotFilters.map(sf => (
          <button key={sf.id} onClick={() => onChange({ ...filters, slot: sf.id })}
            className={`px-2.5 py-1 text-[11px] uppercase tracking-destiny border transition-all shrink-0 ${
              filters.slot === sf.id ? 'bg-indigo-600/30 border-indigo-500/50 text-white' : 'bg-white/5 border-white/5 text-gray-500 hover:text-white'
            }`} data-testid={`filter-slot-${sf.id}`}>
            {sf.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1">
        {rarityFilters.map(rf => (
          <button key={rf.id} onClick={() => onChange({ ...filters, rarity: rf.id })}
            className={`px-2.5 py-1 text-[11px] uppercase tracking-destiny border transition-all shrink-0 ${
              filters.rarity === rf.id ? 'bg-indigo-600/30 border-indigo-500/50 text-white' : 'bg-white/5 border-white/5 text-gray-500 hover:text-white'
            }`} data-testid={`filter-rarity-${rf.id}`}>
            {rf.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        <input type="number" placeholder="Min" value={filters.minPower} onChange={e => onChange({ ...filters, minPower: e.target.value })}
          className="w-16 bg-white/5 border border-white/5 text-white text-[11px] px-2 py-1 focus:outline-none focus:border-indigo-500/50 rounded-sm" data-testid="input-min-power" />
        <span className="text-gray-600 text-[11px]">-</span>
        <input type="number" placeholder="Max" value={filters.maxPower} onChange={e => onChange({ ...filters, maxPower: e.target.value })}
          className="w-16 bg-white/5 border border-white/5 text-white text-[11px] px-2 py-1 focus:outline-none focus:border-indigo-500/50 rounded-sm" data-testid="input-max-power" />
        <Sparkles className="w-3 h-3 text-[var(--color-gold-accent)] opacity-50" />
      </div>
    </div>
  );
}
