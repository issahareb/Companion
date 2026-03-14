import type { QuestItem } from '@/hooks/use-profile-state';

export function QuestCard({ quest }: { quest: QuestItem }) {
  return (
    <div className="flex items-center gap-3 bg-gradient-to-r from-white/[0.03] to-transparent border border-white/[0.06] p-3 hover:border-green-500/20 hover:from-green-500/[0.03] transition-all duration-300 group/quest" data-testid={`card-quest-${quest.id}`}>
      <div className="w-10 h-10 shrink-0 ring-1 ring-white/10 overflow-hidden bg-black group-hover/quest:ring-green-500/20 transition-all">
        {quest.icon && <img src={quest.icon} alt="" className="w-full h-full object-cover" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold truncate tracking-wider uppercase text-white group-hover/quest:text-green-300/90 transition-colors">{quest.name}</p>
        {quest.description && (
          <p className="text-[11px] text-gray-500 truncate mt-0.5">{quest.description}</p>
        )}
        <p className="text-[11px] text-green-500/50 uppercase tracking-widest mt-1">{quest.type || 'Quest'}</p>
      </div>
    </div>
  );
}
